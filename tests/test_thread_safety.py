"""Tests for the tree-wide ``RLock`` that serialises mutation of a tracked tree."""

import copy
import pickle
import sys
import threading
from collections import Counter
from collections.abc import Callable, Iterator
from typing import Any

import pytest

from pydatatracker import TrackedAttr, TrackedDict, TrackedList
from pydatatracker.utils.changelog import ChangeLogEntry

THREADS = 6
ROUNDS = 1500


@pytest.fixture(autouse=True)
def _fast_thread_switching() -> Iterator[None]:
    """Switch threads very often so unsynchronised code races reliably."""
    old = sys.getswitchinterval()
    sys.setswitchinterval(1e-6)
    try:
        yield
    finally:
        sys.setswitchinterval(old)


def _run_threads(targets: list[Callable[[], None]]) -> list[BaseException]:
    """Start every target behind a barrier and return the exceptions they raised."""
    barrier = threading.Barrier(len(targets))
    errors: list[BaseException] = []

    def _wrap(target: Callable[[], None]) -> Callable[[], None]:
        def _runner() -> None:
            try:
                barrier.wait(timeout=30)
                target()
            except BaseException as exc:
                errors.append(exc)

        return _runner

    threads = [threading.Thread(target=_wrap(t)) for t in targets]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=120)
        assert not thread.is_alive()
    return errors


def _counts(tracked: TrackedDict | TrackedList) -> Counter[tuple[object, object]]:
    return Counter(
        (entry.extra.get("action"), entry.extra.get("method"))
        for entry in tracked.tracking_changes()
    )


def _lock_free_elsewhere(lock: threading.RLock) -> bool:
    """Return True if another thread can acquire ``lock`` without blocking."""
    result: list[bool] = []

    def _try() -> None:
        got = lock.acquire(blocking=False)
        result.append(got)
        if got:
            lock.release()

    thread = threading.Thread(target=_try)
    thread.start()
    thread.join()
    return result[0]


class Holder(TrackedAttr):
    """TrackedAttr with monitored attributes ``a`` and ``child``."""

    def __init__(self) -> None:
        super().__init__(tracking_auto_convert=True)
        self.a = 1
        self.child: Any = {"x": {"y": 1}}
        self.tracking_add_attribute_to_monitor("a")
        self.tracking_add_attribute_to_monitor("child")


# --- stress -----------------------------------------------------------------


def test_dict_concurrent_mutation_records_every_change_exactly() -> None:
    d = TrackedDict()

    def work(tid: int) -> Callable[[], None]:
        def _run() -> None:
            for i in range(ROUNDS):
                d[f"t{tid}"] = i
                d.pop(f"t{tid}")

        return _run

    errors = _run_threads([work(t) for t in range(THREADS)])

    assert errors == []
    assert dict(d) == {}
    assert len(d.tracking_changes()) == 1 + THREADS * ROUNDS * 2
    assert _counts(d) == {
        ("init", None): 1,
        ("add", "__setitem__"): THREADS * ROUNDS,
        ("update", "pop"): THREADS * ROUNDS,
    }


def test_list_concurrent_mutation_records_every_change_exactly() -> None:
    lst = TrackedList()

    def work(tid: int) -> Callable[[], None]:
        def _run() -> None:
            for i in range(ROUNDS):
                value = tid * ROUNDS + i
                lst.append(value)
                lst.remove(value)

        return _run

    errors = _run_threads([work(t) for t in range(THREADS)])

    assert errors == []
    assert list(lst) == []
    counts = _counts(lst)
    assert counts[("init", None)] == 1
    assert counts[("add", "append")] == THREADS * ROUNDS
    assert counts[("remove", "remove")] == THREADS * ROUNDS
    assert sum(counts.values()) == 1 + THREADS * ROUNDS * 2


def test_attr_concurrent_assignment_records_every_change_exactly() -> None:
    class Shared(TrackedAttr):
        def __init__(self) -> None:
            super().__init__(tracking_auto_convert=True)
            self.v: Any = 0
            self.tracking_add_attribute_to_monitor("v")

    obj = Shared()
    before = len(obj.tracking_changes())

    def work(tid: int) -> Callable[[], None]:
        def _run() -> None:
            for i in range(ROUNDS):
                # Alternating a converted dict and a scalar links and unlinks a child.
                obj.v = {"t": tid, "i": i} if i % 2 == 0 else i

        return _run

    errors = _run_threads([work(t) for t in range(THREADS)])

    assert errors == []
    after = obj.tracking_changes()[before:]
    own = [e for e in after if e.extra.get("location") == "v"]
    assert len(own) == THREADS * ROUNDS
    assert {e.extra["action"] for e in own} == {"update"}
    # Only the last assigned value may still be linked.
    assert len(obj._tracking_child_tracked_items) <= 1


def test_parent_child_forwarding_is_exact_under_concurrency() -> None:
    root = TrackedDict(tracking_auto_convert=True)
    root["c"] = {}
    child = root["c"]
    assert isinstance(child, TrackedDict)
    root_before = len(root.tracking_changes())
    child_before = len(child.tracking_changes())
    per_group = THREADS // 2

    def child_work(tid: int) -> Callable[[], None]:
        def _run() -> None:
            for i in range(ROUNDS):
                child[f"k{tid}"] = i
                child.pop(f"k{tid}")

        return _run

    def root_work(tid: int) -> Callable[[], None]:
        def _run() -> None:
            for i in range(ROUNDS):
                root[f"r{tid}"] = i
                root.pop(f"r{tid}")

        return _run

    errors = _run_threads(
        [child_work(t) for t in range(per_group)] + [root_work(t) for t in range(per_group)]
    )

    assert errors == []
    child_changes = child.tracking_changes()[child_before:]
    assert len(child_changes) == per_group * ROUNDS * 2
    root_changes = root.tracking_changes()[root_before:]
    forwarded = [e for e in root_changes if e.extra["location"].startswith("c:")]
    own = [e for e in root_changes if not e.extra["location"].startswith("c:")]
    assert len(root_changes) == per_group * ROUNDS * 2 * 2
    assert len(own) == per_group * ROUNDS * 2
    assert Counter(e.extra["action"] for e in forwarded) == {
        "add": per_group * ROUNDS,
        "update": per_group * ROUNDS,
    }
    assert Counter(e.extra["action"] for e in own) == {
        "add": per_group * ROUNDS,
        "update": per_group * ROUNDS,
    }


# --- lock adoption ----------------------------------------------------------


def test_auto_converted_descendants_share_the_root_lock() -> None:
    root = TrackedDict({"a": {"b": {"c": 1}}, "l": [{"d": 1}]}, tracking_auto_convert=True)
    lock = root._tracking_tree_lock
    assert root["a"]._tracking_tree_lock is lock
    assert root["a"]["b"]._tracking_tree_lock is lock
    assert root["l"]._tracking_tree_lock is lock
    assert root["l"][0]._tracking_tree_lock is lock


def test_list_element_shares_the_list_lock() -> None:
    lst = TrackedList(tracking_auto_convert=True)
    lst.append({"k": 1})
    assert lst[0]._tracking_tree_lock is lst._tracking_tree_lock


def test_tracking_parent_child_adopts_lock_including_grandchild() -> None:
    root = TrackedDict(tracking_auto_convert=True)
    child = TrackedDict(
        {"g": {"h": 1}},
        tracking_auto_convert=True,
        tracking_parent=root,
        tracking_location="child",
    )
    assert child._tracking_tree_lock is root._tracking_tree_lock
    assert child["g"]._tracking_tree_lock is root._tracking_tree_lock


def test_attr_monitored_dict_shares_owner_lock() -> None:
    holder = Holder()
    assert holder.child._tracking_tree_lock is holder._tracking_tree_lock
    assert holder.child["x"]._tracking_tree_lock is holder._tracking_tree_lock


def test_separate_trees_have_separate_locks() -> None:
    assert TrackedDict()._tracking_tree_lock is not TrackedDict()._tracking_tree_lock


# --- fresh lock on unlink ---------------------------------------------------


def _assert_detached(root: TrackedDict | TrackedList, child: TrackedDict) -> None:
    assert child._tracking_tree_lock is not root._tracking_tree_lock
    assert child["g"]._tracking_tree_lock is child._tracking_tree_lock


def _dict_root() -> tuple[TrackedDict, Any]:
    root = TrackedDict({"k": {"g": {"h": 1}}, "other": {"x": 1}}, tracking_auto_convert=True)
    child = root["k"]
    assert child["g"]._tracking_tree_lock is root._tracking_tree_lock
    return root, child


def test_dict_pop_unlinks_with_fresh_lock() -> None:
    root, child = _dict_root()
    root.pop("k")
    _assert_detached(root, child)


def test_dict_del_unlinks_with_fresh_lock() -> None:
    root, child = _dict_root()
    del root["k"]
    _assert_detached(root, child)


def test_dict_overwrite_unlinks_with_fresh_lock() -> None:
    root, child = _dict_root()
    root["k"] = 5
    _assert_detached(root, child)


def test_dict_clear_unlinks_with_fresh_lock() -> None:
    root, child = _dict_root()
    root.clear()
    _assert_detached(root, child)


def test_dict_popitem_unlinks_with_fresh_lock() -> None:
    root = TrackedDict(tracking_auto_convert=True)
    root["k"] = {"g": {"h": 1}}
    child = root["k"]
    root.popitem()
    _assert_detached(root, child)


def _list_root() -> tuple[TrackedList, Any]:
    root = TrackedList([{"g": {"h": 1}}, 2], tracking_auto_convert=True)
    child = root[0]
    assert child["g"]._tracking_tree_lock is root._tracking_tree_lock
    return root, child


def test_list_pop_unlinks_with_fresh_lock() -> None:
    root, child = _list_root()
    root.pop(0)
    _assert_detached(root, child)


def test_list_remove_unlinks_with_fresh_lock() -> None:
    root, child = _list_root()
    root.remove(child)
    _assert_detached(root, child)


def test_list_slice_assignment_unlinks_with_fresh_lock() -> None:
    root, child = _list_root()
    root[0:1] = [7]
    _assert_detached(root, child)


def test_list_clear_unlinks_with_fresh_lock() -> None:
    root, child = _list_root()
    root.clear()
    _assert_detached(root, child)


def test_attr_reassignment_unlinks_with_fresh_lock() -> None:
    holder = Holder()
    child = holder.child
    holder.child = {"g": 1}
    assert child._tracking_tree_lock is not holder._tracking_tree_lock
    assert child["x"]._tracking_tree_lock is child._tracking_tree_lock


def test_attr_delete_unlinks_with_fresh_lock() -> None:
    holder = Holder()
    child = holder.child
    del holder.child
    assert child._tracking_tree_lock is not holder._tracking_tree_lock
    assert child["x"]._tracking_tree_lock is child._tracking_tree_lock


def test_child_still_held_under_another_key_keeps_the_root_lock() -> None:
    root = TrackedList(tracking_auto_convert=True)
    root.append({"g": 1})
    child = root[0]
    root.append(child)
    root.pop(0)
    assert child._tracking_tree_lock is root._tracking_tree_lock


def test_rolled_back_children_get_their_own_lock() -> None:
    created: list[Any] = []

    class Failing(TrackedDict):
        def _tracking_convert_item(self, value: object, location: object = "") -> object:
            if value == "boom":
                raise ValueError("boom")
            converted = super()._tracking_convert_item(value, location)
            created.append(converted)
            return converted

    root = Failing(tracking_auto_convert=True)
    with pytest.raises(ValueError, match="boom"):
        root.update({"a": {"x": {"y": 1}}, "b": "boom"})

    assert dict(root) == {}
    assert root._tracking_child_tracked_items == {}
    assert created
    assert created[0]._tracking_tree_lock is not root._tracking_tree_lock
    assert created[0]["x"]._tracking_tree_lock is created[0]._tracking_tree_lock


# --- lock release and observers ---------------------------------------------


def test_lock_released_after_locked_container_error() -> None:
    d = TrackedDict()
    d.lock()
    with pytest.raises(RuntimeError):
        d["a"] = 1
    assert _lock_free_elsewhere(d._tracking_tree_lock)


def test_lock_released_after_observer_error() -> None:
    d = TrackedDict()

    def boom(_entry: ChangeLogEntry) -> None:
        raise ValueError("boom")

    d.tracking_add_observer(boom)
    with pytest.raises(ValueError, match="boom"):
        d["a"] = 1
    assert _lock_free_elsewhere(d._tracking_tree_lock)


def test_lock_released_after_mutator_error() -> None:
    d = TrackedDict()
    with pytest.raises(TypeError):
        d[[]] = 1
    assert _lock_free_elsewhere(d._tracking_tree_lock)


def test_lock_released_after_attr_locked_error() -> None:
    holder = Holder()
    holder.lock("a")
    with pytest.raises(RuntimeError):
        holder.a = 2
    assert _lock_free_elsewhere(holder._tracking_tree_lock)


def test_observers_run_with_the_tree_lock_held() -> None:
    d = TrackedDict()
    held: list[bool] = []

    def observer(_entry: ChangeLogEntry) -> None:
        held.append(not _lock_free_elsewhere(d._tracking_tree_lock))

    d.tracking_add_observer(observer)
    d["a"] = 1
    assert held == [True]
    assert _lock_free_elsewhere(d._tracking_tree_lock)


# --- copy and pickle --------------------------------------------------------


class _PlainAttr(TrackedAttr):
    """Module-level so pickle can find it."""

    def __init__(self) -> None:
        super().__init__(tracking_auto_convert=False)
        self.a = 1
        self.tracking_add_attribute_to_monitor("a")


@pytest.mark.parametrize("duplicate", [copy.copy, copy.deepcopy])
def test_copy_of_flat_dict_gets_its_own_working_lock(duplicate: Callable[[Any], Any]) -> None:
    original = TrackedDict({"a": 1})
    clone = duplicate(original)
    assert clone._tracking_tree_lock is not original._tracking_tree_lock
    assert _lock_free_elsewhere(clone._tracking_tree_lock)
    clone["a"] = 9
    assert original["a"] == 1


@pytest.mark.parametrize("duplicate", [copy.copy, copy.deepcopy])
def test_copy_of_flat_list_gets_its_own_working_lock(duplicate: Callable[[Any], Any]) -> None:
    original = TrackedList([1, 2])
    clone = duplicate(original)
    assert clone._tracking_tree_lock is not original._tracking_tree_lock
    assert _lock_free_elsewhere(clone._tracking_tree_lock)
    clone[0] = 9
    assert original[0] == 1


@pytest.mark.parametrize("duplicate", [copy.copy, copy.deepcopy])
def test_copy_of_attr_gets_its_own_working_lock(duplicate: Callable[[Any], Any]) -> None:
    original = _PlainAttr()
    clone = duplicate(original)
    assert clone._tracking_tree_lock is not original._tracking_tree_lock
    clone.a = 5
    assert clone.a == 5
    assert original.a == 1


def test_attr_pickle_round_trip_restores_a_working_lock() -> None:
    restored = pickle.loads(pickle.dumps(_PlainAttr()))
    assert _lock_free_elsewhere(restored._tracking_tree_lock)
    restored.a = 2
    assert restored.a == 2
