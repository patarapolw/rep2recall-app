from datetime import datetime, timedelta
import re
from typing import Union, Callable, Any
import math
import functools
from uuid import uuid4
import dataclasses as dc

from ..util import TypedDict

ANY_OF = {"template", "front", "mnemonic", "entry", "deck", "tag"}
IS_DATE = {"created", "modified", "nextReview"}
IS_STRING = {"template", "front", "back", "mnemonic", "deck", "tag", "entry"}


@dc.dataclass
class ParserMeta(TypedDict):
    is_: set = dc.field(default_factory=set)
    sortBy: str = "deck"
    desc: bool = False


class SearchParser:
    meta = ParserMeta()

    def parse(self, q: str) -> dict:
        try:
            return self._parse(q)
        except ValueError:
            self.meta = ParserMeta()
            return dict()

    def _parse(self, q: str):
        for method in [
            self._remove_brackets,
            self._parse_sep(" OR "),
            self._parse_sep(" "),
            self._parse_neg,
            self._parse_full_expr,
            self._parse_partial_expr
        ]:
            try:
                return method(q.strip())
            except ValueError:
                pass

        raise Exception()

    def _remove_brackets(self, q: str):
        if re.fullmatch(r"\([^)]+\)", q):
            return self._parse(q[1:-1])

        raise ValueError("Not bracketed")

    def _parse_sep(self, sep: str):
        brackets = dict()

        def _escape_brackets(m):
            id_ = uuid4().hex
            brackets[id_] = m.group(0)
            return id_

        def _parse_sep_inner(q: str):
            q = re.sub(r"\([^)]+\)", _escape_brackets, q)
            tokens = q.split(sep)

            for i, t in enumerate(tokens):
                for k, v in brackets.items():
                    tokens[i] = tokens[i].replace(k, v)

            if len(tokens) >= 2:
                parsed_tokens = list(filter(lambda x: x, (self._parse(t) for t in tokens)))
                if len(parsed_tokens) > 1:
                    k = "$or" if sep == " OR " else "$and"
                    return {k: parsed_tokens}
                elif len(parsed_tokens) == 1:
                    return parsed_tokens[0]
                else:
                    return dict()

            raise ValueError(f"Not separated by '{sep}'")

        return _parse_sep_inner

    def _parse_neg(self, q: str):
        if q and q[0] == "-":
            kw = "-sortBy:"

            if q.startswith(kw) and q != kw:
                self.meta.sort_by = q[len(kw):]
                return None

            return {"$not": self._parse(q)}

        raise ValueError("Not negative")

    def _parse_full_expr(self, q: str):
        m = re.fullmatch(r'([\w-]+)(:|~|[><]=?|=)([\w-]+|"[^"]+")', q)
        if m:
            k, op, v = m.groups()

            if len(v) > 2 and v[0] == '"' and v[-1] == '"':
                v = v[1:-1]
            else:
                m1 = re.fullmatch(r"\d+(?:\.\d+)?", v)
                if m1:
                    v = float(v)

            if k == "is":
                if v == "due":
                    k = "nextReview"
                    op = "<="
                    v = str(datetime.now())
                elif v == "leech":
                    k = "srsLevel"
                    op = "="
                    v = 0
                elif v == "new":
                    k = "nextReview"
                    v = "NULL"
                elif v == "marked":
                    k = "tag"
                    op = "="
                    v = "marked"
                else:
                    self.meta.is_ = v
                    return None

            if k in {"due", "nextReview"} and op == ":":
                k = "nextReview"
                op = "<="
            elif k in {"created", "modified"} and op == ":":
                op = ">="
            elif k == "sortBy":
                self.meta.sort_by = v
                return None

            if v == "NULL":
                return {"$or": [
                    {k: ""},
                    {k: {"$exists": False}}
                ]}

            if k in IS_DATE:
                try:
                    v = str(datetime.now() + parse_timedelta(v))
                    if op == ":":
                        if k == "nextReview":
                            op = "<="
                        else:
                            op = ">="
                except ValueError:
                    pass

            if op == ":":
                if isinstance(v, str) or k in IS_STRING:
                    v = {"$regex": re.escape(str(v))}
            elif op == "~":
                v = {"$regex": str(v)}
            elif op == ">=":
                v = {"$gte": v}
            elif op == ">":
                v = {"$gt": v}
            elif op == "<=":
                v = {"$lte": v}
            elif op == "<":
                v = {"$lt": v}

            return {k: v}

        raise ValueError("Not full expression")

    @staticmethod
    def _parse_partial_expr(q: str):
        if q and ":" not in q:
            or_cond = []
            for a in ANY_OF:
                if a in IS_STRING:
                    or_cond.append({a: {"$regex": re.escape(q)}})
                else:
                    or_cond.append({a: q})

            or_cond.append({"@*": {"$regex": re.escape(q)}})

            return {"$or": or_cond}

        raise ValueError("Not partial expression")


def mongo_filter(cond: Union[str, dict]) -> Callable[[dict], bool]:
    if isinstance(cond, str):
        cond = SearchParser().parse(cond)
        return mongo_filter(cond)

    def inner_filter(item: dict) -> bool:
        for k, v in cond.items():
            if k[0] == "$":
                if k == "$and":
                    return all(mongo_filter(x)(item) for x in v)
                elif k == "$or":
                    return any(mongo_filter(x)(item) for x in v)
                elif k == "$not":
                    return not mongo_filter(v)(item)
            else:
                item_k = dot_getter(item, k)

                if isinstance(v, dict) and any(k0[0] == "$" for k0 in v.keys()):
                    return _mongo_compare(item_k, v)
                elif isinstance(item_k, list):
                    if v not in item_k:
                        return False
                elif item_k != v:
                    return False

        return True

    return inner_filter


def parse_timedelta(s: str) -> timedelta:
    if s == "NOW":
        return timedelta()

    m = re.search("([-+]?\\d+)(\\S*)", s)
    if m:
        if m[2] in {"m", "min"}:
            return timedelta(minutes=int(m[1]))
        elif m[2] in {"h", "hr"}:
            return timedelta(hours=int(m[1]))
        elif m[2] in {"d"}:
            return timedelta(days=int(m[1]))
        elif m[2] in {"w", "wk"}:
            return timedelta(weeks=int(m[1]))
        elif m[2] in {"M", "mo"}:
            return timedelta(days=30 * int(m[1]))
        elif m[2] in {"y", "yr"}:
            return timedelta(days=365 * int(m[1]))

    raise ValueError("Invalid timedelta")


def sorter(sort_by: str, desc: bool):
    def pre_cmp(a, b):
        m = _sort_convert(a)
        n = _sort_convert(b)

        if isinstance(m, (float, int, str)):
            if type(m) == type(n):
                return 1 if m > n else 0 if m == n else -1
            elif isinstance(m, str):
                return 1
            else:
                return -1
        else:
            return 0

    return functools.cmp_to_key(lambda x, y: -pre_cmp(dot_getter(x, sort_by, False), dot_getter(y, sort_by, False))
    if desc else pre_cmp(dot_getter(x, sort_by, False), dot_getter(y, sort_by, False)))


def dot_getter(d: dict, k: str, get_data: bool = True) -> Any:
    if k[0] == "@":
        return data_getter(d, k[1:])

    v = d

    for kn in k.split("."):
        if isinstance(v, dict):
            if kn == "*":
                v = list(v.values())
            else:
                v = v.get(kn, dict())
        elif isinstance(v, list):
            try:
                v = v[int(kn)]
            except (IndexError, ValueError):
                v = None
                break
        else:
            break

    if isinstance(v, dict) and len(v) == 0:
        v = None

    if get_data and k not in {"nextReview", "srsLevel"}:
        data = data_getter(d, k)
        if data is not None:
            if v is not None:
                if isinstance(data, list):
                    if isinstance(v, list):
                        v = [*v, *data]
                    elif v is not None:
                        v = [v, *data]
                    else:
                        v = data
                else:
                    if isinstance(v, list):
                        v = [*v, data]
                    elif v is not None:
                        v = [v, data]
                    else:
                        v = data
            else:
                v = data

    return v


def data_getter(d: dict, k: str) -> Union[str, list, None]:
    k = k.lower()

    try:
        if k == "*":
            return [v0["value"] for v0 in d["data"] if not v0["value"].startswith("@nosearch\n")]
        else:
            for v0 in d["data"]:
                if v0["key"].lower() == k:
                    return v0["value"]
    except AttributeError:
        pass

    return None


def _mongo_compare(v, v_obj: dict) -> bool:
    for op, v0 in v_obj.items():
        try:
            if op == "$regex":
                if isinstance(v, list):
                    return any(re.search(str(v0), str(b), flags=re.IGNORECASE) for b in v)
                else:
                    return re.search(str(v0), str(v), flags=re.IGNORECASE) is not None
            elif op == "$substr":
                if isinstance(v, list):
                    return any(str(v0) in str(b) for b in v)
                else:
                    return str(v0) in str(v)
            elif op == "$startswith":
                if isinstance(v, list):
                    return any(str(b).startswith(str(v0)) for b in v)
                else:
                    return str(v).startswith(str(v0))
            elif op == "$exists":
                return (v is not None) == v0
            else:
                try:
                    _v = int(v)
                    _v0 = int(v0)
                    v, v0 = _v, _v0
                except ValueError:
                    pass

                if op == "$gte":
                    return v >= v0
                elif op == "$gt":
                    return v > v0
                elif op == "$lte":
                    return v <= v0
                elif op == "$lt":
                    return v < v0
        except TypeError:
            pass

    return False


def _sort_convert(x) -> Union[float, str]:
    if x is None:
        return -math.inf
    elif isinstance(x, bool):
        return math.inf if x else -math.inf
    elif isinstance(x, int):
        return float(x)

    return str(x)
