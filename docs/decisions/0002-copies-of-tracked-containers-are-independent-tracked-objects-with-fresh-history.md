---
title: "ADR-0002: Copies of tracked containers are independent tracked objects with fresh history"
description: Copy, deepcopy and pickle of a tracked container build an independent tracked object with a new uuid, fresh history, no observers and a fresh lock, and copy() is a read
date: 2026-11-05
audience:
  - contributors
tags:
  - adr
---

# ADR-0002: Copies of tracked containers are independent tracked objects with fresh history

## Status

Accepted

## Decision

1. `copy()` on `TrackedDict` and `TrackedList` is a read. It records no change entry and works on a locked container. The default stays a deep, plain (untracked) result; `copy(untracked=False)` returns the shallow `dict.copy` / `list.copy` result, also plain.
2. `copy.copy`, `copy.deepcopy` and `pickle` share one path in `TrackBase`: `__getstate__` returns the attributes (minus runtime identity and history), the contents and the linked children; `__setstate__` rebuilds from that.
3. The result is an independent tracked object: a new uuid, a history holding only its own `init` entry (none when `tracking_record_init` is off), no observers, no parent link, and a fresh tree lock.
4. Configuration and lock state (including locked attributes of a `TrackedAttr`) are kept as data. `lock()` and `unlock()` are never called on reconstruction.
5. `__init__` is not called on reconstruction, so subclasses with required constructor parameters work. Pickled classes must be module-level.
6. `copy.deepcopy` and `pickle` copy the tracked children and relink them to the copy, which forwards their changes. `copy.copy` shares the child objects without linking them, so their changes forward to the original only.
7. `_tracking_remove_child_tracked_item` ignores an item that is not a child of the container, so it no longer replaces the tree lock of an item that belongs elsewhere.

## Rationale

- **Keep the original's uuid and history in a pickle.** Rejected: two live objects would share one identity, and observers (weak references) cannot be pickled anyway.
- **Link the children of a shallow copy.** Rejected: that is a child with two parents, which needs a multi-parent design (#89), and it would re-point the child's tree lock to the copy's lock and break the original's lock invariant.
- **Restore lock state by calling `lock()`.** Rejected: it adds change entries beyond the single `init`, and it cannot reproduce mixed states such as a locked child under an unlocked parent.
- **Reconstruct through `__init__`.** Rejected: subclasses may require or add constructor parameters, and `__init__` would re-run conversion and side effects.

## Consequences

- `copy()` no longer logs a `copy` entry and no longer raises on a locked container.
- A shallow copy shares its children with the original, so its own children's changes do not reach the copy.
- A whole-tree `deepcopy` is not atomic against concurrent mutation; each node is read under its own tree lock.

## Documentation

- [Basics: copying and pickling](../usage/basics.md#copying-and-pickling)
- [Threading model](../usage/threading.md#copying-and-pickling)

Issue: #66.
