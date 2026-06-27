# Topical Timeline View — Design Spec

**Date:** 2026-06-27  
**Status:** Approved

---

## Overview

Add a `TopicalTimelineView` as a second switchable view inside the Understory app. The view organizes history as era columns, each containing a curated list of major anchor events and an editorial "Main Institutional Shift" summary — matching the visual grammar of the IU Indianapolis Institutional Timeline infographic.

The view is interactive (live data, editable), exports cleanly as PNG/PDF, and shares all state with the existing process view.

---

## 1. Architecture

### New file

`src/TopicalTimelineView.tsx` — a standalone component, ~250–350 lines.

### Integration point

`ComplexityTimeline.tsx` gains a `viewMode` state:

```ts
const [viewMode, setViewMode] = useState<'process' | 'topical'>('process');
```

Two toggle buttons in the existing toolbar switch the mode. When `viewMode === 'topical'`, the canvas area renders `<TopicalTimelineView />` instead of the process canvas. State is preserved on toggle — switching back is instant.

### Props

```ts
type TopicalTimelineViewProps = {
  title: string;
  subtitle?: string;
  eras: Era[];
  anchors: AnchorEvent[];
  printMode?: boolean;
};
```

The component is a `forwardRef` so the existing export toolbar can capture it by ref.

---

## 2. Data Model Changes

### `AnchorEvent` — one new optional field

```ts
icon?: string;  // Phosphor icon name, e.g. "BookOpen", "Star", "Users"
```

Ignored by the process view. Rendered as a Phosphor icon in the topical view.

### `Era.description` — already exists, now surfaced in UI

The existing `description?: string` field on `Era` is used as the "Main Institutional Shift" footer text. The era edit modal (create or update) will expose this field with a label: **"Main institutional shift"** and a hint: *"Shown at the bottom of this era's column in the topical timeline."*

### New dependency

```
@phosphor-icons/react
```

A curated palette of exactly 36 icons is hardcoded in the component. The icon name string is stored on the anchor event; the palette is used only to render the picker UI in the anchor edit modal.

### Curated 36-icon palette

Selected for relevance to institutional/civic/academic history:

```ts
const ICON_PALETTE = [
  "Buildings",         // institution / university
  "BookOpen",          // education / publication
  "Users",             // community / group
  "Star",              // recognition / achievement
  "MapPin",            // place / neighborhood
  "ChartBar",          // assessment / impact
  "Heart",             // philanthropy / care
  "GraduationCap",     // academic / faculty
  "Handshake",         // partnership
  "Megaphone",         // advocacy / announcement
  "Globe",             // urban / civic scope
  "Newspaper",         // publication / journal
  "Certificate",       // accreditation / classification
  "Tree",              // roots / foundation
  "Scales",            // policy / governance
  "Lightbulb",         // initiative / idea
  "Briefcase",         // office / administration
  "FileText",          // document / report / rubric
  "PencilLine",        // scholarship / writing
  "Network",           // infrastructure / system
  "ArrowsCounterClockwise", // realignment / change
  "Toolbox",           // capacity building
  "PresentationChart", // visibility / reporting
  "ClipboardText",     // framework / plan
  "Medal",             // award / honor
  "Link",              // connection / collaboration
  "House",             // neighborhood / home
  "Microphone",        // public voice / event
  "Compass",           // mission / direction
  "Calendar",          // milestone / date
  "Flask",             // research
  "ChalkboardTeacher", // pedagogy / teaching
  "BankNote",          // funding / resource
  "ArrowRight",        // continuation / progress
  "Flag",              // landmark moment
  "Sparkle",           // transformation / impact
];
```

---

## 3. Component Layout

HTML/CSS grid — not SVG. Era columns map naturally to CSS grid columns.

```
┌─────────────────────────────────────────────────────────────┐
│  Document title                                             │
│  Document subtitle (italic)                                 │
├──────────────┬──────────────┬──────────────┬───────────────┤
│ 1968–1992    │ 1993–2005    │ 2006–2021    │ 2022–Present  │
│ ERA TITLE    │ ERA TITLE    │ ERA TITLE    │ ERA TITLE     │
│ (subtitle)   │ (subtitle)   │ (subtitle)   │ (subtitle)    │
├──────────────┼──────────────┼──────────────┼───────────────┤
│ ◉ 1968 ...   │ ◉ 1993 ...   │ ◉ 2006 ...   │ ◉ 2024 ...    │
│ ◉ 1969 ...   │ ◉ 1994 ...   │ ◉ 2014 ...   │ ◉ 2024 ...    │
│ ◉ 1987 ...   │ ◉ 1997 ...   │ ◉ 2017 ...   │ ◉ 2025 ...    │
│              │ ◉ 2000 ...   │ ◉ 2018 ...   │               │
│              │ ◉ 2004 ...   │ ◉ 2019 ...   │               │
├──────────────┼──────────────┼──────────────┼───────────────┤
│ MAIN SHIFT   │ MAIN SHIFT   │ MAIN SHIFT   │ MAIN SHIFT    │
│ era.desc     │ era.desc     │ era.desc     │ era.desc      │
└──────────────┴──────────────┴──────────────┴───────────────┘
```

### Column header

- Era year range (e.g. "1968–1992")
- Era title (bold)
- Era subtitle / description short-form *(optional — first sentence of description, if long)*
- Column background tinted with `era.color` at low opacity

### Event rows

Filtered to:
```ts
anchor.importance === "major" || anchor.visibleLabel === true
```

Sorted ascending by `anchor.year` within each era column (anchors are placed in an era column if `anchor.year >= era.startYear && anchor.year <= era.endYear`).

Each row:
```
[Phosphor icon]  [year]  [label]
```
- Icon: 20×20px, color matches era
- Year: bold, monospace
- Label: regular weight, wraps if needed

If `anchor.icon` is not set, a small filled circle (•) is used as fallback.

### Era summary footer

Displays `era.description` with a small horizontal rule above it and a label "MAIN INSTITUTIONAL SHIFT" in small-caps. Hidden if `era.description` is empty.

### CSS conventions

All classes prefixed `u-topical-*`, consistent with `understory.css`. No inline styles except dynamic color values derived from era data.

---

## 4. Export Behavior

`TopicalTimelineView` is a `forwardRef` component. The existing toolbar export buttons (`exportPNG`, `exportPDF`) check `viewMode` and pass the appropriate ref — no new export UI needed.

A `printMode` prop is set to `true` immediately before capture and reset after:
- Removes hover/focus styles
- Disables pointer cursors
- Forces full column height (no scroll clipping)

---

## 5. Toolbar Changes

In `ComplexityTimeline.tsx`, the existing toolbar gains two view toggle buttons, grouped together:

```tsx
<button
  className={`u-btn ${viewMode === 'process' ? 'u-btn--active' : ''}`}
  onClick={() => setViewMode('process')}
>
  Process View
</button>
<button
  className={`u-btn ${viewMode === 'topical' ? 'u-btn--active' : ''}`}
  onClick={() => setViewMode('topical')}
>
  Timeline View
</button>
```

The existing file toolbar buttons (export, import, save) remain unchanged and work on whichever view is active.

---

## 6. Anchor Edit Modal Changes

The existing anchor/event edit modal gains an optional **Icon** field when the Phosphor palette is available:

- Label: "Icon (optional)"
- UI: a small grid of 36 Phosphor icon buttons, one selectable at a time
- Clicking an icon stores its name string to `anchor.icon`
- A "None" option clears the field
- Only shown in the modal, not surfaced elsewhere in the process view

---

## 7. Era Edit Modal

If eras are not currently editable inline, a minimal era edit affordance is added (consistent with how layers/events are edited). The modal exposes:

- **Label** (era title)
- **Start year / End year**
- **Color**
- **Main institutional shift** (maps to `era.description`) — textarea, placeholder: *"Describe the key shift that defines this era…"*

---

## 8. What Is Not in Scope

- No Influence Map view (separate future spec)
- No per-domain row filtering within the topical view
- No drag-to-reorder within columns
- No inline editing directly on the topical timeline canvas (edits go through existing modals)
- No SVG export (existing PNG/PDF is sufficient for now)

---

## 9. Files Touched

| File | Change |
|------|--------|
| `src/TopicalTimelineView.tsx` | **New** — the view component |
| `src/ComplexityTimeline.tsx` | Add `viewMode` state; wire view toggle buttons; pass ref to export; expose anchor icon field in edit modal; expose era description in era edit |
| `src/understory.css` | Add `u-topical-*` styles |
| `package.json` | Add `@phosphor-icons/react` |

---

## 10. Design Principles (from project doc)

> Processes are primary. Events are evidence. Interactions are interpretive claims that need verbs.

The topical timeline is the *periodization* companion to the process view — it answers "when did the major institutional eras change?" rather than "how did processes interact?" It should remain spare: 3–6 events per era, no causal arcs, no dense clutter.
