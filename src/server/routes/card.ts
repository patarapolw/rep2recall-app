import config from "../config";
import { Request, Response, Router } from "express";
import { ICard } from "../loki";
import moment from "moment";

interface IExternalCard {
    guid?: string;
    front: string;
    back?: string;
    tags?: string[];
    note?: string;
    deckName: string;
}

class CardController {
    public static create(req: Request, res: Response): Response {
        const db = config.db!;
        if (req.body.card) {
            const c = req.body.card as IExternalCard;
            db.card.insert({
                deckId: db.getOrCreateDeck(c.deckName),
                guid: c.guid,
                front: c.front,
                back: c.back,
                note: c.note
            } as ICard);
        } else if (req.body.cards) {
            const cards: IExternalCard[] = req.body.cards;

            db.card.insert(cards.map((c) => {
                return {
                    deckId: db.getOrCreateDeck(c.deckName),
                    guid: c.guid,
                    front: c.front,
                    back: c.back,
                    note: c.note
                } as ICard;
            }));
        } else {
            return res.sendStatus(304);
        }

        return res.sendStatus(201);
    }

    public static find(req: Request, res: Response): Response {
        const db = config.db!;

        const query = req.body.query;
        const offset: number = req.body.offset;
        const limit: number = req.body.limit;

        const trueQuery = {} as any;
        Object.keys(query).forEach((k) => {
            if (typeof query[k] === "string") {
                trueQuery[k] = {$regex: query[k]};
            } else {
                trueQuery[k] = query[k];
            }
        });

        const q = db.card.eqJoin(db.deck, "deckId", "$loki", (l, r) => {
            const {$loki, front, back, note, srsLevel, nextReview, tags} = l;
            return {
                id: $loki,
                front, back, note, srsLevel, nextReview, tags,
                deck: r.name
            };
        }).find(trueQuery);
        const total = q.copy().count();

        return res.json({
            data: q.offset(offset).limit(limit).data(),
            total
        });
    }

    public static upsert(req: Request, res: Response): Response {
        const db = config.db!;

        const {id, fieldName, fieldData} = req.body;
        if (id) {
            let trueData: any;
            if (fieldName === "deck") {
                trueData = db.getOrCreateDeck(fieldData);
            } else if (fieldName === "nextReview") {
                const m = moment(fieldData);
                if (m.isValid()) {
                    trueData = m.toDate();
                } else {
                    return res.sendStatus(304);
                }
            } else {
                trueData = fieldData;
            }

            db.card.updateWhere((c) => c.$loki === id, (c) => {
                (c as any)[fieldName] = trueData;
                return c;
            });
        } else if (fieldName === "front") {
            const trueData: string = fieldData;

            const $loki = db.card.insertOne({
                deckId: db.getOrCreateDeck("default"),
                front: trueData
            })!.$loki;

            return res.json({
                id: $loki,
                deck: "default"
            });
        } else {
            return res.sendStatus(304);
        }

        return res.sendStatus(201);
    }

    public static delete(req: Request, res: Response): Response {
        const db = config.db!;
        const id: number = req.body.id;

        db.card.removeWhere((c) => c.$loki === id);

        return res.sendStatus(201);
    }
}

const router = Router();

router.post("/create", CardController.create);
router.post("/", CardController.find);
router.put("/", CardController.upsert);
router.delete("/", CardController.delete);

export default router;
