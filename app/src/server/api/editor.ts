import { Router } from "express";
import { g } from "../global";
import { String } from "runtypes";

const router = Router();

router.post("/", async (req, res, next) => {
  try {
    const { q, offset, limit } = req.body;
    const db = g.DB!;

    const [data, ids] = await Promise.all([
      db.parseCond(String.check(q) || {}, {
        offset, limit,
        fields: {
          card: ["front", "back", "mnemonic", "tag", "srsLevel", "nextReview", "createdAt", "updatedAt", "stat", "deck"],
          template: ["name", "front", "back"],
          note: ["meta", "data"],
          source: ["name"]
        }
      }),
      db.parseCond(String.check(q) || {}, {
        fields: {
          card: ["_id"]
        }
      })
    ]) 

    return res.json({
      data,
      count: ids.length
    });
  } catch(e) {
    next(e);
  }
});

router.put("/", async (req, res, next) => {
  try {
    const { id, ids, create, update } = req.body;
    const db = g.DB!;
    if (Array.isArray(create)) {
      const ids = await db.insertMany(create);
      return res.json({ ids });
    } else if (create) {
      const ids = await db.insertMany([create]);
      return res.json({ id: ids[0] });
    } else if (ids) {
      return res.json(await db.updateMany(ids, update));
    } else {
      return res.json(await db.updateMany([id], update));
    }
  } catch(e) {
    next(e);
  }
});

router.delete("/", async (req, res, next) => {
  try {
    const { id, ids } = req.body;
    const db = g.DB!;
    if (ids) {
      return res.json(await db.card.delete({
        _id: {$in: ids}
      }));
    } else {
      return res.json(await db.card.delete({
        _id: id
      }));
    }
  } catch(e) {
    next(e);
  }
})

router.put("/addTags", async (req, res, next) => {
  try {
    const { ids, tags } = req.body;
    const db = g.DB!;
    for (const id of ids) {
      const c = (await db.card.find({_id: id}, ["tag"], "LIMIT 1"))[0];
      if (c) {
        await db.card.update({_id: id}, {tag: [...(c.tag || []), ...tags]})
      }
    }

    return res.sendStatus(201);
  } catch(e) {
    next(e);
  }
});

router.delete("/removeTags", async (req, res, next) => {
  try {
    const { ids, tags } = req.body;
    const db = g.DB!;
    for (const id of ids) {
      const c = (await db.card.find({_id: id}, ["tag"], "LIMIT 1"))[0];
      if (c) {
        await db.card.update({_id: id}, {tag: (c.tag || []).filter((t) => !tags.includes(t))})
      }
    }

    return res.sendStatus(201);
  } catch(e) {
    next(e);
  }
});

export default router;
