import sqlite3
from typing import List
from datetime import datetime
import json
from uuid import uuid4
from collections import defaultdict
from random import shuffle

from ..engine.quiz import get_next_review, repeat_review, srs_map
from ..engine.search import mongo_filter, sorter
from .db import Database, Entry, PagedOutput, CondOptions
from ..util import to_str, from_str


class SqliteDatabase(Database):
    def __init__(self, file_path: str):
        self.conn = sqlite3.connect(file_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self._build()

    def reset(self):
        for c in self.conn.execute("SELECT name FROM sqlite_master WHERE type='table'"):
            self.conn.execute(f"DROP TABLE ${c[0]}")
        self._build()

    def insert_many(self, entries: List[Entry]) -> List[str]:
        entries = [self._transform_create_or_update(None, dict(e)) for e in entries]
        now = str(datetime.now())

        s_map = dict()
        for e in entries:
            if e.get("sourceH"):
                h = e["sourceH"]
                if not s_map[h]:
                    s_map[h] = e

        for h, e in s_map.items():
            c = self.conn.execute("SELECT _id FROM source WHERE h = ?", (h,)).fetchone()
            if c:
                s_map[h] = c[0]
            else:
                _id = str(uuid4())
                self.conn.execute("""
                            INSERT INTO source (_id, name, created, h)
                            VALUES (?, ?, ?, ?)
                            """, (_id, e.get("source"), e.get("sourceCreated", now), h))
                s_map[h] = _id

        self.conn.commit()

        t_map = dict()
        for e in entries:
            if e.get("template") and e.get("model"):
                key = f'{e["template"]}\x1f{e["model"]}'
                if not t_map[key]:
                    t_map[key] = e

        for key, e in t_map.items():
            c = self.conn.execute("""
                        SELECT _id FROM template
                        WHERE name = ? AND model = ?
                        """, (e.get("source"), e.get("template"))).fetchone()
            if c:
                t_map[key] = c[0]
            else:
                _id = str(uuid4())
                self.conn.execute("""
                            INSERT INTO template (_id, name, model, front, back, css, js, sourceId)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                            """, (
                _id, e.get("template"), e.get("model"), e.get("tFront"), e.get("tBack"), e.get("css"), e.get("js"),
                s_map.get(e.get("sourceH"))))
                t_map[key] = _id

        n_map = dict()
        for e in entries:
            if e.get("key"):
                key = e["key"]
                if not n_map[key]:
                    n_map[key] = e

        for key, e in t_map.items():
            c = self.conn.execute("""
                        SELECT _id FROM note WHERE key = ?
                        """, (key,)).fetchone()
            if c:
                n_map[key] = c[0]
            else:
                _data = e.get("data")
                assert isinstance(_data, list)

                data = dict()
                order = dict()
                seq = 1

                for d in _data:
                    data[d["key"]] = d["value"]
                    order[d["key"]] = seq
                    seq += 1

                _id = str(uuid4())
                self.conn.execute("""
                            INSERT INTO note (_id, _meta, key, data, sourceId)
                            VALUES (?, ?, ?, ?, ?)
                            """, (_id, json.dumps({"order": order}), key, json.dumps(data, ensure_ascii=False),
                                  s_map.get(e.get("sourceH"))))

        d_map = dict()
        for e in entries:
            deck = e["deck"]
            if not d_map[deck]:
                d_map[deck] = self._get_or_create_deck(deck)

        tags = set()
        for e in entries:
            if e.get("tag"):
                tags.update(e["tag"])
        tag_map = dict()

        for t in tags:
            _id = str(uuid4())
            self.conn.execute("""
            INSERT INTO tag (_id, name)
            VALUES (?, ?)
            ON CONFLICT DO NOTHING
            """, (_id, t))

            tag_map[t] = _id

        self.conn.commit()

        _ids = []

        for e in entries:
            _id = str(uuid4())
            self.conn.execute("""
            INSERT INTO card (_id, front, back, mnemonic, srsLevel, 
                deckId, noteId, templateId, 
                nextReview, created, stat)
            VALUES (?, ?, ?, ?, ?, 
                ?, ?, ?, 
                ?, ?, ?)
            """, (_id, e.get("front"), e.get("back"), e.get("mnemonic"), e.get("srsLevel"),
                  d_map.get(e.get("deck")), n_map.get(e.get("key")),
                  t_map.get(f'{e.get("template")}\x1f{e.get("model")}'),
                  to_str(e.get("nextReview")), to_str(e.get("created")), to_str(e.get("stat"))))

            if e.get("tag"):
                for t in e.get("tag"):
                    self.conn.execute("""
                    INSERT INTO cardTag (cardId, tagId)
                    VALUES (?,
                        (SELECT _id FROM tag WHERE name = ?)
                    )
                    """, (_id, t))

            _ids.append(_id)

        return _ids

    def parse_cond(self, cond: dict, options: CondOptions) -> PagedOutput:
        all_fields = set(options.fields)
        all_fields.update(options.in_fields)

        join_seg: List[str] = []
        note_seg = "JOIN note AS n ON n._id = noteId"

        if any(f in all_fields for f in {"data", "key", "_meta"}):
            join_seg.append(note_seg)

        if "deck" in all_fields:
            join_seg.append("JOIN deck AS d ON d._id = deckId")

        if any(f in all_fields for f in {"sCreated", "sH", "source"}):
            if note_seg not in join_seg:
                join_seg.append(note_seg)
            join_seg.append("JOIN source AS s ON s._id = n.sourceId")

        if any(f in all_fields for f in {"tFront", "tBack", "template", "model", "css", "js"}):
            join_seg.append("JOIN template AS t ON t._id = templateId")

        select_seg: List[str] = []

        for k in all_fields:
            if k in {"data", "key", "_meta"}:
                select_seg.append(f"n.{k} AS {k}")
            elif k == "deck":
                select_seg.append(f"d.name AS {k}")
            elif k in {"sCreated", "sH", "source"}:
                if k == "source":
                    select_seg.append(f"s.name AS {k}")
                else:
                    select_seg.append(f"s.{k[1:]} AS {k}")
            elif k in {"tFront", "tBack", "template", "model", "css", "js"}:
                if k == "template":
                    select_seg.append(f"t.name AS {k}")
                elif k in {"model", "css", "js"}:
                    select_seg.append(f"t.{k} AS {k}")
                else:
                    select_seg.append(f"t.{k[1:]} AS {k}")
            elif k != "tag":
                select_seg.append(f"c.{k} AS {k}")
            else:
                select_seg.append(f"c._id AS _id")

        def q_convert(_el):
            for _k, _v in dict(_el).items():
                if _k in {"_meta", "data", "stat"}:
                    yield _k, from_str(_v)
                else:
                    yield _k, _v

        q = [dict(q_convert(c)) for c in self.conn.execute(f"""
        SELECT {",".join(select_seg)}
        FROM card c
        {" ".join(join_seg)}
        """)]

        if "tag" in all_fields:
            def q_add_tag(_el):
                _el["tag"] = [c[0] for c in self.conn.execute("""
                SELECT t.name AS tName
                FROM tag AS t
                INNER JOIN cardTag AS ct ON ct.tagId = t._id
                INNER JOIN card AS c ON c._id = ct.cardId
                WHERE c._id = ?
                """, (_el["_id"],))]

                return _el

            q = [q_add_tag(c) for c in q]

        q = list(filter(mongo_filter(cond), q))

        if "distinct" in options.is_:
            distinct_set = set()
            items: List[dict] = []

            for el in q:
                if el.get("key"):
                    key = el.get("key")
                    if key not in distinct_set:
                        distinct_set.add(el)
                        items.append(el)
                else:
                    items.append(el)

            q = items

        if "duplicate" in options.is_:
            front_dict = defaultdict(list)
            items: List[dict] = []

            for el in q:
                front_dict[el["front"]].append(el)

            for k, v in front_dict.items():
                if len(v) > 1:
                    items.extend(v)

            options.sort_by = "random"

            q = items

        if "random" in options.is_:
            options.sort_by = "random"

        count = len(q)
        if options.sort_by == "random":
            shuffle(q)
        else:
            q.sort(key=sorter(options.sort_by, options.desc))

        end = None
        if options.limit:
            end = options.offset + options.limit

        return PagedOutput(
            data=q[options.offset: end],
            count=count
        )

    def update_many(self, ids: List[str], u: dict):
        if any(f in u.keys() for f in {"front", "back", "tFront", "tBack", "data", "tag"}):
            for _id in ids:
                self._update_one(_id, u, False)
        else:
            u["modified"] = datetime.now()

            for k, v in u.items():
                if k == "deck":
                    deck_id = self._get_or_create_deck(v, False)
                    self.conn.execute(f"""
                    UPDATE card
                    SET deckId = ?
                    WHERE _id IN ({",".join(["?"] * len(ids))})
                    """, (deck_id, *ids))
                elif k in {"nextReview", "created", "modified", "stat",
                           "mnemonic", "srsLevel"}:
                    self.conn.execute(f"""
                    UPDATE card
                    SET {k} = ?
                    WHERE _id IN ({",".join(["?"] * len(ids))})
                    """, (to_str(v), *ids))
                elif k in {"css", "js"}:
                    self.conn.execute(f"""
                    UPDATE note
                    SET {k} = ?
                    WHERE _id = (
                        SELECT noteId FROM card WHERE _id IN ({",".join(["?"] * len(ids))})
                    )
                    """, (v, *ids))

        self.conn.commit()

    def add_tags(self, ids: List[str], tags: List[str], commit=True):
        for t in tags:
            tag_id = str(uuid4())
            self.conn.execute("""
            INSERT INTO tag (_id, name)
            VALUES (?, ?)
            ON CONFLICT DO NOTHING
            """, (tag_id, t))

            for _id in ids:
                self.conn.execute("""
                INSERT INTO cardTag (cardId, tagId)
                VALUES (?, ?)
                """, (_id, tag_id))

        if commit:
            self.conn.commit()

    def remove_tags(self, ids: List[str], tags: List[str], commit=True):
        self.conn.execute(f"""
        DELETE FROM cardTag
        WHERE
            cardId IN ({",".join(["?"] * len(ids))}) AND
            tagId IN (
                SELECT _id FROM tag WHERE name IN ({",".join(["?"] * len(tags))})
            )
        """, (*ids, *tags))

        if commit:
            self.conn.commit()

    def delete_many(self, ids: List[str]):
        self.conn.execute(f"""
        DELETE FROM card
        WHERE _id IN ({",".join(["?"] * len(ids))})
        """, ids)

    def _shift_srs_level(self, d_srs_level: int, card_id: str):
        c = self.conn.execute("""
        SELECT srsLevel, stat AS _stat
        FROM card WHERE _id = ?
        """, (card_id,)).fetchone()

        if c:
            srsLevel = c["srsLevel"]
            stat = from_str(c["stat"])

            if srsLevel is None:
                srsLevel = 0

            if stat is None:
                stat = dict()

            streak = stat.get("streak", {
                "right": 0,
                "wrong": 0
            })

            if d_srs_level > 0:
                streak["right"] += 1
            elif d_srs_level < 0:
                streak["wrong"] -= 1

            srsLevel += d_srs_level

            if srsLevel >= len(srs_map):
                srsLevel = len(srs_map) - 1
            elif srsLevel < 0:
                srsLevel = 0

            if d_srs_level > 0:
                next_review = get_next_review(srsLevel)
            else:
                next_review = repeat_review()

            self.update_many([card_id], {
                "srsLevel": srsLevel,
                "stat": stat,
                "nextReview": next_review
            })

    def _update_one(self, _id: str, u: dict, commit=True):
        u = self._transform_create_or_update(_id, u)

        for k, v in u.items():
            if k in {"front", "back"}:
                self.conn.execute(f"""
                UPDATE card
                SET {k} = ?
                WHERE _id = ?
                """, (to_str(v), _id))
            elif k == "tag":
                old_tags = self._get_tags(_id)
                new_tags = [t for t in v if t not in old_tags]
                obsolete_tags = [t for t in old_tags if t not in v]
                self.add_tags([_id], new_tags, commit)
                self.remove_tags([_id], obsolete_tags, commit)
            elif k in {"tFront", "tBack"}:
                self.conn.execute(f"""
                UPDATE note
                SET {k[1:].lower()} = ?
                WHERE _id = (
                    SELECT noteId FROM card WHERE _id = ?
                )
                """, (v, _id))
            elif k.startwith("data"):
                if k == "data":
                    pass
                else:
                    data = self._get_data(_id)
                    k = k[len("data."):]

                    if k not in data.keys():
                        _meta = self._get_meta(_id)
                        if _meta.get("order"):
                            _max = max(_meta["order"].values()) + 1
                            _meta["order"] = dict()
                        else:
                            _max = 1

                        _meta["order"][k] = _max

                        self.conn.execute(f"""
                        UPDATE note
                        SET _meta = ?
                        WHERE _id = (
                            SELECT noteId FROM card WHERE _id = ?
                        )
                        """, (to_str(_meta), _id))

                    self.conn.execute(f"""
                    UPDATE note
                    SET _meta = ?
                    WHERE _id = (
                        SELECT noteId FROM card WHERE _id = ?
                    )
                    """, (to_str(data), _id))

        if commit:
            self.conn.commit()

    def _get_or_create_deck(self, name: str, commit=True) -> str:
        c = self.conn.execute("""
        SELECT _id FROM deck WHERE name = ?
        """, (name,)).fetchone()

        if c:
            return c[0]
        else:
            _id = str(uuid4())
            self.conn.execute("""
            INSERT INTO deck (_id, name)
            VALUES (?, ?)
            """, (_id, name))
            if commit:
                self.conn.commit()

            return _id

    def _build(self):
        self.conn.executescript("""
                CREATE TABLE IF NOT EXISTS deck (
                    _id     VARCHAR PRIMARY KEY,
                    name    VARCHAR UNIQUE NOT NULL
                );

                CREATE TABLE IF NOT EXISTS source (
                    _id         VARCHAR PRIMARY KEY,
                    name        VARCHAR NOT NULL,
                    h           VARCHAR UNIQUE,
                    created     VARCHAR NOT NULL
                );

                CREATE TABLE IF NOT EXISTS template (
                    _id         VARCHAR PRIMARY KEY,
                    sourceId    VARCHAR REFERENCES source(_id),
                    name        VARCHAR,
                    model       VARCHAR,
                    front       VARCHAR NOT NULL,
                    back        VARCHAR,
                    css         VARCHAR,
                    js          VARCHAR,
                    UNIQUE (sourceId, name, model)
                );

                CREATE TABLE IF NOT EXISTS note (
                    _id         VARCHAR PRIMARY KEY,
                    _meta       VARCHAR NOT NULL, /* JSON */
                    sourceId    VARCHAR REFERENCES source(_id),
                    key         VARCHAR,
                    data        VARCHAR NOT NULL /* JSON */
                    /* UNIQUE (sourceId, key) */
                );

                CREATE TABLE IF NOT EXISTS media (
                    _id         VARCHAR PRIMARY KEY,
                    sourceId    VARCHAR REFERENCES source(_id),
                    name        VARCHAR NOT NULL,
                    data        BLOB NOT NULL,
                    h           VARCHAR NOT NULL
                );

                CREATE TABLE IF NOT EXISTS card (
                    _id         VARCHAR PRIMARY KEY,
                    deckId      VARCHAR NOT NULL REFERENCES deck(_id),
                    templateId  VARCHAR REFERENCES template(_id),
                    noteId      VARCHAR REFERENCES note(_id),
                    front       VARCHAR NOT NULL,
                    back        VARCHAR,
                    mnemonic    VARCHAR,
                    srsLevel    INTEGER,
                    nextReview  VARCHAR,
                    /* tag */
                    created     VARCHAR,
                    modified    VARCHAR,
                    stat        VARCHAR /* JSON */
                );

                CREATE TABLE IF NOT EXISTS tag (
                    _id     VARCHAR PRIMARY KEY,
                    name    VARCHAR UNIQUE NOT NULL
                );

                CREATE TABLE IF NOT EXISTS cardTag (
                    cardId  VARCHAR NOT NULL REFERENCES card(_id) ON DELETE CASCADE,
                    tagId   VARCHAR NOT NULL REFERENCES tag(_id) ON DELETE CASCADE,
                    PRIMARY KEY (cardId, tagId)
                );
                """)

    def _get_data(self, card_id: str) -> dict:
        c = self.conn.execute("""
        SELECT data FROM note n
        JOIN card c ON c.noteId = n._id
        WHERE c._id = ?
        """, (card_id,)).fetchone()

        if c:
            return json.loads(c[0])

        return dict()

    def _get_meta(self, card_id: str) -> dict:
        c = self.conn.execute("""
        SELECT _meta FROM note n
        JOIN card c ON c.noteId = n._id
        WHERE c._id = ?
        """, (card_id,)).fetchone()

        if c:
            return json.loads(c[0])

        return dict()

    def _get_tags(self, card_id: str) -> List[str]:
        return [c[0] for c in self.conn.execute("""
        SELECT name FROM tag WHERE _id = (
            SELECT tagId FROM cardTag WHERE cardId = ?)
        )
        """, (card_id,))]
