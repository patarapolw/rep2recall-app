from flask import Blueprint, request, jsonify, Response
from datetime import datetime
from typing import List
import json
import pystache

from ..shared import Config
from ..engine.search import mongo_filter, parse_query, parse_timedelta
from ..engine.quiz import get_next_review, srs_map, repeat_review

api_quiz = Blueprint("quiz", __name__, url_prefix="/api/quiz")


@api_quiz.route("/treeview", methods=["POST"])
def r_quiz_treeview():
    def _recurse_parse_data(_data: List[dict], _deck: List[str], _depth: int = 0):
        do_loop = True

        while _depth < len(_deck) - 1:
            for c in _data:
                if c["name"] == _deck[_depth]:
                    c["children"] = c.get("children", [])
                    _recurse_parse_data(c["children"], _deck, _depth + 1)
                    do_loop = False
                    break

            _depth += 1

            if not do_loop:
                break

        if do_loop and _depth == len(_deck) - 1:
            full_name = "/".join(deck)
            deck_items = [d for d in all_items if d["deck"].startswith(full_name)]

            _data.append({
                "name": _deck[_depth],
                "fullName": full_name,
                "isOpen": _depth < 2,
                "stat": {
                    "new": len([d for d in deck_items if not d["nextReview"]]),
                    "leech": len([d for d in deck_items if d["srsLevel"] == 0]),
                    "due": len([d for d in deck_items if datetime.fromisoformat(d["nextReview"]) < now])
                }
            })

    db = Config.DB
    all_items = tuple(filter(mongo_filter(request.json["q"]), db.get_all()))
    now = datetime.now()

    deck_list = sorted(set(d["deck"] for d in all_items))
    deck_with_subdecks = []

    for d in deck_list:
        deck = d.split("/")
        for i, _ in enumerate(deck):
            subdeck = "/".join(deck[:i + 1])
            if subdeck not in deck_with_subdecks:
                deck_with_subdecks.append(subdeck)

    full_data = []
    for d in deck_with_subdecks:
        deck = d.split("/")
        _recurse_parse_data(full_data, deck)

    return jsonify(full_data)


@api_quiz.route("/", methods=["POST"])
def r_quiz_build():
    r = request.json
    and_cond = [parse_query(r["q"])]

    if r["deck"]:
        and_cond.append({"$or": [
            {"deck": {"$startswith": r["deck"] + "/"}},
            {"deck": r["deck"]}
        ]})

    if r["due"]:
        and_cond.append({"nextReview": {"$lte": str(datetime.now() + parse_timedelta(r["due"]))}})
    else:
        and_cond.append({"nextReview": {"$lte": str(datetime.now())}})

    db = Config.DB
    all_items = [c["id"] for c in filter(mongo_filter({"$and": and_cond}), db.get_all())]

    return jsonify({"ids": all_items})


@api_quiz.route("/render", methods=["POST"])
def r_quiz_render():
    db = Config.DB
    c = dict(db.conn.execute("""
    SELECT front, back, templateId, noteId
    FROM card
    WHERE id = ?
    """, (request.json["id"],)).fetchone())

    if c["front"].startswith("@md5\n"):
        t = db.conn.execute("""
        SELECT front, back
        FROM template
        WHERE id = ?
        """, (c["templateId"],)).fetchone()

        data = json.loads(db.conn.execute("""
        SELECT data
        FROM note
        WHERE id = ?
        """, (c["noteId"],)).fetchone()[0])

        c["front"] = pystache.render(t["front"], data)
        c["back"] = pystache.render(t["back"], data)

    return jsonify(c)


@api_quiz.route("/right", methods=["PUT"])
def r_quiz_right():
    db = Config.DB
    srs_level = db.conn.execute("""
    SELECT srsLevel FROM card WHERE id = ?
    """, (request.json["id"],)).fetchone()[0]

    if srs_level is None:
        srs_level = 0

    srs_level += 1

    if srs_level >= len(srs_map):
        srs_level = len(srs_map) - 1

    db.conn.execute("""
    UPDATE card
    SET
        srsLevel = ?,
        nextReview = ?
    WHERE id = ?
    """, (
        srs_level,
        str(get_next_review(srs_level))
    ))

    return Response(status=201)


@api_quiz.route("/wrong", methods=["PUT"])
def r_quiz_wrong():
    db = Config.DB
    srs_level = db.conn.execute("""
        SELECT srsLevel FROM card WHERE id = ?
        """, (request.json["id"],)).fetchone()[0]

    if srs_level is None:
        srs_level = 1

    srs_level -= 1

    if srs_level < 0:
        srs_level = 0

    db.conn.execute("""
        UPDATE card
        SET
            srsLevel = ?,
            nextReview = ?
        WHERE id = ?
        """, (
        srs_level,
        str(repeat_review())
    ))

    return Response(status=201)
