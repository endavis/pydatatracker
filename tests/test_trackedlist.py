"""Tests for `TrackedList` steady-state behavior."""

from __future__ import annotations

import pytest

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


def test_list_auto_convert_construction_records_only_init() -> None:
    tracked = TrackedList([1, {"s": 1}], tracking_auto_convert=True)

    assert [e.extra["action"] for e in tracked.tracking_changes()] == ["init"]
    child = tracked[1]
    assert isinstance(child, TrackedDict)
    assert [e.extra["action"] for e in child.tracking_changes()] == ["init"]
    assert child._tracking_uuid in tracked._tracking_child_tracked_items


def test_list_nested_construction_still_forwards_later_mutations() -> None:
    tracked = TrackedList([[1], {"s": 1}], tracking_auto_convert=True)

    tracked[1]["z"] = 2

    entries = tracked.tracking_changes()[1:]
    assert [(e.extra["action"], e.extra["location"]) for e in entries] == [("add", "1:z")]


def test_list_assigning_non_empty_container_adds_one_parent_entry() -> None:
    tracked = TrackedList([0], tracking_auto_convert=True)

    tracked[0] = {"s": 1}

    assert [e.extra["action"] for e in tracked.tracking_changes()] == ["init", "update"]
    assert [e.extra["action"] for e in tracked[0].tracking_changes()] == ["init"]


def _count(tracked: TrackedList | TrackedDict) -> int:
    return len(tracked.tracking_changes())


@pytest.mark.parametrize(
    ("initial", "added", "expected"),
    [
        ([1, 2, 3], [4], "3"),
        ([1, 2, 3], [4, 5, 6], "3,4,5"),
        ([], [7], "0"),
        ([], [], ""),
    ],
)
def test_tracked_list_extend_location_matches_new_indexes(
    initial: list[int], added: list[int], expected: str
) -> None:
    tracked = TrackedList(initial)

    tracked.extend(added)

    assert _latest_change(tracked).extra["location"] == expected


def test_iadd_single_item_records_its_index() -> None:
    tracked = TrackedList([1, 2, 3])

    tracked += [4]

    assert _latest_change(tracked).extra["location"] == "3"


def test_iadd_records_one_extend_and_returns_self() -> None:
    tracked = TrackedList([1, 2])
    same = tracked
    before = _count(tracked)

    tracked += [3, 4]

    assert tracked is same
    assert list(tracked) == [1, 2, 3, 4]
    assert _count(tracked) == before + 1
    change = _latest_change(tracked)
    assert change.extra["action"] == "add"
    assert change.extra["location"] == "2,3"


def test_iadd_self_and_generator_are_safe() -> None:
    tracked = TrackedList([1, 2])
    tracked += tracked
    assert list(tracked) == [1, 2, 1, 2]
    tracked += (i for i in (7, 8))
    assert list(tracked) == [1, 2, 1, 2, 7, 8]


def test_iadd_converts_and_links_children() -> None:
    tracked = TrackedList(tracking_auto_convert=True)

    tracked += [{"s": 1}]

    assert isinstance(tracked[0], TrackedDict)
    assert _forwarded(tracked, tracked[0], 2) == 1


def test_imul_records_add_with_new_indexes() -> None:
    tracked = TrackedList([2, 3])
    same = tracked
    before = _count(tracked)

    tracked *= 2

    assert tracked is same
    assert list(tracked) == [2, 3, 2, 3]
    assert _count(tracked) == before + 1
    change = _latest_change(tracked)
    assert change.extra["action"] == "add"
    assert change.extra["location"] == "2,3"


def test_imul_non_positive_empties_and_unlinks() -> None:
    for factor in (0, -1):
        tracked = TrackedList([[1]], tracking_auto_convert=True)
        child = tracked[0]

        tracked *= factor

        assert list(tracked) == []
        assert _latest_change(tracked).extra["action"] == "remove"
        assert _forwarded(tracked, child, 2) == 0


def test_imul_bad_operand_does_not_mutate() -> None:
    tracked = TrackedList([1])
    before = _count(tracked)

    with pytest.raises(TypeError):
        tracked *= "x"

    assert list(tracked) == [1]
    assert _count(tracked) == before


def test_imul_with_child_keeps_single_child_entry() -> None:
    tracked = TrackedList([[1]], tracking_auto_convert=True)
    child = tracked[0]

    tracked *= 2

    assert len(tracked) == 2
    assert _forwarded(tracked, child, 2) == 1


def test_locked_inplace_and_slice_ops_raise_without_mutation() -> None:
    tracked = TrackedList([1, 2, 3])
    tracked.lock()
    before = _count(tracked)

    with pytest.raises(RuntimeError):
        tracked += [4]
    with pytest.raises(RuntimeError):
        tracked *= 2
    with pytest.raises(RuntimeError):
        tracked[0:2] = [9]
    with pytest.raises(RuntimeError):
        del tracked[0:2]

    assert list(tracked) == [1, 2, 3]
    assert _count(tracked) == before


def test_slice_set_records_update_with_repr_location() -> None:
    tracked = TrackedList([1, 2, 3])
    before = _count(tracked)

    tracked[0:2] = [9, 9]

    assert list(tracked) == [9, 9, 3]
    assert _count(tracked) == before + 1
    change = _latest_change(tracked)
    assert change.extra["action"] == "update"
    assert change.extra["location"] == "slice(0, 2, None)"


@pytest.mark.parametrize(
    ("sl", "values"),
    [
        (slice(0, 2), [7, 8, 9]),
        (slice(1, 3), [5]),
        (slice(1, 1), [5, 6]),
        (slice(None, None, 2), [0, 0, 0]),
        (slice(None, None, -1), [4, 3, 2, 1, 0]),
        (slice(-2, None), []),
        (slice(10, 20), [1]),
    ],
)
def test_slice_set_matches_plain_list(sl: slice, values: list[int]) -> None:
    plain = [0, 1, 2, 3, 4]
    tracked = TrackedList(plain)

    plain[sl] = values
    tracked[sl] = values

    assert list(tracked) == plain


def test_extended_slice_wrong_size_raises_without_side_effects() -> None:
    tracked = TrackedList([1, 2, 3, 4], tracking_auto_convert=True)
    before = _count(tracked)

    with pytest.raises(ValueError, match="extended slice"):
        tracked[::2] = [{"a": 1}]

    assert list(tracked) == [1, 2, 3, 4]
    assert _count(tracked) == before


def test_slice_set_converts_links_and_unlinks() -> None:
    tracked = TrackedList([[1], [2]], tracking_auto_convert=True)
    old, kept = tracked[0], tracked[1]

    tracked[0:2] = [{"n": 1}, kept]

    assert isinstance(tracked[0], TrackedDict)
    assert _forwarded(tracked, tracked[0], 5) == 1
    assert _forwarded(tracked, kept, 5) == 1
    assert _forwarded(tracked, old, 5) == 0


def test_slice_delete_matches_plain_list_and_unlinks() -> None:
    plain = [0, 1, 2, 3, 4]
    tracked = TrackedList(plain)
    del plain[0:2]
    del tracked[0:2]
    assert list(tracked) == plain
    assert "removed_items" in _latest_change(tracked).extra

    plain = [0, 1, 2, 3, 4]
    tracked = TrackedList(plain)
    del plain[::2]
    del tracked[::2]
    assert list(tracked) == plain
    assert _latest_change(tracked).extra["location"] == "slice(None, None, 2)"

    nested = TrackedList([[1], [2]], tracking_auto_convert=True)
    child = nested[0]
    del nested[0:1]
    assert _latest_change(nested).extra["action"] == "update"
    assert _forwarded(nested, child, 3) == 0


def test_non_int_non_slice_index_raises_type_error() -> None:
    tracked = TrackedList([1])
    with pytest.raises(TypeError):
        tracked["a"] = 1
    with pytest.raises(TypeError):
        del tracked["a"]


def test_slice_location_under_dict_parent() -> None:
    parent = TrackedDict({"b": [1, 2]}, tracking_auto_convert=True)

    parent["b"][0:1] = [9]

    assert parent.tracking_changes()[-1].extra["location"] == "b|slice(0, 1, None)"


def _two_children() -> TrackedList:
    return TrackedList([{"a": 1}, {"b": 2}], tracking_auto_convert=True)


def _assert_child_location(tracked: TrackedList, index: int, key: str) -> None:
    tracked[index][key] = 99
    change = _latest_change(tracked)
    assert change.extra["action"] == "update"
    assert change.extra["location"] == f"{index}:{key}"


def test_insert_shifts_child_locations() -> None:
    tracked = _two_children()
    tracked.insert(0, 5)
    _assert_child_location(tracked, 2, "b")
    _assert_child_location(tracked, 1, "a")


def test_insert_negative_index_shifts_child_locations() -> None:
    tracked = _two_children()
    tracked.insert(-1, 5)
    _assert_child_location(tracked, 2, "b")
    _assert_child_location(tracked, 0, "a")


def test_pop_shifts_child_locations() -> None:
    tracked = TrackedList([1, {"a": 1}, {"b": 2}], tracking_auto_convert=True)
    tracked.pop(0)
    _assert_child_location(tracked, 0, "a")
    _assert_child_location(tracked, 1, "b")


def test_remove_shifts_child_locations() -> None:
    tracked = TrackedList([1, {"a": 1}, {"b": 2}], tracking_auto_convert=True)
    tracked.remove(1)
    _assert_child_location(tracked, 0, "a")
    _assert_child_location(tracked, 1, "b")


def test_del_int_shifts_child_locations() -> None:
    tracked = TrackedList([1, {"a": 1}, {"b": 2}], tracking_auto_convert=True)
    del tracked[0]
    _assert_child_location(tracked, 0, "a")
    _assert_child_location(tracked, 1, "b")


def test_del_slice_shifts_child_locations() -> None:
    tracked = TrackedList([1, 2, {"a": 1}, {"b": 2}], tracking_auto_convert=True)
    removed = tracked[0]
    del tracked[0:2]
    _assert_child_location(tracked, 0, "a")
    _assert_child_location(tracked, 1, "b")
    assert removed == 1


def test_slice_assignment_changing_length_shifts_child_locations() -> None:
    tracked = TrackedList([1, 2, {"a": 1}, {"b": 2}], tracking_auto_convert=True)
    tracked[0:2] = [7, 8, 9, 10, 11]
    _assert_child_location(tracked, 5, "a")
    _assert_child_location(tracked, 6, "b")
    tracked[0:5] = [0]
    _assert_child_location(tracked, 1, "a")
    _assert_child_location(tracked, 2, "b")


def test_reindex_does_not_resurrect_removed_child() -> None:
    tracked = _two_children()
    removed = tracked.pop(0)
    assert removed._tracking_uuid not in tracked._tracking_child_tracked_items
    assert len(tracked._tracking_child_tracked_items) == 1


def _child_locations(tracked: TrackedList) -> list[object]:
    """Return each child's stored location in list order, matched by identity."""
    by_id = {id(e["item"]): e["location"] for e in tracked._tracking_child_tracked_items.values()}
    return [by_id[id(child)] for child in tracked]


def test_tracked_list_sort_with_tracked_children_updates_locations() -> None:
    """Sorting a list of tracked children must not raise and must refresh locations."""
    tracked = TrackedList([{"k": 2}, {"k": 1}], tracking_auto_convert=True)
    before = len(tracked.tracking_changes())

    tracked.sort(key=lambda child: child["k"])

    assert [child["k"] for child in tracked] == [1, 2]
    changes = tracked.tracking_changes()
    assert len(changes) == before + 1
    assert changes[-1].extra["action"] == "update"
    assert _child_locations(tracked) == [0, 1]


def test_tracked_list_reverse_with_tracked_children_updates_locations() -> None:
    """Reversing must refresh locations by identity, even for equal children."""
    tracked = TrackedList([{"a": 1}, {"a": 1}, {"a": 2}], tracking_auto_convert=True)
    first, second, third = tracked[0], tracked[1], tracked[2]
    before = len(tracked.tracking_changes())

    tracked.reverse()

    assert tracked[0] is third
    assert tracked[1] is second
    assert tracked[2] is first
    changes = tracked.tracking_changes()
    assert len(changes) == before + 1
    assert changes[-1].extra["action"] == "update"
    assert _child_locations(tracked) == [0, 1, 2]
    assert tracked._tracking_child_tracked_items[first._tracking_uuid]["location"] == 2
    assert tracked._tracking_child_tracked_items[second._tracking_uuid]["location"] == 1


def test_tracked_list_child_change_after_reverse_reports_new_location() -> None:
    """A later child change should log the child's post-reverse location."""
    tracked = TrackedList([{"a": 1}, {"a": 2}], tracking_auto_convert=True)
    first = tracked[0]

    tracked.reverse()
    first["a"] = 9

    assert _latest_change(tracked).extra["location"] == "1:a"


def _duplicated() -> tuple[TrackedList, TrackedDict]:
    parent = TrackedList([{"state": 0}], tracking_auto_convert=True)
    child = parent[0]
    parent.extend(["x", child])
    return parent, child


def _remove_first_copy(parent: TrackedList, how: str) -> None:
    if how == "pop":
        parent.pop(0)
    elif how == "remove":
        parent.remove(parent[0])
    elif how == "del_int":
        del parent[0]
    elif how == "del_slice":
        del parent[0:1]
    elif how == "slice_set":
        parent[0:1] = ["y"]
    else:
        parent[0] = "y"


@pytest.mark.parametrize("how", ["pop", "remove", "del_int", "del_slice", "slice_set", "set_int"])
def test_removing_one_duplicate_keeps_child_linked(how: str) -> None:
    """Removing one copy of a duplicated child leaves the other copy linked."""
    parent, child = _duplicated()
    _remove_first_copy(parent, how)
    expected = 2 if how in ("set_int", "slice_set") else 1
    assert parent._tracking_child_tracked_items[child._tracking_uuid]["location"] == expected
    assert _forwarded(parent, child, 5) == 1
    assert _latest_change(parent).extra["location"].startswith(str(expected))


def test_extend_with_own_child_then_pop_keeps_link() -> None:
    """The issue's repro: extend([tl[0]]) then pop(0)."""
    parent = TrackedList([{"state": 0}], tracking_auto_convert=True)
    child = parent[0]
    parent.extend([parent[0]])
    parent.pop(0)
    assert _forwarded(parent, child, 5) == 1
    _assert_child_location(parent, 0, "state")


def test_imul_then_pop_keeps_child_linked() -> None:
    parent = TrackedList([{"state": 0}], tracking_auto_convert=True)
    child = parent[0]
    parent *= 2
    parent.pop(0)
    assert _forwarded(parent, child, 5) == 1


def test_removing_both_duplicates_unlinks_after_second() -> None:
    parent, child = _duplicated()
    parent.pop(0)
    assert _forwarded(parent, child, 5) == 1
    parent.pop(1)
    assert _forwarded(parent, child, 6) == 0


def test_clear_and_imul_zero_unlink_duplicated_child() -> None:
    cleared, child = _duplicated()
    cleared.clear()
    assert _forwarded(cleared, child, 5) == 0

    multiplied, other = _duplicated()
    multiplied *= 0
    assert _forwarded(multiplied, other, 5) == 0


@pytest.mark.parametrize("index", [5, -5])
def test_tracked_list_setitem_out_of_range_leaves_no_child(index: int) -> None:
    """An out-of-range int assignment raises before converting or linking."""
    tracked = TrackedList([1], tracking_auto_convert=True)
    children_before = dict(tracked._tracking_child_tracked_items)
    changes_before = len(tracked.tracking_changes())

    with pytest.raises(IndexError, match="list assignment index out of range"):
        tracked[index] = {"x": 1}

    assert list(tracked) == [1]
    assert tracked._tracking_child_tracked_items == children_before
    assert len(tracked.tracking_changes()) == changes_before


def test_tracked_list_setitem_over_none_still_works() -> None:
    """Assigning over an existing None value is an in-range update."""
    tracked = TrackedList([None], tracking_auto_convert=True)

    tracked[0] = {"x": 1}

    assert isinstance(tracked[0], TrackedDict)
    assert len(tracked._tracking_child_tracked_items) == 1


def test_tracked_list_front_mutations_skip_scan_without_children(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A list with no linked children does not scan its items to reindex locations."""
    tracked = TrackedList([1, 2, 3])
    calls: list[int] = []

    def spy() -> dict[str, object]:
        calls.append(1)
        return {}

    monkeypatch.setattr(tracked, "_tracking_present_child_locations", spy)

    tracked.insert(0, 0)
    tracked.pop(0)

    assert calls == []
    assert list(tracked) == [1, 2, 3]


def test_tracked_list_insert_front_reindexes_children() -> None:
    """Linked children still get their location refreshed after insert(0)."""
    tracked = TrackedList([{"a": 1}, {"b": 2}], tracking_auto_convert=True)

    tracked.insert(0, 5)

    locations = sorted(c["location"] for c in tracked._tracking_child_tracked_items.values())
    assert locations == [1, 2]
