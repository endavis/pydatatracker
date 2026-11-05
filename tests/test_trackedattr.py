"""Tests for `TrackedAttr` steady-state behavior."""

from __future__ import annotations

from collections import deque
from typing import Any, ClassVar

import pytest

from pydatatracker import TrackedAttr, TrackedDict, TrackedList
from pydatatracker.utils.changelog import ChangeLogEntry


class SampleTrackedAttr(TrackedAttr):
    """Helper object exposing a couple monitored attributes."""

    def __init__(self) -> None:
        super().__init__(tracking_auto_convert=True)
        self.name = "alpha"
        self.profile = {"score": 1}
        self.tracking_add_attribute_to_monitor("name")
        self.tracking_add_attribute_to_monitor("profile")


def _latest_change(tracked: TrackedAttr) -> ChangeLogEntry:
    return tracked.tracking_changes()[-1]


def test_tracked_attr_records_attribute_update() -> None:
    sample = SampleTrackedAttr()

    sample.name = "beta"

    change = _latest_change(sample)
    assert change.extra["action"] == "update"
    assert change.extra["location"] == "name"
    assert change.extra["data_pre_change"] == "alpha"
    assert change.extra["data_post_change"] == "beta"


def test_tracked_attr_lock_blocks_mutation() -> None:
    sample = SampleTrackedAttr()

    sample.lock("name")

    change = _latest_change(sample)
    assert change.extra["action"] == "lock"
    assert change.extra["attribute_name"] == "name"
    assert change.extra["attribute_locked"] == "True"

    with pytest.raises(RuntimeError):
        sample.name = "gamma"


def test_tracked_attr_child_updates_include_parent_location() -> None:
    sample = SampleTrackedAttr()
    assert isinstance(sample.profile, TrackedDict)

    sample.profile["score"] = 5

    change = _latest_change(sample)
    assert change.extra["location"] == "profile:score"
    assert "5" in change.extra["value"]


def test_tracked_attr_unlock_attribute_logs_change() -> None:
    sample = SampleTrackedAttr()

    sample.lock("name")
    sample.unlock("name")

    change = _latest_change(sample)
    assert change.extra["action"] == "unlock"
    assert change.extra["attribute_name"] == "name"
    assert change.extra["attribute_locked"] == "False"


def test_tracked_attr_unlock_all_clears_global_lock() -> None:
    sample = SampleTrackedAttr()

    sample.lock()
    sample.unlock()

    change = _latest_change(sample)
    assert change.extra["action"] == "unlock"
    assert sample._tracking_locked is False


# --- Declared monitored fields (#5) ---


class DeclaredAttr(TrackedAttr):
    """TrackedAttr declaring four monitored fields."""

    _tracking_fields: ClassVar[tuple[str, ...]] = ("a", "b", "c", "d")

    def __init__(self, **kwargs: object) -> None:
        super().__init__(**kwargs)  # type: ignore[arg-type]
        self.a = 1
        self.b = "two"
        self.c = 3.0
        self.d = None


class DeclaredChild(DeclaredAttr):
    """Extends the parent's declared fields."""

    _tracking_fields: ClassVar[tuple[str, ...]] = ("e",)


class DeclaredNoFields(DeclaredAttr):
    """Declares nothing, inherits the parent's fields."""


class DeclaredEarly(TrackedAttr):
    """Assigns a declared field before calling super().__init__()."""

    _tracking_fields = ("early",)

    def __init__(self) -> None:
        self.early = 5
        super().__init__()


class DeclaredContainers(TrackedAttr):
    """Declares an empty dict field."""

    _tracking_fields = ("data",)

    def __init__(self, **kwargs: object) -> None:
        super().__init__(tracking_auto_convert=True, **kwargs)  # type: ignore[arg-type]
        self.data: dict[str, int] = {}


def test_declared_fields_create_no_entries() -> None:
    assert DeclaredAttr().tracking_changes() == []


def test_declared_field_second_assignment_records_update() -> None:
    obj = DeclaredAttr()

    obj.a = 2

    change = _latest_change(obj)
    assert len(obj.tracking_changes()) == 1
    assert change.extra["action"] == "update"
    assert change.extra["location"] == "a"
    assert change.extra["data_pre_change"] == "1"
    assert change.extra["data_post_change"] == "2"
    assert obj.tracking_get_original_value("a") == 1


def test_declared_fields_union_parent_first() -> None:
    assert DeclaredChild._tracking_declared_fields == ("a", "b", "c", "d", "e")
    assert DeclaredNoFields._tracking_declared_fields == DeclaredAttr._tracking_declared_fields
    assert DeclaredAttr._tracking_declared_fields == ("a", "b", "c", "d")


def test_declared_field_assigned_before_super_init_is_adopted() -> None:
    obj = DeclaredEarly()

    assert obj.tracking_changes() == []
    assert obj._tracking_original_values["early"] == 5
    obj.early = 6
    assert _latest_change(obj).extra["action"] == "update"


def test_add_attribute_to_monitor_dynamic_still_records_start() -> None:
    obj = DeclaredAttr()
    obj.extra_field = 1
    obj.tracking_add_attribute_to_monitor("extra_field")

    assert _latest_change(obj).extra["action"] == "start monitoring"


def test_add_attribute_to_monitor_on_declared_field_is_noop() -> None:
    obj = DeclaredAttr()

    obj.tracking_add_attribute_to_monitor("a")

    assert obj.tracking_changes() == []
    assert obj._tracking_attributes_to_monitor.count("a") == 1


def test_declared_field_with_value_is_locked() -> None:
    obj = DeclaredAttr()
    obj.lock()

    with pytest.raises(RuntimeError):
        obj.a = 9


def test_first_assignment_of_declared_field_while_locked_raises() -> None:
    obj = DeclaredChild()
    obj.lock()

    with pytest.raises(RuntimeError):
        obj.e = 1


def test_empty_declared_dict_field_has_no_parent_entries_and_tracks_items() -> None:
    obj = DeclaredContainers()
    assert obj.tracking_changes() == []

    obj.data["k"] = 1

    change = _latest_change(obj)
    assert change.extra["location"] == "data:k"


class DeclaredNonEmpty(TrackedAttr):
    """Assigns a non-empty dict or list to a declared field after init."""

    _tracking_fields = ("child",)

    def __init__(self, value: dict[str, int] | list[int]) -> None:
        super().__init__(tracking_auto_convert=True)
        self.child = value


class DeclaredEarlyDict(TrackedAttr):
    """Assigns a non-empty dict to a declared field before super().__init__()."""

    _tracking_fields = ("child",)

    def __init__(self) -> None:
        self.child = {"s": 1}
        super().__init__(tracking_auto_convert=True)


def test_declared_field_first_non_empty_dict_does_not_crash_and_is_linked() -> None:
    obj = DeclaredNonEmpty({"s": 1})

    assert isinstance(obj.child, TrackedDict)
    assert obj.child["s"] == 1
    obj.child["s"] = 2
    change = _latest_change(obj)
    assert change.extra["location"] == "child:s"
    assert change.extra["value"] == "2"


def test_declared_field_first_non_empty_dict_records_no_entry_for_the_field() -> None:
    obj = DeclaredNonEmpty({"s": 1})

    # The first assignment of a declared field records nothing for the field
    # itself, and the child's construction entries are not forwarded (#24, #31).
    assert isinstance(obj.child, TrackedDict)
    assert not [e for e in obj.tracking_changes() if e.extra.get("location") == "child"]


def test_declared_field_first_non_empty_list_does_not_crash_and_is_linked() -> None:
    obj = DeclaredNonEmpty([1, 2])

    assert isinstance(obj.child, TrackedList)
    obj.child.append(3)
    assert _latest_change(obj).extra["location"].startswith("child")


def test_declared_field_non_empty_dict_adopted_at_end_of_init() -> None:
    obj = DeclaredEarlyDict()

    assert isinstance(obj.child, TrackedDict)
    obj.child["s"] = 2
    assert _latest_change(obj).extra["location"] == "child:s"


def test_declared_field_empty_dict_still_has_no_entries() -> None:
    obj = DeclaredNonEmpty({})

    assert isinstance(obj.child, TrackedDict)
    assert obj.tracking_changes() == []


def test_declared_class_children_inherit_snapshots_stack_and_record_init() -> None:
    obj = DeclaredContainers(tracking_capture_snapshots=True, tracking_capture_stack=True)
    child = obj.data
    assert isinstance(child, TrackedDict)

    assert child._tracking_capture_snapshots is True
    assert child._tracking_capture_stack is True
    assert child._tracking_record_init is False


def test_record_init_true_on_declared_class_records_one_init_entry() -> None:
    obj = DeclaredAttr(tracking_record_init=True)

    inits = [c for c in obj.tracking_changes() if c.extra["action"] == "init"]
    assert len(inits) == 1
    assert "init_data" in inits[0].extra
    assert len(obj.tracking_changes()) == 1


def test_unmonitored_and_internal_assignments_create_no_entries() -> None:
    obj = DeclaredAttr()

    obj.plain = 1
    obj._tracking_debug_flag = True

    assert obj.tracking_changes() == []
    assert obj.__dict__["plain"] == 1


def test_default_tracked_attr_still_records_init() -> None:
    obj = TrackedAttr()

    assert [c.extra["action"] for c in obj.tracking_changes()] == ["init"]


class DeclaredNested(TrackedAttr):
    _tracking_fields = ("child",)

    def __init__(self, value: object) -> None:
        super().__init__(tracking_auto_convert=True)
        self.child = value


def test_declared_field_nested_containers_record_nothing_anywhere() -> None:
    obj = DeclaredNested({"s": [1]})

    child = obj.child
    assert isinstance(child, TrackedDict)
    grandchild = child["s"]
    assert isinstance(grandchild, TrackedList)
    assert obj.tracking_changes() == []
    assert child.tracking_changes() == []
    assert grandchild.tracking_changes() == []


def test_declared_class_child_inherits_max_changes() -> None:
    """A declared container child inherits the owner's cap."""
    obj = DeclaredContainers(tracking_max_changes=3)
    child = obj.data
    assert isinstance(child, TrackedDict)
    assert child._tracking_max_changes == 3
    assert isinstance(child._tracking_changes, deque)
    assert child._tracking_changes.maxlen == 3


class Holder(TrackedAttr):
    """Helper object with two dynamically monitored attributes."""

    def __init__(self) -> None:
        super().__init__(tracking_auto_convert=True)
        self.child: object = {"s": 1}
        self.other: object = 0
        self.tracking_add_attribute_to_monitor("child")
        self.tracking_add_attribute_to_monitor("other")


def test_attr_child_construction_is_recorded_under_parent_uuid() -> None:
    holder = Holder()
    holder.child = {"s": 2}

    entries = holder.tracking_changes()
    assert all(e.tracked_item_uuid == holder._tracking_uuid for e in entries)
    assert [e.extra["location"] for e in entries if e.extra["action"] == "update"] == ["child"]


def test_attr_overwritten_child_stops_forwarding() -> None:
    holder = Holder()
    old = holder.child
    assert isinstance(old, TrackedDict)

    holder.child = 5
    before = len(holder.tracking_changes())
    old["s"] = 2

    assert len(holder.tracking_changes()) == before
    assert old._tracking_uuid not in holder._tracking_child_tracked_items


def test_attr_live_child_and_nested_changes_are_rehomed() -> None:
    holder = Holder()
    holder.child = {"x": {"y": 1}, "l": [1]}
    assert isinstance(holder.child, TrackedDict)

    holder.child["x"]["y"] = 2
    assert _latest_change(holder).extra["location"] == "child:x:y"
    holder.child["l"].append(3)
    assert _latest_change(holder).extra["location"].startswith("child:l")


def test_attr_shared_child_relocates_when_first_attribute_overwritten() -> None:
    holder = Holder()
    child = holder.child
    assert isinstance(child, TrackedDict)
    holder.other = child

    holder.child = 5
    assert holder._tracking_child_tracked_items[child._tracking_uuid]["location"] == "other"
    child["s"] = 2
    assert _latest_change(holder).extra["location"] == "other:s"


def test_attr_shared_child_stays_linked_when_second_attribute_overwritten() -> None:
    holder = Holder()
    child = holder.child
    assert isinstance(child, TrackedDict)
    holder.other = child

    holder.other = 5
    assert holder._tracking_child_tracked_items[child._tracking_uuid]["location"] == "child"
    child["s"] = 2
    assert _latest_change(holder).extra["location"] == "child:s"


def test_attr_self_assignment_keeps_child_linked() -> None:
    holder = Holder()
    child = holder.child
    assert isinstance(child, TrackedDict)

    holder.child = holder.child
    child["s"] = 2

    assert _latest_change(holder).extra["location"] == "child:s"


def test_attr_delete_unlinks_child_without_raising() -> None:
    holder = Holder()
    old = holder.child
    assert isinstance(old, TrackedDict)

    del holder.child
    before = len(holder.tracking_changes())
    old["s"] = 2

    assert len(holder.tracking_changes()) == before
    assert old._tracking_uuid not in holder._tracking_child_tracked_items


def test_attr_other_children_forward_after_delete() -> None:
    holder = Holder()
    holder.other = {"k": 1}
    other = holder.other
    assert isinstance(other, TrackedDict)

    del holder.child
    other["k"] = 2

    assert _latest_change(holder).extra["location"] == "other:k"


def test_attr_delete_unmonitored_attribute_and_shared_child() -> None:
    holder = Holder()
    setattr(holder, "plain", 1)  # noqa: B010
    delattr(holder, "plain")
    assert not hasattr(holder, "plain")

    child = holder.child
    assert isinstance(child, TrackedDict)
    holder.other = child
    del holder.other
    child["s"] = 2
    assert _latest_change(holder).extra["location"] == "child:s"


def test_attr_already_tracked_dict_is_linked_and_overwrite_unlinks_it() -> None:
    holder = Holder()
    tracked = TrackedDict({"a": 1})

    holder.other = tracked
    assert tracked._tracking_uuid in holder._tracking_child_tracked_items
    assert tracked._tracking_tree_lock is holder._tracking_tree_lock
    tracked["a"] = 2
    assert _latest_change(holder).extra["location"] == "other:a"

    holder.other = 5

    assert holder.other == 5
    assert tracked._tracking_uuid not in holder._tracking_child_tracked_items
    assert tracked._tracking_tree_lock is not holder._tracking_tree_lock
    before = len(holder.tracking_changes())
    tracked["a"] = 3
    assert len(holder.tracking_changes()) == before


def test_attr_declared_field_overwrite_unlinks_child() -> None:
    obj = DeclaredNonEmpty({"s": 1})
    old = obj.child
    assert isinstance(old, TrackedDict)

    setattr(obj, "child", 5)  # noqa: B010
    before = len(obj.tracking_changes())
    old["s"] = 2

    assert len(obj.tracking_changes()) == before
    assert old._tracking_uuid not in obj._tracking_child_tracked_items


class MonitorFirst(TrackedAttr):
    """Monitors ``a`` before it is set."""

    a: Any

    def __init__(self) -> None:
        super().__init__(tracking_auto_convert=True)
        self.tracking_add_attribute_to_monitor("a")


def _actions(tracked: TrackedAttr) -> list[str]:
    return [e.extra["action"] for e in tracked.tracking_changes()]


def test_monitor_before_set_records_start_then_update() -> None:
    obj = MonitorFirst()
    assert "a" in obj._tracking_attributes_to_monitor

    obj.a = 1
    obj.a = 2

    assert _actions(obj) == ["init", "start monitoring", "update"]


def test_monitor_first_log_matches_set_first_log() -> None:
    first = MonitorFirst()
    first.a = 1
    first.a = 2

    second: Any = TrackedAttr(tracking_auto_convert=True)
    second.a = 1
    second.tracking_add_attribute_to_monitor("a")
    second.a = 2

    keys = ("action", "location", "value", "data_pre_change")
    got = [tuple(e.extra.get(k) for k in keys) for e in first.tracking_changes()]
    want = [tuple(e.extra.get(k) for k in keys) for e in second.tracking_changes()]
    assert got == want


def test_monitor_before_set_read_raises_attribute_error() -> None:
    obj = MonitorFirst()

    with pytest.raises(AttributeError):
        _ = obj.a


def test_monitor_unset_twice_registers_once() -> None:
    obj = MonitorFirst()
    obj.tracking_add_attribute_to_monitor("a")
    obj.a = 1

    assert obj._tracking_attributes_to_monitor.count("a") == 1
    assert _actions(obj).count("start monitoring") == 1


def test_monitor_before_set_global_lock_blocks_first_assignment() -> None:
    obj = MonitorFirst()
    obj.lock()

    with pytest.raises(RuntimeError):
        obj.a = 1

    assert not hasattr(obj, "a")


def test_monitor_before_set_attribute_lock_is_noop_for_unset() -> None:
    obj = MonitorFirst()
    obj.lock("a")

    obj.a = 1

    assert _actions(obj) == ["init", "start monitoring"]


def test_monitor_before_set_delete_raises_attribute_error() -> None:
    obj = MonitorFirst()

    with pytest.raises(AttributeError):
        del obj.a


def test_monitor_before_set_container_is_converted_and_linked() -> None:
    obj = MonitorFirst()
    obj.a = {"k": 1}

    assert isinstance(obj.a, TrackedDict)
    assert obj.a._tracking_uuid in obj._tracking_child_tracked_items
    before = len(obj.tracking_changes())
    obj.a["k"] = 2
    assert len(obj.tracking_changes()) == before + 1


def test_monitor_before_set_known_uuids_tree_does_not_raise() -> None:
    obj = MonitorFirst()

    assert isinstance(obj._tracking_known_uuids_tree(), list)


def test_monitor_before_set_notifies_observer_on_first_assignment() -> None:
    obj = MonitorFirst()
    seen: list[ChangeLogEntry] = []
    obj.tracking_add_observer(seen.append)

    obj.a = 1

    assert [e.extra["action"] for e in seen] == ["start monitoring"]


def test_monitor_unset_declared_field_records_nothing_on_first_assignment() -> None:
    class Declared(TrackedAttr):
        _tracking_fields: ClassVar[tuple[str, ...]] = ("a",)

    obj = Declared(tracking_record_init=False)
    obj.tracking_add_attribute_to_monitor("a")
    obj.a = 1
    assert obj.tracking_changes() == []

    obj.a = 2
    assert _actions(obj) == ["update"]


def test_monitor_set_first_delete_then_reassign_unchanged() -> None:
    obj: Any = TrackedAttr()
    obj.a = 1
    obj.tracking_add_attribute_to_monitor("a")
    del obj.a
    before = _actions(obj)

    obj.a = 5

    assert obj.a == 5
    assert "a" not in obj._tracking_pending_monitor
    assert _actions(obj)[: len(before)] == before


# --- Lock semantics (#54) ---


def test_locked_instance_rejects_monitor_added_after_lock() -> None:
    obj: Any = TrackedAttr()
    obj.x = 1
    obj.tracking_add_attribute_to_monitor("x")
    obj.lock()
    obj.y = 2
    obj.tracking_add_attribute_to_monitor("y")
    before = len(obj.tracking_changes())

    with pytest.raises(RuntimeError, match="is locked"):
        obj.y = 9

    assert obj.y == 2
    assert len(obj.tracking_changes()) == before


def test_global_lock_then_unlock_one_attribute_still_rejects_write() -> None:
    obj = SampleTrackedAttr()
    obj.lock()
    obj.unlock("name")
    before = len(obj.tracking_changes())

    with pytest.raises(RuntimeError, match="is locked"):
        obj.name = "zeta"

    assert obj.name == "alpha"
    assert len(obj.tracking_changes()) == before
    assert obj._tracking_locked is True


def test_duplicate_attribute_lock_needs_one_unlock() -> None:
    obj = SampleTrackedAttr()
    obj.lock("name")
    obj.lock("name")
    obj.unlock("name")

    obj.name = "beta"

    assert obj.name == "beta"
    assert not obj._tracking_is_locked_attribute("name")


def test_attribute_lock_then_global_lock_and_unlock_fully_unlocks() -> None:
    obj = SampleTrackedAttr()
    obj.lock("name")
    obj.lock()
    obj.unlock()

    obj.name = "beta"
    obj.profile = {"score": 2}

    assert obj.name == "beta"
    assert obj._tracking_locked_attributes == set()


def test_repeated_global_lock_needs_one_unlock() -> None:
    obj = SampleTrackedAttr()
    obj.lock()
    with pytest.raises(RuntimeError):
        obj.name = "beta"
    obj.unlock()
    obj.lock()
    obj.unlock()

    obj.name = "beta"

    assert obj.name == "beta"
    assert obj._tracking_locked is False


def test_locked_instance_allows_unmonitored_write_without_entry() -> None:
    obj: Any = SampleTrackedAttr()
    obj.lock()
    before = len(obj.tracking_changes())

    obj.other = 5

    assert obj.other == 5
    assert len(obj.tracking_changes()) == before


def test_locked_instance_rejects_pending_name_first_assignment() -> None:
    obj = TrackedAttr()
    obj.tracking_add_attribute_to_monitor("later")
    obj.lock()

    with pytest.raises(RuntimeError, match="is locked"):
        obj.later = 1

    assert not hasattr(obj, "later")


def test_locked_instance_still_allows_delete() -> None:
    obj = SampleTrackedAttr()
    obj.lock()
    before = len(obj.tracking_changes())

    del obj.name

    assert not hasattr(obj, "name")
    assert len(obj.tracking_changes()) == before


# --- Assignment equality and the unset marker (#59) ---


class AmbiguousTruth:
    """Array-like truth values require an explicit reduction."""

    def __bool__(self) -> bool:
        raise ValueError("The truth value is ambiguous")


class EqualityValue:
    """Model values with non-scalar or failing equality without a dependency."""

    def __init__(self, result: object, error: type[Exception] | None = None) -> None:
        self.result = result
        self.error = error

    def __eq__(self, other: object) -> object:  # type: ignore[override]
        # Array libraries deliberately return non-bool objects from equality.
        if self.error is not None:
            raise self.error("Equality is unavailable")
        return self.result


class MonitoredValue(TrackedAttr):
    """Give the dynamic attribute an explicit type for test assignments."""

    value: object


def _monitor_value(value: object) -> MonitoredValue:
    obj = MonitoredValue(tracking_auto_convert=False, tracking_record_init=False)
    obj.value = value
    obj.tracking_add_attribute_to_monitor("value")
    return obj


@pytest.mark.parametrize("declared", [False, True])
def test_attr_records_equal_numeric_type_changes_in_sequence(declared: bool) -> None:
    obj = DeclaredAttr() if declared else _monitor_value(0)
    name = "a" if declared else "value"
    setattr(obj, name, 0)
    before = len(obj.tracking_changes())

    for value in (1, 1.0, True):
        setattr(obj, name, value)

    changes = obj.tracking_changes()[before:]
    assert len(changes) == 3
    assert [entry.extra["data_pre_change"] for entry in changes] == ["0", "1", "1.0"]
    assert [entry.extra["data_post_change"] for entry in changes] == ["1", "1.0", "True"]
    assert all(entry.extra["action"] == "update" for entry in changes)
    assert type(getattr(obj, name)) is bool


@pytest.mark.parametrize(
    ("old", "new"), [(1, 1.0), (1, True), (1.0, 1), (1.0, True), (True, 1), (True, 1.0)]
)
def test_attr_records_equal_numeric_type_changes_in_both_directions(
    old: object, new: object
) -> None:
    obj = _monitor_value(old)
    before = len(obj.tracking_changes())

    obj.value = new

    assert len(obj.tracking_changes()) == before + 1
    assert type(obj.value) is type(new)
    change = _latest_change(obj)
    assert change.extra["data_pre_change"] == repr(old)
    assert change.extra["data_post_change"] == repr(new)


@pytest.mark.parametrize(("old", "new"), [(1, 1), (1.0, 1.0), (True, True), ("a", "a"), ([1], [1])])
def test_attr_equal_values_of_the_same_type_do_not_record_an_update(
    old: object, new: object
) -> None:
    obj = _monitor_value(old)
    before = len(obj.tracking_changes())

    obj.value = new

    assert len(obj.tracking_changes()) == before
    assert obj.value is new


def test_attr_unset_marker_string_is_a_real_value() -> None:
    obj: Any = DeclaredAttr()
    obj.a = "#!NotSet"
    before = len(obj.tracking_changes())

    obj.a = "later"

    assert len(obj.tracking_changes()) == before + 1
    assert _latest_change(obj).extra["data_pre_change"] == "#!NotSet"
    assert obj.tracking_get_original_value("a") == 1


def test_attr_reassignment_after_delete_initializes_the_original_value_without_an_update() -> None:
    obj: Any = DeclaredAttr()
    del obj.a
    before = len(obj.tracking_changes())

    obj.a = "#!NotSet"

    assert len(obj.tracking_changes()) == before
    assert obj.tracking_get_original_value("a") == "#!NotSet"

    obj.a = "later"

    assert len(obj.tracking_changes()) == before + 1
    assert obj.tracking_get_original_value("a") == "#!NotSet"


@pytest.mark.parametrize("result", [[], [False], 0, 1, None, AmbiguousTruth()])
def test_attr_records_assignment_when_equality_is_not_boolean(result: object) -> None:
    old = EqualityValue(result)
    new = EqualityValue(result)
    obj = _monitor_value(old)
    before = len(obj.tracking_changes())

    obj.value = new

    assert len(obj.tracking_changes()) == before + 1
    assert obj.value is new
    assert _latest_change(obj).extra["action"] == "update"


@pytest.mark.parametrize("error", [ValueError, TypeError])
def test_attr_records_assignment_when_equality_raises(error: type[Exception]) -> None:
    old = EqualityValue(False, error)
    new = EqualityValue(False, error)
    obj = _monitor_value(old)
    before = len(obj.tracking_changes())

    obj.value = new

    assert len(obj.tracking_changes()) == before + 1
    assert obj.value is new


def test_attr_same_object_assignment_does_not_evaluate_equality_or_record_an_update() -> None:
    value = EqualityValue(False, ValueError)
    obj = _monitor_value(value)
    before = len(obj.tracking_changes())

    obj.value = value

    assert len(obj.tracking_changes()) == before
    assert obj.value is value


def test_attr_type_change_does_not_evaluate_equality_of_the_old_value() -> None:
    obj = _monitor_value(EqualityValue(False, ValueError))
    before = len(obj.tracking_changes())

    obj.value = 1

    assert len(obj.tracking_changes()) == before + 1
    assert obj.value == 1


def test_attr_custom_boolean_equality_still_avoids_an_update() -> None:
    obj = _monitor_value(EqualityValue(True))
    before = len(obj.tracking_changes())
    new = EqualityValue(True)

    obj.value = new

    assert len(obj.tracking_changes()) == before
    assert obj.value is new
