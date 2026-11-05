"""Performance benchmarks for TrackedAttr creation and update.

Plain guard tests (not timed) fail if the benchmarked classes stop tracking writes, so a
benchmark cannot silently measure untracked assignment. The update benchmark and its guard
share ``_update`` so they cannot drift.
"""

from collections.abc import Callable
from typing import Any

import pytest

from pydatatracker import TrackedAttr


class _Monitored(TrackedAttr):
    """TrackedAttr that monitors four fields registered dynamically."""

    def __init__(self) -> None:
        super().__init__()
        for name in ("a", "b", "c", "d"):
            self.tracking_add_attribute_to_monitor(name)
        self.a = 1
        self.b = "two"
        self.c = 3.0
        self.d = None


@pytest.mark.benchmark
def test_bench_trackedattr_create_monitored(benchmark: Any) -> None:
    """Benchmark creating a TrackedAttr with four dynamically monitored fields."""
    benchmark(_Monitored)


def _update(obj: TrackedAttr) -> None:
    """The write the update benchmark times; also exercised by the guard test."""
    obj.a = 2


@pytest.mark.benchmark
def test_bench_trackedattr_update(benchmark: Any) -> None:
    """Benchmark updating a monitored field on a fresh object per round."""

    def setup() -> tuple[tuple[Any, ...], dict[str, Any]]:
        return (_Monitored(),), {}

    benchmark.pedantic(_update, setup=setup, rounds=200, iterations=1)


class _Declared(TrackedAttr):
    """TrackedAttr declaring the same four fields up front."""

    _tracking_fields = ("a", "b", "c", "d")

    def __init__(self) -> None:
        super().__init__()
        self.a = 1
        self.b = "two"
        self.c = 3.0
        self.d = None


@pytest.mark.benchmark
def test_bench_trackedattr_create_declared(benchmark: Any) -> None:
    """Benchmark creating a TrackedAttr with four declared fields."""
    benchmark(_Declared)


@pytest.mark.parametrize("factory", [_Monitored, _Declared])
def test_benchmarked_objects_track_writes(factory: Callable[[], TrackedAttr]) -> None:
    """Guard: benchmarked objects monitor a-d and record the benchmarked write."""
    obj = factory()
    assert obj._tracking_attributes_to_monitor == ["a", "b", "c", "d"]
    before = len(obj.tracking_changes())
    _update(obj)
    assert len(obj.tracking_changes()) == before + 1
