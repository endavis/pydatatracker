"""Pin the return values of ``TrackBase._tracking_is_trackable``."""

from collections.abc import Callable

import pytest

from pydatatracker.types._trackbase import TrackBase
from pydatatracker.types.trackedattributes import TrackedAttr
from pydatatracker.types.trackeddict import TrackedDict
from pydatatracker.types.trackedlist import TrackedList


class _DictSub(TrackedDict):
    pass


class _ListSub(TrackedList):
    pass


class _AttrSub(TrackedAttr):
    pass


class _Plain:
    pass


@pytest.mark.parametrize(
    ("make", "expected"),
    [
        (lambda: {}, ""),
        (lambda: [], ""),
        (lambda: (), ""),
        (lambda: None, ""),
        (lambda: 1, ""),
        (lambda: "TrackedDict", ""),
        (lambda: _Plain(), ""),
        (lambda: TrackedDict(), "TrackedDict"),
        (lambda: _DictSub(), "TrackedDict"),
        (lambda: TrackedList(), "TrackedList"),
        (lambda: _ListSub(), "TrackedList"),
        (lambda: TrackedAttr(), "TrackedAttr"),
        (lambda: _AttrSub(), "TrackedAttr"),
        (lambda: TrackedDict, ""),
    ],
)
def test_tracking_is_trackable(make: Callable[[], object], expected: str) -> None:
    """Each input maps to the same string on every call, cached or not."""
    holder = TrackedDict()
    obj = make()
    assert holder._tracking_is_trackable(obj) == expected
    assert holder._tracking_is_trackable(obj) == expected
    assert TrackedList()._tracking_is_trackable(obj) == expected


def test_tracking_is_trackable_on_trackbase_subclass_instance() -> None:
    """The caller's own type does not change the answer."""
    assert isinstance(TrackedDict(), TrackBase)
    assert TrackedAttr()._tracking_is_trackable(TrackedDict()) == "TrackedDict"
