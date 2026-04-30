"use client"

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Plus, Move, Link2, Trash2, Edit2, GripVertical, Download, ChevronLeft, ChevronRight, Minus, PlusCircle } from 'lucide-react';

const DEFAULT_PIXELS_PER_YEAR = 100;
const MIN_YEAR_WIDTH = 50;

const ComplexityTimeline = () => {
  const [layers, setLayers] = useState([]);
  const [startYear, setStartYear] = useState(2008);
  const [endYear, setEndYear] = useState(2025);
  const [events, setEvents] = useState([]);
  const [connections, setConnections] = useState([]);
  const [columns, setColumns] = useState([]);
  const [trends, setTrends] = useState([]);
  const [yearWidths, setYearWidths] = useState({}); // { [year]: width }

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [connectingFrom, setConnectingFrom] = useState(null);
  const [draggingEvent, setDraggingEvent] = useState(null);
  const [showLayerModal, setShowLayerModal] = useState(false);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showTrendModal, setShowTrendModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [draggingLayer, setDraggingLayer] = useState(null);

  const timelineRef = useRef(null);
  const svgRef = useRef(null);
  const exportRef = useRef(null);

  const yearSpan = endYear - startYear;
  const layerHeight = 120;

  const getYearWidth = (year) => yearWidths[year] || DEFAULT_PIXELS_PER_YEAR;

  // Pre-calculate the starting pixel position for each year
  // yearOffsets[0] is start of startYear
  // yearOffsets[1] is start of startYear + 1
  const yearOffsets = useMemo(() => {
    const offsets = [50]; // Start with padding
    let currentX = 50;
    for (let i = 0; i <= yearSpan; i++) {
      const width = getYearWidth(startYear + i);
      currentX += width;
      offsets.push(currentX);
    }
    return offsets;
  }, [startYear, yearSpan, yearWidths]);

  const timelineWidth = Math.max(1200, yearOffsets[yearOffsets.length - 1] + 50);
  const timelineHeight = Math.max(600, layers.length * layerHeight + 100);

  // Helper: Convert year to pixel X coordinate using variable widths
  const getYearX = (year) => {
    if (year < startYear) return 50 - (startYear - year) * DEFAULT_PIXELS_PER_YEAR; // Fallback for out of bounds

    const yearIndex = Math.floor(year - startYear);
    if (yearIndex < 0) return 50;
    if (yearIndex >= yearOffsets.length - 1) return yearOffsets[yearOffsets.length - 1];

    const startX = yearOffsets[yearIndex];
    const width = getYearWidth(Math.floor(year));
    const fraction = year - Math.floor(year);

    return startX + fraction * width;
  };

  // Helper: Convert pixel X coordinate to year using variable widths
  const getXYear = (x) => {
    // Find the year index where offsets[i] <= x < offsets[i+1]
    let yearIndex = yearOffsets.findIndex((offset, i) => {
      if (i === yearOffsets.length - 1) return true; // fallback to last
      return x >= offset && x < yearOffsets[i + 1];
    });

    if (yearIndex === -1) {
      if (x < yearOffsets[0]) yearIndex = 0;
      else yearIndex = yearOffsets.length - 2;
    }
    // ensure we don't go out of bounds of the actual years
    if (yearIndex >= yearOffsets.length - 1) yearIndex = yearOffsets.length - 2;

    const startX = yearOffsets[yearIndex];
    const width = getYearWidth(startYear + yearIndex);
    const fraction = (x - startX) / width;

    return startYear + yearIndex + fraction;
  };

  const adjustYearWidth = (year, delta) => {
    const currentWidth = getYearWidth(year);
    const newWidth = Math.max(MIN_YEAR_WIDTH, currentWidth + delta);
    setYearWidths(prev => ({ ...prev, [year]: newWidth }));
  };

  const addLayer = (name) => {
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

  const addEvent = (eventData) => {
    // Ensure we store only the year, not the percentage x
    const cleanEventData = { ...eventData };
    delete cleanEventData.x;

    if (editingEvent !== null) {
      setEvents(events.map((e, i) => i === editingEvent ? cleanEventData : e));
      setEditingEvent(null);
    } else {
      setEvents([...events, cleanEventData]);
    }
    setShowEventModal(false);
  };

  const deleteEvent = (index) => {
    setEvents(events.filter((_, i) => i !== index));
    setConnections(connections.filter(c => c.from !== index && c.to !== index));
    setSelectedEvent(null);
  };

  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [connectionData, setConnectionData] = useState(null);

  const addConnection = (connectionSettings) => {
    setConnections([...connections, connectionSettings]);
    setConnectingFrom(null);
    setShowConnectionModal(false);
  };

  const addColumn = (columnData) => {
    setColumns([...columns, columnData]);
    setShowColumnModal(false);
  };

  const addTrend = (trendData) => {
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
      trends,
      yearWidths
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

    // Create a local helper for year calculations inside export
    // to mirror the component logic without hooks
    const localGetYearWidth = (year) => yearWidths[year] || DEFAULT_PIXELS_PER_YEAR;

    const localYearOffsets = [50];
    let currentX = 50;
    for (let i = 0; i <= yearSpan; i++) {
      const width = localGetYearWidth(startYear + i);
      currentX += width;
      localYearOffsets.push(currentX);
    }

    const localGetYearX = (year) => {
      if (year < startYear) return 50 - (startYear - year) * DEFAULT_PIXELS_PER_YEAR;
      const yearIndex = Math.floor(year - startYear);
      if (yearIndex < 0) return 50;
      if (yearIndex >= localYearOffsets.length - 1) return localYearOffsets[localYearOffsets.length - 1];

      const startX = localYearOffsets[yearIndex];
      const width = localGetYearWidth(Math.floor(year));
      const fraction = year - Math.floor(year);
      return startX + fraction * width;
    };

    // Create a canvas
    const canvas = document.createElement('canvas');
    const scale = 2; // Higher resolution
    // Use the calculated timeline dimensions
    const width = Math.max(1200, localYearOffsets[localYearOffsets.length - 1] + 50);
    const height = timelineHeight;

    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    // Fill background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    // Draw columns
    columns.forEach(col => {
      const x = localGetYearX(col.startYear);
      const colWidth = localGetYearX(col.endYear) - x;
      ctx.fillStyle = 'rgba(243, 244, 246, 0.5)';
      ctx.fillRect(x, 0, colWidth, height);
      ctx.strokeStyle = 'rgba(209, 213, 219, 1)';
      ctx.strokeRect(x, 0, colWidth, height);

      ctx.fillStyle = '#374151';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(col.label, x + colWidth / 2, 15);
    });

    // Draw layers
    layers.forEach((layer, i) => {
      const y = i * layerHeight;
      ctx.strokeStyle = '#d1d5db';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      ctx.fillStyle = '#374151';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(layer, 8, y + 15, 140);
    });

    // Draw connections
    connections.forEach(conn => {
      // Helper to get position inside export function
      const getExportEventPos = (idx) => {
        const ev = events[idx];
        if (!ev) return { x: 0, y: 0 };
        return { x: localGetYearX(ev.year), y: ev.layer * layerHeight + 50 };
      };

      const from = getExportEventPos(conn.from);
      const to = getExportEventPos(conn.to);

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
        const arrowLen = 10;
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - arrowLen * Math.cos(angle - Math.PI / 6), toY - arrowLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(toX - arrowLen * Math.cos(angle + Math.PI / 6), toY - arrowLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      }
    });

    // Draw events
    events.forEach(event => {
      const x = localGetYearX(event.year);
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
    const markerY = height - 48;
    ctx.strokeStyle = '#9ca3af';
    ctx.beginPath();
    ctx.moveTo(0, markerY);
    ctx.lineTo(width, markerY);
    ctx.stroke();

    for (let i = 0; i <= yearSpan; i++) {
      const year = startYear + i;
      const x = localGetYearX(year);
      ctx.strokeStyle = '#e5e7eb'; // Lighter for single years
      if (year % 5 === 0) ctx.strokeStyle = '#9ca3af'; // Darker for 5 years

      const tickHeight = year % 5 === 0 ? 8 : 4;

      ctx.beginPath();
      ctx.moveTo(x, markerY);
      ctx.lineTo(x, markerY + tickHeight);
      ctx.stroke();

      if (year % 5 === 0 || year === startYear || year === endYear) {
        ctx.fillStyle = '#4b5563';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(year.toString(), x, markerY + 20);
      }
    }

    // Draw trends
    trends.forEach((trend, i) => {
      const x = localGetYearX(trend.startYear);
      const trendWidth = localGetYearX(trend.endYear) - x;
      const y = height - 64 - (i * 8);

      ctx.fillStyle = trend.color || '#666666';
      ctx.globalAlpha = 0.8;
      ctx.fillRect(x, y, trendWidth, 24);
      ctx.globalAlpha = 1;

      ctx.fillStyle = '#fff';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(trend.label, x + trendWidth / 2, y + 15);
    });

    // Convert to PNG
    canvas.toBlob(blob => {
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
    const scale = 2;
    // Mirrored offset calculation for PDF
    const localGetYearWidth = (year) => yearWidths[year] || DEFAULT_PIXELS_PER_YEAR;
    const localYearOffsets = [50];
    let currentX = 50;
    for (let i = 0; i <= yearSpan; i++) {
      const width = localGetYearWidth(startYear + i);
      currentX += width;
      localYearOffsets.push(currentX);
    }
    const width = Math.max(1200, localYearOffsets[localYearOffsets.length - 1] + 50);
    const height = timelineHeight;

    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    // Reuse exportAsPNG drawing logic... (simplified here for brevity, in real app refactor to function)
    const localGetYearX = (year) => {
      if (year < startYear) return 50 - (startYear - year) * DEFAULT_PIXELS_PER_YEAR;
      const yearIndex = Math.floor(year - startYear);
      if (yearIndex < 0) return 50;
      if (yearIndex >= localYearOffsets.length - 1) return localYearOffsets[localYearOffsets.length - 1];
      const startX = localYearOffsets[yearIndex];
      const width = localGetYearWidth(Math.floor(year));
      const fraction = year - Math.floor(year);
      return startX + fraction * width;
    };

    // Fill background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    // Draw columns
    columns.forEach(col => {
      const x = localGetYearX(col.startYear);
      const colWidth = localGetYearX(col.endYear) - x;
      ctx.fillStyle = 'rgba(243, 244, 246, 0.5)';
      ctx.fillRect(x, 0, colWidth, height);
      ctx.strokeStyle = 'rgba(209, 213, 219, 1)';
      ctx.strokeRect(x, 0, colWidth, height);

      ctx.fillStyle = '#374151';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(col.label, x + colWidth / 2, 15);
    });

    // Draw layers
    layers.forEach((layer, i) => {
      const y = i * layerHeight;
      ctx.strokeStyle = '#d1d5db';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      ctx.fillStyle = '#374151';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(layer, 8, y + 15, 140);
    });

    // Draw connections
    connections.forEach(conn => {
      const getExportEventPos = (idx) => {
        const ev = events[idx];
        if (!ev) return { x: 0, y: 0 };
        return { x: localGetYearX(ev.year), y: ev.layer * layerHeight + 50 };
      };
      const from = getExportEventPos(conn.from);
      const to = getExportEventPos(conn.to);
      if (!from || !to) return;

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
      ctx.setLineDash(conn.lineStyle === 'dashed' ? [5, 5] : conn.lineStyle === 'dotted' ? [2, 3] : []);

      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.bezierCurveTo(cx1, cy1, cx2, cy2, toX, toY);
      ctx.stroke();

      if (conn.showArrow) {
        const angle = Math.atan2(toY - cy2, toX - cx2);
        ctx.fillStyle = conn.color || '#666';
        ctx.beginPath();
        const arrowLen = 10;
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - arrowLen * Math.cos(angle - Math.PI / 6), toY - arrowLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(toX - arrowLen * Math.cos(angle + Math.PI / 6), toY - arrowLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      }
    });

    // Draw events
    events.forEach(event => {
      const x = localGetYearX(event.year);
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
    const markerY = height - 48;
    ctx.strokeStyle = '#9ca3af';
    ctx.beginPath();
    ctx.moveTo(0, markerY);
    ctx.lineTo(width, markerY);
    ctx.stroke();

    for (let i = 0; i <= yearSpan; i++) {
      const year = startYear + i;
      const x = localGetYearX(year);
      ctx.strokeStyle = '#e5e7eb';
      if (year % 5 === 0) ctx.strokeStyle = '#9ca3af';

      const tickHeight = year % 5 === 0 ? 8 : 4;

      ctx.beginPath();
      ctx.moveTo(x, markerY);
      ctx.lineTo(x, markerY + tickHeight);
      ctx.stroke();

      if (year % 5 === 0 || year === startYear || year === endYear) {
        ctx.fillStyle = '#4b5563';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(year.toString(), x, markerY + 20);
      }
    }

    // Draw trends
    trends.forEach((trend, i) => {
      const x = localGetYearX(trend.startYear);
      const trendWidth = localGetYearX(trend.endYear) - x;
      const y = height - 64 - (i * 8);

      ctx.fillStyle = trend.color || '#666666';
      ctx.globalAlpha = 0.8;
      ctx.fillRect(x, y, trendWidth, 24);
      ctx.globalAlpha = 1;

      ctx.fillStyle = '#fff';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(trend.label, x + trendWidth / 2, y + 15);
    });

    // Convert canvas to PDF
    const imgData = canvas.toDataURL('image/png');
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: width > height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [width, height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, width, height);
      pdf.save('timeline.pdf');
    };
    document.head.appendChild(script);
  };

  const handleTimelineClick = (e) => {
    if (showEventModal || e.target.closest('.event-item') || e.target.closest('.year-marker-btn')) return;

    // Calculate click year based on pixel position
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + timelineRef.current.scrollLeft;
    const y = e.clientY - rect.top;

    const layer = Math.floor(y / layerHeight);
    if (layer >= layers.length) return;

    const year = getXYear(e.clientX - rect.left); // Use visual offset

    setEditingEvent(null);
    setShowEventModal({ year: Math.round(year * 10) / 10, layer }); // Round to decimal
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
    // For dropping, we care about the relative position in the container
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const layer = Math.floor(y / layerHeight);

    if (layer >= layers.length || layer < 0) return;

    const year = getXYear(x);

    setEvents(events.map((event, i) =>
      i === draggingEvent
        ? { ...event, year: Math.round(year * 10) / 10, layer }
        : event
    ));
    setDraggingEvent(null);
  };

  const getEventPosition = (eventIndex) => {
    const event = events[eventIndex];
    if (!event) return { x: 0, y: 0, side: 'right' };

    const centerX = getYearX(event.year);
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
      <div className="bg-white border-b p-4 flex gap-2 flex-wrap items-center">
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
        <div className="flex items-center gap-2 border-l pl-4 ml-4">
          <span className="text-sm font-semibold text-gray-700">Timeline Range:</span>

          <div className="flex items-center bg-gray-100 rounded p-1">
            <button onClick={() => setStartYear(startYear - 1)} className="p-1 hover:bg-gray-200 rounded text-gray-600"><ChevronLeft size={16} /></button>
            <span className="px-2 font-mono text-sm">{startYear}</span>
            <button onClick={() => setStartYear(startYear + 1)} className="p-1 hover:bg-gray-200 rounded text-gray-600"><ChevronRight size={16} /></button>
          </div>
          <span className="text-gray-400">-</span>
          <div className="flex items-center bg-gray-100 rounded p-1">
            <button onClick={() => setEndYear(endYear - 1)} className="p-1 hover:bg-gray-200 rounded text-gray-600"><ChevronLeft size={16} /></button>
            <span className="px-2 font-mono text-sm">{endYear}</span>
            <button onClick={() => setEndYear(endYear + 1)} className="p-1 hover:bg-gray-200 rounded text-gray-600"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-auto p-8 relative">
        <div
          ref={timelineRef}
          className="relative bg-white border rounded shadow-lg transition-all duration-300"
          style={{ width: `${timelineWidth}px`, height: `${timelineHeight}px` }}
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

              if (!from || !to) return null;

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
          {columns.map((col, i) => {
            const left = getYearX(col.startYear);
            const width = getYearX(col.endYear) - left;
            return (
              <div
                key={i}
                className="absolute top-0 bottom-0 bg-gray-100 border-x border-gray-300 opacity-50"
                style={{
                  left: `${left}px`,
                  width: `${width}px`
                }}
              >
                <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-sm font-semibold text-gray-700 whitespace-nowrap">
                  {col.label}
                </div>
              </div>
            );
          })}

          {/* Layers */}
          {layers.map((layer, i) => (
            <div
              key={i}
              className="absolute border-b border-gray-300 left-0 right-0"
              style={{
                top: i * layerHeight,
                height: layerHeight,
                width: '100%' // Ensure full width
              }}
            >
              <div className="sticky left-2 top-2 font-semibold text-sm text-gray-700 max-w-[150px] leading-tight z-10">
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
          <div className="absolute bottom-0 left-0 right-0 h-16 border-t border-gray-400">
            {Array.from({ length: yearSpan + 1 }, (_, i) => {
              const year = startYear + i;
              const currentX = getYearX(year);
              // We render width control at the middle of the year span
              const nextX = getYearX(year + 1);
              const yearWidth = nextX - currentX;
              const midX = currentX + yearWidth / 2;

              return (
                <React.Fragment key={year}>
                  {/* Tick mark */}
                  <div
                    className="absolute text-xs text-gray-600"
                    style={{ left: `${currentX}px`, transform: 'translateX(-50%)' }}
                  >
                    <div className={`w-px bg-gray-400 mx-auto ${year % 5 === 0 ? 'h-3' : 'h-1'}`}></div>
                    {year % 5 === 0 ? <div className="mt-1">{year}</div> : null}
                  </div>

                  {/* Width Controls (visible on hover group usually, but here always for simplicity) */}
                  {i < yearSpan && (
                    <div
                      className="absolute bottom-1 flex gap-1 items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-white/80 p-1 rounded shadow-sm border"
                      style={{ left: `${midX}px`, transform: 'translateX(-50%)' }}
                    >
                      <button
                        className="p-0.5 hover:bg-gray-200 rounded text-gray-600 year-marker-btn"
                        onClick={(e) => { e.stopPropagation(); adjustYearWidth(year, -10); }}
                        title="Shrink Year"
                      >
                        <Minus size={10} />
                      </button>
                      <button
                        className="p-0.5 hover:bg-gray-200 rounded text-gray-600 year-marker-btn"
                        onClick={(e) => { e.stopPropagation(); adjustYearWidth(year, 10); }}
                        title="Expand Year"
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                  )}
                </React.Fragment>
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
              className={`event-item absolute cursor-move ${selectedEvent === i ? 'ring-2 ring-blue-500' : ''
                } ${connectingFrom === i ? 'ring-2 ring-green-500' : ''}`}
              style={{
                left: `${getYearX(event.year)}px`,
                top: `${event.layer * layerHeight + 20}px`,
                transform: 'translateX(-50%)',
                maxWidth: '120px'
              }}
            >
              <div className={`px-3 py-2 rounded shadow-md text-xs text-center border-2 ${event.style === 'italic' ? 'italic' : ''
                }`}
                style={{
                  backgroundColor: event.color || '#fff',
                  borderColor: event.borderColor || '#333'
                }}>
                {event.label}
              </div>
              {selectedEvent === i && (
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 flex gap-1 bg-white rounded shadow-lg p-1 z-20">
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
          {trends.map((trend, i) => {
            const left = getYearX(trend.startYear);
            const width = getYearX(trend.endYear) - left;
            const top = timelineHeight - 64 - (i * 28); // Dynamic positioning from bottom

            return (
              <div
                key={i}
                className="absolute rounded"
                style={{
                  left: `${left}px`,
                  width: `${width}px`,
                  top: top, // Fixed height from bottom
                  height: '24px',
                  backgroundColor: trend.color || '#666666',
                  opacity: 0.8
                }}
              >
                <div className="w-full h-full flex items-center justify-center text-xs text-white px-2 overflow-hidden whitespace-nowrap">
                  {trend.label}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modals */}
      {showLayerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4">Add New Layer</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              addLayer(e.target.layerName.value);
            }}>
              <input
                name="layerName"
                placeholder="Layer Name"
                className="w-full p-2 border rounded mb-4"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowLayerModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4">{editingEvent !== null ? 'Edit Event' : 'Add New Event'}</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              addEvent({
                label: formData.get('label'),
                year: Number(formData.get('year')),
                layer: showEventModal.layer !== undefined ? showEventModal.layer : (editingEvent !== null ? events[editingEvent].layer : 0),
                style: formData.get('style'),
                color: formData.get('color'),
                borderColor: formData.get('borderColor'),
                // Only for positioning, not persistent if we used drag
                x: 0,
              });
            }}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Event Label</label>
                <input
                  name="label"
                  defaultValue={editingEvent !== null ? events[editingEvent].label : ''}
                  className="w-full p-2 border rounded"
                  autoFocus
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Year</label>
                <input
                  name="year"
                  type="number"
                  step="0.1"
                  defaultValue={editingEvent !== null ? events[editingEvent].year : showEventModal.year}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Style</label>
                <select name="style" defaultValue={editingEvent !== null ? events[editingEvent].style : 'normal'} className="w-full p-2 border rounded">
                  <option value="normal">Normal</option>
                  <option value="italic">Italic</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Background</label>
                  <input name="color" type="color" defaultValue={editingEvent !== null ? events[editingEvent].color : '#ffffff'} className="w-full h-10 p-1 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Border</label>
                  <input name="borderColor" type="color" defaultValue={editingEvent !== null ? events[editingEvent].borderColor : '#000000'} className="w-full h-10 p-1 border rounded" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowEventModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showConnectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4">Connection Style</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              addConnection({
                ...connectionData,
                lineStyle: formData.get('lineStyle'),
                color: formData.get('color'),
                width: Number(formData.get('width')),
                showArrow: formData.get('showArrow') === 'on'
              });
            }}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Line Style</label>
                <select name="lineStyle" defaultValue="solid" className="w-full p-2 border rounded">
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Color</label>
                <input name="color" type="color" defaultValue="#666666" className="w-full h-10 p-1 border rounded" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Width</label>
                <input name="width" type="range" min="1" max="10" defaultValue="2" className="w-full" />
              </div>
              <div className="mb-4 flex items-center gap-2">
                <input name="showArrow" type="checkbox" id="showArrow" defaultChecked />
                <label htmlFor="showArrow" className="text-sm font-medium text-gray-700">Show Arrow</label>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowConnectionModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Connect</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showColumnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4">Add Column</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              addColumn({
                label: formData.get('label'),
                startYear: Number(formData.get('startYear')),
                endYear: Number(formData.get('endYear'))
              });
            }}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Label</label>
                <input name="label" required className="w-full p-2 border rounded" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Year</label>
                  <input name="startYear" type="number" defaultValue={startYear} required className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Year</label>
                  <input name="endYear" type="number" defaultValue={endYear} required className="w-full p-2 border rounded" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowColumnModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTrendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4">Add Trend</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              addTrend({
                label: formData.get('label'),
                startYear: Number(formData.get('startYear')),
                endYear: Number(formData.get('endYear')),
                color: formData.get('color')
              });
            }}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Label</label>
                <input name="label" required className="w-full p-2 border rounded" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Year</label>
                  <input name="startYear" type="number" defaultValue={startYear} required className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Year</label>
                  <input name="endYear" type="number" defaultValue={endYear} required className="w-full p-2 border rounded" />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Color</label>
                <input name="color" type="color" defaultValue="#666666" className="w-full h-10 p-1 border rounded" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowTrendModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplexityTimeline;
