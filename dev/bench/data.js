window.BENCHMARK_DATA = {
  "lastUpdate": 1793647059109,
  "repoUrl": "https://github.com/endavis/pydatatracker",
  "entries": {
    "Benchmark": [
      {
        "commit": {
          "author": {
            "email": "6662995+endavis@users.noreply.github.com",
            "name": "Eric Davis",
            "username": "endavis"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "ad4ef64c0d00bfca8f892b32badafa0bc8f8170b",
          "message": "chore: migrate to pyproject-template (merges PR #9)\n\n* fix(observers): replace deprecated asyncio.iscoroutinefunction\n\n- Use `inspect.iscoroutinefunction` in `async_queue_observer`; the asyncio\n  alias emits a `DeprecationWarning` on Python 3.14 (slated for removal in\n  3.16), which failed both async-queue tests under `filterwarnings = error`.\n- Keep a reference to the task created for coroutine queues so it cannot be\n  garbage-collected before it runs (ruff RUF006).\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01NXu1sdzAvfEq6Sfm5kBX5t\n\n* refactor: add full type hints to library and tests\n\nPrepares the codebase for the strict ruff ANN rules and mypy configuration\nthat pyproject-template enforces. No runtime behavior or public API changes.\n\n- Annotate observers, tracked containers, decorators, `tracking_actor` and\n  `ChangeLogEntry` helpers; widen `_tracking_format_tree_location` to accept\n  `None`, which it already handled.\n- Fix the `TrackedAttr.__init__` docstring to document the real parameters\n  (`tracking_capture_snapshots`, `tracking_capture_stack`) instead of the\n  nonexistent `tracking_delimiter`.\n- Pass an explicit `encoding=\"utf-8\"` when reading observer config files.\n- Annotate test helpers and fixtures; no assertions changed.\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01NXu1sdzAvfEq6Sfm5kBX5t\n\n* chore: migrate to pyproject-template\n\nAdopt https://github.com/endavis/pyproject-template (commit bed58ba) following\nits migration guide.\n\n- **Tooling**: doit tasks replace the justfile; template ruff, mypy, pytest,\n  coverage (70% gate), vulture, bandit, codespell, mutmut and commitizen config\n  in `pyproject.toml` replace `ruff.toml`; pre-commit, mkdocs, devcontainer and\n  AI-agent config added.\n- **Versioning**: hatch-vcs derives the version from git tags; `_version.py` is\n  now generated and untracked. Releases go through `doit release` /\n  `doit release_tag`.\n- **CI**: template workflows replace the old ci/release/testpypi workflows.\n- **Packaging**: no runtime dependencies (template's `click`/`rich` dropped;\n  `rich` moved to the dev extra for the tooling); skeleton console script\n  removed; `py.typed` added; `pydatatracker.types` made a regular package so\n  mkdocstrings can resolve it.\n- **Tests**: template tooling tests added; skeleton tests removed; benchmarks\n  rewritten against TrackedDict/TrackedList; mutmut selection points at the\n  project tests.\n- **Docs**: architecture and debugging notes moved into the template layout\n  with frontmatter; obsolete `docs/packaging.md` removed; README, index, usage\n  and API reference rewritten for pydatatracker; project overview and\n  observability conventions kept in AGENTS.md.\n- **Template workarounds**: `tools/pyproject_template/configure.py` restored\n  (the package `__init__` imports it after it self-deletes); skeleton paths\n  and substituted worked-example paths listed in\n  `.config/pyproject_template/sync-exclude.toml`.\n\nCloses #8\nFixes #7\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01NXu1sdzAvfEq6Sfm5kBX5t\n\n* fix(changelog): make entry timestamps strictly increasing\n\n`ChangeLogEntry.created_time` came straight from `datetime.now()`. On Windows\nconsecutive entries can share a clock reading, so `changes_since(entry)` also\nreturned earlier entries with the same timestamp (the `init` entry, in the\nWindows CI failure of `test_last_change_and_changes_since`), and sorting by\ntime had ties.\n\n- Add `_next_timestamp()`, which bumps a tied or earlier reading by one\n  microsecond under a lock so every entry's timestamp is unique and ordered.\n- Add a regression test that freezes the clock; it fails without the fix on\n  any platform.\n\nRefs #8\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01NXu1sdzAvfEq6Sfm5kBX5t\n\n* test(exporters): assert the exact HTTP exporter URL\n\n`startswith(\"https://api.example.com\")` was flagged by CodeQL as incomplete URL\nsubstring sanitization. `HttpExporter` passes its URL through unchanged, so\ncompare for equality, which is also the stricter check.\n\nRefs #8\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01NXu1sdzAvfEq6Sfm5kBX5t\n\n* test: assert __version__ matches installed metadata\n\n- Add `tests/test_version.py`, which fails if `pydatatracker.__version__`\n  drifts from `importlib.metadata.version(\"pydatatracker\")`, as it did when\n  `_version.py` was hardcoded to 0.2.0 while 0.1.0 was published (#7). Listed\n  in the mutmut test selection because it imports the package.\n- CHANGELOG: the entries filed under an unreleased \"0.2.0\" shipped in the\n  0.1.0 PyPI release (2025-12-04), so file them there, and record this PR's\n  changes under Unreleased.\n\nRefs #8\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01NXu1sdzAvfEq6Sfm5kBX5t\n\n* test: replace wall-clock snapshot timing test with a deterministic check\n\n`test_snapshot_mode_relative_timing` asserted that 2000 assignments with\nsnapshots on took at least as long as with them off. Under the CI coverage job\n(ubuntu, newest Python) both modes take ~1.75s and runner noise decided the\norder, so it failed intermittently.\n\n- Remove the timing assertion. The off-vs-on cost is measured by\n  `test_bench_trackeddict_default` / `test_bench_trackeddict_snapshots` in\n  `tests/benchmarks/`, which do not gate CI.\n- Add `test_tracked_list_snapshot_opt_in_records_repr`, mirroring the existing\n  TrackedDict test, so snapshot behavior is asserted for both containers.\n\nRefs #8\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01NXu1sdzAvfEq6Sfm5kBX5t\n\n---------\n\nCo-authored-by: Claude Opus 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-02T18:57:06Z",
          "tree_id": "5efbf3ac97690377a66318e57b862ae67afefca8",
          "url": "https://github.com/endavis/pydatatracker/commit/ad4ef64c0d00bfca8f892b32badafa0bc8f8170b"
        },
        "date": 1793645881145,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 261.0811121961923,
            "unit": "iter/sec",
            "range": "stddev: 0.00006116886115184545",
            "extra": "mean: 3.8302272867925393 msec\nrounds: 265"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 114.34957226921166,
            "unit": "iter/sec",
            "range": "stddev: 0.00012802644136501327",
            "extra": "mean: 8.745113603448498 msec\nrounds: 116"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 259.5132273516499,
            "unit": "iter/sec",
            "range": "stddev: 0.00009348799676721513",
            "extra": "mean: 3.8533681315787556 msec\nrounds: 266"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 265.2199712241484,
            "unit": "iter/sec",
            "range": "stddev: 0.00006693578362849439",
            "extra": "mean: 3.770455125925862 msec\nrounds: 270"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "6662995+endavis@users.noreply.github.com",
            "name": "Eric Davis",
            "username": "endavis"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "72c335479734af60df2999d635713dc01d660f9a",
          "message": "chore: record template sync point and keep CHANGELOG hand-written (merges PR #13, addresses #12)\n\n- Record template commit `bed58ba` (the commit the migration copied) as the\n  sync point in `.config/pyproject_template/settings.toml`, via a\n  `manage.py check` pinned to that commit followed by `manage.py sync`.\n  `manage.py check` now has a baseline, and `template-sync` can review the\n  template commits since it. `sync` rewrites the file with only `[template]`;\n  the dropped `[project]` values are also in `pyproject.toml`, which the\n  management scripts fall back to.\n- Set `[tool.commitizen].update_changelog_on_bump = false`. A simulated\n  `cz bump --changelog` deleted the hand-written `[Unreleased]` section and\n  appended generated sections, including a duplicate `v0.1.0`. With the key\n  false, `doit release` renames `[Unreleased]` to the release version and\n  keeps every existing entry.\n\nRefs #12\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sdzAvfEq6Sfm5kBX5t\n\nCo-authored-by: Claude Opus 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-02T19:16:53Z",
          "tree_id": "bc1de5c0018c916e230e42811915802aa33f5df2",
          "url": "https://github.com/endavis/pydatatracker/commit/72c335479734af60df2999d635713dc01d660f9a"
        },
        "date": 1793647058453,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 257.41054451562894,
            "unit": "iter/sec",
            "range": "stddev: 0.00006353001647790563",
            "extra": "mean: 3.884844740458113 msec\nrounds: 262"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 111.17490036495265,
            "unit": "iter/sec",
            "range": "stddev: 0.00028233370572503495",
            "extra": "mean: 8.994836035088053 msec\nrounds: 114"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 258.794645645831,
            "unit": "iter/sec",
            "range": "stddev: 0.00008591291448478952",
            "extra": "mean: 3.8640675795454165 msec\nrounds: 264"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 266.5937521564434,
            "unit": "iter/sec",
            "range": "stddev: 0.00006490234061766139",
            "extra": "mean: 3.751025640740361 msec\nrounds: 270"
          }
        ]
      }
    ]
  }
}