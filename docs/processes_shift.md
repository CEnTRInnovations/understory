# Design Handoff: Refactor Understory from Timeline Editor to Historical Process Mapping Tool

## Project Goal

Refactor the current `ComplexityTimeline` React component into a client-side historical process mapping tool inspired by Peter Taylor’s diagrams in *Unruly Complexity*.

The core conceptual shift is:

> History should be modeled primarily as interacting processes over time, not as a dense list of point events.

Events still matter, but they should function as evidence, anchors, or markers within longer-running processes. The tool should support three coordinated views generated from the same local dataset:

1. **Process View** — the primary view; Taylor-style intersecting processes over time.
2. **Institutional Timeline View** — simplified chronological periodization with selected anchor events.
3. **Influence Map View** — causal/influence diagram using labeled relationship verbs.

The app should remain fully client-side for now. No backend. Use React state plus browser storage/export/import.

---

## Current Starting Point

The current component already includes:

* React state for:

  * `layers`
  * `events`
  * `connections`
  * `columns`
  * `trends`
* Modal workflows for adding layers, events, columns, trends, and connections.
* Export support for JSON, PNG, and PDF.
* SVG rendering for connections.
* Absolute-positioned timeline layout.

The current data model is event-centered. The refactor should make it process-centered.

---

# 1. Conceptual Model

## Replace “Trends” with “Processes”

Rename the current idea of `Trend` to `Process`.

A process is a long-running historical strand that continues through time, such as:

* Urban Mission & Civic Identity
* Pedagogy & Engaged Learning
* Neighborhood Partnerships & Community Work
* Scholarship & Public Knowledge
* Institutional Infrastructure
* Assessment, Recognition & Impact

Each process should appear as a horizontal line or arrow across the timeline. The arrow indicates that the process continues over time.

## Events Become Anchors

Events are no longer the primary visual objects. They should be smaller markers attached to a process.

Example:

Process:

> Scholarship & Public Knowledge, 1990s–present

Anchor events:

* 2004 — First Public Scholar faculty hire
* 2015 — Public Scholars Working Group
* 2018 — Public scholarship rubric developed
* 2019 — ENGAGE! launched

## Interactions Become Dotted Cross-Process Links

An interaction is a connection between two processes or two process markers.

Dotted lines indicate cross-process influence, alignment, reinforcement, or transformation.

Each interaction should have a verb, such as:

* enables
* formalizes
* legitimizes
* documents
* extends
* reframes
* responds to
* creates conditions for
* makes visible
* institutionalizes
* amplifies

The app should discourage unlabeled causal links. A line without a verb is too ambiguous.

---

# 2. Recommended Data Model

Refactor toward one canonical document object.

```ts
type UnderstoryDocument = {
  title: string;
  subtitle?: string;
  startYear: number;
  endYear: number;
  eras: Era[];
  processDomains: ProcessDomain[];
  processes: HistoricalProcess[];
  anchors: AnchorEvent[];
  interactions: ProcessInteraction[];
  sources: SourceNote[];
  settings: DisplaySettings;
};
```

## Era

Eras are non-overlapping background columns.

```ts
type Era = {
  id: string;
  label: string;
  startYear: number;
  endYear: number;
  color?: string;
  description?: string;
};
```

Example eras:

```ts
[
  {
    id: "foundational-urban-roots",
    label: "Foundational Urban Roots",
    startYear: 1968,
    endYear: 1992
  },
  {
    id: "codifying-engagement",
    label: "Codifying Engagement",
    startYear: 1993,
    endYear: 2005
  },
  {
    id: "institutionalization-recognition",
    label: "Institutionalization & Recognition",
    startYear: 2006,
    endYear: 2021
  },
  {
    id: "realignment-impact",
    label: "Realignment & Impact Infrastructure",
    startYear: 2022,
    endYear: 2026
  }
]
```

## Process Domain

A process domain is a horizontal row.

```ts
type ProcessDomain = {
  id: string;
  label: string;
  shortLabel?: string;
  color: string;
  icon?: string;
  order: number;
  description?: string;
};
```

Suggested domains:

```ts
[
  {
    id: "urban-mission",
    label: "Urban Mission & Civic Identity",
    color: "#4E342E",
    order: 1
  },
  {
    id: "pedagogy",
    label: "Pedagogy & Engaged Learning",
    color: "#BC7A5A",
    order: 2
  },
  {
    id: "neighborhood",
    label: "Neighborhood Partnerships & Community Work",
    color: "#4B7F52",
    order: 3
  },
  {
    id: "scholarship",
    label: "Scholarship & Public Knowledge",
    color: "#3F5E78",
    order: 4
  },
  {
    id: "infrastructure",
    label: "Institutional Infrastructure",
    color: "#A64B42",
    order: 5
  },
  {
    id: "recognition",
    label: "Assessment, Recognition & Impact",
    color: "#6A5ACD",
    order: 6
  }
]
```

## Historical Process

A process is a segment within a domain. A domain may contain one long process or multiple sequential process segments.

```ts
type HistoricalProcess = {
  id: string;
  domainId: string;
  label: string;
  startYear: number;
  endYear?: number;
  continues?: boolean;
  description?: string;
  importance?: "primary" | "secondary" | "context";
};
```

Example:

```ts
{
  id: "public-scholarship",
  domainId: "scholarship",
  label: "Public Scholarship",
  startYear: 2004,
  endYear: 2026,
  continues: true,
  importance: "primary"
}
```

## Anchor Event

Anchor events are evidence points attached to a process.

```ts
type AnchorEvent = {
  id: string;
  label: string;
  year: number;
  processId: string;
  domainId: string;
  importance: "major" | "supporting" | "context";
  description?: string;
  sourceIds?: string[];
  confidence?: "confirmed" | "probable" | "needs-verification";
  visibleLabel?: boolean;
};
```

Use `visibleLabel` to decide whether the label appears directly on the map. Minor events can appear as numbered dots with details in a side panel or event key.

## Process Interaction

Interactions are cross-process links. They should be dotted by default.

```ts
type ProcessInteraction = {
  id: string;
  fromId: string;
  toId: string;
  fromType: "process" | "anchor";
  toType: "process" | "anchor";
  year?: number;
  verb: string;
  description?: string;
  strength?: "strong" | "moderate" | "contextual";
  sourceIds?: string[];
  confidence?: "confirmed" | "probable" | "interpretive";
  visible?: boolean;
};
```

Example:

```ts
{
  id: "carnegie-to-collaboratory",
  fromId: "carnegie-2006",
  fromType: "anchor",
  toId: "collaboratory-2017",
  toType: "anchor",
  verb: "creates documentation pressure for",
  strength: "moderate",
  confidence: "interpretive"
}
```

## Source Note

```ts
type SourceNote = {
  id: string;
  label: string;
  citation?: string;
  url?: string;
  note?: string;
};
```

## Display Settings

```ts
type DisplaySettings = {
  activeView: "process" | "timeline" | "influence";
  showEras: boolean;
  showMinorAnchors: boolean;
  showInteractionLabels: boolean;
  showOnlyMajorInteractions: boolean;
  exportTheme: "light" | "dark" | "print";
};
```

---

# 3. View 1: Process View

This is the primary Taylor-inspired view.

## Purpose

Answer:

> What interacting historical processes shaped community-engaged scholarship at IU Indianapolis?

## Layout

* X-axis: time.
* Y-axis: process domains.
* Background: lightly shaded eras.
* Each row: one process domain.
* Each process: horizontal arrow or line segment.
* Anchor events: small dots on the process line.
* Dotted curves: interactions across process rows.
* Labels: only for major anchor events and process shifts.

## Visual Grammar

* Solid horizontal arrow = process continues over time.
* Dot on arrow = anchor event.
* Dotted line between rows = interaction across processes.
* Arrowhead on process line = ongoing process.
* Dotted link with arrowhead = directional influence.
* Dotted link without arrowhead = mutual or contextual connection.

## Required Controls

Add view controls:

* View selector: Process / Timeline / Influence
* Toggle: Show/hide eras
* Toggle: Show/hide minor anchors
* Toggle: Show/hide interaction labels
* Toggle: Show only major interactions
* Export current view

## Rendering Guidance

Use SVG for the process map rather than absolute HTML boxes.

Recommended structure:

```tsx
<svg>
  <EraBands />
  <TimeAxis />
  <ProcessRows />
  <ProcessLines />
  <AnchorMarkers />
  <InteractionLinks />
  <Labels />
</svg>
```

Avoid putting all labels on the canvas. Use tooltips or an inspector panel for details.

---

# 4. View 2: Institutional Timeline View

This is not a dense timeline. It is a periodization view.

## Purpose

Answer:

> When did the major institutional eras change?

## Layout

Use four large era columns with a small number of selected anchor events.

Recommended eras:

1. Foundational Urban Roots, 1968–1992
2. Codifying Engagement, 1993–2005
3. Institutionalization & Recognition, 2006–2021
4. Realignment & Impact Infrastructure, 2022–present

## Visual Grammar

* One column per era.
* 3–6 major events per era.
* No causal arcs.
* No dense event clutter.
* Events can be shown as a vertical list within each era.

## Event Selection Logic

Show only anchors where:

```ts
importance === "major"
```

or where the user manually toggles visibility.

This view should not attempt to show all events.

## Suggested Visual Layout

```text
| Foundational Urban Roots | Codifying Engagement | Institutionalization & Recognition | Realignment & Impact Infrastructure |
|--------------------------|----------------------|------------------------------------|-------------------------------------|
| 1968 Lugar civic call    | 1993 OSL             | 2006 Carnegie                      | 2024 IU Indianapolis                |
| 1969 IUPUI established   | 1994 CSL             | 2014/15 OCE                        | 2025/26 Carnegie renewal            |
| 1987 Philanthropy        | 1997 WESCO/ONR       | 2017 Collaboratory                 | CEnTR / impact infrastructure       |
|                          | 2004 Public Scholar  | 2019 ENGAGE!                       |                                     |
```

---

# 5. View 3: Influence Map View

This is the causal/influence view.

## Purpose

Answer:

> How did major processes shape and reinforce one another?

## Layout

* No strict time axis.
* Nodes are domains or major processes.
* Edges are labeled with verbs.
* Use a simple directed graph layout.
* Keep this view sparse: 8–15 nodes.

## Visual Grammar

* Rectangular node = process/domain.
* Solid arrow = strong influence.
* Dashed arrow = moderate influence.
* Dotted arrow = contextual relationship.
* Edge label = relationship verb.

## Required Edge Labels

Do not allow unlabeled influence lines. The connection modal should require a verb.

Suggested verbs:

```ts
const relationshipVerbs = [
  "creates conditions for",
  "enables",
  "formalizes",
  "legitimizes",
  "documents",
  "extends",
  "reframes",
  "responds to",
  "makes visible",
  "institutionalizes",
  "amplifies",
  "sustains"
];
```

---

# 6. UI Changes

## Rename Existing Buttons

Current:

* Add Layer
* Add Event
* Add Column
* Add Trend

New:

* Add Domain
* Add Anchor
* Add Era
* Add Process
* Add Interaction

## Add View Switcher

At the top toolbar:

```tsx
<button>Process View</button>
<button>Timeline View</button>
<button>Influence Map</button>
```

Store current view in:

```ts
documentData.settings.activeView
```

## Add Inspector Panel

When selecting a process, anchor, or interaction, show an inspector panel with:

* label
* years
* domain/process
* description
* importance
* confidence
* source notes
* visible label toggle

This is preferable to putting every detail on the visual canvas.

---

# 7. Client-Side Persistence

Keep everything client-side.

## Local Storage

Auto-save the current document to localStorage.

```ts
useEffect(() => {
  localStorage.setItem("understory-document", JSON.stringify(documentData));
}, [documentData]);
```

On load:

```ts
const saved = localStorage.getItem("understory-document");
if (saved) setDocumentData(JSON.parse(saved));
```

## JSON Import/Export

Keep JSON export, but update it to export the entire `UnderstoryDocument`.

Add JSON import so users can reload or share a project file.

---

# 8. Export Requirements

Keep PNG and PDF export, but export the active view.

Later improvement: add SVG export.

Recommended export options:

* Export active view as PNG
* Export active view as SVG
* Export active view as PDF
* Export data as JSON
* Import data from JSON

For PDF export, avoid loading jsPDF from CDN dynamically if possible. Prefer installing it as a package if this is in a Vite/React project.

---

# 9. Visual Design

Use muted earth-tone colors.

Suggested process colors:

```ts
const processColors = {
  urbanMission: "#4E342E",
  pedagogy: "#BC7A5A",
  neighborhood: "#4B7F52",
  scholarship: "#3F5E78",
  infrastructure: "#A64B42",
  recognition: "#6A5ACD"
};
```

Background:

```ts
const colors = {
  background: "#F2ECD7",
  foreground: "#4A4A4A",
  grid: "#D2BDA3",
  mutedText: "#6B625A"
};
```

Design priorities:

* High text contrast.
* Fewer labels on the canvas.
* More detail in tooltips/inspector.
* De-emphasized gridlines.
* Era bands should be subtle.
* Interactions should be visible but not dominant.

---

# 10. Sample IU Indianapolis Seed Data

Use this as starter data for development.

```ts
const seedDocument: UnderstoryDocument = {
  title: "Intersecting Processes in the Development of Community-Engaged Scholarship at IU Indianapolis",
  subtitle: "A Taylor-inspired process map",
  startYear: 1968,
  endYear: 2026,
  eras: [
    {
      id: "foundational",
      label: "Foundational Urban Roots",
      startYear: 1968,
      endYear: 1992,
      color: "#D2BDA3"
    },
    {
      id: "codifying",
      label: "Codifying Engagement",
      startYear: 1993,
      endYear: 2005,
      color: "#BC7A5A"
    },
    {
      id: "institutionalization",
      label: "Institutionalization & Recognition",
      startYear: 2006,
      endYear: 2021,
      color: "#4B7F52"
    },
    {
      id: "realignment",
      label: "Realignment & Impact Infrastructure",
      startYear: 2022,
      endYear: 2026,
      color: "#3F5E78"
    }
  ],
  processDomains: [
    {
      id: "urban",
      label: "Urban Mission & Civic Identity",
      color: "#4E342E",
      order: 1
    },
    {
      id: "pedagogy",
      label: "Pedagogy & Engaged Learning",
      color: "#BC7A5A",
      order: 2
    },
    {
      id: "neighborhood",
      label: "Neighborhood Partnerships & Community Work",
      color: "#4B7F52",
      order: 3
    },
    {
      id: "scholarship",
      label: "Scholarship & Public Knowledge",
      color: "#3F5E78",
      order: 4
    },
    {
      id: "infrastructure",
      label: "Institutional Infrastructure",
      color: "#A64B42",
      order: 5
    },
    {
      id: "recognition",
      label: "Assessment, Recognition & Impact",
      color: "#6A5ACD",
      order: 6
    }
  ],
  processes: [
    {
      id: "urban-mission",
      domainId: "urban",
      label: "Urban Mission",
      startYear: 1968,
      endYear: 2026,
      continues: true,
      importance: "primary"
    },
    {
      id: "engaged-pedagogy",
      domainId: "pedagogy",
      label: "Engaged Pedagogy",
      startYear: 1993,
      endYear: 2026,
      continues: true,
      importance: "primary"
    },
    {
      id: "neighborhood-partnerships",
      domainId: "neighborhood",
      label: "Neighborhood Partnerships",
      startYear: 1997,
      endYear: 2026,
      continues: true,
      importance: "primary"
    },
    {
      id: "public-scholarship",
      domainId: "scholarship",
      label: "Public Scholarship",
      startYear: 2004,
      endYear: 2026,
      continues: true,
      importance: "primary"
    },
    {
      id: "institutional-infrastructure",
      domainId: "infrastructure",
      label: "Institutional Infrastructure",
      startYear: 1994,
      endYear: 2026,
      continues: true,
      importance: "primary"
    },
    {
      id: "recognition-impact",
      domainId: "recognition",
      label: "Recognition & Impact Systems",
      startYear: 2006,
      endYear: 2026,
      continues: true,
      importance: "primary"
    }
  ],
  anchors: [
    {
      id: "lugar-1968",
      label: "Mayor Lugar calls for urban university",
      year: 1968,
      processId: "urban-mission",
      domainId: "urban",
      importance: "major",
      confidence: "confirmed",
      visibleLabel: true
    },
    {
      id: "iupui-1969",
      label: "IUPUI established",
      year: 1969,
      processId: "urban-mission",
      domainId: "urban",
      importance: "major",
      confidence: "confirmed",
      visibleLabel: true
    },
    {
      id: "philanthropy-1987",
      label: "Center on Philanthropy established",
      year: 1987,
      processId: "urban-mission",
      domainId: "urban",
      importance: "supporting",
      confidence: "confirmed",
      visibleLabel: false
    },
    {
      id: "osl-1993",
      label: "Office of Service-Learning established",
      year: 1993,
      processId: "engaged-pedagogy",
      domainId: "pedagogy",
      importance: "major",
      confidence: "confirmed",
      visibleLabel: true
    },
    {
      id: "csl-1994",
      label: "Center for Service and Learning established",
      year: 1994,
      processId: "institutional-infrastructure",
      domainId: "infrastructure",
      importance: "major",
      confidence: "confirmed",
      visibleLabel: true
    },
    {
      id: "wesco-1997",
      label: "WESCO partnership",
      year: 1997,
      processId: "neighborhood-partnerships",
      domainId: "neighborhood",
      importance: "major",
      confidence: "confirmed",
      visibleLabel: true
    },
    {
      id: "onr-1997",
      label: "Office of Neighborhood Resources established",
      year: 1997,
      processId: "institutional-infrastructure",
      domainId: "infrastructure",
      importance: "major",
      confidence: "confirmed",
      visibleLabel: false
    },
    {
      id: "gwchs-2000",
      label: "George Washington Community High School reopens",
      year: 2000,
      processId: "neighborhood-partnerships",
      domainId: "neighborhood",
      importance: "major",
      confidence: "confirmed",
      visibleLabel: true
    },
    {
      id: "public-scholar-2004",
      label: "First Public Scholar faculty hire",
      year: 2004,
      processId: "public-scholarship",
      domainId: "scholarship",
      importance: "major",
      confidence: "confirmed",
      visibleLabel: true
    },
    {
      id: "carnegie-2006",
      label: "Carnegie Community Engagement Classification",
      year: 2006,
      processId: "recognition-impact",
      domainId: "recognition",
      importance: "major",
      confidence: "confirmed",
      visibleLabel: true
    },
    {
      id: "oce-2014",
      label: "Office of Community Engagement consolidated",
      year: 2014,
      processId: "institutional-infrastructure",
      domainId: "infrastructure",
      importance: "major",
      confidence: "confirmed",
      visibleLabel: true
    },
    {
      id: "public-scholars-2015",
      label: "Public Scholars Working Group",
      year: 2015,
      processId: "public-scholarship",
      domainId: "scholarship",
      importance: "supporting",
      confidence: "probable",
      visibleLabel: false
    },
    {
      id: "collaboratory-2017",
      label: "Collaboratory adopted",
      year: 2017,
      processId: "institutional-infrastructure",
      domainId: "infrastructure",
      importance: "major",
      confidence: "confirmed",
      visibleLabel: true
    },
    {
      id: "rubric-2018",
      label: "Public scholarship rubric developed",
      year: 2018,
      processId: "recognition-impact",
      domainId: "recognition",
      importance: "major",
      confidence: "probable",
      visibleLabel: true
    },
    {
      id: "engage-2019",
      label: "ENGAGE! journal launched",
      year: 2019,
      processId: "public-scholarship",
      domainId: "scholarship",
      importance: "major",
      confidence: "confirmed",
      visibleLabel: true
    },
    {
      id: "iu-indianapolis-2024",
      label: "IU Indianapolis realignment",
      year: 2024,
      processId: "urban-mission",
      domainId: "urban",
      importance: "major",
      confidence: "confirmed",
      visibleLabel: true
    },
    {
      id: "centr-2024",
      label: "CEnTR ecosystem matures",
      year: 2024,
      processId: "institutional-infrastructure",
      domainId: "infrastructure",
      importance: "supporting",
      confidence: "probable",
      visibleLabel: false
    },
    {
      id: "carnegie-renewal-2026",
      label: "Carnegie renewal / impact framework",
      year: 2026,
      processId: "recognition-impact",
      domainId: "recognition",
      importance: "major",
      confidence: "needs-verification",
      visibleLabel: true
    }
  ],
  interactions: [
    {
      id: "urban-enables-pedagogy",
      fromId: "urban-mission",
      fromType: "process",
      toId: "engaged-pedagogy",
      toType: "process",
      verb: "creates civic context for",
      strength: "strong",
      confidence: "interpretive"
    },
    {
      id: "neighborhood-shapes-pedagogy",
      fromId: "neighborhood-partnerships",
      fromType: "process",
      toId: "engaged-pedagogy",
      toType: "process",
      verb: "shapes practice in",
      strength: "strong",
      confidence: "interpretive"
    },
    {
      id: "pedagogy-enables-scholarship",
      fromId: "engaged-pedagogy",
      fromType: "process",
      toId: "public-scholarship",
      toType: "process",
      verb: "provides precedent for",
      strength: "moderate",
      confidence: "interpretive"
    },
    {
      id: "carnegie-drives-documentation",
      fromId: "carnegie-2006",
      fromType: "anchor",
      toId: "collaboratory-2017",
      toType: "anchor",
      verb: "creates documentation pressure for",
      strength: "moderate",
      confidence: "interpretive"
    },
    {
      id: "public-scholarship-to-engage",
      fromId: "public-scholarship",
      fromType: "process",
      toId: "engage-2019",
      toType: "anchor",
      verb: "creates publication need for",
      strength: "moderate",
      confidence: "interpretive"
    },
    {
      id: "infrastructure-supports-impact",
      fromId: "institutional-infrastructure",
      fromType: "process",
      toId: "recognition-impact",
      toType: "process",
      verb: "enables measurement of",
      strength: "strong",
      confidence: "interpretive"
    }
  ],
  sources: [],
  settings: {
    activeView: "process",
    showEras: true,
    showMinorAnchors: false,
    showInteractionLabels: true,
    showOnlyMajorInteractions: false,
    exportTheme: "light"
  }
};
```

---

# 11. Implementation Plan

## Phase 1: Rename and Restructure

* Rename `Trend` to `HistoricalProcess`.
* Rename `Layer` to `ProcessDomain`.
* Rename `Column` to `Era`.
* Rename `Event` to `AnchorEvent`.
* Rename `Connection` to `ProcessInteraction`.
* Introduce `UnderstoryDocument`.

## Phase 2: Add View Switcher

Create three renderer components:

```tsx
<ProcessView documentData={documentData} />
<TimelineView documentData={documentData} />
<InfluenceMapView documentData={documentData} />
```

## Phase 3: Build Process View First

Prioritize the Taylor-style process view.

* Render eras as subtle vertical bands.
* Render process domains as horizontal rows.
* Render process arrows.
* Render anchor dots.
* Render dotted cross-process interactions.
* Add tooltips or an inspector panel.

## Phase 4: Add Institutional Timeline View

Create simplified era columns with only major anchor events.

## Phase 5: Add Influence Map View

Create sparse domain/process graph with labeled relationship verbs.

## Phase 6: Improve Export

Export active view as PNG/PDF/SVG.

---

# 12. Design Principle

The app should help users avoid overloaded graphics.

Build in guardrails:

* Warn if more than 12 visible labels are shown in Process View.
* Warn if more than 20 interactions are visible.
* Encourage use of `importance` and `visibleLabel`.
* Require verbs for interactions.
* Allow minor details to live in inspector panels rather than on the canvas.

Core rule:

> Processes are primary. Events are evidence. Interactions are interpretive claims that need verbs.
