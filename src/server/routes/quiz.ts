import { Request, Response, Router } from "express";
import config from "../config";
import XRegExp from "xregexp";
import QuizResource from "../loki/QuizResource";
import moment from "moment";

class QuizController {
    public static build(req: Request, res: Response): Response {
        const db = config.db!;
        const deck: string = req.body.deck;
        const duePair = req.body.due;
        const tags: string[] = req.body.tags || [];

        const cards = db.card.eqJoin(db.deck, "deckId", "$loki", (l, r) => {
            const {$loki, nextReview} = l;
            return {
                id: $loki,
                nextReview,
                deck: r.name,
                tags: l.tags || []
            };
        }).where((d) => {
            return tags.length > 0 ? (d.tags.length > 0 && tags.every((t: string) => d.tags.indexOf(t) !== -1)) : true;
        }).find({deck: {$regex: `${XRegExp.escape(deck)}(/.+)?`}}).data();

        const due = duePair ? moment().add(duePair[0], duePair[1]) : new Date();

        return res.json(cards
            .filter((c) => (!c.nextReview || c.nextReview < due))
            .map((c) => c.id));
    }

    public static render(req: Request, res: Response): Response {
        const db = config.db!;
        const id: number = req.body.id;

        const card = db.card.findOne({$loki: id});

        return res.json(card);
    }

    public static right(req: Request, res: Response): Response {
        const db = config.db!;
        const id: number = req.body.id;

        db.card.updateWhere((c) => c.$loki === id, (c) => {
            c.srsLevel = (c.srsLevel || 0) + 1;
            if (c.srsLevel >= QuizResource.srsMap.length) {
                c.srsLevel = QuizResource.srsMap.length - 1;
            }
            c.nextReview = QuizResource.getNextReview(c.srsLevel);

            return c;
        });

        return res.sendStatus(201);
    }

    public static wrong(req: Request, res: Response): Response {
        const db = config.db!;
        const id: number = req.body.id;

        db.card.updateWhere((c) => c.$loki === id, (c) => {
            c.srsLevel = (c.srsLevel || 0) - 1;
            if (c.srsLevel < 0) {
                c.srsLevel = 0;
            }
            c.nextReview = QuizResource.repeat();

            return c;
        });

        return res.sendStatus(201);
    }
}

const router = Router();

router.post("/", QuizController.build);
router.post("/render", QuizController.render);
router.put("/right", QuizController.right);
router.put("/wrong", QuizController.wrong);

export default router;
