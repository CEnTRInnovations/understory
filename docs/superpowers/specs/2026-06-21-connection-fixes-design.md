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

## Summary

| Feature | Files | Lines changed |
|---|---|---|
| View-switch recalculation | `ComplexityTimeline.tsx` | +2 |
| 20% darker strand connectors | `ComplexityTimeline.tsx` | 2 |
| Transparent PNG background | `ComplexityTimeline.tsx` | 4 removed |
