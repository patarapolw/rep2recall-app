import fs from "fs";
import uuid from "uuid/v4";
import path from "path";
import Config from "../config";
import { IStrStrMap } from "../util";
import Anki from "../engine/anki";
import { Router } from "express";
import fileUpload, { UploadedFile } from "express-fileupload";

const idToFilename: IStrStrMap = {};
const router = Router();
router.use(fileUpload());

router.post("/anki/import", (req, res) => {
    const id = uuid();
    const file = req.files!.apkg as UploadedFile;
    fs.writeFileSync(path.join(Config.UPLOAD_FOLDER, id), file.data);
    idToFilename[id] = file.name;

    return res.json({id});
});

router.ws("/anki/progress", (ws) => {
    ws.on("message", (msg: any) => {
        const id = msg;

        try {
            const anki = new Anki(path.join(Config.UPLOAD_FOLDER, id), idToFilename[id], (p: any) => {
                ws.send(JSON.stringify(p));
            });
            anki.export(Config.DB!);
            anki.close();
        } catch (e) {
            ws.send(JSON.stringify({
                error: e.toString()
            }));
        }
    });
});

export default router;
