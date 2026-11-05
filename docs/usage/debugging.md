---
title: Debugging & Observability Cookbook
description: Recipes for actors, snapshots, stack capture and observers when debugging tracked data
audience:
  - users
tags:
  - usage
  - debugging
---

# Debugging & Observability Cookbook

## Capture actors without stack traces
```python
from pydatatracker import TrackedDict, tracking_actor

payload = TrackedDict()
with tracking_actor("importer"):
    payload["status"] = "ready"

print(payload.last_change().actor)  # importer
```

## Enable snapshots and stack traces when needed
```python
payload = TrackedDict(
    tracking_capture_snapshots=True,
    tracking_capture_stack=True,
)
payload["status"] = "ready"
change = payload.last_change()
print(change.extra["data_pre_change"], change.stack)
```

## Observer references
Observers are held by strong reference by default. Pass `weak=True` to
`tracking_add_observer` to hold a bound method (`WeakMethod`) or other callable (`weakref.ref`)
weakly: it is dropped silently once garbage collected, so a weakly registered temporary lambda
with no other reference stops being called. Callables that cannot be weakly referenced are held
strongly. The link a parent registers on each child is weak, so a parent and its children are
freed together without waiting for the cycle collector.

## Collect change events via observers
```python
from pydatatracker import ChangeCollector

collector = ChangeCollector()
payload.tracking_add_observer(collector)

payload["status"] = "ready"
print(collector.as_list())
```

### Telemetry observer
```python
from pydatatracker.observers import telemetry_observer

payload.tracking_add_observer(telemetry_observer())
payload["status"] = "ready"
```

### Log observer
```python
import logging
logger = logging.getLogger("changes")

def log_observer(change):
    logger.info("Change: %s -> %s", change.extra.get("location"), change.extra.get("action"))

payload.tracking_add_observer(log_observer)
payload["status"] = "ready"
```

### JSON observer
```python
import json
from pathlib import Path

def json_observer(change):
    Path("changes.jsonl").write_text(json.dumps(change.extra) + "\n", append=True)

payload.tracking_add_observer(json_observer)
payload["status"] = "ready"
```

## Export change history per request
```python
changes = payload.tracking_changes()
latest = payload.last_change()
recent = payload.changes_since(latest.created_time)
```

## Debug workflow example
1. Wrap the code path in `tracking_actor("job-123")`.
2. Enable snapshots/stacks temporarily via `TrackedDict(tracking_capture_snapshots=True, tracking_capture_stack=True)`.
3. Attach a `ChangeCollector` or custom observer.
4. Re-run the workflow and inspect `collector.as_list()` or `changes_since(...)`.
5. Disable the flags when you’re satisfied with the diagnosis.

## Benchmarking observability costs

Run `just benchmark` to quantify how actors, snapshots, and stack capture affect throughput. Compare modes before enabling diagnostic knobs in production.

## Async observers
Use `async_queue_observer` to forward change dictionaries into an `asyncio.Queue` while continuing to operate in synchronous contexts.
The observer needs a running event loop when the queue's `put` is a coroutine function; without
one it raises a `RuntimeError` before creating any coroutine, after the mutation is committed.
Mutate from inside the loop, or use a plain `queue.Queue`.

## CLI utilities
Use `scripts/cli.py` (or `just cli`) to emit serialized changes from a demo session or show JSONL logs via `show`.

## Export pipelines
Combine observers with exporters (e.g., `JsonLinesExporter`, `HttpExporter`) to persist changes outside of your process.

### Config examples
```json
[
  {"type": "change_collector"},
  {"type": "json_file", "options": {"path": "tmp/change.jsonl"}}
]
```
Load via `load_observers_from_json` and attach to tracked objects.

### Config files are trusted code
`load_observers_from_json` passes each entry to `build_observer_from_config`. For `http_exporter`
(`options.post_callable`), `s3_exporter` (`options.client_callable`) and `kafka_exporter`
(`options.producer_callable`), the dotted path from the config is imported with `import_module`
and `getattr`. Importing a module runs its top-level code. For `s3_exporter` and `kafka_exporter`
the resolved callable is also called while the config loads (the client or producer factory); the
`http_exporter` post callable is called on every export. Loading a config can therefore run
arbitrary code with your process's privileges.

There is no allowlist or validation of the path. Load only config files you wrote or control, never
one built from user input or stored where others can write. `change_collector`, `filtered` and
`logging` do not import by path; `json_file` and `json_lines_exporter` do not either, but they
append to the file path named in the config.

### Observers and exporters run inline
Observers, including `json_file_observer` and every exporter, run synchronously inside the
mutating call, in priority order, while the tree lock is held (see
[Threading — Observers](threading.md#observers)). A slow sink slows every write to that tree and
blocks other threads mutating it.

- `json_file_observer` creates the parent directory, then opens, appends and closes the file for
  every event. `JsonLinesExporter` creates the directory once in its constructor, then opens,
  appends and closes per event.
- `HttpExporter` makes a blocking `post` per event, `S3Exporter` a `put_object` per event and
  `KafkaExporter` a `producer.send` per event.
- An exception from an observer or exporter is raised from the mutation call, after the write is
  committed and every other observer has run (see
  [Observers](basics.md#observers)). A network error in an exporter raises from `d["a"] = 1`
  even though the write happened.

For a slow sink, have the observer only enqueue the change dictionary and export it from a worker
thread:

```python
import queue
import threading

from pydatatracker import TrackedDict
from pydatatracker.exporters import JsonLinesExporter

exporter = JsonLinesExporter("changes.jsonl")
events: queue.Queue[dict[str, object] | None] = queue.Queue()  # unbounded: put never blocks


def worker() -> None:
    while (item := events.get()) is not None:
        try:
            exporter.export(item)
        except Exception as exc:  # nothing else will see this
            print(f"export failed: {exc!r}")


thread = threading.Thread(target=worker, name="change-exporter")
thread.start()

tracked = TrackedDict()
tracked.tracking_add_observer(lambda change: events.put(change.to_dict()))
tracked["a"] = 1

events.put(None)  # sentinel: flush what is queued, then stop
thread.join()
```

- Use an unbounded `queue.Queue()`. A bounded queue's `put` blocks while the tree lock is held and
  can deadlock if the consumer mutates the same tree.
- The worker must catch its own exceptions: they no longer surface from the mutation.
- Send a sentinel and `join` the worker at shutdown, or queued events are lost at exit.

`async_queue_observer` is the asyncio equivalent; see [Async observers](#async-observers).
