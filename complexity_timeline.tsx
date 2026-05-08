import React, { useState, useRef } from 'react';
import { X, Plus, Link2, Trash2, Edit2, Download } from 'lucide-react';

type TimelineEvent = {
  label: string;
  year: number;
  layer: number;
  x: number;
  color: string;
  borderColor: string;
  style: string;
};

type Connection = {
  from: number;
  to: number;
  color: string;
  lineStyle: string;
  width: number;
  showArrow: boolean;
};

type Column = {
  label: string;
  startYear: number;
  endYear: number;
};

type Trend = {
  label: string;
  startYear: number;
  endYear: number;
  color: string;
};

const complexity_timeline = () => {
  const [layers, setLayers] = useState<string[]>([]);
  const [startYear, setStartYear] = useState(2008);
  const [endYear, setEndYear] = useState(2025);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<number | null>(null);
  const [draggingEvent, setDraggingEvent] = useState<number | null>(null);
  const [showLayerModal, setShowLayerModal] = useState(false);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showTrendModal, setShowTrendModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState<boolean | Partial<TimelineEvent>>(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [editingEvent, setEditingEvent] = useState<number | null>(null);
  const [draggingLayer, setDraggingLayer] = useState<number | null>(null);
  
  const timelineRef = useRef(null);
  const svgRef = useRef(null);
  const exportRef = useRef(null);

  const yearSpan = endYear - startYear;
  const layerHeight = 120;
  const timelineHeight = layers.length * layerHeight + 100;

  const addLayer = (name: string) => {
    setLayers([...layers, name]);
    setShowLayerModal(false);
  };

  const removeLayer = (index) => {
    const newLayers = layers.filter((_, i) => i !== index);
    setLayers(newLayers);
    setEvents(events.filter(e => e.layer !== index).map(e => 
      e.layer > index ? { ...e, layer: e.layer - 1 } : e
    ));
  };

  const addEvent = (eventData: TimelineEvent) => {
    if (editingEvent !== null) {
      setEvents(events.map((e, i) => i === editingEvent ? eventData : e));
      setEditingEvent(null);
    } else {
      setEvents([...events, eventData]);
    }
    setShowEventModal(false);
  };

  const deleteEvent = (index) => {
    setEvents(events.filter((_, i) => i !== index));
    setConnections(connections.filter(c => c.from !== index && c.to !== index));
    setSelectedEvent(null);
  };

  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [connectionData, setConnectionData] = useState<{ from: number; to: number } | null>(null);

  const addConnection = (connectionSettings: Connection) => {
    setConnections([...connections, connectionSettings]);
    setConnectingFrom(null);
    setShowConnectionModal(false);
  };

  const addColumn = (columnData: Column) => {
    setColumns([...columns, columnData]);
    setShowColumnModal(false);
  };

  const addTrend = (trendData: Trend) => {
    if (trends.length >= 4) {
      alert('Maximum of 4 trends allowed');
      return;
    }
    setTrends([...trends, trendData]);
    setShowTrendModal(false);
  };

  const exportAsJSON = () => {
    const data = {
      layers,
      startYear,
      endYear,
      events,
      connections,
      columns,
      trends
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'timeline.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsPNG = async () => {
    if (!timelineRef.current) return;
    
    // Create a canvas
    const canvas = document.createElement('canvas');
    const rect = timelineRef.current.getBoundingClientRect();
    const scale = 2; // Higher resolution
    canvas.width = rect.width * scale;
    canvas.height = rect.height * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(scale, scale);
    
    // Fill background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, rect.width, rect.height);
    
    // Draw columns
    columns.forEach(col => {
      const x = (yearToX(col.startYear) / 100) * rect.width;
      const width = ((yearToX(col.endYear) - yearToX(col.startYear)) / 100) * rect.width;
      ctx.fillStyle = 'rgba(243, 244, 246, 0.5)';
      ctx.fillRect(x, 0, width, rect.height);
      ctx.strokeStyle = 'rgba(209, 213, 219, 1)';
      ctx.strokeRect(x, 0, width, rect.height);
      
      ctx.fillStyle = '#374151';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(col.label, x + width / 2, 15);
    });
    
    // Draw layers
    layers.forEach((layer, i) => {
      const y = i * layerHeight;
      ctx.strokeStyle = '#d1d5db';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();
      
      ctx.fillStyle = '#374151';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(layer, 8, y + 15, 140);
    });
    
    // Draw connections
    connections.forEach(conn => {
      const from = getEventPosition(conn.from);
      const to = getEventPosition(conn.to);
      
      const fromSide = from.x < to.x ? 'right' : 'left';
      const toSide = from.x < to.x ? 'left' : 'right';
      
      const eventWidth = 60;
      const fromX = fromSide === 'right' ? from.x + eventWidth : from.x - eventWidth;
      const toX = toSide === 'left' ? to.x - eventWidth : to.x + eventWidth;
      const fromY = from.y;
      const toY = to.y;
      
      const dx = toX - fromX;
      const cx1 = fromX + dx * 0.5;
      const cy1 = fromY;
      const cx2 = fromX + dx * 0.5;
      const cy2 = toY;
      
      ctx.strokeStyle = conn.color || '#666';
      ctx.lineWidth = conn.width || 2;
      if (conn.lineStyle === 'dashed') {
        ctx.setLineDash([5, 5]);
      } else if (conn.lineStyle === 'dotted') {
        ctx.setLineDash([2, 3]);
      } else {
        ctx.setLineDash([]);
      }
      
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.bezierCurveTo(cx1, cy1, cx2, cy2, toX, toY);
      ctx.stroke();
      
      // Draw arrowhead
      if (conn.showArrow) {
        const angle = Math.atan2(toY - cy2, toX - cx2);
        ctx.fillStyle = conn.color || '#666';
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - 10 * Math.cos(angle - Math.PI / 6), toY - 10 * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(toX - 10 * Math.cos(angle + Math.PI / 6), toY - 10 * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      }
    });
    
    // Draw events
    events.forEach(event => {
      const x = (event.x / 100) * rect.width;
      const y = event.layer * layerHeight + 20;
      
      ctx.fillStyle = event.color || '#fff';
      ctx.strokeStyle = event.borderColor || '#333';
      ctx.lineWidth = 2;
      const boxWidth = 110;
      const boxHeight = 40;
      ctx.fillRect(x - boxWidth / 2, y, boxWidth, boxHeight);
      ctx.strokeRect(x - boxWidth / 2, y, boxWidth, boxHeight);
      
      ctx.fillStyle = '#000';
      ctx.font = event.style === 'italic' ? 'italic 10px sans-serif' : '10px sans-serif';
      ctx.textAlign = 'center';
      const words = event.label.split(' ');
      let line = '';
      let lineY = y + 15;
      words.forEach((word, i) => {
        const testLine = line + word + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > boxWidth - 10 && i > 0) {
          ctx.fillText(line, x, lineY);
          line = word + ' ';
          lineY += 12;
        } else {
          line = testLine;
        }
      });
      ctx.fillText(line, x, lineY);
    });
    
    // Draw year markers
    const markerY = rect.height - 48;
    ctx.strokeStyle = '#9ca3af';
    ctx.beginPath();
    ctx.moveTo(0, markerY);
    ctx.lineTo(rect.width, markerY);
    ctx.stroke();
    
    for (let i = 0; i <= Math.ceil(yearSpan / 5); i++) {
      const year = startYear + i * 5;
      if (year > endYear) break;
      const x = (yearToX(year) / 100) * rect.width;
      ctx.strokeStyle = '#9ca3af';
      ctx.beginPath();
      ctx.moveTo(x, markerY);
      ctx.lineTo(x, markerY + 8);
      ctx.stroke();
      
      ctx.fillStyle = '#4b5563';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(year.toString(), x, markerY + 20);
    }
    
    // Draw trends
    trends.forEach((trend, i) => {
      const x = (yearToX(trend.startYear) / 100) * rect.width;
      const width = ((yearToX(trend.endYear) - yearToX(trend.startYear)) / 100) * rect.width;
      const y = rect.height - 64 - (i * 8);
      
      ctx.fillStyle = trend.color || '#666666';
      ctx.globalAlpha = 0.8;
      ctx.fillRect(x, y, width, 24);
      ctx.globalAlpha = 1;
      
      ctx.fillStyle = '#fff';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(trend.label, x + width / 2, y + 15);
    });
    
    // Convert to PNG
    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'timeline.png';
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const exportAsPDF = async () => {
    // First create PNG
    if (!timelineRef.current) return;
    
    const canvas = document.createElement('canvas');
    const rect = timelineRef.current.getBoundingClientRect();
    const scale = 2;
    canvas.width = rect.width * scale;
    canvas.height = rect.height * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(scale, scale);
    
    // Fill background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, rect.width, rect.height);
    
    // Draw columns
    columns.forEach(col => {
      const x = (yearToX(col.startYear) / 100) * rect.width;
      const width = ((yearToX(col.endYear) - yearToX(col.startYear)) / 100) * rect.width;
      ctx.fillStyle = 'rgba(243, 244, 246, 0.5)';
      ctx.fillRect(x, 0, width, rect.height);
      ctx.strokeStyle = 'rgba(209, 213, 219, 1)';
      ctx.strokeRect(x, 0, width, rect.height);
      
      ctx.fillStyle = '#374151';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(col.label, x + width / 2, 15);
    });
    
    // Draw layers
    layers.forEach((layer, i) => {
      const y = i * layerHeight;
      ctx.strokeStyle = '#d1d5db';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();
      
      ctx.fillStyle = '#374151';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(layer, 8, y + 15, 140);
    });
    
    // Draw connections
    connections.forEach(conn => {
      const from = getEventPosition(conn.from);
      const to = getEventPosition(conn.to);
      
      const fromSide = from.x < to.x ? 'right' : 'left';
      const toSide = from.x < to.x ? 'left' : 'right';
      
      const eventWidth = 60;
      const fromX = fromSide === 'right' ? from.x + eventWidth : from.x - eventWidth;
      const toX = toSide === 'left' ? to.x - eventWidth : to.x + eventWidth;
      const fromY = from.y;
      const toY = to.y;
      
      const dx = toX - fromX;
      const cx1 = fromX + dx * 0.5;
      const cy1 = fromY;
      const cx2 = fromX + dx * 0.5;
      const cy2 = toY;
      
      ctx.strokeStyle = conn.color || '#666';
      ctx.lineWidth = conn.width || 2;
      if (conn.lineStyle === 'dashed') {
        ctx.setLineDash([5, 5]);
      } else if (conn.lineStyle === 'dotted') {
        ctx.setLineDash([2, 3]);
      } else {
        ctx.setLineDash([]);
      }
      
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.bezierCurveTo(cx1, cy1, cx2, cy2, toX, toY);
      ctx.stroke();
      
      if (conn.showArrow) {
        const angle = Math.atan2(toY - cy2, toX - cx2);
        ctx.fillStyle = conn.color || '#666';
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - 10 * Math.cos(angle - Math.PI / 6), toY - 10 * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(toX - 10 * Math.cos(angle + Math.PI / 6), toY - 10 * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      }
    });
    
    // Draw events
    events.forEach(event => {
      const x = (event.x / 100) * rect.width;
      const y = event.layer * layerHeight + 20;
      
      ctx.fillStyle = event.color || '#fff';
      ctx.strokeStyle = event.borderColor || '#333';
      ctx.lineWidth = 2;
      const boxWidth = 110;
      const boxHeight = 40;
      ctx.fillRect(x - boxWidth / 2, y, boxWidth, boxHeight);
      ctx.strokeRect(x - boxWidth / 2, y, boxWidth, boxHeight);
      
      ctx.fillStyle = '#000';
      ctx.font = event.style === 'italic' ? 'italic 10px sans-serif' : '10px sans-serif';
      ctx.textAlign = 'center';
      const words = event.label.split(' ');
      let line = '';
      let lineY = y + 15;
      words.forEach((word, i) => {
        const testLine = line + word + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > boxWidth - 10 && i > 0) {
          ctx.fillText(line, x, lineY);
          line = word + ' ';
          lineY += 12;
        } else {
          line = testLine;
        }
      });
      ctx.fillText(line, x, lineY);
    });
    
    // Draw year markers
    const markerY = rect.height - 48;
    ctx.strokeStyle = '#9ca3af';
    ctx.beginPath();
    ctx.moveTo(0, markerY);
    ctx.lineTo(rect.width, markerY);
    ctx.stroke();
    
    for (let i = 0; i <= Math.ceil(yearSpan / 5); i++) {
      const year = startYear + i * 5;
      if (year > endYear) break;
      const x = (yearToX(year) / 100) * rect.width;
      ctx.strokeStyle = '#9ca3af';
      ctx.beginPath();
      ctx.moveTo(x, markerY);
      ctx.lineTo(x, markerY + 8);
      ctx.stroke();
      
      ctx.fillStyle = '#4b5563';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(year.toString(), x, markerY + 20);
    }
    
    // Draw trends
    trends.forEach((trend, i) => {
      const x = (yearToX(trend.startYear) / 100) * rect.width;
      const width = ((yearToX(trend.endYear) - yearToX(trend.startYear)) / 100) * rect.width;
      const y = rect.height - 64 - (i * 8);
      
      ctx.fillStyle = trend.color || '#666666';
      ctx.globalAlpha = 0.8;
      ctx.fillRect(x, y, width, 24);
      ctx.globalAlpha = 1;
      
      ctx.fillStyle = '#fff';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(trend.label, x + width / 2, y + 15);
    });
    
    // Convert canvas to PDF using jsPDF via CDN
    const imgData = canvas.toDataURL('image/png');
    
    // Create PDF with jsPDF
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => {
      const { jsPDF } = (window as unknown as { jspdf: { jsPDF: new (...args: unknown[]) => { addImage: (...a: unknown[]) => void; save: (n: string) => void } } }).jspdf;
      const pdf = new jsPDF({
        orientation: rect.width > rect.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [rect.width, rect.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, rect.width, rect.height);
      pdf.save('timeline.pdf');
    };
    document.head.appendChild(script);
  };

  const yearToX = (year) => {
    return ((year - startYear) / yearSpan) * 100;
  };

  const handleTimelineClick = (e) => {
    if (showEventModal || e.target.closest('.event-item')) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = e.clientY - rect.top;
    
    const layer = Math.floor(y / layerHeight);
    if (layer >= layers.length) return;
    
    const year = startYear + (x / 100) * yearSpan;
    
    setEditingEvent(null);
    setShowEventModal({ x, year: Math.round(year), layer });
  };

  const handleEventClick = (e, index) => {
    e.stopPropagation();
    if (connectingFrom !== null) {
      if (connectingFrom !== index) {
        setConnectionData({ from: connectingFrom, to: index });
        setShowConnectionModal(true);
      }
      setConnectingFrom(null);
    } else {
      setSelectedEvent(index);
    }
  };

  const handleEventDragStart = (e, index) => {
    setDraggingEvent(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleEventDragOver = (e) => {
    e.preventDefault();
  };

  const handleEventDrop = (e) => {
    e.preventDefault();
    if (draggingEvent === null) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = e.clientY - rect.top;
    const layer = Math.floor(y / layerHeight);
    
    if (layer >= layers.length || layer < 0) return;
    
    const year = startYear + (x / 100) * yearSpan;
    
    setEvents(events.map((event, i) => 
      i === draggingEvent 
        ? { ...event, x, year: Math.round(year), layer }
        : event
    ));
    setDraggingEvent(null);
  };

  const getEventPosition = (eventIndex) => {
    const event = events[eventIndex];
    if (!event) return { x: 0, y: 0, side: 'right' };
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0, side: 'right' };
    
    const centerX = (event.x / 100) * rect.width;
    const centerY = event.layer * layerHeight + 50;
    
    return {
      x: centerX,
      y: centerY,
      centerX,
      centerY
    };
  };

  return (
    <div className="w-full h-screen bg-gray-50 flex flex-col">
      {/* Toolbar */}
      <div className="bg-white border-b p-4 flex gap-2 flex-wrap">
        <button onClick={() => setShowLayerModal(true)} className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2">
          <Plus size={16} /> Add Layer
        </button>
        <button onClick={() => setShowEventModal(true)} className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2">
          <Plus size={16} /> Add Event
        </button>
        <button onClick={() => setShowColumnModal(true)} className="px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 flex items-center gap-2">
          <Plus size={16} /> Add Column
        </button>
        <button onClick={() => setShowTrendModal(true)} className="px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 flex items-center gap-2">
          <Plus size={16} /> Add Trend ({trends.length}/4)
        </button>
        <div className="relative ml-auto">
          <button 
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="px-3 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 flex items-center gap-2"
          >
            <Download size={16} /> Export
          </button>
          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow-lg z-50">
              <button
                onClick={() => {
                  exportAsJSON();
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                Export as JSON
              </button>
              <button
                onClick={() => {
                  exportAsPNG();
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                Export as PNG
              </button>
              <button
                onClick={() => {
                  exportAsPDF();
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                Export as PDF
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm">Start:</label>
          <input 
            type="number" 
            value={startYear} 
            onChange={(e) => setStartYear(Number(e.target.value))}
            className="w-20 px-2 py-1 border rounded"
          />
          <label className="text-sm">End:</label>
          <input 
            type="number" 
            value={endYear} 
            onChange={(e) => setEndYear(Number(e.target.value))}
            className="w-20 px-2 py-1 border rounded"
          />
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-auto p-8">
        <div 
          ref={timelineRef}
          className="relative bg-white border rounded shadow-lg"
          style={{ height: timelineHeight, minWidth: '1200px' }}
          onClick={handleTimelineClick}
          onDragOver={handleEventDragOver}
          onDrop={handleEventDrop}
        >
          {/* SVG for connections */}
          <svg 
            ref={svgRef}
            className="absolute inset-0 pointer-events-none"
            style={{ width: '100%', height: '100%' }}
          >
            <defs>
              {connections.map((conn, i) => (
                <marker
                  key={`marker-${i}`}
                  id={`arrowhead-${i}`}
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3, 0 6" fill={conn.color || '#666'} />
                </marker>
              ))}
            </defs>
            {connections.map((conn, i) => {
              const from = getEventPosition(conn.from);
              const to = getEventPosition(conn.to);
              
              // Determine which side each event should connect from
              const fromSide = from.x < to.x ? 'right' : 'left';
              const toSide = from.x < to.x ? 'left' : 'right';
              
              // Calculate connection points on the sides of events
              const eventWidth = 60; // half the approximate event width
              const fromX = fromSide === 'right' ? from.x + eventWidth : from.x - eventWidth;
              const toX = toSide === 'left' ? to.x - eventWidth : to.x + eventWidth;
              const fromY = from.y;
              const toY = to.y;
              
              // Calculate control points for S-curve
              const dx = toX - fromX;
              const cx1 = fromX + dx * 0.5;
              const cy1 = fromY;
              const cx2 = fromX + dx * 0.5;
              const cy2 = toY;
              
              const path = `M ${fromX} ${fromY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${toX} ${toY}`;
              
              return (
                <path
                  key={i}
                  d={path}
                  stroke={conn.color || '#666'}
                  strokeWidth={conn.width || 2}
                  strokeDasharray={
                    conn.lineStyle === 'dashed' ? '5,5' : 
                    conn.lineStyle === 'dotted' ? '2,3' : '0'
                  }
                  fill="none"
                  markerEnd={conn.showArrow ? `url(#arrowhead-${i})` : 'none'}
                />
              );
            })}
          </svg>

          {/* Columns */}
          {columns.map((col, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 bg-gray-100 border-x border-gray-300 opacity-50"
              style={{
                left: `${yearToX(col.startYear)}%`,
                width: `${yearToX(col.endYear) - yearToX(col.startYear)}%`
              }}
            >
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-sm font-semibold text-gray-700 whitespace-nowrap">
                {col.label}
              </div>
            </div>
          ))}

          {/* Layers */}
          {layers.map((layer, i) => (
            <div
              key={i}
              className="absolute border-b border-gray-300"
              style={{
                top: i * layerHeight,
                left: 0,
                right: 0,
                height: layerHeight
              }}
            >
              <div className="absolute left-2 top-2 font-semibold text-sm text-gray-700 max-w-[150px] leading-tight">
                {layer}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeLayer(i);
                  }}
                  className="ml-2 text-red-500 hover:text-red-700"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}

          {/* Year markers */}
          <div className="absolute bottom-0 left-0 right-0 h-12 border-t border-gray-400">
            {Array.from({ length: Math.ceil(yearSpan / 5) + 1 }, (_, i) => {
              const year = startYear + i * 5;
              if (year > endYear) return null;
              return (
                <div
                  key={year}
                  className="absolute text-xs text-gray-600"
                  style={{ left: `${yearToX(year)}%`, transform: 'translateX(-50%)' }}
                >
                  <div className="h-2 w-px bg-gray-400 mx-auto"></div>
                  {year}
                </div>
              );
            })}
          </div>

          {/* Events */}
          {events.map((event, i) => (
            <div
              key={i}
              draggable
              onDragStart={(e) => handleEventDragStart(e, i)}
              onClick={(e) => handleEventClick(e, i)}
              className={`event-item absolute cursor-move ${
                selectedEvent === i ? 'ring-2 ring-blue-500' : ''
              } ${connectingFrom === i ? 'ring-2 ring-green-500' : ''}`}
              style={{
                left: `${event.x}%`,
                top: `${event.layer * layerHeight + 20}px`,
                transform: 'translateX(-50%)',
                maxWidth: '120px'
              }}
            >
              <div className={`px-3 py-2 rounded shadow-md text-xs text-center border-2 ${
                event.style === 'italic' ? 'italic' : ''
              }`}
              style={{ 
                backgroundColor: event.color || '#fff',
                borderColor: event.borderColor || '#333'
              }}>
                {event.label}
              </div>
              {selectedEvent === i && (
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 flex gap-1 bg-white rounded shadow-lg p-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConnectingFrom(i);
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                    title="Create connection"
                  >
                    <Link2 size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingEvent(i);
                      setShowEventModal(event);
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                    title="Edit"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteEvent(i);
                    }}
                    className="p-1 hover:bg-gray-100 rounded text-red-500"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Trends */}
          <div className="absolute left-0 right-0 bottom-16 h-8">
            {trends.map((trend, i) => (
              <div
                key={i}
                className="absolute h-6 text-white text-xs flex items-center justify-center opacity-80"
                style={{
                  left: `${yearToX(trend.startYear)}%`,
                  width: `${yearToX(trend.endYear) - yearToX(trend.startYear)}%`,
                  bottom: `${i * 8}px`,
                  backgroundColor: trend.color || '#666666'
                }}
              >
                {trend.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Layer Modal */}
      {showLayerModal && (
        <Modal onClose={() => setShowLayerModal(false)} title="Add Layer">
          <input
            type="text"
            placeholder="Layer name"
            className="w-full px-3 py-2 border rounded"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.target as HTMLInputElement).value) {
                addLayer((e.target as HTMLInputElement).value);
              }
            }}
          />
          <button
            onClick={(e) => {
              const input = (e.target as HTMLElement).closest('div')?.querySelector('input') as HTMLInputElement | null;
              if (input?.value) addLayer(input.value);
            }}
            className="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Add
          </button>
        </Modal>
      )}

      {/* Event Modal */}
      {showEventModal && (
        <EventModal
          onClose={() => {
            setShowEventModal(false);
            setEditingEvent(null);
          }}
          onSave={addEvent}
          layers={layers}
          startYear={startYear}
          endYear={endYear}
          initialData={editingEvent !== null ? events[editingEvent] : showEventModal}
        />
      )}

      {/* Column Modal */}
      {showColumnModal && (
        <ColumnModal
          onClose={() => setShowColumnModal(false)}
          onSave={addColumn}
          startYear={startYear}
          endYear={endYear}
        />
      )}

      {/* Trend Modal */}
      {showTrendModal && (
        <TrendModal
          onClose={() => setShowTrendModal(false)}
          onSave={addTrend}
          startYear={startYear}
          endYear={endYear}
        />
      )}

      {/* Connection Modal */}
      {showConnectionModal && connectionData && (
        <ConnectionModal
          onClose={() => {
            setShowConnectionModal(false);
            setConnectionData(null);
          }}
          onSave={addConnection}
          from={connectionData.from}
          to={connectionData.to}
        />
      )}
    </div>
  );
};

const Modal = ({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <X size={20} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const EventModal = ({ onClose, onSave, layers, startYear, endYear, initialData }: {
  onClose: () => void;
  onSave: (data: TimelineEvent) => void;
  layers: string[];
  startYear: number;
  endYear: number;
  initialData?: Partial<TimelineEvent>;
}) => {
  const [label, setLabel] = useState(initialData?.label || '');
  const [year, setYear] = useState(initialData?.year || Math.round((startYear + endYear) / 2));
  const [layer, setLayer] = useState(initialData?.layer || 0);
  const [color, setColor] = useState(initialData?.color || '#ffffff');
  const [borderColor, setBorderColor] = useState(initialData?.borderColor || '#333333');
  const [style, setStyle] = useState(initialData?.style || 'normal');

  const handleSave = () => {
    const x = ((year - startYear) / (endYear - startYear)) * 100;
    onSave({ label, year, layer, x, color, borderColor, style });
  };

  return (
    <Modal onClose={onClose} title={initialData?.label ? "Edit Event" : "Add Event"}>
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Event label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full px-3 py-2 border rounded"
        />
        <div>
          <label className="block text-sm mb-1">Year</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            min={startYear}
            max={endYear}
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Layer</label>
          <select
            value={layer}
            onChange={(e) => setLayer(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded"
          >
            {layers.map((l, i) => (
              <option key={i} value={i}>{l}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm mb-1">Background</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full h-10 border rounded"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm mb-1">Border</label>
            <input
              type="color"
              value={borderColor}
              onChange={(e) => setBorderColor(e.target.value)}
              className="w-full h-10 border rounded"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Style</label>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="normal">Normal</option>
            <option value="italic">Italic</option>
          </select>
        </div>
        <button
          onClick={handleSave}
          disabled={!label}
          className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
        >
          {initialData?.label ? 'Update' : 'Add'} Event
        </button>
      </div>
    </Modal>
  );
};

const ColumnModal = ({ onClose, onSave, startYear, endYear }: {
  onClose: () => void;
  onSave: (data: Column) => void;
  startYear: number;
  endYear: number;
}) => {
  const [label, setLabel] = useState('');
  const [colStartYear, setColStartYear] = useState(startYear);
  const [colEndYear, setColEndYear] = useState(endYear);

  return (
    <Modal onClose={onClose} title="Add Column">
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Column label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full px-3 py-2 border rounded"
        />
        <div>
          <label className="block text-sm mb-1">Start Year</label>
          <input
            type="number"
            value={colStartYear}
            onChange={(e) => setColStartYear(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">End Year</label>
          <input
            type="number"
            value={colEndYear}
            onChange={(e) => setColEndYear(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        <button
          onClick={() => onSave({ label, startYear: colStartYear, endYear: colEndYear })}
          disabled={!label}
          className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-300"
        >
          Add Column
        </button>
      </div>
    </Modal>
  );
};

const TrendModal = ({ onClose, onSave, startYear, endYear }: {
  onClose: () => void;
  onSave: (data: Trend) => void;
  startYear: number;
  endYear: number;
}) => {
  const [label, setLabel] = useState('');
  const [trendStartYear, setTrendStartYear] = useState(startYear);
  const [trendEndYear, setTrendEndYear] = useState(endYear);
  const [color, setColor] = useState('#666666');

  return (
    <Modal onClose={onClose} title="Add Trend">
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Trend label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full px-3 py-2 border rounded"
        />
        <div>
          <label className="block text-sm mb-1">Start Year</label>
          <input
            type="number"
            value={trendStartYear}
            onChange={(e) => setTrendStartYear(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">End Year</label>
          <input
            type="number"
            value={trendEndYear}
            onChange={(e) => setTrendEndYear(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Color</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-full h-10 border rounded"
          />
        </div>
        <button
          onClick={() => onSave({ label, startYear: trendStartYear, endYear: trendEndYear, color })}
          disabled={!label}
          className="w-full px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-300"
        >
          Add Trend
        </button>
      </div>
    </Modal>
  );
};

const ConnectionModal = ({ onClose, onSave, from, to }: {
  onClose: () => void;
  onSave: (data: Connection) => void;
  from: number;
  to: number;
}) => {
  const [color, setColor] = useState('#666666');
  const [lineStyle, setLineStyle] = useState('solid');
  const [width, setWidth] = useState(2);
  const [showArrow, setShowArrow] = useState(true);

  return (
    <Modal onClose={onClose} title="Connection Settings">
      <div className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Line Color</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-full h-10 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Line Style</label>
          <select
            value={lineStyle}
            onChange={(e) => setLineStyle(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
            <option value="dotted">Dotted</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Line Width: {width}px</label>
          <input
            type="range"
            min="1"
            max="6"
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="showArrow"
            checked={showArrow}
            onChange={(e) => setShowArrow(e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="showArrow" className="text-sm">Show Arrowhead</label>
        </div>
        <button
          onClick={() => onSave({ from, to, color, lineStyle, width, showArrow })}
          className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Create Connection
        </button>
      </div>
    </Modal>
  );
};

export default complexity_timeline;
