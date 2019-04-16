import sql from "sql.js";
import fs from "fs";
import unzipper from "unzipper";
// @ts-ignore;
import etl from "etl";
import path from "path";
import Db, { ITemplate, IEntry, INote } from ".";
import mustache from "mustache";
import tmp from "tmp";
import crypto from "crypto";
import { Readable, Stream } from "stream";

export default class Anki {
    public static async connect(b: string | Buffer) {
        let media = {} as any;
        const dir = tmp.dirSync();

        await new Promise((resolve) => {
            let stream: Stream;
            if (typeof b === "string") {
                stream = fs.createReadStream(b);
            } else {
                stream = new Readable({
                    read() {
                        this.push(b);
                        this.push(null);
                    }
                });
            }

            stream
                .pipe(unzipper.Parse())
                .pipe(etl.map(async (entry: any) => {
                    if (entry.path === "media") {
                        media = JSON.parse((await entry.buffer()).toString());
                    } else {
                        fs.writeFileSync(path.join(dir.name, entry.path), await entry.buffer());
                    }
                }))
                .on("finish", resolve);
        });

        const db = new sql.Database(fs.readFileSync(path.join(dir.name, "collection.anki2")));

        const { decks, models } = (() => {
            const st = db.prepare("SELECT decks, models FROM col");
            st.step();
            return st.getAsObject();
        })();

        db.run(`
        CREATE TABLE decks (
            id      INTEGER NOT NULL PRIMARY KEY,
            name    VARCHAR NOT NULL
        )`);

        const stmt = db.prepare("INSERT INTO decks (id, name) VALUES (?, ?)");

        Object.values(JSON.parse(decks as string)).forEach((deck: any) => {
            stmt.run([deck.id, deck.name]);
        });

        db.run(`
        CREATE TABLE models (
            id      INTEGER NOT NULL PRIMARY KEY,
            name    VARCHAR NOT NULL,
            flds    VARCHAR NOT NULL,
            css     VARCHAR
        )`);

        db.run(`
        CREATE TABLE templates (
            id      INTEGER PRIMARY KEY AUTOINCREMENT,
            mid     INTEGER REFERENCES model(id),
            name    VARCHAR NOT NULL,
            qfmt    VARCHAR NOT NULL,
            afmt    VARCHAR
        )`);

        const modelInsertStmt = db.prepare("INSERT INTO models (id, name, flds, css) VALUES (?, ?, ?, ?)");
        const templateInsertStmt = db.prepare("INSERT INTO templates (mid, name, qfmt, afmt) VALUES (?, ?, ?, ?)");

        Object.values(JSON.parse(models as string)).forEach((model: any) => {
            modelInsertStmt.run([model.id, model.name, model.flds.map((f: any) => f.name).join("\x1f"), model.css]);

            model.tmpls.forEach((t: any) => {
                templateInsertStmt.run([model.id, t.name, t.qfmt, t.afmt]);
            });
        });

        return new Anki({ media, db, dir });
    }

    public db: sql.Database;
    public media: any;
    private dir: tmp.DirResult;

    private constructor({ media, db, dir }: any) {
        this.dir = dir;
        this.media = media;
        this.db = db;
    }

    public async export(db: Db) {
        const templates = [] as ITemplate[];

        (() => {
            const stmt = this.db.prepare(`
            SELECT t.name AS tname, m.name AS mname, qfmt, afmt, css
            FROM templates AS t
            INNER JOIN models AS m ON m.id = t.mid`);

            while (stmt.step()) {
                const { tname, mname, qfmt, afmt, css } = stmt.getAsObject();
                templates.push({
                    name: `${mname}-${tname}`,
                    front: convertLink(qfmt as string),
                    back: convertLink(afmt as string),
                    css: convertLink(css as string)
                });
            }
        })();

        db.template.insert(templates);

        const entries = [] as IEntry[];
        const notes = [] as INote[];

        const _e = [] as string[];
        const _n = [] as string[];

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
                const data = {} as any;
                const vs = (values as string).split("\x1f");
                (keys as string).split("\x1f").forEach((k, i) => {
                    data[k] = vs[i];
                });

                const entryName = `${mname}-${tname}-${vs[0]}`;

                if (_n.indexOf(entryName) !== -1) {
                    continue;
                }

                _n.push(entryName);

                notes.push({
                    entry: entryName,
                    data
                });

                let front = mustache.render(qfmt as string, data);
                if (front === mustache.render(qfmt as string, {})) {
                    console.log(front);
                    continue;
                }

                front = `@md5\n${md5hasher(convertLink(front))}`;

                if (_e.indexOf(front) !== -1) {
                    continue;
                }
                _e.push(front);

                entries.push({
                    deck: (deck as string).replace(/::/g, "/"),
                    template: `${`${mname}-${tname}`}/${entryName}`,
                    front,
                    tag: (tags as string).split(" ")
                });
            }
        })();

        db.insertMany(entries);
        db.note.insert(notes);

        const p = path.parse(db.loki.filename);
        try {
            fs.mkdirSync(path.join(p.dir, p.name));
        } catch (e) {}

        Object.keys(this.media).forEach((k) => {
            fs.renameSync(path.join(this.dir.name, k), path.join(p.dir, p.name, this.media[k]));
        });
    }

    public close() {
        this.db.close();
        this.dir.removeCallback();
    }
}

export function convertLink(s: string) {
    return s.replace(/(?:(?:href|src)=")([^"]+)(?:")/, "/img/$1");
}

export function md5hasher(s: string) {
    return crypto.createHash("md5").update(s).digest("hex");
}
