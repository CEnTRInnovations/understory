# UI Refinements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Four targeted UI changes: decade-based axis ticks, removal of the Add Column button and its header space, background-aware trend title styling, and a ratio-chooser that replaces the width/height sliders.

**Architecture:** All changes are contained within `src/ComplexityTimeline.tsx` (logic + JSX) and `src/understory.css` (styles). No new files are created. Changes are independent and can be done in sequence without risk of conflict.

**Tech Stack:** React 18, TypeScript, Vite, `lucide-react` icons, custom CSS.

## Global Constraints

- All edits in `src/ComplexityTimeline.tsx` and `src/understory.css` only — no new files.
- Do not add `console.log` or debug artifacts.
- Run `npm run build` after each task to confirm TypeScript compiles cleanly.
- Visual verification via `npm run dev` after each task.

---

## File Map

| File | Tasks |
|------|-------|
| `src/ComplexityTimeline.tsx` | All four tasks — logic, state, JSX |
| `src/understory.css` | Task 3 (trend title CSS), Task 4 (minor toolbar CSS) |

---

### Task 1: Decade-Based Axis Ticks

Events already position at sub-decade precision via `yearToPct()`. This task changes only which tick marks are shown on the axis: always multiples of 10 (decades), never 2-year or 5-year intervals. Both the DOM axis and the canvas draw functions (for PNG export) must change.

**Files:**
- Modify: `src/ComplexityTimeline.tsx` — tick generation ~L1519, `drawCardsMode` ~L1296, `drawStrandsMode` ~L1427

**Interfaces:**
- `yearTicks` array (already exists): `number[]` — rendered as DOM tick marks
- `drawCardsMode` / `drawStrandsMode`: use local `step` variable

- [ ] **Step 1: Change DOM tick generation to decade boundaries**

Find the block (around line 1519):
```typescript
const yearSpan = endYear - startYear;
const tickStep = yearSpan <= 20 ? 2 : yearSpan <= 40 ? 5 : 10;
const yearTicks: number[] = [];
if (yearSpan > 0) {
  for (let yr = startYear; yr <= endYear; yr += tickStep) {
    if (!cuts.some(c => yr > c.startYear && yr < c.endYear)) yearTicks.push(yr);
  }
}
yearTicks.push(endYear);
// Always mark the boundary years of each cut, so the break reads clearly.
cuts.forEach(c => {
  if (!yearTicks.includes(c.startYear)) yearTicks.push(c.startYear);
  if (!yearTicks.includes(c.endYear))   yearTicks.push(c.endYear);
});
yearTicks.sort((a, b) => a - b);
```

Replace with:
```typescript
const yearSpan = endYear - startYear;
const yearTicks: number[] = [startYear];
if (yearSpan > 0) {
  const decadeStart = Math.ceil(startYear / 10) * 10;
  for (let yr = decadeStart; yr < endYear; yr += 10) {
    if (!cuts.some(c => yr > c.startYear && yr < c.endYear) && yr !== startYear) {
      yearTicks.push(yr);
    }
  }
}
if (!yearTicks.includes(endYear)) yearTicks.push(endYear);
// Always mark the boundary years of each cut, so the break reads clearly.
cuts.forEach(c => {
  if (!yearTicks.includes(c.startYear)) yearTicks.push(c.startYear);
  if (!yearTicks.includes(c.endYear))   yearTicks.push(c.endYear);
});
yearTicks.sort((a, b) => a - b);
```

- [ ] **Step 2: Change canvas tick step in `drawCardsMode`**

Find `drawCardsMode` (around line 1296). The "Year axis" block reads:
```typescript
const step = span <= 20 ? 2 : 5;
// ...
for (let yr = startYear; yr <= endYear; yr += step) {
```

Replace the step and loop with decade-aligned ticks:
```typescript
const axY  = h - 48;
ctx.strokeStyle = 'rgba(62,59,53,0.20)'; ctx.lineWidth = 1;
ctx.beginPath(); ctx.moveTo(0, axY); ctx.lineTo(w, axY); ctx.stroke();
const decadeStart = Math.ceil(startYear / 10) * 10;
for (let yr = startYear; yr <= endYear; yr === startYear ? yr = decadeStart : yr += 10) {
  if (cuts.some(c => yr > c.startYear && yr < c.endYear)) continue;
  const x = (yearToPct(yr) / 100) * w;
  ctx.strokeStyle = '#8A867E';
  ctx.beginPath(); ctx.moveTo(x, axY); ctx.lineTo(x, axY + 6); ctx.stroke();
  ctx.fillStyle = '#6b6760'; ctx.font = scaledFont(10, fontScale);
  ctx.textAlign = 'center'; ctx.fillText(yr.toString(), x, axY + 18);
}
```

- [ ] **Step 3: Change canvas tick step in `drawStrandsMode`**

Find the matching "Year axis" block in `drawStrandsMode` (around line 1427). Apply the same replacement as Step 2 (identical logic, different function).

- [ ] **Step 4: Build and visually verify**

```bash
npm run build
npm run dev
```

Expected: Timeline axis shows decades (1960, 1970, 1980…). An event placed at 1968 sits at ~80% between the 1960 and 1970 tick marks. No 2-year or 5-year ticks appear.

- [ ] **Step 5: Commit**

```bash
git add src/ComplexityTimeline.tsx
git commit -m "feat: change axis ticks to decade boundaries"
```

---

### Task 2: Remove Add Column Button and Column Header Space

The "Add Column" toolbar button is hidden. The 26px `COLUMN_HEADER_H` reserve at the top (which holds column labels) is removed. Column data continues to load/save correctly (existing files with columns still render the background shading, just no label). The `addColumn` function and modal remain intact.

**Files:**
- Modify: `src/ComplexityTimeline.tsx`

**Interfaces:**
- `COLUMN_HEADER_H` (constant): set to `0`
- `topReserveH` (derived): `COLUMN_HEADER_H + trendRegisterH` → now just `trendRegisterH`

- [ ] **Step 1: Set `COLUMN_HEADER_H` to 0**

Find (around line 92):
```typescript
const COLUMN_HEADER_H  = 26; // px — fixed column-label row above trend register
```
Replace with:
```typescript
const COLUMN_HEADER_H  = 0;
```

- [ ] **Step 2: Remove the "Add Column" toolbar button**

Find the button block in the toolbar (around line 1575):
```tsx
<button className="u-btn u-btn--column" onClick={() => { setEditingColumn(null); setShowColumnModal(true); }}>
  <Columns size={13} /> Add Column
</button>
```
Delete those three lines entirely. Also remove the `Columns` icon import from the lucide import at the top:
```typescript
import { X, Plus, Link2, Trash2, Edit2, Download, Upload, Image, Layers, Columns, TrendingUp, Scissors } from 'lucide-react';
```
→
```typescript
import { X, Plus, Link2, Trash2, Edit2, Download, Upload, Image, Layers, TrendingUp, Scissors } from 'lucide-react';
```

- [ ] **Step 3: Remove the column header row DOM element**

Find the block (around line 1872):
```tsx
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
```
Delete this entire block.

- [ ] **Step 4: Remove column label text from canvas draw functions**

In `drawCardsMode` (around line 1231), find:
```typescript
ctx.fillStyle = '#6b6760'; ctx.font = scaledFont(10, fontScale);
ctx.textAlign = 'center'; ctx.fillText(col.label, x + cw / 2, 18);
```
Delete the `ctx.fillText(col.label, ...)` line only (keep the background fill and stroke).

In `drawStrandsMode` (around line 1318), find the same pattern and delete the `ctx.fillText(col.label, ...)` line there too.

- [ ] **Step 5: Build and visually verify**

```bash
npm run build
npm run dev
```

Expected: No "Add Column" button in toolbar. No column label row at top. Column background shading still appears. `topReserveH` now equals `trendRegisterH` only, shifting trend bands up by 26px.

- [ ] **Step 6: Commit**

```bash
git add src/ComplexityTimeline.tsx
git commit -m "feat: remove Add Column button and column header row space"
```

---

### Task 3: Background-Aware Trend Title Styling

The trend band label is restyled to match the column label (small caps, uppercase, pill with background+border). A new `getContrastColor()` helper returns dark or light text based on the band's background luminance, replacing the existing `darkestStop()` for text color. Canvas draw is updated identically.

**Files:**
- Modify: `src/ComplexityTimeline.tsx` — add helper, update inline color on trend bands, update canvas draw text
- Modify: `src/understory.css` — restyle `.u-trend-band`

**Interfaces:**
- Produces: `getContrastColor(hex: string): string` — returns `'#2a2825'` (dark) or `'#f5f3ef'` (light)

- [ ] **Step 1: Add `getContrastColor` helper**

Find the existing `darkestStop` function (around line 333):
```typescript
function darkestStop(hex: string): string {
```

Add the new helper immediately after `darkestStop`'s closing brace:
```typescript
function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  // Relative luminance (sRGB, simplified linear approximation)
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.45 ? '#2a2825' : '#f5f3ef';
}
```

- [ ] **Step 2: Update `.u-trend-band` CSS in `understory.css`**

Find (around line 556):
```css
.u-trend-band {
  position: absolute;
  display: flex;
  align-items: center;
  font-family: "Alegreya Sans", sans-serif;
  font-size: 0.625rem;
  letter-spacing: 0.03em;
  /* opacity removed — background rgba set via inline style for transparency */
  border-radius: 2px;
  pointer-events: auto;
  cursor: pointer;
  padding-left: 4px;
  overflow: hidden;
}
```

Replace with:
```css
.u-trend-band {
  position: absolute;
  display: flex;
  align-items: center;
  font-family: "Alegreya Sans SC", "Alegreya Sans", sans-serif;
  font-size: 0.65rem;
  font-weight: 500;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  border-radius: 2px;
  pointer-events: auto;
  cursor: pointer;
  padding-left: 6px;
  overflow: hidden;
}
```

Apply the same CSS changes to `.u-strand-trend-bar` if it exists in the stylesheet (search for it). If it does, match the same font properties.

- [ ] **Step 3: Update inline `color` on trend band DOM elements**

In the JSX, find both trend band renderers (cards mode ~line 1954, strands mode ~line 1985). Each has:
```tsx
color: darkestStop(trend.color),
```
Replace with:
```tsx
color: getContrastColor(trend.color),
```
(two occurrences — one in the cards mode block, one in the strands mode block).

- [ ] **Step 4: Update canvas draw for trend labels**

In `drawCardsMode` canvas draw (around line 1264):
```typescript
ctx.fillText(trend.label, x + 4, bandTop + TREND_BAND_H / 2);
```

Add a contrasting fill color before this line:
```typescript
ctx.fillStyle = getContrastColor(trend.color);
ctx.font = scaledFont(9, fontScale);
ctx.textAlign = 'left';
ctx.fillText(trend.label.toUpperCase(), x + 6, bandTop + TREND_BAND_H / 2 + 3);
```

Find and apply the same in `drawStrandsMode` (~line 1412).

- [ ] **Step 5: Build and visually verify**

```bash
npm run build
npm run dev
```

Expected: Trend labels use small-caps uppercase styling matching column labels. Dark text on light trend colors; light text on dark trend colors. PNG export also reflects contrast-aware text color.

- [ ] **Step 6: Commit**

```bash
git add src/ComplexityTimeline.tsx src/understory.css
git commit -m "feat: restyle trend title with small-caps and background-aware contrast color"
```

---

### Task 4: Size Ratio Chooser Replaces Width/Height Sliders

The width and height sliders are removed. A `<select>` dropdown listing `EXPORT_PROFILES` is added in their place in `.u-toolbar-right`. Selecting a profile resizes the on-screen canvas to that aspect ratio. The Export button directly triggers PNG export at the selected profile's 300dpi dimensions (no dropdown menu). Canvas width is measured from the container via `ResizeObserver`; layer height is derived from the ratio.

**Files:**
- Modify: `src/ComplexityTimeline.tsx`
- Modify: `src/understory.css`

**Interfaces:**
- New state: `selectedProfileId: string` (default `'native'`)
- New state: `containerWidth: number` (from ResizeObserver)
- Removed state: `canvasWidth`, `layerHeight`, `showExportMenu`, `cropInstead`
- `selectedProfile`: `ExportProfile` — `EXPORT_PROFILES.find(p => p.id === selectedProfileId) ?? EXPORT_PROFILES[0]`
- `canvasWidth`: now a `const` derived from `containerWidth`
- `layerHeight`: now a `const` derived inline from profile ratio and container dimensions

- [ ] **Step 1: Replace state declarations**

Find the state declarations for the slider-controlled values (around line 779):
```typescript
const [canvasWidth, setCanvasWidth] = useState(CANVAS_WIDTH_INIT);
const [layerHeight, setLayerHeight] = useState(LAYER_HEIGHT_DEFAULT);
```

Replace with:
```typescript
const [selectedProfileId, setSelectedProfileId] = useState<string>('native');
const [containerWidth, setContainerWidth] = useState(CANVAS_WIDTH_INIT);
```

Also find and remove the `showExportMenu` and `cropInstead` state declarations:
```typescript
const [showExportMenu, setShowExportMenu]   = useState(false);
const [cropInstead, setCropInstead]         = useState(false);
```
Delete both lines.

- [ ] **Step 2: Add `selectedProfile` and derived `canvasWidth` / `layerHeight` in the render body**

In the render body, find where `topReserveH` is computed (around line 822):
```typescript
const topReserveH = COLUMN_HEADER_H + trendRegisterH;
```
After that line, add:
```typescript
const selectedProfile = EXPORT_PROFILES.find(p => p.id === selectedProfileId) ?? EXPORT_PROFILES[0];
const canvasWidth = containerWidth > 0 ? containerWidth : CANVAS_WIDTH_INIT;
const layerHeight = (() => {
  if (selectedProfile.ratio === 0 || layers.length === 0) return LAYER_HEIGHT_DEFAULT;
  const totalH = Math.floor(canvasWidth / selectedProfile.ratio);
  const available = totalH - topReserveH - 48;
  return Math.max(LAYER_HEIGHT_MIN, Math.floor(available / layers.length));
})();
```

- [ ] **Step 3: Add ResizeObserver for the canvas area**

Find the existing `canvasAreaRef` if it exists, or add a new ref. Add a `useRef` for the scrollable canvas area:
```typescript
const canvasAreaRef = useRef<HTMLDivElement>(null);
```

Add a `useEffect` (after the existing `useLayoutEffect` for svgWidth):
```typescript
useEffect(() => {
  const el = canvasAreaRef.current;
  if (!el) return;
  const update = () => setContainerWidth(Math.floor(el.clientWidth));
  update();
  const ro = new ResizeObserver(update);
  ro.observe(el);
  return () => ro.disconnect();
}, []);
```

Attach `canvasAreaRef` to the `.u-canvas-area` div in the JSX (find `<div className="u-canvas-area">`):
```tsx
<div className="u-canvas-area" ref={canvasAreaRef}>
```

- [ ] **Step 4: Remove `maybeGrowCanvas` and its call sites**

Find the `maybeGrowCanvas` function (around line 909):
```typescript
const maybeGrowCanvas = useCallback((xPct: number) => {
  const rightEdgePct = 1 - CANVAS_EDGE_MARGIN / canvasWidth;
  if (xPct / 100 > rightEdgePct) {
    setCanvasWidth(w => Math.min(CANVAS_WIDTH_MAX, w + CANVAS_GROWTH_STEP));
  }
}, [canvasWidth]);
```
Delete the entire function.

Find and remove all `maybeGrowCanvas(...)` call sites (there are typically 2, in `addEvent` and `addProcess` around lines 994 and 1010).

- [ ] **Step 5: Update `loadJSON` to save/restore `selectedProfileId`**

In the `exportJSON` function, find where document state is serialized (look for `canvasWidth` in the JSON object, around line 1146):
```typescript
layerHeight, canvasWidth, displayMode,
```
Replace with:
```typescript
displayMode, selectedProfileId,
```
(Remove `layerHeight` and `canvasWidth`; add `selectedProfileId`.)

In the `handleImportFile` / load function (around line 1180):
```typescript
setLayerHeight(typeof data.layerHeight === 'number' ? data.layerHeight : LAYER_HEIGHT_DEFAULT);
setCanvasWidth(typeof data.canvasWidth === 'number' ? data.canvasWidth : CANVAS_WIDTH_INIT);
```
Replace with:
```typescript
if (typeof data.selectedProfileId === 'string' &&
    EXPORT_PROFILES.some(p => p.id === data.selectedProfileId)) {
  setSelectedProfileId(data.selectedProfileId);
}
```

- [ ] **Step 6: Update `.u-timeline-wrap` to fill container width**

Find the JSX for the timeline wrap (around line 1716):
```tsx
<div
  ref={timelineRef}
  className="u-timeline-wrap"
  style={{ height: timelineHeight, width: layers.length > 0 ? canvasWidth : undefined }}
```
Change to:
```tsx
<div
  ref={timelineRef}
  className="u-timeline-wrap"
  style={{ height: timelineHeight, width: layers.length > 0 ? '100%' : undefined }}
```

Also update the `useLayoutEffect` for `svgWidth` — it likely has `canvasWidth` in its dependency array. Replace `canvasWidth` with `containerWidth` there.

- [ ] **Step 7: Update `getLabelPositions` to use `containerWidth`**

Find the call to `getLabelPositions` (or its internal use of `canvasWidth`, around line 324):
```typescript
if (lastRight[pos.side] !== -Infinity && xPct - lastRight[pos.side] < (90 / canvasWidth) * 100) {
  lastRight[pos.side] = xPct + (90 / canvasWidth) * 100;
```
Replace `canvasWidth` with `containerWidth` in both occurrences.

- [ ] **Step 8: Remove slider UI, add profile selector and simplified Export button**

Find the `.u-toolbar-right` section (around line 1632). Remove:
```tsx
<div className="u-width-controls">
  <span className="u-year-label">Width</span>
  <input className="u-width-slider" type="range"
    min={CANVAS_WIDTH_MIN} max={Math.max(CANVAS_WIDTH_MAX, canvasWidth)} step={50}
    value={canvasWidth}
    onChange={e => setCanvasWidth(Number(e.target.value))}
    title="Canvas width — drag to spread events out or pack them in" />
  <span className="u-width-value">{canvasWidth}px</span>
</div>

<div className="u-width-controls">
  <span className="u-year-label">Height</span>
  <input className="u-width-slider" type="range"
    min={LAYER_HEIGHT_MIN} max={LAYER_HEIGHT_MAX} step={10}
    value={layerHeight}
    onChange={e => setLayerHeight(Number(e.target.value))}
    title="Row height — drag to give events more or less vertical room" />
  <span className="u-width-value">{layerHeight}px</span>
</div>
```

Replace with:
```tsx
<div className="u-width-controls">
  <span className="u-year-label">Size</span>
  <select
    className="u-profile-select"
    value={selectedProfileId}
    onChange={e => setSelectedProfileId(e.target.value)}
    title="Export size / aspect ratio"
  >
    {EXPORT_PROFILES.map(p => (
      <option key={p.id} value={p.id}>{p.label}</option>
    ))}
  </select>
</div>
```

Now simplify the Export button block. Find:
```tsx
<div className="u-export-wrap">
  <button className="u-btn u-btn--export" onClick={() => setShowExportMenu(v => !v)} title="Export as PNG image">
    <Image size={13} /> Export
  </button>
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
</div>
```

Replace with:
```tsx
<button className="u-btn u-btn--export" onClick={() => exportPNG(selectedProfile)} title="Export as PNG image at 300dpi">
  <Image size={13} /> Export
</button>
```

- [ ] **Step 9: Update `exportPNG` signature and native-ratio scale**

Find the `exportPNG` function signature (around line 1436):
```typescript
const exportPNG = async (profile: ExportProfile = EXPORT_PROFILES[0]) => {
```
The default parameter is no longer needed (caller always passes `selectedProfile`), but keep the signature for clarity:
```typescript
const exportPNG = async (profile: ExportProfile) => {
```

For the native case (around line 1457):
```typescript
if (profile.id === 'native' || profile.ratio === 0) {
  const scale = 3;
```
Update scale to reflect 300dpi (96dpi screen ≈ 3.125× for 300dpi output):
```typescript
if (profile.id === 'native' || profile.ratio === 0) {
  const scale = Math.round(300 / 96); // ≈ 3× for 300dpi
```

Also remove any remaining references to `cropInstead` inside `exportPNG` — replace the `cropInstead` branch with just letterbox (the default):
```typescript
// Was: if (cropInstead) { ... } else { contentScale = Math.min(...) }
// Replace with always-letterbox:
contentScale = Math.min(scaleToFitW, scaleToFitH);
offsetX = (targetW - naturalW * contentScale) / 2;
offsetY = (targetH - naturalH * contentScale) / 2;
const ctx = canvas.getContext('2d')!;
ctx.translate(offsetX, offsetY);
ctx.scale(contentScale, contentScale);
```

- [ ] **Step 10: Add `.u-profile-select` CSS**

In `src/understory.css`, find `.u-width-slider` styles and add after them:
```css
.u-profile-select {
  font-family: "Alegreya Sans", sans-serif;
  font-size: 0.75rem;
  background: var(--bg-light);
  border: 1px solid var(--border);
  border-radius: 3px;
  color: var(--text);
  padding: 2px 6px;
  cursor: pointer;
  height: 24px;
}
.u-profile-select:focus {
  outline: none;
  border-color: var(--btn-export, #6b8f71);
}
```

- [ ] **Step 11: Build and visually verify**

```bash
npm run build
npm run dev
```

Expected:
- No width/height sliders in toolbar
- "Size" selector dropdown shows all export profiles
- Selecting "Slide (16:9)" resizes the canvas area to a 16:9 proportion
- Selecting "Letter landscape" resizes to that proportion
- Export button immediately exports (no dropdown) at the chosen profile's 300dpi dimensions
- Saving/loading `.und` file preserves the selected profile

- [ ] **Step 12: Commit**

```bash
git add src/ComplexityTimeline.tsx src/understory.css
git commit -m "feat: replace width/height sliders with size ratio chooser; simplify export to single click at 300dpi"
```

---

## Self-Review

**Spec coverage:**
1. ✅ Events positioned at sub-decade precision, axis ticks show decades — Task 1
2. ✅ Add Column button hidden, column header space removed — Task 2
3. ✅ Trend title styled like column title, background-aware color — Task 3
4. ✅ Sliders removed, ratio chooser in toolbar, canvas resizes to ratio, Export exports at 300dpi — Task 4

**Placeholder scan:** None found — all steps contain exact code.

**Type consistency:**
- `getContrastColor(hex: string): string` defined in Task 3 Step 1, used in Steps 3 and 4.
- `selectedProfile: ExportProfile` defined in Task 4 Step 2, used in Steps 8 and 9.
- `containerWidth: number` state added in Task 4 Step 1, used in Steps 2, 3, 6, 7.

**Potential issues to watch:**
- After Task 2, double-check that `selectedColumn` state and related `setSelectedColumn` calls (used for the now-removed DOM element) don't produce TypeScript errors. The state can be left in place since the modal still uses it; just the rendering is removed.
- In Task 4 Step 9, scan for any other `cropInstead` references (e.g., in the canvas save flow) and remove them.
- In Task 4, after removing `setLayerHeight`, confirm no other call sites reference it (e.g., in file load). The plan covers this in Step 5.
