import React, { useState } from 'react'
import type { ProcessDomain } from '../../types'
import { ModalShell, FormField, inputStyle, SaveButton } from './ModalShell'

interface Props {
  initial?: ProcessDomain
  nextOrder: number
  onSave: (domain: ProcessDomain) => void
  onClose: () => void
}

export function DomainModal({ initial, nextOrder, onSave, onClose }: Props) {
  const [label, setLabel] = useState(initial?.label ?? '')
  const [shortLabel, setShortLabel] = useState(initial?.shortLabel ?? '')
  const [color, setColor] = useState(initial?.color ?? '#4E342E')
  const [description, setDescription] = useState(initial?.description ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      id: initial?.id ?? `domain-${Date.now()}`,
      label, color,
      shortLabel: shortLabel || undefined,
      description: description || undefined,
      order: initial?.order ?? nextOrder,
    })
    onClose()
  }

  return (
    <ModalShell title={initial ? 'Edit Domain' : 'Add Domain'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label="Label"><input style={inputStyle} value={label} onChange={e => setLabel(e.target.value)} required /></FormField>
        <FormField label="Short Label (optional)"><input style={inputStyle} value={shortLabel} onChange={e => setShortLabel(e.target.value)} /></FormField>
        <FormField label="Color"><input style={{ ...inputStyle, width: 60, padding: 2 }} type="color" value={color} onChange={e => setColor(e.target.value)} /></FormField>
        <FormField label="Description (optional)"><textarea style={{ ...inputStyle, height: 60 }} value={description} onChange={e => setDescription(e.target.value)} /></FormField>
        <SaveButton />
      </form>
    </ModalShell>
  )
}
