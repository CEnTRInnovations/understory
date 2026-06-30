# Card Font Reduction + Canvas Zoom Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce State and Anchor card font sizes by 25% so more content fits on screen during editing, and add a per-session zoom control (50%–200%) to the canvas area that scales all card content proportionally for accessibility.

**Architecture:** CSS `font-size` reductions are isolated to three rules in `understory.css`. The zoom feature applies CSS `zoom` to the `.u-canvas-row` div (both gutter and timeline scale together). Because CSS `zoom` makes `getBoundingClientRect()` return screen-space dimensions while `offsetWidth` returns logical dimensions, eight coordinate calculations must divide by the zoom factor to stay correct. Zoom is stored in both React state (re-render) and a ref (event handler closures), and persisted to `localStorage`.

**Tech Stack:** React 18, TypeScript, CSS (no build step for CSS), `localStorage`

## Global Constraints

- Only `src/ComplexityTimeline.tsx` and `src/understory.css` are modified — no new files.
- Zoom range: 0.5–2.0 (50%–200%), step 0.1.
- Default zoom: 1.0.
- Zoom controls live in the existing `.u-toolbar-right` div (right side of toolbar), left of the Load/Save/Export buttons.
- Font size reductions are exactly 25% (multiply by 0.75, round to 2 decimal places).
- All `containerW` / `y` / `dy` coordinate fixes use `zoomRef.current` (not `zoom` state) so event handler closures see the latest value without re-subscribing.
- Do not touch canvas export (`exportPNG`, `exportTopicalPNG`) — those draw to an off-screen canvas at fixed resolution and are independent of display zoom.

---

## File Map

| File | Change |
|---|---|
| `src/understory.css` | Reduce font sizes for `.u-event-card`, `.u-event-anchor__year`, `.u-event-anchor__label`; reduce max-widths for `.u-event-node`, `.u-event-anchor` |
| `src/ComplexityTimeline.tsx` | Update fallback pixel constants; add zoom state + ref + localStorage; apply `zoom` style to `.u-canvas-row`; fix 8 coordinate calculations; add zoom controls to toolbar |

---

## Task 1: Reduce Base Font Sizes and Card Widths in CSS

**Files:**
- Modify: `src/understory.css:820-931`

**Interfaces:**
- Produces: Smaller State cards and Anchor labels at zoom=1. All downstream tasks build on this baseline.

- [ ] **Step 1: Reduce `.u-event-node` max-widths**

In `src/understory.css`, change:
```css
/* line 820 */
.u-event-node {
  ...
  max-width: 130px;   /* was 130 */
}
.u-event-node:not(.u-event-node--state) {
  max-width: 83px;   /* was 110 */
}
```

- [ ] **Step 2: Reduce `.u-event-card` font-size**

In `src/understory.css`, change line 831:
```css
.u-event-card {
  ...
  font-size: 0.62rem;   /* was 0.825rem — 25% reduction */
  ...
}
```

- [ ] **Step 3: Reduce `.u-event-anchor` max-width and label font sizes**

In `src/understory.css`, change:
```css
/* line 906 */
.u-event-anchor {
  ...
  max-width: 83px;   /* was 110 */
}

/* line 922 */
.u-event-anchor__year {
  ...
  font-size: 0.62rem;   /* was 0.82rem */
  ...
}

/* line 928 */
.u-event-anchor__label {
  ...
  font-size: 0.62rem;   /* was 0.82rem */
  ...
}
```

- [ ] **Step 4: Update JS fallback pixel constants to match new CSS max-widths**

In `src/ComplexityTimeline.tsx`, update the constants near lines 97–378:
```ts
const EVENT_CARD_HALF_HEIGHT = 14;   // was 18 — half-height shrinks with smaller font

// line 113
const CONNECTOR_HALF_WIDTH = 41;     // was 55 — half of new max-width 83px

// line 375
const ANCHOR_NODE_HALF_W = 41;       // was 55 — half of 83px
// line 378
const ANCHOR_NODE_MAX_W  = 83;       // was 110
```

- [ ] **Step 5: Smoke-test visually in the dev server**

Run: `npm run dev` (or `vite`) in `~/Projects/understory/`

Open the browser. Add a State and an Anchor. Confirm:
- State card text is noticeably smaller than before.
- Anchor label text matches State card text size.
- Cards still render correctly with multi-word labels (word-break should prevent overflow).

- [ ] **Step 6: Commit**

```bash
cd ~/Projects/understory
git add src/understory.css src/ComplexityTimeline.tsx
git commit -m "style: reduce State/Anchor card font sizes 25% (0.825→0.62rem)"
```

---

## Task 2: Add Zoom State, Ref, and Coordinate Fixes

**Files:**
- Modify: `src/ComplexityTimeline.tsx:1253` (state declarations block), `:1392`, `:1596`, `:1639`, `:1668`, `:1683`, `:1744`, `:1780`, `:1938`, `:1995`, `:2058`, `:3163`, `:3210`

**Interfaces:**
- Consumes: Nothing from Task 1 beyond the already-committed CSS.
- Produces: `zoom` state (0.5–2.0), `zoomRef` (always current), coordinate formulas corrected for zoom. Task 3 consumes both.

- [ ] **Step 1: Add zoom state and ref near existing state declarations (~line 1253)**

Find the block of `useState` declarations starting around line 1253. Add immediately after the last state declaration in that block:

```ts
// ── Zoom ──
const [zoom, setZoom] = useState<number>(() => {
  const saved = parseFloat(localStorage.getItem('understory-zoom') ?? '');
  return isNaN(saved) ? 1 : Math.min(2, Math.max(0.5, saved));
});
const zoomRef = useRef(zoom);
useEffect(() => {
  zoomRef.current = zoom;
  localStorage.setItem('understory-zoom', String(zoom));
}, [zoom]);
```

- [ ] **Step 2: Fix `usablePx` at line 1393 (scale recalculation effect)**

Change:
```ts
const containerW = timelineRef.current?.getBoundingClientRect().width ?? 0;
const usablePx   = containerW - 2 * EVENT_EDGE_PADDING;
```
To:
```ts
const containerW = timelineRef.current?.getBoundingClientRect().width ?? 0;
const usablePx   = containerW / zoomRef.current - 2 * EVENT_EDGE_PADDING;
```

- [ ] **Step 3: Fix `usablePx` at line 1684 (drag-move anchor placement)**

Change:
```ts
const containerW = timelineRef.current.getBoundingClientRect().width;
const usablePx   = containerW - 2 * EVENT_EDGE_PADDING;
```
To:
```ts
const containerW = timelineRef.current.getBoundingClientRect().width;
const usablePx   = containerW / zoomRef.current - 2 * EVENT_EDGE_PADDING;
```

- [ ] **Step 4: Fix `usablePx` at line 1745 (resize handler anchor placement)**

Change:
```ts
const containerW = timelineRef.current.getBoundingClientRect().width;
const usablePx   = containerW - 2 * EVENT_EDGE_PADDING;
```
To:
```ts
const containerW = timelineRef.current.getBoundingClientRect().width;
const usablePx   = containerW / zoomRef.current - 2 * EVENT_EDGE_PADDING;
```

- [ ] **Step 5: Fix `usablePx2` at line 1781 (add-anchor positioning)**

Change:
```ts
const containerW2 = timelineRef.current?.getBoundingClientRect().width ?? 0;
const usablePx2 = containerW2 - 2 * EVENT_EDGE_PADDING;
```
To:
```ts
const containerW2 = timelineRef.current?.getBoundingClientRect().width ?? 0;
const usablePx2 = containerW2 / zoomRef.current - 2 * EVENT_EDGE_PADDING;
```

- [ ] **Step 6: Fix `width` computation at line 1671 (drag to set state width)**

Change:
```ts
const containerW = timelineRef.current.getBoundingClientRect().width;
...
const width  = Math.max(80, eventLeftPx(endX, containerW) - eventLeftPx(startX, containerW));
```
To:
```ts
const containerW = timelineRef.current.getBoundingClientRect().width / zoomRef.current;
...
const width  = Math.max(80, eventLeftPx(endX, containerW) - eventLeftPx(startX, containerW));
```

- [ ] **Step 7: Fix `y` in `handleTimelineClick` at line 1938**

Change:
```ts
const y    = e.clientY - rect.top - topReserveH;
```
To:
```ts
const y    = (e.clientY - rect.top) / zoomRef.current - topReserveH;
```

- [ ] **Step 8: Fix `y` in the drag-move handler at line 1995**

Change:
```ts
const y     = e.clientY - rect.top - topReserveH;
```
To:
```ts
const y     = (e.clientY - rect.top) / zoomRef.current - topReserveH;
```

- [ ] **Step 9: Fix `evX` in `getEventPos` at line 2058**

Change:
```ts
const evX  = eventLeftPx(ev.x, rect.width);
```
To:
```ts
const evX  = eventLeftPx(ev.x, rect.width / zoomRef.current);
```

- [ ] **Step 10: Fix layer gutter drag `y` at line 1596**

Change:
```ts
const y = e.clientY - gutterRect.top - topReserveHRef.current;
```
To:
```ts
const y = (e.clientY - gutterRect.top) / zoomRef.current - topReserveHRef.current;
```

- [ ] **Step 11: Fix layer resize `dy` at line 1639**

Change:
```ts
const dy = e.clientY - start.clientY;
```
To:
```ts
const dy = (e.clientY - start.clientY) / zoomRef.current;
```

- [ ] **Step 12: Fix `containerW` at lines 3163–3210 (resize-handle drag)**

Find the block around line 3163 that reads:
```ts
const containerW = rect.width;
...
const pct = ((px - EVENT_EDGE_PADDING) / (containerW - 2 * EVENT_EDGE_PADDING)) * 100;
const centerPx = eventLeftPx(event.x, containerW);
...
const usablePx2 = containerW - 2 * EVENT_EDGE_PADDING;
```
Change to:
```ts
const containerW = rect.width / zoomRef.current;
...
const pct = ((px - EVENT_EDGE_PADDING) / (containerW - 2 * EVENT_EDGE_PADDING)) * 100;
const centerPx = eventLeftPx(event.x, containerW);
...
const usablePx2 = containerW - 2 * EVENT_EDGE_PADDING;
```
(Only the first line changes; the three usages below it are automatically correct once `containerW` is logical.)

- [ ] **Step 13: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 14: Commit**

```bash
git add src/ComplexityTimeline.tsx
git commit -m "feat: add zoom state/ref and fix coordinate calculations for CSS zoom"
```

---

## Task 3: Apply Zoom to Canvas and Add Toolbar Controls

**Files:**
- Modify: `src/ComplexityTimeline.tsx:2739` (toolbar right), `:2799` (canvas row)

**Interfaces:**
- Consumes: `zoom` state and `zoomRef` from Task 2.
- Produces: Visible zoom applied to gutter + timeline; +/− toolbar buttons.

- [ ] **Step 1: Apply `zoom` style to `.u-canvas-row` at line 2799**

Change:
```tsx
<div className="u-canvas-row" style={{ height: timelineHeight }}>
```
To:
```tsx
<div className="u-canvas-row" style={{ height: timelineHeight, zoom }}>
```

- [ ] **Step 2: Add zoom controls to `u-toolbar-right` before the Load button (~line 2739)**

The current `u-toolbar-right` block starts with the Load button. Add a zoom control group immediately before it:

```tsx
<div className="u-toolbar-right">
  {/* ── Zoom controls ── */}
  <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
    <button
      className="u-btn u-btn--ghost"
      onClick={() => setZoom(z => Math.max(0.5, Math.round((z - 0.1) * 10) / 10))}
      disabled={zoom <= 0.5}
      title="Zoom out"
      style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
    >−</button>
    <button
      className="u-btn u-btn--ghost"
      onClick={() => setZoom(1)}
      title="Reset zoom to 100%"
      style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', minWidth: '3.2rem', textAlign: 'center' }}
    >
      {Math.round(zoom * 100)}%
    </button>
    <button
      className="u-btn u-btn--ghost"
      onClick={() => setZoom(z => Math.min(2, Math.round((z + 0.1) * 10) / 10))}
      disabled={zoom >= 2}
      title="Zoom in"
      style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
    >+</button>
  </div>

  <div className="u-toolbar-sep" />

  <button className="u-btn u-btn--export" onClick={triggerImportJSON} title="Load a saved .und or .json file">
    {/* ... existing Load button contents unchanged ... */}
  </button>
  {/* ... rest of existing toolbar-right contents unchanged ... */}
</div>
```

> **Note:** Copy the full existing content of `u-toolbar-right` verbatim — only prepend the zoom group and separator. Do not duplicate or omit any existing button.

- [ ] **Step 3: Visual smoke-test in dev server**

With the dev server running:
1. Load a timeline with several States and Anchors.
2. Click `+` three times → zoom reaches 130%, cards visibly enlarge.
3. Click the `100%` percentage display → zoom resets to 100%.
4. Click `−` once → zoom shows 90%, cards shrink slightly.
5. At zoom 130%: drag a State card to a new position → it lands where you released (coordinate fix verification).
6. At zoom 130%: click empty canvas → Add State modal appears (coordinate fix verification for click-to-add).
7. At zoom 130%: add an Anchor linked to a State → Anchor appears at correct position inside the State's horizontal bounds (anchor positioning fix verification).
8. Reload the page → zoom restores to the last value (localStorage persistence check).

- [ ] **Step 4: Test sticky gutter at high zoom**

Scroll the canvas horizontally at zoom 200%. Verify the layer label gutter stays pinned to the left.

- [ ] **Step 5: Commit**

```bash
git add src/ComplexityTimeline.tsx
git commit -m "feat: canvas zoom control (50%–200%) with persistent localStorage state"
```

---

## Self-Review

**Spec coverage:**
- ✅ Font sizes reduced 25% (`.u-event-card`, `.u-event-anchor__year`, `.u-event-anchor__label`)
- ✅ Max-widths reduced proportionally
- ✅ JS fallback constants updated
- ✅ Zoom range 50%–200%, step 10%
- ✅ Zoom persists in localStorage
- ✅ Zoom controls in toolbar (−/100%/+)
- ✅ All 8 coordinate sites fixed for zoom
- ✅ Canvas export untouched (off-screen canvas, independent of display zoom)
- ✅ No new files

**Placeholder scan:** None found.

**Type consistency:** `zoom` is `number` throughout; `zoomRef` is `React.MutableRefObject<number>`; no renamed identifiers between tasks.
