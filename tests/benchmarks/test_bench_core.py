"""Performance benchmarks for tracked containers."""

from typing import Any

import pytest

from pydatatracker import TrackedDict, TrackedList, tracking_actor

MUTATIONS = 200


def _fill_dict(**kwargs: Any) -> TrackedDict:
    payload = TrackedDict(**kwargs)
    for i in range(MUTATIONS):
        payload[str(i)] = i
    return payload


@pytest.mark.benchmark
def test_bench_trackeddict_default(benchmark: Any) -> None:
    """Benchmark TrackedDict assignments with default (lightweight) tracking."""
    benchmark(_fill_dict)


@pytest.mark.benchmark
def test_bench_trackeddict_snapshots(benchmark: Any) -> None:
    """Benchmark TrackedDict assignments with before/after snapshots enabled."""
    benchmark(_fill_dict, tracking_capture_snapshots=True)


@pytest.mark.benchmark
def test_bench_trackeddict_actor(benchmark: Any) -> None:
    """Benchmark TrackedDict assignments inside a tracking_actor context."""

    def run() -> TrackedDict:
        with tracking_actor("bench"):
            return _fill_dict()

    benchmark(run)


@pytest.mark.benchmark
def test_bench_trackedlist_append(benchmark: Any) -> None:
    """Benchmark TrackedList appends."""

    def run() -> TrackedList:
        items = TrackedList()
        for i in range(MUTATIONS):
            items.append(i)
        return items

    benchmark(run)


@pytest.mark.benchmark
def test_bench_trackedlist_append_capped(benchmark: Any) -> None:
    """Benchmark TrackedList appends with a capped change history."""

    def run() -> TrackedList:
        items = TrackedList(tracking_max_changes=100)
        for i in range(MUTATIONS):
            items.append(i)
        return items

    benchmark(run)


@pytest.mark.benchmark
@pytest.mark.parametrize("history", [100, 1_000, 10_000])
def test_bench_trackedlist_append_with_history(benchmark: Any, history: int) -> None:
    """Benchmark one TrackedList append after `history` changes are already recorded.

    Each round gets a fresh list so the history stays at `history` instead of growing.
    """

    def setup() -> tuple[tuple[TrackedList], dict[str, Any]]:
        items = TrackedList()
        for i in range(history):
            items.append(i)
        return (items,), {}

    def append_one(items: TrackedList) -> None:
        items.append(0)

    benchmark.pedantic(append_one, setup=setup, rounds=30, iterations=1)
