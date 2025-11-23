"""Tests for `TrackedDict` steady-state behavior."""

from __future__ import annotations

from pydatatracker import TrackedDict


def _latest_change(tracked: TrackedDict):
    return tracked._tracking_changes[-1]


def test_tracked_dict_pop_logs_removed_items() -> None:
    """Popping keys should record removal metadata."""
    tracked = TrackedDict({"status": "pending"})

    result = tracked.pop("status")

    change = _latest_change(tracked)
    assert result == "pending"
    assert change.extra["action"] == "update"
    assert change.extra["location"] == "status"
    assert "pending" in change.extra["removed_items"]


def test_tracked_dict_child_updates_do_not_touch_parent_log() -> None:
    """Changing a nested trackable currently leaves the parent log untouched."""
    parent = TrackedDict(tracking_auto_convert=True)
    parent["child"] = {"state": "draft"}

    child = parent["child"]
    child["state"] = "final"

    change = _latest_change(parent)
    assert change.extra["location"] == "child"
    assert "state" in change.extra["value"]
    assert "draft" in change.extra["value"]
    assert len(parent._tracking_changes) == 2  # no additional entry added


def test_tracked_dict_child_tracks_its_own_updates() -> None:
    """Child tracked dicts still emit their own change log entries."""
    parent = TrackedDict(tracking_auto_convert=True)
    parent["child"] = {"state": "draft"}
    child = parent["child"]

    child["state"] = "final"

    change = _latest_change(child)
    assert change.extra["action"] == "update"
    assert change.extra["location"] == "state"
    assert change.extra["value"] == "final"
