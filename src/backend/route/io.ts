import { Router, Request, Response } from "express";
import Anki from "../db/anki";
import Config from "../config";
import fileUpload, { UploadedFile } from "express-fileupload";
import fs from "fs";
import path from "path";
import uuid from "uuid/v4";
import tmp from "tmp";

const tempDir = tmp.dirSync().name;

class IoController {
    public static ankiImport(req: Request, res: Response): Response {
        const file = req.files!.apkg as UploadedFile;
        const id = uuid();

        fs.mkdirSync(path.join(tempDir, id));
        fs.writeFileSync(path.join(tempDir, id, file.name), file.data);

        return res.json({fileId: id});
    }

    public static ankiImportProgress(req: Request, res: Response) {
        const id: string = req.body.fileId;
        const filename: string = req.body.filename;

        res.writeHead(200, {
            "Content-Type": "text/plain",
            "Transfer-Encoding": "chunked",
            "X-Content-Type-Options": "nosniff"
        });

        const anki = new Anki(path.join(tempDir, id, filename), (p: any) => {
            console.log(p),
            res.write(JSON.stringify(p) + "\n");
        });
        anki.export(Config.db!);
        anki.close();

        return res.end();
    }
}

const router = Router();
router.use(fileUpload());
router.post("/import/anki", IoController.ankiImport);
router.post("/import/anki/progress", IoController.ankiImportProgress);

export default router;
