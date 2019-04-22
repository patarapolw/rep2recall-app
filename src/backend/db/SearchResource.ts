import Db, { ICard, IDeck, ITemplate, INote, IEntry } from ".";
import SearchParser from "../loki-plugin/SearchParser";
import { ResultSet } from "@lokidb/loki/types/loki/src/result_set";

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
    private parser: SearchParser;

    constructor(db: Db, anyOf: string[] = ["template", "front", "back", "note", "deck"]) {
        this.db = db;
        this.parser = new SearchParser({
            anyOf,
            isString: ["template", "front", "back", "note", "deck", "name", "entry"],
            isDate: ["nextReview"],
            isList: ["tag"]
        });
    }

    public parse(q?: string) {
        return this.parser.parse(q);
    }

    public getQuery(cond: any): ResultSet<IEntry> {
        return this.db.card.eqJoin(this.db.deck, "deckId", "$loki", (l: ICard, r: IDeck) => {
            const {front, back, mnemonic, tag, srsLevel, nextReview, templateId, noteId} = l;
            const deck = r.name;
            return {id: l.$loki, front, back, mnemonic, tag, srsLevel, nextReview, templateId, noteId, deck};
        }).eqJoin(this.db.template, "templateId", "$loki", (l, r: ITemplate) => {
            delete l.$loki;
            delete l.meta;
            delete l.templateId;
            return {...l, template: r.name, model: r.model, tFront: r.front, tBack: r.back};
        }).eqJoin(this.db.note, "noteId", "$loki", (l, r: INote) => {
            delete l.$loki;
            delete l.meta;
            delete l.noteId;
            return {...l, entry: r.name, data: r.data};
        }).find(cond);
    }
}

export default SearchResource;
