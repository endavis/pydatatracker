"""Unit tests for PyDataTracker public APIs."""

from __future__ import annotations

import time

import pytest

from pydatatracker import TrackedDict


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


def _measure_assignment_time(snapshot: bool, iterations: int = 2000) -> float:
    tracked = TrackedDict(tracking_capture_snapshots=snapshot)
    start = time.perf_counter()
    for index in range(iterations):
        tracked[str(index)] = index
    end = time.perf_counter()
    return end - start


def test_snapshot_mode_relative_timing() -> None:
    """Report timing difference between snapshot modes for manual inspection."""
    baseline = _measure_assignment_time(snapshot=False)
    snapshot = _measure_assignment_time(snapshot=True)
    percent = ((snapshot - baseline) / baseline * 100) if baseline else float("inf")

    print(
        f"tracking_capture_snapshots timing: off={baseline:.6f}s "
        f"on={snapshot:.6f}s ({snapshot - baseline:.6f}s delta, "
        f"{percent:.2f}% slower)"
    )

    assert snapshot >= baseline
