import showdown from "showdown";

export async function fetchJSON(url: string, data: any = {}, method?: string): Promise<any> {
    const res = await fetch(url, {
        method: method || "POST",
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        },
        body: JSON.stringify(data)
    });

    try {
        return await res.json();
    } catch (e) {
        return res.status;
    }
}

export function shuffle(a: any[]) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

const mdMarkerRegex = /^@md[^\n]*\n(.+)/s;
const mdConverter = new showdown.Converter();

export function md2html(s: string): string {
    mdMarkerRegex.lastIndex = 0;
    const m = mdMarkerRegex.exec(s);

    if (m) {
        return mdConverter.makeHtml(m[1]);
    } else {
        return `<pre>${s}</pre>`;
    }
}
