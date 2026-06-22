export function yearToXPct(year: number, startYear: number, endYear: number): number {
  const span = endYear - startYear
  if (span === 0) return 0
  return Math.max(0, Math.min(100, ((year - startYear) / span) * 100))
}

export function yearToXPx(year: number, startYear: number, endYear: number, width: number): number {
  return (yearToXPct(year, startYear, endYear) / 100) * width
}
