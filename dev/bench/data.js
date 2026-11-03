window.BENCHMARK_DATA = {
  "lastUpdate": 1793703164771,
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
      }
    ]
  }
}