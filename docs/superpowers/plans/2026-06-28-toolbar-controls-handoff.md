# Toolbar Controls Handoff — Export Popover + Year Range Popover

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the native `<select>` Size control and raw year number inputs at the right end of the main toolbar with custom popover-based controls that match the toolbar's visual language.

**Architecture:** Build a shared `ToolbarPopover` shell (anchor-positioned via `position: absolute` on a wrapper div, dismiss-on-outside-click/Escape, open/close CSS animation) then compose `ExportSizePopover` (Part A) and `YearRangePopover` (Part B) into it. All new React components live in `src/ComplexityTimeline.tsx` following the file's existing single-file convention. Year-clamping logic is extracted to `src/utils/yearRange.ts` to keep it unit-testable with Vitest (no React Testing Library in this project).

**Tech Stack:** React 18 + TypeScript, hand-written CSS (`u-*` naming convention), Vitest (pure-function tests only — no DOM/RTL).

## Global Constraints

- CSS class prefix: always `u-*`
- Button/label font: `"Alegreya Sans SC", "Alegreya Sans", sans-serif`, uppercase, `letter-spacing: 0.08em` — match existing `.u-btn`
- Design tokens: use CSS vars from `:root` — never hardcode their values. Tokens in play: `--bg-light`, `--bg-warm`, `--bg-mid`, `--bg-main`, `--border`, `--shadow`, `--text`, `--text-muted`, `--btn-export` (`#5A4A35`), `--btn-trend` (`#8C6E45`), `--primary`
- No new npm dependencies
- TypeScript strict mode — `npm run build` (`tsc && vite build`) must succeed after every commit
- No portals / `ReactDOM.createPortal` — position popovers with `position: absolute` on a `.u-toolbar-popover-anchor` wrapper (same pattern as existing `.u-export-wrap` / `.u-export-menu` in the CSS)
- Icons: `MSIcon` (defined at ~line 932 in `ComplexityTimeline.tsx`) for Material Symbols; `lucide-react` named imports for Lucide icons
- Desktop-only — no mobile breakpoints

---

### Task 1: `ToolbarPopover` shell component + CSS foundation

Shared wrapper used by both Part A and Part B. Handles positioning, outside-click dismissal, and open/close animation. No user-visible UI on its own.

**Files:**
- Modify: `src/ComplexityTimeline.tsx` — insert `ToolbarPopover` immediately after the `MSIcon` definition (~line 934)
- Modify: `src/understory.css` — add `.u-toolbar-popover-anchor`, `.u-toolbar-popover`, `.u-toolbar-popover--closing`, and animation keyframes after the `.u-export-crop-row` block (~line 312)

**Interfaces:**
- Produces `ToolbarPopover` consumed by Tasks 2 and 3:
  ```tsx
  type ToolbarPopoverProps = {
    open: boolean;           // controlled by parent's show* state
    onClose: () => void;
    children: React.ReactNode;
    triggerRef: React.RefObject<HTMLElement>; // the button that opened this popover
  };
  ```

- [ ] **Step 1: Add `ToolbarPopover` to `src/ComplexityTimeline.tsx`**

  Find the `MSIcon` helper (currently ends around line 934). Insert immediately after it:

  ```tsx
  const ToolbarPopover = ({
    open, onClose, children, triggerRef,
  }: {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
    triggerRef: React.RefObject<HTMLElement>;
  }) => {
    const popRef = useRef<HTMLDivElement>(null);
    const [alive, setAlive]     = useState(false);
    const [closing, setClosing] = useState(false);

    // Open: become alive immediately. Close: play exit animation then unmount.
    useEffect(() => {
      if (open) {
        setAlive(true);
        setClosing(false);
      } else if (alive) {
        setClosing(true);
        const t = setTimeout(() => { setAlive(false); setClosing(false); }, 80);
        return () => clearTimeout(t);
      }
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    // Outside-click: dismiss if click lands outside both the popover and its trigger.
    useEffect(() => {
      if (!open) return;
      const onDown = (e: MouseEvent) => {
        if (
          popRef.current?.contains(e.target as Node) ||
          triggerRef.current?.contains(e.target as Node)
        ) return;
        onClose();
      };
      document.addEventListener('mousedown', onDown);
      return () => document.removeEventListener('mousedown', onDown);
    }, [open, onClose, triggerRef]);

    // Escape is handled by the existing global keydown listener in ComplexityTimeline
    // (each task adds its show* setter there). No duplicate handler needed here.

    if (!alive) return null;
    return (
      <div
        ref={popRef}
        className={`u-toolbar-popover${closing ? ' u-toolbar-popover--closing' : ''}`}
        role="dialog"
      >
        {children}
      </div>
    );
  };
  ```

- [ ] **Step 2: Add CSS to `src/understory.css`**

  After the `.u-export-crop-row` rule block (~line 312), insert:

  ```css
  /* ── TOOLBAR POPOVER SHELL ── */
  .u-toolbar-popover-anchor {
    position: relative;
    display: inline-flex;
  }
  .u-toolbar-popover {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    background: var(--bg-light);
    border: 1px solid var(--border);
    border-radius: 4px;
    box-shadow: var(--shadow);
    z-index: 200;
    min-width: 220px;
    animation: u-pop-in 120ms ease-out;
  }
  .u-toolbar-popover--closing {
    animation: u-pop-out 80ms ease-in forwards;
  }
  @keyframes u-pop-in {
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes u-pop-out {
    from { opacity: 1; transform: translateY(0); }
    to   { opacity: 0; transform: translateY(-4px); }
  }
  ```

- [ ] **Step 3: Build to verify TypeScript compiles**

  Run: `npm run build`  
  Expected: `✓ built in <N>ms` — no TypeScript errors.

- [ ] **Step 4: Commit**

  ```bash
  git add src/ComplexityTimeline.tsx src/understory.css
  git commit -m "feat: ToolbarPopover shell + CSS (anchor, fade-slide animation)"
  ```

---

### Task 2: Export Size Popover (Part A)

The Export button now opens a popover listing `EXPORT_PROFILES` with a checkmark on the selected item; a confirm button inside the popover fires the actual export. The standalone Size `<select>` is removed entirely.

**Files:**
- Modify: `src/ComplexityTimeline.tsx` — add `ExportSizePopover` component after `ToolbarPopover`; add `showExportPopover` state and `exportBtnRef`; update global Escape handler; replace Export button + Size select in JSX
- Modify: `src/understory.css` — delete `.u-width-controls`, `.u-width-slider`, `.u-width-value`, `.u-profile-select`, `.u-profile-select:focus` rules; replace existing `.u-export-profile-btn` / `.u-export-profile-btn--active` rules with the new block below; add `.u-export-size-popover`, `.u-export-profile-check`, `.u-export-size-footer`

**Interfaces:**
- Consumes: `ToolbarPopover` (Task 1), `MSIcon`, `ExportProfile` type (line 58), `EXPORT_PROFILES` (line 66), `selectedProfileId`, `setSelectedProfileId`, `exportPNG`, `exportTopicalPNG`, `selectedProfile`, `viewMode`
- Produces: `ExportSizePopover`:
  ```tsx
  type ExportSizePopoverProps = {
    profiles: ExportProfile[];
    selectedId: string;
    onSelect: (id: string) => void;
    onConfirmExport: () => void;
    onClose: () => void;
  };
  ```

- [ ] **Step 1: Add `ExportSizePopover` to `src/ComplexityTimeline.tsx`**

  After `ToolbarPopover` (Task 1), insert:

  ```tsx
  const ExportSizePopover = ({
    profiles, selectedId, onSelect, onConfirmExport, onClose,
  }: {
    profiles: ExportProfile[];
    selectedId: string;
    onSelect: (id: string) => void;
    onConfirmExport: () => void;
    onClose: () => void;
  }) => {
    const listRef = useRef<HTMLDivElement>(null);

    // Move focus into the popover on open — land on the currently selected option.
    useEffect(() => {
      const selected = listRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]');
      (selected ?? listRef.current?.querySelector<HTMLButtonElement>('[role="option"]'))?.focus();
    }, []);

    // Arrow Up/Down moves focus between options without selecting.
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      const opts = Array.from(
        listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []
      );
      const idx = opts.indexOf(document.activeElement as HTMLButtonElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); opts[Math.min(idx + 1, opts.length - 1)]?.focus(); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); opts[Math.max(idx - 1, 0)]?.focus(); }
    };

    return (
      <div className="u-export-size-popover" onKeyDown={handleKeyDown}>
        <div ref={listRef} role="listbox" aria-label="Export size">
          {profiles.map(p => (
            <button
              key={p.id}
              role="option"
              aria-selected={p.id === selectedId}
              className={`u-export-profile-btn${p.id === selectedId ? ' u-export-profile-btn--active' : ''}`}
              onClick={() => onSelect(p.id)}
            >
              <span className="u-export-profile-check">{p.id === selectedId ? '✓' : ''}</span>
              {p.label}
            </button>
          ))}
        </div>
        <div className="u-export-size-footer">
          <button
            className="u-btn u-btn--export u-btn--full"
            onClick={() => { onConfirmExport(); onClose(); }}
          >
            <MSIcon n="image" /> Export
          </button>
        </div>
      </div>
    );
  };
  ```

- [ ] **Step 2: Add `showExportPopover` state and `exportBtnRef` to `ComplexityTimeline`**

  Near the other `show*` boolean state declarations (~line 1030), add:

  ```tsx
  const [showExportPopover, setShowExportPopover] = useState(false);
  ```

  Near the other `useRef` declarations (~line 942), add:

  ```tsx
  const exportBtnRef = useRef<HTMLButtonElement>(null);
  ```

- [ ] **Step 3: Add `setShowExportPopover(false)` to the global Escape handler**

  Find the `keydown` effect that resets all `show*` states on Escape (~line 1108). Add one line alongside the others:

  ```tsx
  setShowLayerModal(false);
  setShowEventModal(false);
  setShowColumnModal(false);
  setShowTrendModal(false);
  setShowConnectionModal(false);
  setShowExportPopover(false);   // ← add this
  ```

- [ ] **Step 4: Replace Export button + Size select in toolbar JSX**

  In `u-toolbar-right` (~line 2330), find and replace this entire block:

  ```tsx
  <button
    className="u-btn u-btn--export"
    onClick={() => viewMode === 'topical' ? exportTopicalPNG() : exportPNG(selectedProfile)}
    title="Export as PNG image"
  >
    <MSIcon n="image" /> Export
  </button>
  <div className="u-toolbar-sep" />
  <div className="u-width-controls">
    <span className="u-year-label">Size</span>
    <select
      className="u-profile-select"
      value={selectedProfileId}
      onChange={e => setSelectedProfileId(e.target.value)}
      title="Export size / aspect ratio"
    >
      {EXPORT_PROFILES.map(p => (
        <option key={p.id} value={p.id}>{p.label}</option>
      ))}
    </select>
  </div>
  ```

  With:

  ```tsx
  <div className="u-toolbar-popover-anchor">
    <button
      ref={exportBtnRef}
      className="u-btn u-btn--export"
      onClick={() => setShowExportPopover(v => !v)}
      aria-haspopup="listbox"
      aria-expanded={showExportPopover}
      title="Export as PNG image"
    >
      <MSIcon n="image" /> Export
    </button>
    <ToolbarPopover
      open={showExportPopover}
      onClose={() => setShowExportPopover(false)}
      triggerRef={exportBtnRef}
    >
      <ExportSizePopover
        profiles={EXPORT_PROFILES}
        selectedId={selectedProfileId}
        onSelect={setSelectedProfileId}
        onConfirmExport={() =>
          viewMode === 'topical' ? exportTopicalPNG() : exportPNG(selectedProfile)
        }
        onClose={() => setShowExportPopover(false)}
      />
    </ToolbarPopover>
  </div>
  ```

  The `<div className="u-toolbar-sep" />` that separated Export from Size is removed in this replacement — it's no longer needed.

- [ ] **Step 5: Update CSS in `src/understory.css`**

  **Delete** the following rules entirely (each is a standalone block):
  - The comment `/* ── CANVAS WIDTH CONTROL ── */` and `.u-width-controls { ... }` (~lines 181–186)
  - `.u-width-slider { ... }` (~lines 187–190)
  - `.u-width-value { ... }` (~lines 191–196)
  - `.u-profile-select { ... }` (~lines 197–207)
  - `.u-profile-select:focus { ... }` (~lines 208–211)

  **Replace** the existing `.u-export-profile-btn` and `.u-export-profile-btn--active` rules (~lines 279–296) with:

  ```css
  /* ── EXPORT SIZE POPOVER ── */
  .u-export-size-popover {
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .u-export-profile-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    text-align: left;
    padding: 5px 8px;
    font-family: "Alegreya Sans SC", "Alegreya Sans", sans-serif;
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 3px;
    cursor: pointer;
    color: var(--text);
  }
  .u-export-profile-btn:hover { background: var(--bg-warm); }
  .u-export-profile-btn--active {
    background: rgba(62,59,53,0.08);
    border-color: rgba(62,59,53,0.2);
  }
  .u-export-profile-check {
    width: 12px;
    display: inline-block;
    color: var(--btn-export);
    font-weight: 700;
    flex-shrink: 0;
    text-align: center;
  }
  .u-export-size-footer {
    border-top: 1px solid var(--border);
    padding: 6px 8px 4px;
  }
  ```

- [ ] **Step 6: Build to verify**

  Run: `npm run build`  
  Expected: `✓ built in <N>ms` — no errors.

- [ ] **Step 7: Manual smoke test**

  Run `npm run dev`, then:
  - Click **Export** → popover opens with profile list; ✓ marks the currently selected profile
  - Click a different profile row → ✓ moves to it, popover stays open
  - Click **Export** inside the popover → download starts, popover closes
  - Click outside the popover → closes without downloading
  - Press Escape → closes without downloading; selection retained for next open
  - Open popover, press ArrowDown/Up → focus cycles through profile options
  - Verify the old native Size `<select>` is gone from the toolbar

- [ ] **Step 8: Commit**

  ```bash
  git add src/ComplexityTimeline.tsx src/understory.css
  git commit -m "feat(part-a): export size popover, remove native size select"
  ```

---

### Task 3: Year Range Popover (Part B)

The two bare `<input type="number">` year fields are replaced by a single chip button (`2008–2025`) that opens a popover containing styled text inputs plus a dual-handle range slider.

**Files:**
- Create: `src/utils/yearRange.ts` — `clampYearRange` pure function
- Create: `src/utils/yearRange.test.ts` — Vitest tests
- Modify: `src/ComplexityTimeline.tsx` — import `clampYearRange`; add `MIN_YEAR`/`MAX_YEAR` constants; add `YearRangeChip` and `YearRangePopover` components; add `showYearPopover` state and `yearBtnRef`; update global Escape handler; replace year inputs in toolbar
- Modify: `src/understory.css` — delete `.u-year-controls`, `.u-year-label`, `.u-year-input`, `.u-year-input:focus`; add `.u-year-chip`, `.u-year-range-popover`, `.u-range-slider-wrap`, `.u-range-slider-track-bg`, `.u-range-slider`

**Interfaces:**
- Consumes: `ToolbarPopover` (Task 1), `startYear`, `endYear`, `setStartYear`, `setEndYear`, `clampYearRange` (from new utility)
- Produces:
  ```ts
  // src/utils/yearRange.ts
  export function clampYearRange(
    start: number, end: number, min: number, max: number
  ): [number, number]
  ```
  ```tsx
  // YearRangeChip — forwardRef so caller can pass yearBtnRef for ToolbarPopover
  const YearRangeChip = React.forwardRef<HTMLButtonElement, {
    startYear: number; endYear: number; onClick: () => void;
  }>(...)
  
  // YearRangePopover
  type YearRangePopoverProps = {
    startYear: number; endYear: number;
    onChange: (start: number, end: number) => void;
  };
  ```

- [ ] **Step 1: Create `src/utils/yearRange.ts`**

  ```ts
  /** Clamps both values to [min, max], then swaps if start > end. */
  export function clampYearRange(
    start: number, end: number, min: number, max: number
  ): [number, number] {
    const s = Math.max(min, Math.min(max, start));
    const e = Math.max(min, Math.min(max, end));
    return s <= e ? [s, e] : [e, s];
  }
  ```

- [ ] **Step 2: Create `src/utils/yearRange.test.ts`**

  ```ts
  import { describe, it, expect } from 'vitest';
  import { clampYearRange } from './yearRange';

  describe('clampYearRange', () => {
    it('returns valid range unchanged', () => {
      expect(clampYearRange(2008, 2025, 1800, 2100)).toEqual([2008, 2025]);
    });

    it('clamps start below min', () => {
      expect(clampYearRange(1799, 2025, 1800, 2100)).toEqual([1800, 2025]);
    });

    it('clamps end above max', () => {
      expect(clampYearRange(2008, 2101, 1800, 2100)).toEqual([2008, 2100]);
    });

    it('swaps inverted range', () => {
      expect(clampYearRange(2025, 2008, 1800, 2100)).toEqual([2008, 2025]);
    });

    it('allows start === end (single-year range is valid)', () => {
      expect(clampYearRange(2010, 2010, 1800, 2100)).toEqual([2010, 2010]);
    });

    it('clamps and swaps in one pass', () => {
      expect(clampYearRange(2200, 1700, 1800, 2100)).toEqual([1800, 2100]);
    });
  });
  ```

- [ ] **Step 3: Run tests — confirm 6 green**

  Run: `npm test`  
  Expected output includes: `✓ src/utils/yearRange.test.ts (6)`

- [ ] **Step 4: Add import and new components to `src/ComplexityTimeline.tsx`**

  **4a. Add import** at the top of the file, after the existing `import` lines:

  ```tsx
  import { clampYearRange } from './utils/yearRange';
  ```

  **4b. After `ExportSizePopover`** (Task 2 addition), insert the year range constants and components:

  ```tsx
  const MIN_YEAR = 1800;
  const MAX_YEAR = 2100;

  const YearRangeChip = React.forwardRef<
    HTMLButtonElement,
    { startYear: number; endYear: number; onClick: () => void }
  >(({ startYear, endYear, onClick }, ref) => (
    <button
      ref={ref}
      className="u-btn u-year-chip"
      onClick={onClick}
      aria-haspopup="dialog"
      title="Set visible year range"
    >
      {startYear}–{endYear}
    </button>
  ));
  YearRangeChip.displayName = 'YearRangeChip';

  const YearRangePopover = ({
    startYear, endYear, onChange,
  }: {
    startYear: number;
    endYear: number;
    onChange: (start: number, end: number) => void;
  }) => {
    const [localStart, setLocalStart] = useState(startYear);
    const [localEnd,   setLocalEnd]   = useState(endYear);

    // Sync local state when parent changes (e.g. file load resets the years).
    useEffect(() => { setLocalStart(startYear); }, [startYear]);
    useEffect(() => { setLocalEnd(endYear); },     [endYear]);

    const commit = (s: number, e: number) => {
      const [cs, ce] = clampYearRange(s, e, MIN_YEAR, MAX_YEAR);
      setLocalStart(cs);
      setLocalEnd(ce);
      onChange(cs, ce);
    };

    return (
      <div className="u-year-range-popover">
        <div className="u-year-range-fields">
          <label className="u-year-range-label">
            <span className="u-year-range-field-name">From</span>
            <input
              className="u-year-range-input"
              type="number"
              value={localStart}
              onChange={e => setLocalStart(Number(e.target.value))}
              onBlur={() => commit(localStart, localEnd)}
            />
          </label>
          <span className="u-year-range-dash">–</span>
          <label className="u-year-range-label">
            <span className="u-year-range-field-name">To</span>
            <input
              className="u-year-range-input"
              type="number"
              value={localEnd}
              onChange={e => setLocalEnd(Number(e.target.value))}
              onBlur={() => commit(localStart, localEnd)}
            />
          </label>
        </div>

        {/* Dual-handle slider — two stacked range inputs sharing the same track.
            Commits on mouse/touch up (not per-pixel) to avoid re-rendering the
            full timeline on every movement pixel. */}
        <div className="u-range-slider-wrap">
          <div className="u-range-slider-track-bg" />
          <input
            type="range"
            className="u-range-slider"
            min={MIN_YEAR} max={MAX_YEAR}
            value={localStart}
            onChange={e => setLocalStart(Number(e.target.value))}
            onMouseUp={() => commit(localStart, localEnd)}
            onTouchEnd={() => commit(localStart, localEnd)}
            aria-label="Start year"
            aria-valuemin={MIN_YEAR}
            aria-valuemax={MAX_YEAR}
            aria-valuenow={localStart}
          />
          <input
            type="range"
            className="u-range-slider"
            min={MIN_YEAR} max={MAX_YEAR}
            value={localEnd}
            onChange={e => setLocalEnd(Number(e.target.value))}
            onMouseUp={() => commit(localStart, localEnd)}
            onTouchEnd={() => commit(localStart, localEnd)}
            aria-label="End year"
            aria-valuemin={MIN_YEAR}
            aria-valuemax={MAX_YEAR}
            aria-valuenow={localEnd}
          />
        </div>
      </div>
    );
  };
  ```

- [ ] **Step 5: Add `showYearPopover` state and `yearBtnRef`**

  Near `showExportPopover` (Task 2, ~line 1036):

  ```tsx
  const [showYearPopover, setShowYearPopover] = useState(false);
  ```

  Near `exportBtnRef` (Task 2, ~line 944):

  ```tsx
  const yearBtnRef = useRef<HTMLButtonElement>(null);
  ```

- [ ] **Step 6: Add `setShowYearPopover(false)` to the global Escape handler**

  In the `keydown` effect (alongside `setShowExportPopover(false)` added in Task 2):

  ```tsx
  setShowExportPopover(false);
  setShowYearPopover(false);   // ← add this
  ```

- [ ] **Step 7: Replace year inputs in toolbar JSX**

  In `u-toolbar-right`, replace:

  ```tsx
  <div className="u-year-controls">
    <span className="u-year-label">From</span>
    <input className="u-year-input" type="number" value={startYear}
      onChange={e => setStartYear(Number(e.target.value))} />
    <span className="u-year-label">To</span>
    <input className="u-year-input" type="number" value={endYear}
      onChange={e => setEndYear(Number(e.target.value))} />
  </div>
  ```

  With:

  ```tsx
  <div className="u-toolbar-popover-anchor">
    <YearRangeChip
      ref={yearBtnRef}
      startYear={startYear}
      endYear={endYear}
      onClick={() => setShowYearPopover(v => !v)}
    />
    <ToolbarPopover
      open={showYearPopover}
      onClose={() => setShowYearPopover(false)}
      triggerRef={yearBtnRef}
    >
      <YearRangePopover
        startYear={startYear}
        endYear={endYear}
        onChange={(s, e) => { setStartYear(s); setEndYear(e); }}
      />
    </ToolbarPopover>
  </div>
  ```

- [ ] **Step 8: Update CSS in `src/understory.css`**

  **Delete** these rules entirely:
  - `/* ── YEAR CONTROLS ── */` comment and `.u-year-controls { ... }` (~lines 213–218)
  - `.u-year-label { ... }` (~lines 219–225)
  - `.u-year-input { ... }` (~lines 226–236)
  - `.u-year-input:focus { ... }` (~line 237)

  **Add** after the `.u-export-size-footer` rule (Task 2's CSS):

  ```css
  /* ── YEAR RANGE CHIP + POPOVER ── */
  .u-year-chip {
    background: var(--bg-mid);
    color: var(--text);
    border: 1px solid var(--border);
  }
  .u-year-chip:hover { background: var(--bg-warm); opacity: 1; }

  .u-year-range-popover {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 240px;
  }
  .u-year-range-fields {
    display: flex;
    align-items: flex-end;
    gap: 6px;
  }
  .u-year-range-label {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex: 1;
  }
  .u-year-range-field-name {
    font-family: "Alegreya Sans SC", "Alegreya Sans", sans-serif;
    font-size: 0.65rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-muted);
  }
  .u-year-range-input {
    font-family: "Alegreya Sans", sans-serif;
    font-size: 0.9rem;
    width: 100%;
    padding: 0.3rem 0.45rem;
    border: 1px solid var(--border);
    border-radius: 3px;
    background: var(--bg-main);
    color: var(--text);
    text-align: center;
  }
  .u-year-range-input:focus { outline: 2px solid var(--primary); outline-offset: 1px; }
  .u-year-range-dash {
    font-size: 1.1rem;
    color: var(--text-muted);
    padding-bottom: 0.3rem;
    flex-shrink: 0;
  }

  /* Dual-handle range slider — two stacked <input type="range"> share the track.
     pointer-events: none on the element; pointer-events: all on the thumb only,
     so both thumbs are independently draggable. */
  .u-range-slider-wrap {
    position: relative;
    height: 24px;
  }
  .u-range-slider-track-bg {
    position: absolute;
    height: 4px;
    top: 50%; left: 8px; right: 8px;
    transform: translateY(-50%);
    background: var(--bg-mid);
    border-radius: 2px;
    pointer-events: none;
  }
  .u-range-slider {
    position: absolute;
    top: 0; left: 0;
    width: 100%;
    height: 24px;
    pointer-events: none;
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    outline: none;
  }
  .u-range-slider::-webkit-slider-thumb {
    pointer-events: all;
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--btn-trend);
    cursor: grab;
    border: 2px solid #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }
  .u-range-slider::-moz-range-thumb {
    pointer-events: all;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--btn-trend);
    cursor: grab;
    border: 2px solid #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }
  ```

- [ ] **Step 9: Build to verify**

  Run: `npm run build`  
  Expected: `✓ built in <N>ms` — no errors.

- [ ] **Step 10: Manual smoke test**

  Run `npm run dev`, then:
  - Toolbar shows a chip reading the current range (e.g. `2008–2025`). Click it → popover opens
  - Type a new value in the **From** field, press Tab → timeline re-renders with the new start year; chip label updates
  - Type an end year that is smaller than start year, press Tab → values swap; chip shows corrected range
  - Type `1700` in **From**, press Tab → clamped to `1800`
  - Type `2200` in **To**, press Tab → clamped to `2100`
  - Drag the left (start) slider thumb → From field updates live; on mouse release, timeline re-renders
  - Drag the right (end) slider thumb → To field updates live; on mouse release, timeline re-renders
  - Click outside popover → closes; chip shows the committed values
  - Press Escape → closes
  - Verify the old bare `From / [input] To / [input]` controls are gone

- [ ] **Step 11: Commit**

  ```bash
  git add src/ComplexityTimeline.tsx src/understory.css \
          src/utils/yearRange.ts src/utils/yearRange.test.ts
  git commit -m "feat(part-b): year range chip + dual-handle slider popover"
  ```
