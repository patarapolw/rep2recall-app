import { Router, Request, Response } from "express";
import cardEditorRouter from "./editor/card";
import Config from "../config";
import { IEntry } from "../db";

class CardController {
    public static insertMany(req: Request, res: Response): Response {
        const cards: IEntry[] = req.body.cards;
        const db = Config.db!;
        db.insertMany(cards);

        return res.sendStatus(201);
    }
}

const router = Router();
router.use("/editor", cardEditorRouter);
router.post("/insertMany", CardController.insertMany);

export default router;
