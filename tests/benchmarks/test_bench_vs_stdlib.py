"""Benchmarks comparing tracked containers against the standard library.

Every case times the plain stdlib type and the tracked type in the same
pytest-benchmark group, so the table's ``(x.xx)`` suffix is the tracked/plain
ratio. One ``ReadCase`` / ``MutateCase`` holds both sides' factories and the
operation, so the sides cannot drift apart.

The comparison is not run in CI (see ``.github/workflows/benchmark.yml``); run
it locally with ``uv run doit benchmark``. See ``docs/usage/performance.md``.
"""

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

import pytest

from pydatatracker import TrackedAttr, TrackedDict, TrackedList

SIZE = 1_000
BATCH = 200
READ_LOOP = 1_000
ROUNDS = 50
CALLS_PER_BATCH = 20
CHUNK = 100

_KEYS = [f"k{i}" for i in range(BATCH)]
_KEYS_1K = [f"k{i}" for i in range(SIZE)]
_LOOP = range(READ_LOOP)
_BATCH_RANGE = range(BATCH)
_DICT_1K: dict[str, int] = {key: i for i, key in enumerate(_KEYS_1K)}
_LIST_1K: list[int] = list(range(SIZE))
_UPDATE_CHUNKS: list[dict[str, int]] = [
    {f"c{c}-{i}": i for i in range(CHUNK)} for c in range(CALLS_PER_BATCH)
]
_EXTEND_CHUNK: list[int] = list(range(CHUNK))

Factory = Callable[[], Any]


def _noop_observer(change: Any) -> None:
    """Observer that does nothing, to measure notification overhead alone."""


class _PlainAttr:
    """Plain class with the field the attribute cases read and write."""

    def __init__(self) -> None:
        self.a = 1


class _Monitored(TrackedAttr):
    """TrackedAttr that monitors the field the attribute cases touch."""

    def __init__(self) -> None:
        super().__init__()
        self.a = 1
        # Monitoring a name that is already set records "start monitoring" now.
        self.tracking_add_attribute_to_monitor("a")


def _unmonitored() -> TrackedAttr:
    obj = TrackedAttr()
    obj.a = 1
    return obj


def _tracked_dict_with(**options: Any) -> Factory:
    def build() -> TrackedDict:
        return TrackedDict(_DICT_1K, **options)

    return build


def _observed_dict() -> TrackedDict:
    tracked = TrackedDict(_DICT_1K)
    tracked.tracking_add_observer(_noop_observer)
    return tracked


@dataclass(frozen=True)
class ReadCase:
    """A read-only comparison: one prebuilt container, one timed call."""

    group: str
    build: dict[str, Factory]
    op: Callable[[Any], Any]
    per_call: int


@dataclass(frozen=True)
class MutateCase:
    """A mutating comparison: a fresh container per round, then one batch of ops."""

    group: str
    setup: dict[str, Factory]
    op: Callable[[Any], None]
    per_call: int
    state: Callable[[Any], Any]


def _copy_state(container: Any) -> Any:
    return container.copy()


def _attr_state(obj: Any) -> Any:
    return obj.a


def _dict_pair(prefill: bool) -> dict[str, Factory]:
    keys = _KEYS if prefill else []
    return {
        "plain": lambda: dict.fromkeys(keys, 0),
        "tracked": lambda: TrackedDict(dict.fromkeys(keys, 0)),
    }


def _list_pair(size: int) -> dict[str, Factory]:
    return {
        "plain": lambda: list(range(size)),
        "tracked": lambda: TrackedList(list(range(size))),
    }


def _attr_sides() -> dict[str, Factory]:
    return {
        "plain": _PlainAttr,
        "tracked-monitored": _Monitored,
        "tracked-unmonitored": _unmonitored,
    }


def _dict_setitem(container: Any) -> None:
    for key in _KEYS:
        container[key] = 1


def _dict_update(container: Any) -> None:
    for chunk in _UPDATE_CHUNKS:
        container.update(chunk)


def _dict_pop(container: Any) -> None:
    for key in _KEYS:
        container.pop(key)


def _list_append(container: Any) -> None:
    for i in _BATCH_RANGE:
        container.append(i)


def _list_setitem(container: Any) -> None:
    for i in _BATCH_RANGE:
        container[i] = -i


def _list_extend(container: Any) -> None:
    for _ in range(CALLS_PER_BATCH):
        container.extend(_EXTEND_CHUNK)


def _list_pop_end(container: Any) -> None:
    for _ in _BATCH_RANGE:
        container.pop()


def _list_insert_front(container: Any) -> None:
    for i in _BATCH_RANGE:
        container.insert(0, i)


def _list_pop_front(container: Any) -> None:
    for _ in _BATCH_RANGE:
        container.pop(0)


def _attr_set(obj: Any) -> None:
    for i in _BATCH_RANGE:
        obj.a = i


def _nested_depth1(container: Any) -> None:
    for key in _KEYS:
        container[key] = {"a": 1}


def _nested_depth2(container: Any) -> None:
    for key in _KEYS:
        container[key] = {"a": {"b": 1}}


def _dict_reassign_1k(container: Any) -> None:
    for i in _BATCH_RANGE:
        container[_KEYS_1K[i]] = -i


def _nested_pair() -> dict[str, Factory]:
    return {
        "plain": dict,
        "tracked": lambda: TrackedDict(tracking_auto_convert=True),
    }


READ_CASES: list[ReadCase] = [
    ReadCase(
        "dict-getitem",
        {"plain": lambda: dict(_DICT_1K), "tracked": lambda: TrackedDict(_DICT_1K)},
        lambda c: [c["k5"] for _ in _LOOP],
        READ_LOOP,
    ),
    ReadCase(
        "dict-iterate-1k",
        {"plain": lambda: dict(_DICT_1K), "tracked": lambda: TrackedDict(_DICT_1K)},
        lambda c: [k for k in c],  # noqa: C416 - iteration itself is what is timed
        1,
    ),
    ReadCase(
        "dict-construct-1k",
        {"plain": lambda: dict, "tracked": lambda: TrackedDict},
        lambda cls: cls(_DICT_1K),
        1,
    ),
    ReadCase(
        "list-getitem",
        {"plain": lambda: list(_LIST_1K), "tracked": lambda: TrackedList(_LIST_1K)},
        lambda c: [c[5] for _ in _LOOP],
        READ_LOOP,
    ),
    ReadCase(
        "list-iterate-1k",
        {"plain": lambda: list(_LIST_1K), "tracked": lambda: TrackedList(_LIST_1K)},
        lambda c: [x for x in c],  # noqa: C416 - iteration itself is what is timed
        1,
    ),
    ReadCase(
        "list-construct-1k",
        {"plain": lambda: list, "tracked": lambda: TrackedList},
        lambda cls: cls(_LIST_1K),
        1,
    ),
    ReadCase(
        "attr-get",
        _attr_sides(),
        lambda o: [o.a for _ in _LOOP],
        READ_LOOP,
    ),
]

MUTATE_CASES: list[MutateCase] = [
    MutateCase("dict-setitem-new", _dict_pair(False), _dict_setitem, BATCH, _copy_state),
    MutateCase("dict-setitem-existing", _dict_pair(True), _dict_setitem, BATCH, _copy_state),
    MutateCase("dict-update-100", _dict_pair(False), _dict_update, CALLS_PER_BATCH, _copy_state),
    MutateCase("dict-pop", _dict_pair(True), _dict_pop, BATCH, _copy_state),
    MutateCase("list-append", _list_pair(0), _list_append, BATCH, _copy_state),
    MutateCase("list-setitem", _list_pair(BATCH), _list_setitem, BATCH, _copy_state),
    MutateCase("list-extend-100", _list_pair(0), _list_extend, CALLS_PER_BATCH, _copy_state),
    MutateCase("list-pop-end", _list_pair(BATCH), _list_pop_end, BATCH, _copy_state),
    MutateCase("list-insert-front-1k", _list_pair(SIZE), _list_insert_front, BATCH, _copy_state),
    MutateCase("list-pop-front-1k", _list_pair(SIZE), _list_pop_front, BATCH, _copy_state),
    MutateCase("attr-set", _attr_sides(), _attr_set, BATCH, _attr_state),
    MutateCase("nested-setitem-depth1", _nested_pair(), _nested_depth1, BATCH, _copy_state),
    MutateCase("nested-setitem-depth2", _nested_pair(), _nested_depth2, BATCH, _copy_state),
    MutateCase(
        "dict-setitem-existing-1k-options",
        {
            "plain": lambda: dict(_DICT_1K),
            "tracked": _tracked_dict_with(),
            "tracked-snapshots": _tracked_dict_with(tracking_capture_snapshots=True),
            "tracked-stack": _tracked_dict_with(tracking_capture_stack=True),
            "tracked-max100": _tracked_dict_with(tracking_max_changes=100),
            "tracked-observer": _observed_dict,
        },
        _dict_reassign_1k,
        BATCH,
        _copy_state,
    ),
]

_READ_PARAMS = [
    pytest.param(case, impl, id=f"{case.group}-{impl}")
    for case in READ_CASES
    for impl in case.build
]
_MUTATE_PARAMS = [
    pytest.param(case, impl, id=f"{case.group}-{impl}")
    for case in MUTATE_CASES
    for impl in case.setup
]


@pytest.mark.benchmark
@pytest.mark.parametrize(("case", "impl"), _READ_PARAMS)
def test_read(benchmark: Any, case: ReadCase, impl: str) -> None:
    """Time a read-only operation on one side of the comparison."""
    benchmark.group = case.group
    container = case.build[impl]()
    benchmark(case.op, container)


@pytest.mark.benchmark
@pytest.mark.parametrize(("case", "impl"), _MUTATE_PARAMS)
def test_mutate(benchmark: Any, case: MutateCase, impl: str) -> None:
    """Time a batch of mutations, on a fresh container each round."""
    benchmark.group = case.group
    factory = case.setup[impl]

    def setup() -> tuple[tuple[Any], dict[str, Any]]:
        return (factory(),), {}

    benchmark.pedantic(case.op, setup=setup, rounds=ROUNDS, iterations=1)


@pytest.mark.parametrize("case", MUTATE_CASES, ids=lambda case: case.group)
def test_mutate_sides_agree(case: MutateCase) -> None:
    """Every side must end in the plain side's state, so the ops are comparable."""
    plain = case.setup["plain"]()
    case.op(plain)
    expected = case.state(plain)
    for impl, factory in case.setup.items():
        container = factory()
        case.op(container)
        assert case.state(container) == expected, f"{case.group}-{impl} diverged from plain"


_TRACKED_MUTATE_PARAMS = [
    pytest.param(case, impl, id=f"{case.group}-{impl}")
    for case in MUTATE_CASES
    for impl in case.setup
    if impl != "plain"
]


@pytest.mark.parametrize(("case", "impl"), _TRACKED_MUTATE_PARAMS)
def test_mutate_setup_starts_fresh(case: MutateCase, impl: str) -> None:
    """Each round must start with the same history and add the same number of entries.

    Every tracked side except the deliberately unmonitored attribute must also record
    entries, so a side that silently stops tracking cannot pass as a fast tracked side.

    Guards against a setup that reuses one container, which would make the
    change history (and so the timing) grow from round to round.
    """
    starts: list[int] = []
    added: list[int] = []
    for _ in range(3):
        container = case.setup[impl]()
        before = len(container.tracking_changes())
        case.op(container)
        starts.append(before)
        added.append(len(container.tracking_changes()) - before)
    assert len(set(starts)) == 1, f"history at round start differs: {starts}"
    assert len(set(added)) == 1, f"entries added per round differ: {added}"
    if not impl.endswith("unmonitored"):
        assert added[0] > 0, f"{case.group}-{impl} recorded no change entries"
