import type { UnderstoryDocument, SelectedItem, Era } from '../types'

interface Props {
  doc: UnderstoryDocument
  selected: SelectedItem | null
  onSelect: (item: SelectedItem | null) => void
  showMinorAnchors?: boolean
}

export function TimelineView({ doc, selected, onSelect, showMinorAnchors = false }: Props) {
  const sortedEras = [...doc.eras].sort((a, b) => a.startYear - b.startYear)

  function anchorsForEra(era: Era) {
    return doc.anchors
      .filter(a => {
        const inEra = a.year >= era.startYear && a.year <= era.endYear
        const visible = showMinorAnchors || a.importance === 'major'
        return inEra && visible
      })
      .sort((a, b) => a.year - b.year)
  }

  const allEraAnchors = new Set(sortedEras.flatMap(era => anchorsForEra(era).map(a => a.id)))
  const uncategorized = doc.anchors.filter(a => {
    const vis = showMinorAnchors || a.importance === 'major'
    return vis && !allEraAnchors.has(a.id)
  }).sort((a, b) => a.year - b.year)

  return (
    <div style={{ padding: 24, background: '#F2ECD7', minHeight: '100%' }}>
      <div style={{ display: 'flex', gap: 0, alignItems: 'stretch', borderRadius: 6, overflow: 'hidden', border: '1px solid #C8B99A' }}>
        {sortedEras.map((era, idx) => {
          const anchors = anchorsForEra(era)
          const span = era.endYear - era.startYear
          const totalSpan = doc.endYear - doc.startYear
          const flex = span / totalSpan

          return (
            <div
              key={era.id}
              style={{
                flex,
                background: idx % 2 === 0 ? '#FDFAF4' : '#F5EDD9',
                borderRight: idx < sortedEras.length - 1 ? '1px solid #C8B99A' : undefined,
                display: 'flex', flexDirection: 'column',
              }}
            >
              {/* Era header */}
              <div style={{
                background: era.color ?? '#D2BDA3',
                color: '#fff', fontWeight: 700, fontSize: 12,
                padding: '8px 12px', textAlign: 'center',
                minHeight: 48, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <div>{era.label}</div>
                <div style={{ fontWeight: 400, fontSize: 10, opacity: 0.85, marginTop: 2 }}>
                  {era.startYear}–{era.endYear}
                </div>
              </div>

              {/* Anchor list */}
              <div style={{ padding: '12px 10px', flex: 1 }}>
                {anchors.length === 0 && (
                  <div style={{ fontSize: 11, color: '#A0978D', fontStyle: 'italic' }}>No major events</div>
                )}
                {anchors.map(anchor => {
                  const isSelected = selected?.kind === 'anchor' && selected.id === anchor.id
                  const domain = doc.processDomains.find(d => d.id === anchor.domainId)
                  return (
                    <div
                      key={anchor.id}
                      style={{
                        marginBottom: 8, cursor: 'pointer', padding: '4px 6px',
                        borderRadius: 3, borderLeft: `3px solid ${domain?.color ?? '#8C6E45'}`,
                        background: isSelected ? '#F0E6C8' : 'transparent',
                        fontSize: 11, lineHeight: 1.4,
                      }}
                      onClick={e => { e.stopPropagation(); onSelect({ kind: 'anchor', id: anchor.id }) }}
                    >
                      <span style={{ fontWeight: 600, color: '#4A4A4A', marginRight: 4 }}>{anchor.year}</span>
                      <span style={{ color: '#3E3B35' }}>{anchor.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
        {uncategorized.length > 0 && (
          <div style={{ flex: 0.2, background: '#F5EDD9', borderLeft: '1px solid #C8B99A', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: '#A0978D', color: '#fff', fontWeight: 700, fontSize: 12, padding: '8px 12px', textAlign: 'center', minHeight: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div>Other</div>
            </div>
            <div style={{ padding: '12px 10px', flex: 1 }}>
              {uncategorized.map(anchor => {
                const isSelected = selected?.kind === 'anchor' && selected.id === anchor.id
                const domain = doc.processDomains.find(d => d.id === anchor.domainId)
                return (
                  <div key={anchor.id} style={{ marginBottom: 8, cursor: 'pointer', padding: '4px 6px', borderRadius: 3, borderLeft: `3px solid ${domain?.color ?? '#8C6E45'}`, background: isSelected ? '#F0E6C8' : 'transparent', fontSize: 11, lineHeight: 1.4 }}
                    onClick={e => { e.stopPropagation(); onSelect({ kind: 'anchor', id: anchor.id }) }}>
                    <span style={{ fontWeight: 600, color: '#4A4A4A', marginRight: 4 }}>{anchor.year}</span>
                    <span style={{ color: '#3E3B35' }}>{anchor.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Domain legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 20 }}>
        {doc.processDomains.sort((a, b) => a.order - b.order).map(domain => (
          <div key={domain.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: domain.color }} />
            {domain.shortLabel ?? domain.label}
          </div>
        ))}
      </div>
    </div>
  )
}
