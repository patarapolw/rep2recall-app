import XRegExp from "xregexp";

export interface IStrStrMap {
    [k: string]: string;
}

export function simpleMustacheRender(s: string, d: IStrStrMap = {}): string {
    for (const k of Object.keys(d)) {
        s = s.replace(new RegExp(`{{(?:\\S+:)?${XRegExp.escape(k)}}}`), d[k]);
    }

    s = s.replace(new RegExp(`{{(?:\\S+:)?[^}]+}}`), "");

    return s;
}
