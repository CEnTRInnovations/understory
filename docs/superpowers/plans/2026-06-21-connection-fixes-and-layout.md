# Connection Fixes, Strand Darkening, Transparent PNG & Layout Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix connection line alignment across view switches, darken strand bezier curves, make PNG exports transparent, and redesign the register order so column headers, trend bands, and events each occupy their own vertical zone.

**Architecture:** All changes are in a single 2134-line React component (`ComplexityTimeline.tsx`) plus its CSS file (`understory.css`). The layout redesign introduces a new top-reserve block (`TOP_RESERVE_H = 46px`) that shifts every event-zone coordinate downward; this constant is the single source of truth applied consistently across DOM rendering, event handlers, strand geometry, and both canvas draw functions.

**Tech Stack:** React 18, TypeScript 5, Vite 8. No test framework — correctness gate is `npm run build` (TypeScript type-check + Vite bundle) plus visual inspection in `npm run dev`.

## Global Constraints

- All changes confined to `src/ComplexityTimeline.tsx` and `src/understory.css`.
- No new npm dependencies.
- Every task ends with `npm run build` passing (zero TypeScript errors).
- Run `npm run dev` and visually verify before each commit.
- New layout constants (`TOP_RESERVE_H` etc.) are module-level, defined in the constants block that starts around line 64.

---

### Task 1: Fix connection recalculation on Card ↔ Strand view switch

**Files:**
- Modify: `src/ComplexityTimeline.tsx:1` (import)
- Modify: `src/ComplexityTimeline.tsx:795` (after the last `useEffect`)

**Interfaces:**
- Produces: `forceReflow` — a `() => void` dispatch that increments an internal counter, triggering a synchronous re-render via `useLayoutEffect` after `displayMode` commits so `cardRefs` are populated before the browser paints.

**Root cause recap:** `getEventPos(i)` reads `cardRefs.current[i].offsetWidth/offsetHeight` during render. When `displayMode` changes, the old DOM elements unmount and new ones mount during the commit phase — *after* the render that read the refs. A `useLayoutEffect` fires after commit (before paint) and triggers one extra render with the now-correct refs.

- [ ] **Step 1: Add `useLayoutEffect` to the React import**

In `src/ComplexityTimeline.tsx` line 1, change:
```tsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
```
to:
```tsx
import React, { useState, useRef, useCallback, useEffect, useLayoutEffect, useReducer } from 'react';
```

- [ ] **Step 2: Add the force-reflow hook after the last `useEffect` block (~line 818)**

After the existing `useEffect` that handles the Escape key (which ends around line 818), add:
```tsx
  // After displayMode commits (new elements mounted, cardRefs populated),
  // re-render once so connector geometry reads the correct ref dimensions.
  const [, forceReflow] = useReducer((x: number) => x + 1, 0);
  useLayoutEffect(() => { forceReflow(); }, [displayMode]);
```

- [ ] **Step 3: Verify build passes**

```bash
cd /Users/jeremy/Projects/understory && npm run build
```
Expected: exits 0, no TypeScript errors.

- [ ] **Step 4: Visual check**

Run `npm run dev`. Add two events on different layers. Draw a connection. Switch to Strand view. Switch back to Card view. The bezier connection line must snap immediately to the correct card edges — no flash of wrong geometry.

- [ ] **Step 5: Commit**

```bash
git add src/ComplexityTimeline.tsx
git commit -m "fix: force reflow after view switch so cardRefs are correct before paint"
```

---

### Task 2: Strand bezier connector curves 20% darker

**Files:**
- Modify: `src/ComplexityTimeline.tsx:~1741` (DOM stroke color)
- Modify: `src/ComplexityTimeline.tsx:~1269` (canvas stroke color in `drawStrandsMode`)

**Interfaces:**
- Color change only. No new functions or props.

**Color:** `#9E9B96` (rgb 158,155,150) → `#7E7C78` (×0.8 per channel: rgb 126,124,120)

- [ ] **Step 1: Update the DOM SVG stroke color**

In `src/ComplexityTimeline.tsx`, find the `<path>` element that renders connection curves (inside the `connections.map` block, around line 1741). Change:
```tsx
stroke={displayMode === 'strands' ? '#9E9B96' : conn.color}
```
to:
```tsx
stroke={displayMode === 'strands' ? '#7E7C78' : conn.color}
```

- [ ] **Step 2: Update the canvas stroke color in `drawStrandsMode`**

In `drawStrandsMode` (around line 1269), find:
```ts
ctx.strokeStyle = '#9E9B96'; ctx.lineWidth = 1; ctx.globalAlpha = 0.35; ctx.setLineDash([2, 4]);
```
Change `'#9E9B96'` to `'#7E7C78'`:
```ts
ctx.strokeStyle = '#7E7C78'; ctx.lineWidth = 1; ctx.globalAlpha = 0.35; ctx.setLineDash([2, 4]);
```

- [ ] **Step 3: Verify build passes**

```bash
npm run build
```
Expected: exits 0.

- [ ] **Step 4: Visual check**

Run `npm run dev`. Switch to Strand view with connections present. The dashed bezier curves should be visibly darker than before (medium-warm grey rather than light grey). Export a PNG in strand mode and confirm the curves match.

- [ ] **Step 5: Commit**

```bash
git add src/ComplexityTimeline.tsx
git commit -m "fix: strand bezier connector curves 20% darker (#9E9B96 → #7E7C78)"
```

---

### Task 3: Transparent PNG export background

**Files:**
- Modify: `src/ComplexityTimeline.tsx` — `exportPNG` function (~lines 1341–1420)

**Interfaces:**
- No API change. Removes two `ctx.fillRect` calls; canvas default is `rgba(0,0,0,0)`.

- [ ] **Step 1: Remove the background fill from the native-scale export path**

In `exportPNG`, locate the native-scale branch (the `if (profile.id === 'native' || profile.ratio === 0)` block, ~line 1367). Remove these two lines:
```ts
      ctx.fillStyle = '#F6F2E7';
      ctx.fillRect(0, 0, rect.width, rect.height);
```
The block should go from `ctx.scale(scale, scale);` directly to `const span = endYear - startYear;`.

- [ ] **Step 2: Remove the background fill from the ratio-profile export path**

In the `else` branch (~line 1399), find the "Background fill" comment and remove:
```ts
      // Background fill (covers letterbox padding)
      ctx.fillStyle = '#F6F2E7';
      ctx.fillRect(0, 0, targetW, targetH);
```

- [ ] **Step 3: Verify build passes**

```bash
npm run build
```
Expected: exits 0.

- [ ] **Step 4: Visual check**

Run `npm run dev`. Export a PNG using at least two profiles (native + one ratio). Open the PNG files in Preview or a browser. The background — including any letterbox bars — should be transparent (checkerboard pattern in Preview, transparent in browser `<img>` on a coloured page).

- [ ] **Step 5: Commit**

```bash
git add src/ComplexityTimeline.tsx
git commit -m "feat: transparent PNG export background — remove canvas fillRect fills"
```

---

### Task 4: Layout foundation — constants and `darkestStop` helper

**Files:**
- Modify: `src/ComplexityTimeline.tsx` — module-level constants block (~line 64) and module-level helper functions (~line 330, before `computeStrandConnectorGeometry`)

**Interfaces:**
- Produces: `COLUMN_HEADER_H`, `TREND_BAND_H`, `TREND_REGISTER_H`, `TOP_RESERVE_H` — module-level `const number` values used by all subsequent tasks.
- Produces: `darkestStop(hex: string): string` — converts a hex color to its darkest HSL stop (lightness 20%) for legible trend band labels.

- [ ] **Step 1: Add the four layout constants**

After the `const EVENT_CARD_HALF_HEIGHT = 18;` line (~line 91), add:
```ts
// ── Trend / column header register ──
const COLUMN_HEADER_H  = 26; // px — fixed column-label row above trend register
const TREND_BAND_H     = 14; // px — uniform height for all trend bands
const TREND_REGISTER_H = 20; // px — TREND_BAND_H + 3px top/bottom padding
const TOP_RESERVE_H    = COLUMN_HEADER_H + TREND_REGISTER_H; // 46px total
```

- [ ] **Step 2: Add the `darkestStop` helper before `computeStrandConnectorGeometry` (~line 330)**

Add this function immediately before the `type StrandConnGeom` declaration (~line 329):
```ts
function darkestStop(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const s = max === min ? 0 : l > 0.5
    ? (max - min) / (2 - max - min)
    : (max - min) / (max + min);
  let h = 0;
  if (max !== min) {
    if (max === r)      h = ((g - b) / (max - min) + 6) % 6;
    else if (max === g) h = (b - r) / (max - min) + 2;
    else                h = (r - g) / (max - min) + 4;
    h /= 6;
  }
  const L2 = 0.20;
  const q = L2 < 0.5 ? L2 * (1 + s) : L2 + s - L2 * s;
  const p = 2 * L2 - q;
  const hue2rgb = (t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${toHex(hue2rgb(h + 1 / 3))}${toHex(hue2rgb(h))}${toHex(hue2rgb(h - 1 / 3))}`;
}
```

- [ ] **Step 3: Verify build passes**

```bash
npm run build
```
Expected: exits 0. No visual change yet.

- [ ] **Step 4: Commit**

```bash
git add src/ComplexityTimeline.tsx
git commit -m "feat: add TOP_RESERVE_H layout constants and darkestStop helper"
```

---

### Task 5: CSS — new header row, separator, and updated trend band classes

**Files:**
- Modify: `src/understory.css`

**Interfaces:**
- Produces: `.u-col-header-row` — absolutely positioned strip at `top: 0; height: 26px` holding column labels.
- Produces: `.u-col-header-label` — individual column label inside the header row.
- Produces: `.u-content-separator` — 0.5px hairline at `top: 46px`.
- Modifies: `.u-trend-band` — remove `justify-content: center`, add `align-items: center`, override height/opacity/label alignment for the new register position.
- Modifies: `.u-strand-trend-bar` — same opacity and height harmonisation.

- [ ] **Step 1: Add `.u-col-header-row` and `.u-col-header-label`**

After the `.u-col-actions` block in `understory.css` (around the end of the column annotation section), add:
```css
.u-col-header-row {
  position: absolute;
  top: 0;
  left: 0; right: 0;
  height: 26px;
  pointer-events: none;
}
.u-col-header-label {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  font-family: "Alegreya Sans SC", "Alegreya Sans", sans-serif;
  font-size: 0.65rem;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--text-muted);
  white-space: nowrap;
  background: var(--bg-main);
  padding: 1px 6px;
  border-radius: 2px;
  border: 1px solid var(--border);
  pointer-events: auto;
  cursor: pointer;
}
.u-col-header-label:hover {
  border-color: var(--btn-column);
  color: var(--btn-column);
}
```

- [ ] **Step 2: Add `.u-content-separator`**

After the `.u-col-header-label` block:
```css
.u-content-separator {
  position: absolute;
  top: 46px;
  left: 0; right: 0;
  height: 0;
  border-top: 0.5px solid rgba(62, 59, 53, 0.18);
  pointer-events: none;
}
```

- [ ] **Step 3: Update `.u-trend-band`**

Replace the existing `.u-trend-band` block:
```css
/* old */
.u-trend-band {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Alegreya Sans", sans-serif;
  font-size: 0.7rem;
  color: #fff;
  letter-spacing: 0.03em;
  opacity: 0.85;
  border-radius: 2px;
  pointer-events: auto;
  cursor: pointer;
}
.u-trend-band:hover { opacity: 1; }
```
with:
```css
.u-trend-band {
  position: absolute;
  display: flex;
  align-items: center;
  font-family: "Alegreya Sans", sans-serif;
  font-size: 0.625rem;
  letter-spacing: 0.03em;
  opacity: 0.30;
  border-radius: 2px;
  pointer-events: auto;
  cursor: pointer;
  padding-left: 4px;
  overflow: hidden;
}
.u-trend-band:hover { opacity: 0.50; }
```

- [ ] **Step 4: Update `.u-strand-trend-bar`**

Replace the existing `.u-strand-trend-bar` block:
```css
/* old */
.u-strand-trend-bar {
  position: absolute;
  opacity: 0.85;
  cursor: pointer;
}
```
with:
```css
.u-strand-trend-bar {
  position: absolute;
  display: flex;
  align-items: center;
  opacity: 0.30;
  cursor: pointer;
  padding-left: 4px;
  overflow: hidden;
  border-radius: 2px;
}
.u-strand-trend-bar:hover { opacity: 0.50; }
```

- [ ] **Step 5: Flip `.u-trend-actions` to open below the band**

The trend band is now near the top of the canvas. The actions popup must open downward so it doesn't disappear behind the column header row. Find `.u-trend-actions` in `understory.css`:
```css
.u-trend-actions {
  position: absolute;
  bottom: calc(100% + 5px);
  left: 50%;
  transform: translateX(-50%);
  ...
}
```
Change `bottom: calc(100% + 5px)` to `top: calc(100% + 5px)`.

- [ ] **Step 5: Verify build passes**

```bash
npm run build
```
Expected: exits 0. No visual change yet (new CSS classes unused until Task 6).

- [ ] **Step 6: Commit**

```bash
git add src/understory.css
git commit -m "feat: add u-col-header-row, u-content-separator CSS; update trend band to 30% opacity register style"
```

---

### Task 6: DOM — column header row and trend band repositioning

**Files:**
- Modify: `src/ComplexityTimeline.tsx` — the JSX section that renders columns (~line 1800) and trend bands (~lines 1869, 1897)

**Interfaces:**
- Consumes: `COLUMN_HEADER_H`, `TREND_BAND_H`, `TREND_REGISTER_H`, `TOP_RESERVE_H` (Task 4)
- Consumes: `.u-col-header-row`, `.u-col-header-label`, `.u-content-separator`, `.u-trend-band` (Task 5)
- Consumes: `darkestStop` (Task 4)

**What changes:**
1. A new `<div className="u-col-header-row">` renders column labels at the top, replacing labels previously rendered inside `u-col-annotation`.
2. `u-col-annotation` retains its background stripe but its `<div className="u-col-label">` child is removed.
3. A `<div className="u-content-separator" />` is added.
4. Both card-mode and strand-mode trend bands move from `bottom: 48 + i*…` to `top: COLUMN_HEADER_H + 3` (centred in the trend register), all at the same `top`, with `darkestStop(trend.color)` as label text color.

- [ ] **Step 1: Replace the column annotation JSX block**

Find the existing `columns.map` block (~line 1800):
```tsx
{columns.map((col, i) => {
  const left  = yearToPct(col.startYear);
  const width = yearToPct(col.endYear) - left;
  return (
    <div key={i} className="u-col-annotation" style={{ left: `${left}%`, width: `${width}%` }}>
      <div className="u-col-label"
        onClick={e => { e.stopPropagation(); setSelectedColumn(prev => prev === i ? null : i); }}
        onDoubleClick={e => { e.stopPropagation(); setEditingColumn(i); setShowColumnModal(true); }}>
        {col.label}
      </div>
      {selectedColumn === i && (
        <div className="u-col-actions">
          <button className="u-event-action-btn" title="Edit column"
            onClick={e => { e.stopPropagation(); setEditingColumn(i); setShowColumnModal(true); }}>
            <Edit2 size={13} />
          </button>
          <button className="u-event-action-btn u-event-action-btn--danger" title="Delete column"
            onClick={e => { e.stopPropagation(); deleteColumn(i); }}>
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
})}
```
Replace with:
```tsx
{/* Column background stripes — full-height, no label */}
{columns.map((col, i) => {
  const left  = yearToPct(col.startYear);
  const width = yearToPct(col.endYear) - left;
  return (
    <div key={i} className="u-col-annotation" style={{ left: `${left}%`, width: `${width}%` }} />
  );
})}

{/* Column header row — labels pinned to the top register */}
<div className="u-col-header-row">
  {columns.map((col, i) => {
    const left  = yearToPct(col.startYear);
    const width = yearToPct(col.endYear) - left;
    return (
      <div key={i} style={{ position: 'absolute', left: `${left}%`, width: `${width}%` }}>
        <div className="u-col-header-label"
          style={{ left: '50%' }}
          onClick={e => { e.stopPropagation(); setSelectedColumn(prev => prev === i ? null : i); }}
          onDoubleClick={e => { e.stopPropagation(); setEditingColumn(i); setShowColumnModal(true); }}>
          {col.label}
        </div>
        {selectedColumn === i && (
          <div className="u-col-actions" style={{ top: '100%', left: '50%' }}>
            <button className="u-event-action-btn" title="Edit column"
              onClick={e => { e.stopPropagation(); setEditingColumn(i); setShowColumnModal(true); }}>
              <Edit2 size={13} />
            </button>
            <button className="u-event-action-btn u-event-action-btn--danger" title="Delete column"
              onClick={e => { e.stopPropagation(); deleteColumn(i); }}>
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>
    );
  })}
</div>

{/* Hairline separator between header/trend register and event zone */}
<div className="u-content-separator" />
```

- [ ] **Step 2: Replace card-mode trend bands JSX**

Find the card-mode trend band block (~line 1869):
```tsx
{displayMode === 'cards' && trends.map((trend, i) => {
  const left  = yearToPct(trend.startYear);
  const width = yearToPct(trend.endYear) - left;
  return (
    <div key={i} className="u-trend-band" style={{
      left: `${left}%`, width: `${width}%`,
      bottom: `${48 + i * 22}px`, height: 20,
      background: trend.color
    }}
      onClick={e => { e.stopPropagation(); setSelectedTrend(prev => prev === i ? null : i); }}
      onDoubleClick={e => { e.stopPropagation(); setEditingTrend(i); setShowTrendModal(true); }}>
      {trend.label}
      {selectedTrend === i && (
        <div className="u-trend-actions">
          <button className="u-event-action-btn" title="Edit trend"
            onClick={e => { e.stopPropagation(); setEditingTrend(i); setShowTrendModal(true); }}>
            <Edit2 size={13} />
          </button>
          <button className="u-event-action-btn u-event-action-btn--danger" title="Delete trend"
            onClick={e => { e.stopPropagation(); deleteTrend(i); }}>
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
})}
```
Replace with:
```tsx
{displayMode === 'cards' && trends.map((trend, i) => {
  const left  = yearToPct(trend.startYear);
  const width = yearToPct(trend.endYear) - left;
  const bandTop = COLUMN_HEADER_H + (TREND_REGISTER_H - TREND_BAND_H) / 2;
  return (
    <div key={i} className="u-trend-band" style={{
      left: `${left}%`, width: `${width}%`,
      top: bandTop, height: TREND_BAND_H,
      background: trend.color,
      color: darkestStop(trend.color),
    }}
      onClick={e => { e.stopPropagation(); setSelectedTrend(prev => prev === i ? null : i); }}
      onDoubleClick={e => { e.stopPropagation(); setEditingTrend(i); setShowTrendModal(true); }}>
      {trend.label}
      {selectedTrend === i && (
        <div className="u-trend-actions">
          <button className="u-event-action-btn" title="Edit trend"
            onClick={e => { e.stopPropagation(); setEditingTrend(i); setShowTrendModal(true); }}>
            <Edit2 size={13} />
          </button>
          <button className="u-event-action-btn u-event-action-btn--danger" title="Delete trend"
            onClick={e => { e.stopPropagation(); deleteTrend(i); }}>
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
})}
```

- [ ] **Step 3: Replace strand-mode trend bars JSX**

Find the strand-mode trend bar block (~line 1897):
```tsx
{displayMode === 'strands' && (() => {
  const STRAND_BAR_HEIGHT = 14;
  const STRAND_BAR_GUTTER = 4;
  const sorted = [...trends].sort((a, b) => a.startYear - b.startYear);
  return sorted.map((trend, i) => {
    const origIdx = trends.indexOf(trend);
    const left  = yearToPct(trend.startYear);
    const width = yearToPct(trend.endYear) - left;
    const bottom = 48 + i * (STRAND_BAR_HEIGHT + STRAND_BAR_GUTTER);
    return (
      <div key={origIdx} className="u-strand-trend-bar" style={{
        left: `${left}%`, width: `${width}%`,
        bottom: `${bottom}px`, height: STRAND_BAR_HEIGHT,
        background: trend.color,
      }}
        onClick={e => { e.stopPropagation(); setSelectedTrend(prev => prev === origIdx ? null : origIdx); }}
        onDoubleClick={e => { e.stopPropagation(); setEditingTrend(origIdx); setShowTrendModal(true); }}>
        <span className="u-strand-trend-label">{trend.label}</span>
        {selectedTrend === origIdx && (
          <div className="u-trend-actions">
            <button className="u-event-action-btn" title="Edit trend"
              onClick={e => { e.stopPropagation(); setEditingTrend(origIdx); setShowTrendModal(true); }}>
              <Edit2 size={13} />
            </button>
            <button className="u-event-action-btn u-event-action-btn--danger" title="Delete trend"
              onClick={e => { e.stopPropagation(); deleteTrend(origIdx); }}>
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>
    );
  });
})()}
```
Replace with (unified position, no stagger, `darkestStop` label):
```tsx
{displayMode === 'strands' && trends.map((trend, i) => {
  const left    = yearToPct(trend.startYear);
  const width   = yearToPct(trend.endYear) - left;
  const bandTop = COLUMN_HEADER_H + (TREND_REGISTER_H - TREND_BAND_H) / 2;
  return (
    <div key={i} className="u-strand-trend-bar" style={{
      left: `${left}%`, width: `${width}%`,
      top: bandTop, height: TREND_BAND_H,
      background: trend.color,
      color: darkestStop(trend.color),
    }}
      onClick={e => { e.stopPropagation(); setSelectedTrend(prev => prev === i ? null : i); }}
      onDoubleClick={e => { e.stopPropagation(); setEditingTrend(i); setShowTrendModal(true); }}>
      {trend.label}
      {selectedTrend === i && (
        <div className="u-trend-actions">
          <button className="u-event-action-btn" title="Edit trend"
            onClick={e => { e.stopPropagation(); setEditingTrend(i); setShowTrendModal(true); }}>
            <Edit2 size={13} />
          </button>
          <button className="u-event-action-btn u-event-action-btn--danger" title="Delete trend"
            onClick={e => { e.stopPropagation(); deleteTrend(i); }}>
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
})}
```

- [ ] **Step 4: Verify build passes**

```bash
npm run build
```
Expected: exits 0.

- [ ] **Step 5: Visual check (partial)**

Run `npm run dev`. Column labels should appear pinned to a narrow strip at the very top of the canvas. Trend bands should appear just below the column header row at 30% opacity with dark-hued labels. The event zone below is still wrong (events overlap the trend register) — that's fixed in Task 7.

- [ ] **Step 6: Commit**

```bash
git add src/ComplexityTimeline.tsx
git commit -m "feat: column header row and trend bands moved to top register"
```

---

### Task 7: Coordinate shift — DOM positions, handlers, and strand geometry

**Files:**
- Modify: `src/ComplexityTimeline.tsx` — 8 locations listed below

**Interfaces:**
- Consumes: `TOP_RESERVE_H` (Task 4)
- All y-coordinates in the event content zone shift down by `TOP_RESERVE_H = 46`.

**All touch points (apply all in this task to avoid a broken intermediate state):**

1. `timelineHeight` (~line 759)
2. `getEventPos` — the `top` calculation (~line 1039)
3. `handleTimelineClick` — y extraction (~line 966)
4. `handleDrop` — y extraction (~line 1019)
5. SVG strand guide lines — `y` value (~line 1695)
6. Layer row dividers — `top` style (~line 1829)
7. Card-mode event cards — `top` style (~line 1936)
8. Strand labels — `strandY` (~line 1996)
9. `computeStrandConnectorGeometry` — `y1` / `y2` (~line 343)

- [ ] **Step 1: Update `timelineHeight`**

Find (~line 759):
```ts
  const timelineHeight = layers.length > 0 ? layers.length * layerHeight + 48 : 280;
```
Replace with:
```ts
  const timelineHeight = TOP_RESERVE_H + (layers.length > 0 ? layers.length * layerHeight + 48 : 280);
```

- [ ] **Step 2: Update `getEventPos`**

Find (~line 1039):
```ts
    const top     = ev.layer * layerHeight + ev.yOffset;
```
Replace with:
```ts
    const top     = TOP_RESERVE_H + ev.layer * layerHeight + ev.yOffset;
```

- [ ] **Step 3: Update `handleTimelineClick` y extraction**

Find (~line 966):
```ts
    const y    = e.clientY - rect.top;
    const layer = Math.floor(y / layerHeight);
    if (layer < 0 || layer >= layers.length) return;
    const yOffset = clampYOffset(y - layer * layerHeight, layerHeight);
```
Replace with:
```ts
    const y    = e.clientY - rect.top - TOP_RESERVE_H;
    const layer = Math.floor(y / layerHeight);
    if (layer < 0 || layer >= layers.length) return;
    const yOffset = clampYOffset(y - layer * layerHeight, layerHeight);
```

- [ ] **Step 4: Update `handleDrop` y extraction**

Find (~line 1019):
```ts
    const y     = e.clientY - rect.top;
    const layer = Math.floor(y / layerHeight);
```
Replace with:
```ts
    const y     = e.clientY - rect.top - TOP_RESERVE_H;
    const layer = Math.floor(y / layerHeight);
```

- [ ] **Step 5: Update SVG strand guide lines**

Find (~line 1695):
```tsx
                  const y = i * layerHeight + layerHeight / 2;
```
(This is inside `displayMode === 'strands' && layers.map((_lyr, i) => {`.)
Replace with:
```tsx
                  const y = TOP_RESERVE_H + i * layerHeight + layerHeight / 2;
```

- [ ] **Step 6: Update layer row dividers**

Find (~line 1829):
```tsx
                <div key={i} className="u-layer-row"
                  style={{ top: i * layerHeight, height: layerHeight }} />
```
Replace with:
```tsx
                <div key={i} className="u-layer-row"
                  style={{ top: TOP_RESERVE_H + i * layerHeight, height: layerHeight }} />
```

- [ ] **Step 7: Update card-mode event `top` style**

Find (~line 1936):
```tsx
                    style={{ left: eventLeft(event.x), top: `${event.layer * layerHeight + event.yOffset}px` }}
```
Replace with:
```tsx
                    style={{ left: eventLeft(event.x), top: `${TOP_RESERVE_H + event.layer * layerHeight + event.yOffset}px` }}
```

- [ ] **Step 8: Update strand label `strandY`**

Find (~line 1996):
```tsx
                const strandY = layerIdx * layerHeight + layerHeight / 2;
```
Replace with:
```tsx
                const strandY = TOP_RESERVE_H + layerIdx * layerHeight + layerHeight / 2;
```

- [ ] **Step 9: Update `computeStrandConnectorGeometry` y1 / y2**

Find (~line 343):
```ts
  const y1 = fromEv.layer * lh + lh / 2;
  const y2 = toEv.layer   * lh + lh / 2;
```
Replace with:
```ts
  const y1 = TOP_RESERVE_H + fromEv.layer * lh + lh / 2;
  const y2 = TOP_RESERVE_H + toEv.layer   * lh + lh / 2;
```

- [ ] **Step 10: Verify build passes**

```bash
npm run build
```
Expected: exits 0.

- [ ] **Step 11: Visual check**

Run `npm run dev`. Build a timeline with layers, events, connections, column annotations, and trend bands. Verify:
- Column header labels appear in the top 26px strip.
- Trend bands appear just below that, 30% opacity, horizontally spanning their years.
- A faint hairline appears below the trend register.
- Events, cards, and dots appear below the hairline in the event content zone.
- Clicking an empty area of the event zone creates an event in the correct layer (not offset).
- Dragging an event to a new position lands correctly.
- In Strand view: strand guide lines are in the event zone, connections arc correctly.
- Connection curves (card mode) attach to the correct card edges.

- [ ] **Step 12: Commit**

```bash
git add src/ComplexityTimeline.tsx
git commit -m "feat: shift all event-zone coordinates down by TOP_RESERVE_H (46px)"
```

---

### Task 8: Canvas — update `drawCardsMode`

**Files:**
- Modify: `src/ComplexityTimeline.tsx` — `drawCardsMode` function (~lines 1119–1235)

**Interfaces:**
- Consumes: `TOP_RESERVE_H`, `COLUMN_HEADER_H`, `TREND_BAND_H`, `TREND_REGISTER_H`, `darkestStop` (Tasks 4)

**What changes in `drawCardsMode`:**
- Column labels: already rendered at `y = 18` which sits within the 26px header row — no change needed.
- Trend bands: move from bottom stagger to top register position; opacity 0.30; dark label color.
- Layer dividers: `y = i * layerHeight` → `y = TOP_RESERVE_H + i * layerHeight`.
- Events: `y = ev.layer * layerHeight + ev.yOffset` → `y = TOP_RESERVE_H + ev.layer * layerHeight + ev.yOffset`.
- Connections: computed via `getEventPos` (already updated in Task 7) — no canvas change needed.
- Separator line: draw at `y = TOP_RESERVE_H`.
- Background fill: already removed in Task 3.

- [ ] **Step 1: Replace trend band drawing in `drawCardsMode`**

Find the trend-drawing block inside `drawCardsMode` (~line 1169):
```ts
    // Trend bands
    trends.forEach((trend, i) => {
      const x = (yearToPct(trend.startYear) / 100) * w;
      const tw = (yearToPct(trend.endYear) / 100) * w - x;
      const th = 20; const ty = h - (48 + i * 22) - th;
      ctx.save(); ctx.globalAlpha = 0.85; ctx.fillStyle = trend.color; ctx.fillRect(x, ty, tw, th); ctx.restore();
      ctx.fillStyle = '#fff'; ctx.font = scaledFont(11, fontScale);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(trend.label, x + tw / 2, ty + th / 2);
      ctx.textBaseline = 'alphabetic';
    });
```
Replace with:
```ts
    // Trend bands — top register, uniform height, 30% opacity, dark label
    const bandTop = COLUMN_HEADER_H + (TREND_REGISTER_H - TREND_BAND_H) / 2;
    trends.forEach(trend => {
      const x  = (yearToPct(trend.startYear) / 100) * w;
      const tw = (yearToPct(trend.endYear)   / 100) * w - x;
      ctx.save(); ctx.globalAlpha = 0.30; ctx.fillStyle = trend.color;
      ctx.fillRect(x, bandTop, tw, TREND_BAND_H); ctx.restore();
      ctx.fillStyle = darkestStop(trend.color); ctx.font = scaledFont(10, fontScale);
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(trend.label, x + 4, bandTop + TREND_BAND_H / 2);
      ctx.textBaseline = 'alphabetic';
    });

    // Separator rule
    ctx.save(); ctx.strokeStyle = 'rgba(62,59,53,0.18)'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(0, TOP_RESERVE_H); ctx.lineTo(w, TOP_RESERVE_H); ctx.stroke();
    ctx.restore();
```

- [ ] **Step 2: Update layer divider y-positions in `drawCardsMode`**

Find (~line 1155):
```ts
    // Layer dividers + labels
    layers.forEach((lyr, i) => {
      const y = i * layerHeight;
      ctx.strokeStyle = 'rgba(62,59,53,0.14)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      ctx.fillStyle = '#6b6760'; ctx.font = scaledFont(10, fontScale, '500');
      ctx.textAlign = 'left'; ctx.fillText(lyr, 10, y + 14);
    });
```
Replace with:
```ts
    // Layer dividers + labels
    layers.forEach((lyr, i) => {
      const y = TOP_RESERVE_H + i * layerHeight;
      ctx.strokeStyle = 'rgba(62,59,53,0.14)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      ctx.fillStyle = '#6b6760'; ctx.font = scaledFont(10, fontScale, '500');
      ctx.textAlign = 'left'; ctx.fillText(lyr, 10, y + 14);
    });
```

- [ ] **Step 3: Update event y-positions in `drawCardsMode`**

Find (~line 1190):
```ts
      const y = ev.layer * layerHeight + ev.yOffset;
```
(This is inside `events.forEach((ev, evi) => {`.)
Replace with:
```ts
      const y = TOP_RESERVE_H + ev.layer * layerHeight + ev.yOffset;
```

- [ ] **Step 4: Verify build passes**

```bash
npm run build
```
Expected: exits 0.

- [ ] **Step 5: Visual check**

Run `npm run dev`. Export a PNG in Card mode. Open the PNG. Verify:
- Trend bands appear at the top, 30% opacity, dark-hued text, spanning correct years.
- Separator hairline visible below them.
- Events and cards below the separator.
- Layer dividers at correct positions.
- Connections arc correctly between cards.

- [ ] **Step 6: Commit**

```bash
git add src/ComplexityTimeline.tsx
git commit -m "feat: drawCardsMode canvas updated for top-register trend bands and TOP_RESERVE_H shift"
```

---

### Task 9: Canvas — update `drawStrandsMode`

**Files:**
- Modify: `src/ComplexityTimeline.tsx` — `drawStrandsMode` function (~lines 1219–1340)

**Interfaces:**
- Consumes: `TOP_RESERVE_H`, `COLUMN_HEADER_H`, `TREND_BAND_H`, `TREND_REGISTER_H`, `darkestStop` (Task 4)

**What changes in `drawStrandsMode`:**
- Strand guide lines: `y = i * layerHeight + layerHeight / 2` → `y = TOP_RESERVE_H + i * layerHeight + layerHeight / 2`.
- Connections: `computeStrandConnectorGeometry` already updated in Task 7 — no change.
- Event labels: `strandY = layerIdx * layerHeight + layerHeight / 2` → add `TOP_RESERVE_H`.
- Layer dividers: `y = i * layerHeight` → `y = TOP_RESERVE_H + i * layerHeight`.
- Trend bands: move from bottom stagger to top register, same treatment as cards mode.
- Separator line: draw at `y = TOP_RESERVE_H`.

- [ ] **Step 1: Update strand guide line y in `drawStrandsMode`**

Find (~line 1240):
```ts
    layers.forEach((_, i) => {
      const y = i * layerHeight + layerHeight / 2;
```
Replace with:
```ts
    layers.forEach((_, i) => {
      const y = TOP_RESERVE_H + i * layerHeight + layerHeight / 2;
```

- [ ] **Step 2: Update event label strandY in `drawStrandsMode`**

Find (~line 1281):
```ts
      const strandY = layerIdx * layerHeight + layerHeight / 2;
```
(This is inside `layers.forEach((_, layerIdx) => {`.)
Replace with:
```ts
      const strandY = TOP_RESERVE_H + layerIdx * layerHeight + layerHeight / 2;
```

- [ ] **Step 3: Update layer divider y in `drawStrandsMode`**

Find (~line 1299):
```ts
    // Layer labels (left-edge, like cards mode)
    layers.forEach((lyr, i) => {
      const y = i * layerHeight;
```
Replace with:
```ts
    // Layer labels (left-edge, like cards mode)
    layers.forEach((lyr, i) => {
      const y = TOP_RESERVE_H + i * layerHeight;
```

- [ ] **Step 4: Replace strand-mode trend band drawing**

Find the `// Trend bars (thin, stacked, left-edge label)` block (~line 1316):
```ts
    // Trend bars (thin, stacked, left-edge label)
    const STRAND_BAR_H = 14; const STRAND_BAR_G = 4;
    const sorted = [...trends].sort((a, b) => a.startYear - b.startYear);
    sorted.forEach((trend, i) => {
      const x = (yearToPct(trend.startYear) / 100) * w;
      const tw = (yearToPct(trend.endYear) / 100) * w - x;
      const ty = h - (48 + i * (STRAND_BAR_H + STRAND_BAR_G)) - STRAND_BAR_H;
      ctx.save(); ctx.globalAlpha = 0.85; ctx.fillStyle = trend.color;
      ctx.fillRect(x, ty, tw, STRAND_BAR_H); ctx.restore();
      ctx.fillStyle = '#fff'; ctx.font = scaledFont(10, fontScale);
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(trend.label, x + 4, ty + STRAND_BAR_H / 2);
      ctx.textBaseline = 'alphabetic';
    });
```
Replace with:
```ts
    // Trend bands — top register, uniform height, 30% opacity, dark label
    const bandTop = COLUMN_HEADER_H + (TREND_REGISTER_H - TREND_BAND_H) / 2;
    trends.forEach(trend => {
      const x  = (yearToPct(trend.startYear) / 100) * w;
      const tw = (yearToPct(trend.endYear)   / 100) * w - x;
      ctx.save(); ctx.globalAlpha = 0.30; ctx.fillStyle = trend.color;
      ctx.fillRect(x, bandTop, tw, TREND_BAND_H); ctx.restore();
      ctx.fillStyle = darkestStop(trend.color); ctx.font = scaledFont(10, fontScale);
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(trend.label, x + 4, bandTop + TREND_BAND_H / 2);
      ctx.textBaseline = 'alphabetic';
    });

    // Separator rule
    ctx.save(); ctx.strokeStyle = 'rgba(62,59,53,0.18)'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(0, TOP_RESERVE_H); ctx.lineTo(w, TOP_RESERVE_H); ctx.stroke();
    ctx.restore();
```

- [ ] **Step 5: Verify build passes**

```bash
npm run build
```
Expected: exits 0.

- [ ] **Step 6: Visual check**

Run `npm run dev`. Switch to Strand view with trend bands and column annotations present. Export a PNG. Open it. Verify:
- Column header labels at the top.
- Trend bands in the register below, 30% opacity, dark-hued text, no vertical stagger.
- Separator hairline.
- Strand guide lines and event labels in the event zone below.
- Bezier connector curves are `#7E7C78` (darker than before).
- PNG background is transparent.

- [ ] **Step 7: Commit**

```bash
git add src/ComplexityTimeline.tsx
git commit -m "feat: drawStrandsMode canvas updated for top-register trend bands and TOP_RESERVE_H shift"
```
