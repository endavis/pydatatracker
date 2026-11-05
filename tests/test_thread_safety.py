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
from pydatatracker.types._trackbase import TrackBase, _lock_owned
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
                # Values are unique per thread: two threads assigning an equal
                # value back to back is correctly not recorded as a change.
                obj.v = {"t": tid, "i": i} if i % 2 == 0 else tid * ROUNDS + i

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


# --- linking a pre-built container merges tree locks (#67) --------------------


def _run_daemon_threads(
    targets: list[Callable[[], None]], timeout: float = 30
) -> list[BaseException]:
    """Run targets in daemon threads; a thread still alive after ``timeout`` is a deadlock."""
    errors: list[BaseException] = []

    def _wrap(target: Callable[[], None]) -> Callable[[], None]:
        def _runner() -> None:
            try:
                target()
            except BaseException as exc:
                errors.append(exc)

        return _runner

    threads = [threading.Thread(target=_wrap(t), daemon=True) for t in targets]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=timeout)
    stuck = [thread for thread in threads if thread.is_alive()]
    assert not stuck, f"{len(stuck)} thread(s) still running after {timeout}s: deadlock"
    return errors


def _nodes(root: TrackBase) -> list[TrackBase]:
    """Return ``root`` and every node under it."""
    found: dict[int, TrackBase] = {}
    stack = [root]
    while stack:
        node = stack.pop()
        if id(node) in found:
            continue
        found[id(node)] = node
        stack.extend(entry["item"] for entry in node._tracking_child_tracked_items.values())
    return list(found.values())


def test_rlock_has_is_owned() -> None:
    lock = threading.RLock()
    assert hasattr(lock, "_is_owned")
    assert lock._is_owned() is False
    with lock:
        assert lock._is_owned() is True


def test_linking_merges_both_trees_onto_one_lock() -> None:
    a = TrackedDict({"m": {"deep": {}}}, tracking_auto_convert=True)
    b = TrackedDict({"n": {"deep": {}}}, tracking_auto_convert=True)
    assert a._tracking_tree_lock is not b._tracking_tree_lock
    a["b"] = b
    nodes = _nodes(a)
    assert len(nodes) == 6
    assert all(node._tracking_tree_lock is a._tracking_tree_lock for node in nodes)


def test_unlinking_one_of_two_parents_keeps_the_lock() -> None:
    a, b, c = TrackedDict(), TrackedDict(), TrackedDict({"x": {}}, tracking_auto_convert=True)
    a["c"] = c
    b["c"] = c
    lock = a._tracking_tree_lock
    del a["c"]
    assert c._tracking_tree_lock is lock
    assert c["x"]._tracking_tree_lock is lock


def test_unlinking_last_parent_gives_fresh_lock_and_does_not_split_parents() -> None:
    a, b = TrackedDict(), TrackedDict()
    c = TrackedDict({"x": {}}, tracking_auto_convert=True)
    a["c"] = c
    b["k"] = a
    shared = a._tracking_tree_lock
    assert b._tracking_tree_lock is shared
    del a["c"]
    assert a._tracking_tree_lock is shared
    assert b._tracking_tree_lock is shared
    fresh = c._tracking_tree_lock
    assert fresh is not shared
    assert c["x"]._tracking_tree_lock is fresh


def test_unlinking_middle_node_keeps_lock_when_grandchild_is_still_held() -> None:
    root = TrackedDict()
    mid = TrackedDict()
    grand = TrackedDict({"v": 0})
    root["g"] = grand
    root["m"] = mid
    mid["g"] = grand
    lock = root._tracking_tree_lock
    del root["m"]
    assert mid._tracking_tree_lock is lock
    assert grand._tracking_tree_lock is lock


def _watch_owned(node: TrackBase, bad: list[str]) -> None:
    """Observe ``node`` and record any change delivered without the node's lock held."""

    def _observer(entry: ChangeLogEntry) -> None:
        if not _lock_owned(node._tracking_tree_lock):
            bad.append(str(entry.extra.get("location")))

    node.tracking_add_observer(_observer)


def test_shared_child_stress_is_exact_and_always_under_its_lock() -> None:
    a, b, c = TrackedDict(), TrackedDict(), TrackedDict()
    a["c"] = c
    b["c"] = c
    bad: list[str] = []
    for node in (a, b, c):
        _watch_owned(node, bad)
    before = {id(node): len(node.tracking_changes()) for node in (a, b, c)}
    rounds = 300

    def work(node: TrackedDict, prefix: str, tid: int) -> Callable[[], None]:
        def _run() -> None:
            for i in range(rounds):
                node[f"{prefix}{tid}"] = i
                node.pop(f"{prefix}{tid}")

        return _run

    targets = [
        work(node, name, tid) for tid in range(2) for node, name in ((a, "a"), (b, "b"), (c, "c"))
    ]
    assert _run_daemon_threads(targets, timeout=60) == []

    assert bad == []
    per_node = 2 * rounds * 2
    c_entries = c.tracking_changes()[before[id(c)] :]
    assert len(c_entries) == per_node
    for node in (a, b):
        entries = node.tracking_changes()[before[id(node)] :]
        forwarded = [e for e in entries if str(e.extra["location"]).startswith(("c:", "c|"))]
        assert len(forwarded) == per_node
        assert len(entries) == 2 * per_node


def test_cross_link_race_does_not_deadlock_and_merges_all() -> None:
    pairs = 200
    left = [TrackedDict({"m": {}}, tracking_auto_convert=True) for _ in range(pairs)]
    right = [TrackedDict({"n": {}}, tracking_auto_convert=True) for _ in range(pairs)]
    barrier = threading.Barrier(2, timeout=20)

    def one() -> None:
        for i in range(pairs):
            barrier.wait()
            left[i]["x"] = right[i]["n"]

    def two() -> None:
        for i in range(pairs):
            barrier.wait()
            right[i]["y"] = left[i]["m"]

    assert _run_daemon_threads([one, two], timeout=60) == []
    for a_i, b_i in zip(left, right, strict=True):
        locks = {id(node._tracking_tree_lock) for node in (a_i, b_i, a_i["m"], b_i["n"])}
        assert len(locks) == 1


def test_waiters_recheck_their_lock_after_a_merge() -> None:
    a = TrackedDict()
    b = TrackedDict()
    bad: list[str] = []
    _watch_owned(a, bad)
    _watch_owned(b, bad)
    entered = threading.Event()
    release = threading.Event()
    first = [True]

    def _block(entry: ChangeLogEntry) -> None:
        if first[0] and entry.extra.get("location") == "w":
            first[0] = False
            entered.set()
            assert release.wait(timeout=20)

    b.tracking_add_observer(_block)
    results: list[BaseException] = []

    def holder() -> None:
        b["w"] = 0

    def linker() -> None:
        a["c"] = b

    def writer() -> None:
        b["z"] = 1

    threads = [threading.Thread(target=t, daemon=True) for t in (holder,)]
    threads[0].start()
    assert entered.wait(timeout=20)
    for target in (linker, writer):
        thread = threading.Thread(target=target, daemon=True)
        thread.start()
        threads.append(thread)
    release.set()
    for thread in threads:
        thread.join(timeout=30)
    assert not any(thread.is_alive() for thread in threads)
    assert results == []
    assert bad == []
    assert a._tracking_tree_lock is b._tracking_tree_lock
    assert dict(b) == {"w": 0, "z": 1}
    assert _counts(b) == {("init", None): 1, ("add", "__setitem__"): 2}


def test_observer_storing_a_node_across_trees_raises_and_changes_nothing() -> None:
    a = TrackedDict()
    b = TrackedDict({"n": {}}, tracking_auto_convert=True)
    node = b["n"]

    def _cross(entry: ChangeLogEntry) -> None:
        if entry.extra.get("location") == "go" and entry.tracked_item_uuid == b._tracking_uuid:
            a["x"] = node

    b.tracking_add_observer(_cross)
    with pytest.raises(RuntimeError, match="both"):
        b["go"] = 1
    assert "x" not in a
    assert node._tracking_uuid not in a._tracking_child_tracked_items
    assert a._tracking_tree_lock is not b._tracking_tree_lock
