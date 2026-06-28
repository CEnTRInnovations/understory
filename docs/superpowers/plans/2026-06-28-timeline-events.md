# Timeline Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Timeline (topical) view its own independent `TopicalEvent[]` data model with full CRUD, migrate Layers from `string[]` to `{ label, icon? }[]` with a Bold icon display in the process view gutter, and remove the now-unused `icon` field from anchor events.

**Architecture:** `TopicalEvent` is defined in and exported from `src/utils/topicalTimeline.ts`; `ICON_PALETTE` moves to `src/utils/iconPalette.ts`; both are imported by `ComplexityTimeline.tsx` and `TopicalTimelineView.tsx`. All CRUD for Timeline Events goes through a new `TopicalEventModal` inline component in `ComplexityTimeline.tsx`. Eras (Columns) remain the shared source of truth for era time ranges; `TopicalEvent` placement in a column is derived from its `year`.

**Tech Stack:** React 18, TypeScript 5, Vite, Vitest, `@phosphor-icons/react` (already installed)

## Global Constraints

- Do not add any new npm dependencies — all required libraries are already installed
- Keep `layerDescriptions: string[]` as a separate parallel array — do not merge it into `Layer`
- Era assignment for `TopicalEvent` is always year-derived; no explicit `era` field on the type
- The canvas export renderer (`drawCardsMode`) does NOT render layer icons — only the React gutter does
- `TIMELINE_FILE_VERSION` bumps from `3` to `4`
- All modal state follows the existing pattern: `useState<false | { ... }>(false)`
- Icon picker shows Bold-weight icons in LayerModal, regular-weight in TopicalEventModal (matches existing EventModal pattern)
- "Add Event" toolbar button is only visible when `viewMode === 'topical'`; process-view buttons (Add Layer, Add State, etc.) are only visible when `viewMode === 'process'`

---

## File Map

| File | Status | Responsibility |
|---|---|---|
| `src/utils/iconPalette.ts` | **Create** | Shared ICON_PALETTE array (36 Phosphor icons) |
| `src/utils/topicalTimeline.ts` | **Modify** | Export `TopicalEvent` type; rename to `getEventsForEra`; drop type-field filtering |
| `src/utils/topicalTimeline.test.ts` | **Modify** | Update tests to match renamed function and new type |
| `src/TopicalTimelineView.tsx` | **Modify** | Props: `anchors→events: TopicalEvent[]`; add `onAddEvent`/`onEditEvent` callbacks; "+" button per era column; card click |
| `src/ComplexityTimeline.tsx` | **Modify** | `Layer` type; `topicalEvents` state; `TopicalEventModal`; LayerModal icon; layer gutter icon display; export/import; toolbar buttons |
| `src/understory.css` | **Modify** | `.u-topical-add-event` button style |

---

### Task 1: Extract ICON_PALETTE + update topicalTimeline utilities + update TopicalTimelineView props

**Files:**
- Create: `src/utils/iconPalette.ts`
- Modify: `src/utils/topicalTimeline.ts`
- Modify: `src/utils/topicalTimeline.test.ts`
- Modify: `src/TopicalTimelineView.tsx`

**Interfaces:**
- Produces:
  - `export type TopicalEvent = { label: string; year: number; icon?: string }` from `topicalTimeline.ts`
  - `export function getEventsForEra(events: TopicalEvent[], era: { startYear: number; endYear: number }): TopicalEvent[]` from `topicalTimeline.ts`
  - `export const ICON_PALETTE: Array<{ name: string; Component: IconComponent }>` from `iconPalette.ts`
  - `TopicalTimelineView` now accepts `events: TopicalEvent[]` prop (temporarily `events={[]}` at call site until Task 4)

- [ ] **Step 1: Create `src/utils/iconPalette.ts`**

```ts
import React from 'react';
import {
  Buildings, BookOpen, Users, Star, MapPin, ChartBar, Heart, GraduationCap,
  Handshake, Megaphone, Globe, Newspaper, Certificate, Tree, Scales, Lightbulb,
  Briefcase, FileText, PencilLine, Network, ArrowsCounterClockwise, Toolbox,
  PresentationChart, ClipboardText, Medal, Link, House, Microphone, Compass,
  Calendar, Flask, ChalkboardTeacher, CurrencyDollar, ArrowRight, Flag, Sparkle,
} from '@phosphor-icons/react';

type IconComponent = React.ComponentType<{ size?: string | number; color?: string; weight?: string }>;

export const ICON_PALETTE: Array<{ name: string; Component: IconComponent }> = [
  { name: 'Buildings',              Component: Buildings },
  { name: 'BookOpen',               Component: BookOpen },
  { name: 'Users',                  Component: Users },
  { name: 'Star',                   Component: Star },
  { name: 'MapPin',                 Component: MapPin },
  { name: 'ChartBar',               Component: ChartBar },
  { name: 'Heart',                  Component: Heart },
  { name: 'GraduationCap',          Component: GraduationCap },
  { name: 'Handshake',              Component: Handshake },
  { name: 'Megaphone',              Component: Megaphone },
  { name: 'Globe',                  Component: Globe },
  { name: 'Newspaper',              Component: Newspaper },
  { name: 'Certificate',            Component: Certificate },
  { name: 'Tree',                   Component: Tree },
  { name: 'Scales',                 Component: Scales },
  { name: 'Lightbulb',              Component: Lightbulb },
  { name: 'Briefcase',              Component: Briefcase },
  { name: 'FileText',               Component: FileText },
  { name: 'PencilLine',             Component: PencilLine },
  { name: 'Network',                Component: Network },
  { name: 'ArrowsCounterClockwise', Component: ArrowsCounterClockwise },
  { name: 'Toolbox',                Component: Toolbox },
  { name: 'PresentationChart',      Component: PresentationChart },
  { name: 'ClipboardText',          Component: ClipboardText },
  { name: 'Medal',                  Component: Medal },
  { name: 'Link',                   Component: Link },
  { name: 'House',                  Component: House },
  { name: 'Microphone',             Component: Microphone },
  { name: 'Compass',                Component: Compass },
  { name: 'Calendar',               Component: Calendar },
  { name: 'Flask',                  Component: Flask },
  { name: 'ChalkboardTeacher',      Component: ChalkboardTeacher },
  { name: 'CurrencyDollar',         Component: CurrencyDollar },
  { name: 'ArrowRight',             Component: ArrowRight },
  { name: 'Flag',                   Component: Flag },
  { name: 'Sparkle',                Component: Sparkle },
];
```

- [ ] **Step 2: Rewrite `src/utils/topicalTimeline.ts`**

```ts
export type TopicalEvent = {
  label: string;
  year: number;
  icon?: string;
};

type Era = { startYear: number; endYear: number };

export function getEventsForEra(events: TopicalEvent[], era: Era): TopicalEvent[] {
  return events
    .filter(e => e.year >= era.startYear && e.year <= era.endYear)
    .sort((a, b) => a.year - b.year);
}

export function formatEraRange(era: Era, currentYear: number): string {
  const end = era.endYear >= currentYear ? 'Present' : String(era.endYear);
  return `${era.startYear}–${end}`;
}
```

- [ ] **Step 3: Rewrite `src/utils/topicalTimeline.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { getEventsForEra, formatEraRange } from './topicalTimeline';

describe('getEventsForEra', () => {
  const era = { startYear: 1990, endYear: 2005 };

  it('returns empty array when no events', () => {
    expect(getEventsForEra([], era)).toEqual([]);
  });

  it('excludes events outside the era', () => {
    const events = [
      { label: 'Early', year: 1989 },
      { label: 'Late',  year: 2006 },
    ];
    expect(getEventsForEra(events, era)).toEqual([]);
  });

  it('includes events at era boundary years', () => {
    const e1 = { label: 'Start', year: 1990 };
    const e2 = { label: 'End',   year: 2005 };
    expect(getEventsForEra([e1, e2], era)).toHaveLength(2);
  });

  it('includes all events within era', () => {
    const events = [
      { label: 'A', year: 1995 },
      { label: 'B', year: 1997 },
      { label: 'C', year: 2001 },
    ];
    expect(getEventsForEra(events, era)).toHaveLength(3);
  });

  it('sorts by year ascending', () => {
    const events = [
      { label: 'Later',   year: 2000 },
      { label: 'Earlier', year: 1993 },
    ];
    const result = getEventsForEra(events, era);
    expect(result[0].year).toBe(1993);
    expect(result[1].year).toBe(2000);
  });

  it('includes icon field when present', () => {
    const e = { label: 'With icon', year: 1995, icon: 'Star' };
    const result = getEventsForEra([e], era);
    expect(result[0].icon).toBe('Star');
  });
});

describe('formatEraRange', () => {
  it('returns start–end for a past era', () => {
    expect(formatEraRange({ startYear: 1968, endYear: 1992 }, 2026)).toBe('1968–1992');
  });

  it('uses en-dash not hyphen', () => {
    const result = formatEraRange({ startYear: 1968, endYear: 1992 }, 2026);
    expect(result).toContain('–');
    expect(result).not.toContain('-');
  });

  it('appends Present when endYear >= currentYear', () => {
    expect(formatEraRange({ startYear: 2022, endYear: 2026 }, 2026)).toBe('2022–Present');
  });

  it('shows number when endYear < currentYear', () => {
    expect(formatEraRange({ startYear: 2022, endYear: 2025 }, 2026)).toBe('2022–2025');
  });
});
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx vitest run src/utils/topicalTimeline.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Update `src/TopicalTimelineView.tsx`**

Replace the entire file:

```tsx
import React, { forwardRef } from 'react';
import { ICON_PALETTE } from './utils/iconPalette';
import { getEventsForEra, formatEraRange } from './utils/topicalTimeline';
import type { TopicalEvent } from './utils/topicalTimeline';

type Column = {
  label: string;
  startYear: number;
  endYear: number;
  dateRange?: string;
  description?: string;
  color?: string;
};

export type TopicalTimelineViewProps = {
  title: string;
  subtitle?: string;
  eras: Column[];
  events: TopicalEvent[];
  printMode?: boolean;
  onAddEvent?: (era: Column) => void;
  onEditEvent?: (event: TopicalEvent, index: number) => void;
};

export { ICON_PALETTE };

export const TopicalTimelineView = forwardRef<HTMLDivElement, TopicalTimelineViewProps>(
  ({ title, subtitle, eras, events, printMode = false, onAddEvent, onEditEvent }, ref) => {
    const currentYear = new Date().getFullYear();
    const sorted = [...eras].sort((a, b) => a.startYear - b.startYear);

    if (sorted.length === 0) return null;

    return (
      <div
        ref={ref}
        className={`u-topical-root${printMode ? ' u-topical-root--print' : ''}`}
        style={{ gridTemplateColumns: `repeat(${sorted.length}, 1fr)` }}
      >
        {/* Document header */}
        <div className="u-topical-header" style={{ gridColumn: `1 / ${sorted.length + 1}` }}>
          <h1 className="u-topical-title">{title}</h1>
          {subtitle && <p className="u-topical-subtitle">{subtitle}</p>}
        </div>

        {/* Era columns */}
        {sorted.map((era) => {
          const eraEvents = getEventsForEra(events, era);
          const eraColor = era.color ?? '#D2BDA3';

          return (
            <div
              key={`${era.startYear}-${era.label}`}
              className="u-topical-col"
              style={{ backgroundColor: `${eraColor}1f`, borderTopColor: eraColor }}
            >
              {/* Column header */}
              <div className="u-topical-col-header">
                <span className="u-topical-era-range" style={{ color: eraColor }}>
                  {formatEraRange(era, currentYear)}
                </span>
                <h2 className="u-topical-era-title">{era.label}</h2>
                {era.dateRange && (
                  <p className="u-topical-era-subtitle">{era.dateRange}</p>
                )}
              </div>

              {/* Event list */}
              <ul className="u-topical-event-list">
                {eraEvents.map((event, i) => {
                  const IconComponent = ICON_PALETTE.find(p => p.name === event.icon)?.Component ?? null;
                  return (
                    <li
                      key={`${i}-${event.year}`}
                      className={`u-topical-event${onEditEvent ? ' u-topical-event--editable' : ''}`}
                      onClick={() => onEditEvent?.(event, events.indexOf(event))}
                    >
                      <span className="u-topical-event-icon" style={{ color: eraColor }}>
                        {IconComponent
                          ? <IconComponent size={18} color={eraColor} />
                          : <span className="u-topical-event-dot" style={{ background: eraColor }} />
                        }
                      </span>
                      <span className="u-topical-event-year">{event.year}</span>
                      <span className="u-topical-event-label">{event.label}</span>
                    </li>
                  );
                })}
              </ul>

              {/* Per-era add button (hidden in print mode) */}
              {!printMode && onAddEvent && (
                <button
                  className="u-topical-add-event"
                  onClick={() => onAddEvent(era)}
                  title="Add event to this era"
                >
                  +
                </button>
              )}

              {/* Footer */}
              {era.description && (
                <div className="u-topical-col-footer" style={{ borderTopColor: eraColor }}>
                  <span className="u-topical-shift-label">Main Institutional Shift</span>
                  <p className="u-topical-shift-text">{era.description}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }
);

TopicalTimelineView.displayName = 'TopicalTimelineView';
```

- [ ] **Step 6: Update the `TopicalTimelineView` call site in `ComplexityTimeline.tsx` (temporary)**

Find this block (around line 2468):
```tsx
        <div className="u-topical-area">
          <TopicalTimelineView
            ref={topicalViewRef}
            title=""
            subtitle=""
            eras={columns}
            anchors={events}
            printMode={topicalPrintMode}
          />
        </div>
```

Replace `anchors={events}` with `events={[]}`:
```tsx
        <div className="u-topical-area">
          <TopicalTimelineView
            ref={topicalViewRef}
            title=""
            subtitle=""
            eras={columns}
            events={[]}
            printMode={topicalPrintMode}
          />
        </div>
```

Also remove `ICON_PALETTE` from the import of `TopicalTimelineView` in `ComplexityTimeline.tsx` since it now comes from `iconPalette.ts`:

At the top of `ComplexityTimeline.tsx`, find:
```ts
import { ICON_PALETTE, TopicalTimelineView } from './TopicalTimelineView';
```

Replace with:
```ts
import { TopicalTimelineView } from './TopicalTimelineView';
import { ICON_PALETTE } from './utils/iconPalette';
```

- [ ] **Step 7: Verify type-check and tests pass**

```bash
npx tsc --noEmit && npx vitest run
```

Expected: clean compile, all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/utils/iconPalette.ts src/utils/topicalTimeline.ts src/utils/topicalTimeline.test.ts src/TopicalTimelineView.tsx src/ComplexityTimeline.tsx
git commit -m "refactor: extract ICON_PALETTE, introduce TopicalEvent type, update topical view props"
```

---

### Task 2: Migrate Layer type from `string` to `{ label, icon? }`

**Files:**
- Modify: `src/ComplexityTimeline.tsx`

**Interfaces:**
- Consumes: nothing new
- Produces: `type Layer = { label: string; icon?: string }` — `layers` state is now `Layer[]`; all callers use `layer.label` instead of `layer`

- [ ] **Step 1: Add `Layer` type and update state declaration**

Find (around line 16, the type definitions block):
```ts
type Column = { label: string; startYear: number; endYear: number; dateRange?: string; description?: string; color?: string };
```

Add `Layer` type immediately before it:
```ts
type Layer  = { label: string; icon?: string };
type Column = { label: string; startYear: number; endYear: number; dateRange?: string; description?: string; color?: string };
```

Find (around line 829):
```ts
  const [layers, setLayers]                     = useState<string[]>([]);
```

Change to:
```ts
  const [layers, setLayers]                     = useState<Layer[]>([]);
```

- [ ] **Step 2: Update `saveLayer` to work with Layer objects**

Find:
```ts
  const saveLayer = (name: string, description: string) => {
    if (editingLayer !== null) {
      setLayers(l => l.map((lyr, i) => i === editingLayer ? name : lyr));
      setLayerDescriptions(d => d.map((desc, i) => i === editingLayer ? description : desc));
      setEditingLayer(null);
    } else {
      setLayers(l => [...l, name]);
      setLayerDescriptions(d => [...d, description]);
      setLayerHeights(h => [...h, uniformLayerH]);
    }
    setShowLayerModal(false);
  };
```

Replace with (note: `icon` parameter will be added in Task 3; for now pass `undefined`):
```ts
  const saveLayer = (name: string, description: string, icon?: string) => {
    if (editingLayer !== null) {
      setLayers(l => l.map((lyr, i) => i === editingLayer ? { label: name, icon } : lyr));
      setLayerDescriptions(d => d.map((desc, i) => i === editingLayer ? description : desc));
      setEditingLayer(null);
    } else {
      setLayers(l => [...l, { label: name, icon }]);
      setLayerDescriptions(d => [...d, description]);
      setLayerHeights(h => [...h, uniformLayerH]);
    }
    setShowLayerModal(false);
  };
```

- [ ] **Step 3: Update `reorderLayers` — no code change needed**

`reorderLayers` works on the array of objects; `splice`/`concat` work on objects fine. No changes needed.

- [ ] **Step 4: Update `drawCardsMode` canvas layer label**

Find (inside `drawCardsMode`, around line 1664):
```ts
    layers.forEach((lyr, i) => {
```

Change `lyr` to `layer` throughout that `forEach` body and use `layer.label`:

```ts
    layers.forEach((layer, i) => {
      const y = topReserveH + layerTops[i];
      const lh = effectiveHeights[i];
      if (i % 2 === 1) {
        ctx.fillStyle = 'rgba(62,59,53,0.04)';
        ctx.fillRect(0, y, w, lh);
      }
      ctx.strokeStyle = 'rgba(62,59,53,0.14)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      ctx.fillStyle = '#6b6760'; ctx.font = scaledFont(10, fontScale, '500');
      ctx.textAlign = 'left'; ctx.fillText(layer.label, 10, y + 14);
    });
```

- [ ] **Step 5: Update `EventModal` layers param type and select options**

Find the `EventModal` function signature (around line 392):
```ts
  layers: string[];
```

Change to:
```ts
  layers: Layer[];
```

Find the two `<select>` option renders in `EventModal` that look like:
```tsx
              {layers.map((l, i) => <option key={i} value={i}>{l}</option>)}
```

Both occurrences (around lines 481 and 491) — change to:
```tsx
              {layers.map((l, i) => <option key={i} value={i}>{l.label}</option>)}
```

- [ ] **Step 6: Update layer gutter render to use `layer.label`**

Find in the layer gutter map (around line 2021):
```tsx
              {layers.map((layer, i) => (
```

Inside that map, find:
```tsx
                    <span className="u-layer-label-text"
                      onClick={() => { setEditingLayer(i); setShowLayerModal(true); }}
                      title="Click to rename this layer">
                      {layer}
                    </span>
```

Change `{layer}` to `{layer.label}`:
```tsx
                    <span className="u-layer-label-text"
                      onClick={() => { setEditingLayer(i); setShowLayerModal(true); }}
                      title="Click to rename this layer">
                      {layer.label}
                    </span>
```

- [ ] **Step 7: Update LayerModal `initialData` to pass `layer.label`**

Find the `LayerModal` call site in the modals section (around line 2489):
```tsx
        initialData={editingLayer !== null
          ? { name: layers[editingLayer], description: layerDescriptions[editingLayer] ?? '' }
          : undefined}
```

Change to:
```tsx
        initialData={editingLayer !== null
          ? { name: layers[editingLayer].label, description: layerDescriptions[editingLayer] ?? '' }
          : undefined}
```

- [ ] **Step 8: Update load migration in `handleImportFile`**

Find (around line 1549):
```ts
        setLayers(data.layers ?? []);
```

Change to:
```ts
        setLayers((data.layers ?? []).map((l: any) =>
          typeof l === 'string' ? { label: l } : l
        ));
```

- [ ] **Step 9: Bump `TIMELINE_FILE_VERSION`**

Find:
```ts
  const TIMELINE_FILE_VERSION = 3;
```

Change to:
```ts
  const TIMELINE_FILE_VERSION = 4;
```

- [ ] **Step 10: Verify type-check passes**

```bash
npx tsc --noEmit
```

Expected: no errors. Fix any remaining `string` usages of `layer` that TypeScript reports.

- [ ] **Step 11: Commit**

```bash
git add src/ComplexityTimeline.tsx
git commit -m "refactor: migrate Layer from string to { label, icon? } with load-time migration"
```

---

### Task 3: Layer icon picker in LayerModal + Bold icon in process view gutter

**Files:**
- Modify: `src/ComplexityTimeline.tsx`

**Interfaces:**
- Consumes: `ICON_PALETTE` from `./utils/iconPalette` (already imported after Task 1)
- Produces: LayerModal accepts and returns `icon?`; layer gutter renders Bold Phosphor icon

- [ ] **Step 1: Add `icon` state and picker to `LayerModal`**

Find the `LayerModal` component (around line 349). Replace it entirely:

```tsx
const LayerModal = ({
  onClose, onSave, initialData
}: {
  onClose: () => void;
  onSave: (name: string, description: string, icon?: string) => void;
  initialData?: { name: string; description: string; icon?: string };
}) => {
  const [name, setName] = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [icon, setIcon] = useState<string | undefined>(initialData?.icon);
  const isEditing = initialData !== undefined;
  const handleSave = () => { if (name.trim()) onSave(name.trim(), description.trim(), icon); };
  return (
    <Modal onClose={onClose} title={isEditing ? 'Edit Layer' : 'Add Layer'}>
      <div className="u-form-group">
        <label className="u-form-label">Layer name</label>
        <input
          className="u-form-input"
          type="text"
          placeholder="e.g. Policy, Community, Institutional"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
          autoFocus
        />
      </div>
      <div className="u-form-group">
        <label className="u-form-label">Description (optional)</label>
        <input
          className="u-form-input"
          type="text"
          placeholder="Brief description of this layer"
          value={description}
          onChange={e => setDescription(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
        />
      </div>
      <div className="u-form-group">
        <label className="u-form-label">Icon <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span></label>
        <div className="u-icon-picker">
          <button type="button"
            className={`u-icon-picker-item${!icon ? ' u-icon-picker-item--selected' : ''}`}
            onClick={() => setIcon(undefined)} title="None">
            <span style={{ fontSize: '0.7rem', color: '#6B625A' }}>–</span>
          </button>
          {ICON_PALETTE.map(({ name: iconName, Component }) => (
            <button key={iconName} type="button"
              className={`u-icon-picker-item${icon === iconName ? ' u-icon-picker-item--selected' : ''}`}
              onClick={() => setIcon(iconName)} title={iconName}>
              <Component weight="bold" size={16} />
            </button>
          ))}
        </div>
      </div>
      <button className="u-btn u-btn--layer u-btn--full" onClick={handleSave} disabled={!name.trim()}>
        {isEditing ? 'Save Layer' : 'Add Layer'}
      </button>
    </Modal>
  );
};
```

- [ ] **Step 2: Update `LayerModal` `initialData` call site to pass `icon`**

Find (in the modals section, around line 2489):
```tsx
        initialData={editingLayer !== null
          ? { name: layers[editingLayer].label, description: layerDescriptions[editingLayer] ?? '' }
          : undefined}
```

Change to:
```tsx
        initialData={editingLayer !== null
          ? { name: layers[editingLayer].label, description: layerDescriptions[editingLayer] ?? '', icon: layers[editingLayer].icon }
          : undefined}
```

- [ ] **Step 3: Render Bold icon in the process view layer gutter**

Find in the layer gutter (around line 2040):
```tsx
                    <span className="u-layer-label-text"
                      onClick={() => { setEditingLayer(i); setShowLayerModal(true); }}
                      title="Click to rename this layer">
                      {layer.label}
                    </span>
```

Replace with:
```tsx
                    <span className="u-layer-label-text"
                      onClick={() => { setEditingLayer(i); setShowLayerModal(true); }}
                      title="Click to rename this layer">
                      {(() => {
                        const LayerIcon = layer.icon
                          ? ICON_PALETTE.find(p => p.name === layer.icon)?.Component
                          : null;
                        return LayerIcon ? <LayerIcon weight="bold" size={12} style={{ marginRight: 4, flexShrink: 0 }} /> : null;
                      })()}
                      {layer.label}
                    </span>
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/ComplexityTimeline.tsx
git commit -m "feat: add icon picker to LayerModal; display Bold icon in process view layer gutter"
```

---

### Task 4: TopicalEvent state + TopicalEventModal + toolbar button + CRUD

**Files:**
- Modify: `src/ComplexityTimeline.tsx`

**Interfaces:**
- Consumes: `TopicalEvent` from `./utils/topicalTimeline`, `ICON_PALETTE` from `./utils/iconPalette`
- Produces:
  - `topicalEvents: TopicalEvent[]` React state
  - `showTopicalEventModal: false | { eraHint?: Column; initialData?: TopicalEvent; index?: number }` React state
  - `saveTopicalEvent(data: TopicalEvent): void`
  - `deleteTopicalEvent(index: number): void`
  - TopicalTimelineView call site updated: `events={topicalEvents}`
  - "Add Event" toolbar button opens `TopicalEventModal` with no era hint

- [ ] **Step 1: Import `TopicalEvent` type**

Find at the top of `ComplexityTimeline.tsx`:
```ts
import { TopicalTimelineView } from './TopicalTimelineView';
import { ICON_PALETTE } from './utils/iconPalette';
```

Change to:
```ts
import { TopicalTimelineView } from './TopicalTimelineView';
import { ICON_PALETTE } from './utils/iconPalette';
import type { TopicalEvent } from './utils/topicalTimeline';
```

- [ ] **Step 2: Add `TopicalEventModal` component**

Add this new component after the `ColumnModal` component ends (around line 620, after the closing `};` of `ColumnModal`):

```tsx
const TopicalEventModal = ({
  onClose, onSave, onDelete, startYear, endYear, eraHint, initialData,
}: {
  onClose: () => void;
  onSave: (data: TopicalEvent) => void;
  onDelete?: () => void;
  startYear: number;
  endYear: number;
  eraHint?: Column;
  initialData?: TopicalEvent;
}) => {
  const minYear = eraHint ? eraHint.startYear : startYear;
  const maxYear = eraHint ? eraHint.endYear : endYear;
  const [label, setLabel] = useState(initialData?.label ?? '');
  const [year, setYear]   = useState(initialData?.year ?? minYear);
  const [icon, setIcon]   = useState<string | undefined>(initialData?.icon);
  const isEditing = !!initialData;

  return (
    <Modal onClose={onClose} title={isEditing ? 'Edit Event' : 'Add Event'} accentColor="var(--btn-column)">
      <div className="u-form-group">
        <label className="u-form-label">Label</label>
        <input className="u-form-input" type="text" placeholder="Event label"
          value={label} onChange={e => setLabel(e.target.value)} autoFocus />
      </div>
      <div className="u-form-group">
        <label className="u-form-label">Year</label>
        <input className="u-form-input" type="number"
          value={year} min={minYear} max={maxYear}
          onChange={e => setYear(Number(e.target.value))} />
      </div>
      <div className="u-form-group">
        <label className="u-form-label">Icon <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span></label>
        <div className="u-icon-picker">
          <button type="button"
            className={`u-icon-picker-item${!icon ? ' u-icon-picker-item--selected' : ''}`}
            onClick={() => setIcon(undefined)} title="None">
            <span style={{ fontSize: '0.7rem', color: '#6B625A' }}>–</span>
          </button>
          {ICON_PALETTE.map(({ name: iconName, Component }) => (
            <button key={iconName} type="button"
              className={`u-icon-picker-item${icon === iconName ? ' u-icon-picker-item--selected' : ''}`}
              onClick={() => setIcon(iconName)} title={iconName}>
              <Component size={16} />
            </button>
          ))}
        </div>
      </div>
      <button className="u-btn u-btn--column u-btn--full"
        onClick={() => label.trim() && onSave({ label: label.trim(), year, icon })}
        disabled={!label.trim()}>
        {isEditing ? 'Save Event' : 'Add Event'}
      </button>
      {isEditing && onDelete && (
        <button className="u-btn u-btn--danger u-btn--full" style={{ marginTop: 8 }}
          onClick={onDelete}>
          Delete Event
        </button>
      )}
    </Modal>
  );
};
```

- [ ] **Step 3: Add `topicalEvents` state and modal state**

Find the block of modal state declarations (around line 874):
```ts
  const [showLayerModal, setShowLayerModal]       = useState(false);
  const [editingLayer, setEditingLayer]           = useState<number | null>(null);
```

Add after all existing modal state declarations (after `showCutModal`):
```ts
  const [topicalEvents, setTopicalEvents] = useState<TopicalEvent[]>([]);
  const [showTopicalEventModal, setShowTopicalEventModal] = useState<
    false | { eraHint?: Column; initialData?: TopicalEvent; index?: number }
  >(false);
```

- [ ] **Step 4: Add `saveTopicalEvent` and `deleteTopicalEvent` handlers**

Add after the `addColumn` handler (around line 1323):
```ts
  const saveTopicalEvent = (data: TopicalEvent) => {
    if (typeof showTopicalEventModal === 'object' && showTopicalEventModal.index !== undefined) {
      setTopicalEvents(evs => evs.map((ev, i) => i === showTopicalEventModal.index ? data : ev));
    } else {
      setTopicalEvents(evs => [...evs, data]);
    }
    setShowTopicalEventModal(false);
  };

  const deleteTopicalEvent = (index: number) => {
    setTopicalEvents(evs => evs.filter((_, i) => i !== index));
    setShowTopicalEventModal(false);
  };
```

- [ ] **Step 5: Add Escape handler for `showTopicalEventModal`**

Find the Escape key handler (around line 993). Inside it, after the last `set...` call, add:
```ts
        setShowTopicalEventModal(false);
```

- [ ] **Step 6: Add `topicalEvents` to export payload and load migration**

Find:
```ts
    const data = {
      version: TIMELINE_FILE_VERSION,
      layers, layerDescriptions, startYear, endYear,
      events, connections, columns, trends, cuts,
      selectedProfileId,
      layerHeights,
    };
```

Change to:
```ts
    const data = {
      version: TIMELINE_FILE_VERSION,
      layers, layerDescriptions, startYear, endYear,
      events, connections, columns, trends, cuts,
      selectedProfileId,
      layerHeights,
      topicalEvents,
    };
```

Find in `handleImportFile` the last `setSelectedProfileId` block, and add after all other `set*` calls:
```ts
        setTopicalEvents(Array.isArray(data.topicalEvents) ? data.topicalEvents : []);
```

- [ ] **Step 7: Update TopicalTimelineView call site to pass `topicalEvents`**

Find (around line 2468):
```tsx
            events={[]}
```

Change to:
```tsx
            events={topicalEvents}
```

- [ ] **Step 8: Add "Add Event" toolbar button (topical mode only) and hide process-only buttons**

Find the toolbar section (around line 1922). Wrap the process-only buttons in a conditional and add the topical button:

Find this block:
```tsx
        <button className="u-btn u-btn--layer" onClick={() => { setEditingLayer(null); setShowLayerModal(true); }}>
          <Layers size={13} /> Add Layer
        </button>
        <button className="u-btn u-btn--event" onClick={() => { setEditingEvent(null); setShowEventModal({ type: 'state' }); }}>
          <Plus size={13} /> Add State
        </button>
        <button className="u-btn u-btn--event" onClick={() => { setEditingEvent(null); setShowEventModal({ type: 'anchor' }); }}>
          <Plus size={13} /> Add Anchor
        </button>
        <button className="u-btn u-btn--trend" onClick={() => { setEditingTrend(null); setShowTrendModal(true); }}>
          <TrendingUp size={13} /> Add Trend
          <span style={{ fontSize: '0.65rem', opacity: 0.75 }}>({trends.length}/6)</span>
        </button>
        <button className="u-btn u-btn--column" onClick={() => { setEditingColumn(null); setShowColumnModal(true); }}>
          <Columns size={13} /> Add Column
        </button>
        <button className="u-btn u-btn--cut" onClick={() => { setEditingCut(null); setShowCutModal(true); }}>
          <Scissors size={13} /> Add Cut
        </button>
```

Replace with:
```tsx
        {viewMode === 'process' ? (<>
          <button className="u-btn u-btn--layer" onClick={() => { setEditingLayer(null); setShowLayerModal(true); }}>
            <Layers size={13} /> Add Layer
          </button>
          <button className="u-btn u-btn--event" onClick={() => { setEditingEvent(null); setShowEventModal({ type: 'state' }); }}>
            <Plus size={13} /> Add State
          </button>
          <button className="u-btn u-btn--event" onClick={() => { setEditingEvent(null); setShowEventModal({ type: 'anchor' }); }}>
            <Plus size={13} /> Add Anchor
          </button>
          <button className="u-btn u-btn--trend" onClick={() => { setEditingTrend(null); setShowTrendModal(true); }}>
            <TrendingUp size={13} /> Add Trend
            <span style={{ fontSize: '0.65rem', opacity: 0.75 }}>({trends.length}/6)</span>
          </button>
          <button className="u-btn u-btn--column" onClick={() => { setEditingColumn(null); setShowColumnModal(true); }}>
            <Columns size={13} /> Add Column
          </button>
          <button className="u-btn u-btn--cut" onClick={() => { setEditingCut(null); setShowCutModal(true); }}>
            <Scissors size={13} /> Add Cut
          </button>
        </>) : (
          <button className="u-btn u-btn--column" onClick={() => setShowTopicalEventModal({})}>
            <Plus size={13} /> Add Event
          </button>
        )}
```

- [ ] **Step 9: Add `TopicalEventModal` to the modals section**

Find the modals section (around line 2488, after `{showLayerModal && ...}`). Add after the last existing modal:

```tsx
      {showTopicalEventModal !== false && (
        <TopicalEventModal
          onClose={() => setShowTopicalEventModal(false)}
          onSave={saveTopicalEvent}
          onDelete={showTopicalEventModal.index !== undefined
            ? () => deleteTopicalEvent(showTopicalEventModal.index!)
            : undefined}
          startYear={startYear}
          endYear={endYear}
          eraHint={showTopicalEventModal.eraHint}
          initialData={showTopicalEventModal.initialData}
        />
      )}
```

- [ ] **Step 10: Type-check and test**

```bash
npx tsc --noEmit && npx vitest run
```

Expected: clean compile, all tests pass.

- [ ] **Step 11: Commit**

```bash
git add src/ComplexityTimeline.tsx
git commit -m "feat: add TopicalEvent state, TopicalEventModal, and Add Event toolbar button"
```

---

### Task 5: Wire "+" per-era button and event card click in TopicalTimelineView

**Files:**
- Modify: `src/ComplexityTimeline.tsx` (pass callbacks)
- Modify: `src/understory.css` (`.u-topical-add-event` style)

**Interfaces:**
- Consumes: `onAddEvent` and `onEditEvent` props already defined on `TopicalTimelineView` (from Task 1)
- Produces: clicking a "+" button opens `TopicalEventModal` with the era as hint; clicking an event card opens it in edit mode

- [ ] **Step 1: Pass `onAddEvent` and `onEditEvent` to `TopicalTimelineView` in `ComplexityTimeline.tsx`**

Find the `TopicalTimelineView` call site:
```tsx
          <TopicalTimelineView
            ref={topicalViewRef}
            title=""
            subtitle=""
            eras={columns}
            events={topicalEvents}
            printMode={topicalPrintMode}
          />
```

Change to:
```tsx
          <TopicalTimelineView
            ref={topicalViewRef}
            title=""
            subtitle=""
            eras={columns}
            events={topicalEvents}
            printMode={topicalPrintMode}
            onAddEvent={era => setShowTopicalEventModal({ eraHint: era })}
            onEditEvent={(event, index) => setShowTopicalEventModal({ initialData: event, index })}
          />
```

- [ ] **Step 2: Add `.u-topical-add-event` and `.u-topical-event--editable` styles to `src/understory.css`**

Append to the end of `understory.css`:

```css
.u-topical-add-event {
  display: block;
  width: calc(100% - 16px);
  margin: 4px 8px 8px;
  padding: 4px 0;
  background: transparent;
  border: 1px dashed rgba(62, 59, 53, 0.25);
  border-radius: 4px;
  color: rgba(62, 59, 53, 0.45);
  font-size: 1rem;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.u-topical-add-event:hover {
  border-color: rgba(62, 59, 53, 0.5);
  color: rgba(62, 59, 53, 0.7);
}

.u-topical-event--editable {
  cursor: pointer;
}
.u-topical-event--editable:hover {
  background: rgba(62, 59, 53, 0.06);
  border-radius: 4px;
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/ComplexityTimeline.tsx src/understory.css
git commit -m "feat: wire per-era + button and event card click for Timeline Events CRUD"
```

---

### Task 6: Remove `icon` from anchor events (EventModal cleanup)

**Files:**
- Modify: `src/ComplexityTimeline.tsx`

**Interfaces:**
- `TimelineEvent` loses `icon?: string`
- `EventModal` loses `icon` state and icon picker UI

- [ ] **Step 1: Remove `icon` from `TimelineEvent` type**

Find (around line 16):
```ts
type TimelineEvent = {
  label: string;
  year: number;
  layer: number;
  x: number;
  yOffset: number;
  color: string;
  borderColor: string;
  style: 'normal' | 'italic';
  type: 'state' | 'anchor';
  width?: number;
  endYear?: number;
  xOffsetPct?: number;
  icon?: string;        // anchors only: Phosphor icon name for topical timeline view
};
```

Change to:
```ts
type TimelineEvent = {
  label: string;
  year: number;
  layer: number;
  x: number;
  yOffset: number;
  color: string;
  borderColor: string;
  style: 'normal' | 'italic';
  type: 'state' | 'anchor';
  width?: number;
  endYear?: number;
  xOffsetPct?: number;
};
```

- [ ] **Step 2: Remove `icon` state from `EventModal`**

Find in `EventModal`:
```ts
  const [icon, setIcon]           = useState<string | undefined>(initialData?.icon);
```

Delete that line.

- [ ] **Step 3: Remove icon picker UI block from `EventModal`**

Find and delete this entire block in `EventModal`'s return JSX:
```tsx
      {!isState && (
        <div className="u-form-group">
          <label className="u-form-label">Icon <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span></label>
          <div className="u-icon-picker">
            <button
              type="button"
              className={`u-icon-picker-item${!icon ? ' u-icon-picker-item--selected' : ''}`}
              onClick={() => setIcon(undefined)}
              title="None"
            >
              <span style={{ fontSize: '0.7rem', color: '#6B625A' }}>–</span>
            </button>
            {ICON_PALETTE.map(({ name, Component }) => (
              <button
                key={name}
                type="button"
                className={`u-icon-picker-item${icon === name ? ' u-icon-picker-item--selected' : ''}`}
                onClick={() => setIcon(name)}
                title={name}
              >
                <Component size={16} />
              </button>
            ))}
          </div>
        </div>
      )}
```

- [ ] **Step 4: Remove `icon` from `EventModal`'s `handleSave`**

Find:
```ts
      { label: label.trim(), year, endYear: parsedEndYear, layer, x, yOffset, color, borderColor, style, type: eventType, width, xOffsetPct: initialData?.xOffsetPct, icon: eventType === 'anchor' ? icon : undefined },
```

Change to:
```ts
      { label: label.trim(), year, endYear: parsedEndYear, layer, x, yOffset, color, borderColor, style, type: eventType, width, xOffsetPct: initialData?.xOffsetPct },
```

- [ ] **Step 5: Type-check and run tests**

```bash
npx tsc --noEmit && npx vitest run
```

Expected: clean compile, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/ComplexityTimeline.tsx
git commit -m "refactor: remove icon field from anchor events and EventModal icon picker"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|---|---|
| `TopicalEvent = { label, year, icon? }` | Task 1 (type in topicalTimeline.ts) |
| `Layer = { label, icon? }` | Task 2 |
| Load migration for legacy `string[]` layers | Task 2 step 8 |
| `topicalEvents: TopicalEvent[]` in .und | Task 4 steps 6 |
| `ICON_PALETTE` moved to `iconPalette.ts` | Task 1 step 1 |
| `getAnchorsForEra` → `getEventsForEra` | Task 1 step 2 |
| `TopicalTimelineView` props: `anchors→events` | Task 1 step 5 |
| `TopicalEventModal` with label/year/icon/delete | Task 4 step 2 |
| "Add Event" toolbar button (topical mode only) | Task 4 step 8 |
| "+" per-era column button | Task 1 step 5 (component) + Task 5 step 1 (wired) |
| Event card click → edit modal | Task 1 step 5 (component) + Task 5 step 1 (wired) |
| Layer icon picker in LayerModal (Bold weight) | Task 3 step 1 |
| Bold icon in process view layer gutter | Task 3 step 3 |
| Remove `icon` from `TimelineEvent` and `EventModal` | Task 6 |
| `TIMELINE_FILE_VERSION` bump to 4 | Task 2 step 9 |
| Process buttons hidden in topical mode | Task 4 step 8 |

**Placeholder scan:** No TBDs, all steps show exact code.

**Type consistency:**
- `TopicalEvent` defined in Task 1 (`topicalTimeline.ts`), imported in Task 4 (`ComplexityTimeline.tsx`)
- `ICON_PALETTE` defined in Task 1 (`iconPalette.ts`), already imported in `ComplexityTimeline.tsx` after Task 1 step 6
- `Layer` type defined in Task 2, used in LayerModal (Task 3) and gutter render (Task 3)
- `showTopicalEventModal` shape defined in Task 4 step 3, used in Task 4 steps 4, 8, 9 and Task 5 step 1
- `saveTopicalEvent` / `deleteTopicalEvent` defined in Task 4 step 4, called in Task 4 step 9
