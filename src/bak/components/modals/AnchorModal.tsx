import React, { useState } from 'react'
import type { AnchorEvent, UnderstoryDocument } from '../../types'
import { ModalShell, FormField, inputStyle, SaveButton } from './ModalShell'

interface Props {
  initial?: AnchorEvent
  doc: UnderstoryDocument
  onSave: (anchor: AnchorEvent) => void
  onClose: () => void
}

export function AnchorModal({ initial, doc, onSave, onClose }: Props) {
  const [label, setLabel] = useState(initial?.label ?? '')
  const [year, setYear] = useState(String(initial?.year ?? doc.startYear))
  const [domainId, setDomainId] = useState(initial?.domainId ?? doc.processDomains[0]?.id ?? '')
  const [importance, setImportance] = useState<AnchorEvent['importance']>(initial?.importance ?? 'major')
  const [confidence, setConfidence] = useState<AnchorEvent['confidence']>(initial?.confidence ?? 'confirmed')
  const [visibleLabel, setVisibleLabel] = useState(initial?.visibleLabel ?? true)
  const [description, setDescription] = useState(initial?.description ?? '')

  const domainProcesses = doc.processes.filter(p => p.domainId === domainId)
  const [processId, setProcessId] = useState(initial?.processId ?? domainProcesses[0]?.id ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      id: initial?.id ?? `anchor-${Date.now()}`,
      label, domainId, processId, visibleLabel,
      year: parseInt(year, 10),
      importance,
      confidence: confidence || undefined,
      description: description || undefined,
    })
    onClose()
  }

  return (
    <ModalShell title={initial ? 'Edit Anchor' : 'Add Anchor'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label="Label"><input style={inputStyle} value={label} onChange={e => setLabel(e.target.value)} required /></FormField>
        <FormField label="Year"><input style={inputStyle} type="number" value={year} onChange={e => setYear(e.target.value)} required /></FormField>
        <FormField label="Domain">
          <select style={inputStyle} value={domainId} onChange={e => {
              const newDomainId = e.target.value
              setDomainId(newDomainId)
              const firstProcess = doc.processes.find(p => p.domainId === newDomainId)
              setProcessId(firstProcess?.id ?? '')
            }}>
            {doc.processDomains.sort((a, b) => a.order - b.order).map(d => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Process">
          <select style={inputStyle} value={processId} onChange={e => setProcessId(e.target.value)}>
            {doc.processes.filter(p => p.domainId === domainId).map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Importance">
          <select style={inputStyle} value={importance} onChange={e => setImportance(e.target.value as AnchorEvent['importance'])}>
            <option value="major">Major</option>
            <option value="supporting">Supporting</option>
            <option value="context">Context</option>
          </select>
        </FormField>
        <FormField label="Confidence">
          <select style={inputStyle} value={confidence} onChange={e => setConfidence(e.target.value as AnchorEvent['confidence'])}>
            <option value="confirmed">Confirmed</option>
            <option value="probable">Probable</option>
            <option value="needs-verification">Needs Verification</option>
          </select>
        </FormField>
        <FormField label="Description (optional)"><textarea style={{ ...inputStyle, height: 60 }} value={description} onChange={e => setDescription(e.target.value)} /></FormField>
        <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}>
          <input type="checkbox" checked={visibleLabel} onChange={e => setVisibleLabel(e.target.checked)} />
          Show label on map
        </label>
        <SaveButton />
      </form>
    </ModalShell>
  )
}
