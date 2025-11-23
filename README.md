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

Package metadata lives in `pyproject.toml` and the canonical version is stored in
`src/pydatatracker/_version.py`. Update both the changelog and tests before cutting a
release.

## Resources

- Contribution rules: see `AGENTS.md`
- Architecture notes: `docs/architecture.md`
- Issue tracker: open issues against the upstream GitHub repository referenced in the
  project URLs.

## Tracking actors

Set a temporary actor when mutating tracked objects to avoid stack inspection overhead::

```python
from pydatatracker import TrackedDict
from pydatatracker.types.actor import tracking_actor

tracked = TrackedDict()
with tracking_actor('provisioner'):
    tracked['status'] = 'ready'

print(tracked.tracking_changes()[0].actor)  # => provisioner
```

Snapshots (`tracking_capture_snapshots=True`), stack capture (`tracking_capture_stack=True`), and actors are all opt-in so the fast path stays lightweight. Enable only the knobs you need for debugging or auditing.
