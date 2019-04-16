import Db from ".";
import LokiSearchParser from "./SearchParser";

export class SearchResource {
    public static sorter(a: any, b: any, sortBy: string, desc: boolean) {
        function convert(x: any) {
            let v = x[sortBy];
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

    private db: Db;
    private parser: LokiSearchParser;

    constructor(db: Db, anyOf: string[] = ["template", "front", "back", "note", "deck"]) {
        this.db = db;
        this.parser = new LokiSearchParser({
            anyOf,
            isString: ["template", "front", "back", "note", "deck", "name", "entry"],
            isDate: ["nextReview"],
            isList: ["tag"]
        });
    }

    public parse(q?: string) {
        return this.parser.parse(q);
    }

    public getQuery(cond: any) {
        return this.db.card.eqJoin(this.db.deck, "deckId", "$loki", (l, r) => {
            const {front, back, note, tag, srsLevel, nextReview, template, vocab} = l;
            const deck = r.name;
            return {id: l.$loki, front, back, note, tag, srsLevel, nextReview, template, vocab, deck};
        }).eqJoin(this.db.template, (l) => l.template ? l.template.split("/")[0] : null, "name", (l, r) => {
            delete l.$loki;
            delete l.meta;
            return {...l, templateId: r.$loki, tFront: r.front, tBack: r.back};
        }).eqJoin(this.db.note, (l) => l.template ? l.template.split("/")[1] : null, "entry", (l, r) => {
            delete l.$loki;
            delete l.meta;
            delete r.dataId;

            for (const k of Object.keys(r.data || {})) {
                if (!l[k]) {
                    l[k] = r.data[k];
                } else {
                    // l[k] = [l[k], r.data[k]];
                }
            }

            return {...l, data: r.data};
        }).find(cond);
    }
}

export default SearchResource;
