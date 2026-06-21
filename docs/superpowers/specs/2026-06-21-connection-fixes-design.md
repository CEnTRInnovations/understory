# Design: Connection Fixes & PNG Transparency
**Date:** 2026-06-21  
**File:** `src/ComplexityTimeline.tsx`

---

## 1. Recalculate connections when switching Card ↔ Strand view

### Root cause
In card mode, `getEventPos(i)` reads actual rendered dimensions from `cardRefs.current[i]` (offsetWidth / offsetHeight). When `displayMode` changes, React renders with the new mode but the DOM hasn't committed yet — so `cardRefs` entries are still null (strand elements just unmounted) during the first render. Connections fall back to the fixed constants `CONNECTOR_HALF_WIDTH` and `EVENT_CARD_HALF_HEIGHT` instead of real card geometry.

### Fix: `useLayoutEffect` + forced re-render
```tsx
const [, forceReflow] = useReducer(x => x + 1, 0);
useLayoutEffect(() => { forceReflow(); }, [displayMode]);
```

After `displayMode` changes and the commit phase runs (new elements mounted, `cardRefs` populated), `useLayoutEffect` fires synchronously — before the browser paints. `forceReflow()` triggers one extra render that reads the now-correct refs. The user sees zero intermediate state.

**Scope:** 2 lines added near the other `useReducer`/`useEffect` hooks in `ComplexityTimeline`.

---

## 2. Bezier connector curves 20% darker in Strand view

### Color change
| | Hex | RGB |
|---|---|---|
| Current | `#9E9B96` | rgb(158, 155, 150) |
| 20% darker (×0.8 per channel) | `#7E7C78` | rgb(126, 124, 120) |

### Touch points
1. **DOM path** (~line 1741): `stroke={displayMode === 'strands' ? '#9E9B96' : conn.color}`  
   → change to `'#7E7C78'`

2. **Canvas path** in `drawStrandsMode` (~line 1269): `ctx.strokeStyle = '#9E9B96'`  
   → change to `'#7E7C78'`

No opacity or strokeWidth changes needed.

---

## 3. Transparent PNG export background

### Change
Remove the two `ctx.fillRect` background fills in `exportPNG`. Canvas pixels start as `rgba(0,0,0,0)` and PNG natively supports alpha — no further changes needed.

**Native-scale path** (~line 1371):
```ts
// Remove:
ctx.fillStyle = '#F6F2E7';
ctx.fillRect(0, 0, rect.width, rect.height);
```

**Ratio-profile path** (~line 1400):
```ts
// Remove:
ctx.fillStyle = '#F6F2E7';
ctx.fillRect(0, 0, targetW, targetH);
```

The letterbox padding areas also become transparent, consistent with the intent ("background is transparent").

---

## 4. Trend Band Layout Redesign

### Register order (top → bottom)
```
┌──────────────────────────────┐  ← COLUMN_HEADER_H (26px)
│  Column headers              │
├──────────────────────────────┤  ← TREND_REGISTER_H (20px)
│  Trend bands                 │
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤  ← 0.5px hairline separator
│                              │
│  Event content zone          │  ← layers.length * layerHeight
│                              │
├──────────────────────────────┤  ← 48px year axis
│  Timeline axis               │
└──────────────────────────────┘
```

### New layout constants
```ts
const COLUMN_HEADER_H   = 26;   // px — dedicated column label row
const TREND_BAND_H      = 14;   // px — uniform band height
const TREND_REGISTER_H  = 20;   // px — band + 3px top/bottom padding
const TOP_RESERVE_H     = COLUMN_HEADER_H + TREND_REGISTER_H; // 46px
```

### Column headers
- Move column labels out of the `u-col-annotation` stripe and into a dedicated `u-col-header-row` div at the very top of the timeline canvas (`position: absolute; top: 0; height: COLUMN_HEADER_H`).
- The `u-col-annotation` background stripe still spans the full canvas height (including below the header row), but its label element is removed — replaced by entries in `u-col-header-row`.
- Labels remain center-anchored within their column span, as today.

### Trend bands
- **Position:** `top: COLUMN_HEADER_H + (TREND_REGISTER_H - TREND_BAND_H) / 2` — vertically centered in the trend register row.
- **Opacity:** 0.30 (down from 0.85). All bands share the same single row height; temporal overlap is expected and readable at 30%.
- **Label:** Left-anchored, 4px inset from the band's left edge. Font size 10px.
- **Label color:** Darkest stop of the band's own color family — computed by converting `trend.color` to HSL, clamping lightness to 20%, and converting back to hex. This ensures legibility against the parchment background (`#F6F2E7`) through the low-opacity band.
- **No staggering:** All bands at uniform `top` regardless of index. Bands that overlap temporally overlap visually (acceptable at 30% opacity).

```ts
// Dark label color helper (add as module-level function)
function darkestStop(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const s = max === min ? 0 : l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
  let h = 0;
  if (max !== min) {
    if (max === r) h = ((g - b) / (max - min) + 6) % 6;
    else if (max === g) h = (b - r) / (max - min) + 2;
    else h = (r - g) / (max - min) + 4;
    h /= 6;
  }
  // Reconstruct at lightness 0.20
  const L2 = 0.20;
  const q = L2 < 0.5 ? L2 * (1 + s) : L2 + s - L2 * s;
  const p = 2 * L2 - q;
  const hue2rgb = (t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${toHex(hue2rgb(h + 1/3))}${toHex(hue2rgb(h))}${toHex(hue2rgb(h - 1/3))}`;
}
```

### Separator rule
- `position: absolute; top: TOP_RESERVE_H; left: 0; right: 0; height: 0; border-top: 0.5px solid rgba(62,59,53,0.18)` — a CSS class `u-content-separator`.

### Event content zone — coordinate shift
All elements currently positioned relative to the top of the timeline canvas must add `TOP_RESERVE_H` to their `top` values:

| Element | Current `top` | New `top` |
|---|---|---|
| Event cards / dots | `layer * layerHeight + yOffset` | `TOP_RESERVE_H + layer * layerHeight + yOffset` |
| Layer row dividers | `i * layerHeight` | `TOP_RESERVE_H + i * layerHeight` |
| SVG overlay | same size; strand line y-values shift +`TOP_RESERVE_H` |

`timelineHeight` grows by `TOP_RESERVE_H`:
```ts
const timelineHeight = TOP_RESERVE_H + (layers.length > 0 ? layers.length * layerHeight + 48 : 280);
```

### Click / drag coordinate adjustment
Any handler that converts a raw `clientY - rect.top` into a layer+yOffset must subtract `TOP_RESERVE_H` before dividing by `layerHeight` (lines ~966–971, ~1019–1023):
```ts
const rawY = e.clientY - rect.top;
const y = rawY - TOP_RESERVE_H;   // ← new
const layer = Math.floor(y / layerHeight);
```

### `getEventPos` adjustment
```ts
const top = TOP_RESERVE_H + ev.layer * layerHeight + ev.yOffset;
```

### Canvas rendering (`drawCardsMode` / `drawStrandsMode`)
Both canvas draw functions receive the full canvas dimensions and compute positions from scratch. Each needs:
- Trend bands drawn at `y = COLUMN_HEADER_H + (TREND_REGISTER_H - TREND_BAND_H) / 2` (not at the bottom).
- Column labels drawn at `y = COLUMN_HEADER_H / 2` (vertically centered in the header row).
- All event/strand y-values offset by `TOP_RESERVE_H`.
- Separator drawn as a horizontal line at `y = TOP_RESERVE_H` with 0.5px stroke, `rgba(62,59,53,0.18)`.
- Background fill removed (see Feature 3 — transparent PNG).

### Applies to both Card and Strand modes
The register order is the same in both modes. Strand mode additionally shows the horizontal strand guide lines starting at `TOP_RESERVE_H + layerIdx * layerHeight + layerHeight / 2`.

---

## Summary

| Feature | Primary files | Scope |
|---|---|---|
| View-switch connection recalculation | `ComplexityTimeline.tsx` | +2 lines |
| 20% darker strand bezier curves | `ComplexityTimeline.tsx` | 2 lines |
| Transparent PNG background | `ComplexityTimeline.tsx` | 4 lines removed |
| Trend band layout redesign | `ComplexityTimeline.tsx`, `understory.css` | ~60 lines changed |
