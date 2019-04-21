import sql from "sql.js";
import fs from "fs";
import AdmZip from "adm-zip";
import path from "path";
import Db, { ITemplate, IEntry, IMedia } from ".";
import mustache from "mustache";
import crypto from "crypto";

export default class Anki {
    private db: sql.Database;
    private mediaNameToId: any = {};
    private filename: string;
    private dir: string;
    private callback: (res: any) => any;

    constructor(filename: string, callback: (res: any) => any) {
        this.filename = filename;
        this.dir = path.dirname(this.filename);
        this.callback = callback;

        const zip = new AdmZip(this.filename);
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

        const sourceId = dst.source.insertOne({
            name: this.filename,
            h: md5hasher(fs.readFileSync(this.filename)),
            created: new Date()
        }).$loki;

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

        const entries = [] as IEntry[];
        const _e = [] as string[];

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

            while (stmt.step()) {
                const { keys, values, tname, mname, deck, qfmt, tags } = stmt.getAsObject();
                const vs = (values as string).split("\x1f");

                const dataTrueCase = {} as any;
                (keys as string).split("\x1f").forEach((k, i) => {
                    dataTrueCase[k] = vs[i];
                });

                const dataLowerCase = {} as any;
                (keys as string).toLocaleLowerCase().split("\x1f").forEach((k, i) => {
                    dataTrueCase[k] = vs[i];
                });

                let front = mustache.render(qfmt as string, dataTrueCase);
                if (front === mustache.render(qfmt as string, {})) {
                    continue;
                }

                front = `@md5\n${md5hasher(this.convertLink(front))}`;

                if (_e.indexOf(front) !== -1) {
                    continue;
                }
                _e.push(front);

                entries.push({
                    deck: (deck as string).replace(/::/g, "/"),
                    model: mname as string,
                    template: tname as string,
                    entry: vs[0],
                    data: dataLowerCase,
                    front,
                    tag: (tags as string).split(" "),
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
