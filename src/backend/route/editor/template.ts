import { Request, Response, Router } from "express";
import SearchResource from "../../db/SearchResource";
import Config from "../../config";

class TemplateEditorController {
    public static find(req: Request, res: Response): Response {
        const db = Config.db!;
        const rSearch = new SearchResource(db);
        const cond = rSearch.parse(req.body.q);

        const offset: number = req.body.offset;
        const limit: number = req.body.limit;
        const sortBy: string = req.body.sortBy || "name";
        const desc: boolean = req.body.desc || false;

        const q = db.template.chain().find(cond);

        return res.json({
            data: q.copy().sort((a, b) => SearchResource.sorter(a, b, sortBy, desc)).offset(offset).limit(limit).data(),
            count: q.count()
        });
    }

    public static findOne(req: Request, res: Response): Response {
        const db = Config.db!;
        const cond = {$loki: req.body.id};

        const t = db.template.findOne(cond);
        return res.json(t);
    }

    public static create(req: Request, res: Response): Response {
        const db = Config.db!;
        const id = db.template.insertOne(req.body.create).$loki;

        return res.json({id});
    }

    public static update(req: Request, res: Response): Response {
        if (req.body.create) {
            return this.create(req, res);
        }

        const db = Config.db!;
        const id: number = req.body.id;

        if (req.body.update) {
            const u = req.body.update;
            db.template.updateWhere((t) => t.$loki === id, (t) => {
                return Object.assign(t, u);
            });
        } else {
            const fieldName: string = req.body.fieldName;
            const fieldData: any = req.body.fieldData;
            db.template.updateWhere((t) => t.$loki === id, (t) => {
                return Object.assign(t, {[fieldName]: fieldData});
            });
        }

        return res.sendStatus(201);
    }

    public static delete(req: Request, res: Response): Response {
        const id: number = req.body.id;
        const db = Config.db!;
        db.template.removeWhere((c) => c.$loki === id);

        return res.sendStatus(201);
    }
}

export const router = Router();

router.post("/", TemplateEditorController.find);
router.post("/findOne", TemplateEditorController.findOne);
router.post("/create", TemplateEditorController.create);
router.put("/", TemplateEditorController.update);
router.delete("/", TemplateEditorController.delete);

export default router;
