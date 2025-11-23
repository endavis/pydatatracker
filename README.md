# PyDataTracker

Utilities for building Python applications that require detailed state tracking. The
package exposes tracked dictionary/list/attribute containers plus change-log helpers
that make it easy to monitor modifications made while composing complex data payloads.

## Why this project?

- **State awareness** – record every mutation to your domain objects
- **Composable types** – nest tracked containers or regular Python types
- **Observer-friendly** – emit structured change logs for audit pipelines

## Project layout

```
.
├── AGENTS.md          # Unified contributor instructions
├── docs/              # Design notes & future specs
├── src/pydatatracker  # Library code (tracked containers and utilities)
├── tests/             # Pytest suite
├── tmp/               # Scratch directory (ignored, safe for experiments)
├── justfile           # Repeatable task runner configured for uv
└── pyproject.toml     # Build metadata + tooling config
```

## Installation

```bash
pip install pydatatracker
```

## Getting started

1. Create and activate a virtual environment managed by `uv`:
   ```bash
   just install
   ```
2. Run the test-suite:
   ```bash
   just test
   ```
3. Keep formatting and linting consistent:
   ```bash
   just format
   just lint
   ```

## Development workflow

- Use Python 3.12+ with modern type hints and the `@override` decorator.
- Maintain ≥69% test coverage; prefer `uv run pytest` or `just coverage` when
  validating complex changes.
- Formatting is handled by Black (line length 100). Ruff enforces lint rules.
- Temporary scratch work should live in `tmp/` so the project root stays clean.

## Releasing

- Update `CHANGELOG.md` and `src/pydatatracker/_version.py`.
- Run `just test` and `just publish` (requires `PYPI_TOKEN`).
- See `docs/packaging.md` for the full checklist.

## Resources

- Contribution rules: see `AGENTS.md`
- Architecture notes: `docs/architecture.md`
- Debugging cookbook: `docs/debugging.md`
- Issue tracker: open issues against the upstream GitHub repository referenced in the
  project URLs.

## Tracking actors

Set a temporary actor when mutating tracked objects to avoid stack inspection overhead::

```python
from pydatatracker import TrackedDict, tracking_actor

tracked = TrackedDict()
with tracking_actor('provisioner'):
    tracked['status'] = 'ready'

print(tracked.tracking_changes()[0].actor)  # => provisioner
```

Snapshots (`tracking_capture_snapshots=True`), stack capture (`tracking_capture_stack=True`), and actors are all opt-in so the fast path stays lightweight. Enable only the knobs you need for debugging or auditing.

## Inspecting change history

Each tracked object exposes `tracking_changes()`, `last_change()`, and `changes_since(...)` so callers can safely inspect audit history without dipping into private attributes. For example:

```python
changes = tracked.changes_since(first_change)
print([entry.extra["location"] for entry in changes])
```

## Observers

Register observers to receive every `ChangeLogEntry` as it happens. The bundled `ChangeCollector` stores entries in memory:

```python
from pydatatracker import ChangeCollector, TrackedDict

tracked = TrackedDict()
collector = ChangeCollector()
tracked.tracking_add_observer(collector)
tracked["mode"] = "debug"

print(collector.as_list()[-1].extra["location"])  # mode
```

You can also register custom observers; e.g., a simple logger:

```python
import logging
logger = logging.getLogger("pydatatracker")

def log_observer(change):
    logger.info("changed %s via %s", change.extra.get("location"), change.extra.get("action"))

tracked.tracking_add_observer(log_observer)
```

## Benchmarks

Use `just benchmark` to measure the overhead of observability features. Sample output:

```
Benchmark results (5000 mutations, 5 runs)
  base     mean=1.05s stdev=0.03s
  actor    mean=1.01s stdev=0.04s
  snapshot mean=4.52s stdev=0.22s
  full     mean=4.25s stdev=0.18s
```
