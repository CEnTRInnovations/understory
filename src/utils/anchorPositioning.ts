type EventSlice = { type?: string; x: number; xOffsetPct?: number };
type ConnSlice  = { from: number; to: number; autoLink?: boolean };

/**
 * Two-pass anchor sync: for each anchor, set x = parentState.x + xOffsetPct.
 * stateXValues contains the freshly-computed x for each state index (Pass 1 output).
 * Falls back to events[parent].x if the parent isn't in stateXValues.
 * Anchors with no autoLink connection or no xOffsetPct are returned unchanged.
 */
export function syncAnchorPositions<T extends EventSlice>(
  events: T[],
  connections: ConnSlice[],
  stateXValues: Map<number, number>,
): T[] {
  return events.map((e, i) => {
    if ((e.type ?? 'state') !== 'anchor') return e;
    const parentConn = connections.find(c => c.autoLink && c.to === i);
    if (!parentConn || e.xOffsetPct === undefined) return e;
    const parentX = stateXValues.get(parentConn.from) ?? events[parentConn.from]?.x ?? 0;
    return { ...e, x: parentX + e.xOffsetPct };
  });
}
