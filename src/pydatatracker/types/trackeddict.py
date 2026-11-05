# Project: bastproxy
# Filename: pydatatracker/types/trackeddict.py
#
# File Description: Holds a dictionary implementation with change tracking.
#
# Docstrings last checked and updated: 12/19/2024
#
# By: Bast
"""A dictionary implementation with change tracking capabilities.

This module provides a dictionary class that extends Python's built-in dict with
comprehensive change tracking functionality. It's designed for applications that need
to monitor and log modifications to dictionary data structures. It includes methods for
locking and unlocking the dictionary, notifying observers of changes, and maintaining a
history of original values, making it a valuable tool for monitoring state changes in
an application.

Key Components:
    - TrackedDict: A class that extends TrackBase and dict to monitor data changes.
    - Methods for adding, locking, unlocking, and notifying changes to data.
    - Utility methods for handling data changes, conversions, and tracking.

Features:
    - Tracks all dictionary modifications (add, update, delete)
    - Supports nested tracking of mutable values
    - Maintains parent-child relationships between tracked objects
    - Provides UUID-based identification of tracked items
    - Implements observer pattern for change notifications
    - Locking mechanism to lock the dictionary and prevent changes.
    - Preserves standard dictionary operations
    - Automatic conversion of tracked data values.
    - Supports conversion between tracked and untracked states

Usage:
    - Instantiate TrackedDict to create a dictionary that tracks value changes.
    - Access original values and change logs through provided methods.

Classes:
    - `TrackedDict`: Represents a class that can track dictionary changes.

"""

# Standard Library
from collections.abc import Hashable
from typing import TYPE_CHECKING, Any, Self

# 3rd Party
# Project
from ._trackbase import TrackBase, check_lock, merges_trees, track_changes

if TYPE_CHECKING:
    from ..utils.changelog import ChangeLogEntry


class TrackedDict(TrackBase, dict):
    """A dictionary class that tracks changes to its items.

    This class extends both TrackBase and Python's built-in dict to provide
    comprehensive change tracking capabilities. It is designed for applications
    that require monitoring and logging modifications to dictionary data structures.
    The class includes methods for locking and unlocking the dictionary, notifying
    observers of changes, and maintaining a history of original values.

    """

    def __init__(
        self,
        *args: Any,
        tracking_name: str | None = None,
        tracking_auto_converted_in: str | None = None,
        tracking_auto_convert: bool = False,
        tracking_parent: "TrackBase | None" = None,
        tracking_location: str | None = "",
        tracking_capture_snapshots: bool | None = None,
        tracking_capture_stack: bool | None = None,
        tracking_record_init: bool | None = None,
        tracking_max_changes: int | None = None,
        **kwargs: Any,
    ) -> None:
        """Initialize the tracked dictionary with optional tracking parameters.

        This constructor initializes the tracked dictionary with optional parameters
        for tracking configuration. It sets up the dictionary and tracking base class
        with the provided arguments.

        Args:
            *args: Positional arguments to initialize the dictionary.
            tracking_name: Optional name for tracking purposes.
            tracking_auto_converted_in: Optional string for auto-conversion context.
            tracking_auto_convert: Boolean flag to enable/disable auto-conversion.
            tracking_parent: Optional parent tracking object.
            tracking_location: Optional string for tracking location context.
            tracking_record_init: Whether to record the ``init`` entry; None inherits.
            tracking_max_changes: Cap on stored change entries (oldest dropped); None
                inherits from the parent, else unbounded.
            **kwargs: Keyword arguments to initialize the dictionary.

        """
        dict.__init__(self, *args, **kwargs)
        tracking_kwargs: dict[str, Any] = {}
        if tracking_capture_snapshots is not None:
            tracking_kwargs["tracking_capture_snapshots"] = tracking_capture_snapshots
        if tracking_capture_stack is not None:
            tracking_kwargs["tracking_capture_stack"] = tracking_capture_stack
        if tracking_record_init is not None:
            tracking_kwargs["tracking_record_init"] = tracking_record_init
        if tracking_max_changes is not None:
            tracking_kwargs["tracking_max_changes"] = tracking_max_changes
        TrackBase.__init__(
            self,
            tracking_auto_converted_in=tracking_auto_converted_in,
            tracking_auto_convert=tracking_auto_convert,
            tracking_parent=tracking_parent,
            tracking_location=tracking_location,
            tracking_name=tracking_name,
            tracking_delimiter=":",
            **tracking_kwargs,
        )

    def _tracking_convert_all_values(self) -> None:
        """Convert all values in the dictionary to tracked objects.

        Iterates through all key-value pairs in the dictionary and converts each value
        to a tracked object if it is not already one. This ensures that all values in
        the dictionary are trackable and can be monitored for changes.

        Values are stored through ``dict.__setitem__`` so construction records no
        per-item change entries; only the container's own ``init`` entry is logged.

        """
        for key, value in list(dict.items(self)):
            dict.__setitem__(self, key, self._tracking_store_item(value, key))

    def _tracking_present_child_locations(self) -> dict[str, Any]:
        """Map each trackable value in the dict to the first key holding it.

        Returns:
            A dict of child ``_tracking_uuid`` to its first key in insertion order.

        """
        locations: dict[str, Any] = {}
        for key, value in dict.items(self):
            uuid = getattr(value, "_tracking_uuid", None)
            if uuid is not None and uuid not in locations:
                locations[uuid] = key
        return locations

    def _tracking_notify_observers(self, change_log_entry: "ChangeLogEntry") -> None:
        """Notify observers of a change in the tracked dictionary.

        This method is called to notify all registered observers about a change in the
        tracked dictionary. It processes the change log entry, updates the tracking
        context, and ensures that the change is propagated to all observers.

        Args:
            change_log_entry: The entry in the change log that describes the
                attribute change.

        """
        if (
            change_log_entry.tracked_item_uuid != self._tracking_uuid
            and change_log_entry.tracked_item_uuid in self._tracking_child_tracked_items
        ):
            new_change = change_log_entry.copy(change_log_entry.extra["type"], self._tracking_uuid)
            new_change.add_to_tree(
                self._tracking_format_tree_location(
                    self._tracking_child_tracked_items[change_log_entry.tracked_item_uuid][
                        "location"
                    ]
                )
            )

            if "location" in new_change.extra:
                delimiter = self._tracking_child_tracked_items[change_log_entry.tracked_item_uuid][
                    "item"
                ]._tracking_delimiter
                location = self._tracking_child_tracked_items[change_log_entry.tracked_item_uuid][
                    "location"
                ]
                new_change.extra["location"] = (
                    f"{location}{delimiter}{new_change.extra['location']}"
                )
            else:
                tracked_item = self._tracking_child_tracked_items[
                    change_log_entry.tracked_item_uuid
                ]
                new_change.extra["location"] = f"{tracked_item['location']}"
            change_log_entry = new_change

        self._tracking_record_change(change_log_entry)
        super()._tracking_notify_observers(change_log_entry)

    @check_lock
    @track_changes
    def __delitem__(self, key: Hashable) -> None:
        """Delete a key-value pair from the dictionary and track the change.

        This method deletes a key-value pair from the dictionary while tracking the
        operation. The tracking context is updated with details about the removed
        item, including its previous value and location.

        Args:
            key: The key to delete from the dictionary.

        Raises:
            KeyError: If the key is not found in the dictionary.

        Example:
            >>> tracked = TrackedDict({'a': 1, 'b': 2})
            >>> del tracked['a']  # Deletion is tracked
            >>> del tracked['c']  # Raises KeyError

        """
        try:
            old_item = self[key]
        except KeyError:
            old_item = None

        if not self._tracking_locked:
            super().__delitem__(key)

        if old_item is not None:
            self._tracking_context.setdefault("removed_items", []).append(old_item)
        self._tracking_context["action"] = "update"
        self._tracking_context["value"] = old_item
        self._tracking_context["location"] = key

    @merges_trees
    @check_lock
    @track_changes
    def __setitem__(self, key: Hashable, value: Any) -> None:
        """Set a key-value pair in the dictionary and track the change.

        This method sets a key-value pair in the dictionary while tracking the
        operation. The tracking context is updated with details about the new or
        updated item, including its value and location.

        Args:
            key: The key to set in the dictionary.
            value: The value to associate with the key.

        Raises:
            TypeError: If the key is of an unhashable type.

        Example:
            >>> tracked = TrackedDict()
            >>> tracked['a'] = 1  # Addition is tracked
            >>> tracked['a'] = 2  # Update is tracked

        """
        action = "update" if key in self else "add"
        old_item: Any = dict.__getitem__(self, key) if action == "update" else None

        if not self._tracking_locked:
            value = self._tracking_store_item(value, key)
            super().__setitem__(key, value)
            if old_item is not None and old_item is not value:
                self._tracking_context.setdefault("removed_items", []).append(old_item)

        self._tracking_context["action"] = action
        self._tracking_context["value"] = value
        self._tracking_context["location"] = key

    @check_lock
    @track_changes
    def pop(self, key: Hashable, default: Any | None = None) -> Any:
        """Remove and return the value for a specified key from the dictionary.

        This method removes the specified key from the dictionary and returns its
        value. If the key is not found, the default value is returned. The removal
        operation is tracked, and the tracking context is updated with details about
        the removed item.

        Args:
            key: The key to remove from the dictionary.
            default: The value to return if the key is not found (default: None).

        Returns:
            The value associated with the key if found, otherwise the default value.

        Raises:
            KeyError: If the key is not found and no default value is provided.

        Example:
            >>> tracked = TrackedDict({'a': 1, 'b': 2})
            >>> value = tracked.pop('a')  # Returns 1 and tracks removal
            >>> value = tracked.pop('c', 3)  # Returns 3, no tracking update

        """
        value = "###^$^@$^$default###^$^@$^"

        if not self._tracking_locked:
            value = super().pop(key, default)

        if value != "###^$^@$^$default###^$^@$^":
            self._tracking_context.setdefault("removed_items", []).append(value)
            self._tracking_context["value"] = value

        self._tracking_context["action"] = "update"
        self._tracking_context["location"] = key
        return value if value != "###^$^@$^$default###^$^@$^" else default

    @check_lock
    @track_changes
    def popitem(self) -> tuple:
        """Remove and return a (key, value) pair from the dictionary.

        This method removes and returns a (key, value) pair from the dictionary. The
        removal operation is tracked, and the tracking context is updated with details
        about the removed item.

        Returns:
            A tuple containing the key and value of the removed item.

        Raises:
            KeyError: If the dictionary is empty.

        Example:
            >>> tracked = TrackedDict({'a': 1, 'b': 2})
            >>> key, value = tracked.popitem()  # Removes and returns a pair
            >>> key, value = tracked.popitem()  # Removes and returns another pair

        """
        key, value = "###^$^@$^$default###^$^@$^", "###^$^@$^$default###^$^@$^"

        if not self._tracking_locked:
            key, value = super().popitem()

        self._tracking_context["action"] = "remove"
        if value != "###^$^@$^$default###^$^@$^":
            self._tracking_context.setdefault("removed_items", []).append(value)
            self._tracking_context["value"] = value

        if key != "###^$^@$^$default###^$^@$^":
            self._tracking_context["location"] = key

        return key, value

    @merges_trees
    @check_lock
    @track_changes
    def update(self, *args: Any, **kwargs: Any) -> None:
        """Update dictionary with elements from iterable of key/value pairs.

        This method updates the tracked dictionary with key-value pairs from another
        dictionary or an iterable of key-value pairs. The update operation is tracked,
        and the tracking context is updated with details about the added or updated
        items.

        Args:
            *args: Positional arguments containing dictionaries or iterables of
                key-value pairs to update the dictionary with.
            **kwargs: Keyword arguments representing key-value pairs to update the
                dictionary with.

        Example:
            >>> tracked = TrackedDict({'a': 1})
            >>> tracked.update({'b': 2})  # Updates with new key-value pair
            >>> tracked.update(a=3)  # Updates existing key-value pair

        """
        removed_items: list[Hashable] = []
        transformed_data: dict[Hashable, Any] = {}
        if not self._tracking_locked:
            incoming = dict(*args, **kwargs)
            converted_values = self._tracking_store_items(
                (value, key) for key, value in incoming.items()
            )
            for key, converted in zip(incoming, converted_values, strict=True):
                if key in self and self[key] is not converted:
                    removed_items.append(self[key])
                transformed_data[key] = converted
            super().update(transformed_data)

        self._tracking_context["action"] = "update"
        self._tracking_context["removed_items"] = removed_items
        self._tracking_context["value"] = transformed_data

    @merges_trees
    @check_lock
    @track_changes
    def setdefault(self, key: Hashable, default: Any | None = None) -> Any:
        """Set a default value for a key if it is not already in the dictionary.

        This method sets a default value for a specified key if the key is not already
        present in the dictionary. The operation is tracked, and the tracking context
        is updated with details about the default value and the return value.

        Args:
            key: The key to check in the dictionary.
            default: The default value to set if the key is not found.

        Returns:
            The value associated with the key if it exists, otherwise the default value.

        Raises:
            TypeError: If the key is of an unhashable type.

        Example:
            >>> tracked = TrackedDict({'a': 1})
            >>> value = tracked.setdefault('b', 2)  # Sets default and tracks
            >>> value = tracked.setdefault('a', 3)  # Returns existing value

        """
        original_default = default

        if not self._tracking_locked:
            if key not in self:
                default = self._tracking_store_item(default, key)
            default = super().setdefault(key, default)

        self._tracking_context["action"] = "update"
        self._tracking_context["location"] = key
        self._tracking_context["default"] = original_default
        self._tracking_context["return_value"] = default
        return default

    @check_lock
    @track_changes
    def clear(self) -> None:
        """Clear all items from the dictionary and track the operation.

        This method removes all key-value pairs from the dictionary. The clear
        operation is tracked, and the tracking context is updated with details
        about the removed items.

        Raises:
            RuntimeError: If the dictionary is locked and cannot be modified.

        Example:
            >>> tracked = TrackedDict({'a': 1, 'b': 2})
            >>> tracked.clear()  # Clears all items and tracks the operation

        """
        if not self._tracking_locked:
            for item in self:
                self._tracking_context.setdefault("removed_items", []).append(self[item])

            super().clear()

        self._tracking_context["action"] = "remove"

    def copy(self, untracked: bool = True) -> dict:
        """Return a copy of the dictionary; this is a read.

        It records no change entry and works on a locked dictionary. The result is
        always a plain ``dict``, never tracked. For an independent tracked copy use
        ``copy.copy``, ``copy.deepcopy`` or ``pickle``.

        Args:
            untracked: If True (the default) the copy is deep, with nested tracked
                values converted to plain ``dict``/``list``. If False it is the
                shallow ``dict.copy`` result.

        Returns:
            A plain ``dict``.

        Example:
            >>> tracked = TrackedDict({'a': 1})
            >>> plain = tracked.copy()  # deep plain dict
            >>> shallow = tracked.copy(untracked=False)  # shallow plain dict

        """
        return self._tracking_convert_to_untrackable(self) if untracked else super().copy()

    def _tracking_copy_payload(self) -> Any:
        """Return the items for a copy."""
        return list(dict.items(self))

    def _tracking_restore_payload(self, payload: Any) -> None:
        """Fill the dictionary without tracking or conversion."""
        dict.update(self, payload)

    def _tracking_known_uuids_tree(
        self, level: int = 0, emptybar: dict[int, bool] | None = None
    ) -> list[str]:
        """Generate a list of known UUIDs in a tree structure.

        This method generates a list of known UUIDs for tracked items in the
        dictionary, formatted as a tree structure. It helps visualize the
        hierarchy and relationships between tracked items.

        Args:
            level: The current depth level in the tree.
            emptybar: A dictionary tracking whether to show empty bars at each
                level.

        Returns:
            A list of strings representing the formatted UUID tree structure.

        """
        if emptybar is None:
            emptybar = {}
        known_uuids: list[str] = []
        if level == 0:
            emptybar[level] = True
            known_uuids.append(f"{self._tracking_is_trackable(self)}:{self._tracking_uuid}")
            level += 1
        emptybar[level] = False
        pre_string = "".join("    " if emptybar[i] else " |  " for i in range(level))
        self._tracking_known_uuids_tree_helper(known_uuids, emptybar, level, pre_string)
        return known_uuids

    def _tracking_known_uuids_tree_helper(
        self,
        known_uuids: list[str],
        emptybar: dict[int, bool],
        level: int,
        pre_string: str,
    ) -> None:
        """Help method to generate a list of known UUIDs in a tree structure.

        This helper method assists in generating a list of known UUIDs for tracked
        items in the dictionary, formatted as a tree structure. It helps visualize
        the hierarchy and relationships between tracked items.

        Args:
            known_uuids: The list to append the formatted UUID strings to.
            emptybar: A dictionary tracking whether to show empty bars at each
                level.
            level: The current depth level in the tree.
            pre_string: The prefix string for formatting the tree structure.

        """
        left = list(self.keys())
        for key in self:
            left.remove(key)
            if not left:
                emptybar[level] = True
            if self._tracking_is_trackable(self[key]):
                known_uuids.append(
                    f"{pre_string} |-> "
                    f"Location: ['{key}'] "
                    f"Item: {self._tracking_is_trackable(self[key])}:"
                    f"{self[key]._tracking_uuid}"
                )
                known_uuids.extend(
                    self[key]._tracking_known_uuids_tree(level + 1, emptybar=emptybar)
                )

    def __ior__(  # type: ignore[misc]  # pyright: ignore[reportIncompatibleMethodOverride]
        self, other: Any
    ) -> Self:
        """In-place OR operation (``|=``) override for TrackedDict.

        Delegates to :meth:`update`, so it records one ``update`` change, converts and
        links new children, unlinks replaced ones, and raises ``RuntimeError`` when
        locked.

        Args:
            other: A mapping or an iterable of key/value pairs.

        Returns:
            This dictionary.

        Example:
            >>> tracked_dict = TrackedDict({'a': 1})
            >>> tracked_dict |= {'b': 2}  # Tracked as an update

        """
        self.update(other)
        return self

    def _tracking_format_tree_location(self, location: str | int | None = None) -> dict:
        """Format the tree location for tracking purposes.

        This method formats the location of a tracked item in the dictionary as a
        dictionary containing the type, UUID, and location of the item. It helps
        in visualizing and managing the hierarchy and relationships between tracked
        items.

        Args:
            location: The location of the tracked item in the dictionary.

        Returns:
            A dictionary containing the type, UUID, and location of the tracked item.

        """
        if location is not None:
            return {
                "type": self._tracking_is_trackable(self),
                "uuid": self._tracking_uuid,
                "location": f"[{location!r}]",
            }
        return {"type": self._tracking_is_trackable(self), "uuid": self._tracking_uuid}
