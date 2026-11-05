"""Tests that a mutating call acquires the tree lock exactly once."""

import threading
from typing import Any

import pytest

from pydatatracker import TrackedAttr, TrackedDict, TrackedList
from pydatatracker.types._trackbase import check_lock, track_changes
from pydatatracker.utils.changelog import ChangeLogEntry


class _CountingLock:
    """Wrap a real ``RLock`` and count ``acquire`` calls."""

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self.count = 0

    def acquire(self, *args: Any, **kwargs: Any) -> bool:  # noqa: ANN401
        self.count += 1
        return self._lock.acquire(*args, **kwargs)

    def release(self) -> None:
        self._lock.release()

    def _is_owned(self) -> bool:
        return bool(self._lock._is_owned())  # type: ignore[attr-defined]

    def __enter__(self) -> bool:
        return self.acquire()

    def __exit__(self, *exc: object) -> None:
        self.release()


def _install(node: Any, lock: _CountingLock) -> None:  # noqa: ANN401
    node._tracking_tree_lock = lock
    for child in node._tracking_child_tracked_items.values():
        _install(child["item"], lock)


def _counting(node: Any) -> _CountingLock:  # noqa: ANN401
    lock = _CountingLock()
    _install(node, lock)
    return lock


def test_setitem_new_key_acquires_once() -> None:
    d = TrackedDict()
    lock = _counting(d)
    d["a"] = 1
    assert lock.count == 1
    assert d.tracking_changes()[-1].extra["action"] == "add"


def test_setitem_existing_key_acquires_once() -> None:
    d = TrackedDict({"a": 1})
    lock = _counting(d)
    d["a"] = 2
    assert lock.count == 1


def test_pop_acquires_once() -> None:
    d = TrackedDict({"a": 1})
    lock = _counting(d)
    assert d.pop("a") == 1
    assert lock.count == 1


def test_append_acquires_once() -> None:
    items = TrackedList([1, 2])
    lock = _counting(items)
    items.append(3)
    assert lock.count == 1


@pytest.mark.parametrize("new_value", [2, "text"])
def test_tracked_attr_assignment_acquires_once(new_value: int | str) -> None:
    class Sample(TrackedAttr):
        def __init__(self) -> None:
            super().__init__(tracking_auto_convert=False)
            self.a = 1
            self.tracking_add_attribute_to_monitor("a")

    obj = Sample()
    lock = _counting(obj)
    obj.a = new_value  # type: ignore[assignment]
    assert lock.count == 1
    assert obj.tracking_changes()[-1].extra["action"] == "update"


def test_nested_setitem_acquires_once_and_parent_records() -> None:
    root = TrackedDict({"child": TrackedDict({"x": 0})})
    lock = _counting(root)
    root["child"]["x"] = 1
    assert lock.count == 1
    assert len(root.tracking_changes()) > 1
    assert any("child" in str(e.extra.get("location", "")) for e in root.tracking_changes())


def test_public_create_change_acquires_once_and_records() -> None:
    d = TrackedDict()
    lock = _counting(d)
    d.tracking_create_change(action="custom")
    assert lock.count == 1
    assert d.tracking_changes()[-1].extra["action"] == "custom"


def test_lock_unlock_acquire_and_record() -> None:
    d = TrackedDict()
    lock = _counting(d)
    d.lock()
    assert lock.count >= 1
    assert d.tracking_changes()[-1].extra["action"] == "lock"
    before = lock.count
    d.unlock()
    assert lock.count > before
    assert d.tracking_changes()[-1].extra["action"] == "unlock"
    assert lock._lock.acquire(blocking=False)
    lock._lock.release()


def test_setitem_on_locked_container_raises_after_one_acquire() -> None:
    d = TrackedDict()
    d.lock()
    lock = _counting(d)
    with pytest.raises(RuntimeError):
        d["a"] = 1
    assert lock.count == 1
    assert lock._lock.acquire(blocking=False)
    lock._lock.release()


def test_standalone_track_changes_runs_under_lock() -> None:
    class Sample(TrackedAttr):
        def __init__(self) -> None:
            super().__init__(tracking_auto_convert=False)
            self.a = 1
            self.tracking_add_attribute_to_monitor("a")

    obj = Sample()
    lock = _counting(obj)
    held: list[bool] = []

    def observer(_entry: ChangeLogEntry) -> None:
        held.append(lock._is_owned())

    obj.tracking_add_observer(observer)
    lock.count = 0
    obj.lock("a")
    assert held
    assert all(held)
    assert lock.count >= 1


class _Plain(TrackedDict):
    def __init__(self) -> None:
        super().__init__()
        self.calls: list[str] = []

    @check_lock
    def only_check(self) -> str:
        self.calls.append("only_check")
        return "ok"

    @check_lock
    @check_lock
    def doubled(self) -> str:
        return "ok"

    @check_lock
    @track_changes
    def tracked(self) -> str:
        self._tracking_context["action"] = "custom"
        return "ok"


def test_check_lock_without_track_changes_still_runs() -> None:
    p = _Plain()
    assert p.only_check() == "ok"
    assert p.calls == ["only_check"]


def test_stacked_check_lock_still_checks_locked() -> None:
    p = _Plain()
    assert p.doubled() == "ok"
    p._tracking_locked = True
    with pytest.raises(RuntimeError):
        p.doubled()


def test_check_lock_over_track_changes_records_once() -> None:
    p = _Plain()
    lock = _counting(p)
    assert p.tracked() == "ok"
    assert lock.count == 1
    assert p.tracking_changes()[-1].extra["action"] == "custom"
