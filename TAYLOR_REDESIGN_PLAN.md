# Understory: Taylor-Strand Redesign + Save/Load/Export Split

A plan for Claude Code. Grounded in the current single-file implementation at
`src/ComplexityTimeline.tsx` (React + TS, Canvas 2D PNG export, JSON
serialize/import). Understory is a general-purpose authoring tool — every
change below must work for arbitrary user-entered `layers`/`events`/
`connections`/`trends`/`columns`/`cuts`, not just the IUPUI dataset used to
validate the design.

Reference exemplar: Peter Taylor, *Unruly Complexity*, fig. 5.6 — continuous
horizontal strand per category, unboxed labels set directly on the line,
sparse uniform dotted cross-strand connectors, coarse era axis.

---

## 0. Design stance: render mode, not a rewrite

Don't replace the existing "card" rendering — add a second `displayMode`.
Existing saved timelines (and users who like the boxed-card look) shouldn't
break.

```ts
type DisplayMode = 'cards' | 'strands';
const [displayMode, setDisplayMode] = useState<DisplayMode>('cards');
```

Persist `displayMode` in the save file (bump `TIMELINE_FILE_VERSION` to `3`,
default to `'cards'` on import for older files so nothing regresses). Add a
toggle in the toolbar (two-state pill button, near the Width/Height sliders).

Everything below describes the `'strands'` branch. The `'cards'` branch stays
exactly as it is today.

---

## 1. Strand rendering (live DOM + mirrored in `exportPNG`)

### 1.1 Layer strands
Currently each layer is a gutter with a left-aligned label and a divider line
(JSX ~1304+). In `strands` mode, render one continuous horizontal `<line>`
(SVG overlay, same layer as the connections SVG used for `getConnectorGeometry`
curves) running the full `canvasWidth` at the vertical center of each layer
band, capped with a small arrowhead at the right end (process-continues
semantic). Reuse the existing per-layer color if set, else a neutral ink
(`#3E3B35`, matching current `borderColor` default).

### 1.2 Event labels
Replace `u-event-card` rendering for this mode: no box, no `background`/
`borderColor` fill — render `event.label` as plain text positioned just above
or below the strand line at `event.x`. Alternate above/below per event index
within a layer to reduce collision (this is what the Taylor figure does, and
what the SVG mockup proved out against the real 26-event dataset). Keep
`event.style === 'italic'` as the existing emphasis toggle — it already exists
in the schema (line ~1531) and maps cleanly here (Taylor uses italics for a
parallel sub-strand category, which is a nice free mapping).

`event.color`/`event.borderColor` become *text* color in this mode rather than
fill/border — don't drop the fields from the schema, just reinterpret them per
mode. `event.yOffset` (currently px-within-band drag position) becomes the
above/below + distance-from-strand offset; clamp via the existing
`clampYOffset` (line 268) logic, just renormalized around the strand's
center instead of the band's top.

Collision handling: since this is a general tool, users will enter dense data.
Add a simple greedy label-collision pass (sort events on a strand by `x`,
nudge alternating above/below, and if two adjacent same-side labels would
overlap horizontally, stagger their vertical offset by one more step). This
doesn't need to be perfect — just prevent literal text overlap on typical
datasets.

### 1.3 Connections
One uniform connector style for `strands` mode regardless of the per-connection
`color`/`lineStyle`/`width`/`showArrow` fields the user set for `cards` mode:
thin (`1px`), dotted, neutral gray, no arrowhead. Keep using
`getConnectorGeometry` for the anchor math (it already supports `fromSide`/
`toSide`), just override the stroke styling at render time when
`displayMode === 'strands'`. Don't strip the per-connection styling fields
from the schema — they're still meaningful in `cards` mode and switching back
should restore them.

### 1.3a Overlapping connectors

Sparse, curated data (Taylor's own figure) won't stress this, but Understory
is general-purpose — real datasets will have enough cross-strand connections
to recreate the original messy-arrows problem if connectors are routed
independently. Address in this order, each cheap relative to the last:

1. **Weight before geometry.** Render strand-mode connectors at low opacity
   (~30–40%) and 1px width. At that weight, a dozen crossing lines read as
   texture rather than clutter — try this against the IUPUI dataset before
   building anything else, it may be sufficient on its own.
2. **Curvature discipline.** `getConnectorGeometry`'s bezier control points
   currently follow side/auto-side logic per connector, which is what produced
   the crossing-diagonal look in the original card-mode rendering. In strand
   mode, constrain curvature by topology instead: a connector from a higher
   strand to a lower one always bows toward the midpoint between the two
   strands (never toward either endpoint's own strand), so multiple connectors
   in the same region form a family of parallel arcs rather than independent
   crossing paths.
3. **Anchor spreading.** Where multiple connections land on the same event or
   the same point along a strand, offset their anchor x-positions slightly
   (±3–4px per additional connector at that point) instead of stacking them
   exactly — directly fixes the convergent-arrows failure mode from the
   original node-graph rendering.
4. **Hover/select isolation.** No static layout fully resolves overlap once a
   dataset is dense enough — sidestep it interactively. On hover/click of an
   event in strand mode, dim all connectors except that event's to ~15%
   opacity. The click/select state already exists for editing, so this is a
   small addition, not new infrastructure. This is the real answer for dense
   real-world data, as opposed to curated figure data.

### 1.4 Columns (era bands)
Keep as-is — lightweight header label + vertical divider already matches the
Taylor grammar. No change needed beyond making sure column dividers render
above/behind the strand lines correctly (z-order: columns → strands →
connections → labels).

### 1.5 Trends
Currently bottom-stacked colored rectangles with centered white labels
(`exportPNG` lines ~1133+, mirrored in DOM). In `strands` mode, re-render as
nested/stacked duration bars read top-to-bottom as cumulative commitments:
sort `trends` by `startYear` ascending, stack thin bars (e.g. 14px tall, 4px
gutter) below the lowest strand, each spanning `startYear`→`endYear`, with the
label set inline at the bar's left edge rather than centered. This is a
styling change only — the 6-trend cap (`trends.length`/6 in the toolbar) and
data shape don't need to change.

### 1.6 Cuts (axis breaks)
Keep the existing double-diagonal-slash convention — it already reads
correctly in both modes. Add a small `title`/tooltip on hover stating "no
events recorded in this range" so users are prompted to confirm that's the
right historiographical claim before they ship a cut. This is cheap and
addresses the methodological caveat raised during design review without
adding new data fields.

### 1.7 Mirror in `exportPNG`
`exportPNG` (lines ~1016–1182) manually redraws everything via Canvas 2D. Add
a parallel branch keyed on `displayMode`: `drawCardsMode(ctx, ...)` (existing
logic, lightly refactored into its own function) and `drawStrandsMode(ctx,
...)` (new, mirrors 1.1–1.6). Don't try to unify them into one code path —
they diverge enough in geometry that a single parameterized function would be
harder to maintain than two clear ones.

---

## 2. Toolbar: split Export into Save / Load / Export

Current state: one "Export" button (`u-export-wrap`) opens a dropdown with
"Save as JSON", "Export as PNG", "Load JSON…" (JSX ~1226–1260).

Replace with three flat toolbar buttons, no dropdown for save/load:

- **Save** (`Download` icon, relabel) → calls `exportJSON()` directly, no menu.
- **Load** (new icon, e.g. `Upload` from lucide-react) → calls
  `triggerImportJSON()` directly, no menu.
- **Export** (keep `Download` icon, or use `Image` from lucide-react to
  visually distinguish from Save) → opens a dropdown/panel, but now scoped
  purely to *image* export options (section 3 below), not file I/O.

This removes the conceptual overload where "Export" meant both "save my
project" and "render an image" — Save/Load are project-file actions, Export is
strictly an image-rendering action.

---

## 3. Export ratio presets

Add a presets list and let the Export panel pick one, which sets the
`exportPNG` canvas's target aspect ratio and a couple of layout knobs tuned
for that ratio (axis label size, trend bar height, margin). Don't tie this to
`canvasWidth`/`layerHeight` (those stay the user's live-canvas controls) —
compute presets as a *post-process crop/letterbox* of the rendered scene at
export time, since the live timeline's natural aspect ratio is usually much
wider than any of these targets.

```ts
type ExportProfile = {
  id: string;
  label: string;
  ratio: number;       // width / height
  pxWidth: number;      // render target before scale
  fontScale: number;    // multiplier on base 12px label size
};

const EXPORT_PROFILES: ExportProfile[] = [
  { id: 'slide-16x9',   label: 'Slide (16:9)',           ratio: 16/9,  pxWidth: 1920, fontScale: 1.0 },
  { id: 'tabloid-land', label: 'Tabloid landscape (11×17)', ratio: 17/11, pxWidth: 3400, fontScale: 1.0 },
  { id: 'letter-land',  label: 'Letter landscape (11×8.5)', ratio: 11/8.5, pxWidth: 3300, fontScale: 1.0 },
  { id: 'letter-port',  label: 'Letter portrait (8.5×11)',  ratio: 8.5/11, pxWidth: 2550, fontScale: 0.85 },
  { id: 'book-6x9',     label: 'Book trim (6×9)',         ratio: 6/9,   pxWidth: 1800, fontScale: 0.75 },
  { id: 'book-7x10',    label: 'Book trim (7×10)',        ratio: 7/10,  pxWidth: 2100, fontScale: 0.8 },
  { id: 'native',       label: 'Native canvas ratio',     ratio: 0,     pxWidth: 0,    fontScale: 1.0 }, // current behavior
];
```

Portrait profiles (letter, book trims) are a poor fit for a wide chronological
strand — flag this in the UI copy itself rather than silently degrading: when
a portrait profile is selected and the live canvas's computed ratio is more
than, say, 2.5× the target ratio, show an inline note ("This timeline is much
wider than tall — consider Slide or Tabloid for full legibility, or use Cuts
to shorten the visible range before exporting portrait.") rather than a modal
that blocks the export.

Implementation: `exportPNG(profile: ExportProfile)` computes target
`canvasEl.width/height` from `profile.pxWidth` and `profile.ratio` (or, for
`'native'`, keep today's `rect.width/height * scale` behavior), scales font
sizes by `profile.fontScale`, and either letterboxes (pads with background
color) or crops-to-fit depending on whether the live content is wider or
taller than the target — pick letterbox-by-default since cropping risks
cutting off real data, and surface a "crop instead" checkbox for users who
specifically want a tight fit.

---

## 4. File extension: recommend `.und`, with one caveat

`.und` is a good choice — short, mnemonic, low collision risk (not already a
common extension in creative/research-adjacent tooling), and it cleanly
signals "this is an Understory project file, open it in Understory" the way
`.fig`/`.sketch`/`.psd` do for their tools.

Implementation notes:

- Keep the file *content* as JSON (no format change) — `.und` is just the
  extension/MIME convention layered on top of the existing
  `JSON.stringify(data, null, 2)` payload from `exportJSON()`. This costs
  nothing and keeps the format inspectable/diffable/git-friendly, which
  matters for a research tool where people may version-control their
  timelines.
- Update `exportJSON()`'s filename from `understory-timeline.json` to
  `understory-timeline.und`.
- Update the hidden file input's `accept` attribute (currently
  `.json,application/json`) to `.und,.json,application/json` — keep `.json`
  accepted indefinitely so existing exported files and hand-edited JSON still
  load. Don't make `.und` exclusive.
- In `handleImportFile`, no parsing change needed (it's the same JSON), just
  confirm the validation path (`Array.isArray(data.layers)` check, ~line 977)
  doesn't gate on file extension at all today — it doesn't, so this is
  additive only.
- Bump `TIMELINE_FILE_VERSION` to `3` for this change set (combined with the
  `displayMode` field from §0) and add `data.version < 3` handling in
  `handleImportFile` to default `displayMode` to `'cards'` for anything saved
  before this change.
- Optional, low priority: a tiny `und://` file-association story isn't worth
  building (no desktop install story for a Vite SPA), so don't pursue OS-level
  file association — the extension is a convention for users/Finder icons,
  not a registered handler.

---

## 5. Suggested sequencing for Claude Code

1. Add `TIMELINE_FILE_VERSION = 3`, `displayMode` field + toggle, version-gated
   import defaulting. Verify Save/Load round-trip still works for both old and
   new files before touching rendering.
2. Split toolbar Export into Save/Load/Export per §2. Verify file I/O behavior
   is unchanged (same `exportJSON`/`handleImportFile` calls, just relabeled
   entry points).
3. Rename save filename + accept attribute to `.und` per §4.
4. Build `strands` mode for live DOM rendering only (§1.1–1.6), gated behind
   the toggle, leaving `exportPNG` untouched and pointed at `cards` mode
   regardless of toggle state. Validate visually against the IUPUI dataset
   (26 events, 3 layers, 6 trends, 1 cut) — this is the dataset and density
   that motivated the redesign, so it's the right regression check.
5. Mirror `strands` mode into `exportPNG` (§1.7).
6. Add export profiles + ratio panel (§3). Validate at least one portrait and
   one landscape profile against the same dataset to confirm the
   too-wide-for-portrait warning triggers appropriately.

Each step is independently shippable — recommend committing after each.
