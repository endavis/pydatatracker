"""Tests for linking already-tracked values stored into a tracked container (#67)."""

import copy
import pickle
from collections.abc import Callable
from typing import Any

import pytest

from pydatatracker import TrackedAttr, TrackedDict, TrackedList
from pydatatracker.types._trackbase import TrackBase


class Holder(TrackedAttr):
    """TrackedAttr with two monitored attributes, auto-convert off."""

    def __init__(self, auto: bool = False) -> None:
        super().__init__(tracking_auto_convert=auto)
        self.one: Any = 0
        self.two: Any = 0
        self.tracking_add_attribute_to_monitor("one")
        self.tracking_add_attribute_to_monitor("two")


class Declared(TrackedAttr):
    """TrackedAttr with a declared field."""

    _tracking_fields = ("data",)
    data: Any

    def __init__(self, data: object) -> None:
        self.data = data
        super().__init__()


def _last_location(tracked: TrackBase) -> str:
    return str(tracked.tracking_changes()[-1].extra["location"])


def _is_child(parent: TrackBase, child: TrackBase) -> bool:
    return child._tracking_uuid in parent._tracking_child_tracked_items


# ---- 1. linking and forwarding ---------------------------------------------


@pytest.mark.parametrize("auto", [True, False])
def test_dict_paths_link_and_forward(auto: bool) -> None:
    parent = TrackedDict(tracking_auto_convert=auto)
    c1, c2, c3, c4 = (TrackedDict({"x": 0}) for _ in range(4))
    parent["a"] = c1
    parent.update({"b": c2})
    parent |= {"c": c3}
    assert parent.setdefault("d", c4) is c4
    for key, child in zip("abcd", (c1, c2, c3, c4), strict=True):
        assert _is_child(parent, child)
        child["x"] = 1
        assert _last_location(parent) == f"{key}:x"


@pytest.mark.parametrize("auto", [True, False])
def test_list_paths_link_and_forward(auto: bool) -> None:
    parent = TrackedList(tracking_auto_convert=auto)
    kids = [TrackedDict({"x": 0}) for _ in range(6)]
    parent.append(kids[0])
    parent.insert(0, kids[1])
    parent.extend([kids[2]])
    parent += [kids[3]]
    parent[0] = kids[4]
    parent[1:2] = [kids[5]]
    held = [kid for kid in kids if any(item is kid for item in parent)]
    assert len(held) == len(parent)
    for child in held:
        assert _is_child(parent, child)
        child["x"] = 1
        assert _last_location(parent) == f"{next(i for i, v in enumerate(parent) if v is child)}:x"


def test_constructors_link() -> None:
    child = TrackedList([1])
    d = TrackedDict({"k": child})
    lst = TrackedList([child])
    assert _is_child(d, child)
    assert _is_child(lst, child)
    child.append(2)
    assert _last_location(d) == "k|1"
    assert _last_location(lst) == "0|1"


@pytest.mark.parametrize("auto", [True, False])
def test_attr_dynamic_declared_and_late_monitor(auto: bool) -> None:
    holder = Holder(auto)
    child = TrackedDict({"s": 1})
    holder.one = child
    assert _is_child(holder, child)
    child["s"] = 2
    assert _last_location(holder) == "one:s"

    declared = Declared(TrackedDict({"s": 1}))
    assert _is_child(declared, declared.data)
    declared.data["s"] = 2
    assert _last_location(declared) == "data:s"

    holder2 = Holder(auto)
    object.__setattr__(holder2, "late", TrackedList([1]))
    holder2.tracking_add_attribute_to_monitor("late")
    assert _is_child(holder2, holder2.late)  # type: ignore[attr-defined]


def test_unlink_on_removal_gives_fresh_lock() -> None:
    parent = TrackedDict()
    child = TrackedDict({"x": 0})
    parent["a"] = child
    assert child._tracking_tree_lock is parent._tracking_tree_lock
    del parent["a"]
    assert not _is_child(parent, child)
    assert child._tracking_tree_lock is not parent._tracking_tree_lock
    before = len(parent.tracking_changes())
    child["x"] = 1
    assert len(parent.tracking_changes()) == before


def test_duplicate_child_relocated_not_unlinked() -> None:
    parent = TrackedDict()
    child = TrackedDict({"x": 0})
    parent["a"] = child
    parent["b"] = child
    del parent["a"]
    assert _is_child(parent, child)
    child["x"] = 1
    assert _last_location(parent) == "b:x"


# ---- 2. multiple parents ---------------------------------------------------


def test_two_parents_both_forward_and_removal_keeps_other() -> None:
    a, b, c = TrackedDict(), TrackedDict(), TrackedDict({"x": 0})
    a["c"] = c
    b["k"] = c
    c["x"] = 1
    assert _last_location(a) == "c:x"
    assert _last_location(b) == "k:x"
    del a["c"]
    assert c._tracking_tree_lock is b._tracking_tree_lock
    before = len(a.tracking_changes())
    c["x"] = 2
    assert _last_location(b) == "k:x"
    assert len(a.tracking_changes()) == before


def test_diamond_in_one_tree_records_both_paths() -> None:
    p = TrackedDict({"old": {"v": 0}}, tracking_auto_convert=True)
    old = p["old"]
    p["n"] = {"k": old}
    before = len(p.tracking_changes())
    old["v"] = 1
    locations = sorted(e.extra["location"] for e in p.tracking_changes()[before:])
    assert locations == ["n:k:v", "old:v"]


# ---- 3. lock state ----------------------------------------------------------


def test_storing_into_locked_parent_rejected() -> None:
    parent = TrackedDict()
    parent.lock()
    with pytest.raises(RuntimeError):
        parent["a"] = TrackedDict()


def test_any_parent_lock_rule() -> None:
    a, b, c = TrackedDict(), TrackedDict(), TrackedDict({"x": 0})
    a["c"] = c
    b["c"] = c
    a.lock()
    assert c._tracking_locked
    b.unlock()
    assert c._tracking_locked
    a.unlock()
    assert not c._tracking_locked


def test_child_locked_via_one_parent_stays_locked_in_another() -> None:
    a, b, c = TrackedDict(), TrackedDict(), TrackedDict({"x": 0})
    a["c"] = c
    a.lock()
    b["c"] = c
    assert c._tracking_locked


def test_standalone_locked_child_unlocked_by_unlocked_parent() -> None:
    child = TrackedDict({"x": 0})
    child.lock()
    parent = TrackedDict()
    parent["c"] = child
    assert not child._tracking_locked
    child["x"] = 1


def test_attr_unlock_keeps_child_locked_by_other_parent() -> None:
    holder = Holder()
    other = TrackedDict()
    child = TrackedDict({"x": 0})
    holder.one = child
    other["c"] = child
    holder.lock("one")
    assert child._tracking_locked
    other.lock()
    holder.unlock("one")
    assert child._tracking_locked
    other.unlock()
    assert not child._tracking_locked


class _Reject(TrackedList):
    def _tracking_convert_item(self, value: object, location: object = "") -> object:
        if isinstance(value, bytes):
            raise TypeError("no bytes")
        return super()._tracking_convert_item(value, location)


def test_rollback_restores_prebuilt_child_lock_state() -> None:
    lst = _Reject()
    child = TrackedDict({"x": 0})
    child.lock()
    with pytest.raises(TypeError):
        lst.extend([child, b"bad"])
    assert not _is_child(lst, child)
    assert child._tracking_locked
    assert len(lst) == 0


# ---- 5. cycles ---------------------------------------------------------------


def test_self_store_and_cycle_are_stored_not_linked() -> None:
    d = TrackedDict()
    d["self"] = d
    assert d["self"] is d
    assert not _is_child(d, d)

    a, b = TrackedDict(), TrackedDict()
    a["b"] = b
    b["a"] = a
    assert _is_child(a, b)
    assert not _is_child(b, a)
    b["z"] = 1
    a.lock()
    a.unlock()
    assert a._tracking_tree_lock is b._tracking_tree_lock


def test_list_cycle_through_nested_child() -> None:
    outer = TrackedList()
    inner = TrackedList()
    outer.append(inner)
    inner.append(outer)
    assert not _is_child(inner, outer)
    outer.lock()
    outer.unlock()
    inner.append(1)


# ---- 6. copy and pickle -------------------------------------------------------


Duplicator = Callable[[TrackedDict], TrackedDict]


def _deepcopy(obj: TrackedDict) -> TrackedDict:
    return copy.deepcopy(obj)


def _pickle_round_trip(obj: TrackedDict) -> TrackedDict:
    # Round-trips an object this test just built; no untrusted data is loaded.
    restored: TrackedDict = pickle.loads(pickle.dumps(obj))
    return restored


DUPLICATORS = [
    pytest.param(_deepcopy, id="deepcopy"),
    pytest.param(_pickle_round_trip, id="pickle"),
]


@pytest.mark.parametrize("duplicate", DUPLICATORS)
def test_duplicate_tree_with_prebuilt_child_relinks_a_copied_child(duplicate: Duplicator) -> None:
    parent = TrackedDict()
    child = TrackedDict({"x": 0})
    parent["c"] = child

    clone = duplicate(parent)

    clone_child = clone["c"]
    assert clone_child is not child
    assert _is_child(clone, clone_child)
    assert set(clone_child._tracking_parents) == {clone._tracking_uuid}
    assert clone_child._tracking_tree_lock is clone._tracking_tree_lock
    assert clone._tracking_tree_lock is not parent._tracking_tree_lock
    before = len(parent.tracking_changes())
    clone_child["x"] = 1
    assert clone.tracking_changes()[-1].extra["location"] == "c:x"
    assert len(parent.tracking_changes()) == before
    assert child["x"] == 0


@pytest.mark.parametrize("duplicate", DUPLICATORS)
def test_duplicate_child_with_two_parents_has_no_parents(duplicate: Duplicator) -> None:
    a = TrackedDict()
    b = TrackedDict()
    child = TrackedDict({"x": 0})
    a["c"] = child
    b["k"] = child

    clone = duplicate(child)

    assert clone._tracking_parents == {}
    assert clone._tracking_tree_lock is not a._tracking_tree_lock
    a_before, b_before = len(a.tracking_changes()), len(b.tracking_changes())
    clone["x"] = 1
    assert (len(a.tracking_changes()), len(b.tracking_changes())) == (a_before, b_before)


def test_deepcopy_keeps_a_shared_child_shared_between_copied_parents() -> None:
    root = TrackedDict()
    a = TrackedDict()
    b = TrackedDict()
    child = TrackedDict({"x": 0})
    root["a"] = a
    root["b"] = b
    a["c"] = child
    b["c"] = child

    clone = copy.deepcopy(root)

    assert clone["a"]["c"] is clone["b"]["c"]
    shared = clone["a"]["c"]
    assert set(shared._tracking_parents) == {clone["a"]._tracking_uuid, clone["b"]._tracking_uuid}
    assert shared._tracking_tree_lock is clone._tracking_tree_lock
    shared["x"] = 1
    locations = [e.extra["location"] for e in clone.tracking_changes()[-2:]]
    assert sorted(locations) == ["a:c:x", "b:c:x"]


def test_shallow_copy_of_child_and_parent_with_links() -> None:
    parent = TrackedDict()
    child = TrackedDict({"x": 0})
    parent["c"] = child
    assert child._tracking_parents
    for original in (child, parent):
        restored = copy.copy(original)
        assert restored._tracking_parents == {}
        restored["y"] = 1
        assert restored["y"] == 1


def test_deepcopy_after_unlink_has_no_parents() -> None:
    parent = TrackedDict()
    child = TrackedDict({"x": 0})
    parent["c"] = child
    del parent["c"]
    restored = copy.deepcopy(child)
    assert restored._tracking_parents == {}
    restored["x"] = 5
    assert restored["x"] == 5
