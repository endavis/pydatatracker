# Refactoring TODO

1. Write comprehensive behavioral tests to establish the current steady state.
   - Cover TrackedDict/TrackedList/TrackedAttr mutation flows (add/update/delete, lock/unlock).
   - Verify observer notifications and ChangeLogEntry contents for common operations.
   - Capture performance-sensitive behaviors (e.g., snapshotting, stack logging) so later optimizations remain faithful to expectations.
2. After the suite is in place, begin trimming performance overhead and reshaping the API per the plan discussed.
