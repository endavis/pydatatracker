"""Observer utilities for collecting change log entries."""

from __future__ import annotations

from collections import deque
from typing import Callable, Deque, Iterable
import json
import logging
from pathlib import Path

from .utils.changelog import ChangeLogEntry


class ChangeCollector:
    """Callable observer that stores incoming change log entries in memory."""

    def __init__(
        self,
        *,
        capacity: int | None = None,
        include_init_events: bool = False,
    ) -> None:
        """Initialize the collector.

        Args:
            capacity: Optional maximum number of entries to keep (FIFO).
            include_init_events: Whether to store container `init` events.
        """

        self.capacity = capacity
        self.include_init_events = include_init_events
        self._changes: Deque[ChangeLogEntry] = deque(maxlen=self.capacity)

    def __call__(self, change: ChangeLogEntry) -> None:  # pragma: no cover - trivial
        if not self.include_init_events and change.extra.get("action") == "init":
            return
        self._changes.append(change)

    def __len__(self) -> int:  # pragma: no cover - trivial
        return len(self._changes)

    def __bool__(self) -> bool:  # pragma: no cover
        return bool(self._changes)

    def clear(self) -> None:
        """Remove all collected change log entries."""

        self._changes.clear()

    def as_list(self) -> list[ChangeLogEntry]:
        """Return collected changes as a list (in arrival order)."""

        return list(self._changes)

    def last(self) -> ChangeLogEntry | None:
        """Return the most recent collected change."""

        return self._changes[-1] if self._changes else None

    def filtered(self, action: str) -> list[ChangeLogEntry]:
        """Return collected changes matching a specific action."""

        return [entry for entry in self._changes if entry.extra.get("action") == action]

    def __iter__(self) -> Iterable[ChangeLogEntry]:  # pragma: no cover
        return iter(self._changes)


class FilteredObserver:
    """Wraps another observer, only forwarding matching changes."""

    def __init__(self, observer, *, actions=None, locations=None):
        self.observer = observer
        self.actions = set(actions or [])
        self.locations = set(locations or [])

    def __call__(self, change):
        if self.actions and change.extra.get('action') not in self.actions:
            return
        location = change.extra.get('location')
        if self.locations and location not in self.locations:
            return
        return self.observer(change)

def filtered_observer(observer, *, actions=None, locations=None):
    return FilteredObserver(observer, actions=actions, locations=locations)


def logging_observer(logger: logging.Logger | None = None) -> Callable[[ChangeLogEntry], None]:
    """Create an observer that logs changes via the provided logger."""

    logger = logger or logging.getLogger("pydatatracker")

    def _observer(change: ChangeLogEntry) -> None:
        logger.info(
            "change %s action=%s location=%s",
            change.tracked_item_uuid,
            change.extra.get("action"),
            change.extra.get("location"),
        )

    return _observer


def json_file_observer(path: str | Path) -> Callable[[ChangeLogEntry], None]:
    """Return an observer that appends serialized changes to a .jsonl file."""

    file_path = Path(path)

    def _observer(change: ChangeLogEntry) -> None:
        file_path.parent.mkdir(parents=True, exist_ok=True)
        with file_path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(change.to_dict()) + "\n")

    return _observer


def async_queue_observer(queue):
    import asyncio

    async def _async_enqueue(change):
        await queue.put(change.to_dict())

    def _observer(change):
        if asyncio.iscoroutinefunction(queue.put):
            asyncio.create_task(_async_enqueue(change))
        else:
            queue.put(change.to_dict())

    return _observer
