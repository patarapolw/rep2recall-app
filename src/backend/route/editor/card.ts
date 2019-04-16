import { Request, Response, Router } from "express";
import SearchResource from "../../db/SearchResource";
import Config from "../../config";
import mustache from "mustache";

class EditorController {
    public static find(req: Request, res: Response): Response {
        const db = Config.db!;
        const rSearch = new SearchResource(db);
        const cond = rSearch.parse(req.body.q);

        const offset: number = req.body.offset;
        const limit: number = req.body.limit;
        const sortBy: string = req.body.sortBy || "deck";
        const desc: boolean = req.body.desc || false;

        const q = rSearch.getQuery(cond);

        return res.json({
            data: q.copy().sort((a, b) => SearchResource.sorter(a, b, sortBy, desc)).offset(offset).limit(limit).data()
            .map((c) => {
                const data = c.data || {};
                if (/@md5\n/.test(c.front)) {
                    c.front = mustache.render(c.tFront, data);
                    c.back = c.back || mustache.render(c.tBack || "", data);
                }

                return c;
            }),
            count: q.count()
        });
    }

    public static findOne(req: Request, res: Response): Response {
        const db = Config.db!;
        const rSearch = new SearchResource(db);
        const cond = {id: req.body.id};

        const q = rSearch.getQuery(cond);
        const c = q.limit(1).data()[0];

        if (/@md5\n/.test(c.front)) {
            c.front = c.tFront;
            c.back = c.back || c.tBack;
        }

        return res.json(c);
    }

    public static create(req: Request, res: Response): Response {
        const db = Config.db!;
        const id = db.insertMany([req.body.create])[0];

        return res.json({id});
    }

    public static update(req: Request, res: Response): Response {
        if (req.body.create) {
            return EditorController.create(req, res);
        }

        const db = Config.db!;
        const id: number = req.body.id;

        if (req.body.update) {
            const u = req.body.update;
            db.update(id, u);
        } else {
            const fieldName: string = req.body.fieldName;
            const fieldData: any = req.body.fieldData;
            db.update(id, {[fieldName]: fieldData});
        }

        return res.sendStatus(201);
    }

    public static delete(req: Request, res: Response): Response {
        const id: number = req.body.id;
        const db = Config.db!;
        db.card.removeWhere((c) => c.$loki === id);

        return res.sendStatus(201);
    }
}

export const router = Router();

router.post("/", EditorController.find);
router.post("/findOne", EditorController.findOne);
router.post("/create", EditorController.create);
router.put("/", EditorController.update);
router.delete("/", EditorController.delete);

export default router;
