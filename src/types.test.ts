import { describe, it, expect } from 'vitest'
import type { AnchorEvent } from './types'

describe('types', () => {
  it('AnchorEvent importance values are well-typed', () => {
    const a: AnchorEvent = {
      id: 'test',
      label: 'Test',
      year: 2000,
      processId: 'p1',
      domainId: 'd1',
      importance: 'major',
    }
    expect(a.importance).toBe('major')
  })
})
