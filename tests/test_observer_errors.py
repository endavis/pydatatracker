"""Tests for observer error isolation in ``TrackBase._tracking_notify_observers``."""

import asyncio
import gc
import queue
import warnings
from collections.abc import Callable
from typing import Any

import pytest

from pydatatracker import TrackedAttr, TrackedDict, TrackedList
from pydatatracker.observers import async_queue_observer
from pydatatracker.utils.changelog import ChangeLogEntry


def _raiser(exc: BaseException) -> Callable[[ChangeLogEntry], None]:
    def _observer(_entry: ChangeLogEntry) -> None:
        raise exc

    return _observer


def test_single_failure_reraises_same_exception_after_all_observers_run() -> None:
    seen: list[ChangeLogEntry] = []
    boom = ValueError("boom")
    d = TrackedDict()
    d.tracking_add_observer(_raiser(boom), priority=1)
    d.tracking_add_observer(seen.append, priority=2)

    with pytest.raises(ValueError, match="boom") as info:
        d["a"] = 1

    assert info.value is boom
    assert dict(d) == {"a": 1}
    assert len(seen) == 1
    assert d.tracking_changes()[-1] is seen[0]


def test_failure_note_names_entry_and_commit_state() -> None:
    d = TrackedDict()
    d.tracking_add_observer(_raiser(ValueError("boom")))

    with pytest.raises(ValueError) as info:
        d["a"] = 1

    entry = d.tracking_changes()[-1]
    notes = "\n".join(info.value.__notes__)
    assert entry.uuid in notes
    assert "action=" in notes
    assert str(entry.extra.get("action")) in notes
    assert "already committed" in notes


def test_multiple_failures_raise_group_in_priority_order() -> None:
    seen: list[ChangeLogEntry] = []
    first, second = ValueError("one"), KeyError("two")
    d = TrackedDict()
    d.tracking_add_observer(_raiser(second), priority=20)
    d.tracking_add_observer(_raiser(first), priority=10)
    d.tracking_add_observer(seen.append, priority=15)

    with pytest.raises(ExceptionGroup) as info:
        d["a"] = 1

    assert info.value.exceptions == (first, second)
    assert len(seen) == 1
    assert all("already committed" in "\n".join(e.__notes__) for e in info.value.exceptions)
    assert dict(d) == {"a": 1}


def test_no_failures_runs_in_priority_order() -> None:
    order: list[int] = []
    d = TrackedDict()
    d.tracking_add_observer(lambda _e: order.append(3), priority=3)
    d.tracking_add_observer(lambda _e: order.append(1), priority=1)
    d.tracking_add_observer(lambda _e: order.append(2), priority=2)

    d["a"] = 1

    assert order == [1, 2, 3]


def test_base_exception_propagates_at_once() -> None:
    seen: list[ChangeLogEntry] = []
    d = TrackedDict()
    d.tracking_add_observer(_raiser(KeyboardInterrupt()), priority=1)
    d.tracking_add_observer(seen.append, priority=2)

    with pytest.raises(KeyboardInterrupt):
        d["a"] = 1

    assert seen == []
    assert dict(d) == {"a": 1}


def test_forwarded_failure_in_child_still_reaches_parent_dict() -> None:
    parent = TrackedDict(tracking_auto_convert=True)
    parent["child"] = {"x": 0}
    child = parent["child"]
    assert isinstance(child, TrackedDict)
    before = len(parent.tracking_changes())
    child.tracking_add_observer(_raiser(ValueError("child")), priority=1)

    with pytest.raises(ValueError, match="child"):
        child["x"] = 1

    assert len(parent.tracking_changes()) == before + 1


def test_forwarded_failure_in_child_still_reaches_parent_list() -> None:
    parent = TrackedList(tracking_auto_convert=True)
    parent.append({"x": 0})
    child = parent[0]
    assert isinstance(child, TrackedDict)
    before = len(parent.tracking_changes())
    child.tracking_add_observer(_raiser(ValueError("child")), priority=1)

    with pytest.raises(ValueError, match="child"):
        child["x"] = 1

    assert len(parent.tracking_changes()) == before + 1


def test_forwarded_failure_in_child_still_reaches_parent_attr() -> None:
    class Holder(TrackedAttr):
        def __init__(self) -> None:
            super().__init__(tracking_auto_convert=True)
            self.profile: Any = {"x": 0}
            self.tracking_add_attribute_to_monitor("profile")

    parent = Holder()
    child = parent.profile
    assert isinstance(child, TrackedDict)
    before = len(parent.tracking_changes())
    child.tracking_add_observer(_raiser(ValueError("child")), priority=1)

    with pytest.raises(ValueError, match="child"):
        child["x"] = 1

    assert len(parent.tracking_changes()) == before + 1


def test_parent_failure_does_not_stop_later_child_observers() -> None:
    seen: list[ChangeLogEntry] = []
    parent = TrackedDict(tracking_auto_convert=True)
    parent["child"] = {"x": 0}
    child = parent["child"]
    parent.tracking_add_observer(_raiser(ValueError("parent")), priority=1)
    child.tracking_add_observer(seen.append, priority=99)

    with pytest.raises(ValueError, match="parent") as info:
        child["x"] = 1

    assert len(seen) == 1
    # The parent level and the child level each added a note.
    assert len(info.value.__notes__) == 2


def test_parent_group_and_child_failure_nest() -> None:
    parent = TrackedDict(tracking_auto_convert=True)
    parent["child"] = {"x": 0}
    child = parent["child"]
    parent.tracking_add_observer(_raiser(ValueError("p1")), priority=1)
    parent.tracking_add_observer(_raiser(KeyError("p2")), priority=2)
    child.tracking_add_observer(_raiser(RuntimeError("c")), priority=1)

    with pytest.raises(ExceptionGroup) as info:
        child["x"] = 1

    inner = [e for e in info.value.exceptions if isinstance(e, ExceptionGroup)]
    assert len(inner) == 1
    assert {type(e) for e in inner[0].exceptions} == {ValueError, KeyError}
    assert any(isinstance(e, RuntimeError) for e in info.value.exceptions)


def test_async_queue_observer_without_loop_raises_clear_error_without_warning() -> None:
    q: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
    d = TrackedDict()
    d.tracking_add_observer(async_queue_observer(q))

    with warnings.catch_warnings():
        warnings.simplefilter("error")
        with pytest.raises(RuntimeError, match="running event loop") as info:
            d["a"] = 1

        gc.collect()

    assert isinstance(info.value.__cause__, RuntimeError)
    assert dict(d) == {"a": 1}
    assert q.empty()


def test_async_queue_observer_with_running_loop_enqueues() -> None:
    async def scenario() -> dict[str, Any]:
        q: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        d = TrackedDict()
        d.tracking_add_observer(async_queue_observer(q))
        d["a"] = 1
        return await asyncio.wait_for(q.get(), timeout=1)

    item = asyncio.run(scenario())
    assert "action" in item["extra"]


def test_async_queue_observer_sync_queue_unchanged() -> None:
    q: queue.Queue[dict[str, Any]] = queue.Queue()
    d = TrackedDict()
    d.tracking_add_observer(async_queue_observer(q))
    d["a"] = 1
    assert q.qsize() == 1
