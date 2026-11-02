import gc
import weakref

import pytest

from pydatatracker import TrackedDict
from pydatatracker.observers import telemetry_observer


class DummyCounter:
    def __init__(self) -> None:
        self.counts: dict[tuple[tuple[str, object], ...], int] = {}

    def labels(self, **labels: object) -> object:
        key = tuple(sorted(labels.items()))
        if key not in self.counts:
            self.counts[key] = 0

        class Inc:
            def __init__(self, parent: DummyCounter, key: tuple[tuple[str, object], ...]) -> None:
                self.parent = parent
                self.key = key

            def inc(self) -> None:
                self.parent.counts[self.key] += 1

        return Inc(self, key)


def test_telemetry_observer_counts() -> None:
    tracked = TrackedDict()
    counter = DummyCounter()
    tracked.tracking_add_observer(telemetry_observer(counter))
    tracked["foo"] = "bar"
    assert counter.counts


# --- weak observer reference semantics (#4) ---


class _Recorder:
    def __init__(self) -> None:
        self.calls = 0

    def on_change(self, entry: object) -> None:
        self.calls += 1


def test_parent_and_child_freed_without_gc() -> None:
    gc.disable()
    try:
        parent = TrackedDict({"child": {"a": 1}}, tracking_auto_convert=True)
        parent_ref = weakref.ref(parent)
        child_ref = weakref.ref(parent["child"])
        del parent
        assert parent_ref() is None
        assert child_ref() is None
    finally:
        gc.enable()


class _Counter:
    def __init__(self) -> None:
        self.calls = 0


class _Obs:
    def __init__(self, counter: _Counter) -> None:
        self.counter = counter

    def on_change(self, entry: object) -> None:
        self.counter.calls += 1


def test_weak_observer_collected_not_called_and_no_error() -> None:
    tracked = TrackedDict()
    counter = _Counter()
    obs = _Obs(counter)
    tracked.tracking_add_observer(obs.on_change, weak=True)
    tracked["a"] = 1
    seen = counter.calls
    assert seen > 0
    del obs
    gc.collect()
    tracked["b"] = 2
    assert counter.calls == seen


def test_default_lambda_stays_alive_and_called() -> None:
    tracked = TrackedDict()
    calls: list[object] = []
    tracked.tracking_add_observer(lambda entry: calls.append(entry))
    gc.collect()
    tracked["a"] = 1
    assert calls


def test_weak_lambda_without_reference_is_dropped() -> None:
    tracked = TrackedDict()
    calls: list[object] = []
    tracked.tracking_add_observer(lambda entry: calls.append(entry), weak=True)
    gc.collect()
    tracked["a"] = 1
    assert calls == []


def test_priority_order_preserved() -> None:
    tracked = TrackedDict()
    order: list[int] = []

    def high(entry: object) -> None:
        order.append(1)

    def low(entry: object) -> None:
        order.append(2)

    tracked.tracking_add_observer(low, priority=70)
    tracked.tracking_add_observer(high, priority=10, weak=True)
    order.clear()
    tracked["a"] = 1
    assert order == [1, 2]


@pytest.mark.parametrize("weak", [False, True])
def test_remove_bound_method_and_no_duplicates(weak: bool) -> None:
    tracked = TrackedDict()
    rec = _Recorder()
    tracked.tracking_add_observer(rec.on_change, weak=weak)
    tracked.tracking_add_observer(rec.on_change, weak=weak)
    tracked["a"] = 1
    first = rec.calls
    tracked["a"] = 2
    assert rec.calls == first * 2
    tracked.tracking_remove_observer(rec.on_change)
    tracked["a"] = 3
    assert rec.calls == first * 2


def test_unweakrefable_callable_falls_back_to_strong() -> None:
    tracked = TrackedDict()
    tracked.tracking_add_observer(print, weak=True)
    tracked.tracking_remove_observer(print)
