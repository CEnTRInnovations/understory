import { useRef, useState, useLayoutEffect } from 'react'
import type { UnderstoryDocument, SelectedItem } from '../types'

interface Props {
  doc: UnderstoryDocument
  selected: SelectedItem | null
  onSelect: (item: SelectedItem | null) => void
}

const NODE_W = 160
const NODE_H = 44
const H_GAP = 200
const V_GAP = 80

export function InfluenceMapView({ doc, selected, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(900)
  useLayoutEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver(e => setWidth(e[0].contentRect.width))
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  const sortedDomains = [...doc.processDomains].sort((a, b) => a.order - b.order)
  const n = sortedDomains.length
  const svgH = n * (NODE_H + V_GAP) + 60

  // Simple layout: two staggered columns
  function nodePos(idx: number): { x: number; y: number } {
    const col = idx % 2
    const row = Math.floor(idx / 2)
    const colW = (width - NODE_W - 80) / 2
    return {
      x: 40 + col * (colW + H_GAP / 2),
      y: 40 + row * (NODE_H + V_GAP) + (col === 1 ? (NODE_H + V_GAP) / 2 : 0),
    }
  }

  function nodeCenter(domainId: string): { x: number; y: number } {
    const idx = sortedDomains.findIndex(d => d.id === domainId)
    if (idx < 0) return { x: 0, y: 0 }
    const pos = nodePos(idx)
    return { x: pos.x + NODE_W / 2, y: pos.y + NODE_H / 2 }
  }

  function getDomainId(id: string, type: 'process' | 'anchor'): string {
    if (type === 'process') return doc.processes.find(p => p.id === id)?.domainId ?? ''
    return doc.anchors.find(a => a.id === id)?.domainId ?? ''
  }

  // Only draw process-to-process interactions in the influence map
  const processInteractions = doc.interactions.filter(
    i => i.fromType === 'process' && i.toType === 'process'
  )

  const requiredHeight = n % 2 === 0
    ? (n / 2) * (NODE_H + V_GAP) + 40
    : (Math.ceil(n / 2)) * (NODE_H + V_GAP) + 40

  return (
    <div ref={containerRef} style={{ width: '100%', padding: 16, boxSizing: 'border-box' }}>
      <svg
        width={width - 32}
        height={Math.max(svgH, requiredHeight)}
        style={{ background: '#F2ECD7', display: 'block', borderRadius: 6 }}
        onClick={() => onSelect(null)}
      >
        {/* Edges */}
        {processInteractions.map(ix => {
          const fromDomain = getDomainId(ix.fromId, ix.fromType)
          const toDomain = getDomainId(ix.toId, ix.toType)
          if (!fromDomain || !toDomain || fromDomain === toDomain) return null
          const c1 = nodeCenter(fromDomain)
          const c2 = nodeCenter(toDomain)
          const midX = (c1.x + c2.x) / 2
          const midY = (c1.y + c2.y) / 2
          const isSelected = selected?.kind === 'interaction' && selected.id === ix.id
          const dashArray = ix.strength === 'strong' ? 'none' : ix.strength === 'moderate' ? '6,3' : '3,5'

          // Arrowhead direction
          const angle = Math.atan2(c2.y - c1.y, c2.x - c1.x)
          const arrowLen = 10
          const ax = c2.x - Math.cos(angle) * (NODE_W / 2 + 4)
          const ay = c2.y - Math.sin(angle) * (NODE_H / 2 + 4)

          return (
            <g key={ix.id}
              style={{ cursor: 'pointer' }}
              onClick={e => { e.stopPropagation(); onSelect({ kind: 'interaction', id: ix.id }) }}
            >
              <line
                x1={c1.x} y1={c1.y} x2={ax} y2={ay}
                stroke={isSelected ? '#C0392B' : '#8C6E45'}
                strokeWidth={isSelected ? 2.5 : 1.5}
                strokeDasharray={dashArray === 'none' ? undefined : dashArray}
                opacity={0.75}
              />
              {/* Arrowhead */}
              <polygon
                points={`
                  ${ax},${ay}
                  ${ax - arrowLen * Math.cos(angle - 0.4)},${ay - arrowLen * Math.sin(angle - 0.4)}
                  ${ax - arrowLen * Math.cos(angle + 0.4)},${ay - arrowLen * Math.sin(angle + 0.4)}
                `}
                fill={isSelected ? '#C0392B' : '#8C6E45'} opacity={0.75}
              />
              <text
                x={midX} y={midY - 6}
                textAnchor="middle" fontSize={9} fill="#6B625A"
                style={{ pointerEvents: 'none' }}
              >{ix.verb}</text>
              {/* Invisible hit area */}
              <line
                x1={c1.x} y1={c1.y} x2={ax} y2={ay}
                stroke="transparent" strokeWidth={14}
              />
            </g>
          )
        })}

        {/* Domain nodes */}
        {sortedDomains.map((domain, idx) => {
          const pos = nodePos(idx)
          const isSelected = selected?.kind === 'domain' && selected.id === domain.id

          return (
            <g key={domain.id}
              style={{ cursor: 'pointer' }}
              onClick={e => { e.stopPropagation(); onSelect({ kind: 'domain', id: domain.id }) }}
            >
              <rect
                x={pos.x} y={pos.y} width={NODE_W} height={NODE_H} rx={6}
                fill={domain.color}
                stroke={isSelected ? '#fff' : 'transparent'}
                strokeWidth={isSelected ? 3 : 0}
                opacity={isSelected ? 1 : 0.88}
              />
              <text
                x={pos.x + NODE_W / 2} y={pos.y + NODE_H / 2}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={10} fill="#fff" fontWeight={600}
                style={{ pointerEvents: 'none' }}
              >
                {domain.shortLabel ?? domain.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
