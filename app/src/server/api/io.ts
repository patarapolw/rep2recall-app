import { Router } from "express";
import fileUpload, { UploadedFile } from "express-fileupload";
import uuid from "uuid/v4";
import path from "path";
import fs from "fs";
import Anki from "../engine/anki";
import { g } from "../global";
import sanitize from "sanitize-filename";
import Db from '../engine/db';
import rimraf from 'rimraf';

const router = Router();
router.use(fileUpload());

const idToFilename: { [key: string]: string } = {};

router.post("/import", (req, res) => {
  const id = uuid();
  const file = req.files!.file as UploadedFile;
  const tmp = g.UPLOAD_FOLDER;

  if (!fs.existsSync(tmp)) {
    fs.mkdirSync(tmp);
  }
  fs.writeFileSync(path.join(tmp, id), file.data);
  idToFilename[id] = file.name;

  return res.json({ id });
});

g.IO!.on("connection", (socket: any) => {
  socket.on("message", async (msg: any) => {
    const tmp = g.UPLOAD_FOLDER;
    const { id, type } = msg;

    try {
      if (type === ".apkg") {
        const anki = new Anki(
          path.join(tmp, id),
          idToFilename[id],
          (p: any) => {
            g.IO!.send(p);
          }
        );

        await anki.export(g.DB!);
        anki.close();
        g.IO!.send({});
      } else {
        const xdb = new Db(path.join(tmp, id), (p: any) => {
          g.IO!.send(p);
        });
        await xdb.init();
        xdb.export({}, g.DB!);
        g.IO!.send({});
      }
    } catch (e) {
      g.IO!.send({
        error: e.toString()
      });
    }
  });
});

router.get("/export", async (req, res, next) => {
  try {
    const { deck, reset } = req.query;
    const fileId = sanitize(deck);

    rimraf.sync(path.join(g.UPLOAD_FOLDER, fileId));

    const xdb = new Db(path.join(g.UPLOAD_FOLDER, fileId), () => {});
    await xdb.init();
    g.DB!.export({ $or: [{ deck }, { deck: { $like: `${deck}/%` } }] }, xdb);

    return res.download(path.join(g.UPLOAD_FOLDER, fileId))
  } catch (e) {
    next(e);
  }
});

export default router;
