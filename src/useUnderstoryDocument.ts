import { useState, useEffect, useCallback } from 'react'
import type {
  UnderstoryDocument, Era, ProcessDomain, HistoricalProcess,
  AnchorEvent, ProcessInteraction, DisplaySettings,
} from './types'
import { SEED_DOCUMENT } from './seedData'

const STORAGE_KEY = 'understory-document'

function loadFromStorage(): UnderstoryDocument {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as UnderstoryDocument
  } catch { /* ignore */ }
  return SEED_DOCUMENT
}

export function useUnderstoryDocument() {
  const [doc, setDocState] = useState<UnderstoryDocument>(loadFromStorage)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc))
  }, [doc])

  const setDoc = useCallback((updater: (prev: UnderstoryDocument) => UnderstoryDocument) => {
    setDocState(updater)
  }, [])

  const addEra = useCallback((era: Era) =>
    setDoc(d => ({ ...d, eras: [...d.eras, era] })), [setDoc])
  const removeEra = useCallback((id: string) =>
    setDoc(d => ({ ...d, eras: d.eras.filter(e => e.id !== id) })), [setDoc])
  const updateEra = useCallback((era: Era) =>
    setDoc(d => ({ ...d, eras: d.eras.map(e => e.id === era.id ? era : e) })), [setDoc])

  const addDomain = useCallback((domain: ProcessDomain) =>
    setDoc(d => ({ ...d, processDomains: [...d.processDomains, domain] })), [setDoc])
  const removeDomain = useCallback((id: string) =>
    setDoc(d => ({ ...d, processDomains: d.processDomains.filter(x => x.id !== id) })), [setDoc])
  const updateDomain = useCallback((domain: ProcessDomain) =>
    setDoc(d => ({ ...d, processDomains: d.processDomains.map(x => x.id === domain.id ? domain : x) })), [setDoc])

  const addProcess = useCallback((process: HistoricalProcess) =>
    setDoc(d => ({ ...d, processes: [...d.processes, process] })), [setDoc])
  const removeProcess = useCallback((id: string) =>
    setDoc(d => ({ ...d, processes: d.processes.filter(x => x.id !== id) })), [setDoc])
  const updateProcess = useCallback((process: HistoricalProcess) =>
    setDoc(d => ({ ...d, processes: d.processes.map(x => x.id === process.id ? process : x) })), [setDoc])

  const addAnchor = useCallback((anchor: AnchorEvent) =>
    setDoc(d => ({ ...d, anchors: [...d.anchors, anchor] })), [setDoc])
  const removeAnchor = useCallback((id: string) =>
    setDoc(d => ({ ...d, anchors: d.anchors.filter(x => x.id !== id) })), [setDoc])
  const updateAnchor = useCallback((anchor: AnchorEvent) =>
    setDoc(d => ({ ...d, anchors: d.anchors.map(x => x.id === anchor.id ? anchor : x) })), [setDoc])

  const addInteraction = useCallback((interaction: ProcessInteraction) =>
    setDoc(d => ({ ...d, interactions: [...d.interactions, interaction] })), [setDoc])
  const removeInteraction = useCallback((id: string) =>
    setDoc(d => ({ ...d, interactions: d.interactions.filter(x => x.id !== id) })), [setDoc])
  const updateInteraction = useCallback((interaction: ProcessInteraction) =>
    setDoc(d => ({ ...d, interactions: d.interactions.map(x => x.id === interaction.id ? interaction : x) })), [setDoc])

  const setActiveView = useCallback((view: DisplaySettings['activeView']) =>
    setDoc(d => ({ ...d, settings: { ...d.settings, activeView: view } })), [setDoc])

  const setSettings = useCallback((patch: Partial<DisplaySettings>) =>
    setDoc(d => ({ ...d, settings: { ...d.settings, ...patch } })), [setDoc])

  const importDoc = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json) as UnderstoryDocument
      setDocState(parsed)
    } catch {
      alert('Invalid JSON — could not import document.')
    }
  }, [])

  const exportDocJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${doc.title.replace(/\s+/g, '-').toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [doc])

  return {
    doc, setDoc,
    addEra, removeEra, updateEra,
    addDomain, removeDomain, updateDomain,
    addProcess, removeProcess, updateProcess,
    addAnchor, removeAnchor, updateAnchor,
    addInteraction, removeInteraction, updateInteraction,
    setActiveView, setSettings,
    importDoc, exportDocJson,
  }
}
