"""Regression tests: ChangeLogEntry.copy() must not recapture the stack (#26)."""

import re
from unittest.mock import patch

import pytest

from pydatatracker import TrackedDict
from pydatatracker.utils.changelog import ChangeLogEntry, _new_id


def test_copy_does_not_capture_stack() -> None:
    original = ChangeLogEntry("item", type="update")
    with (
        patch.object(ChangeLogEntry, "get_stack") as get_stack,
        patch.object(ChangeLogEntry, "find_relevant_actor") as find_actor,
    ):
        original.copy("other", "uuid2")
    assert get_stack.call_count == 0
    assert find_actor.call_count == 0


def test_copy_preserves_stack_actor_and_tree() -> None:
    original = ChangeLogEntry("item", type="update", capture_stack=True)
    original.tree = ["x"]
    assert original.stack
    clone = original.copy("other", "uuid2")
    assert clone.stack == original.stack
    assert clone.actor == original.actor
    assert clone.tree == original.tree
    assert clone.created_time == original.created_time
    assert clone.tracked_item_uuid == "uuid2"
    assert clone.extra["type"] == "other"


def test_copy_preserves_explicit_actor_without_stack() -> None:
    original = ChangeLogEntry("item", type="update", actor="me")
    clone = original.copy("other", "uuid2")
    assert clone.actor == "me"
    assert clone.stack == []


def test_forwarded_child_change_skips_stack_capture() -> None:
    parent = TrackedDict({"child": {}}, tracking_capture_stack=True, tracking_auto_convert=True)
    child = parent["child"]
    assert isinstance(child, TrackedDict)
    seen: list[ChangeLogEntry] = []
    parent.tracking_add_observer(seen.append)
    with patch.object(ChangeLogEntry, "get_stack", return_value=[]) as get_stack:
        child["k"] = 1
    assert [e.tracked_item_uuid for e in seen] == [parent._tracking_uuid]
    # Only the child's own entry captures; forwarded copies must not.
    assert get_stack.call_count == 1


_ID_RE = re.compile(r"^[0-9a-f]{32}$")


def test_ids_are_32_lowercase_hex() -> None:
    assert _ID_RE.match(ChangeLogEntry("item", type="update").uuid)
    assert _ID_RE.match(TrackedDict()._tracking_uuid)


def test_ids_are_zero_padded(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("pydatatracker.utils.changelog.getrandbits", lambda _bits: 5)
    expected = "0" * 31 + "5"
    assert ChangeLogEntry("item", type="update").uuid == expected
    assert TrackedDict()._tracking_uuid == expected


def test_ids_are_unique() -> None:
    ids = {_new_id() for _ in range(10_000)}
    assert len(ids) == 10_000
