import { SearchParser } from "../engine/search";
import { Router } from "express";
import g from "../config";

const router = Router();

router.post("/", (req, res) => {
    const {q, offset, limit} = req.body;
    const db = g.DB!;
    const parser = new SearchParser();

    return res.json(db.parseCond(parser.doParse(q) || {}, {offset, limit,
        fields: [
            "front", "back", "mnemonic", "tag", "srsLevel", "nextReview", "created", "modified", "stat",
            "deck",
            "template", "model", "tFront", "tBack", "css", "js",
            "key", "data",
            // "source", "sH", "sCreated"
        ]
    }));
});

router.put("/", (req, res) => {
    const {id, ids, create, update} = req.body;
    const db = g.DB!;
    if (Array.isArray(create)) {
        const ids = db.insertMany(create);
        return res.json({ids});
    } else if (create) {
        const ids = db.insertMany([create]);
        return res.json({id: ids[0]});
    } else if (ids) {
        return res.json(db.updateMany(ids, update));
    } else {
        return res.json(db.updateMany([id], update));
    }
});

router.delete("/", (req, res) => {
    const {id, ids} = req.body;
    const db = g.DB!;
    if (ids) {
        return res.json(db.deleteMany(ids));
    } else {
        return res.json(db.deleteMany([id]));
    }
})

router.put("/addTags", (req, res) => {
    const {ids, tags} = req.body;
    const db = g.DB!;
    return res.json(db.addTags(ids, tags));
});

router.delete("/editTags", (req, res) => {
    const {ids, tags} = req.body;
    const db = g.DB!;
    return res.json(db.removeTags(ids, tags));
});

export default router;
