import showdown from "showdown";
import swal from "sweetalert";
import Vue from "vue";

export function toTitle(s: string) {
    return s[0].toLocaleUpperCase() + s.slice(1);
}

export async function fetchJSON(url: string, data: any = {}, method: string = "POST"): Promise<any> {
    const start = new Date().getSeconds();
    let error = "Cannot connect to server.";

    while (new Date().getSeconds() - start < 10) {
        try {
            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json; charset=utf-8"
                },
                body: JSON.stringify(data)
            });

            let result = {} as any;

            try {
                result = await res.json();
                if (result.error) {
                    await swal({
                        text: result.error,
                        icon: "error"
                    });
                }
            } catch (e) {
                await swal({
                    text: res.statusText,
                    icon: "error"
                });
                return { error: e };
            }

            return result;
        } catch (e) {
            console.error(e);

            error = e.toString();
            await new Promise((resolve) => {
                setTimeout(resolve, 1000);
            })
        }
    }

    await swal({
        text: error,
        icon: "error"
    });
}

const anchorAttributes = {
    type: 'output',
    regex: /()\((.+=".+" ?)+\)/g,
    replace: (match: any, $1: string, $2: string) => {
        return $1.replace('">', `" ${$2}>`);
    }
};

const furiganaParser = {
    type: "output",
    regex: /{([^}]+)}\(([^)]+)\)/g,
    replace: "<ruby>$1<rp>(</rp><rt>$2</rt><rp>)</rp></ruby>"
}

showdown.extension('anchorAttributes', anchorAttributes);
showdown.extension('furiganaParser', furiganaParser);
const mdConverter = new showdown.Converter({
    tables: true,
    extensions: ['anchorAttributes', 'furiganaParser']
});

export function escapeRegExp(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');  // $& means the whole matched string
}

export function fixData(d: any): any {
    if (d.front && ["@md5\n", "@template\n", "@rendered\n"].some((c) => d.front.startsWith(c))) {
        d.front = "@rendered\n" + ankiMustache(d.tFront, d);
    }

    if (d.back && ["@md5\n", "@template\n", "@rendered\n"].some((c) => d.back.startsWith(c))) {
        d.back = "@rendered\n" + ankiMustache(d.tBack, d);
    }

    return d;
}

export interface IKv {
    key: string,
    value: string
}

export function ankiMustache(s: string, d: any): string {
    s = s.replace(/{{FrontSide}}/g, (d.front || "").replace(/@[^\n]+\n/g, ""));

    const data: IKv[] = d.data || [];
    for (const d of data) {
        s = s.replace(new RegExp(`{{(\\S+:)?${escapeRegExp(d.key)}}}`), d.value);
    }

    const keys = data.map((d) => d.key);

    s = s.replace(/{{#(\S+)}}(.*){{\1}}/gs, (m, p1, p2) => {
        if (keys.includes(p1)) {
            return p2;
        } else {
            return "";
        }
    });

    s = s.replace(/{{[^}]+}}/g, "");

    return s;
}

export function md2html(s: string, d: any): string {
    s = ankiMustache(s, d);
    return mdConverter.makeHtml(s.replace(/@([^\n]+)\n/g, ""));
}

function fixHtml(s: string): string {
    for (const fix of [furiganaParser]) {
        s = s.replace(fix.regex, fix.replace)
    };
    return s;
}

export function html2md(s: string): string {
    return s;
    // return removeTag(s, "script");
}

export function normalizeArray(item: any, forced: boolean = true) {
    if (Array.isArray(item)) {
        if (forced || item.length == 1) {
            return item[0];
        }
    }

    return item;
}

export function quizDataToContent(
    data: any,
    side: "front" | "back" | "note" | "backAndNote" | null,
    template?: string
): string {
    function cleanHtml(s: string) {
        const cleaned = s.replace(/@([^\n]+)\n/g, "");

        if (s.indexOf("@html\n") !== -1) {
            return fixHtml(cleaned);
        } else {
            return md2html(cleaned, data);
        }
    }

    function cleanCssJs(s: string, type: "css" | "js") {
        const cleaned = s.replace(/@([^\n]+)\n/g, "");

        return s.indexOf("@raw\n") !== -1 ? cleaned :
            (type === "css" ? `<style>${cleaned}</style>` : `<script>${cleaned}</script>`);
    }

    data = fixData(data);

    return `
    ${data.css ? cleanCssJs(data.css, "css") : `<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" crossorigin="anonymous">`}
    ${side === "backAndNote" ?
            cleanHtml(data.back || "") + "\n<br/>\n" + cleanHtml(data.note || "") : cleanHtml(
                (side ? data[side] : template) || ""
            )}
    ${!data.js ? `<script src="https://code.jquery.com/jquery-3.4.1.min.js" integrity="sha256-CSXorXvZcTkaix6Yvo6HppcZGetbYMGWSFlBw8HfCJo=" crossorigin="anonymous"></script>` : cleanCssJs(data.js, "js")}
    `;
}

export function slowClick($selector: JQuery) {
    const duration = 200;
    $selector.prop("disabled", true);

    $selector.addClass("animated");
    $selector.css({
        "animation-duration": `${duration}ms`
    });
    setTimeout(() => {
        $selector.prop("disabled", false);
        $selector.click();
        $selector.removeClass("animated");
    }, duration);

    return $selector;
}

export function removeTag(s: string, tag: string): string {
    return s.replace(new RegExp(`<${tag}[^>]*>.*</${tag}>`, "gs"), "")
}

export function dotGetter(d: any, key: string): any {
    const m = /^@(.+)$/.exec(key);
    if (m) {
        for (const it of d.data || []) {
            if (it.key === m[1]) {
                return it.value;
            }
        }
    }

    return d[key];
}

export function dotSetter(d: any, key: string, v: any) {
    const m = /^@(.+)$/.exec(key);
    let isSet = false;

    if (m) {
        for (const it of d.data || []) {
            if (it.key === m[1]) {
                it.value = v;
                isSet = true;
            }
        }
        if (!isSet) {
            if (!d.data) {
                Vue.set(d, "data", []);
            }
            d.data.push({
                key: m[1],
                value: v
            });
        }
    } else {
        Vue.set(d, key, v);
    }

    console.log(d);
}

export function deepMerge(d: any, u: any) {
    const output = JSON.parse(JSON.stringify(d));

    const dData = d.data || [];
    const uData = u.data || [];

    for (const uDict of uData) {
        for (const dDict of dData) {
            if (dDict.key === uDict.key) {
                output.data[dData.indexOf(dDict)].value = uDict.value;
                break;
            }
        }
    }

    const uRemaining = JSON.parse(JSON.stringify(u));
    delete uRemaining.data;

    return Object.assign(output, uRemaining);
}
