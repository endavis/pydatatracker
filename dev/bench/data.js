window.BENCHMARK_DATA = {
  "lastUpdate": 1793654838146,
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
          "id": "909b3bdd7d660edfba89f95dbf639b3bea0500ce",
          "message": "docs: replace placeholder contact email in SECURITY.md and CODE_OF_CONDUCT.md (merges PR #15, addresses #14)\n\nThe configurator filled both contact addresses from the maintainer email,\nwhich was unset, so they kept the template placeholder\n`your.email@example.com`. Use `endavis.github@endavis.net`.\n\nRefs #14\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sdzAvfEq6Sfm5kBX5t\n\nCo-authored-by: Claude Opus 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-02T19:22:06Z",
          "tree_id": "c77f4f545018b8adcc68456cc3d501900a5571ac",
          "url": "https://github.com/endavis/pydatatracker/commit/909b3bdd7d660edfba89f95dbf639b3bea0500ce"
        },
        "date": 1793647372954,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 461.48410112584907,
            "unit": "iter/sec",
            "range": "stddev: 0.00030475256385545694",
            "extra": "mean: 2.166921888663928 msec\nrounds: 494"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 212.237432589946,
            "unit": "iter/sec",
            "range": "stddev: 0.00041142090507310377",
            "extra": "mean: 4.711704188073425 msec\nrounds: 218"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 489.9799046188481,
            "unit": "iter/sec",
            "range": "stddev: 0.000026107490297648245",
            "extra": "mean: 2.0409000258447185 msec\nrounds: 503"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 493.56698260156105,
            "unit": "iter/sec",
            "range": "stddev: 0.0000387068494922279",
            "extra": "mean: 2.0260674543687296 msec\nrounds: 515"
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
          "id": "9cb5ca5a0a3492af11de5c74cc12c038e5ec35d9",
          "message": "chore: synchronize with pyproject-template f85f7a6 (merges PR #18, addresses #17)\n\nSyncs the following template improvements (bed58ba...f85f7a6):\n- endavis/pyproject-template#1181 (configure.py no longer deletes itself\n  while `__init__` and manage.py still import it)\n- endavis/pyproject-template#1182 (doc-path test exempts worked-example\n  modules in any package name via `ALLOWED_PATTERNS`)\n- endavis/pyproject-template#1183 (configurator prints the migration guide's\n  step 6 cleanup during a migration)\n- endavis/pyproject-template#1185 (factory_boy example uses `username`\n  instead of the substituted `__GH_OWNER__`)\n- endavis/pyproject-template#1187 (.gitignore covers SQLite's `.doit.db-wal`\n  and `.doit.db-shm`)\n- endavis/pyproject-template#1189 (major_version_zero release tests no longer\n  read the project's real CHANGELOG.md)\n\nLocal follow-ups from the approved plan:\n- Drop the `cache`/`provider`/`farewell` entries from `sync-exclude.toml`;\n  `ALLOWED_PATTERNS` now covers them.\n- Record `f85f7a6` as the sync point.\n\nSkipped: the template repository's own README.md change, README.template.md,\nthe template-owned configure tests (ADR-9017), and examples/api/tests.\n\nRefs #17\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sdzAvfEq6Sfm5kBX5t\n\nCo-authored-by: Claude Opus 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-02T20:38:10Z",
          "tree_id": "b6cb20fdadd8646952ef7e0145bb0feab4790cec",
          "url": "https://github.com/endavis/pydatatracker/commit/9cb5ca5a0a3492af11de5c74cc12c038e5ec35d9"
        },
        "date": 1793651941714,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 264.1292338558882,
            "unit": "iter/sec",
            "range": "stddev: 0.0000571141651192138",
            "extra": "mean: 3.786025444444408 msec\nrounds: 270"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 113.74055056007623,
            "unit": "iter/sec",
            "range": "stddev: 0.0001646929131120955",
            "extra": "mean: 8.791939155172399 msec\nrounds: 116"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 259.1938374259751,
            "unit": "iter/sec",
            "range": "stddev: 0.0004142690088558363",
            "extra": "mean: 3.8581164194754307 msec\nrounds: 267"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 268.732708139165,
            "unit": "iter/sec",
            "range": "stddev: 0.00004514427737385995",
            "extra": "mean: 3.721169659340996 msec\nrounds: 273"
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
          "id": "50189fa45021fc76c2cf94e008d82489cefa1a0a",
          "message": "release: v0.1.1 (merges PR #16)\n\nchore: update changelog for v0.1.1",
          "timestamp": "2026-11-02T20:50:41Z",
          "tree_id": "287082985f10a98ced53f30506cc70cb0cc4ff15",
          "url": "https://github.com/endavis/pydatatracker/commit/50189fa45021fc76c2cf94e008d82489cefa1a0a"
        },
        "date": 1793652714283,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 258.2050563082543,
            "unit": "iter/sec",
            "range": "stddev: 0.000052808912817773456",
            "extra": "mean: 3.872890850000105 msec\nrounds: 260"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 109.10329953433565,
            "unit": "iter/sec",
            "range": "stddev: 0.0008855308510217438",
            "extra": "mean: 9.165625643478291 msec\nrounds: 115"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 254.57408449144742,
            "unit": "iter/sec",
            "range": "stddev: 0.00020790583509294476",
            "extra": "mean: 3.928129613026638 msec\nrounds: 261"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 257.63159887191034,
            "unit": "iter/sec",
            "range": "stddev: 0.0004380664611714954",
            "extra": "mean: 3.8815114464945015 msec\nrounds: 271"
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
          "id": "74abed7b36030a27c19c15b15da35406d8cb7fd8",
          "message": "release: v0.1.2 (merges PR #19)\n\nchore: update changelog for v0.1.2",
          "timestamp": "2026-11-02T21:24:33Z",
          "tree_id": "78c341f6a7b9e01e25bc5e35e051745f64f80046",
          "url": "https://github.com/endavis/pydatatracker/commit/74abed7b36030a27c19c15b15da35406d8cb7fd8"
        },
        "date": 1793654837367,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 311.04094688498105,
            "unit": "iter/sec",
            "range": "stddev: 0.00010492656041083084",
            "extra": "mean: 3.2150107888199915 msec\nrounds: 322"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 143.963033724553,
            "unit": "iter/sec",
            "range": "stddev: 0.0001056972766159029",
            "extra": "mean: 6.946227612244666 msec\nrounds: 147"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 312.1318864236718,
            "unit": "iter/sec",
            "range": "stddev: 0.0000674243039380227",
            "extra": "mean: 3.203773928571499 msec\nrounds: 322"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 316.2696124189835,
            "unit": "iter/sec",
            "range": "stddev: 0.00006076016466307872",
            "extra": "mean: 3.1618592515149166 msec\nrounds: 330"
          }
        ]
      }
    ]
  }
}