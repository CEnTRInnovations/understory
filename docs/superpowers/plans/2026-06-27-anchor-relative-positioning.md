# Anchor–State Relative Positioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace year-bound anchor positioning with `xOffsetPct` — a stored relative offset from the parent state — so anchors always track their parent regardless of scale changes or state drags.

**Architecture:** Add `xOffsetPct?: number` to `TimelineEvent` for anchors. The existing `ev.x` becomes a kept-in-sync cache: always equal to `parentState.x + xOffsetPct`. A two-pass positioning function (states from year, anchors from parent + offset) replaces the current single-pass year→x recalculation, and is also used during state drags. All mutations that change state or anchor position must keep `xOffsetPct` in sync.

**Tech Stack:** React 18, TypeScript 5, Vite, Vitest. One file (`src/ComplexityTimeline.tsx`) plus one new utility module.

## Global Constraints

- All existing TypeScript must compile with zero errors: `npx tsc --noEmit`
- Active tests must stay green: `npm test` (failures in `src/bak/` are pre-existing — ignore them; only `src/utils/` tests are the gate)
- No new npm packages
- `xOffsetPct` is the canonical position for anchors; `ev.x` is a derived cache kept in sync, not the source of truth
- Anchor `year` is a user-entered display label — never overwrite it during drag or scale change
- States: yOffset is always auto-managed (never from raw drop y); anchors inherit their parent state's layer when the state moves layers

---

### Task 1: `xOffsetPct` type field + `syncAnchorPositions` utility + two-pass scale-change effect

This task introduces the canonical data model and fixes the root cause of the year-snap bug.

**Files:**
- Modify: `src/ComplexityTimeline.tsx` — type definition (line ~11–23), scale-change useEffect (line ~857–859)
- Create: `src/utils/anchorPositioning.ts`
- Create: `src/utils/anchorPositioning.test.ts`

**Interfaces:**
- Produces: `syncAnchorPositions<T extends { type?: string; x: number; xOffsetPct?: number }>(events: T[], connections: { from: number; to: number; autoLink?: boolean }[], stateXValues: Map<number, number>): T[]`

- [ ] **Step 1: Add `xOffsetPct` to `TimelineEvent`**

In `src/ComplexityTimeline.tsx`, find the `TimelineEvent` type (around line 11). Add the new field after `width`:

```typescript
type TimelineEvent = {
  label: string;
  year: number;
  layer: number;
  x: number;
  yOffset: number;
  color: string;
  borderColor: string;
  style: 'normal' | 'italic';
  type: 'state' | 'anchor';
  width?: number;
  xOffsetPct?: number; // anchors only: signed offset from parent state's x (% units)
};
```

- [ ] **Step 2: Write the failing test file**

Create `src/utils/anchorPositioning.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { syncAnchorPositions } from './anchorPositioning';

const conn = [{ from: 0, to: 1, autoLink: true as const }];

describe('syncAnchorPositions', () => {
  it('leaves states unchanged', () => {
    const events = [
      { type: 'state' as const, x: 20, xOffsetPct: undefined },
      { type: 'anchor' as const, x: 99, xOffsetPct: 5 },
    ];
    const result = syncAnchorPositions(events, conn, new Map([[0, 30]]));
    expect(result[0].x).toBe(20);
  });

  it('updates anchor x = stateXValues[parent] + xOffsetPct', () => {
    const events = [
      { type: 'state' as const, x: 20, xOffsetPct: undefined },
      { type: 'anchor' as const, x: 99, xOffsetPct: 5 },
    ];
    const result = syncAnchorPositions(events, conn, new Map([[0, 30]]));
    expect(result[1].x).toBe(35); // 30 + 5
  });

  it('falls back to events[parent].x when parent not in stateXValues', () => {
    const events = [
      { type: 'state' as const, x: 20, xOffsetPct: undefined },
      { type: 'anchor' as const, x: 99, xOffsetPct: 7 },
    ];
    const result = syncAnchorPositions(events, conn, new Map());
    expect(result[1].x).toBe(27); // 20 + 7
  });

  it('leaves anchor unchanged when xOffsetPct is undefined', () => {
    const events = [
      { type: 'state' as const, x: 20, xOffsetPct: undefined },
      { type: 'anchor' as const, x: 99, xOffsetPct: undefined },
    ];
    const result = syncAnchorPositions(events, conn, new Map([[0, 30]]));
    expect(result[1].x).toBe(99);
  });

  it('leaves orphan anchor (no autoLink connection) unchanged', () => {
    const events = [
      { type: 'state' as const, x: 20, xOffsetPct: undefined },
      { type: 'anchor' as const, x: 99, xOffsetPct: 5 },
    ];
    const result = syncAnchorPositions(events, [], new Map([[0, 30]]));
    expect(result[1].x).toBe(99);
  });

  it('handles negative xOffsetPct (anchor left of parent)', () => {
    const events = [
      { type: 'state' as const, x: 50, xOffsetPct: undefined },
      { type: 'anchor' as const, x: 99, xOffsetPct: -10 },
    ];
    const result = syncAnchorPositions(events, conn, new Map([[0, 60]]));
    expect(result[1].x).toBe(50); // 60 + (-10)
  });

  it('preserves all other event fields', () => {
    const events = [
      { type: 'state' as const, x: 20, xOffsetPct: undefined, label: 'S', year: 2000 },
      { type: 'anchor' as const, x: 99, xOffsetPct: 5, label: 'A', year: 2001 },
    ];
    const result = syncAnchorPositions(events, conn, new Map([[0, 30]]));
    expect(result[1]).toMatchObject({ label: 'A', year: 2001, xOffsetPct: 5 });
  });
});
```

- [ ] **Step 3: Run tests — expect FAIL (module not found)**

```bash
npm test -- src/utils/anchorPositioning.test.ts
```

Expected: FAIL with "Cannot find module './anchorPositioning'"

- [ ] **Step 4: Create `src/utils/anchorPositioning.ts`**

```typescript
type EventSlice = { type?: string; x: number; xOffsetPct?: number };
type ConnSlice  = { from: number; to: number; autoLink?: boolean };

/**
 * Two-pass anchor sync: for each anchor, set x = parentState.x + xOffsetPct.
 * stateXValues contains the freshly-computed x for each state index (Pass 1 output).
 * Falls back to events[parent].x if the parent isn't in stateXValues.
 * Anchors with no autoLink connection or no xOffsetPct are returned unchanged.
 */
export function syncAnchorPositions<T extends EventSlice>(
  events: T[],
  connections: ConnSlice[],
  stateXValues: Map<number, number>,
): T[] {
  return events.map((e, i) => {
    if ((e.type ?? 'state') !== 'anchor') return e;
    const parentConn = connections.find(c => c.autoLink && c.to === i);
    if (!parentConn || e.xOffsetPct === undefined) return e;
    const parentX = stateXValues.get(parentConn.from) ?? events[parentConn.from]?.x ?? 0;
    return { ...e, x: parentX + e.xOffsetPct };
  });
}
```

- [ ] **Step 5: Run tests — expect all pass**

```bash
npm test -- src/utils/anchorPositioning.test.ts
```

Expected: 7 tests pass.

- [ ] **Step 6: Import `syncAnchorPositions` in `ComplexityTimeline.tsx`**

At the top of `src/ComplexityTimeline.tsx`, add to the existing utils import line:

```typescript
import { computeLayerTops, hitTestLayer } from './utils/layerMetrics';
import { syncAnchorPositions } from './utils/anchorPositioning';
```

- [ ] **Step 7: Replace the scale-change `useEffect` with a two-pass version**

Find the existing effect (around line 857):
```typescript
  useEffect(() => {
    setEvents(ev => ev.map(e => ({ ...e, x: yearToXWithCuts(e.year, displayStartYear, endYear, cuts) })));
  }, [displayStartYear, endYear, cuts]);
```

Replace it with:
```typescript
  useEffect(() => {
    setEvents(prevEvents => {
      // Pass 1: update state x from year
      const stateXValues = new Map<number, number>();
      const withStates = prevEvents.map((e, i) => {
        if ((e.type ?? 'state') !== 'state') return e;
        const newX = yearToXWithCuts(e.year, displayStartYear, endYear, cuts);
        stateXValues.set(i, newX);
        return { ...e, x: newX };
      });
      // Pass 2: update anchor x from parent state + stored offset
      return syncAnchorPositions(withStates, connections, stateXValues);
    });
  }, [displayStartYear, endYear, cuts, connections]);
```

- [ ] **Step 8: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 9: Run full test suite**

```bash
npm test
```

Expected: all `src/utils/` tests pass (7 new + 22 existing = 29 passing; `src/bak/` failures are pre-existing and ignored).

- [ ] **Step 10: Commit**

```bash
git add src/ComplexityTimeline.tsx src/utils/anchorPositioning.ts src/utils/anchorPositioning.test.ts
git commit -m "feat: add xOffsetPct field and two-pass anchor position sync"
```

---

### Task 2: Set `xOffsetPct` on anchor creation and redistribution

When a new anchor is created via `addEvent`, it must store its offset from the parent state so future scale changes and drags use the canonical value.

**Files:**
- Modify: `src/ComplexityTimeline.tsx` — `addEvent` function (lines ~1067–1134)

**Interfaces:**
- Consumes: `xOffsetPct?: number` field on `TimelineEvent` (from Task 1)

- [ ] **Step 1: Update the single-anchor creation path**

Find the `anchorData` line inside `addEvent` (around line 1116):
```typescript
          const anchorData    = { ...data, x: newAnchorX, yOffset: anchorYOffset };
```

Replace with:
```typescript
          const xOffsetPct    = newAnchorX - stateEv.x;
          const anchorData    = { ...data, x: newAnchorX, yOffset: anchorYOffset, xOffsetPct };
```

- [ ] **Step 2: Update the redistribution map type and values**

Find `let redistributeMap: Map<number, number> | null = null;` (around line 1098). Replace the type and the Map construction:

```typescript
          let redistributeMap: Map<number, { x: number; xOffsetPct: number }> | null = null;
```

Find the block that constructs `redistributeMap` (around line 1106):
```typescript
            redistributeMap = new Map(
              sortedAnchors.map(({ idx }, k) => [
                idx,
                pxToPercent(stateLeftEdge + stateW * (2 * k + 1) / (2 * totalAnchors)),
              ])
            );
```

Replace with:
```typescript
            redistributeMap = new Map(
              sortedAnchors.map(({ idx }, k) => {
                const newX = pxToPercent(stateLeftEdge + stateW * (2 * k + 1) / (2 * totalAnchors));
                return [idx, { x: newX, xOffsetPct: newX - stateEv.x }];
              })
            );
```

- [ ] **Step 3: Update the `setEvents` call that applies the redistribution map**

Find (around line 1121):
```typescript
            setEvents(ev => [...ev.map((e, i) => rmap.has(i) ? { ...e, x: rmap.get(i)! } : e), anchorData]);
```

Replace with:
```typescript
            setEvents(ev => [...ev.map((e, i) => rmap.has(i) ? { ...e, ...rmap.get(i)! } : e), anchorData]);
```

(Spreading `{ x, xOffsetPct }` onto the event instead of just `x`.)

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/ComplexityTimeline.tsx
git commit -m "feat: set xOffsetPct on anchor creation and redistribution"
```

---

### Task 3: Fix `handleDrop` for state drag and anchor drag

This task replaces the broken delta-based anchor shift with offset-based positioning, adds layer cascade for anchors, fixes yOffset=0 for states with no siblings, and stops overwriting anchor year on drag.

**Files:**
- Modify: `src/ComplexityTimeline.tsx` — `handleDrop` function (lines ~1276–1320)

**Interfaces:**
- Consumes: `xOffsetPct` field (Task 1), `syncAnchorPositions` (not used here — inline logic)

- [ ] **Step 1: Replace the entire `handleDrop` function body**

Find `const handleDrop = (e: React.DragEvent) => {` (around line 1276) and replace the whole function with:

```typescript
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggingEvent === null || !timelineRef.current) return;
    const rect  = timelineRef.current.getBoundingClientRect();
    const x     = ((e.clientX - rect.left) / rect.width) * 100;
    const y     = e.clientY - rect.top - topReserveH;
    const layer = hitTestLayer(y, layerTops, effectiveHeights);
    if (layer < 0 || layer >= layers.length) return;
    const droppedEv = events[draggingEvent];
    const isState   = droppedEv && (droppedEv.type ?? 'state') === 'state';

    if (isState) {
      // yOffset is always auto-managed for states (locked vertically within a layer).
      // Drop y only determines which layer band; yOffset comes from sibling stacking.
      const siblings = events
        .map((ev, idx) => ({ ev, idx }))
        .filter(({ ev, idx }) => idx !== draggingEvent && (ev.type ?? 'state') === 'state' && ev.layer === layer);
      const yOffset = siblings.length > 0
        ? clampYOffset(
            Math.max(...siblings.map(({ ev, idx }) => {
              const h = cardRefs.current[idx]?.offsetHeight ?? 36;
              return ev.yOffset + h;
            })) + 20,
            effectiveHeights[layer]
          )
        : 0;

      const year = Math.round(pctToYear(x));
      const linkedAnchorIndices = connections
        .filter(c => c.autoLink && c.from === draggingEvent)
        .map(c => c.to);

      setEvents(ev => ev.map((evt, i) => {
        if (i === draggingEvent) return { ...evt, x, year, layer, yOffset };
        if (linkedAnchorIndices.includes(i)) {
          // Anchors derive position from stored offset; inherit parent's new layer
          return { ...evt, x: x + (evt.xOffsetPct ?? 0), layer };
        }
        return evt;
      }));
    } else {
      // Anchor drag: update position and xOffsetPct; year display label is untouched
      const yOffset    = clampYOffset(y - layerTops[layer], effectiveHeights[layer]);
      const parentConn = connections.find(c => c.autoLink && c.to === draggingEvent);
      const parentX    = parentConn ? (events[parentConn.from]?.x ?? 0) : 0;
      setEvents(ev => ev.map((evt, i) =>
        i === draggingEvent
          ? { ...evt, x, layer, yOffset, xOffsetPct: x - parentX }
          : evt
      ));
    }

    setDraggingEvent(null);
  };
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: all `src/utils/` tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/ComplexityTimeline.tsx
git commit -m "feat: offset-based anchor positioning in handleDrop; state yOffset always auto-managed"
```

---

### Task 4: Cascade-delete states with confirmation warning

When a state is deleted, its auto-linked anchors must be deleted too — with a confirmation dialog showing the count.

**Files:**
- Modify: `src/ComplexityTimeline.tsx` — `deleteEvent` function (lines ~1141–1146)

**Interfaces:**
- Consumes: `Connection.autoLink` (existing), `events` and `connections` state (existing)

- [ ] **Step 1: Replace the `deleteEvent` function**

Find `const deleteEvent = (i: number) => {` and replace the whole function:

```typescript
  const deleteEvent = (i: number) => {
    const ev      = events[i];
    const isState = ev && (ev.type ?? 'state') === 'state';

    if (isState) {
      const anchorIndices = connections
        .filter(c => c.autoLink && c.from === i)
        .map(c => c.to);

      if (anchorIndices.length > 0) {
        const count = anchorIndices.length;
        const confirmed = window.confirm(
          `This state has ${count} anchor${count === 1 ? '' : 's'} that will also be deleted. Continue?`
        );
        if (!confirmed) return;
      }

      const toDelete = new Set([i, ...anchorIndices]);

      // Build old-index → new-index map for surviving events
      const reindex = new Map<number, number>();
      let shift = 0;
      for (let j = 0; j < events.length; j++) {
        if (toDelete.has(j)) { shift++; }
        else { reindex.set(j, j - shift); }
      }

      setEvents(prev => prev.filter((_, idx) => !toDelete.has(idx)));
      setConnections(conn =>
        conn
          .filter(c => !toDelete.has(c.from) && !toDelete.has(c.to))
          .map(c => ({ ...c, from: reindex.get(c.from)!, to: reindex.get(c.to)! }))
      );
      setSelectedEvent(null);
      return;
    }

    // Anchor or non-state: single delete with sequential reindex
    setEvents(prev => prev.filter((_, idx) => idx !== i));
    setConnections(conn =>
      conn
        .filter(c => c.from !== i && c.to !== i)
        .map(c => ({
          ...c,
          from: c.from > i ? c.from - 1 : c.from,
          to:   c.to   > i ? c.to   - 1 : c.to,
        }))
    );
    setSelectedEvent(null);
  };
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: all `src/utils/` tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/ComplexityTimeline.tsx
git commit -m "feat: cascade-delete anchors when state is deleted, with confirmation"
```

---

### Task 5: Backward-compat `xOffsetPct` computation on import

Old `.und` files don't have `xOffsetPct`. On import, derive it from the existing `x` and the parent state's `x` (found via autoLink connections) so the file loads correctly under the new model.

**Files:**
- Modify: `src/ComplexityTimeline.tsx` — `handleImportFile` function (lines ~1408–1445)

**Interfaces:**
- Consumes: `Connection.autoLink`, `TimelineEvent.xOffsetPct` (Task 1)

- [ ] **Step 1: Refactor `setEvents` and `setConnections` in `handleImportFile` to use local vars**

Find the existing lines inside the `reader.onload` try block (around line 1420):

```typescript
        setEvents(Array.isArray(data.events)
          ? data.events.map((ev: any) => ({ ...ev, type: ev.type ?? 'state' }))
          : []);
        setConnections(Array.isArray(data.connections) ? data.connections : []);
```

Replace with:

```typescript
        const rawEvents: TimelineEvent[] = Array.isArray(data.events)
          ? data.events.map((ev: any) => ({ ...ev, type: ev.type ?? 'state' }))
          : [];
        const rawConnections: Connection[] = Array.isArray(data.connections)
          ? data.connections
          : [];

        // Backward compat: compute xOffsetPct for anchors that pre-date this field
        const eventsWithOffsets = rawEvents.map((ev, i) => {
          if ((ev.type ?? 'state') !== 'anchor' || typeof ev.xOffsetPct === 'number') return ev;
          const parentConn = rawConnections.find(c => c.autoLink && c.to === i);
          if (!parentConn) return { ...ev, xOffsetPct: 0 };
          const parentX = rawEvents[parentConn.from]?.x ?? 0;
          return { ...ev, xOffsetPct: ev.x - parentX };
        });

        setEvents(eventsWithOffsets);
        setConnections(rawConnections);
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: all `src/utils/` tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/ComplexityTimeline.tsx
git commit -m "feat: compute xOffsetPct on import for backward compat with old .und files"
```
