# UX Fixes: Export One-Step, 300 DPI, Strand Default & Connection Recompute

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four UX issues in Understory Timeline: reliable connection recomputation on view switch, strand-mode-as-default, one-click PNG export, and 300 DPI output quality.

**Architecture:** All changes are in `src/ComplexityTimeline.tsx` (single 2191-line React component). One constant in `EXPORT_PROFILES` changes. The export menu JSX is simplified. A new `svgWidth` state variable is added for reliable DOM measurement. No new files needed.

**Tech Stack:** React 18, TypeScript 5, Vite 8. `tsconfig.json` has `noUnusedLocals: true` and `noUnusedParameters: true` — any unused declaration is a **build error**. Run `npm run build` after every task.

## Global Constraints

- Single file: `src/ComplexityTimeline.tsx`
- Build command: `npm run build` — must pass with zero errors before each commit
- `noUnusedLocals: true` — do not leave unused variables; remove them or use them
- Do not add comments unless the WHY is non-obvious
- Do not reorganize unrelated code; only touch the lines named in each task

---

### Task 1: Store SVG width in state for reliable strand connection positions

**Root cause:** In strand mode, bezier connector x-coordinates are computed from `svgRef.current?.getBoundingClientRect().width`, read during the React render phase. At render time, `svgRef.current` points to the previously-committed SVG element, so the width reflects the last committed state — not necessarily the current render's layout. When switching modes, the first post-switch render may compute connection positions against a stale or mismatched width.

The fix: capture the SVG's actual width in a state variable inside `useLayoutEffect` (which fires after commit, before paint). Then use that state value — never a live DOM read — during render.

**Files:**
- Modify: `src/ComplexityTimeline.tsx`

**Interfaces:**
- Produces: `svgWidth: number` state (initialized to 0; falls back to `canvasWidth` when 0)
- Consumes: existing `svgRef`, `canvasWidth`, `displayMode`, `forceReflow` dispatch

- [ ] **Step 1: Add `svgWidth` state near the other canvas-dimension state**

Around line 754 (`const [canvasWidth, ...`), insert after the `canvasWidth` and `layerHeight` lines:

```tsx
const [svgWidth, setSvgWidth] = useState(0);
```

- [ ] **Step 2: Expand the existing `useLayoutEffect` to also capture SVG width**

Current code at lines ~861–864:
```tsx
// After displayMode commits (new elements mounted, cardRefs populated),
// re-render once so connector geometry reads the correct ref dimensions.
const [, forceReflow] = useReducer((x: number) => x + 1, 0);
useLayoutEffect(() => { forceReflow(); }, [displayMode]);
```

Replace with:
```tsx
const [, forceReflow] = useReducer((x: number) => x + 1, 0);
useLayoutEffect(() => {
  const w = svgRef.current?.getBoundingClientRect().width ?? 0;
  if (w > 0) setSvgWidth(w);
  forceReflow();
}, [displayMode, canvasWidth]);
```

Both `setSvgWidth` and `forceReflow()` dispatch in the same `useLayoutEffect` call; React 18 batches them into one synchronous re-render before the browser paints, so the user never sees an intermediate state.

- [ ] **Step 3: Replace live DOM reads with the stored state value**

There are exactly two places that read `svgRef.current?.getBoundingClientRect().width ?? canvasWidth`. Replace both:

**Line ~1761** (inside `connections.map`, strand mode branch):
```tsx
// Before:
const svgW = svgRef.current?.getBoundingClientRect().width ?? canvasWidth;
// After:
const svgW = svgWidth || canvasWidth;
```

**Line ~1811** (inside `connections.map`, action popup positioning):
```tsx
// Before:
const svgW = svgRef.current?.getBoundingClientRect().width ?? canvasWidth;
// After:
const svgW = svgWidth || canvasWidth;
```

- [ ] **Step 4: Build and verify**

```bash
npm run build
```

Expected: `✓ built in N ms` with no TypeScript errors. If `svgWidth` triggers "unused variable," confirm it is used in the two replacement lines above.

- [ ] **Step 5: Manual smoke test**

Run `npm run dev`. Add two events on different layers. Add a connection. Switch between Card and Strand mode several times. Confirm that connector curves snap to the correct positions immediately in both modes, with no visible lag or misalignment.

- [ ] **Step 6: Commit**

```bash
git add src/ComplexityTimeline.tsx
git commit -m "fix: store svgWidth in state via useLayoutEffect for reliable strand connection positions"
```

---

### Task 2: Make Strand view the default

**Files:**
- Modify: `src/ComplexityTimeline.tsx` (2 lines)

**Interfaces:**
- Consumes: `displayMode` state initialization at ~line 756; import fallback at ~line 1141

- [ ] **Step 1: Change initial state**

Line ~756:
```tsx
// Before:
const [displayMode, setDisplayMode] = useState<DisplayMode>('cards');
// After:
const [displayMode, setDisplayMode] = useState<DisplayMode>('strands');
```

- [ ] **Step 2: Change import fallback for old files**

Line ~1141 (inside `handleImportFile`, the else branch of the `setDisplayMode(...)` ternary):
```tsx
// Before:
  : 'cards'
// After:
  : 'strands'
```

This means old `.und` files that predate the `displayMode` field will open in Strand view, consistent with the new default.

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: `✓ built in N ms` with no errors.

- [ ] **Step 4: Manual smoke test**

Run `npm run dev`. Confirm the timeline opens in Strand view. Reload the page. Confirm it starts in Strand view again. Load an old `.und` file without a `displayMode` field — confirm it opens in Strand view.

- [ ] **Step 5: Commit**

```bash
git add src/ComplexityTimeline.tsx
git commit -m "feat: make strand view the default display mode"
```

---

### Task 3: One-step PNG export (clicking a ratio profile immediately exports)

**Current UX:** Export → menu opens → click ratio (selects it, no export) → click "Export as PNG" button → export happens.

**New UX:** Export → menu opens (with crop toggle) → click ratio → immediately exports and closes menu.

**Files:**
- Modify: `src/ComplexityTimeline.tsx`

**Interfaces:**
- Removes: `selectedProfileId` state and `setSelectedProfileId` (no longer needed)
- Removes: `PORTRAIT_IDS` constant (used only by the portrait warning, which is removed)
- Keeps: `showExportMenu`, `cropInstead`, `setCropInstead`
- Keeps: `exportPNG` function signature unchanged

- [ ] **Step 1: Remove `selectedProfileId` state**

Line ~787:
```tsx
// Remove this entire line:
const [selectedProfileId, setSelectedProfileId] = useState('native');
```

- [ ] **Step 2: Remove `PORTRAIT_IDS` constant**

Line ~62:
```tsx
// Remove this entire line:
const PORTRAIT_IDS = new Set(['letter-port', 'book-6x9', 'book-7x10']);
```

- [ ] **Step 3: Replace the export menu JSX**

The current menu JSX starts at `{showExportMenu && (` (around line 1555) and ends at the closing `</div>` around line 1597. Replace the entire `{showExportMenu && (...)}` block with:

```tsx
{showExportMenu && (
  <div className="u-export-menu u-export-menu--profiles">
    <label className="u-export-crop-row">
      <input type="checkbox" checked={cropInstead} onChange={e => setCropInstead(e.target.checked)} />
      {' '}Crop to fit (default: letterbox)
    </label>
    <div className="u-export-profile-list">
      {EXPORT_PROFILES.map(p => (
        <button
          key={p.id}
          className="u-export-profile-btn"
          onClick={() => { exportPNG(p); setShowExportMenu(false); }}
        >
          {p.label}
        </button>
      ))}
    </div>
  </div>
)}
```

Key changes:
- Crop toggle is now **above** the profile list (set preference before choosing ratio)
- Each profile button immediately calls `exportPNG(p)` and closes the menu
- No `selectedProfileId` tracking, no "active" class, no separate "Export as PNG" button
- Portrait warning removed (can't show it between selection and export)

- [ ] **Step 4: Build**

```bash
npm run build
```

Expected: `✓ built in N ms`. TypeScript must not report `selectedProfileId`, `setSelectedProfileId`, or `PORTRAIT_IDS` as unused — they were removed, so they should not appear anywhere in the file. If the build fails with "Cannot find name 'selectedProfileId'" or similar, search the file for any remaining references and remove them.

```bash
grep -n "selectedProfileId\|PORTRAIT_IDS\|showPortraitWarning\|isPortrait" src/ComplexityTimeline.tsx
```

Expected: no output (all removed).

- [ ] **Step 5: Manual smoke test**

Run `npm run dev`. Click Export. Confirm the crop toggle appears above the profile list. Click "Slide (16:9)" — confirm the PNG downloads immediately and the menu closes, without any extra click. Confirm the crop toggle persists between menu opens (it's a checkbox state, not reset on close).

- [ ] **Step 6: Commit**

```bash
git add src/ComplexityTimeline.tsx
git commit -m "feat: one-step PNG export — clicking a ratio profile immediately triggers download"
```

---

### Task 4: Fix export resolution to 300 DPI

**Current issues:**
1. **Native export** uses `scale = 2` → ~192 DPI on a 96 DPI screen. Change to `scale = 3` → ~288 DPI (close enough to 300).
2. **Tabloid landscape** `pxWidth = 3400` → 3400 ÷ 17 inches = **200 DPI**. Should be 5100 (17 × 300).
3. All other print profiles (Letter, Book trims) are already at 300 DPI.
4. `canvas.toBlob` has no explicit MIME type — add `'image/png'` as the second argument.

**Files:**
- Modify: `src/ComplexityTimeline.tsx`

**Interfaces:**
- Changes `EXPORT_PROFILES[2]` (tabloid-land) `pxWidth` from 3400 to 5100
- Changes native-path local `scale` constant from 2 to 3
- Adds explicit MIME type to `canvas.toBlob`

- [ ] **Step 1: Fix Tabloid landscape to 300 DPI**

Line ~56 in `EXPORT_PROFILES`:
```tsx
// Before:
{ id: 'tabloid-land', label: 'Tabloid landscape (11×17)',      ratio: 17/11,  pxWidth: 3400, fontScale: 1.0 },
// After:
{ id: 'tabloid-land', label: 'Tabloid landscape (11×17)',      ratio: 17/11,  pxWidth: 5100, fontScale: 1.0 },
```

Verify: 5100 px ÷ 17 in = 300 DPI ✓

- [ ] **Step 2: Fix native export scale**

Inside `exportPNG`, the native-path block at ~line 1413:
```tsx
// Before:
if (profile.id === 'native' || profile.ratio === 0) {
  // Current behavior: 2× scale of the live viewport
  const scale = 2;
// After:
if (profile.id === 'native' || profile.ratio === 0) {
  const scale = 3;
```

Remove the comment ("Current behavior: 2× scale of the live viewport") — it is no longer accurate.

- [ ] **Step 3: Add explicit MIME type to `canvas.toBlob`**

Line ~1464:
```tsx
// Before:
canvas.toBlob(blob => {
// After:
canvas.toBlob(blob => {
```

Wait — `toBlob` takes `(callback, type?, quality?)`. Change to:
```tsx
canvas.toBlob(blob => {
  if (!blob) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'understory-timeline.png';
  a.click();
}, 'image/png');
```

The second argument `'image/png'` makes the MIME type explicit rather than relying on the browser default.

- [ ] **Step 4: Build**

```bash
npm run build
```

Expected: `✓ built in N ms` with no errors.

- [ ] **Step 5: Manual verification**

Run `npm run dev`. Export using:
- Native → file should be ~3× the viewport pixel dimensions (open in Preview/Photos and check pixel size)
- Tabloid landscape → file should be 5100 × 3300 px (5100 ÷ 17 = 300 DPI)
- Letter landscape → file should still be 3300 × 2550 px (unchanged)

- [ ] **Step 6: Commit**

```bash
git add src/ComplexityTimeline.tsx
git commit -m "fix: 300 DPI export — native scale 2x→3x, tabloid pxWidth 3400→5100, explicit PNG MIME type"
```

---

---

### Task 5: Stagger trend bands vertically, sorted by start date

**Goal:** Replace the flat single-row trend register with a vertically-stacked layout where each trend occupies its own row, sorted by start date (earliest at top). Ties broken by end date (earlier first), then alphabetically. The trend register height grows dynamically to fit all trends; all event-zone coordinates shift down accordingly.

**Layout math:**
```
TREND_SLOT_H  = 16px   (TREND_BAND_H 14px + 2px gap between slots)
trendRegisterH = max(20, n * TREND_SLOT_H + 4)   // 3px top pad + slots + 1px bottom
topReserveH    = COLUMN_HEADER_H + trendRegisterH // replaces static TOP_RESERVE_H

Band k top (0-based, sorted order):
  bandTop = COLUMN_HEADER_H + 3 + k * TREND_SLOT_H
```

For 0 trends: `topReserveH = 46` (same as before). For 1 trend: 48px. For 3 trends: 78px.

**Files:**
- Modify: `src/ComplexityTimeline.tsx` (~25 targeted replacements)
- Modify: `src/understory.css` (remove hardcoded `top: 46px` from `.u-content-separator`)

**Interfaces:**
- Removes: module-level `TOP_RESERVE_H` constant
- Adds: module-level `TREND_SLOT_H = 16` constant
- Changes: `computeStrandConnectorGeometry` gains `topH: number` as 5th parameter (before optional `fromOffset`/`toOffset`)
- Adds component-level: `trendRegisterH: number`, `topReserveH: number`, `sortedTrends: Trend[]`
- `getEventPos` deps gain `topReserveH`
- `handleTimelineClick` deps gain `topReserveH`
- `useMemo` added to React import

- [ ] **Step 1: Add `useMemo` to the React import**

Line 1:
```tsx
// Before:
import React, { useState, useRef, useCallback, useEffect, useLayoutEffect, useReducer } from 'react';
// After:
import React, { useState, useRef, useCallback, useEffect, useLayoutEffect, useReducer, useMemo } from 'react';
```

- [ ] **Step 2: Add `TREND_SLOT_H` constant and remove `TOP_RESERVE_H`**

Lines ~92–96:
```ts
// Before:
const COLUMN_HEADER_H  = 26; // px — fixed column-label row above trend register
const TREND_BAND_H     = 14; // px — uniform height for all trend bands
const TREND_REGISTER_H = 20; // px — TREND_BAND_H + 3px top/bottom padding
const TOP_RESERVE_H    = COLUMN_HEADER_H + TREND_REGISTER_H; // 46px total

// After:
const COLUMN_HEADER_H  = 26; // px — fixed column-label row above trend register
const TREND_BAND_H     = 14; // px — uniform height for all trend bands
const TREND_REGISTER_H = 20; // px — minimum register height (fits 0–1 trends)
const TREND_SLOT_H     = TREND_BAND_H + 2; // 16px — band height + inter-slot gap
```

`TOP_RESERVE_H` is intentionally removed — it becomes a component-level computed value in Step 5.

- [ ] **Step 3: Add `topH` parameter to `computeStrandConnectorGeometry`**

Replace the function signature and body at lines ~369–391:
```ts
// Before:
function computeStrandConnectorGeometry(
  fromEv: TimelineEvent,
  toEv: TimelineEvent,
  w: number,
  lh: number,
  fromOffset = 0,
  toOffset = 0,
): StrandConnGeom {
  const x1 = eventLeftPx(fromEv.x, w) + fromOffset;
  const x2 = eventLeftPx(toEv.x, w)   + toOffset;
  const y1 = TOP_RESERVE_H + fromEv.layer * lh + lh / 2;
  const y2 = TOP_RESERVE_H + toEv.layer   * lh + lh / 2;

// After:
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
```

- [ ] **Step 4: Build to confirm module-level changes compile**

```bash
npm run build
```

Expected: **FAIL** — TypeScript reports that `topReserveH` doesn't exist yet (we haven't added it to the component) and that callers of `computeStrandConnectorGeometry` don't pass enough arguments. This is expected — Steps 5–12 fix all of those. If you see an unrelated error, investigate before continuing.

- [ ] **Step 5: Add computed layout values and sorted trends to the component**

After the `timelineHeight` declaration (line ~796), add:

```tsx
const trendRegisterH = Math.max(TREND_REGISTER_H, trends.length * TREND_SLOT_H + 4);
const topReserveH = COLUMN_HEADER_H + trendRegisterH;

const sortedTrends = useMemo(() =>
  [...trends].sort((a, b) =>
    a.startYear !== b.startYear ? a.startYear - b.startYear :
    a.endYear   !== b.endYear   ? a.endYear   - b.endYear   :
    a.label.localeCompare(b.label)
  ),
[trends]);
```

Also update `timelineHeight` on line ~796 (currently uses the old `TOP_RESERVE_H`):
```tsx
// Before:
const timelineHeight = TOP_RESERVE_H + (layers.length > 0 ? layers.length * layerHeight + 48 : 280);
// After:
const timelineHeight = topReserveH + (layers.length > 0 ? layers.length * layerHeight + 48 : 280);
```

- [ ] **Step 6: Update `getEventPos` — replace `TOP_RESERVE_H` and add dep**

Line ~1081 and its `useCallback` deps:
```tsx
// Before:
    const top     = TOP_RESERVE_H + ev.layer * layerHeight + ev.yOffset;
  ...
}, [events, layerHeight]);

// After:
    const top     = topReserveH + ev.layer * layerHeight + ev.yOffset;
  ...
}, [events, layerHeight, topReserveH]);
```

- [ ] **Step 7: Update `handleTimelineClick` — replace `TOP_RESERVE_H` and add dep**

Line ~1007 and its `useCallback` deps (line ~1014):
```tsx
// Before:
    const y    = e.clientY - rect.top - TOP_RESERVE_H;
  ...
}, [connectingFrom, layers.length, layerHeight, pctToYear]);

// After:
    const y    = e.clientY - rect.top - topReserveH;
  ...
}, [connectingFrom, layers.length, layerHeight, pctToYear, topReserveH]);
```

- [ ] **Step 8: Update `handleDrop` — replace `TOP_RESERVE_H`**

Line ~1060 (plain function, no deps array):
```tsx
// Before:
    const y     = e.clientY - rect.top - TOP_RESERVE_H;
// After:
    const y     = e.clientY - rect.top - topReserveH;
```

- [ ] **Step 9: Update `drawCardsMode` inner function — all `TOP_RESERVE_H` and trend loop**

Replace the 3 occurrences of `TOP_RESERVE_H` with `topReserveH` (lines ~1196, 1226, 1232).

Replace the trend band section (lines ~1211–1222):
```ts
// Before:
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

// After:
    // Trend bands — staggered rows, sorted by start date
    sortedTrends.forEach((trend, k) => {
      const bandTop = COLUMN_HEADER_H + 3 + k * TREND_SLOT_H;
      const x  = (yearToPct(trend.startYear) / 100) * w;
      const tw = (yearToPct(trend.endYear)   / 100) * w - x;
      ctx.save(); ctx.globalAlpha = 0.30; ctx.fillStyle = trend.color;
      ctx.fillRect(x, bandTop, tw, TREND_BAND_H); ctx.restore();
      ctx.fillStyle = darkestStop(trend.color); ctx.font = scaledFont(10, fontScale);
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(trend.label, x + 4, bandTop + TREND_BAND_H / 2);
      ctx.textBaseline = 'alphabetic';
    });
```

- [ ] **Step 10: Update `drawStrandsMode` inner function — all `TOP_RESERVE_H` and trend loop**

Replace the 4 occurrences of `TOP_RESERVE_H` with `topReserveH` (lines ~1280, 1321, 1344, 1374).

Replace the trend band section (lines ~1359–1370):
```ts
// Before:
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

// After:
    // Trend bands — staggered rows, sorted by start date
    sortedTrends.forEach((trend, k) => {
      const bandTop = COLUMN_HEADER_H + 3 + k * TREND_SLOT_H;
      const x  = (yearToPct(trend.startYear) / 100) * w;
      const tw = (yearToPct(trend.endYear)   / 100) * w - x;
      ctx.save(); ctx.globalAlpha = 0.30; ctx.fillStyle = trend.color;
      ctx.fillRect(x, bandTop, tw, TREND_BAND_H); ctx.restore();
      ctx.fillStyle = darkestStop(trend.color); ctx.font = scaledFont(10, fontScale);
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(trend.label, x + 4, bandTop + TREND_BAND_H / 2);
      ctx.textBaseline = 'alphabetic';
    });
```

Also update `computeStrandConnectorGeometry` call in `drawStrandsMode` at line ~1308 — add `topReserveH` as the new 5th argument:
```ts
// Before:
      const geom = computeStrandConnectorGeometry(events[conn.from], events[conn.to], w, layerHeight, fromOffset, toOffset);
// After:
      const geom = computeStrandConnectorGeometry(events[conn.from], events[conn.to], w, layerHeight, topReserveH, fromOffset, toOffset);
```

- [ ] **Step 11: Update DOM `computeStrandConnectorGeometry` callers — add `topReserveH`**

There are two callers in the JSX render section.

**Caller 1** (strand connections, line ~1771):
```tsx
// Before:
        path = strandGeomToSVGPath(
          computeStrandConnectorGeometry(events[conn.from], events[conn.to], svgW, layerHeight, fromOffset, toOffset)
        );
// After:
        path = strandGeomToSVGPath(
          computeStrandConnectorGeometry(events[conn.from], events[conn.to], svgW, layerHeight, topReserveH, fromOffset, toOffset)
        );
```

**Caller 2** (connection action popup midpoint, line ~1812):
```tsx
// Before:
                  const geom = computeStrandConnectorGeometry(
                    events[conn.from], events[conn.to], svgW, layerHeight
                  );
// After:
                  const geom = computeStrandConnectorGeometry(
                    events[conn.from], events[conn.to], svgW, layerHeight, topReserveH
                  );
```

- [ ] **Step 12: Replace all remaining DOM `TOP_RESERVE_H` references with `topReserveH`**

Replace each of these (use exact surrounding context to locate them):

```tsx
// Line ~1671 (layer gutter rows):
// Before:  top: TOP_RESERVE_H + i * layerHeight
// After:   top: topReserveH + i * layerHeight

// Line ~1737 (SVG strand lines y):
// Before:  const y = TOP_RESERVE_H + i * layerHeight + layerHeight / 2;
// After:   const y = topReserveH + i * layerHeight + layerHeight / 2;

// Line ~1884 (content separator — also add inline style):
// Before:  <div className="u-content-separator" />
// After:   <div className="u-content-separator" style={{ top: topReserveH }} />

// Line ~1889 (layer row dividers):
// Before:  style={{ top: TOP_RESERVE_H + i * layerHeight, height: layerHeight }}
// After:   style={{ top: topReserveH + i * layerHeight, height: layerHeight }}

// Line ~1997 (event card top):
// Before:  top: `${TOP_RESERVE_H + event.layer * layerHeight + event.yOffset}px`
// After:   top: `${topReserveH + event.layer * layerHeight + event.yOffset}px`

// Line ~2052 (strand label strandY):
// Before:  const strandY = TOP_RESERVE_H + layerIdx * layerHeight + layerHeight / 2;
// After:   const strandY = topReserveH + layerIdx * layerHeight + layerHeight / 2;
```

- [ ] **Step 13: Update DOM trend rendering to use sorted order and per-index `bandTop`**

**Card-mode trends** (lines ~1929–1957), change to use `sortedTrends` and per-index top:
```tsx
// Before:
              {displayMode === 'cards' && trends.map((trend, i) => {
                const left  = yearToPct(trend.startYear);
                const width = yearToPct(trend.endYear) - left;
                const bandTop = COLUMN_HEADER_H + (TREND_REGISTER_H - TREND_BAND_H) / 2;
                return (
                  <div key={i} className="u-trend-band" style={{
                    left: `${left}%`, width: `${width}%`,
                    top: bandTop, height: TREND_BAND_H,
                    background: trend.color + '4D',
                    color: darkestStop(trend.color),
                  }}
                    onClick={e => { e.stopPropagation(); setSelectedTrend(prev => prev === i ? null : i); }}
                    onDoubleClick={e => { e.stopPropagation(); setEditingTrend(i); setShowTrendModal(true); }}>
                    {trend.label}
                    {selectedTrend === i && (

// After:
              {displayMode === 'cards' && sortedTrends.map((trend, k) => {
                const origIdx = trends.indexOf(trend);
                const left  = yearToPct(trend.startYear);
                const width = yearToPct(trend.endYear) - left;
                const bandTop = COLUMN_HEADER_H + 3 + k * TREND_SLOT_H;
                return (
                  <div key={k} className="u-trend-band" style={{
                    left: `${left}%`, width: `${width}%`,
                    top: bandTop, height: TREND_BAND_H,
                    background: trend.color + '4D',
                    color: darkestStop(trend.color),
                  }}
                    onClick={e => { e.stopPropagation(); setSelectedTrend(prev => prev === origIdx ? null : origIdx); }}
                    onDoubleClick={e => { e.stopPropagation(); setEditingTrend(origIdx); setShowTrendModal(true); }}>
                    {trend.label}
                    {selectedTrend === origIdx && (
```

Also update the edit/delete button handlers inside the same map to use `origIdx` instead of `i`:
```tsx
// Before (inside the map):
                          onClick={e => { e.stopPropagation(); setEditingTrend(i); setShowTrendModal(true); }}>
                        ...
                          onClick={e => { e.stopPropagation(); deleteTrend(i); }}>

// After:
                          onClick={e => { e.stopPropagation(); setEditingTrend(origIdx); setShowTrendModal(true); }}>
                        ...
                          onClick={e => { e.stopPropagation(); deleteTrend(origIdx); }}>
```

**Strand-mode trends** (lines ~1959–1987), apply the identical transformation:
```tsx
// Before:
              {displayMode === 'strands' && trends.map((trend, i) => {
                const left    = yearToPct(trend.startYear);
                const width   = yearToPct(trend.endYear) - left;
                const bandTop = COLUMN_HEADER_H + (TREND_REGISTER_H - TREND_BAND_H) / 2;
                return (
                  <div key={i} className="u-strand-trend-bar" style={{
                    ...
                  }}
                    onClick={e => { e.stopPropagation(); setSelectedTrend(prev => prev === i ? null : i); }}
                    onDoubleClick={e => { e.stopPropagation(); setEditingTrend(i); setShowTrendModal(true); }}>
                    {trend.label}
                    {selectedTrend === i && (
                      ...
                          onClick={e => { e.stopPropagation(); setEditingTrend(i); setShowTrendModal(true); }}>
                        ...
                          onClick={e => { e.stopPropagation(); deleteTrend(i); }}>

// After:
              {displayMode === 'strands' && sortedTrends.map((trend, k) => {
                const origIdx = trends.indexOf(trend);
                const left    = yearToPct(trend.startYear);
                const width   = yearToPct(trend.endYear) - left;
                const bandTop = COLUMN_HEADER_H + 3 + k * TREND_SLOT_H;
                return (
                  <div key={k} className="u-strand-trend-bar" style={{
                    ...
                  }}
                    onClick={e => { e.stopPropagation(); setSelectedTrend(prev => prev === origIdx ? null : origIdx); }}
                    onDoubleClick={e => { e.stopPropagation(); setEditingTrend(origIdx); setShowTrendModal(true); }}>
                    {trend.label}
                    {selectedTrend === origIdx && (
                      ...
                          onClick={e => { e.stopPropagation(); setEditingTrend(origIdx); setShowTrendModal(true); }}>
                        ...
                          onClick={e => { e.stopPropagation(); deleteTrend(origIdx); }}>
```

> **Why `origIdx`?** `selectedTrend`, `editingTrend`, and `deleteTrend` all use the original index into the unsorted `trends` array (matching how the data is stored). Rendering via `sortedTrends` changes display order only; edit/delete must still reference the original position.

- [ ] **Step 14: Remove hardcoded `top` from `.u-content-separator` CSS**

In `src/understory.css`, find `.u-content-separator` (line ~476):
```css
/* Before: */
.u-content-separator {
  position: absolute;
  top: 46px;
  left: 0; right: 0;
  height: 0;
  border-top: 0.5px solid rgba(62, 59, 53, 0.18);
  pointer-events: none;
}

/* After: */
.u-content-separator {
  position: absolute;
  left: 0; right: 0;
  height: 0;
  border-top: 0.5px solid rgba(62, 59, 53, 0.18);
  pointer-events: none;
}
```

The `top` value is now set via `style={{ top: topReserveH }}` in JSX (Step 12).

- [ ] **Step 15: Build**

```bash
npm run build
```

Expected: `✓ built in N ms` with no errors. If build fails:
- "Cannot find name 'TOP_RESERVE_H'" → find the missed reference in Step 12 and replace it
- "`computeStrandConnectorGeometry` expected N arguments" → find a missed caller in Steps 10–11
- "sortedTrends is not defined" → confirm Step 5 was applied before steps that reference it

Verify no old references remain:
```bash
grep -n "TOP_RESERVE_H\|TREND_REGISTER_H - TREND_BAND_H\|trends\.forEach\|trends\.map" src/ComplexityTimeline.tsx
```

Expected output: only `TREND_REGISTER_H` in the constant definition (line ~94) and the `Math.max(TREND_REGISTER_H, ...)` line. No `TOP_RESERVE_H`. No `trends.forEach` or `trends.map` in trend-band rendering (replaced by `sortedTrends.forEach/map`).

- [ ] **Step 16: Manual smoke test**

Run `npm run dev`. Add 3 trend bands with different start dates. Confirm:
1. The trend with the earliest `startYear` appears at the top row
2. The one with the latest appears at the bottom row
3. Each trend is in its own vertical row — no overlap
4. The event content zone shifts down as expected (separator line moves)
5. Adding a 4th trend grows the register and shifts events down further
6. Edit and delete buttons on each trend still work correctly
7. PNG export shows the staggered layout correctly in both Card and Strand modes

- [ ] **Step 17: Commit**

```bash
git add src/ComplexityTimeline.tsx src/understory.css
git commit -m "feat: stagger trend bands vertically sorted by start date; make TOP_RESERVE_H dynamic"
```

---

## Self-Review

### Spec coverage

| Feature | Task | Status |
|---|---|---|
| Connection recompute on view switch | Task 1 | ✓ |
| Strand view as default | Task 2 | ✓ |
| One-step export (click ratio → export) | Task 3 | ✓ |
| Correct export ratio | Tasks 3+4 | ✓ (letterbox preserves ratio; tabloid fixed to exact 300 DPI dimensions) |
| 300 DPI output | Task 4 | ✓ |
| Trend bands staggered by start date | Task 5 | ✓ |
| Tie-break: end date then alphabetical | Task 5 (Step 5 sort) | ✓ |
| Dynamic register height grows with trend count | Task 5 | ✓ |

### Placeholder scan

No TBDs, no "similar to" references, no unresolved code blocks. Every step includes exact before/after code.

### Type consistency

- `svgWidth` (Task 1) is `number`, used as `svgWidth || canvasWidth` which returns `number`. ✓
- `setSvgWidth` is called with `w: number`. ✓
- `PORTRAIT_IDS` and `selectedProfileId` are fully removed in Task 3; no remaining references. ✓
- `exportPNG(p)` in Task 3 matches the existing `exportPNG(profile: ExportProfile)` signature. ✓
- `computeStrandConnectorGeometry` gains `topH: number` as 5th param; all 3 callers updated to pass `topReserveH`. ✓
- `sortedTrends` is `Trend[]` (same element type as `trends`); `origIdx = trends.indexOf(trend)` is `number`, consistent with `selectedTrend: number | null`. ✓
- `trendRegisterH` and `topReserveH` are `number`; used in `useCallback` deps arrays where `number` is expected. ✓
