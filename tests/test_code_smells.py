"""Tests for small code-smell fixes (issue #72)."""

import logging

import pytest

import pydatatracker
from pydatatracker import ChangeLogEntry, TrackedAttr
from pydatatracker.types._trackbase import TrackBase


def test_change_log_entry_hash_matches_eq() -> None:
    first = ChangeLogEntry("a", type="update")
    other = ChangeLogEntry("a", type="update")
    other.uuid = first.uuid
    assert first == other
    assert hash(first) == hash(other)
    assert len({first, other}) == 1
    assert {first: 1}[other] == 1


def test_format_data_missing_and_unparseable() -> None:
    entry = ChangeLogEntry("a", type="update")
    assert entry.format_data("not_there", 5) == []
    entry.extra["note"] = "plain text"
    assert entry.format_data("note", 5) == [f"{'Note':<{entry.header_column_width}} : plain text"]


def test_tracking_debug_uses_module_logger(caplog: pytest.LogCaptureFixture) -> None:
    item = TrackedAttr()
    with caplog.at_level(logging.INFO, logger="pydatatracker.types._trackbase"):
        item._tracking_debug_flag = False
        item._tracking_debug("hidden")
        assert not caplog.records
        item._tracking_debug_flag = True
        item._tracking_debug("shown")
    assert len(caplog.records) == 1
    record = caplog.records[0]
    assert record.name == "pydatatracker.types._trackbase"
    assert record.getMessage().endswith(" - shown")


def test_trackbase_not_reexported() -> None:
    assert "TrackBase" not in pydatatracker.__all__
    assert not hasattr(pydatatracker, "TrackBase")
    assert TrackBase is not None
