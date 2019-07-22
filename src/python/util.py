import re
from datetime import datetime
import json
from typing import Any, Union
import dateutil.parser
import dataclasses as dc


def anki_mustache(s: str, d: dict = None, front: str = "") -> str:
    if d is None:
        d = dict()

    s = s.replace("{{FrontSide}}", front.replace("@html\n", ""))

    keys = set()
    for k, v in d.items():
        keys.add(k)
        if isinstance(v, str):
            s = re.sub(r"{{(\S+:)?%s}}" % re.escape(k),
                       re.sub("^@[^\n]+\n", "", v, flags=re.MULTILINE), s)

    s = re.sub(r"{{#(\S+)}}(.*){{\1}}", lambda m: m[2] if m[1] in keys else "", s, flags=re.DOTALL)
    s = re.sub(r"{{[^}]+}}", "", s)

    return "@rendered\n" + s


def to_str(x: Any) -> Any:
    if isinstance(x, datetime):
        return str(x)
    elif isinstance(x, dict):
        return json.dumps(x, ensure_ascii=False)

    return x


def from_str(x: Union[str, None]) -> Any:
    try:
        if x[0] == "{" and x[-1] == "}":
            return json.loads(x)
        else:
            return dateutil.parser.parse(x)
    except Exception:
        return x


class TypedDict:
    def __iter__(self):
        for k, v in dc.asdict(self).items():
            if not isinstance(v, NotImplemented):
                if isinstance(v, TypedDict):
                    v = dict(v)
                elif isinstance(v, datetime):
                    v = str(v)

                yield k, v
