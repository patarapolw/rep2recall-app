import { Router } from "express";
import { g } from "../global";
import fs from "fs";
import path from "path";

const router = Router();

router.get("/*", async (req, res, next) => {
  try {
    const db = g.DB!;
    const id = req.params[0];
    const m = (await db.media.find({_id: id}, ["data"], "LIMIT 1"))[0];
    if (m) {
      return res.send(m.data || "");
    } else {
      return res.send(fs.readFileSync(path.join(g.MEDIA_FOLDER, req.params[0])));
    }
  } catch(e) {
    next(e);
  }
});

router.post("/", (req, res) => {
    return res.json({
        path: g.MEDIA_FOLDER
    });
})

export default router;
