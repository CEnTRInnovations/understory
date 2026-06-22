import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUnderstoryDocument } from './useUnderstoryDocument'

beforeEach(() => localStorage.clear())

describe('useUnderstoryDocument', () => {
  it('initializes with seed document', () => {
    const { result } = renderHook(() => useUnderstoryDocument())
    expect(result.current.doc.processDomains).toHaveLength(6)
    expect(result.current.doc.settings.activeView).toBe('process')
  })

  it('addEra appends an era', () => {
    const { result } = renderHook(() => useUnderstoryDocument())
    act(() => result.current.addEra({ id: 'new', label: 'New', startYear: 2027, endYear: 2030 }))
    expect(result.current.doc.eras).toHaveLength(5)
    expect(result.current.doc.eras.at(-1)!.id).toBe('new')
  })

  it('removeAnchor removes by id', () => {
    const { result } = renderHook(() => useUnderstoryDocument())
    const before = result.current.doc.anchors.length
    act(() => result.current.removeAnchor('lugar-1968'))
    expect(result.current.doc.anchors).toHaveLength(before - 1)
  })

  it('auto-saves to localStorage', () => {
    const { result } = renderHook(() => useUnderstoryDocument())
    act(() => result.current.setActiveView('timeline'))
    const saved = JSON.parse(localStorage.getItem('understory-document') ?? '{}')
    expect(saved.settings.activeView).toBe('timeline')
  })

  it('importDoc replaces the document', () => {
    const { result } = renderHook(() => useUnderstoryDocument())
    act(() => result.current.importDoc(JSON.stringify({
      ...result.current.doc,
      title: 'Imported Title'
    })))
    expect(result.current.doc.title).toBe('Imported Title')
  })
})
