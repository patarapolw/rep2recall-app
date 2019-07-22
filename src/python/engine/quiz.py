from datetime import datetime, timedelta

srs_map = (
    timedelta(hours=4),
    timedelta(hours=8),
    timedelta(days=1),
    timedelta(days=3),
    timedelta(weeks=1),
    timedelta(weeks=2),
    timedelta(weeks=4),
    timedelta(weeks=16)
)


def get_next_review(srs_level: int) -> datetime:
    try:
        return srs_map[srs_level - 1] + datetime.now()
    except IndexError:
        return repeat_review()


def repeat_review() -> datetime:
    return datetime.now() + timedelta(minutes=10)
