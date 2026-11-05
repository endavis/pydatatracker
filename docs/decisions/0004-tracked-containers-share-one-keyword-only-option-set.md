---
title: "ADR-0004: Tracked containers share one keyword-only option set"
description: TrackedDict, TrackedList and TrackedAttr take the same keyword-only constructor options with the same defaults, and unknown options raise TypeError
date: 2026-11-05
audience:
  - contributors
tags:
  - adr
---

# ADR-0004: Tracked containers share one keyword-only option set

## Status

Accepted

## Decision

All three types share one keyword-only option set, documented in [Constructor options](../usage/basics.md#constructor-options): `tracking_name`, `tracking_auto_convert`, `tracking_parent`, `tracking_location`, `tracking_capture_snapshots`, `tracking_capture_stack`, `tracking_record_init` and `tracking_max_changes`.

1. `None` for an inheritable option means "inherit from `tracking_parent`, else the default".
2. `tracking_auto_convert` defaults to `False` on every type.
3. An unknown option raises `TypeError`; `TrackBase.__init__` takes no `**kwargs`.
4. `TrackedDict(a=1)` keeps keyword data, but an unknown `tracking_*` keyword raises `TypeError`. Store such a key with `TrackedDict({"tracking_x": 1})`.
5. `tracking_auto_converted_in` is removed.
6. `tracking_name` and `tracking_created` are read-only properties; `TrackedAttr.tracking_get_original_value` is public.

Tracking issue: Issue #69.

## Rationale

- **Different options per type (the old behavior).** Rejected: only `TrackedDict` accepted `tracking_name`, and `TrackedAttr` alone auto-converted by default.
- **Positional options.** Rejected: `TrackedAttr(False)` and `TrackedList([1], "abc")` silently set options.
- **Swallowing unknown keywords.** Rejected: a typo such as `tracking_typo=1` became dict data without any error.
- **Keeping write-only fields.** Rejected: `tracking_auto_converted_in` was only read by the code that rewrote it.

## Consequences

- Breaking change before 1.0. Callers that passed options positionally, relied on `TrackedAttr` auto-converting, or used `tracking_*` keyword data must change.
- `TrackedAttr` children now inherit capture settings from their parent instead of storing `None`.
