import Config from "../config";
import { Router } from "express";

const router = Router();

router.get("/:id", (req, res) => {
    const db = Config.DB!;
    const id: number = parseInt(req.params.id);
    const m = db.media.findOne({$loki: id});

    return res.send(m.data.buffer);
});

export default router;
