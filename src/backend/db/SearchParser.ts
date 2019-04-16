import P from "parsimmon";
import XRegExp from "xregexp";
import moment from "moment";

export interface ILokiSearchParserRule {
    anyOf?: string[];
    isString?: string[];
    isDate?: string[];
    isList?: string[];
}

export class LokiSearchParser {
    public static due(k: string, due: any[], cond?: any) {
        cond = cond || {};
        cond[k] = {$lte: moment().add(moment.duration(due[0], due[1])).toISOString()};
        return cond;
    }

    private lang: P.Language;

    constructor(rule: ILokiSearchParserRule = {}) {
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
                        let def = {[col]: {[col]: el}};

                        if ((!rule.isString && !rule.isList) || (rule.isString && rule.isString.indexOf(col) !== -1)) {
                            def = {[col]: {$regex: XRegExp.escape(el.toString())}};
                        } else if (rule.isList) {
                            def = {[col]: {$contains: el.toString()}};
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

                const result = {} as any;

                if (v === "NULL") {
                    return {$or: [
                        {[k]: ""},
                        {[k]: {$exists: false}}
                    ]};
                }

                if (rule.isDate && rule.isDate.indexOf(k) !== -1) {
                    const m = /^([-+]?\d+)(\S+)$/.exec(v.toString());

                    if (m) {
                        return LokiSearchParser.due(k, [parseInt(m[1]), m[2]]);
                    } else if (v === "now") {
                        v = moment().toISOString();
                        op = "<=";
                    }
                }

                switch (op) {
                    case ":":
                        if (rule.isString) {
                            if (rule.isString.indexOf(k) !== -1) {
                                v = {$regex: XRegExp.escape(v.toString())};
                            }
                        } else {
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

                result[k] = v;

                return result;
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

export default LokiSearchParser;
