from typing import Set, List
from datetime import datetime, timedelta
import re
from typing import Union, Callable, Any
import math
import functools

ANY_OF = {"template", "front", "mnemonic", "entry", "deck", "tag"}
IS_DATE = {"created", "modified", "nextReview"}
IS_STRING = {"template", "front", "back", "mnemonic", "deck", "tag", "entry"}


def parse_query(s: str) -> dict:
    tokens = shlex_split(s)
    token_result = []

    for t in tokens:
        expr_str = t[1:] if t[0] == "-" else t
        expr = shlex_split(expr_str, {':', '>', '<', '=', '~'}, True)

        pre_result = None

        if len(expr) == 1:
            and_cond = []
            for a in ANY_OF:
                if a in IS_STRING:
                    and_cond.append({a: {"$substr": expr[0]}})
                else:
                    and_cond.append({a: expr[0]})

            pre_result = {"$and": and_cond}

        elif len(expr) == 3:
            k, o, v = expr

            if k == "is":
                if v == "due":
                    k = "nextReview"
                    o = "<="
                    v = str(datetime.now())
                elif v == "leech":
                    k = "srsLevel"
                    o = "="
                    v = 0
                elif v == "new":
                    k = "srsLevel"
                    v = "NULL"

            if v == "NULL":
                pre_result = {"$or": [
                    {k: ""},
                    {k: {"$exists": False}}
                ]}
            else:
                if k in IS_DATE:
                    try:
                        v = datetime.now() + parse_timedelta(v)
                    except ValueError:
                        if v == "now":
                            o = "<="
                            v = str(datetime.now())

                if o == ":":
                    if isinstance(v, str) or k in IS_STRING:
                        v = {"$substr": str(v)}
                elif o == "~":
                    v = {"$regex": str(v)}
                elif o == ">=":
                    v = {"$gte": v}
                elif o == ">":
                    v = {"$gt": v}
                elif o == "<=":
                    v = {"$lte": v}
                elif o == "<":
                    v = {"$lt": v}

                pre_result = {k: v}

        if pre_result is None:
            raise ValueError("Invalid query string")

        token_result.append({"$not": pre_result} if t[0] == "-" else pre_result)

    return {"$and": token_result}


def mongo_filter(cond: Union[dict, str]) -> Callable[[dict], bool]:
    if isinstance(cond, str):
        return mongo_filter(parse_query(cond))

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
                if isinstance(v, dict) and any(k0[0] == "$" for k0 in v.keys()):
                    return _mongo_compare(item.get(k), v)
                elif isinstance(item[k], list) and v not in item[k]:
                    return False
                elif item[k] != v:
                    return False

        return True

    return inner_filter


def parse_timedelta(s: str) -> timedelta:
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

    raise ValueError("Invalid timedelta value")


def sorter(sort_by: str, desc: bool) -> Callable[[Any], bool]:
    def pre_cmp(a, b):
        m = _sort_convert(a)
        n = _sort_convert(b)

        if type(m) == type(n):
            return 1 if a > b else 0 if a == b else -1
        elif isinstance(m, str):
            return 1
        else:
            return -1

    return functools.cmp_to_key(lambda x, y: pre_cmp(x[sort_by], y[sort_by]) if desc else -pre_cmp(x[sort_by], y[sort_by]))


def shlex_split(s: str, split_token: Set[str] = None, keep_splitter: bool = False) -> List[str]:
    if split_token is None:
        split_token = {" "}

    tokens = []

    new_token = ""
    skip_reading = False

    for i, c in enumerate(s):
        if c == '"':
            if i > 0 and s[i-1: i+1] == '\\"':
                new_token += '"'
            else:
                skip_reading = not skip_reading

            continue

        if c in split_token:
            if new_token:
                tokens.append(new_token)
                new_token = ""

            if keep_splitter:
                tokens.append(c)

            continue

    if new_token:
        tokens.append(new_token)

    return tokens


def _mongo_compare(v, v_obj: dict) -> bool:
    for op, v0 in v_obj.items():
        if op == "$regex":
            if isinstance(v, list):
                return any(re.search(str(v0), str(b)) for b in v)
            else:
                return re.search(str(v0), str(v)) is not None
        elif op == "$substr":
            if isinstance(v, list):
                return any(str(v0) in str(b) for b in v)
            else:
                return str(v0) in str(v)
        elif op == "$startswith":
            if isinstance(v, list):
                return any(str(v0).startswith(str(b)) for b in v)
            else:
                return str(v0).startswith(str(v))
        elif op == "$gte":
            return v >= v0
        elif op == "$gt":
            return v > v0
        elif op == "$lte":
            return v <= v0
        elif op == "$lt":
            return v < v0
        elif op == "$exists":
            return (v is None) == v0

    return False


def _sort_convert(x) -> Union[float, str]:
    if x is None:
        return -math.inf
    elif isinstance(x, bool):
        return math.inf if x else -math.inf
    elif isinstance(x, int):
        return float(x)

    return str(x)