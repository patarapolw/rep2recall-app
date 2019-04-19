import { Router, Request, Response } from "express";
import { IEntry } from "../../db";
import Config from "../../config";

class CardApiController {
    public static insertMany(req: Request, res: Response): Response {
        const entries: IEntry[] = req.body.cards;
        const db = Config.db!;
        const result = db.insertMany(entries);

        return res.json(result);
    }
}

const router = Router();
router.post("/insertMany", CardApiController.insertMany);

export default router;
