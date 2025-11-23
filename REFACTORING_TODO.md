# Refactoring TODO

1. Write comprehensive behavioral tests to establish the current steady state.
   - Cover TrackedDict/TrackedList/TrackedAttr mutation flows (add/update/delete, lock/unlock).
   - Verify observer notifications and ChangeLogEntry contents for common operations.
   - Capture performance-sensitive behaviors (e.g., snapshotting, stack logging) so later optimizations remain faithful to expectations.
2. After the suite is in place, begin trimming performance overhead and reshaping the API per the plan discussed.

## Remaining work

- Add benchmark tooling (`just benchmark` and/or `scripts/bench.py`) to measure snapshot/stack/actor combinations.
- Re-export `tracking_actor` from the top-level `pydatatracker` package for easier imports.
