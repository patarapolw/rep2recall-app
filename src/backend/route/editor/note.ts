import { Request, Response, Router } from "express";
import SearchResource from "../../db/SearchResource";
import Config from "../../config";

class NoteEditorController {
    public static find(req: Request, res: Response): Response {
        const db = Config.db!;
        const rSearch = new SearchResource(db);
        const cond = rSearch.parse(req.body.q);

        const offset: number = req.body.offset;
        const limit: number = req.body.limit;
        const sortBy: string = req.body.sortBy || "entry";
        const desc: boolean = req.body.desc || false;

        const q = db.note.chain().find(cond);

        return res.json({
            data: q.copy().sort((a, b) => SearchResource.sorter(a, b, sortBy, desc)).offset(offset).limit(limit).data()
            .map((el) => {
                const {entry, data} = el;
                return {entry, ...data};
            }),
            count: q.count()
        });
    }

    public static update(req: Request, res: Response): Response {
        const db = Config.db!;
        const entry: string = req.body.entry;
        const fieldName: string = req.body.fieldName;
        const fieldData: any = req.body.fieldData;

        if (fieldName === "entry") {
            db.note.insertOne({entry, data: {}});
        } else {
            db.note.updateWhere((t) => t.entry === entry, (t) => {
                Object.assign(t.data, {[fieldName]: fieldData});
                return t;
            });
        }

        return res.sendStatus(201);
    }

    public static delete(req: Request, res: Response): Response {
        const entry: string = req.body.entry;
        const db = Config.db!;
        db.note.removeWhere((c) => c.entry === entry);

        return res.sendStatus(201);
    }
}

export const router = Router();

router.post("/", NoteEditorController.find);
router.put("/", NoteEditorController.update);
router.delete("/", NoteEditorController.delete);

export default router;
