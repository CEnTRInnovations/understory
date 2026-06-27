import { describe, it, expect } from 'vitest';
import { syncAnchorPositions } from './anchorPositioning';

const conn = [{ from: 0, to: 1, autoLink: true as const }];

describe('syncAnchorPositions', () => {
  it('leaves states unchanged', () => {
    const events = [
      { type: 'state' as const, x: 20, xOffsetPct: undefined },
      { type: 'anchor' as const, x: 99, xOffsetPct: 5 },
    ];
    const result = syncAnchorPositions(events, conn, new Map([[0, 30]]));
    expect(result[0].x).toBe(20);
  });

  it('updates anchor x = stateXValues[parent] + xOffsetPct', () => {
    const events = [
      { type: 'state' as const, x: 20, xOffsetPct: undefined },
      { type: 'anchor' as const, x: 99, xOffsetPct: 5 },
    ];
    const result = syncAnchorPositions(events, conn, new Map([[0, 30]]));
    expect(result[1].x).toBe(35); // 30 + 5
  });

  it('falls back to events[parent].x when parent not in stateXValues', () => {
    const events = [
      { type: 'state' as const, x: 20, xOffsetPct: undefined },
      { type: 'anchor' as const, x: 99, xOffsetPct: 7 },
    ];
    const result = syncAnchorPositions(events, conn, new Map());
    expect(result[1].x).toBe(27); // 20 + 7
  });

  it('leaves anchor unchanged when xOffsetPct is undefined', () => {
    const events = [
      { type: 'state' as const, x: 20, xOffsetPct: undefined },
      { type: 'anchor' as const, x: 99, xOffsetPct: undefined },
    ];
    const result = syncAnchorPositions(events, conn, new Map([[0, 30]]));
    expect(result[1].x).toBe(99);
  });

  it('leaves orphan anchor (no autoLink connection) unchanged', () => {
    const events = [
      { type: 'state' as const, x: 20, xOffsetPct: undefined },
      { type: 'anchor' as const, x: 99, xOffsetPct: 5 },
    ];
    const result = syncAnchorPositions(events, [], new Map([[0, 30]]));
    expect(result[1].x).toBe(99);
  });

  it('handles negative xOffsetPct (anchor left of parent)', () => {
    const events = [
      { type: 'state' as const, x: 50, xOffsetPct: undefined },
      { type: 'anchor' as const, x: 99, xOffsetPct: -10 },
    ];
    const result = syncAnchorPositions(events, conn, new Map([[0, 60]]));
    expect(result[1].x).toBe(50); // 60 + (-10)
  });

  it('preserves all other event fields', () => {
    const events = [
      { type: 'state' as const, x: 20, xOffsetPct: undefined, label: 'S', year: 2000 },
      { type: 'anchor' as const, x: 99, xOffsetPct: 5, label: 'A', year: 2001 },
    ];
    const result = syncAnchorPositions(events, conn, new Map([[0, 30]]));
    expect(result[1]).toMatchObject({ label: 'A', year: 2001, xOffsetPct: 5 });
  });
});
