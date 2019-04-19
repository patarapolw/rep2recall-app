import fileupload, { UploadedFile } from "express-fileupload";
import { Request, Response, Router } from "express";
import Anki from "../db/anki";
import Config from "../config";

class IoController {
    public static ankiImport(req: Request, res: Response) {
        res.writeHead(200, {
            "Content-Type": "text/plain"
        });

        const upload = req.files!.apkg as UploadedFile;

        const anki = new Anki(upload, (data: any) => {
            console.log(data);
            res.write(JSON.stringify(data));
            res.write("\n");
        });
        anki.export(Config.db!);
        anki.close();

        res.end();

        return;
    }
}

const router = Router();
router.use(fileupload());

router.post("/import/anki", IoController.ankiImport);

export default router;
