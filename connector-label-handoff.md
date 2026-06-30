# Handoff Spec: Connector label attachment (ComplexityTimeline)

## Overview

Relationship labels on the timeline's dotted connectors (e.g. "Creates mandate for university engagement" between two event nodes) currently render as a third, equal-weight node in the chain — same border weight and fill as the event boxes they're meant to annotate, with a visible gap between the label edge and the resuming dashes. This makes the label compete with event nodes for attention rather than reading as metadata *about* the relationship between them.

This spec replaces the bordered-label pattern with a label rendered on a fixed neutral chip surface — independent of the user-configurable column background it sits over — with a leader-tick fallback for cases where the label can't sit on-axis. The chip approach was chosen over a background-matched/blend-in approach specifically because column color varies by user preference and a draggable label can straddle two columns, both of which break any design that depends on matching a single underlying color.

## Problem Statement

Three things currently break the "attached" feeling:
1. **Border weight parity** — the label box uses the same stroke weight/color as event-node boxes, so it reads as a peer node instead of an annotation.
2. **Vertical offset** — the label isn't reliably centered on the connector's y-coordinate, so dashes don't visually enter/exit at the label's mid-height.
3. **Gap before resume** — there's whitespace between the label edge and where the dashed line resumes, instead of the line plugging directly into the label.

## Layout

- Connector line runs at a fixed y (the vertical center of the two event boxes it joins — confirm this is the same y used in `getEventPosition`, given the prior coordinate-space mismatch between scroll offset and the fixed SVG coordinate space).
- Label sits centered on that y, horizontally centered between the two boxes it connects (or offset if connecting non-adjacent boxes — see Edge Cases).
- No minimum/maximum width beyond what's needed for text — width is `text width + 2 × spacing-md` (24px each side).

## Design Tokens Used

**Important constraint:** column background color is user-configurable per preferences, and a dragged label can straddle two columns with different colors. The label surface must NOT attempt to match or sample the column background — that was the original plan and it breaks under both conditions (no single color to match; a split-fill rect would visibly divide the label exactly the way the line gap divided the connector). Instead, the label gets its own fixed, theme-aware surface that's independent of whatever data-driven column color sits underneath it — the same pattern as a tooltip or badge, which never tries to blend with page content.

| Token | Value | Usage |
|-------|-------|-------|
| `color-surface-chip` | fixed neutral system surface (light/dark mode pair — e.g. near-white / near-charcoal, NOT derived from any column token) | Label background. Same value regardless of which column(s) the label sits over. |
| `color-chip-border` | low-opacity neutral hairline (not derived from column color) | 0.5px border — subtle separation, not a heavy outline. This border is now load-bearing for legibility since the chip can no longer rely on color-matching to read as "attached" |
| `color-text-on-chip` | fixed text color verified for AA contrast against `color-surface-chip` specifically (not against page/column colors) | Label text. Contrast only needs to be checked once against the fixed chip surface — it never needs to be computed against arbitrary user-chosen column colors |
| `color-connector-line` | existing dotted-connector stroke color | Connector line, leader ticks |
| `spacing-xs` | 4px | Tick mark length (see Components) |
| `spacing-sm` | 8px | Vertical clearance between label text and any other element |
| `font-label-annotation` | Alegreya Sans, existing connector-label size/weight | Label text — do not promote to event-box title weight |

With color-matching no longer doing the work of signaling "attached," that job shifts entirely to **geometric precision**: the connector line must terminate exactly at the chip's edge with zero gap (see Implementation Notes — single continuous path, occluded by the chip's opaque fill). A 1px misalignment here is now more noticeable than it would have been under the blend-in approach, since there's a visible border to expose the seam.

## Components

| Component | Variant | Props | Notes |
|-----------|---------|-------|-------|
| `ConnectorLabel` | `inline` (default) | `text`, `lineY`, `centerX` | Fixed `color-surface-chip` fill, subtle `color-chip-border`. Renders centered on the connector's y. Dash pattern continues unbroken underneath — do not clip or gap the line; let the chip's opaque fill occlude it naturally. Background color is constant regardless of which column(s) the chip overlaps. |
| `ConnectorLabel` | `offset` (fallback) | `text`, `lineY`, `centerX`, `tickFromX`, `tickFromY` | Used when the label can't sit directly on the connector path (e.g. connecting non-horizontally-aligned events, or label too wide to fit on-axis without colliding with a node). Adds a short perpendicular tick (`spacing-xs` length, `color-connector-line`) from the line to the label edge. Same fixed chip surface as `inline`. |

## States and Interactions

| Element | State | Behavior |
|---------|-------|----------|
| `ConnectorLabel` | Default | Fixed chip surface, centered on line, subtle border |
| `ConnectorLabel` | Long text (near event node) | Switch to `offset` variant rather than letting label collide with adjacent node — see Edge Cases for the exact threshold |
| `ConnectorLabel` | Hover (if interactive) | Darken `color-surface-chip` slightly rather than adding a heavier stroke, to avoid reintroducing the "node" reading |
| `ConnectorLabel` | Dragging | Raise to a higher elevation (subtle shadow using existing elevation tokens, not a new color) so it's clear the label is mid-move, separate from its settled flat-chip appearance. Settles back to flat on drop. |

## Edge Cases

- **Label crosses a column boundary (drag-and-drop into a new position)**: this is the reason the chip uses a fixed surface rather than column-matched fill — it makes straddling a non-issue by construction. Do not implement column-color sampling or split-fill rendering for this case; the chip's appearance does not change based on position.
- **User selects a column background color close to or matching `color-surface-chip`**: even though the chip no longer needs to contrast with the *column*, it should remain visually distinct enough to read as a discrete element. If a future palette-customization feature allows colors at the extreme ends of the lightness range, revisit whether `color-chip-border` needs a slightly higher-contrast variant — flag this rather than silently degrading.
- **Label wider than available horizontal space between two boxes**: switch to `offset` variant — pull the label above or below the line with a tick, rather than letting it overlap an event-node box or shrink below readable size.
- **Two connectors crossing near the same label**: explicitly set label rendering above connector lines but below event-node boxes, so a crossing line never visually sits on top of label text.
- **Very short label text (1–2 words)**: don't let the chip shrink so far that it reads as a tooltip — maintain a minimum width of ~64px even if text is shorter.
- **Long label text wrapping**: if a label requires wrapping, prefer the `offset` variant with the label positioned in a quiet region (above/below the timeline lane) rather than wrapping inline on the connector, which would force the line to route around multiple lines of text.

## Animation / Motion

None required for this change — this is a static visual correction, not a new interactive element. If labels are later made interactive (e.g. click to expand detail), that's a separate spec.

## Accessibility Notes

- Label text remains in the DOM as real text (not embedded in an SVG path or image), so screen readers encounter it in document order between the two events it connects.
- `color-text-on-chip` against `color-surface-chip` must meet AA — this is now a fixed, one-time check rather than something that needs to hold up against arbitrary user-chosen column colors, which is a meaningful simplification versus the original approach.
- If `offset` variant ticks are purely decorative, mark them `aria-hidden="true"`.
- If labels are draggable via keyboard as well as pointer, the dragging-state elevation change should have a corresponding ARIA live-region announcement (e.g. "Label moved to new position") — flag this with whoever owns the drag interaction if it doesn't already exist.

## Implementation Notes

- **The connector is a single continuous path, not two segments.** Render one line/path from the source box to the target box; do not split it into a "before label" and "after label" segment with separate coordinates. The label's near-opaque background occludes the line visually via z-order (line renders first, label renders on top) — it does not require the line itself to stop and resume. This is a deliberate simplification versus the current implementation, which likely draws two segments meeting at the label edges — that's the probable source of both the visible gap and any vertical-alignment drift between the two pieces.
- For the `offset` variant, the main connector remains one unbroken path; the tick is a second, short line branching off it to reach the off-axis label, not a division of the original line.
- This should be a visual-only change to whatever component currently renders the bordered label box — no change to the underlying data model for connector relationships.
- Apply consistently across all connector labels in `ComplexityTimeline`, not just the one in the reference screenshot — audit for any hardcoded border styles on the label component.
- Reference the existing trend-band opacity pattern (30% opacity, 13–14px height) as the precedent for using opacity rather than borders to create secondary information layers in this codebase — this label treatment should feel like the same design language, not a new one.

---

## Addendum (v2): Column-color lookup

**Status:** Fixed-chip (above) is implemented and live. This addendum specs an optional enhancement that restores the blend-in aesthetic by looking up the actual column color instead of using a fixed surface — without reintroducing the failure modes that ruled it out the first time (arbitrary user colors, drag-across-boundary straddling).

### Why this is now tractable

The original background-matching attempt failed because it assumed color-matching meant *sampling* an unknown rendered pixel. It doesn't have to — column background color is already known application state (each column resolves its color from user preferences to paint itself). The label can read the same value the column reads, as a lookup, not a sampling operation. The part that still needs new logic is (a) which column's color to use when the label has a single `centerX`, especially near or across a boundary, and (b) text contrast, which can no longer be a single fixed token since the background is now variable per render.

### API / Tokens

| Name | Type | Behavior |
|------|------|----------|
| `resolveColumnColor(centerX, columnRanges)` | function | Returns the background color of whichever column's `[xStart, xEnd)` range contains `centerX`. `columnRanges` is the same boundary data the timeline already uses to paint columns — do not duplicate it. |
| `color-surface-chip` (v1 token) | fallback | Used if `resolveColumnColor` returns `null`/`undefined` (e.g. column data not yet loaded, or `centerX` falls outside all known ranges). Never let the label render with no fill. |
| `resolveChipTextColor(resolvedBgColor)` | function | Returns either a fixed light or fixed dark text token based on a computed contrast check against `resolvedBgColor` (see Contrast Algorithm below). Replaces the v1 fixed `color-text-on-chip` token, which assumed a fixed background. |

### Column resolution at boundaries (the part that broke before)

Don't interpolate or split-fill — both reintroduce visible-division problems. Instead, **snap to whichever column contains the label's center point**, with hysteresis to prevent flicker when the center sits near a boundary:

1. Maintain the currently-resolved column as state (not recomputed from scratch every frame).
2. Only switch to a different column when `centerX` has moved at least `DEADZONE_PX` (suggested: 12px) past the boundary — not the instant it crosses. This means a label sitting exactly on a boundary doesn't flicker between two colors on sub-pixel jitter.
3. While actively dragging, suppress the CSS color transition (`transition: none`) so the fill doesn't visibly smear/lag behind the pointer. Re-enable a short transition (~120–150ms ease) for the settle-on-drop case and for any non-drag repositioning (e.g. layout recalculation), so the color change reads as a soft cross-fade rather than a hard cut.
4. Tie-break rule if `centerX` lands exactly on a boundary: assign to the column whose range is `[xStart, xEnd)` — i.e. the boundary x belongs to the column to its right. Pick one rule and apply it consistently; which side doesn't matter as much as not leaving it undefined.

### Contrast algorithm

Compute at render time against whatever `resolveColumnColor` returns — do not reuse the v1 fixed contrast check, which was only valid against a fixed background.

```
relativeLuminance(rgb):
  for each channel c in [r, g, b]:
    c = c / 255
    c = (c <= 0.03928) ? c / 12.92 : ((c + 0.055) / 1.055) ^ 2.4
  return 0.2126*r + 0.7152*g + 0.0722*b

contrastRatio(L1, L2):
  lighter, darker = max(L1, L2), min(L1, L2)
  return (lighter + 0.05) / (darker + 0.05)

resolveChipTextColor(bgColor):
  bgLum = relativeLuminance(bgColor)
  darkTextLum = relativeLuminance(DARK_TEXT_TOKEN)   // e.g. existing --text-primary
  lightTextLum = relativeLuminance(LIGHT_TEXT_TOKEN) // e.g. near-white
  contrastWithDark = contrastRatio(bgLum, darkTextLum)
  contrastWithLight = contrastRatio(bgLum, lightTextLum)
  return contrastWithDark >= contrastWithLight ? DARK_TEXT_TOKEN : LIGHT_TEXT_TOKEN
```

Target minimum: 4.5:1 (WCAG AA, normal text). If neither candidate clears 4.5:1 against a given column color (possible with a midtone the user picked), fall back to rendering the v1 fixed chip for that label rather than shipping an illegible one — log or flag this case for review rather than silently failing.

### Border

With the background now matching its column, the border's job changes from "the only thing that makes this legible" (v1) back toward "a quiet boundary cue." Keep a faint `color-chip-border` (low opacity, same value across all columns) rather than removing it entirely — pure background-matching with zero border was the original failure mode that motivated the bordered/no-border debate at the start of this spec, and a hairline costs nothing visually while protecting against the case where the resolved column color and the connector line color are too close in hue to read as separate without it.

### Edge Cases (additive to v1 list)

- **Column color changes after the page has rendered** (user edits preferences live): label colors must re-resolve, not cache the value from initial render.
- **Column data not yet loaded / `resolveColumnColor` returns null**: render the v1 fixed chip, don't block render or throw.
- **Rapid drag across multiple narrow columns**: hysteresis (above) should prevent strobing, but verify visually with 3+ narrow adjacent columns of contrasting colors before calling this done — this is the scenario most likely to expose a hysteresis bug.

### Rollout recommendation

Ship as a flag-gated enhancement on top of the working fixed-chip baseline, not a replacement commit — if the contrast fallback or hysteresis has an edge case in production, the fixed chip is the safe degrade path, not a blank or broken label.
