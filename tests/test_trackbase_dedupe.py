"""Characterisation tests for the notify, tree-location and uuid-tree logic on TrackBase."""

from __future__ import annotations

from typing import Any

import pytest

from pydatatracker import TrackedAttr, TrackedDict, TrackedList
from pydatatracker.types._trackbase import TrackBase


class Holder(TrackedAttr):
    """TrackedAttr with one monitored, auto-converted attribute."""

    def __init__(self, *, monitor_child: bool = True) -> None:
        super().__init__(tracking_auto_convert=True)
        self.child: Any = None
        if monitor_child:
            self.tracking_add_attribute_to_monitor("child")


def _make(kind: str) -> Any:  # noqa: ANN401
    if kind == "dict":
        return TrackedDict(tracking_auto_convert=True)
    if kind == "list":
        return TrackedList(tracking_auto_convert=True)
    return Holder()


def _attach(parent: Any, child: Any) -> None:  # noqa: ANN401
    if isinstance(parent, TrackedDict):
        parent["k"] = child
    elif isinstance(parent, TrackedList):
        parent.append(child)
    else:
        parent.child = child


PARENT_LOCATION = {"dict": "k", "list": "0", "attr": "child"}
TREE_LOCATION = {"dict": "['k']", "list": "[0]", "attr": ".child"}


def test_chain_rehoming_end_to_end() -> None:
    root = TrackedDict(tracking_auto_convert=True)
    root["a"] = [{"b": 1}]
    lst = root["a"]
    inner = lst[0]
    holder = Holder()
    inner["h"] = holder
    holder.child = {"z": 1}
    leaf = holder.child
    leaf["z"] = 2

    entry = root.tracking_changes()[-1]
    assert entry.tracked_item_uuid == root._tracking_uuid
    assert entry.extra["location"] == "a|0:h.child:z"
    assert entry.extra["action"] == "update"
    assert entry.tree == [
        {"type": "TrackedDict", "uuid": root._tracking_uuid, "location": "['a']"},
        {"type": "TrackedList", "uuid": lst._tracking_uuid, "location": "[0]"},
        {"type": "TrackedDict", "uuid": inner._tracking_uuid, "location": "['h']"},
        {"type": "TrackedAttr", "uuid": holder._tracking_uuid, "location": ".child"},
        {"type": "TrackedDict", "uuid": leaf._tracking_uuid, "location": "['z']"},
    ]


_PARENT_TREE = {
    "dict": ("TrackedDict", "['k']"),
    "list": ("TrackedList", "[0]"),
    "attr": ("TrackedAttr", ".child"),
}
_CHILD_TREE = {
    "dict": ("TrackedDict", "['x']"),
    "list": ("TrackedList", "[0]"),
    "attr": ("TrackedAttr", ".child"),
}
_LOCATIONS = {
    ("dict", "dict"): "k:x",
    ("dict", "list"): "k|0",
    ("dict", "attr"): "k.child",
    ("list", "dict"): "0:x",
    ("list", "list"): "0|0",
    ("list", "attr"): "0.child",
    ("attr", "dict"): "child:x",
    ("attr", "list"): "child|0",
    ("attr", "attr"): "child.child",
}


@pytest.mark.parametrize("parent_kind", ["dict", "list", "attr"])
@pytest.mark.parametrize("child_kind", ["dict", "list", "attr"])
def test_rehoming_across_parent_and_child_types(parent_kind: str, child_kind: str) -> None:
    parent = _make(parent_kind)
    child = _make(child_kind)
    _attach(parent, child)
    if child_kind == "dict":
        child["x"] = 1
    elif child_kind == "list":
        child.append(1)
    else:
        child.child = 1

    entry = parent.tracking_changes()[-1]
    assert entry.tracked_item_uuid == parent._tracking_uuid
    assert entry.extra["location"] == _LOCATIONS[(parent_kind, child_kind)]
    assert entry.tree == [
        {
            "type": _PARENT_TREE[parent_kind][0],
            "uuid": parent._tracking_uuid,
            "location": _PARENT_TREE[parent_kind][1],
        },
        {
            "type": _CHILD_TREE[child_kind][0],
            "uuid": child._tracking_uuid,
            "location": _CHILD_TREE[child_kind][1],
        },
    ]


def test_multi_parent_forwarding_records_once_each() -> None:
    child = TrackedDict()
    p1 = TrackedDict()
    p2 = TrackedList()
    p1["one"] = child
    p2.append(child)
    before1 = len(p1.tracking_changes())
    before2 = len(p2.tracking_changes())

    child["x"] = 1

    new1 = p1.tracking_changes()[before1:]
    new2 = p2.tracking_changes()[before2:]
    assert [e.extra["location"] for e in new1] == ["one:x"]
    assert [e.extra["location"] for e in new2] == ["0:x"]
    assert new1[0].tree == [
        {"type": "TrackedDict", "uuid": p1._tracking_uuid, "location": "['one']"},
        {"type": "TrackedDict", "uuid": child._tracking_uuid, "location": "['x']"},
    ]
    assert new2[0].tree == [
        {"type": "TrackedList", "uuid": p2._tracking_uuid, "location": "[0]"},
        {"type": "TrackedDict", "uuid": child._tracking_uuid, "location": "['x']"},
    ]


@pytest.mark.parametrize(
    ("kind", "location", "expected"),
    [
        ("dict", None, None),
        ("dict", 0, "[0]"),
        ("dict", "k", "['k']"),
        ("list", None, None),
        ("list", 0, "[0]"),
        ("list", "k", "['k']"),
        ("attr", None, None),
        ("attr", 0, ".0"),
        ("attr", "name", ".name"),
    ],
)
def test_format_tree_location(kind: str, location: Any, expected: str | None) -> None:  # noqa: ANN401
    obj = _make(kind)
    type_name = {"dict": "TrackedDict", "list": "TrackedList", "attr": "TrackedAttr"}[kind]
    result = obj._tracking_format_tree_location(location)
    want: dict[str, Any] = {"type": type_name, "uuid": obj._tracking_uuid}
    if expected is not None:
        want["location"] = expected
    assert result == want


def test_format_tree_location_default_is_no_location() -> None:
    for kind in ("dict", "list", "attr"):
        obj = _make(kind)
        assert "location" not in obj._tracking_format_tree_location()


def test_uuid_tree_nested_mix_with_trailing_scalar() -> None:
    root = TrackedDict(tracking_auto_convert=True)
    root["a"] = [{"x": 1}, 5]
    root["b"] = {"y": [1]}
    root["c"] = 3
    a = root["a"]
    a0 = a[0]
    b = root["b"]
    y = b["y"]

    assert root._tracking_known_uuids_tree() == [
        f"TrackedDict:{root._tracking_uuid}",
        f"     |-> Location: ['a'] Item: TrackedList:{a._tracking_uuid}",
        f"     |   |-> Location: [0] Item: TrackedDict:{a0._tracking_uuid}",
        f"     |-> Location: ['b'] Item: TrackedDict:{b._tracking_uuid}",
        f"     |   |-> Location: ['y'] Item: TrackedList:{y._tracking_uuid}",
    ]


def test_uuid_tree_last_child_trackable() -> None:
    root = TrackedList(tracking_auto_convert=True)
    root.append({"k": 1})
    root.append([2])
    first, second = root
    assert root._tracking_known_uuids_tree() == [
        f"TrackedList:{root._tracking_uuid}",
        f"     |-> Location: [0] Item: TrackedDict:{first._tracking_uuid}",
        f"     |-> Location: [1] Item: TrackedList:{second._tracking_uuid}",
    ]


def test_uuid_tree_attr_with_unset_monitored_attribute() -> None:
    holder = Holder(monitor_child=False)
    holder.tracking_add_attribute_to_monitor("missing")
    holder.tracking_add_attribute_to_monitor("child")
    holder.child = {"q": 1}
    child = holder.child
    assert holder._tracking_known_uuids_tree() == [
        f"TrackedAttr:{holder._tracking_uuid}",
        f"     |-> Location: child Item: TrackedDict:{child._tracking_uuid}",
    ]


def test_uuid_tree_attr_with_attribute_name() -> None:
    holder = Holder()
    holder.child = {"q": [1]}
    child = holder.child
    q = child["q"]
    assert holder._tracking_known_uuids_tree(attribute_name="child") == [
        f"TrackedAttr:{holder._tracking_uuid}",
        f"     |-> Location: child Item: TrackedDict:{child._tracking_uuid}",
        f"         |-> Location: ['q'] Item: TrackedList:{q._tracking_uuid}",
    ]


def test_tracking_kind_values() -> None:
    class SubDict(TrackedDict):
        pass

    class SubList(TrackedList):
        pass

    class SubAttr(TrackedAttr):
        pass

    assert TrackBase._tracking_kind == ""
    assert TrackedDict._tracking_kind == "TrackedDict"
    assert TrackedList._tracking_kind == "TrackedList"
    assert TrackedAttr._tracking_kind == "TrackedAttr"
    assert SubDict._tracking_kind == "TrackedDict"
    assert SubList._tracking_kind == "TrackedList"
    assert SubAttr._tracking_kind == "TrackedAttr"


def test_duplicated_methods_live_only_on_trackbase() -> None:
    from pydatatracker.types import _trackbase

    for cls in (TrackedDict, TrackedList, TrackedAttr):
        assert "_tracking_notify_observers" not in cls.__dict__
        assert "_tracking_format_tree_location" not in cls.__dict__
        assert "_tracking_known_uuids_tree_helper" not in cls.__dict__
    assert "_tracking_known_uuids_tree" not in TrackedDict.__dict__
    assert "_tracking_known_uuids_tree" not in TrackedList.__dict__
    assert not hasattr(_trackbase, "_load_trackable_classes")
