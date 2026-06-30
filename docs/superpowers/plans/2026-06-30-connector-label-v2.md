# Connector Label v2 — Column Color Lookup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make canvas labels automatically adopt the background color of whichever column they're positioned over, with a fallback to their user-chosen palette color when no column color is available.

**Architecture:** Two pure utility functions (`resolveColumnColor`, `resolveChipTextColor`) added above the main component compute the label's effective background and text color at render time from `label.x` (%) and the `columns` state. During drag, `onMove` writes these values directly to `el.style` and suppresses CSS transition for zero-lag feedback; `onUp` re-enables the transition so the settle-on-drop color change cross-fades smoothly. No new state, no new files, no new dependencies.

**Tech Stack:** React 18, TypeScript, CSS

## Global Constraints

- Only `src/ComplexityTimeline.tsx` and `src/understory.css` are modified
- No new files, no new dependencies
- `resolveColumnColor` and `resolveChipTextColor` are pure module-level functions inserted after `bezierMidpoint` (~line 255)
- Fallback chain: column color → `label.bgColor` (the user-chosen palette color)
- If neither DARK_TEXT (`#3E3B35`) nor LIGHT_TEXT (`#F4EDE2`) achieves ≥ 4.5:1 contrast against the resolved background, fall back to `label.bgColor` (fixed chip) for background AND text — never render illegible text
- CSS transition on label background/color: `150ms ease` — disabled during pointer drag, re-enabled before `setCanvasLabels` on `pointerup`
- Hysteresis (12px deadzone) is explicitly out of scope for v2; if boundary strobing is observed in practice, implement as a follow-up
- `TIMELINE_FILE_VERSION` does NOT change — no new fields are added to `CanvasLabel`; color resolution is computed at render time, not stored

---

## File Map

| File | Change |
|------|--------|
| `src/ComplexityTimeline.tsx` | Add `resolveColumnColor` + `resolveChipTextColor` pure functions; apply resolved colors in `canvasLabels.map()` render; update drag `onPointerDown` to suppress/restore CSS transition and update color live |
| `src/understory.css` | Add `transition: background-color 150ms ease, color 150ms ease` to `.u-canvas-label` |

---

### Task 1: Pure utility functions + render-time color application + CSS transition

**Files:**
- Modify: `src/ComplexityTimeline.tsx` (after `bezierMidpoint` ~line 255; and in `canvasLabels.map()` render block)
- Modify: `src/understory.css` (`.u-canvas-label` rule)

**Interfaces:**
- Produces: `resolveColumnColor(xPct, columns, yearToPct): string | null` — returns the column's `color` string if `xPct` falls within a column that has a color set, else `null`
- Produces: `resolveChipTextColor(bgHex): string | null` — returns `'#3E3B35'`, `'#F4EDE2'`, or `null` (null = neither candidate clears 4.5:1, caller must use fixed chip fallback)
- Consumes (Task 2): both functions used again inside the drag `onMove` handler

- [ ] **Step 1: Add `resolveColumnColor` after `bezierMidpoint` (~line 256)**

In `src/ComplexityTimeline.tsx`, immediately after the closing `}` of `bezierMidpoint`, insert:

```typescript
// Returns the background color of the column whose [xStart, xEnd) range
// contains xPct (0–100). Returns null if xPct is outside all columns or
// the matching column has no color set.
function resolveColumnColor(
  xPct: number,
  columns: Column[],
  yearToPct: (y: number) => number,
): string | null {
  for (const col of columns) {
    const xStart = yearToPct(col.startYear);
    const xEnd   = yearToPct(col.endYear);
    if (xPct >= xStart && xPct < xEnd) return col.color ?? null;
  }
  return null;
}
```

- [ ] **Step 2: Add `resolveChipTextColor` immediately after `resolveColumnColor`**

```typescript
// Returns the better-contrast text token for a given hex background, or null
// if neither candidate reaches WCAG AA (4.5:1). Caller should fall back to
// the fixed chip palette when null is returned.
function resolveChipTextColor(bgHex: string): string | null {
  const DARK_TEXT  = '#3E3B35';
  const LIGHT_TEXT = '#F4EDE2';
  const MIN_RATIO  = 4.5;

  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  };
  const contrastRatio = (l1: number, l2: number) => {
    const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
    return (hi + 0.05) / (lo + 0.05);
  };

  const bgLum    = luminance(bgHex);
  const darkRat  = contrastRatio(bgLum, luminance(DARK_TEXT));
  const lightRat = contrastRatio(bgLum, luminance(LIGHT_TEXT));

  if (darkRat < MIN_RATIO && lightRat < MIN_RATIO) return null;
  return darkRat >= lightRat ? DARK_TEXT : LIGHT_TEXT;
}
```

- [ ] **Step 3: Apply resolved colors in `canvasLabels.map()` render**

In `src/ComplexityTimeline.tsx`, find the canvas label render block (the `canvasLabels.map((label, i) => (...))` inserted in a previous feature). The outer `<div>` currently has:

```tsx
style={{
  left: `${label.x}%`,
  top: `${label.y}px`,
  ...(label.width ? { width: `${label.width}px` } : {}),
  background: label.bgColor,
}}
```

Replace with:

```tsx
style={(() => {
  const columnBg  = resolveColumnColor(label.x, columns, yearToPct);
  const resolvedBg = columnBg ?? label.bgColor;
  const textColor  = columnBg ? (resolveChipTextColor(resolvedBg) ?? null) : null;
  // Fall back entirely to fixed chip if contrast fails
  const finalBg   = (columnBg && textColor === null) ? label.bgColor : resolvedBg;
  const finalText = (columnBg && textColor !== null) ? textColor : undefined;
  return {
    left: `${label.x}%`,
    top: `${label.y}px`,
    ...(label.width ? { width: `${label.width}px` } : {}),
    background: finalBg,
    ...(finalText ? { color: finalText } : {}),
  };
})()}
```

- [ ] **Step 4: Add CSS transition to `.u-canvas-label`**

In `src/understory.css`, find `.u-canvas-label` and add `transition` after `z-index`:

```css
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
  transition: background-color 150ms ease, color 150ms ease;
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/jeremy/Projects/understory && npx tsc --noEmit 2>&1 | grep -v TS6133 | head -20
```
Expected: no errors.

- [ ] **Step 6: Smoke test with column colors**

Open the dev server (`npm run dev` in `/Users/jeremy/Projects/understory`). To test:
1. Add a column with a color (e.g. a blue tint via the column edit modal)
2. Add a label — it should immediately use the column's background color when created inside that column's x range
3. Drag the label from inside the column to outside — it should fade back to its palette color (`label.bgColor`)
4. Drag it back inside — it should fade to the column color
5. Add a label where no column is configured — it should use its palette color throughout

- [ ] **Step 7: Commit**

```bash
git -C /Users/jeremy/Projects/understory add src/ComplexityTimeline.tsx src/understory.css
git -C /Users/jeremy/Projects/understory commit -m "feat(label): resolve background color from column position (v2 chip)"
```

---

### Task 2: Drag-time color sync with transition suppression

**Files:**
- Modify: `src/ComplexityTimeline.tsx` — canvas label drag `onPointerDown` handler

**Interfaces:**
- Consumes: `resolveColumnColor`, `resolveChipTextColor`, `columns`, `yearToPct` (all in component scope, captured by the `onPointerDown` closure)

**Why this task is needed:** Without it, label color updates only happen on React re-renders (i.e., after `pointerup`). During drag the label retains its pre-drag color even as it crosses column boundaries. Task 1's CSS transition would animate every re-render but would lag during the drag itself. This task fixes that by mirroring the render-time color logic directly in `onMove`.

- [ ] **Step 1: Update the drag `onPointerDown` handler in the canvas label render block**

In `src/ComplexityTimeline.tsx`, find the `onPointerDown` handler on the outer canvas label `<div>` (begins with `if (connectingFrom !== null) return;`). Locate these three sections and apply the changes below:

**At the top of the handler** — after `const el = e.currentTarget as HTMLElement;`, add:

```typescript
el.style.transition = 'none'; // suppress color cross-fade during active drag
```

**Inside `onMove`** — after the lines that set `el.style.left` and `el.style.top`, add:

```typescript
// Recompute column color live so the chip tracks column boundaries mid-drag
const newX = parseFloat(el.style.left); // already set as "X%" above
const columnBg   = resolveColumnColor(newX, columns, yearToPct);
const resolvedBg = columnBg ?? label.bgColor;
const textColor  = columnBg ? resolveChipTextColor(resolvedBg) : null;
const finalBg    = (columnBg && textColor === null) ? label.bgColor : resolvedBg;
el.style.background = finalBg;
el.style.color      = (columnBg && textColor !== null) ? textColor : '';
```

**Inside `onUp`** — immediately before `el.style.left = ''` and `el.style.top = ''`, add:

```typescript
// Re-enable transition so settle-on-drop color change cross-fades
el.style.transition = '';
el.style.background = '';
el.style.color      = '';
```

The full updated handler body (for clarity — only the highlighted `+` lines are new):

```typescript
onPointerDown={e => {
  if (connectingFrom !== null) return;
  if ((e.target as HTMLElement).closest(
    '.u-canvas-label__resize-handle, .u-canvas-label__actions'
  )) return;
  e.stopPropagation();
  e.preventDefault();
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  const el = e.currentTarget as HTMLElement;
  const containerEl = timelineRef.current;
  if (!containerEl) return;
+ el.style.transition = 'none';
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
+   const newX = parseFloat(el.style.left);
+   const columnBg  = resolveColumnColor(newX, columns, yearToPct);
+   const resolvedBg = columnBg ?? label.bgColor;
+   const textColor  = columnBg ? resolveChipTextColor(resolvedBg) : null;
+   el.style.background = (columnBg && textColor === null) ? label.bgColor : resolvedBg;
+   el.style.color      = (columnBg && textColor !== null) ? textColor : '';
  };
  const onUp = (ue: PointerEvent) => {
    const containerW = containerEl.getBoundingClientRect().width / zoomRef.current;
    const dx = (ue.clientX - startClientX) / zoomRef.current;
    const dy = (ue.clientY - startClientY) / zoomRef.current;
    const newX = Math.max(0, Math.min(100, startX + (dx / containerW) * 100));
    const newY = Math.max(0, startY + dy);
+   el.style.transition = '';
+   el.style.background = '';
+   el.style.color      = '';
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
cd /Users/jeremy/Projects/understory && npx tsc --noEmit 2>&1 | grep -v TS6133 | head -20
```
Expected: no errors.

- [ ] **Step 3: Manual drag test across column boundaries**

Open the app. With a column that has a color set:
1. Add a label inside the column
2. Drag it slowly toward the column boundary — the background should update in real time (no lag) as you cross the boundary
3. Release inside a different column — the label should settle to that column's color with a brief 150ms fade (visible if the colors differ)
4. Release outside all columns — the label fades back to the palette color
5. Test at zoom 150%: confirm colors still update correctly mid-drag (zoom correction is already applied to `dx`/`dy` in the existing handler)

- [ ] **Step 4: Commit**

```bash
git -C /Users/jeremy/Projects/understory add src/ComplexityTimeline.tsx
git -C /Users/jeremy/Projects/understory commit -m "feat(label): update chip color live during drag, suppress transition while dragging"
```

---

## Self-Review

**Spec coverage (Addendum v2 only — v1 fixed chip is pre-existing):**
- ✅ `resolveColumnColor(centerX, columnRanges)` — pure function, uses `yearToPct` to convert column year boundaries to % space, returns `col.color ?? null`, boundary tie-break: `xPct < xEnd` (boundary belongs to column on the right)
- ✅ `resolveChipTextColor(bgHex)` — full WCAG contrast algorithm as specified; returns `null` when neither candidate clears 4.5:1
- ✅ Fallback to `label.bgColor` when `resolveColumnColor` returns `null` (no column / no column color)
- ✅ Fallback to `label.bgColor` when `resolveChipTextColor` returns `null` (contrast failure on midtone column)
- ✅ CSS transition `150ms ease` on background + color
- ✅ Transition suppressed during pointer drag (`el.style.transition = 'none'`)
- ✅ Transition restored on `pointerup` before clearing inline styles (so settle-on-drop fades)
- ✅ Drag-time color updates label background live in `onMove`
- ✅ `TIMELINE_FILE_VERSION` unchanged — no data model change
- ⚠️ **Hysteresis (12px deadzone)** — explicitly deferred. If strobing on rapid narrow-column crossings is observed, implement: track last resolved column index in a `useRef<Map<number, number | null>>` keyed by label index; only commit a column switch when `newX` has moved `(DEADZONE_PX / containerW) * 100` percent past the boundary. Flag for follow-up.

**Placeholder scan:** No TBDs or vague steps found.

**Type consistency:** `resolveColumnColor` takes `Column[]` and `(y: number) => number` — matches `columns` state type and `yearToPct` callback type exactly. `resolveChipTextColor` takes `string` (hex) — all callers pass 6-digit hex strings from `col.color`, `label.bgColor` (both sourced from `<input type="color">` or LABEL_COLORS palette).
