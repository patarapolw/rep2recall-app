import P from "parsimmon";
import XRegExp from "xregexp";
import moment from "moment";

export interface ISearchParserRule {
    anyOf?: string[];
    isString?: string[];
    isDate?: string[];
}

export class SearchParser {
    private lang: P.Language;

    constructor(rule: ISearchParserRule = {
        anyOf: ["template", "front", "mnemonic", "entry", "deck", "tag"],
        isString: ["template", "front", "back", "mnemonic", "deck", "tag", "entry"],
        isDate: ["created", "modified", "nextReview"]
    }) {
        this.lang = P.createLanguage({
            Input: (r) => P.alt(
                r.OrSentence,
                r.AndSentence,
                r.Sentence
            ),
            OrSentence: (r) => P.seq(
                r.Sentence,
                P.string(" OR "),
                r.Sentence
            ).map((el) => {
                return {$or: [el[0], el[2]]};
            }),
            AndSentence: (r) => P.seq(
                r.Sentence,
                P.string(" "),
                r.Sentence
            ).map((el) => {
                return {$and: [el[0], el[2]]};
            }),
            Sentence: (r) => P.alt(
                r.Bracketed,
                r.OrExpr,
                r.AndExpr,
                r.Expr
            ),
            Bracketed: (r) => P.string("(").then(r.Sentence).skip(P.string(")")),
            OrExpr: (r) => P.seq(
                r.Expr,
                P.string(" OR "),
                r.Expr
            ).map((el) => {
                return {$or: [el[0], el[2]]};
            }),
            AndExpr: (r) => P.seq(
                r.Expr,
                P.string(" "),
                r.Expr
            ).map((el) => {
                return {$and: [el[0], el[2]]};
            }),
            Expr: (r) => P.alt(
                r.FullExpr,
                r.PartialExpr
            ),
            PartialExpr: (r) => r.Value.map((el) => {
                const expr = [] as any[];

                if (rule.anyOf) {
                    for (const col of rule.anyOf) {
                        let def = {[col]: el};

                        if (!rule.isString || (rule.isString && rule.isString.indexOf(col) !== -1)) {
                            def = {[col]: {$regex: XRegExp.escape(el.toString())}};
                        }

                        expr.push(def);
                    }
                } else if (rule.isString) {
                    for (const col of rule.isString) {
                        expr.push({[col]: {$regex: XRegExp.escape(el.toString())}});
                    }
                }

                if (expr.length === 0) {
                    throw new Error("Any or String not set");
                } else if (expr.length === 1) {
                    return expr[0];
                }

                return {$or: expr};
            }),
            FullExpr: (r) => P.seq(
                r.String,
                r.Op,
                r.Value
            ).map((el: any[]) => {
// tslint:disable-next-line: prefer-const
                let [k, op, v] = el;

                if (k === "is") {
                    if (v === "due") {
                        k = "nextReview";
                        op = "<=";
                        v = moment().toISOString();
                    } else if (v === "leech") {
                        k = "srsLevel";
                        v = 0;
                    } else if (v === "new") {
                        k = "srsLevel";
                        v = "NULL";
                    }
                }

                if (v === "NULL") {
                    return {$or: [
                        {[k]: ""},
                        {[k]: {$exists: false}}
                    ]};
                }

                if (rule.isDate && rule.isDate.indexOf(k) !== -1) {
                    const m = /^([-+]?\d+)(\S+)$/.exec(v.toString());

                    if (m) {
                        v = moment().add(moment.duration(parseInt(m[1]), m[2] as any)).toISOString();
                        op = "<=";
                    } else if (v === "now") {
                        v = moment().toISOString();
                        op = "<=";
                    }
                }

                switch (op) {
                    case ":":
                        if (typeof v === "string") {
                            v = {$regex: XRegExp.escape(v)};
                        } else if (rule.isString && rule.isString.indexOf(k) !== -1) {
                            v = {$regex: XRegExp.escape(v.toString())};
                        }
                        break;
                    case "~":
                        v = {$regex: v.toString()};
                        break;
                    case ">=":
                        v = {$gte: v};
                        break;
                    case ">":
                        v = {$gt: v};
                        break;
                    case "<=":
                        v = {$lte: v};
                        break;
                    case "<":
                        v = {$lt: v};
                        break;
                    case "=":
                    default:
                }
                // result[k] = v;

                return {[k]: v};
            }),
            Value: (r) => P.alt(
                r.Number,
                r.String
            ),
            Number: () => P.regexp(/^\d+(?:\.\d+)?$/).map(Number),
            String: (r) => P.alt(
                r.RawString,
                r.QuoteString
            ),
            RawString: () => P.regexp(/[^" :>=<~]+/),
            QuoteString: (r) => r.Quote.then(r.Value).skip(r.Quote),
            Quote: () => P.string('"'),
            Op: () => P.alt(
                P.string(":"),
                P.string("~"),
                P.string(">="),
                P.string(">"),
                P.string("<="),
                P.string("<"),
                P.string("=")
            ),
            _: () => P.optWhitespace
        });
    }

    public parse(s?: string) {
        const r = this.lang.Input.parse(s || "");
        if (!r.status) {
            return {};
        } else {
            return r.value;
        }
    }
}

export function sorter(a: any, b: any, sortBy: string, desc: boolean) {
    function convert(x: any) {
        let v;
        if (sortBy.indexOf("data.") === 0 && x.data) {
            v = x.data[sortBy];
        } else {
            v = x[sortBy];
        }

        if (!v && v !== 0) {
            v = -Infinity;
        }
        return v;
    }

    function compare() {
        const m = convert(a);
        const n = convert(b);
        if (typeof m === "string" && typeof n === "string") {
            return m.localeCompare(n);
        } else if (typeof m === "string") {
            return 1;
        } else if (typeof n === "string") {
            return -1;
        } else {
            return m - n;
        }
    }

    return desc ? -compare() : compare();
}

export function mongoToFilter(cond: any): (item: any) => boolean {
    return (item: any) => {
        for (const k of Object.keys(cond)) {
            if (k[0] === "$") {
                if (k === "$and") {
                    const ck: any[] = cond[k];
                    return ck.every((c) => mongoToFilter(c)(item));
                } else if (k === "$or") {
                    const ck: any[] = cond[k];
                    return ck.some((c) => mongoToFilter(c)(item));
                } else if (k === "$not") {
                    return !mongoToFilter(cond[k])(item);
                }
            } else {
                const ck: any = cond[k];
                const v = item[k] || (item.data ? item.data[k] : undefined);

                if (ck && typeof ck === "object" && Object.keys(ck).some((c) => c[0] === "$")) {
                    return mongoCompare(v, ck);
                } else {
                    if (Array.isArray(v)) {
                        if (v.indexOf(ck) === -1) {
                            return false;
                        }
                    } else {
                        if (v !== ck) {
                            return false;
                        }
                    }
                }
            }
        }

        return true;
    };
}

function mongoCompare(v: any, ck: any): boolean {
    try {
        for (const op of Object.keys(ck)) {
            const v0 = ck[op];
    
            if (op === "$regex") {
                if (Array.isArray(v)) {
                    return v.some((b) => new RegExp(v0.toString(), "i").test(b));
                } else {
                    return new RegExp(v0.toString(), "i").test(v);
                }
            } else if (op === "$startswith") {
                if (Array.isArray(v)) {
                    return v.some((b) => b.indexOf(v0.toString()) === 0);
                } else {
                    return v.indexOf(v0.toString()) === 0;
                }
            } else if (op === "$gte") {
                return v >= v0;
            } else if (op === "$gt") {
                return v > v0;
            } else if (op === "$lte") {
                return v <= v0;
            } else if (op === "$lt") {
                return v < v0;
            } else if (op === "$exists") {
                return (!!v && v !== 0) === v0;
            } else if (op === "$in") {
                return (v0 as any[]).some((a) => a === v);
            }
        }
    } catch (e) {}

    return false;
}
