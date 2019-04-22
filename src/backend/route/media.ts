import { Request, Response, Router } from "express";
import Config from "../config";
import fs from "fs";
import path from "path";

class MediaController {
    public static get(req: Request, res: Response) {
        const db = Config.db!;
        const id: number = parseInt(req.params[0]);
        const m = db.media.findOne({$loki: id});

        if (!m) {
            const p = path.parse(Config.collection);
            const b = fs.readFileSync(path.join(p.dir, p.name, req.params[0]));
            return res.send(b);
        } else {
            return res.send(m.data.buffer);
        }
    }
}

const router = Router();
router.get("/*", MediaController.get);

export default router;
