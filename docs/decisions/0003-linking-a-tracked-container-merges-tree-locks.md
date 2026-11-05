---
title: "ADR-0003: Linking a tracked container merges tree locks"
description: A tracked container stored into another is linked as a child with several parents allowed, and linking merges the two trees onto one lock
date: 2026-11-05
audience:
  - contributors
tags:
  - adr
---

# ADR-0003: Linking a tracked container merges tree locks

## Status

Accepted

## Decision

1. A tracked value (`TrackedDict`, `TrackedList`, `TrackedAttr`) stored into a tracked container is linked as a child if it is not one already, on every store path and whatever `tracking_auto_convert` is set to.
2. A child may have several parents. Each parent forwards the child's changes with its own path. `_tracking_parents` holds weak references to the live parents.
3. A child is locked while any parent locks it. `unlock()` on a parent leaves a child locked while another parent still locks it.
4. A value that would close a cycle (the container itself, or anything holding it below) is stored but not linked.
5. Linking merges the thread locks of the two trees: every node of the connected component ends up on one `RLock`. A lock is only reassigned by a thread that holds both the old and the new lock, and every acquisition re-reads the node's lock after acquiring and retries if it moved.
6. The storing mutators merge before they take their own lock, locking the distinct locks in `id()` order. A store that merging could not see ahead of time (generators, hook-made values) merges inside the mutation, keeping the lock this thread already holds. A thread that already owns both trees' locks gets `RuntimeError` and nothing is linked.
7. Unlinking a child from its last parent gives the connected part a fresh lock, unless it stays connected to the old parent through a shared descendant. The former parents are not split back.

This amends [ADR-0001](0001-tracked-containers-serialize-mutations-with-a-tree-wide-rlock.md): one lock per tree still holds, and a tree can now grow by merging.

## Rationale

- **Reject pre-built children.** Rejected: it breaks code that already stores them, and the change log would still silently lose their changes.
- **Leave them unlinked (the old behavior).** Rejected: forwarding, lock inheritance and tree paths silently do not apply to some children depending on who built them.
- **A per-tree lock with no merge.** Rejected: a child shared by two trees would be mutated under two different locks.
- **One global lock.** Rejected: separate trees would stop running in parallel.
- **Reject cycles.** Rejected: `d["self"] = d` stores fine today; linking it would forward without end, because every hop mints a new change uuid, and `lock()` would recurse forever. Storing without linking keeps today's behavior for that case.

## Consequences

- Breaking change: pre-built children now forward changes, inherit lock state and merge thread locks. Store `x.copy()` or a plain value for the old behavior.
- Merged trees serialise against each other for good.
- A cross-link made through a path the pre-merge cannot see, from two threads at once, can still deadlock. This is the same class of risk as an observer mutating another tree.
- `RLock._is_owned()` is private CPython API; a test pins that it exists.
- A copied or unpickled object has no parent of its own; children inside a copied tree are relinked to the copy ([ADR-0002](0002-copies-of-tracked-containers-are-independent-tracked-objects-with-fresh-history.md)).

## Documentation

- [Storing an already-tracked container](../usage/basics.md#storing-an-already-tracked-container)
- [Threading model](../usage/threading.md)

Issues: #67, #65.
