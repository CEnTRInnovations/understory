# ComplexityTimeline.tsx — Claude Code Instructions
## Arrow Fix (Swim-Lane View) + Card View Restyling

---

## P0 — Fix Arrow Coordinate Calculation (Swim-Lane Layout)

### Problem

`getEventPosition` (line 564) calls `timelineRef.current.getBoundingClientRect()` to convert `event.x` percentages into pixel coordinates for SVG path drawing. In the card layout this works because the timeline fills the viewport predictably. In the swim-lane / tall layout, scroll offset and viewport shifts cause `getBoundingClientRect()` to return values that diverge from the SVG's internal coordinate space, producing arrows that point to empty space.

### Fix: Replace `getBoundingClientRect` with `offsetWidth`

```tsx
// BEFORE (line 564–577)
const getEventPosition = (eventIndex: number) => {
  const event = events[eventIndex];
  if (!event) return { x: 0, y: 0 };
  const rect = timelineRef.current?.getBoundingClientRect();
  if (!rect) return { x: 0, y: 0 };

  const centerX = (event.x / 100) * rect.width;
  const centerY = event.layer * layerHeight + 50;

  return { x: centerX, y: centerY };
};

// AFTER
const getEventPosition = (eventIndex: number) => {
  const event = events[eventIndex];
  if (!event) return { x: 0, y: 0 };
  const el = timelineRef.current;
  if (!el) return { x: 0, y: 0 };

  // offsetWidth is unaffected by scroll position or viewport shifts
  const centerX = (event.x / 100) * el.offsetWidth;
  const centerY = event.layer * layerHeight + 50;

  return { x: centerX, y: centerY };
};
```

### Fix: Allow SVG overflow for cross-layer arrows

Add `overflow: visible` to the SVG element (line 663–667) so arrows are not clipped when they cross layer boundaries in a tall layout:

```tsx
// BEFORE
<svg
  ref={svgRef}
  className="absolute inset-0 pointer-events-none"
  style={{ width: '100%', height: '100%' }}
>

// AFTER
<svg
  ref={svgRef}
  className="absolute inset-0 pointer-events-none"
  style={{ width: '100%', height: '100%', overflow: 'visible' }}
>
```

### Scope note

The same `getBoundingClientRect` pattern appears in `exportAsPNG` and `exportAsPDF` (lines ~139, ~319). Those are intentionally left as-is — they run at export time when the element is fully settled in the DOM and scroll position is irrelevant to canvas rendering.

---

## P1 — Card View Restyling (Understory Parchment Aesthetic)

### Goal

Align the default card rendering with Understory's established visual identity: Alegreya typography, warm parchment palette, archival stratigraphy sensibility. These are non-breaking aesthetic changes that can be applied independently of the arrow fix.

### 1. Event card default colors

In `EventModal` (line 970–971), change the default color values so new events start on-brand without manual color selection:

```tsx
// BEFORE
const [color, setColor] = useState(initialData?.color || '#ffffff');
const [borderColor, setBorderColor] = useState(initialData?.borderColor || '#333333');

// AFTER
const [color, setColor] = useState(initialData?.color || '#fdf8f0');
const [borderColor, setBorderColor] = useState(initialData?.borderColor || '#8B7355');
```

### 2. Event card typography and styling

In the event card render block (line 802–809), update the style prop:

```tsx
// BEFORE
style={{
  backgroundColor: event.color || '#fff',
  borderColor: event.borderColor || '#333'
}}

// AFTER
style={{
  backgroundColor: event.color || '#fdf8f0',
  borderColor: event.borderColor || '#8B7355',
  fontFamily: "'Alegreya', Georgia, serif",
  fontSize: '11px',
  lineHeight: '1.4',
  letterSpacing: '0.01em'
}}
```

Also change `rounded` to `rounded-sm` on the same div for a crisper, more document-like card edge.

### 3. Layer label styling

In the layer label div (line 752), replace:

```tsx
// BEFORE
className="absolute left-2 top-2 font-semibold text-sm text-gray-700 max-w-[150px] leading-tight"

// AFTER
className="absolute left-2 top-2 font-semibold text-xs text-stone-600 tracking-widest uppercase max-w-[150px] leading-tight"
```

This gives layer labels an archival, stratigraphy-column feel rather than a generic sidebar label.

### 4. Trend band styling

In the trend band render (line 854–863), add typography tokens to the style prop:

```tsx
// BEFORE
className="absolute h-6 text-white text-xs flex items-center justify-center opacity-80"

// AFTER
className="absolute h-6 text-white text-xs flex items-center justify-center opacity-70"
style={{
  ...existing styles...,
  fontFamily: "'Alegreya Sans', sans-serif",
  letterSpacing: '0.05em',
  fontSize: '10px'
}}
```

Opacity reduced from `0.80` to `0.70` to match the 30% opacity target in the visual stratigraphy spec.

### 5. Toolbar button palette

Replace the rainbow of button colors (blue/green/purple/orange/indigo) with a unified umber/stone palette. Apply to all toolbar buttons:

```tsx
// BEFORE (varies per button)
className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"

// AFTER (all toolbar buttons)
className="px-3 py-2 bg-stone-700 text-stone-100 rounded-sm hover:bg-stone-800 flex items-center gap-2 text-sm tracking-wide"
```

Export button can retain slight differentiation with `bg-stone-900` to signal it as a terminal action.

### 6. Timeline background

Change the outer wrapper background from `bg-gray-50` to a warm near-white:

```tsx
// BEFORE (line 580)
<div className="w-full h-screen bg-gray-50 flex flex-col">

// AFTER
<div className="w-full h-screen flex flex-col" style={{ backgroundColor: '#f7f3ed' }}>
```

And the inner timeline panel from `bg-white` to parchment:

```tsx
// BEFORE (line 656)
className="relative bg-white border rounded shadow-lg"

// AFTER
className="relative border rounded shadow-lg"
style={{ backgroundColor: '#fdf8f0', borderColor: '#c9b99a' }}
```

---

## Font Loading Note

If Alegreya is not already imported in the Understory app's global CSS or `index.html`, add it:

```html
<link
  href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400;0,600;1,400&family=Alegreya+Sans:wght@400;600&display=swap"
  rel="stylesheet"
/>
```

Or via CSS `@import` in the relevant stylesheet. Alegreya is already in use across the CEnTRInnovations ecosystem so this may already be loaded at the app level — confirm before adding a duplicate import.

---

## Summary of Changes by Priority

| Priority | Change | File Location |
|---|---|---|
| P0 | `getEventPosition` uses `offsetWidth` | line 564 |
| P0 | SVG `overflow: visible` | line 663 |
| P1 | Event card default colors → parchment/umber | line 970–971 |
| P1 | Event card font → Alegreya | line 802–809 |
| P1 | Layer labels → uppercase tracking | line 752 |
| P1 | Trend bands → opacity 70%, Alegreya Sans | line 854 |
| P1 | Toolbar → unified stone palette | line 583–599 |
| P1 | Background → warm parchment | line 580, 656 |
