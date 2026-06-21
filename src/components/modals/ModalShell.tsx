import React from 'react'
import { X } from 'lucide-react'

interface Props {
  title: string
  onClose: () => void
  children: React.ReactNode
}

export function ModalShell({ title, onClose, children }: Props) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FDFAF4', borderRadius: 8, padding: 24, width: 420, maxWidth: '90vw',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#4A4A4A' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

export const inputStyle: React.CSSProperties = {
  width: '100%', padding: '6px 8px', fontSize: 13,
  border: '1px solid #C8B99A', borderRadius: 4, background: '#FFF',
  boxSizing: 'border-box',
}

export function SaveButton({ label = 'Save', disabled = false }: { label?: string; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      style={{
        marginTop: 16, padding: '8px 20px', background: '#4E342E', color: '#fff',
        border: 'none', borderRadius: 4, cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 13,
        opacity: disabled ? 0.5 : 1,
      }}
    >{label}</button>
  )
}
