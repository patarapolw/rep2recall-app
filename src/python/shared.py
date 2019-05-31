import appdirs
import os
from pathlib import Path
import atexit
import shutil

from .engine.db import Db


class Config:
    PORT = os.getenv("PORT", 34972)

    COLLECTION = os.getenv("COLLECTION", os.path.join(appdirs.user_data_dir("rep2recall"), "user.db"))
    Path(COLLECTION).parent.mkdir(parents=True, exist_ok=True)

    DIR = Path(COLLECTION).parent.resolve()
    UPLOAD_FOLDER = DIR.joinpath("upload")
    UPLOAD_FOLDER.mkdir(exist_ok=True)
    atexit.register(shutil.rmtree, str(UPLOAD_FOLDER))

    print(COLLECTION)

    DB = Db(COLLECTION)
