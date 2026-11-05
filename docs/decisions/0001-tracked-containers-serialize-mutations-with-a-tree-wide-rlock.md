---
title: "ADR-0001: Tracked containers serialize mutations with a tree-wide RLock"
description: Every tree of tracked containers shares one RLock held for the whole of each mutating call, so concurrent mutation of one tree is safe and reads stay unlocked
date: 2026-11-05
audience:
  - contributors
tags:
  - adr
---

# ADR-0001: Tracked containers serialize mutations with a tree-wide RLock

## Status

Accepted

## Decision

1. Each tree of tracked containers shares one `threading.RLock`, stored in `_tracking_tree_lock` on every node.
2. A root creates its own lock. A child adopts its parent's lock when it is linked, and so does every descendant. An unlinked child gets a fresh lock of its own.
3. Every mutation entry point holds the lock for the whole call: the lock check, the mutation, the `_tracking_context` reset, building the change entry, forwarding it to parents and notifying observers.
4. Reads and iteration are not locked.
5. `copy`, `deepcopy` and `pickle` drop the lock and give the copy a fresh one.

## Rationale

Three options were considered.

- **Per-instance locks.** Rejected: child-to-parent forwarding and parent-to-child `lock()` take locks in opposite orders, which risks deadlock.
- **A call-local context instead of the shared `_tracking_context` attribute.** Rejected: it would touch every reference to the context and still leave a race in history recording and forwarding.
- **One lock per tree.** Chosen. Only one call holds the lock at a time, so `_tracking_context` can stay an instance attribute, and the lock order cannot invert because there is a single lock.

## Consequences

- Concurrent mutation of one tree is serialised; separate trees run in parallel.
- Observers run with the lock held. An observer that mutates another tree while another thread does the reverse can deadlock, and so can a bounded sync queue behind `async_queue_observer`.
- Re-parenting a container while another thread uses it, and a container linked into two trees, are unsupported for concurrent use.
- Each mutation pays for an uncontended RLock acquire; the figures are in the PR for #65.

## Documentation

- [Threading model](../usage/threading.md)

Issue: #65.
