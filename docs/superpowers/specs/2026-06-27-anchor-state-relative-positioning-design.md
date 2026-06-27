# Anchor–State Relative Positioning Design

**Date:** 2026-06-27
**Scope:** Replace year-bound anchor positioning with parent-relative `xOffsetPct` so anchors always track their parent state regardless of scale changes or drags.

---

## Problem

Anchors currently store `year` as their authoritative horizontal position. A `useEffect` recalculates every event's `x` from `year` whenever the timeline scale (startYear, endYear, cuts) changes. This overwrites anchor positions that were shifted during state drags, because the drag handler updates anchor `x` but never updates anchor `year`. Result: anchors snap back to their original year position on the next scale change.

---

## Design

### 1. Data Model

One new optional field on `TimelineEvent`:

```typescript
type TimelineEvent = {
  label: string;
  year: number;        // states: position on timeline axis; anchors: user-entered display label only
  layer: number;
  x: number;           // states: derived from year; anchors: cached absolute x%, always kept in sync
  yOffset: number;
  color: string;
  borderColor: string;
  style: 'normal' | 'italic';
  type: 'state' | 'anchor';
  width?: number;
  xOffsetPct?: number; // anchors only — signed offset from parent state's x in percentage units
};
```

**`xOffsetPct` is the canonical anchor position.** `ev.x` for anchors is a derived cache, always equal to `parentState.x + xOffsetPct`.

The parent relationship stays in the existing `Connection` with `autoLink: true` — no new index field on the event. The parent state for anchor `i` is found by scanning connections for `c.autoLink === true && c.to === i`.

**`year` on anchors** is a user-entered display label shown below the dot. It is never used for x positioning and is never updated by drag or scale-change logic.

---

### 2. Positioning Pipeline

Every time positions need to be recomputed, a two-pass approach is used:

**Pass 1 — States:**
```
newX = yearToXWithCuts(state.year, displayStartYear, endYear, cuts)
```

**Pass 2 — Anchors:**
```
newX = parentState.x + anchor.xOffsetPct
```
Pass 2 uses the Pass 1 results for parent state x values. If no autoLink connection exists for an anchor (orphan), the anchor keeps its current `x` unchanged.

This two-pass logic runs in two places:
- The scale-change `useEffect` (triggered when `displayStartYear`, `endYear`, or `cuts` change)
- After any state drag resolves in `handleDrop`

**Backward compatibility on import:** Old files have no `xOffsetPct`. After loading events, a one-time pass computes:
```
xOffsetPct = anchor.x − parentState.x
```
for each anchor that has an autoLink connection. Anchors with no autoLink parent get `xOffsetPct = 0`.

---

### 3. State Drag

States are draggable freely to reposition horizontally or move to a different layer band. Their **vertical position within a layer is always auto-managed** — the drag y-coordinate determines which layer the state lands in, but never directly sets `yOffset`.

**Layer resolution:**
- Drop y position determines the target layer band.
- `yOffset` is set to: bottom of the lowest existing state in the target layer + 20px gap.
- If no other states exist in the target layer, `yOffset = 0`.

**Layer change:**
- When a state moves to a different layer, all its auto-linked anchors follow — their `layer` field updates to match the state's new layer.
- `xOffsetPct` on each anchor is preserved, so the horizontal relationship is maintained.

**Anchor lockstep:**
After computing the state's new `x`, each auto-linked anchor's `x` is recomputed:
```
anchor.x = newStateX + anchor.xOffsetPct
```
The anchor's `year` display label is never touched during a state drag.

**Visual affordance:** State card retains its drag behavior. No vertical position handle is exposed; the drop handler ignores y for `yOffset` computation.

---

### 4. Anchor Drag

**Independent repositioning:**
- Drop `x` becomes the anchor's new absolute x.
- `xOffsetPct` is recomputed: `newX − parentState.x`.
- `year` display label is unchanged.
- `layer` updates to the drop target layer band.

**Parent state relationship:**
- The autoLink connection is unchanged; the anchor remains owned by the same state.
- The anchor can live in a different layer band from its parent state (visual flexibility).

**Re-parenting:**
- If the anchor is re-connected to a different state (via connection edit), the autoLink connection's `from` updates to the new parent state index.
- `xOffsetPct` is recomputed: `anchor.x − newParentState.x`.

---

### 5. Anchor Creation

When a new anchor is created (existing auto-placement logic):
- Compute the anchor's initial absolute `x` using the existing spacing/distribution logic.
- Set `xOffsetPct = initialX − parentState.x`.
- Store both on the new event.

---

### 6. State Deletion

When a state is deleted:

**Cascade:** All auto-linked anchors (`connections` where `autoLink: true && from === deletedStateIdx`) are deleted along with their connections. States and their anchors form a unit; orphaned anchors are not permitted.

**Warning dialog:** If the state has one or more auto-linked anchors, show a confirmation:
> *"This state has N anchor(s) that will also be deleted. Continue?"*

Deletion proceeds only on confirmation.

**Index repair:** After deletion, all remaining connection `from`/`to` indices that pointed above the deleted index are decremented by 1 (existing behavior, unchanged).

**Standalone anchor deletion:** An anchor can still be deleted independently without affecting the parent state.

---

### 7. Export / Import

**Export (JSON):** `xOffsetPct` is written to the file alongside existing event fields. No version bump required — old importers will simply ignore the unknown field.

**Import:** If `xOffsetPct` is present, use it. If absent (old file), compute it from the autoLink connection: `xOffsetPct = anchor.x − parentState.x`. If no autoLink connection exists for an anchor, set `xOffsetPct = 0`.

---

### 8. Out of Scope

- Locking anchors to stay within the parent state's horizontal span (anchors can be positioned anywhere)
- Visual grouping indicator between a state and its anchors
- Multiple parent states per anchor
