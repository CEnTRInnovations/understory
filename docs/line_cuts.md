# AI Engineering Task: Implement Connection Line "Cuts" & UI Styling Upgrades

## 🎯 Objective
Modify the `ComplexityTimeline` component to implement visual connection line "cuts" (overlapping lines dipping underneath foreground paths) using the dual-stroke SVG halo technique. Additionally, update the application canvas styling and export layers to match the cream-and-teal aesthetic observed in production (`Screenshot 2026-06-23 at 10-28-20 Understory — Living Timeline.jpg`).

---

## 🔍 Existing Code Analysis Alignment
The codebase in `ComplexityTimeline.tsx` manages connection arrays via the `connections` state tracking the `Connection` type (`from`, `to`, `color`, `lineStyle`, `width`, `showArrow`) and maps them directly within an `<svg>` workspace block usingbezier paths derived from `getEventPosition()`. The export systems (`exportAsPNG` and `exportAsPDF`) use an HTML5 Canvas context (`ctx`) to draw parallel configurations.

---

## 🛠 Required Changes

### 1. Update Core UI Palette Constants
Add a unified background theme constant matching the production aesthetic near the top of the file or just inside the component:
```typescript
const BG_COLOR = "#f4ede2"; // Cream canvas color

```

* Update the main timeline workspace background containers away from generic `bg-white` or transparent issues to utilize this theme base.

### 2. Implement SVG "Dual-Stroke" Halo Effect for Line Cuts

Locate the `connections.map` block inside the `<svg>` rendering node of the `ComplexityTimeline` component. Wrap the output in an SVG group (`<g>`) and implement a background-colored "halo mask" stroke directly behind the visible line to dynamically create line cuts:

```tsx

{connections.map((conn, i) => {
  const from = getEventPosition(conn.from);
  const to = getEventPosition(conn.to);

  // Determine which side each event should connect from
  const fromSide = from.x < to.x ? 'right' : 'left';
  const toSide = from.x < to.x ? 'left' : 'right';

  // Calculate connection points on the sides of events
  const eventWidth = 60; // half the approximate event width
  const fromX = fromSide === 'right' ? from.x + eventWidth : from.x - eventWidth;
  const toX = toSide === 'left' ? to.x - eventWidth : to.x + eventWidth;
  const fromY = from.y;
  const toY = to.y;

  // Calculate control points for S-curve
  const dx = toX - fromX;
  const cx1 = fromX + dx * 0.5;
  const cy1 = fromY;
  const cx2 = fromX + dx * 0.5;
  const cy2 = toY;

  const path = `M ${fromX} ${fromY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${toX} ${toY}`;

  return (
    <g key={`connection-group-${i}`}>
      
      <path
        d={path}
        stroke={BG_COLOR}
        strokeWidth={(conn.width || 2) + 4} // Always 4px wider than the visible line
        fill="none"
      />
      
      
      <path
        d={path}
        stroke={conn.color || '#2b4c59'} // Defaulting to the deep teal theme color
        strokeWidth={conn.width || 2}
        strokeDasharray={
          conn.lineStyle === 'dashed' ? '5,5' :
          conn.lineStyle === 'dotted' ? '2,3' : '0'
        }
        fill="none"
        markerEnd={conn.showArrow ? `url(#arrowhead-${i})` : 'none'}
      />
    </g>
  );
})}

```

### 3. Synchronize Canvas Exports (`exportAsPNG` & `exportAsPDF`)

To ensure downloaded files preserve the visual line cuts exactly as seen on screen, update both the `exportAsPNG` and `exportAsPDF` functions.

Locate the `connections.forEach` blocks inside both functions and replace the line drawing sequence to duplicate the path strokes sequentially:

```typescript
// Canvas Export Connection Upgrade (Apply to both PNG and PDF export functions)
connections.forEach(conn => {
  const from = getEventPosition(conn.from);
  const to = getEventPosition(conn.to);

  const fromSide = from.x < to.x ? 'right' : 'left';
  const toSide = from.x < to.x ? 'left' : 'right';

  const eventWidth = 60;
  const fromX = fromSide === 'right' ? from.x + eventWidth : from.x - eventWidth;
  const toX = toSide === 'left' ? to.x - eventWidth : to.x + eventWidth;
  const fromY = from.y;
  const toY = to.y;

  const dx = toX - fromX;
  const cx1 = fromX + dx * 0.5;
  const cy1 = fromY;
  const cx2 = fromX + dx * 0.5;
  const cy2 = toY;

  // Set line properties common to both passes
  if (conn.lineStyle === 'dashed') {
    ctx.setLineDash([5, 5]);
  } else if (conn.lineStyle === 'dotted') {
    ctx.setLineDash([2, 3]);
  } else {
    ctx.setLineDash([]);
  }

  // PASS 1: DRAW THE CUT MASK
  ctx.strokeStyle = '#f4ede2'; // Matches cream background
  ctx.lineWidth = (conn.width || 2) + 4;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.bezierCurveTo(cx1, cy1, cx2, cy2, toX, toY);
  ctx.stroke();

  // PASS 2: DRAW THE ACTUAL VISIBLE CONNECTION LINE
  ctx.strokeStyle = conn.color || '#2b4c59';
  ctx.lineWidth = conn.width || 2;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.bezierCurveTo(cx1, cy1, cx2, cy2, toX, toY);
  ctx.stroke();

  // Draw arrowhead cleanly on top of both layers
  if (conn.showArrow) {
    const angle = Math.atan2(toY - cy2, toX - cx2);
    ctx.fillStyle = conn.color || '#2b4c59';
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - 10 * Math.cos(angle - Math.PI / 6), toY - 10 * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - 10 * Math.cos(angle + Math.PI / 6), toY - 10 * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  }
});

```

* Additionally, ensure that the background fills at the top of these export blocks clear to the theme canvas (`ctx.fillStyle = '#f4ede2';`) instead of raw `white`.

---

## 🏁 Claude Code Verification Steps

* [ ] Verify compilation passes with the new SVG grouping wrapper layout.
* [ ] Confirm intersecting curves generate clean, native-looking overlapping visual gaps on the UI canvas.
* [ ] Run a sample PNG and PDF export check to confirm that background lines do not bleed through foreground nodes in the final document download.
