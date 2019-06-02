import { FastifyInstance } from "fastify";
import pump from "pump";
import fs from "fs";
import uuid from "uuid/v4";
import path from "path";
import Config from "../config";
import { IStrStrMap } from "../util";
import Anki from "../engine/anki";
import { Readable } from "stream";

const idToFilename: IStrStrMap = {};

export default (f: FastifyInstance, opt: any, next: any) => {
    f.post("/anki/import", (req, reply) => {
        const id = uuid();
        const mp = req.multipart((field, file, filename, encoding, mimetype) => {
            idToFilename[id] = filename;
            pump(file, fs.createWriteStream(path.join(Config.UPLOAD_FOLDER, id)));
        }, () => {
            console.log('Upload completed');
            reply.code(200).send({ id });
        });
    });

    f.post("/anki/progress", (req, reply) => {
        const id: string = req.body.id;

        reply.res.writeHead(200, {
            "Content-Type": "application/x-ndjson",
            "Transfer-Encoding": "chunked",
            "X-Content-Type-Options": "nosniff"
        });

        const stream = new Readable({
            read() {
                try {
                    const anki = new Anki(path.join(Config.UPLOAD_FOLDER, id), idToFilename[id], (p: any) => {
                        console.log(p),
                        this.push(JSON.stringify(p) + "\n");
                    });
                    anki.export(Config.DB!);
                    anki.close();
                } catch (e) {
                    this.push(JSON.stringify({
                        error: e.toString()
                    }) + "\n");
                }
                this.push(null);
            }
        });

        reply.send(stream);
    });

    next();
};