# Handoff Spec: Toolbar — Size Control & Date Range Control

## Overview

Two controls currently sit at the end of the main toolbar in `ComplexityTimeline.tsx` (lines ~2337–2360): a **Size** selector (export/canvas aspect ratio) and a **From/To** date range (years 2008–2025, native number inputs). Design critique surfaced that these are independent settings that have been visually conflated by sitting side-by-side with no grouping, using native browser controls (`<select>`, `<input type="number">`) that don't match the rest of the toolbar's custom `u-btn` styling.

**Decision from critique:** do not combine them into one shared modal/popover — they control unrelated things (export output format vs. active data viewport) and bundling them invites users to look for a relationship that doesn't exist. Treat as two separate handoffs below.

This doc specs the replacement of both native controls with custom components, and the relocation of Size next to Export.

---

## Part A: Size Control → Export Popover

### Why
`EXPORT_PROFILES` (lines 66–74) is an export/print format list ("Slide 16:9," "Tabloid landscape," "Book trim 6×9"), not a live-canvas-editing setting. It belongs in the export flow, not as permanent toolbar real estate. Confirmed independent of the date range — no shared state, so no shared UI surface.

### Layout
Remove the `<div className="u-width-controls">` block (lines ~2338–2349) from the toolbar entirely. Add a popover triggered by the existing **EXPORT** button: instead of firing export immediately, EXPORT opens a small popover anchored below/right of the button containing the size selector, then a confirm action that performs the actual export.

If EXPORT currently does something else (immediate download) — confirm with design before changing its click behavior; alternative is a small chevron/caret affordance next to EXPORT that opens the popover without changing the main button's existing behavior.

### Design Tokens Used
| Token | Value | Usage |
|---|---|---|
| `--bg-light` | `#F0EAD8` | Popover background |
| `--border` | `rgba(0,0,0,0.10)` | Popover border |
| `--shadow` | `0 2px 12px rgba(62,59,53,0.10), 0 1px 3px rgba(62,59,53,0.07)` | Popover elevation |
| `--text` | `#3E3B35` | Option label text |
| `--text-muted` | `#6b6760` | Helper text |
| `--btn-export` | `#5A4A35` | Confirm button background, matches EXPORT button color family |
| Font: Alegreya Sans SC | uppercase, `letter-spacing: 0.08em` | Option labels, to match existing button typography |

### Components
| Component | Variant | Props | Notes |
|---|---|---|---|
| `ExportSizePopover` (new) | default | `profiles: ExportProfile[]`, `selectedId: string`, `onSelect(id)`, `onConfirmExport()`, `onClose()` | New component — no existing Popover to reuse. Build as a portal-rendered absolutely-positioned div anchored to the EXPORT button's `ref`, dismissed on outside-click and `Escape`. |
| Option row | default / selected | `label: string`, `selected: boolean` | Selected row shows a checkmark (✓), matching the menu screenshot already shown — preserve that visual pattern rather than radio buttons. |

### States and Interactions
| Element | State | Behavior |
|---|---|---|
| EXPORT button | Click | Opens popover (does not yet export) |
| Option row | Hover | Background shifts to `--bg-warm` (#EAE0CA) |
| Option row | Selected | Checkmark prefix, no background change needed (checkmark is sufficient signal) |
| Option row | Click | Sets `selectedProfileId`, popover stays open (selecting size ≠ committing export) |
| Confirm/Export button (inside popover) | Click | Performs export with selected profile, closes popover |
| Popover | Outside click / Escape | Closes without exporting, selection is still retained for next open |

### Responsive Behavior
This is a desktop creative tool (canvas + toolbar); no mobile breakpoint currently exists in the codebase. Spec for desktop only unless a breakpoint is introduced elsewhere. If toolbar width becomes constrained, the popover trigger should remain a fixed-width button — do not let the popover's content affect toolbar layout, since it renders in a portal/overlay.

### Edge Cases
- **First open, nothing selected yet**: default to whatever `selectedProfileId` currently holds (already initialized to `'native'` per existing state) — preserve current default behavior, no regression.
- **Long profile list growth**: at 7 items no scrolling needed; if list grows past ~10, cap popover height and add internal scroll rather than letting it overflow the viewport.
- **Export fails**: surface existing error handling (check current EXPORT click handler for error states) inside the popover rather than a separate toast, so the user doesn't lose context on which size they picked.

### Animation / Motion
| Element | Trigger | Animation | Duration | Easing |
|---|---|---|---|---|
| Popover | Open | Fade + 4px slide from trigger | 120ms | ease-out |
| Popover | Close | Fade out | 80ms | ease-in |

### Accessibility Notes
- Popover trigger button needs `aria-haspopup="listbox"` and `aria-expanded`.
- Popover content: `role="listbox"`, each option `role="option"` with `aria-selected`.
- Focus moves into the popover on open (first focus to the selected option), returns to the EXPORT button on close.
- Full keyboard support: Arrow Up/Down to move selection, Enter to confirm export, Escape to close without exporting.

---

## Part B: Date Range Control → Custom Range Control

### Why
Confirmed this is a frequently-adjusted, active-session control (filtering which years of data render), not a set-once preference — it should stay inline and visible, but the current implementation (two bare `<input type="number">` with native browser spinner arrows) is undersized for touch/click and visually inconsistent with the rest of the toolbar.

### Layout
Replace the `<div className="u-year-controls">` block (lines ~2351–2360) with a single compact control: a chip/button reading the current range (e.g. `2008–2025`) that expands an inline popover with two editable fields plus a dual-handle range slider for fast scrubbing. This mirrors the Part A popover pattern for visual consistency — reuse the same popover shell component (`ExportSizePopover`'s base structure can be generalized into a shared `ToolbarPopover` wrapper that both Part A and Part B compose into, rather than building two one-off implementations).

### Design Tokens Used
| Token | Value | Usage |
|---|---|---|
| `--btn-trend` | `#8C6E45` | Slider track active fill (distinguishes from export's `--btn-export` accent) |
| `--bg-mid` | `#E2D4B8` | Slider track inactive background |
| `--text` | `#3E3B35` | Numeric field text |
| `--border` | `rgba(0,0,0,0.10)` | Field borders |

### Components
| Component | Variant | Props | Notes |
|---|---|---|---|
| `YearRangeChip` (new) | default | `startYear: number`, `endYear: number`, `onClick()` | Replaces the two `<span className="u-year-label">` + input pairs. Reads `2008–2025` as a single `u-btn`-styled trigger, visually consistent with other toolbar buttons (use `u-btn` base class, not native select styling). |
| `YearRangePopover` (new) | default | `startYear`, `endYear`, `min`, `max`, `onChange(start, end)` | Contains two numeric text fields (replace native spinner inputs with plain styled text inputs + custom up/down icon buttons if stepping is still wanted) and a dual-handle slider beneath them for direct manipulation. |

### States and Interactions
| Element | State | Behavior |
|---|---|---|
| `YearRangeChip` | Default | Shows current range, e.g. `2008–2025` |
| `YearRangeChip` | Click | Opens `YearRangePopover` |
| Numeric fields (in popover) | Edit | Typing updates the corresponding slider handle live; clamp to `min`/`max` (data's actual available year bounds) on blur |
| Slider handles | Drag | Updates corresponding numeric field live; emit `onChange` continuously or on drag-end (recommend drag-end to avoid re-rendering the full timeline on every pixel of movement, given this is a 2700-line component already) |
| Invalid input (start > end) | On blur | Swap or clamp values rather than allowing an inverted range — never let `startYear > endYear` reach the rest of the app |

### Responsive Behavior
Desktop-only, same as Part A — no existing mobile breakpoints in this codebase.

### Edge Cases
- **Min/max bounds**: clamp to actual data bounds, not arbitrary values — confirm with data layer what the true min/max selectable years are (the screenshot shows 2008–2025; verify whether this is hardcoded or computed from loaded data).
- **Single-year range** (start === end): should be a valid, supported state, not blocked.
- **Rapid re-render cost**: since `setStartYear`/`setEndYear` likely trigger timeline re-computation in a 2700-line component, debounce slider-drag updates (commit on drag-end, not per-pixel) to avoid jank.

### Animation / Motion
| Element | Trigger | Animation | Duration | Easing |
|---|---|---|---|---|
| `YearRangePopover` | Open/close | Same as Part A popover (fade + slide) | 120ms / 80ms | ease-out / ease-in |
| Slider handle | Drag | No animation (direct 1:1 tracking) | — | — |

### Accessibility Notes
- Slider handles need `role="slider"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-label="Start year"` / `"End year"`.
- Arrow Left/Right (or Up/Down) on a focused handle should adjust by 1 year.
- Numeric text fields remain the primary accessible input path — slider is a supplementary direct-manipulation affordance, not the only way to set values.
- `YearRangeChip` trigger button: `aria-haspopup="dialog"`, `aria-expanded`.

---

## Implementation Notes for Claude Code

- **File to modify**: `/Users/jeremy/Projects/understory/src/ComplexityTimeline.tsx` (toolbar block ~lines 2269–2361, `EXPORT_PROFILES` at lines 66–74).
- **CSS file**: `/Users/jeremy/Projects/understory/src/understory.css` — remove/replace `.u-width-controls`, `.u-profile-select`, `.u-year-controls`, `.u-year-input` rules (lines ~182–237); add new rules for `.u-toolbar-popover`, `.u-year-chip`, `.u-range-slider`.
- **No existing Popover/Dropdown/Slider component to reuse** — these are new. Recommend building one generalized `ToolbarPopover` shell (anchor-positioned, portal-rendered, dismiss-on-outside-click/Escape, shared fade/slide animation) and composing both the Export-size picker and the Year-range picker into it, rather than two bespoke implementations.
- **Existing `Modal` component** (lines ~370–390, used for "Add X" forms) is a full backdrop modal — intentionally *not* reused here, since popovers (lighter weight, anchored, no backdrop) are the right pattern for these two controls per the critique discussion.
- Stack: React + TypeScript, hand-written CSS (no Tailwind/CSS-in-JS) using `u-*` class naming convention. Icons via `lucide-react` and a local `MSIcon` (Material Symbols) wrapper — use these for any new icons (e.g. chevron on the EXPORT trigger, up/down steppers in the year fields).
- Font for all button/label text: Alegreya Sans SC, uppercase, `letter-spacing: 0.08em` — apply to new component labels for consistency.
