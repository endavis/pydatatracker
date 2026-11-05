window.BENCHMARK_DATA = {
  "lastUpdate": 1793898948069,
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
          "id": "26fe0fa4200f8f97729cfd41efe5cd759674a0f2",
          "message": "fix: stop TrackedAttr forwarding from overwritten or deleted children (merges PR #49, addresses #31)\n\nReplacing a monitored TrackedAttr attribute never unlinked the old child,\nso its later changes kept landing raw in the parent log. Deleting the\nattribute made any later change to the old child raise AttributeError,\nbecause the observer called getattr on every monitored name.\n\n- Re-home forwarded entries through the child map, as TrackedDict and\n  TrackedList do, instead of scanning attributes with getattr\n- Release the old child after an assignment stores a different object:\n  unlink it, or relocate it if another monitored attribute still holds it\n- Add __delattr__ with the same unlink-or-relocate rule; it records no\n  change entry\n- Add _tracking_present_child_locations for TrackedAttr\n\nThe raw construction entries the issue also reports were already fixed\nby #24; tests now pin that.\n\nAddresses #31\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sdzAvfEq6Sfm5kBX5t\n\nCo-authored-by: Claude Opus 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-03T14:12:20Z",
          "tree_id": "ed9372012e04677b8a4d0f0cef2030e8e88c4235",
          "url": "https://github.com/endavis/pydatatracker/commit/26fe0fa4200f8f97729cfd41efe5cd759674a0f2"
        },
        "date": 1793715199463,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 408.40642045935186,
            "unit": "iter/sec",
            "range": "stddev: 0.0001559514176975322",
            "extra": "mean: 2.4485413301663033 msec\nrounds: 421"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 133.83806762213996,
            "unit": "iter/sec",
            "range": "stddev: 0.00016331516515426828",
            "extra": "mean: 7.471715766423517 msec\nrounds: 137"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 408.9106598836388,
            "unit": "iter/sec",
            "range": "stddev: 0.000042041879731906523",
            "extra": "mean: 2.4455219638552927 msec\nrounds: 415"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 424.6851042204458,
            "unit": "iter/sec",
            "range": "stddev: 0.00005078779119386572",
            "extra": "mean: 2.354685836781597 msec\nrounds: 435"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_capped",
            "value": 415.58293625240543,
            "unit": "iter/sec",
            "range": "stddev: 0.00006205738359712662",
            "extra": "mean: 2.406258565420615 msec\nrounds: 428"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 66405.17783647441,
            "unit": "iter/sec",
            "range": "stddev: 7.607199374044976e-7",
            "extra": "mean: 15.059066665893775 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 51808.72907982393,
            "unit": "iter/sec",
            "range": "stddev: 0.0000013737625577794834",
            "extra": "mean: 19.301766666757203 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 29048.543989730715,
            "unit": "iter/sec",
            "range": "stddev: 0.00000551975640968951",
            "extra": "mean: 34.42513333382635 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 48680.2805029916,
            "unit": "iter/sec",
            "range": "stddev: 0.0000026329790127741637",
            "extra": "mean: 20.542198805500842 usec\nrounds: 50899"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 1741159.2639911394,
            "unit": "iter/sec",
            "range": "stddev: 6.190315905631995e-8",
            "extra": "mean: 574.3299999494411 nsec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 78528.5769416273,
            "unit": "iter/sec",
            "range": "stddev: 0.000001732243531393621",
            "extra": "mean: 12.734217770727344 usec\nrounds: 81820"
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
          "id": "0db0e9eb9c7fb10cae5ed451ddb143cdceba7642",
          "message": "refactor: skip the TrackedList child reindex when no children are linked (merges PR #74, addresses #64)\n\n_tracking_reindex_child_locations scanned the whole list on every shifting\nmutation even when no child was linked. It now returns early when\n_tracking_child_tracked_items is empty. Behavior with children is unchanged.\n\nAdds insert(0)/pop(0) benchmarks (no children, 1k/10k/20k items) and tests\nthat the scan is skipped without children and locations stay correct with them.\n\ndoit benchmark_compare vs saved baseline (mean ns, before -> after):\ninsert(0) 1k: 37,995 -> 8,872; 10k: 341,423 -> 15,315; 20k: 655,271 -> 26,644\npop(0)    1k: 40,648 -> 11,058; 10k: 330,093 -> 15,562; 20k: 655,523 -> 22,483\n\nAddresses #64\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sdzAvfEq6Sfm5kBX5t\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-03T14:48:06Z",
          "tree_id": "ad93c50d6cd9184524a26edcdf04e2770e21ab4d",
          "url": "https://github.com/endavis/pydatatracker/commit/0db0e9eb9c7fb10cae5ed451ddb143cdceba7642"
        },
        "date": 1793717354819,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 805.3244547416803,
            "unit": "iter/sec",
            "range": "stddev: 0.000015325325469280877",
            "extra": "mean: 1.2417355441177615 msec\nrounds: 816"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 261.70871334587474,
            "unit": "iter/sec",
            "range": "stddev: 0.0001662410655762585",
            "extra": "mean: 3.821042055555858 msec\nrounds: 270"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 808.2451117625274,
            "unit": "iter/sec",
            "range": "stddev: 0.00003353204109740079",
            "extra": "mean: 1.2372484354644793 msec\nrounds: 829"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 838.3680350317127,
            "unit": "iter/sec",
            "range": "stddev: 0.000021168654727414175",
            "extra": "mean: 1.192793568235427 msec\nrounds: 850"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_capped",
            "value": 824.6832538361451,
            "unit": "iter/sec",
            "range": "stddev: 0.0000205519136156362",
            "extra": "mean: 1.2125867663109942 msec\nrounds: 843"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 155795.5961473572,
            "unit": "iter/sec",
            "range": "stddev: 2.7963391489865763e-7",
            "extra": "mean: 6.418666667921494 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 110320.07531585773,
            "unit": "iter/sec",
            "range": "stddev: 0.0000011949742663647074",
            "extra": "mean: 9.064533333003055 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 36709.73126020397,
            "unit": "iter/sec",
            "range": "stddev: 0.000008242734743742246",
            "extra": "mean: 27.240733333400158 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[1000]",
            "value": 133494.71361827297,
            "unit": "iter/sec",
            "range": "stddev: 0.0000023554457805039367",
            "extra": "mean: 7.490933332832128 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[10000]",
            "value": 92277.31177278655,
            "unit": "iter/sec",
            "range": "stddev: 0.000002006214626427058",
            "extra": "mean: 10.836900000536314 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[20000]",
            "value": 76972.2207255085,
            "unit": "iter/sec",
            "range": "stddev: 0.0000033080025239634753",
            "extra": "mean: 12.991700000005343 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[1000]",
            "value": 102531.85323121648,
            "unit": "iter/sec",
            "range": "stddev: 0.000007490322391432157",
            "extra": "mean: 9.753066666462473 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[10000]",
            "value": 82889.64349486346,
            "unit": "iter/sec",
            "range": "stddev: 0.0000027158749868177656",
            "extra": "mean: 12.06423333286466 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[20000]",
            "value": 77914.79238216142,
            "unit": "iter/sec",
            "range": "stddev: 0.0000020197104733690515",
            "extra": "mean: 12.834533333479687 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 90303.10345840217,
            "unit": "iter/sec",
            "range": "stddev: 0.0000014192994395499589",
            "extra": "mean: 11.07381653234816 usec\nrounds: 96284"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 3312903.7613198822,
            "unit": "iter/sec",
            "range": "stddev: 3.23661138874679e-8",
            "extra": "mean: 301.8499998930224 nsec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 144067.91391078758,
            "unit": "iter/sec",
            "range": "stddev: 6.553979462283893e-7",
            "extra": "mean: 6.9411708190571755 usec\nrounds: 153847"
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
          "id": "44d76f407cd6310772b51a76bb102417d76752dc",
          "message": "refactor: hoist the per-call imports out of _tracking_is_trackable (merges PR #75, addresses #63)\n\nCache the TrackedDict, TrackedList and TrackedAttr classes in a lazily\nfilled module-level tuple instead of importing them on every call.\nReturn values are unchanged; a new test pins them for each input kind.\n\nBenchmark (mean, doit benchmark_compare equivalent, vs baseline):\ntrackeddict_default -32%, trackeddict_snapshots -20%,\ntrackedlist_append -36%, trackedlist_append_capped -32%,\nappend_with_history[100] -21%, trackedattr_create_monitored -17%.\nappend_with_history[10000] and trackedattr_update read slower but\nare within noise (min unchanged; not re-run).\n\nAddresses #63\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sdzAvfEq6Sfm5kBX5t\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-03T14:55:51Z",
          "tree_id": "0cb831e7f9781e0ce1ecda6e645c5bce6025543d",
          "url": "https://github.com/endavis/pydatatracker/commit/44d76f407cd6310772b51a76bb102417d76752dc"
        },
        "date": 1793717810039,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 572.545058620724,
            "unit": "iter/sec",
            "range": "stddev: 0.00003406282423394887",
            "extra": "mean: 1.7465874256412692 msec\nrounds: 585"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 161.45618912149752,
            "unit": "iter/sec",
            "range": "stddev: 0.00012284237080308272",
            "extra": "mean: 6.19363064024439 msec\nrounds: 164"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 566.4461445108715,
            "unit": "iter/sec",
            "range": "stddev: 0.00003991782509881644",
            "extra": "mean: 1.7653928969072672 msec\nrounds: 582"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 595.5483661738139,
            "unit": "iter/sec",
            "range": "stddev: 0.000030763515827316384",
            "extra": "mean: 1.679124747540899 msec\nrounds: 610"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_capped",
            "value": 582.1279606162283,
            "unit": "iter/sec",
            "range": "stddev: 0.00012626039174327898",
            "extra": "mean: 1.7178353689477848 msec\nrounds: 599"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 91961.35171972768,
            "unit": "iter/sec",
            "range": "stddev: 6.157016035182415e-7",
            "extra": "mean: 10.87413333209497 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 64599.34410696266,
            "unit": "iter/sec",
            "range": "stddev: 0.0000028902743773651345",
            "extra": "mean: 15.48003333198267 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 25651.264223285278,
            "unit": "iter/sec",
            "range": "stddev: 0.000007741960546402721",
            "extra": "mean: 38.98443333222682 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[1000]",
            "value": 63676.692201224774,
            "unit": "iter/sec",
            "range": "stddev: 0.000007958863988725936",
            "extra": "mean: 15.704333335027817 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[10000]",
            "value": 45229.97179150492,
            "unit": "iter/sec",
            "range": "stddev: 0.0000029328329564958165",
            "extra": "mean: 22.10923333336723 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[20000]",
            "value": 29691.94606026078,
            "unit": "iter/sec",
            "range": "stddev: 0.000009082705551515014",
            "extra": "mean: 33.67916666595268 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[1000]",
            "value": 57196.56744239342,
            "unit": "iter/sec",
            "range": "stddev: 0.0000063252630729578665",
            "extra": "mean: 17.48356666695372 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[10000]",
            "value": 39974.309842739436,
            "unit": "iter/sec",
            "range": "stddev: 0.000006035104706877835",
            "extra": "mean: 25.016066667168012 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[20000]",
            "value": 24411.897056270514,
            "unit": "iter/sec",
            "range": "stddev: 0.000009854770620128046",
            "extra": "mean: 40.96363333398282 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 58706.2007524159,
            "unit": "iter/sec",
            "range": "stddev: 0.0000022798056591840917",
            "extra": "mean: 17.033975750148468 usec\nrounds: 61691"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 1863707.0987896095,
            "unit": "iter/sec",
            "range": "stddev: 7.630555989907383e-8",
            "extra": "mean: 536.5650002886468 nsec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 77218.55152276816,
            "unit": "iter/sec",
            "range": "stddev: 0.0000017106383010310108",
            "extra": "mean: 12.950255868308362 usec\nrounds: 80432"
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
          "id": "5bd6c54d9a74e37b5d30fea277edff7c58d3e818",
          "message": "feat: add benchmarks comparing tracked containers against the standard library (merges PR #78, addresses #50)\n\nNothing measured the overhead of tracking against plain dict, list and\nobjects. Add paired plain/tracked benchmarks and a docs page with the\nmeasured ratios.\n\n- tests/benchmarks/test_bench_vs_stdlib.py: table-driven cases, each\n  timing the plain and tracked type in one pytest-benchmark group, so\n  the (x.xx) column is the tracked/plain ratio. Reads use a prebuilt\n  container with an inner loop; writes use benchmark.pedantic with a\n  fresh container and a fixed batch per round. Covers dict, list and\n  TrackedAttr reads, writes, construction, nested auto-convert writes\n  and the costly options (snapshots, stack capture, max_changes,\n  observer)\n- Parity tests check every side ends in the same state and that each\n  tracked write records entries without accumulating across rounds\n- docs/usage/performance.md: overhead tables from one real run, how to\n  reproduce, and the environment; added to the nav and index\n- benchmark.yml ignores the comparison file, so its microsecond-scale\n  series don't trip the CI regression alert\n\nAddresses #50\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sdzAvfEq6Sfm5kBX5t\n\nCo-authored-by: Claude Opus 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-03T15:19:39Z",
          "tree_id": "35ac465035127af2fc8a52549b6ffe6225902385",
          "url": "https://github.com/endavis/pydatatracker/commit/5bd6c54d9a74e37b5d30fea277edff7c58d3e818"
        },
        "date": 1793719243789,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 652.2547988698274,
            "unit": "iter/sec",
            "range": "stddev: 0.000026109305125572998",
            "extra": "mean: 1.5331431853513633 msec\nrounds: 669"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 204.52712812743908,
            "unit": "iter/sec",
            "range": "stddev: 0.000048606786211676026",
            "extra": "mean: 4.889326952153304 msec\nrounds: 209"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 651.0705193337159,
            "unit": "iter/sec",
            "range": "stddev: 0.000024247301546580813",
            "extra": "mean: 1.5359319310347013 msec\nrounds: 667"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 683.0667084813573,
            "unit": "iter/sec",
            "range": "stddev: 0.000019132270601069614",
            "extra": "mean: 1.463985856115388 msec\nrounds: 695"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_capped",
            "value": 668.1095023636453,
            "unit": "iter/sec",
            "range": "stddev: 0.000015528659554410217",
            "extra": "mean: 1.4967606304987262 msec\nrounds: 682"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 116935.81393512618,
            "unit": "iter/sec",
            "range": "stddev: 6.633828760110086e-7",
            "extra": "mean: 8.551699999751843 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 71811.7383318899,
            "unit": "iter/sec",
            "range": "stddev: 0.000002409666639680787",
            "extra": "mean: 13.925300002881613 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 22702.02532358915,
            "unit": "iter/sec",
            "range": "stddev: 0.000007990915944686908",
            "extra": "mean: 44.048933332874185 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[1000]",
            "value": 97936.79812643798,
            "unit": "iter/sec",
            "range": "stddev: 0.0000031310985447146944",
            "extra": "mean: 10.21066666595516 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[10000]",
            "value": 55245.56654588275,
            "unit": "iter/sec",
            "range": "stddev: 0.000005799805590128051",
            "extra": "mean: 18.100999999148826 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[20000]",
            "value": 34339.75524896322,
            "unit": "iter/sec",
            "range": "stddev: 0.000007941612134681882",
            "extra": "mean: 29.12076666679771 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[1000]",
            "value": 84241.74010095134,
            "unit": "iter/sec",
            "range": "stddev: 0.00000398399350362619",
            "extra": "mean: 11.870599999497244 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[10000]",
            "value": 63217.78527311549,
            "unit": "iter/sec",
            "range": "stddev: 0.0000026447432738380777",
            "extra": "mean: 15.818333332617838 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[20000]",
            "value": 36871.38890768571,
            "unit": "iter/sec",
            "range": "stddev: 0.000005017856885431013",
            "extra": "mean: 27.121300000487736 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 68130.74830335502,
            "unit": "iter/sec",
            "range": "stddev: 0.000001659477287266705",
            "extra": "mean: 14.6776605996966 usec\nrounds: 74941"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 2198067.9014007077,
            "unit": "iter/sec",
            "range": "stddev: 8.069155887815524e-8",
            "extra": "mean: 454.9449993618282 nsec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 92331.99941779465,
            "unit": "iter/sec",
            "range": "stddev: 0.0000023402728992423386",
            "extra": "mean: 10.83048137488156 usec\nrounds: 101771"
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
          "id": "79fc183b198efffe3008cbc7685b63c412963d98",
          "message": "fix: register monitored attributes that are not set yet (merges PR #80, addresses #76)\n\ntracking_add_attribute_to_monitor only registered an attribute that\nalready existed. Called before the attribute was set, it silently did\nnothing, so every later write went untracked.\n\n- Register an unset name straight away; its first assignment records\n  the same `start monitoring` entry (with the same value) that the\n  set-then-monitor order records, so the log no longer depends on call\n  order. Later writes record `update`\n- The first assignment raises RuntimeError while the whole object is\n  locked, as a declared field's does\n- A declared field that is still unset keeps its declared path\n- Move the start-monitoring body into _tracking_start_monitoring\n- _tracking_known_uuids_tree skips a monitored name that is unset\n\ntests/benchmarks/test_bench_trackedattr.py monitors before setting, so\nits TrackedAttr benchmarks now time tracked writes and jump\n(update 0.27 -> 5.9 us mean locally); #77 owns that benchmark.\n\nAddresses #76\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sdzAvfEq6Sfm5kBX5t\n\nCo-authored-by: Claude Opus 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-03T15:30:57Z",
          "tree_id": "329766b0a5e393ca7cd3554a36b8177eb2a923da",
          "url": "https://github.com/endavis/pydatatracker/commit/79fc183b198efffe3008cbc7685b63c412963d98"
        },
        "date": 1793719924653,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 747.127320292773,
            "unit": "iter/sec",
            "range": "stddev: 0.00004154649644225038",
            "extra": "mean: 1.3384599556714578 msec\nrounds: 767"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 221.12776264587112,
            "unit": "iter/sec",
            "range": "stddev: 0.000034799670031125916",
            "extra": "mean: 4.522272500000225 msec\nrounds: 224"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 749.3863463784429,
            "unit": "iter/sec",
            "range": "stddev: 0.00002255014354809936",
            "extra": "mean: 1.334425166448117 msec\nrounds: 763"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 781.2025763304508,
            "unit": "iter/sec",
            "range": "stddev: 0.000016652821677747353",
            "extra": "mean: 1.28007770365698 msec\nrounds: 793"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_capped",
            "value": 767.4756851711114,
            "unit": "iter/sec",
            "range": "stddev: 0.00001912593768852221",
            "extra": "mean: 1.3029728750000027 msec\nrounds: 776"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 141157.87094958185,
            "unit": "iter/sec",
            "range": "stddev: 0.0000013249593863405215",
            "extra": "mean: 7.084266667334305 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 90283.12788831728,
            "unit": "iter/sec",
            "range": "stddev: 0.000001218157764978263",
            "extra": "mean: 11.076266666757798 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 38197.82654468887,
            "unit": "iter/sec",
            "range": "stddev: 0.0000050114039180456805",
            "extra": "mean: 26.17949999930147 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[1000]",
            "value": 109653.53139666554,
            "unit": "iter/sec",
            "range": "stddev: 0.000002103572960986804",
            "extra": "mean: 9.119633332943522 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[10000]",
            "value": 59310.10486104738,
            "unit": "iter/sec",
            "range": "stddev: 0.000002429365672591096",
            "extra": "mean: 16.86053333311103 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[20000]",
            "value": 41858.10938027398,
            "unit": "iter/sec",
            "range": "stddev: 0.000003391114878359024",
            "extra": "mean: 23.890233333645483 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[1000]",
            "value": 97627.33045069361,
            "unit": "iter/sec",
            "range": "stddev: 0.0000037840457588289004",
            "extra": "mean: 10.243033332812956 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[10000]",
            "value": 59498.78225877348,
            "unit": "iter/sec",
            "range": "stddev: 0.0000023438532213657833",
            "extra": "mean: 16.80706666652062 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[20000]",
            "value": 48597.555541876216,
            "unit": "iter/sec",
            "range": "stddev: 0.000002616821935843023",
            "extra": "mean: 20.577166667123947 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 26043.921971052067,
            "unit": "iter/sec",
            "range": "stddev: 0.0000022003205029397974",
            "extra": "mean: 38.39667470634816 usec\nrounds: 27074"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 121969.88685313384,
            "unit": "iter/sec",
            "range": "stddev: 0.0000019940095562660474",
            "extra": "mean: 8.198745000100871 usec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 102136.11003669172,
            "unit": "iter/sec",
            "range": "stddev: 9.183798207393513e-7",
            "extra": "mean: 9.79085653096399 usec\nrounds: 106225"
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
          "id": "2a059e916884a3e94ac24c2e259d0e2083a29c5f",
          "message": "fix: copy tree and stack lists in ChangeLogEntry.copy (merges PR #81, addresses #52)\n\nThe copy shared its tree list with the original, so each observer's\nadd_to_tree on the forwarded copy also rewrote the child's own entry.\nCopy the tree and stack lists so each entry owns its own.\n\nAddresses #52\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sdzAvfEq6Sfm5kBX5t\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-03T15:56:06Z",
          "tree_id": "1e0f5f85b82daf5d7348262431657555af622d74",
          "url": "https://github.com/endavis/pydatatracker/commit/2a059e916884a3e94ac24c2e259d0e2083a29c5f"
        },
        "date": 1793721425960,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 1014.4530630789958,
            "unit": "iter/sec",
            "range": "stddev: 0.00002645009686509246",
            "extra": "mean: 985.7528518518848 usec\nrounds: 1053"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 299.0179654825227,
            "unit": "iter/sec",
            "range": "stddev: 0.0002477596642750037",
            "extra": "mean: 3.344280663492271 msec\nrounds: 315"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 1034.818616745392,
            "unit": "iter/sec",
            "range": "stddev: 0.00001598471730870904",
            "extra": "mean: 966.3529277672834 usec\nrounds: 1066"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 1055.608319929214,
            "unit": "iter/sec",
            "range": "stddev: 0.000040125510494294446",
            "extra": "mean: 947.3210670289687 usec\nrounds: 1104"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_capped",
            "value": 1055.793506182225,
            "unit": "iter/sec",
            "range": "stddev: 0.000013848890773140617",
            "extra": "mean: 947.1549068491853 usec\nrounds: 1095"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 190311.85767500932,
            "unit": "iter/sec",
            "range": "stddev: 3.052570123017995e-7",
            "extra": "mean: 5.254533333953759 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 119196.14122089298,
            "unit": "iter/sec",
            "range": "stddev: 0.000002699812122324389",
            "extra": "mean: 8.389533333523028 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 35346.59694738633,
            "unit": "iter/sec",
            "range": "stddev: 0.000010260333764658635",
            "extra": "mean: 28.291266666731946 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[1000]",
            "value": 151978.76349743395,
            "unit": "iter/sec",
            "range": "stddev: 0.0000034802258521389527",
            "extra": "mean: 6.57986666681154 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[10000]",
            "value": 114386.37429962937,
            "unit": "iter/sec",
            "range": "stddev: 0.0000024351934454328866",
            "extra": "mean: 8.742299999653369 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[20000]",
            "value": 70533.96563551725,
            "unit": "iter/sec",
            "range": "stddev: 0.0000026063933548665994",
            "extra": "mean: 14.177566665788769 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[1000]",
            "value": 147966.93433312373,
            "unit": "iter/sec",
            "range": "stddev: 0.000002950806738192533",
            "extra": "mean: 6.75826666617733 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[10000]",
            "value": 104500.8516808011,
            "unit": "iter/sec",
            "range": "stddev: 0.0000031291408121879385",
            "extra": "mean: 9.5693000001044 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[20000]",
            "value": 67234.57471268592,
            "unit": "iter/sec",
            "range": "stddev: 0.000004222038166836651",
            "extra": "mean: 14.873299998896528 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 35316.90316154085,
            "unit": "iter/sec",
            "range": "stddev: 0.0000015523337452447977",
            "extra": "mean: 28.31505342996701 usec\nrounds: 36983"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 176712.16416157907,
            "unit": "iter/sec",
            "range": "stddev: 0.0000014882444054553217",
            "extra": "mean: 5.658919999902423 usec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 139311.08213038126,
            "unit": "iter/sec",
            "range": "stddev: 6.545306902653572e-7",
            "extra": "mean: 7.178179831121403 usec\nrounds: 143062"
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
          "id": "3ece3692e0fb167afd09c3b723b04b4920839094",
          "message": "fix: run every observer, then raise, and guard the async queue observer (merges PR #82, addresses #53)\n\nA raising observer used to stop the notification loop, so later observers\nnever ran. Now every observer runs; afterwards a single failure is re-raised\nas the original exception and several are raised as an ExceptionGroup. Each\nexception carries a note that the mutation and change entry were already\ncommitted. async_queue_observer now checks for a running event loop before\ncreating its coroutine, so it raises a clear RuntimeError with no\n\"never awaited\" warning.\n\nAddresses #53\n\nBREAKING CHANGE: when two or more observers raise, the caller now gets an\nExceptionGroup instead of the first exception, and observers after a failing\none now run. Use `except*` around mutations whose observers may fail; do not\nretry, the mutation was already applied.\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sdzAvfEq6Sfm5kBX5t\n\nCo-authored-by: Claude Opus 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-03T16:00:16Z",
          "tree_id": "4fe30d1102f67c47b79e3bc869698a16a5583069",
          "url": "https://github.com/endavis/pydatatracker/commit/3ece3692e0fb167afd09c3b723b04b4920839094"
        },
        "date": 1793721681158,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 570.8416522968747,
            "unit": "iter/sec",
            "range": "stddev: 0.00011071577867762696",
            "extra": "mean: 1.7517992879046869 msec\nrounds: 587"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 169.00002263613283,
            "unit": "iter/sec",
            "range": "stddev: 0.00009364248510201793",
            "extra": "mean: 5.917158970759784 msec\nrounds: 171"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 576.2099809544039,
            "unit": "iter/sec",
            "range": "stddev: 0.000018553385926759493",
            "extra": "mean: 1.7354784419798708 msec\nrounds: 586"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 584.6237378470607,
            "unit": "iter/sec",
            "range": "stddev: 0.0000400250199548779",
            "extra": "mean: 1.7105018754158128 msec\nrounds: 602"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_capped",
            "value": 573.2022495183701,
            "unit": "iter/sec",
            "range": "stddev: 0.000021483456280623182",
            "extra": "mean: 1.7445849189186615 msec\nrounds: 592"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 109452.30067682966,
            "unit": "iter/sec",
            "range": "stddev: 5.158263947775645e-7",
            "extra": "mean: 9.136400000879044 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 68524.59690236185,
            "unit": "iter/sec",
            "range": "stddev: 0.000003137930334897838",
            "extra": "mean: 14.59330000036137 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 33133.90404491883,
            "unit": "iter/sec",
            "range": "stddev: 0.000005337398125212513",
            "extra": "mean: 30.18056666803659 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[1000]",
            "value": 84401.00607677626,
            "unit": "iter/sec",
            "range": "stddev: 0.000003237803879067147",
            "extra": "mean: 11.84819999764386 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[10000]",
            "value": 44145.69255977282,
            "unit": "iter/sec",
            "range": "stddev: 0.0000033665178549351676",
            "extra": "mean: 22.652266665564486 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[20000]",
            "value": 35326.24375095248,
            "unit": "iter/sec",
            "range": "stddev: 0.0000034750355245737796",
            "extra": "mean: 28.307566664883176 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[1000]",
            "value": 77304.84391303553,
            "unit": "iter/sec",
            "range": "stddev: 0.000004201731632910518",
            "extra": "mean: 12.935800001419768 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[10000]",
            "value": 44293.45298311214,
            "unit": "iter/sec",
            "range": "stddev: 0.000004308198984237206",
            "extra": "mean: 22.576700000816647 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[20000]",
            "value": 36246.767997195806,
            "unit": "iter/sec",
            "range": "stddev: 0.0000047789875951749745",
            "extra": "mean: 27.588666666152523 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 20057.292195037695,
            "unit": "iter/sec",
            "range": "stddev: 0.000002658355096012945",
            "extra": "mean: 49.85717863986678 usec\nrounds: 20880"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 96106.85543983901,
            "unit": "iter/sec",
            "range": "stddev: 0.0000015125598449323696",
            "extra": "mean: 10.405085000684267 usec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 80830.84756942946,
            "unit": "iter/sec",
            "range": "stddev: 0.0000011712917412114176",
            "extra": "mean: 12.371514465947577 usec\nrounds: 84474"
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
          "id": "c0654945f96480c8eefb3d55b4fb927a4a1378ce",
          "message": "fix: raise on assignment to a locked TrackedAttr and make locks idempotent (merges PR #83, addresses #54)\n\nfix: raise on assignment to a locked TrackedAttr and make unlock idempotent\n\nA globally locked TrackedAttr skipped the write for a monitored attribute\nthat was not individually locked, yet still logged an update for a value\nthat was never stored. It now raises RuntimeError and stores and logs\nnothing. Locked attribute names are kept in a set, so lock(); lock();\nunlock() fully unlocks.\n\nAddresses #54\n\nBREAKING CHANGE: assigning a monitored attribute on a locked TrackedAttr\nnow raises RuntimeError instead of being silently dropped. Unlock the\nobject first (or stop monitoring the attribute) before assigning to it.\nAssigning an unmonitored attribute is unchanged.\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sdzAvfEq6Sfm5kBX5t\n\nCo-authored-by: Claude Opus 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-03T16:09:29Z",
          "tree_id": "49ae1dbd5c6ec6c728a6df34aa53c55e6106f9bf",
          "url": "https://github.com/endavis/pydatatracker/commit/c0654945f96480c8eefb3d55b4fb927a4a1378ce"
        },
        "date": 1793722231164,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 567.7059286195826,
            "unit": "iter/sec",
            "range": "stddev: 0.00002448811169430447",
            "extra": "mean: 1.7614753512114472 msec\nrounds: 578"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 166.6690947099241,
            "unit": "iter/sec",
            "range": "stddev: 0.00006538181787537996",
            "extra": "mean: 5.999912591716119 msec\nrounds: 169"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 558.3086190497235,
            "unit": "iter/sec",
            "range": "stddev: 0.000048013466337007885",
            "extra": "mean: 1.7911240591307067 msec\nrounds: 575"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 600.3516541235933,
            "unit": "iter/sec",
            "range": "stddev: 0.00003511398726633263",
            "extra": "mean: 1.6656904218242259 msec\nrounds: 614"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_capped",
            "value": 589.8630452259256,
            "unit": "iter/sec",
            "range": "stddev: 0.00004428913317119435",
            "extra": "mean: 1.6953087807305953 msec\nrounds: 602"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 87484.21638443634,
            "unit": "iter/sec",
            "range": "stddev: 0.000004160160503505146",
            "extra": "mean: 11.430633333967913 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 63347.269737727285,
            "unit": "iter/sec",
            "range": "stddev: 0.00000318048983660089",
            "extra": "mean: 15.785999998740863 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 31867.871554605208,
            "unit": "iter/sec",
            "range": "stddev: 0.000009222053873892874",
            "extra": "mean: 31.37956666752946 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[1000]",
            "value": 72005.12677226934,
            "unit": "iter/sec",
            "range": "stddev: 0.0000029072648638312525",
            "extra": "mean: 13.887899998602885 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[10000]",
            "value": 39716.84536993216,
            "unit": "iter/sec",
            "range": "stddev: 0.000005875673847787143",
            "extra": "mean: 25.17823333363367 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[20000]",
            "value": 22087.21209360644,
            "unit": "iter/sec",
            "range": "stddev: 0.000007866722378202202",
            "extra": "mean: 45.27506666581379 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[1000]",
            "value": 58245.867459977584,
            "unit": "iter/sec",
            "range": "stddev: 0.000007146412340495386",
            "extra": "mean: 17.16859999874032 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[10000]",
            "value": 32606.427378500728,
            "unit": "iter/sec",
            "range": "stddev: 0.0000069521047192221545",
            "extra": "mean: 30.66880000043663 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[20000]",
            "value": 20966.118752291484,
            "unit": "iter/sec",
            "range": "stddev: 0.000010465470426610978",
            "extra": "mean: 47.69599999955669 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 18884.157422873577,
            "unit": "iter/sec",
            "range": "stddev: 0.000004905732160669652",
            "extra": "mean: 52.95444099553748 usec\nrounds: 20007"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 82300.59799376181,
            "unit": "iter/sec",
            "range": "stddev: 0.00000398260421784168",
            "extra": "mean: 12.150580000351852 usec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 68855.05110522245,
            "unit": "iter/sec",
            "range": "stddev: 0.000004838906977495938",
            "extra": "mean: 14.523262766471943 usec\nrounds: 79466"
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
          "id": "fb94dd69c918d14643a8ea6062b7f90bce17ebd9",
          "message": "fix: store and log non-negative indexes for negative TrackedList indexes (merges PR #84, addresses #55)\n\nfix: normalize negative TrackedList indexes in stored and logged locations (addresses #55)\n\nNegative int indexes in __setitem__, __delitem__, pop and insert are now\nnormalized after the bounds check, so stored child locations and logged\nchange locations are the actual non-negative index. insert clamps like\nlist.insert.\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sdzAvfEq6Sfm5kBX5t\n\nCo-authored-by: Claude Opus 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-03T16:13:39Z",
          "tree_id": "34e707b7ae4a873b215ac8db975e7fe5316b821e",
          "url": "https://github.com/endavis/pydatatracker/commit/fb94dd69c918d14643a8ea6062b7f90bce17ebd9"
        },
        "date": 1793722498081,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 742.666947494787,
            "unit": "iter/sec",
            "range": "stddev: 0.000034443785448607666",
            "extra": "mean: 1.3464985931759395 msec\nrounds: 762"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 220.87372769626558,
            "unit": "iter/sec",
            "range": "stddev: 0.00003708036856417858",
            "extra": "mean: 4.527473730941643 msec\nrounds: 223"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 751.3241414358863,
            "unit": "iter/sec",
            "range": "stddev: 0.000036533127365397225",
            "extra": "mean: 1.3309834528794178 msec\nrounds: 764"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 774.5900656040832,
            "unit": "iter/sec",
            "range": "stddev: 0.000013912584898633499",
            "extra": "mean: 1.2910054548919696 msec\nrounds: 787"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_capped",
            "value": 763.6205542927182,
            "unit": "iter/sec",
            "range": "stddev: 0.000028593769863899564",
            "extra": "mean: 1.3095509207792626 msec\nrounds: 770"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 140633.13035025776,
            "unit": "iter/sec",
            "range": "stddev: 0.000001468671720792859",
            "extra": "mean: 7.110700000130995 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 93166.25519441473,
            "unit": "iter/sec",
            "range": "stddev: 9.787332340716923e-7",
            "extra": "mean: 10.73349999861269 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 32795.59489555472,
            "unit": "iter/sec",
            "range": "stddev: 0.000008386157421576426",
            "extra": "mean: 30.491900000129135 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[1000]",
            "value": 107698.65915394184,
            "unit": "iter/sec",
            "range": "stddev: 0.0000029900174391089234",
            "extra": "mean: 9.285166666472833 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[10000]",
            "value": 54315.158277358314,
            "unit": "iter/sec",
            "range": "stddev: 0.000004129426359814853",
            "extra": "mean: 18.411066665654136 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[20000]",
            "value": 34799.029802105404,
            "unit": "iter/sec",
            "range": "stddev: 0.000006557609341420652",
            "extra": "mean: 28.73643333411261 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[1000]",
            "value": 95794.61633873207,
            "unit": "iter/sec",
            "range": "stddev: 0.000003880135839501455",
            "extra": "mean: 10.439000000417309 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[10000]",
            "value": 58523.110774605455,
            "unit": "iter/sec",
            "range": "stddev: 0.000002839571603469334",
            "extra": "mean: 17.08726666720395 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[20000]",
            "value": 48166.772636467285,
            "unit": "iter/sec",
            "range": "stddev: 0.0000041405356512342515",
            "extra": "mean: 20.761199998749664 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 26092.56583821101,
            "unit": "iter/sec",
            "range": "stddev: 0.0000028207791960814567",
            "extra": "mean: 38.32509252637621 usec\nrounds: 27149"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 130379.62635944539,
            "unit": "iter/sec",
            "range": "stddev: 0.000001332511363912797",
            "extra": "mean: 7.6699099999189 usec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 104511.73119822155,
            "unit": "iter/sec",
            "range": "stddev: 8.58312036208195e-7",
            "extra": "mean: 9.568303850056374 usec\nrounds: 108649"
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
          "id": "801bcf36ce08dbfaf1c58e99db3aed4632d58bdb",
          "message": "fix: record type-changing tracked attribute assignments (merges PR #86, addresses #59)\n\n(cherry picked from commit 992ee0f018098111e8d048d3bac03ec4e612abd4)\n\nCo-authored-by: Mayank Dhingra <mayankdhingra02@gmail.com>",
          "timestamp": "2026-11-05T11:19:10Z",
          "tree_id": "9a7726c76c5181010b1eeca57a3b8e940ad3f24e",
          "url": "https://github.com/endavis/pydatatracker/commit/801bcf36ce08dbfaf1c58e99db3aed4632d58bdb"
        },
        "date": 1793877604899,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 1115.535054692542,
            "unit": "iter/sec",
            "range": "stddev: 0.00002153441307892494",
            "extra": "mean: 896.4308165785206 usec\nrounds: 1134"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 331.4826141148731,
            "unit": "iter/sec",
            "range": "stddev: 0.000033525002590171765",
            "extra": "mean: 3.0167494686567684 msec\nrounds: 335"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 1114.714266594252,
            "unit": "iter/sec",
            "range": "stddev: 0.000008880213045912407",
            "extra": "mean: 897.0908778760546 usec\nrounds: 1130"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 1150.4752882053592,
            "unit": "iter/sec",
            "range": "stddev: 0.000020794624872508013",
            "extra": "mean: 869.2059796954983 usec\nrounds: 1182"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_capped",
            "value": 1142.4506139060438,
            "unit": "iter/sec",
            "range": "stddev: 0.000015893185975494297",
            "extra": "mean: 875.3113594827486 usec\nrounds: 1160"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 193888.63040849543,
            "unit": "iter/sec",
            "range": "stddev: 0.000001100365913964055",
            "extra": "mean: 5.1575999989950105 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 138468.99449169147,
            "unit": "iter/sec",
            "range": "stddev: 5.294526842207461e-7",
            "extra": "mean: 7.2218333329487905 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 54705.69249745919,
            "unit": "iter/sec",
            "range": "stddev: 0.000005339407325336018",
            "extra": "mean: 18.27963333151198 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[1000]",
            "value": 173781.07062347594,
            "unit": "iter/sec",
            "range": "stddev: 0.0000025776224890196146",
            "extra": "mean: 5.754366666129347 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[10000]",
            "value": 126342.91997785238,
            "unit": "iter/sec",
            "range": "stddev: 0.0000015596846395683156",
            "extra": "mean: 7.91496666513088 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[20000]",
            "value": 75081.83920367606,
            "unit": "iter/sec",
            "range": "stddev: 0.0000023584018463753265",
            "extra": "mean: 13.318800000187519 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[1000]",
            "value": 149893.5755741872,
            "unit": "iter/sec",
            "range": "stddev: 0.000002926955410006033",
            "extra": "mean: 6.6713999994287105 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[10000]",
            "value": 105568.38017689218,
            "unit": "iter/sec",
            "range": "stddev: 0.000002228068046929493",
            "extra": "mean: 9.472533331707686 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[20000]",
            "value": 93024.12114667994,
            "unit": "iter/sec",
            "range": "stddev: 0.000002695281129885956",
            "extra": "mean: 10.749900000917023 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 38198.53737980372,
            "unit": "iter/sec",
            "range": "stddev: 0.00000455381824473654",
            "extra": "mean: 26.17901282599157 usec\nrounds: 39451"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 180042.30996070523,
            "unit": "iter/sec",
            "range": "stddev: 0.000001524727130017435",
            "extra": "mean: 5.554249999448757 usec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 146161.14308640984,
            "unit": "iter/sec",
            "range": "stddev: 5.867369710823365e-7",
            "extra": "mean: 6.841763678659822 usec\nrounds: 152208"
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
          "id": "e1c9216de3c29ffd5c48f949120efddaf521b443",
          "message": "feat: serialize tracked container mutations with a tree-wide RLock (merges PR #87, addresses #65)\n\n* feat: serialize tracked container mutations with a tree-wide RLock\n\nConcurrent mutation of one container corrupted the per-call tracking\ncontext: changes were lost, actions mislabelled and threads died with\nKeyError('removed_items').\n\nEvery container tree now shares one threading.RLock, held for the whole\nof each mutating call (lock check, mutation, change entry, forwarding to\nparents, observer notification). A linked child adopts its root's lock\nwith all its descendants; an unlinked child gets a fresh one. Reads stay\nunlocked. copy/deepcopy/pickle drop the lock and give the copy its own.\n\nRecords the decision in ADR-0001 and documents the threading model and\nits caveats in docs/usage/threading.md.\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01NXu1sceyzGx67XLdcr5dPL\n\n* test: use per-thread unique values in the TrackedAttr stress test\n\n---------\n\nCo-authored-by: Claude Opus 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-05T11:56:09Z",
          "tree_id": "83cf85192d4e4143a9e70b5d5b28126536996c1e",
          "url": "https://github.com/endavis/pydatatracker/commit/e1c9216de3c29ffd5c48f949120efddaf521b443"
        },
        "date": 1793879827539,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 533.834330224252,
            "unit": "iter/sec",
            "range": "stddev: 0.000027346419787380582",
            "extra": "mean: 1.8732403357796832 msec\nrounds: 545"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 161.71181134382385,
            "unit": "iter/sec",
            "range": "stddev: 0.0000831413301032076",
            "extra": "mean: 6.183840201219738 msec\nrounds: 164"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 529.5922482699802,
            "unit": "iter/sec",
            "range": "stddev: 0.000043693059996393226",
            "extra": "mean: 1.8882451608132507 msec\nrounds: 541"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 545.827731675415,
            "unit": "iter/sec",
            "range": "stddev: 0.00012280248744860392",
            "extra": "mean: 1.832079870567415 msec\nrounds: 564"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_capped",
            "value": 544.3588904235858,
            "unit": "iter/sec",
            "range": "stddev: 0.00008126665861371446",
            "extra": "mean: 1.8370233637993185 msec\nrounds: 558"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 87973.9597098519,
            "unit": "iter/sec",
            "range": "stddev: 5.851760127715232e-7",
            "extra": "mean: 11.366999999751215 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 60073.77059183524,
            "unit": "iter/sec",
            "range": "stddev: 0.000003668068667163798",
            "extra": "mean: 16.6461999995704 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 30105.97302447226,
            "unit": "iter/sec",
            "range": "stddev: 0.000011151691651259717",
            "extra": "mean: 33.216000000635404 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[1000]",
            "value": 61922.316394018875,
            "unit": "iter/sec",
            "range": "stddev: 0.000004277626991808027",
            "extra": "mean: 16.149266665621553 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[10000]",
            "value": 42447.88461165051,
            "unit": "iter/sec",
            "range": "stddev: 0.000004363817074027701",
            "extra": "mean: 23.5582999989011 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[20000]",
            "value": 28675.890744882607,
            "unit": "iter/sec",
            "range": "stddev: 0.000008172760859034225",
            "extra": "mean: 34.872499999967964 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[1000]",
            "value": 58006.99564297346,
            "unit": "iter/sec",
            "range": "stddev: 0.000006021274932417942",
            "extra": "mean: 17.239300000208384 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[10000]",
            "value": 40989.26217833483,
            "unit": "iter/sec",
            "range": "stddev: 0.000005327508731149132",
            "extra": "mean: 24.396633334096883 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[20000]",
            "value": 26927.661530188856,
            "unit": "iter/sec",
            "range": "stddev: 0.000009452783898137883",
            "extra": "mean: 37.1365333331634 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 17264.853440974515,
            "unit": "iter/sec",
            "range": "stddev: 0.000009663352209066366",
            "extra": "mean: 57.92114039188478 usec\nrounds: 18833"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 72243.03423466744,
            "unit": "iter/sec",
            "range": "stddev: 0.000004285584155546625",
            "extra": "mean: 13.84216500031954 usec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 67594.2640715852,
            "unit": "iter/sec",
            "range": "stddev: 0.0000018123295581517744",
            "extra": "mean: 14.79415470728341 usec\nrounds: 69945"
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
          "id": "b10f4d737725b50ff0ee44dcf43e6625f6a09dca",
          "message": "feat: give copies and pickles of tracked containers independent state (merges PR #90, addresses #66)\n\ncopy.deepcopy and pickle failed on trees with tracked children\n(cannot pickle 'WeakMethod'), pickle of a non-empty TrackedDict failed\nbecause items were replayed before the tracking state existed, and\ncopy.copy shared the change log, observers and uuid with the original.\nTrackedDict.copy() and TrackedList.copy() logged a change entry and\nraised on a locked container.\n\ncopy.copy, copy.deepcopy and pickle now share one restore path: the\nobject is rebuilt without calling __init__, keeps its data,\nconfiguration and lock state, and gets a new uuid, a fresh history (its\nown init entry), no observers and a fresh tree lock. deepcopy and pickle\ncopy tracked children and link them to the copy; copy.copy shares child\nobjects without linking them. copy() stays a deep, untracked snapshot\nbut is now a read: it records nothing and works when locked.\n\n_tracking_remove_child_tracked_item now ignores an item that is not a\nchild of this container instead of giving it a fresh tree lock.\n\nRecords the decision in ADR-0002 and documents copy semantics in\ndocs/usage/basics.md and docs/usage/threading.md.\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sceyzGx67XLdcr5dPL\n\nCo-authored-by: Claude Opus 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-05T12:53:16Z",
          "tree_id": "050e285225be036cdf3c33513d50a8838f00c2ad",
          "url": "https://github.com/endavis/pydatatracker/commit/b10f4d737725b50ff0ee44dcf43e6625f6a09dca"
        },
        "date": 1793883260335,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 633.3723748113823,
            "unit": "iter/sec",
            "range": "stddev: 0.00011198459190583563",
            "extra": "mean: 1.5788500410959652 msec\nrounds: 657"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 207.66567275860808,
            "unit": "iter/sec",
            "range": "stddev: 0.00008946667561445624",
            "extra": "mean: 4.815432356807503 msec\nrounds: 213"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 648.4277704884234,
            "unit": "iter/sec",
            "range": "stddev: 0.00005195928706013067",
            "extra": "mean: 1.5421918145898614 msec\nrounds: 658"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 711.4261089030826,
            "unit": "iter/sec",
            "range": "stddev: 0.000029775162007276093",
            "extra": "mean: 1.4056273553719543 msec\nrounds: 726"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_capped",
            "value": 706.3063427481432,
            "unit": "iter/sec",
            "range": "stddev: 0.00001841714560893371",
            "extra": "mean: 1.4158162534816467 msec\nrounds: 718"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 135354.01844633982,
            "unit": "iter/sec",
            "range": "stddev: 5.699741965287065e-7",
            "extra": "mean: 7.388033332726233 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 70572.12824294584,
            "unit": "iter/sec",
            "range": "stddev: 0.000003416150154821595",
            "extra": "mean: 14.169900000145693 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 34780.794044796414,
            "unit": "iter/sec",
            "range": "stddev: 0.000005226311191998093",
            "extra": "mean: 28.751500000604818 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[1000]",
            "value": 96038.72281633083,
            "unit": "iter/sec",
            "range": "stddev: 0.000003785399836167177",
            "extra": "mean: 10.412466666309683 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[10000]",
            "value": 51020.061086716654,
            "unit": "iter/sec",
            "range": "stddev: 0.0000072927148101697266",
            "extra": "mean: 19.600133333833963 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[20000]",
            "value": 42411.099268697646,
            "unit": "iter/sec",
            "range": "stddev: 0.0000033862361463370267",
            "extra": "mean: 23.57873333262243 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[1000]",
            "value": 99778.15989667269,
            "unit": "iter/sec",
            "range": "stddev: 0.0000027487007291973486",
            "extra": "mean: 10.022233332781147 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[10000]",
            "value": 52597.43675238722,
            "unit": "iter/sec",
            "range": "stddev: 0.0000046836131960116056",
            "extra": "mean: 19.01233333304238 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[20000]",
            "value": 42457.9772173039,
            "unit": "iter/sec",
            "range": "stddev: 0.000005277600794739438",
            "extra": "mean: 23.552699999858834 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 24118.66936082363,
            "unit": "iter/sec",
            "range": "stddev: 0.0000022090158960651813",
            "extra": "mean: 41.46165715196201 usec\nrounds: 25014"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 115045.14371267406,
            "unit": "iter/sec",
            "range": "stddev: 0.00000187224161244844",
            "extra": "mean: 8.692240000129914 usec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 89972.09390989626,
            "unit": "iter/sec",
            "range": "stddev: 9.201246188577448e-7",
            "extra": "mean: 11.114557375995531 usec\nrounds: 92713"
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
          "id": "b3006627401505a7ec10ed0043e44a6ecee94bec",
          "message": "feat: link already-tracked containers as children when stored (merges PR #89, addresses #67)\n\nOnly values a container converted itself were linked, so a TrackedDict or\nTrackedList built elsewhere and stored into another tracked container did\nnot forward its changes, inherit the lock state or join the tree lock.\n\nAny trackable value stored into a tracked container is now linked as a\nchild, whatever tracking_auto_convert is set to. A container may have\nseveral parents: each records the change with its own path. Linking two\ntrees merges them into one tree lock, permanently; a child unlinked from\nits last parent gets a fresh lock. A child is locked if any parent locks\nit. A value that would close a cycle is stored but not linked. An\nobserver that links two trees its thread already holds raises\nRuntimeError.\n\nRecords the design in ADR-0002 (amending ADR-0001) and documents the\nbehavior in docs/usage/basics.md and docs/usage/threading.md.\n\nBREAKING CHANGE: storing an already-tracked container links it as a child:\nits changes are forwarded to the new parent, it takes the parent's lock\nstate (locked if any parent is locked) and its tree merges into the\nparent's thread lock. To keep a container independent of the parent,\nstore x.copy() (a plain, untracked snapshot) or another plain value.\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sceyzGx67XLdcr5dPL\n\nCo-authored-by: Claude Opus 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-05T14:05:51Z",
          "tree_id": "74c6d0a24eb8009978942883aedbe8fb68be518f",
          "url": "https://github.com/endavis/pydatatracker/commit/b3006627401505a7ec10ed0043e44a6ecee94bec"
        },
        "date": 1793887613565,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 591.818837449399,
            "unit": "iter/sec",
            "range": "stddev: 0.00004875904140040149",
            "extra": "mean: 1.6897062694215117 msec\nrounds: 605"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 204.35647306117573,
            "unit": "iter/sec",
            "range": "stddev: 0.00007953231918560561",
            "extra": "mean: 4.893409956731061 msec\nrounds: 208"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 581.0444144271079,
            "unit": "iter/sec",
            "range": "stddev: 0.00009321458535971593",
            "extra": "mean: 1.7210388314049443 msec\nrounds: 605"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 614.1070268260129,
            "unit": "iter/sec",
            "range": "stddev: 0.00003132807424697145",
            "extra": "mean: 1.6283806507938188 msec\nrounds: 630"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_capped",
            "value": 603.6834311233979,
            "unit": "iter/sec",
            "range": "stddev: 0.00008882426369150388",
            "extra": "mean: 1.6564973435482475 msec\nrounds: 620"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 116105.36174617942,
            "unit": "iter/sec",
            "range": "stddev: 5.577722144150997e-7",
            "extra": "mean: 8.612866666624086 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 63013.56052020919,
            "unit": "iter/sec",
            "range": "stddev: 0.000002340621233725404",
            "extra": "mean: 15.86959999949992 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 23770.152136751305,
            "unit": "iter/sec",
            "range": "stddev: 0.00001246176689396965",
            "extra": "mean: 42.06956666692463 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[1000]",
            "value": 85061.499464262,
            "unit": "iter/sec",
            "range": "stddev: 0.0000031253008946568093",
            "extra": "mean: 11.756199999979344 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[10000]",
            "value": 45583.630006191735,
            "unit": "iter/sec",
            "range": "stddev: 0.000004687605963289497",
            "extra": "mean: 21.937700000288867 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[20000]",
            "value": 25215.338994524747,
            "unit": "iter/sec",
            "range": "stddev: 0.000009526275607004204",
            "extra": "mean: 39.65840000077492 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[1000]",
            "value": 90562.21019809008,
            "unit": "iter/sec",
            "range": "stddev: 0.0000037018836458431137",
            "extra": "mean: 11.04213333367928 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[10000]",
            "value": 48909.162642737836,
            "unit": "iter/sec",
            "range": "stddev: 0.000004218203841841462",
            "extra": "mean: 20.446066666579554 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[20000]",
            "value": 23880.939189656197,
            "unit": "iter/sec",
            "range": "stddev: 0.00001150678088427347",
            "extra": "mean: 41.87439999986017 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 21650.81700435011,
            "unit": "iter/sec",
            "range": "stddev: 0.00000248232668762897",
            "extra": "mean: 46.18763346432048 usec\nrounds: 22388"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 102424.0180215363,
            "unit": "iter/sec",
            "range": "stddev: 0.0000021148083662163654",
            "extra": "mean: 9.763335000094742 usec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 70565.36659916764,
            "unit": "iter/sec",
            "range": "stddev: 0.0000011302821604656077",
            "extra": "mean: 14.171257774090494 usec\nrounds: 73417"
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
          "id": "a7c906b6f008567ba08842bc87e1f39a6ef27589",
          "message": "refactor: acquire the tree lock once per mutating call (merges PR #91, addresses #88)\n\nA `@check_lock @track_changes` method took the tree lock three times:\nonce in check_lock, again in track_changes, and again in\ntracking_create_change. TrackedAttr assignment took it twice.\n\n- tracking_create_change is now a locking wrapper around\n  _tracking_create_change_locked, which internal paths call when they\n  already hold the lock.\n- The body of track_changes moved into _run_tracked. track_changes\n  registers that lock-free body in _UNLOCKED_BODIES, and check_lock runs\n  it under the lock it already holds. track_changes still locks when it\n  is used on its own, and no decorator stack changed.\n- The lock/unlock and TrackedAttr paths that hold the lock call the\n  locked body.\n\nEach common mutation now takes the lock exactly once. That includes\nsetitem, pop, append, TrackedAttr assignment, and a nested setitem\nforwarded to a parent. tests/test_lock_acquisitions.py checks this with\na counting lock.\n\nAddresses #88\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sceyzGx67XLdcr5dPL\n\nCo-authored-by: Claude Opus 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-05T14:25:15Z",
          "tree_id": "48b023b3902d1a2a8527ad639ed3a0de1141f8e8",
          "url": "https://github.com/endavis/pydatatracker/commit/a7c906b6f008567ba08842bc87e1f39a6ef27589"
        },
        "date": 1793888773076,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 464.6698910530474,
            "unit": "iter/sec",
            "range": "stddev: 0.00025795626665380873",
            "extra": "mean: 2.1520654108527952 msec\nrounds: 516"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 158.94857238367297,
            "unit": "iter/sec",
            "range": "stddev: 0.00006972237495544532",
            "extra": "mean: 6.291343074074184 msec\nrounds: 162"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 508.97468110120593,
            "unit": "iter/sec",
            "range": "stddev: 0.00003946545141259977",
            "extra": "mean: 1.9647342729041513 msec\nrounds: 513"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 523.4888016664678,
            "unit": "iter/sec",
            "range": "stddev: 0.000030467648897234344",
            "extra": "mean: 1.9102605381750524 msec\nrounds: 537"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_capped",
            "value": 504.9800144166185,
            "unit": "iter/sec",
            "range": "stddev: 0.00016228684585586168",
            "extra": "mean: 1.9802763900572513 msec\nrounds: 523"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 76377.2731725472,
            "unit": "iter/sec",
            "range": "stddev: 0.0000017002744877339724",
            "extra": "mean: 13.092900001036394 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 53240.29296420661,
            "unit": "iter/sec",
            "range": "stddev: 0.0000029228223458286128",
            "extra": "mean: 18.782766666447515 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 22127.581736115808,
            "unit": "iter/sec",
            "range": "stddev: 0.000011169611504554932",
            "extra": "mean: 45.192466665611164 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[1000]",
            "value": 58902.18114912155,
            "unit": "iter/sec",
            "range": "stddev: 0.000003695450232926121",
            "extra": "mean: 16.97729999960984 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[10000]",
            "value": 30042.87117726494,
            "unit": "iter/sec",
            "range": "stddev: 0.000007119896979931244",
            "extra": "mean: 33.28576666656128 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[20000]",
            "value": 15696.533682268942,
            "unit": "iter/sec",
            "range": "stddev: 0.000009596784193901126",
            "extra": "mean: 63.708333332831074 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[1000]",
            "value": 59933.35410953994,
            "unit": "iter/sec",
            "range": "stddev: 0.000004762816064016142",
            "extra": "mean: 16.685200000191948 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[10000]",
            "value": 27410.978279267725,
            "unit": "iter/sec",
            "range": "stddev: 0.0000059046928793475635",
            "extra": "mean: 36.481733333696795 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[20000]",
            "value": 15392.24046368907,
            "unit": "iter/sec",
            "range": "stddev: 0.000008529962635947564",
            "extra": "mean: 64.96780000020408 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 14969.381637059494,
            "unit": "iter/sec",
            "range": "stddev: 0.000006095865577453245",
            "extra": "mean: 66.80302662097368 usec\nrounds: 16040"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 65818.68072538322,
            "unit": "iter/sec",
            "range": "stddev: 0.0000025212408109401732",
            "extra": "mean: 15.193254999630312 usec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 52013.04099078696,
            "unit": "iter/sec",
            "range": "stddev: 0.0000020774204394428262",
            "extra": "mean: 19.225947588358263 usec\nrounds: 54568"
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
          "id": "d44b0760f724868bd0726056fe5e13d21c9fcd2f",
          "message": "fix: raise KeyError from TrackedDict.pop on a missing key (merges PR #92, addresses #51)\n\nfix: raise KeyError from TrackedDict.pop on a missing key without a default\n\npop(missing) returned None and logged an update entry. Use a private\n_MISSING sentinel default so dict.pop raises, as the builtin does, and\nno change entry is recorded.\n\nBREAKING CHANGE: TrackedDict.pop(missing_key) now raises KeyError like\ndict.pop instead of returning None. Pass a default, pop(key, None), to\nkeep the old result.\n\nAddresses #51\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sceyzGx67XLdcr5dPL\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-05T14:46:20Z",
          "tree_id": "26457e1da4ffaead48a5585d794184475084349e",
          "url": "https://github.com/endavis/pydatatracker/commit/d44b0760f724868bd0726056fe5e13d21c9fcd2f"
        },
        "date": 1793890041087,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 688.1739522690963,
            "unit": "iter/sec",
            "range": "stddev: 0.0001100930422950318",
            "extra": "mean: 1.4531209684742188 msec\nrounds: 793"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 265.40922400225526,
            "unit": "iter/sec",
            "range": "stddev: 0.0001247477280021294",
            "extra": "mean: 3.7677665641021685 msec\nrounds: 273"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 766.4943470943998,
            "unit": "iter/sec",
            "range": "stddev: 0.00003053846424134714",
            "extra": "mean: 1.3046410632912888 msec\nrounds: 790"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 779.0086022411845,
            "unit": "iter/sec",
            "range": "stddev: 0.000022474870129410593",
            "extra": "mean: 1.2836828722083813 msec\nrounds: 806"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_capped",
            "value": 772.3728584180267,
            "unit": "iter/sec",
            "range": "stddev: 0.000018275793646701144",
            "extra": "mean: 1.2947114714105814 msec\nrounds: 787"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 134423.05623057505,
            "unit": "iter/sec",
            "range": "stddev: 0.0000011666717582966693",
            "extra": "mean: 7.4392000006658545 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 71019.02836145721,
            "unit": "iter/sec",
            "range": "stddev: 0.0000032472598836844955",
            "extra": "mean: 14.080733334035738 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 27879.6676370445,
            "unit": "iter/sec",
            "range": "stddev: 0.00000649743008433618",
            "extra": "mean: 35.86843333351908 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[1000]",
            "value": 109639.50532004239,
            "unit": "iter/sec",
            "range": "stddev: 0.0000028269904240253214",
            "extra": "mean: 9.120799998877754 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[10000]",
            "value": 49592.59681906954,
            "unit": "iter/sec",
            "range": "stddev: 0.000010198816027250092",
            "extra": "mean: 20.164299999218354 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[20000]",
            "value": 36210.23663388009,
            "unit": "iter/sec",
            "range": "stddev: 0.000003038215070039881",
            "extra": "mean: 27.61650000001244 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[1000]",
            "value": 108895.68882662916,
            "unit": "iter/sec",
            "range": "stddev: 0.0000032990674686343604",
            "extra": "mean: 9.18309999941395 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[10000]",
            "value": 71944.34385534796,
            "unit": "iter/sec",
            "range": "stddev: 0.000002341208800935568",
            "extra": "mean: 13.899633333380734 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[20000]",
            "value": 42277.220188183244,
            "unit": "iter/sec",
            "range": "stddev: 0.0000019368022450243435",
            "extra": "mean: 23.65340000001955 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 24450.523857292428,
            "unit": "iter/sec",
            "range": "stddev: 0.000004932229463663029",
            "extra": "mean: 40.898919214843225 usec\nrounds: 28223"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 106749.33334844894,
            "unit": "iter/sec",
            "range": "stddev: 0.0000021725463444725054",
            "extra": "mean: 9.367740000172375 usec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 89242.77976773972,
            "unit": "iter/sec",
            "range": "stddev: 0.0000011532286452416217",
            "extra": "mean: 11.205388296986788 usec\nrounds: 97428"
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
          "id": "9dc7e81b760020f2c0cd963103923be438727f93",
          "message": "fix: do not log no-op operations on tracked containers (merges PR #94, addresses #62)\n\nfix: do not log no-op operations on tracked containers (addresses #62)\n\npop(missing, default), setdefault on an existing key, clear() on an empty\ndict or list, and sort()/reverse() that leave the order unchanged no longer\nrecord a change entry.\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sceyzGx67XLdcr5dPL\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-05T14:50:20Z",
          "tree_id": "dc110004db8fb19e94a1e7453662d3a797bdb1d4",
          "url": "https://github.com/endavis/pydatatracker/commit/9dc7e81b760020f2c0cd963103923be438727f93"
        },
        "date": 1793890283873,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 507.75992585802163,
            "unit": "iter/sec",
            "range": "stddev: 0.000040100032132226464",
            "extra": "mean: 1.9694346660189508 msec\nrounds: 515"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 160.3564051948394,
            "unit": "iter/sec",
            "range": "stddev: 0.0000637271665114412",
            "extra": "mean: 6.236108865030745 msec\nrounds: 163"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 504.993412267482,
            "unit": "iter/sec",
            "range": "stddev: 0.000024490994173631424",
            "extra": "mean: 1.9802238518516075 msec\nrounds: 513"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 535.7945924054535,
            "unit": "iter/sec",
            "range": "stddev: 0.00002066001220251817",
            "extra": "mean: 1.8663868844037659 msec\nrounds: 545"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_capped",
            "value": 522.7211554086755,
            "unit": "iter/sec",
            "range": "stddev: 0.000024942532003272418",
            "extra": "mean: 1.9130658662899858 msec\nrounds: 531"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 81655.9833300284,
            "unit": "iter/sec",
            "range": "stddev: 5.443689637995935e-7",
            "extra": "mean: 12.246500001822369 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 59146.51578076972,
            "unit": "iter/sec",
            "range": "stddev: 0.0000023467817882020865",
            "extra": "mean: 16.907166665684294 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 39044.65537209828,
            "unit": "iter/sec",
            "range": "stddev: 0.000005122532065675071",
            "extra": "mean: 25.6117000001647 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[1000]",
            "value": 59047.214153852336,
            "unit": "iter/sec",
            "range": "stddev: 0.000003929424331122735",
            "extra": "mean: 16.935599999593855 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[10000]",
            "value": 40004.2137775317,
            "unit": "iter/sec",
            "range": "stddev: 0.000003769125789015131",
            "extra": "mean: 24.99736666644973 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[20000]",
            "value": 34153.19986907915,
            "unit": "iter/sec",
            "range": "stddev: 0.00000517253552268188",
            "extra": "mean: 29.27983333430954 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[1000]",
            "value": 63100.10832394179,
            "unit": "iter/sec",
            "range": "stddev: 0.0000033626894016756854",
            "extra": "mean: 15.847833332808628 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[10000]",
            "value": 46729.117532645825,
            "unit": "iter/sec",
            "range": "stddev: 0.000004118140256712543",
            "extra": "mean: 21.399933334957193 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[20000]",
            "value": 40119.39531913446,
            "unit": "iter/sec",
            "range": "stddev: 0.000004435121400794753",
            "extra": "mean: 24.92560000083207 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 15190.600418462041,
            "unit": "iter/sec",
            "range": "stddev: 0.0000064998738311562435",
            "extra": "mean: 65.83018264272428 usec\nrounds: 16097"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 67377.97596181309,
            "unit": "iter/sec",
            "range": "stddev: 0.0000027222700455126174",
            "extra": "mean: 14.841644999350478 usec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 53308.48691160377,
            "unit": "iter/sec",
            "range": "stddev: 0.000001615839351442242",
            "extra": "mean: 18.758739141446686 usec\nrounds: 55118"
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
          "id": "ac248989d0c8e8c56ed12e1e12d22d788588efa5",
          "message": "fix: log the stored values from TrackedList.extend (merges PR #95, addresses #61)\n\nfix: log stored values in TrackedList.extend\n\nextend logged the argument, so a generator was recorded as an exhausted\ngenerator object. Materialize the iterable once and log the stored\n(converted) list. This also lets a locked list take a generator.\n\nAddresses #61\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sceyzGx67XLdcr5dPL\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-05T15:06:47Z",
          "tree_id": "b3fc6641e3db1a0d40f5fc19f7e4cff84cebb911",
          "url": "https://github.com/endavis/pydatatracker/commit/ac248989d0c8e8c56ed12e1e12d22d788588efa5"
        },
        "date": 1793891267381,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 640.8813768869501,
            "unit": "iter/sec",
            "range": "stddev: 0.00016254128483118868",
            "extra": "mean: 1.5603511602372517 msec\nrounds: 674"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 195.28511082951698,
            "unit": "iter/sec",
            "range": "stddev: 0.000031152884553311494",
            "extra": "mean: 5.120718091370496 msec\nrounds: 197"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 663.3384031893813,
            "unit": "iter/sec",
            "range": "stddev: 0.000023989950057410107",
            "extra": "mean: 1.5075261664211272 msec\nrounds: 679"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 686.3826402923692,
            "unit": "iter/sec",
            "range": "stddev: 0.000018150993370437154",
            "extra": "mean: 1.456913303597019 msec\nrounds: 695"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_capped",
            "value": 673.4502987063033,
            "unit": "iter/sec",
            "range": "stddev: 0.00002320316995649306",
            "extra": "mean: 1.4848905730994522 msec\nrounds: 684"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 129020.60459792278,
            "unit": "iter/sec",
            "range": "stddev: 6.384589824930322e-7",
            "extra": "mean: 7.75069999955728 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 83873.15025156233,
            "unit": "iter/sec",
            "range": "stddev: 8.604382872068157e-7",
            "extra": "mean: 11.92276666609852 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 35235.04712685646,
            "unit": "iter/sec",
            "range": "stddev: 0.000005616020122036143",
            "extra": "mean: 28.380833333348697 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[1000]",
            "value": 85657.26244952255,
            "unit": "iter/sec",
            "range": "stddev: 0.000003644668724985882",
            "extra": "mean: 11.674433333534276 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[10000]",
            "value": 47885.68728606195,
            "unit": "iter/sec",
            "range": "stddev: 0.000011375508324608914",
            "extra": "mean: 20.88306666720996 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[20000]",
            "value": 33759.79455923163,
            "unit": "iter/sec",
            "range": "stddev: 0.000005005106947190293",
            "extra": "mean: 29.62103333435569 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[1000]",
            "value": 98045.94432148681,
            "unit": "iter/sec",
            "range": "stddev: 0.0000026919997709209997",
            "extra": "mean: 10.19930000083491 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[10000]",
            "value": 51669.528585994856,
            "unit": "iter/sec",
            "range": "stddev: 0.000005017336508304584",
            "extra": "mean: 19.353766666085903 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[20000]",
            "value": 41887.03903352863,
            "unit": "iter/sec",
            "range": "stddev: 0.000005411431565829011",
            "extra": "mean: 23.873733333109232 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 22299.643882237702,
            "unit": "iter/sec",
            "range": "stddev: 0.0000022856112007655507",
            "extra": "mean: 44.84376545566849 usec\nrounds: 23066"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 108794.63163950328,
            "unit": "iter/sec",
            "range": "stddev: 0.0000014563642766318226",
            "extra": "mean: 9.19162999984735 usec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 71755.73087589855,
            "unit": "iter/sec",
            "range": "stddev: 0.0000011309195166497523",
            "extra": "mean: 13.936169108631878 usec\nrounds: 75076"
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
          "id": "bc3b45a116d3d5aed5f34097a613db0864701cc2",
          "message": "fix: show the most recent 20 changes in tracking_get_formatted_updates (merges PR #96, addresses #57)\n\nIt took the oldest 20 entries via islice; use tracking_changes(most_recent=20)\nso the newest 20 are shown, still in chronological order.\n\nAddresses #57\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sceyzGx67XLdcr5dPL\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-05T15:11:08Z",
          "tree_id": "a7e34559ef5d8eb74b213f3516031eefa4fea14a",
          "url": "https://github.com/endavis/pydatatracker/commit/bc3b45a116d3d5aed5f34097a613db0864701cc2"
        },
        "date": 1793891802917,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 670.4652341200174,
            "unit": "iter/sec",
            "range": "stddev: 0.00005442020235408416",
            "extra": "mean: 1.4915016455886716 msec\nrounds: 680"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 211.43228964173858,
            "unit": "iter/sec",
            "range": "stddev: 0.00003626552930895694",
            "extra": "mean: 4.729646553487408 msec\nrounds: 215"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 666.7549766348509,
            "unit": "iter/sec",
            "range": "stddev: 0.000018538170106441724",
            "extra": "mean: 1.499801328888545 msec\nrounds: 675"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 699.0761677877446,
            "unit": "iter/sec",
            "range": "stddev: 0.00002218956289090825",
            "extra": "mean: 1.430459291960333 msec\nrounds: 709"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_capped",
            "value": 684.9634902632648,
            "unit": "iter/sec",
            "range": "stddev: 0.000014574169627386859",
            "extra": "mean: 1.4599318273382005 msec\nrounds: 695"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 125589.22279030117,
            "unit": "iter/sec",
            "range": "stddev: 6.587236791317132e-7",
            "extra": "mean: 7.96246666538991 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 84572.5562272693,
            "unit": "iter/sec",
            "range": "stddev: 9.874647791566667e-7",
            "extra": "mean: 11.824166663624663 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 38098.09242576459,
            "unit": "iter/sec",
            "range": "stddev: 0.000005178224684683538",
            "extra": "mean: 26.24803333522626 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[1000]",
            "value": 97315.39267364121,
            "unit": "iter/sec",
            "range": "stddev: 0.0000033430045097078927",
            "extra": "mean: 10.27586666945505 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[10000]",
            "value": 52390.12480843055,
            "unit": "iter/sec",
            "range": "stddev: 0.000003239428383102955",
            "extra": "mean: 19.087566667508327 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[20000]",
            "value": 35179.515202617826,
            "unit": "iter/sec",
            "range": "stddev: 0.0000037643721384814945",
            "extra": "mean: 28.425633333502752 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[1000]",
            "value": 101030.8514512996,
            "unit": "iter/sec",
            "range": "stddev: 0.0000027600934092112887",
            "extra": "mean: 9.897966666964445 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[10000]",
            "value": 59903.79449651556,
            "unit": "iter/sec",
            "range": "stddev: 0.0000027310398495713134",
            "extra": "mean: 16.693433335982867 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[20000]",
            "value": 45096.167575884894,
            "unit": "iter/sec",
            "range": "stddev: 0.000006030018669917952",
            "extra": "mean: 22.174833334058043 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 22408.349363285506,
            "unit": "iter/sec",
            "range": "stddev: 0.0000020830311332010983",
            "extra": "mean: 44.62622318975574 usec\nrounds: 23200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 108583.23312387809,
            "unit": "iter/sec",
            "range": "stddev: 0.0000016429626739983569",
            "extra": "mean: 9.209524999675978 usec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 72461.28912382173,
            "unit": "iter/sec",
            "range": "stddev: 0.0000010604786027741857",
            "extra": "mean: 13.800472115410502 usec\nrounds: 74683"
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
          "id": "2d5e204dbd58701ecbb22b08bc41c05faf654a2d",
          "message": "fix: accept naive datetimes in changes_since (merges PR #97, addresses #58)\n\nfix: accept naive datetimes in changes_since (addresses #58)\n\nA naive datetime is interpreted as local time via astimezone(), so it no\nlonger raises TypeError against tz-aware entry timestamps. _tracking_created\nis now timezone-aware, matching the change-log timestamps.\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sceyzGx67XLdcr5dPL\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-05T15:16:10Z",
          "tree_id": "5e2cf039737146f92175ca96f68a75c7cb018e6e",
          "url": "https://github.com/endavis/pydatatracker/commit/2d5e204dbd58701ecbb22b08bc41c05faf654a2d"
        },
        "date": 1793891838411,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 513.73873069528,
            "unit": "iter/sec",
            "range": "stddev: 0.000032115353554371564",
            "extra": "mean: 1.9465147170170085 msec\nrounds: 523"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 158.65183465155337,
            "unit": "iter/sec",
            "range": "stddev: 0.00006525158519125368",
            "extra": "mean: 6.303110217390789 msec\nrounds: 161"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 512.887282894485,
            "unit": "iter/sec",
            "range": "stddev: 0.00003063208121639116",
            "extra": "mean: 1.9497461398467302 msec\nrounds: 522"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 539.3778655650897,
            "unit": "iter/sec",
            "range": "stddev: 0.00002170360299121657",
            "extra": "mean: 1.853987832727119 msec\nrounds: 550"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_capped",
            "value": 530.113683896637,
            "unit": "iter/sec",
            "range": "stddev: 0.000033256517167199",
            "extra": "mean: 1.8863878265685041 msec\nrounds: 542"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 78317.53058651651,
            "unit": "iter/sec",
            "range": "stddev: 4.89146881586902e-7",
            "extra": "mean: 12.768533334887403 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 58815.11077651375,
            "unit": "iter/sec",
            "range": "stddev: 0.000002294033109019339",
            "extra": "mean: 17.00243333383848 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 38819.97624360966,
            "unit": "iter/sec",
            "range": "stddev: 0.000004133787942466149",
            "extra": "mean: 25.759933332381024 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[1000]",
            "value": 57015.14322269657,
            "unit": "iter/sec",
            "range": "stddev: 0.0000031919214563066727",
            "extra": "mean: 17.53919999979795 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[10000]",
            "value": 36885.12496647118,
            "unit": "iter/sec",
            "range": "stddev: 0.000004280968513837242",
            "extra": "mean: 27.111200000244178 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[20000]",
            "value": 28554.2416381357,
            "unit": "iter/sec",
            "range": "stddev: 0.000003944990013493677",
            "extra": "mean: 35.02106666578205 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[1000]",
            "value": 57286.017627126625,
            "unit": "iter/sec",
            "range": "stddev: 0.000006019643053071575",
            "extra": "mean: 17.456266667181808 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[10000]",
            "value": 42815.367293050804,
            "unit": "iter/sec",
            "range": "stddev: 0.000003258321477677343",
            "extra": "mean: 23.356099999224018 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[20000]",
            "value": 36628.694921399954,
            "unit": "iter/sec",
            "range": "stddev: 0.000005292055693173875",
            "extra": "mean: 27.300999998658426 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 15291.175381540148,
            "unit": "iter/sec",
            "range": "stddev: 0.000005720379469573726",
            "extra": "mean: 65.39719642528085 usec\nrounds: 16393"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 67844.88353261609,
            "unit": "iter/sec",
            "range": "stddev: 0.0000025271965095368246",
            "extra": "mean: 14.739504999212727 usec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 53016.88140761157,
            "unit": "iter/sec",
            "range": "stddev: 0.000002001886107433186",
            "extra": "mean: 18.861916684832227 usec\nrounds: 55176"
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
          "id": "edaa3331a93f0ad922ee1a8bcd67ffbfda5c8c6e",
          "message": "fix: auto-convert only exact dict and list values (merges PR #98, addresses #60)\n\n_tracking_convert_to_trackable converted any isinstance(obj, dict/list)\nvalue. That flattened defaultdict, OrderedDict, Counter and user\nsubclasses into a plain TrackedDict or TrackedList, which lost their\nbehaviour. For example, a defaultdict stopped creating missing keys.\n\nAuto-convert now converts only values whose type is exactly dict or\nlist. A subclass instance is stored as it is: it keeps its type and\nbehaviour, and its contents are not tracked. Replacing the value is\nstill recorded. docs/usage/basics.md documents the rule and points to\nthe _tracking_convert_item hook for converting your own types.\n\nBREAKING CHANGE: with tracking_auto_convert=True, dict and list\nsubclasses (defaultdict, OrderedDict, Counter, user subclasses) are no\nlonger converted to TrackedDict or TrackedList. They are stored\nunchanged. To keep converting a type, override _tracking_convert_item\nand return a TrackedDict or TrackedList for it.\n\nAddresses #60\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sceyzGx67XLdcr5dPL\n\nCo-authored-by: Claude Opus 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-05T15:33:44Z",
          "tree_id": "6011184a107645c78774c743cb96df01386e8c07",
          "url": "https://github.com/endavis/pydatatracker/commit/edaa3331a93f0ad922ee1a8bcd67ffbfda5c8c6e"
        },
        "date": 1793892896639,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 507.41363803586404,
            "unit": "iter/sec",
            "range": "stddev: 0.000026465562643787567",
            "extra": "mean: 1.9707787198445779 msec\nrounds: 514"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 159.33807517151257,
            "unit": "iter/sec",
            "range": "stddev: 0.00006263628258727534",
            "extra": "mean: 6.275963851851438 msec\nrounds: 162"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 500.33530576385334,
            "unit": "iter/sec",
            "range": "stddev: 0.00015902370451121382",
            "extra": "mean: 1.9986596757814583 msec\nrounds: 512"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 531.1960164391072,
            "unit": "iter/sec",
            "range": "stddev: 0.000022306674600936418",
            "extra": "mean: 1.8825442380075401 msec\nrounds: 542"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_capped",
            "value": 517.6184741738565,
            "unit": "iter/sec",
            "range": "stddev: 0.00003321956433636251",
            "extra": "mean: 1.9319248633775044 msec\nrounds: 527"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 75583.50466147791,
            "unit": "iter/sec",
            "range": "stddev: 0.0000026439814756231887",
            "extra": "mean: 13.230399999031306 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 61776.82503609237,
            "unit": "iter/sec",
            "range": "stddev: 8.941787273218089e-7",
            "extra": "mean: 16.18730000150966 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 33829.49932273369,
            "unit": "iter/sec",
            "range": "stddev: 0.000005775042653486892",
            "extra": "mean: 29.560000000590968 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[1000]",
            "value": 56050.25091856944,
            "unit": "iter/sec",
            "range": "stddev: 0.000004647874989649336",
            "extra": "mean: 17.841133333244365 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[10000]",
            "value": 42372.46242000341,
            "unit": "iter/sec",
            "range": "stddev: 0.00000400674193806789",
            "extra": "mean: 23.60023333286184 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[20000]",
            "value": 29276.00441180211,
            "unit": "iter/sec",
            "range": "stddev: 0.000005978554919173311",
            "extra": "mean: 34.15766666563513 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[1000]",
            "value": 60413.3481278914,
            "unit": "iter/sec",
            "range": "stddev: 0.000003783776680029914",
            "extra": "mean: 16.552633333333233 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[10000]",
            "value": 47483.455969027935,
            "unit": "iter/sec",
            "range": "stddev: 0.0000026505583469894526",
            "extra": "mean: 21.059966668227993 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[20000]",
            "value": 37767.868611932165,
            "unit": "iter/sec",
            "range": "stddev: 0.000004695368090307791",
            "extra": "mean: 26.47753333064884 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 15220.585433234814,
            "unit": "iter/sec",
            "range": "stddev: 0.0000053338041663774105",
            "extra": "mean: 65.70049518702851 usec\nrounds: 16206"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 66503.55561186273,
            "unit": "iter/sec",
            "range": "stddev: 0.0000030581054969387688",
            "extra": "mean: 15.036790000166889 usec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 51885.966165011036,
            "unit": "iter/sec",
            "range": "stddev: 0.000003884186522990787",
            "extra": "mean: 19.27303419232354 usec\nrounds: 55451"
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
          "id": "f5d7a6fd3d5053eedd6ff66b2d82db8360b086b9",
          "message": "feat: unify the tracked containers' constructor options (merges PR #99, addresses #69)\n\nTrackedDict, TrackedList and TrackedAttr now take the same keyword-only\ntracking options with the same defaults. TrackBase.__init__ no longer\nhas **kwargs, so an unknown option raises TypeError.\n\nOptions:\n- tracking_name, tracking_auto_convert, tracking_parent and\n  tracking_location.\n- tracking_capture_snapshots, tracking_capture_stack,\n  tracking_record_init and tracking_max_changes. For these, None\n  inherits the parent's value, or else the default.\n- tracking_auto_convert defaults to False on all three types.\n\nOther changes:\n- TrackedDict keeps keyword data (TrackedDict(a=1)). A tracking_* keyword\n  that is not an option now raises TypeError instead of silently becoming\n  data.\n- New read-only properties tracking_name and tracking_created.\n  TrackedAttr._tracking_get_original_value is now the public\n  tracking_get_original_value.\n- The internal tracking_auto_converted_in parameter and attribute are\n  removed.\n- Fixed: a TrackedAttr child stored None for the capture settings\n  instead of inheriting them from its parent.\n\nADR-0004 records the decision. docs/usage/basics.md documents the\noption set under \"Constructor options\".\n\nBREAKING CHANGE: the tracking options are keyword-only on all three\ncontainers, and an unknown option raises TypeError. TrackedAttr's\ntracking_auto_convert now defaults to False; pass\ntracking_auto_convert=True to keep converting. tracking_auto_converted_in\nis removed. TrackedDict rejects tracking_* keyword data; pass such keys\nin a mapping, TrackedDict({\"tracking_x\": 1}).\n_tracking_get_original_value is renamed tracking_get_original_value.\n\nAddresses #69\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sceyzGx67XLdcr5dPL\n\nCo-authored-by: Claude Opus 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-05T15:50:34Z",
          "tree_id": "d48f2e101cdce9220cfd899647a583a887028973",
          "url": "https://github.com/endavis/pydatatracker/commit/f5d7a6fd3d5053eedd6ff66b2d82db8360b086b9"
        },
        "date": 1793893891830,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 498.321629516566,
            "unit": "iter/sec",
            "range": "stddev: 0.00003498265226541514",
            "extra": "mean: 2.006736093253918 msec\nrounds: 504"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 155.67254572553597,
            "unit": "iter/sec",
            "range": "stddev: 0.00007787294482877528",
            "extra": "mean: 6.423740264150916 msec\nrounds: 159"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 495.33950268842614,
            "unit": "iter/sec",
            "range": "stddev: 0.00003796316164212611",
            "extra": "mean: 2.0188173860000234 msec\nrounds: 500"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 525.0471403675222,
            "unit": "iter/sec",
            "range": "stddev: 0.000043268379842599716",
            "extra": "mean: 1.904590889305712 msec\nrounds: 533"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_capped",
            "value": 514.4941455320549,
            "unit": "iter/sec",
            "range": "stddev: 0.00003664980592997293",
            "extra": "mean: 1.943656713461468 msec\nrounds: 520"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 78091.8516345189,
            "unit": "iter/sec",
            "range": "stddev: 5.662634742766118e-7",
            "extra": "mean: 12.805433333558844 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 59265.815082369576,
            "unit": "iter/sec",
            "range": "stddev: 0.0000011252314016159949",
            "extra": "mean: 16.87313333344302 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 31239.489213260065,
            "unit": "iter/sec",
            "range": "stddev: 0.000006875444971606064",
            "extra": "mean: 32.01076666693818 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[1000]",
            "value": 54089.04138122751,
            "unit": "iter/sec",
            "range": "stddev: 0.000005521361828251665",
            "extra": "mean: 18.48803333288629 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[10000]",
            "value": 37951.48029768848,
            "unit": "iter/sec",
            "range": "stddev: 0.000004829374490862308",
            "extra": "mean: 26.34943333319484 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[20000]",
            "value": 27098.067907636447,
            "unit": "iter/sec",
            "range": "stddev: 0.000006433573361831943",
            "extra": "mean: 36.903000000165775 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[1000]",
            "value": 60897.75469978148,
            "unit": "iter/sec",
            "range": "stddev: 0.000003213731738519028",
            "extra": "mean: 16.420966666667407 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[10000]",
            "value": 41461.77638769792,
            "unit": "iter/sec",
            "range": "stddev: 0.0000044626189821387015",
            "extra": "mean: 24.11860000037791 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[20000]",
            "value": 29292.298078423766,
            "unit": "iter/sec",
            "range": "stddev: 0.000008548620103643373",
            "extra": "mean: 34.138666666668385 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 15850.715888174738,
            "unit": "iter/sec",
            "range": "stddev: 0.000005570180995231701",
            "extra": "mean: 63.088633160476974 usec\nrounds: 16773"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 70328.48324562935,
            "unit": "iter/sec",
            "range": "stddev: 0.0000025386822462732225",
            "extra": "mean: 14.218990000216536 usec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 59161.3264784507,
            "unit": "iter/sec",
            "range": "stddev: 0.000001964682332368108",
            "extra": "mean: 16.90293405379013 usec\nrounds: 61535"
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
          "id": "f9f4586d742ae302906558425f4fffe568499fe5",
          "message": "refactor: move duplicated notify, tree and uuid-tree logic into TrackBase (merges PR #100, addresses #70)\n\nTrackedDict, TrackedList and TrackedAttr each carried near-copies of the\nsame internals. These now live once on TrackBase:\n- Re-homing a child's change entry happens in\n  TrackBase._tracking_notify_observers, in the same order as before:\n  re-home, record, then the observer loop. The three overrides are gone.\n- One _tracking_format_tree_location serves all three types. It branches\n  on a _tracking_subscript_locations class flag, which dict and list set.\n- _tracking_known_uuids_tree and its helper moved to TrackBase. Each\n  type now supplies only a _tracking_tree_children hook.\n- TrackBase no longer imports its own subclasses to classify an object.\n  A _tracking_kind class attribute replaces _trackable_classes and\n  _load_trackable_classes.\n\nBehaviour is unchanged, and every existing test passes without edits.\ntests/test_trackbase_dedupe.py pins the re-homed entries, tree\nlocations and uuid-tree strings. It was written against the unmodified\nsource before the refactor.\n\nNotes:\n- #69 already covered the issue's __init__ bullet.\n- #56 is deliberately left alone. TrackedList's tree hook keeps the\n  self.index lookup, so after this change the #56 fix is a one-method\n  edit.\n- TrackedAttr._tracking_known_uuids_tree's private parameters are now\n  ordered (level, emptybar, attribute_name), to satisfy mypy's override\n  check. Every caller passes them by keyword.\n\nAddresses #70\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sceyzGx67XLdcr5dPL\n\nCo-authored-by: Claude Opus 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-05T16:12:28Z",
          "tree_id": "5037f8f0402fe9b0093c592d208ed60b4c2e87fa",
          "url": "https://github.com/endavis/pydatatracker/commit/f9f4586d742ae302906558425f4fffe568499fe5"
        },
        "date": 1793895223221,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 512.7863631958326,
            "unit": "iter/sec",
            "range": "stddev: 0.00010668354870478069",
            "extra": "mean: 1.9501298625956265 msec\nrounds: 524"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 160.1154116602283,
            "unit": "iter/sec",
            "range": "stddev: 0.00012980345425537936",
            "extra": "mean: 6.245494981595166 msec\nrounds: 163"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 514.702240806055,
            "unit": "iter/sec",
            "range": "stddev: 0.000036541945804334816",
            "extra": "mean: 1.9428708886791306 msec\nrounds: 530"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 539.4597454961469,
            "unit": "iter/sec",
            "range": "stddev: 0.00009862737070894427",
            "extra": "mean: 1.853706431941997 msec\nrounds: 551"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_capped",
            "value": 536.0835383401622,
            "unit": "iter/sec",
            "range": "stddev: 0.00003142979805466956",
            "extra": "mean: 1.8653809126395293 msec\nrounds: 538"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 80040.34033296682,
            "unit": "iter/sec",
            "range": "stddev: 0.000001142335935340041",
            "extra": "mean: 12.493699999775268 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 62363.4500318035,
            "unit": "iter/sec",
            "range": "stddev: 0.0000010752503944142327",
            "extra": "mean: 16.035033332665687 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 34932.87066619569,
            "unit": "iter/sec",
            "range": "stddev: 0.000005608298797817934",
            "extra": "mean: 28.62633333388468 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[1000]",
            "value": 58118.922939894685,
            "unit": "iter/sec",
            "range": "stddev: 0.0000037037604041906273",
            "extra": "mean: 17.206100000066726 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[10000]",
            "value": 41166.60674718301,
            "unit": "iter/sec",
            "range": "stddev: 0.000004134015587583653",
            "extra": "mean: 24.291533332861565 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[20000]",
            "value": 34534.56045992181,
            "unit": "iter/sec",
            "range": "stddev: 0.000004833685647918545",
            "extra": "mean: 28.956500001224107 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[1000]",
            "value": 60107.953882714086,
            "unit": "iter/sec",
            "range": "stddev: 0.000004061120492164241",
            "extra": "mean: 16.63673333401524 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[10000]",
            "value": 45330.915683794075,
            "unit": "iter/sec",
            "range": "stddev: 0.0000034632398929768645",
            "extra": "mean: 22.06000000034199 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[20000]",
            "value": 27562.02834520561,
            "unit": "iter/sec",
            "range": "stddev: 0.000007435536065984018",
            "extra": "mean: 36.281799999452836 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 16324.75846134424,
            "unit": "iter/sec",
            "range": "stddev: 0.00000498367246795411",
            "extra": "mean: 61.25664905658006 usec\nrounds: 17225"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 72481.46830312198,
            "unit": "iter/sec",
            "range": "stddev: 0.0000020373210712459956",
            "extra": "mean: 13.796629999518473 usec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 59386.772883001846,
            "unit": "iter/sec",
            "range": "stddev: 0.0000016450206838913955",
            "extra": "mean: 16.838766470272844 usec\nrounds: 61611"
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
          "id": "82df3cba9bbffb99bc17e36d7e0e9097e6e8db8c",
          "message": "fix: build the TrackedList uuid tree for lists with equal items (merges PR #101, addresses #56)\n\nfix: label list uuid-tree children by position\n\nTrackedList._tracking_tree_children used self.index(item), which raised\nValueError or mislabelled lists with equal items. Iterate with enumerate.\n\nAddresses #56\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sceyzGx67XLdcr5dPL\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-05T16:34:25Z",
          "tree_id": "d9144eeb55cfe8c52d1a809c62b89bf00c82b2f8",
          "url": "https://github.com/endavis/pydatatracker/commit/82df3cba9bbffb99bc17e36d7e0e9097e6e8db8c"
        },
        "date": 1793896523524,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 443.64563252461994,
            "unit": "iter/sec",
            "range": "stddev: 0.00043692347784791627",
            "extra": "mean: 2.254051266794575 msec\nrounds: 521"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 160.65261732491146,
            "unit": "iter/sec",
            "range": "stddev: 0.0000709646958508249",
            "extra": "mean: 6.224610695122089 msec\nrounds: 164"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 511.5507409043221,
            "unit": "iter/sec",
            "range": "stddev: 0.00003312027240844797",
            "extra": "mean: 1.954840292543013 msec\nrounds: 523"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 548.600607518795,
            "unit": "iter/sec",
            "range": "stddev: 0.0001407961993942642",
            "extra": "mean: 1.8228197094472596 msec\nrounds: 561"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_capped",
            "value": 534.4140433556246,
            "unit": "iter/sec",
            "range": "stddev: 0.00003746738901486401",
            "extra": "mean: 1.8712083120438365 msec\nrounds: 548"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 78607.28846614878,
            "unit": "iter/sec",
            "range": "stddev: 6.139573004740857e-7",
            "extra": "mean: 12.721466666931747 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 60174.747468849,
            "unit": "iter/sec",
            "range": "stddev: 0.00000425076476617479",
            "extra": "mean: 16.61826666605748 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 32051.145080221453,
            "unit": "iter/sec",
            "range": "stddev: 0.0000065713287843426785",
            "extra": "mean: 31.20013333367903 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[1000]",
            "value": 53117.08776727215,
            "unit": "iter/sec",
            "range": "stddev: 0.000006384929035709532",
            "extra": "mean: 18.826333333284616 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[10000]",
            "value": 39867.374533275535,
            "unit": "iter/sec",
            "range": "stddev: 0.000003388376888301046",
            "extra": "mean: 25.083166667153968 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[20000]",
            "value": 34794.1462330674,
            "unit": "iter/sec",
            "range": "stddev: 0.0000049887871075111254",
            "extra": "mean: 28.740466666477005 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[1000]",
            "value": 61065.221726255804,
            "unit": "iter/sec",
            "range": "stddev: 0.000004349928909811003",
            "extra": "mean: 16.375933333752833 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[10000]",
            "value": 43915.763708957245,
            "unit": "iter/sec",
            "range": "stddev: 0.0000038532185980912506",
            "extra": "mean: 22.77086666708783 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[20000]",
            "value": 37124.02642270649,
            "unit": "iter/sec",
            "range": "stddev: 0.000004928299670637427",
            "extra": "mean: 26.93673333311608 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 16015.992475271034,
            "unit": "iter/sec",
            "range": "stddev: 0.000008017186683363295",
            "extra": "mean: 62.437591772349855 usec\nrounds: 17429"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 65373.14994042702,
            "unit": "iter/sec",
            "range": "stddev: 0.000004164086899471765",
            "extra": "mean: 15.29679999986655 usec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 58114.55720626133,
            "unit": "iter/sec",
            "range": "stddev: 0.000001777998050232009",
            "extra": "mean: 17.207392572067274 usec\nrounds: 61013"
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
          "id": "82e600c1fa83df6559ef9ed6974dd75f93fc6a44",
          "message": "refactor: remove unreachable lock branches and string sentinels (merges PR #102, addresses #71)\n\nrefactor: remove unreachable lock branches and string sentinels (addresses #71)\n\nEvery mutator is wrapped in check_lock, which raises before the body runs,\nso the `if not self._tracking_locked:` branches and their fallbacks in\nTrackedDict and TrackedList could never execute. Drop them. popitem and\nlist pop now take their value from the underlying container first, so the\nstring sentinels are gone.\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sceyzGx67XLdcr5dPL\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-05T16:38:20Z",
          "tree_id": "41f2195832c111ceeaf38e82fc6cf87a6fcc72d3",
          "url": "https://github.com/endavis/pydatatracker/commit/82e600c1fa83df6559ef9ed6974dd75f93fc6a44"
        },
        "date": 1793896761854,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 502.333034854965,
            "unit": "iter/sec",
            "range": "stddev: 0.000026050855724669075",
            "extra": "mean: 1.990711202755604 msec\nrounds: 508"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 160.28607367678978,
            "unit": "iter/sec",
            "range": "stddev: 0.00006248723439434546",
            "extra": "mean: 6.238845191357413 msec\nrounds: 162"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 492.922426123062,
            "unit": "iter/sec",
            "range": "stddev: 0.00004175635149452738",
            "extra": "mean: 2.0287167858545394 msec\nrounds: 509"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 531.1684720828162,
            "unit": "iter/sec",
            "range": "stddev: 0.00006078961346618702",
            "extra": "mean: 1.8826418595192653 msec\nrounds: 541"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_capped",
            "value": 522.6972649076587,
            "unit": "iter/sec",
            "range": "stddev: 0.00003297273760187314",
            "extra": "mean: 1.9131533052438356 msec\nrounds: 534"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 79266.72991037973,
            "unit": "iter/sec",
            "range": "stddev: 0.0000010973955176180181",
            "extra": "mean: 12.615633332302423 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 61317.467091179,
            "unit": "iter/sec",
            "range": "stddev: 0.0000018756383345460648",
            "extra": "mean: 16.308566668499225 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 35552.22681174709,
            "unit": "iter/sec",
            "range": "stddev: 0.000007902008382940722",
            "extra": "mean: 28.127633334899354 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[1000]",
            "value": 55805.64752419633,
            "unit": "iter/sec",
            "range": "stddev: 0.000004931807710180775",
            "extra": "mean: 17.919333335688254 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[10000]",
            "value": 37492.31407972708,
            "unit": "iter/sec",
            "range": "stddev: 0.000006207601213100224",
            "extra": "mean: 26.672133330407632 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[20000]",
            "value": 35227.43418893039,
            "unit": "iter/sec",
            "range": "stddev: 0.000006093226073472329",
            "extra": "mean: 28.38696666458418 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[1000]",
            "value": 59948.32453670576,
            "unit": "iter/sec",
            "range": "stddev: 0.00000692652505850843",
            "extra": "mean: 16.681033335430584 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[10000]",
            "value": 38216.21972706062,
            "unit": "iter/sec",
            "range": "stddev: 0.000006052654993690358",
            "extra": "mean: 26.166900000627415 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[20000]",
            "value": 36514.51877977187,
            "unit": "iter/sec",
            "range": "stddev: 0.000006994327761409044",
            "extra": "mean: 27.386366667769835 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 16099.629146279098,
            "unit": "iter/sec",
            "range": "stddev: 0.000004961265964111163",
            "extra": "mean: 62.113231982807335 usec\nrounds: 16984"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 68095.60759523102,
            "unit": "iter/sec",
            "range": "stddev: 0.000002870779693378775",
            "extra": "mean: 14.685234999944896 usec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 55403.10704519693,
            "unit": "iter/sec",
            "range": "stddev: 0.000004036264913886042",
            "extra": "mean: 18.04952922918595 usec\nrounds: 59239"
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
          "id": "c501d146b94f7ed76d3f425c18949c91b1f26255",
          "message": "refactor: clean up small code smells across the package (merges PR #103, addresses #72)\n\nAddresses #72\n\n- use the \"__setattr__\" literal instead of sys._getframe()\n- drop the suppress(Exception) around a plain dict assignment\n- replace the format_data string sentinel with an identity sentinel and\n  narrow the literal_eval except clause\n- hash ChangeLogEntry by uuid, consistent with __eq__\n- log _tracking_debug through a module logger with lazy formatting\n- remove the unused noqa TrackBase re-export from the package root\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sceyzGx67XLdcr5dPL\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-05T16:42:06Z",
          "tree_id": "067a002cb35162d0084f0c38bc36300f67c5cbd5",
          "url": "https://github.com/endavis/pydatatracker/commit/c501d146b94f7ed76d3f425c18949c91b1f26255"
        },
        "date": 1793896986282,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 669.9776483955904,
            "unit": "iter/sec",
            "range": "stddev: 0.000016161290816931114",
            "extra": "mean: 1.4925871070396468 msec\nrounds: 682"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 208.52926785143006,
            "unit": "iter/sec",
            "range": "stddev: 0.000035013081655069735",
            "extra": "mean: 4.795489910377788 msec\nrounds: 212"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 659.6358760244802,
            "unit": "iter/sec",
            "range": "stddev: 0.000016426557669307768",
            "extra": "mean: 1.5159878902082158 msec\nrounds: 674"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 699.5166215481438,
            "unit": "iter/sec",
            "range": "stddev: 0.000013219848361683981",
            "extra": "mean: 1.4295585968877162 msec\nrounds: 707"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_capped",
            "value": 682.7073079397807,
            "unit": "iter/sec",
            "range": "stddev: 0.000017161908834784317",
            "extra": "mean: 1.4647565484800797 msec\nrounds: 691"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 129482.80245642265,
            "unit": "iter/sec",
            "range": "stddev: 4.263917039062345e-7",
            "extra": "mean: 7.723033337470043 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 79794.02499622547,
            "unit": "iter/sec",
            "range": "stddev: 0.0000036993289197296014",
            "extra": "mean: 12.532266670935618 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 35874.01047887688,
            "unit": "iter/sec",
            "range": "stddev: 0.000005812505122183232",
            "extra": "mean: 27.875333330484864 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[1000]",
            "value": 96848.23556303859,
            "unit": "iter/sec",
            "range": "stddev: 0.0000034193485216711145",
            "extra": "mean: 10.3254333358412 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[10000]",
            "value": 51178.20763590931,
            "unit": "iter/sec",
            "range": "stddev: 0.000002626164043559115",
            "extra": "mean: 19.539566667011364 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[20000]",
            "value": 34598.24517784142,
            "unit": "iter/sec",
            "range": "stddev: 0.000008044440692848722",
            "extra": "mean: 28.90319999930095 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[1000]",
            "value": 101532.46329175666,
            "unit": "iter/sec",
            "range": "stddev: 0.0000029367859374350477",
            "extra": "mean: 9.849066668721207 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[10000]",
            "value": 54674.58596399373,
            "unit": "iter/sec",
            "range": "stddev: 0.0000042654378641401365",
            "extra": "mean: 18.290033337583132 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[20000]",
            "value": 43498.62325980671,
            "unit": "iter/sec",
            "range": "stddev: 0.000004417477434169222",
            "extra": "mean: 22.989233337966652 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 23829.00299730641,
            "unit": "iter/sec",
            "range": "stddev: 0.000002121793382545479",
            "extra": "mean: 41.96566680162986 usec\nrounds: 24703"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 117852.60763186018,
            "unit": "iter/sec",
            "range": "stddev: 0.0000012799711779303829",
            "extra": "mean: 8.485175000316758 usec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 79489.18787493004,
            "unit": "iter/sec",
            "range": "stddev: 0.0000010328265929706898",
            "extra": "mean: 12.580327296505043 usec\nrounds: 82659"
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
          "id": "326b0364efa999ac91511b68b480259893788421",
          "message": "docs: state that observer configs are trusted code and exporters run inline (merges PR #104, addresses #73)\n\nDocument that config files import and call callables by dotted path, that\nobservers and exporters run synchronously under the tree lock, that their\nexceptions surface from the mutation, and a queue pattern for slow sinks.\n\nAddresses #73\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sceyzGx67XLdcr5dPL\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-05T16:45:46Z",
          "tree_id": "c46bcb9ca4a1d4eafdefc08fd0625429c1b4d54c",
          "url": "https://github.com/endavis/pydatatracker/commit/326b0364efa999ac91511b68b480259893788421"
        },
        "date": 1793897205773,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 487.0742633732218,
            "unit": "iter/sec",
            "range": "stddev: 0.00025014405227567364",
            "extra": "mean: 2.053075013806976 msec\nrounds: 507"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 158.965467116025,
            "unit": "iter/sec",
            "range": "stddev: 0.00006839084706329696",
            "extra": "mean: 6.29067443478227 msec\nrounds: 161"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 500.271308698208,
            "unit": "iter/sec",
            "range": "stddev: 0.00003686892240738193",
            "extra": "mean: 1.9989153537550899 msec\nrounds: 506"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 528.2225299323957,
            "unit": "iter/sec",
            "range": "stddev: 0.00004123674812257595",
            "extra": "mean: 1.8931415139145704 msec\nrounds: 539"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_capped",
            "value": 516.1017308373551,
            "unit": "iter/sec",
            "range": "stddev: 0.00004642149594031454",
            "extra": "mean: 1.9376024923953243 msec\nrounds: 526"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 81391.68936890701,
            "unit": "iter/sec",
            "range": "stddev: 4.892109011338563e-7",
            "extra": "mean: 12.286266666213425 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 59347.76803200727,
            "unit": "iter/sec",
            "range": "stddev: 0.0000024629650211806078",
            "extra": "mean: 16.84983333258098 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 30229.989762742294,
            "unit": "iter/sec",
            "range": "stddev: 0.000006065668902641099",
            "extra": "mean: 33.07973333264158 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[1000]",
            "value": 53892.183297609125,
            "unit": "iter/sec",
            "range": "stddev: 0.000004476113613681402",
            "extra": "mean: 18.555566666833556 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[10000]",
            "value": 40937.9707865045,
            "unit": "iter/sec",
            "range": "stddev: 0.0000029536131048264747",
            "extra": "mean: 24.4272000000952 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[20000]",
            "value": 28977.331998563986,
            "unit": "iter/sec",
            "range": "stddev: 0.000005905654023987129",
            "extra": "mean: 34.50973333395761 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[1000]",
            "value": 61206.12795744145,
            "unit": "iter/sec",
            "range": "stddev: 0.0000036574725277245025",
            "extra": "mean: 16.338233333357266 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[10000]",
            "value": 41993.9864607988,
            "unit": "iter/sec",
            "range": "stddev: 0.000004876778501116753",
            "extra": "mean: 23.81293333352611 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[20000]",
            "value": 33813.37048270701,
            "unit": "iter/sec",
            "range": "stddev: 0.0000053510252094056716",
            "extra": "mean: 29.574100000218095 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 15893.440903341398,
            "unit": "iter/sec",
            "range": "stddev: 0.000006309898135342897",
            "extra": "mean: 62.91903723565377 usec\nrounds: 16973"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 68864.90324251862,
            "unit": "iter/sec",
            "range": "stddev: 0.00000317245882461952",
            "extra": "mean: 14.52118500012034 usec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 58353.686188483756,
            "unit": "iter/sec",
            "range": "stddev: 0.0000020826898701951325",
            "extra": "mean: 17.13687798179496 usec\nrounds: 61163"
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
          "id": "8363a20116cbaa2b5369b62884bb31d0e5c7b1c5",
          "message": "test: guard the TrackedAttr benchmark against measuring untracked writes (merges PR #105, addresses #77)\n\nAdd a plain test that fails if the benchmarked _Monitored/_Declared objects\nstop monitoring a-d or stop recording a change entry for the timed write.\nThe benchmark and the guard now share one _update helper.\n\n#76 already fixed the registration order, so the first criterion held.\n\nAddresses #77\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sceyzGx67XLdcr5dPL\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-05T17:11:49Z",
          "tree_id": "f1b6108c92ea62862dfaf4042b9a2fa3239dd2e5",
          "url": "https://github.com/endavis/pydatatracker/commit/8363a20116cbaa2b5369b62884bb31d0e5c7b1c5"
        },
        "date": 1793898778750,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 671.9477226224855,
            "unit": "iter/sec",
            "range": "stddev: 0.00012551614253400662",
            "extra": "mean: 1.4882110115608223 msec\nrounds: 692"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 214.46229412039378,
            "unit": "iter/sec",
            "range": "stddev: 0.00017080765614415556",
            "extra": "mean: 4.662824316514235 msec\nrounds: 218"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 681.3592531621567,
            "unit": "iter/sec",
            "range": "stddev: 0.000027418435929301362",
            "extra": "mean: 1.4676545381295496 msec\nrounds: 695"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 709.9699399120294,
            "unit": "iter/sec",
            "range": "stddev: 0.000019843825475898722",
            "extra": "mean: 1.4085103379502342 msec\nrounds: 722"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_capped",
            "value": 702.6117025955109,
            "unit": "iter/sec",
            "range": "stddev: 0.00001434364377475333",
            "extra": "mean: 1.4232612356240437 msec\nrounds: 713"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 130855.22613489842,
            "unit": "iter/sec",
            "range": "stddev: 3.32670644171346e-7",
            "extra": "mean: 7.642033333610243 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 78378.30070385612,
            "unit": "iter/sec",
            "range": "stddev: 0.000001993871030791896",
            "extra": "mean: 12.758633333713002 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 35756.85339572618,
            "unit": "iter/sec",
            "range": "stddev: 0.000004837884820493938",
            "extra": "mean: 27.96666666758559 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[1000]",
            "value": 96117.80197591602,
            "unit": "iter/sec",
            "range": "stddev: 0.0000030455728777543157",
            "extra": "mean: 10.40390000023687 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[10000]",
            "value": 53477.651687021214,
            "unit": "iter/sec",
            "range": "stddev: 0.0000030766431167522458",
            "extra": "mean: 18.699400000817455 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[20000]",
            "value": 40819.4921244038,
            "unit": "iter/sec",
            "range": "stddev: 0.000003485269349288125",
            "extra": "mean: 24.498099999685035 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[1000]",
            "value": 90170.51244341806,
            "unit": "iter/sec",
            "range": "stddev: 0.00000575072925731492",
            "extra": "mean: 11.09009999945935 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[10000]",
            "value": 57356.98990234192,
            "unit": "iter/sec",
            "range": "stddev: 0.0000034702030682399987",
            "extra": "mean: 17.434666667526244 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[20000]",
            "value": 43076.52544778389,
            "unit": "iter/sec",
            "range": "stddev: 0.000004342926121066319",
            "extra": "mean: 23.214499999824056 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 23729.669010753805,
            "unit": "iter/sec",
            "range": "stddev: 0.000002244502043352922",
            "extra": "mean: 42.14133789842666 usec\nrounds: 24534"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 119314.51425206373,
            "unit": "iter/sec",
            "range": "stddev: 0.0000011714810263707664",
            "extra": "mean: 8.381210000045769 usec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 77667.97642736023,
            "unit": "iter/sec",
            "range": "stddev: 0.000003055615221340624",
            "extra": "mean: 12.875319352954433 usec\nrounds: 84261"
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
          "id": "dbfe7d7170b98bb8bd6bc11fd34669ff227dfe6e",
          "message": "feat: record the permutation for TrackedList.sort and reverse (merges PR #106, addresses #93)\n\nsort (including reverse=True and key=) and reverse now record the old\nindexes in their new order as value and every index as location. A no-op\nreorder still records nothing. Format documented in docs/usage/basics.md.\n\nAddresses #93\n\n\nClaude-Session: https://claude.ai/code/session_01NXu1sceyzGx67XLdcr5dPL\n\nCo-authored-by: Claude Sonnet 5.5 <noreply@anthropic.com>",
          "timestamp": "2026-11-05T17:14:42Z",
          "tree_id": "82e2b715d162a6346235be66c6c8da019d5b647e",
          "url": "https://github.com/endavis/pydatatracker/commit/dbfe7d7170b98bb8bd6bc11fd34669ff227dfe6e"
        },
        "date": 1793898947441,
        "tool": "pytest",
        "benches": [
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_default",
            "value": 508.8075390456666,
            "unit": "iter/sec",
            "range": "stddev: 0.000067576856019748",
            "extra": "mean: 1.9653796833978276 msec\nrounds: 518"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_snapshots",
            "value": 159.2486129697081,
            "unit": "iter/sec",
            "range": "stddev: 0.00006375503584253117",
            "extra": "mean: 6.279489543750172 msec\nrounds: 160"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackeddict_actor",
            "value": 504.1862423411728,
            "unit": "iter/sec",
            "range": "stddev: 0.00012915530953888933",
            "extra": "mean: 1.9833940635835914 msec\nrounds: 519"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append",
            "value": 532.1055795244781,
            "unit": "iter/sec",
            "range": "stddev: 0.00003738500726509262",
            "extra": "mean: 1.8793262812497862 msec\nrounds: 544"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_capped",
            "value": 522.9011221467697,
            "unit": "iter/sec",
            "range": "stddev: 0.00002987930119455531",
            "extra": "mean: 1.9124074469270627 msec\nrounds: 537"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[100]",
            "value": 82277.43951986043,
            "unit": "iter/sec",
            "range": "stddev: 9.391713503080247e-7",
            "extra": "mean: 12.15400000091904 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[1000]",
            "value": 53393.32369963619,
            "unit": "iter/sec",
            "range": "stddev: 0.00000646819609713044",
            "extra": "mean: 18.728933333041674 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_append_with_history[10000]",
            "value": 32997.092954950596,
            "unit": "iter/sec",
            "range": "stddev: 0.000005052741856533478",
            "extra": "mean: 30.30570000106536 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[1000]",
            "value": 60447.31008842593,
            "unit": "iter/sec",
            "range": "stddev: 0.0000029466781108074398",
            "extra": "mean: 16.543333335050647 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[10000]",
            "value": 38277.804998090956,
            "unit": "iter/sec",
            "range": "stddev: 0.000005399247683986423",
            "extra": "mean: 26.124799999630945 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_insert_front_no_children[20000]",
            "value": 33763.06208428893,
            "unit": "iter/sec",
            "range": "stddev: 0.000004995617590903961",
            "extra": "mean: 29.61816666697814 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[1000]",
            "value": 59752.386106486134,
            "unit": "iter/sec",
            "range": "stddev: 0.000005669781810904518",
            "extra": "mean: 16.73573333486426 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[10000]",
            "value": 44089.054013317524,
            "unit": "iter/sec",
            "range": "stddev: 0.0000035711178416718054",
            "extra": "mean: 22.681366665248486 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_core.py::test_bench_trackedlist_pop_front_no_children[20000]",
            "value": 37473.06623100605,
            "unit": "iter/sec",
            "range": "stddev: 0.000005198567437558577",
            "extra": "mean: 26.685833335212315 usec\nrounds: 30"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_monitored",
            "value": 16073.240505210291,
            "unit": "iter/sec",
            "range": "stddev: 0.000009408183830828998",
            "extra": "mean: 62.21520792125524 usec\nrounds: 17598"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_update",
            "value": 72562.20032003995,
            "unit": "iter/sec",
            "range": "stddev: 0.0000020885270713946204",
            "extra": "mean: 13.781279999633966 usec\nrounds: 200"
          },
          {
            "name": "tests/benchmarks/test_bench_trackedattr.py::test_bench_trackedattr_create_declared",
            "value": 56399.13462080836,
            "unit": "iter/sec",
            "range": "stddev: 0.000005192854142736286",
            "extra": "mean: 17.730768507768058 usec\nrounds: 61920"
          }
        ]
      }
    ]
  }
}