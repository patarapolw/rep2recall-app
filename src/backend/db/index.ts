import Loki, { Collection } from "@lokidb/loki";
import { FSStorage } from "@lokidb/fs-storage";
import fs from "fs";
import moment from "moment";

FSStorage.register();

declare function interfaceKeys<T extends object>(): Array<keyof T>;

export interface IDeck {
    $loki?: number;
    guid?: string;
    name: string;
    isOpen?: boolean;
}

export interface ICard {
    $loki?: number;
    guid?: string;
    deckId: number;
    templateId?: number;
    noteId?: number;
    front: string;
    back?: string;
    mnemonic?: string;
    srsLevel?: number;
    nextReview?: Date;
    tag?: string[];
    created?: Date;
    modified?: Date;
}

export interface ISource {
    $loki?: number;
    created: Date;
    name: string;
    h: string;
}

export interface ITemplate {
    guid?: string;
    sourceId?: number;
    name: string;
    model?: string;
    front: string;
    back?: string;
    css?: string;
}

export interface INote {
    $loki?: number;
    guid?: string;
    sourceId?: number;
    name: string;
    data: Map<string, string>;
}

export interface IMedia {
    $loki?: number;
    sourceId?: number;
    name: string;
    data: Buffer;
    h: string;
}

export interface IEntry {
    $loki?: number;
    template?: string;
    model?: string;
    entry?: string;
    tFront?: string;
    tBack?: string;
    deck: string;
    front: string;
    back?: string;
    mnemonic?: string;
    srsLevel?: number;
    nextReview?: string | Date;
    tag?: string[];
    data?: Map<string, string>;
    sourceId?: number;
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
    public deck: Collection<IDeck>;
    public card: Collection<ICard>;
    public source: Collection<ISource>;
    public template: Collection<ITemplate>;
    public note: Collection<INote>;
    public media: Collection<IMedia>;

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
            this.card = this.loki.addCollection("card", {
                unique: ["front"]
            });
        }

        this.source = this.loki.getCollection("source");
        if (this.source === null) {
            this.source = this.loki.addCollection("source");
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

    public insertMany(entries: IEntry[]): number[] {
        let decks = entries.map((e) => e.deck);
        decks = decks.filter((d, i) => decks.indexOf(d) === i);
        const deckIds = decks.map((d) => this.getOrCreateDeck(d));

        let sourceId: number;
        let templates = entries.filter((e) => e.model && e.template).map((e) => {
            sourceId = e.sourceId!;
            return `${e.template}\x1f${e.model}`;
        });
        templates = templates.filter((t, i) => templates.indexOf(t) === i);
        const templateIds = templates.map((t) => {
            const [name, model] = t.split("\x1f");
            return this.template.findOne({sourceId, name, model}).$loki;
        });

        const noteIds = entries.map((e) => {
            const {entry, data} = e;
            if (entry) {
                return this.note.insertOne({
                    sourceId: sourceId!,
                    name: entry!,
                    data: data!
                }).$loki;
            } else {
                return undefined;
            }
        });

        const now = new Date();
        const cards: ICard[] = entries.map((e, i) => {
            const {deck, nextReview, front, back, mnemonic, srsLevel, tag} = e;
            return {
                front, back, mnemonic, srsLevel, tag,
                nextReview: nextReview ? moment(nextReview).toDate() : undefined,
                deckId: deckIds[decks.indexOf(deck)],
                noteId: noteIds[i],
                templateId: e.template && e.model ? templateIds[templates.indexOf(`${e.template}\x1f${e.model}`)] : undefined,
                created: now
            } as ICard;
        });

        let res = this.card.insert(cards);

        if (!Array.isArray(res)) {
            res = [res];
        }

        return res.map((c) => c.$loki);
    }

    public update(u: Partial<IEntry>) {
        const c = this.transformUpdate(u);
        c.modified = new Date();
        return this.card.updateWhere((c0) => c0.$loki === c.$loki, (c0) => {
            return Object.assign(c0, u);
        });
    }

    private transformUpdate(u: Partial<IEntry>): Partial<ICard> {
        const output: Partial<ICard> = {};

        for (const k of Object.keys(u)) {
            const v = (u as any)[k];

            if (k === "deck") {
                output.deckId = this.getOrCreateDeck(v);
                delete (u as any)[k];
            } else if (k === "nextReview") {
                output.nextReview = moment(v).toDate();
            } else if (interfaceKeys<ICard>().indexOf(k as any) !== -1) {
                (output as any)[k] = v;
            }
        }

        return output;
    }

    private getOrCreateDeck(name: string): number {
        try {
            return this.deck.insertOne({name}).$loki;
        } catch (e) {
            return this.deck.findOne({name}).$loki;
        }
    }
}

export default Db;
