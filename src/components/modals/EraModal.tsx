import React, { useState } from 'react'
import type { Era } from '../../types'
import { ModalShell, FormField, inputStyle, SaveButton } from './ModalShell'

interface Props {
  initial?: Era
  onSave: (era: Era) => void
  onClose: () => void
}

export function EraModal({ initial, onSave, onClose }: Props) {
  const [label, setLabel] = useState(initial?.label ?? '')
  const [startYear, setStartYear] = useState(String(initial?.startYear ?? 1968))
  const [endYear, setEndYear] = useState(String(initial?.endYear ?? 2026))
  const [color, setColor] = useState(initial?.color ?? '#D2BDA3')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      id: initial?.id ?? `era-${Date.now()}`,
      label, color,
      startYear: parseInt(startYear, 10),
      endYear: parseInt(endYear, 10),
    })
    onClose()
  }

  return (
    <ModalShell title={initial ? 'Edit Era' : 'Add Era'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label="Label"><input style={inputStyle} value={label} onChange={e => setLabel(e.target.value)} required /></FormField>
        <FormField label="Start Year"><input style={inputStyle} type="number" value={startYear} onChange={e => setStartYear(e.target.value)} required /></FormField>
        <FormField label="End Year"><input style={inputStyle} type="number" value={endYear} onChange={e => setEndYear(e.target.value)} required /></FormField>
        <FormField label="Color"><input style={{ ...inputStyle, width: 60, padding: 2 }} type="color" value={color} onChange={e => setColor(e.target.value)} /></FormField>
        <SaveButton />
      </form>
    </ModalShell>
  )
}
