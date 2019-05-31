from flask import Blueprint, request, Response, jsonify
import pystache

from ..shared import Config
from ..engine.search import mongo_filter, sorter

api_editor = Blueprint("editor", __name__, url_prefix="/api/editor")


@api_editor.route("/", methods=["POST", "PUT", "DELETE"])
def r_editor():
    r = request.json
    db = Config.DB

    if request.method == "POST":
        offset = r.get("offset", 0)
        all_data = sorted(filter(mongo_filter(r["q"]), db.get_all()),
                          key=sorter(r.get("sortBy", "deck"), r.get("desc", False)))
        return jsonify({
            "data": list(map(_editor_entry_post_process, all_data[offset: offset + r.get("limit", 10)])),
            "count": len(all_data)
        })

    elif request.method == "PUT":
        if r["create"]:
            c_id = db.insert_many([r["create"]])[0]
            return jsonify({
                "id": c_id
            })

        if r["update"]:
            db.update(r["id"], r["update"])
        else:
            db.update(r["id"], {r["fieldName"]: r["fieldData"]})

        return Response(status=201)

    elif request.method == "DELETE":
        db.conn.execute("""
        DELETE FROM card
        WHERE id = ?
        """, (r["id"],))

        return Response(status=201)

    return Response(status=404)


@api_editor.route("/findOne", methods=["POST"])
def r_editor_find_one():
    c = tuple(filter(mongo_filter({"id": request.json["id"]}), Config.DB.get_all()))[0]

    if c["front"].startswith("@md5\n"):
        c["front"] = c["tFront"]
        c["back"] = c["tBack"]

    return jsonify(c)


@api_editor.route("/insertMany", methods=["POST"])
def r_editor_insert_many():
    return jsonify(Config.DB.insert_many(request.json["entries"]))


def _editor_entry_post_process(c: dict) -> dict:
    data = c.get("data", dict())
    if c["front"].startswith("@md5\n"):
        c["front"] = pystache.render(c["tFront"], data)
        c["back"] = pystache.render(c["tBack"], data)

    return c
