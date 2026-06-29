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
