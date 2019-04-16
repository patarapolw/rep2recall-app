import Loki, { Collection } from "@lokidb/loki";
import { FSStorage } from "@lokidb/fs-storage";
import fs from "fs";

FSStorage.register();

export interface IDeck {
    $loki?: number;
    guid?: string;
    name: string;
    isOpen?: boolean;
}

export interface ICard {
    guid: string;
    deckId: number;
    template?: string;
    front: string;
    back?: string;
    note?: string;
    srsLevel?: number;
    nextReview?: Date;
    tag?: string[];
}

export interface ITemplate {
    guid?: string;
    name: string;
    front: string;
    back?: string;
    css?: string;
}

export interface INote {
    $loki?: number;
    guid?: string;
    entry: string;
    data: any;
}

export interface IEntry {
    deck: string;
    template?: string;
    front: string;
    back?: string;
    srsLevel?: number;
    nextReview?: string;
    tag: string[];
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
    public template: Collection<ITemplate>;
    public note: Collection<INote>;

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

        this.template = this.loki.getCollection("template");
        if (this.template === null) {
            this.template = this.loki.addCollection("template", {
                unique: ["name"]
            });
        }

        const compositeUnique = (o: ITemplate) => {
            const {name, front} = o;
            if (this.template.findOne({name, front})) {
                throw new Error(`Duplicate unique key [name, front]: ${JSON.stringify({name, front})}` );
            }
        };

        this.template.on("pre-insert", compositeUnique);
        this.template.on("pre-update", compositeUnique);

        this.note = this.loki.getCollection("note");
        if (this.note === null) {
            this.note = this.loki.addCollection("note", {
                unique: ["entry"]
            });
        }
    }

    public insertMany(entries: IEntry[]): number[] {
        let decks = entries.map((e) => e.deck);
        decks = decks.filter((d, i) => decks.indexOf(d) === i);
        const deckIds = decks.map((d) => this.getOrCreateDeck(d));

        const cards: ICard[] = entries.map((e) => {
            const {deck, ...x} = e;
            return {
                ...x,
                deckId: deckIds[decks.indexOf(deck)]
            } as ICard;
        });

        let res = this.card.insert(cards);

        if (!Array.isArray(res)) {
            res = [res];
        }

        return res.map((c) => c.$loki);
    }

    public update(id: number, u: Partial<IEntry>) {
        const {deck, ...x} = u;

        if (deck) {
            (x as any).deckId = this.getOrCreateDeck(deck);
        }

        this.card.updateWhere((c) => c.$loki === id, (c) => {
            return Object.assign(c, x);
        });
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
