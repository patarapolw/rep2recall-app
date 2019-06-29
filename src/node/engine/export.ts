import initSqlJs from "sql.js";
import Db, { IEntry, INoteDataSocket } from "./db";
import { ankiMustache } from "../util";
import SparkMD5 from "spark-md5";
import fs from "fs";
import { SqlJs } from "sql.js/module";

export default class ExportDb {
    public conn!: SqlJs.Database;
    private cb: (res: any) => any;

    constructor(callback: (res: any) => any) {
        this.cb = callback
    }

    async init(filepath?: string) {
        const SQL = await initSqlJs();

        this.conn = filepath ? new SQL.Database(fs.readFileSync(filepath)) : new SQL.Database();
        this.conn.exec(`
        CREATE TABLE IF NOT EXISTS deck (
            id      INTEGER PRIMARY KEY AUTOINCREMENT,
            name    VARCHAR UNIQUE NOT NULL
        );
        CREATE TABLE IF NOT EXISTS source (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        VARCHAR NOT NULL /* NOT UNIQUE */,
            h           VARCHAR UNIQUE,
            created     VARCHAR NOT NULL
        );
        CREATE TABLE IF NOT EXISTS template (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            sourceId    INTEGER REFERENCES source(id),
            name        VARCHAR,
            model       VARCHAR,
            front       VARCHAR NOT NULL,
            back        VARCHAR,
            css         VARCHAR,
            js          VARCHAR,
            UNIQUE (sourceId, name, model)
        );
        CREATE TABLE IF NOT EXISTS note (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            sourceId    INTEGER REFERENCES source(id),
            key         VARCHAR,
            data        VARCHAR NOT NULL /* JSON */,
            UNIQUE (sourceId, key)
        );
        CREATE TABLE IF NOT EXISTS media (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            sourceId    INTEGER REFERENCES source(id),
            name        VARCHAR NOT NULL,
            data        BLOB NOT NULL,
            h           VARCHAR NOT NULL
        );
        CREATE TABLE IF NOT EXISTS card (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            deckId      INTEGER NOT NULL REFERENCES deck(id),
            templateId  INTEGER REFERENCES template(id),
            noteId      INTEGER REFERENCES note(id),
            front       VARCHAR NOT NULL,
            back        VARCHAR,
            mnemonic    VARCHAR,
            srsLevel    INTEGER,
            nextReview  VARCHAR,
            /* tag */
            created     VARCHAR,
            modified    VARCHAR,
            stat        VARCHAR
        );
        CREATE TABLE IF NOT EXISTS tag (
            id      INTEGER PRIMARY KEY AUTOINCREMENT,
            name    VARCHAR UNIQUE NOT NULL
        );
        CREATE TABLE IF NOT EXISTS cardTag (
            cardId  INTEGER NOT NULL REFERENCES card(id) ON DELETE CASCADE,
            tagId   INTEGER NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
            PRIMARY KEY (cardId, tagId)
        );
        `);
    }

    public export(db: Db): Buffer {
        const data = db.parseCond({}, {
            fields: [
                "front", "back", "mnemonic", "tag", "srsLevel", "nextReview", "created", "modified", "stat",
                "deck",
                "template", "model", "tFront", "tBack", "css", "js",
                "key", "data",
                "source", "sH", "sCreated"
            ]
        }).data;

        this.insertMany(data);

        return new Buffer(this.conn.export());
    }

    public import(db: Db) {
        const entries: IEntry[] = [];
        const stmt = this.conn.prepare(`
        SELECT
            c.id AS id,
            c.front AS front,
            c.back AS back,
            mnemonic,
            /* tag */
            srsLevel,
            nextReview,
            d.name AS deck,
            c.created AS created,
            modified,
            t.name AS template,
            t.model AS model,
            t.front AS tFront,
            t.back AS tBack,
            css,
            js,
            n.key AS "key",
            n.data AS data,
            s.name AS source,
            s.h AS sH,
            s.created AS sCreated,
            stat
        FROM card AS c
        INNER JOIN deck AS d ON d.id = deckId
        LEFT JOIN template AS t ON t.id = templateId
        LEFT JOIN note AS n ON n.id = noteId
        LEFT JOIN source AS s ON s.id = n.sourceId
        `);

        while (stmt.step()) {
            const e = stmt.getAsObject();
            const tagStmt = this.conn.prepare(`
            SELECT name
            FROM tag
            INNER JOIN cardTag AS ct ON ct.tagId = tag.id
            WHERE ct.cardId = ?`, [e.id])
            const tag: string[] = [];

            while (tagStmt.step()) {
                tag.push(tagStmt.get()[0] as string);
            }

            const data = JSON.parse(e.data as string || "[]");
            const stat = JSON.parse(e.stat as string || "{}");

            entries.push({
                ...e,
                tag: tag.length > 0 ? tag : undefined,
                data,
                stat
            } as IEntry);
        }

        stmt.free();

        let current = 0;
        let subList = entries.splice(0, 1000);
        while (subList.length > 0) {
            this.cb({
                text: "Uploading",
                current,
                max: entries.length
            });

            db.insertMany(subList);
            current += 1000;
            subList = entries.splice(0, 1000);
        }
    }

    public insertMany(entries_: IEntry[]): number[] {
        const entries = entries_.map((e) => this.transformCreate(e));
        const deckNameToId: {[key: string]: number} = {};

        for (const deck of new Set(entries.map((e) => e.deck))) {
            deckNameToId[deck!] = this.getOrCreateDeck(deck!);
        }

        const sourceHToId: {[key: string]: number} = {};
        const sourceSet = new Set<string>();

        for (const e of entries.filter((e) => e.sH)) {
            if (!sourceSet.has(e.sH!)) {
                this.conn.run(`
                INSERT INTO source (name, created, h)
                VALUES (?, ?, ?)
                ON CONFLICT DO NOTHING`, [e.source!, e.sCreated!, e.sH!]);

                const r = this.conn.prepare(`
                SELECT id FROM source
                WHERE h = ?`).getAsObject([e.sH!]);

                sourceHToId[e.sH!] = r.id as number;
                sourceSet.add(e.sH!);
            }
        }

        const templateKeyToId: {[key: string]: number} = {};
        for (const e of entries.filter((e) => e.tFront)) {
            this.conn.run(`
            INSERT INTO template (name, model, front, back, css, js, sourceId)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT DO NOTHING`,
            [
                e.template!,
                e.model!,
                e.tFront!,
                e.tBack!,
                e.css!,
                e.js!,
                sourceHToId[e.sH!]
            ]);

            const r = this.conn.prepare(`
            SELECT id FROM template
            WHERE
                sourceId = ? AND
                name = ? AND
                model = ?`).getAsObject([sourceHToId[e.sH!], e.template!, e.model!]);

            templateKeyToId[`${e.template}\x1f${e.model}`] = r.id as number;
        }

        const noteKeyToId: {[key: string]: number} = {};
        for (const e of entries) {
            if (e.data) {
                this.conn.run(`
                INSERT INTO note (sourceId, key, data)
                VALUES (?, ?, ?)
                ON CONFLICT DO NOTHING`, [sourceHToId[e.sH!], e.key!, JSON.stringify(e.data)])
                
                const r = this.conn.prepare(`
                SELECT id FROM note
                WHERE
                    sourceId = ? AND
                    key = ?`).getAsObject([sourceHToId[e.sH!], e.key!]);

                noteKeyToId[e.key!] = r.id as number;
            }
        }

        const now = (new Date()).toISOString();
        const cardIds: number[] = [];

        for (const e of entries) {
            this.conn.run(`
            INSERT INTO card
            (front, back, mnemonic, nextReview, deckId, noteId, templateId, created, srsLevel, stat)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                e.front,
                e.back!,
                e.mnemonic!,
                e.nextReview!,
                deckNameToId[e.deck!],
                noteKeyToId[e.key!],
                templateKeyToId[`${e.template}\x1f${e.model}`],
                now,
                e.srsLevel!,
                JSON.stringify(e.stat)
            ]);

            const id = (this.conn.prepare("SELECT last_insert_rowid()").get())[0] as number;
            cardIds.push(id);

            if (e.tag) {
                for (const t of e.tag) {
                    this.conn.run(`
                    INSERT INTO tag (name)
                    VALUES (?)
                    ON CONFLICT DO NOTHING`, [t]);

                    this.conn.run(`
                    INSERT INTO cardTag (cardId, tagId)
                    VALUES (
                        ?,
                        (SELECT id FROM tag WHERE name = ?)
                    )
                    ON CONFLICT DO NOTHING`, [id, t]);
                }
            }
        }

        return cardIds;
    }

    private transformCreate(u: IEntry): IEntry {
        let data: INoteDataSocket[] = u.data || [];
        let front: string = "";

        if ((u.front || "").startsWith("@template\n")) {
            u.tFront = (u.front || "").substr("@template\n".length);
            delete u.front;
        }

        if (u.tFront) {
            front = ankiMustache(u.tFront, data || []);
            u.front = "@md5\n" + SparkMD5.hash(front);
        }

        if ((u.back || "").startsWith("@template\n")) {
            u.tBack = (u.back || "").substr("@template\n".length);
            delete u.back;
        }

        if (u.tBack) {
            u.back = ankiMustache(u.tBack, data || [], front);
        }

        return u;
    }

    private getOrCreateDeck(name: string): number {
        this.conn.run(`
        INSERT INTO deck (name)
        VALUES (?)
        ON CONFLICT DO NOTHING`, [name]);

        const stmt = this.conn.prepare(`
        SELECT id FROM deck
        WHERE name = ?`);

        const id = stmt.getAsObject([name]).id as number;
        stmt.free();

        return id;
    }
}