"""Tests for `TrackedList` steady-state behavior."""

from __future__ import annotations

from pydatatracker import TrackedDict, TrackedList
from pydatatracker.utils.changelog import ChangeLogEntry


def _latest_change(tracked: TrackedList) -> ChangeLogEntry:
    return tracked.tracking_changes()[-1]


def test_tracked_list_append_records_index() -> None:
    """Appending should log the index where the new item landed."""
    tracked = TrackedList([1, 2])

    tracked.append(3)

    change = _latest_change(tracked)
    assert change.extra["action"] == "add"
    assert change.extra["location"] == 2
    assert "3" in change.extra["value"]


def test_tracked_list_pop_stores_passed_and_actual_index() -> None:
    """Popping should retain both logical and actual index information."""
    tracked = TrackedList(["a", "b"])

    removed = tracked.pop(-1)

    change = _latest_change(tracked)
    assert removed == "b"
    assert change.extra["action"] == "remove"
    assert change.extra["location"] == 1  # actual index after normalization
    assert change.extra["passed_index"] == "-1"
    assert "b" in change.extra["removed_items"]


def test_tracked_list_extend_logs_location_range() -> None:
    """Extending logs comma-separated locations for appended items."""
    tracked = TrackedList([1, 2])

    tracked.extend([3, 4])

    change = _latest_change(tracked)
    assert change.extra["action"] == "add"
    assert change.extra["location"] == "2,3"
    assert "[3, 4]" in change.extra["value"]


def test_tracked_list_remove_reports_removed_items() -> None:
    """Removing an item should capture location and removed payload."""
    tracked = TrackedList(["a", "b", "c"])

    tracked.remove("b")

    change = _latest_change(tracked)
    assert change.extra["action"] == "remove"
    assert change.extra["location"] == 1
    assert "['b']" in change.extra["removed_items"]


def test_tracked_list_clear_records_all_removed_items() -> None:
    """Clearing the list records all removed values."""
    tracked = TrackedList([1, 2])

    tracked.clear()

    change = _latest_change(tracked)
    assert change.extra["action"] == "remove"
    assert "[1, 2]" in change.extra["removed_items"]


def test_tracked_list_snapshot_opt_in_records_repr() -> None:
    """`tracking_capture_snapshots` controls repr logging for lists."""
    tracked = TrackedList(tracking_capture_snapshots=True)
    tracked.append(1)
    change = tracked.tracking_changes()[-1]
    assert change.extra["data_pre_change"] == "[]"
    assert change.extra["data_post_change"] == "[1]"

    plain = TrackedList()
    plain.append(1)
    plain_change = plain.tracking_changes()[-1]
    assert "data_pre_change" not in plain_change.extra
    assert "data_post_change" not in plain_change.extra


def test_tracked_list_record_init_false_has_no_entries() -> None:
    assert TrackedList(tracking_record_init=False).tracking_changes() == []


def test_tracked_list_default_records_init() -> None:
    changes = TrackedList().tracking_changes()
    assert [c.extra["action"] for c in changes] == ["init"]


def _forwarded(parent: TrackedList, child: TrackedList | TrackedDict, value: int) -> int:
    before = len(parent.tracking_changes())
    child.append(value) if isinstance(child, TrackedList) else child.update(k=value)
    return len(parent.tracking_changes()) - before


def test_tracked_list_empty_parent_links_children() -> None:
    """append, insert and extend on an empty parent link the child."""
    appended = TrackedList(tracking_auto_convert=True)
    appended.append([1])
    assert _forwarded(appended, appended[0], 2) == 1

    inserted = TrackedList(tracking_auto_convert=True)
    inserted.insert(0, [1])
    assert _forwarded(inserted, inserted[0], 2) == 1

    extended = TrackedList(tracking_auto_convert=True)
    extended.extend([[1]])
    assert _forwarded(extended, extended[0], 2) == 1


def test_tracked_list_setitem_unlinks_old_child_including_empty() -> None:
    """Overwriting a child, even an empty one, unlinks it."""
    parent = TrackedList(tracking_auto_convert=True)
    parent.append([1])
    parent.append([])
    full, empty = parent[0], parent[1]
    parent[0] = 5
    parent[1] = 5
    assert _forwarded(parent, full, 2) == 0
    assert _forwarded(parent, empty, 2) == 0


def test_tracked_list_remove_unlinks_stored_child() -> None:
    """remove unlinks the stored child at index 0 and when found by equality."""
    parent = TrackedList(tracking_auto_convert=True)
    parent.append([1])
    parent.append([2])
    first, second = parent[0], parent[1]
    parent.remove(first)
    assert _forwarded(parent, first, 9) == 0
    parent.remove([2])
    assert _forwarded(parent, second, 9) == 0


def test_tracked_list_reassigning_same_child_keeps_link() -> None:
    """l[i] = l[i] leaves the child linked."""
    parent = TrackedList(tracking_auto_convert=True)
    parent.append(1)
    parent.append([1])
    child = parent[1]
    parent[1] = parent[1]
    assert _forwarded(parent, child, 2) == 1
