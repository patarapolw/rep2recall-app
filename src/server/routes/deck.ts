import { Request, Response, Router } from "express";
import config from "../config";
import XRegExp from "xregexp";

class DeckController {
    public static find(req: Request, res: Response): Response {
        const db = config.db!;
        const tags = req.body.tags || [];

        const decks = db.card.eqJoin(db.deck, "deckId", "$loki", (l, r) => {
            return {
                tags: l.tags || [],
                deck: r.name
            };
        }).where((d) => {
            return tags.length > 0 ? (d.tags.length > 0 && tags.every((t: string) => d.tags.indexOf(t) !== -1)) : true;
        }).data().map((d) => d.deck);
        return res.json({decks: decks.filter((d, i) => decks.indexOf(d) === i)});
    }

    public static stat(req: Request, res: Response): Response {
        const db = config.db!;
        const deck: string = req.body.deck;
        const tags = req.body.tags || [];

        const cards = db.card.eqJoin(db.deck, "deckId", "$loki", (l, r) => {
            const {srsLevel, nextReview} = l;
            return {
                tags: l.tags || [],
                srsLevel, nextReview,
                deck: r.name
            };
        }).where((d) => {
            return tags.length > 0 ? (d.tags.length > 0 && tags.every((t: string) => d.tags.indexOf(t) !== -1)) : true;
        }).find({deck: {$regex: `${XRegExp.escape(deck)}(/.+)?`}}).data();

        const now = new Date();

        return res.json({
            new: cards.filter((c) => !c.nextReview).length,
            due: cards.filter((c) => c.nextReview < now).length,
            leech: cards.filter((c) => c.srsLevel === 0).length
        });
    }
}

const router = Router();

router.post("/", DeckController.find);
router.post("/stat", DeckController.stat);

export default router;
