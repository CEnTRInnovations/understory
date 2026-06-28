import { describe, it, expect } from 'vitest';
import { getEventsForEra, formatEraRange } from './topicalTimeline';

describe('getEventsForEra', () => {
  const era = { label: 'Test Era', startYear: 1990, endYear: 2005 };

  it('returns empty array when no events', () => {
    expect(getEventsForEra([], era)).toEqual([]);
  });

  it('excludes events outside the era', () => {
    const events = [
      { label: 'Early', year: 1989 },
      { label: 'Late',  year: 2006 },
    ];
    expect(getEventsForEra(events, era)).toEqual([]);
  });

  it('includes events at era boundary years', () => {
    const e1 = { label: 'Start', year: 1990 };
    const e2 = { label: 'End',   year: 2005 };
    expect(getEventsForEra([e1, e2], era)).toHaveLength(2);
  });

  it('includes all events within era', () => {
    const events = [
      { label: 'A', year: 1995 },
      { label: 'B', year: 1997 },
      { label: 'C', year: 2001 },
    ];
    expect(getEventsForEra(events, era)).toHaveLength(3);
  });

  it('sorts by year ascending', () => {
    const events = [
      { label: 'Later',   year: 2000 },
      { label: 'Earlier', year: 1993 },
    ];
    const result = getEventsForEra(events, era);
    expect(result[0].year).toBe(1993);
    expect(result[1].year).toBe(2000);
  });

  it('includes icon field when present', () => {
    const e = { label: 'With icon', year: 1995, icon: 'Star' };
    const result = getEventsForEra([e], era);
    expect(result[0].icon).toBe('Star');
  });

  it('uses eraLabel for filtering when present, ignoring year range', () => {
    const era1 = { label: 'Era One', startYear: 2000, endYear: 2010 };
    const era2 = { label: 'Era Two', startYear: 2000, endYear: 2010 };
    const events = [
      { label: 'A', year: 2005, eraLabel: 'Era One' },
      { label: 'B', year: 2005, eraLabel: 'Era Two' },
    ];
    expect(getEventsForEra(events, era1)).toEqual([events[0]]);
    expect(getEventsForEra(events, era2)).toEqual([events[1]]);
  });
});

describe('formatEraRange', () => {
  it('returns start–end for a past era', () => {
    expect(formatEraRange({ label: 'X', startYear: 1968, endYear: 1992 }, 2026)).toBe('1968–1992');
  });

  it('uses en-dash not hyphen', () => {
    const result = formatEraRange({ label: 'X', startYear: 1968, endYear: 1992 }, 2026);
    expect(result).toContain('–');
    expect(result).not.toContain('-');
  });

  it('appends Present when endYear >= currentYear', () => {
    expect(formatEraRange({ label: 'X', startYear: 2022, endYear: 2026 }, 2026)).toBe('2022–Present');
  });

  it('shows number when endYear < currentYear', () => {
    expect(formatEraRange({ label: 'X', startYear: 2022, endYear: 2025 }, 2026)).toBe('2022–2025');
  });
});
