import React, { useState, useRef } from 'react'
import { Plus, Download, Upload, Map, List, Share2, Eye, EyeOff } from 'lucide-react'
import { useUnderstoryDocument } from './useUnderstoryDocument'
import { ProcessView } from './components/ProcessView'
import { TimelineView } from './components/TimelineView'
import { InfluenceMapView } from './components/InfluenceMapView'
import { InspectorPanel } from './components/InspectorPanel'
import { EraModal } from './components/modals/EraModal'
import { DomainModal } from './components/modals/DomainModal'
import { ProcessModal } from './components/modals/ProcessModal'
import { AnchorModal } from './components/modals/AnchorModal'
import { InteractionModal } from './components/modals/InteractionModal'
import type { SelectedItem } from './types'

type ModalKind = 'era' | 'domain' | 'process' | 'anchor' | 'interaction' | null

export function UnderstoryApp() {
  const store = useUnderstoryDocument()
  const { doc, setSettings, setActiveView, exportDocJson, importDoc } = store
  const [selected, setSelected] = useState<SelectedItem | null>(null)
  const [openModal, setOpenModal] = useState<ModalKind>(null)
  const importRef = useRef<HTMLInputElement>(null)

  const view = doc.settings.activeView

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => importDoc(ev.target?.result as string)
    reader.readAsText(file)
    e.target.value = ''
  }

  const toolbarBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '5px 12px', fontSize: 12, fontWeight: 500,
    background: '#fff', border: '1px solid #C8B99A', borderRadius: 4,
    cursor: 'pointer', color: '#4A4A4A',
  }

  const viewBtn = (v: typeof view): React.CSSProperties => ({
    ...toolbarBtn,
    background: doc.settings.activeView === v ? '#4E342E' : '#fff',
    color: doc.settings.activeView === v ? '#fff' : '#4A4A4A',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#F2ECD7' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        padding: '8px 16px', background: '#FDFAF4', borderBottom: '1px solid #D2BDA3',
      }}>
        {/* Title */}
        <div style={{ fontWeight: 700, fontSize: 14, color: '#4E342E', marginRight: 8 }}>
          Understory
        </div>

        {/* View switcher */}
        <button style={viewBtn('process')} onClick={() => setActiveView('process')}>
          <Map size={14} /> Process View
        </button>
        <button style={viewBtn('timeline')} onClick={() => setActiveView('timeline')}>
          <List size={14} /> Timeline View
        </button>
        <button style={viewBtn('influence')} onClick={() => setActiveView('influence')}>
          <Share2 size={14} /> Influence Map
        </button>

        <div style={{ width: 1, height: 24, background: '#D2BDA3', margin: '0 4px' }} />

        {/* Add buttons */}
        <button style={toolbarBtn} onClick={() => setOpenModal('era')}><Plus size={12} /> Add Era</button>
        <button style={toolbarBtn} onClick={() => setOpenModal('domain')}><Plus size={12} /> Add Domain</button>
        <button style={toolbarBtn} onClick={() => setOpenModal('process')}><Plus size={12} /> Add Process</button>
        <button style={toolbarBtn} onClick={() => setOpenModal('anchor')}><Plus size={12} /> Add Anchor</button>
        <button style={toolbarBtn} onClick={() => setOpenModal('interaction')}><Plus size={12} /> Add Interaction</button>

        <div style={{ width: 1, height: 24, background: '#D2BDA3', margin: '0 4px' }} />

        {/* Toggle controls (process view only) */}
        {view === 'process' && (
          <>
            <button
              style={{ ...toolbarBtn, background: doc.settings.showEras ? '#4E342E' : '#fff', color: doc.settings.showEras ? '#fff' : '#4A4A4A' }}
              onClick={() => setSettings({ showEras: !doc.settings.showEras })}
            >{doc.settings.showEras ? <Eye size={12} /> : <EyeOff size={12} />} Eras</button>
            <button
              style={{ ...toolbarBtn, background: doc.settings.showMinorAnchors ? '#4E342E' : '#fff', color: doc.settings.showMinorAnchors ? '#fff' : '#4A4A4A' }}
              onClick={() => setSettings({ showMinorAnchors: !doc.settings.showMinorAnchors })}
            >{doc.settings.showMinorAnchors ? <Eye size={12} /> : <EyeOff size={12} />} Minor Anchors</button>
            <button
              style={{ ...toolbarBtn, background: doc.settings.showInteractionLabels ? '#4E342E' : '#fff', color: doc.settings.showInteractionLabels ? '#fff' : '#4A4A4A' }}
              onClick={() => setSettings({ showInteractionLabels: !doc.settings.showInteractionLabels })}
            >{doc.settings.showInteractionLabels ? <Eye size={12} /> : <EyeOff size={12} />} Verb Labels</button>
            <button
              style={{ ...toolbarBtn, background: doc.settings.showOnlyMajorInteractions ? '#4E342E' : '#fff', color: doc.settings.showOnlyMajorInteractions ? '#fff' : '#4A4A4A' }}
              onClick={() => setSettings({ showOnlyMajorInteractions: !doc.settings.showOnlyMajorInteractions })}
            >Major Only</button>
          </>
        )}

        <div style={{ flex: 1 }} />

        {/* Import / Export */}
        <button style={toolbarBtn} onClick={() => importRef.current?.click()}><Upload size={12} /> Import</button>
        <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
        <button style={toolbarBtn} onClick={exportDocJson}><Download size={12} /> Export JSON</button>
      </div>

      {/* Main content area */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {view === 'process' && (
          <ProcessView
            doc={doc}
            selected={selected}
            onSelect={setSelected}
            showEras={doc.settings.showEras}
            showMinorAnchors={doc.settings.showMinorAnchors}
            showInteractionLabels={doc.settings.showInteractionLabels}
            showOnlyMajorInteractions={doc.settings.showOnlyMajorInteractions}
          />
        )}
        {view === 'timeline' && (
          <TimelineView
            doc={doc}
            selected={selected}
            onSelect={setSelected}
            showMinorAnchors={doc.settings.showMinorAnchors}
          />
        )}
        {view === 'influence' && (
          <InfluenceMapView
            doc={doc}
            selected={selected}
            onSelect={setSelected}
          />
        )}
      </div>

      {/* Inspector Panel */}
      <InspectorPanel
        doc={doc}
        selected={selected}
        onClose={() => setSelected(null)}
        onUpdateAnchor={store.updateAnchor}
      />

      {/* Modals */}
      {openModal === 'era' && (
        <EraModal
          onSave={store.addEra}
          onClose={() => setOpenModal(null)}
        />
      )}
      {openModal === 'domain' && (
        <DomainModal
          nextOrder={doc.processDomains.length + 1}
          onSave={store.addDomain}
          onClose={() => setOpenModal(null)}
        />
      )}
      {openModal === 'process' && (
        <ProcessModal
          doc={doc}
          onSave={store.addProcess}
          onClose={() => setOpenModal(null)}
        />
      )}
      {openModal === 'anchor' && (
        <AnchorModal
          doc={doc}
          onSave={store.addAnchor}
          onClose={() => setOpenModal(null)}
        />
      )}
      {openModal === 'interaction' && (
        <InteractionModal
          doc={doc}
          onSave={store.addInteraction}
          onClose={() => setOpenModal(null)}
        />
      )}
    </div>
  )
}
