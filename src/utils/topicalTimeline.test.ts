import { describe, it, expect } from 'vitest';
import { getAnchorsForEra, formatEraRange } from './topicalTimeline';

describe('getAnchorsForEra', () => {
  const era = { startYear: 1990, endYear: 2005 };

  it('returns empty array when no anchors', () => {
    expect(getAnchorsForEra([], era)).toEqual([]);
  });

  it('excludes state-type events', () => {
    const events = [{ year: 1995, type: 'state' as const }];
    expect(getAnchorsForEra(events, era)).toEqual([]);
  });

  it('excludes events with undefined type (legacy files default to state)', () => {
    const events = [{ year: 1995, type: undefined }];
    expect(getAnchorsForEra(events, era)).toEqual([]);
  });

  it('excludes anchors outside the era', () => {
    const events = [
      { year: 1989, type: 'anchor' as const },
      { year: 2006, type: 'anchor' as const },
    ];
    expect(getAnchorsForEra(events, era)).toEqual([]);
  });

  it('includes anchors at era boundary years', () => {
    const a1 = { year: 1990, type: 'anchor' as const };
    const a2 = { year: 2005, type: 'anchor' as const };
    expect(getAnchorsForEra([a1, a2], era)).toHaveLength(2);
  });

  it('includes all anchor-type events in era', () => {
    const a1 = { year: 1995, type: 'anchor' as const };
    const a2 = { year: 1997, type: 'anchor' as const };
    const s  = { year: 1996, type: 'state' as const };
    const result = getAnchorsForEra([a1, a2, s], era);
    expect(result).toHaveLength(2);
  });

  it('sorts by year ascending', () => {
    const a1 = { year: 2000, type: 'anchor' as const };
    const a2 = { year: 1993, type: 'anchor' as const };
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
