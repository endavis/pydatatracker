"""Tests for ``copy()``, ``copy.copy``, ``copy.deepcopy`` and pickle (#66)."""

import copy
import pickle
from collections.abc import Callable
from typing import Any, ClassVar

import pytest

from pydatatracker import TrackedAttr, TrackedDict, TrackedList
from pydatatracker.types._trackbase import _TRACKING_RUNTIME_KEYS, TrackBase


def _pickle_round_trip(obj: Any) -> Any:  # noqa: ANN401
    return pickle.loads(pickle.dumps(obj))


ALL = [copy.copy, copy.deepcopy, _pickle_round_trip]
DEEP = [copy.deepcopy, _pickle_round_trip]
IDS = ["copy", "deepcopy", "pickle"]


class RequiredArgDict(TrackedDict):
    """Required ctor arg and a keyword-only extra; ``__init__`` must not be called."""

    def __init__(self, required: str, *, extra: int = 0, **kwargs: Any) -> None:  # noqa: ANN401
        super().__init__(**kwargs)
        self.required = required
        self.extra = extra


class RequiredArgAttr(TrackedAttr):
    """TrackedAttr with a required ctor arg."""

    def __init__(self, required: str) -> None:
        super().__init__()
        self.required = required
        self.a = 1
        self.tracking_add_attribute_to_monitor("a")


class FieldsAttr(TrackedAttr):
    """TrackedAttr declaring fields."""

    _tracking_fields: ClassVar[tuple[str, ...]] = ("a", "b")

    def __init__(self) -> None:
        super().__init__()
        self.a = 1
        self.b = 2


class PlainAttr(TrackedAttr):
    """TrackedAttr with one monitored attribute."""

    def __init__(self) -> None:
        super().__init__()
        self.a = 1
        self.b = 2
        self.tracking_add_attribute_to_monitor("a")


def _actions(obj: Any) -> list[str]:  # noqa: ANN401
    return [c.extra["action"] for c in obj.tracking_changes()]


# --- copy() is a read -------------------------------------------------------


def test_dict_copy_records_nothing_and_works_when_locked() -> None:
    d = TrackedDict({"a": {"x": [1]}}, tracking_auto_convert=True)
    d.lock()
    before = len(d.tracking_changes())
    plain = d.copy()
    shallow = d.copy(untracked=False)
    assert len(d.tracking_changes()) == before
    assert type(plain) is dict
    assert type(plain["a"]) is dict
    assert type(plain["a"]["x"]) is list
    assert type(shallow) is dict
    assert shallow["a"] is d["a"]


# --- round trips ------------------------------------------------------------


@pytest.mark.parametrize("duplicate", ALL, ids=IDS)
def test_dict_round_trip(duplicate: Callable[[Any], Any]) -> None:
    original = TrackedDict(
        {"a": 1},
        tracking_name="n",
        tracking_capture_snapshots=True,
        tracking_capture_stack=True,
        tracking_max_changes=5,
    )
    original["b"] = 2
    clone = duplicate(original)
    assert type(clone) is TrackedDict
    assert dict(clone) == {"a": 1, "b": 2}
    assert clone._tracking_uuid != original._tracking_uuid
    assert _actions(clone) == ["init"]
    assert clone._tracking_observers == {}
    assert clone._tracking_capture_snapshots is True
    assert clone._tracking_capture_stack is True
    assert clone._tracking_max_changes == 5
    assert getattr(clone._tracking_changes, "maxlen", None) == 5
    assert clone._tracking_name == "n"
    assert clone._tracking_delimiter == original._tracking_delimiter
    assert clone._tracking_tree_lock is not original._tracking_tree_lock


@pytest.mark.parametrize("duplicate", ALL, ids=IDS)
def test_list_round_trip(duplicate: Callable[[Any], Any]) -> None:
    original = TrackedList([1, 2], tracking_record_init=False)
    original.append(3)
    clone = duplicate(original)
    assert type(clone) is TrackedList
    assert list(clone) == [1, 2, 3]
    assert clone._tracking_uuid != original._tracking_uuid
    assert clone.tracking_changes() == []
    clone.append(4)
    assert list(original) == [1, 2, 3]
    assert _actions(clone) == ["add"]


@pytest.mark.parametrize("duplicate", ALL, ids=IDS)
def test_attr_round_trip(duplicate: Callable[[Any], Any]) -> None:
    original = PlainAttr()
    original.a = 5
    clone = duplicate(original)
    assert type(clone) is PlainAttr
    assert clone.a == 5
    assert clone._tracking_uuid != original._tracking_uuid
    assert _actions(clone) == ["init"]
    clone.a = 6
    assert _actions(clone)[-1] == "update"
    assert original.a == 5


@pytest.mark.parametrize("duplicate", ALL, ids=IDS)
def test_fields_class_round_trip(duplicate: Callable[[Any], Any]) -> None:
    original = FieldsAttr()
    clone = duplicate(original)
    assert clone.tracking_changes() == []
    clone.a = 9
    assert len(clone.tracking_changes()) == 1
    assert original.a == 1


def test_non_empty_dict_pickles() -> None:
    restored = _pickle_round_trip(TrackedDict({"a": 1, "b": [1]}))
    assert restored["a"] == 1


@pytest.mark.parametrize("duplicate", ALL, ids=IDS)
def test_subclass_with_required_ctor_arg(duplicate: Callable[[Any], Any]) -> None:
    d = RequiredArgDict("req", extra=3)
    d["k"] = 1
    clone = duplicate(d)
    assert type(clone) is RequiredArgDict
    assert clone.required == "req"
    assert clone.extra == 3
    assert clone["k"] == 1
    a = RequiredArgAttr("r2")
    clone_attr = duplicate(a)
    assert clone_attr.required == "r2"
    clone_attr.a = 2
    assert _actions(clone_attr)[-1] == "update"


# --- children ---------------------------------------------------------------


@pytest.mark.parametrize("duplicate", DEEP, ids=IDS[1:])
def test_children_are_copied_and_relinked(duplicate: Callable[[Any], Any]) -> None:
    original = TrackedDict({"c": {"x": 1}}, tracking_auto_convert=True)
    child = original["c"]
    clone = duplicate(original)
    new_child = clone["c"]
    assert new_child is not child
    assert new_child._tracking_uuid != child._tracking_uuid
    assert clone._tracking_child_tracked_items[new_child._tracking_uuid]["location"] == "c"
    assert new_child._tracking_tree_lock is clone._tracking_tree_lock
    before_original = len(original.tracking_changes())
    new_child["x"] = 2
    forwarded = clone.tracking_changes()[-1]
    assert forwarded.extra["location"] == "c:x"
    assert len(original.tracking_changes()) == before_original
    assert child["x"] == 1
    child["x"] = 3
    assert original.tracking_changes()[-1].extra["value"] == "3"
    assert clone.tracking_changes()[-1] is forwarded
    assert new_child["x"] == 2


@pytest.mark.parametrize("duplicate", ALL, ids=IDS)
def test_observers_are_not_copied(duplicate: Callable[[Any], Any]) -> None:
    calls: list[Any] = []

    class Holder:
        def method(self, entry: Any) -> None:  # noqa: ANN401
            calls.append(entry)

    holder = Holder()
    original = TrackedDict({"a": 1})
    original.tracking_add_observer(calls.append)
    original.tracking_add_observer(holder.method, weak=True)
    clone = duplicate(original)
    assert clone._tracking_observers == {}
    clone["a"] = 2
    assert calls == []
    original["a"] = 3
    assert len(calls) == 2
    assert _actions(clone) == ["init", "update"]


@pytest.mark.parametrize("duplicate", ALL, ids=IDS)
def test_locked_container_copy_stays_locked(duplicate: Callable[[Any], Any]) -> None:
    original = TrackedDict({"c": {"x": 1}}, tracking_auto_convert=True)
    original.lock()
    clone = duplicate(original)
    with pytest.raises(RuntimeError):
        clone["a"] = 1
    changes = clone.tracking_changes()
    assert [c.extra["action"] for c in changes] == ["init"]
    assert changes[0].extra["locked"] == "True"
    if duplicate is not copy.copy:
        assert clone["c"]._tracking_locked is True


@pytest.mark.parametrize("duplicate", ALL, ids=IDS)
def test_attr_locks_survive(duplicate: Callable[[Any], Any]) -> None:
    original = PlainAttr()
    original.tracking_add_attribute_to_monitor("b")
    original.lock("a")
    clone = duplicate(original)
    with pytest.raises(RuntimeError):
        clone.a = 5
    clone.b = 7
    assert clone.b == 7
    whole = PlainAttr()
    whole.lock()
    assert duplicate(whole)._tracking_locked is True


@pytest.mark.parametrize("duplicate", ALL, ids=IDS)
def test_pending_monitor_still_starts(duplicate: Callable[[Any], Any]) -> None:
    original = TrackedAttr()
    original.tracking_add_attribute_to_monitor("later")
    clone = duplicate(original)
    clone.later = 1
    assert "start monitoring" in str([c.extra for c in clone.tracking_changes()])


def test_shallow_copy_does_not_share_attr_bookkeeping() -> None:
    original = PlainAttr()
    clone = copy.copy(original)
    clone.tracking_add_attribute_to_monitor("b")
    assert "b" not in original._tracking_attributes_to_monitor


# --- shallow copy with children --------------------------------------------


def test_shallow_copy_shares_children_without_linking() -> None:
    original = TrackedDict({"c": {"x": 1}}, tracking_auto_convert=True)
    child = original["c"]
    clone = copy.copy(original)
    assert clone["c"] is child
    assert child._tracking_uuid not in clone._tracking_child_tracked_items
    before_clone = len(clone.tracking_changes())
    before_original = len(original.tracking_changes())
    child["x"] = 2
    assert len(original.tracking_changes()) == before_original + 1
    assert len(clone.tracking_changes()) == before_clone
    del clone["c"]
    assert child._tracking_tree_lock is original._tracking_tree_lock


def test_remove_of_a_non_child_keeps_its_tree_lock() -> None:
    d1 = TrackedDict({"c": {"x": 1}}, tracking_auto_convert=True)
    c = d1["c"]
    d2 = TrackedDict()
    d2["k"] = c
    del d2["k"]
    assert c._tracking_tree_lock is d1._tracking_tree_lock


# --- identity, cycles, caps -------------------------------------------------


def test_deepcopy_keeps_shared_references() -> None:
    inner = TrackedList([1])
    original = TrackedDict({"a": inner, "b": inner})
    clone = copy.deepcopy(original)
    assert clone["a"] is clone["b"]
    assert clone["a"] is not inner


def test_deepcopy_of_self_referencing_list() -> None:
    lst = TrackedList()
    lst.append(lst)
    clone = copy.deepcopy(lst)
    assert clone[0] is clone
    assert clone is not lst


@pytest.mark.parametrize("duplicate", ALL, ids=IDS)
def test_capped_history_is_fresh(duplicate: Callable[[Any], Any]) -> None:
    original = TrackedDict(tracking_max_changes=2)
    for i in range(10):
        original[str(i)] = i
    clone = duplicate(original)
    assert len(clone.tracking_changes()) <= 1
    assert getattr(clone._tracking_changes, "maxlen", None) == 2


@pytest.mark.parametrize("cls", [TrackedDict, TrackedList, PlainAttr])
def test_runtime_keys_are_reset_and_not_in_state(cls: type) -> None:
    obj = cls()
    for key in _TRACKING_RUNTIME_KEYS:
        assert key in obj.__dict__
    assert not _TRACKING_RUNTIME_KEYS & set(obj.__getstate__()["attributes"])


@pytest.mark.parametrize("duplicate", ALL, ids=IDS)
@pytest.mark.parametrize("cls", [TrackedDict, TrackedList, TrackedAttr])
def test_tracking_name_survives_copy(cls: type[TrackBase], duplicate: Callable[[Any], Any]) -> None:
    original = cls(tracking_name="named")
    assert duplicate(original).tracking_name == "named"
