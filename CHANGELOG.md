# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Migrated project tooling to [pyproject-template](https://github.com/endavis/pyproject-template):
  doit tasks, hatch-vcs versioning from git tags, commitizen releases, pre-commit, mkdocs.

## [0.2.0] - 2025-11-23
- Added change history helpers (`last_change`, `changes_since`).
- Made snapshots/stack capture opt-in and introduced `tracking_actor` context manager.
- Provided `ChangeCollector`, logging/JSON observer examples, and benchmarking command.
- Added debugging cookbook and packaging docs.
