import { Router } from "express";
import g from "../config";
import fs from "fs";
import path from "path";

const router = Router();

router.get("/*", (req, res) => {
    const db = g.DB!;
    try {
        const id: number = parseInt(req.params[0]);
        const m = db.media.findOne({$loki: id});
        return res.send(m.data.buffer);
    } catch (e) {
        return res.send(fs.readFileSync(path.join(g.UPLOAD_FOLDER, req.params[0])));
    }
});

router.post("/", (req, res) => {
    return res.json({
        path: g.UPLOAD_FOLDER
    });
})

export default router;
