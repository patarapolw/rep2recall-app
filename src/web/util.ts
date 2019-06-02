import showdown from "showdown";

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
    const res = await fetch(url, {
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
}

const md = new showdown.Converter({
    tables: true
});

export function md2html(s?: string) {
    return md.makeHtml(s || "");
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
