"""No-op operations on tracked containers record no change entry (#62)."""

from __future__ import annotations

from pydatatracker import TrackedDict, TrackedList


def _count(c: TrackedDict | TrackedList, op: str, *args: object) -> int:
    n = len(c.tracking_changes())
    getattr(c, op)(*args)
    return len(c.tracking_changes()) - n


def test_issue_repro_records_one_entry() -> None:
    d = TrackedDict({"a": 1})
    n = len(d.tracking_changes())
    d.pop("zz", 5)
    d.setdefault("a", 2)
    d.clear()
    d.clear()
    assert len(d.tracking_changes()) - n == 1


def test_dict_noops_record_nothing() -> None:
    d = TrackedDict({"a": 1})
    assert _count(d, "pop", "zz", 5) == 0
    assert _count(d, "setdefault", "a", 2) == 0
    assert d["a"] == 1
    assert _count(TrackedDict(), "clear") == 0


def test_dict_changes_still_record() -> None:
    d = TrackedDict({"a": 1, "b": 2})
    assert _count(d, "pop", "a") == 1
    assert _count(d, "setdefault", "c", 3) == 1
    assert d["c"] == 3
    assert _count(d, "clear") == 1


def test_list_noops_record_nothing() -> None:
    assert _count(TrackedList(), "clear") == 0
    assert _count(TrackedList(), "sort") == 0
    assert _count(TrackedList(), "reverse") == 0
    assert _count(TrackedList([1]), "reverse") == 0
    assert _count(TrackedList([1, 2, 3]), "sort") == 0
    assert _count(TrackedList([1, 1, 1]), "reverse") == 0


def test_list_changes_still_record() -> None:
    assert _count(TrackedList([1, 2]), "clear") == 1
    assert _count(TrackedList([3, 1, 2]), "sort") == 1
    assert _count(TrackedList([1, 2, 3]), "reverse") == 1
