import { Request, Response, Router } from "express";
import Config from "../config";
import mustache from "mustache";
import templateEditorRouter from "./editor/template";

interface ITemplateExt {
    name: string;
    front: string;
    back?: string;
    note?: string;
}

interface INoteExt {
    entry: string;
    data: any;
}

export class TemplateController {
    public static get(req: Request, res: Response): Response {
        const ts: string = req.body.template.split("/");
        const db = Config.db!;

        const template = db.template.findOne({name: ts[0]});
        const d = db.note.findOne({entry: ts[1]});

        if (d) {
            return res.json({
                front: template.front ? mustache.render(template.front, d.data) : undefined,
                back: template.back ? mustache.render(template.back || "", d.data) : undefined
            });
        }

        return res.json(null);
    }

    public static insertMany(req: Request, res: Response): Response {
        const templates: ITemplateExt[] = req.body.templates;
        const data: INoteExt[] = req.body.data;
        const db = Config.db!;

        if (data) {
            db.note.insert(data);
        }

        if (templates) {
            db.template.insert(templates);
        }

        return res.sendStatus(201);
    }
}

export const router = Router();

router.post("/", TemplateController.get);
router.post("/insertMany", TemplateController.insertMany);
router.use("/editor", templateEditorRouter);

export default router;
