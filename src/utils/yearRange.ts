/** Clamps both values to [min, max], then swaps if start > end. */
export function clampYearRange(
  start: number, end: number, min: number, max: number
): [number, number] {
  const s = Math.max(min, Math.min(max, start));
  const e = Math.max(min, Math.min(max, end));
  return s <= e ? [s, e] : [e, s];
}
