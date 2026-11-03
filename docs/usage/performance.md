---
title: Performance
description: Measured overhead of TrackedDict, TrackedList and TrackedAttr against the standard library, and how to reproduce it
audience:
  - users
  - contributors
tags:
  - usage
  - performance
  - benchmarks
---

# Performance

Tracked containers behave like `dict`, `list` and plain objects, and record a change-log
entry for every mutation. This page shows what that costs, measured against the plain
standard-library type doing the same work.

## What is measured

`tests/benchmarks/test_bench_vs_stdlib.py` times the plain type and the tracked type in the
same pytest-benchmark group, so each group's table shows both side by side.

- **Reads** (`getitem`, iteration, construction, attribute get) run on a prebuilt container.
- **Writes** run a fixed batch of operations on a **fresh** container each round, so the change
  history is the same length every round instead of growing.
- Tracked containers use the default options unless the row says otherwise. Tracked
  containers keep the whole change history by default, so a long-lived container's history
  (and memory) grows with every write; `tracking_max_changes` caps it.

Constants in the test file: `SIZE = 1_000`, `BATCH = 200`, `READ_LOOP = 1_000`, `ROUNDS = 50`.

## How to reproduce

```bash
uv run doit benchmark
# or only this file, with the columns used below:
uv run pytest tests/benchmarks/test_bench_vs_stdlib.py --benchmark-enable --benchmark-only \
    --benchmark-columns=mean,median,rounds -p no:randomly
```

The comparison is **not run in CI**: its microsecond-scale series would trip the benchmark
workflow's regression alert on shared runners. Run it locally.

## How to read the tables

pytest-benchmark prints a ratio to the fastest row of each group in parentheses, for example
`954.6144 (321.82)`. The plain side is always fastest in a write group, so that number is the
tracked/plain ratio. Ratios depend on the machine; treat them as orders of magnitude, not
constants.

## Summary

Each benchmark times a whole batch, so the per-operation figure is the group mean divided by
the divisor shown. Read loops include the cost of the Python loop itself, which is why a plain
`d[k]` shows about 19 ns rather than a few nanoseconds. Per-op values are the means in the raw
tables below, divided as shown.

| Operation | Divisor | Plain per op | Tracked per op | Tracked / plain |
| :-- | :-- | --: | --: | --: |
| dict `d[k]` read | 1,000 | 18.0 ns | 18.9 ns | 1.05 |
| dict iterate 1k keys | 1 | 8,591.1 ns | 8,686.7 ns | 1.01 |
| dict construct from 1k items | 1 | 2,782.4 ns | 177,285.0 ns | 63.72 |
| list `l[i]` read | 1,000 | 11.0 ns | 13.6 ns | 1.24 |
| list iterate 1k items | 1 | 5,945.0 ns | 5,882.4 ns | 0.99 |
| list construct from 1k items | 1 | 1,173.1 ns | 135,821.0 ns | 115.78 |
| attr read (monitored) | 1,000 | 10.3 ns | 18.2 ns | 1.76 |
| attr read (unmonitored) | 1,000 | 10.3 ns | 18.6 ns | 1.80 |
| dict set new key | 200 | 20.7 ns | 4,016.2 ns | 193.74 |
| dict set existing key | 200 | 14.6 ns | 4,758.8 ns | 326.61 |
| dict `update` of 100 keys | 20 | 1,606.6 ns | 30,639.3 ns | 19.07 |
| dict `pop` | 200 | 21.4 ns | 4,586.3 ns | 214.00 |
| list `append` | 200 | 11.3 ns | 4,088.1 ns | 360.47 |
| list `l[i] = x` | 200 | 11.5 ns | 4,970.3 ns | 432.52 |
| list `extend` of 100 items | 20 | 91.4 ns | 22,916.2 ns | 250.77 |
| list `pop()` from the end | 200 | 15.7 ns | 4,873.3 ns | 310.75 |
| list `insert(0, x)` into 1k items | 200 | 137.3 ns | 4,099.0 ns | 29.86 |
| list `pop(0)` from 1k items | 200 | 66.0 ns | 4,824.8 ns | 73.11 |
| attr write (monitored) | 200 | 7.6 ns | 5,351.8 ns | 706.18 |
| attr write (unmonitored) | 200 | 7.6 ns | 133.2 ns | 17.58 |
| nested dict set, depth 1 (auto-convert) | 200 | 45.8 ns | 13,562.7 ns | 296.03 |
| nested dict set, depth 2 (auto-convert) | 200 | 74.3 ns | 22,246.2 ns | 299.22 |

What the numbers say:

- **Reads are at standard-library speed.** `getitem` and iteration on a tracked container
  are within a few percent of plain for dict and list; no type overrides them.
- **Construction copies every item** and is 64x (dict) to 116x (list) slower than the plain
  constructor for 1,000 items.
- **Writes cost a few microseconds each**, because each one builds and stores a change-log
  entry. Relative to a plain write that is two to three orders of magnitude, but in absolute
  terms it is microseconds.
- **A monitored attribute write costs about as much as a container write** (5,351.8 ns
  against 4,016.2 to 4,970.3 ns for dict and list writes), because it records a change-log
  entry. A write to an attribute that is not monitored skips that and costs 133.2 ns.

## Options on a 1,000-item dict

200 reassignments of existing keys on a prefilled 1,000-item dict, per-op = mean / 200.

| Side | Mean (200 ops) | Per op | Ratio to plain |
| :-- | --: | --: | --: |
| plain | 4.6218 us | 23 ns | 1.0 |
| tracked (defaults) | 970.1767 us | 4,851 ns | 209.91 |
| tracked, no-op observer | 987.4234 us | 4,937 ns | 213.64 |
| tracked, `tracking_max_changes=100` | 986.9788 us | 4,935 ns | 213.55 |
| tracked, `tracking_capture_stack=True` | 2,567.4203 us | 12,837 ns | 555.50 |
| tracked, `tracking_capture_snapshots=True` | 19,606.4754 us | 98,032 ns | 4242.17 (printed as `>1000.0`) |

Stack capture is roughly 2.6x the default cost and snapshots roughly 20x (derived from the
means above), which is why both are opt-in. Capping the history did not make writes faster in
this run; it bounds memory, not time.

## Raw output

<details>
<summary>pytest-benchmark group tables (one run, source of every number above)</summary>

```text
---------------------------- benchmark 'attr-get': 3 tests -----------------------------
Name (time in us)                              Mean             Median            Rounds
----------------------------------------------------------------------------------------
test_read[attr-get-plain]                   10.3175 (1.0)      10.2029 (1.0)      104976
test_read[attr-get-tracked-monitored]       18.1644 (1.76)     17.6900 (1.73)      60541
test_read[attr-get-tracked-unmonitored]     18.5787 (1.80)     18.1990 (1.78)      58893
----------------------------------------------------------------------------------------

-------------------------------- benchmark 'attr-set': 3 tests ---------------------------------
Name (time in us)                                   Mean                Median            Rounds
------------------------------------------------------------------------------------------------
test_mutate[attr-set-plain]                       1.5157 (1.0)          1.4920 (1.0)          50
test_mutate[attr-set-tracked-unmonitored]        26.6406 (17.58)       25.3946 (17.02)        50
test_mutate[attr-set-tracked-monitored]       1,070.3642 (706.18)   1,055.9915 (707.78)       50
------------------------------------------------------------------------------------------------

------------------------ benchmark 'dict-construct-1k': 2 tests -----------------------
Name (time in us)                            Mean              Median            Rounds
---------------------------------------------------------------------------------------
test_read[dict-construct-1k-plain]         2.7824 (1.0)        2.7327 (1.0)       39425
test_read[dict-construct-1k-tracked]     177.2850 (63.72)    176.1171 (64.45)      6317
---------------------------------------------------------------------------------------

---------------------- benchmark 'dict-getitem': 2 tests -----------------------
Name (time in us)                      Mean             Median            Rounds
--------------------------------------------------------------------------------
test_read[dict-getitem-plain]       17.9792 (1.0)      17.7620 (1.0)       62704
test_read[dict-getitem-tracked]     18.9361 (1.05)     18.6700 (1.05)      58265
--------------------------------------------------------------------------------

---------------------- benchmark 'dict-iterate-1k': 2 tests ---------------------
Name (time in us)                        Mean            Median            Rounds
---------------------------------------------------------------------------------
test_read[dict-iterate-1k-plain]       8.5911 (1.0)      8.3470 (1.0)      131631
test_read[dict-iterate-1k-tracked]     8.6867 (1.01)     8.4569 (1.01)     131474
---------------------------------------------------------------------------------

------------------------ benchmark 'dict-pop': 2 tests -------------------------
Name (time in us)                     Mean              Median            Rounds
--------------------------------------------------------------------------------
test_mutate[dict-pop-plain]         4.2862 (1.0)        4.1680 (1.0)          50
test_mutate[dict-pop-tracked]     917.2576 (214.00)   922.9664 (221.44)       50
--------------------------------------------------------------------------------

------------------------- benchmark 'dict-setitem-existing': 2 tests ------------------------
Name (time in us)                                  Mean              Median            Rounds
---------------------------------------------------------------------------------------------
test_mutate[dict-setitem-existing-plain]         2.9141 (1.0)        2.6880 (1.0)          50
test_mutate[dict-setitem-existing-tracked]     951.7621 (326.61)   952.3410 (354.29)       50
---------------------------------------------------------------------------------------------

-------------------------------- benchmark 'dict-setitem-existing-1k-options': 6 tests ---------------------------------
Name (time in us)                                                          Mean                 Median            Rounds
------------------------------------------------------------------------------------------------------------------------
test_mutate[dict-setitem-existing-1k-options-plain]                      4.6218 (1.0)           4.2941 (1.0)          50
test_mutate[dict-setitem-existing-1k-options-tracked]                  970.1767 (209.91)      969.9321 (225.88)       50
test_mutate[dict-setitem-existing-1k-options-tracked-max100]           986.9788 (213.55)      981.6590 (228.61)       50
test_mutate[dict-setitem-existing-1k-options-tracked-observer]         987.4234 (213.64)      986.7650 (229.80)       50
test_mutate[dict-setitem-existing-1k-options-tracked-stack]          2,567.4203 (555.50)    2,534.0251 (590.12)       50
test_mutate[dict-setitem-existing-1k-options-tracked-snapshots]     19,606.4754 (>1000.0)  19,435.6930 (>1000.0)      50
------------------------------------------------------------------------------------------------------------------------

------------------------ benchmark 'dict-setitem-new': 2 tests -------------------------
Name (time in us)                             Mean              Median            Rounds
----------------------------------------------------------------------------------------
test_mutate[dict-setitem-new-plain]         4.1459 (1.0)        3.5855 (1.0)          50
test_mutate[dict-setitem-new-tracked]     803.2316 (193.74)   800.6095 (223.29)       50
----------------------------------------------------------------------------------------

------------------------- benchmark 'dict-update-100': 2 tests ------------------------
Name (time in us)                            Mean              Median            Rounds
---------------------------------------------------------------------------------------
test_mutate[dict-update-100-plain]        32.1327 (1.0)       29.7109 (1.0)          50
test_mutate[dict-update-100-tracked]     612.7854 (19.07)    609.6530 (20.52)        50
---------------------------------------------------------------------------------------

------------------------- benchmark 'list-append': 2 tests ------------------------
Name (time in us)                        Mean              Median            Rounds
-----------------------------------------------------------------------------------
test_mutate[list-append-plain]         2.2682 (1.0)        2.1044 (1.0)          50
test_mutate[list-append-tracked]     817.6193 (360.47)   820.9260 (390.09)       50
-----------------------------------------------------------------------------------

------------------------ benchmark 'list-construct-1k': 2 tests -----------------------
Name (time in us)                            Mean              Median            Rounds
---------------------------------------------------------------------------------------
test_read[list-construct-1k-plain]         1.1731 (1.0)        1.1375 (1.0)       91092
test_read[list-construct-1k-tracked]     135.8210 (115.78)   135.4709 (119.10)     8241
---------------------------------------------------------------------------------------

------------------------- benchmark 'list-extend-100': 2 tests ------------------------
Name (time in us)                            Mean              Median            Rounds
---------------------------------------------------------------------------------------
test_mutate[list-extend-100-plain]         1.8277 (1.0)        1.6780 (1.0)          50
test_mutate[list-extend-100-tracked]     458.3238 (250.77)   457.1086 (272.41)       50
---------------------------------------------------------------------------------------

---------------------- benchmark 'list-getitem': 2 tests -----------------------
Name (time in us)                      Mean             Median            Rounds
--------------------------------------------------------------------------------
test_read[list-getitem-plain]       10.9692 (1.0)      10.8501 (1.0)       95832
test_read[list-getitem-tracked]     13.5505 (1.24)     13.4471 (1.24)      81143
--------------------------------------------------------------------------------

------------------------ benchmark 'list-insert-front-1k': 2 tests -------------------------
Name (time in us)                                 Mean              Median            Rounds
--------------------------------------------------------------------------------------------
test_mutate[list-insert-front-1k-plain]        27.4521 (1.0)       27.2810 (1.0)          50
test_mutate[list-insert-front-1k-tracked]     819.7963 (29.86)    819.3095 (30.03)        50
--------------------------------------------------------------------------------------------

---------------------- benchmark 'list-iterate-1k': 2 tests ---------------------
Name (time in us)                        Mean            Median            Rounds
---------------------------------------------------------------------------------
test_read[list-iterate-1k-tracked]     5.8824 (1.0)      5.8170 (1.0)      199962
test_read[list-iterate-1k-plain]       5.9450 (1.01)     5.8890 (1.01)     194290
---------------------------------------------------------------------------------

------------------------ benchmark 'list-pop-end': 2 tests -------------------------
Name (time in us)                         Mean              Median            Rounds
------------------------------------------------------------------------------------
test_mutate[list-pop-end-plain]         3.1365 (1.0)        2.6589 (1.0)          50
test_mutate[list-pop-end-tracked]     974.6563 (310.75)   953.6955 (358.68)       50
------------------------------------------------------------------------------------

------------------------- benchmark 'list-pop-front-1k': 2 tests ------------------------
Name (time in us)                              Mean              Median            Rounds
-----------------------------------------------------------------------------------------
test_mutate[list-pop-front-1k-plain]        13.1996 (1.0)       12.8330 (1.0)          50
test_mutate[list-pop-front-1k-tracked]     964.9648 (73.11)    956.2104 (74.51)        50
-----------------------------------------------------------------------------------------

------------------------- benchmark 'list-setitem': 2 tests --------------------------
Name (time in us)                         Mean                Median            Rounds
--------------------------------------------------------------------------------------
test_mutate[list-setitem-plain]         2.2983 (1.0)          2.2529 (1.0)          50
test_mutate[list-setitem-tracked]     994.0628 (432.52)   1,000.8465 (444.25)       50
--------------------------------------------------------------------------------------

--------------------------- benchmark 'nested-setitem-depth1': 2 tests --------------------------
Name (time in us)                                    Mean                Median            Rounds
-------------------------------------------------------------------------------------------------
test_mutate[nested-setitem-depth1-plain]           9.1630 (1.0)          8.5086 (1.0)          50
test_mutate[nested-setitem-depth1-tracked]     2,712.5463 (296.03)   2,690.0246 (316.15)       50
-------------------------------------------------------------------------------------------------

--------------------------- benchmark 'nested-setitem-depth2': 2 tests --------------------------
Name (time in us)                                    Mean                Median            Rounds
-------------------------------------------------------------------------------------------------
test_mutate[nested-setitem-depth2-plain]          14.8692 (1.0)         14.3455 (1.0)          50
test_mutate[nested-setitem-depth2-tracked]     4,449.2321 (299.23)   4,453.5676 (310.45)       50
-------------------------------------------------------------------------------------------------
```

Result line: `48 passed, 33 skipped in 46.40s`

</details>

## Environment

| Item | Value |
| :-- | :-- |
| CPU | 12th Gen Intel(R) Core(TM) i7-12650H |
| OS | Linux 6.17.13-2-pve |
| Python | 3.14.4 |
| pytest-benchmark | 5.3.0 |
| Commit | 44d76f4 (base of the branch that added the benchmark file) |
| Date | 2026-11-03 |
| Wall time of the file | about 47 s (46.40 s reported by pytest) |

Absolute numbers will differ on other machines; re-run the command above to get your own.
