import sqlite3
from typing import List
import json
from datetime import datetime


class Db:
    def __init__(self, filename: str):
        self.conn = sqlite3.connect(filename, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript("""
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
            name        VARCHAR NOT NULL,
            model       VARCHAR,
            front       VARCHAR NOT NULL,
            back        VARCHAR,
            css         VARCHAR
        );

        CREATE TABLE IF NOT EXISTS note (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            sourceId    INTEGER REFERENCES source(id),
            name        VARCHAR NOT NULL,
            data        VARCHAR NOT NULL /* JSON */
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
            front       VARCHAR UNIQUE NOT NULL,
            back        VARCHAR,
            mnemonic    VARCHAR,
            srsLevel    INTEGER,
            nextReview  VARCHAR,
            /* tag */
            created     VARCHAR,
            modified    VARCHAR
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
        """)

    def close(self):
        self.conn.close()

    def insert_many(self, entries: List[dict]) -> List[int]:
        decks = list(set(map(lambda x: x["deck"], entries)))
        deck_ids = list(map(self.get_or_create_deck, decks))

        source_id = None
        templates = []
        for t in filter(lambda x: x["model"] and x["template"], entries):
            source_id = t["sourceId"]
            templates.append(f"{t['template']}\x1f{t['model']}")

        templates = list(set(templates))
        template_ids = []
        for t in templates:
            name, model = t.split("\x1f")
            template_ids.append(self.conn.execute("""
            SELECT id FROM template
            WHERE
                sourceId = ? AND
                name = ? AND
                model = ?
            """, (source_id, name, model)).fetchone()[0])

        note_ids = []
        for e in entries:
            if e["entry"]:
                note_ids.append(int(self.conn.execute("""
                INSERT INTO note (sourceId, name, data)
                VALUES (?, ?, ?)
                """, (source_id, e["entry"], json.dumps(e["data"], ensure_ascii=False))).lastrowid))
            else:
                note_ids.append(None)

        now = str(datetime.now())
        card_ids = []
        for i, e in enumerate(entries):
            card_id = int(self.conn.execute("""
            INSERT INTO card
            (front, back, mnemonic, nextReview, deckId, noteId, templateId, created)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                e["front"],
                e["back"],
                e["mnemonic"],
                e["nextReview"],
                deck_ids[decks.index(e["deck"])],
                note_ids[i],
                template_ids[templates.index(f"{e['template']}\x1f{e['model']}")]
                if e["model"] and e["template"] else None,
                now
            )).lastrowid)

            if e["tag"]:
                for t in e["tag"]:
                    self.conn.execute("""
                    INSERT INTO tag (name)
                    VALUES (?)
                    ON CONFLICT DO NOTHING
                    """, (t,))

                    self.conn.execute("""
                    INSERT INTO cardTag (cardId, tagId)
                    VALUES (
                        ?,
                        SELECT id FROM tag WHERE name = ?
                    )
                    """, (t,))

            card_ids.append(card_id)

        return card_ids

    def get_all(self) -> List[dict]:
        c = self.conn.execute("""
        SELECT
            c.id AS id,
            c.front AS front,
            c.back AS back,
            mnemonic,
            /* tag */
            srsLevel,
            nextReview,
            deck,
            created,
            modified,
            t.name AS template,
            t.model AS model,
            t.front AS tFront,
            t.back AS tBack,
            n.name AS entry,
            n.data AS data
        FROM card AS c
        INNER JOIN template AS t ON t.id = templateId
        INNER JOIN note AS n ON n.id = noteId
        """)

        items = []
        for r in c:
            item = dict(r)
            item["tag"] = [x[0] for x in self.conn.execute("""
            SELECT name
            FROM tag
            INNER JOIN cardTag AS ct ON ct.tagId = tag.id
            WHERE ct.cardId = ?
            """, (item["id"],))]
            item["data"] = json.loads(item["data"])
            items.append(item)

        return items
    
    def get_or_create_deck(self, name: str) -> int:
        self.conn.execute("""
        INSERT INTO deck (name)
        VALUES (?)
        ON CONFLICT DO NOTHING
        """, (name,))

        return self.conn.execute("""
        SELECT id FROM deck
        WHERE name = ?
        """, (name,)).fetchone()[0]

    def update(self, c_id: int, u: dict):
        for k, v in u.items():
            if k == "deck":
                deck_id = self.get_or_create_deck(v)
                self.conn.execute("""
                UPDATE card
                SET deckId = ?
                WHERE id = ?
                """, (deck_id, c_id))
            elif k in {
                "nextReview", "created", "modified",
                "front", "back", "mnemonic", "srsLevel"
            }:
                self.conn.execute(f"""
                UPDATE card
                SET {k} = ?
                WHERE id = ?
                """, (v, c_id))
            elif k == "tag":
                for tag_name in v:
                    self.conn.execute("""
                    INSERT INTO tag (name)
                    VALUES (?)
                    ON CONFLICT DO NOTHING
                    """, (tag_name,))

                    self.conn.execute("""
                    INSERT INTO cardTag (cardId, tagId)
                    VALUES (
                        ?,
                        SELECT tag.id FROM tag WHERE tag.name = ?
                    )
                    ON CONFLICT DO NOTHING
                    """, (c_id, tag_name))
            elif k == "data":
                data = json.loads(self.conn.execute("""
                SELECT data FROM note
                WHERE note.id = (SELECT noteId FROM card WHERE card.id = ?)
                """, (c_id,)).fetchone()[0])

                self.conn.execute("""
                UPDATE note
                SET data = ?
                WHERE note.id = (
                    SELECT noteId FROM card WHERE card.id = ?
                )
                """, (json.dumps({**data, **v}, ensure_ascii=False), c_id))
