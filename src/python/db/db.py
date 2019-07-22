import hashlib
from abc import ABC, abstractmethod
from typing import List
from datetime import datetime
import dataclasses as dc

from ..util import anki_mustache, from_str, TypedDict


@dc.dataclass
class CondOptions(TypedDict):
    fields: List[str]
    in_fields: List[str] = []
    is_: List[str] = []
    offset = 0
    limit: int = None
    sort_by = "deck"
    desc = False


@dc.dataclass
class PagedOutput(TypedDict):
    data: List[dict]
    count: int


@dc.dataclass
class Entry(TypedDict):
    front: str
    deck: str

    source: str = None
    sourceH: str = None
    sourceCreated: datetime = None

    template: str = None
    model: str = None
    tFront: str = None
    tBack: str = None
    css: str = None
    js: str = None

    back: str = None
    mnemonic: str = None
    srsLevel: int = None
    nextReview: datetime = None
    tag: List[str] = list()


class Database(ABC):
    user_id = ""

    @abstractmethod
    def reset(self):
        pass

    @abstractmethod
    def insert_many(self, entries: List[Entry]) -> List[str]:
        pass

    @abstractmethod
    def parse_cond(self, cond: dict, options: CondOptions) -> PagedOutput:
        pass

    @abstractmethod
    def update_many(self, ids: List[str], u: dict):
        pass

    @abstractmethod
    def add_tags(self, ids: List[str], tags: List[str]):
        pass

    @abstractmethod
    def remove_tags(self, ids: List[str], tags: List[str]):
        pass

    @abstractmethod
    def delete_many(self, ids: List[str]):
        pass

    @abstractmethod
    def _shift_srs_level(self, d_srs_level: int, card_id: str):
        pass

    @abstractmethod
    def _get_data(self, card_id: str):
        pass

    def render(self, card_id: str) -> dict:
        r = self.parse_cond({"_id": card_id}, CondOptions(limit=1, fields=[
            "_id", "front", "back", "mnemonic", "tFront", "tBack", "data", "css", "js"
        ]))

        if len(r.data):
            c = r.data[0]

            tFront = c.get("tFront", "")
            tBack = c.get("tBack", "")
            data = from_str(c.get("data", "{}"))

            if c.get("front", "").startswith("@md5\n"):
                c["front"] = anki_mustache(tFront, data)

            if c.get("back", "").startswith("@md5\n"):
                c["back"] = anki_mustache(tBack, data, c.get("front", ""))

            return c

        return dict()

    def mark_right(self, card_id: str):
        self._shift_srs_level(+1, card_id)

    def mark_wrong(self, card_id: str):
        self._shift_srs_level(-1, card_id)

    def _transform_create_or_update(self, card_id: str = None, u: dict = None) -> dict:
        if u is None:
            u = dict()

        data = None
        front = ""

        if card_id:
            u["modified"] = str(datetime.now())
        else:
            u["created"] = str(datetime.now())

        if u.get("front"):
            front = u["front"]
            assert isinstance(front, str)
            if front.startswith("@template\n"):
                if not data:
                    if card_id:
                        data = self._get_data(card_id)
                    else:
                        data = u.get("data", dict())

                u["tFront"] = front[len("@template\n"):]

        if u.get("tFront"):
            front = anki_mustache(u["tFront"], data)
            u["front"] = "@md5\n" + hashlib.md5(front.encode()).hexdigest()

        if u.get("back"):
            back = u["back"]
            assert isinstance(back, str)
            if back.startswith("@template\n"):
                if not data:
                    if card_id:
                        data = self._get_data(card_id)
                    else:
                        data = u.get("data", dict())

                u["tBack"] = back[len("@template\n"):]

        if u.get("tBack"):
            back = anki_mustache(u["tFront"], data, front)
            u["back"] = "@md5\n" + hashlib.md5(back.encode()).hexdigest()

        return u
