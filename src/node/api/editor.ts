import Config from "../config";
import { SearchParser, mongoToFilter, sorter } from "../engine/search";
import { simpleMustacheRender } from "../util";
import { FastifyInstance } from "fastify";

export default (f: FastifyInstance, opt: any, next: any) => {
    f.post("/", async (req) => {
        const db = Config.DB!;
        const rSearch = new SearchParser();
        const cond = rSearch.parse(req.body.q);
    
        let offset: number = req.body.offset;
        const limit: number = req.body.limit;
        const sortBy: string = req.body.sortBy || "deck";
        const desc: boolean = req.body.desc || false;
    
        const q = db.getAll().filter(mongoToFilter(cond));
    
        return {
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
        };
    });
    
    f.post("/findOne", async (req) => {
        const db = Config.DB!;
        const cond = {id: req.body.id};
    
        const c = db.getAll().filter(mongoToFilter(cond))[0];
    
        if (/@md5\n/.test(c.front)) {
            const data = c.data || {};
            c.front = simpleMustacheRender(c.tFront || "", data);
            c.back = c.back || simpleMustacheRender(c.tBack || "", data);
        }
    
        return c;
    });
    
    f.put("/", async (req) => {
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
            ids.forEach((id) => {
                db.update(id, req.body.update);
            });
        }
    
        return { error: null };
    });

    f.put("/insertMany", async (req) => {
        const {entries} = req.body;
        const db = Config.DB!;
        const ids = db.insertMany(entries);

        return { ids };
    });

    f.delete("/", async (req) => {
        const db = Config.DB!;

        if (req.body.id) {
            const id: number = req.body.id;
            db.card.removeWhere((c) => c.$loki === id);
        } else if (req.body.ids) {
            const ids: Set<number> = new Set(req.body.ids);
            db.card.removeWhere((c) => ids.has(c.$loki));
        }
    
        return { error: null };
    });

    next();
}
