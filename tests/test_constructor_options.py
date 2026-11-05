"""Constructor option parity across the tracked containers (#69)."""

import datetime
from typing import Any

import pytest

from pydatatracker import TrackedAttr, TrackedDict, TrackedList
from pydatatracker.types._trackbase import TrackBase

BAD_OPTION: dict[str, Any] = {"tracking_typo": 1}
REMOVED_OPTION: dict[str, Any] = {"tracking_auto_converted_in": "x"}
TYPES = [TrackedDict, TrackedList, TrackedAttr]
IDS = ["dict", "list", "attr"]

ALL_OPTIONS: dict[str, Any] = {
    "tracking_name": "n",
    "tracking_auto_convert": True,
    "tracking_parent": None,
    "tracking_location": "x",
    "tracking_capture_snapshots": True,
    "tracking_capture_stack": True,
    "tracking_record_init": False,
    "tracking_max_changes": 5,
}


@pytest.mark.parametrize("cls", TYPES, ids=IDS)
def test_accepts_every_option(cls: type[TrackBase]) -> None:
    obj = cls(**ALL_OPTIONS)
    assert obj.tracking_name == "n"
    assert obj._tracking_auto_convert is True
    assert obj._tracking_capture_snapshots is True
    assert obj._tracking_capture_stack is True
    assert obj._tracking_max_changes == 5
    assert not obj.tracking_changes()


@pytest.mark.parametrize("cls", TYPES, ids=IDS)
def test_defaults_match(cls: type[TrackBase]) -> None:
    obj = cls()
    assert obj.tracking_name is None
    assert obj._tracking_auto_convert is False
    assert obj._tracking_capture_snapshots is False
    assert obj._tracking_capture_stack is False
    assert obj._tracking_max_changes is None


def test_declared_attr_keeps_record_init_false() -> None:
    class Declared(TrackedAttr):
        _tracking_fields = ("a",)

    assert Declared()._tracking_record_init is False


@pytest.mark.parametrize("cls", [*TYPES, TrackBase], ids=[*IDS, "base"])
def test_unknown_option_raises(cls: type[TrackBase]) -> None:
    with pytest.raises(TypeError):
        cls(**BAD_OPTION)


@pytest.mark.parametrize("cls", TYPES, ids=IDS)
def test_removed_auto_converted_in_is_unknown(cls: type[TrackBase]) -> None:
    with pytest.raises(TypeError):
        cls(**REMOVED_OPTION)


def test_trackeddict_data_rules() -> None:
    assert dict(TrackedDict(a=1)) == {"a": 1}
    assert dict(TrackedDict({"tracking_x": 1})) == {"tracking_x": 1}
    with pytest.raises(TypeError, match=r'TrackedDict\(\{"tracking_x": 1\}\)'):
        TrackedDict(tracking_x=1)


def test_positional_options_rejected() -> None:
    attr_cls: Any = TrackedAttr
    list_cls: Any = TrackedList
    with pytest.raises(TypeError):
        attr_cls(False)
    with pytest.raises(TypeError):
        list_cls([1], "abc")


@pytest.mark.parametrize("cls", TYPES, ids=IDS)
def test_children_inherit_and_override_capture(cls: type[TrackBase]) -> None:
    parent = cls(tracking_capture_snapshots=True, tracking_capture_stack=True)
    child = cls(tracking_parent=parent, tracking_location="c")
    assert (child._tracking_capture_snapshots, child._tracking_capture_stack) == (True, True)
    off = cls(
        tracking_parent=parent,
        tracking_location="d",
        tracking_capture_snapshots=False,
        tracking_capture_stack=False,
    )
    assert (off._tracking_capture_snapshots, off._tracking_capture_stack) == (False, False)


@pytest.mark.parametrize("cls", TYPES, ids=IDS)
def test_name_and_created_are_read_only(cls: type[TrackBase]) -> None:
    obj = cls(tracking_name="n")
    assert obj.tracking_name == "n"
    assert obj.tracking_created.tzinfo is not None
    assert obj.tracking_created.utcoffset() == datetime.timedelta(0)
    with pytest.raises(AttributeError):
        setattr(obj, "tracking_name", "other")  # noqa: B010
    with pytest.raises(AttributeError):
        setattr(obj, "tracking_created", datetime.datetime.now(datetime.UTC))  # noqa: B010


def test_original_value_public() -> None:
    class Plain(TrackedAttr):
        _tracking_fields = ("a",)

    obj: Any = Plain()
    obj.a = 1
    obj.a = 2
    assert obj.tracking_get_original_value("a") == 1


def test_auto_convert_links_children() -> None:
    attr: Any = TrackedAttr(tracking_auto_convert=True)
    attr.tracking_add_attribute_to_monitor("d")
    attr.d = {"k": [1]}
    assert isinstance(attr.d, TrackedDict)
    assert isinstance(attr.d["k"], TrackedList)
    attr.d["k"].append(2)
    assert attr.tracking_changes()[-1].extra["location"] == "d:k|1"


def test_trackedattr_does_not_convert_by_default() -> None:
    attr: Any = TrackedAttr()
    attr.tracking_add_attribute_to_monitor("d")
    attr.d = {"k": 1}
    assert type(attr.d) is dict
