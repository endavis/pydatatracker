"""Unit tests for PyDataTracker public APIs."""

from __future__ import annotations

import datetime
import logging
import types
from collections import deque
from pathlib import Path

import pytest

from pydatatracker import ChangeCollector, TrackedAttr, TrackedDict, TrackedList
from pydatatracker.observers import (
    FilteredObserver,
    async_queue_observer,
    json_file_observer,
    logging_observer,
)
from pydatatracker.utils import changelog
from pydatatracker.utils.changelog import ChangeLogEntry


def test_tracked_dict_logs_updates() -> None:
    """`TrackedDict` should record mutations as change log entries."""
    tracked = TrackedDict()

    tracked["status"] = "pending"
    tracked["status"] = "complete"

    last_entry = tracked.tracking_changes()[-1]

    assert last_entry.extra["action"] == "update"
    assert last_entry.extra["location"] == "status"
    assert "complete" in last_entry.extra["value"]


def test_tracked_dict_lock_prevents_mutation() -> None:
    """When locked, tracked containers should reject write operations."""
    tracked = TrackedDict({"status": "pending"})

    tracked.lock()

    with pytest.raises(RuntimeError):
        tracked["status"] = "complete"


def test_tracking_changes_can_be_limited() -> None:
    """`tracking_changes` returns only the requested number of entries."""
    tracked = TrackedDict()
    tracked["a"] = 1
    tracked["b"] = 2

    history = tracked.tracking_changes(most_recent=1)

    assert len(history) == 1
    assert history[0].extra["location"] == "b"


def test_capture_stack_is_opt_in() -> None:
    tracked = TrackedDict()
    tracked["foo"] = "bar"

    change = tracked.tracking_changes()[-1]
    assert change.stack == []
    assert change.actor == ""

    tracked_verbose = TrackedDict(tracking_capture_stack=True)
    tracked_verbose["foo"] = "bar"
    verbose_change = tracked_verbose.tracking_changes()[-1]
    assert verbose_change.stack, "stack should be populated when capture is enabled"


def test_tracking_changes_preserve_insertion_order() -> None:
    tracked = TrackedDict()
    tracked["first"] = 1
    tracked["second"] = 2

    last_two = tracked.tracking_changes()[-2:]
    assert [entry.extra["location"] for entry in last_two] == ["first", "second"]
    assert last_two[0].created_time <= last_two[1].created_time


def test_last_change_and_changes_since() -> None:
    tracked = TrackedDict()
    initial = tracked.last_change()
    assert initial is not None
    assert initial.extra["action"] == "init"

    tracked["alpha"] = 1
    first_entry = tracked.last_change()
    assert first_entry is not None
    assert first_entry.extra["location"] == "alpha"

    tracked["beta"] = 2
    all_changes = tracked.changes_since(first_entry)
    assert [entry.extra["location"] for entry in all_changes] == ["alpha", "beta"]

    cutoff = first_entry.created_time + datetime.timedelta(microseconds=1)
    recent_changes = tracked.changes_since(cutoff)
    assert [entry.extra["location"] for entry in recent_changes] == ["beta"]


def test_change_collector_observer_records_events() -> None:
    tracked = TrackedDict()
    collector = ChangeCollector()
    tracked.tracking_add_observer(collector)

    tracked["evt"] = 1
    tracked["evt"] = 2

    collected_locations = [entry.extra["location"] for entry in collector.as_list()]
    assert "evt" in collected_locations


def test_filtered_observer_filters_events() -> None:
    tracked = TrackedDict()
    collected: list[object] = []

    def observer(change: ChangeLogEntry) -> None:
        collected.append(change.extra.get("location"))

    filtered = FilteredObserver(observer, actions={"update"}, locations={"foo"})
    tracked.tracking_add_observer(filtered)

    tracked["foo"] = 1
    tracked["bar"] = 2
    tracked["foo"] = 3

    assert collected == ["foo"]


def test_change_log_entry_to_dict() -> None:
    tracked = TrackedDict()
    tracked["count"] = 1
    entry = tracked.last_change()
    assert entry is not None
    serialized = entry.to_dict()
    assert serialized["extra"]["location"] == "count"
    assert "actor" in serialized
    assert serialized["created_time"].endswith("Z") or serialized["created_time"].count(":") >= 2


def test_json_file_observer_writes_changes(tmp_path: Path) -> None:
    tracked = TrackedDict()
    file_path = tmp_path / "log.jsonl"

    observer = json_file_observer(file_path)
    tracked.tracking_add_observer(observer)
    tracked["foo"] = "bar"

    lines = file_path.read_text().strip().splitlines()
    assert len(lines) == 1
    assert "foo" in lines[0]


def test_logging_observer_uses_logger(caplog: pytest.LogCaptureFixture) -> None:
    tracked = TrackedDict()
    logger = logging.getLogger("pydatatracker.tests")
    observer = logging_observer(logger)
    tracked.tracking_add_observer(observer)

    with caplog.at_level(logging.INFO):
        tracked["foo"] = "bar"

    assert any("foo" in record.message for record in caplog.records)


def test_async_queue_observer_handles_coroutines() -> None:
    tracked = TrackedDict()

    class DummyQueue:
        def __init__(self) -> None:
            self.items: list[object] = []

        def put(self, value: object) -> None:
            self.items.append(value)

    queue = DummyQueue()
    observer = async_queue_observer(queue)
    tracked.tracking_add_observer(observer)

    tracked["foo"] = "bar"
    assert queue.items


def test_async_queue_observer_synchronous_queue() -> None:
    tracked = TrackedDict()

    class SyncQueue:
        def __init__(self) -> None:
            self.items: list[object] = []

        def put(self, value: object) -> None:
            self.items.append(value)

    queue = SyncQueue()
    observer = async_queue_observer(queue)
    tracked.tracking_add_observer(observer)
    tracked["foo"] = "bar"
    assert queue.items


def test_changes_since_is_ordered_when_the_clock_does_not_advance(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Entries created at the same clock reading still get distinct, ordered timestamps.

    Windows' clock resolution let `init` and the first assignment share a timestamp, so
    `changes_since(first_entry)` also returned `init`.
    """
    frozen = datetime.datetime(2026, 1, 1, tzinfo=datetime.UTC)

    class FrozenClock:
        @staticmethod
        def now(tz: datetime.tzinfo | None = None) -> datetime.datetime:
            return frozen.astimezone(tz)

    clock = types.SimpleNamespace(
        datetime=FrozenClock, UTC=datetime.UTC, timedelta=datetime.timedelta
    )
    monkeypatch.setattr(changelog, "datetime", clock)
    monkeypatch.setattr(changelog, "_last_timestamp", frozen - datetime.timedelta(seconds=1))

    tracked = TrackedDict()
    tracked["alpha"] = 1
    first_entry = tracked.last_change()
    assert first_entry is not None
    tracked["beta"] = 2

    times = [entry.created_time for entry in tracked.tracking_changes()]
    assert times == sorted(times)
    assert len(set(times)) == len(times)
    locations = [entry.extra["location"] for entry in tracked.changes_since(first_entry)]
    assert locations == ["alpha", "beta"]


# --- tracking_max_changes -------------------------------------------------


def test_max_changes_caps_history_newest_last() -> None:
    """10,000 appends with a cap of 100 leave the newest 100 in order."""
    items = TrackedList(tracking_max_changes=100)
    for i in range(10_000):
        items.append(i)

    changes = items.tracking_changes()
    assert len(changes) == 100
    assert isinstance(items._tracking_changes, deque)
    assert items.last_change() == changes[-1]
    assert [c.extra["value"] for c in changes] == [str(i) for i in range(9_900, 10_000)]


def test_max_changes_keeps_uuid_set_in_sync() -> None:
    """After eviction the dedup set holds exactly the retained uuids."""
    items = TrackedList(tracking_max_changes=10)
    for i in range(200):
        items.append(i)
    assert items._tracking_change_uuids == {c.uuid for c in items._tracking_changes}


def test_default_history_is_unbounded_list() -> None:
    """Without a cap the history is a list that keeps everything."""
    items = TrackedList()
    for i in range(5_000):
        items.append(i)
    assert isinstance(items._tracking_changes, list)
    assert len(items.tracking_changes()) == 5_001


def test_capped_tracking_changes_most_recent_returns_list() -> None:
    """``most_recent`` slicing returns lists on a capped history."""
    items = TrackedList(tracking_max_changes=5)
    for i in range(20):
        items.append(i)
    full = items.tracking_changes()

    assert items.tracking_changes(most_recent=2) == full[-2:]
    assert items.tracking_changes(most_recent=5) == full
    assert items.tracking_changes(most_recent=50) == full
    assert items.tracking_changes(most_recent=0) == []
    assert items.tracking_changes(most_recent=-1) == []
    assert items.tracking_changes(None) == full
    for result in (
        items.tracking_changes(most_recent=2),
        items.tracking_changes(most_recent=50),
        items.tracking_changes(most_recent=0),
        items.tracking_changes(None),
    ):
        assert type(result) is list


def test_capped_last_change_and_changes_since() -> None:
    """``last_change`` and ``changes_since`` work on a capped history."""
    items = TrackedList(tracking_max_changes=5)
    for i in range(20):
        items.append(i)
    full = items.tracking_changes()

    assert items.last_change() == full[-1]
    assert items.changes_since(None) == full
    since = items.changes_since(full[2])
    assert since == full[2:]
    assert type(since) is list


def test_capped_formatted_updates_shows_twenty() -> None:
    """Formatted updates on a capped history over 20 entries show 20."""
    items = TrackedList(tracking_max_changes=50)
    for i in range(60):
        items.append(i)
    lines = items.tracking_get_formatted_updates()
    assert lines.count("--------------------------------------") == 21


def test_max_changes_zero_keeps_no_history_but_notifies() -> None:
    """A cap of 0 stores nothing while observers still fire."""
    items = TrackedList(tracking_max_changes=0)
    seen: list[ChangeLogEntry] = []
    items.tracking_add_observer(seen.append)
    for i in range(3):
        items.append(i)

    assert items.tracking_changes() == []
    assert items.last_change() is None
    assert len(seen) == 3


def test_max_changes_one_keeps_only_newest_without_duplicate() -> None:
    """A cap of 1 keeps exactly the newest entry, once."""
    items = TrackedList(tracking_max_changes=1)
    for i in range(5):
        items.append(i)
    changes = items.tracking_changes()
    assert len(changes) == 1
    assert items._tracking_change_uuids == {changes[0].uuid}


@pytest.mark.parametrize("cls", [TrackedDict, TrackedList, TrackedAttr])
def test_negative_max_changes_raises(cls: type) -> None:
    """A negative cap is rejected for every container type."""
    with pytest.raises(ValueError, match="tracking_max_changes"):
        cls(tracking_max_changes=-1)
