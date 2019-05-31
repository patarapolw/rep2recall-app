from flask import Blueprint, send_file
from io import BytesIO

from ..shared import Config

api_media = Blueprint("media", __name__, url_prefix="/api/media")


@api_media.route("/<int:media_id>")
def r_media(media_id: int):
    db = Config.DB
    name, b = db.conn.execute("""
    SELECT name, data
    FROM media 
    WHERE id = ?
    """, (media_id,)).fetchone()

    return send_file(BytesIO(b), attachment_filename=name)
