# Card Typography & Default Colors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update event card typography to use the Alegreya serif face and change default event colors to match the warm parchment aesthetic.

**Architecture:** Two focused changes: (1) update `.u-event-card` CSS font-family and metrics; (2) update the `EventModal` color defaults. No new files, no state changes, no logic changes.

**Tech Stack:** React 18, TypeScript, Vite, custom CSS (no Tailwind).

## Already Resolved (no work needed)

The `docs/understory_adjustments.md` spec was written against an older version. The following items are already done:

| Spec item | Status |
|---|---|
| P0: Arrow `getEventPosition` → `offsetWidth` | Resolved differently — current code uses `svgWidth` state via `useLayoutEffect`; no `getEventPosition` function exists |
| P0: SVG `overflow: visible` | Already set in `.u-svg-overlay` CSS (`src/understory.css`) |
| P1: Toolbar unified stone palette | Already custom `.u-btn` CSS — no Tailwind rainbow |
| P1: Background → warm parchment | `var(--bg-warm)` #EAE0CA outer, `var(--bg-main)` #F6F2E7 inner |
| P1: Layer labels → uppercase tracking | Already "Alegreya Sans SC", uppercase, 0.07em letter-spacing |
| P1: Trend bands → opacity 70%, Alegreya Sans | Already small-caps, 30% opacity, `getContrastColor` |
| Font loading | Alegreya family in both `index.html` and `understory.css` |

## Global Constraints

- Edit only `src/ComplexityTimeline.tsx` and `src/understory.css` — no new files.
- No `console.log` or debug artifacts.
- Run `npm run build` after each task to confirm TypeScript compiles cleanly.
- Do not change any event data schema — only defaults for new events and CSS presentation.

---

## File Map

| File | Change |
|------|--------|
| `src/understory.css` | Update `.u-event-card` font-family, font-size, line-height, letter-spacing |
| `src/ComplexityTimeline.tsx` | Update `EventModal` default `color` and `borderColor` state values |

---

### Task 1: Event Card Typography and Default Colors

Two co-located changes: the CSS font for all cards, and the default colors applied to new events in the modal. Keeping them in one task because they're both about the same visual artifact (the event card) and the review can evaluate the combined result.

**Files:**
- Modify: `src/understory.css` — `.u-event-card` rule (~line 665)
- Modify: `src/ComplexityTimeline.tsx` — `EventModal` color/borderColor state (~line 442)

**Interfaces:**
- `.u-event-card` CSS: `font-family`, `font-size`, `line-height`, `letter-spacing` fields
- `EventModal` component: `color` state default (background), `borderColor` state default (border + text color)

**Note on color-as-text:** The event card render already sets `color: event.borderColor` in its inline style — this means changing the `borderColor` default also changes the default card text color. `#8B7355` (warm umber) on `#fdf8f0` (parchment) gives sufficient contrast for the archival aesthetic.

- [ ] **Step 1: Update `.u-event-card` CSS font-family and metrics**

Find in `src/understory.css` (~line 665):
```css
.u-event-card {
  padding: 0.32rem 0.55rem;
  border-radius: 3px;
  border-width: 2px;
  border-style: solid;
  font-family: "Alegreya Sans", sans-serif;
  font-size: 0.75rem;
  text-align: center;
  line-height: 1.35;
  box-shadow: 0 1px 4px rgba(62,59,53,0.12);
  word-break: break-word;
}
```

Replace with:
```css
.u-event-card {
  padding: 0.32rem 0.55rem;
  border-radius: 3px;
  border-width: 2px;
  border-style: solid;
  font-family: "Alegreya", Georgia, serif;
  font-size: 0.6875rem;
  text-align: center;
  line-height: 1.4;
  letter-spacing: 0.01em;
  box-shadow: 0 1px 4px rgba(62,59,53,0.12);
  word-break: break-word;
}
```

`0.6875rem` = 11px at the default 16px root size, matching the spec's `11px` target.

- [ ] **Step 2: Update `EventModal` default colors**

Find in `src/ComplexityTimeline.tsx` (~line 442):
```typescript
const [color, setColor]       = useState(initialData?.color      ?? '#F6F2E7');
const [borderColor, setBorder]= useState(initialData?.borderColor ?? '#3E3B35');
```

Replace with:
```typescript
const [color, setColor]       = useState(initialData?.color      ?? '#fdf8f0');
const [borderColor, setBorder]= useState(initialData?.borderColor ?? '#8B7355');
```

`#fdf8f0` — lighter, creamier parchment (spec target).
`#8B7355` — warm umber; used for both border and card text (`color: event.borderColor` in the render).

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: clean build, no TypeScript errors, `✓ built in ~XXXms`.

- [ ] **Step 4: Visual verification**

```bash
npm run dev
```

Check:
- Existing cards (loaded from a saved file) are unchanged — their stored `color`/`borderColor` values remain.
- A new event created via "Add Event" opens the color picker pre-filled with `#fdf8f0` background and `#8B7355` border.
- The saved new event card renders with warm umber border, umber text, Alegreya serif typeface, and light parchment background.
- Alegreya (serif) is visibly different from the previous Alegreya Sans — look for the serifs on capital letters.

- [ ] **Step 5: Commit**

```bash
git add src/understory.css src/ComplexityTimeline.tsx
git commit -m "feat: update event card to Alegreya serif; default new event colors to warm umber/parchment"
```

---

## Self-Review

**Spec coverage:**
- ✅ Event card default colors → parchment/umber — Task 1 Step 2
- ✅ Event card font → Alegreya (serif) — Task 1 Step 1
- ✅ Event card font-size 11px, line-height 1.4, letter-spacing 0.01em — Task 1 Step 1
- ✅ All previously-done items documented in "Already Resolved" table above

**Placeholder scan:** None — all steps contain exact code values.

**Type consistency:** No TypeScript types involved — CSS and `useState` string defaults only. No function signatures added or changed.

**Scope boundary:** Existing saved events are unaffected. Only new events get the updated defaults; previously-saved events carry their stored `color`/`borderColor` fields.
