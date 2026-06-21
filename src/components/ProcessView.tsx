import { useRef, useState, useLayoutEffect } from 'react'
import type { UnderstoryDocument, SelectedItem } from '../types'
import { yearToXPct } from '../utils/yearToX'

const ML = 160   // margin left (label area)
const MR = 40    // margin right
const RH = 90    // row height per domain
const TP = 48    // top padding above first row
const BP = 40    // bottom padding (for time axis)
const TICK_H = 24
const ANCHOR_R = 5     // anchor dot radius (major)
const ANCHOR_R_SM = 3  // anchor dot radius (minor)
const ARROW_SIZE = 8   // arrowhead size in px
const LABEL_COLOR = '#3E3B35'

interface Props {
  doc: UnderstoryDocument
  selected: SelectedItem | null
  onSelect: (item: SelectedItem | null) => void
  showEras?: boolean
  showMinorAnchors?: boolean
  showInteractionLabels?: boolean
  showOnlyMajorInteractions?: boolean
}

export function ProcessView({
  doc, selected, onSelect,
  showEras = true,
  showMinorAnchors = false,
  showInteractionLabels = true,
  showOnlyMajorInteractions = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(900)

  useLayoutEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver(entries => {
      setWidth(entries[0].contentRect.width)
    })
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  const sortedDomains = [...doc.processDomains].sort((a, b) => a.order - b.order)
  const innerW = width - ML - MR
  const svgH = TP + sortedDomains.length * RH + TICK_H + BP

  // Map a year to an x pixel coordinate within the inner drawing area
  function xFor(year: number): number {
    return ML + (yearToXPct(year, doc.startYear, doc.endYear) / 100) * innerW
  }

  // Y center of a domain row (by domain index in sorted order)
  function yForDomainIndex(idx: number): number {
    return TP + idx * RH + RH / 2
  }

  function yForDomain(domainId: string): number {
    const idx = sortedDomains.findIndex(d => d.id === domainId)
    return yForDomainIndex(idx < 0 ? 0 : idx)
  }

  // Resolve the midpoint x for a process-or-anchor reference
  function xForRef(id: string, type: 'process' | 'anchor'): number {
    if (type === 'anchor') {
      const a = doc.anchors.find(a => a.id === id)
      return a ? xFor(a.year) : xFor(doc.startYear)
    }
    const p = doc.processes.find(p => p.id === id)
    if (!p) return xFor(doc.startYear)
    const mid = p.startYear + ((p.endYear ?? doc.endYear) - p.startYear) / 2
    return xFor(mid)
  }

  const visibleAnchors = showMinorAnchors
    ? doc.anchors
    : doc.anchors.filter(a => a.importance === 'major')

  const visibleInteractions = showOnlyMajorInteractions
    ? doc.interactions.filter(i => i.strength === 'strong')
    : doc.interactions.filter(i => i.visible !== false)

  // Warn if too many visible labels (> 12)
  const labelledAnchors = visibleAnchors.filter(a => a.visibleLabel)
  const tooManyLabels = labelledAnchors.length > 12
  const tooManyInteractions = visibleInteractions.length > 20

  return (
    <div ref={containerRef} style={{ width: '100%', position: 'relative' }}>
      {tooManyLabels && (
        <div style={{ background: '#FFF3CD', border: '1px solid #FFBA00', padding: '6px 12px', fontSize: 12, marginBottom: 8, borderRadius: 4 }}>
          Warning: {labelledAnchors.length} visible labels — consider hiding minor anchors or turning off labels to reduce clutter.
        </div>
      )}
      {tooManyInteractions && (
        <div style={{ background: '#FFF3CD', border: '1px solid #FFBA00', padding: '6px 12px', fontSize: 12, marginBottom: 8, borderRadius: 4 }}>
          Warning: {visibleInteractions.length} interactions visible — consider enabling "Show only major interactions."
        </div>
      )}
      <svg
        width={width}
        height={svgH}
        style={{ display: 'block', background: '#F2ECD7', fontFamily: 'system-ui, sans-serif' }}
        onClick={() => onSelect(null)}
      >
        {/* Era bands */}
        {showEras && doc.eras.map(era => {
          const ex = xFor(era.startYear)
          const ew = xFor(era.endYear) - ex
          return (
            <g key={era.id}>
              <rect
                x={ex} y={TP} width={ew} height={sortedDomains.length * RH}
                fill={era.color ?? '#E0D5C0'} opacity={0.25}
              />
              <text
                x={ex + ew / 2} y={TP - 10}
                textAnchor="middle" fontSize={10} fill="#6B625A"
              >{era.label}</text>
            </g>
          )
        })}

        {/* Row separators */}
        {sortedDomains.map((_, idx) => (
          <line
            key={idx}
            x1={ML} y1={TP + idx * RH}
            x2={width - MR} y2={TP + idx * RH}
            stroke="#D2BDA3" strokeWidth={0.5}
          />
        ))}

        {/* Domain labels (left margin) */}
        {sortedDomains.map((domain, idx) => (
          <text
            key={domain.id}
            x={ML - 10} y={yForDomainIndex(idx)}
            textAnchor="end" dominantBaseline="middle"
            fontSize={11} fill={domain.color} fontWeight="600"
            style={{ cursor: 'pointer' }}
            onClick={e => { e.stopPropagation(); onSelect({ kind: 'domain', id: domain.id }) }}
          >
            {domain.shortLabel ?? domain.label}
          </text>
        ))}

        {/* Process lines (horizontal arrows) */}
        {doc.processes.map(proc => {
          const domain = sortedDomains.find(d => d.id === proc.domainId)
          if (!domain) return null
          const domIdx = sortedDomains.indexOf(domain)
          const y = yForDomainIndex(domIdx)
          const x1 = xFor(proc.startYear)
          const x2 = xFor(proc.endYear ?? doc.endYear)
          const color = domain.color
          const isSelected = selected?.kind === 'process' && selected.id === proc.id
          const arrowX = proc.continues ? width - MR : x2

          return (
            <g key={proc.id}
              style={{ cursor: 'pointer' }}
              onClick={e => { e.stopPropagation(); onSelect({ kind: 'process', id: proc.id }) }}
            >
              <line
                x1={x1} y1={y} x2={arrowX - (proc.continues ? ARROW_SIZE : 0)} y2={y}
                stroke={color} strokeWidth={isSelected ? 4 : 2.5}
                opacity={isSelected ? 1 : 0.85}
              />
              {/* Arrowhead */}
              <polygon
                points={`${arrowX},${y} ${arrowX - ARROW_SIZE},${y - ARROW_SIZE / 2} ${arrowX - ARROW_SIZE},${y + ARROW_SIZE / 2}`}
                fill={color} opacity={isSelected ? 1 : 0.85}
              />
              {/* Process label near start */}
              <text
                x={x1 + 4} y={y - 8}
                fontSize={10} fill={color} fontWeight="500"
              >{proc.label}</text>
              {/* Invisible wider hit area */}
              <line
                x1={x1} y1={y} x2={arrowX} y2={y}
                stroke="transparent" strokeWidth={16}
              />
            </g>
          )
        })}

        {/* Anchor dots */}
        {visibleAnchors.map(anchor => {
          const y = yForDomain(anchor.domainId)
          const x = xFor(anchor.year)
          const r = anchor.importance === 'major' ? ANCHOR_R : ANCHOR_R_SM
          const domain = doc.processDomains.find(d => d.id === anchor.domainId)
          const color = domain?.color ?? '#4A4A4A'
          const isSelected = selected?.kind === 'anchor' && selected.id === anchor.id

          return (
            <g key={anchor.id}
              style={{ cursor: 'pointer' }}
              onClick={e => { e.stopPropagation(); onSelect({ kind: 'anchor', id: anchor.id }) }}
            >
              <circle
                cx={x} cy={y} r={isSelected ? r + 3 : r}
                fill={isSelected ? '#fff' : color}
                stroke={color} strokeWidth={isSelected ? 2.5 : 1.5}
              />
              {anchor.visibleLabel && (
                <text
                  x={x} y={y - r - 5}
                  textAnchor="middle" fontSize={9} fill={LABEL_COLOR}
                  style={{ pointerEvents: 'none' }}
                >
                  {anchor.year} {anchor.label}
                </text>
              )}
            </g>
          )
        })}

        {/* Interaction curves (dotted beziers) */}
        {visibleInteractions.map(interaction => {
          const x1 = xForRef(interaction.fromId, interaction.fromType)
          const x2 = xForRef(interaction.toId, interaction.toType)
          const fromDomainId = interaction.fromType === 'anchor'
            ? doc.anchors.find(a => a.id === interaction.fromId)?.domainId ?? ''
            : doc.processes.find(p => p.id === interaction.fromId)?.domainId ?? ''
          const toDomainId = interaction.toType === 'anchor'
            ? doc.anchors.find(a => a.id === interaction.toId)?.domainId ?? ''
            : doc.processes.find(p => p.id === interaction.toId)?.domainId ?? ''
          const y1 = yForDomain(fromDomainId)
          const y2 = yForDomain(toDomainId)
          const midY = (y1 + y2) / 2
          const isSelected = selected?.kind === 'interaction' && selected.id === interaction.id
          const dashPattern = interaction.strength === 'strong' ? '6,3' : interaction.strength === 'moderate' ? '4,4' : '2,5'
          const midX = (x1 + x2) / 2
          const midCurveX = midX
          const midCurveY = midY

          return (
            <g key={interaction.id}
              style={{ cursor: 'pointer' }}
              onClick={e => { e.stopPropagation(); onSelect({ kind: 'interaction', id: interaction.id }) }}
            >
              {/* Invisible fat hit area */}
              <path
                d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                stroke="transparent" strokeWidth={12} fill="none"
              />
              <path
                d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                stroke={isSelected ? '#C0392B' : '#8C6E45'}
                strokeWidth={isSelected ? 2 : 1.5}
                strokeDasharray={dashPattern}
                fill="none"
                opacity={0.7}
              />
              {/* Arrowhead at destination */}
              <circle cx={x2} cy={y2} r={3} fill={isSelected ? '#C0392B' : '#8C6E45'} opacity={0.7} />
              {showInteractionLabels && (
                <text
                  x={midCurveX} y={midCurveY - 6}
                  textAnchor="middle" fontSize={8.5} fill="#8C6E45"
                  style={{ pointerEvents: 'none' }}
                >{interaction.verb}</text>
              )}
            </g>
          )
        })}

        {/* Time axis */}
        <line
          x1={ML} y1={TP + sortedDomains.length * RH}
          x2={width - MR} y2={TP + sortedDomains.length * RH}
          stroke="#6B625A" strokeWidth={1}
        />
        {Array.from({ length: Math.floor((doc.endYear - doc.startYear) / 5) + 1 }, (_, i) => {
          const year = doc.startYear + i * 5
          const x = xFor(year)
          return (
            <g key={year}>
              <line
                x1={x} y1={TP + sortedDomains.length * RH}
                x2={x} y2={TP + sortedDomains.length * RH + 5}
                stroke="#6B625A" strokeWidth={1}
              />
              <text
                x={x} y={TP + sortedDomains.length * RH + 16}
                textAnchor="middle" fontSize={10} fill="#6B625A"
              >{year}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
