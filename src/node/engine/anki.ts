import sql from "sql.js";
import fs from "fs";
import AdmZip from "adm-zip";
import path from "path";
import Db, { ITemplate, IInsertEntry, IMedia } from "./db";
import crypto from "crypto";
import { simpleMustacheRender } from "../util";

export default class Anki {
    private db: sql.Database;
    private mediaNameToId: any = {};
    private filename: string;
    private filepath: string;
    private dir: string;
    private callback: (res: any) => any;

    constructor(filepath: string, filename: string, callback: (res: any) => any) {
        this.filename = filename;
        this.filepath = filepath;
        this.dir = path.dirname(filepath);
        this.callback = callback;

        const zip = new AdmZip(filepath);
        const zipCount = zip.getEntries().length;

        this.callback({
            text: `Unzipping Apkg. File count: ${zipCount}`,
            max: 0
        });

        zip.extractAllTo(this.dir);

        this.callback({
            text: "Preparing Anki resources.",
            max: 0
        });

        this.db = new sql.Database(fs.readFileSync(path.join(this.dir, "collection.anki2")));

        const { decks, models } = (() => {
            const st = this.db.prepare("SELECT decks, models FROM col");
            st.step();
            return st.getAsObject();
        })();

        this.db.run(`
        CREATE TABLE decks (
            id      INTEGER NOT NULL PRIMARY KEY,
            name    VARCHAR NOT NULL
        )`);

        const stmt = this.db.prepare("INSERT INTO decks (id, name) VALUES (?, ?)");

        Object.values(JSON.parse(decks as string)).forEach((deck: any) => {
            stmt.run([deck.id, deck.name]);
        });

        this.db.run(`
        CREATE TABLE models (
            id      INTEGER NOT NULL PRIMARY KEY,
            name    VARCHAR NOT NULL,
            flds    VARCHAR NOT NULL,
            css     VARCHAR
        )`);

        this.db.run(`
        CREATE TABLE templates (
            id      INTEGER PRIMARY KEY AUTOINCREMENT,
            mid     INTEGER REFERENCES model(id),
            name    VARCHAR NOT NULL,
            qfmt    VARCHAR NOT NULL,
            afmt    VARCHAR
        )`);

        const modelInsertStmt = this.db.prepare("INSERT INTO models (id, name, flds, css) VALUES (?, ?, ?, ?)");
        const templateInsertStmt = this.db.prepare("INSERT INTO templates (mid, name, qfmt, afmt) VALUES (?, ?, ?, ?)");

        Object.values(JSON.parse(models as string)).forEach((model: any) => {
            modelInsertStmt.run([model.id, model.name, model.flds.map((f: any) => f.name).join("\x1f"), model.css]);

            model.tmpls.forEach((t: any) => {
                templateInsertStmt.run([model.id, t.name, t.qfmt, t.afmt]);
            });
        });
    }

    public export(dst: Db) {
        this.callback({
            text: "Writing to database",
            max: 0
        });

        let sourceId: number;
        try {
            sourceId = dst.source.insertOne({
                name: this.filename,
                h: md5hasher(fs.readFileSync(this.filepath)),
                created: new Date()
            }).$loki;
        } catch (e) {
            this.callback({
                error: `Duplicated resource: ${this.filename}`
            });
            return;
        }

        this.mediaNameToId = {} as any;

        const mediaJson = JSON.parse(fs.readFileSync(path.join(this.dir, "media"), "utf8"));

        Object.keys(mediaJson).forEach((k, i) => {
            const data = fs.readFileSync(path.join(this.dir, k));
            const h = md5hasher(data);
            const media = {
                sourceId,
                name: mediaJson[k],
                data,
                h
            } as IMedia;

            const total = Object.keys(mediaJson).length;
            this.callback({
                text: "Uploading media",
                current: i,
                max: total
            });

            let mediaId;
            try {
                mediaId = dst.media.insert(media).$loki;
            } catch (e) {
                mediaId = dst.media.findOne({h}).$loki;
            }

            this.mediaNameToId[media.name] = mediaId;
        });

        const templates = [] as ITemplate[];

        (() => {
            const stmt = this.db.prepare(`
            SELECT t.name AS tname, m.name AS mname, qfmt, afmt, css
            FROM templates AS t
            INNER JOIN models AS m ON m.id = t.mid`);

            while (stmt.step()) {
                const { tname, mname, qfmt, afmt, css } = stmt.getAsObject();
                templates.push({
                    name: tname as string,
                    model: mname as string,
                    front: this.convertLink(qfmt as string),
                    back: this.convertLink(afmt as string),
                    css: this.convertLink(css as string),
                    sourceId
                });
            }
        })();

        (() => {
            const batch = 1000;
            const total = templates.length;
            let subList = templates.splice(0, batch);
            let from = 0;

            while (subList.length > 0) {
                this.callback({
                    text: "Uploading templates",
                    current: from,
                    max: total
                });

                dst.template.insert(subList);
                subList = templates.splice(0, batch);
                from += batch;
            }
        })();

        const count = (() => {
            let i = 0;
            const stmt = this.db.prepare(`
            SELECT
                COUNT(*)
            FROM cards AS c
            INNER JOIN decks AS d ON d.id = did
            INNER JOIN notes AS n ON n.id = nid
            INNER JOIN models AS m ON m.id = n.mid
            INNER JOIN templates AS t ON t.mid = n.mid`);
            stmt.step();
            return stmt.get()[0] as number;
        })();

        const entries = [] as IInsertEntry[];
        const frontSet = new Set();

        (() => {
            const stmt = this.db.prepare(`
            SELECT
                n.flds AS "values",
                m.flds AS keys,
                t.name AS tname,
                m.name AS mname,
                d.name AS deck,
                qfmt,
                tags
            FROM cards AS c
            INNER JOIN decks AS d ON d.id = did
            INNER JOIN notes AS n ON n.id = nid
            INNER JOIN models AS m ON m.id = n.mid
            INNER JOIN templates AS t ON t.mid = n.mid`);

            let current = 0;
            while (stmt.step()) {
                if (!(current % 1000)) {
                    this.callback({
                        text: "Reading notes",
                        current,
                        max: count
                    });
                }
                current++;

                const { keys, values, tname, mname, deck, qfmt, tags } = stmt.getAsObject();
                const vs = (values as string).split("\x1f");

                const data = {} as any;
                (keys as string).split("\x1f").forEach((k, i) => {
                    data[k] = vs[i];
                });

                let front = simpleMustacheRender(qfmt as string, data);
                if (front === simpleMustacheRender(qfmt as string, {})) {
                    continue;
                }

                front = `@md5\n${md5hasher(this.convertLink(front))}`;

                if (frontSet.has(front)) {
                    continue;
                }
                frontSet.add(front);

                let tag = (tags as string).split(" ");
                tag = tag.filter((t, i) => t && tag.indexOf(t) === i);

                entries.push({
                    deck: (deck as string).replace(/::/g, "/"),
                    model: mname as string,
                    template: tname as string,
                    entry: vs[0],
                    data,
                    front,
                    tag,
                    sourceId
                });
            }
        })();

        (() => {
            const batch = 1000;
            const total = entries.length;
            let subList = entries.splice(0, batch);
            let from = 0;

            while (subList.length > 0) {
                this.callback({
                    text: "Uploading notes",
                    current: from,
                    max: total
                });

                dst.insertMany(subList);
                subList = entries.splice(0, batch);
                from += batch;
            }
        })();
    }

    public close() {
        fs.unlinkSync(this.filepath);
        this.callback({});
        this.db.close();
    }

    private convertLink(s: string) {
        return s.replace(/(?:(?:href|src)=")([^"]+)(?:")/, (m, p1) => {
            return `/media/${this.mediaNameToId[p1]}`;
        });
    }
}

export function md5hasher(s: string | Buffer) {
    return crypto.createHash("md5").update(s).digest("hex");
}