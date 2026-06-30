# Canvas Label Feature Design

**Date:** 2026-06-30  
**Status:** Approved

## Overview

Add a free-floating, resizable, moveable text box ("Label") to the canvas. Labels have a solid background color (no border) and can be placed anywhere on the canvas — including over column headers and trend bands, not just within layer rows. They are used to annotate "entanglement" (the conceptual link between two items) and other free-form notes. The toolbar button uses the Material Symbol `sticky_note_2`.

---

## Data Model

New type, separate from `TimelineEvent`:

```typescript
type CanvasLabel = {
  text: string;
  x: number;       // left edge as % of canvas width (0–100); raw %, not the padded event coordinate space
  y: number;       // px from top of u-timeline-wrap (covers topReserveH zone — labels can float over headers)
  width?: number;  // px; undefined = auto (height auto-fits to content)
  bgColor: string; // hex from LABEL_COLORS preset palette
};
```

`x` is a raw canvas percentage (not the padded `eventYearToPct` space events use) because labels are not bound to any year. `y` is pixels from the top of the `u-timeline-wrap` div, so labels may float over column headers and trend bands.

New React state:

```typescript
const [canvasLabels, setCanvasLabels] = useState<CanvasLabel[]>([]);
const [selectedLabel, setSelectedLabel] = useState<number | null>(null);
const [editingLabel, setEditingLabel]   = useState<number | null>(null);
const [showLabelModal, setShowLabelModal] = useState(false);
```

---

## Preset Color Palette

Constant `LABEL_COLORS` (6 entries). Default for new labels: Yellow.

| Name | Hex |
|------|-----|
| Yellow | `#FFF3B0` |
| Peach | `#FFD6A5` |
| Mint | `#CAFFBF` |
| Sky | `#9BF6FF` |
| Lavender | `#BDB2FF` |
| Rose | `#FFAFCC` |

---

## Rendering

Labels render as absolutely-positioned divs inside `u-timeline-wrap`, after the events section. Because the canvas row already has CSS `zoom` applied, no special zoom correction is needed in label positioning CSS.

```tsx
{canvasLabels.map((label, i) => (
  <div
    key={i}
    className={`u-canvas-label${selectedLabel === i ? ' u-canvas-label--selected' : ''}`}
    style={{
      left: `${label.x}%`,
      top: `${label.y}px`,
      width: label.width ? `${label.width}px` : undefined,
      background: label.bgColor,
    }}
    onPointerDown={/* drag handler */}
    onClick={e => { e.stopPropagation(); setSelectedLabel(i); }}
    onDoubleClick={e => { e.stopPropagation(); setEditingLabel(i); setShowLabelModal(true); }}
  >
    {label.text}
    {selectedLabel === i && <>{/* resize handles + action buttons */}</>}
  </div>
))}
```

**CSS for `.u-canvas-label`:**
- `position: absolute`
- `padding: 8px 10px`
- `border-radius: 4px`
- `white-space: pre-wrap`
- `min-width: 80px`
- `font-size`: matches anchor label font size
- `cursor: move`
- No border

**CSS for `.u-canvas-label--selected`:**
- Thin outline (e.g. `outline: 2px solid rgba(0,0,0,0.25)`) to indicate selection without adding a permanent border

---

## Interactions

### Drag (move)
Pointer Events capture pattern — same as existing resize handles:

1. `onPointerDown` on the label div: record pointer start position and label's current `x`/`y`; call `e.currentTarget.setPointerCapture(e.pointerId)`.
2. `onPointerMove`: compute delta divided by `zoomRef.current`; apply to DOM element directly (`style.left`, `style.top`) for smooth UX — no React re-render mid-drag.
3. `onPointerUp`: compute final `x` (as % of container width) and `y` (px); persist to `canvasLabels` state via `setCanvasLabels`.

Drag must not trigger on pointer-down events originating from resize handles (use `e.stopPropagation()` on handle `onPointerDown`).

### Resize
Left and right handles — identical structure and logic to state card resize handles:

- `onPointerDown` on handle → capture pointer → track delta / `zoomRef.current`
- Update `width` and `x` (left edge) in sync so the opposite edge stays fixed
- Persist on `pointerup`
- Minimum width: 80px

### Select
- Single click on label → `setSelectedLabel(i)`, `stopPropagation`. Reveals resize handles and action buttons.
- Click on timeline background or another element → `setSelectedLabel(null)`.
- Labels do not stop clicks from reaching connection-mode logic (if `connectingFrom !== null`, click-on-label should be ignored).

### Edit
- Double-click → opens `LabelModal` in edit mode with current `text` and `bgColor`.
- "Edit" action button → same.

### Delete
- "Delete" action button → `setCanvasLabels(prev => prev.filter((_, idx) => idx !== i))`, clear `selectedLabel`.

### Escape key
Add `setSelectedLabel(null)` to the existing `keydown` handler that already clears `selectedEvent` and `connectingFrom`.

---

## Modal (`LabelModal`)

New component following the same structure as `EventModal` and `LayerModal`.

```tsx
<Modal onClose={onClose} title={isEditing ? 'Edit Label' : 'Add Label'} accentColor="var(--btn-column)">
  <label className="u-form-label">Text</label>
  <textarea className="u-form-input" rows={3} value={text}
    onChange={e => setText(e.target.value)} autoFocus />

  <label className="u-form-label">Color</label>
  <div className="u-label-palette">
    {LABEL_COLORS.map(({ hex, name }) => (
      <button key={hex} title={name}
        className={`u-label-swatch${bgColor === hex ? ' u-label-swatch--active' : ''}`}
        style={{ background: hex }}
        onClick={() => setBgColor(hex)}
      />
    ))}
  </div>

  <button className="u-btn u-btn--event u-btn--full"
    onClick={handleSave} disabled={!text.trim()}>
    {isEditing ? 'Save Label' : 'Add Label'}
  </button>
</Modal>
```

On save (new label): placed at `x: 10`, `y: topReserveH + 20` — top-left of visible canvas area, immediately draggable into position.

---

## Toolbar Button

Added in the left toolbar group, after the Add Event / Add Anchor buttons, preceded by a `u-toolbar-sep`. Only shown when `viewMode === 'process'`.

```tsx
<button className="u-btn u-btn--column"
  onClick={() => { setEditingLabel(null); setShowLabelModal(true); }}>
  <MSIcon n="sticky_note_2" /> Add Label
</button>
```

---

## Export / Import

`canvasLabels` added to the `exportJSON` data object:

```typescript
const data = {
  version: 5,  // bumped from 4
  layers, layerDescriptions, startYear, endYear,
  events, connections, columns, trends, cuts,
  canvasLabels,         // new
  selectedProfileId,
  layerHeights,
  topicalEvents,
};
```

Import reads it with a safe fallback for older files:

```typescript
setCanvasLabels(Array.isArray(data.canvasLabels) ? data.canvasLabels : []);
```

No migration needed for v4 files — they load with an empty labels array.

---

## Files Changed

| File | Change |
|------|--------|
| `src/ComplexityTimeline.tsx` | All implementation: new type, state, rendering, interactions, modal, toolbar button, export/import |
| `src/understory.css` | New classes: `u-canvas-label`, `u-canvas-label--selected`, `u-label-palette`, `u-label-swatch`, `u-label-swatch--active` |

No new files required beyond this spec.
