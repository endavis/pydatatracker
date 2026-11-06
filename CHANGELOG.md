# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-11-06

### Breaking changes

Migration notes for upgrading from 0.1.2:

- **Constructor options are keyword-only and unified** (#69). `TrackedDict`, `TrackedList` and
  `TrackedAttr` take the same keyword-only `tracking_*` options; an unknown option raises
  `TypeError`. `TrackedAttr`'s `tracking_auto_convert` now defaults to `False` — pass
  `tracking_auto_convert=True` to keep converting. `tracking_auto_converted_in` is removed.
  `TrackedDict` rejects `tracking_*` keyword data; pass such keys in a mapping,
  `TrackedDict({"tracking_x": 1})`. `_tracking_get_original_value` is renamed
  `tracking_get_original_value`.
- **Auto-convert only converts exact `dict` and `list`** (#60). Subclasses (`defaultdict`,
  `OrderedDict`, `Counter`, user subclasses) are stored unchanged. To keep converting a type,
  override `_tracking_convert_item`.
- **Already-tracked containers are linked when stored** (#67). Their changes forward to the new
  parent, they take the parent's lock state, and their tree joins the parent's thread lock. Store
  `x.copy()` to keep a container independent.
- **`TrackedDict.pop(missing_key)` raises `KeyError`** like `dict.pop` (#51). Use
  `pop(key, None)` for the old result.
- **Assigning a monitored attribute on a locked `TrackedAttr` raises `RuntimeError`** instead of
  being silently dropped (#54).
- **Observer failures** (#53): every observer now runs; one failure is re-raised as is, several
  as an `ExceptionGroup`. Use `except*` around mutations whose observers may fail, and do not
  retry — the mutation was already applied.
- **Construction records only `init`** (#24). No per-item `update` entries; a parent no longer
  receives a child's construction entries when the child is assigned; child logs no longer start
  with `unlock`. Use the parent's add/update entry for the assignment as the creation record.

### Added

- `tracking_max_changes` caps change history; children inherit the parent's cap (#2).
- `_tracking_fields` declares monitored `TrackedAttr` fields on the class, and
  `tracking_record_init` makes the `init` entry optional (#5).
- `_tracking_convert_item(value, location)` hook to convert or reject items on every insert
  path (#6).
- Thread safety: each container tree shares one `RLock` held for the whole of each mutating
  call ([threading guide](docs/usage/threading.md), ADR-0001) (#65).
- `copy.copy`, `copy.deepcopy` and `pickle` produce independent objects with a new id, fresh
  history and no observers; `copy()` is now an untracked read that works when locked
  (ADR-0002) (#66).
- `tracking_add_observer(..., weak=True)` holds the observer weakly (#4).
- Read-only `tracking_name` and `tracking_created` properties (#69).
- `TrackedList.sort` and `reverse` record the permutation (#93).
- Benchmarks comparing tracked containers against the standard library, with a
  [performance page](docs/usage/performance.md) (#50).

### Changed

- Change-entry and object ids come from `random.getrandbits(128)`; they keep the 32-hex format
  but are no longer version-4 UUIDs and should be treated as opaque (#68).
- No-op operations (`pop` of a missing key with a default, `setdefault` on an existing key,
  `clear()` on an empty container, `sort()`/`reverse()` that keep the order) record nothing
  (#62).
- `tracking_get_formatted_updates` shows the most recent 20 changes, not the oldest (#57).
- Performance: recorded-change lookup is O(1) (#1); the tree lock is taken once per mutating
  call (#88); `TrackedList` skips child re-indexing when it has no children (#64); faster
  trackable checks (#63).
- Docs: observer configs are trusted code, and observers and exporters run inline under the
  tree lock (#73).

### Fixed

- Parent and child no longer keep each other alive through observer links (#4).
- Children assigned into an empty container are linked (#22).
- In-place operators (`+=`, `*=`, `|=`) and slice assignment/deletion are tracked and respect
  the lock (#3, #30).
- `TrackedList` child locations stay correct after `insert`, `pop`, `remove`, `del`, slice
  edits, `sort` and `reverse` (#37, #38); negative indexes are stored and logged as
  non-negative (#55).
- A duplicated child stays linked when one copy is removed (#39).
- Out-of-range `TrackedList` item assignment raises before converting or linking (#47).
- `TrackedAttr`: overwritten or deleted children stop forwarding (#31); declared fields are set
  before being monitored (#32); attributes registered before they are set are tracked (#76);
  type-changing assignments are recorded (#59); `lock(); lock(); unlock()` fully unlocks (#54).
- `ChangeLogEntry.copy` copies its tree and stack lists (#52) and skips stack/actor capture
  (#26).
- `async_queue_observer` raises a clear `RuntimeError` without a running event loop (#53).
- `TrackedList.extend` logs the stored values, so generators are recorded correctly (#61).
- `changes_since` accepts naive datetimes (#58).
- The uuid tree works for lists with equal items (#56).
- Tracking actors docs example reads the actor change (#27).

## [0.1.2] - 2026-11-02

### Changed
- Migrated project tooling to [pyproject-template](https://github.com/endavis/pyproject-template):
  doit tasks, hatch-vcs versioning from git tags, commitizen releases, pre-commit, mkdocs.
- `__version__` is generated from the git tag at build time, so it always matches the
  installed package metadata.

### Fixed
- Change-log entry timestamps are strictly increasing, so `changes_since()` and time ordering
  are correct on platforms with a coarse clock (Windows).
- Replaced the deprecated `asyncio.iscoroutinefunction` in `async_queue_observer`.

## [0.1.0] - 2025-12-04

First release on PyPI.

- Added change history helpers (`last_change`, `changes_since`).
- Made snapshots/stack capture opt-in and introduced `tracking_actor` context manager.
- Provided `ChangeCollector`, logging/JSON observer examples, and benchmarking command.
- Added debugging cookbook and packaging docs.
