# Project: bastproxy
# Filename: pydatatracker/types/trackedlist.py
#
# File Description: Holds a list implementation with change tracking.
#
# Docstrings last checked and updated: 12/19/2024
#
# By: Bast
"""Module for monitoring and managing a list with tracking capabilities.

This module provides the `TrackedList` class, which allows for the tracking
of changes to lists and the management of relationships between their children.
It includes methods for locking and unlocking the list, notifying observers of
changes, and maintaining a history of original values, making it a valuable tool
for monitoring state changes in an application.

Key Components:
    - TrackedList: A class that extends TrackBase and list to monitor list
        changes.
    - Methods for adding, locking, unlocking, and notifying changes to the list.
    - Utility methods for handling list item changes, conversions, and tracking.

Features:
    - Automatic conversion of tracked values.
    - Management of parent-child relationships for tracked children.
    - Notification system for observers when list data changes occur.
    - Locking mechanism to prevent modifications to the list
    - Comprehensive logging of data changes and original values.

Usage:
    - Instantiate TrackedList to create an object that tracks list changes.
    - Lock and unlock the list using `lock` and `unlock` methods.
    - Access original values and change logs through provided methods.

Classes:
    - `TrackedList`: Represents a class that can track list changes.

"""

# Standard Library
import operator
from collections.abc import Callable, Iterable, Iterator
from typing import Any, ClassVar, Self, SupportsIndex

# 3rd Party
# Project
from ._trackbase import TrackBase, _TrackingKind, check_lock, merges_trees, track_changes


class TrackedList(TrackBase, list):
    """A list class that tracks changes to its items.

    This class extends both TrackBase and Python's built-in list to provide
    comprehensive change tracking capabilities. It is designed for applications
    that require monitoring and logging modifications to dictionary data structures.
    The class includes methods for locking and unlocking the list, notifying
    observers of changes, and maintaining a history of original values.

    """

    _tracking_kind: ClassVar[_TrackingKind] = "TrackedList"
    _tracking_subscript_locations: ClassVar[bool] = True

    def __init__(
        self,
        data: list | None = None,
        *,
        tracking_name: str | None = None,
        tracking_auto_convert: bool = False,
        tracking_parent: "TrackBase | None" = None,
        tracking_location: str | None = "",
        tracking_capture_snapshots: bool | None = None,
        tracking_capture_stack: bool | None = None,
        tracking_record_init: bool | None = None,
        tracking_max_changes: int | None = None,
    ) -> None:
        """Initialize the tracked list.

        This constructor initializes the tracked list with optional initial data,
        tracking settings, and parent-child relationship management.

        Args:
            data: The initial data for the list.
            tracking_name: Optional name, read back through ``tracking_name``.
            tracking_auto_convert: Whether to automatically convert values.
            tracking_parent: The parent tracking object.
            tracking_location: The location of the tracking object.
            tracking_capture_snapshots: Record before/after reprs; None inherits.
            tracking_capture_stack: Record call stacks; None inherits.
            tracking_record_init: Whether to record the ``init`` entry; None inherits.
            tracking_max_changes: Cap on stored change entries (oldest dropped); None
                inherits from the parent, else unbounded.

        """
        if data is None:
            data = []
        list.__init__(self, data)
        TrackBase.__init__(
            self,
            tracking_name=tracking_name,
            tracking_auto_convert=tracking_auto_convert,
            tracking_parent=tracking_parent,
            tracking_location=tracking_location,
            tracking_capture_snapshots=tracking_capture_snapshots,
            tracking_capture_stack=tracking_capture_stack,
            tracking_record_init=tracking_record_init,
            tracking_max_changes=tracking_max_changes,
            tracking_delimiter="|",
        )

    def _tracking_convert_all_values(self) -> None:
        """Convert all values in the list to tracked objects.

        Iterates through all items in the list and converts each value to a tracked
        object if it is not already one. This ensures that all values in the list are
        trackable and can be monitored for changes.

        Values are stored through ``list.__setitem__`` so construction records no
        per-item change entries; only the container's own ``init`` entry is logged.

        """
        for index, value in enumerate(list(list.__iter__(self))):
            list.__setitem__(self, index, self._tracking_store_item(value, index))

    def _tracking_present_child_locations(self) -> dict[str, Any]:
        """Map each trackable item in the list to the index of its first occurrence.

        Returns:
            A dict of child ``_tracking_uuid`` to its first index in the list.

        """
        locations: dict[str, Any] = {}
        for position, value in enumerate(list.__iter__(self)):
            uuid = getattr(value, "_tracking_uuid", None)
            if uuid is not None and uuid not in locations:
                locations[uuid] = position
        return locations

    def _tracking_reindex_child_locations(self) -> None:
        """Refresh each linked child's stored ``location`` to its current index.

        Uses the first occurrence of each child. Children no longer in the list are
        left untouched, so a child removed by the current mutation is still unlinked
        by ``track_changes`` afterwards. Call this after any mutation that shifts items.

        """
        children = self._tracking_child_tracked_items
        if not children:
            return
        for uuid, position in self._tracking_present_child_locations().items():
            if uuid in children:
                children[uuid]["location"] = position

    @merges_trees
    @check_lock
    @track_changes
    def __setitem__(self, index: int | slice, item: Any) -> None:
        """Set an item or a slice in the tracked list.

        An int index sets one item, converting it to a tracked value if necessary.
        A slice assigns an iterable, converting each new value, and is recorded as a
        single ``update`` whose location is ``repr(index)`` (for example
        ``"slice(0, 2, None)"``); old items no longer in the list are unlinked.

        Args:
            index: The index or slice at which to set the item(s).
            item: The item to set, or an iterable of items for a slice.

        Raises:
            TypeError: If the index is neither an integer nor a slice.
            IndexError: If an int index is out of range; nothing is converted, linked
                or recorded.
            ValueError: If an extended slice is assigned a sequence of the wrong size.

        """
        if isinstance(index, slice):
            self._tracking_set_slice(index, item)
            return

        if not isinstance(index, int):
            raise TypeError(f"Tracked list index must be an int or slice, not {type(index)}")

        try:
            old_item = self[index]
        except IndexError:
            raise IndexError("list assignment index out of range") from None

        if index < 0:
            index += len(self)

        item = self._tracking_store_item(item, index)
        super().__setitem__(index, item)

        if old_item is not None and old_item is not item:
            self._tracking_context.setdefault("removed_items", []).append(old_item)
        self._tracking_context["action"] = "update"
        self._tracking_context["value"] = item
        self._tracking_context["location"] = index

    def _tracking_set_slice(self, index: slice, items: Iterable) -> None:
        """Assign ``items`` to a slice and fill the tracking context.

        The values are snapshotted first, so ``tl[:] = tl`` and generators are safe.
        An extended-slice size mismatch raises before anything is converted or linked.

        Args:
            index: The slice being assigned.
            items: The iterable of new values.

        Raises:
            ValueError: If an extended slice is assigned a sequence of the wrong size.

        """
        values = list(items)
        old_items = list(list.__getitem__(self, index))
        start, _stop, step = index.indices(len(self))
        if step != 1 and len(old_items) != len(values):
            raise ValueError(
                f"attempt to assign sequence of size {len(values)} "
                f"to extended slice of size {len(old_items)}"
            )

        converted = self._tracking_store_items(
            (value, start + position * step) for position, value in enumerate(values)
        )
        list.__setitem__(self, index, converted)
        self._tracking_reindex_child_locations()

        removed = [old for old in old_items if not any(old is new for new in converted)]
        if removed:
            self._tracking_context.setdefault("removed_items", []).extend(removed)
        self._tracking_context["action"] = "update"
        self._tracking_context["value"] = converted
        self._tracking_context["location"] = repr(index)

    @check_lock
    @track_changes
    def __delitem__(self, index: int | slice) -> None:
        """Delete an item or a slice from the tracked list.

        An int index deletes one item. A slice deletes every item it covers and is
        recorded as a single ``update`` whose location is ``repr(index)``; the removed
        items are unlinked.

        Args:
            index: The index or slice to delete.

        Raises:
            TypeError: If the index is neither an integer nor a slice.

        Example:
            >>> tracked_list = TrackedList([1, 2, 3])
            >>> del tracked_list[1]  # Deletion is tracked
            >>> del tracked_list[0:2]  # Slice deletion is tracked
            >>> del tracked_list[5]  # Raises IndexError

        """
        if isinstance(index, slice):
            old_items = list(list.__getitem__(self, index))
            super().__delitem__(index)
            self._tracking_reindex_child_locations()
            self._tracking_context.setdefault("removed_items", []).extend(old_items)
            self._tracking_context["action"] = "update"
            self._tracking_context["value"] = old_items
            self._tracking_context["location"] = repr(index)
            return

        if not isinstance(index, int):
            raise TypeError(f"Tracked list index must be an int or slice, not {type(index)}")

        old_item = self[index]
        if index < 0:
            index += len(self)
        super().__delitem__(index)
        self._tracking_reindex_child_locations()

        self._tracking_context.setdefault("removed_items", []).append(old_item)
        self._tracking_context["action"] = "update"
        self._tracking_context["value"] = old_item
        self._tracking_context["location"] = index

    @merges_trees
    @check_lock
    @track_changes
    def append(self, item: Any) -> None:
        """Append an item to the tracked list.

        This method appends an item to the end of the tracked list, converting
        the item to a tracked value if necessary. It also updates the tracking
        context with the action details.

        Args:
            item: The item to append to the list.

        Example:
            >>> tracked_list = TrackedList([1, 2, 3])
            >>> tracked_list.append(4)  # Append is tracked
            >>> tracked_list.append('a')  # Append is tracked

        """
        index = len(self)
        item = self._tracking_store_item(item, index)
        super().append(item)

        self._tracking_context["action"] = "add"
        self._tracking_context["value"] = item
        self._tracking_context["location"] = index

    @merges_trees
    @check_lock
    @track_changes
    def extend(self, items: Iterable) -> None:
        """Extend the tracked list with items from another list.

        This method extends the tracked list by appending items from another list,
        converting each item to a tracked value if necessary. It also updates the
        tracking context with the action details.

        Args:
            items: The iterable of items to extend the tracked list with. It is
                consumed once; the change log records the stored values.

        Example:
            >>> tracked_list = TrackedList([1, 2, 3])
            >>> tracked_list.extend([4, 5])  # Extend is tracked
            >>> tracked_list.extend(['a', 'b'])  # Extend is tracked

        """
        items = list(items)
        count = len(self)
        new_data = self._tracking_store_items(
            (item, count + offset) for offset, item in enumerate(items)
        )
        super().extend(new_data)

        extend_length = len(new_data)
        current_leng = len(self)

        locations = [str(i) for i in range(current_leng - extend_length, current_leng)]
        location = ",".join(locations)

        self._tracking_context["action"] = "add"
        self._tracking_context["value"] = new_data
        self._tracking_context["location"] = location

    def __iadd__(self, other: Iterable) -> Self:  # type: ignore[misc]
        """Extend the list in place (``+=``) through :meth:`extend`.

        Records one ``extend`` change, converts and links new items, and honours the
        lock.

        Args:
            other: The iterable of items to append.

        Returns:
            This list.

        """
        self.extend(list(other))
        return self

    @check_lock
    @track_changes
    def __imul__(self, n: SupportsIndex) -> Self:
        """Repeat the list in place (``*=``) and track the change.

        ``n >= 1`` records an ``add`` for the new indexes (with ``multiplier``);
        ``n <= 0`` empties the list and records a ``remove`` that unlinks children.
        Repeated children stay a single child entry. The ``_tracking_convert_item``
        hook is not called: no new values are added, only existing ones repeated.

        Args:
            n: The repeat count.

        Returns:
            This list.

        Raises:
            TypeError: If ``n`` is not an integer (nothing is mutated).

        """
        count = operator.index(n)
        old_items = list(list.__iter__(self))
        if count <= 0:
            list.clear(self)
            self._tracking_context["action"] = "remove"
            self._tracking_context["removed_items"] = old_items
            self._tracking_context["value"] = old_items
        else:
            list.__imul__(self, count)
            self._tracking_context["action"] = "add"
            self._tracking_context["value"] = list(list.__iter__(self))[len(old_items) :]
            self._tracking_context["location"] = ",".join(
                str(i) for i in range(len(old_items), len(self))
            )
        self._tracking_context["multiplier"] = count
        return self

    @merges_trees
    @check_lock
    @track_changes
    def insert(self, index: int, item: Any) -> None:
        """Insert an item into the tracked list.

        This method inserts an item at the specified index in the tracked list,
        converting the item to a tracked value if necessary. It also updates
        the tracking context with the action details.

        Args:
            index: The index at which to insert the item.
            item: The item to insert into the list.

        Raises:
            TypeError: If the index is not an integer.

        Example:
            >>> tracked_list = TrackedList([1, 2, 3])
            >>> tracked_list.insert(1, 4)  # Insert is tracked
            >>> tracked_list.insert(5, 'a')  # Insert is tracked

        """
        length = len(self)
        clamped = max(index + length, 0) if index < 0 else min(index, length)
        item = self._tracking_store_item(item, clamped)
        super().insert(clamped, item)
        self._tracking_reindex_child_locations()

        self._tracking_context["action"] = "add"
        self._tracking_context["value"] = item
        self._tracking_context["location"] = clamped

    @check_lock
    @track_changes
    def remove(self, item: Any) -> None:
        """Remove an item from the tracked list.

        This method removes the first occurrence of the specified item from the
        tracked list, updating the tracking context with the action details.

        Args:
            item: The item to remove from the list.

        Raises:
            ValueError: If the item is not found in the list.

        Example:
            >>> tracked_list = TrackedList([1, 2, 3])
            >>> tracked_list.remove(2)  # Remove is tracked
            >>> tracked_list.remove(5)  # Raises ValueError

        """
        try:
            index = super().index(item)
        except ValueError:
            index = None
        stored = self[index] if index is not None else None

        super().remove(item)
        self._tracking_reindex_child_locations()

        if index is not None:
            self._tracking_context.setdefault("removed_items", []).append(stored)

        self._tracking_context["action"] = "remove"
        self._tracking_context["value"] = item
        self._tracking_context["location"] = index

    @check_lock
    @track_changes
    def pop(self, index: int = -1) -> Any:
        """Remove and return an item from the tracked list.

        This method removes and returns an item at the specified index from the
        tracked list, updating the tracking context with the action details.

        Args:
            index: The index of the item to remove and return. Defaults to -1.

        Returns:
            The item removed from the list.

        Raises:
            IndexError: If the index is out of range.
            TypeError: If the index is not an integer.

        Example:
            >>> tracked_list = TrackedList([1, 2, 3])
            >>> tracked_list.pop()  # Pop is tracked
            3
            >>> tracked_list.pop(0)  # Pop is tracked
            1
            >>> tracked_list.pop(5)  # Raises IndexError

        """
        passed_index = index
        actual_index = index + len(self) if index < 0 else index
        item = super().pop(index)
        self._tracking_reindex_child_locations()

        self._tracking_context.setdefault("removed_items", []).append(item)
        self._tracking_context["action"] = "remove"
        self._tracking_context["value"] = item
        self._tracking_context["location"] = actual_index
        self._tracking_context["passed_index"] = passed_index

        return item

    @check_lock
    @track_changes
    def clear(self) -> None:
        """Clear all items from the tracked list.

        This method clears all items from the tracked list, updating the tracking
        context with the action details.

        Example:
            >>> tracked_list = TrackedList([1, 2, 3])
            >>> tracked_list.clear()  # Clear is tracked

        """
        if not list.__len__(self):
            return  # no-op: records nothing
        for item in self:
            self._tracking_context.setdefault("removed_items", []).append(item)

        super().clear()

        self._tracking_context["action"] = "remove"

    def _tracking_order_unchanged(self, before: "list[Any]") -> bool:
        """Return True if the items are the same objects in the same order as ``before``."""
        after = list(list.__iter__(self))
        return len(before) == len(after) and all(a is b for a, b in zip(before, after, strict=True))

    @check_lock
    @track_changes
    def sort(self, key: Callable | None = None, reverse: bool = False) -> None:
        """Sort the tracked list.

        This method sorts the tracked list in place, updating the tracking context
        with the action details. It also updates the indices of tracked child items.

        Args:
            key: A function that serves as a key for the sort comparison.
            reverse: Whether to sort the list in reverse order.

        Example:
            >>> tracked_list = TrackedList([3, 1, 2])
            >>> tracked_list.sort()  # Sort is tracked
            >>> tracked_list.sort(reverse=True)  # Sort is tracked

        """
        before = list(list.__iter__(self))
        super().sort(key=key, reverse=reverse)
        if self._tracking_order_unchanged(before):
            return  # no-op: records nothing
        self._tracking_reindex_child_locations()

        self._tracking_context["action"] = "update"

    @check_lock
    @track_changes
    def reverse(self) -> None:
        """Reverse the tracked list.

        This method reverses the order of items in the tracked list, updating the
        tracking context with the action details. It also updates the indices of
        tracked child items.

        Example:
            >>> tracked_list = TrackedList([1, 2, 3])
            >>> tracked_list.reverse()  # Reverse is tracked

        """
        before = list(list.__iter__(self))
        super().reverse()
        if self._tracking_order_unchanged(before):
            return  # no-op: records nothing
        self._tracking_reindex_child_locations()

        self._tracking_context["action"] = "update"

    def copy(self, untracked: bool = True) -> "list[Any]":
        """Return a copy of the list; this is a read.

        It records no change entry and works on a locked list. The result is always
        a plain ``list``, never tracked. For an independent tracked copy use
        ``copy.copy``, ``copy.deepcopy`` or ``pickle``.

        Args:
            untracked: If True (the default) the copy is deep, with nested tracked
                values converted to plain ``dict``/``list``. If False it is the
                shallow ``list.copy`` result.

        Returns:
            A plain ``list``.

        Example:
            >>> tracked_list = TrackedList([1, 2, 3])
            >>> plain = tracked_list.copy()  # deep plain list
            >>> shallow = tracked_list.copy(untracked=False)  # shallow plain list

        """
        return self._tracking_convert_to_untrackable(self) if untracked else super().copy()

    def _tracking_copy_payload(self) -> Any:
        """Return the items for a copy."""
        return list(list.__iter__(self))

    def _tracking_restore_payload(self, payload: Any) -> None:
        """Fill the list without tracking or conversion."""
        list.extend(self, payload)

    def _tracking_tree_children(self) -> Iterator[tuple[str, Any, bool]]:
        """Yield one ``([index], item, is_last)`` row per item."""
        last = len(self) - 1
        for pos, item in enumerate(self):
            yield f"[{pos}]", item, pos == last
