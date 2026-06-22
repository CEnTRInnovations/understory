# Taylor Strand Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `strands` display mode to Understory that renders Taylor-style continuous horizontal strand lines with unboxed labels, split the toolbar's Export button into Save/Load/Export, adopt `.und` file extension, and add export ratio presets.

**Architecture:** All changes live in `src/ComplexityTimeline.tsx` (the single-file React+TS app). A `displayMode` state gates two rendering branches for DOM display and for `exportPNG`; the data schema is unchanged — modes just reinterpret the same fields differently. The six tasks follow the spec's sequencing: state/toggle → toolbar → extension → DOM strands → PNG strands → export profiles.

**Tech Stack:** React 18, TypeScript, Vite, Canvas 2D (for PNG export), SVG overlay (for connections + new strand lines), lucide-react v0.383 icons.

## Global Constraints

- All changes in `src/ComplexityTimeline.tsx` — do not create new files unless told to.
- `'cards'` mode must continue to work exactly as it does today; strands is additive.
- `TIMELINE_FILE_VERSION` bumps to `3` once in this change set (Task 1). Do not bump it again in later tasks.
- Files saved before version 3 must default `displayMode` to `'cards'` on import.
- No new npm dependencies; `Upload` and `Image` are available in lucide-react v0.383.
- Dev server: `npm run dev` (Vite, hot-reload on save). Manual visual validation required for Tasks 4 and 5.
- No test suite exists — validation is visual + manual file-round-trip.

---

### Task 1: `displayMode` state, toolbar toggle, version-3 save/load

**Files:**
- Modify: `src/ComplexityTimeline.tsx:2` (add `Upload`, `Image` to lucide import)
- Modify: `src/ComplexityTimeline.tsx:960` (`TIMELINE_FILE_VERSION` → 3)
- Modify: `src/ComplexityTimeline.tsx:619–628` (add `displayMode` state)
- Modify: `src/ComplexityTimeline.tsx:962–975` (`exportJSON` — include `displayMode`)
- Modify: `src/ComplexityTimeline.tsx:981–1014` (`handleImportFile` — restore `displayMode`, default to `'cards'` for v<3)
- Modify: `src/ComplexityTimeline.tsx:1272–1301` (toolbar right controls — add mode toggle)
- Modify: `src/ComplexityTimeline.tsx:700–729` (Escape handler — no new state needed)

**Interfaces:**
- Produces: `displayMode: DisplayMode` state + setter, accessible to all later tasks' render branches.

- [ ] **Step 1: Add `DisplayMode` type and update lucide import**

Find line 2 (the lucide import) and line 9 (before `type TimelineEvent`). Make these two edits:

```tsx
// Line 2 — add Upload and Image to the icon import:
import { X, Plus, Link2, Trash2, Edit2, Download, Upload, Image, Layers, Columns, TrendingUp, Scissors } from 'lucide-react';
```

Then immediately before `type TimelineEvent` (line 10) add:

```tsx
type DisplayMode = 'cards' | 'strands';
```

- [ ] **Step 2: Bump file version and add `displayMode` state**

Change line 960:
```tsx
// was:
const TIMELINE_FILE_VERSION = 2;
// becomes:
const TIMELINE_FILE_VERSION = 3;
```

Add one line after the `layerHeight` state declaration (after line 628):
```tsx
const [displayMode, setDisplayMode] = useState<DisplayMode>('cards');
```

- [ ] **Step 3: Include `displayMode` in `exportJSON`**

In the `exportJSON` function (around line 963), change the `data` object to include `displayMode`:

```tsx
const data = {
  version: TIMELINE_FILE_VERSION,
  layers, startYear, endYear,
  events, connections, columns, trends, cuts,
  layerHeight, canvasWidth, displayMode,
};
```

- [ ] **Step 4: Restore `displayMode` in `handleImportFile`**

After `setCanvasWidth(...)` (around line 1002), add:

```tsx
setDisplayMode(
  data.version >= 3 && (data.displayMode === 'cards' || data.displayMode === 'strands')
    ? data.displayMode
    : 'cards'
);
```

- [ ] **Step 5: Add display mode toggle pill in toolbar**

In the toolbar's right controls section (around line 1272, inside `<div className="u-toolbar-right">`), add a mode toggle before the Width slider group:

```tsx
<div className="u-width-controls">
  <span className="u-year-label">Mode</span>
  <button
    className={`u-btn u-btn--mode ${displayMode === 'cards' ? 'u-btn--mode-active' : ''}`}
    onClick={() => setDisplayMode('cards')}
    title="Card mode — boxed event labels"
  >
    Cards
  </button>
  <button
    className={`u-btn u-btn--mode ${displayMode === 'strands' ? 'u-btn--mode-active' : ''}`}
    onClick={() => setDisplayMode('strands')}
    title="Strand mode — Taylor-style continuous lines"
  >
    Strands
  </button>
</div>
```

Add the supporting CSS to `src/understory.css`:

```css
.u-btn--mode {
  padding: 3px 10px;
  font-size: 0.72rem;
  border-radius: 3px;
  background: transparent;
  border: 1px solid rgba(62,59,53,0.25);
  color: var(--text-muted);
  cursor: pointer;
}
.u-btn--mode-active {
  background: rgba(62,59,53,0.12);
  color: var(--text-primary, #3E3B35);
  border-color: rgba(62,59,53,0.4);
}
```

- [ ] **Step 6: Verify round-trip**

Start the dev server (`npm run dev`). Open the app. Add a layer and an event. Toggle to Strands mode (nothing changes visually yet — that's expected). Click Save → verify the downloaded file contains `"displayMode": "strands"` and `"version": 3`. Load that file back → verify the toggle is on Strands. Load an old v2 file (or a file without `displayMode`) → verify the toggle defaults to Cards.

- [ ] **Step 7: Commit**

```bash
git add src/ComplexityTimeline.tsx src/understory.css
git commit -m "feat: add displayMode state, version-3 save/load, toolbar toggle"
```

---

### Task 2: Split toolbar Export → Save / Load / Export

**Files:**
- Modify: `src/ComplexityTimeline.tsx:1246–1264` (replace `u-export-wrap` dropdown with 3 flat buttons)

**Interfaces:**
- Consumes: `exportJSON()`, `triggerImportJSON()`, `exportPNG()` (all unchanged)
- Produces: `showExportMenu` state now gates only the PNG-export panel (future Task 6 content); Save and Load are direct button clicks.

- [ ] **Step 1: Replace the export wrap JSX**

Find this block (around lines 1246–1264):

```tsx
<div className="u-export-wrap">
  <button className="u-btn u-btn--export" onClick={() => setShowExportMenu(v => !v)}>
    <Download size={13} /> Export
  </button>
  {showExportMenu && (
    <div className="u-export-menu">
      <button onClick={() => { exportJSON(); setShowExportMenu(false); }}>Save as JSON</button>
      <button onClick={() => { exportPNG();  setShowExportMenu(false); }}>Export as PNG</button>
      <button onClick={() => { triggerImportJSON(); setShowExportMenu(false); }}>Load JSON…</button>
    </div>
  )}
  <input
    ref={fileInputRef}
    type="file"
    accept=".json,application/json"
    onChange={handleImportFile}
    style={{ display: 'none' }}
  />
</div>
```

Replace it with:

```tsx
<button className="u-btn u-btn--export" onClick={exportJSON} title="Save timeline as .und file">
  <Download size={13} /> Save
</button>
<button className="u-btn u-btn--export" onClick={triggerImportJSON} title="Load a saved .und or .json file">
  <Upload size={13} /> Load
</button>
<div className="u-export-wrap">
  <button className="u-btn u-btn--export" onClick={() => setShowExportMenu(v => !v)} title="Export as PNG image">
    <Image size={13} /> Export
  </button>
  {showExportMenu && (
    <div className="u-export-menu">
      <button onClick={() => { exportPNG(); setShowExportMenu(false); }}>Export as PNG</button>
    </div>
  )}
</div>
<input
  ref={fileInputRef}
  type="file"
  accept=".json,application/json"
  onChange={handleImportFile}
  style={{ display: 'none' }}
/>
```

- [ ] **Step 2: Verify**

Click **Save** → file downloads (same behavior as before). Click **Load** → file picker opens. Click **Export** → dropdown with "Export as PNG" appears; clicking it triggers the PNG export. Pressing Escape closes the dropdown.

- [ ] **Step 3: Commit**

```bash
git add src/ComplexityTimeline.tsx
git commit -m "feat: split toolbar Export into Save / Load / Export buttons"
```

---

### Task 3: `.und` file extension

**Files:**
- Modify: `src/ComplexityTimeline.tsx:972` (`exportJSON` download filename)
- Modify: `src/ComplexityTimeline.tsx` (file input `accept` attribute — the hidden `<input type="file">`)

**Interfaces:**
- Produces: Save downloads `understory-timeline.und`; Load accepts `.und` and `.json`.

- [ ] **Step 1: Update `exportJSON` filename**

In `exportJSON`, change:
```tsx
a.download = 'understory-timeline.json';
```
to:
```tsx
a.download = 'understory-timeline.und';
```

- [ ] **Step 2: Update file input `accept` attribute**

Find the hidden file input (now outside the `u-export-wrap` after Task 2). Change:
```tsx
accept=".json,application/json"
```
to:
```tsx
accept=".und,.json,application/json"
```

- [ ] **Step 3: Verify**

Click **Save** → browser downloads `understory-timeline.und`. Open a file picker (click **Load**) → `.und` and `.json` files are selectable. Load a `.und` file back → timeline restores correctly (content is identical JSON).

- [ ] **Step 4: Commit**

```bash
git add src/ComplexityTimeline.tsx
git commit -m "feat: adopt .und file extension for project saves"
```

---

### Task 4: Strands mode — DOM rendering

This task adds all visual strands rendering, gated behind `displayMode === 'strands'`. `exportPNG` is **not** changed here — it always renders cards mode during this task.

**Files:**
- Modify: `src/ComplexityTimeline.tsx` — the JSX render section (lines ~1353–1570): SVG overlay, layer rows, trend bands, event nodes
- Modify: `src/understory.css` — new `.u-strand-*` classes

**Interfaces:**
- Consumes: `displayMode`, `layers`, `events`, `connections`, `trends`, `cuts`, `layerHeight`, `canvasWidth`, `yearToPct`, `eventLeft`, `eventLeftPx`, `getConnectorGeometry`
- Produces: Visual strands mode in the live DOM

#### 4a — Strand lines in the SVG overlay

- [ ] **Step 1: Add strand lines and arrowheads to the SVG overlay**

The existing SVG overlay (around line 1355) renders connections. In strands mode, we also want per-layer strand lines. Find the `<svg ref={svgRef} className="u-svg-overlay">` element. Add a strand lines section inside the `<defs>` and after the defs:

```tsx
<svg ref={svgRef} className="u-svg-overlay">
  <defs>
    {/* existing arrow markers for connections */}
    {connections.map((conn, i) => {
      // ... existing marker code unchanged ...
    })}
    {/* strand arrowhead marker */}
    {displayMode === 'strands' && (
      <marker id="strand-arrow" markerWidth="8" markerHeight="6"
        refX="7" refY="3" orient="auto">
        <polygon points="0 0, 8 3, 0 6" fill="#3E3B35" fillOpacity="0.5" />
      </marker>
    )}
  </defs>

  {/* Strand lines — one per layer, rendered in strands mode */}
  {displayMode === 'strands' && layers.map((lyr, i) => {
    const y = i * layerHeight + layerHeight / 2;
    const color = '#3E3B35';
    return (
      <line key={`strand-${i}`}
        x1={0} y1={y} x2="100%" y2={y}
        stroke={color} strokeWidth={1.5} strokeOpacity={0.45}
        markerEnd="url(#strand-arrow)"
      />
    );
  })}

  {/* existing connections rendering */}
  {connections.map((conn, i) => {
    // ... existing connection path code ...
    const path = `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`;
    return (
      <g key={i}>
        <path d={path}
          stroke={displayMode === 'strands' ? '#9E9B96' : conn.color}
          strokeWidth={displayMode === 'strands' ? 1 : conn.width}
          fill="none"
          strokeDasharray={displayMode === 'strands' ? '2 4' : (conn.lineStyle === 'dashed' ? '6 4' : conn.lineStyle === 'dotted' ? '2 4' : undefined)}
          markerEnd={displayMode === 'strands' ? undefined : (conn.showArrow ? `url(#arrow-${i})` : undefined)}
        />
        {/* invisible hit area — unchanged */}
        <path d={path} stroke="transparent" strokeWidth={Math.max(16, conn.width + 14)} fill="none"
          style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
          onClick={e => { e.stopPropagation(); setSelectedConnection(prev => prev === i ? null : i); }}
          onDoubleClick={e => { e.stopPropagation(); setEditingConnection(i); setShowConnectionModal(true); }} />
      </g>
    );
  })}
</svg>
```

- [ ] **Step 2: Verify strand lines appear**

Run `npm run dev`, add 2–3 layers, switch to Strands mode → horizontal lines should appear at the vertical center of each layer band, with a small arrowhead at the right edge. Switch back to Cards → lines disappear.

#### 4b — Overlapping connectors (§1.3a)

This section extends the basic connection styling from 4a to address overlap in dense datasets. The spec's four items are implemented in order — item 1 (low opacity) is already wired via `strokeOpacity` in section 4a step 1; items 2–4 are added here.

- [ ] **Step 2a: Add `computeStrandConnectorGeometry` and `strandGeomToSVGPath` at module scope**

Insert after `computeStrandLabels` (still before the `Modal` sub-component, around line 385):

```tsx
type StrandConnGeom =
  | { kind: 'cubic'; x1: number; y1: number; cx1: number; cy1: number; cx2: number; cy2: number; x2: number; y2: number }
  | { kind: 'quad';  x1: number; y1: number; cx: number;  cy: number;  x2: number; y2: number };

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
  const y1 = fromEv.layer * lh + lh / 2;
  const y2 = toEv.layer   * lh + lh / 2;
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

function strandGeomToSVGPath(g: StrandConnGeom): string {
  if (g.kind === 'quad') return `M ${g.x1} ${g.y1} Q ${g.cx} ${g.cy} ${g.x2} ${g.y2}`;
  return `M ${g.x1} ${g.y1} C ${g.cx1} ${g.cy1}, ${g.cx2} ${g.cy2}, ${g.x2} ${g.y2}`;
}
```

- [ ] **Step 2b: Replace the connections render block with the full §1.3a-compliant version**

In the SVG overlay (currently the `{connections.map((conn, i) => ...)}` block from section 4a step 1), replace the entire connections render with:

```tsx
{(() => {
  // Pre-compute per-event connector lists so we can spread anchors apart when
  // multiple connections land on the same event point (§1.3a item 3).
  const connAtEvent = new Map<number, number[]>();
  if (displayMode === 'strands') {
    connections.forEach((conn, ci) => {
      if (!connAtEvent.has(conn.from)) connAtEvent.set(conn.from, []);
      if (!connAtEvent.has(conn.to))   connAtEvent.set(conn.to,   []);
      connAtEvent.get(conn.from)!.push(ci);
      connAtEvent.get(conn.to)!.push(ci);
    });
  }
  const svgW = svgRef.current?.getBoundingClientRect().width ?? canvasWidth;

  return connections.map((conn, i) => {
    let path: string;
    if (displayMode === 'strands') {
      const fromConns  = connAtEvent.get(conn.from) ?? [];
      const toConns    = connAtEvent.get(conn.to)   ?? [];
      const fromOffset = (fromConns.indexOf(i) - (fromConns.length - 1) / 2) * 3.5;
      const toOffset   = (toConns.indexOf(i)   - (toConns.length   - 1) / 2) * 3.5;
      path = strandGeomToSVGPath(
        computeStrandConnectorGeometry(events[conn.from], events[conn.to], svgW, layerHeight, fromOffset, toOffset)
      );
    } else {
      const from = getEventPos(conn.from);
      const to   = getEventPos(conn.to);
      const { x1, y1, x2, y2, c1x, c1y, c2x, c2y } = getConnectorGeometry(from, to, conn.fromSide, conn.toSide);
      path = `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`;
    }
    // Hover/select isolation (§1.3a item 4): dim non-connected curves to 10% when
    // an event is selected, so the active event's connections read clearly.
    const isActive = displayMode !== 'strands' || selectedEvent === null ||
                     conn.from === selectedEvent || conn.to === selectedEvent;
    return (
      <g key={i}>
        <path d={path}
          stroke={displayMode === 'strands' ? '#9E9B96' : conn.color}
          strokeWidth={displayMode === 'strands' ? 1 : conn.width}
          strokeOpacity={displayMode === 'strands' ? (isActive ? 0.35 : 0.1) : 1}
          fill="none"
          strokeDasharray={displayMode === 'strands' ? '2 4' : (conn.lineStyle === 'dashed' ? '6 4' : conn.lineStyle === 'dotted' ? '2 4' : undefined)}
          markerEnd={displayMode === 'strands' ? undefined : (conn.showArrow ? `url(#arrow-${i})` : undefined)}
        />
        <path d={path} stroke="transparent" strokeWidth={Math.max(16, conn.width + 14)} fill="none"
          style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
          onClick={e => { e.stopPropagation(); setSelectedConnection(prev => prev === i ? null : i); }}
          onDoubleClick={e => { e.stopPropagation(); setEditingConnection(i); setShowConnectionModal(true); }} />
      </g>
    );
  });
})()}
```

- [ ] **Step 2c: Verify connector overlap handling**

Create a timeline with 3 layers and at least 6 connections crossing between layers. In Strands mode verify:
1. All connections render at low opacity (~35%) — many crossing lines read as texture, not clutter.
2. Cross-strand connections arc through the midpoint height between source and target strands — curves bow symmetrically inward rather than diverging diagonally.
3. Where 2–3 connections originate from the same event, their anchor x-positions are visibly spread (not stacked exactly).
4. Click any event → non-connected curves dim to ~10% opacity; that event's connections stay at 35%.

#### 4c — Event labels (strands mode)

The collision helper function goes near the other utility functions (after `clampYOffset`, around line 270).

- [ ] **Step 3: Add `computeStrandLabels` helper function**

Insert after the `clampYOffset` function (line 270):

```tsx
const STRAND_LABEL_STEP = 20;  // px per stagger step above or below the strand
const STRAND_LABEL_BASE = 16;  // px from strand center to first label

type StrandLabelPos = {
  eventIndex: number;
  side: 'above' | 'below';
  yExtra: number; // additional stagger in px (0 = no collision)
};

function computeStrandLabels(
  layerEvents: { e: TimelineEvent; globalIdx: number }[],
): StrandLabelPos[] {
  // Sort by x position within this layer
  const sorted = [...layerEvents].sort((a, b) => a.e.x - b.e.x);
  const positions: StrandLabelPos[] = sorted.map(({ globalIdx }, idx) => ({
    eventIndex: globalIdx,
    side: idx % 2 === 0 ? 'above' : 'below',
    yExtra: 0,
  }));

  // Greedy collision pass: if adjacent same-side labels are within 90px
  // horizontally, stagger the later one by one more step.
  const lastRight: { above: number; below: number } = { above: -Infinity, below: -Infinity };
  positions.forEach((pos, i) => {
    const xPct = sorted[i].e.x;
    if (lastRight[pos.side] !== -Infinity && xPct - lastRight[pos.side] < 90) {
      pos.yExtra += STRAND_LABEL_STEP;
    }
    lastRight[pos.side] = xPct + 90;
  });

  return positions;
}
```

- [ ] **Step 4: Render event labels vs. cards depending on `displayMode`**

Find the `{/* Events */}` section (around line 1513). Wrap it so cards render in cards mode, and plain-text labels render in strands mode:

```tsx
{/* Events */}
{events.map((event, i) => {
  if (displayMode === 'strands') return null; // handled below
  return (
    <div
      key={i}
      draggable
      className={`u-event-node ${selectedEvent === i ? 'u-event-node--selected' : ''} ${connectingFrom === i ? 'u-event-node--connecting' : ''}`}
      style={{ left: eventLeft(event.x), top: `${event.layer * layerHeight + event.yOffset}px` }}
      onDragStart={e => handleDragStart(e, i)}
      onClick={e => handleEventClick(e, i)}
      onDoubleClick={e => {
        e.stopPropagation();
        if (connectingFrom !== null) return;
        setEditingEvent(i);
        setShowEventModal(event);
      }}
    >
      <div
        ref={el => { cardRefs.current[i] = el; }}
        className={`u-event-card ${event.style === 'italic' ? 'u-event-card--italic' : ''}`}
        style={{ background: event.color, borderColor: event.borderColor, color: event.borderColor }}
      >
        {event.label}
      </div>
      {selectedEvent === i && (
        <div className="u-event-actions">
          {/* ... existing action buttons unchanged ... */}
        </div>
      )}
      {connectingFrom !== null && (
        <>
          {(['top', 'right', 'bottom', 'left'] as Side[]).map(side => (
            <div
              key={side}
              className={`u-anchor-dot u-anchor-dot--${side} ${connectingFrom === i && connectFromSide === side ? 'u-anchor-dot--active' : ''}`}
              title={connectingFrom === i ? `Start the line from here (${side})` : `End the line here (${side})`}
              onClick={e => handleAnchorClick(e, i, side)}
            />
          ))}
        </>
      )}
    </div>
  );
})}

{/* Strands mode event labels */}
{displayMode === 'strands' && layers.map((_, layerIdx) => {
  const strandY = layerIdx * layerHeight + layerHeight / 2;
  const layerEvts = events
    .map((e, globalIdx) => ({ e, globalIdx }))
    .filter(({ e }) => e.layer === layerIdx);
  const labelPositions = computeStrandLabels(layerEvts);

  return labelPositions.map(({ eventIndex, side, yExtra }) => {
    const event = events[eventIndex];
    const baseOffset = STRAND_LABEL_BASE + yExtra;
    const yPx = strandY + (side === 'above' ? -(baseOffset + event.yOffset * 0.3) : (baseOffset + event.yOffset * 0.3));
    return (
      <div
        key={eventIndex}
        draggable
        className={`u-strand-label ${selectedEvent === eventIndex ? 'u-strand-label--selected' : ''} ${event.style === 'italic' ? 'u-strand-label--italic' : ''} ${connectingFrom === eventIndex ? 'u-event-node--connecting' : ''}`}
        style={{
          left: eventLeft(event.x),
          top: `${yPx}px`,
          color: event.borderColor || '#3E3B35',
        }}
        ref={el => { cardRefs.current[eventIndex] = el as HTMLDivElement | null; }}
        onDragStart={e => handleDragStart(e, eventIndex)}
        onClick={e => handleEventClick(e, eventIndex)}
        onDoubleClick={e => {
          e.stopPropagation();
          if (connectingFrom !== null) return;
          setEditingEvent(eventIndex);
          setShowEventModal(event);
        }}
      >
        {event.label}
        {selectedEvent === eventIndex && (
          <div className="u-event-actions">
            <button className="u-event-action-btn" title="Connect to another event"
              onClick={e => { e.stopPropagation(); setConnectingFrom(eventIndex); setConnectFromSide(null); setSelectedEvent(null); }}>
              <Link2 size={13} />
            </button>
            <button className="u-event-action-btn" title="Edit event"
              onClick={e => { e.stopPropagation(); setEditingEvent(eventIndex); setShowEventModal(event); }}>
              <Edit2 size={13} />
            </button>
            <button className="u-event-action-btn u-event-action-btn--danger" title="Delete event"
              onClick={e => { e.stopPropagation(); deleteEvent(eventIndex); }}>
              <Trash2 size={13} />
            </button>
          </div>
        )}
        {connectingFrom !== null && (
          <>
            {(['top', 'right', 'bottom', 'left'] as Side[]).map(side => (
              <div
                key={side}
                className={`u-anchor-dot u-anchor-dot--${side} ${connectingFrom === eventIndex && connectFromSide === side ? 'u-anchor-dot--active' : ''}`}
                title={connectingFrom === eventIndex ? `Start the line from here (${side})` : `End the line here (${side})`}
                onClick={e => handleAnchorClick(e, eventIndex, side)}
              />
            ))}
          </>
        )}
      </div>
    );
  });
})}
```

- [ ] **Step 5: Add strand label CSS to `src/understory.css`**

```css
.u-strand-label {
  position: absolute;
  transform: translateX(-50%);
  white-space: nowrap;
  font-size: 11px;
  font-family: 'Alegreya Sans', sans-serif;
  color: #3E3B35;
  cursor: pointer;
  user-select: none;
  pointer-events: auto;
  line-height: 1.2;
}
.u-strand-label--selected {
  outline: 1px dashed rgba(62,59,53,0.4);
  outline-offset: 2px;
}
.u-strand-label--italic {
  font-style: italic;
}
```

#### 4d — Trends in strands mode

- [ ] **Step 6: Render trends as stacked duration bars in strands mode**

Find the `{/* Trend bands */}` section (around line 1484). Replace with:

```tsx
{/* Trend bands */}
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

Add to `src/understory.css`:

```css
.u-strand-trend-bar {
  position: absolute;
  opacity: 0.85;
  cursor: pointer;
}
.u-strand-trend-label {
  position: absolute;
  left: 4px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
  font-family: 'Alegreya Sans', sans-serif;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: calc(100% - 8px);
}
```

#### 4e — Cut tooltip

- [ ] **Step 7: Add hover tooltip to cuts**

Find the cut mark render (around line 1460). The `<div className="u-cut-mark" ...>` already has a `title` prop set to `${cut.startYear}–${cut.endYear} compressed`. Replace that `title` with the extended message the spec requires:

```tsx
title={`No events recorded in ${cut.startYear}–${cut.endYear} — confirm this is the right historiographical claim before exporting`}
```

- [ ] **Step 8: Verify full strands rendering**

With the dev server running, load or manually create a timeline with 3 layers, several events per layer, 2–3 connections crossing between layers, 2–3 trends, and a cut. Switch to Strands mode. Verify:
1. Horizontal strand lines appear at the vertical center of each layer, with a small arrowhead at the right.
2. Events display as plain text labels alternating above/below the strand, without boxes.
3. Connection lines render as thin dotted gray curves at low opacity (~35%), with no arrowheads; cross-strand connections bow toward the vertical midpoint between strands; clicking an event dims non-connected curves to ~10%.
4. Trends render as thin stacked horizontal bars below the lowest strand, with inline left-edge labels.
5. Cuts show a tooltip on hover with the "no events recorded" message.
6. Switch back to Cards mode → everything reverts correctly; card events, solid connections, rectangular trend bands all render as before.

- [ ] **Step 9: Commit**

```bash
git add src/ComplexityTimeline.tsx src/understory.css
git commit -m "feat: strands mode DOM rendering — strands, labels, connections (§1.3a), trends, cut tooltip"
```

---

### Task 5: Mirror strands mode into `exportPNG`

**Files:**
- Modify: `src/ComplexityTimeline.tsx:1016–1182` (the `exportPNG` async function)

**Interfaces:**
- Consumes: `displayMode`, `layers`, `events`, `connections`, `columns`, `trends`, `cuts`, `layerHeight`, `canvasWidth`, `yearToPct`, `eventLeftPx`, `getConnectorGeometry`, `wrapCanvasText`, `computeStrandLabels`, `computeStrandConnectorGeometry`
- Produces: `exportPNG()` exports in either cards or strands visual style matching the live DOM

- [ ] **Step 1: Extract `drawCardsMode` and add `drawStrandsMode`**

The `exportPNG` function currently holds all the drawing logic inline. Refactor it so that after the canvas setup and font loading, it calls a mode-specific drawing function. The restructured `exportPNG` looks like:

```tsx
const exportPNG = async () => {
  if (!timelineRef.current) return;

  try {
    await Promise.all([
      document.fonts.load('10px "Alegreya Sans"'),
      document.fonts.load('500 10px "Alegreya Sans"'),
      document.fonts.load('italic 10px "Alegreya Sans"'),
    ]);
    await document.fonts.ready;
  } catch { /* best effort */ }

  const rect  = timelineRef.current.getBoundingClientRect();
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width  = rect.width  * scale;
  canvas.height = rect.height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.fillStyle = '#F6F2E7';
  ctx.fillRect(0, 0, rect.width, rect.height);

  const span = endYear - startYear;

  if (displayMode === 'strands') {
    drawStrandsMode(ctx, rect.width, rect.height, span);
  } else {
    drawCardsMode(ctx, rect.width, rect.height, span);
  }

  canvas.toBlob(blob => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'understory-timeline.png';
    a.click();
  });
};
```

- [ ] **Step 2: Write `drawCardsMode` (existing logic extracted)**

This is the existing drawing code, just moved into a named function. Place it just above `exportPNG`, inside the `ComplexityTimeline` component (it needs closure access to `layers`, `events`, etc.):

```tsx
function drawCardsMode(ctx: CanvasRenderingContext2D, w: number, h: number, span: number) {
  // Connections
  connections.forEach(conn => {
    const from = getEventPos(conn.from);
    const to   = getEventPos(conn.to);
    const { x1, y1, x2, y2, c1x, c1y, c2x, c2y } = getConnectorGeometry(from, to, conn.fromSide, conn.toSide);
    ctx.save();
    ctx.strokeStyle = conn.color;
    ctx.lineWidth   = conn.width;
    ctx.setLineDash(conn.lineStyle === 'dashed' ? [6, 4] : conn.lineStyle === 'dotted' ? [2, 4] : []);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.bezierCurveTo(c1x, c1y, c2x, c2y, x2, y2); ctx.stroke();
    ctx.restore();
    if (conn.showArrow) {
      const angle = Math.atan2(y2 - c2y, x2 - c2x);
      const size  = conn.arrowSize ?? DEFAULT_ARROW_SIZE;
      ctx.save(); ctx.fillStyle = conn.color; ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - size * Math.cos(angle - Math.PI / 6), y2 - size * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(x2 - size * Math.cos(angle + Math.PI / 6), y2 - size * Math.sin(angle + Math.PI / 6));
      ctx.closePath(); ctx.fill(); ctx.restore();
    }
  });

  // Columns
  columns.forEach(col => {
    const x = (yearToPct(col.startYear) / 100) * w;
    const cw = (yearToPct(col.endYear) / 100) * w - x;
    ctx.fillStyle = 'rgba(62,59,53,0.04)'; ctx.fillRect(x, 0, cw, h);
    ctx.strokeStyle = 'rgba(62,59,53,0.12)'; ctx.strokeRect(x, 0, cw, h);
    ctx.fillStyle = '#6b6760'; ctx.font = '10px "Alegreya Sans", sans-serif';
    ctx.textAlign = 'center'; ctx.fillText(col.label, x + cw / 2, 18);
  });

  // Layer dividers + labels
  layers.forEach((lyr, i) => {
    const y = i * layerHeight;
    ctx.strokeStyle = 'rgba(62,59,53,0.14)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    ctx.fillStyle = '#6b6760'; ctx.font = '500 10px "Alegreya Sans", sans-serif';
    ctx.textAlign = 'left'; ctx.fillText(lyr, 10, y + 14);
  });

  // Cuts
  cuts.forEach(cut => {
    const x = (yearToPct((cut.startYear + cut.endYear) / 2) / 100) * w;
    ctx.strokeStyle = '#3E3B35'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - 5, h); ctx.lineTo(x - 1, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 1, h); ctx.lineTo(x + 5, 0); ctx.stroke();
  });

  // Trend bands
  trends.forEach((trend, i) => {
    const x = (yearToPct(trend.startYear) / 100) * w;
    const tw = (yearToPct(trend.endYear) / 100) * w - x;
    const th = 20; const ty = h - (48 + i * 22) - th;
    ctx.save(); ctx.globalAlpha = 0.85; ctx.fillStyle = trend.color; ctx.fillRect(x, ty, tw, th); ctx.restore();
    ctx.fillStyle = '#fff'; ctx.font = '11px "Alegreya Sans", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(trend.label, x + tw / 2, ty + th / 2);
    ctx.textBaseline = 'alphabetic';
  });

  // Events (cards)
  events.forEach((ev, evi) => {
    const x = eventLeftPx(ev.x, w);
    const y = ev.layer * layerHeight + ev.yOffset;
    const cardEl = cardRefs.current[evi];
    const padding = 6; const lineHeight = 13;
    const fontSpec = (ev.style === 'italic' ? 'italic ' : '') + '12px "Alegreya Sans", sans-serif';
    ctx.font = fontSpec;
    const bw = cardEl ? cardEl.offsetWidth : 110;
    const lines = wrapCanvasText(ctx, ev.label, bw - padding * 2);
    const contentHeight = lines.length * lineHeight + padding * 2;
    const bh = cardEl ? cardEl.offsetHeight : Math.max(36, contentHeight);
    const centerY = y + bh / 2;
    const boxTop  = centerY - bh / 2;
    ctx.fillStyle = ev.color; ctx.strokeStyle = ev.borderColor; ctx.lineWidth = 2;
    ctx.fillRect(x - bw / 2, boxTop, bw, bh); ctx.strokeRect(x - bw / 2, boxTop, bw, bh);
    ctx.fillStyle = '#3E3B35'; ctx.font = fontSpec;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const textStartY = centerY - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, li) => ctx.fillText(line, x, textStartY + li * lineHeight));
    ctx.textBaseline = 'alphabetic';
  });

  // Year axis
  const step = span <= 20 ? 2 : 5;
  const axY  = h - 48;
  ctx.strokeStyle = 'rgba(62,59,53,0.20)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, axY); ctx.lineTo(w, axY); ctx.stroke();
  for (let yr = startYear; yr <= endYear; yr += step) {
    if (cuts.some(c => yr > c.startYear && yr < c.endYear)) continue;
    const x = (yearToPct(yr) / 100) * w;
    ctx.strokeStyle = '#8A867E';
    ctx.beginPath(); ctx.moveTo(x, axY); ctx.lineTo(x, axY + 6); ctx.stroke();
    ctx.fillStyle = '#6b6760'; ctx.font = '10px "Alegreya Sans", sans-serif';
    ctx.textAlign = 'center'; ctx.fillText(yr.toString(), x, axY + 18);
  }
}
```

- [ ] **Step 3: Write `drawStrandsMode`**

```tsx
function drawStrandsMode(ctx: CanvasRenderingContext2D, w: number, h: number, span: number) {
  // Columns (same as cards mode)
  columns.forEach(col => {
    const x = (yearToPct(col.startYear) / 100) * w;
    const cw = (yearToPct(col.endYear) / 100) * w - x;
    ctx.fillStyle = 'rgba(62,59,53,0.04)'; ctx.fillRect(x, 0, cw, h);
    ctx.strokeStyle = 'rgba(62,59,53,0.12)'; ctx.strokeRect(x, 0, cw, h);
    ctx.fillStyle = '#6b6760'; ctx.font = '10px "Alegreya Sans", sans-serif';
    ctx.textAlign = 'center'; ctx.fillText(col.label, x + cw / 2, 18);
  });

  // Strand lines (one per layer)
  layers.forEach((_, i) => {
    const y = i * layerHeight + layerHeight / 2;
    ctx.save();
    ctx.strokeStyle = '#3E3B35'; ctx.globalAlpha = 0.45; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w - 10, y); ctx.stroke();
    // Arrowhead
    ctx.globalAlpha = 0.5; ctx.fillStyle = '#3E3B35';
    ctx.beginPath();
    ctx.moveTo(w - 10, y);
    ctx.lineTo(w - 18, y - 4);
    ctx.lineTo(w - 18, y + 4);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  });

  // Connections — mirrors DOM §1.3a: curvature discipline + anchor spreading + low opacity
  // (hover isolation is DOM-only; PNG is a static snapshot with no selection state)
  const connAtEvent = new Map<number, number[]>();
  connections.forEach((conn, ci) => {
    if (!connAtEvent.has(conn.from)) connAtEvent.set(conn.from, []);
    if (!connAtEvent.has(conn.to))   connAtEvent.set(conn.to,   []);
    connAtEvent.get(conn.from)!.push(ci);
    connAtEvent.get(conn.to)!.push(ci);
  });
  connections.forEach((conn, i) => {
    const fromConns  = connAtEvent.get(conn.from) ?? [];
    const toConns    = connAtEvent.get(conn.to)   ?? [];
    const fromOffset = (fromConns.indexOf(i) - (fromConns.length - 1) / 2) * 3.5;
    const toOffset   = (toConns.indexOf(i)   - (toConns.length   - 1) / 2) * 3.5;
    const geom = computeStrandConnectorGeometry(events[conn.from], events[conn.to], w, layerHeight, fromOffset, toOffset);
    ctx.save();
    ctx.strokeStyle = '#9E9B96'; ctx.lineWidth = 1; ctx.globalAlpha = 0.35; ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(geom.x1, geom.y1);
    if (geom.kind === 'quad') ctx.quadraticCurveTo(geom.cx, geom.cy, geom.x2, geom.y2);
    else ctx.bezierCurveTo(geom.cx1, geom.cy1, geom.cx2, geom.cy2, geom.x2, geom.y2);
    ctx.stroke();
    ctx.restore();
  });

  // Event labels (plain text, alternating above/below per strand)
  layers.forEach((_, layerIdx) => {
    const strandY = layerIdx * layerHeight + layerHeight / 2;
    const layerEvts = events
      .map((e, globalIdx) => ({ e, globalIdx }))
      .filter(({ e }) => e.layer === layerIdx);
    const labelPositions = computeStrandLabels(layerEvts);

    labelPositions.forEach(({ eventIndex, side, yExtra }) => {
      const ev = events[eventIndex];
      const x = eventLeftPx(ev.x, w);
      const baseOffset = STRAND_LABEL_BASE + yExtra;
      const yPx = strandY + (side === 'above' ? -(baseOffset + ev.yOffset * 0.3) : (baseOffset + ev.yOffset * 0.3));
      const fontSpec = (ev.style === 'italic' ? 'italic ' : '') + '11px "Alegreya Sans", sans-serif';
      ctx.font = fontSpec;
      ctx.fillStyle = ev.borderColor || '#3E3B35';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ev.label, x, yPx);
      ctx.textBaseline = 'alphabetic';
    });
  });

  // Layer labels (left-edge, like cards mode)
  layers.forEach((lyr, i) => {
    const y = i * layerHeight;
    ctx.strokeStyle = 'rgba(62,59,53,0.14)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    ctx.fillStyle = '#6b6760'; ctx.font = '500 10px "Alegreya Sans", sans-serif';
    ctx.textAlign = 'left'; ctx.fillText(lyr, 10, y + 14);
  });

  // Cuts (same as cards mode)
  cuts.forEach(cut => {
    const x = (yearToPct((cut.startYear + cut.endYear) / 2) / 100) * w;
    ctx.strokeStyle = '#3E3B35'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - 5, h); ctx.lineTo(x - 1, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 1, h); ctx.lineTo(x + 5, 0); ctx.stroke();
  });

  // Trend bars (thin, stacked, left-edge label)
  const STRAND_BAR_H = 14; const STRAND_BAR_G = 4;
  const sorted = [...trends].sort((a, b) => a.startYear - b.startYear);
  sorted.forEach((trend, i) => {
    const x = (yearToPct(trend.startYear) / 100) * w;
    const tw = (yearToPct(trend.endYear) / 100) * w - x;
    const ty = h - (48 + i * (STRAND_BAR_H + STRAND_BAR_G)) - STRAND_BAR_H;
    ctx.save(); ctx.globalAlpha = 0.85; ctx.fillStyle = trend.color;
    ctx.fillRect(x, ty, tw, STRAND_BAR_H); ctx.restore();
    ctx.fillStyle = '#fff'; ctx.font = '10px "Alegreya Sans", sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(trend.label, x + 4, ty + STRAND_BAR_H / 2);
    ctx.textBaseline = 'alphabetic';
  });

  // Year axis (same as cards mode)
  const step = span <= 20 ? 2 : 5;
  const axY  = h - 48;
  ctx.strokeStyle = 'rgba(62,59,53,0.20)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, axY); ctx.lineTo(w, axY); ctx.stroke();
  for (let yr = startYear; yr <= endYear; yr += step) {
    if (cuts.some(c => yr > c.startYear && yr < c.endYear)) continue;
    const x = (yearToPct(yr) / 100) * w;
    ctx.strokeStyle = '#8A867E';
    ctx.beginPath(); ctx.moveTo(x, axY); ctx.lineTo(x, axY + 6); ctx.stroke();
    ctx.fillStyle = '#6b6760'; ctx.font = '10px "Alegreya Sans", sans-serif';
    ctx.textAlign = 'center'; ctx.fillText(yr.toString(), x, axY + 18);
  }
}
```

- [ ] **Step 4: Verify PNG export in both modes**

Switch to Cards mode → click Export → PNG → verify exported image matches the live canvas visually. Switch to Strands mode → click Export → PNG → verify exported image shows strand lines, plain text labels (alternating above/below), thin dotted connectors, thin trend bars, and correct axis.

- [ ] **Step 5: Commit**

```bash
git add src/ComplexityTimeline.tsx
git commit -m "feat: mirror strands mode into exportPNG"
```

---

### Task 6: Export ratio presets

**Files:**
- Modify: `src/ComplexityTimeline.tsx` — add `ExportProfile` type + `EXPORT_PROFILES` const (near top, after types), add `selectedProfile`/`cropInstead` state, update `exportPNG` signature, expand Export dropdown

**Interfaces:**
- Consumes: `displayMode`, `drawCardsMode`, `drawStrandsMode`, `timelineRef`
- Produces: `exportPNG(profile: ExportProfile)` that renders at target dimensions with letterbox/crop

- [ ] **Step 1: Add `ExportProfile` type and `EXPORT_PROFILES` constant**

After the `Cut` type (line 41), add:

```tsx
type ExportProfile = {
  id: string;
  label: string;
  ratio: number;   // width / height; 0 = native
  pxWidth: number; // render target width; 0 = native
  fontScale: number;
};

const EXPORT_PROFILES: ExportProfile[] = [
  { id: 'native',       label: 'Native canvas ratio',           ratio: 0,      pxWidth: 0,    fontScale: 1.0 },
  { id: 'slide-16x9',   label: 'Slide (16:9)',                  ratio: 16/9,   pxWidth: 1920, fontScale: 1.0 },
  { id: 'tabloid-land', label: 'Tabloid landscape (11×17)',      ratio: 17/11,  pxWidth: 3400, fontScale: 1.0 },
  { id: 'letter-land',  label: 'Letter landscape (11×8.5)',      ratio: 11/8.5, pxWidth: 3300, fontScale: 1.0 },
  { id: 'letter-port',  label: 'Letter portrait (8.5×11)',       ratio: 8.5/11, pxWidth: 2550, fontScale: 0.85 },
  { id: 'book-6x9',     label: 'Book trim (6×9)',                ratio: 6/9,    pxWidth: 1800, fontScale: 0.75 },
  { id: 'book-7x10',    label: 'Book trim (7×10)',               ratio: 7/10,   pxWidth: 2100, fontScale: 0.8 },
];
const PORTRAIT_IDS = new Set(['letter-port', 'book-6x9', 'book-7x10']);
```

- [ ] **Step 2: Add export profile state**

After the `showExportMenu` state declaration, add:

```tsx
const [selectedProfileId, setSelectedProfileId] = useState('native');
const [cropInstead, setCropInstead]             = useState(false);
```

- [ ] **Step 3: Update `exportPNG` to accept a profile**

Change `exportPNG`'s signature and add letterbox/crop logic:

```tsx
const exportPNG = async (profile: ExportProfile = EXPORT_PROFILES[0]) => {
  if (!timelineRef.current) return;

  try {
    await Promise.all([
      document.fonts.load('10px "Alegreya Sans"'),
      document.fonts.load('500 10px "Alegreya Sans"'),
      document.fonts.load('italic 10px "Alegreya Sans"'),
    ]);
    await document.fonts.ready;
  } catch { /* best effort */ }

  const rect = timelineRef.current.getBoundingClientRect();
  const canvas = document.createElement('canvas');

  let targetW: number;
  let targetH: number;
  let contentScale: number;
  let offsetX = 0;
  let offsetY = 0;

  if (profile.id === 'native' || profile.ratio === 0) {
    // Current behavior: 2× scale of the live viewport
    const scale = 2;
    canvas.width  = rect.width  * scale;
    canvas.height = rect.height * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(scale, scale);
    ctx.fillStyle = '#F6F2E7';
    ctx.fillRect(0, 0, rect.width, rect.height);
    const span = endYear - startYear;
    if (displayMode === 'strands') drawStrandsMode(ctx, rect.width, rect.height, span);
    else drawCardsMode(ctx, rect.width, rect.height, span);
  } else {
    targetW = profile.pxWidth;
    targetH = Math.round(profile.pxWidth / profile.ratio);
    canvas.width  = targetW;
    canvas.height = targetH;

    const naturalW = rect.width;
    const naturalH = rect.height;
    const scaleToFitW = targetW / naturalW;
    const scaleToFitH = targetH / naturalH;

    if (cropInstead) {
      contentScale = Math.max(scaleToFitW, scaleToFitH);
      offsetX = (targetW - naturalW * contentScale) / 2;
      offsetY = (targetH - naturalH * contentScale) / 2;
    } else {
      // Letterbox (default)
      contentScale = Math.min(scaleToFitW, scaleToFitH);
      offsetX = (targetW - naturalW * contentScale) / 2;
      offsetY = (targetH - naturalH * contentScale) / 2;
    }

    const ctx = canvas.getContext('2d')!;
    // Background fill (covers letterbox padding)
    ctx.fillStyle = '#F6F2E7';
    ctx.fillRect(0, 0, targetW, targetH);

    if (cropInstead) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, targetW, targetH);
      ctx.clip();
    }
    ctx.translate(offsetX, offsetY);
    ctx.scale(contentScale, contentScale);

    const drawW = naturalW;
    const drawH = naturalH;
    const span  = endYear - startYear;
    if (displayMode === 'strands') drawStrandsMode(ctx, drawW, drawH, span);
    else drawCardsMode(ctx, drawW, drawH, span);

    if (cropInstead) ctx.restore();
  }

  canvas.toBlob(blob => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'understory-timeline.png';
    a.click();
  });
};
```

**Note:** `drawCardsMode` and `drawStrandsMode` were defined in Task 5 as inner functions. The `fontScale` from the profile is not yet applied in Steps 2–3 — Step 4 will thread it through.

- [ ] **Step 4: Thread `fontScale` into draw functions**

`drawCardsMode` and `drawStrandsMode` take a `fontScale` parameter (add it as 4th argument defaulting to `1.0`). In each function, replace every bare `'10px "Alegreya Sans"'` with a helper:

Add near the draw functions:
```tsx
function scaledFont(base: number, scale: number, weight?: string, italic?: boolean): string {
  const size = Math.round(base * scale);
  return `${italic ? 'italic ' : ''}${weight ? weight + ' ' : ''}${size}px "Alegreya Sans", sans-serif`;
}
```

Then update each `ctx.font = ...` in both draw functions to use `scaledFont(baseSize, fontScale)`. For example:
- `'10px "Alegreya Sans"'` → `scaledFont(10, fontScale)`
- `'500 10px "Alegreya Sans"'` → `scaledFont(10, fontScale, '500')`
- `'12px "Alegreya Sans"'` → `scaledFont(12, fontScale)`
- `'italic 12px "Alegreya Sans"'` → `scaledFont(12, fontScale, undefined, true)`

Update the call sites in `exportPNG`:
```tsx
if (displayMode === 'strands') drawStrandsMode(ctx, drawW, drawH, span, fontScale);
else drawCardsMode(ctx, drawW, drawH, span, fontScale);
```

Where `fontScale = profile.fontScale`.

- [ ] **Step 5: Expand the Export dropdown to show profile picker + warning**

Replace the export dropdown JSX (the `{showExportMenu && ...}` block from Task 2):

```tsx
{showExportMenu && (
  <div className="u-export-menu u-export-menu--profiles">
    <div className="u-export-profile-list">
      {EXPORT_PROFILES.map(p => (
        <button
          key={p.id}
          className={`u-export-profile-btn ${selectedProfileId === p.id ? 'u-export-profile-btn--active' : ''}`}
          onClick={() => setSelectedProfileId(p.id)}
        >
          {p.label}
        </button>
      ))}
    </div>

    {(() => {
      const profile = EXPORT_PROFILES.find(p => p.id === selectedProfileId)!;
      const isPortrait = PORTRAIT_IDS.has(selectedProfileId);
      const rect = timelineRef.current?.getBoundingClientRect();
      const naturalRatio = rect ? rect.width / rect.height : 0;
      const showPortraitWarning = isPortrait && profile.ratio > 0 && naturalRatio > profile.ratio * 2.5;
      return (
        <>
          {showPortraitWarning && (
            <p className="u-export-portrait-warn">
              This timeline is much wider than tall — consider Slide or Tabloid for full legibility,
              or use Cuts to shorten the visible range before exporting portrait.
            </p>
          )}
          <label className="u-export-crop-row">
            <input type="checkbox" checked={cropInstead} onChange={e => setCropInstead(e.target.checked)} />
            {' '}Crop to fit (default: letterbox)
          </label>
          <button
            className="u-btn u-btn--primary"
            onClick={() => { exportPNG(profile); setShowExportMenu(false); }}
          >
            Export as PNG
          </button>
        </>
      );
    })()}
  </div>
)}
```

Add to `src/understory.css`:

```css
.u-export-menu--profiles {
  min-width: 220px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.u-export-profile-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.u-export-profile-btn {
  text-align: left;
  padding: 4px 8px;
  font-size: 0.75rem;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 3px;
  cursor: pointer;
  color: var(--text-primary, #3E3B35);
}
.u-export-profile-btn:hover {
  background: rgba(62,59,53,0.07);
}
.u-export-profile-btn--active {
  background: rgba(62,59,53,0.12);
  border-color: rgba(62,59,53,0.3);
  font-weight: 500;
}
.u-export-portrait-warn {
  font-size: 0.72rem;
  color: #8A5A00;
  background: rgba(200,150,0,0.08);
  border: 1px solid rgba(200,150,0,0.25);
  border-radius: 3px;
  padding: 5px 8px;
  margin: 0;
}
.u-export-crop-row {
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}
```

- [ ] **Step 6: Verify export profiles**

Open the Export dropdown → verify all 7 profiles are listed. Select "Slide (16:9)" → Export as PNG → verify the output image is 1920×1080. Select "Native canvas ratio" → Export as PNG → verify it matches the viewport at 2× scale (same as before this task). Select a portrait profile on a wide timeline (width/height > 2.5×) → verify the inline warning appears. Check the "Crop to fit" box and export → verify the exported image has no padding bars.

- [ ] **Step 7: Commit**

```bash
git add src/ComplexityTimeline.tsx src/understory.css
git commit -m "feat: export ratio presets with letterbox/crop and portrait warning"
```

---

## Self-Review Against Spec

**Spec coverage check:**

| Spec section | Task |
|---|---|
| §0 `displayMode` type + toggle + version 3 + import default | Task 1 |
| §1.1 Layer strands (SVG line + arrowhead) | Task 4 step 1 |
| §1.2 Event labels (plain text, alternating, collision pass) | Task 4 steps 3–5 |
| §1.3 Connections (thin dotted gray, no arrowhead in strands) | Task 4 section 4a step 1 |
| §1.3a Overlapping connectors (low opacity, curvature discipline, anchor spreading, hover isolation) | Task 4 section 4b steps 2a–2c |
| §1.4 Columns — z-order (columns behind strands behind connections behind labels) | Task 4 section 4c step 7 (render order in JSX) |
| §1.5 Trends as stacked thin bars | Task 4 section 4d step 6 |
| §1.6 Cuts — tooltip on hover | Task 4 section 4e step 7 |
| §1.7 Mirror in `exportPNG` | Task 5 |
| §2 Split Export → Save/Load/Export | Task 2 |
| §3 Export ratio presets + letterbox/crop + portrait warning | Task 6 |
| §4 `.und` extension, `.json` still accepted, no extension gate in `handleImportFile` | Task 3 |

**Placeholder scan:** None found — all steps include actual code.

**Type consistency:**
- `DisplayMode = 'cards' | 'strands'` defined Task 1; used throughout Tasks 1–6 — consistent.
- `ExportProfile` defined Task 6 step 1; `exportPNG(profile: ExportProfile)` in step 3 — consistent.
- `computeStrandLabels` returns `StrandLabelPos[]` with `eventIndex`, `side`, `yExtra` — consumed identically in Task 4 section 4c step 7 (DOM) and Task 5 step 3 (PNG) — consistent.
- `STRAND_LABEL_BASE` and `STRAND_LABEL_STEP` constants defined Task 4 section 4c step 3; used in step 7 and Task 5 step 3 — consistent.
- `StrandConnGeom` union type (Task 4 section 4b step 2a) — `computeStrandConnectorGeometry` produces it; `strandGeomToSVGPath` consumes it in DOM (Task 4 section 4b step 2b); canvas branch in Task 5 step 3 consumes it via `geom.kind` discriminant — consistent.
- `drawCardsMode(ctx, w, h, span, fontScale)` / `drawStrandsMode(ctx, w, h, span, fontScale)` — 5-param signature established Task 5 and `fontScale` threaded in Task 6 step 4 — consistent.
