# Project: bastproxy
# Filename: pydatatracker/types/trackedattributes.py
#
# File Description: Holds a class that monitors attributes
#
# Docstrings last checked and updated: 12/19/2024
#
# By: Bast
"""Module for monitoring and managing attributes with tracking capabilities.

This module provides the `TrackedAttr` class, which allows for the tracking
of changes to attributes and the management of relationships between tracked
attributes and their children. It includes methods for locking and unlocking
attributes, notifying observers of changes, and maintaining a history of
original values, making it a valuable tool for monitoring state changes in
an application.

Key Components:
    - TrackedAttr: A class that extends TrackBase to monitor attribute changes.
    - Methods for adding, locking, unlocking, and notifying changes to attributes.
    - Utility methods for handling attribute changes, conversions, and tracking.

Features:
    - Automatic conversion of tracked attribute values.
    - Management of parent-child relationships for tracked attributes.
    - Notification system for observers when attribute changes occur.
    - Locking mechanism to prevent modifications to specific attributes.
    - Comprehensive logging of attribute changes and original values.

Usage:
    - Instantiate TrackedAttr to create an object that tracks attribute changes.
    - Use `tracking_add_attribute_to_monitor` to start monitoring specific attributes.
    - Lock and unlock attributes using `lock` and `unlock` methods.
    - Access original values and change logs through provided methods.

Classes:
    - `TrackedAttr`: Represents a class that can track attribute changes.

"""

# Standard Library
import contextlib
import sys
from typing import TYPE_CHECKING, Any, ClassVar

# 3rd Party
# Project
from ..types._trackbase import TrackBase, _TreeLockHold, track_changes

if TYPE_CHECKING:
    from ..utils.changelog import ChangeLogEntry

_NOT_SET = object()


class TrackedAttr(TrackBase):
    """Class for tracking and managing changes to attributes.

    This class extends the TrackBase class to provide functionality for monitoring
    changes to attributes, managing parent-child relationships, and handling
    attribute locking and unlocking. It includes methods for adding attributes to
    the monitoring list, notifying observers of changes, and maintaining original
    values of attributes.

    Subclasses can declare their monitored fields up front with the
    ``_tracking_fields`` class variable. Declared fields are monitored from their
    first assignment without recording a ``start monitoring`` entry; later
    assignments record ``update`` entries as usual. Declared fields are unioned
    across the MRO (parent fields first). A class that declares fields defaults to
    not recording the ``init`` entry; pass ``tracking_record_init=True`` or set
    ``_tracking_record_init = True`` on the class to keep it. Attributes added
    with ``tracking_add_attribute_to_monitor`` still record ``start monitoring``;
    their names may be registered before they are set, and the first assignment
    then records ``start monitoring``.

    """

    _tracking_fields: ClassVar[tuple[str, ...]] = ()
    _tracking_declared_fields: ClassVar[tuple[str, ...]] = ()

    def __init_subclass__(cls, **kwargs: Any) -> None:
        """Compute the declared monitored fields for a subclass.

        Args:
            **kwargs: Passed through to the parent implementation.

        """
        super().__init_subclass__(**kwargs)
        declared: list[str] = []
        for klass in reversed(cls.__mro__):
            for name in klass.__dict__.get("_tracking_fields", ()):
                if name not in declared:
                    declared.append(name)
        cls._tracking_declared_fields = tuple(declared)
        if cls.__dict__.get("_tracking_fields") and "_tracking_record_init" not in cls.__dict__:
            cls._tracking_record_init = False

    def __init__(
        self,
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
        """Initialize a TrackedAttr instance.

        This constructor initializes the TrackedAttr instance with the provided
        parameters for automatic conversion, parent tracking, and location tracking.
        It also sets up the base tracking attributes, including the list of attributes
        to monitor, locked attributes, and original values.

        Args:
            tracking_name: Optional name, read back through ``tracking_name``.
            tracking_auto_convert: Whether to automatically convert tracked attribute
                values (default False).
            tracking_parent: The parent TrackBase instance for hierarchical tracking.
            tracking_location: The location identifier for the tracked attribute.
            tracking_capture_snapshots: Whether to capture before/after repr snapshots.
            tracking_capture_stack: Whether to capture stack traces for changes.
            tracking_record_init: Whether to record the ``init`` entry. None
                inherits from the parent, else the class default (False for
                classes that declare ``_tracking_fields``).
            tracking_max_changes: Cap on stored change entries (oldest dropped); None
                inherits from the parent, else unbounded.

        Returns:
            None

        """
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
            tracking_delimiter=".",
        )
        self._tracking_attributes_to_monitor: list[str] = []
        self._tracking_locked_attributes: set[str] = set()
        self._tracking_original_values: dict[str, Any] = {}
        self._tracking_pending_monitor: set[str] = set()
        for name in self._tracking_declared_fields:
            if name in self.__dict__ or hasattr(type(self), name):
                self._tracking_start_declared_field(name, getattr(self, name))

    def _tracking_start_declared_field(self, attribute_name: str, value: Any) -> None:
        """Begin monitoring a declared field without recording an entry.

        Args:
            attribute_name: The declared field name.
            value: The value being assigned; converted when auto-convert is on.

        """
        value = self._tracking_convert_value(value, attribute_name)
        self._tracking_link_stored_value(value, attribute_name)
        object.__setattr__(self, attribute_name, value)
        self._tracking_attributes_to_monitor.append(attribute_name)
        self._tracking_original_values[attribute_name] = value

    def _tracking_is_tracking_attribute(self, attribute_name: str) -> bool:
        """Check if the specified attribute is being tracked.

        This method verifies whether the given attribute name is present in the list
        of attributes being monitored. It returns False if the monitoring list does
        not exist.

        Args:
            attribute_name: The name of the attribute to check.

        Returns:
            True if the attribute is being tracked; otherwise, False.

        """
        if not hasattr(self, "_tracking_attributes_to_monitor"):
            return False
        return attribute_name in self._tracking_attributes_to_monitor

    def _tracking_is_locked_attribute(self, attribute_name: str) -> bool:
        """Check if the specified attribute is locked.

        This method verifies whether the given attribute name is present in the list
        of locked attributes. It returns False if the locked attributes list does
        not exist.

        Args:
            attribute_name: The name of the attribute to check.

        Returns:
            True if the attribute is locked; otherwise, False.

        """
        if not hasattr(self, "_tracking_locked_attributes"):
            return False
        return attribute_name in self._tracking_locked_attributes

    def _tracking_present_child_locations(self) -> dict[str, Any]:
        """Map each trackable monitored value to the first attribute holding it.

        Returns:
            A dict of child ``_tracking_uuid`` to its first monitored attribute name.

        """
        locations: dict[str, Any] = {}
        for name in self._tracking_attributes_to_monitor:
            uuid = getattr(self.__dict__.get(name), "_tracking_uuid", None)
            if uuid is not None and uuid not in locations:
                locations[uuid] = name
        return locations

    def _tracking_locks_child(self, child: TrackBase) -> bool:
        """Return True if the whole object, or an attribute holding ``child``, is locked.

        Args:
            child: One of this instance's children.

        """
        if self._tracking_locked:
            return True
        locked: set[str] = self.__dict__.get("_tracking_locked_attributes") or set()
        return any(self.__dict__.get(name) is child for name in locked)

    def _tracking_release_child(self, old_value: Any) -> None:
        """Unlink a child that is no longer held, or relocate it if still held.

        Args:
            old_value: The value that was replaced or deleted.

        """
        if not self._tracking_is_trackable(old_value):
            return
        uuid = old_value._tracking_uuid
        present = self._tracking_present_child_locations()
        if uuid in present:
            if uuid in self._tracking_child_tracked_items:
                self._tracking_child_tracked_items[uuid]["location"] = present[uuid]
            return
        self._tracking_remove_child_tracked_item(old_value)

    def _tracking_notify_observers(self, change_log_entry: "ChangeLogEntry") -> None:
        """Notify observers of attribute changes.

        This method notifies observers of changes to tracked attributes by creating
        a new change log entry if necessary and updating the tracking context. It
        ensures that any changes to the attributes are communicated to the observers,
        maintaining the integrity of the tracking system.

        Args:
            change_log_entry: The entry in the change log that describes the
                attribute change.

        Returns:
            None

        """
        if (
            change_log_entry.tracked_item_uuid != self._tracking_uuid
            and change_log_entry.tracked_item_uuid in self._tracking_child_tracked_items
        ):
            child = self._tracking_child_tracked_items[change_log_entry.tracked_item_uuid]
            location = child["location"]
            new_change = change_log_entry.copy(change_log_entry.extra["type"], self._tracking_uuid)
            new_change.add_to_tree(self._tracking_format_tree_location(location))
            if "location" in new_change.extra:
                new_change.extra["location"] = (
                    f"{location}{child['item']._tracking_delimiter}{new_change.extra['location']}"
                )
            else:
                new_change.extra["location"] = f"{location}"
            change_log_entry = new_change

        self._tracking_record_change(change_log_entry)
        super()._tracking_notify_observers(change_log_entry)

    def _tracking_start_monitoring(self, attribute_name: str, value: Any) -> None:
        """Convert a monitored attribute's value, store it and log ``start monitoring``.

        Args:
            attribute_name: The monitored attribute name.
            value: The raw value; it is recorded unconverted in the change log.

        """
        converted = self._tracking_convert_value(value, attribute_name)
        self._tracking_link_stored_value(converted, attribute_name)
        super().__setattr__(attribute_name, converted)
        self._tracking_create_change_locked(
            action="start monitoring",
            location=f"{attribute_name}",
            value=value,
        )

    def tracking_add_attribute_to_monitor(self, attribute_name: str) -> None:
        """Add an attribute to the monitoring list.

        If the attribute exists and is not already monitored, it is appended to
        the monitoring list, its value is converted if necessary, and a
        ``start monitoring`` change log entry is created.

        If the attribute is not set yet, its name is registered straight away and
        the first assignment records the same ``start monitoring`` entry (and
        raises ``RuntimeError`` while the whole object is locked). A declared
        field that is still unset is left to its declared path: its first
        assignment records no entry.

        Args:
            attribute_name: The name of the attribute to be monitored.

        Returns:
            None

        """
        with _TreeLockHold(self):
            if attribute_name in self._tracking_attributes_to_monitor:
                return
            if hasattr(self, attribute_name):
                self._tracking_attributes_to_monitor.append(attribute_name)
                self._tracking_start_monitoring(attribute_name, getattr(self, attribute_name))
                return
            if attribute_name in self._tracking_declared_fields:
                return
            self._tracking_attributes_to_monitor.append(attribute_name)
            self._tracking_pending_monitor.add(attribute_name)

    def _tracking_attribute_change(
        self, method: str, attribute_name: str, original_value: Any, new_value: Any
    ) -> None:
        """Handle changes to tracked attributes and log the changes.

        This method is responsible for tracking changes to attributes by comparing
        the original value with the new value. If the values differ, it creates a
        change log entry that captures the details of the update, including the
        method that triggered the change and the state of the attribute before and
        after the change.

        The same object or same-type values whose equality returns True are unchanged.
        A type change, non-boolean equality or failed comparison records an update.

        Args:
            method: The name of the method that triggered the attribute change.
            attribute_name: The name of the attribute that has changed.
            original_value: The original value of the attribute before the change.
            new_value: The new value of the attribute after the change.

        Returns:
            None

        """
        if original_value is _NOT_SET:
            with contextlib.suppress(Exception):
                self._tracking_original_values[attribute_name] = new_value
            return
        if original_value is new_value:
            return
        if type(original_value) is type(new_value):
            with contextlib.suppress(Exception):
                equal = original_value == new_value
                if isinstance(equal, bool) and equal:
                    return
        extra = {
            "data_pre_change": original_value,
            "data_post_change": getattr(self, attribute_name),
        }
        self._tracking_create_change_locked(
            action="update",
            method=method,
            location=f"{attribute_name}",
            value=new_value,
            attribute_locked=self._tracking_is_locked_attribute(attribute_name),
            **extra,
        )

    def _tracking_convert_all_values(self) -> None:
        """Convert all tracked attribute values to their appropriate types.

        This method is intended to process and convert all values of the tracked
        attributes within the instance. It does not apply to this object because
        specific attributes are converted as needed when they are tracked.

        Args:
            None

        Returns:
            None

        """
        pass

    def tracking_get_original_value(self, attribute_name: str) -> Any:
        """Retrieve the original value of a specified tracked attribute.

        This method looks up the original value of the given attribute name from
        the dictionary that stores original values. If the attribute name is not
        found, it returns None.

        Args:
            attribute_name: The name of the attribute whose original value
                is to be retrieved.

        Returns:
            The original value of the specified attribute, or None if the
                attribute does not exist.

        """
        return self._tracking_original_values.get(attribute_name, None)

    @track_changes
    def _tracking_lock_attribute(self, attribute_name: str) -> None:
        """Lock a specified attribute to prevent modifications.

        This method adds the given attribute name to the list of locked attributes,
        ensuring that its value cannot be changed until it is unlocked. If the
        attribute is trackable, it also invokes the lock method on the attribute,
        maintaining the integrity of the tracking system.

        Args:
            attribute_name: The name of the attribute to be locked.

        Returns:
            None

        """
        if not hasattr(self, attribute_name):
            return

        self._tracking_locked_attributes.add(attribute_name)
        value = getattr(self, attribute_name)
        if self._tracking_is_trackable(value):
            value.lock()

        self._tracking_context["action"] = "lock"
        self._tracking_context["attribute_name"] = attribute_name
        self._tracking_context["attribute_locked"] = self._tracking_is_locked_attribute(
            attribute_name
        )

    def _tracking_unlock_attribute(self, attribute_name: str = "") -> None:
        """Unlock a specified attribute to allow modifications.

        This method removes the given attribute name from the list of locked
        attributes, enabling changes to be made to its value. If the attribute is
        trackable, it also invokes the unlock method on the attribute, ensuring
        that the attribute can be modified.

        Args:
            attribute_name: The name of the attribute to be unlocked.

        Returns:
            None

        """
        with _TreeLockHold(self):
            if not hasattr(self, attribute_name):
                return

            if attribute_name in self._tracking_locked_attributes:
                self._tracking_locked_attributes.discard(attribute_name)
                value = getattr(self, attribute_name)
                if self._tracking_is_trackable(value) and not value._tracking_any_parent_locks():
                    value.unlock()

                self._tracking_create_change_locked(
                    action="unlock",
                    attribute_name=attribute_name,
                    attribute_locked=self._tracking_is_locked_attribute(attribute_name),
                )

    @track_changes
    def lock(self, attribute_name: str = "") -> None:
        """Lock specified attributes to prevent modifications.

        This method locks the given attribute or all monitored attributes,
        preventing changes to their values. A locked object raises
        ``RuntimeError`` on assignment to any monitored attribute, including one
        added to monitoring after the lock. Locking is not counted: one
        ``unlock`` undoes any number of ``lock`` calls. It updates the tracking context
        to reflect the locking action, ensuring that data integrity is maintained.

        Args:
            attribute_name: The name of the attribute to be locked.
                If not provided, all monitored attributes will be locked.

        Returns:
            None

        """
        if attribute_name:
            self._tracking_lock_attribute(attribute_name)
        else:
            for attribute in self._tracking_attributes_to_monitor:
                self._tracking_lock_attribute(attribute)
            self._tracking_locked = True

            # self.tracking_create_change(action='lock')
            self._tracking_context["action"] = "lock"

    def unlock(self, attribute_name: str = "") -> None:
        """Unlock specified attributes to allow modifications.

        This method unlocks the given attribute or all monitored attributes,
        enabling changes to their values. It updates the tracking context
        to reflect the unlocking action, ensuring that data integrity is maintained.

        Args:
            attribute_name: The name of the attribute to be unlocked.
                If not provided, all monitored attributes will be unlocked.

        Returns:
            None

        """
        with _TreeLockHold(self):
            if attribute_name:
                self._tracking_unlock_attribute(attribute_name)
            else:
                self._tracking_locked = False
                for attribute in self._tracking_attributes_to_monitor:
                    self._tracking_unlock_attribute(attribute)

                self._tracking_create_change_locked(action="unlock")

    def __setattr__(self, attribute_name: str, value: Any) -> None:
        """Set the value of the specified attribute.

        This method sets the value of the given attribute name. It first checks
        if the attribute is locked, and if so, raises a RuntimeError. It then
        retrieves the original value of the attribute and, if the attribute is
        being tracked, converts the new value if necessary. Finally, it updates
        the attribute value and logs the change if the attribute is being tracked.
        A replaced child stops forwarding its changes unless the same object is
        still held under another monitored attribute.

        Args:
            attribute_name: The name of the attribute to set.
            value: The new value to assign to the attribute.

        Returns:
            None

        Raises:
            RuntimeError: If the attribute is locked, or the whole object is locked
                (``lock()``), and the attribute is monitored. Nothing is stored or
                logged. An unmonitored attribute can still be assigned.

        """
        if attribute_name.startswith("_tracking_"):
            object.__setattr__(self, attribute_name, value)
            return
        monitored = self.__dict__.get("_tracking_attributes_to_monitor")
        if monitored is None or (
            attribute_name not in monitored and attribute_name not in self._tracking_declared_fields
        ):
            object.__setattr__(self, attribute_name, value)
            return
        self._tracking_premerge((value,), {})
        with _TreeLockHold(self):
            self._tracking_setattr_locked(attribute_name, value, monitored)

    def _tracking_setattr_locked(
        self, attribute_name: str, value: Any, monitored: list[str]
    ) -> None:
        """Run ``__setattr__`` for an initialised object with the tree lock held.

        Args:
            attribute_name: The name of the attribute to set.
            value: The new value to assign to the attribute.
            monitored: The list of monitored attribute names.

        """
        if attribute_name not in monitored:
            if attribute_name in self._tracking_declared_fields:
                if self._tracking_locked:
                    raise RuntimeError(
                        f"{self.__class__.__name__}.{attribute_name} is locked and "
                        "cannot be modified."
                    )
                self._tracking_start_declared_field(attribute_name, value)
                return
            object.__setattr__(self, attribute_name, value)
            return

        if self._tracking_is_locked_attribute(attribute_name) or self._tracking_locked:
            raise RuntimeError(
                f"{self.__class__.__name__}.{attribute_name} is locked and cannot be modified."
            )

        try:
            original_value = getattr(self, attribute_name)
        except AttributeError:
            if attribute_name in self._tracking_pending_monitor:
                self._tracking_pending_monitor.discard(attribute_name)
                self._tracking_start_monitoring(attribute_name, value)
                return
            original_value = _NOT_SET

        is_tracking = self._tracking_is_tracking_attribute(attribute_name)
        if is_tracking:
            value = self._tracking_convert_value(value, attribute_name)
            self._tracking_link_stored_value(value, attribute_name)
        super().__setattr__(attribute_name, value)
        if original_value is not value and original_value is not _NOT_SET:
            self._tracking_release_child(original_value)

        if is_tracking:
            self._tracking_attribute_change(
                sys._getframe().f_code.co_name, attribute_name, original_value, value
            )

    def __delattr__(self, attribute_name: str) -> None:
        """Delete an attribute, releasing a monitored attribute's child.

        A deleted monitored child is unlinked (or relocated when the same object is
        still held under another monitored attribute). No change entry is recorded
        and no lock check is made.

        Args:
            attribute_name: The name of the attribute to delete.

        """
        monitored = self.__dict__.get("_tracking_attributes_to_monitor")
        if monitored is None or attribute_name not in monitored:
            object.__delattr__(self, attribute_name)
            return
        with _TreeLockHold(self):
            old_value = self.__dict__.get(attribute_name)
            object.__delattr__(self, attribute_name)
            self._tracking_release_child(old_value)

    def _tracking_known_uuids_tree(
        self, level: int = 0, attribute_name: str = "", emptybar: dict | None = None
    ) -> list:
        """Generate a tree of known UUIDs for tracked attributes.

        This method generates a hierarchical representation of known UUIDs for
        tracked attributes, allowing for easy visualization of the relationships
        between them. It can process a specific attribute or all monitored attributes
        to construct the tree structure.

        Args:
            level: The current level of the tree traversal.
            attribute_name: The name of the attribute to start the traversal from.
            emptybar: A dictionary to track the state of the tree traversal.

        Returns:
            A list of strings representing the tree structure of known UUIDs.

        """
        if emptybar is None:
            emptybar = {}
        known_uuids = []
        if level == 0:
            emptybar[level] = True
            known_uuids.append(f"{self._tracking_is_trackable(self)}:{self._tracking_uuid}")
            level += 1
        if attribute_name:
            emptybar[level] = True
            pre_string = "".join("    " if emptybar[i] else " |  " for i in range(level))
            value = getattr(self, attribute_name)
            known_uuids.append(
                f"{pre_string} |-> Location: {attribute_name} Item: "
                f"{self._tracking_is_trackable(value)}:{value._tracking_uuid}"
            )

            known_uuids.extend(value._tracking_known_uuids_tree(level + 1, emptybar=emptybar))

        else:
            emptybar[level] = False
            left = self._tracking_attributes_to_monitor[:]
            pre_string = "".join("    " if emptybar[i] else " |  " for i in range(level))
            for attribute_name in self._tracking_attributes_to_monitor:
                left.remove(attribute_name)
                if not left:
                    emptybar[level] = True
                try:
                    value = getattr(self, attribute_name)
                except AttributeError:
                    continue
                if self._tracking_is_trackable(value):
                    known_uuids.append(
                        f"{pre_string} |-> Location: {attribute_name} Item: "
                        f"{self._tracking_is_trackable(value)}:{value._tracking_uuid}"
                    )

                    known_uuids.extend(
                        value._tracking_known_uuids_tree(level + 1, emptybar=emptybar)
                    )
        return known_uuids

    def _tracking_format_tree_location(self, location: str | None = None) -> dict[str, str]:
        """Format the tree location for a tracked attribute.

        This method constructs a dictionary that represents the type, UUID, and
        location of the tracked attribute within a hierarchical structure. It
        provides a way to format the information for better organization and
        visualization of tracked attributes.

        Args:
            location: The location identifier for the tracked attribute.

        Returns:
            A dictionary containing the type, UUID, and location of the tracked
            attribute.

        """
        if location is not None:
            return {
                "type": self._tracking_is_trackable(self),
                "uuid": self._tracking_uuid,
                "location": f".{location}",
            }
        return {"type": self._tracking_is_trackable(self), "uuid": self._tracking_uuid}
