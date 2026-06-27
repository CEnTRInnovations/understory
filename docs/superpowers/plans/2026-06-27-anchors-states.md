# Anchors & States Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two distinct event types (`state` = resizable box, `anchor` = dot+year+label) to `ComplexityTimeline`, and remove strands mode entirely.

**Architecture:** All events share the same `events` array; a new `type: 'state' | 'anchor'` field on `TimelineEvent` drives conditional rendering, modal fields, and canvas export. Strands mode is deleted outright — all strands-specific code, CSS, and functions are removed, leaving cards mode as the only display mode.

**Tech Stack:** React + TypeScript, inline SVG, HTML5 Canvas 2D, `src/understory.css` for styling.

## Global Constraints

- Target file: `src/ComplexityTimeline.tsx`
- CSS file: `src/understory.css`
- TypeScript must compile without new errors: `npx tsc --noEmit`
- No new npm dependencies
- `BG_COLOR = '#f4ede2'` is already defined at line 114 — use it, never a magic string
- Surgical edits only — do not restructure unrelated code

---

### Task 1: Extend `TimelineEvent` type and update backward-compat import

**Files:**
- Modify: `src/ComplexityTimeline.tsx:13–22` (type definition)
- Modify: `src/ComplexityTimeline.tsx:~1288` (`setEvents` call in `handleImportFile`)

**Interfaces:**
- Produces: `TimelineEvent` with `type: 'state' | 'anchor'` and `width?: number` — consumed by all subsequent tasks

- [ ] **Step 1: Add `type` and `width` fields to `TimelineEvent`**

  Find lines 13–22:
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
  };
  ```

  Replace with:
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
    width?: number; // states only; px; undefined = auto-size to content
  };
  ```

- [ ] **Step 2: Default `type` to `'state'` when loading old files**

  Find the `setEvents` call in `handleImportFile` (~line 1288):
  ```typescript
  setEvents(Array.isArray(data.events) ? data.events : []);
  ```

  Replace with:
  ```typescript
  setEvents(Array.isArray(data.events)
    ? data.events.map((ev: TimelineEvent) => ({ type: 'state' as const, ...ev }))
    : []);
  ```
  This ensures events saved before this feature always have `type: 'state'`, preserving their box appearance.

- [ ] **Step 3: Verify TypeScript compiles**

  ```bash
  npx tsc --noEmit
  ```
  Expected: zero errors. (EventModal's `onSave` callback will now require `type` in its returned object — you may see errors there; they will be fixed in Task 3.)

- [ ] **Step 4: Commit**

  ```bash
  git add src/ComplexityTimeline.tsx
  git commit -m "feat: add type and width fields to TimelineEvent with backward-compat import"
  ```

---

### Task 2: Remove strands mode

**Files:**
- Modify: `src/ComplexityTimeline.tsx` (many locations — listed precisely below)
- Modify: `src/understory.css` (remove strand + mode-button CSS)

**Interfaces:**
- Consumes: nothing from Task 1
- Produces: `displayMode` state gone; `drawStrandsMode` gone; all `displayMode === 'strands'` guards gone; connections SVG map simplified

- [ ] **Step 1: Delete `DisplayMode` type (line 11)**

  Find and delete:
  ```typescript
  type DisplayMode = 'cards' | 'strands';
  ```

- [ ] **Step 2: Delete strands-specific constants, types, and pure functions (~lines 296–377)**

  Find and delete the entire block from:
  ```typescript
  const STRAND_LABEL_STEP = 20;  // px per stagger step above or below the strand
  ```
  through to the end of `strandGeomToSVGPath` (inclusive):
  ```typescript
  function strandGeomToSVGPath(g: StrandConnGeom): string {
    if (g.kind === 'quad') return `M ${g.x1} ${g.y1} Q ${g.cx} ${g.cy} ${g.x2} ${g.y2}`;
    return `M ${g.x1} ${g.y1} C ${g.cx1} ${g.cy1}, ${g.cx2} ${g.cy2}, ${g.x2} ${g.y2}`;
  }
  ```
  This removes: `STRAND_LABEL_STEP`, `STRAND_LABEL_BASE`, `StrandLabelPos`, `StrandConnGeom`, `computeStrandLabels`, `computeStrandConnectorGeometry`, `strandGeomToSVGPath`.

- [ ] **Step 3: Delete `displayMode` state (~line 775)**

  Find and delete:
  ```typescript
  const [displayMode, setDisplayMode] = useState<DisplayMode>('strands');
  ```

- [ ] **Step 4: Remove `displayMode` from `exportJSON` (~line 1257)**

  Find:
  ```typescript
  displayMode, selectedProfileId,
  ```
  Replace with:
  ```typescript
  selectedProfileId,
  ```

- [ ] **Step 5: Remove `setDisplayMode` call from `handleImportFile` (~lines 1297–1301)**

  Find and delete:
  ```typescript
  setDisplayMode(
    data.version >= 3 && (data.displayMode === 'cards' || data.displayMode === 'strands')
      ? data.displayMode
      : 'strands'
  );
  ```

- [ ] **Step 6: Delete `drawStrandsMode` function (~lines 1443–1565)**

  Find and delete the entire function from:
  ```typescript
  function drawStrandsMode(ctx: CanvasRenderingContext2D, w: number, h: number, _span: number, fontScale = 1.0) {
  ```
  to its closing `}`.

- [ ] **Step 7: Simplify `exportPNG` — remove `displayMode` branching (~lines 1598 and 1625)**

  Find:
  ```typescript
  if (displayMode === 'strands') drawStrandsMode(ctx, rect.width, rect.height, span, profile.fontScale);
  else drawCardsMode(ctx, rect.width, rect.height, span, profile.fontScale);
  ```
  Replace with:
  ```typescript
  drawCardsMode(ctx, rect.width, rect.height, span, profile.fontScale);
  ```

  Then find the second occurrence:
  ```typescript
  if (displayMode === 'strands') drawStrandsMode(ctx, drawW, drawH, span, profile.fontScale);
  else drawCardsMode(ctx, drawW, drawH, span, profile.fontScale);
  ```
  Replace with:
  ```typescript
  drawCardsMode(ctx, drawW, drawH, span, profile.fontScale);
  ```

- [ ] **Step 8: Delete mode toggle buttons from toolbar (~lines 1730–1748)**

  Find and delete the entire block:
  ```tsx
  <div className="u-toolbar-right">
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
  ```
  Delete through to the end of the closing `</div>` of `u-toolbar-right`. (Keep the `u-toolbar-sep` and anything before `u-toolbar-right`.)

- [ ] **Step 9: Remove strands SVG elements — strand lines block (~lines 1861–1888)**

  Find and delete the block starting with:
  ```tsx
  {displayMode === 'strands' && (
  ```
  (the SVG `<line>` elements that draw the strand lines per layer) through its closing `)}`.

  Also find and delete the strand lines inside the `{displayMode === 'strands' && layers.map...}` block that draws SVG lines per layer.

- [ ] **Step 10: Simplify SVG connections map — remove all `displayMode` guards**

  Find the connections IIFE (~lines 1900–1960). Replace the entire block with the simplified version below (remove `displayMode` checks, `isActive`, strands-mode path variants):

  ```tsx
  {(() => {
    if (connections.length === 0) return null;
    const renderOrder = [...connections.keys()].sort((a, b) => {
      const fa = getEventPos(connections[a].from);
      const ta = getEventPos(connections[a].to);
      const fb = getEventPos(connections[b].from);
      const tb = getEventPos(connections[b].to);
      return Math.hypot(tb.x - fb.x, tb.y - fb.y) -
             Math.hypot(ta.x - fa.x, ta.y - fa.y);
    });
    return renderOrder.map(i => {
      const conn = connections[i];
      const from = getEventPos(conn.from);
      const to   = getEventPos(conn.to);
      const { path } = (() => {
        const { x1, y1, x2, y2, c1x, c1y, c2x, c2y } = getConnectorGeometry(from, to, conn.fromSide, conn.toSide);
        return { path: `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}` };
      })();
      return (
        <g key={i}>
          <path d={path} stroke={BG_COLOR} strokeWidth={(conn.width ?? 2) + 6}
            fill="none" strokeLinecap="round" />
          <path d={path} stroke={conn.color}
            strokeWidth={conn.width ?? 2}
            fill="none"
            strokeDasharray={conn.lineStyle === 'dashed' ? '6 4' : conn.lineStyle === 'dotted' ? '2 4' : undefined}
            markerEnd={conn.showArrow ? `url(#arrow-${i})` : undefined}
          />
          <path d={path} stroke="transparent" strokeWidth={Math.max(16, (conn.width ?? 2) + 14)} fill="none"
            style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
            onClick={e => { e.stopPropagation(); setSelectedConnection(prev => prev === i ? null : i); }}
            onDoubleClick={e => { e.stopPropagation(); setEditingConnection(i); setShowConnectionModal(true); }} />
        </g>
      );
    });
  })()}
  ```

  > **Note on `path` extraction:** The existing IIFE already computes `getConnectorGeometry` and builds the path string — keep that logic, just remove the strands-mode variables and branches around it.

- [ ] **Step 11: Remove strands event block and simplify cards events block (~lines 2153–2340)**

  Find and delete:
  ```tsx
  if (displayMode === 'strands') return null; // handled below
  ```
  (inside the cards events map — strands are gone, this guard is no longer needed).

  Find and delete the entire strands event labels block:
  ```tsx
  {/* Strands mode event labels */}
  {displayMode === 'strands' && layers.map((_, layerIdx) => {
  ```
  through to its closing `})}`.

  Also find and delete the strands trend bars block:
  ```tsx
  {displayMode === 'strands' && sortedTrends.map((trend, k) => {
  ```
  through to its closing `})}`.

  Remove the `displayMode === 'cards' &&` guard from the remaining trends block:
  ```tsx
  {displayMode === 'cards' && sortedTrends.map((trend, k) => {
  ```
  Replace with:
  ```tsx
  {sortedTrends.map((trend, k) => {
  ```

- [ ] **Step 12: Remove strands CSS from `src/understory.css`**

  Find and delete all rules whose selector starts with:
  - `.u-strand-label`
  - `.u-strand-label--selected`
  - `.u-strand-label--italic`
  - `.u-strand-trend-bar`
  - `.u-strand-trend-label`
  - `.u-btn--mode`
  - `.u-btn--mode-active`

- [ ] **Step 13: Verify TypeScript compiles**

  ```bash
  npx tsc --noEmit
  ```
  Expected: zero errors (or only the `type` field errors from Task 1 that Task 3 will fix).

- [ ] **Step 14: Commit**

  ```bash
  git add src/ComplexityTimeline.tsx src/understory.css
  git commit -m "feat: remove strands mode — cards mode is now the only display mode"
  ```

---

### Task 3: Make `EventModal` type-aware and add two toolbar buttons

**Files:**
- Modify: `src/ComplexityTimeline.tsx:433–501` (`EventModal` component)
- Modify: `src/ComplexityTimeline.tsx:~1688–1693` (toolbar "Add Event" button)
- Modify: `src/ComplexityTimeline.tsx:~2337–2346` (`EventModal` call site)

**Interfaces:**
- Consumes: `TimelineEvent.type` from Task 1
- Produces: `EventModal` accepts and returns `type`; toolbar has "Add State" + "Add Anchor" buttons

- [ ] **Step 1: Rewrite `EventModal` to include `type` and conditional fields**

  Replace the entire `EventModal` component (lines 433–501) with:

  ```tsx
  const EventModal = ({
    onClose, onSave, layers, startYear, endYear, yearToPct, initialData
  }: {
    onClose: () => void;
    onSave: (data: TimelineEvent) => void;
    layers: string[];
    startYear: number;
    endYear: number;
    yearToPct: (year: number) => number;
    initialData?: Partial<TimelineEvent>;
  }) => {
    const midYear = Math.round((startYear + endYear) / 2);
    const eventType = initialData?.type ?? 'state';
    const [label, setLabel]       = useState(initialData?.label      ?? '');
    const [year, setYear]         = useState(initialData?.year       ?? midYear);
    const [layer, setLayer]       = useState(initialData?.layer      ?? 0);
    const [color, setColor]       = useState(initialData?.color      ?? BG_COLOR);
    const [borderColor, setBorder]= useState(initialData?.borderColor ?? '#3E3B35');
    const [style, setStyle]       = useState<'normal'|'italic'>(initialData?.style ?? 'normal');

    const handleSave = () => {
      if (!label.trim()) return;
      const x = yearToPct(year);
      const yOffset = initialData?.yOffset ?? (eventType === 'state' ? 0 : DEFAULT_Y_OFFSET);
      onSave({ label: label.trim(), year, layer, x, yOffset, color, borderColor, style, type: eventType, width: initialData?.width });
    };

    const isState = eventType === 'state';
    const title = initialData?.label
      ? (isState ? 'Edit State' : 'Edit Anchor')
      : (isState ? 'Add State'  : 'Add Anchor');

    return (
      <Modal onClose={onClose} title={title} accentColor="var(--btn-event)">
        <div className="u-form-group">
          <label className="u-form-label">Label</label>
          <input className="u-form-input" type="text" placeholder={isState ? 'State description' : 'Anchor description'} value={label}
            onChange={e => setLabel(e.target.value)} autoFocus />
        </div>
        <div className="u-form-row">
          <div className="u-form-group">
            <label className="u-form-label">Year</label>
            <input className="u-form-input" type="number" value={year} min={startYear} max={endYear}
              onChange={e => setYear(Number(e.target.value))} />
          </div>
          <div className="u-form-group">
            <label className="u-form-label">Layer</label>
            <select className="u-form-select" value={layer} onChange={e => setLayer(Number(e.target.value))}>
              {layers.map((l, i) => <option key={i} value={i}>{l}</option>)}
            </select>
          </div>
        </div>
        <div className="u-form-row">
          <div className="u-form-group">
            <label className="u-form-label">{isState ? 'Background' : 'Color'}</label>
            <input className="u-form-color" type="color" value={color} onChange={e => setColor(e.target.value)} />
          </div>
          {isState && (
            <div className="u-form-group">
              <label className="u-form-label">Border</label>
              <input className="u-form-color" type="color" value={borderColor} onChange={e => setBorder(e.target.value)} />
            </div>
          )}
        </div>
        <div className="u-form-group">
          <label className="u-form-label">Style</label>
          <select className="u-form-select" value={style} onChange={e => setStyle(e.target.value as 'normal'|'italic')}>
            <option value="normal">Normal</option>
            <option value="italic">Italic</option>
          </select>
        </div>
        <button className="u-btn u-btn--event u-btn--full" onClick={handleSave} disabled={!label.trim()}>
          {title}
        </button>
      </Modal>
    );
  };
  ```

- [ ] **Step 2: Replace "Add Event" toolbar button with "Add State" + "Add Anchor"**

  Find (~line 1691):
  ```tsx
  <button className="u-btn u-btn--event" onClick={() => { setEditingEvent(null); setShowEventModal(true); }}>
    <Plus size={13} /> Add Event
  </button>
  ```

  Replace with:
  ```tsx
  <button className="u-btn u-btn--event" onClick={() => { setEditingEvent(null); setShowEventModal({ type: 'state', yOffset: 0 }); }}>
    <Plus size={13} /> Add State
  </button>
  <button className="u-btn u-btn--event" onClick={() => { setEditingEvent(null); setShowEventModal({ type: 'anchor' }); }}>
    <Plus size={13} /> Add Anchor
  </button>
  ```

- [ ] **Step 3: Verify TypeScript compiles**

  ```bash
  npx tsc --noEmit
  ```
  Expected: zero errors.

- [ ] **Step 4: Commit**

  ```bash
  git add src/ComplexityTimeline.tsx
  git commit -m "feat: EventModal type-aware fields and Add State / Add Anchor toolbar buttons"
  ```

---

### Task 4: Anchor DOM rendering + CSS

**Files:**
- Modify: `src/ComplexityTimeline.tsx:~2152–2233` (events render block)
- Modify: `src/understory.css` (add anchor styles, state width override)

**Interfaces:**
- Consumes: `TimelineEvent.type` and `TimelineEvent.width` from Task 1
- Produces: anchors render as dot + year + label; states render as before but respect `width`

- [ ] **Step 1: Add anchor and state-width CSS to `src/understory.css`**

  Append after the existing `.u-event-node--connecting .u-event-card` rule (~line 735):

  ```css
  /* State width override — when user has manually resized */
  .u-event-node--state.u-event-node--wide {
    max-width: none;
  }

  /* Anchor moment rendering */
  .u-event-anchor {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    cursor: move;
    min-width: 60px;
    max-width: 130px;
  }
  .u-event-anchor__dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .u-event-anchor__year {
    font-family: "Alegreya Sans", sans-serif;
    font-size: 0.6rem;
    font-weight: 700;
    line-height: 1.2;
    text-align: center;
  }
  .u-event-anchor__label {
    font-family: "Alegreya Sans", sans-serif;
    font-size: 0.6rem;
    line-height: 1.3;
    text-align: center;
    word-break: break-word;
  }
  .u-event-anchor__label--italic { font-style: italic; }
  .u-event-node--selected .u-event-anchor {
    outline: 2px solid var(--primary);
    outline-offset: 3px;
    border-radius: 2px;
  }
  .u-event-node--connecting .u-event-anchor {
    outline: 2px solid var(--secondary);
    outline-offset: 3px;
    border-radius: 2px;
  }
  ```

- [ ] **Step 2: Branch event rendering on `event.type` in the events map**

  Find the events map block inside the SVG render (~line 2152). Currently it renders every event as a card. Replace the inner JSX with a type-conditional structure:

  ```tsx
  {events.map((event, i) => {
    const isAnchor = (event.type ?? 'state') === 'anchor';
    return (
      <div
        key={i}
        draggable
        className={`u-event-node ${isAnchor ? '' : 'u-event-node--state'} ${event.width ? 'u-event-node--wide' : ''} ${selectedEvent === i ? 'u-event-node--selected' : ''} ${connectingFrom === i ? 'u-event-node--connecting' : ''}`}
        style={{
          left: eventLeft(event.x),
          top: `${topReserveH + (layerTops[event.layer] ?? 0) + event.yOffset}px`,
          ...(event.width && !isAnchor ? { width: `${event.width}px`, maxWidth: 'none' } : {}),
        }}
        onDragStart={e => handleDragStart(e, i)}
        onClick={e => handleEventClick(e, i)}
        onDoubleClick={e => {
          e.stopPropagation();
          if (connectingFrom !== null) return;
          setEditingEvent(i);
          setShowEventModal(event);
        }}
      >
        {isAnchor ? (
          <div
            ref={el => { cardRefs.current[i] = el; }}
            className="u-event-anchor"
          >
            <div className="u-event-anchor__dot" style={{ background: event.color }} />
            <div className="u-event-anchor__year" style={{ color: event.color }}>{event.year}</div>
            <div className={`u-event-anchor__label${event.style === 'italic' ? ' u-event-anchor__label--italic' : ''}`} style={{ color: event.color }}>
              {event.label}
            </div>
          </div>
        ) : (
          <div
            ref={el => { cardRefs.current[i] = el; }}
            className={`u-event-card ${event.style === 'italic' ? 'u-event-card--italic' : ''}`}
            style={{ background: event.color, borderColor: event.borderColor, color: event.borderColor }}
          >
            {event.label}
          </div>
        )}
        {selectedEvent === i && (() => {
          const eventConns = connections.map((c, ci) => ({ c, ci })).filter(({ c }) => c.from === i || c.to === i);
          return (
            <div className="u-event-actions">
              <div className="u-event-actions-main">
                <button className="u-event-action-btn" title="Connect to another event"
                  onClick={e => { e.stopPropagation(); setConnectingFrom(i); setConnectFromSide(null); setSelectedEvent(null); }}>
                  <Link2 size={13} />
                </button>
                <button className="u-event-action-btn" title="Edit"
                  onClick={e => { e.stopPropagation(); setEditingEvent(i); setShowEventModal(event); }}>
                  <Edit2 size={13} />
                </button>
                <button className="u-event-action-btn u-event-action-btn--danger" title="Delete"
                  onClick={e => { e.stopPropagation(); deleteEvent(i); }}>
                  <Trash2 size={13} />
                </button>
              </div>
              {eventConns.map(({ c, ci }) => {
                const otherIdx = c.from === i ? c.to : c.from;
                const otherLabel = events[otherIdx]?.label || `Event ${otherIdx + 1}`;
                const dir = c.from === i ? '→' : '←';
                return (
                  <div key={ci} className="u-event-conn-row">
                    <span className="u-event-conn-label" title={otherLabel}>{dir} {otherLabel}</span>
                    <button className="u-event-action-btn" title="Edit connection"
                      onClick={e => { e.stopPropagation(); setEditingConnection(ci); setShowConnectionModal(true); }}>
                      <Edit2 size={13} />
                    </button>
                    <button className="u-event-action-btn u-event-action-btn--danger" title="Delete connection"
                      onClick={e => { e.stopPropagation(); deleteConnection(ci); }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })()}
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
  ```

- [ ] **Step 3: Verify TypeScript compiles**

  ```bash
  npx tsc --noEmit
  ```
  Expected: zero errors.

- [ ] **Step 4: Visual check in browser**

  Start dev server (`npm run dev` or `npm start`).
  1. Click "Add State" — confirm a box card appears at top of first layer.
  2. Click "Add Anchor" — confirm a dot + year + label appears (no box).
  3. Select both — confirm action buttons appear on both.
  4. Double-click each — confirm modal shows correct title and hides border color for anchors.

- [ ] **Step 5: Commit**

  ```bash
  git add src/ComplexityTimeline.tsx src/understory.css
  git commit -m "feat: anchor DOM rendering — dot + year + label; states apply width"
  ```

---

### Task 5: State resize handle

**Files:**
- Modify: `src/ComplexityTimeline.tsx` (inside the events map, state branch)
- Modify: `src/understory.css` (resize handle styles)

**Interfaces:**
- Consumes: `TimelineEvent.width` from Task 1; state card rendered in Task 4
- Produces: dragging the right-edge grip writes `event.width` to state

- [ ] **Step 1: Add resize handle CSS to `src/understory.css`**

  Append after the anchor CSS added in Task 4:

  ```css
  /* State resize handle */
  .u-event-resize-handle {
    position: absolute;
    right: -2px;
    top: 0;
    bottom: 0;
    width: 8px;
    cursor: ew-resize;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.15s;
    z-index: 10;
  }
  .u-event-node:hover .u-event-resize-handle { opacity: 1; }
  .u-event-resize-handle::after {
    content: '';
    width: 3px;
    height: 60%;
    background: var(--primary);
    border-radius: 2px;
    opacity: 0.5;
  }
  ```

- [ ] **Step 2: Add resize handler logic and handle element to state card branch**

  Inside the events map, in the state branch (the `else` block rendering `u-event-card`), replace:

  ```tsx
        ) : (
          <div
            ref={el => { cardRefs.current[i] = el; }}
            className={`u-event-card ${event.style === 'italic' ? 'u-event-card--italic' : ''}`}
            style={{ background: event.color, borderColor: event.borderColor, color: event.borderColor }}
          >
            {event.label}
          </div>
        )}
  ```

  With:

  ```tsx
        ) : (
          <div
            ref={el => { cardRefs.current[i] = el; }}
            className={`u-event-card ${event.style === 'italic' ? 'u-event-card--italic' : ''}`}
            style={{ background: event.color, borderColor: event.borderColor, color: event.borderColor }}
          >
            {event.label}
            <div
              className="u-event-resize-handle"
              onPointerDown={e => {
                e.stopPropagation();
                e.preventDefault();
                const startX = e.clientX;
                const startW = event.width ?? (cardRefs.current[i]?.offsetWidth ?? 130);
                const cardEl = cardRefs.current[i];
                const onMove = (me: PointerEvent) => {
                  const newW = Math.max(80, startW + (me.clientX - startX));
                  if (cardEl) cardEl.style.width = `${newW}px`;
                };
                const onUp = (ue: PointerEvent) => {
                  const newW = Math.max(80, startW + (ue.clientX - startX));
                  setEvents(evs => evs.map((ev, idx) => idx === i ? { ...ev, width: newW } : ev));
                  window.removeEventListener('pointermove', onMove);
                  window.removeEventListener('pointerup', onUp);
                };
                window.addEventListener('pointermove', onMove);
                window.addEventListener('pointerup', onUp);
              }}
            />
          </div>
        )}
  ```

- [ ] **Step 3: Verify TypeScript compiles**

  ```bash
  npx tsc --noEmit
  ```
  Expected: zero errors.

- [ ] **Step 4: Visual check in browser**

  1. Add a state. Hover over it — the resize grip appears on the right edge.
  2. Drag the grip to the right — the card grows in real time.
  3. Release — the card stays at the new width.
  4. Save (export JSON) and reload — the width is preserved.
  5. Minimum 80px: drag grip far left — card stops at 80px.

- [ ] **Step 5: Commit**

  ```bash
  git add src/ComplexityTimeline.tsx src/understory.css
  git commit -m "feat: state resize handle — drag right edge to set width"
  ```

---

### Task 6: `getEventPos` anchor connection geometry

**Files:**
- Modify: `src/ComplexityTimeline.tsx:1229–1245` (`getEventPos` callback)

**Interfaces:**
- Consumes: `TimelineEvent.type` from Task 1
- Produces: `getEventPos` returns dot center + halfWidth=6 for anchor events; connections attach at the dot

- [ ] **Step 1: Add anchor branch to `getEventPos`**

  Find the `getEventPos` callback (lines 1229–1245):
  ```typescript
  const getEventPos = useCallback((i: number) => {
    const ev   = events[i];
    if (!ev || !timelineRef.current) return { x: 0, y: 0, top: 0, bottom: 0, halfWidth: CONNECTOR_HALF_WIDTH };
    const rect = timelineRef.current.getBoundingClientRect();
    const cardEl  = cardRefs.current[i];
    const halfH   = cardEl ? cardEl.offsetHeight / 2 : EVENT_CARD_HALF_HEIGHT;
    const halfW   = cardEl ? cardEl.offsetWidth  / 2 : CONNECTOR_HALF_WIDTH;
    const top     = topReserveH + (layerTops[ev.layer] ?? 0) + ev.yOffset;
    const centerY = top + halfH;
    return {
      x: eventLeftPx(ev.x, rect.width),
      y: centerY,
      top: centerY - halfH,
      bottom: centerY + halfH,
      halfWidth: halfW,
    };
  }, [events, layerTops, topReserveH]);
  ```

  Replace with:
  ```typescript
  const getEventPos = useCallback((i: number) => {
    const ev   = events[i];
    if (!ev || !timelineRef.current) return { x: 0, y: 0, top: 0, bottom: 0, halfWidth: CONNECTOR_HALF_WIDTH };
    const rect = timelineRef.current.getBoundingClientRect();
    const evX  = eventLeftPx(ev.x, rect.width);
    if ((ev.type ?? 'state') === 'anchor') {
      const dotTop = topReserveH + (layerTops[ev.layer] ?? 0) + ev.yOffset;
      return { x: evX, y: dotTop + 6, top: dotTop, bottom: dotTop + 12, halfWidth: 6 };
    }
    const cardEl  = cardRefs.current[i];
    const halfH   = cardEl ? cardEl.offsetHeight / 2 : EVENT_CARD_HALF_HEIGHT;
    const halfW   = cardEl ? cardEl.offsetWidth  / 2 : CONNECTOR_HALF_WIDTH;
    const top     = topReserveH + (layerTops[ev.layer] ?? 0) + ev.yOffset;
    const centerY = top + halfH;
    return {
      x: evX,
      y: centerY,
      top: centerY - halfH,
      bottom: centerY + halfH,
      halfWidth: halfW,
    };
  }, [events, layerTops, topReserveH]);
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  npx tsc --noEmit
  ```
  Expected: zero errors.

- [ ] **Step 3: Visual check in browser**

  1. Add two anchor events on different layers.
  2. Click one anchor, click the connect icon, click the other anchor.
  3. Confirm the connection line attaches at the dot (not at a ghost card position).
  4. Also connect an anchor to a state — confirm it attaches to the dot on the anchor side and the card edge on the state side.

- [ ] **Step 4: Commit**

  ```bash
  git add src/ComplexityTimeline.tsx
  git commit -m "feat: getEventPos returns dot center for anchor events"
  ```

---

### Task 7: Canvas export — anchor drawing in `drawCardsMode`

**Files:**
- Modify: `src/ComplexityTimeline.tsx:~1406–1427` (events block inside `drawCardsMode`)

**Interfaces:**
- Consumes: `TimelineEvent.type` and `TimelineEvent.width` from Task 1
- Produces: PNG export renders anchors as dot + year + label; states as boxes (unchanged)

- [ ] **Step 1: Replace the events forEach in `drawCardsMode` with a type-branching version**

  Find the events block inside `drawCardsMode` (~lines 1406–1427):
  ```typescript
  // Events (cards)
  events.forEach((ev, evi) => {
    const x = eventLeftPx(ev.x, w);
    const y = topReserveH + (layerTops[ev.layer] ?? 0) + ev.yOffset;
    const cardEl = cardRefs.current[evi];
    const padding = 6; const lineHeight = 13;
    const fontSpec = scaledFont(12, fontScale, undefined, ev.style === 'italic');
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
  ```

  Replace with:
  ```typescript
  // Events (cards and anchors)
  events.forEach((ev, evi) => {
    const x = eventLeftPx(ev.x, w);
    const y = topReserveH + (layerTops[ev.layer] ?? 0) + ev.yOffset;

    if ((ev.type ?? 'state') === 'anchor') {
      // Dot
      ctx.save();
      ctx.fillStyle = ev.color;
      ctx.beginPath();
      ctx.arc(x, y + 6, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // Year
      ctx.save();
      ctx.fillStyle = ev.color;
      ctx.font = scaledFont(9, fontScale, '700', false);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(String(ev.year), x, y + 14);
      ctx.restore();
      // Label
      ctx.save();
      ctx.fillStyle = ev.color;
      ctx.font = scaledFont(9, fontScale, undefined, ev.style === 'italic');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const anchorLines = wrapCanvasText(ctx, ev.label, 120);
      anchorLines.forEach((line, li) => ctx.fillText(line, x, y + 26 + li * 12));
      ctx.restore();
    } else {
      const cardEl = cardRefs.current[evi];
      const padding = 6; const lineHeight = 13;
      const fontSpec = scaledFont(12, fontScale, undefined, ev.style === 'italic');
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
    }
  });
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  npx tsc --noEmit
  ```
  Expected: zero errors.

- [ ] **Step 3: Visual check — PNG export**

  1. Add one state and one anchor with a connection between them.
  2. Click "Export" (PNG).
  3. Open the downloaded file — confirm:
     - State renders as a filled+bordered box with label
     - Anchor renders as a filled dot, bold year below, label text below that
     - Connection line attaches to the dot center on the anchor side

- [ ] **Step 4: Commit**

  ```bash
  git add src/ComplexityTimeline.tsx
  git commit -m "feat: canvas export draws anchors as dot + year + label"
  ```

---

## Self-Review: Spec Coverage Check

| Spec requirement | Covered by |
|---|---|
| `type: 'state' \| 'anchor'` on `TimelineEvent` | Task 1 step 1 |
| `width?: number` on `TimelineEvent` | Task 1 step 1 |
| Backward compat: old events default to `'state'` | Task 1 step 2 |
| Strands mode removed entirely | Task 2 |
| `EventModal` shows type-conditional fields | Task 3 step 1 |
| "Add State" + "Add Anchor" toolbar buttons | Task 3 step 2 |
| State `yOffset` defaults to 0 for new states | Task 3 step 1 (`handleSave`) |
| Anchor renders as dot + year + label (DOM) | Task 4 step 2 |
| State respects `event.width` (DOM) | Task 4 step 2 |
| Anchor selection/connection/delete actions | Task 4 step 2 |
| State resize handle | Task 5 |
| `getEventPos` returns dot center for anchors | Task 6 |
| Canvas export: anchors draw as dot + year + label | Task 7 step 1 |
| Canvas export: states draw as box (unchanged) | Task 7 step 1 |
