import { Request, Response, Router } from "express";
import fs from "fs";
import Config from "../config";
import path from "path";

class ImageController {
    public static get(req: Request, res: Response) {
        const p = path.parse(Config.collection);
        const b = fs.readFileSync(path.join(p.dir, p.name, req.params[0]));

        return res.send(b);
    }
}

const router = Router();
router.get("/*", ImageController.get);

export default router;
