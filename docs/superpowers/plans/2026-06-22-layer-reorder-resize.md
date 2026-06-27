# Layer Reorder & Resize Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users drag-to-reorder layers in the gutter and drag-to-resize individual layer heights, replacing the single uniform `layerHeight` const with per-layer stored heights.

**Architecture:** Four-task sequence: (1) add `layerHeights: number[]` state + extract pure layout helpers (tested); (2) wire per-layer heights through every Y-position computation in DOM, canvas, and connector geometry; (3) resize handle UI between layers; (4) drag-to-reorder UI in the gutter. Each task compiles and renders correctly on its own before the next begins.

**Tech Stack:** React 18, TypeScript, Vite, custom CSS (no Tailwind), Vitest. All changes in `src/ComplexityTimeline.tsx`, `src/understory.css`, and a new `src/utils/layerMetrics.ts` with tests.

## Global Constraints

- Edit only `src/ComplexityTimeline.tsx`, `src/understory.css`, `src/utils/layerMetrics.ts`, and `src/utils/layerMetrics.test.ts`.
- No `console.log` or debug artifacts in committed code.
- Run `npm run build` after each task; zero TypeScript errors required.
- Run `npm test` after Task 1; new tests must pass.
- `LAYER_HEIGHT_MIN = 90` (line 65) is the minimum pixel height per layer — enforce it in all resize and layout logic.
- `LAYER_HEIGHT_DEFAULT = 120` (line 64) — fallback height when no profile is loaded.
- Do NOT change the `TimelineEvent` data shape or any existing layer fields. `event.layer` stays an index into the layers array.
- No new npm dependencies.

---

## File Map

| File | Role |
|------|------|
| `src/utils/layerMetrics.ts` | **New** — pure functions `computeLayerTops` and `hitTestLayer`, importable and independently testable |
| `src/utils/layerMetrics.test.ts` | **New** — Vitest unit tests for those functions |
| `src/ComplexityTimeline.tsx` | **Modify** — add state, import helpers, replace `layerHeight` usages, add resize/reorder UI |
| `src/understory.css` | **Modify** — add `.u-layer-resize-handle` and drag-grip styles |

---

### Task 1: Per-Layer Height Data Model + Pure Helpers (with tests)

Replace the uniform `layerHeight` const with per-layer `effectiveHeights` and `layerTops` arrays. Extract the layout computation as pure functions for testability. No visual change yet — the layout is identical when `layerHeights` state is empty (all layers stay uniform).

**Files:**
- Create: `src/utils/layerMetrics.ts`
- Create: `src/utils/layerMetrics.test.ts`
- Modify: `src/ComplexityTimeline.tsx` — add import, state, replace layerHeight derived block, update saveLayer/deleteLayer/exportJSON/handleImportFile

**Interfaces produced (used by Tasks 2, 3, 4):**
```typescript
// src/utils/layerMetrics.ts
export function computeLayerTops(heights: number[]): number[]
// returns cumulative tops: tops[i] = sum of heights[0..i-1]

export function hitTestLayer(y: number, tops: number[], heights: number[]): number
// returns layer index whose [tops[i], tops[i]+heights[i]) range contains y
// returns -1 if y < 0 or tops is empty; returns tops.length if y is beyond all layers
```

In the component render body (after Task 1, before Task 2 wires them in):
```typescript
// Replaces const layerHeight = ...
const uniformLayerH: number       // fallback height for unlocked layers
const effectiveHeights: number[]  // one height per layer
const layerTops: number[]          // cumulative tops within the event zone
const layersTotalH: number         // sum of all effectiveHeights
```

- [ ] **Step 1: Create `src/utils/layerMetrics.ts`**

```typescript
export function computeLayerTops(heights: number[]): number[] {
  const tops: number[] = [];
  let acc = 0;
  for (const h of heights) {
    tops.push(acc);
    acc += h;
  }
  return tops;
}

export function hitTestLayer(
  y: number,
  tops: number[],
  heights: number[],
): number {
  if (y < 0 || tops.length === 0) return -1;
  for (let i = 0; i < tops.length; i++) {
    if (y < tops[i] + heights[i]) return i;
  }
  return tops.length;
}
```

- [ ] **Step 2: Create `src/utils/layerMetrics.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { computeLayerTops, hitTestLayer } from './layerMetrics';

describe('computeLayerTops', () => {
  it('returns empty array for empty input', () => {
    expect(computeLayerTops([])).toEqual([]);
  });

  it('first top is always 0', () => {
    expect(computeLayerTops([120])[0]).toBe(0);
    expect(computeLayerTops([90, 150])[0]).toBe(0);
  });

  it('accumulates heights correctly', () => {
    expect(computeLayerTops([100, 200, 150])).toEqual([0, 100, 300]);
  });

  it('single layer top is 0', () => {
    expect(computeLayerTops([200])).toEqual([0]);
  });
});

describe('hitTestLayer', () => {
  // Three layers: 0–99, 100–249, 250–369
  const tops    = [0, 100, 250];
  const heights = [100, 150, 120];

  it('returns -1 for negative y', () => {
    expect(hitTestLayer(-1, tops, heights)).toBe(-1);
  });
  it('returns -1 for empty layers', () => {
    expect(hitTestLayer(50, [], [])).toBe(-1);
  });
  it('identifies first layer at boundary', () => {
    expect(hitTestLayer(0, tops, heights)).toBe(0);
  });
  it('identifies first layer in middle', () => {
    expect(hitTestLayer(50, tops, heights)).toBe(0);
  });
  it('identifies first layer at last pixel', () => {
    expect(hitTestLayer(99, tops, heights)).toBe(0);
  });
  it('identifies second layer at boundary', () => {
    expect(hitTestLayer(100, tops, heights)).toBe(1);
  });
  it('identifies second layer in middle', () => {
    expect(hitTestLayer(200, tops, heights)).toBe(1);
  });
  it('identifies third layer', () => {
    expect(hitTestLayer(250, tops, heights)).toBe(2);
    expect(hitTestLayer(300, tops, heights)).toBe(2);
  });
  it('returns length for y at exact end of last layer', () => {
    expect(hitTestLayer(370, tops, heights)).toBe(3);
  });
  it('returns length for y beyond all layers', () => {
    expect(hitTestLayer(500, tops, heights)).toBe(3);
  });
});
```

- [ ] **Step 3: Run tests to verify they pass**

```bash
npm test -- --reporter=verbose 2>&1 | grep -E "PASS|FAIL|✓|✗|layerMetrics"
```

Expected: both new tests pass. If they fail, fix the functions before continuing.

- [ ] **Step 4: Add import to `ComplexityTimeline.tsx`**

Find line 2:
```typescript
import { X, Plus, Link2, Trash2, Edit2, Download, Upload, Image, Layers, Columns, TrendingUp, Scissors } from 'lucide-react';
```

Add immediately after (line 3 area, before other imports):
```typescript
import { computeLayerTops, hitTestLayer } from './utils/layerMetrics';
```

- [ ] **Step 5: Add `layerHeights` state near `layers` state**

Find (~line 745):
```typescript
  const [layers, setLayers] = useState<string[]>([]);
```

Add the new state immediately after:
```typescript
  const [layers, setLayers] = useState<string[]>([]);
  const [layerHeights, setLayerHeights] = useState<number[]>([]);
```

- [ ] **Step 6: Replace the `layerHeight` derived const block**

Find (lines 799–804):
```typescript
  const layerHeight = (() => {
    if (selectedProfile.ratio === 0 || layers.length === 0) return LAYER_HEIGHT_DEFAULT;
    const totalH = Math.floor(canvasWidth / selectedProfile.ratio);
    const available = totalH - topReserveH - 48;
    return Math.max(LAYER_HEIGHT_MIN, Math.floor(available / layers.length));
  })();
```

Replace with:
```typescript
  const uniformLayerH = (() => {
    if (selectedProfile.ratio === 0 || layers.length === 0) return LAYER_HEIGHT_DEFAULT;
    const totalH = Math.floor(canvasWidth / selectedProfile.ratio);
    const available = totalH - topReserveH - 48;
    return Math.max(LAYER_HEIGHT_MIN, Math.floor(available / layers.length));
  })();

  const effectiveHeights: number[] = layers.map((_, i) =>
    layerHeights.length === layers.length ? layerHeights[i] : uniformLayerH
  );
  const layerTops = computeLayerTops(effectiveHeights);
  const layersTotalH = effectiveHeights.reduce((s, h) => s + h, 0);
```

- [ ] **Step 7: Update `timelineHeight` to use `layersTotalH`**

Find (line 814):
```typescript
  const timelineHeight = topReserveH + (layers.length > 0 ? layers.length * layerHeight + 48 : 280);
```

Replace with:
```typescript
  const timelineHeight = topReserveH + (layers.length > 0 ? layersTotalH + 48 : 280);
```

- [ ] **Step 8: Update `saveLayer` to maintain `layerHeights` on add**

Find (~line 902):
```typescript
  const saveLayer = (name: string) => {
    if (editingLayer !== null) {
      setLayers(l => l.map((lyr, i) => i === editingLayer ? name : lyr));
      setEditingLayer(null);
    } else {
      setLayers(l => [...l, name]);
    }
    setShowLayerModal(false);
  };
```

Replace with:
```typescript
  const saveLayer = (name: string) => {
    if (editingLayer !== null) {
      setLayers(l => l.map((lyr, i) => i === editingLayer ? name : lyr));
      // layerHeights unchanged — rename only
      setEditingLayer(null);
    } else {
      setLayers(l => [...l, name]);
      setLayerHeights(h => [...h, uniformLayerH]);
    }
    setShowLayerModal(false);
  };
```

- [ ] **Step 9: Update `deleteLayer` to remove corresponding height**

Find (~line 925):
```typescript
    setLayers(l => l.filter((_, idx) => idx !== i));
```

Replace with:
```typescript
    setLayers(l => l.filter((_, idx) => idx !== i));
    setLayerHeights(h => h.filter((_, idx) => idx !== i));
```

- [ ] **Step 10: Update `exportJSON` to persist custom heights**

Find (~line 1118):
```typescript
    const data = {
      version: TIMELINE_FILE_VERSION,
      layers, startYear, endYear,
      events, connections, columns, trends, cuts,
      displayMode, selectedProfileId,
    };
```

Replace with:
```typescript
    const data = {
      version: TIMELINE_FILE_VERSION,
      layers, startYear, endYear,
      events, connections, columns, trends, cuts,
      displayMode, selectedProfileId,
      layerHeights,
    };
```

- [ ] **Step 11: Update `handleImportFile` to restore heights**

Find (~line 1148):
```typescript
        setLayers(data.layers ?? []);
```

Replace with:
```typescript
        setLayers(data.layers ?? []);
        setLayerHeights(Array.isArray(data.layerHeights) ? data.layerHeights : []);
```

- [ ] **Step 12: Build**

```bash
npm run build
```

Expected: clean build. If TypeScript errors appear, fix them before continuing. The common error here is leftover `layerHeight` references — they'll be addressed in Task 2.

Note: at this point the component will have TypeScript errors on all the remaining `layerHeight` usages (now undefined). That's expected — Task 2 resolves them all. If you want to do a clean build between tasks, add a temporary shim `const layerHeight = uniformLayerH;` after the `layersTotalH` line, remove it in Task 2.

- [ ] **Step 13: Commit**

```bash
git add src/utils/layerMetrics.ts src/utils/layerMetrics.test.ts src/ComplexityTimeline.tsx
git commit -m "feat: add per-layer height data model and layout helpers"
```

---

### Task 2: Wire Per-Layer Heights Through All Y Computations

Replace every remaining use of the now-removed `layerHeight` const with the correct per-layer expression. There are 21 locations — this task addresses all of them. The resulting component renders identically to before (effective heights are uniform when `layerHeights` state is empty).

**Files:**
- Modify: `src/ComplexityTimeline.tsx` — 21 replacements

**Interfaces consumed from Task 1:**
- `uniformLayerH: number`
- `effectiveHeights: number[]`
- `layerTops: number[]`
- `layersTotalH: number`
- `hitTestLayer(y, layerTops, effectiveHeights): number`
- `computeLayerTops(heights): number[]`

**Important:** `effectiveHeights` and `layerTops` are in scope throughout the component because they are computed in the render body. The nested draw functions `drawCardsMode` and `drawStrandsMode` close over all render-scope variables, so they automatically get the current arrays on every render. No parameter changes needed on those functions — only the internal usages change.

- [ ] **Step 1: Update `computeStrandConnectorGeometry` signature and body**

Find (line 342):
```typescript
function computeStrandConnectorGeometry(
  fromEv: TimelineEvent,
  toEv: TimelineEvent,
  w: number,
  lh: number,
  topH: number,
  fromOffset = 0,
  toOffset = 0,
): StrandConnGeom {
  const x1 = eventLeftPx(fromEv.x, w) + fromOffset;
  const x2 = eventLeftPx(toEv.x, w)   + toOffset;
  const y1 = topH + fromEv.layer * lh + lh / 2;
  const y2 = topH + toEv.layer   * lh + lh / 2;
  if (fromEv.layer === toEv.layer) {
    // Same strand: small arc above the line so lateral connections are legible
    const cx = (x1 + x2) / 2;
    const cy = y1 - Math.min(lh * 0.25, Math.abs(x2 - x1) * 0.12);
    return { kind: 'quad', x1, y1, cx, cy, x2, y2 };
  }
  // Cross-strand: control points are (x1,midY) and (x2,midY) — all connectors in
  // the same region share this rule, so they form parallel arcs instead of
  // independent crossing diagonals (§1.3a curvature discipline).
  const midY = (y1 + y2) / 2;
  return { kind: 'cubic', x1, y1, cx1: x1, cy1: midY, cx2: x2, cy2: midY, x2, y2 };
}
```

Replace with:
```typescript
function computeStrandConnectorGeometry(
  fromEv: TimelineEvent,
  toEv: TimelineEvent,
  w: number,
  lTops: number[],
  lHeights: number[],
  topH: number,
  fromOffset = 0,
  toOffset = 0,
): StrandConnGeom {
  const x1 = eventLeftPx(fromEv.x, w) + fromOffset;
  const x2 = eventLeftPx(toEv.x, w)   + toOffset;
  const lhFrom = lHeights[fromEv.layer] ?? LAYER_HEIGHT_DEFAULT;
  const lhTo   = lHeights[toEv.layer]   ?? LAYER_HEIGHT_DEFAULT;
  const y1 = topH + (lTops[fromEv.layer] ?? 0) + lhFrom / 2;
  const y2 = topH + (lTops[toEv.layer]   ?? 0) + lhTo   / 2;
  if (fromEv.layer === toEv.layer) {
    // Same strand: small arc above the line so lateral connections are legible
    const cx = (x1 + x2) / 2;
    const cy = y1 - Math.min(lhFrom * 0.25, Math.abs(x2 - x1) * 0.12);
    return { kind: 'quad', x1, y1, cx, cy, x2, y2 };
  }
  // Cross-strand: control points are (x1,midY) and (x2,midY) — all connectors in
  // the same region share this rule, so they form parallel arcs instead of
  // independent crossing diagonals (§1.3a curvature discipline).
  const midY = (y1 + y2) / 2;
  return { kind: 'cubic', x1, y1, cx1: x1, cy1: midY, cx2: x2, cy2: midY, x2, y2 };
}
```

- [ ] **Step 2: Update `handleTimelineClick` hit test (lines 1029–1035)**

Find:
```typescript
    const layer = Math.floor(y / layerHeight);
    if (layer < 0 || layer >= layers.length) return;
    const yOffset = clampYOffset(y - layer * layerHeight, layerHeight);
```

Replace with:
```typescript
    const layer = hitTestLayer(y, layerTops, effectiveHeights);
    if (layer < 0 || layer >= layers.length) return;
    const yOffset = clampYOffset(y - layerTops[layer], effectiveHeights[layer]);
```

Find the dependency array just below (end of `handleTimelineClick` useCallback):
```typescript
  }, [connectingFrom, layers.length, layerHeight, pctToYear, topReserveH]);
```

Replace with:
```typescript
  }, [connectingFrom, layers.length, layerTops, effectiveHeights, pctToYear, topReserveH]);
```

- [ ] **Step 3: Update `handleDrop` hit test (lines 1082–1084)**

Find:
```typescript
    const layer = Math.floor(y / layerHeight);
    if (layer < 0 || layer >= layers.length) return;
    const yOffset = clampYOffset(y - layer * layerHeight, layerHeight);
```

Replace with:
```typescript
    const layer = hitTestLayer(y, layerTops, effectiveHeights);
    if (layer < 0 || layer >= layers.length) return;
    const yOffset = clampYOffset(y - layerTops[layer], effectiveHeights[layer]);
```

- [ ] **Step 4: Update `getEventPos` (lines 1101, 1110)**

Find:
```typescript
    const top     = topReserveH + ev.layer * layerHeight + ev.yOffset;
```

Replace with:
```typescript
    const top     = topReserveH + (layerTops[ev.layer] ?? 0) + ev.yOffset;
```

Find the dependency array:
```typescript
  }, [events, layerHeight, topReserveH]);
```

Replace with:
```typescript
  }, [events, layerTops, topReserveH]);
```

- [ ] **Step 5: Update canvas `drawCardsMode` — layer dividers (line 1218)**

Find inside `drawCardsMode`:
```typescript
    layers.forEach((lyr, i) => {
      const y = topReserveH + i * layerHeight;
```

Replace with:
```typescript
    layers.forEach((lyr, i) => {
      const y = topReserveH + layerTops[i];
```

- [ ] **Step 6: Update canvas `drawCardsMode` — event Y (line 1255)**

Find inside `drawCardsMode`:
```typescript
      const y = topReserveH + ev.layer * layerHeight + ev.yOffset;
```

Replace with:
```typescript
      const y = topReserveH + (layerTops[ev.layer] ?? 0) + ev.yOffset;
```

- [ ] **Step 7: Update canvas `drawStrandsMode` — strand line Y (line 1302)**

Find inside `drawStrandsMode`:
```typescript
    layers.forEach((_, i) => {
      const y = topReserveH + i * layerHeight + layerHeight / 2;
```

Replace with:
```typescript
    layers.forEach((_, i) => {
      const y = topReserveH + layerTops[i] + effectiveHeights[i] / 2;
```

- [ ] **Step 8: Update canvas `drawStrandsMode` — connector geometry call (line 1330)**

Find:
```typescript
      const geom = computeStrandConnectorGeometry(events[conn.from], events[conn.to], w, layerHeight, topReserveH, fromOffset, toOffset);
```

Replace with:
```typescript
      const geom = computeStrandConnectorGeometry(events[conn.from], events[conn.to], w, layerTops, effectiveHeights, topReserveH, fromOffset, toOffset);
```

- [ ] **Step 9: Update canvas `drawStrandsMode` — strand label Y (line 1343)**

Find:
```typescript
      const strandY = topReserveH + layerIdx * layerHeight + layerHeight / 2;
```

Replace with:
```typescript
      const strandY = topReserveH + layerTops[layerIdx] + effectiveHeights[layerIdx] / 2;
```

- [ ] **Step 10: Update canvas `drawStrandsMode` — layer dividers (line 1366)**

Find:
```typescript
    layers.forEach((lyr, i) => {
      const y = topReserveH + i * layerHeight;
      ctx.strokeStyle = 'rgba(62,59,53,0.14)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      ctx.fillStyle = '#6b6760'; ctx.font = scaledFont(10, fontScale, '500');
      ctx.textAlign = 'left'; ctx.fillText(lyr, 10, y + 14);
    });
```

Replace with:
```typescript
    layers.forEach((lyr, i) => {
      const y = topReserveH + layerTops[i];
      ctx.strokeStyle = 'rgba(62,59,53,0.14)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      ctx.fillStyle = '#6b6760'; ctx.font = scaledFont(10, fontScale, '500');
      ctx.textAlign = 'left'; ctx.fillText(lyr, 10, y + 14);
    });
```

- [ ] **Step 11: Update DOM gutter row top/height (line 1624)**

Find:
```typescript
                <div key={i} className="u-layer-gutter-row" style={{ top: topReserveH + i * layerHeight, height: layerHeight }}>
```

Replace with:
```typescript
                <div key={i} className="u-layer-gutter-row" style={{ top: topReserveH + layerTops[i], height: effectiveHeights[i] }}>
```

- [ ] **Step 12: Update DOM SVG strand lines (line 1690)**

Find:
```typescript
                  const y = topReserveH + i * layerHeight + layerHeight / 2;
```

Replace with:
```typescript
                  const y = topReserveH + layerTops[i] + effectiveHeights[i] / 2;
```

- [ ] **Step 13: Update DOM SVG connections — strand geometry call (line 1724)**

Find:
```typescript
                        computeStrandConnectorGeometry(events[conn.from], events[conn.to], svgW, layerHeight, topReserveH, fromOffset, toOffset)
```

Replace with:
```typescript
                        computeStrandConnectorGeometry(events[conn.from], events[conn.to], svgW, layerTops, effectiveHeights, topReserveH, fromOffset, toOffset)
```

- [ ] **Step 14: Update DOM connection midpoint popup — strand geometry call (lines 1765–1766)**

Find:
```typescript
                  const geom = computeStrandConnectorGeometry(
                    events[conn.from], events[conn.to], svgW, layerHeight, topReserveH
                  );
```

Replace with:
```typescript
                  const geom = computeStrandConnectorGeometry(
                    events[conn.from], events[conn.to], svgW, layerTops, effectiveHeights, topReserveH
                  );
```

- [ ] **Step 15: Update DOM layer row dividers (line 1813)**

Find:
```typescript
                <div key={i} className="u-layer-row"
                  style={{ top: topReserveH + i * layerHeight, height: layerHeight }} />
```

Replace with:
```typescript
                <div key={i} className="u-layer-row"
                  style={{ top: topReserveH + layerTops[i], height: effectiveHeights[i] }} />
```

- [ ] **Step 16: Update DOM event node top (line 1955)**

Find:
```typescript
                    style={{ left: eventLeft(event.x), top: `${topReserveH + event.layer * layerHeight + event.yOffset}px` }}
```

Replace with:
```typescript
                    style={{ left: eventLeft(event.x), top: `${topReserveH + (layerTops[event.layer] ?? 0) + event.yOffset}px` }}
```

- [ ] **Step 17: Update DOM strands mode label Y (line 2033)**

Find:
```typescript
                const strandY = topReserveH + layerIdx * layerHeight + layerHeight / 2;
```

Replace with:
```typescript
                const strandY = topReserveH + layerTops[layerIdx] + effectiveHeights[layerIdx] / 2;
```

- [ ] **Step 18: Build**

```bash
npm run build
```

Expected: clean build, zero TypeScript errors. If any `layerHeight` reference remains, the compiler will catch it as "cannot find name 'layerHeight'". Fix those before continuing.

- [ ] **Step 19: Verify in browser**

```bash
npm run dev
```

Load the app. Add 3 layers, add events. The layout should look identical to before this task. Drag an event to a different layer — it should land correctly. Confirm strand connections still render correctly in strands mode.

- [ ] **Step 20: Commit**

```bash
git add src/ComplexityTimeline.tsx
git commit -m "feat: wire per-layer heights through all Y computations"
```

---

### Task 3: Layer Resize Handle

Add a drag handle at the bottom border of each gutter row (except the last). Dragging it redistributes pixels between the two adjacent layers while maintaining `LAYER_HEIGHT_MIN` for each.

**Files:**
- Modify: `src/ComplexityTimeline.tsx` — state, refs, event handlers, DOM
- Modify: `src/understory.css` — new classes

**Interfaces consumed:**
- `effectiveHeights: number[]` (from Task 1)
- `LAYER_HEIGHT_MIN = 90` (existing constant)
- `setLayerHeights` (state setter from Task 1)

- [ ] **Step 1: Add resize state and ref near other state declarations**

Add after the `layerHeights` state (after line `const [layerHeights, setLayerHeights] = useState<number[]>([]);`):

```typescript
  const [resizingLayer, setResizingLayer] = useState<number | null>(null);
  const resizeStartRef = useRef<{ clientY: number; heights: number[] } | null>(null);
```

- [ ] **Step 2: Add `handleResizeHandleMouseDown` handler**

Add immediately after the `deleteLayer` function (after line ~929):

```typescript
  const handleResizeHandleMouseDown = (e: React.MouseEvent, i: number) => {
    e.preventDefault();
    e.stopPropagation();
    resizeStartRef.current = { clientY: e.clientY, heights: [...effectiveHeights] };
    setResizingLayer(i);
  };
```

- [ ] **Step 3: Add resize `useEffect` for global mouse tracking**

Add after the `handleResizeHandleMouseDown` function:

```typescript
  useEffect(() => {
    if (resizingLayer === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      const start = resizeStartRef.current;
      if (!start || resizingLayer + 1 >= start.heights.length) return;
      const dy = e.clientY - start.clientY;
      const hi  = start.heights[resizingLayer];
      const hi1 = start.heights[resizingLayer + 1];
      // Clamp so neither layer goes below LAYER_HEIGHT_MIN
      const delta = Math.max(LAYER_HEIGHT_MIN - hi, Math.min(hi1 - LAYER_HEIGHT_MIN, dy));
      const newHeights = [...start.heights];
      newHeights[resizingLayer]     = hi  + delta;
      newHeights[resizingLayer + 1] = hi1 - delta;
      setLayerHeights(newHeights);
    };

    const handleMouseUp = () => {
      setResizingLayer(null);
      resizeStartRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingLayer]);
```

- [ ] **Step 4: Add resize handle DOM element inside each gutter row**

Find (inside the gutter row map, after the `</div>` that closes `.u-layer-label`):
```typescript
                  <div className="u-layer-label">
                    ...
                  </div>
                </div>
```

The full gutter row JSX currently ends with:
```typescript
                <div key={i} className="u-layer-gutter-row" style={{ top: topReserveH + layerTops[i], height: effectiveHeights[i] }}>
                  <div className="u-layer-label">
                    <span ...>{layer}</span>
                    <button ...><Edit2 /></button>
                    <button ...><X /></button>
                  </div>
                </div>
```

Replace the entire gutter row JSX (from `<div key={i} className="u-layer-gutter-row"` to its closing `</div>`) with:
```tsx
                <div
                  key={i}
                  className={`u-layer-gutter-row${resizingLayer === i ? ' u-layer-gutter-row--resizing' : ''}`}
                  style={{ top: topReserveH + layerTops[i], height: effectiveHeights[i] }}
                >
                  <div className="u-layer-label">
                    <span className="u-layer-label-text"
                      onClick={() => { setEditingLayer(i); setShowLayerModal(true); }}
                      title="Click to rename this layer">
                      {layer}
                    </span>
                    <button className="u-layer-edit"
                      onClick={() => { setEditingLayer(i); setShowLayerModal(true); }}
                      title="Edit layer">
                      <Edit2 size={11} />
                    </button>
                    <button className="u-layer-remove"
                      onClick={() => deleteLayer(i)}
                      title="Delete layer">
                      <X size={11} />
                    </button>
                  </div>
                  {i < layers.length - 1 && (
                    <div
                      className={`u-layer-resize-handle${resizingLayer === i ? ' u-layer-resize-handle--active' : ''}`}
                      onMouseDown={e => handleResizeHandleMouseDown(e, i)}
                      title="Drag to resize layers"
                    />
                  )}
                </div>
```

- [ ] **Step 5: Add CSS for resize handle**

In `src/understory.css`, find the `.u-layer-gutter-row` block (~line 380) and add after it:

```css
.u-layer-resize-handle {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 6px;
  cursor: ns-resize;
  z-index: 2;
}

.u-layer-resize-handle:hover,
.u-layer-resize-handle--active {
  background: rgba(62, 59, 53, 0.12);
}

.u-layer-gutter-row--resizing {
  background: rgba(62, 59, 53, 0.04);
}
```

Also add a `body` cursor override so the resize cursor persists while dragging:

```css
body.u-resizing-layer {
  cursor: ns-resize !important;
  user-select: none;
}
```

And in the `handleResizeHandleMouseDown` function (Step 2 above), add:

```typescript
    document.body.classList.add('u-resizing-layer');
```

And in the `handleMouseUp` inside the `useEffect` (Step 3), add:

```typescript
      document.body.classList.remove('u-resizing-layer');
```

- [ ] **Step 6: Build**

```bash
npm run build
```

Expected: clean build.

- [ ] **Step 7: Verify in browser**

```bash
npm run dev
```

Add 3+ layers. Hover over the bottom border of a layer in the gutter — a resize cursor should appear. Drag downward: the layer should grow and the next layer shrink. Neither layer should go below 90px. Confirm that releasing the mouse stops the resize. Confirm the last layer has no resize handle.

- [ ] **Step 8: Commit**

```bash
git add src/ComplexityTimeline.tsx src/understory.css
git commit -m "feat: add layer resize handle in gutter"
```

---

### Task 4: Layer Reorder Drag

Add a grip icon to each layer label in the gutter. Dragging it up or down reorders the layers. Events move with their layers (all `event.layer` indices update accordingly). Layer heights follow the reorder.

**Files:**
- Modify: `src/ComplexityTimeline.tsx` — import, state, refs, handlers, DOM
- Modify: `src/understory.css` — new classes

**Interfaces consumed:**
- `effectiveHeights: number[]`, `layerTops: number[]` (Task 1)
- `hitTestLayer(y, tops, heights): number` (Task 1)
- `setLayers`, `setLayerHeights`, `setEvents` (existing state setters)
- `layers: string[]` (existing state)

- [ ] **Step 1: Add `GripVertical` to the lucide-react import**

Find (line 2):
```typescript
import { X, Plus, Link2, Trash2, Edit2, Download, Upload, Image, Layers, Columns, TrendingUp, Scissors } from 'lucide-react';
```

Replace with:
```typescript
import { X, Plus, Link2, Trash2, Edit2, Download, Upload, Image, Layers, Columns, TrendingUp, Scissors, GripVertical } from 'lucide-react';
```

- [ ] **Step 2: Add drag state and refs**

Add after `resizeStartRef`:
```typescript
  const [draggingLayer, setDraggingLayer] = useState<number | null>(null);
  const [dragOverLayer, setDragOverLayer] = useState<number | null>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    fromIdx: number;
    overIdx: number;
  } | null>(null);
  const topReserveHRef = useRef(topReserveH);
  const layerTopsRef = useRef<number[]>([]);
  const effectiveHeightsRef = useRef<number[]>([]);
```

- [ ] **Step 3: Keep refs current on every render**

Add immediately after the `layersTotalH` line (end of the layout computation block in render):
```typescript
  topReserveHRef.current = topReserveH;
  layerTopsRef.current = layerTops;
  effectiveHeightsRef.current = effectiveHeights;
```

- [ ] **Step 4: Add `reorderLayers` function**

Add after `deleteLayer`:
```typescript
  const reorderLayers = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    const newLayers = [...layers];
    const newHeights = [...effectiveHeights];
    const [movedLayer]  = newLayers.splice(fromIdx, 1);
    const [movedHeight] = newHeights.splice(fromIdx, 1);
    newLayers.splice(toIdx, 0, movedLayer);
    newHeights.splice(toIdx, 0, movedHeight);
    // Update event.layer indices:
    // Events in fromIdx move to toIdx; events between the two shift by ±1
    setEvents(evs => evs.map(ev => {
      const l = ev.layer;
      if (l === fromIdx) return { ...ev, layer: toIdx };
      if (fromIdx < toIdx && l > fromIdx && l <= toIdx) return { ...ev, layer: l - 1 };
      if (fromIdx > toIdx && l >= toIdx && l < fromIdx) return { ...ev, layer: l + 1 };
      return ev;
    }));
    setLayers(newLayers);
    setLayerHeights(newHeights);
  };
```

- [ ] **Step 5: Add grip mouse-down handler**

Add after `reorderLayers`:
```typescript
  const handleLayerGripMouseDown = (e: React.MouseEvent, i: number) => {
    e.preventDefault();
    e.stopPropagation();
    dragStateRef.current = { fromIdx: i, overIdx: i };
    setDraggingLayer(i);
    setDragOverLayer(i);
    document.body.classList.add('u-dragging-layer');
  };
```

- [ ] **Step 6: Add drag `useEffect` for global mouse tracking**

Add after `handleLayerGripMouseDown`:
```typescript
  useEffect(() => {
    if (draggingLayer === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!gutterRef.current || !dragStateRef.current) return;
      const gutterRect = gutterRef.current.getBoundingClientRect();
      const y = e.clientY - gutterRect.top - topReserveHRef.current;
      const over = hitTestLayer(y, layerTopsRef.current, effectiveHeightsRef.current);
      const clamped = Math.max(0, Math.min(layerTopsRef.current.length - 1,
        over < 0 ? 0 : over >= layerTopsRef.current.length ? layerTopsRef.current.length - 1 : over
      ));
      dragStateRef.current.overIdx = clamped;
      setDragOverLayer(clamped);
    };

    const handleMouseUp = () => {
      document.body.classList.remove('u-dragging-layer');
      const state = dragStateRef.current;
      dragStateRef.current = null;
      setDraggingLayer(null);
      setDragOverLayer(null);
      if (state && state.fromIdx !== state.overIdx) {
        reorderLayers(state.fromIdx, state.overIdx);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggingLayer]);
```

Note: `reorderLayers` is deliberately omitted from the deps to avoid re-registering the global listeners on every render during drag. `dragStateRef` and `reorderLayers` are both stable during the drag gesture (layers don't change until mouseup). The eslint disable comment prevents a false-positive warning.

- [ ] **Step 7: Add `ref={gutterRef}` to the gutter element**

Find (line ~1622):
```tsx
            <div className="u-layer-gutter" style={{ height: timelineHeight }}>
```

Replace with:
```tsx
            <div ref={gutterRef} className="u-layer-gutter" style={{ height: timelineHeight }}>
```

- [ ] **Step 8: Add grip icon and drag-over classes to each gutter row**

Find the gutter row from Task 3 (the one with the resize handle). It currently starts with:
```tsx
                <div
                  key={i}
                  className={`u-layer-gutter-row${resizingLayer === i ? ' u-layer-gutter-row--resizing' : ''}`}
                  style={{ top: topReserveH + layerTops[i], height: effectiveHeights[i] }}
                >
                  <div className="u-layer-label">
                    <span className="u-layer-label-text"
```

Replace that opening `<div>` and the start of `.u-layer-label` with:
```tsx
                <div
                  key={i}
                  className={[
                    'u-layer-gutter-row',
                    resizingLayer === i ? 'u-layer-gutter-row--resizing' : '',
                    draggingLayer === i ? 'u-layer-gutter-row--dragging' : '',
                    dragOverLayer === i && draggingLayer !== i ? 'u-layer-gutter-row--drag-over' : '',
                  ].filter(Boolean).join(' ')}
                  style={{ top: topReserveH + layerTops[i], height: effectiveHeights[i] }}
                >
                  <div className="u-layer-label">
                    <div
                      className="u-layer-drag-grip"
                      onMouseDown={e => handleLayerGripMouseDown(e, i)}
                      title="Drag to reorder layer"
                    >
                      <GripVertical size={12} />
                    </div>
                    <span className="u-layer-label-text"
```

(The rest of the label — span, edit button, remove button — stays unchanged.)

- [ ] **Step 9: Add CSS for drag grip and drag states**

In `src/understory.css`, after the resize handle CSS added in Task 3:

```css
.u-layer-drag-grip {
  cursor: grab;
  color: var(--text-muted, #8A867E);
  opacity: 0.4;
  padding: 0 3px 0 0;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  line-height: 1;
}

.u-layer-drag-grip:hover {
  opacity: 0.8;
}

.u-layer-gutter-row--dragging {
  opacity: 0.4;
}

.u-layer-gutter-row--drag-over {
  background: rgba(62, 59, 53, 0.06);
  border-top: 2px solid rgba(62, 59, 53, 0.35);
}

body.u-dragging-layer {
  cursor: grabbing !important;
  user-select: none;
}
```

- [ ] **Step 10: Build**

```bash
npm run build
```

Expected: clean build, zero TypeScript errors.

- [ ] **Step 11: Verify in browser**

```bash
npm run dev
```

Add 3+ layers, add events to each. In the gutter:
- Hover over the `⠿` grip icon — cursor becomes `grab`.
- Drag layer 1 down past layer 2 — a blue-ish border appears on layer 2 as drag-over indicator.
- Release — the layers swap. Events that were in the dragged layer are now in the new position.
- Confirm event positions are correct after reorder (events stay in the correct visual layer).
- Confirm strand connections follow their events (connection lines still connect the right events).
- Try exporting PNG in both modes — visual should reflect the reordered layers.

- [ ] **Step 12: Commit**

```bash
git add src/ComplexityTimeline.tsx src/understory.css
git commit -m "feat: add layer reorder by drag in gutter"
```

---

## Self-Review

**Spec coverage:**
- ✅ Reorder layers — Task 4 (drag grip → insert-at reorder with index remapping)
- ✅ Resize layers vertically — Task 3 (drag handle redistributes pixels between adjacent layers)
- ✅ Proportionally — Task 3 handles the proportional UX: pixels taken from one layer go to the adjacent layer; the profile system's natural proportion still works since `effectiveHeights` derives from `uniformLayerH` when no custom heights are stored
- ✅ Layer heights persist in saved JSON — Task 1 exportJSON / handleImportFile
- ✅ New layers get current uniform height on add — Task 1 saveLayer
- ✅ Deleted layers remove their height entry — Task 1 deleteLayer
- ✅ All canvas draw functions updated — Task 2 Steps 5–10
- ✅ Connector geometry updated — Task 2 Step 1
- ✅ All DOM Y positions updated — Task 2 Steps 11–17
- ✅ Hit-testing updated — Task 2 Steps 2–3
- ✅ Pure functions tested — Task 1

**Placeholder scan:** None — all steps contain exact code values, complete function bodies, and expected outputs.

**Type consistency:**
- `computeLayerTops` defined in Task 1 Step 1, imported in Task 1 Step 4 — consistent.
- `hitTestLayer` defined in Task 1 Step 1, used in Task 2 Step 2–3 and Task 4 Step 6 — consistent.
- `effectiveHeights: number[]` computed in Task 1 Step 6, read in Task 2 throughout — consistent.
- `layerTops: number[]` computed in Task 1 Step 6, read in Task 2 throughout — consistent.
- `computeStrandConnectorGeometry` new signature: `(fromEv, toEv, w, lTops, lHeights, topH, fromOffset?, toOffset?)` — all three call sites in Task 2 Steps 8, 13, 14 pass `layerTops, effectiveHeights` — consistent.
- `reorderLayers(fromIdx, toIdx)` defined in Task 4 Step 4, called in Task 4 Step 6 — consistent.

**Edge case: resize last layer** — Task 3 adds handle only when `i < layers.length - 1`, preventing the last layer from having a resize handle (which would have no layer to donate pixels to). Correct.

**Edge case: single layer** — with one layer, no resize handle appears (0 < 0 is false). Reorder drag on a single-layer list is a no-op (fromIdx === overIdx). Both handled correctly.

**Edge case: `layerHeights` length mismatch on import** — Task 1 Step 11 defaults to `[]` if `data.layerHeights` is missing or not an array. The `effectiveHeights` derivation falls back to `uniformLayerH` for any index where `layerHeights.length !== layers.length`. Correct.
