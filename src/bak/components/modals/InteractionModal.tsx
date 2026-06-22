import React, { useState } from 'react'
import type { ProcessInteraction, UnderstoryDocument } from '../../types'
import { ModalShell, FormField, inputStyle, SaveButton } from './ModalShell'

const VERB_SUGGESTIONS = [
  'creates conditions for', 'enables', 'formalizes', 'legitimizes',
  'documents', 'extends', 'reframes', 'responds to', 'makes visible',
  'institutionalizes', 'amplifies', 'sustains',
]

interface Props {
  initial?: ProcessInteraction
  doc: UnderstoryDocument
  onSave: (interaction: ProcessInteraction) => void
  onClose: () => void
}

export function InteractionModal({ initial, doc, onSave, onClose }: Props) {
  const allRefs = [
    ...doc.processes.map(p => ({ id: p.id, label: `Process: ${p.label}`, type: 'process' as const })),
    ...doc.anchors.map(a => ({ id: a.id, label: `Anchor: ${a.year} ${a.label}`, type: 'anchor' as const })),
  ]
  const [fromId, setFromId] = useState(initial?.fromId ?? allRefs[0]?.id ?? '')
  const [toId, setToId] = useState(initial?.toId ?? allRefs[1]?.id ?? '')
  const [verb, setVerb] = useState(initial?.verb ?? '')
  const [strength, setStrength] = useState<ProcessInteraction['strength']>(initial?.strength ?? 'moderate')
  const [confidence, setConfidence] = useState<ProcessInteraction['confidence']>(initial?.confidence ?? 'interpretive')
  const [description, setDescription] = useState(initial?.description ?? '')

  function typeOf(id: string): 'process' | 'anchor' {
    return doc.processes.find(p => p.id === id) ? 'process' : 'anchor'
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!verb.trim()) { alert('A relationship verb is required.'); return }
    onSave({
      id: initial?.id ?? `interaction-${Date.now()}`,
      fromId, toId,
      fromType: typeOf(fromId),
      toType: typeOf(toId),
      verb: verb.trim(),
      strength: strength || undefined,
      confidence: confidence || undefined,
      description: description || undefined,
    })
    onClose()
  }

  return (
    <ModalShell title={initial ? 'Edit Interaction' : 'Add Interaction'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label="From">
          <select style={inputStyle} value={fromId} onChange={e => setFromId(e.target.value)}>
            {allRefs.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </FormField>
        <FormField label="Relationship Verb (required)">
          <input
            style={inputStyle} value={verb} onChange={e => setVerb(e.target.value)}
            list="verb-suggestions" placeholder="e.g. enables, formalizes, responds to"
            required
          />
          <datalist id="verb-suggestions">
            {VERB_SUGGESTIONS.map(v => <option key={v} value={v} />)}
          </datalist>
        </FormField>
        <FormField label="To">
          <select style={inputStyle} value={toId} onChange={e => setToId(e.target.value)}>
            {allRefs.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </FormField>
        <FormField label="Strength">
          <select style={inputStyle} value={strength} onChange={e => setStrength(e.target.value as ProcessInteraction['strength'])}>
            <option value="strong">Strong</option>
            <option value="moderate">Moderate</option>
            <option value="contextual">Contextual</option>
          </select>
        </FormField>
        <FormField label="Confidence">
          <select style={inputStyle} value={confidence} onChange={e => setConfidence(e.target.value as ProcessInteraction['confidence'])}>
            <option value="confirmed">Confirmed</option>
            <option value="probable">Probable</option>
            <option value="interpretive">Interpretive</option>
          </select>
        </FormField>
        <FormField label="Description (optional)"><textarea style={{ ...inputStyle, height: 60 }} value={description} onChange={e => setDescription(e.target.value)} /></FormField>
        <SaveButton />
      </form>
    </ModalShell>
  )
}
