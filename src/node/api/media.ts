import { FastifyInstance } from "fastify";
import Config from "../config";

export default (f: FastifyInstance, opt: any, next: any) => {
    f.get("/:id", async (req) => {
        const db = Config.DB!;
        const id: number = parseInt(req.params.id);
        const m = db.media.findOne({$loki: id});

        return m.data.buffer;
    });

    next();
};