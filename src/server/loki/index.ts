import Loki from "lokijs";

export interface IDeck {
    $loki?: number;
    guid?: string;
    name: string;
}

export interface ICard {
    $loki?: number;
    guid?: string;
    deckId: number;
    front: string;
    back?: string;
    note?: string;
    srsLevel?: number;
    nextReview?: Date;
    tags?: string[];
}

export interface IImage {
    $loki?: number;
    guid: string;
    url: string;
    h: string;
    b?: Buffer;
    md5?: string;
    note?: string;
    tags?: string[];
}

export class Db {
    public static async connect(filename: string): Promise<Db> {
        const loki = new Loki(filename, {
            autosave: true
        });

        await new Promise((resolve, reject) => {
            loki.loadDatabase({}, (e) => e ? reject(e) : resolve());
        });

        return new Db(loki);
    }

    public deck: Collection<IDeck>;
    public card: Collection<ICard>;
    public image: Collection<IImage>;

    public loki: Loki;

    constructor(loki: Loki) {
        this.loki = loki;

        this.deck = loki.getCollection("deck");
        if (this.deck === null) {
            this.deck = loki.addCollection("deck", {
                unique: ["name"]
            });
        }

        this.card = loki.getCollection("card");
        if (this.card === null) {
            this.card = loki.addCollection("card", {
                unique: ["front"]
            });
        }

        this.image = loki.getCollection("image");
        if (this.image === null) {
            this.image = loki.addCollection("image", {
                unique: ["url", "md5"]
            });
        }
    }

    public close() {
        this.loki.close();
    }

    public getOrCreateDeck(name: string): number {
        const d = this.deck.findOne({name});
        if (d === null) {
            return this.deck.insertOne({name})!.$loki;
        }
        return d.$loki;
    }
}
