import XRegExp from "xregexp";

export interface IStrStrMap {
    [k: string]: string;
}

export function simpleMustacheRender(s: string, d: IStrStrMap = {}): string {
    for (const k of Object.keys(d)) {
        s = s.replace(new RegExp(`{{(\\S+:)?${XRegExp.escape(k)}}}`, "g"), d[k]);
    }

    s = s.replace(/{{#(\S+)}}(.*){{\/\1}}/gs, (m: any, p1: any, p2: any) => {
        return d[p1] ? p2 : "";
    })

    s = s.replace(/{{[^}]+}}/g, "");

    return s;
}
