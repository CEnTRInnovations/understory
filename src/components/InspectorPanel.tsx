import React from 'react'
import { X } from 'lucide-react'
import type { UnderstoryDocument, SelectedItem, AnchorEvent } from '../types'

interface Props {
  doc: UnderstoryDocument
  selected: SelectedItem | null
  onClose: () => void
  onUpdateAnchor: (anchor: AnchorEvent) => void
}

export function InspectorPanel({ doc, selected, onClose, onUpdateAnchor }: Props) {
  if (!selected) return null

  let content: React.ReactNode = null

  if (selected.kind === 'anchor') {
    const anchor = doc.anchors.find(a => a.id === selected.id)
    if (!anchor) return null
    const domain = doc.processDomains.find(d => d.id === anchor.domainId)
    content = (
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{anchor.label}</div>
        <div style={{ fontSize: 12, color: '#6B625A', marginBottom: 8 }}>{anchor.year} · {domain?.label ?? anchor.domainId}</div>
        <table style={{ fontSize: 12, borderCollapse: 'collapse', width: '100%' }}>
          <tbody>
            <tr><td style={td}>Importance</td><td style={td}>{anchor.importance}</td></tr>
            <tr><td style={td}>Confidence</td><td style={td}>{anchor.confidence ?? '—'}</td></tr>
            {anchor.description && <tr><td style={td}>Notes</td><td style={td}>{anchor.description}</td></tr>}
          </tbody>
        </table>
        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={anchor.visibleLabel ?? false}
              onChange={e => onUpdateAnchor({ ...anchor, visibleLabel: e.target.checked })}
            />
            Show label on map
          </label>
        </div>
      </div>
    )
  } else if (selected.kind === 'process') {
    const proc = doc.processes.find(p => p.id === selected.id)
    if (!proc) return null
    const domain = doc.processDomains.find(d => d.id === proc.domainId)
    content = (
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{proc.label}</div>
        <div style={{ fontSize: 12, color: '#6B625A', marginBottom: 8 }}>
          {proc.startYear}–{proc.endYear ?? 'present'} · {domain?.label ?? proc.domainId}
        </div>
        <table style={{ fontSize: 12, borderCollapse: 'collapse', width: '100%' }}>
          <tbody>
            <tr><td style={td}>Importance</td><td style={td}>{proc.importance ?? '—'}</td></tr>
            <tr><td style={td}>Continues</td><td style={td}>{proc.continues ? 'Yes' : 'No'}</td></tr>
            {proc.description && <tr><td style={td}>Notes</td><td style={td}>{proc.description}</td></tr>}
          </tbody>
        </table>
      </div>
    )
  } else if (selected.kind === 'interaction') {
    const ix = doc.interactions.find(i => i.id === selected.id)
    if (!ix) return null
    content = (
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>"{ix.verb}"</div>
        <div style={{ fontSize: 12, color: '#6B625A', marginBottom: 8 }}>
          {ix.fromId} → {ix.toId}
        </div>
        <table style={{ fontSize: 12, borderCollapse: 'collapse', width: '100%' }}>
          <tbody>
            <tr><td style={td}>Strength</td><td style={td}>{ix.strength ?? '—'}</td></tr>
            <tr><td style={td}>Confidence</td><td style={td}>{ix.confidence ?? '—'}</td></tr>
            {ix.description && <tr><td style={td}>Notes</td><td style={td}>{ix.description}</td></tr>}
          </tbody>
        </table>
      </div>
    )
  } else if (selected.kind === 'domain') {
    const domain = doc.processDomains.find(d => d.id === selected.id)
    if (!domain) return null
    const domainProcesses = doc.processes.filter(p => p.domainId === domain.id)
    const domainAnchors = doc.anchors.filter(a => a.domainId === domain.id)
    content = (
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: domain.color }}>{domain.label}</div>
        <div style={{ fontSize: 12, color: '#6B625A', marginBottom: 8 }}>
          {domainProcesses.length} process{domainProcesses.length !== 1 ? 'es' : ''} · {domainAnchors.length} anchor{domainAnchors.length !== 1 ? 's' : ''}
        </div>
        {domain.description && <p style={{ fontSize: 12 }}>{domain.description}</p>}
        <div style={{ marginTop: 8 }}>
          {domainAnchors.sort((a, b) => a.year - b.year).map(a => (
            <div key={a.id} style={{ fontSize: 11, padding: '2px 0', borderBottom: '1px solid #E5DDD0' }}>
              <span style={{ color: '#6B625A', marginRight: 6 }}>{a.year}</span>{a.label}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed', right: 0, top: 0, bottom: 0, width: 280,
      background: '#FDFAF4', borderLeft: '1px solid #D2BDA3',
      boxShadow: '-4px 0 12px rgba(0,0,0,0.08)', zIndex: 50,
      overflow: 'auto', padding: 20,
    }}>
      <button
        onClick={onClose}
        style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer' }}
        aria-label="Close inspector"
      >
        <X size={16} />
      </button>
      <div style={{ marginTop: 24 }}>{content}</div>
    </div>
  )
}

const td: React.CSSProperties = { padding: '3px 8px 3px 0', verticalAlign: 'top', color: '#6B625A' }
