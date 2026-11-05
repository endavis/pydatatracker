---
title: Usage Guide
description: Package usage and development workflows
audience:
  - users
tags:
  - usage
  - getting-started
---

# Usage Guide

This guide covers both package usage and development workflows.

## Package Usage

### Tracking changes to a container

```python
from pydatatracker import TrackedDict

payload = TrackedDict()
payload["status"] = "ready"
payload["status"] = "done"

print(payload.last_change().action)
print(len(payload.tracking_changes()))
```

`TrackedDict`, `TrackedList` and `TrackedAttr` can be nested; changes to children are
reported through the parent, including children assigned after construction.

Constructing a container records a single `init` entry. Converting the initial items,
with or without `tracking_auto_convert`, adds no per-item entries, and a child's own
construction entries are not forwarded to its parent. Assigning a container into a
parent records one `add` or `update` entry on the parent whose value holds the
assigned container. Replacing or deleting a monitored `TrackedAttr` attribute stops
forwarding from the old child, unless the same object is still held under another
monitored attribute.

In-place operators (`list += x`, `list *= n`, `dict |= x`) and slice assignment or
deletion on a `TrackedList` are tracked and respect `lock()`. A slice change is one
`update` entry whose location is `repr(slice)`, for example `slice(0, 2, None)`.

A `TrackedAttr` locked with `lock()` raises `RuntimeError` on assignment to any
monitored attribute, including one added to monitoring after the lock, and stores and
logs nothing. Unmonitored attributes can still be assigned. Locks are not counted: one
`unlock()` (or `unlock(name)`) undoes any number of `lock()` calls.

### Storing an already-tracked container

A `TrackedDict`, `TrackedList` or `TrackedAttr` built elsewhere and stored into a tracked
container becomes a child of it, the same as one the container converts itself. This holds for
every store path (constructor, `__setitem__`, `update`, `|=`, `setdefault`, `append`, `insert`,
`extend`, `+=`, slice assignment, attribute assignment and declared fields), and
whatever `tracking_auto_convert` is set to.

```python
parent = TrackedDict()
child = TrackedDict({"x": 0})
parent["c"] = child
child["x"] = 1  # parent records an entry at "c:x"
```

- **Several parents.** A child can be stored in more than one container. Each forwards the
  change with its own path, so a change reached by two paths in one tree (a diamond) is recorded
  once per path. Removing the child from one parent keeps it linked to the others.
- **Same object twice.** Storing a child that is already a child of the container changes
  nothing; removing one of two copies keeps it linked and relocates it.
- **Locks.** A child is locked while any of its parents locks it. Storing a child into a
  locked container is still rejected. Storing a locked standalone child into an unlocked
  container unlocks it. `unlock()` on one parent leaves the child locked while another parent
  still locks it. For a `TrackedAttr` parent, locking the attribute that holds the child counts.
- **Thread locks.** Linking merges the two trees onto one lock; see [Threading](threading.md).
- **Cycles.** A value that would close a cycle (the container itself, or anything that already
  holds the container below it) is stored but not linked, so it does not forward.
- **Unlinking.** Removing or overwriting the child unlinks it from that parent. A child left
  with no parent gets a lock of its own.

Migration: before this behavior, a pre-built child was stored without being linked. To keep a
snapshot that does not forward, lock or share a thread lock, store `child.copy()` or a plain value.

### Tracking actors

Set a temporary actor when mutating tracked objects to avoid stack inspection overhead:

```python
from pydatatracker import TrackedDict, tracking_actor

tracked = TrackedDict()
with tracking_actor("provisioner"):
    tracked["status"] = "ready"

print(tracked.tracking_changes()[-1].actor)  # => provisioner
```

Snapshots (`tracking_capture_snapshots=True`), stack capture (`tracking_capture_stack=True`),
and actors are all opt-in so the fast path stays lightweight. Enable only the knobs you need for
debugging or auditing.

### Inspecting change history

Each tracked object exposes `tracking_changes()`, `last_change()`, and `changes_since(...)` so
callers can inspect audit history without dipping into private attributes:

```python
changes = tracked.changes_since(first_change)
print([entry.extra["location"] for entry in changes])
```

### Capping change history

By default every change is kept, so a long-running process grows without limit. Pass
`tracking_max_changes` to keep only the newest entries:

```python
items = TrackedList(tracking_max_changes=100)
for i in range(10_000):
    items.append(i)
assert len(items.tracking_changes()) == 100  # the newest entry is last
```

- Children inherit the cap from `tracking_parent` unless they pass their own. A child cannot
  pass `None` to lift a parent's cap.
- `0` keeps no history, but observers still receive every change.
- A negative value raises `ValueError`.
- `tracking_changes()`, `last_change()` and `changes_since()` keep their return types.
- An entry evicted from the history can be recorded again if the same entry is re-submitted,
  because its uuid is dropped from the dedup set to keep memory bounded.

### Copying and pickling

`copy()` is a read: it returns a deep, plain `dict`/`list` snapshot (nested tracked values become
plain containers), records no change entry and works on a locked container.
`copy(untracked=False)` returns the shallow plain `dict.copy` / `list.copy` result.

`copy.copy`, `copy.deepcopy` and `pickle` instead give an independent tracked object:

- A new `_tracking_uuid` and a history of only its own `init` entry (none when
  `tracking_record_init=False`).
- No observers and no parent. It gets a fresh tree lock.
- Configuration (`tracking_auto_convert`, snapshot and stack capture, `tracking_max_changes`,
  delimiter, name) and lock state are kept, including the locked attributes of a `TrackedAttr`.
- `deepcopy` and `pickle` copy the tracked children and relink them, so a change to a copied child
  forwards to the copy only. A child shared by two parents inside the copied tree stays one shared
  child in the copy, linked to both copied parents. A copied child whose other parent is outside
  the copied tree loses that parent.
- `copy.copy` shares the child objects without linking them, so a change to a shared child forwards
  to the original only.
- The constructor is not called on reconstruction, and classes you pickle must be module-level.

See [ADR-0002](../decisions/0002-copies-of-tracked-containers-are-independent-tracked-objects-with-fresh-history.md).

### Declaring monitored fields

Subclass `TrackedAttr` and list the fields to monitor in `_tracking_fields`. Declared fields
are monitored from their first assignment without a `start monitoring` entry, so creating the
object logs nothing; later assignments record `update` entries.

```python
class Account(TrackedAttr):
    _tracking_fields = ("owner", "balance")

    def __init__(self) -> None:
        super().__init__()
        self.owner = "ann"
        self.balance = 0

account = Account()
assert account.tracking_changes() == []
account.balance = 5  # records an "update" entry
```

Declared fields are combined across subclasses (parent fields first). Classes that declare
fields do not record the `init` entry by default. Pass `tracking_record_init=True` (or set
`_tracking_record_init = True` on the class) to keep it, or `tracking_record_init=False` on
`TrackedDict` / `TrackedList` / `TrackedAttr` to drop it. Children inherit the setting from
their parent. `tracking_add_attribute_to_monitor` still records `start monitoring` for
dynamic attributes. You may call it before the attribute is set: the name is registered at
once and the first assignment records `start monitoring`, the same log as setting first.

### Converting items on insert

`TrackedList` and `TrackedDict` call `_tracking_convert_item(value, location)` for every value
they store: construction, `append`, `insert`, `extend`, `+=`, item and slice assignment,
`update`, `|=` and `setdefault` (only when the key is missing). `*=` does not call it, since it
only repeats existing items. The hook runs whatever `tracking_auto_convert` is set to. Override it
to wrap values or to reject them:

```python
from typing import Any

from pydatatracker import TrackedDict, TrackedList


class RecordList(TrackedList):
    def _tracking_convert_item(self, value: Any, location: Any = "") -> Any:
        if isinstance(value, bytes):
            raise TypeError("bytes are not allowed")
        if isinstance(value, str):
            return TrackedDict({"text": value})
        return super()._tracking_convert_item(value, location)


records = RecordList()
records.append("hello")  # stored as TrackedDict({"text": "hello"})
```

A new tracked result is linked as a child, so its changes are forwarded to the container, and so is
a value that is already tracked and returned unchanged (see
[Storing an already-tracked container](#storing-an-already-tracked-container)). If the hook raises, the
insert is rejected and the container (contents, change log and child links) is left unchanged,
including for batch inserts such as `extend` and `update`. Construction calls the hook inside
`TrackBase.__init__`, so set any state the hook needs before calling `super().__init__()`.

### Observers

Register observers to receive every `ChangeLogEntry` as it happens. The bundled
`ChangeCollector` stores entries in memory:

```python
from pydatatracker import ChangeCollector, TrackedDict

tracked = TrackedDict()
collector = ChangeCollector()
tracked.tracking_add_observer(collector)
tracked["mode"] = "debug"

print(collector.as_list()[-1].extra["location"])  # mode
```

Observers are held strongly by default. Pass `weak=True` to `tracking_add_observer` to hold
them weakly (they are dropped silently once garbage collected). The parent-to-child link between
tracked objects is always weak.

Every observer runs, in priority order, even when an earlier one raises. After they have all
run, a single failure is re-raised as the original exception and several are raised together as
an `ExceptionGroup` (catch with `except*`). Each carries a note naming the change entry. The
mutation and its change entry are already committed when this happens, so do not retry it.
`KeyboardInterrupt` and other `BaseException`s propagate at once.

`async_queue_observer` pushes changes onto an `asyncio.Queue`, and `telemetry_observer()` wraps a
Prometheus-compatible counter to increment labels per action. Observer lists can also be defined
in JSON and loaded with `pydatatracker.config.load_observers_from_json`.

### Exporters

Builders in `pydatatracker.exporters` (`JsonLinesExporter`, `HttpExporter`, `S3Exporter`,
`KafkaExporter`) stream serialized change dicts to external systems.

### Demo scripts

- `uv run python scripts/cli.py demo` writes a tracked change to stdout.
- `uv run python scripts/benchmark.py` measures the overhead of the observability options.

See the [Debugging & Observability Cookbook](debugging.md) for more recipes.

### API Documentation

See the [API Reference](../reference/api.md) for complete documentation of all available functions and classes.

---

## Development Workflows

This section is for developers working on the project.

### Quick Reference

```bash
# Run tests (parallel)
doit test

# Run all quality checks
uv run doit check

# Format code
uv run doit format

# Build documentation
uv run doit docs_serve
```

### Available Tasks

Use `doit list` to see all available tasks:

```bash
uv run doit list
```

#### Testing Tasks

```bash
# Run tests with parallel execution
uv run doit test
# per-test output: uv run pytest -n auto -v

# Run tests with coverage report
uv run doit coverage

# Run specific test file
uv run pytest tests/test_example.py -v

# Run specific test function
uv run pytest tests/test_example.py::test_version -v
```

#### Code Quality Tasks

```bash
# Format code (ruff format + ruff check --fix)
uv run doit format

# Check formatting without changes
uv run doit format_check

# Run linting
uv run doit lint

# Run type checking
uv run doit type_check

# Run all checks (format, lint, type check, security, audit, spell, test)
uv run doit check
```

#### Security Tasks

```bash
# Run security scan with bandit
uv run doit security

# Run dependency vulnerability audit
uv run doit audit

# Check for typos
uv run doit spell_check
```

#### Documentation Tasks

```bash
# Serve docs locally with live reload (http://127.0.0.1:8000)
uv run doit docs_serve

# Build static documentation site
uv run doit docs_build

# Deploy documentation to GitHub Pages
uv run doit docs_deploy
```

#### Pre-commit Tasks

```bash
# Install pre-commit hooks
uv run doit pre_commit_install

# Run pre-commit on all files
uv run doit pre_commit_run

# Or run pre-commit directly
uv run pre-commit run --all-files
```

#### GitHub Workflow Tasks

```bash
# Create GitHub issue (interactive - opens $EDITOR with template)
uv run doit issue --type=feature    # For new features
uv run doit issue --type=bug        # For bugs and defects
uv run doit issue --type=refactor   # For code refactoring

# Create GitHub issue (non-interactive - for scripts/AI)
uv run doit issue --type=feature --title="Add export" --body-file=issue.md
uv run doit issue --type=feature --title="Add export" --body="## Problem\n..."

# Create Pull Request (interactive - opens $EDITOR with template)
uv run doit pr

# Create Pull Request (non-interactive - for scripts/AI)
uv run doit pr --title="feat: add export" --body-file=pr.md
uv run doit pr --title="feat: add export" --body="## Description\n..."

# Create draft PR
uv run doit pr --draft
```

Features:
- **Interactive mode**: Opens `$EDITOR` with pre-filled template
- **Auto-detection**: Extracts issue number from branch name (e.g., `feat/42-add-feature`)
- **Validation**: Checks required fields before creating issue/PR
- **Non-interactive mode**: Pass `--body` or `--body-file` for AI agents or scripts

### Pre-commit Hooks

The project includes pre-commit hooks that run automatically before each commit:

- **ruff** - Code formatting and linting (auto-fixes issues)
- **mypy** - Type checking (strict mode)
- **bandit** - Security vulnerability scanning
- **codespell** - Spell checking
- **trailing-whitespace** - Remove trailing whitespace
- **end-of-file-fixer** - Ensure files end with newline
- **check-yaml** - Validate YAML syntax
- **check-toml** - Validate TOML syntax
- **check-merge-conflict** - Detect merge conflict markers
- **detect-private-key** - Prevent committing private keys

Install hooks after cloning:

```bash
doit pre_commit_install
```

`pre_commit_install` also uninstalls any `post-merge`/`post-checkout` hook from an earlier version of
this project (see [Consumer Notes](../template/consumer-notes.md#re-run-doit-pre_commit_install)):
either hook type ran `uv sync --all-extras --dev` automatically after a `git pull` or branch switch,
which meant checking out a branch you had not reviewed could run that branch's dependency set and
build before you looked at it (#1033). `doit check` and `doit test` now warn instead — "`uv.lock`
changed — run: `doit install_dev`" — without failing, so you still get the reminder on a branch
you've chosen to run `doit` on.

## Creating Custom doit Tasks

While the template provides standard tasks (test, lint, format, etc.), you'll likely need application-specific tasks for your project. This section shows patterns for extending `dodo.py`.

### Pattern 1: CLI Wrapper Tasks

If your package provides a CLI, create convenience tasks:

```python
# dodo.py
def task_run_server():
    """Start development server."""
    return {
        "actions": ["uv run pydatatracker server --debug --port 8080"],
        "title": title_with_actions,
    }

def task_init_db():
    """Initialize database."""
    return {
        "actions": [
            "uv run pydatatracker db create",
            "uv run pydatatracker db migrate",
            "uv run pydatatracker db seed-dev",
        ],
        "title": title_with_actions,
    }
```

Usage:
```bash
doit run_server
doit init_db
```

### Pattern 2: Environment-Specific Tasks

For applications with multiple deployment environments:

```python
def task_deploy_dev():
    """Deploy to development environment."""
    return {
        "actions": [
            "uv run pydatatracker validate --env dev",
            "uv run pydatatracker deploy --env dev --auto-approve",
        ],
        "title": title_with_actions,
    }

def task_deploy_prod():
    """Deploy to production (with safety checks)."""

    def check_and_deploy():
        console = Console()

        # Safety check
        response = input("Deploy to PRODUCTION? Type 'yes' to confirm: ")
        if response.lower() != "yes":
            console.print("[red]✗ Deployment cancelled[/red]")
            return False

        # Run deployment
        subprocess.run(
            "uv run pydatatracker deploy --env prod",
            shell=True,
            check=True
        )
        console.print("[green]✓ Deployed to production[/green]")

    return {
        "actions": [check_and_deploy],
        "verbosity": 2,
    }
```

### Pattern 3: Integration Test Tasks

For tests requiring external services (databases, APIs, Docker containers):

```python
def task_test_integration():
    """Run integration tests (requires Docker)."""
    return {
        "actions": [
            # Start services
            "docker-compose up -d postgres redis",
            # Wait for services to be ready
            "sleep 5",
            # Run integration tests
            "pytest tests/integration/ -v --maxfail=1",
            # Cleanup (always runs)
            "docker-compose down || true",
        ],
        "title": title_with_actions,
    }

def task_test_e2e():
    """Run end-to-end tests with full stack."""
    return {
        "actions": [
            "docker-compose -f docker-compose.test.yml up --abort-on-container-exit",
            "docker-compose -f docker-compose.test.yml down -v",
        ],
        "title": title_with_actions,
    }
```

### Pattern 4: Data Processing Tasks

For data pipelines, ETL operations, or batch processing:

```python
def task_process_data():
    """Run data processing pipeline."""
    return {
        "actions": [
            "uv run pydatatracker extract --source api --output tmp/raw.json",
            "uv run pydatatracker transform --input tmp/raw.json --output tmp/clean.json",
            "uv run pydatatracker load --input tmp/clean.json --target postgres",
        ],
        "title": title_with_actions,
    }

def task_backup_data():
    """Backup production database."""
    return {
        "actions": [
            "uv run pydatatracker backup create --env prod --output backups/$(date +%Y%m%d-%H%M%S).sql.gz",
        ],
        "title": title_with_actions,
    }

def task_restore_data():
    """Restore from latest backup."""

    def restore_latest():
        import glob
        backups = sorted(glob.glob("backups/*.sql.gz"), reverse=True)
        if not backups:
            print("No backups found!")
            return False

        latest = backups[0]
        print(f"Restoring from: {latest}")
        subprocess.run(
            f"uv run pydatatracker backup restore --file {latest} --env dev",
            shell=True,
            check=True
        )

    return {
        "actions": [restore_latest],
        "title": title_with_actions,
    }
```

### Pattern 5: Dependency Tasks

Tasks that depend on other tasks completing first:

```python
def task_full_check():
    """Run all quality checks before committing."""
    return {
        "actions": [success_message],  # Run after all deps complete
        "task_dep": [
            "format_check",
            "lint",
            "type_check",
            "test",
            "security",
            "spell_check",
        ],
        "title": title_with_actions,
    }

def task_build_all():
    """Build package and documentation."""
    return {
        "actions": [
            lambda: print("✓ All builds complete!"),
        ],
        "task_dep": ["build", "docs_build"],
        "title": title_with_actions,
    }
```

### Pattern 6: Tasks with Parameters

Create tasks that accept arguments:

```python
def task_deploy():
    """Deploy to specified environment."""

    def deploy_to_env(env):
        console = Console()
        console.print(f"[cyan]Deploying to {env}...[/cyan]")

        # Validate environment
        valid_envs = ["dev", "staging", "prod"]
        if env not in valid_envs:
            console.print(f"[red]Invalid environment: {env}[/red]")
            console.print(f"Valid: {', '.join(valid_envs)}")
            return False

        # Deploy
        subprocess.run(
            f"uv run pydatatracker deploy --env {env}",
            shell=True,
            check=True
        )
        console.print(f"[green]✓ Deployed to {env}[/green]")

    return {
        "actions": [CmdAction(deploy_to_env)],
        "params": [
            {
                "name": "env",
                "short": "e",
                "long": "env",
                "default": "dev",
                "help": "Environment to deploy to (dev, staging, prod)",
            }
        ],
        "title": title_with_actions,
    }
```

Usage:
```bash
doit deploy              # Deploys to dev (default)
doit deploy --env staging # Deploys to staging
doit deploy -e prod      # Deploys to prod
```

### Pattern 7: Monitoring and Validation Tasks

Tasks for checking system health, validating configs, or monitoring:

```python
def task_validate_config():
    """Validate all configuration files."""
    return {
        "actions": [
            "uv run pydatatracker config validate --env dev",
            "uv run pydatatracker config validate --env prod",
        ],
        "title": title_with_actions,
    }

def task_health_check():
    """Check health of all services."""
    return {
        "actions": [
            "curl -f http://localhost:8000/health || echo 'Service down!'",
            "uv run pydatatracker db ping",
            "uv run pydatatracker cache status",
        ],
        "title": title_with_actions,
    }
```

### Pattern 8: Code Generation Tasks

For projects that generate code from schemas, templates, or specs:

```python
def task_generate_models():
    """Generate data models from OpenAPI spec."""
    return {
        "actions": [
            "uv run datamodel-codegen --input api-spec.yaml --output src/pydatatracker/models/",
        ],
        "file_dep": ["api-spec.yaml"],
        "targets": ["src/pydatatracker/models/api.py"],
        "title": title_with_actions,
    }

def task_generate_client():
    """Generate API client from specification."""
    return {
        "actions": [
            "openapi-generator generate -i api-spec.yaml -g python -o generated/client/",
        ],
        "file_dep": ["api-spec.yaml"],
        "title": title_with_actions,
    }
```

### Best Practices for Custom Tasks

1. **Descriptive Names**: Use verb-noun format (e.g., `run_server`, `deploy_prod`, `backup_data`)
2. **Clear Docstrings**: They appear in `doit list` - make them helpful
3. **Use title_with_actions**: Shows what's running during execution
4. **Set Verbosity**: For important tasks, set `"verbosity": 2`
5. **Handle Errors**: Use `|| true` for optional steps, or proper error handling in Python functions
6. **Cleanup After Failures**: Use try/finally or `|| cleanup_command` patterns
7. **Group Related Tasks**: Use task dependencies to compose workflows
8. **Document Parameters**: If using params, document them clearly
9. **Validate Inputs**: Check that required files/configs exist before running
10. **Provide Feedback**: Use Rich console or simple prints to show progress
11. **Print Outside Text Verbatim**: Rich reads a string as markup and replaces emoji shortcodes in it. It drops an unknown tag such as `[tool.x]` and raises `MarkupError` on one like `[/tmp]`. It also drops a backslash before a `[` that opens no tag, and turns `:memo:` into an emoji. `rich.markup.escape()` stops only the tags. So pass text your task did not write, such as a command's output, an exception, a flag value the user typed, a path or a label name, through `verbatim()` from `tools/doit/base.py`, as in `console.print(verbatim(f"Stderr: {stderr}", "red"))`. It returns a `rich.text.Text`, which Rich prints as is. To style only part of a line, join the parts with `Text.assemble(verbatim("= no change", "dim"), verbatim(f" {name}"))`. `tests/template/test_doit_markup_escaping.py` checks `tools/doit/` for command output, exceptions, paths and label data, and rejects `escape()`. It finds them by the names the tasks give them, so add a new name to its `_OUTSIDE_TEXT`. Each task's own tests cover its flag values.

### Example: Complete Custom Task

Here's a complete example combining several patterns:

```python
import os
import subprocess
from pathlib import Path
from rich.console import Console
from doit.action import CmdAction
from doit.tools import title_with_actions

console = Console()

def task_benchmark():
    """Run performance benchmarks and generate report."""

    def run_benchmarks(suite="all"):
        console.print(f"[cyan]Running benchmark suite: {suite}[/cyan]")

        # Validate benchmark suite exists
        benchmark_dir = Path("benchmarks")
        if not benchmark_dir.exists():
            console.print("[red]✗ benchmarks/ directory not found[/red]")
            return False

        # Create output directory
        output_dir = Path("tmp/benchmarks")
        output_dir.mkdir(parents=True, exist_ok=True)

        # Run benchmarks
        cmd = f"uv run pytest benchmarks/test_{suite}.py --benchmark-only --benchmark-json=tmp/benchmarks/results.json"
        result = subprocess.run(cmd, shell=True)

        if result.returncode != 0:
            console.print("[red]✗ Benchmarks failed[/red]")
            return False

        # Generate HTML report
        subprocess.run(
            "uv run pytest-benchmark compare tmp/benchmarks/results.json --html=tmp/benchmarks/report.html",
            shell=True
        )

        console.print("[green]✓ Benchmarks complete[/green]")
        console.print(f"Report: tmp/benchmarks/report.html")

    return {
        "actions": [CmdAction(run_benchmarks)],
        "params": [
            {
                "name": "suite",
                "short": "s",
                "long": "suite",
                "default": "all",
                "help": "Benchmark suite to run (all, api, database, etc.)",
            }
        ],
        "verbosity": 2,
        "title": title_with_actions,
    }
```

Usage:
```bash
doit benchmark                  # Run all benchmarks
doit benchmark --suite api      # Run API benchmarks only
doit list                       # See the task description
```

## Making Changes

1. **Create a branch**:
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make your changes**

3. **Format and check**:
   ```bash
   uv run doit format
   uv run doit check
   ```

4. **Commit** (pre-commit hooks run automatically):
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

5. **Push and create PR**:
   ```bash
   git push -u origin feature/my-feature
   ```

### Running CI Locally

To run the same checks that CI runs:

```bash
# Format check (what CI runs)
doit format_check

# Linting
doit lint

# Type checking
doit type_check

# Tests with coverage
doit coverage
```

### Updating Dependencies

```bash
# Show outdated packages
uv pip list --outdated

# Update dependencies and run tests
uv run doit update_deps

# Or manually:
uv sync --all-extras --dev --upgrade
uv run doit check
```

### Building Documentation

#### Local Development

```bash
# Serve with live reload
doit docs_serve
```

Open http://127.0.0.1:8000 in your browser.

#### Switching to Material Theme

The template includes mkdocs-material but uses ReadTheDocs theme by default. To switch:

1. Edit `mkdocs.yml`
2. Change `name: readthedocs` to `name: material`
3. Uncomment the Material theme features
4. Rebuild docs: `uv run doit docs_build`

#### Deploying to GitHub Pages

```bash
# Build and deploy to gh-pages branch
uv run doit docs_deploy
```

This builds the documentation and pushes to the `gh-pages` branch. Enable GitHub Pages in your repository settings to host it.

### Creating a Release

A release goes through a pull request:

```bash
# Open a release PR (commitizen-powered)
uv run doit release
uv run doit release --prerelease=alpha   # a pre-release for TestPyPI: alpha, beta or rc

# After the PR merges: tag main and push the tag
uv run doit release_tag
```

Notes:
- Versions are derived from git tags via hatch-vcs; no manual edits to `pyproject.toml` or `_version.py` are required.
- Production tags look like `v1.0.0`. Pre-release tags use the PEP 440 form commitizen writes, such as `v1.0.1a0`, and publish to TestPyPI only.

`doit release` will:
1. Verify you're on the main branch
2. Check for uncommitted changes
3. Pull latest changes
4. Validate merge-commit format and issue links
5. Run all quality checks
6. Use commitizen to choose the next version
7. Create a `release/v<version>` branch and update CHANGELOG.md on it (merging prerelease entries)
8. Push the branch and open a PR titled `release: v<version>`

After the PR merges, `doit release_tag` tags `main` with `v<version>` and pushes the tag, which triggers CI/CD to build and publish.

The release workflow, which a production tag triggers, includes:
- ✅ All CI checks (format, lint, type check, tests)
- ✅ Build package artifacts
- ✅ Publish to TestPyPI (for verification)
- ✅ Publish to PyPI (production)

### Environment Configuration

#### Using direnv (Optional)

The project includes `.envrc` for automatic environment setup:

```bash
# Install direnv
uv run doit install_direnv

# Hook into your shell (one-time)
echo 'eval "$(direnv hook bash)"' >> ~/.bashrc
source ~/.bashrc

# Allow direnv in this directory
direnv allow
```

Once configured, direnv automatically:
- Activates the virtual environment
- Sets cache directories (RUFF_CACHE_DIR, MYPY_CACHE_DIR, etc.); uv keeps its default shared cache
- Loads project-specific environment variables

#### Manual Environment Setup

Without direnv:

```bash
# Activate virtual environment
source .venv/bin/activate

# Set cache directories (optional); uv keeps its default shared cache
export RUFF_CACHE_DIR="$(pwd)/tmp/.ruff_cache"
export MYPY_CACHE_DIR="$(pwd)/tmp/.mypy_cache"
export COVERAGE_FILE="$(pwd)/tmp/.coverage"
```

### Troubleshooting

#### Tests Failing

```bash
# Run with verbose output
uv run pytest -vv

# Run without parallel execution
uv run pytest -v

# Clear cache and retry
rm -rf .pytest_cache tmp/
uv run pytest -v
```

#### Type Checking Issues

```bash
# Show detailed error information
uv run mypy --show-error-codes --pretty src/

# Check specific file
uv run mypy src/pydatatracker/core.py
```

#### Pre-commit Hook Failures

```bash
# Skip hooks (only when absolutely necessary)
git commit --no-verify -m "message"

# Update pre-commit hooks
uv run pre-commit autoupdate

# Clear pre-commit cache
uv run pre-commit clean
```

#### Clean Build

```bash
# Deep clean all artifacts
uv run doit cleanup

# Remove virtual environment and reinstall
rm -rf .venv
uv venv
uv sync --all-extras --dev
uv run pre-commit install
```

## Best Practices

### Code Style

- Follow PEP 8 (enforced by ruff)
- Use type hints for all functions
- Write docstrings for public APIs
- Keep functions small and focused

### Testing

- Write tests for all new features
- Maintain test coverage above 80%
- Use descriptive test names
- Test edge cases and error conditions

### Documentation

- Update docstrings when changing functions
- Add examples for new features
- Leave CHANGELOG.md to `doit release`, which writes it from the commit messages
- Keep README.md up to date

### Git Commits

- Use conventional commit messages: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
- Keep commits atomic and focused
- Write clear commit messages
- Reference issues in commits when applicable

## Next Steps

- Check the [API Reference](../reference/api.md) for complete documentation
- Read [CONTRIBUTING.md](https://github.com/endavis/pydatatracker/blob/main/.github/CONTRIBUTING.md) for contribution guidelines
- Review the docs and TODOs in this project to identify improvements
