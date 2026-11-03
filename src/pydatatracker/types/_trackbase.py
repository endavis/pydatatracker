# Project: bastproxy
# Filename: pydatatracker/types/_trackbase.py
#
# File Description: Holds the TrackBase class for tracking changes to objects.
#
# Docstrings last checked and updated: 12/19/2024
#
# By: Bast
"""Module for monitoring and managing data with tracking capabilities.

This module provides the `TrackBase` class, which allows for the tracking
of changes to objects and the management of relationships between tracked
objects and their children. It includes methods for locking and unlocking
objects, notifying observers of changes, and maintaining a history of
original values, making it a valuable tool for monitoring state changes in
an application.

Key Components:
    - TrackBase: A class that provides a framework for tracking and managing
      changes to objects.
    - Methods for adding, locking, unlocking, and notifying changes to objects.
    - Utility methods for handling object changes, conversions, and tracking.

Features:
    - Automatic conversion of tracked values.
    - Management of parent-child relationships for tracked objects.
    - Notification system for observers when object changes occur.
    - Locking mechanism to prevent modifications to objects.
    - Comprehensive logging of object changes and original values.

Usage:
    - Instantiate TrackBase to create an object that tracks changes.
    - Use `tracking_add_observer` to add an observer to monitor changes.
    - Lock and unlock the object using `lock` and `unlock` methods.
    - Access original values and change logs through provided methods.
    - when modifying an object, create a change log entry using
        `tracking_create_change` to record the change.

Classes:
    - `TrackBase`: Represents a class that can track object changes.

"""

# Standard Library
import datetime
import itertools
import logging
import weakref
from collections import deque
from collections.abc import Callable, Iterable
from functools import wraps
from typing import Any, Literal
from uuid import uuid4

# 3rd Party
# Project
from ..utils.changelog import ChangeLogEntry
from .actor import current_actor

# Resolved on first use: the tracked types import this module, so they cannot
# be imported at module level here.
_trackable_classes: tuple[type, type, type] | None = None


def _load_trackable_classes() -> tuple[type, type, type]:
    """Import and cache the (TrackedDict, TrackedList, TrackedAttr) classes."""
    global _trackable_classes
    from .trackedattributes import TrackedAttr
    from .trackeddict import TrackedDict
    from .trackedlist import TrackedList

    _trackable_classes = (TrackedDict, TrackedList, TrackedAttr)
    return _trackable_classes


def check_lock(method: Callable[..., Any]) -> Callable[..., Any]:
    """Ensure methods are not called on locked objects.

    This decorator wraps a method to check if the instance is locked before
    executing the method. If the instance is locked, it raises a RuntimeError,
    preventing any modifications to the object.

    Args:
        method: The method to be decorated for lock checking.

    Returns:
        The wrapped method that includes lock checking functionality.

    """

    @wraps(method)
    def wrapper(self: Any, *args: Any, **kwargs: Any) -> Any:
        """Check if the instance is locked before executing the method.

        This function is used as a decorator to ensure that a method cannot be called
        if the instance is in a locked state. If the instance is locked, it raises a
        RuntimeError, preventing any modifications to the object.

        Args:
            self: The instance of the class.
            *args: Positional arguments to be passed to the method.
            **kwargs: Keyword arguments to be passed to the method.

        Returns:
            The result of the method if the instance is not locked.

        """
        if hasattr(self, "_tracking_locked") and self._tracking_locked:
            raise RuntimeError(f"{self.__class__.__name__} is locked and cannot be modified.")
        return method(self, *args, **kwargs)

    return wrapper


def track_changes(method: Callable[..., Any]) -> Callable[..., Any]:
    """Track changes made to an object.

    This decorator wraps a method to monitor changes to the object.
    It resets the tracking context, captures the state before and after
    the method execution, and logs any changes, including removed items and
    updates to tracked objects.

    Args:
        method: The method to be decorated for change tracking.

    Returns:
        The wrapped method that includes change tracking functionality.

    """

    @wraps(method)
    def wrapper(self: Any, *args: Any, **kwargs: Any) -> Any:
        """Track changes to the object before and after method execution.

        This function is used as a decorator to monitor changes made to the object
        by capturing its state before and after the method execution. It logs any
        changes, including removed items and updates to tracked objects, ensuring
        that all modifications are recorded and can be retrieved later.

        Args:
            self: The instance of the class.
            *args: Positional arguments to be passed to the method.
            **kwargs: Keyword arguments to be passed to the method.

        Returns:
            The result of the method execution.

        """
        # reset the tracking context
        data_pre_change = None
        if self._tracking_capture_snapshots and self._tracking_is_trackable(self) in [
            "TrackedDict",
            "TrackedList",
        ]:
            data_pre_change = repr(self)

        self._tracking_context = {}

        # Call the original method
        result = method(self, *args, **kwargs)

        # Check if the object has a tracking_context attribute (for tracking changes)
        if self._tracking_context and "action" in self._tracking_context:
            if "removed_items" in self._tracking_context:
                # A removed child still held under another index or key stays
                # linked and is relocated; only children no longer held are unlinked.
                present: dict[str, Any] | None = None
                handled: set[int] = set()
                for olditem in self._tracking_context["removed_items"]:
                    if not self._tracking_is_trackable(olditem) or id(olditem) in handled:
                        continue
                    handled.add(id(olditem))
                    if present is None:
                        present = self._tracking_present_child_locations()
                    uuid = olditem._tracking_uuid
                    if uuid in present:
                        if uuid in self._tracking_child_tracked_items:
                            self._tracking_child_tracked_items[uuid]["location"] = present[uuid]
                        continue
                    if uuid in self._tracking_child_tracked_items:
                        del self._tracking_child_tracked_items[uuid]
                    olditem.tracking_remove_observer(self._tracking_notify_observers)

            if self._tracking_capture_snapshots and self._tracking_is_trackable(self) in [
                "TrackedDict",
                "TrackedList",
            ]:
                self._tracking_context["data_pre_change"] = data_pre_change
                self._tracking_context["data_post_change"] = repr(self)
            self._tracking_context["method"] = method.__name__
            self.tracking_create_change(**self._tracking_context)

        self._tracking_context = {}

        return result

    return wrapper


class _ObserverRef:
    """Holds an observer weakly (or strongly) and resolves it on demand."""

    def __init__(self, observer: Callable[..., Any], weak: bool = False) -> None:
        self._strong: Callable[..., Any] | None = None
        self._weak: weakref.ref[Any] | weakref.WeakMethod[Any] | None = None
        if not weak:
            self._strong = observer
            return
        try:
            if hasattr(observer, "__self__") and hasattr(observer, "__func__"):
                self._weak = weakref.WeakMethod(observer)
            else:
                self._weak = weakref.ref(observer)
        except TypeError:
            # Not weakly referenceable (builtins, some callables): hold strongly.
            self._strong = observer

    def get(self) -> Callable[..., Any] | None:
        """Return the observer, or None if it has been garbage collected."""
        if self._strong is not None:
            return self._strong
        return self._weak() if self._weak is not None else None

    def alive(self) -> bool:
        """Return True while the observer can still be called."""
        return self.get() is not None

    def matches(self, observer: Callable[..., Any]) -> bool:
        """Return True if the referenced observer equals the given one."""
        current = self.get()
        return current is not None and current == observer


class TrackBase:
    """Base class for tracking changes to objects.

    This class provides a framework for tracking and managing changes to objects.
    It includes methods for adding observers, locking and unlocking objects,
    notifying observers of changes, and maintaining a history of changes. It
    supports automatic conversion of values to trackable types and management of
    parent-child relationships for tracked objects.

    """

    _tracking_record_init: bool = True

    def __init__(
        self,
        tracking_name: str | None = None,
        tracking_auto_converted_in: str | None = None,
        tracking_auto_convert: bool = False,
        tracking_parent: "TrackBase | None" = None,
        tracking_location: str | None = "",
        tracking_delimiter: str = "+",
        **kwargs: Any,
    ) -> None:
        """Initialize a new instance of the TrackBase class.

        This constructor sets up the instance by initializing various attributes
        related to tracking, including the tracking name, UUID, observers, and
        context. It also establishes relationships with parent tracked items and
        prepares the instance for monitoring changes.

        Args:
            tracking_name: The name used for tracking the instance.
            tracking_auto_converted_in: The context in which automatic conversion
                occurs.
            tracking_auto_convert: Flag indicating whether to automatically convert
                values.
            tracking_parent: An optional parent instance for establishing a hierarchy.
            tracking_location: The location of the tracked attribute.
            tracking_delimiter: The delimiter used for tracking attribute locations.
            **kwargs: Additional keyword arguments for further customization.
                ``tracking_record_init`` controls whether the ``init`` change entry
                (with the full ``init_data`` repr) is recorded. When omitted it is
                inherited from ``tracking_parent``, else from the class default
                ``_tracking_record_init`` (True).
                ``tracking_max_changes`` caps the change history at that many
                entries (oldest dropped first); ``0`` keeps none. When omitted it
                is inherited from ``tracking_parent``, else history is unbounded
                (None). A child cannot pass None to lift a parent's cap. A
                negative value raises ``ValueError``.

        Returns:
            None

        """
        self._tracking_name = tracking_name
        self._tracking_auto_converted_in = tracking_auto_converted_in
        self._tracking_uuid = uuid4().hex
        self._tracking_observers: dict[int, list[_ObserverRef]] = {}
        self._tracking_context: dict[str, Any] = {}
        self._tracking_change_uuids: set[str] = set()
        self._tracking_locked = False
        self._tracking_auto_convert = tracking_auto_convert
        self._tracking_created = datetime.datetime.now()
        self._tracking_child_tracked_items: dict[str, Any] = {}
        self._tracking_delimiter = tracking_delimiter
        self._tracking_debug_flag = False
        self._tracking_capture_snapshots = kwargs.get("tracking_capture_snapshots", False)
        self._tracking_capture_stack = kwargs.get("tracking_capture_stack", False)
        if tracking_parent is not None:
            self._tracking_capture_snapshots = getattr(
                tracking_parent, "_tracking_capture_snapshots", False
            )
            self._tracking_capture_stack = getattr(
                tracking_parent, "_tracking_capture_stack", False
            )
            self._tracking_record_init = getattr(
                tracking_parent, "_tracking_record_init", type(self)._tracking_record_init
            )
        if kwargs.get("tracking_record_init") is not None:
            self._tracking_record_init = kwargs["tracking_record_init"]
        max_changes: int | None = None
        if tracking_parent is not None:
            max_changes = getattr(tracking_parent, "_tracking_max_changes", None)
        if kwargs.get("tracking_max_changes") is not None:
            max_changes = kwargs["tracking_max_changes"]
        if max_changes is not None and max_changes < 0:
            msg = f"tracking_max_changes must be >= 0 or None, got {max_changes}"
            raise ValueError(msg)
        self._tracking_max_changes = max_changes
        self._tracking_changes: list[ChangeLogEntry] | deque[ChangeLogEntry] = (
            [] if max_changes is None else deque(maxlen=max_changes)
        )
        if "tracking_capture_snapshots" in kwargs:
            self._tracking_capture_snapshots = kwargs["tracking_capture_snapshots"]
        if "tracking_capture_stack" in kwargs:
            self._tracking_capture_stack = kwargs["tracking_capture_stack"]
        if self._tracking_record_init:
            self.tracking_create_change(action="init", init_data=f"{self}")
        self._tracking_convert_all_values()
        # Link after construction so the parent never sees this child's own
        # construction entries.
        if tracking_parent is not None:
            tracking_parent._tracking_add_child_tracked_item(tracking_location, self)

    def _tracking_convert_value(self, value: Any, location: Any = "") -> Any:
        """Convert a value to a trackable type if automatic conversion is enabled.

        This method checks if automatic conversion is enabled for the instance and,
        if so, converts the provided value into a trackable type. It ensures that
        the value is appropriately formatted for tracking purposes, allowing for
        consistent monitoring of changes.

        Args:
            value: The value to be converted to a trackable type.
            location: An optional string indicating the location of the value.

        Returns:
            The converted trackable value, or the original value if no conversion
                is performed.

        """
        if hasattr(self, "_tracking_auto_convert") and self._tracking_auto_convert:
            value = self._tracking_convert_to_trackable(
                value,
                tracking_auto_converted_in=self._tracking_uuid,
                tracking_auto_convert=self._tracking_auto_convert,
                tracking_parent=self,
                tracking_location=location,
            )
        return value

    def _tracking_convert_item(self, value: Any, location: Any = "") -> Any:
        """Convert a value being stored in this container (override hook).

        ``TrackedList`` and ``TrackedDict`` call this for every value they store:
        construction, ``append``, ``insert``, ``extend``, ``+=``, ``__setitem__``
        (including slices), ``update``, ``|=`` and ``setdefault`` (missing key only).
        It runs whatever ``tracking_auto_convert`` is set to. The default delegates
        to ``_tracking_convert_value``.

        A subclass may return a wrapped value or raise (for example ``TypeError``) to
        reject it; a rejected insert leaves the container unchanged. Construction
        calls the hook inside ``TrackBase.__init__``, so a subclass must set any state
        the hook needs before calling ``super().__init__()``.

        Args:
            value: The value being stored.
            location: The index or key the value is stored at.

        Returns:
            The value to store.

        """
        return self._tracking_convert_value(value, location)

    def _tracking_store_item(self, value: Any, location: Any = "") -> Any:
        """Run the conversion hook and link a newly created trackable result as a child.

        A result that is the input object (already tracked) or already a child is not
        linked, so default behavior is unchanged.

        Args:
            value: The value being stored.
            location: The index or key the value is stored at.

        Returns:
            The value to store.

        """
        converted = self._tracking_convert_item(value, location)
        if (
            converted is not value
            and self._tracking_is_trackable(converted)
            and converted._tracking_uuid not in self._tracking_child_tracked_items
        ):
            self._tracking_add_child_tracked_item(location, converted)
        return converted

    def _tracking_store_items(self, pairs: Iterable[tuple[Any, Any]]) -> list[Any]:
        """Store several ``(value, location)`` pairs, undoing child links on failure.

        If the hook raises part way, every child linked since the call began is
        unlinked and the exception is re-raised.

        Args:
            pairs: The ``(value, location)`` pairs to convert.

        Returns:
            The converted values, in order.

        """
        before = set(self._tracking_child_tracked_items)
        converted: list[Any] = []
        try:
            for value, location in pairs:
                converted.append(self._tracking_store_item(value, location))
        except BaseException:
            for uuid in list(self._tracking_child_tracked_items):
                if uuid not in before:
                    self._tracking_remove_child_tracked_item(
                        self._tracking_child_tracked_items[uuid]["item"]
                    )
            raise
        return converted

    def _tracking_debug(self, message: str) -> None:
        """Log a debug message if debugging is enabled.

        This method checks if the debugging flag is set for the instance. If debugging
        is enabled, it logs the provided message using the logging module, including
        a shortened version of the instance's UUID for identification.

        Args:
            message: The debug message to be logged.

        Returns:
            None

        """
        if self._tracking_debug_flag:
            logging.info(f"{self._tracking_uuid[:4]}..{self._tracking_uuid[-4:]} - {message}")

    def _tracking_add_child_tracked_item(
        self, location: str | None, trackable_item: "TrackBase"
    ) -> None:
        """Add a child tracked item to the current instance.

        This method registers a specified child tracked item within the tracking
        structure, allowing it to be monitored for changes. It also ensures that
        the child item inherits the lock state of the parent (the child is only
        locked or unlocked when its state differs, so a matching child records
        nothing) and adds the parent as an observer to the child item.

        Args:
            location: The location of the child item within the tracking structure.
            trackable_item: The child item to be added to the tracking structure.

        Returns:
            None

        """
        self._tracking_child_tracked_items[trackable_item._tracking_uuid] = {
            "location": location,
            "item": trackable_item,
        }
        if self._tracking_locked != trackable_item._tracking_locked:
            if self._tracking_locked:
                trackable_item.lock()
            else:
                trackable_item.unlock()
        trackable_item.tracking_add_observer(self._tracking_notify_observers, weak=True)

    def _tracking_remove_child_tracked_item(self, trackable_item: "TrackBase") -> None:
        """Remove a child tracked item from the current instance.

        This method unregisters a specified child tracked item from the tracking
        structure, ensuring that it is no longer monitored for changes. It also
        removes the parent as an observer from the child item, breaking the
        relationship between the parent and child in the tracking system.

        Args:
            trackable_item: The child item to be removed from the tracking structure.

        Returns:
            None

        """
        self._tracking_child_tracked_items.pop(trackable_item._tracking_uuid, None)
        trackable_item.tracking_remove_observer(self._tracking_notify_observers)

    def _tracking_present_child_locations(self) -> dict[str, Any]:
        """Map each trackable value still held to the location of its first occurrence.

        ``track_changes`` uses this to keep a removed child linked when the same
        object is still held under another index or key. The base implementation
        returns an empty map; containers override it.

        Returns:
            A dict of child ``_tracking_uuid`` to its current location.

        """
        return {}

    def _tracking_convert_all_values(self) -> None:
        """Convert all values of the instance to trackable types.

        This method iterates through all attributes of the instance and converts
        them to trackable types if automatic conversion is enabled. It ensures that
        all values are appropriately formatted for tracking purposes, allowing for
        consistent monitoring of changes. This method should be overridden in any
        subclass.

        Args:
            None

        Returns:
            None

        """
        raise NotImplementedError

    def tracking_add_observer(
        self, observer: Callable, priority: int = 50, weak: bool = False
    ) -> None:
        """Add an observer to the list of observers for tracking changes.

        Observers are notified in the order of their priority, with lower priority
        values notified first.

        By default the observer is held by a strong reference. With ``weak=True`` it is
        held by ``weakref.WeakMethod`` (bound methods) or ``weakref.ref`` (other
        callables), so registering it does not keep it alive; once collected it is
        dropped silently during notification. Callables that cannot be weakly
        referenced fall back to a strong reference. A weakly registered temporary
        lambda with no other reference is dropped. The parent-to-child link between
        tracked objects is registered weakly so parents and children do not form a
        reference cycle.

        An observer that raises does not stop later observers. After all have run, one
        failure is re-raised as is and several are raised as an ``ExceptionGroup``; the
        mutation and its change entry are already committed, so do not retry. Catch
        with ``except*`` when more than one observer may fail.

        Args:
            observer: The callable to be added as an observer.
            priority: The priority level of the observer.
            weak: Hold only a weak reference to the observer.

        Returns:
            None

        """
        entries = self._tracking_observers.setdefault(priority, [])
        if observer == self._tracking_notify_observers:
            return
        if any(entry.matches(observer) for entry in entries):
            return
        entries.append(_ObserverRef(observer, weak=weak))

    def tracking_remove_observer(self, observer: Callable) -> None:
        """Remove an observer from the list of observers for tracking changes.

        Observers are matched by equality, so a bound method removes the entry
        registered from an equal bound method. Dead weak references are pruned too.

        Args:
            observer: The callable to be removed from the list of observers.

        Returns:
            None

        """
        for priority, entries in self._tracking_observers.items():
            self._tracking_observers[priority] = [
                entry for entry in entries if entry.alive() and not entry.matches(observer)
            ]

    def tracking_changes(self, most_recent: int | None = None) -> list[ChangeLogEntry]:
        """Return a copy of the recorded change log entries.

        Args:
            most_recent: Optional number of most recent entries to return.

        Returns:
            A list containing copies of the tracked change log entries.

        """
        if most_recent is None or most_recent >= len(self._tracking_changes):
            return list(self._tracking_changes)
        if most_recent <= 0:
            return []
        skip = len(self._tracking_changes) - most_recent
        return list(itertools.islice(self._tracking_changes, skip, None))

    def last_change(self) -> ChangeLogEntry | None:
        """Return the most recent change or None if no changes exist."""
        return self._tracking_changes[-1] if self._tracking_changes else None

    def changes_since(
        self, since: datetime.datetime | ChangeLogEntry | None
    ) -> list[ChangeLogEntry]:
        """Return changes occurring at or after the provided timestamp.

        Args:
            since: Datetime or ChangeLogEntry whose timestamp defines the lower bound.
                When None, returns all changes.

        Returns:
            A list of changes ordered chronologically.

        """
        if since is None:
            return list(self._tracking_changes)
        threshold = since.created_time if isinstance(since, ChangeLogEntry) else since
        return [entry for entry in self._tracking_changes if entry.created_time >= threshold]

    def _tracking_notify_observers(self, change_log_entry: ChangeLogEntry) -> None:
        """Notify all observers of changes to a tracked object.

        This method iterates through the list of observers, sorted by priority, and
        notifies each observer of the provided change log entry. It ensures that all
        registered observers receive updates about changes, maintaining synchronization
        between the tracked objects and their observers.

        Every live observer runs, in priority order, even when an earlier one raises.
        Only ``Exception`` is collected; a ``BaseException`` such as ``KeyboardInterrupt``
        propagates at once. After the loop, a single failure is re-raised as the original
        exception object and several are raised together as an ``ExceptionGroup`` in run
        order. Each failure gets a note naming the change entry and saying the mutation
        and entry were already committed.

        Args:
            change_log_entry: The change log entry that records changes to an object.

        Returns:
            None

        Raises:
            Exception: The single exception an observer raised.
            ExceptionGroup: Every exception raised, when more than one observer failed.

        """
        failures: list[Exception] = []
        priorities = sorted(self._tracking_observers.keys())
        for priority in priorities:
            entries = self._tracking_observers[priority]
            for entry in list(entries):
                observer = entry.get()
                if observer is None:
                    if entry in entries:
                        entries.remove(entry)
                    continue
                try:
                    observer(change_log_entry)
                except Exception as exc:
                    failures.append(exc)
        if not failures:
            return
        note = (
            f"raised by an observer of change entry {change_log_entry.uuid} "
            f"(action={change_log_entry.extra.get('action')}); the mutation and the "
            "entry were already committed, so do not retry"
        )
        for failure in failures:
            failure.add_note(note)
        if len(failures) == 1:
            raise failures[0]
        raise ExceptionGroup(
            f"{len(failures)} observers raised for change entry {change_log_entry.uuid}",
            failures,
        )

    def tracking_create_change(self, **kwargs: Any) -> None:
        """Create a change log entry for the tracked object.

        This method generates a new change log entry based on the provided keyword
        arguments. It includes details such as the action performed, the state of
        the object before and after the change, and any additional context. The
        change log entry is then added to the list of tracked changes and observers
        are notified.

        Args:
            **kwargs: Additional keyword arguments to include in the change log entry.

        Returns:
            None

        """
        if "locked" not in kwargs:
            kwargs["locked"] = self._tracking_locked
        if "type" not in kwargs:
            kwargs["type"] = self._tracking_is_trackable(self)
        if "actor" not in kwargs:
            kwargs["actor"] = current_actor.get()
        change_log_entry = ChangeLogEntry(
            self._tracking_uuid,
            capture_stack=self._tracking_capture_stack,
            **kwargs,
        )
        change_log_entry.add_to_tree(
            self._tracking_format_tree_location(change_log_entry.extra.get("location", None))
        )
        self._tracking_record_change(change_log_entry)
        self._tracking_notify_observers(change_log_entry)

    def _tracking_record_change(self, change_log_entry: ChangeLogEntry) -> bool:
        """Append an entry to the change history unless it is already recorded.

        Membership is checked against a set of entry UUIDs (O(1)) instead of scanning
        the list; ``ChangeLogEntry.__eq__`` compares UUIDs, so the result is the same.
        All writes to ``_tracking_changes`` go through here to keep both in sync.
        When ``tracking_max_changes`` is set and the history is full, the oldest
        entry (and its uuid) is evicted first.

        Args:
            change_log_entry: The entry to record.

        Returns:
            True if the entry was added, False if it was already recorded.

        """
        if change_log_entry.uuid in self._tracking_change_uuids:
            return False
        if self._tracking_max_changes is not None:
            if self._tracking_max_changes == 0:
                return False
            if len(self._tracking_changes) >= self._tracking_max_changes:
                # The deque drops this entry on append; forget its uuid too so
                # the set stays bounded. An evicted entry can be recorded again.
                self._tracking_change_uuids.discard(self._tracking_changes[0].uuid)
        self._tracking_change_uuids.add(change_log_entry.uuid)
        self._tracking_changes.append(change_log_entry)
        return True

    def _tracking_format_tree_location(self, location: str | None = "") -> dict[str, str]:
        """Format the tree location for a change log entry.

        This method constructs a dictionary representing the location of the tracked
        object within the tracking structure. It includes the type of the object, its
        UUID, and the location within the hierarchy, formatted with the specified
        delimiter. It provides a way to format the information for better organization
        and visualization of tracked attributes.

        Args:
            location: The location of the tracked object within the hierarchy.

        Returns:
            A dictionary containing the type, UUID, and formatted location of the
            tracked object.

        """
        if location is not None:
            return {
                "type": self._tracking_is_trackable(self),
                "uuid": self._tracking_uuid,
                "location": f"{self._tracking_delimiter}{location}",
            }
        return {"type": self._tracking_is_trackable(self), "uuid": self._tracking_uuid}

    def lock(self) -> None:
        """Lock the instance and all child tracked items.

        This method sets the instance to a locked state, preventing modifications
        to its data. It also locks all child tracked items, ensuring that
        their values cannot be changed.

        Args:
            None

        Returns:
            None

        """
        self._tracking_locked = True
        for key in self._tracking_child_tracked_items:
            self._tracking_child_tracked_items[key]["item"].lock()
        self.tracking_create_change(action="lock")

    def unlock(self) -> None:
        """Unlock the instance and all child tracked items.

        This method sets the instance to an unlocked state, allowing modifications
        to its data. It also unlocks all child tracked items, ensuring that their
        values can be changed.

        Args:
            None

        Returns:
            None

        """
        self._tracking_locked = False
        for key in self._tracking_child_tracked_items:
            self._tracking_child_tracked_items[key]["item"].unlock()
        self.tracking_create_change(action="unlock")

    def tracking_get_formatted_updates(self) -> list[str]:
        """Retrieve a formatted list of the most recent changes.

        This method generates a formatted list of the most recent changes to the
        tracked object. It includes detailed information about each change, such as
        the action performed, the state of the object before and after the change,
        and any additional context. The formatted updates provide a comprehensive
        view of the modifications made to the object. It includes a separator for
        clarity and can be useful for logging or displaying the history of changes.

        Args:
            None

        Returns:
            A list of strings containing the formatted updates.

        """
        new_output = []
        for item in itertools.islice(self._tracking_changes, 20):
            new_output.append("--------------------------------------")
            new_output.extend(item.format_detailed())
        new_output.append("--------------------------------------")
        return new_output

    def _tracking_convert_to_trackable(
        self,
        obj: Any,
        tracking_auto_converted_in: str | None = None,
        tracking_auto_convert: bool = False,
        tracking_parent: "TrackBase | None" = None,
        tracking_location: str | None = "",
    ) -> Any:
        """Convert an object to a trackable type if necessary.

        This method checks if the provided object is a dictionary or a list and
        converts it to a `TrackedDict` or `TrackedList` respectively, if it is not
        already trackable. It ensures that the object is appropriately formatted
        for tracking purposes, allowing for consistent monitoring of changes.

        Args:
            obj: The object to be converted to a trackable type.
            tracking_auto_converted_in: The context in which automatic conversion
            occurs.
            tracking_auto_convert: Flag indicating whether to automatically convert
            values.
            tracking_parent: An optional parent instance for establishing a hierarchy.
            tracking_location: The location of the tracked attribute.

        Returns:
            The converted trackable object, or the original object if no conversion
            is performed.

        """
        if isinstance(obj, dict) and not self._tracking_is_trackable(obj):
            from .trackeddict import TrackedDict

            return TrackedDict(
                obj,
                tracking_auto_converted_in=tracking_auto_converted_in,
                tracking_auto_convert=tracking_auto_convert or False,
                tracking_parent=tracking_parent,
                tracking_location=tracking_location,
            )
        if isinstance(obj, list) and not self._tracking_is_trackable(obj):
            from .trackedlist import TrackedList

            return TrackedList(
                obj,
                tracking_auto_converted_in=tracking_auto_converted_in,
                tracking_auto_convert=tracking_auto_convert or False,
                tracking_parent=tracking_parent,
                tracking_location=tracking_location,
            )
        return obj

    def _tracking_is_trackable(
        self, obj: Any
    ) -> Literal["TrackedDict"] | Literal["TrackedList"] | Literal["TrackedAttr"] | Literal[""]:
        """Check if an object is trackable.

        This method determines if the provided object is an instance of a trackable
        type, such as `TrackedDict`, `TrackedList`, or `TrackedAttr`. It returns a
        string representing the type of the trackable object, or an empty string if
        the object is not trackable.

        Args:
            obj: The object to check for trackability.

        Returns:
            A string indicating the type of the trackable object, or an empty string
            if the object is not trackable.

        """
        classes = _trackable_classes
        if classes is None:
            classes = _load_trackable_classes()
        tracked_dict, tracked_list, tracked_attr = classes

        if isinstance(obj, tracked_dict):
            return "TrackedDict"
        elif isinstance(obj, tracked_list):
            return "TrackedList"
        elif isinstance(obj, tracked_attr):
            return "TrackedAttr"
        return ""

    def _tracking_convert_to_untrackable(self, obj: Any) -> Any:
        """Convert a trackable object to its untrackable form.

        This method checks if the provided object is a trackable type, such as
        `TrackedDict` or `TrackedList`, and converts it to its untrackable form.
        It recursively processes the object's elements, ensuring that all nested
        trackable items are also converted to their untrackable forms.

        Args:
            obj: The trackable object to be converted to an untrackable form.

        Returns:
            The untrackable form of the object, or the original object if it is not
            trackable.

        """
        from ..types.trackeddict import TrackedDict
        from ..types.trackedlist import TrackedList

        if self._tracking_is_trackable(obj):
            if isinstance(obj, TrackedDict):
                return {item: self._tracking_convert_to_untrackable(obj[item]) for item in obj}
            if isinstance(obj, TrackedList):
                return [self._tracking_convert_to_untrackable(item) for item in obj]
        return obj
