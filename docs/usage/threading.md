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
- Linking an already-tracked container that has a lock of its own (see
  [Storing an already-tracked container](basics.md#storing-an-already-tracked-container)) merges
  the two trees onto one lock, permanently. The thread that links takes the locks in a fixed
  order before it mutates, and threads waiting on the replaced lock move to the surviving one.
  Merged trees run serially from then on.
- Every mutating call holds the lock from the lock check to the last observer, so the mutation, its
  history entry and its forwarding to parents are one step. Mutations of one tree are serialised.
- Separate trees have separate locks and run in parallel.
- Unlinking a child (pop, delete, overwrite, clear, attribute reassignment) from its last parent
  gives it, and whatever is connected to it, a fresh lock of its own. A child that still has
  another parent, or that stays connected to the old parent through a shared descendant, keeps its
  lock. The former parent's side is never split back into separate locks.

## What is not locked

- Reads and iteration. This includes `tracking_changes()` while another thread mutates: a capped
  history can raise "deque mutated during iteration", just as a plain `dict` can.

## Unsupported

- Re-parenting a container while another thread uses it.
- Linking two trees from two threads at once through a path the call cannot see in advance (a
  generator argument, or a value built by `_tracking_convert_item`) can deadlock, as can an
  observer that does the reverse of another thread (below).

## Observers

Observers run with the tree lock held.

- An observer that mutates another tree while a thread in that tree does the reverse can deadlock.
- An observer that stores a node of its own tree into another tree, while this thread is already
  mutating both, raises `RuntimeError` and links nothing.
- `async_queue_observer` with an `asyncio` queue never blocks. With a bounded sync queue, `put`
  blocks while the lock is held; if the consumer thread mutates the same tree, that deadlocks.

## Copying and pickling

`copy.copy`, `copy.deepcopy` and `pickle` do not carry the lock; the copy gets a fresh one.
