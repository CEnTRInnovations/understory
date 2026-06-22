import { describe, it, expect } from 'vitest'
import { yearToXPct, yearToXPx } from './yearToX'

describe('yearToXPct', () => {
  it('maps startYear to 0', () => expect(yearToXPct(1968, 1968, 2026)).toBe(0))
  it('maps endYear to 100', () => expect(yearToXPct(2026, 1968, 2026)).toBe(100))
  it('maps midpoint correctly', () => expect(yearToXPct(1997, 1968, 2026)).toBeCloseTo(50))
  it('clamps below startYear to 0', () => expect(yearToXPct(1900, 1968, 2026)).toBe(0))
  it('clamps above endYear to 100', () => expect(yearToXPct(2100, 1968, 2026)).toBe(100))
})

describe('yearToXPx', () => {
  it('maps startYear to 0', () => expect(yearToXPx(1968, 1968, 2026, 1000)).toBe(0))
  it('maps endYear to 1000', () => expect(yearToXPx(2026, 1968, 2026, 1000)).toBe(1000))
})
