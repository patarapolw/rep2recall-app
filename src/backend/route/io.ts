import fileupload, { UploadedFile } from "express-fileupload";
import { Request, Response, Router } from "express";
import Anki from "../db/anki";
import Config from "../config";
import asyncHandler from "express-async-handler";

class IoController {
    public static async ankiImport(req: Request, res: Response) {
        const anki = await Anki.connect((req.files!.apkg as UploadedFile).data);
        await anki.export(Config.db!);
        await anki.close();
        return res.sendStatus(201);
    }
}

const router = Router();
router.use(fileupload());

router.post("/import/anki", asyncHandler(IoController.ankiImport));

export default router;
