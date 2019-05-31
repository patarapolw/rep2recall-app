from flask import Blueprint, request, jsonify, Response
from uuid import uuid4
import json

from ..shared import Config
from ..engine.anki import Anki

api_io = Blueprint("io", __name__, url_prefix="/api/io")

ANKI_FILENAME = dict()


@api_io.route("/anki/import", methods=["POST"])
def r_anki_import():
    f = request.files["apkg"]
    f_id = str(uuid4())
    ANKI_FILENAME[f_id] = f.filename
    f.save(str(Config.UPLOAD_FOLDER.joinpath(f"{f_id}.apkg")))

    return jsonify({
        "id": f_id
    })


@api_io.route("/anki/progress", methods=["POST"])
def r_anki_progress():
    f_id = request.json["id"]
    filename = ANKI_FILENAME[f_id]

    stream = Stream()
    anki = Anki(str(Config.UPLOAD_FOLDER.joinpath(f"{f_id}.apkg")), filename,
                lambda x: stream.write(json.dumps(x) + "\n") if x else stream.done())
    anki.export(Config.DB)

    return Response(stream.stream())


class Stream:
    def __init__(self):
        self._shared = None
        self._done = False
        self._trigger = False

    def write(self, data: str):
        self._shared = data
        self._trigger = True

    def stream(self):
        while not self._done:
            if self._trigger:
                yield self._shared
                self._trigger = False

    def done(self):
        self._done = True
