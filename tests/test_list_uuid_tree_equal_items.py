"""Regression tests for the list uuid tree with equal items (#56)."""

from pydatatracker import TrackedList


def test_plain_duplicates_tree_works() -> None:
    tree = TrackedList([1, 1])._tracking_known_uuids_tree()
    assert tree


def test_equal_tracked_children_both_listed() -> None:
    tracked = TrackedList([{}, {}], tracking_auto_convert=True)
    tree = tracked._tracking_known_uuids_tree()
    assert len(tree) == 3
    assert "Location: [0]" in tree[1]
    assert "Location: [1]" in tree[2]
    assert len(list(tracked._tracking_tree_children())) == 2


def test_children_labels_and_last_flag() -> None:
    tracked = TrackedList(["a", "b", "a"])
    rows = list(tracked._tracking_tree_children())
    assert rows == [("[0]", "a", False), ("[1]", "b", False), ("[2]", "a", True)]
