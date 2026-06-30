# Canvas Label Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a free-floating, resizable, moveable canvas Label element (icon: `sticky_note_2`) that users can place anywhere on the timeline canvas to annotate entanglement between items.

**Architecture:** A new `CanvasLabel` type and separate `canvasLabels` state array live entirely within `ComplexityTimeline.tsx`, rendered as absolutely-positioned divs after the events section inside `u-timeline-wrap`. Drag and resize both use the Pointer Events capture pattern already used by state card resize handles (lines 3202–3268), so no new drag mechanism is introduced. `LabelModal` is a new component added before `MSIcon` (line 1007), following the exact same pattern as `LayerModal` and `EventModal`.

**Tech Stack:** React 18, TypeScript, CSS (no new dependencies)

## Global Constraints

- All changes in exactly two files: `src/ComplexityTimeline.tsx` and `src/understory.css`
- No new files, no new dependencies
- Follow existing patterns: Pointer Events capture for drag/resize; `u-form-label`/`u-form-input` for modal forms; `MSIcon` for icons; `Modal` base component for the dialog
- Zoom correction: divide all pointer delta values by `zoomRef.current` — same as existing resize handles at lines 3214 and 3221
- File version: bump `TIMELINE_FILE_VERSION` from `4` to `5` (line 2099)
- Material Symbol icon name for toolbar button: `sticky_note_2`
- Preset palette constant name: `LABEL_COLORS`
- Default background color for new labels: `#FFF3B0` (first entry in LABEL_COLORS)
- Min label width: `80px`
- New state names: `canvasLabels` / `setCanvasLabels`, `selectedLabel` / `setSelectedLabel`, `editingLabel` / `setEditingLabel`, `showLabelModal` / `setShowLabelModal`

---

### Task 1: CanvasLabel type + LABEL_COLORS constant + state declarations + Escape key

**Files:**
- Modify: `src/ComplexityTimeline.tsx`

**Interfaces:**
- Produces: `CanvasLabel` type, `LABEL_COLORS` constant, state setters `setCanvasLabels`, `setSelectedLabel`, `setEditingLabel`, `setShowLabelModal` — consumed by all later tasks

- [ ] **Step 1: Add `CanvasLabel` type after `type Cut` (line 56)**

In `src/ComplexityTimeline.tsx`, after:
```typescript
type Cut    = { startYear: number; endYear: number };
```
Add:
```typescript
type CanvasLabel = {
  text: string;
  x: number;       // left edge as % of canvas width (0–100)
  y: number;       // px from top of u-timeline-wrap (covers topReserveH zone)
  width?: number;  // px; undefined = auto (height auto-fits to text)
  bgColor: string;
};
```

- [ ] **Step 2: Add `LABEL_COLORS` constant after `BG_COLOR` (line ~130)**

In `src/ComplexityTimeline.tsx`, after:
```typescript
const BG_COLOR = '#f4ede2'; // Matches --bg-main; used for connection halo strokes and canvas background
```
Add:
```typescript
const LABEL_COLORS: { hex: string; name: string }[] = [
  { hex: '#FFF3B0', name: 'Yellow' },
  { hex: '#FFD6A5', name: 'Peach' },
  { hex: '#CAFFBF', name: 'Mint' },
  { hex: '#9BF6FF', name: 'Sky' },
  { hex: '#BDB2FF', name: 'Lavender' },
  { hex: '#FFAFCC', name: 'Rose' },
];
```

- [ ] **Step 3: Add four state declarations after `cuts` state (line ~1244)**

In `src/ComplexityTimeline.tsx`, after:
```typescript
  const [cuts, setCuts]               = useState<Cut[]>([]);
```
Add:
```typescript
  const [canvasLabels, setCanvasLabels]     = useState<CanvasLabel[]>([]);
  const [selectedLabel, setSelectedLabel]   = useState<number | null>(null);
  const [editingLabel, setEditingLabel]     = useState<number | null>(null);
  const [showLabelModal, setShowLabelModal] = useState(false);
```

- [ ] **Step 4: Add `setSelectedLabel(null)` to Escape key handler (line ~1447)**

In `src/ComplexityTimeline.tsx`, inside the Escape handler, after:
```typescript
        setSelectedEvent(null);
```
Add:
```typescript
        setSelectedLabel(null);
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/jeremy/Projects/understory && npx tsc --noEmit 2>&1 | head -20
```
Expected: no new errors

- [ ] **Step 6: Commit**

```bash
git -C /Users/jeremy/Projects/understory add src/ComplexityTimeline.tsx
git -C /Users/jeremy/Projects/understory commit -m "feat(label): add CanvasLabel type, LABEL_COLORS constant, and state declarations"
```

---

### Task 2: CSS — canvas label classes

**Files:**
- Modify: `src/understory.css` (append to end of file, after the topical event hover rules)

**Interfaces:**
- Produces: `.u-canvas-label`, `.u-canvas-label--selected`, `.u-canvas-label__resize-handle`, `.u-canvas-label__resize-handle--left`, `.u-canvas-label__resize-handle--right`, `.u-canvas-label__actions`, `.u-label-palette`, `.u-label-swatch`, `.u-label-swatch--active` — consumed by Tasks 3–6

- [ ] **Step 1: Append canvas label CSS to end of `src/understory.css`**

```css
/* ── CANVAS LABELS ────────────────────────────────────────── */

.u-canvas-label {
  position: absolute;
  padding: 8px 10px;
  border-radius: 4px;
  white-space: pre-wrap;
  min-width: 80px;
  font-family: "Alegreya Sans", sans-serif;
  font-size: 0.62rem;
  line-height: 1.4;
  word-break: break-word;
  cursor: move;
  box-shadow: 0 1px 4px rgba(62,59,53,0.15);
  user-select: none;
  z-index: 5;
}

.u-canvas-label--selected {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* Resize handles — same structure as .u-event-resize-handle */
.u-canvas-label__resize-handle {
  position: absolute;
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
.u-canvas-label__resize-handle--left  { left: -2px; }
.u-canvas-label__resize-handle--right { right: -2px; }
.u-canvas-label--selected .u-canvas-label__resize-handle,
.u-canvas-label:hover .u-canvas-label__resize-handle { opacity: 1; }
.u-canvas-label__resize-handle::after {
  content: '';
  width: 3px;
  height: 60%;
  background: var(--primary);
  border-radius: 2px;
  opacity: 0.5;
}

/* Action popup — same structure as .u-event-actions */
.u-canvas-label__actions {
  position: absolute;
  bottom: calc(100% + 5px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-main);
  border: 1px solid var(--border);
  border-radius: 3px;
  box-shadow: var(--shadow);
  display: flex;
  gap: 1px;
  padding: 3px;
  white-space: nowrap;
  z-index: 10;
}

/* Color palette in LabelModal */
.u-label-palette {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 2px;
}
.u-label-swatch {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: border-color 0.1s, transform 0.1s;
}
.u-label-swatch:hover { transform: scale(1.15); }
.u-label-swatch--active { border-color: var(--text); }

/* ── /CANVAS LABELS ───────────────────────────────────────── */
```

- [ ] **Step 2: Commit**

```bash
git -C /Users/jeremy/Projects/understory add src/understory.css
git -C /Users/jeremy/Projects/understory commit -m "feat(label): add canvas label CSS classes"
```

---

### Task 3: LabelModal component

**Files:**
- Modify: `src/ComplexityTimeline.tsx` — insert new component immediately before `const MSIcon` (line 1007)

**Interfaces:**
- Consumes: `CanvasLabel` type, `LABEL_COLORS` constant, `Modal` base component (line 447)
- Produces: `LabelModal({ onClose, onSave, initialData? })` — consumed by Task 7

- [ ] **Step 1: Insert `LabelModal` component before `const MSIcon` (line 1007)**

In `src/ComplexityTimeline.tsx`, immediately before:
```typescript
const MSIcon = ({ n, size = 13 }: { n: string; size?: number }) => (
```
Insert:
```typescript
const LabelModal = ({
  onClose,
  onSave,
  initialData,
}: {
  onClose: () => void;
  onSave: (data: Pick<CanvasLabel, 'text' | 'bgColor'>) => void;
  initialData?: Pick<CanvasLabel, 'text' | 'bgColor'>;
}) => {
  const isEditing = !!initialData;
  const [text, setText]       = useState(initialData?.text ?? '');
  const [bgColor, setBgColor] = useState(initialData?.bgColor ?? LABEL_COLORS[0].hex);

  const handleSave = () => {
    if (!text.trim()) return;
    onSave({ text: text.trim(), bgColor });
  };

  return (
    <Modal onClose={onClose} title={isEditing ? 'Edit Label' : 'Add Label'} accentColor="var(--btn-column)">
      <label className="u-form-label">Text</label>
      <textarea
        className="u-form-input"
        rows={3}
        value={text}
        onChange={e => setText(e.target.value)}
        autoFocus
        style={{ resize: 'vertical' }}
      />
      <label className="u-form-label" style={{ marginTop: '0.6rem' }}>Color</label>
      <div className="u-label-palette">
        {LABEL_COLORS.map(({ hex, name }) => (
          <button
            key={hex}
            type="button"
            title={name}
            className={`u-label-swatch${bgColor === hex ? ' u-label-swatch--active' : ''}`}
            style={{ background: hex }}
            onClick={() => setBgColor(hex)}
          />
        ))}
      </div>
      <button
        className="u-btn u-btn--column u-btn--full"
        style={{ marginTop: '1rem' }}
        onClick={handleSave}
        disabled={!text.trim()}
      >
        {isEditing ? 'Save Label' : 'Add Label'}
      </button>
    </Modal>
  );
};

```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/jeremy/Projects/understory && npx tsc --noEmit 2>&1 | head -20
```
Expected: no new errors

- [ ] **Step 3: Commit**

```bash
git -C /Users/jeremy/Projects/understory add src/ComplexityTimeline.tsx
git -C /Users/jeremy/Projects/understory commit -m "feat(label): add LabelModal component"
```

---

### Task 4: Render labels on canvas with select and action buttons

**Files:**
- Modify: `src/ComplexityTimeline.tsx` — insert render block after `{events.map(...)}`, update `handleTimelineClick`

**Interfaces:**
- Consumes: `canvasLabels`, `selectedLabel`, `setSelectedLabel`, `setEditingLabel`, `setShowLabelModal`, `setCanvasLabels`, `MSIcon`, CSS classes from Task 2
- Produces: visible labels; click-to-select; Edit and Delete buttons — consumed by Tasks 5–7

- [ ] **Step 1: Insert canvas label render block after the events map**

In `src/ComplexityTimeline.tsx`, find the closing of the events map (around line 3332). The structure is:

```tsx
              {/* Events */}
              {events.map((event, i) => {
                ...
              })}

            </>   ← closing of `layers.length > 0 ? <> ... </>`
          )}
```

Insert immediately after `{events.map(...)}` closes (after its `})}`) and before the `</>`:

```tsx
              {/* Canvas Labels */}
              {canvasLabels.map((label, i) => (
                <div
                  key={i}
                  className={`u-canvas-label${selectedLabel === i ? ' u-canvas-label--selected' : ''}`}
                  style={{
                    left: `${label.x}%`,
                    top: `${label.y}px`,
                    ...(label.width ? { width: `${label.width}px` } : {}),
                    background: label.bgColor,
                  }}
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedLabel(prev => prev === i ? null : i);
                  }}
                  onDoubleClick={e => {
                    e.stopPropagation();
                    setEditingLabel(i);
                    setShowLabelModal(true);
                  }}
                >
                  {label.text}
                  {(['left', 'right'] as const).map(side => (
                    <div
                      key={side}
                      className={`u-canvas-label__resize-handle u-canvas-label__resize-handle--${side}`}
                      onPointerDown={e => {
                        e.stopPropagation();
                        e.preventDefault();
                        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                        const outerEl = (e.currentTarget as HTMLElement).parentElement as HTMLElement;
                        const containerEl = timelineRef.current;
                        if (!containerEl) return;
                        const containerW = containerEl.getBoundingClientRect().width / zoomRef.current;
                        const startClientX = e.clientX;
                        const startW  = label.width ?? (outerEl.offsetWidth ?? 130);
                        const centerPx = (label.x / 100) * containerW;
                        const fixedEdgePx = side === 'right'
                          ? centerPx           // left edge (= label.x) stays fixed
                          : centerPx + startW; // right edge stays fixed
                        const onMove = (me: PointerEvent) => {
                          const delta = (me.clientX - startClientX) / zoomRef.current;
                          const newW  = Math.max(80, side === 'right' ? startW + delta : startW - delta);
                          const newLeftPx = side === 'right' ? fixedEdgePx : fixedEdgePx - newW;
                          outerEl.style.width = `${newW}px`;
                          outerEl.style.left  = `${(newLeftPx / containerW) * 100}%`;
                        };
                        const onUp = (ue: PointerEvent) => {
                          const delta = (ue.clientX - startClientX) / zoomRef.current;
                          const newW  = Math.max(80, side === 'right' ? startW + delta : startW - delta);
                          const newLeftPx = side === 'right' ? fixedEdgePx : fixedEdgePx - newW;
                          const newX = (newLeftPx / containerW) * 100;
                          outerEl.style.width = '';
                          outerEl.style.left  = '';
                          setCanvasLabels(prev => prev.map((lbl, idx) =>
                            idx === i ? { ...lbl, width: newW, x: newX } : lbl
                          ));
                          window.removeEventListener('pointermove', onMove);
                          window.removeEventListener('pointerup', onUp);
                        };
                        window.addEventListener('pointermove', onMove);
                        window.addEventListener('pointerup', onUp);
                      }}
                    />
                  ))}
                  {selectedLabel === i && (
                    <div className="u-canvas-label__actions">
                      <button
                        className="u-event-action-btn"
                        title="Edit label"
                        onClick={e => {
                          e.stopPropagation();
                          setEditingLabel(i);
                          setShowLabelModal(true);
                        }}
                      >
                        <MSIcon n="edit" size={13} />
                      </button>
                      <button
                        className="u-event-action-btn u-event-action-btn--danger"
                        title="Delete label"
                        onClick={e => {
                          e.stopPropagation();
                          setCanvasLabels(prev => prev.filter((_, idx) => idx !== i));
                          setSelectedLabel(null);
                        }}
                      >
                        <MSIcon n="delete" size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
```

- [ ] **Step 2: Clear `selectedLabel` when clicking the timeline background**

In `src/ComplexityTimeline.tsx`, find `handleTimelineClick` (the function assigned to the `onClick` of `u-timeline-wrap`, around line 1940). At the very start of the function body, add:

```typescript
    setSelectedLabel(null);
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/jeremy/Projects/understory && npx tsc --noEmit 2>&1 | head -20
```
Expected: no new errors

- [ ] **Step 4: Smoke test with a temporary hardcoded label**

Temporarily change the `canvasLabels` initial state to:
```typescript
  const [canvasLabels, setCanvasLabels] = useState<CanvasLabel[]>([
    { text: 'Test label\nsecond line', x: 10, y: 80, bgColor: '#FFF3B0' },
  ]);
```
Open the dev server (`npm run dev` in `/Users/jeremy/Projects/understory`). Verify:
- Yellow label appears in top-left area with both lines of text
- Click it → selection outline + Edit/Delete buttons appear
- Click Delete → label disappears
- Click canvas background → selection clears
- Hover → resize handles appear on left/right edges (thin grey bars)

Revert initial state back to `useState<CanvasLabel[]>([])`.

- [ ] **Step 5: Commit**

```bash
git -C /Users/jeremy/Projects/understory add src/ComplexityTimeline.tsx
git -C /Users/jeremy/Projects/understory commit -m "feat(label): render canvas labels with select, delete, and resize handles"
```

---

### Task 5: Drag (move) interaction

**Files:**
- Modify: `src/ComplexityTimeline.tsx` — add `onPointerDown` drag handler to canvas label div

**Interfaces:**
- Consumes: `zoomRef`, `canvasLabels`, `setCanvasLabels`, `timelineRef`
- Produces: labels draggable to any position on canvas

- [ ] **Step 1: Add `onPointerDown` drag handler to the canvas label `<div>`**

In `src/ComplexityTimeline.tsx`, in the canvas label render block added in Task 4, add `onPointerDown` to the outer label `<div>`, immediately before the existing `onClick`:

```tsx
                  onPointerDown={e => {
                    // Let resize handle and action button events pass through
                    if ((e.target as HTMLElement).closest(
                      '.u-canvas-label__resize-handle, .u-canvas-label__actions'
                    )) return;
                    e.stopPropagation();
                    e.preventDefault();
                    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                    const el = e.currentTarget as HTMLElement;
                    const containerEl = timelineRef.current;
                    if (!containerEl) return;
                    const startClientX = e.clientX;
                    const startClientY = e.clientY;
                    const startX = label.x;
                    const startY = label.y;
                    const onMove = (me: PointerEvent) => {
                      const containerW = containerEl.getBoundingClientRect().width / zoomRef.current;
                      const dx = (me.clientX - startClientX) / zoomRef.current;
                      const dy = (me.clientY - startClientY) / zoomRef.current;
                      el.style.left = `${Math.max(0, Math.min(100, startX + (dx / containerW) * 100))}%`;
                      el.style.top  = `${Math.max(0, startY + dy)}px`;
                    };
                    const onUp = (ue: PointerEvent) => {
                      const containerW = containerEl.getBoundingClientRect().width / zoomRef.current;
                      const dx = (ue.clientX - startClientX) / zoomRef.current;
                      const dy = (ue.clientY - startClientY) / zoomRef.current;
                      const newX = Math.max(0, Math.min(100, startX + (dx / containerW) * 100));
                      const newY = Math.max(0, startY + dy);
                      el.style.left = '';
                      el.style.top  = '';
                      setCanvasLabels(prev => prev.map((lbl, idx) =>
                        idx === i ? { ...lbl, x: newX, y: newY } : lbl
                      ));
                      window.removeEventListener('pointermove', onMove);
                      window.removeEventListener('pointerup', onUp);
                    };
                    window.addEventListener('pointermove', onMove);
                    window.addEventListener('pointerup', onUp);
                  }}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/jeremy/Projects/understory && npx tsc --noEmit 2>&1 | head -20
```
Expected: no new errors

- [ ] **Step 3: Manual test — drag a label**

Add test label in initial state:
```typescript
{ text: 'Drag me', x: 10, y: 80, bgColor: '#CAFFBF' }
```
Open the app. Drag the label to the center of the canvas — verify it moves smoothly. Release — verify it stays. Drag it to the top of the canvas (over the column header area) — verify it can float there. Test at 50% zoom and 150% zoom. Revert initial state.

- [ ] **Step 4: Commit**

```bash
git -C /Users/jeremy/Projects/understory add src/ComplexityTimeline.tsx
git -C /Users/jeremy/Projects/understory commit -m "feat(label): add pointer-capture drag to move canvas labels"
```

---

### Task 6: Toolbar button + addLabel handler + LabelModal rendering

**Files:**
- Modify: `src/ComplexityTimeline.tsx` — `addLabel` function, toolbar button, modal render

**Interfaces:**
- Consumes: `LabelModal`, `canvasLabels`, `setCanvasLabels`, `editingLabel`, `setEditingLabel`, `showLabelModal`, `setShowLabelModal`, `topReserveH`
- Produces: complete end-to-end Add Label flow

- [ ] **Step 1: Add `addLabel` handler**

In `src/ComplexityTimeline.tsx`, find the comment `// ── Connection ops ──` (around line 1862). Immediately before it, add:

```typescript
  // ── Label ops ──
  const addLabel = (data: Pick<CanvasLabel, 'text' | 'bgColor'>) => {
    if (editingLabel !== null) {
      setCanvasLabels(prev => prev.map((lbl, i) =>
        i === editingLabel ? { ...lbl, ...data } : lbl
      ));
      setEditingLabel(null);
    } else {
      setCanvasLabels(prev => [...prev, { ...data, x: 10, y: topReserveH + 20 }]);
    }
    setShowLabelModal(false);
  };
```

- [ ] **Step 2: Add "Add Label" toolbar button in process-mode toolbar**

In `src/ComplexityTimeline.tsx`, find the process-mode toolbar block. After:
```tsx
          <button className="u-btn u-btn--column" onClick={() => { setEditingColumn(null); setShowColumnModal(true); }}>
            <MSIcon n="add_column_right" /> Add Column
          </button>
```
Add:
```tsx
          <div className="u-toolbar-sep" />
          <button className="u-btn u-btn--column" onClick={() => { setEditingLabel(null); setShowLabelModal(true); }}>
            <MSIcon n="sticky_note_2" /> Add Label
          </button>
```

- [ ] **Step 3: Render `LabelModal` in the modals section**

In `src/ComplexityTimeline.tsx`, find the `{/* MODALS */}` section near the end of the component. After the `showTopicalEventModal` block (the last existing modal), and before the final `</div>` that closes the component root, add:

```tsx
      {showLabelModal && (
        <LabelModal
          onClose={() => { setShowLabelModal(false); setEditingLabel(null); }}
          onSave={addLabel}
          initialData={editingLabel !== null
            ? { text: canvasLabels[editingLabel].text, bgColor: canvasLabels[editingLabel].bgColor }
            : undefined}
        />
      )}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/jeremy/Projects/understory && npx tsc --noEmit 2>&1 | head -20
```
Expected: no new errors

- [ ] **Step 5: Manual end-to-end test**

Open the app (`npm run dev`). Verify the full flow:
1. "Add Label" button appears in the toolbar with `sticky_note_2` icon
2. Click "Add Label" → modal opens with textarea (auto-focused) and 6 color swatches
3. Type "Relationship A→B explains C", pick Lavender (`#BDB2FF`), click "Add Label" → label appears near top-left of canvas with lavender background
4. Drag label to center of canvas → it stays there
5. Click label → selection outline + action buttons appear
6. Double-click label → modal opens pre-filled with "Relationship A→B explains C" and Lavender selected; change text to "Updated", click "Save Label" → label shows "Updated"
7. Click Edit (pencil) action button → modal opens in edit mode; close it → no change
8. Click Delete (trash) action button → label disappears
9. Press Escape while a label is selected → selection clears (no modal opened)

- [ ] **Step 6: Commit**

```bash
git -C /Users/jeremy/Projects/understory add src/ComplexityTimeline.tsx
git -C /Users/jeremy/Projects/understory commit -m "feat(label): wire toolbar button, addLabel handler, and LabelModal rendering"
```

---

### Task 7: Export / Import (version bump to 5)

**Files:**
- Modify: `src/ComplexityTimeline.tsx:2099` (`TIMELINE_FILE_VERSION`), `~2103` (`exportJSON`), `~2118` (`handleImportFile`)

**Interfaces:**
- Consumes: `canvasLabels`, `setCanvasLabels`
- Produces: labels persisted to `.ustory` files; old v4 files load safely with empty labels

- [ ] **Step 1: Bump file version (line 2099)**

Change:
```typescript
  const TIMELINE_FILE_VERSION = 4;
```
To:
```typescript
  const TIMELINE_FILE_VERSION = 5;
```

- [ ] **Step 2: Add `canvasLabels` to export data object (~line 2103)**

Change:
```typescript
    const data = {
      version: TIMELINE_FILE_VERSION,
      layers, layerDescriptions, startYear, endYear,
      events, connections, columns, trends, cuts,
      selectedProfileId,
      layerHeights,
      topicalEvents,
    };
```
To:
```typescript
    const data = {
      version: TIMELINE_FILE_VERSION,
      layers, layerDescriptions, startYear, endYear,
      events, connections, columns, trends, cuts,
      canvasLabels,
      selectedProfileId,
      layerHeights,
      topicalEvents,
    };
```

- [ ] **Step 3: Read `canvasLabels` in import handler (~line 2118)**

In `handleImportFile`, after:
```typescript
        setTopicalEvents(Array.isArray(data.topicalEvents) ? data.topicalEvents : []);
```
Add:
```typescript
        setCanvasLabels(Array.isArray(data.canvasLabels) ? data.canvasLabels : []);
```

Also, after the existing `setSelectedEvent(null)` lines (the selection-clearing block), add:
```typescript
        setSelectedLabel(null);
        setEditingLabel(null);
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/jeremy/Projects/understory && npx tsc --noEmit 2>&1 | head -20
```
Expected: no new errors

- [ ] **Step 5: Round-trip test**

1. Add 2 labels to the canvas — one Yellow with text "Alpha link", one Rose with text "Beta link"
2. Drag them to different positions; resize one to be wider
3. Click Save → save as `test-labels.ustory`
4. Click Load, re-open `test-labels.ustory`
5. Verify both labels appear at their saved positions with correct text, colors, and widths
6. Load an old `.ustory` v4 file (one without `canvasLabels`) — confirm it loads without errors and canvas labels are empty

- [ ] **Step 6: Final commit**

```bash
git -C /Users/jeremy/Projects/understory add src/ComplexityTimeline.tsx
git -C /Users/jeremy/Projects/understory commit -m "feat(label): add canvasLabels to export/import, bump file version to 5"
```

---

## Self-Review

**Spec coverage:**
- ✅ `CanvasLabel` type with `text`, `x`, `y`, `width?`, `bgColor`
- ✅ `LABEL_COLORS` preset palette (6 colors, Yellow default)
- ✅ Separate `canvasLabels` state array — no changes to events/connections logic
- ✅ Labels render absolutely inside `u-timeline-wrap`, after events section
- ✅ `x` as raw canvas %, `y` as px from top of container (floats over column headers)
- ✅ No border, background color, `border-radius: 4px`, `box-shadow`
- ✅ Left/right resize handles, Pointer Events capture pattern, min width 80px
- ✅ Drag via Pointer Events capture, all deltas divided by `zoomRef.current`
- ✅ Click-to-select with `selectedLabel` state
- ✅ Action buttons: Edit (opens modal), Delete (removes label)
- ✅ Double-click → edit modal
- ✅ Escape key clears `selectedLabel`
- ✅ `LabelModal` with textarea + 6-swatch palette, same pattern as `EventModal`
- ✅ Toolbar: `sticky_note_2` icon + "Add Label" text, process mode only, after Add Column
- ✅ New labels placed at `x: 10, y: topReserveH + 20`
- ✅ Export: `canvasLabels` in JSON, version bumped 4 → 5
- ✅ Import: safe fallback `[]` for old v4 files
- ✅ No new files, no new dependencies

**Placeholder scan:** No TBDs, no "similar to Task N" references, all code blocks complete.

**Type consistency:** `CanvasLabel` defined in Task 1, used identically in Tasks 3–7. `addLabel` takes `Pick<CanvasLabel, 'text' | 'bgColor'>` in Task 6 and `LabelModal.onSave` in Task 3 — exact same type. `setCanvasLabels`, `setSelectedLabel`, `setEditingLabel`, `setShowLabelModal` defined in Task 1, consumed in Tasks 4–7 by those exact names.
