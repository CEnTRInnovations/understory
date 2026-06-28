# Timeline Events — Design Spec

**Date:** 2026-06-28
**Status:** Approved

---

## Overview

The Timeline (topical) view gains its own independent event data model — `TopicalEvent[]` — separate from the process view's States and Anchors. Eras remain shared with the process view (Columns). Layer labels gain optional Bold-variant Phosphor icons displayed in the process view gutter. Anchor events lose their `icon` field, which is no longer needed now that the Timeline view owns its own events.

---

## 1. Data Model

### New types

```ts
type Layer = { label: string; icon?: string };  // replaces string

type TopicalEvent = {
  label: string;
  year: number;
  icon?: string;  // Phosphor icon name, e.g. "BookOpen"
};
```

### Modified type

`TimelineEvent` loses `icon?: string`. Anchors no longer carry an icon field.

### `.und` file changes

- `layers` changes from `string[]` to `Layer[]`
- New top-level field: `topicalEvents: TopicalEvent[]`

### Load-time migration (backward compat)

```ts
// layers: old string[] files are normalized at load
layers: (data.layers ?? []).map((l: any) =>
  typeof l === 'string' ? { label: l } : l
)

// topicalEvents: absent in old files
topicalEvents: data.topicalEvents ?? []
```

`layerDescriptions` remains a separate parallel `string[]` — unchanged.

### Era assignment

`TopicalEvent` has no explicit era reference. Its era column is derived at render time from the event's `year` falling within `[era.startYear, era.endYear]` — same logic as the current `getAnchorsForEra`, renamed to `getEventsForEra`.

---

## 2. File Changes

### `src/utils/iconPalette.ts` (new)

Extracts `ICON_PALETTE` (the 36-entry array of `{ name, Component }`) from `TopicalTimelineView.tsx` into a shared util. Imported by `TopicalTimelineView.tsx` and `ComplexityTimeline.tsx`.

### `src/utils/topicalTimeline.ts`

- `getAnchorsForEra` → `getEventsForEra`
- Parameter type: `MinimalAnchor[]` → `TopicalEvent[]`
- `MinimalAnchor` type removed; function uses `TopicalEvent` directly
- Tests updated accordingly

### `src/TopicalTimelineView.tsx`

Props change:

```ts
// Before
anchors: TimelineEvent[]

// After
events: TopicalEvent[]
```

Internally calls `getEventsForEra` instead of `getAnchorsForEra`. No other structural changes.

### `src/ComplexityTimeline.tsx`

| Area | Change |
|---|---|
| `Layer` type | `string` → `{ label: string; icon?: string }` |
| `layers` state | `useState<string[]>` → `useState<Layer[]>`; load migration applied |
| `EventModal` | Remove `icon` state and icon picker UI block; `layers` param updated to `Layer[]` |
| `LayerModal` | `onSave(name, description)` → `onSave(name, description, icon?)`; icon picker added below name field |
| Layer gutter render | `layer.label` replaces `lyr`; Bold Phosphor icon rendered before label text when `layer.icon` is set |
| `topicalEvents` state | New `useState<TopicalEvent[]>([])` |
| `TopicalEventModal` | New inline component (same file, same pattern as ColumnModal) |
| Timeline view columns | "+" button at bottom of each era column |
| Toolbar | "Add Event" button, visible only when `viewMode === 'topical'` |
| Event cards | `onClick` opens `TopicalEventModal` in edit mode |
| Export payload | `topicalEvents` added to the saved JSON object |
| Import handler | `topicalEvents: data.topicalEvents ?? []` |
| `TopicalTimelineView` call site | `anchors={events}` → `events={topicalEvents}` |

### `src/understory.css`

Minor additions:
- Style for the per-column "+" button in the Timeline view
- "Add Event" toolbar button (reuses existing `u-btn` styles; no new class needed)

---

## 3. `TopicalEventModal` — Fields & Behaviour

Inline component in `ComplexityTimeline.tsx`, same structural pattern as `ColumnModal`.

**Fields:**
1. **Label** — `<input type="text">`, autoFocus
2. **Year** — `<input type="number">`, constrained to era range when opened via column "+", to overall `[startYear, endYear]` when opened via toolbar
3. **Icon** — 36-icon picker grid (from `iconPalette.ts`); optional; default is no icon

**Edit mode:** pre-fills all fields; shows a Delete button (immediate, no confirmation)

**Era derivation:** the era a new event appears in is determined entirely by its year at render time. No validation error if year is changed to fall in a different era — it simply moves columns.

---

## 4. Layer Icon Display

In the process view layer gutter, each layer label renders:

```tsx
{layer.icon && <IconComponent weight="bold" size={14} color="#6b6760" />}
<span>{layer.label}</span>
```

where `IconComponent` is looked up from `ICON_PALETTE` by `layer.icon` name (same `find` pattern as TopicalTimelineView event rendering).

The `LayerModal` icon picker uses Bold rendering in its grid items to preview how the icon will appear in the gutter.

---

## 5. What Is Not Changing

- `Column` type is unchanged — Columns remain the source of truth for eras in both views
- `layerDescriptions` stays as a parallel `string[]`
- The 36-icon palette is unchanged
- The process view canvas renderer (`drawCardsMode`) is unchanged — layer icons are only rendered in the React gutter, not in the canvas export
