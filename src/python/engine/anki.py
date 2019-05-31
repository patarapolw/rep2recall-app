import sqlite3
from zipfile import ZipFile
from tempfile import mkdtemp
import hashlib
from typing import Callable, Any, Union
import os
import json
from datetime import datetime
from pathlib import Path
import re
import pystache

from .db import Db


class Anki:
    def __init__(self, file_path: str, true_filename: str, cb: Callable[[Union[dict, None]], Any]):
        self.filename = true_filename
        self.dir = mkdtemp()
        self.cb = cb

        with ZipFile(file_path) as zf:
            fs = zf.namelist()

            for i, f in enumerate(fs):
                self.cb({
                    "text": f"Unzipping {f}",
                    "current": i,
                    "max": len(fs)
                })

                zf.extract(f, self.dir)

        self.cb({
            "text": "Preparing Anki resources"
        })

        self.conn = sqlite3.connect(os.path.join(self.dir, "collection.anki2"), check_same_thread=False)
        self.conn.row_factory = sqlite3.Row

        self.conn.executescript("""
        CREATE TABLE decks (
            id      INTEGER PRIMARY KEY,
            name    VARCHAR UNIQUE NOT NULL
        );

        CREATE TABLE models (
            id      INTEGER PRIMARY KEY,
            name    VARCHAR NOT NULL,
            flds    VARCHAR NOT NULL,
            css     VARCHAR
        );

        CREATE TABLE templates (
            id      INTEGER PRIMARY KEY AUTOINCREMENT,
            mid     INTEGER REFERENCES model(id),
            name    VARCHAR NOT NULL,
            qfmt    VARCHAR NOT NULL,
            afmt    VARCHAR
        );
        """)

        d_text, m_text = self.conn.execute("""
        SELECT decks, models FROM col
        """).fetchone()

        decks = json.loads(d_text)
        models = json.loads(m_text)

        assert isinstance(decks, dict)

        for d in decks.values():
            self.conn.execute("""
            INSERT INTO decks (id, name)
            VALUES (?, ?)
            """, (int(d["id"]), d["name"]))

        assert isinstance(models, dict)

        for m in models.values():
            self.conn.execute("""
            INSERT INTO models (id, name, flds, css)
            VALUES (?, ?, ?, ?)
            """, (
                int(m["id"]),
                m["name"],
                "\x1f".join(f["name"] for f in m["flds"]),
                m["css"]
            ))

            for t in m["tmpls"]:
                self.conn.execute("""
                INSERT INTO templates (mid, name, qfmt, afmt)
                VALUES (?, ?, ?, ?)
                """, (int(m["id"]), t["name"], t["qfmt"], t["afmt"]))

    def close(self):
        self.conn.close()
        os.unlink(self.dir)

    def export(self, db: Db) -> None:
        self.cb({
            "text": "Writing to database"
        })

        source_id = db.conn.execute("""
        INSERT INTO source (name, h, created)
        VALUES (?, ?, ?)
        """, (
            self.filename,
            hashlib.md5(Path(self.filename).read_bytes()).hexdigest(),
            str(datetime.now())
        ))

        media_name_to_id = dict()
        media_json = json.load(os.path.join(self.dir, "media"))

        assert isinstance(media_json, dict)
        for i, k in enumerate(media_json.keys()):
            data = Path(self.dir).joinpath(k).read_bytes()
            h = hashlib.md5(data).hexdigest()

            self.cb({
                "text": "Uploading media",
                "current": i,
                "max": len(media_json)
            })

            db.conn.execute("""
            INSERT INTO media (sourceId, name, data, h)
            VALUES (?, ?, ?, ?)
            ON CONFLICT DO NOTHING
            """, (source_id, media_json[k], data, h))

            media_name_to_id[media_json[k]] = db.conn.execute("""
            SELECT id FROM media
            WHERE h = ?
            """, (h,)).fetchone()[0]

        ts = self.conn.execute("""
        SELECT t.name AS tname, m.name AS mname, qfmt, afmt, css
        FROM templates AS t
        INNER JOIN models AS m ON m.id = t.mid
        """).fetchall()

        for i, t in enumerate(ts):
            self.cb({
                "text": "Uploading templates",
                "current": i,
                "max": len(ts)
            })

            db.conn.execute("""
            INSERT INTO template (name, model, front, back, css, sourceId)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (
                t["tname"],
                t["mname"],
                self._convert_link(t["qfmt"], media_name_to_id),
                self._convert_link(t["afmt"], media_name_to_id),
                self._convert_link(t["css"], media_name_to_id),
                source_id
            ))

        front_set = set()
        ns = self.conn.execute("""
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
        INNER JOIN templates AS t ON t.mid = n.mid
        """).fetchall()

        for i, n in enumerate(ns):
            self.cb({
                "text": "Uploading notes",
                "current": i,
                "max": len(ns)
            })

            vs = n["values"].split("\x1f")
            ks = n["keys"].split("\x1f")
            data = dict(zip(ks, vs))

            front = pystache.render(n["qfmt"], data)
            if front == pystache.render(n["qfmt"], dict()):
                continue

            front = f"md5\n{hashlib.md5(front.encode()).hexdigest()}"
            if front in front_set:
                continue

            front_set.add(front)

            db.insert_many([{
                "deck": n["deck"].replace("::", "/"),
                "model": n["mname"],
                "template": n["tname"],
                "entry": vs[0],
                "data": data,
                "front": front,
                "tag": n["tag"].split(" "),
                "sourceId": source_id
            }])

        self.cb(None)

    @staticmethod
    def _convert_link(s: str, media_name_to_id: dict) -> str:
        return re.sub(
            "(?:(?:href|src)=\")([^\"]+)(?:\")",
            lambda m: f"/media/{media_name_to_id[m[1]]}",
            s
        )
