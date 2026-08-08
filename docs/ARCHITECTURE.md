# WebDrawTabSim — Architecture

Canonical architecture doc. Product concepts live in [CONCEPTS.md](./CONCEPTS.md); cursor math in [CURSOR_PIPELINE.md](./CURSOR_PIPELINE.md).

WebDrawTabSim is a 3D pen-tablet simulator built with **Svelte 5** (UI) and **Three.js** (rendering). It visualises pen orientation (X/Y, hover Z, tilt altitude/azimuth, barrel) and a separately tunable cursor pipeline.

---

## UI layer — Svelte

```
src/main.js
└── App.svelte                        ← root: all $state + sim lifecycle
    ├── LeftPanel.svelte              ← #control-panel
    │   └── PenOrientationPanel.svelte
    │       └── SliderControl.svelte
    ├── AnnotationSettings.svelte     ← annotations flyout
    ├── PointerTrackingSettings.svelte
    │   └── SliderControl.svelte
    └── [flyouts, #viewer]
```

| Component | Responsibility |
|---|---|
| `App.svelte` | Owns reactive state; bridges UI → `Pen3DSim`; flyouts, animations |
| `LeftPanel.svelte` | Control panel chrome, section headers, camera and action controls |
| `PenOrientationPanel.svelte` | Tabbed pen controls (position, orientation, format, annotations) |
| `AnnotationSettings.svelte` | Cursor mode dropdown (mouse / crosshairs / none) |
| `PointerTrackingSettings.svelte` | Cursor pipeline + mouse sensitivity sliders |
| `SliderControl.svelte` | Labelled range input with click-to-edit value |

### State flow

Mutable UI state lives in `App.svelte` as Svelte 5 `$state`. Children use `$bindable()` props and callback props (`onDistance`, etc.) that call sim setters.

When Space+drag moves the pen, the sim dispatches `tabletPositionChanged` on the viewer; `App.svelte` updates `tabletX` / `tabletY` so sliders stay in sync.

---

## Simulation layer — `src/lib/sim/`

### Entry point

`index.js` exports `Pen3DSim` (and re-exports `config.js`) and side-effect-imports companions in order:

```
index.js
├── Pen3DSim.js         ← class skeleton, public API, clamped setters
├── config.js           ← TABLET, DEFAULT_PEN, DEMO_POSE, ranges, colors, timings
├── cursor-geometry.js  ← shared arrow silhouette for tablet + monitor cursors
├── pen-scene.js        ← scene, cameras, renderer, lights, OrbitControls, camera JSON
├── pen-tablet.js       ← tablet body, digitizer grid, desk, floor, embedded screen
├── pen-monitor.js      ← external monitor + screen cursor
├── pen-pen.js          ← pen mesh; updatePenPose / updateCursorFromPen / updateAnnotations
├── pen-annotations.js  ← annotation helpers, pie/tube updates, tilt math, axis markers
├── pen-mouse.js        ← Space + drag → tablet X/Y
├── materials.js        ← MaterialsFactory
├── textures.js         ← procedural canvas textures
└── animations.js       ← runParameterAnimation()
```

Companions call `Object.assign(Pen3DSim.prototype, { … })`. **Import order is load-order critical** — `Pen3DSim.js` must evaluate first.

### Init chain

```
initScene → initCameras → initRenderer → initControls → initLighting
→ initTablet → initMonitor → initPen → initAnnotations → initAxisMarkers
→ animate() → updatePenTransform() → initMouseControl()
```

### Core update split

`updatePenTransform(distance, altitude, azimuth, barrel)` orchestrates:

1. **`updatePenPose`** — tablet→world, quaternions, pen group placement, drop-lines  
2. **`updateCursorFromPen`** — scaling, offset, tilt compensation, edge attraction, monitor sync  
3. **`updateAnnotations`** — arcs / pies / helper overlays  

Pie meshes are persistent; geometry is replaced via `updatePieMesh` / `hidePieMesh` rather than remove/re-add each update.

### Public API (consumed by UI)

Pen: `setDistance`, `setTiltAltitude`, `setTiltAzimuth`, `setBarrelRotation`, `setTabletPositionX/Y`  
Pointer: cursor offset, tilt-compensation, scaling, edge attraction, `setMouseSensitivity`  
Display: annotation/axis/cursor/shadow/checkerboard/pen-display toggles, axonometric, camera view/JSON  
Utility: `reset()`, `exportAsPNG()`, `animateToDemo()`, `onResize()`

Setters clamp through `PEN_RANGES` / `clampValue` in `config.js`.

---

## Tablet body vs digitizer

**Tablet body** — visual plastic slab with bezel (`digitizer + bodyMargin` → 19×12×0.35 in).  
**Digitizer** — 16×9 in sensing area as a line grid at `yOffset`. All coordinate math uses digitizer space.

```
TABLET.thickness  (config.js)     → single source of truth
yOffset = thickness / 2           → digitizer plane world Y
```

---

## Coordinate systems

**Tablet (API):** X 0–16, Y 0–9, Z ≥ 0 (inches).  
**World (Three.js Y-up):**

```
worldX = tabletX − width/2
worldY = yOffset + tabletZ
worldZ = tabletY − depth/2
```

Details and axis-label remapping: [CONCEPTS.md](./CONCEPTS.md).

---

## Monitor cursor

External monitor screen is unlit (`MeshBasicMaterial`) with a procedural desktop texture. `updateMonitorCursor` maps digitizer world XZ onto the screen face; see [CURSOR_PIPELINE.md](./CURSOR_PIPELINE.md).

Shared arrow geometry: `cursor-geometry.js`.

---

## PNG export

Temporarily resizes the renderer to 1920×1080 or 3840×2160 with pixel ratio `EXPORT.supersample` (2). Draws the 2× buffer into a canvas at the target size (supersampled downsample), then restores the original size.

---

## Z-fighting

Tablet body, digitizer grid, cursor, and (in pen display mode) embedded screen sit very close together. The renderer uses **`logarithmicDepthBuffer: true`** so tiny Y offsets (0.001"–0.01") sort correctly at all zoom levels.

---

## Dependencies

- **Svelte 5** — `$state`, `$bindable`, `$props`
- **Three.js** — `three`, `OrbitControls`
- **Vite** + `@sveltejs/vite-plugin-svelte`
- **Google Fonts (Montserrat)** — `app.css`
- Deploy base path: `/WebDrawTabSim/` (`vite.config.js`)
