---
title: Threading
description: How tracked containers behave under concurrent use, what the tree-wide lock guards, and what it does not
audience:
  - users
  - contributors
tags:
  - usage
  - threading
---

# Threading

Concurrent mutation of one tree of tracked containers is safe. The choice is recorded in
[ADR-0001](../decisions/0001-tracked-containers-serialize-mutations-with-a-tree-wide-rlock.md).

## The model

- Each tree shares one `threading.RLock`. A root owns it; a child adopts its parent's lock when it
  is linked, and so does everything under it.
- Every mutating call holds the lock from the lock check to the last observer, so the mutation, its
  history entry and its forwarding to parents are one step. Mutations of one tree are serialised.
- Separate trees have separate locks and run in parallel.
- Unlinking a child (pop, delete, overwrite, clear, attribute reassignment) gives it, and its
  descendants, a fresh lock of its own.

## What is not locked

- Reads and iteration. This includes `tracking_changes()` while another thread mutates: a capped
  history can raise "deque mutated during iteration", just as a plain `dict` can.

## Unsupported

- Re-parenting a container while another thread uses it.
- A container linked into two trees.

## Observers

Observers run with the tree lock held.

- An observer that mutates another tree while a thread in that tree does the reverse can deadlock.
- `async_queue_observer` with an `asyncio` queue never blocks. With a bounded sync queue, `put`
  blocks while the lock is held; if the consumer thread mutates the same tree, that deadlocks.

## Copying and pickling

`copy.copy`, `copy.deepcopy` and `pickle` do not carry the lock; the copy gets a fresh one.

Each node is read under its tree lock, but a whole-tree `deepcopy` is not atomic against
concurrent mutation of the tree. See [Copying and pickling](basics.md#copying-and-pickling) and
[ADR-0002](../decisions/0002-copies-of-tracked-containers-are-independent-tracked-objects-with-fresh-history.md).
