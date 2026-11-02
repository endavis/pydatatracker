"""Performance benchmarks for TrackedAttr creation and update."""

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


@pytest.mark.benchmark
def test_bench_trackedattr_update(benchmark: Any) -> None:
    """Benchmark updating a monitored field on a fresh object per round."""

    def setup() -> tuple[tuple[Any, ...], dict[str, Any]]:
        return (_Monitored(),), {}

    def update(obj: _Monitored) -> None:
        obj.a = 2

    benchmark.pedantic(update, setup=setup, rounds=200, iterations=1)


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
