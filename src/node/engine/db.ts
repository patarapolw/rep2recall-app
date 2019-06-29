import Loki, { Collection } from "@lokidb/loki";
import { FSStorage } from "@lokidb/fs-storage";
import fs from "fs";
import SparkMD5 from "spark-md5";
import { ankiMustache, shuffle, pp } from "../util";
import { ISearchParserResult, mongoFilter, sorter } from "./search";
import { srsMap, getNextReview, repeatReview } from "./quiz";

FSStorage.register();

export interface IDbDeck {
    $loki?: number;
    name: string;
}

export interface IDbSource {
    $loki?: number;
    name: string;
    h: string;
    created: string;
}

export interface IDbTemplate {
    $loki?: number;
    sourceId: number;
    name: string;
    model?: string;
    front: string;
    back?: string;
    css?: string;
    js?: string;
}

export interface INoteDataSocket {
    key: string;
    value: string | {[k: string]: any};
}

export interface IDbNote {
    $loki?: number;
    sourceId?: number;
    key: string;
    data: INoteDataSocket[];
}

export interface IDbMedia {
    $loki?: number;
    sourceId?: number;
    name: string;
    data: Buffer;
    h: string;
}

export interface IDbCard {
    $loki?: number;
    deckId: number;
    templateId?: number;
    noteId?: number;
    front: string;
    back?: string;
    mnemonic?: string;
    srsLevel?: number;
    nextReview?: string;
    tag?: string[];
    created: string;
    modified?: string;
    stat?: {
        streak: {right: number; wrong: number};
    }
}

export interface IEntry {
    front: string;
    deck: string;
    id?: number;
    back?: string;
    mnemonic?: string;
    srsLevel?: number;
    nextReview?: string;
    tag?: string[];
    created?: string;
    modified?: string;
    stat?: {
        streak: {right: number; wrong: number};
    };
    template?: string;
    model?: string;
    tFront?: string;
    tBack?: string;
    css?: string;
    js?: string;
    key?: string;
    data?: INoteDataSocket[];
    source?: string;
    sH?: string;
    sCreated?: string;
}

interface ICondOptions {
    offset?: number;
    limit?: number;
    sortBy?: string;
    desc?: boolean;
    fields?: string[];
}

interface IPagedOutput<T> {
    data: T[];
    count: number;
}

export class Db {
    public static async connect(filename: string): Promise<Db> {
        const loki = new Loki(filename);
        await loki.initializePersistence({
            autoload: fs.existsSync(filename),
            autosave: true,
            autosaveInterval: 4000
        });

        return new Db(loki);
    }

    public loki: Loki;
    public deck: Collection<IDbDeck>;
    public card: Collection<IDbCard>;
    public source: Collection<IDbSource>;
    public template: Collection<IDbTemplate>;
    public note: Collection<IDbNote>;
    public media: Collection<IDbMedia>;

    private constructor(loki: Loki) {
        this.loki = loki;

        this.deck = this.loki.getCollection("deck");
        if (this.deck === null) {
            this.deck = this.loki.addCollection("deck", {
                unique: ["name"]
            });
        }

        this.card = this.loki.getCollection("card");
        if (this.card === null) {
            this.card = this.loki.addCollection("card");
        }

        this.source = this.loki.getCollection("source");
        if (this.source === null) {
            this.source = this.loki.addCollection("source", {
                unique: ["h"]
            });
        }

        this.template = this.loki.getCollection("template");
        if (this.template === null) {
            this.template = this.loki.addCollection("template");
        }

        this.note = this.loki.getCollection("note");
        if (this.note === null) {
            this.note = this.loki.addCollection("note");
        }

        this.media = this.loki.getCollection("media");
        if (this.media === null) {
            this.media = this.loki.addCollection("media", {
                unique: ["h"]
            });
        }
    }

    public parseCond(
        cond: Partial<ISearchParserResult>,
        options: ICondOptions = {}
    ): IPagedOutput<IEntry> {
        cond.cond = cond.cond || {};
        if (!options.fields && !cond.fields) {
            return {
                data: [],
                count: 0
            };
        }

        const allFields = new Set(options.fields || []);
        for (const f of (cond.fields || [])) {
            allFields.add(f);
        }

        if (cond.is) {
            if (cond.is.has("distinct") || cond.is.has("duplicate")) {
                allFields.add("key");
            }
            
            if (cond.is.has("random")) {
                cond.sortBy = "random";
            }
        }

        let q = this.card.chain();

        if (["data", "key"].some((k) => allFields.has(k))) {
            q = q.eqJoin(this.note, "noteId", "$loki", (l, r) => {
                delete l.$loki;
                delete l.meta;
                const {key, data} = r;
                return {...l, key, data};
            });
        }
        
        if (["deck"].some((k) => allFields.has(k))) {
            q = q.eqJoin(this.deck, "deckId", "$loki", (l, r) => {
                delete l.$loki;
                delete l.meta;
                const {name} = r;
                return {...l, deck: name};
            });
        }
        
        if (["sCreated", "sH", "source"].some((k) => allFields.has(k))) {
            q = q.eqJoin(this.source, "sourceId", "$loki", (l, r) => {
                delete l.$loki;
                delete l.meta;
                const {created, h, name} = r;
                return {...l, sCreated: created, sH: h, source: name};
            });
        }
        
        if (["tFront", "tBack", "template", "model", "css", "js"].some((k) => allFields.has(k))) {
            q = q.eqJoin(this.template, "templateId", "$loki", (l, r) => {
                delete l.$loki;
                delete l.meta;
                const {front, back, name, model, css, js} = r;
                return {...l, tFront: front, tBack: back, template: name, model, css, js};
            });
        }

        let cards = q.data().map((c) => {
            (c as any).id = c.$loki;
            return c;
        }).filter(mongoFilter(cond.cond || {})) as IEntry[];

        if (cond.is) {
            if (cond.is.has("distinct")) {
                shuffle(cards);
                const allKeys = cards.map((c) => c.key);
                cards = cards.filter((c, i) => !c.key || allKeys.indexOf(c.key) === i);
            }

            if (cond.is.has("duplicate")) {
                const output = [] as any[];
                let counter = {} as any;

                for (const c of cards) {
                    if (c.key) {
                        counter[c.key] = counter[c.key] || [];
                        counter[c.key].push(c);
                    }
                }

                for (const k of Object.keys(counter)) {
                    if (counter[k].length > 1) {
                        output.push(...counter[k]);
                    }
                }

                cards = output;
            }
        }

        const sortBy = cond.sortBy || options.sortBy;
        const desc = cond.desc || options.desc;

        if (sortBy === "random") {
            shuffle(cards);
        } else {
            cards = cards.sort(sorter(sortBy, desc));
        };

        let endPoint: number | undefined;
        if (options.limit) {
            endPoint = (options.offset || 0) + options.limit;
        }

        return {
            data: cards.slice(options.offset || 0, endPoint).map((c) => {
                if (options.fields) {
                    for (const k of Object.keys(c)) {
                        if (!options.fields.includes(k) && k !== "$loki") {
                            delete (c as any)[k];
                        }
                    }
                }
    
                return c;
            }),
            count: cards.length
        };
    }

    public insertMany(entries: IEntry[]): number[] {
        entries = entries.map((e) => this.transformCreateOrUpdate(null, e)) as IEntry[];

        const eValidSource = entries.filter((e) => e.sH);
        const now = new Date().toISOString();

        let sourceH: string = "";
        let sourceId: number;
        for (const e of eValidSource.filter((e, i) => {
            return eValidSource.map((e1) => e1.sH).indexOf(e.sH) === i
        })) {
            sourceH = e.sH!;
            try {
                this.source.insertOne({
                    name: e.source!,
                    created: e.sCreated || now,
                    h: e.sH!
                })
            } catch (err) {}
        }

        if (sourceH) {
            sourceId = this.source.findOne({h: sourceH})!.$loki!
        }

        const eValidTemplate = entries.filter((e) => e.tFront);
        const tMap0: {[key: string]: number} = {};

        let tList = this.template.insert(eValidTemplate.map((e, i) => {
            tMap0[`${e.template}\x1f${e.model}`] = i;

            return {
                name: e.template!,
                model: e.model,
                front: e.tFront!,
                back: e.tBack,
                css: e.css,
                js: e.js,
                sourceId
            }
        }));

        if (!Array.isArray(tList)) {
            tList = [tList];
        }

        const eValidNote = entries.filter((e) => e.data);
        const nMap0: {[key: string]: number} = {};

        let nList = this.note.insert(eValidNote.map((e, i) => {
            nMap0[e.key!] = i;

            return {
                key: e.key!,
                data: e.data!,
                sourceId
            }
        }))

        if (!Array.isArray(nList)) {
            nList = [nList];
        }

        const dMap: {[key: string]: number} = {};
        const decks = entries.map((e) => e.deck);
        const deckIds = decks.map((d) => this.getOrCreateDeck(d));
        decks.forEach((d, i) => {
            dMap[d] = deckIds[i];
        });

        let cList = this.card.insert(entries.map((e) => {
            return {
                front: e.front,
                back: e.back,
                mnemonic: e.mnemonic,
                srsLevel: e.srsLevel,
                nextReview: e.nextReview,
                deckId: dMap[e.deck],
                noteId: nList[nMap0[e.key!]].$loki,
                templateId: tList[tMap0[`${e.template}\x1f${e.model}`]].$loki,
                created: now,
                tag: e.tag
            }
        }));

        if (!Array.isArray(cList)) {
            cList = [cList];
        }
        
        return cList.map((c) => c.$loki);
    }

    public updateMany(ids: number[], u: Partial<IEntry>) {
        const now = new Date().toISOString();

        return this.card.updateWhere((c0) => ids.includes(c0.$loki), (c0) => {
            return Object.assign(c0, this.transformCreateOrUpdate(c0.$loki, u, now));
        });
    }

    public addTags(ids: number[], tags: string[]) {
        const now = new Date().toISOString();

        return this.card.updateWhere((c0) => ids.includes(c0.$loki), (c0) => {
            c0.modified = now;
            c0.tag = c0.tag || [];
            for (const t of tags) {
                if (!c0.tag.includes(t)) {
                    c0.tag.push(t);
                }
            }
            return c0;
        });
    }

    public removeTags(ids: number[], tags: string[]) {
        const now = new Date().toISOString();

        return this.card.updateWhere((c0) => ids.includes(c0.$loki), (c0) => {
            c0.modified = now;
            const newTags: string[] = [];

            for (const t of (c0.tag || [])) {
                if (!tags.includes(t)) {
                    newTags.push(t);
                }
            }
            if (newTags.length > 0) {
                c0.tag = newTags;
            } else {
                delete c0.tag;
            }

            return c0;
        });
    }

    public deleteMany(ids: number[]) {
        return this.card.removeWhere((c0) => ids.includes(c0.$loki));
    }

    public render(cardId: number) {
        const r = this.parseCond({
            cond: {id: cardId}
        }, {
            limit: 1,
            fields: ["front", "back", "mnemonic", "tFront", "tBack", "data", "css", "js"]
        });

        const c = r.data[0];
        const {tFront, tBack, data} = c;
        
        if (/@md5\n/.test(c.front)) {
            c.front = ankiMustache(tFront || "", data);
        }

        if (c.back && /@md5\n/.test(c.back)) {
            c.back = ankiMustache(tBack || "", data, c.front);
        }

        return c;
    }

    public markRight(cardId: number) {
        return this.updateSrsLevel(+1, cardId);
    }

    public markWrong(cardId: number) {
        return this.updateSrsLevel(-1, cardId);
    }

    private updateSrsLevel(dSrsLevel: number, cardId: number) {
        const card = this.card.findOne({$loki: cardId});

        if (!card) {
            return;
        }

        card.srsLevel = card.srsLevel || 0;
        card.stat = card.stat || {streak: {
            right: 0,
            wrong: 0
        }};
        card.stat.streak = card.stat.streak || {
            right: 0,
            wrong: 0
        }

        if (dSrsLevel > 0) {
            card.stat.streak.right = (card.stat.streak.right || 0) + 1;
        } else if (dSrsLevel < 0) {
            card.stat.streak.wrong = (card.stat.streak.wrong || 0) + 1;
        }

        card.srsLevel += dSrsLevel;

        if (card.srsLevel >= srsMap.length) {
            card.srsLevel = srsMap.length - 1;
        }

        if (card.srsLevel < 0) {
            card.srsLevel = 0;
        }

        if (dSrsLevel > 0) {
            card.nextReview = getNextReview(card.srsLevel).toISOString();
        } else {
            card.nextReview = repeatReview().toISOString();
        }

        const {srsLevel, stat, nextReview} = card;
        this.updateMany([cardId], {srsLevel, stat, nextReview});
    }

    private transformCreateOrUpdate(
        cardId: number | null, 
        u: Partial<IEntry>, 
        timestamp: string = new Date().toISOString()
    ): Partial<IEntry> {
        let data: INoteDataSocket[] | undefined = undefined;
        let front: string = "";

        if (!cardId) {
            u.created = timestamp;
        } else {
            u.modified = timestamp;
        }

        if (u.front && u.front.startsWith("@template\n")) {
            if (!data) {
                if (cardId) {
                    data = this.getData(cardId);
                } else {
                    data = u.data || [];
                }
            }

            u.tFront = u.front.substr("@template\n".length);
        }

        if (u.tFront) {
            front = ankiMustache(u.tFront, data);
            u.front = "@md5\n" + SparkMD5.hash(front);
        }

        if (u.back && u.back.startsWith("@template\n")) {
            if (!data) {
                if (cardId) {
                    data = this.getData(cardId);
                } else {
                    data = u.data || [];
                }
            }

            u.tBack = (u.front || "").substr("@template\n".length);
            if (!front && cardId) {
                front = this.getFront(cardId);
            }
        }

        if (u.tBack) {
            const back = ankiMustache(u.tBack, data, front);
            u.back = "@md5\n" + SparkMD5.hash(back);
        }

        return u;
    }

    private getOrCreateDeck(name: string): number {
        try {
            return this.deck.insertOne({name}).$loki;
        } catch (e) {
            return this.deck.findOne({name}).$loki;
        }
    }

    private getData(cardId: number): INoteDataSocket[] | undefined {
        const c = this.card.findOne({$loki: cardId});
        if (c && c.noteId) {
            const n = this.note.findOne({$loki: c.noteId});
            if (n) {
                return n.data;
            }
        }

        return;
    }

    private getFront(cardId: number): string {
        const c = this.card.findOne({$loki: cardId});
        if (c) {
            if (c.front.startsWith("@md5\n") && c.templateId) {
                const t = this.template.findOne({$loki: c.templateId});
                const data = this.getData(cardId);
                if (t) {
                    return ankiMustache(t.front, data);
                }
            }

            return c.front;
        }

        return "";
    }
}

export default Db;

interface IJoinCollection<T> {
    data: T[];
    key: keyof T;
    includes?: Array<keyof T>;
    excludes?: Array<keyof T>;
}

function fullJoin<T, U>(
    colL: IJoinCollection<T>,
    colR: IJoinCollection<U>,
    mapFn: (l: T, r: U) => any,
    isFull: boolean = true
): any[] {
    const joinMapL: any = {};
    const joinMapR: any = {};
    const result: any[] = [];

    for (const rowR of colR.data) {
        const v = rowR[colR.key];

        if (colR.includes) {
            for (const k of Object.keys(rowR)) {
                if (!colR.includes.includes(k as any) && k !== colR.key) {
                    delete (rowR as any)[k];
                }
            }
        } else if (colR.excludes) {
            for (const k of Object.keys(rowR)) {
                if (colR.excludes.includes(k as any) && k !== colR.key) {
                    delete (rowR as any)[k];
                }
            }
        }

        if (v) {
            joinMapR[v] = joinMapR[v] || [];
            joinMapR[v].push(rowR);
        } else {
            result.push({} as T, rowR);
        }
    }

    for (const rowL of colL.data) {
        const v = rowL[colL.key];

        if (colL.includes) {
            for (const k of Object.keys(rowL)) {
                if (!colL.includes.includes(k as any) && k !== colL.key) {
                    delete (rowL as any)[k];
                }
            }
        } else if (colL.excludes) {
            for (const k of Object.keys(rowL)) {
                if (colL.excludes.includes(k as any) && k !== colL.key) {
                    delete (rowL as any)[k];
                }
            }
        }

        if (v) {
            for (const vR of joinMapR[v] || [{}]) {
                result.push(mapFn(rowL, vR));
            }

            if (isFull) {
                joinMapL[v] = joinMapL[v] || [];
                joinMapL[v].push(rowL);
            }
        } else {
            result.push(mapFn(rowL, {} as U));
        }
    }

    if (isFull) {
        for (const rowR of colR.data) {
            const v = rowR[colR.key];

            if (v) {
                if (colR.includes) {
                    for (const k of Object.keys(rowR)) {
                        if (!colR.includes.includes(k as any) && k !== colR.key) {
                            delete (rowR as any)[k];
                        }
                    }
                } else if (colR.excludes) {
                    for (const k of Object.keys(rowR)) {
                        if (colR.excludes.includes(k as any) && k !== colR.key) {
                            delete (rowR as any)[k];
                        }
                    }
                }

                for (const vL of joinMapL[v] || [{}]) {
                    result.push(mapFn(vL, rowR));
                }
            }
        }
    }

    return result;
}