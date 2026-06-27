# Anchors & States Design Spec

**Date:** 2026-06-27
**Scope:** Add two distinct event types (`state` and `anchor`) to `ComplexityTimeline`, remove strands mode.

---

## Overview

Currently every timeline event renders as a bordered box card. This spec introduces two visual variants that match the layered-process map convention:

- **State** — a resizable bordered rectangle representing a continuing condition or process; sits at the top of a layer band
- **Anchor** — a dot + year + label representing a point-in-time moment; sits below states within a layer band

Both types share the same `events` array and connection system. Strands mode is removed as part of this work.

---

## 1. Data Model

Add two fields to `TimelineEvent`:

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
  type: 'state' | 'anchor';  // new — defaults to 'state' when absent in saved files
  width?: number;             // new — states only; px; undefined = auto-size to content
};
```

**Backward compatibility:** When loading a saved file, any event missing `type` is treated as `'state'`. This preserves the visual appearance of all existing diagrams — existing box cards remain box cards.

`width` is only written when the user has manually resized a state. Absent means `width: auto` (CSS).

`Connection` is unchanged — `from` and `to` remain plain indices into `events`.

---

## 2. Strands Mode Removal

Strands mode is removed entirely. Deletions include:

- `displayMode` state and its toggle button/UI
- The strands rendering branch inside the SVG connections map (`displayMode === 'strands'` guards)
- `drawStrandsMode` canvas function
- All `u-strand-*` CSS classes and rules
- The `displayMode !== 'strands'` guards on the connection halo paths (halos become unconditional)

Cards mode becomes the only rendering mode.

---

## 3. Rendering — Cards Mode

### States

- Render using the existing `u-event-card` box: bordered rectangle, background fill, centered label text
- `yOffset` defaults to `0` for new states so they snap to the top of the layer band
- Width: `width: auto` when `event.width` is undefined; `width: {event.width}px` when set
- A resize handle (thin vertical bar, full card height, visible on hover) sits on the right edge
- Connection anchor dots appear on all four edges, same as today

### Anchors

- No box. Renders as:
  1. Filled circle dot, 12px diameter, `event.color` fill, centered at the event x position
  2. Year in small bold text, centered below the dot
  3. Label in normal-weight text, centered below the year, wrapping at ~130px
- Same drag behavior as states (the whole `u-event-node` is draggable)
- Connection anchor dots appear on left and right edges of the text block only

---

## 4. State Resize Handle

A `4px`-wide vertical drag grip on the right edge of each state card, visible on hover.

Interaction:
- `pointerdown` on the handle captures the starting x position and current width (falling back to `130px` if `event.width` is undefined)
- `pointermove` computes delta from start x, applies to initial width, clamped to min `80px`
- `pointerup` finalizes and writes `event.width` to state
- During resize, `pointer-events: none` is set on the card body to prevent selection interference

The handle sits inside `u-event-node` so it does not interfere with connection anchor dots.

---

## 5. Creation Flow

The existing "Add Event" button is replaced by two buttons:

**"Add State"** — opens `EventModal` with:
- Label, Year, Layer, Color, Border Color, Style (normal/italic)
- `type` pre-set to `'state'`
- No width field (set via canvas resize handle)

**"Add Anchor"** — opens `EventModal` with:
- Label, Year, Layer, Color (dot + text color)
- `type` pre-set to `'anchor'`
- No border color field

Both creation and editing (double-click) use the same `EventModal` component. Fields are conditionally shown based on `type`. No new component is needed.

---

## 6. Canvas Export

`drawCardsMode` gains a type branch per event:

**States** — unchanged: filled rectangle with border stroke, centered label text.

**Anchors** — three draw calls:
1. Filled `arc` at event x/y, radius 6px, `event.color`
2. Year as bold text below dot, centered
3. Label as normal-weight text below year, centered, wrapping at ~130px

**Connection geometry:** `getEventPos` returns the dot center `(x, y)` for anchor types. `getConnectorGeometry` and the halo system need no changes — they already operate on whatever coordinates `getEventPos` provides.

---

## 7. Out of Scope

- Automatic enforcement of "states always at top" — yOffset defaults to 0 for new states but is not locked
- PDF export changes (no canvas drawing changes beyond what `drawCardsMode` already serves)
- Anchor-specific connection styling
