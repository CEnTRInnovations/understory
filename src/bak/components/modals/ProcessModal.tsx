import React, { useState } from 'react'
import type { HistoricalProcess, UnderstoryDocument } from '../../types'
import { ModalShell, FormField, inputStyle, SaveButton } from './ModalShell'

interface Props {
  initial?: HistoricalProcess
  doc: UnderstoryDocument
  onSave: (process: HistoricalProcess) => void
  onClose: () => void
}

export function ProcessModal({ initial, doc, onSave, onClose }: Props) {
  const [label, setLabel] = useState(initial?.label ?? '')
  const [domainId, setDomainId] = useState(initial?.domainId ?? doc.processDomains[0]?.id ?? '')
  const [startYear, setStartYear] = useState(String(initial?.startYear ?? doc.startYear))
  const [endYear, setEndYear] = useState(String(initial?.endYear ?? doc.endYear))
  const [continues, setContinues] = useState(initial?.continues ?? false)
  const [importance, setImportance] = useState<HistoricalProcess['importance']>(initial?.importance ?? 'primary')
  const [description, setDescription] = useState(initial?.description ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      id: initial?.id ?? `process-${Date.now()}`,
      label, domainId, continues,
      importance: importance || undefined,
      description: description || undefined,
      startYear: parseInt(startYear, 10),
      ...(endYear.trim() !== '' ? { endYear: parseInt(endYear, 10) } : {}),
    })
    onClose()
  }

  return (
    <ModalShell title={initial ? 'Edit Process' : 'Add Process'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label="Label"><input style={inputStyle} value={label} onChange={e => setLabel(e.target.value)} required /></FormField>
        <FormField label="Domain">
          <select style={inputStyle} value={domainId} onChange={e => setDomainId(e.target.value)}>
            {doc.processDomains.sort((a, b) => a.order - b.order).map(d => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Start Year"><input style={inputStyle} type="number" value={startYear} onChange={e => setStartYear(e.target.value)} required /></FormField>
        <FormField label="End Year"><input style={inputStyle} type="number" value={endYear} onChange={e => setEndYear(e.target.value)} /></FormField>
        <FormField label="Importance">
          <select style={inputStyle} value={importance} onChange={e => setImportance(e.target.value as HistoricalProcess['importance'])}>
            <option value="primary">Primary</option>
            <option value="secondary">Secondary</option>
            <option value="context">Context</option>
          </select>
        </FormField>
        <FormField label="Description (optional)"><textarea style={{ ...inputStyle, height: 60 }} value={description} onChange={e => setDescription(e.target.value)} /></FormField>
        <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={continues} onChange={e => setContinues(e.target.checked)} />
          Process continues to present (show arrow)
        </label>
        <SaveButton />
      </form>
    </ModalShell>
  )
}
