# Process Mapping Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor Understory from a point-event timeline tool into a Taylor-style historical process mapping tool with three coordinated views (Process, Timeline, Influence Map) backed by a new canonical `UnderstoryDocument` data model.

**Architecture:** Replace the existing flat state (`layers`, `events`, `connections`, `columns`, `trends`) in the 2183-line `ComplexityTimeline.tsx` monolith with a `UnderstoryDocument` record managed by a custom hook with localStorage auto-save. Extract three independent view components that all consume the same document. A new `UnderstoryApp.tsx` replaces `ComplexityTimeline.tsx` as the entry point. All visualization uses SVG.

**Tech Stack:** React 18, TypeScript 5.5, Vite 8, Vitest (to be installed), lucide-react icons, SVG for all rendering.

## Global Constraints

- Client-side only — no backend, no network requests
- All shared types live in `src/types.ts` — never redefine inline
- All views read from `UnderstoryDocument`; mutations go through `useUnderstoryDocument` hook
- Process View **must** use SVG (not absolute-positioned HTML)
- Interactions require a non-empty `verb` — enforce in the modal
- `src/ComplexityTimeline.tsx` is deleted in Task 10 once `UnderstoryApp` is wired up in `main.tsx`
- Seed document in `src/seedData.ts` is the default initial state

---

### Task 1: Vitest Setup + TypeScript Types

**Files:**
- Modify: `vite.config.ts`
- Create: `src/test-setup.ts`
- Create: `src/types.ts`
- Create: `src/types.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `UnderstoryDocument`, `Era`, `ProcessDomain`, `HistoricalProcess`, `AnchorEvent`, `ProcessInteraction`, `SourceNote`, `DisplaySettings`, `SelectedItem` — used by every subsequent task

- [ ] **Step 1: Install Vitest and testing dependencies**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Expected: packages added, no errors.

- [ ] **Step 2: Add test script to `package.json`**

In `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Update `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

- [ ] **Step 4: Create `src/test-setup.ts`**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Write failing type test**

Create `src/types.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import type { AnchorEvent } from './types'

describe('types', () => {
  it('AnchorEvent importance values are well-typed', () => {
    const a: AnchorEvent = {
      id: 'test',
      label: 'Test',
      year: 2000,
      processId: 'p1',
      domainId: 'd1',
      importance: 'major',
    }
    expect(a.importance).toBe('major')
  })
})
```

Run: `npm test`
Expected: FAIL — "Cannot find module './types'"

- [ ] **Step 6: Create `src/types.ts`**

```ts
export type UnderstoryDocument = {
  title: string;
  subtitle?: string;
  startYear: number;
  endYear: number;
  eras: Era[];
  processDomains: ProcessDomain[];
  processes: HistoricalProcess[];
  anchors: AnchorEvent[];
  interactions: ProcessInteraction[];
  sources: SourceNote[];
  settings: DisplaySettings;
};

export type Era = {
  id: string;
  label: string;
  startYear: number;
  endYear: number;
  color?: string;
  description?: string;
};

export type ProcessDomain = {
  id: string;
  label: string;
  shortLabel?: string;
  color: string;
  icon?: string;
  order: number;
  description?: string;
};

export type HistoricalProcess = {
  id: string;
  domainId: string;
  label: string;
  startYear: number;
  endYear?: number;
  continues?: boolean;
  description?: string;
  importance?: 'primary' | 'secondary' | 'context';
};

export type AnchorEvent = {
  id: string;
  label: string;
  year: number;
  processId: string;
  domainId: string;
  importance: 'major' | 'supporting' | 'context';
  description?: string;
  sourceIds?: string[];
  confidence?: 'confirmed' | 'probable' | 'needs-verification';
  visibleLabel?: boolean;
};

export type ProcessInteraction = {
  id: string;
  fromId: string;
  toId: string;
  fromType: 'process' | 'anchor';
  toType: 'process' | 'anchor';
  year?: number;
  verb: string;
  description?: string;
  strength?: 'strong' | 'moderate' | 'contextual';
  sourceIds?: string[];
  confidence?: 'confirmed' | 'probable' | 'interpretive';
  visible?: boolean;
};

export type SourceNote = {
  id: string;
  label: string;
  citation?: string;
  url?: string;
  note?: string;
};

export type DisplaySettings = {
  activeView: 'process' | 'timeline' | 'influence';
  showEras: boolean;
  showMinorAnchors: boolean;
  showInteractionLabels: boolean;
  showOnlyMajorInteractions: boolean;
  exportTheme: 'light' | 'dark' | 'print';
};

export type SelectedItem =
  | { kind: 'process'; id: string }
  | { kind: 'anchor'; id: string }
  | { kind: 'interaction'; id: string }
  | { kind: 'domain'; id: string }
  | { kind: 'era'; id: string };
```

- [ ] **Step 7: Run tests — verify they pass**

```bash
npm test
```
Expected: PASS — 1 test.

- [ ] **Step 8: Commit**

```bash
git add vite.config.ts src/test-setup.ts src/types.ts src/types.test.ts package.json package-lock.json
git commit -m "feat: add Vitest, define UnderstoryDocument type hierarchy"
```

---

### Task 2: Seed Data + Document State Hook

**Files:**
- Create: `src/seedData.ts`
- Create: `src/useUnderstoryDocument.ts`
- Create: `src/useUnderstoryDocument.test.ts`

**Interfaces:**
- Consumes: all types from `src/types.ts`
- Produces:
  - `SEED_DOCUMENT: UnderstoryDocument` (default initial state)
  - `useUnderstoryDocument()` → `{ doc, setDoc, addEra, removeEra, updateEra, addDomain, removeDomain, updateDomain, addProcess, removeProcess, updateProcess, addAnchor, removeAnchor, updateAnchor, addInteraction, removeInteraction, updateInteraction, setActiveView, setSettings, importDoc, exportDocJson }`

- [ ] **Step 1: Write failing hook test**

Create `src/useUnderstoryDocument.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUnderstoryDocument } from './useUnderstoryDocument'

beforeEach(() => localStorage.clear())

describe('useUnderstoryDocument', () => {
  it('initializes with seed document', () => {
    const { result } = renderHook(() => useUnderstoryDocument())
    expect(result.current.doc.processDomains).toHaveLength(6)
    expect(result.current.doc.settings.activeView).toBe('process')
  })

  it('addEra appends an era', () => {
    const { result } = renderHook(() => useUnderstoryDocument())
    act(() => result.current.addEra({ id: 'new', label: 'New', startYear: 2027, endYear: 2030 }))
    expect(result.current.doc.eras).toHaveLength(5)
    expect(result.current.doc.eras.at(-1)!.id).toBe('new')
  })

  it('removeAnchor removes by id', () => {
    const { result } = renderHook(() => useUnderstoryDocument())
    const before = result.current.doc.anchors.length
    act(() => result.current.removeAnchor('lugar-1968'))
    expect(result.current.doc.anchors).toHaveLength(before - 1)
  })

  it('auto-saves to localStorage', () => {
    const { result } = renderHook(() => useUnderstoryDocument())
    act(() => result.current.setActiveView('timeline'))
    const saved = JSON.parse(localStorage.getItem('understory-document') ?? '{}')
    expect(saved.settings.activeView).toBe('timeline')
  })

  it('importDoc replaces the document', () => {
    const { result } = renderHook(() => useUnderstoryDocument())
    act(() => result.current.importDoc(JSON.stringify({
      ...result.current.doc,
      title: 'Imported Title'
    })))
    expect(result.current.doc.title).toBe('Imported Title')
  })
})
```

Run: `npm test`
Expected: FAIL — "Cannot find module './useUnderstoryDocument'"

- [ ] **Step 2: Create `src/seedData.ts`**

```ts
import type { UnderstoryDocument } from './types'

export const SEED_DOCUMENT: UnderstoryDocument = {
  title: 'Intersecting Processes in the Development of Community-Engaged Scholarship at IU Indianapolis',
  subtitle: 'A Taylor-inspired process map',
  startYear: 1968,
  endYear: 2026,
  eras: [
    { id: 'foundational', label: 'Foundational Urban Roots', startYear: 1968, endYear: 1992, color: '#D2BDA3' },
    { id: 'codifying', label: 'Codifying Engagement', startYear: 1993, endYear: 2005, color: '#BC7A5A' },
    { id: 'institutionalization', label: 'Institutionalization & Recognition', startYear: 2006, endYear: 2021, color: '#4B7F52' },
    { id: 'realignment', label: 'Realignment & Impact Infrastructure', startYear: 2022, endYear: 2026, color: '#3F5E78' },
  ],
  processDomains: [
    { id: 'urban', label: 'Urban Mission & Civic Identity', color: '#4E342E', order: 1 },
    { id: 'pedagogy', label: 'Pedagogy & Engaged Learning', color: '#BC7A5A', order: 2 },
    { id: 'neighborhood', label: 'Neighborhood Partnerships & Community Work', color: '#4B7F52', order: 3 },
    { id: 'scholarship', label: 'Scholarship & Public Knowledge', color: '#3F5E78', order: 4 },
    { id: 'infrastructure', label: 'Institutional Infrastructure', color: '#A64B42', order: 5 },
    { id: 'recognition', label: 'Assessment, Recognition & Impact', color: '#6A5ACD', order: 6 },
  ],
  processes: [
    { id: 'urban-mission', domainId: 'urban', label: 'Urban Mission', startYear: 1968, endYear: 2026, continues: true, importance: 'primary' },
    { id: 'engaged-pedagogy', domainId: 'pedagogy', label: 'Engaged Pedagogy', startYear: 1993, endYear: 2026, continues: true, importance: 'primary' },
    { id: 'neighborhood-partnerships', domainId: 'neighborhood', label: 'Neighborhood Partnerships', startYear: 1997, endYear: 2026, continues: true, importance: 'primary' },
    { id: 'public-scholarship', domainId: 'scholarship', label: 'Public Scholarship', startYear: 2004, endYear: 2026, continues: true, importance: 'primary' },
    { id: 'institutional-infrastructure', domainId: 'infrastructure', label: 'Institutional Infrastructure', startYear: 1994, endYear: 2026, continues: true, importance: 'primary' },
    { id: 'recognition-impact', domainId: 'recognition', label: 'Recognition & Impact Systems', startYear: 2006, endYear: 2026, continues: true, importance: 'primary' },
  ],
  anchors: [
    { id: 'lugar-1968', label: 'Mayor Lugar calls for urban university', year: 1968, processId: 'urban-mission', domainId: 'urban', importance: 'major', confidence: 'confirmed', visibleLabel: true },
    { id: 'iupui-1969', label: 'IUPUI established', year: 1969, processId: 'urban-mission', domainId: 'urban', importance: 'major', confidence: 'confirmed', visibleLabel: true },
    { id: 'philanthropy-1987', label: 'Center on Philanthropy established', year: 1987, processId: 'urban-mission', domainId: 'urban', importance: 'supporting', confidence: 'confirmed', visibleLabel: false },
    { id: 'osl-1993', label: 'Office of Service-Learning established', year: 1993, processId: 'engaged-pedagogy', domainId: 'pedagogy', importance: 'major', confidence: 'confirmed', visibleLabel: true },
    { id: 'csl-1994', label: 'Center for Service and Learning established', year: 1994, processId: 'institutional-infrastructure', domainId: 'infrastructure', importance: 'major', confidence: 'confirmed', visibleLabel: true },
    { id: 'wesco-1997', label: 'WESCO partnership', year: 1997, processId: 'neighborhood-partnerships', domainId: 'neighborhood', importance: 'major', confidence: 'confirmed', visibleLabel: true },
    { id: 'onr-1997', label: 'Office of Neighborhood Resources established', year: 1997, processId: 'institutional-infrastructure', domainId: 'infrastructure', importance: 'major', confidence: 'confirmed', visibleLabel: false },
    { id: 'gwchs-2000', label: 'George Washington Community High School reopens', year: 2000, processId: 'neighborhood-partnerships', domainId: 'neighborhood', importance: 'major', confidence: 'confirmed', visibleLabel: true },
    { id: 'public-scholar-2004', label: 'First Public Scholar faculty hire', year: 2004, processId: 'public-scholarship', domainId: 'scholarship', importance: 'major', confidence: 'confirmed', visibleLabel: true },
    { id: 'carnegie-2006', label: 'Carnegie Community Engagement Classification', year: 2006, processId: 'recognition-impact', domainId: 'recognition', importance: 'major', confidence: 'confirmed', visibleLabel: true },
    { id: 'oce-2014', label: 'Office of Community Engagement consolidated', year: 2014, processId: 'institutional-infrastructure', domainId: 'infrastructure', importance: 'major', confidence: 'confirmed', visibleLabel: true },
    { id: 'public-scholars-2015', label: 'Public Scholars Working Group', year: 2015, processId: 'public-scholarship', domainId: 'scholarship', importance: 'supporting', confidence: 'probable', visibleLabel: false },
    { id: 'collaboratory-2017', label: 'Collaboratory adopted', year: 2017, processId: 'institutional-infrastructure', domainId: 'infrastructure', importance: 'major', confidence: 'confirmed', visibleLabel: true },
    { id: 'rubric-2018', label: 'Public scholarship rubric developed', year: 2018, processId: 'recognition-impact', domainId: 'recognition', importance: 'major', confidence: 'probable', visibleLabel: true },
    { id: 'engage-2019', label: 'ENGAGE! journal launched', year: 2019, processId: 'public-scholarship', domainId: 'scholarship', importance: 'major', confidence: 'confirmed', visibleLabel: true },
    { id: 'iu-indianapolis-2024', label: 'IU Indianapolis realignment', year: 2024, processId: 'urban-mission', domainId: 'urban', importance: 'major', confidence: 'confirmed', visibleLabel: true },
    { id: 'centr-2024', label: 'CEnTR ecosystem matures', year: 2024, processId: 'institutional-infrastructure', domainId: 'infrastructure', importance: 'supporting', confidence: 'probable', visibleLabel: false },
    { id: 'carnegie-renewal-2026', label: 'Carnegie renewal / impact framework', year: 2026, processId: 'recognition-impact', domainId: 'recognition', importance: 'major', confidence: 'needs-verification', visibleLabel: true },
  ],
  interactions: [
    { id: 'urban-enables-pedagogy', fromId: 'urban-mission', fromType: 'process', toId: 'engaged-pedagogy', toType: 'process', verb: 'creates civic context for', strength: 'strong', confidence: 'interpretive' },
    { id: 'neighborhood-shapes-pedagogy', fromId: 'neighborhood-partnerships', fromType: 'process', toId: 'engaged-pedagogy', toType: 'process', verb: 'shapes practice in', strength: 'strong', confidence: 'interpretive' },
    { id: 'pedagogy-enables-scholarship', fromId: 'engaged-pedagogy', fromType: 'process', toId: 'public-scholarship', toType: 'process', verb: 'provides precedent for', strength: 'moderate', confidence: 'interpretive' },
    { id: 'carnegie-drives-documentation', fromId: 'carnegie-2006', fromType: 'anchor', toId: 'collaboratory-2017', toType: 'anchor', verb: 'creates documentation pressure for', strength: 'moderate', confidence: 'interpretive' },
    { id: 'public-scholarship-to-engage', fromId: 'public-scholarship', fromType: 'process', toId: 'engage-2019', toType: 'anchor', verb: 'creates publication need for', strength: 'moderate', confidence: 'interpretive' },
    { id: 'infrastructure-supports-impact', fromId: 'institutional-infrastructure', fromType: 'process', toId: 'recognition-impact', toType: 'process', verb: 'enables measurement of', strength: 'strong', confidence: 'interpretive' },
  ],
  sources: [],
  settings: {
    activeView: 'process',
    showEras: true,
    showMinorAnchors: false,
    showInteractionLabels: true,
    showOnlyMajorInteractions: false,
    exportTheme: 'light',
  },
}
```

- [ ] **Step 3: Create `src/useUnderstoryDocument.ts`**

```ts
import { useState, useEffect, useCallback } from 'react'
import type {
  UnderstoryDocument, Era, ProcessDomain, HistoricalProcess,
  AnchorEvent, ProcessInteraction, DisplaySettings,
} from './types'
import { SEED_DOCUMENT } from './seedData'

const STORAGE_KEY = 'understory-document'

function loadFromStorage(): UnderstoryDocument {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as UnderstoryDocument
  } catch { /* ignore */ }
  return SEED_DOCUMENT
}

export function useUnderstoryDocument() {
  const [doc, setDocState] = useState<UnderstoryDocument>(loadFromStorage)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc))
  }, [doc])

  const setDoc = useCallback((updater: (prev: UnderstoryDocument) => UnderstoryDocument) => {
    setDocState(updater)
  }, [])

  const addEra = useCallback((era: Era) =>
    setDoc(d => ({ ...d, eras: [...d.eras, era] })), [setDoc])
  const removeEra = useCallback((id: string) =>
    setDoc(d => ({ ...d, eras: d.eras.filter(e => e.id !== id) })), [setDoc])
  const updateEra = useCallback((era: Era) =>
    setDoc(d => ({ ...d, eras: d.eras.map(e => e.id === era.id ? era : e) })), [setDoc])

  const addDomain = useCallback((domain: ProcessDomain) =>
    setDoc(d => ({ ...d, processDomains: [...d.processDomains, domain] })), [setDoc])
  const removeDomain = useCallback((id: string) =>
    setDoc(d => ({ ...d, processDomains: d.processDomains.filter(x => x.id !== id) })), [setDoc])
  const updateDomain = useCallback((domain: ProcessDomain) =>
    setDoc(d => ({ ...d, processDomains: d.processDomains.map(x => x.id === domain.id ? domain : x) })), [setDoc])

  const addProcess = useCallback((process: HistoricalProcess) =>
    setDoc(d => ({ ...d, processes: [...d.processes, process] })), [setDoc])
  const removeProcess = useCallback((id: string) =>
    setDoc(d => ({ ...d, processes: d.processes.filter(x => x.id !== id) })), [setDoc])
  const updateProcess = useCallback((process: HistoricalProcess) =>
    setDoc(d => ({ ...d, processes: d.processes.map(x => x.id === process.id ? process : x) })), [setDoc])

  const addAnchor = useCallback((anchor: AnchorEvent) =>
    setDoc(d => ({ ...d, anchors: [...d.anchors, anchor] })), [setDoc])
  const removeAnchor = useCallback((id: string) =>
    setDoc(d => ({ ...d, anchors: d.anchors.filter(x => x.id !== id) })), [setDoc])
  const updateAnchor = useCallback((anchor: AnchorEvent) =>
    setDoc(d => ({ ...d, anchors: d.anchors.map(x => x.id === anchor.id ? anchor : x) })), [setDoc])

  const addInteraction = useCallback((interaction: ProcessInteraction) =>
    setDoc(d => ({ ...d, interactions: [...d.interactions, interaction] })), [setDoc])
  const removeInteraction = useCallback((id: string) =>
    setDoc(d => ({ ...d, interactions: d.interactions.filter(x => x.id !== id) })), [setDoc])
  const updateInteraction = useCallback((interaction: ProcessInteraction) =>
    setDoc(d => ({ ...d, interactions: d.interactions.map(x => x.id === interaction.id ? interaction : x) })), [setDoc])

  const setActiveView = useCallback((view: DisplaySettings['activeView']) =>
    setDoc(d => ({ ...d, settings: { ...d.settings, activeView: view } })), [setDoc])

  const setSettings = useCallback((patch: Partial<DisplaySettings>) =>
    setDoc(d => ({ ...d, settings: { ...d.settings, ...patch } })), [setDoc])

  const importDoc = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json) as UnderstoryDocument
      setDocState(parsed)
    } catch {
      alert('Invalid JSON — could not import document.')
    }
  }, [])

  const exportDocJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${doc.title.replace(/\s+/g, '-').toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [doc])

  return {
    doc, setDoc,
    addEra, removeEra, updateEra,
    addDomain, removeDomain, updateDomain,
    addProcess, removeProcess, updateProcess,
    addAnchor, removeAnchor, updateAnchor,
    addInteraction, removeInteraction, updateInteraction,
    setActiveView, setSettings,
    importDoc, exportDocJson,
  }
}
```

- [ ] **Step 4: Run tests — verify all pass**

```bash
npm test
```
Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/seedData.ts src/useUnderstoryDocument.ts src/useUnderstoryDocument.test.ts
git commit -m "feat: add seed document and useUnderstoryDocument state hook"
```

---

### Task 3: Year-to-X Utility

**Files:**
- Create: `src/utils/yearToX.ts`
- Create: `src/utils/yearToX.test.ts`

**Interfaces:**
- Consumes: `UnderstoryDocument.startYear`, `UnderstoryDocument.endYear`
- Produces:
  - `yearToXPct(year, startYear, endYear): number` — returns 0–100 (percentage of canvas width)
  - `yearToXPx(year, startYear, endYear, width: number): number` — returns pixel value within `width`

- [ ] **Step 1: Write failing tests**

Create `src/utils/yearToX.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { yearToXPct, yearToXPx } from './yearToX'

describe('yearToXPct', () => {
  it('maps startYear to 0', () => expect(yearToXPct(1968, 1968, 2026)).toBe(0))
  it('maps endYear to 100', () => expect(yearToXPct(2026, 1968, 2026)).toBe(100))
  it('maps midpoint correctly', () => expect(yearToXPct(1997, 1968, 2026)).toBeCloseTo(50))
  it('clamps below startYear to 0', () => expect(yearToXPct(1900, 1968, 2026)).toBe(0))
  it('clamps above endYear to 100', () => expect(yearToXPct(2100, 1968, 2026)).toBe(100))
})

describe('yearToXPx', () => {
  it('maps startYear to 0', () => expect(yearToXPx(1968, 1968, 2026, 1000)).toBe(0))
  it('maps endYear to 1000', () => expect(yearToXPx(2026, 1968, 2026, 1000)).toBe(1000))
})
```

Run: `npm test`
Expected: FAIL — "Cannot find module './yearToX'"

- [ ] **Step 2: Create `src/utils/yearToX.ts`**

```ts
export function yearToXPct(year: number, startYear: number, endYear: number): number {
  const span = endYear - startYear
  if (span === 0) return 0
  return Math.max(0, Math.min(100, ((year - startYear) / span) * 100))
}

export function yearToXPx(year: number, startYear: number, endYear: number, width: number): number {
  return (yearToXPct(year, startYear, endYear) / 100) * width
}
```

- [ ] **Step 3: Run tests — verify all pass**

```bash
npm test
```
Expected: PASS — 14 tests total.

- [ ] **Step 4: Commit**

```bash
git add src/utils/yearToX.ts src/utils/yearToX.test.ts
git commit -m "feat: add yearToX utility for linear year-to-pixel mapping"
```

---

### Task 4: Process View (SVG)

**Files:**
- Create: `src/components/ProcessView.tsx`

**Interfaces:**
- Consumes:
  - `yearToXPct(year, startYear, endYear): number` from `src/utils/yearToX`
  - `UnderstoryDocument`, `SelectedItem` from `src/types.ts`
- Produces: `<ProcessView doc={...} selected={...} onSelect={...} />` — the primary Taylor-style SVG visualization

Layout constants (defined at top of file):
- `MARGIN_LEFT = 160` — space for domain labels
- `MARGIN_RIGHT = 40`
- `ROW_HEIGHT = 90`
- `TOP_PADDING = 48`
- `BOTTOM_PADDING = 40`
- `TICK_HEIGHT = 24`

- [ ] **Step 1: Create `src/components/ProcessView.tsx`**

```tsx
import React, { useRef, useState, useLayoutEffect } from 'react'
import type { UnderstoryDocument, SelectedItem } from '../types'
import { yearToXPct } from '../utils/yearToX'

const ML = 160   // margin left (label area)
const MR = 40    // margin right
const RH = 90    // row height per domain
const TP = 48    // top padding above first row
const BP = 40    // bottom padding (for time axis)
const TICK_H = 24
const ANCHOR_R = 5     // anchor dot radius (major)
const ANCHOR_R_SM = 3  // anchor dot radius (minor)
const ARROW_SIZE = 8   // arrowhead size in px
const LABEL_FONT = '11px system-ui, sans-serif'
const LABEL_COLOR = '#3E3B35'

interface Props {
  doc: UnderstoryDocument
  selected: SelectedItem | null
  onSelect: (item: SelectedItem | null) => void
  showEras?: boolean
  showMinorAnchors?: boolean
  showInteractionLabels?: boolean
  showOnlyMajorInteractions?: boolean
}

export function ProcessView({
  doc, selected, onSelect,
  showEras = true,
  showMinorAnchors = false,
  showInteractionLabels = true,
  showOnlyMajorInteractions = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(900)

  useLayoutEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver(entries => {
      setWidth(entries[0].contentRect.width)
    })
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  const sortedDomains = [...doc.processDomains].sort((a, b) => a.order - b.order)
  const innerW = width - ML - MR
  const svgH = TP + sortedDomains.length * RH + TICK_H + BP

  // Map a year to an x pixel coordinate within the inner drawing area
  function xFor(year: number): number {
    return ML + (yearToXPct(year, doc.startYear, doc.endYear) / 100) * innerW
  }

  // Y center of a domain row (by domain index in sorted order)
  function yForDomainIndex(idx: number): number {
    return TP + idx * RH + RH / 2
  }

  function yForDomain(domainId: string): number {
    const idx = sortedDomains.findIndex(d => d.id === domainId)
    return yForDomainIndex(idx < 0 ? 0 : idx)
  }

  // Resolve the midpoint x for a process-or-anchor reference
  function xForRef(id: string, type: 'process' | 'anchor'): number {
    if (type === 'anchor') {
      const a = doc.anchors.find(a => a.id === id)
      return a ? xFor(a.year) : xFor(doc.startYear)
    }
    const p = doc.processes.find(p => p.id === id)
    if (!p) return xFor(doc.startYear)
    const mid = p.startYear + ((p.endYear ?? doc.endYear) - p.startYear) / 2
    return xFor(mid)
  }

  const visibleAnchors = showMinorAnchors
    ? doc.anchors
    : doc.anchors.filter(a => a.importance === 'major')

  const visibleInteractions = showOnlyMajorInteractions
    ? doc.interactions.filter(i => i.strength === 'strong')
    : doc.interactions.filter(i => i.visible !== false)

  // Warn if too many visible labels (> 12)
  const labelledAnchors = visibleAnchors.filter(a => a.visibleLabel)
  const tooManyLabels = labelledAnchors.length > 12
  const tooManyInteractions = visibleInteractions.length > 20

  return (
    <div ref={containerRef} style={{ width: '100%', position: 'relative' }}>
      {tooManyLabels && (
        <div style={{ background: '#FFF3CD', border: '1px solid #FFBA00', padding: '6px 12px', fontSize: 12, marginBottom: 8, borderRadius: 4 }}>
          Warning: {labelledAnchors.length} visible labels — consider hiding minor anchors or turning off labels to reduce clutter.
        </div>
      )}
      {tooManyInteractions && (
        <div style={{ background: '#FFF3CD', border: '1px solid #FFBA00', padding: '6px 12px', fontSize: 12, marginBottom: 8, borderRadius: 4 }}>
          Warning: {visibleInteractions.length} interactions visible — consider enabling "Show only major interactions."
        </div>
      )}
      <svg
        width={width}
        height={svgH}
        style={{ display: 'block', background: '#F2ECD7', fontFamily: 'system-ui, sans-serif' }}
        onClick={() => onSelect(null)}
      >
        {/* Era bands */}
        {showEras && doc.eras.map(era => {
          const ex = xFor(era.startYear)
          const ew = xFor(era.endYear) - ex
          return (
            <g key={era.id}>
              <rect
                x={ex} y={TP} width={ew} height={sortedDomains.length * RH}
                fill={era.color ?? '#E0D5C0'} opacity={0.25}
              />
              <text
                x={ex + ew / 2} y={TP - 10}
                textAnchor="middle" fontSize={10} fill="#6B625A"
              >{era.label}</text>
            </g>
          )
        })}

        {/* Row separators */}
        {sortedDomains.map((_, idx) => (
          <line
            key={idx}
            x1={ML} y1={TP + idx * RH}
            x2={width - MR} y2={TP + idx * RH}
            stroke="#D2BDA3" strokeWidth={0.5}
          />
        ))}

        {/* Domain labels (left margin) */}
        {sortedDomains.map((domain, idx) => (
          <text
            key={domain.id}
            x={ML - 10} y={yForDomainIndex(idx)}
            textAnchor="end" dominantBaseline="middle"
            fontSize={11} fill={domain.color} fontWeight="600"
            style={{ cursor: 'pointer' }}
            onClick={e => { e.stopPropagation(); onSelect({ kind: 'domain', id: domain.id }) }}
          >
            {domain.shortLabel ?? domain.label}
          </text>
        ))}

        {/* Process lines (horizontal arrows) */}
        {doc.processes.map(proc => {
          const domain = sortedDomains.find(d => d.id === proc.domainId)
          if (!domain) return null
          const domIdx = sortedDomains.indexOf(domain)
          const y = yForDomainIndex(domIdx)
          const x1 = xFor(proc.startYear)
          const x2 = xFor(proc.endYear ?? doc.endYear)
          const color = domain.color
          const isSelected = selected?.kind === 'process' && selected.id === proc.id
          const arrowX = proc.continues ? width - MR : x2

          return (
            <g key={proc.id}
              style={{ cursor: 'pointer' }}
              onClick={e => { e.stopPropagation(); onSelect({ kind: 'process', id: proc.id }) }}
            >
              <line
                x1={x1} y1={y} x2={arrowX - (proc.continues ? ARROW_SIZE : 0)} y2={y}
                stroke={color} strokeWidth={isSelected ? 4 : 2.5}
                opacity={isSelected ? 1 : 0.85}
              />
              {/* Arrowhead */}
              <polygon
                points={`${arrowX},${y} ${arrowX - ARROW_SIZE},${y - ARROW_SIZE / 2} ${arrowX - ARROW_SIZE},${y + ARROW_SIZE / 2}`}
                fill={color} opacity={isSelected ? 1 : 0.85}
              />
              {/* Process label near start */}
              <text
                x={x1 + 4} y={y - 8}
                fontSize={10} fill={color} fontWeight="500"
              >{proc.label}</text>
              {/* Invisible wider hit area */}
              <line
                x1={x1} y1={y} x2={arrowX} y2={y}
                stroke="transparent" strokeWidth={16}
              />
            </g>
          )
        })}

        {/* Anchor dots */}
        {visibleAnchors.map(anchor => {
          const y = yForDomain(anchor.domainId)
          const x = xFor(anchor.year)
          const r = anchor.importance === 'major' ? ANCHOR_R : ANCHOR_R_SM
          const domain = doc.processDomains.find(d => d.id === anchor.domainId)
          const color = domain?.color ?? '#4A4A4A'
          const isSelected = selected?.kind === 'anchor' && selected.id === anchor.id

          return (
            <g key={anchor.id}
              style={{ cursor: 'pointer' }}
              onClick={e => { e.stopPropagation(); onSelect({ kind: 'anchor', id: anchor.id }) }}
            >
              <circle
                cx={x} cy={y} r={isSelected ? r + 3 : r}
                fill={isSelected ? '#fff' : color}
                stroke={color} strokeWidth={isSelected ? 2.5 : 1.5}
              />
              {anchor.visibleLabel && (
                <text
                  x={x} y={y - r - 5}
                  textAnchor="middle" fontSize={9} fill={LABEL_COLOR}
                  style={{ pointerEvents: 'none' }}
                >
                  {anchor.year} {anchor.label}
                </text>
              )}
            </g>
          )
        })}

        {/* Interaction curves (dotted beziers) */}
        {visibleInteractions.map(interaction => {
          const x1 = xForRef(interaction.fromId, interaction.fromType)
          const x2 = xForRef(interaction.toId, interaction.toType)
          const fromDomainId = interaction.fromType === 'anchor'
            ? doc.anchors.find(a => a.id === interaction.fromId)?.domainId ?? ''
            : doc.processes.find(p => p.id === interaction.fromId)?.domainId ?? ''
          const toDomainId = interaction.toType === 'anchor'
            ? doc.anchors.find(a => a.id === interaction.toId)?.domainId ?? ''
            : doc.processes.find(p => p.id === interaction.toId)?.domainId ?? ''
          const y1 = yForDomain(fromDomainId)
          const y2 = yForDomain(toDomainId)
          const midY = (y1 + y2) / 2
          const isSelected = selected?.kind === 'interaction' && selected.id === interaction.id
          const dashPattern = interaction.strength === 'strong' ? '6,3' : interaction.strength === 'moderate' ? '4,4' : '2,5'
          const midX = (x1 + x2) / 2
          const midCurveX = midX
          const midCurveY = midY

          return (
            <g key={interaction.id}
              style={{ cursor: 'pointer' }}
              onClick={e => { e.stopPropagation(); onSelect({ kind: 'interaction', id: interaction.id }) }}
            >
              {/* Invisible fat hit area */}
              <path
                d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                stroke="transparent" strokeWidth={12} fill="none"
              />
              <path
                d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                stroke={isSelected ? '#C0392B' : '#8C6E45'}
                strokeWidth={isSelected ? 2 : 1.5}
                strokeDasharray={dashPattern}
                fill="none"
                opacity={0.7}
              />
              {/* Arrowhead at destination */}
              <circle cx={x2} cy={y2} r={3} fill={isSelected ? '#C0392B' : '#8C6E45'} opacity={0.7} />
              {showInteractionLabels && (
                <text
                  x={midCurveX} y={midCurveY - 6}
                  textAnchor="middle" fontSize={8.5} fill="#8C6E45"
                  style={{ pointerEvents: 'none' }}
                >{interaction.verb}</text>
              )}
            </g>
          )
        })}

        {/* Time axis */}
        <line
          x1={ML} y1={TP + sortedDomains.length * RH}
          x2={width - MR} y2={TP + sortedDomains.length * RH}
          stroke="#6B625A" strokeWidth={1}
        />
        {Array.from({ length: Math.floor((doc.endYear - doc.startYear) / 5) + 1 }, (_, i) => {
          const year = doc.startYear + i * 5
          const x = xFor(year)
          return (
            <g key={year}>
              <line
                x1={x} y1={TP + sortedDomains.length * RH}
                x2={x} y2={TP + sortedDomains.length * RH + 5}
                stroke="#6B625A" strokeWidth={1}
              />
              <text
                x={x} y={TP + sortedDomains.length * RH + 16}
                textAnchor="middle" fontSize={10} fill="#6B625A"
              >{year}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
```

- [ ] **Step 2: Start dev server and verify it renders**

```bash
npm run dev
```

Open the URL printed to console. The app will still show `ComplexityTimeline` at this point — that's fine. We'll wire `ProcessView` in Task 7. Confirm the TypeScript build has no errors by checking the terminal.

- [ ] **Step 3: Commit**

```bash
git add src/components/ProcessView.tsx
git commit -m "feat: add SVG-based ProcessView component"
```

---

### Task 5: Inspector Panel

**Files:**
- Create: `src/components/InspectorPanel.tsx`

**Interfaces:**
- Consumes: `UnderstoryDocument`, `SelectedItem` from `src/types.ts`
- Produces: `<InspectorPanel doc={...} selected={...} onClose={...} onUpdateAnchor={...} />` — slide-in detail panel

- [ ] **Step 1: Create `src/components/InspectorPanel.tsx`**

```tsx
import React from 'react'
import { X } from 'lucide-react'
import type { UnderstoryDocument, SelectedItem, AnchorEvent } from '../types'

interface Props {
  doc: UnderstoryDocument
  selected: SelectedItem | null
  onClose: () => void
  onUpdateAnchor: (anchor: AnchorEvent) => void
}

export function InspectorPanel({ doc, selected, onClose, onUpdateAnchor }: Props) {
  if (!selected) return null

  let content: React.ReactNode = null

  if (selected.kind === 'anchor') {
    const anchor = doc.anchors.find(a => a.id === selected.id)
    if (!anchor) return null
    const domain = doc.processDomains.find(d => d.id === anchor.domainId)
    content = (
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{anchor.label}</div>
        <div style={{ fontSize: 12, color: '#6B625A', marginBottom: 8 }}>{anchor.year} · {domain?.label ?? anchor.domainId}</div>
        <table style={{ fontSize: 12, borderCollapse: 'collapse', width: '100%' }}>
          <tbody>
            <tr><td style={td}>Importance</td><td style={td}>{anchor.importance}</td></tr>
            <tr><td style={td}>Confidence</td><td style={td}>{anchor.confidence ?? '—'}</td></tr>
            {anchor.description && <tr><td style={td}>Notes</td><td style={td}>{anchor.description}</td></tr>}
          </tbody>
        </table>
        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={anchor.visibleLabel ?? false}
              onChange={e => onUpdateAnchor({ ...anchor, visibleLabel: e.target.checked })}
            />
            Show label on map
          </label>
        </div>
      </div>
    )
  } else if (selected.kind === 'process') {
    const proc = doc.processes.find(p => p.id === selected.id)
    if (!proc) return null
    const domain = doc.processDomains.find(d => d.id === proc.domainId)
    content = (
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{proc.label}</div>
        <div style={{ fontSize: 12, color: '#6B625A', marginBottom: 8 }}>
          {proc.startYear}–{proc.endYear ?? 'present'} · {domain?.label ?? proc.domainId}
        </div>
        <table style={{ fontSize: 12, borderCollapse: 'collapse', width: '100%' }}>
          <tbody>
            <tr><td style={td}>Importance</td><td style={td}>{proc.importance ?? '—'}</td></tr>
            <tr><td style={td}>Continues</td><td style={td}>{proc.continues ? 'Yes' : 'No'}</td></tr>
            {proc.description && <tr><td style={td}>Notes</td><td style={td}>{proc.description}</td></tr>}
          </tbody>
        </table>
      </div>
    )
  } else if (selected.kind === 'interaction') {
    const ix = doc.interactions.find(i => i.id === selected.id)
    if (!ix) return null
    content = (
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>"{ix.verb}"</div>
        <div style={{ fontSize: 12, color: '#6B625A', marginBottom: 8 }}>
          {ix.fromId} → {ix.toId}
        </div>
        <table style={{ fontSize: 12, borderCollapse: 'collapse', width: '100%' }}>
          <tbody>
            <tr><td style={td}>Strength</td><td style={td}>{ix.strength ?? '—'}</td></tr>
            <tr><td style={td}>Confidence</td><td style={td}>{ix.confidence ?? '—'}</td></tr>
            {ix.description && <tr><td style={td}>Notes</td><td style={td}>{ix.description}</td></tr>}
          </tbody>
        </table>
      </div>
    )
  } else if (selected.kind === 'domain') {
    const domain = doc.processDomains.find(d => d.id === selected.id)
    if (!domain) return null
    const domainProcesses = doc.processes.filter(p => p.domainId === domain.id)
    const domainAnchors = doc.anchors.filter(a => a.domainId === domain.id)
    content = (
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: domain.color }}>{domain.label}</div>
        <div style={{ fontSize: 12, color: '#6B625A', marginBottom: 8 }}>
          {domainProcesses.length} process{domainProcesses.length !== 1 ? 'es' : ''} · {domainAnchors.length} anchor{domainAnchors.length !== 1 ? 's' : ''}
        </div>
        {domain.description && <p style={{ fontSize: 12 }}>{domain.description}</p>}
        <div style={{ marginTop: 8 }}>
          {domainAnchors.sort((a, b) => a.year - b.year).map(a => (
            <div key={a.id} style={{ fontSize: 11, padding: '2px 0', borderBottom: '1px solid #E5DDD0' }}>
              <span style={{ color: '#6B625A', marginRight: 6 }}>{a.year}</span>{a.label}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed', right: 0, top: 0, bottom: 0, width: 280,
      background: '#FDFAF4', borderLeft: '1px solid #D2BDA3',
      boxShadow: '-4px 0 12px rgba(0,0,0,0.08)', zIndex: 50,
      overflow: 'auto', padding: 20,
    }}>
      <button
        onClick={onClose}
        style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer' }}
        aria-label="Close inspector"
      >
        <X size={16} />
      </button>
      <div style={{ marginTop: 24 }}>{content}</div>
    </div>
  )
}

const td: React.CSSProperties = { padding: '3px 8px 3px 0', verticalAlign: 'top', color: '#6B625A' }
```

- [ ] **Step 2: Commit**

```bash
git add src/components/InspectorPanel.tsx
git commit -m "feat: add InspectorPanel for process/anchor/interaction detail"
```

---

### Task 6: Add/Edit Modals

**Files:**
- Create: `src/components/modals/EraModal.tsx`
- Create: `src/components/modals/DomainModal.tsx`
- Create: `src/components/modals/ProcessModal.tsx`
- Create: `src/components/modals/AnchorModal.tsx`
- Create: `src/components/modals/InteractionModal.tsx`
- Create: `src/components/modals/ModalShell.tsx`

**Interfaces:**
- Consumes: entity types from `src/types.ts`, `UnderstoryDocument`
- Produces:
  - `<ModalShell title onClose>{children}</ModalShell>` — shared modal wrapper
  - `<EraModal initial? doc onSave onClose />`
  - `<DomainModal initial? doc onSave onClose />`
  - `<ProcessModal initial? doc onSave onClose />`
  - `<AnchorModal initial? doc onSave onClose />`
  - `<InteractionModal initial? doc onSave onClose />` — requires non-empty `verb`

- [ ] **Step 1: Create `src/components/modals/ModalShell.tsx`**

```tsx
import React from 'react'
import { X } from 'lucide-react'

interface Props {
  title: string
  onClose: () => void
  children: React.ReactNode
}

export function ModalShell({ title, onClose, children }: Props) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FDFAF4', borderRadius: 8, padding: 24, width: 420, maxWidth: '90vw',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#4A4A4A' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

export const inputStyle: React.CSSProperties = {
  width: '100%', padding: '6px 8px', fontSize: 13,
  border: '1px solid #C8B99A', borderRadius: 4, background: '#FFF',
  boxSizing: 'border-box',
}

export function SaveButton({ label = 'Save', disabled = false }: { label?: string; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      style={{
        marginTop: 16, padding: '8px 20px', background: '#4E342E', color: '#fff',
        border: 'none', borderRadius: 4, cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 13,
        opacity: disabled ? 0.5 : 1,
      }}
    >{label}</button>
  )
}
```

- [ ] **Step 2: Create `src/components/modals/EraModal.tsx`**

```tsx
import React, { useState } from 'react'
import type { Era } from '../../types'
import { ModalShell, FormField, inputStyle, SaveButton } from './ModalShell'

interface Props {
  initial?: Era
  onSave: (era: Era) => void
  onClose: () => void
}

export function EraModal({ initial, onSave, onClose }: Props) {
  const [label, setLabel] = useState(initial?.label ?? '')
  const [startYear, setStartYear] = useState(String(initial?.startYear ?? 1968))
  const [endYear, setEndYear] = useState(String(initial?.endYear ?? 2026))
  const [color, setColor] = useState(initial?.color ?? '#D2BDA3')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      id: initial?.id ?? `era-${Date.now()}`,
      label, color,
      startYear: parseInt(startYear, 10),
      endYear: parseInt(endYear, 10),
    })
    onClose()
  }

  return (
    <ModalShell title={initial ? 'Edit Era' : 'Add Era'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label="Label"><input style={inputStyle} value={label} onChange={e => setLabel(e.target.value)} required /></FormField>
        <FormField label="Start Year"><input style={inputStyle} type="number" value={startYear} onChange={e => setStartYear(e.target.value)} required /></FormField>
        <FormField label="End Year"><input style={inputStyle} type="number" value={endYear} onChange={e => setEndYear(e.target.value)} required /></FormField>
        <FormField label="Color"><input style={{ ...inputStyle, width: 60, padding: 2 }} type="color" value={color} onChange={e => setColor(e.target.value)} /></FormField>
        <SaveButton />
      </form>
    </ModalShell>
  )
}
```

- [ ] **Step 3: Create `src/components/modals/DomainModal.tsx`**

```tsx
import React, { useState } from 'react'
import type { ProcessDomain } from '../../types'
import { ModalShell, FormField, inputStyle, SaveButton } from './ModalShell'

interface Props {
  initial?: ProcessDomain
  nextOrder: number
  onSave: (domain: ProcessDomain) => void
  onClose: () => void
}

export function DomainModal({ initial, nextOrder, onSave, onClose }: Props) {
  const [label, setLabel] = useState(initial?.label ?? '')
  const [shortLabel, setShortLabel] = useState(initial?.shortLabel ?? '')
  const [color, setColor] = useState(initial?.color ?? '#4E342E')
  const [description, setDescription] = useState(initial?.description ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      id: initial?.id ?? `domain-${Date.now()}`,
      label, color,
      shortLabel: shortLabel || undefined,
      description: description || undefined,
      order: initial?.order ?? nextOrder,
    })
    onClose()
  }

  return (
    <ModalShell title={initial ? 'Edit Domain' : 'Add Domain'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label="Label"><input style={inputStyle} value={label} onChange={e => setLabel(e.target.value)} required /></FormField>
        <FormField label="Short Label (optional)"><input style={inputStyle} value={shortLabel} onChange={e => setShortLabel(e.target.value)} /></FormField>
        <FormField label="Color"><input style={{ ...inputStyle, width: 60, padding: 2 }} type="color" value={color} onChange={e => setColor(e.target.value)} /></FormField>
        <FormField label="Description (optional)"><textarea style={{ ...inputStyle, height: 60 }} value={description} onChange={e => setDescription(e.target.value)} /></FormField>
        <SaveButton />
      </form>
    </ModalShell>
  )
}
```

- [ ] **Step 4: Create `src/components/modals/ProcessModal.tsx`**

```tsx
import React, { useState } from 'react'
import type { HistoricalProcess, UnderstoryDocument } from '../../types'
import { ModalShell, FormField, inputStyle, SaveButton } from './ModalShell'

interface Props {
  initial?: HistoricalProcess
  doc: UnderstoryDocument
  onSave: (process: HistoricalProcess) => void
  onClose: () => void
}

export function ProcessModal({ initial, doc, onSave, onClose }: Props) {
  const [label, setLabel] = useState(initial?.label ?? '')
  const [domainId, setDomainId] = useState(initial?.domainId ?? doc.processDomains[0]?.id ?? '')
  const [startYear, setStartYear] = useState(String(initial?.startYear ?? doc.startYear))
  const [endYear, setEndYear] = useState(String(initial?.endYear ?? doc.endYear))
  const [continues, setContinues] = useState(initial?.continues ?? false)
  const [importance, setImportance] = useState<HistoricalProcess['importance']>(initial?.importance ?? 'primary')
  const [description, setDescription] = useState(initial?.description ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      id: initial?.id ?? `process-${Date.now()}`,
      label, domainId, continues,
      importance: importance || undefined,
      description: description || undefined,
      startYear: parseInt(startYear, 10),
      endYear: parseInt(endYear, 10),
    })
    onClose()
  }

  return (
    <ModalShell title={initial ? 'Edit Process' : 'Add Process'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label="Label"><input style={inputStyle} value={label} onChange={e => setLabel(e.target.value)} required /></FormField>
        <FormField label="Domain">
          <select style={inputStyle} value={domainId} onChange={e => setDomainId(e.target.value)}>
            {doc.processDomains.sort((a, b) => a.order - b.order).map(d => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Start Year"><input style={inputStyle} type="number" value={startYear} onChange={e => setStartYear(e.target.value)} required /></FormField>
        <FormField label="End Year"><input style={inputStyle} type="number" value={endYear} onChange={e => setEndYear(e.target.value)} /></FormField>
        <FormField label="Importance">
          <select style={inputStyle} value={importance} onChange={e => setImportance(e.target.value as HistoricalProcess['importance'])}>
            <option value="primary">Primary</option>
            <option value="secondary">Secondary</option>
            <option value="context">Context</option>
          </select>
        </FormField>
        <FormField label="Description (optional)"><textarea style={{ ...inputStyle, height: 60 }} value={description} onChange={e => setDescription(e.target.value)} /></FormField>
        <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={continues} onChange={e => setContinues(e.target.checked)} />
          Process continues to present (show arrow)
        </label>
        <SaveButton />
      </form>
    </ModalShell>
  )
}
```

- [ ] **Step 5: Create `src/components/modals/AnchorModal.tsx`**

```tsx
import React, { useState } from 'react'
import type { AnchorEvent, UnderstoryDocument } from '../../types'
import { ModalShell, FormField, inputStyle, SaveButton } from './ModalShell'

interface Props {
  initial?: AnchorEvent
  doc: UnderstoryDocument
  onSave: (anchor: AnchorEvent) => void
  onClose: () => void
}

export function AnchorModal({ initial, doc, onSave, onClose }: Props) {
  const [label, setLabel] = useState(initial?.label ?? '')
  const [year, setYear] = useState(String(initial?.year ?? doc.startYear))
  const [domainId, setDomainId] = useState(initial?.domainId ?? doc.processDomains[0]?.id ?? '')
  const [importance, setImportance] = useState<AnchorEvent['importance']>(initial?.importance ?? 'major')
  const [confidence, setConfidence] = useState<AnchorEvent['confidence']>(initial?.confidence ?? 'confirmed')
  const [visibleLabel, setVisibleLabel] = useState(initial?.visibleLabel ?? true)
  const [description, setDescription] = useState(initial?.description ?? '')

  const domainProcesses = doc.processes.filter(p => p.domainId === domainId)
  const [processId, setProcessId] = useState(initial?.processId ?? domainProcesses[0]?.id ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      id: initial?.id ?? `anchor-${Date.now()}`,
      label, domainId, processId, visibleLabel,
      year: parseInt(year, 10),
      importance,
      confidence: confidence || undefined,
      description: description || undefined,
    })
    onClose()
  }

  return (
    <ModalShell title={initial ? 'Edit Anchor' : 'Add Anchor'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label="Label"><input style={inputStyle} value={label} onChange={e => setLabel(e.target.value)} required /></FormField>
        <FormField label="Year"><input style={inputStyle} type="number" value={year} onChange={e => setYear(e.target.value)} required /></FormField>
        <FormField label="Domain">
          <select style={inputStyle} value={domainId} onChange={e => { setDomainId(e.target.value); setProcessId('') }}>
            {doc.processDomains.sort((a, b) => a.order - b.order).map(d => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Process">
          <select style={inputStyle} value={processId} onChange={e => setProcessId(e.target.value)}>
            {doc.processes.filter(p => p.domainId === domainId).map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Importance">
          <select style={inputStyle} value={importance} onChange={e => setImportance(e.target.value as AnchorEvent['importance'])}>
            <option value="major">Major</option>
            <option value="supporting">Supporting</option>
            <option value="context">Context</option>
          </select>
        </FormField>
        <FormField label="Confidence">
          <select style={inputStyle} value={confidence} onChange={e => setConfidence(e.target.value as AnchorEvent['confidence'])}>
            <option value="confirmed">Confirmed</option>
            <option value="probable">Probable</option>
            <option value="needs-verification">Needs Verification</option>
          </select>
        </FormField>
        <FormField label="Description (optional)"><textarea style={{ ...inputStyle, height: 60 }} value={description} onChange={e => setDescription(e.target.value)} /></FormField>
        <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}>
          <input type="checkbox" checked={visibleLabel} onChange={e => setVisibleLabel(e.target.checked)} />
          Show label on map
        </label>
        <SaveButton />
      </form>
    </ModalShell>
  )
}
```

- [ ] **Step 6: Create `src/components/modals/InteractionModal.tsx`**

```tsx
import React, { useState } from 'react'
import type { ProcessInteraction, UnderstoryDocument } from '../../types'
import { ModalShell, FormField, inputStyle, SaveButton } from './ModalShell'

const VERB_SUGGESTIONS = [
  'creates conditions for', 'enables', 'formalizes', 'legitimizes',
  'documents', 'extends', 'reframes', 'responds to', 'makes visible',
  'institutionalizes', 'amplifies', 'sustains',
]

interface Props {
  initial?: ProcessInteraction
  doc: UnderstoryDocument
  onSave: (interaction: ProcessInteraction) => void
  onClose: () => void
}

export function InteractionModal({ initial, doc, onSave, onClose }: Props) {
  const allRefs = [
    ...doc.processes.map(p => ({ id: p.id, label: `Process: ${p.label}`, type: 'process' as const })),
    ...doc.anchors.map(a => ({ id: a.id, label: `Anchor: ${a.year} ${a.label}`, type: 'anchor' as const })),
  ]
  const [fromId, setFromId] = useState(initial?.fromId ?? allRefs[0]?.id ?? '')
  const [toId, setToId] = useState(initial?.toId ?? allRefs[1]?.id ?? '')
  const [verb, setVerb] = useState(initial?.verb ?? '')
  const [strength, setStrength] = useState<ProcessInteraction['strength']>(initial?.strength ?? 'moderate')
  const [confidence, setConfidence] = useState<ProcessInteraction['confidence']>(initial?.confidence ?? 'interpretive')
  const [description, setDescription] = useState(initial?.description ?? '')

  function typeOf(id: string): 'process' | 'anchor' {
    return doc.processes.find(p => p.id === id) ? 'process' : 'anchor'
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!verb.trim()) { alert('A relationship verb is required.'); return }
    onSave({
      id: initial?.id ?? `interaction-${Date.now()}`,
      fromId, toId,
      fromType: typeOf(fromId),
      toType: typeOf(toId),
      verb: verb.trim(),
      strength: strength || undefined,
      confidence: confidence || undefined,
      description: description || undefined,
    })
    onClose()
  }

  return (
    <ModalShell title={initial ? 'Edit Interaction' : 'Add Interaction'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label="From">
          <select style={inputStyle} value={fromId} onChange={e => setFromId(e.target.value)}>
            {allRefs.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </FormField>
        <FormField label="Relationship Verb (required)">
          <input
            style={inputStyle} value={verb} onChange={e => setVerb(e.target.value)}
            list="verb-suggestions" placeholder="e.g. enables, formalizes, responds to"
            required
          />
          <datalist id="verb-suggestions">
            {VERB_SUGGESTIONS.map(v => <option key={v} value={v} />)}
          </datalist>
        </FormField>
        <FormField label="To">
          <select style={inputStyle} value={toId} onChange={e => setToId(e.target.value)}>
            {allRefs.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </FormField>
        <FormField label="Strength">
          <select style={inputStyle} value={strength} onChange={e => setStrength(e.target.value as ProcessInteraction['strength'])}>
            <option value="strong">Strong</option>
            <option value="moderate">Moderate</option>
            <option value="contextual">Contextual</option>
          </select>
        </FormField>
        <FormField label="Confidence">
          <select style={inputStyle} value={confidence} onChange={e => setConfidence(e.target.value as ProcessInteraction['confidence'])}>
            <option value="confirmed">Confirmed</option>
            <option value="probable">Probable</option>
            <option value="interpretive">Interpretive</option>
          </select>
        </FormField>
        <FormField label="Description (optional)"><textarea style={{ ...inputStyle, height: 60 }} value={description} onChange={e => setDescription(e.target.value)} /></FormField>
        <SaveButton />
      </form>
    </ModalShell>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add src/components/modals/
git commit -m "feat: add modal forms for Era, Domain, Process, Anchor, Interaction"
```

---

### Task 7: Institutional Timeline View

**Files:**
- Create: `src/components/TimelineView.tsx`

**Interfaces:**
- Consumes: `UnderstoryDocument`, `SelectedItem` from `src/types.ts`
- Produces: `<TimelineView doc={...} selected={...} onSelect={...} showMinorAnchors={...} />`

- [ ] **Step 1: Create `src/components/TimelineView.tsx`**

```tsx
import React from 'react'
import type { UnderstoryDocument, SelectedItem, Era } from '../types'

interface Props {
  doc: UnderstoryDocument
  selected: SelectedItem | null
  onSelect: (item: SelectedItem | null) => void
  showMinorAnchors?: boolean
}

export function TimelineView({ doc, selected, onSelect, showMinorAnchors = false }: Props) {
  const sortedEras = [...doc.eras].sort((a, b) => a.startYear - b.startYear)

  function anchorsForEra(era: Era) {
    return doc.anchors
      .filter(a => {
        const inEra = a.year >= era.startYear && a.year <= era.endYear
        const visible = showMinorAnchors || a.importance === 'major'
        return inEra && visible
      })
      .sort((a, b) => a.year - b.year)
  }

  return (
    <div style={{ padding: 24, background: '#F2ECD7', minHeight: '100%' }}>
      <div style={{ display: 'flex', gap: 0, alignItems: 'stretch', borderRadius: 6, overflow: 'hidden', border: '1px solid #C8B99A' }}>
        {sortedEras.map((era, idx) => {
          const anchors = anchorsForEra(era)
          const span = era.endYear - era.startYear
          const totalSpan = doc.endYear - doc.startYear
          const flex = span / totalSpan

          return (
            <div
              key={era.id}
              style={{
                flex,
                background: idx % 2 === 0 ? '#FDFAF4' : '#F5EDD9',
                borderRight: idx < sortedEras.length - 1 ? '1px solid #C8B99A' : undefined,
                display: 'flex', flexDirection: 'column',
              }}
            >
              {/* Era header */}
              <div style={{
                background: era.color ?? '#D2BDA3',
                color: '#fff', fontWeight: 700, fontSize: 12,
                padding: '8px 12px', textAlign: 'center',
                minHeight: 48, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <div>{era.label}</div>
                <div style={{ fontWeight: 400, fontSize: 10, opacity: 0.85, marginTop: 2 }}>
                  {era.startYear}–{era.endYear}
                </div>
              </div>

              {/* Anchor list */}
              <div style={{ padding: '12px 10px', flex: 1 }}>
                {anchors.length === 0 && (
                  <div style={{ fontSize: 11, color: '#A0978D', fontStyle: 'italic' }}>No major events</div>
                )}
                {anchors.map(anchor => {
                  const isSelected = selected?.kind === 'anchor' && selected.id === anchor.id
                  const domain = doc.processDomains.find(d => d.id === anchor.domainId)
                  return (
                    <div
                      key={anchor.id}
                      style={{
                        marginBottom: 8, cursor: 'pointer', padding: '4px 6px',
                        borderRadius: 3, borderLeft: `3px solid ${domain?.color ?? '#8C6E45'}`,
                        background: isSelected ? '#F0E6C8' : 'transparent',
                        fontSize: 11, lineHeight: 1.4,
                      }}
                      onClick={e => { e.stopPropagation(); onSelect({ kind: 'anchor', id: anchor.id }) }}
                    >
                      <span style={{ fontWeight: 600, color: '#4A4A4A', marginRight: 4 }}>{anchor.year}</span>
                      <span style={{ color: '#3E3B35' }}>{anchor.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Domain legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 20 }}>
        {doc.processDomains.sort((a, b) => a.order - b.order).map(domain => (
          <div key={domain.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: domain.color }} />
            {domain.shortLabel ?? domain.label}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/TimelineView.tsx
git commit -m "feat: add Institutional Timeline View with era columns"
```

---

### Task 8: Influence Map View

**Files:**
- Create: `src/components/InfluenceMapView.tsx`

**Interfaces:**
- Consumes: `UnderstoryDocument`, `SelectedItem` from `src/types.ts`
- Produces: `<InfluenceMapView doc={...} selected={...} onSelect={...} />`

Layout strategy: position domain nodes in a vertical list on the left side, with x offset proportional to domain `order`. Draw labeled directed edges between them.

- [ ] **Step 1: Create `src/components/InfluenceMapView.tsx`**

```tsx
import React, { useRef, useState, useLayoutEffect } from 'react'
import type { UnderstoryDocument, SelectedItem } from '../types'

interface Props {
  doc: UnderstoryDocument
  selected: SelectedItem | null
  onSelect: (item: SelectedItem | null) => void
}

const NODE_W = 160
const NODE_H = 44
const H_GAP = 200
const V_GAP = 80

export function InfluenceMapView({ doc, selected, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(900)
  useLayoutEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver(e => setWidth(e[0].contentRect.width))
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  const sortedDomains = [...doc.processDomains].sort((a, b) => a.order - b.order)
  const n = sortedDomains.length
  const svgH = n * (NODE_H + V_GAP) + 60

  // Simple layout: two staggered columns
  function nodePos(idx: number): { x: number; y: number } {
    const col = idx % 2
    const row = Math.floor(idx / 2)
    const colW = (width - NODE_W - 80) / 2
    return {
      x: 40 + col * (colW + H_GAP / 2),
      y: 40 + row * (NODE_H + V_GAP) + (col === 1 ? (NODE_H + V_GAP) / 2 : 0),
    }
  }

  function nodeCenter(domainId: string): { x: number; y: number } {
    const idx = sortedDomains.findIndex(d => d.id === domainId)
    if (idx < 0) return { x: 0, y: 0 }
    const pos = nodePos(idx)
    return { x: pos.x + NODE_W / 2, y: pos.y + NODE_H / 2 }
  }

  function getDomainId(id: string, type: 'process' | 'anchor'): string {
    if (type === 'process') return doc.processes.find(p => p.id === id)?.domainId ?? ''
    return doc.anchors.find(a => a.id === id)?.domainId ?? ''
  }

  // Only draw process-to-process interactions in the influence map
  const processInteractions = doc.interactions.filter(
    i => i.fromType === 'process' && i.toType === 'process'
  )

  const requiredHeight = n % 2 === 0
    ? (n / 2) * (NODE_H + V_GAP) + 40
    : (Math.ceil(n / 2)) * (NODE_H + V_GAP) + 40

  return (
    <div ref={containerRef} style={{ width: '100%', padding: 16, boxSizing: 'border-box' }}>
      <svg
        width={width - 32}
        height={Math.max(svgH, requiredHeight)}
        style={{ background: '#F2ECD7', display: 'block', borderRadius: 6 }}
        onClick={() => onSelect(null)}
      >
        {/* Edges */}
        {processInteractions.map(ix => {
          const fromDomain = getDomainId(ix.fromId, ix.fromType)
          const toDomain = getDomainId(ix.toId, ix.toType)
          if (!fromDomain || !toDomain || fromDomain === toDomain) return null
          const c1 = nodeCenter(fromDomain)
          const c2 = nodeCenter(toDomain)
          const midX = (c1.x + c2.x) / 2
          const midY = (c1.y + c2.y) / 2
          const isSelected = selected?.kind === 'interaction' && selected.id === ix.id
          const dashArray = ix.strength === 'strong' ? 'none' : ix.strength === 'moderate' ? '6,3' : '3,5'

          // Arrowhead direction
          const angle = Math.atan2(c2.y - c1.y, c2.x - c1.x)
          const arrowLen = 10
          const ax = c2.x - Math.cos(angle) * (NODE_W / 2 + 4)
          const ay = c2.y - Math.sin(angle) * (NODE_H / 2 + 4)

          return (
            <g key={ix.id}
              style={{ cursor: 'pointer' }}
              onClick={e => { e.stopPropagation(); onSelect({ kind: 'interaction', id: ix.id }) }}
            >
              <line
                x1={c1.x} y1={c1.y} x2={ax} y2={ay}
                stroke={isSelected ? '#C0392B' : '#8C6E45'}
                strokeWidth={isSelected ? 2.5 : 1.5}
                strokeDasharray={dashArray === 'none' ? undefined : dashArray}
                opacity={0.75}
              />
              {/* Arrowhead */}
              <polygon
                points={`
                  ${ax},${ay}
                  ${ax - arrowLen * Math.cos(angle - 0.4)},${ay - arrowLen * Math.sin(angle - 0.4)}
                  ${ax - arrowLen * Math.cos(angle + 0.4)},${ay - arrowLen * Math.sin(angle + 0.4)}
                `}
                fill={isSelected ? '#C0392B' : '#8C6E45'} opacity={0.75}
              />
              <text
                x={midX} y={midY - 6}
                textAnchor="middle" fontSize={9} fill="#6B625A"
                style={{ pointerEvents: 'none' }}
              >{ix.verb}</text>
              {/* Invisible hit area */}
              <line
                x1={c1.x} y1={c1.y} x2={ax} y2={ay}
                stroke="transparent" strokeWidth={14}
              />
            </g>
          )
        })}

        {/* Domain nodes */}
        {sortedDomains.map((domain, idx) => {
          const pos = nodePos(idx)
          const isSelected = selected?.kind === 'domain' && selected.id === domain.id

          return (
            <g key={domain.id}
              style={{ cursor: 'pointer' }}
              onClick={e => { e.stopPropagation(); onSelect({ kind: 'domain', id: domain.id }) }}
            >
              <rect
                x={pos.x} y={pos.y} width={NODE_W} height={NODE_H} rx={6}
                fill={domain.color}
                stroke={isSelected ? '#fff' : 'transparent'}
                strokeWidth={isSelected ? 3 : 0}
                opacity={isSelected ? 1 : 0.88}
              />
              <text
                x={pos.x + NODE_W / 2} y={pos.y + NODE_H / 2}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={10} fill="#fff" fontWeight={600}
                style={{ pointerEvents: 'none' }}
              >
                {domain.shortLabel ?? domain.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/InfluenceMapView.tsx
git commit -m "feat: add Influence Map View with domain nodes and labeled edges"
```

---

### Task 9: App Shell + View Switcher (wires everything, replaces ComplexityTimeline)

**Files:**
- Create: `src/UnderstoryApp.tsx`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: all components from Tasks 4–8, `useUnderstoryDocument` from Task 2, all modal components from Task 6
- Produces: the root `<UnderstoryApp />` component that replaces `<ComplexityTimeline />`

- [ ] **Step 1: Create `src/UnderstoryApp.tsx`**

```tsx
import React, { useState, useRef } from 'react'
import { Plus, Download, Upload, Map, List, Share2, Eye, EyeOff } from 'lucide-react'
import { useUnderstoryDocument } from './useUnderstoryDocument'
import { ProcessView } from './components/ProcessView'
import { TimelineView } from './components/TimelineView'
import { InfluenceMapView } from './components/InfluenceMapView'
import { InspectorPanel } from './components/InspectorPanel'
import { EraModal } from './components/modals/EraModal'
import { DomainModal } from './components/modals/DomainModal'
import { ProcessModal } from './components/modals/ProcessModal'
import { AnchorModal } from './components/modals/AnchorModal'
import { InteractionModal } from './components/modals/InteractionModal'
import type { SelectedItem } from './types'

type ModalKind = 'era' | 'domain' | 'process' | 'anchor' | 'interaction' | null

export function UnderstoryApp() {
  const store = useUnderstoryDocument()
  const { doc, setSettings, setActiveView, exportDocJson, importDoc } = store
  const [selected, setSelected] = useState<SelectedItem | null>(null)
  const [openModal, setOpenModal] = useState<ModalKind>(null)
  const importRef = useRef<HTMLInputElement>(null)

  const view = doc.settings.activeView

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => importDoc(ev.target?.result as string)
    reader.readAsText(file)
    e.target.value = ''
  }

  const toolbarBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '5px 12px', fontSize: 12, fontWeight: 500,
    background: '#fff', border: '1px solid #C8B99A', borderRadius: 4,
    cursor: 'pointer', color: '#4A4A4A',
  }

  const viewBtn = (v: typeof view): React.CSSProperties => ({
    ...toolbarBtn,
    background: doc.settings.activeView === v ? '#4E342E' : '#fff',
    color: doc.settings.activeView === v ? '#fff' : '#4A4A4A',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#F2ECD7' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        padding: '8px 16px', background: '#FDFAF4', borderBottom: '1px solid #D2BDA3',
      }}>
        {/* Title */}
        <div style={{ fontWeight: 700, fontSize: 14, color: '#4E342E', marginRight: 8 }}>
          Understory
        </div>

        {/* View switcher */}
        <button style={viewBtn('process')} onClick={() => setActiveView('process')}>
          <Map size={14} /> Process View
        </button>
        <button style={viewBtn('timeline')} onClick={() => setActiveView('timeline')}>
          <List size={14} /> Timeline View
        </button>
        <button style={viewBtn('influence')} onClick={() => setActiveView('influence')}>
          <Share2 size={14} /> Influence Map
        </button>

        <div style={{ width: 1, height: 24, background: '#D2BDA3', margin: '0 4px' }} />

        {/* Add buttons */}
        <button style={toolbarBtn} onClick={() => setOpenModal('era')}><Plus size={12} /> Add Era</button>
        <button style={toolbarBtn} onClick={() => setOpenModal('domain')}><Plus size={12} /> Add Domain</button>
        <button style={toolbarBtn} onClick={() => setOpenModal('process')}><Plus size={12} /> Add Process</button>
        <button style={toolbarBtn} onClick={() => setOpenModal('anchor')}><Plus size={12} /> Add Anchor</button>
        <button style={toolbarBtn} onClick={() => setOpenModal('interaction')}><Plus size={12} /> Add Interaction</button>

        <div style={{ width: 1, height: 24, background: '#D2BDA3', margin: '0 4px' }} />

        {/* Toggle controls (process view only) */}
        {view === 'process' && (
          <>
            <button
              style={{ ...toolbarBtn, background: doc.settings.showEras ? '#4E342E' : '#fff', color: doc.settings.showEras ? '#fff' : '#4A4A4A' }}
              onClick={() => setSettings({ showEras: !doc.settings.showEras })}
            >{doc.settings.showEras ? <Eye size={12} /> : <EyeOff size={12} />} Eras</button>
            <button
              style={{ ...toolbarBtn, background: doc.settings.showMinorAnchors ? '#4E342E' : '#fff', color: doc.settings.showMinorAnchors ? '#fff' : '#4A4A4A' }}
              onClick={() => setSettings({ showMinorAnchors: !doc.settings.showMinorAnchors })}
            >{doc.settings.showMinorAnchors ? <Eye size={12} /> : <EyeOff size={12} />} Minor Anchors</button>
            <button
              style={{ ...toolbarBtn, background: doc.settings.showInteractionLabels ? '#4E342E' : '#fff', color: doc.settings.showInteractionLabels ? '#fff' : '#4A4A4A' }}
              onClick={() => setSettings({ showInteractionLabels: !doc.settings.showInteractionLabels })}
            >{doc.settings.showInteractionLabels ? <Eye size={12} /> : <EyeOff size={12} />} Verb Labels</button>
            <button
              style={{ ...toolbarBtn, background: doc.settings.showOnlyMajorInteractions ? '#4E342E' : '#fff', color: doc.settings.showOnlyMajorInteractions ? '#fff' : '#4A4A4A' }}
              onClick={() => setSettings({ showOnlyMajorInteractions: !doc.settings.showOnlyMajorInteractions })}
            >Major Only</button>
          </>
        )}

        <div style={{ flex: 1 }} />

        {/* Import / Export */}
        <button style={toolbarBtn} onClick={() => importRef.current?.click()}><Upload size={12} /> Import</button>
        <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
        <button style={toolbarBtn} onClick={exportDocJson}><Download size={12} /> Export JSON</button>
      </div>

      {/* Main content area */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {view === 'process' && (
          <ProcessView
            doc={doc}
            selected={selected}
            onSelect={setSelected}
            showEras={doc.settings.showEras}
            showMinorAnchors={doc.settings.showMinorAnchors}
            showInteractionLabels={doc.settings.showInteractionLabels}
            showOnlyMajorInteractions={doc.settings.showOnlyMajorInteractions}
          />
        )}
        {view === 'timeline' && (
          <TimelineView
            doc={doc}
            selected={selected}
            onSelect={setSelected}
            showMinorAnchors={doc.settings.showMinorAnchors}
          />
        )}
        {view === 'influence' && (
          <InfluenceMapView
            doc={doc}
            selected={selected}
            onSelect={setSelected}
          />
        )}
      </div>

      {/* Inspector Panel */}
      <InspectorPanel
        doc={doc}
        selected={selected}
        onClose={() => setSelected(null)}
        onUpdateAnchor={store.updateAnchor}
      />

      {/* Modals */}
      {openModal === 'era' && (
        <EraModal
          onSave={store.addEra}
          onClose={() => setOpenModal(null)}
        />
      )}
      {openModal === 'domain' && (
        <DomainModal
          nextOrder={doc.processDomains.length + 1}
          onSave={store.addDomain}
          onClose={() => setOpenModal(null)}
        />
      )}
      {openModal === 'process' && (
        <ProcessModal
          doc={doc}
          onSave={store.addProcess}
          onClose={() => setOpenModal(null)}
        />
      )}
      {openModal === 'anchor' && (
        <AnchorModal
          doc={doc}
          onSave={store.addAnchor}
          onClose={() => setOpenModal(null)}
        />
      )}
      {openModal === 'interaction' && (
        <InteractionModal
          doc={doc}
          onSave={store.addInteraction}
          onClose={() => setOpenModal(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Update `src/main.tsx`**

Replace the existing content with:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { UnderstoryApp } from './UnderstoryApp'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <UnderstoryApp />
  </React.StrictMode>,
)
```

- [ ] **Step 3: Start dev server and verify all three views render**

```bash
npm run dev
```

Open the browser URL. Verify:
1. Process View shows era bands, domain rows, process arrows, anchor dots, and interaction curves
2. Timeline View shows era columns with major anchor events listed
3. Influence Map shows domain nodes with labeled directed edges
4. All toggle buttons (Eras, Minor Anchors, Verb Labels, Major Only) respond
5. Add modals open and save data correctly
6. Inspector panel appears on click and closes with X or clicking canvas

- [ ] **Step 4: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors. Fix any type errors before committing.

- [ ] **Step 5: Commit**

```bash
git add src/UnderstoryApp.tsx src/main.tsx
git commit -m "feat: add UnderstoryApp shell with view switcher and toolbar; wire all views"
```

---

### Task 10: Cleanup

**Files:**
- Delete: `src/ComplexityTimeline.tsx`
- Delete: `ComplexityTimeline.tsx` (project root copy, if present)

- [ ] **Step 1: Confirm the app still works without ComplexityTimeline**

```bash
npm run dev
```

Verify the app loads correctly in the browser with no console errors.

- [ ] **Step 2: Delete old files**

```bash
rm src/ComplexityTimeline.tsx
# If root copy exists:
rm -f ComplexityTimeline.tsx
```

- [ ] **Step 3: Build check**

```bash
npm run build
```

Expected: build succeeds with no TypeScript errors. Output goes to `dist/`.

- [ ] **Step 4: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove ComplexityTimeline.tsx — replaced by UnderstoryApp + process/timeline/influence views"
```

---

## Self-Review

### Spec Coverage

| Spec Section | Task |
|---|---|
| Replace Trends → Processes | Task 1 (types), Task 2 (seed data) |
| Events become Anchors | Task 1 (types), Task 2 (seed data) |
| Interactions with required verbs | Task 6 (InteractionModal enforces verb) |
| UnderstoryDocument data model | Task 1 |
| Process View (Taylor-style SVG) | Task 4 |
| Era bands, process arrows, anchor dots, dotted interactions | Task 4 |
| View Controls (show/hide toggles) | Task 9 (toolbar) |
| Timeline View (era columns + major anchors) | Task 7 |
| Influence Map View (domain nodes + labeled edges) | Task 8 |
| Inspector panel | Task 5 |
| Rename buttons (Add Domain, Add Anchor, etc.) | Task 9 |
| localStorage auto-save | Task 2 |
| JSON import/export | Task 2 + Task 9 |
| Guardrails (>12 labels, >20 interactions warn) | Task 4 |
| Seed data for development | Task 2 |
| Earth-tone color palette | Implemented throughout (process colors from spec) |
| Export active view as PNG/SVG/PDF | **Not covered — see note below** |

**Note on export:** The spec asks for PNG, SVG, and PDF export of the active view. This plan covers JSON export only. SVG-to-PNG/PDF export requires either `html2canvas` (for DOM) or serializing the SVG via `Blob`/`canvas.drawImage`. This is a meaningful standalone task that should be a follow-up plan once the views are stable and the SVG structure is locked in.

### Placeholder Scan

No TBD, TODO, or "similar to Task N" references found. All code blocks are complete.

### Type Consistency

- `SelectedItem` defined in Task 1 as a discriminated union; used by name in Tasks 4, 5, 7, 8, 9 — consistent.
- `useUnderstoryDocument()` returns `addAnchor`, `updateAnchor`, `removeAnchor` etc.; referenced by those exact names in Task 9 (`store.addAnchor`, `store.updateAnchor`).
- `ProcessView` props (`doc`, `selected`, `onSelect`, `showEras`, `showMinorAnchors`, `showInteractionLabels`, `showOnlyMajorInteractions`) — all passed from `UnderstoryApp` in Task 9 with matching names.
- `InspectorPanel` `onUpdateAnchor` prop matches `store.updateAnchor` signature `(anchor: AnchorEvent) => void`.
