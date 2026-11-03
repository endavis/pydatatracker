window.BENCHMARK_DATA = {
  "lastUpdate": 1793714046499,
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
          "id": "7c27f70ccf0c9438f72f3b5e6671b15339c9112b",
          "message": "fix: register parent-child observer link weakly to break reference cycle (merges PR #20, addresses #4)\n\nThe parent registered its bound _tracking_notify_observers on each tracked\nchild, so parent and child kept each other alive until the cyclic GC ran.\nThe child now holds that link through weakref.WeakMethod.\n\ntracking_add_observer gains weak=False. External observers stay strongly\nheld by default; weak=True stores WeakMethod/weakref.ref (strong fallback\nfor non-weakrefable callables), and dead references are dropped silently\nduring notification. Priority order, de-duplication and removal by\nequality are unchanged.\n\nAddresses #4\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sdzAvfEq6Sfm5kBX5t\n\nCo-authored-by: Claude Opus 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-02T21:45:54Z",
          "tree_id": "a656c9a722995236d3dc52a20de06fcb38105677",
          "url": "https://github.com/endavis/pydatatracker/commit/7c27f70ccf0c9438f72f3b5e6671b15339c9112b"
        },
        "date": 1793656157752,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 413.25969045649555,
            "unit": "iter/sec",
            "range": "stddev: 0.00010919847536145721",
            "extra": "mean: 2.4197859677419262 msec\nrounds: 434"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 178.66001864454162,
            "unit": "iter/sec",
            "range": "stddev: 0.000734862477803635",
            "extra": "mean: 5.597223192893424 msec\nrounds: 197"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 420.77305742723536,
            "unit": "iter/sec",
            "range": "stddev: 0.000036660595117702654",
            "extra": "mean: 2.3765780207372966 msec\nrounds: 434"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 418.83176010474403,
            "unit": "iter/sec",
            "range": "stddev: 0.00003586343996740911",
            "extra": "mean: 2.387593528604215 msec\nrounds: 437"
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
          "id": "2af279c93198b07c547d2262c95f61be89aa7e00",
          "message": "fix: check recorded changes by UUID set instead of scanning the log (merges PR #21, addresses #1)\n\n_tracking_notify_observers in TrackedDict, TrackedList and TrackedAttr\nchecked `entry not in self._tracking_changes`, a linear scan calling\nChangeLogEntry.__eq__ (which compares uuid) on every recorded change, so\neach change cost grew with history length.\n\nTrackBase now keeps a _tracking_change_uuids set next to the list, and\nevery append goes through _tracking_record_change, so the two cannot\ndiverge. Membership semantics are unchanged.\n\nAddresses #1\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sdzAvfEq6Sfm5kBX5t\n\nCo-authored-by: Claude Opus 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-02T22:11:59Z",
          "tree_id": "fbe78e89318dc862bdc8728725a5ffdd7fcaeb00",
          "url": "https://github.com/endavis/pydatatracker/commit/2af279c93198b07c547d2262c95f61be89aa7e00"
        },
        "date": 1793657569547,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 568.2827687042142,
            "unit": "iter/sec",
            "range": "stddev: 0.000024850188971569744",
            "extra": "mean: 1.7596873512110494 msec\nrounds: 578"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 184.6528119573044,
            "unit": "iter/sec",
            "range": "stddev: 0.00004361923859109433",
            "extra": "mean: 5.415568760638322 msec\nrounds: 188"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 565.8530349197381,
            "unit": "iter/sec",
            "range": "stddev: 0.00004190604251136311",
            "extra": "mean: 1.7672433269565169 msec\nrounds: 575"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 588.4169623376337,
            "unit": "iter/sec",
            "range": "stddev: 0.00002673112074627372",
            "extra": "mean: 1.6994751409395976 msec\nrounds: 596"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 109999.30333390605,
            "unit": "iter/sec",
            "range": "stddev: 3.4366989784811525e-7",
            "extra": "mean: 9.090966666983984 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 62707.32609647719,
            "unit": "iter/sec",
            "range": "stddev: 0.0000030374993501751805",
            "extra": "mean: 15.947100000109533 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 27209.452926401682,
            "unit": "iter/sec",
            "range": "stddev: 0.000008189466523350715",
            "extra": "mean: 36.751933333789566 usec\nrounds: 30"
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
          "id": "c318a6e11b032acd9c311aaecfb950226ba212ce",
          "message": "feat: declare monitored fields on the class and make the init entry optional (merges PR #25, addresses #5)\n\nTrackedAttr subclasses can declare `_tracking_fields`. Declared fields are\nmonitored from their first assignment, which records no change entry; later\nassignments record `update` as before. Fields are merged across the MRO,\nparent first. `tracking_add_attribute_to_monitor` is unchanged for dynamic\nfields.\n\nTrackBase, TrackedDict, TrackedList and TrackedAttr accept\n`tracking_record_init`. It resolves from the explicit kwarg, then the\nparent, then the class default: existing classes still record `init`;\nclasses that declare fields default to off.\n\nTrackedAttr.__setattr__ now sends `_tracking_*` internals and unmonitored,\nundeclared names straight to object.__setattr__.\n\nCreating an object with 4 declared fields is about 3.6x faster than the\nprevious monitored-field path, with 0 history entries.\n\nAddresses #5\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sdzAvfEq6Sfm5kBX5t\n\nCo-authored-by: Claude Opus 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-02T22:30:12Z",
          "tree_id": "5b1893bf71a2f182d6806b18c7e8a25ea1dd601f",
          "url": "https://github.com/endavis/pydatatracker/commit/c318a6e11b032acd9c311aaecfb950226ba212ce"
        },
        "date": 1793658697634,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 425.199378713226,
            "unit": "iter/sec",
            "range": "stddev: 0.000254959100816802",
            "extra": "mean: 2.3518378672760147 msec\nrounds: 437"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 137.10907422804087,
            "unit": "iter/sec",
            "range": "stddev: 0.00008709281292598185",
            "extra": "mean: 7.293463292858299 msec\nrounds: 140"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 424.9535224748849,
            "unit": "iter/sec",
            "range": "stddev: 0.00004068607132774486",
            "extra": "mean: 2.3531985196312872 msec\nrounds: 433"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 438.9480977709991,
            "unit": "iter/sec",
            "range": "stddev: 0.00007712982787393196",
            "extra": "mean: 2.278173672646154 msec\nrounds: 446"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 67838.6164381418,
            "unit": "iter/sec",
            "range": "stddev: 0.0000011901228764625778",
            "extra": "mean: 14.740866670119127 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 55315.64953016108,
            "unit": "iter/sec",
            "range": "stddev: 0.0000011651731208093736",
            "extra": "mean: 18.078066668181236 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 30278.623896988705,
            "unit": "iter/sec",
            "range": "stddev: 0.0000035204363416794477",
            "extra": "mean: 33.02660000012262 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 49504.03233838799,
            "unit": "iter/sec",
            "range": "stddev: 0.0000024439989097707843",
            "extra": "mean: 20.200374651592742 usec\nrounds: 51664"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 1847063.1728468863,
            "unit": "iter/sec",
            "range": "stddev: 6.713602900425368e-8",
            "extra": "mean: 541.3999990366847 nsec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 81234.78936429568,
            "unit": "iter/sec",
            "range": "stddev: 0.000001856449672553875",
            "extra": "mean: 12.309996835413967 usec\nrounds: 83739"
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
          "id": "c88a0cc96229dff4fbc163f179ddc4e0c3a77abd",
          "message": "docs: fix tracking actors example to read the actor change, not init (merges PR #28, addresses #27)\n\nThe example indexed tracking_changes()[0], the init entry, which has an\nempty actor. Use [-1], the change recorded under tracking_actor.\n\nAddresses #27\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sdzAvfEq6Sfm5kBX5t\n\nCo-authored-by: Claude Opus 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-03T10:34:58Z",
          "tree_id": "69335f6d924f1528339632707354ef4bd2303ba7",
          "url": "https://github.com/endavis/pydatatracker/commit/c88a0cc96229dff4fbc163f179ddc4e0c3a77abd"
        },
        "date": 1793702155520,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 401.4214668169467,
            "unit": "iter/sec",
            "range": "stddev: 0.00021350389368682455",
            "extra": "mean: 2.491147291970842 msec\nrounds: 411"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 135.5054262341809,
            "unit": "iter/sec",
            "range": "stddev: 0.0001537918858550771",
            "extra": "mean: 7.379778270073088 msec\nrounds: 137"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 415.4416879281106,
            "unit": "iter/sec",
            "range": "stddev: 0.00003624945062105394",
            "extra": "mean: 2.4070766826198806 msec\nrounds: 397"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 430.7969247887397,
            "unit": "iter/sec",
            "range": "stddev: 0.000038587572915270294",
            "extra": "mean: 2.32127933710389 msec\nrounds: 442"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 68716.08574368234,
            "unit": "iter/sec",
            "range": "stddev: 5.57969810446791e-7",
            "extra": "mean: 14.55263333435634 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 55148.98497862346,
            "unit": "iter/sec",
            "range": "stddev: 9.002375228350109e-7",
            "extra": "mean: 18.132700001416424 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 29402.45392884039,
            "unit": "iter/sec",
            "range": "stddev: 0.000010143726359707397",
            "extra": "mean: 34.010766666625614 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 49320.625418789095,
            "unit": "iter/sec",
            "range": "stddev: 0.0000028921707326768112",
            "extra": "mean: 20.275493092572216 usec\nrounds: 51611"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 1801915.4371494048,
            "unit": "iter/sec",
            "range": "stddev: 6.910194750704123e-8",
            "extra": "mean: 554.9649996794415 nsec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 80635.04444440364,
            "unit": "iter/sec",
            "range": "stddev: 0.0000015339609663013317",
            "extra": "mean: 12.401555761397036 usec\nrounds: 83669"
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
          "id": "2010d02afa2c11c0a5dd1448385c5be1a9a0b8f3",
          "message": "fix: skip stack and actor capture in ChangeLogEntry.copy (merges PR #29, addresses #26)\n\nfix: skip stack and actor capture in ChangeLogEntry.copy (addresses #26)\n\ncopy() built the new entry with the default capture_stack=True, ran\nget_stack() and find_relevant_actor(), then overwrote both with the\noriginal's values. Construct it with capture_stack=False instead.\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sdzAvfEq6Sfm5kBX5t\n\nCo-authored-by: Claude Opus 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-03T10:40:23Z",
          "tree_id": "fe22f68fb4a1041976f1506b830a7f8046f9c4de",
          "url": "https://github.com/endavis/pydatatracker/commit/2010d02afa2c11c0a5dd1448385c5be1a9a0b8f3"
        },
        "date": 1793702483096,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 560.5441070275258,
            "unit": "iter/sec",
            "range": "stddev: 0.00012916493142256635",
            "extra": "mean: 1.7839809347079525 msec\nrounds: 582"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 186.22095577519886,
            "unit": "iter/sec",
            "range": "stddev: 0.00003464010128923777",
            "extra": "mean: 5.369964920635325 msec\nrounds: 189"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 570.7586537732108,
            "unit": "iter/sec",
            "range": "stddev: 0.00003160934755446947",
            "extra": "mean: 1.7520540308747503 msec\nrounds: 583"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 583.3794087317405,
            "unit": "iter/sec",
            "range": "stddev: 0.000043380434568014055",
            "extra": "mean: 1.7141503197275807 msec\nrounds: 588"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 107025.51131008548,
            "unit": "iter/sec",
            "range": "stddev: 0.0000014538428433803657",
            "extra": "mean: 9.343566667041614 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 70555.36479912722,
            "unit": "iter/sec",
            "range": "stddev: 0.0000014158360766296532",
            "extra": "mean: 14.173266665788256 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 32226.565646478637,
            "unit": "iter/sec",
            "range": "stddev: 0.0000058283122009534685",
            "extra": "mean: 31.0303000006229 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 67198.17719607019,
            "unit": "iter/sec",
            "range": "stddev: 0.0000013177617347328849",
            "extra": "mean: 14.881356038605182 usec\nrounds: 69147"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 2628431.736490131,
            "unit": "iter/sec",
            "range": "stddev: 4.9425320085384875e-8",
            "extra": "mean: 380.45500140526656 nsec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 109042.32766237827,
            "unit": "iter/sec",
            "range": "stddev: 0.0000010305758244549855",
            "extra": "mean: 9.170750674877784 usec\nrounds: 113727"
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
          "id": "d7f5a924c94ae820d93f31b77f0085e94b796e3a",
          "message": "fix: link children assigned into an empty tracked container (merges PR #33, addresses #22)\n\nTrackBase.__init__ tested `if tracking_parent:`. An empty TrackedDict or\nTrackedList parent is falsy, so a child assigned via __setitem__, update,\nsetdefault, append, insert or extend was converted but never linked: its\nchanges did not reach the parent, and it did not inherit the parent's\nsnapshot, stack or record-init settings. Both checks now use\n`is not None`.\n\nLinking more children exposed unlink leaks, fixed here too:\n- TrackedDict.__setitem__ now reports an overwritten child as removed\n- TrackedDict.__delitem__ and TrackedList.__setitem__ no longer skip an\n  empty old child (truthiness check)\n- TrackedList.remove unlinks the stored object, including at index 0\n- re-assigning the same object (setitem/update) keeps the child linked\n\ntest_tracked_dict_child_updates_do_not_touch_parent_log asserted the\nunlinked behaviour; it is rewritten as\ntest_tracked_dict_setitem_child_updates_forward_to_parent, with the\nrepo admin's approval.\n\nAddresses #22\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sdzAvfEq6Sfm5kBX5t\n\nCo-authored-by: Claude Opus 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-03T10:51:56Z",
          "tree_id": "d47a0cba5fa81b06466316040dd687d355655098",
          "url": "https://github.com/endavis/pydatatracker/commit/d7f5a924c94ae820d93f31b77f0085e94b796e3a"
        },
        "date": 1793703164441,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 633.266037966941,
            "unit": "iter/sec",
            "range": "stddev: 0.000013561874721288413",
            "extra": "mean: 1.5791151586313301 msec\nrounds: 643"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 220.78722363781608,
            "unit": "iter/sec",
            "range": "stddev: 0.0000261966634811898",
            "extra": "mean: 4.52924758744383 msec\nrounds: 223"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 630.4629019394056,
            "unit": "iter/sec",
            "range": "stddev: 0.000013421558880486204",
            "extra": "mean: 1.586136150000006 msec\nrounds: 640"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 627.1089871512322,
            "unit": "iter/sec",
            "range": "stddev: 0.00003457594512505327",
            "extra": "mean: 1.5946191499227267 msec\nrounds: 647"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 110748.92110976079,
            "unit": "iter/sec",
            "range": "stddev: 4.316218562861631e-7",
            "extra": "mean: 9.0294333342437 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 69177.98111107439,
            "unit": "iter/sec",
            "range": "stddev: 0.0000016395941409922577",
            "extra": "mean: 14.455466666400223 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 28013.637038722096,
            "unit": "iter/sec",
            "range": "stddev: 0.0000065931794090146486",
            "extra": "mean: 35.69689999973018 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 76579.19222153322,
            "unit": "iter/sec",
            "range": "stddev: 0.000001340996701363604",
            "extra": "mean: 13.058377491200687 usec\nrounds: 85602"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 2852212.602471992,
            "unit": "iter/sec",
            "range": "stddev: 6.230568976943861e-8",
            "extra": "mean: 350.60500017891627 nsec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 131742.2428183742,
            "unit": "iter/sec",
            "range": "stddev: 8.705403289166725e-7",
            "extra": "mean: 7.590579745774066 usec\nrounds: 142390"
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
          "id": "a9202457ba457708788da9309cacdd88668647e6",
          "message": "fix: set a declared field before monitoring it (merges PR #34, addresses #32)\n\nTrackedAttr._tracking_start_declared_field appended the name to\n_tracking_attributes_to_monitor before converting and setting the value.\nConverting a non-empty dict or list links the child, which forwards its\nconstruction entries; TrackedAttr._tracking_notify_observers then called\ngetattr on the not-yet-set attribute and raised AttributeError. The value\nis now converted and set first, then monitored. The first assignment still\nrecords no entry for the field itself.\n\nAddresses #32\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sdzAvfEq6Sfm5kBX5t\n\nCo-authored-by: Claude Opus 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-03T11:00:10Z",
          "tree_id": "aec20b969b2e41460e2136dca3bc3df33f5e6e59",
          "url": "https://github.com/endavis/pydatatracker/commit/a9202457ba457708788da9309cacdd88668647e6"
        },
        "date": 1793703667456,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 433.17757231545494,
            "unit": "iter/sec",
            "range": "stddev: 0.00003852105713753218",
            "extra": "mean: 2.3085221025057256 msec\nrounds: 439"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 139.23936198879724,
            "unit": "iter/sec",
            "range": "stddev: 0.00004854698559891519",
            "extra": "mean: 7.181877205674476 msec\nrounds: 141"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 428.6355388006479,
            "unit": "iter/sec",
            "range": "stddev: 0.00004134219039665977",
            "extra": "mean: 2.332984340957984 msec\nrounds: 437"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 444.5867854468523,
            "unit": "iter/sec",
            "range": "stddev: 0.00009226244507583786",
            "extra": "mean: 2.2492796293864297 msec\nrounds: 456"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 65148.27748936302,
            "unit": "iter/sec",
            "range": "stddev: 0.00000501666372622295",
            "extra": "mean: 15.349599997686408 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 50762.96741418709,
            "unit": "iter/sec",
            "range": "stddev: 0.000005273278902187715",
            "extra": "mean: 19.699399994503136 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 31270.03235748391,
            "unit": "iter/sec",
            "range": "stddev: 0.000007942566563453402",
            "extra": "mean: 31.9795000071584 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 48705.513502876405,
            "unit": "iter/sec",
            "range": "stddev: 0.000002943584210810424",
            "extra": "mean: 20.531556451836664 usec\nrounds: 51451"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 1841061.1862842718,
            "unit": "iter/sec",
            "range": "stddev: 7.193057753979442e-8",
            "extra": "mean: 543.1650004084076 nsec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 79895.16029126328,
            "unit": "iter/sec",
            "range": "stddev: 0.000001654093474420399",
            "extra": "mean: 12.516402700168964 usec\nrounds: 84589"
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
          "id": "26d340140d6af85efb8c5a20c448574a96a8c914",
          "message": "feat: record only init when building a tracked container (merges PR #35, addresses #24)\n\nBuilding a TrackedDict or TrackedList with contents recorded an update\nentry per initial item, because _tracking_convert_all_values re-assigned\neach item through the tracked __setitem__. That happened with or without\ntracking_auto_convert. Construction now converts items through the plain\ndict/list __setitem__ and records only init.\n\nA child is linked to its parent after it has recorded its own init and\nconverted its values, so its construction entries are no longer forwarded:\nassigning a container into a parent adds one parent entry (the add/update\nfor the assignment). _tracking_add_child_tracked_item now locks or unlocks\nthe child only when its state differs from the parent's, so new children\nno longer log a redundant unlock.\n\nLater mutations of nested children are still forwarded, and lock() still\npropagates to every descendant.\n\nBREAKING CHANGE: default change-log contents differ. Construction no\nlonger records per-item update entries; a parent no longer receives a\nchild's construction entries (init, per-item update) when the child is\nassigned; child logs no longer start with unlock. Code that counted or\nfiltered these entries, or used the forwarded child init as a creation\nrecord, should use the parent's add/update entry for the assignment,\nwhose value holds a repr of the assigned container.\n\nAddresses #24\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sdzAvfEq6Sfm5kBX5t\n\nCo-authored-by: Claude Opus 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-03T11:21:57Z",
          "tree_id": "dca4f3aca8a7f1f2a485b412fac6071e107449aa",
          "url": "https://github.com/endavis/pydatatracker/commit/26d340140d6af85efb8c5a20c448574a96a8c914"
        },
        "date": 1793704974265,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 548.6199853036082,
            "unit": "iter/sec",
            "range": "stddev: 0.0001583670102915349",
            "extra": "mean: 1.8227553257043607 msec\nrounds: 568"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 181.6468484839124,
            "unit": "iter/sec",
            "range": "stddev: 0.00033905595296753073",
            "extra": "mean: 5.50518772192497 msec\nrounds: 187"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 568.5670806282485,
            "unit": "iter/sec",
            "range": "stddev: 0.000024243156150238385",
            "extra": "mean: 1.7588074196892156 msec\nrounds: 579"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 579.3909145853781,
            "unit": "iter/sec",
            "range": "stddev: 0.000026547074172224357",
            "extra": "mean: 1.725950433164139 msec\nrounds: 591"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 108506.1595231119,
            "unit": "iter/sec",
            "range": "stddev: 0.0000013769823562163888",
            "extra": "mean: 9.216066667505629 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 65270.4590272038,
            "unit": "iter/sec",
            "range": "stddev: 0.0000048897554675505414",
            "extra": "mean: 15.320866666238922 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 25399.90026304247,
            "unit": "iter/sec",
            "range": "stddev: 0.0000073994927949731985",
            "extra": "mean: 39.370233333357874 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 67816.24856500482,
            "unit": "iter/sec",
            "range": "stddev: 0.000001402908412267019",
            "extra": "mean: 14.745728658839875 usec\nrounds: 70767"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 2689726.5912551354,
            "unit": "iter/sec",
            "range": "stddev: 3.831630856788041e-8",
            "extra": "mean: 371.78499972867485 nsec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 110637.55874703832,
            "unit": "iter/sec",
            "range": "stddev: 8.813793657705475e-7",
            "extra": "mean: 9.03852192080991 usec\nrounds: 114640"
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
          "id": "0e1cc010a0a0c45d73f2e1e68eb7ce335cc68bd5",
          "message": "feat: add tracking_max_changes to cap change history (merges PR #36, addresses #2)\n\nTrackBase, TrackedDict, TrackedList and TrackedAttr accept\ntracking_max_changes: int | None. It resolves from the explicit kwarg,\nthen tracking_parent, then None, so children inherit a parent's cap\nunless they pass their own.\n\nWith a cap, history is a deque(maxlen=cap) and the oldest entries are\ndropped first; _tracking_record_change discards the evicted entry's uuid\nso the dedup set stays in sync. A cap of 0 keeps no history while\nobservers still fire; a negative cap raises ValueError. With the default\nNone, history stays a list and behaves as before.\n\ntracking_changes() and tracking_get_formatted_updates() use islice\ninstead of slicing, so return types are unchanged for capped objects.\n\nAddresses #2\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sdzAvfEq6Sfm5kBX5t\n\nCo-authored-by: Claude Opus 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-03T11:29:33Z",
          "tree_id": "6b4c7ccbe889d54bbb81e56e2d87b63e5685fcff",
          "url": "https://github.com/endavis/pydatatracker/commit/0e1cc010a0a0c45d73f2e1e68eb7ce335cc68bd5"
        },
        "date": 1793705426487,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 740.0220314233916,
            "unit": "iter/sec",
            "range": "stddev: 0.00035471364064023036",
            "extra": "mean: 1.3513111198548442 msec\nrounds: 826"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 254.75157307035747,
            "unit": "iter/sec",
            "range": "stddev: 0.0002088249251702279",
            "extra": "mean: 3.9253928364313544 msec\nrounds: 269"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 777.4969842454881,
            "unit": "iter/sec",
            "range": "stddev: 0.00004466623707613746",
            "extra": "mean: 1.2861786222494962 msec\nrounds: 818"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 831.2443246805376,
            "unit": "iter/sec",
            "range": "stddev: 0.000025738177159819966",
            "extra": "mean: 1.203015732329142 msec\nrounds: 863"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_capped",
            "value": 837.9668565628386,
            "unit": "iter/sec",
            "range": "stddev: 0.000023240683728959413",
            "extra": "mean: 1.1933646207700705 msec\nrounds: 857"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 158316.35830398352,
            "unit": "iter/sec",
            "range": "stddev: 4.002184517969774e-7",
            "extra": "mean: 6.3164666665708555 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 97297.4024838204,
            "unit": "iter/sec",
            "range": "stddev: 0.0000023816640324324217",
            "extra": "mean: 10.277766666651662 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 40219.54509057999,
            "unit": "iter/sec",
            "range": "stddev: 0.00000945111938459512",
            "extra": "mean: 24.86353333305639 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 91258.85821018757,
            "unit": "iter/sec",
            "range": "stddev: 0.0000011480614125532242",
            "extra": "mean: 10.957840363253267 usec\nrounds: 93932"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 3363775.498062499,
            "unit": "iter/sec",
            "range": "stddev: 5.851395702759098e-8",
            "extra": "mean: 297.2850003146732 nsec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 147624.31406380242,
            "unit": "iter/sec",
            "range": "stddev: 0.0000010215976696560173",
            "extra": "mean: 6.773951881448238 usec\nrounds: 153870"
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
          "id": "b15243d6ff9a3f88f9fe825672a98c7eb964f58e",
          "message": "fix: track in-place operators and slices on tracked containers (merges PR #40, addresses #3)\n\nTrackedList inherited list.__iadd__ and list.__imul__, so += and *=\nmutated without recording a change or checking the lock. Slice indexes\nraised TypeError in __setitem__ and __delitem__, and TrackedDict |=\nraised NotImplementedError.\n\n- TrackedList.__iadd__ delegates to extend and returns self, so += is\n  tracked, honours the lock, and converts and links new items (#30)\n- TrackedList.__imul__ is tracked: n >= 1 records an add at the new\n  indexes; n <= 0 clears the list and unlinks children\n- __setitem__ and __delitem__ accept slices, with location repr(slice).\n  A wrong-size extended-slice assignment raises ValueError before\n  anything is converted, linked or recorded. Replaced children are\n  unlinked; re-assigning the same object keeps the link\n- TrackedDict.__ior__ delegates to update and returns self\n\nAlso fixes TrackedList.extend recording the wrong location for any\ncount other than two items (adding [4] to [1, 2, 3] recorded \"2\", and\nextending an empty list recorded \"-1\"), which += now goes through.\n\nAddresses #3\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sdzAvfEq6Sfm5kBX5t\n\nCo-authored-by: Claude Opus 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-03T11:57:06Z",
          "tree_id": "4a3dd5374ee91d07e73d1d6d70f801d2c4701f13",
          "url": "https://github.com/endavis/pydatatracker/commit/b15243d6ff9a3f88f9fe825672a98c7eb964f58e"
        },
        "date": 1793707088200,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 551.8083339775125,
            "unit": "iter/sec",
            "range": "stddev: 0.00003575218072188076",
            "extra": "mean: 1.8122234450354502 msec\nrounds: 564"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 182.89839899620077,
            "unit": "iter/sec",
            "range": "stddev: 0.000037464446459746505",
            "extra": "mean: 5.4675164216214505 msec\nrounds: 185"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 555.331869825774,
            "unit": "iter/sec",
            "range": "stddev: 0.00004645912273799706",
            "extra": "mean: 1.8007250336879337 msec\nrounds: 564"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 572.1164670266639,
            "unit": "iter/sec",
            "range": "stddev: 0.00008328282047038088",
            "extra": "mean: 1.7478958527397084 msec\nrounds: 584"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_capped",
            "value": 566.1700535407423,
            "unit": "iter/sec",
            "range": "stddev: 0.000020005384114466863",
            "extra": "mean: 1.7662537849646949 msec\nrounds: 572"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 107809.34994046012,
            "unit": "iter/sec",
            "range": "stddev: 5.112487403470925e-7",
            "extra": "mean: 9.275633333771793 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 72186.00890658823,
            "unit": "iter/sec",
            "range": "stddev: 0.0000016770914752912882",
            "extra": "mean: 13.853100000223625 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 35909.60833517854,
            "unit": "iter/sec",
            "range": "stddev: 0.000004877803924047894",
            "extra": "mean: 27.847699999009972 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 65638.2213472473,
            "unit": "iter/sec",
            "range": "stddev: 0.0000011337972292261994",
            "extra": "mean: 15.235025865641276 usec\nrounds: 67696"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 2565944.7828256283,
            "unit": "iter/sec",
            "range": "stddev: 9.157802348979206e-8",
            "extra": "mean: 389.7199997027201 nsec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 107321.43949330493,
            "unit": "iter/sec",
            "range": "stddev: 8.593344716727544e-7",
            "extra": "mean: 9.317802712312512 usec\nrounds: 111198"
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
          "id": "ff5766f23faf1199c414cea47a27ac8d9495ce1e",
          "message": "fix: re-index TrackedList child locations after items shift (merges PR #41, addresses #37)\n\nA child's stored location was set once when linked, so insert, pop,\nremove, del and length-changing slice edits left later children\nforwarding changes under their old index. Add\n_tracking_reindex_child_locations, which resets each linked child's\nlocation by identity, and call it after those mutations.\n\nAddresses #37\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sdzAvfEq6Sfm5kBX5t\n\nCo-authored-by: Claude Opus 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-03T12:15:34Z",
          "tree_id": "e07991d6d093a2947d5bf1f3e89c5082f04bb8e2",
          "url": "https://github.com/endavis/pydatatracker/commit/ff5766f23faf1199c414cea47a27ac8d9495ce1e"
        },
        "date": 1793708189758,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 394.658456586456,
            "unit": "iter/sec",
            "range": "stddev: 0.000345930606090968",
            "extra": "mean: 2.5338364940900098 msec\nrounds: 423"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 127.26938842853295,
            "unit": "iter/sec",
            "range": "stddev: 0.0006751508810435731",
            "extra": "mean: 7.857348985074612 msec\nrounds: 134"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 401.96994021128637,
            "unit": "iter/sec",
            "range": "stddev: 0.0002657174286604754",
            "extra": "mean: 2.4877482119045338 msec\nrounds: 420"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 403.14600424569005,
            "unit": "iter/sec",
            "range": "stddev: 0.0004475429230335905",
            "extra": "mean: 2.4804909126435692 msec\nrounds: 435"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_capped",
            "value": 416.9989357746907,
            "unit": "iter/sec",
            "range": "stddev: 0.000048781475145956786",
            "extra": "mean: 2.3980876549294394 msec\nrounds: 426"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 67395.43597414785,
            "unit": "iter/sec",
            "range": "stddev: 0.00000303634048633896",
            "extra": "mean: 14.837800001525164 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 46917.665750826956,
            "unit": "iter/sec",
            "range": "stddev: 0.0000036866499775040823",
            "extra": "mean: 21.313933333999557 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 26223.363618776868,
            "unit": "iter/sec",
            "range": "stddev: 0.000008845560219275447",
            "extra": "mean: 38.13393333279199 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 47655.07806912703,
            "unit": "iter/sec",
            "range": "stddev: 0.0000028564993554347274",
            "extra": "mean: 20.984122584993564 usec\nrounds: 50259"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 1480187.6875337895,
            "unit": "iter/sec",
            "range": "stddev: 0.0000013597547042492",
            "extra": "mean: 675.5900001209625 nsec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 78094.1199218201,
            "unit": "iter/sec",
            "range": "stddev: 0.0000015966665602590501",
            "extra": "mean: 12.805061392600344 usec\nrounds: 81948"
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
          "id": "a91fa82ad1549579612bd17a6e23694a3816d2ed",
          "message": "fix: update child locations in sort and reverse without raising (merges PR #42, addresses #38)\n\n* fix: update child locations in sort and reverse without raising\n\nTrackedList.sort() and reverse() looked up each child by its uuid key with\nlist.index, raising ValueError after the list had been reordered and\nrecording no change entry. They also wrote the key \"index\" instead of\n\"location\". Refresh each child's stored location by identity through a\nsmall private helper, so one update entry is recorded.\n\nAddresses #38\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01NXu1sdzAvfEq6Sfm5kBX5t\n\n* refactor: reuse the #37 re-index helper in sort and reverse\n\nAfter rebasing on #37, TrackedList had two private helpers that reset\nchild locations by identity. sort() and reverse() now call\n_tracking_reindex_child_locations, and _tracking_refresh_child_locations\nis removed. The reverse test asserts the exact forwarded location (\"1:a\")\ninstead of a prefix.\n\nAddresses #38\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01NXu1sdzAvfEq6Sfm5kBX5t\n\n---------\n\nCo-authored-by: Claude Opus 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-03T12:22:58Z",
          "tree_id": "d76df5bf175a76eb4d4a21ac0c986544747f5538",
          "url": "https://github.com/endavis/pydatatracker/commit/a91fa82ad1549579612bd17a6e23694a3816d2ed"
        },
        "date": 1793708641770,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 612.8881245205556,
            "unit": "iter/sec",
            "range": "stddev: 0.000019024465100666567",
            "extra": "mean: 1.6316191487349678 msec\nrounds: 632"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 217.7115785036339,
            "unit": "iter/sec",
            "range": "stddev: 0.00003926315180252738",
            "extra": "mean: 4.5932329684675395 msec\nrounds: 222"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 616.3677423817633,
            "unit": "iter/sec",
            "range": "stddev: 0.000019255012519842267",
            "extra": "mean: 1.6224080710904956 msec\nrounds: 633"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 627.8625168588436,
            "unit": "iter/sec",
            "range": "stddev: 0.0000183318547526916",
            "extra": "mean: 1.5927053664597415 msec\nrounds: 644"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_capped",
            "value": 614.7648007191248,
            "unit": "iter/sec",
            "range": "stddev: 0.00001836386741028927",
            "extra": "mean: 1.6266383482434976 msec\nrounds: 626"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 111843.47878112335,
            "unit": "iter/sec",
            "range": "stddev: 7.477294831694464e-7",
            "extra": "mean: 8.941066666542003 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 65688.49204265336,
            "unit": "iter/sec",
            "range": "stddev: 0.0000018945702021080396",
            "extra": "mean: 15.223366664448198 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 27510.593869596916,
            "unit": "iter/sec",
            "range": "stddev: 0.0000087883613962446",
            "extra": "mean: 36.34963333543813 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 75309.70687462494,
            "unit": "iter/sec",
            "range": "stddev: 0.000001477960154950219",
            "extra": "mean: 13.278500760397232 usec\nrounds: 84168"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 2853351.961143619,
            "unit": "iter/sec",
            "range": "stddev: 6.548465491599678e-8",
            "extra": "mean: 350.46500173052664 nsec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 127294.87202979454,
            "unit": "iter/sec",
            "range": "stddev: 0.0000010360388193453843",
            "extra": "mean: 7.855775995170809 usec\nrounds: 141363"
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
          "id": "b2b137369f81713d84f68023e38746aa98754c97",
          "message": "chore: synchronize with pyproject-template f4a9ff2 (merges PR #44, addresses #43)\n\nSyncs the following template improvements:\n- endavis/pyproject-template#1191 (ci: run macOS only on releases, the\n  full-matrix label and a nightly run)\n\nci.yml gains an all_os input (default false). Pull requests run Linux on\nboth Python bookends and Windows on the newest only. The full-matrix\nlabel, release.yml, testpypi.yml and the new nightly-matrix.yml pass\nall_os: true. A nightly failure opens or updates an issue labelled\nautomated.\n\nrelease.yml, testpypi.yml and docs/development/ci-cd-testing.md were\nmerged by hand to keep the pydatatracker substitutions. The sync point in\n.config/pyproject_template/settings.toml moves from f85f7a6 to f4a9ff2.\n\nAddresses #43\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sdzAvfEq6Sfm5kBX5t\n\nCo-authored-by: Claude Opus 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-03T12:33:27Z",
          "tree_id": "64ae711a4c941d3e7c33a744570ea7040660b723",
          "url": "https://github.com/endavis/pydatatracker/commit/b2b137369f81713d84f68023e38746aa98754c97"
        },
        "date": 1793709268229,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 422.52219500981465,
            "unit": "iter/sec",
            "range": "stddev: 0.00006913582186153404",
            "extra": "mean: 2.3667395744187383 msec\nrounds: 430"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 136.40325632804402,
            "unit": "iter/sec",
            "range": "stddev: 0.0001728833246989181",
            "extra": "mean: 7.331203278571609 msec\nrounds: 140"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 422.06192110571345,
            "unit": "iter/sec",
            "range": "stddev: 0.00004640876642407255",
            "extra": "mean: 2.3693205901641408 msec\nrounds: 427"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 431.82181515642935,
            "unit": "iter/sec",
            "range": "stddev: 0.00008255240193046874",
            "extra": "mean: 2.315769988687917 msec\nrounds: 442"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_capped",
            "value": 426.21613366525185,
            "unit": "iter/sec",
            "range": "stddev: 0.00004185109908985852",
            "extra": "mean: 2.346227467741508 msec\nrounds: 434"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 70145.41143822747,
            "unit": "iter/sec",
            "range": "stddev: 6.046208480744772e-7",
            "extra": "mean: 14.256099999935637 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 52283.38991514842,
            "unit": "iter/sec",
            "range": "stddev: 0.000003182068842518306",
            "extra": "mean: 19.126533333491125 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 33252.1979698206,
            "unit": "iter/sec",
            "range": "stddev: 0.000005018972738035943",
            "extra": "mean: 30.073200000420762 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 48235.21615614925,
            "unit": "iter/sec",
            "range": "stddev: 0.0000023734531975025673",
            "extra": "mean: 20.731740825266634 usec\nrounds: 50819"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 1823719.2930053337,
            "unit": "iter/sec",
            "range": "stddev: 6.819975884010199e-8",
            "extra": "mean: 548.3300000364011 nsec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 79961.14610086915,
            "unit": "iter/sec",
            "range": "stddev: 0.0000016585396295861324",
            "extra": "mean: 12.506073871659154 usec\nrounds: 82156"
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
          "id": "18ba412f06ee1d640bf6200af4939df66476c3e9",
          "message": "fix: keep a duplicated child linked when one copy is removed (merges PR #45, addresses #39)\n\ntrack_changes unlinked every trackable a method reported as removed,\neven when the same object was still held under another index or key,\nso the remaining copy stopped forwarding changes.\n\n- Add TrackBase._tracking_present_child_locations, overridden by\n  TrackedList (first index per uuid) and TrackedDict (first key per uuid)\n- In track_changes, keep a removed child that is still present linked\n  and move its stored location to the remaining occurrence; dedupe\n  removed items by identity\n- Rebuild TrackedList._tracking_reindex_child_locations on the new hook\n- Add list and dict regression tests for every removal path\n\nAddresses #39\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sdzAvfEq6Sfm5kBX5t\n\nCo-authored-by: Claude Opus 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-03T13:13:08Z",
          "tree_id": "f0da69bae17becc814e105b0a70c336841cec442",
          "url": "https://github.com/endavis/pydatatracker/commit/18ba412f06ee1d640bf6200af4939df66476c3e9"
        },
        "date": 1793711643040,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 415.88950001085317,
            "unit": "iter/sec",
            "range": "stddev: 0.00014269662690875737",
            "extra": "mean: 2.4044848450703946 msec\nrounds: 426"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 136.13791195937594,
            "unit": "iter/sec",
            "range": "stddev: 0.00006924124297184254",
            "extra": "mean: 7.345492417265836 msec\nrounds: 139"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 413.1427329331044,
            "unit": "iter/sec",
            "range": "stddev: 0.00003205771544823523",
            "extra": "mean: 2.420470990498867 msec\nrounds: 421"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 433.4318265060734,
            "unit": "iter/sec",
            "range": "stddev: 0.00002900275705530348",
            "extra": "mean: 2.3071679070295215 msec\nrounds: 441"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_capped",
            "value": 426.0625366763916,
            "unit": "iter/sec",
            "range": "stddev: 0.00003057337143095609",
            "extra": "mean: 2.3470732906975407 msec\nrounds: 430"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 65957.1146799375,
            "unit": "iter/sec",
            "range": "stddev: 0.0000029300586840463265",
            "extra": "mean: 15.16136666760796 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 53257.02193732577,
            "unit": "iter/sec",
            "range": "stddev: 0.0000016558688666677504",
            "extra": "mean: 18.77686666702516 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 34695.999436438426,
            "unit": "iter/sec",
            "range": "stddev: 0.000004772130432703308",
            "extra": "mean: 28.821766665979947 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 47880.927623786694,
            "unit": "iter/sec",
            "range": "stddev: 0.0000025865213840883208",
            "extra": "mean: 20.885142574038426 usec\nrounds: 50465"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 1779296.1104690826,
            "unit": "iter/sec",
            "range": "stddev: 1.0827389236622919e-7",
            "extra": "mean: 562.0199999967213 nsec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 75820.91847678601,
            "unit": "iter/sec",
            "range": "stddev: 0.000001947884010524188",
            "extra": "mean: 13.188972385057149 usec\nrounds: 80174"
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
          "id": "989ebb7fb5663c282c0a7af265842ee9c0eb0286",
          "message": "feat: add a hook to convert items on insert in tracked containers (merges PR #46, addresses #6)\n\nSubclasses of TrackedList and TrackedDict had to override every mutating\nmethod to wrap or reject incoming values. One overridable method now\ncovers every path that stores a value.\n\n- Add TrackBase._tracking_convert_item(value, location); the default\n  delegates to _tracking_convert_value. It runs whatever\n  tracking_auto_convert is set to\n- Route construction, append, insert, extend/+=, item and slice\n  assignment, update/|= and setdefault through _tracking_store_item,\n  which links a newly created tracked result as a child\n- Batch inserts go through _tracking_store_items, which unlinks children\n  it added if the hook raises, so a rejected insert leaves the container\n  unchanged\n- *= does not call the hook; it only repeats existing items\n- Document the hook in docs/usage/basics.md and add\n  tests/test_convert_item_hook.py (also selected for mutmut)\n\nAddresses #6\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sdzAvfEq6Sfm5kBX5t\n\nCo-authored-by: Claude Opus 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-03T13:33:07Z",
          "tree_id": "4ea88b212ced5d74961b5de14761cb950d53c1c1",
          "url": "https://github.com/endavis/pydatatracker/commit/989ebb7fb5663c282c0a7af265842ee9c0eb0286"
        },
        "date": 1793712855147,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 610.3962793922677,
            "unit": "iter/sec",
            "range": "stddev: 0.00001896713609739333",
            "extra": "mean: 1.6382799728000235 msec\nrounds: 625"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 213.51925627392595,
            "unit": "iter/sec",
            "range": "stddev: 0.00009313304652309124",
            "extra": "mean: 4.68341833636349 msec\nrounds: 220"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 609.7380063080803,
            "unit": "iter/sec",
            "range": "stddev: 0.000019765895469904632",
            "extra": "mean: 1.640048659677503 msec\nrounds: 620"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 624.6153151652002,
            "unit": "iter/sec",
            "range": "stddev: 0.000021004744216951527",
            "extra": "mean: 1.6009853996863923 msec\nrounds: 638"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_capped",
            "value": 612.2432690275139,
            "unit": "iter/sec",
            "range": "stddev: 0.00002054731712610222",
            "extra": "mean: 1.6333376789726055 msec\nrounds: 623"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 104979.16164891921,
            "unit": "iter/sec",
            "range": "stddev: 6.657096348055813e-7",
            "extra": "mean: 9.525699998865397 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 62419.504844889954,
            "unit": "iter/sec",
            "range": "stddev: 0.0000025851170777017575",
            "extra": "mean: 16.020633333842703 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 25915.665241789713,
            "unit": "iter/sec",
            "range": "stddev: 0.000005726429910808509",
            "extra": "mean: 38.58670000056463 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 75212.8508195736,
            "unit": "iter/sec",
            "range": "stddev: 0.0000014154753997672277",
            "extra": "mean: 13.29560027446476 usec\nrounds: 83057"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 3011549.290619783,
            "unit": "iter/sec",
            "range": "stddev: 6.06735395480414e-8",
            "extra": "mean: 332.055000100695 nsec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 129014.41514134889,
            "unit": "iter/sec",
            "range": "stddev: 9.234941873319677e-7",
            "extra": "mean: 7.751071838789445 usec\nrounds: 140509"
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
          "id": "fa517bbd2aa11074100a213ad3655393d4d9324c",
          "message": "fix: reject out-of-range list item assignment before converting (merges PR #48, addresses #47)\n\nTrackedList.__setitem__ swallowed the IndexError from reading the old\nitem, converted and linked the new value, then failed in the store. The\nvalue never reached the list but stayed registered as a child, with the\nlist subscribed to it.\n\nRaise IndexError before conversion, so nothing is converted, linked or\nrecorded. In-range assignment, including over an existing None, is\nunchanged.\n\nAddresses #47\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sdzAvfEq6Sfm5kBX5t\n\nCo-authored-by: Claude Opus 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-03T13:53:10Z",
          "tree_id": "bb7a4cc36b7e595f49ce0b82640a7b09e48f19c6",
          "url": "https://github.com/endavis/pydatatracker/commit/fa517bbd2aa11074100a213ad3655393d4d9324c"
        },
        "date": 1793714045872,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 756.1504879631708,
            "unit": "iter/sec",
            "range": "stddev: 0.000044131224071714845",
            "extra": "mean: 1.3224880707194706 msec\nrounds: 806"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 256.27684285756544,
            "unit": "iter/sec",
            "range": "stddev: 0.00005808326107641736",
            "extra": "mean: 3.9020302765154007 msec\nrounds: 264"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 743.8695810344484,
            "unit": "iter/sec",
            "range": "stddev: 0.00010732059678879974",
            "extra": "mean: 1.3443216734435741 msec\nrounds: 787"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 779.0700317468318,
            "unit": "iter/sec",
            "range": "stddev: 0.00011098482344864139",
            "extra": "mean: 1.283581654088014 msec\nrounds: 795"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_capped",
            "value": 752.8932712091397,
            "unit": "iter/sec",
            "range": "stddev: 0.00022255198020331826",
            "extra": "mean: 1.3282095062345411 msec\nrounds: 802"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 146198.83040689287,
            "unit": "iter/sec",
            "range": "stddev: 5.687600545634288e-7",
            "extra": "mean: 6.840000000115272 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 88924.45867609467,
            "unit": "iter/sec",
            "range": "stddev: 0.0000032110771615534082",
            "extra": "mean: 11.245499999527434 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 32311.952514853092,
            "unit": "iter/sec",
            "range": "stddev: 0.000011309170359168158",
            "extra": "mean: 30.948299999522533 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 88842.64888557672,
            "unit": "iter/sec",
            "range": "stddev: 0.0000011097173926460732",
            "extra": "mean: 11.255855296344574 usec\nrounds: 91601"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 3192236.4788648696,
            "unit": "iter/sec",
            "range": "stddev: 4.51177398077368e-8",
            "extra": "mean: 313.2600001976016 nsec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 137334.8238954686,
            "unit": "iter/sec",
            "range": "stddev: 0.0000044829327996678516",
            "extra": "mean: 7.281474367791397 usec\nrounds: 148368"
          }
        ]
      }
    ]
  }
}