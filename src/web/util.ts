import showdown from "showdown";
import { ServerPort } from "./shared";
import TdService from "turndown";

export function shuffle(a: any[]) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export function toTitle(s: string) {
    return s[0].toLocaleUpperCase() + s.slice(1);
}

export async function fetchJSON(url: string, data: any = {}, method: string = "POST"): Promise<any> {
    const start = new Date().getSeconds();
    
    while (new Date().getSeconds() - start < 10) {
        try {
            const res = await fetch(new URL(url, `http://localhost:${ServerPort}`).href, {
                method,
                headers: {
                    "Content-Type": "application/json; charset=utf-8"
                },
                body: JSON.stringify(data)
            });

            try {
                return await res.json();
            } catch (e) {
                if (res.status < 400) {
                    return res.status;
                } else {
                    throw e;
                }
            }
        } catch (e) {
            await new Promise((resolve) => {
                setTimeout(resolve, 1000);
            })
        }
    }
}

const mdConverter = new showdown.Converter({
    tables: true
});

export function md2html(s: string): string {
    return mdConverter.makeHtml(s);
}

const td = new TdService();
td.remove("script");

export function html2md(s: string): string {
    return td.turndown(s);
}

export function makeCamelSpaced(s: string): string {
    const tokens: string[] = [];
    let previousStart = -1;

    s.split("").forEach((c, i) => {
        if (c === c.toLocaleUpperCase()) {
            tokens.push(s.substr(previousStart + 1, i));
            previousStart = i - 1;
        }
    });

    if (previousStart < s.length - 2) {
        tokens.push(s.substr(previousStart + 1));
    }

    return tokens.map((t) => t[0].toLocaleUpperCase() + t.substr(1)).join(" ");
}

export function normalizeArray(item: any, forced: boolean = true) {
    if (Array.isArray(item)) {
        if (forced || item.length == 1) {
            return item[0];
        }
    } 

    return item;
}
