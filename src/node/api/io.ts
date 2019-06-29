import { Router } from "express";
import fileUpload, { UploadedFile } from "express-fileupload";
import uuid from "uuid/v4";
import path from "path";
import fs from "fs";
import Anki from "../engine/anki";
import g from "../config";
import ExportDb from "../engine/export";
import stream from "stream";
import sanitize from "sanitize-filename";
import asyncHandler from "express-async-handler";

const router = Router();
router.use(fileUpload());

const idToFilename: {[key: string]: string} = {};

router.post("/import", (req, res) => {
    const id = uuid();
    const file = req.files!.file as UploadedFile;
    const tmp = g.UPLOAD_FOLDER;

    if (!fs.existsSync(tmp)) {
        fs.mkdirSync(tmp);
    }
    fs.writeFileSync(path.join(tmp, id), file.data);
    idToFilename[id] = file.name;

    return res.json({id});
});

g.IO!.on("connection", (socket: any) => {
    socket.on("message", async (msg: any) => {
        const tmp = g.UPLOAD_FOLDER;
        const {id, type} = msg;

        try {
            if (type === ".apkg") {
                const anki = new Anki(path.join(tmp, id), idToFilename[id], (p: any) => {
                    g.IO!.send(p);
                });
        
                await anki.export(g.DB!);
                anki.close();
                g.IO!.send({});
            } else {
                const xdb = new ExportDb((p: any) => {
                    g.IO!.send(p);
                });
                await xdb.init(path.join(tmp, id));
                xdb.import(g.DB!);
                g.IO!.send({});
            }
        } catch (e) {
            g.IO!.send({
                error: e.toString()
            });
        }
    });
});

router.get("/export", asyncHandler(async (req, res) => {
    const {deck, reset} = req.query;
    const xdb = new ExportDb(() => {});
    await xdb.init();

    const db = g.DB!
    const {data} = db.parseCond({cond: {$or: [
        {deck},
        {deck: {$startswith: `${deck}/`}}
    ]}}, {
        fields: [
            "front", "back", "mnemonic", "tag", "srsLevel", "nextReview", "created", "modified", "stat",
            "deck",
            "template", "model", "tFront", "tBack", "css", "js",
            "key", "data",
            "source", "sH", "sCreated"
        ]
    });

    xdb.insertMany(data.map((c) => {
        if (reset) {
            delete c.srsLevel;
            delete c.nextReview;
            delete c.stat;
        }
        return c;
    }));

    const readStream = new stream.PassThrough();
    readStream.end(new Buffer(xdb.conn.export()));

    res.set("Content-disposition", `attachment; filename='${sanitize(deck)}.db'`);
    res.set("Content-Type", "application/x-sqlite3");

    readStream.pipe(res);
}))

export default router;
