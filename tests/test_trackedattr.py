"""Tests for `TrackedAttr` steady-state behavior."""

from __future__ import annotations

from typing import ClassVar

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
    assert obj._tracking_get_original_value("a") == 1


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
    # itself. The child's own construction entries may still be forwarded;
    # how they appear in the parent log is #24 / #31, not asserted here.
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
