from datetime import datetime
import os
from typing import List
from uuid import uuid4

import pymongo
from pymongo import MongoClient

from src.python.util import from_str
from .db import Database, Entry


class MongoDatabase(Database):
    def __init__(self):
        self.client = MongoClient(os.getenv("MONGO_URI"))
        self.db = self.client["rep2recall"]

        self.user = self.db["user"]
        self.deck = self.db["deck"]
        self.source = self.db["source"]
        self.template = self.db["template"]
        self.note = self.db["note"]
        self.media = self.db["media"]
        self.card = self.db["card"]

        try:
            self.user.create_index([("email", pymongo.TEXT)], unique=True)
            self.deck.create_index([("userId", pymongo.ASCENDING), ("name", pymongo.ASCENDING)], unique=True)
            self.source.create_index([("userId", pymongo.ASCENDING), ("h", pymongo.ASCENDING)], unique=True)
            self.template.create_index([
                ("userId", pymongo.ASCENDING),
                ("sourceId", pymongo.ASCENDING),
                ("name", pymongo.ASCENDING),
                ("model", pymongo.ASCENDING)
            ], unique=True)
            self.media.create_index([("userId", pymongo.ASCENDING), ("h", pymongo.ASCENDING)], unique=True)
        except Exception:
            pass

    def reset(self):
        self.user.delete_one({"_id": self.user_id})
        self.deck.delete_many({"userId": self.user_id})
        self.source.delete_many({"userId": self.user_id})
        self.template.delete_many({"userId": self.user_id})
        self.note.delete_many({"userId": self.user_id})
        self.media.delete_many({"userId": self.user_id})
        self.card.delete_many({"userId": self.user_id})

    def insert_many(self, entries: List[Entry]) -> List[str]:
        entries = [self._transform_create_or_update(None, dict(e)) for e in entries]
        now = datetime.now()

        source_map = dict()
        for e in entries:
            if e.get("sourceH"):
                h = e["sourceH"]
                if h not in source_map.keys():
                    source_map[h] = e

        for h, e in source_map.items():
            inserted_id = str(uuid4())
            self.source.insert_one({
                "_id": inserted_id,
                "userId": self.user_id,
                "name": e.get("source"),
                "created": from_str(e.get("sourceCreated", now)),
                "h": h
            })
            source_map[h] = inserted_id

        t_map = dict()
        for e in entries:
            if e.get("template") and e.get("model"):
                key = f'{e["template"]}\x1f{e["model"]}'
                if key not in t_map.keys():
                    t_map[key] = e

        for key, e in t_map.items():
            inserted_id = str(uuid4())
            self.template.insert_one({
                "_id": inserted_id,
                "userId": self.user_id,

            })
