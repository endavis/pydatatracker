"""Tests for `TrackedDict` steady-state behavior."""

from __future__ import annotations

from collections import deque

from pydatatracker import TrackedDict, TrackedList
from pydatatracker.utils.changelog import ChangeLogEntry


def _latest_change(tracked: TrackedDict) -> ChangeLogEntry:
    return tracked.tracking_changes()[-1]


def test_tracked_dict_pop_logs_removed_items() -> None:
    """Popping keys should record removal metadata."""
    tracked = TrackedDict({"status": "pending"})

    result = tracked.pop("status")

    change = _latest_change(tracked)
    assert result == "pending"
    assert change.extra["action"] == "update"
    assert change.extra["location"] == "status"
    assert "pending" in change.extra["removed_items"]


def test_tracked_dict_setitem_child_updates_forward_to_parent() -> None:
    """A child assigned via __setitem__ into an empty parent forwards its changes."""
    parent = TrackedDict(tracking_auto_convert=True)
    parent["child"] = {"state": "draft"}
    before = len(parent.tracking_changes())

    parent["child"]["state"] = "final"

    change = _latest_change(parent)
    assert change.extra["location"] == "child:state"
    assert change.extra["value"] == "final"
    assert len(parent.tracking_changes()) == before + 1


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


def test_tracked_dict_setdefault_records_default_and_return() -> None:
    """`setdefault` tracks the provided default and the return value."""
    tracked = TrackedDict({"a": 1})

    returned = tracked.setdefault("b", 2)

    change = _latest_change(tracked)
    assert returned == 2
    assert change.extra["action"] == "update"
    assert change.extra["location"] == "b"
    assert change.extra["default"] == "2"
    assert change.extra["return_value"] == "2"


def test_tracked_dict_update_logs_replacements() -> None:
    """`update` notes removed values when keys are overwritten."""
    tracked = TrackedDict({"a": 1})

    tracked.update({"a": 3, "b": 2})

    change = _latest_change(tracked)
    assert change.extra["action"] == "update"
    assert "1" in change.extra["removed_items"]
    assert "{'a': 3" in change.extra["value"]
    assert "'b': 2" in change.extra["value"]


def test_tracked_dict_clear_records_removed_items() -> None:
    """`clear` stores all removed values."""
    tracked = TrackedDict({"a": 1, "b": 2})

    tracked.clear()

    change = _latest_change(tracked)
    assert change.extra["action"] == "remove"
    assert "[1, 2]" in change.extra["removed_items"]


def test_tracked_dict_copy_untracked_returns_plain_dict() -> None:
    """`copy(untracked=True)` returns regular dictionaries."""
    tracked = TrackedDict({"a": {"nested": 1}}, tracking_auto_convert=True)

    clone = tracked.copy(untracked=True)

    change = _latest_change(tracked)
    assert isinstance(clone, dict)
    assert isinstance(clone["a"], dict)
    assert change.extra["action"] == "copy"
    assert change.extra["untracked"] == "True"


def test_tracked_dict_snapshot_opt_in_records_repr() -> None:
    """`tracking_capture_snapshots` controls repr logging."""
    tracked = TrackedDict(tracking_capture_snapshots=True)

    tracked["a"] = 1
    change = tracked.tracking_changes()[-1]
    assert "data_pre_change" in change.extra
    assert change.extra["data_post_change"].endswith("1}")

    tracked2 = TrackedDict()
    tracked2["a"] = 1
    change2 = tracked2.tracking_changes()[-1]
    assert "data_pre_change" not in change2.extra


def test_forwarded_child_change_is_recorded_once_on_parent() -> None:
    """A change forwarded from a nested child appears exactly once in the parent log."""
    parent = TrackedDict({"child": {"state": "draft"}}, tracking_auto_convert=True)
    before = len(parent.tracking_changes())

    parent["child"]["state"] = "final"

    changes = parent.tracking_changes()
    assert len(changes) == before + 1
    assert changes[-1].extra["location"] == "child:state"
    uuids = [entry.uuid for entry in changes]
    assert len(uuids) == len(set(uuids))
    assert parent._tracking_change_uuids == set(uuids)


def test_same_entry_is_recorded_once() -> None:
    """Passing the same entry to the parent twice records it only once."""
    tracked = TrackedDict({"a": 1})
    tracked["a"] = 2
    entry = tracked.tracking_changes()[-1]
    count = len(tracked.tracking_changes())

    assert tracked._tracking_record_change(entry) is False
    tracked._tracking_notify_observers(entry)

    assert len(tracked.tracking_changes()) == count
    new_entry = ChangeLogEntry(tracked._tracking_uuid, action="x")
    assert tracked._tracking_record_change(new_entry) is True
    assert tracked.tracking_changes()[-1] is new_entry


def test_tracked_dict_record_init_false_has_no_entries() -> None:
    assert TrackedDict(tracking_record_init=False).tracking_changes() == []


def test_tracked_dict_default_records_init() -> None:
    changes = TrackedDict().tracking_changes()
    assert [c.extra["action"] for c in changes] == ["init"]


def _forwarded(parent: TrackedDict, child: TrackedDict, value: str) -> int:
    before = len(parent.tracking_changes())
    child["state"] = value
    return len(parent.tracking_changes()) - before


def test_tracked_dict_update_and_setdefault_link_child_in_empty_parent() -> None:
    """update and setdefault on an empty parent link the new child."""
    via_update = TrackedDict(tracking_auto_convert=True)
    via_update.update({"c": {"state": "a"}})
    assert _forwarded(via_update, via_update["c"], "b") == 1

    via_default = TrackedDict(tracking_auto_convert=True)
    via_default.setdefault("c", {"state": "a"})
    assert _forwarded(via_default, via_default["c"], "b") == 1


def test_tracked_dict_child_inherits_parent_settings_when_parent_empty() -> None:
    """Children linked into an empty parent inherit its tracking settings."""
    parent = TrackedDict(
        tracking_auto_convert=True,
        tracking_capture_snapshots=True,
        tracking_record_init=False,
    )
    parent["c"] = {"state": "a"}
    child = parent["c"]
    assert child._tracking_capture_snapshots is True
    assert child._tracking_record_init is False


def test_tracked_dict_child_inherits_max_changes() -> None:
    """A nested child inherits the parent's cap unless it passes its own."""
    parent = TrackedDict(tracking_auto_convert=True, tracking_max_changes=5)
    parent["c"] = {"state": "a"}
    child = parent["c"]
    assert child._tracking_max_changes == 5
    assert isinstance(child._tracking_changes, deque)
    assert child._tracking_changes.maxlen == 5

    own = TrackedDict(tracking_parent=parent, tracking_max_changes=2)
    assert own._tracking_max_changes == 2
    assert isinstance(own._tracking_changes, deque)
    assert own._tracking_changes.maxlen == 2


def test_tracked_dict_uncapped_parent_gives_uncapped_child() -> None:
    """Without a cap on the parent the child history stays a plain list."""
    parent = TrackedDict(tracking_auto_convert=True)
    parent["c"] = {"state": "a"}
    child = parent["c"]
    assert child._tracking_max_changes is None
    assert isinstance(child._tracking_changes, list)


def test_tracked_dict_child_init_recorded_into_capped_container() -> None:
    """A child's ``init`` entry lands in the capped child history."""
    parent = TrackedDict(tracking_auto_convert=True, tracking_max_changes=10)
    child = TrackedDict({"a": 1}, tracking_parent=parent)
    assert [c.extra["action"] for c in child.tracking_changes()][:1] == ["init"]
    assert isinstance(child._tracking_changes, deque)
    assert child._tracking_changes.maxlen == 10


def test_tracked_dict_overwrite_and_delete_unlink_child() -> None:
    """Overwriting or deleting a child (even an empty one) stops forwarding."""
    parent = TrackedDict(tracking_auto_convert=True)
    parent["c"] = {"state": "a"}
    old = parent["c"]
    parent["c"] = 1
    assert _forwarded(parent, old, "b") == 0

    parent["e"] = {}
    empty = parent["e"]
    del parent["e"]
    assert _forwarded(parent, empty, "b") == 0


def test_tracked_dict_reassigning_same_child_keeps_link() -> None:
    """Re-assigning the same child object leaves it linked."""
    parent = TrackedDict(tracking_auto_convert=True)
    parent["c"] = {"state": "a"}
    child = parent["c"]
    parent["c"] = child
    assert _forwarded(parent, child, "b") == 1
    parent.update({"c": child})
    assert _forwarded(parent, child, "c") == 1


def test_tracked_dict_pop_popitem_clear_unlink_children() -> None:
    """pop, popitem and clear still unlink children."""
    parent = TrackedDict(tracking_auto_convert=True)
    parent["a"] = {"state": "x"}
    parent["b"] = {"state": "x"}
    parent["c"] = {"state": "x"}
    a, b, c = parent["a"], parent["b"], parent["c"]
    parent.pop("a")
    assert _forwarded(parent, a, "y") == 0
    parent.popitem()
    assert _forwarded(parent, c, "y") == 0
    parent.clear()
    assert _forwarded(parent, b, "y") == 0


def _actions(tracked: TrackedDict | TrackedList) -> list[str]:
    return [e.extra["action"] for e in tracked.tracking_changes()]


def test_dict_auto_convert_construction_records_only_init() -> None:
    tracked = TrackedDict({"a": 1, "b": [1]}, tracking_auto_convert=True)

    assert _actions(tracked) == ["init"]
    child = tracked["b"]
    assert isinstance(child, TrackedList)
    assert _actions(child) == ["init"]
    assert child._tracking_uuid in tracked._tracking_child_tracked_items


def test_dict_construction_without_auto_convert_records_only_init() -> None:
    assert _actions(TrackedDict({"a": 1, "b": [1]})) == ["init"]


def test_dict_construction_with_record_init_false_records_nothing() -> None:
    assert TrackedDict({"a": 1}, tracking_record_init=False).tracking_changes() == []


def test_dict_nested_construction_still_forwards_later_mutations() -> None:
    tracked = TrackedDict({"b": [1, {"s": 1}]}, tracking_auto_convert=True)

    tracked["b"][1]["z"] = 2
    tracked["b"].append(5)

    entries = tracked.tracking_changes()[1:]
    assert [(e.extra["action"], e.extra["location"]) for e in entries] == [
        ("add", "b|1:z"),
        ("add", "b|2"),
    ]


def test_dict_assigning_non_empty_container_adds_one_parent_entry() -> None:
    tracked = TrackedDict(tracking_auto_convert=True)

    tracked["c"] = {"s": 1}

    assert _actions(tracked) == ["init", "add"]
    assert _actions(tracked["c"]) == ["init"]


def test_dict_child_under_locked_parent_is_locked() -> None:
    tracked = TrackedDict({"b": {"s": [1]}}, tracking_auto_convert=True)
    tracked.lock()

    assert tracked["b"]._tracking_locked
    assert tracked["b"]["s"]._tracking_locked
