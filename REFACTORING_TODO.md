# Refactoring TODO

1. Write comprehensive behavioral tests to establish the current steady state.
   - Cover TrackedDict/TrackedList/TrackedAttr mutation flows (add/update/delete, lock/unlock).
   - Verify observer notifications and ChangeLogEntry contents for common operations.
   - Capture performance-sensitive behaviors (e.g., snapshotting, stack logging) so later optimizations remain faithful to expectations.
2. After the suite is in place, begin trimming performance overhead and reshaping the API per the plan discussed.

## Remaining work


## Feature ideas

- Change filtering helpers for observers (subscribe to specific actions/keys).
- Structured JSON serialization of change logs for external systems.
- Built-in observer registry (logging/file/HTTP).
- Async-friendly observers.
- CLI utilities to inspect/tail changes.
