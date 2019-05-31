from flask import Flask
from flask_cors import CORS

from .shared import Config
from .api.quiz import api_quiz
from .api.editor import api_editor
from .api.io import api_io
from .api.media import api_media

app = Flask(__name__, static_folder=str(Config.DIR))
CORS(app)

app.register_blueprint(api_quiz)
app.register_blueprint(api_editor)
app.register_blueprint(api_io)
app.register_blueprint(api_media)
