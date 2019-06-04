import Config from "../config";
import { SearchParser, mongoToFilter, sorter } from "../engine/search";
import { simpleMustacheRender } from "../util";
import { Router } from "express";

const router = Router();

router.post("/", (req, res) => {
    const db = Config.DB!;
    const rSearch = new SearchParser();
    const cond = rSearch.parse(req.body.q);

    let offset: number = req.body.offset;
    const limit: number = req.body.limit;
    const sortBy: string = req.body.sortBy || "deck";
    const desc: boolean = req.body.desc || false;

    const q = db.getAll().filter(mongoToFilter(cond));

    return res.json({
        data: q.sort((a, b) => sorter(a, b, sortBy, desc)).slice(offset, offset + limit)
        .map((c) => {
            if (/@md5\n/.test(c.front)) {
                const data = c.data || {};
                c.front = simpleMustacheRender(c.tFront || "", data);
                c.back = c.back || simpleMustacheRender(c.tBack || "", data);
            }

            return c;
        }),
        count: q.length
    });
});

router.post("/findOne", (req, res) => {
    const db = Config.DB!;
    const cond = {id: req.body.id};

    const c = db.getAll().filter(mongoToFilter(cond))[0];

    if (/@md5\n/.test(c.front)) {
        const data = c.data || {};
        c.front = simpleMustacheRender(c.tFront || "", data);
        c.back = c.back || simpleMustacheRender(c.tBack || "", data);
    }

    return res.json(c);
});

router.put("/", (req, res) => {
    const db = Config.DB!;
    if (req.body.create) {
        const id = db.insertMany([req.body.create])[0];
        return {id};
    }

    if (req.body.id) {
        const id: number = req.body.id;
        db.update(id, req.body.update);
    } else if (req.body.ids) {
        const ids: number[] = req.body.ids;
        db.update(ids, req.body.update);
    }

    return res.json({ error: null });
});

router.post("/insertMany", (req, res) => {
    const {entries} = req.body;
    const db = Config.DB!;
    const ids = db.insertMany(entries);

    return res.json({ ids });
});

router.delete("/", (req, res) => {
    const db = Config.DB!;

    if (req.body.id) {
        const id: number = req.body.id;
        db.card.removeWhere((c) => c.$loki === id);
    } else if (req.body.ids) {
        const ids: Set<number> = new Set(req.body.ids);
        db.card.removeWhere((c) => ids.has(c.$loki));
    }

    return res.json({ error: null });
});

export default router;
