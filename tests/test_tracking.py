"""Unit tests for PyDataTracker public APIs."""

from __future__ import annotations

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
