import { Request, Response, Router } from "express";
import SearchResource from "../db/SearchResource";
import Config from "../config";
import QuizResource from "../db/QuizResource";
import XRegExp from "xregexp";
import mustache from "mustache";

class QuizController {
    public static build(req: Request, res: Response): Response {
        const rSearch = new SearchResource(Config.db!, ["tag"]);
        const cond = rSearch.parse(req.body.q);

        if (req.body.deck) {
            cond.deck = {$regex: `${XRegExp.escape(req.body.deck)}(/.+)?`};
        }

        const nowStr = new Date().toISOString();

        const cards = rSearch.getQuery(cond).where((c) => {
            return !c.nextReview || c.nextReview < nowStr;
        }).data();

        return res.json(cards.map((c) => c.id));
    }

    public static render(req: Request, res: Response): Response {
        const db = Config.db!;
        const id: number = req.body.id;

        const card = db.card.findOne({$loki: id});

        if (/@md5\n/.test(card.front)) {
            const [t0, n0] = card.template!.split("/");
            const t = db.template.findOne({name: t0});
            const n = db.note.findOne({entry: n0});
            card.front = mustache.render(t.front, n.data);
            card.back = mustache.render(t.back || "", n.data);
        }

        return res.json(card);
    }

    public static right(req: Request, res: Response): Response {
        const db = Config.db!;
        const id: number = req.body.id;

        db.card!.updateWhere((c) => c.$loki === id, (c) => {
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
        const db = Config.db!;
        const id: number = req.body.id;

        db.card!.updateWhere((c) => c.$loki === id, (c) => {
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
