from flask import Flask, jsonify, render_template, g
from flask_socketio import SocketIO
from flask_cors import CORS
import sqlite3
import traceback
import os

# https://github.com/miguelgrinberg/python-socketio/issues/35#issuecomment-482350874
from engineio.async_drivers import gevent

from .config import resource_path

app = Flask(__name__, static_folder=resource_path("public"), static_url_path="")
socketio = SocketIO(app, logger=True, engineio_logger=True)
g.io = socketio
CORS(app, resources={r"/api/*": {"origins": "*"}})


@app.route("/")
def r_index():
    return render_template("index")


@app.errorhandler(sqlite3.Error)
def r_sqlite_error(e):
    traceback.print_exc()
    return jsonify({"error": str(e)}), 500


def run_server():
    socketio.run(app, port=os.getenv("PORT", "7000"), log_output=True)
