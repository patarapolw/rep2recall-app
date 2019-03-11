import { Request, Response, Router } from "express";
import config from "../config";
import XRegExp from "xregexp";

class DeckController {
    public static find(req: Request, res: Response): Response {
        const db = config.db!;
        const decks = db.deck.find().map((deck) => deck.name);
        return res.json({decks});
    }

    public static stat(req: Request, res: Response): Response {
        const db = config.db!;
        const deck: string = req.body.deck;

        const cards = db.card.eqJoin(db.deck, "deckId", "$loki", (l, r) => {
            const {srsLevel, nextReview} = l;
            return {
                srsLevel, nextReview,
                deck: r.name
            };
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
