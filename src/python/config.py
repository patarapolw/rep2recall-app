import appdirs
import os
from pathlib import Path
import atexit
import shutil
from dotenv import load_dotenv
from flask import g

try:
    load_dotenv()
except OSError:
    pass


def resource_path(relative_path: str) -> str:
    base_path = os.getenv("ROOT_PATH", str(Path(__file__).joinpath("../../..")))
    return str(Path(base_path).joinpath(relative_path).resolve())


def _get_temp_folder() -> str:
    if os.getenv("MONGO_URI"):
        return "tmp"
    elif os.getenv("COLLECTION"):
        return str(Path(os.getenv("COLLECTION")).joinpath("../tmp"))
    else:
        data_dir = appdirs.user_data_dir("rep2recall")
        return str(Path(data_dir).joinpath("tmp"))


tmp = resource_path(_get_temp_folder())
Path(tmp).mkdir(parents=True, exist_ok=True)
atexit.register(shutil.rmtree, tmp)

g.tmp = tmp
