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
        if (res.status < 400) {
            return res.status;
        } else if (res.status === 403) {
            return location.reload();
        } else {
            throw new Error(res.statusText);
        }
    }
}

const md = new showdown.Converter({
    tables: true
});

export function md2html(s?: string) {
    return md.makeHtml(s || "");
}
