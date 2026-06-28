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
