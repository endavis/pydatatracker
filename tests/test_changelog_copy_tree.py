"""Regression tests: ChangeLogEntry.copy must not share its tree or stack (#52)."""

from pydatatracker import TrackedDict
from pydatatracker.utils.changelog import ChangeLogEntry


def test_copy_does_not_share_tree() -> None:
    entry = ChangeLogEntry("uuid-1", capture_stack=False, type="set")
    entry.tree.append("a")
    copied = entry.copy("set", "uuid-2")
    assert copied.tree == ["a"]
    assert copied.tree is not entry.tree
    copied.tree.append("b")
    assert entry.tree == ["a"]


def test_copy_does_not_share_stack() -> None:
    entry = ChangeLogEntry("uuid-1", capture_stack=False, type="set")
    entry.stack = ["frame1"]
    copied = entry.copy("set", "uuid-2")
    assert copied.stack == ["frame1"]
    assert copied.stack is not entry.stack
    copied.stack.append("frame2")
    assert entry.stack == ["frame1"]


def test_nested_change_does_not_leak_into_child_tree() -> None:
    d = TrackedDict({"c": {}}, tracking_auto_convert=True)
    c = d["c"]
    c["x"] = 1
    child_entry = c.tracking_changes()[-1]
    parent_entry = d.tracking_changes()[-1]
    assert len(child_entry.tree) == 1
    assert parent_entry.tree is not child_entry.tree


def test_two_ancestors_each_get_own_tree() -> None:
    d = TrackedDict({"a": {"b": {}}}, tracking_auto_convert=True)
    b = d["a"]["b"]
    b["x"] = 1
    a = d["a"]
    entries = [b.tracking_changes()[-1], a.tracking_changes()[-1], d.tracking_changes()[-1]]
    assert len({id(e.tree) for e in entries}) == 3
    assert len(entries[0].tree) == 1
    assert len(entries[1].tree) == len(entries[0].tree) + 1
    assert len(entries[2].tree) == len(entries[1].tree) + 1
