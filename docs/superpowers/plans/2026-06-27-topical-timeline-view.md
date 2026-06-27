# Topical Timeline View — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `TopicalTimelineView` component — a switchable era-column view of the existing timeline data — alongside a Phosphor icon picker on anchor events.

**Architecture:** A new `src/TopicalTimelineView.tsx` renders existing `Column` and `TimelineEvent` data as an HTML/CSS grid of era columns. A `viewMode` state in `ComplexityTimeline.tsx` toggles between the existing process canvas and the new view. PNG export uses html2canvas for the topical view, the existing custom Canvas renderer for the process view.

**Tech Stack:** React 18, TypeScript 5, Vite, Vitest, `@phosphor-icons/react`, `html2canvas`, existing `understory.css` patterns.

## Global Constraints

- All CSS classes prefixed `u-topical-*` — never use inline styles except for dynamic color values derived from data.
- No new state management layer — `TopicalTimelineView` is props-only, receiving data from `ComplexityTimeline`.
- `Column` type lives in `ComplexityTimeline.tsx` — do not move it.
- `TimelineEvent` type lives in `ComplexityTimeline.tsx` — do not move it.
- Follow existing modal pattern (use the `Modal` component already in `ComplexityTimeline.tsx`).
- Run `npm test` after every task to confirm no regressions.
- The `src/bak/` directory is excluded from TypeScript — do not touch it.
- Icon names must exactly match exports from `@phosphor-icons/react` — verify each one compiles.

---

## File Map

| File | Status | Responsibility |
|------|--------|----------------|
| `src/TopicalTimelineView.tsx` | **Create** | Renders era-column grid; exports utility fns |
| `src/utils/topicalTimeline.ts` | **Create** | Pure helpers: `getAnchorsForEra`, `formatEraRange` |
| `src/utils/topicalTimeline.test.ts` | **Create** | Unit tests for the two pure helpers |
| `src/understory.css` | **Modify** | Add `u-topical-*` styles |
| `src/ComplexityTimeline.tsx` | **Modify** | Add `icon?` to `TimelineEvent`; add `color?` to `Column`; update `ColumnModal`; add icon picker to `EventModal`; add `viewMode` state + toggle buttons; wire export |
| `package.json` | **Modify** | Add `@phosphor-icons/react`, `html2canvas`, `@types/html2canvas` |

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json`

**Interfaces:**
- Produces: `@phosphor-icons/react` importable; `html2canvas` importable with types

- [ ] **Step 1: Install packages**

```bash
cd /Users/jeremy/Projects/understory
npm install @phosphor-icons/react html2canvas
npm install --save-dev @types/html2canvas
```

Expected output ends with something like `added N packages`.

- [ ] **Step 2: Verify TypeScript resolves both packages**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors about missing types for `@phosphor-icons/react` or `html2canvas`.

- [ ] **Step 3: Run existing tests to confirm no breakage**

```bash
npm test
```

Expected: all existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add @phosphor-icons/react and html2canvas"
```

---

## Task 2: Pure utility helpers + tests

**Files:**
- Create: `src/utils/topicalTimeline.ts`
- Create: `src/utils/topicalTimeline.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // Returns anchors whose year falls within [era.startYear, era.endYear], sorted ascending by year,
  // filtered to importance === 'major' OR visibleLabel === true
  getAnchorsForEra(
    anchors: Array<{ year: number; type: 'state' | 'anchor'; importance?: string; visibleLabel?: boolean }>,
    era: { startYear: number; endYear: number }
  ): typeof anchors

  // Returns a formatted year-range string, e.g. "1968–1992" or "2022–Present"
  // Uses an en-dash (–), not a hyphen
  // If era.endYear >= currentYear (passed as argument), appends "Present" instead of the number
  formatEraRange(era: { startYear: number; endYear: number }, currentYear: number): string
  ```

- [ ] **Step 1: Write the failing tests**

Create `src/utils/topicalTimeline.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getAnchorsForEra, formatEraRange } from './topicalTimeline';

const baseAnchor = { year: 0, type: 'anchor' as const };

describe('getAnchorsForEra', () => {
  const era = { startYear: 1990, endYear: 2005 };

  it('returns empty array when no anchors', () => {
    expect(getAnchorsForEra([], era)).toEqual([]);
  });

  it('excludes non-anchor type events', () => {
    const events = [{ ...baseAnchor, type: 'state' as const, year: 1995, importance: 'major' }];
    expect(getAnchorsForEra(events, era)).toEqual([]);
  });

  it('excludes anchors outside the era', () => {
    const events = [
      { ...baseAnchor, year: 1989, importance: 'major' },
      { ...baseAnchor, year: 2006, importance: 'major' },
    ];
    expect(getAnchorsForEra(events, era)).toEqual([]);
  });

  it('includes anchors at era boundary years', () => {
    const a1 = { ...baseAnchor, year: 1990, importance: 'major' };
    const a2 = { ...baseAnchor, year: 2005, importance: 'major' };
    expect(getAnchorsForEra([a1, a2], era)).toHaveLength(2);
  });

  it('filters to importance===major or visibleLabel===true', () => {
    const major = { ...baseAnchor, year: 1995, importance: 'major' };
    const visible = { ...baseAnchor, year: 1996, importance: 'supporting', visibleLabel: true };
    const minor = { ...baseAnchor, year: 1997, importance: 'supporting' };
    const result = getAnchorsForEra([major, visible, minor], era);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(major);
    expect(result[1]).toBe(visible);
  });

  it('sorts by year ascending', () => {
    const a1 = { ...baseAnchor, year: 2000, importance: 'major' };
    const a2 = { ...baseAnchor, year: 1993, importance: 'major' };
    const result = getAnchorsForEra([a1, a2], era);
    expect(result[0].year).toBe(1993);
    expect(result[1].year).toBe(2000);
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

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- topicalTimeline
```

Expected: `FAIL` — module not found.

- [ ] **Step 3: Implement the helpers**

Create `src/utils/topicalTimeline.ts`:

```ts
type MinimalAnchor = {
  year: number;
  type: 'state' | 'anchor';
  importance?: string;
  visibleLabel?: boolean;
};

type Era = { startYear: number; endYear: number };

export function getAnchorsForEra<T extends MinimalAnchor>(anchors: T[], era: Era): T[] {
  return anchors
    .filter(a =>
      a.type === 'anchor' &&
      a.year >= era.startYear &&
      a.year <= era.endYear &&
      (a.importance === 'major' || a.visibleLabel === true)
    )
    .sort((a, b) => a.year - b.year);
}

export function formatEraRange(era: Era, currentYear: number): string {
  const end = era.endYear >= currentYear ? 'Present' : String(era.endYear);
  return `${era.startYear}–${end}`;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- topicalTimeline
```

Expected: all 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/topicalTimeline.ts src/utils/topicalTimeline.test.ts
git commit -m "feat: add topical timeline utility helpers with tests"
```

---

## Task 3: Data model updates in `ComplexityTimeline.tsx`

**Files:**
- Modify: `src/ComplexityTimeline.tsx` (lines 13–47 and the `ColumnModal` component ~line 519)

**Interfaces:**
- Consumes: existing `TimelineEvent` and `Column` types
- Produces:
  ```ts
  // Updated TimelineEvent — adds one optional field
  type TimelineEvent = {
    // ... all existing fields unchanged ...
    icon?: string; // Phosphor icon name e.g. "BookOpen" — anchors only
  };

  // Updated Column — adds one optional field
  type Column = {
    label: string;
    startYear: number;
    endYear: number;
    dateRange?: string;
    description?: string;
    color?: string; // hex color for the era column background
  };
  ```

- [ ] **Step 1: Add `icon?` to `TimelineEvent`**

In `src/ComplexityTimeline.tsx`, find the `TimelineEvent` type (line 13) and add the field after `xOffsetPct?`:

Old:
```ts
  xOffsetPct?: number; // anchors only: signed offset from parent state's x (% units)
};
```

New:
```ts
  xOffsetPct?: number; // anchors only: signed offset from parent state's x (% units)
  icon?: string;        // anchors only: Phosphor icon name for topical timeline view
};
```

- [ ] **Step 2: Add `color?` to `Column`**

In `src/ComplexityTimeline.tsx`, find line 47:

Old:
```ts
type Column = { label: string; startYear: number; endYear: number; dateRange?: string; description?: string };
```

New:
```ts
type Column = { label: string; startYear: number; endYear: number; dateRange?: string; description?: string; color?: string };
```

- [ ] **Step 3: Update `ColumnModal` to expose `color` + relabel `description`**

Find the `ColumnModal` component (~line 519). Add a `color` state and field, and update the description label:

Change the state block at the top of `ColumnModal`:

Old:
```ts
  const [description, setDescription] = useState(initialData?.description ?? '');
```

New:
```ts
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [color, setColor]             = useState(initialData?.color ?? '#D2BDA3');
```

Update the description form group label and placeholder:

Old:
```tsx
      <div className="u-form-group">
        <label className="u-form-label">Description (optional)</label>
        <input className="u-form-input" type="text" placeholder="Brief description of this period"
          value={description} onChange={e => setDescription(e.target.value)} />
      </div>
```

New:
```tsx
      <div className="u-form-group">
        <label className="u-form-label">Main institutional shift <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span></label>
        <textarea className="u-form-input u-form-textarea" placeholder="Describe the key shift that defines this era…"
          value={description} onChange={e => setDescription(e.target.value)} rows={3} />
      </div>
      <div className="u-form-group">
        <label className="u-form-label">Era color</label>
        <input className="u-form-color" type="color" value={color} onChange={e => setColor(e.target.value)} />
      </div>
```

Update the `onSave` call at the bottom of `ColumnModal` to include `color`:

Old:
```ts
      })} disabled={!label.trim()}>
```

The full `onSave` call:

Old:
```tsx
      <button className="u-btn u-btn--column u-btn--full" onClick={() => label.trim() && onSave({
        label: label.trim(), startYear: colStart, endYear: colEnd,
        dateRange: dateRange.trim() || undefined, description: description.trim() || undefined,
      })} disabled={!label.trim()}>
```

New:
```tsx
      <button className="u-btn u-btn--column u-btn--full" onClick={() => label.trim() && onSave({
        label: label.trim(), startYear: colStart, endYear: colEnd,
        dateRange: dateRange.trim() || undefined,
        description: description.trim() || undefined,
        color: color || undefined,
      })} disabled={!label.trim()}>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/ComplexityTimeline.tsx
git commit -m "feat: add icon field to TimelineEvent, color+description to Column modal"
```

---

## Task 4: `TopicalTimelineView` component

**Files:**
- Create: `src/TopicalTimelineView.tsx`

**Interfaces:**
- Consumes:
  ```ts
  // From Task 3
  type TimelineEvent = { /* full type including icon?: string */ };
  type Column = { /* full type including color?: string, description?: string */ };

  // From Task 2
  import { getAnchorsForEra, formatEraRange } from './utils/topicalTimeline';
  ```
- Produces:
  ```ts
  // forwardRef component
  const TopicalTimelineView: React.ForwardRefExoticComponent<
    TopicalTimelineViewProps & React.RefAttributes<HTMLDivElement>
  >

  type TopicalTimelineViewProps = {
    title: string;
    subtitle?: string;
    eras: Column[];          // Column is what the spec calls "Era"
    anchors: TimelineEvent[];
    printMode?: boolean;
  };

  // Also exports the icon palette for use in EventModal (Task 5)
  export const ICON_PALETTE: Array<{ name: string; Component: React.ComponentType<{ size?: number; color?: string }> }>;
  ```

- [ ] **Step 1: Create `src/TopicalTimelineView.tsx`**

```tsx
import React, { forwardRef } from 'react';
import {
  Buildings, BookOpen, Users, Star, MapPin, ChartBar, Heart, GraduationCap,
  Handshake, Megaphone, Globe, Newspaper, Certificate, Tree, Scales, Lightbulb,
  Briefcase, FileText, PencilLine, Network, ArrowsCounterClockwise, Toolbox,
  PresentationChart, ClipboardText, Medal, Link, House, Microphone, Compass,
  Calendar, Flask, ChalkboardTeacher, BankNote, ArrowRight, Flag, Sparkle,
} from '@phosphor-icons/react';
import { getAnchorsForEra, formatEraRange } from './utils/topicalTimeline';

type TimelineEvent = {
  label: string;
  year: number;
  type: 'state' | 'anchor';
  importance?: string;
  visibleLabel?: boolean;
  icon?: string;
};

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
  anchors: TimelineEvent[];
  printMode?: boolean;
};

type IconComponent = React.ComponentType<{ size?: number; color?: string }>;

export const ICON_PALETTE: Array<{ name: string; Component: IconComponent }> = [
  { name: 'Buildings',               Component: Buildings },
  { name: 'BookOpen',                Component: BookOpen },
  { name: 'Users',                   Component: Users },
  { name: 'Star',                    Component: Star },
  { name: 'MapPin',                  Component: MapPin },
  { name: 'ChartBar',                Component: ChartBar },
  { name: 'Heart',                   Component: Heart },
  { name: 'GraduationCap',           Component: GraduationCap },
  { name: 'Handshake',               Component: Handshake },
  { name: 'Megaphone',               Component: Megaphone },
  { name: 'Globe',                   Component: Globe },
  { name: 'Newspaper',               Component: Newspaper },
  { name: 'Certificate',             Component: Certificate },
  { name: 'Tree',                    Component: Tree },
  { name: 'Scales',                  Component: Scales },
  { name: 'Lightbulb',              Component: Lightbulb },
  { name: 'Briefcase',               Component: Briefcase },
  { name: 'FileText',                Component: FileText },
  { name: 'PencilLine',              Component: PencilLine },
  { name: 'Network',                 Component: Network },
  { name: 'ArrowsCounterClockwise',  Component: ArrowsCounterClockwise },
  { name: 'Toolbox',                 Component: Toolbox },
  { name: 'PresentationChart',       Component: PresentationChart },
  { name: 'ClipboardText',           Component: ClipboardText },
  { name: 'Medal',                   Component: Medal },
  { name: 'Link',                    Component: Link },
  { name: 'House',                   Component: House },
  { name: 'Microphone',              Component: Microphone },
  { name: 'Compass',                 Component: Compass },
  { name: 'Calendar',                Component: Calendar },
  { name: 'Flask',                   Component: Flask },
  { name: 'ChalkboardTeacher',       Component: ChalkboardTeacher },
  { name: 'BankNote',               Component: BankNote },
  { name: 'ArrowRight',              Component: ArrowRight },
  { name: 'Flag',                    Component: Flag },
  { name: 'Sparkle',                 Component: Sparkle },
];

const ICON_MAP = Object.fromEntries(ICON_PALETTE.map(({ name, Component }) => [name, Component]));

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

export const TopicalTimelineView = forwardRef<HTMLDivElement, TopicalTimelineViewProps>(
  ({ title, subtitle, eras, anchors, printMode = false }, ref) => {
    const currentYear = new Date().getFullYear();
    const sorted = [...eras].sort((a, b) => a.startYear - b.startYear);

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
          const eraAnchors = getAnchorsForEra(anchors, era);
          const eraColor = era.color ?? '#D2BDA3';
          const rgbColor = hexToRgb(eraColor);

          return (
            <div
              key={`${era.startYear}-${era.label}`}
              className="u-topical-col"
              style={{ backgroundColor: `rgba(${rgbColor}, 0.12)`, borderTopColor: eraColor }}
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
                {eraAnchors.map((anchor) => {
                  const IconComponent = anchor.icon ? ICON_MAP[anchor.icon] : null;
                  return (
                    <li key={`${anchor.year}-${anchor.label}`} className="u-topical-event">
                      <span className="u-topical-event-icon" style={{ color: eraColor }}>
                        {IconComponent
                          ? <IconComponent size={18} color={eraColor} />
                          : <span className="u-topical-event-dot" style={{ background: eraColor }} />
                        }
                      </span>
                      <span className="u-topical-event-year">{anchor.year}</span>
                      <span className="u-topical-event-label">{anchor.label}</span>
                    </li>
                  );
                })}
              </ul>

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

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. If Phosphor exports any icon under a different name (e.g., `ChalkboardTeacher` may be named differently), fix the import. Check the exact export name with:

```bash
node -e "const p = require('./node_modules/@phosphor-icons/react/dist/index.cjs'); console.log(Object.keys(p).filter(k => k.toLowerCase().includes('chalk')))"
```

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/TopicalTimelineView.tsx
git commit -m "feat: add TopicalTimelineView component"
```

---

## Task 5: CSS styles for the topical view

**Files:**
- Modify: `src/understory.css`

**Interfaces:**
- Consumes: class names defined in Task 4 (`u-topical-root`, `u-topical-col`, etc.)
- Produces: visual styling consistent with the existing Understory design language

- [ ] **Step 1: Append `u-topical-*` styles to `src/understory.css`**

Append the following block at the end of `src/understory.css`:

```css
/* ── Topical Timeline View ───────────────────────────────── */

.u-topical-root {
  display: grid;
  gap: 0;
  background: #F2ECD7;
  font-family: 'Alegreya Sans', sans-serif;
  color: #4A4A4A;
  min-height: 100%;
}

.u-topical-root--print * {
  cursor: default !important;
}

.u-topical-header {
  padding: 24px 28px 16px;
  border-bottom: 1px solid #D2BDA3;
}

.u-topical-title {
  font-size: 1.45rem;
  font-weight: 700;
  margin: 0 0 4px;
  color: #3E3B35;
  letter-spacing: 0.01em;
}

.u-topical-subtitle {
  font-size: 0.88rem;
  font-style: italic;
  margin: 0;
  color: #6B625A;
}

.u-topical-col {
  display: flex;
  flex-direction: column;
  border-top: 4px solid transparent;
  border-right: 1px solid rgba(0,0,0,0.08);
  min-height: 360px;
}

.u-topical-col:last-child {
  border-right: none;
}

.u-topical-col-header {
  padding: 16px 16px 12px;
  border-bottom: 1px solid rgba(0,0,0,0.07);
}

.u-topical-era-range {
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.u-topical-era-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 2px;
  line-height: 1.25;
  color: #3E3B35;
}

.u-topical-era-subtitle {
  font-size: 0.78rem;
  font-style: italic;
  margin: 0;
  color: #6B625A;
  line-height: 1.35;
}

.u-topical-event-list {
  list-style: none;
  margin: 0;
  padding: 12px 14px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.u-topical-event {
  display: grid;
  grid-template-columns: 22px 44px 1fr;
  align-items: start;
  gap: 4px;
  font-size: 0.82rem;
  line-height: 1.35;
}

.u-topical-event-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 1px;
}

.u-topical-event-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.u-topical-event-year {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #3E3B35;
  white-space: nowrap;
}

.u-topical-event-label {
  color: #4A4A4A;
}

.u-topical-col-footer {
  padding: 12px 14px;
  border-top: 1px solid transparent;
  margin-top: auto;
}

.u-topical-shift-label {
  display: block;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #6B625A;
  margin-bottom: 6px;
}

.u-topical-shift-text {
  font-size: 0.8rem;
  font-style: italic;
  margin: 0;
  color: #4A4A4A;
  line-height: 1.45;
}

/* ── /Topical Timeline View ──────────────────────────────── */
```

- [ ] **Step 2: Verify TypeScript still compiles (CSS change shouldn't affect TS)**

```bash
npx tsc --noEmit && npm test
```

Expected: no errors, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/understory.css
git commit -m "style: add u-topical-* CSS for topical timeline view"
```

---

## Task 6: Icon picker in `EventModal`

**Files:**
- Modify: `src/ComplexityTimeline.tsx` — `EventModal` component (~line 377)

**Interfaces:**
- Consumes: `ICON_PALETTE` exported from `src/TopicalTimelineView.tsx`
- Produces: `anchor.icon` set/cleared via the existing `onSave` path

- [ ] **Step 1: Import `ICON_PALETTE` at the top of `ComplexityTimeline.tsx`**

Add this import after the existing imports (around line 5):

```ts
import { ICON_PALETTE } from './TopicalTimelineView';
```

- [ ] **Step 2: Add `icon` state to `EventModal`**

Inside `EventModal`, after the existing `useState` declarations (around line 400), add:

```ts
  const [icon, setIcon] = useState<string | undefined>(initialData?.icon);
```

- [ ] **Step 3: Include `icon` in the `handleSave` call**

In `EventModal.handleSave`, the `onSave` call currently passes a `TimelineEvent`. Add `icon` to it:

Old:
```ts
    onSave(
      { label: label.trim(), year, endYear: parsedEndYear, layer, x, yOffset, color, borderColor, style, type: eventType, width, xOffsetPct: initialData?.xOffsetPct },
```

New:
```ts
    onSave(
      { label: label.trim(), year, endYear: parsedEndYear, layer, x, yOffset, color, borderColor, style, type: eventType, width, xOffsetPct: initialData?.xOffsetPct, icon: eventType === 'anchor' ? icon : undefined },
```

- [ ] **Step 4: Render the icon picker in `EventModal` JSX — anchors only**

After the Style `<select>` form group (~line 511) and before the save button, add:

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

- [ ] **Step 5: Add icon picker CSS to `understory.css`**

Append after the topical timeline block:

```css
/* ── Icon picker (EventModal) ────────────────────────────── */

.u-icon-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 6px 0;
}

.u-icon-picker-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: rgba(0,0,0,0.04);
  cursor: pointer;
  color: #4A4A4A;
  transition: background 0.1s, border-color 0.1s;
}

.u-icon-picker-item:hover {
  background: rgba(0,0,0,0.09);
}

.u-icon-picker-item--selected {
  border-color: var(--btn-event, #5a7a5a);
  background: rgba(90, 122, 90, 0.12);
}

/* ── /Icon picker ────────────────────────────────────────── */
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/ComplexityTimeline.tsx src/understory.css
git commit -m "feat: add Phosphor icon picker to anchor event modal"
```

---

## Task 7: Wire view toggle + export in `ComplexityTimeline.tsx`

**Files:**
- Modify: `src/ComplexityTimeline.tsx` — state, toolbar JSX, canvas area JSX, `exportPNG`

**Interfaces:**
- Consumes: `TopicalTimelineView` (default export) from `src/TopicalTimelineView.tsx`; `html2canvas` from `html2canvas`
- Produces: working view toggle; export that routes to the correct renderer based on `viewMode`

- [ ] **Step 1: Add imports to `ComplexityTimeline.tsx`**

After the existing imports, add:

```ts
import html2canvas from 'html2canvas';
import { TopicalTimelineView } from './TopicalTimelineView';
```

- [ ] **Step 2: Add `viewMode` state and `topicalViewRef`**

In the component body, after the existing `useRef` declarations (~line 834), add:

```ts
  const [viewMode, setViewMode] = useState<'process' | 'topical'>('process');
  const topicalViewRef = useRef<HTMLDivElement>(null);
```

- [ ] **Step 3: Add view toggle buttons to the toolbar**

In the toolbar JSX, find the existing left-side buttons group (~line 1850). After the existing Add buttons, add a view toggle group:

```tsx
        <div className="u-toolbar-sep" />
        <button
          className={`u-btn${viewMode === 'process' ? ' u-btn--active' : ''}`}
          onClick={() => setViewMode('process')}
          title="Process view"
        >
          <Layers size={13} /> Process
        </button>
        <button
          className={`u-btn${viewMode === 'topical' ? ' u-btn--active' : ''}`}
          onClick={() => setViewMode('topical')}
          title="Topical timeline view"
        >
          <Columns size={13} /> Timeline
        </button>
```

*(Note: `Layers` and `Columns` are already imported from `lucide-react` at line 2.)*

- [ ] **Step 4: Add `exportTopicalPNG` function**

After the existing `exportPNG` function (~line 1797), add:

```ts
  const exportTopicalPNG = async () => {
    if (!topicalViewRef.current) return;
    const el = topicalViewRef.current;
    // Temporarily enable print mode to remove hover/scroll artifacts
    el.classList.add('u-topical-root--print');
    try {
      const canvas = await html2canvas(el, {
        backgroundColor: '#F2ECD7',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      canvas.toBlob(blob => {
        if (!blob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'understory-topical-timeline.png';
        a.click();
      }, 'image/png');
    } finally {
      el.classList.remove('u-topical-root--print');
    }
  };
```

- [ ] **Step 5: Update the Export button to route by `viewMode`**

Find the Export PNG button (~line 1890):

Old:
```tsx
          <button className="u-btn u-btn--export" onClick={() => exportPNG(selectedProfile)} title="Export as PNG image at 300dpi">
            <Image size={13} /> Export
          </button>
```

New:
```tsx
          <button
            className="u-btn u-btn--export"
            onClick={() => viewMode === 'topical' ? exportTopicalPNG() : exportPNG(selectedProfile)}
            title="Export as PNG image"
          >
            <Image size={13} /> Export
          </button>
```

- [ ] **Step 6: Replace the canvas area with a conditional render**

Find the canvas area section (~line 1919):

Old (rough shape):
```tsx
      {/* CANVAS */}
      <div className="u-canvas-area" ref={canvasAreaRef}>
        <div className="u-canvas-row" style={{ height: timelineHeight }}>
          {/* ... all process view content ... */}
        </div>
      </div>
```

Wrap the existing canvas area in a conditional and add the topical view:

```tsx
      {/* CANVAS */}
      {viewMode === 'process' ? (
        <div className="u-canvas-area" ref={canvasAreaRef}>
          <div className="u-canvas-row" style={{ height: timelineHeight }}>
            {/* leave all existing process view content entirely unchanged */}
```

Close the process branch and add the topical branch immediately after the closing tags of the canvas area `div`s:

```tsx
          </div>
        </div>
      ) : (
        <div className="u-topical-area">
          <TopicalTimelineView
            ref={topicalViewRef}
            title={title}
            subtitle={subtitle}
            eras={columns}
            anchors={events}
          />
        </div>
      )}
```

*(Note: `title` and `subtitle` are existing state fields in `ComplexityTimeline`. If not present as state, pass the document filename or an empty string. Check around line 800 for `useState` declarations to confirm the variable names.)*

- [ ] **Step 7: Add `.u-topical-area` to CSS**

Append to `src/understory.css`:

```css
.u-topical-area {
  flex: 1;
  overflow: auto;
  background: #F2ECD7;
}
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. If `title` or `subtitle` aren't valid state variables, check what the document title field is named and adjust the prop accordingly.

- [ ] **Step 9: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 10: Start the dev server and manually verify**

```bash
npm run dev
```

Check:
1. App loads on `http://localhost:5173` — process view visible as before.
2. "Timeline" toggle button appears in toolbar.
3. Clicking "Timeline" shows the topical view (era columns from any existing `Column` data; empty if no columns added yet).
4. Add a Column with a label, year range, color, and "Main institutional shift" text — verify it appears in the topical view footer.
5. Add an Anchor event — verify the icon picker appears; select an icon; switch to Timeline view — verify the icon renders.
6. Click Export while in Timeline view — verify a PNG downloads.
7. Click "Process" — process view is restored unchanged.

- [ ] **Step 11: Commit**

```bash
git add src/ComplexityTimeline.tsx src/understory.css
git commit -m "feat: wire TopicalTimelineView with view toggle and PNG export"
```

---

## Self-Review Checklist

**Spec coverage:**

| Spec section | Task |
|---|---|
| New `TopicalTimelineView` component | Task 4 |
| `forwardRef` for export capture | Task 4 |
| `icon?` on `TimelineEvent` | Task 3 |
| `color?` on `Column` | Task 3 |
| `era.description` as "Main institutional shift" | Task 3 (ColumnModal label) |
| 36-icon Phosphor palette | Task 4 (`ICON_PALETTE`) |
| Icon picker in anchor edit modal | Task 6 |
| `u-topical-*` CSS prefix | Task 5, 6, 7 |
| HTML/CSS grid layout (not SVG) | Task 4 |
| Era-colored column headers | Task 4 (`borderTopColor`, `rgba` bg) |
| Anchor filter: `importance===major` or `visibleLabel===true` | Task 2 (`getAnchorsForEra`) |
| Anchors sorted ascending by year | Task 2 |
| Fallback dot when no icon | Task 4 |
| `printMode` removes hover styles | Task 7 (adds/removes class) |
| View toggle buttons in toolbar | Task 7 |
| Export PNG uses correct renderer by viewMode | Task 7 |
| `@phosphor-icons/react` dependency | Task 1 |
| `html2canvas` dependency | Task 1 |
| Tests for pure helpers | Task 2 |

**No placeholders detected.**

**Type consistency:** `ICON_PALETTE` defined in Task 4 and imported in Task 6. `getAnchorsForEra` / `formatEraRange` defined in Task 2, consumed in Task 4. `TimelineEvent.icon` added in Task 3, used in Task 4 and Task 6. `Column.color` added in Task 3, consumed in Task 4. All consistent.
