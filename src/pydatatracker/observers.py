"""Observer utilities for collecting change log entries."""

from __future__ import annotations

from collections import deque
from typing import Deque, Iterable

from .utils.changelog import ChangeLogEntry


class ChangeCollector:
    """Callable observer that stores incoming change log entries in memory."""

    def __init__(self, capacity: int | None = None) -> None:
        self.capacity = capacity
        self._changes: Deque[ChangeLogEntry] = deque(maxlen=self.capacity)

    def __call__(self, change: ChangeLogEntry) -> None:  # pragma: no cover - trivial
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

    def __iter__(self) -> Iterable[ChangeLogEntry]:  # pragma: no cover
        return iter(self._changes)
