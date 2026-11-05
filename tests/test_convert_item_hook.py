"""Tests for the ``_tracking_convert_item`` hook on `TrackedList` and `TrackedDict`."""

from __future__ import annotations

from collections.abc import Callable

import pytest

from pydatatracker import TrackedDict, TrackedList


class RecordList(TrackedList):
    """List whose hook logs calls, rejects bytes and wraps str."""

    def __init__(
        self, data: list[object] | None = None, *, tracking_auto_convert: bool = False
    ) -> None:
        self.seen: list[tuple[object, object]] = []
        super().__init__(data, tracking_auto_convert=tracking_auto_convert)

    def _tracking_convert_item(self, value: object, location: object = "") -> object:
        self.seen.append((value, location))
        if isinstance(value, bytes):
            raise TypeError("bytes rejected")
        if isinstance(value, str):
            return TrackedDict({"text": value})
        return super()._tracking_convert_item(value, location)


class RecordDict(TrackedDict):
    """Dict whose hook logs calls, rejects bytes and wraps str."""

    def __init__(
        self,
        data: dict[str, object] | None = None,
        *,
        tracking_auto_convert: bool = False,
        b: object = None,
    ) -> None:
        self.seen: list[tuple[object, object]] = []
        merged = dict(data or {})
        if b is not None:
            merged["b"] = b
        super().__init__(merged, tracking_auto_convert=tracking_auto_convert)

    def _tracking_convert_item(self, value: object, location: object = "") -> object:
        self.seen.append((value, location))
        if isinstance(value, bytes):
            raise TypeError("bytes rejected")
        if isinstance(value, str):
            return TrackedDict({"text": value})
        return super()._tracking_convert_item(value, location)


def _children(tracked: TrackedList | TrackedDict) -> dict[str, object]:
    return dict(tracked._tracking_child_tracked_items)


def _text_child_forwards(tracked: TrackedList | TrackedDict, child: TrackedDict) -> None:
    """Assert a change on ``child`` reaches ``tracked`` once."""
    before = len(tracked.tracking_changes())
    child["text"] = "changed"
    assert len(tracked.tracking_changes()) == before + 1


# ---- list paths -------------------------------------------------------------


def test_list_init() -> None:
    tracked = RecordList(["a", 1])
    assert tracked.seen == [("a", 0), (1, 1)]
    assert isinstance(tracked[0], TrackedDict)
    assert len(_children(tracked)) == 1
    _text_child_forwards(tracked, tracked[0])


def test_list_append() -> None:
    tracked = RecordList()
    tracked.append("a")
    assert tracked.seen == [("a", 0)]
    assert len(_children(tracked)) == 1
    _text_child_forwards(tracked, tracked[0])


def test_list_insert() -> None:
    tracked = RecordList([1, 2])
    tracked.seen.clear()
    tracked.insert(1, "a")
    assert tracked.seen == [("a", 1)]
    assert isinstance(tracked[1], TrackedDict)
    _text_child_forwards(tracked, tracked[1])


def test_list_extend() -> None:
    tracked = RecordList([1])
    tracked.seen.clear()
    tracked.extend(["a", "b"])
    assert tracked.seen == [("a", 1), ("b", 2)]
    assert len(_children(tracked)) == 2
    _text_child_forwards(tracked, tracked[2])


def test_list_iadd() -> None:
    tracked = RecordList([1])
    tracked.seen.clear()
    tracked += ["a"]
    assert tracked.seen == [("a", 1)]
    assert len(_children(tracked)) == 1


def test_list_setitem_int() -> None:
    tracked = RecordList([1, 2])
    tracked.seen.clear()
    tracked[1] = "a"
    assert tracked.seen == [("a", 1)]
    assert len(_children(tracked)) == 1
    _text_child_forwards(tracked, tracked[1])


@pytest.mark.parametrize("index", [5, -5])
def test_list_setitem_out_of_range_leaves_no_child(index: int) -> None:
    tracked = RecordList([1, TrackedDict({"text": "kept"})])
    children_before = _children(tracked)
    changes_before = len(tracked.tracking_changes())
    with pytest.raises(IndexError, match="list assignment index out of range"):
        tracked[index] = "b"
    assert len(tracked) == 2
    assert _children(tracked) == children_before
    assert len(tracked.tracking_changes()) == changes_before


@pytest.mark.parametrize(
    ("key", "expected"),
    [(slice(0, 1), [("a", 0), ("b", 1)]), (slice(0, 4, 2), [("a", 0), ("b", 2)])],
)
def test_list_setitem_slice(key: slice, expected: list[tuple[str, int]]) -> None:
    tracked = RecordList([1, 2, 3, 4])
    tracked.seen.clear()
    tracked[key] = ["a", "b"]
    assert tracked.seen == expected
    assert len(_children(tracked)) == 2
    _text_child_forwards(tracked, tracked[expected[0][1]])


def test_list_location_after_insert() -> None:
    tracked = RecordList()
    tracked.append("a")
    tracked.insert(0, 5)
    tracked[1]["text"] = "changed"
    assert tracked.tracking_changes()[-1].extra["location"] == "1:text"


def test_list_hook_runs_without_auto_convert() -> None:
    tracked = RecordList(tracking_auto_convert=False)
    tracked.append("a")
    tracked.append([1])
    assert tracked.seen[0] == ("a", 0)
    assert isinstance(tracked[0], TrackedDict)
    assert type(tracked[1]) is list


def test_list_multiply_does_not_call_hook() -> None:
    tracked = RecordList(["a"])
    tracked.seen.clear()
    tracked *= 2
    assert tracked.seen == []
    assert len(_children(tracked)) == 1


def test_list_already_tracked_is_linked() -> None:
    tracked = TrackedList()
    child = TrackedDict({"text": "x"})
    tracked.append(child)
    assert tracked[0] is child
    assert child._tracking_uuid in _children(tracked)
    _text_child_forwards(tracked, child)


# ---- list rejection ---------------------------------------------------------


def test_list_constructor_rejection() -> None:
    with pytest.raises(TypeError):
        RecordList(["a", b"x"])


@pytest.mark.parametrize(
    "op",
    [
        lambda t: t.append(b"x"),
        lambda t: t.insert(0, b"x"),
        lambda t: t.__setitem__(0, b"x"),
    ],
    ids=["append", "insert", "setitem"],
)
def test_list_single_rejection(op: Callable[[RecordList], object]) -> None:
    tracked = RecordList(["a", 1])
    contents, kids, changes = list(tracked), _children(tracked), len(tracked.tracking_changes())
    with pytest.raises(TypeError):
        op(tracked)
    assert list(tracked) == contents
    assert _children(tracked) == kids
    assert len(tracked.tracking_changes()) == changes


def _iadd(tracked: RecordList) -> None:
    tracked += ["new", b"x"]


@pytest.mark.parametrize(
    "op",
    [
        lambda t: t.extend(["new", b"x"]),
        _iadd,
        lambda t: t.__setitem__(slice(0, 1), ["new", b"x"]),
    ],
    ids=["extend", "iadd", "slice"],
)
def test_list_batch_rejection(op: Callable[[RecordList], object]) -> None:
    tracked = RecordList(["a", 1])
    contents, kids, changes = list(tracked), _children(tracked), len(tracked.tracking_changes())
    with pytest.raises(TypeError):
        op(tracked)
    assert list(tracked) == contents
    assert _children(tracked) == kids
    assert len(tracked.tracking_changes()) == changes


# ---- dict paths -------------------------------------------------------------


def test_dict_init_positional_and_kwargs() -> None:
    tracked = RecordDict({"a": "x"}, b="y")
    assert sorted(tracked.seen, key=str) == [("x", "a"), ("y", "b")]
    assert len(_children(tracked)) == 2


def test_dict_setitem() -> None:
    tracked = RecordDict()
    tracked["k"] = "a"
    assert tracked.seen == [("a", "k")]
    assert len(_children(tracked)) == 1
    _text_child_forwards(tracked, tracked["k"])


def test_dict_update() -> None:
    tracked = RecordDict()
    tracked.update({"a": "x"}, b="y")
    assert sorted(tracked.seen, key=str) == [("x", "a"), ("y", "b")]
    assert len(_children(tracked)) == 2
    _text_child_forwards(tracked, tracked["a"])


def test_dict_ior() -> None:
    tracked = RecordDict()
    tracked |= {"a": "x"}
    assert tracked.seen == [("x", "a")]
    assert len(_children(tracked)) == 1


def test_dict_setdefault() -> None:
    tracked = RecordDict()
    tracked.setdefault("a", "x")
    assert tracked.seen == [("x", "a")]
    assert len(_children(tracked)) == 1
    tracked.setdefault("a", "y")
    assert tracked.seen == [("x", "a")]


def test_dict_fromkeys() -> None:
    tracked = RecordDict.fromkeys(["a", "b"], "x")
    assert isinstance(tracked, RecordDict)
    assert tracked.seen == [("x", "a"), ("x", "b")]


def test_dict_hook_runs_without_auto_convert() -> None:
    tracked = RecordDict(tracking_auto_convert=False)
    tracked["a"] = "x"
    tracked["b"] = [1]
    assert isinstance(tracked["a"], TrackedDict)
    assert type(tracked["b"]) is list


def test_dict_already_tracked_is_linked() -> None:
    tracked = TrackedDict()
    child = TrackedList([1])
    tracked["a"] = child
    assert tracked["a"] is child
    assert child._tracking_uuid in _children(tracked)
    before = len(tracked.tracking_changes())
    child.append(2)
    assert len(tracked.tracking_changes()) == before + 1


def test_dict_constructor_rejection() -> None:
    with pytest.raises(TypeError):
        RecordDict({"a": "x", "b": b"x"})


def test_dict_setitem_rejection() -> None:
    tracked = RecordDict({"a": "x"})
    kids, changes = _children(tracked), len(tracked.tracking_changes())
    with pytest.raises(TypeError):
        tracked["b"] = b"x"
    assert "b" not in tracked
    assert _children(tracked) == kids
    assert len(tracked.tracking_changes()) == changes


def _ior(tracked: RecordDict) -> None:
    tracked |= {"n": "new", "bad": b"x"}


@pytest.mark.parametrize(
    "op",
    [lambda t: t.update({"n": "new", "bad": b"x"}), _ior],
    ids=["update", "ior"],
)
def test_dict_batch_rejection(op: Callable[[RecordDict], object]) -> None:
    tracked = RecordDict({"a": "x"})
    contents, kids = dict(tracked), _children(tracked)
    changes = len(tracked.tracking_changes())
    with pytest.raises(TypeError):
        op(tracked)
    assert dict(tracked) == contents
    assert _children(tracked) == kids
    assert len(tracked.tracking_changes()) == changes
