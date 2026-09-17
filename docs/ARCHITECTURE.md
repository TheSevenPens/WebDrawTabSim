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
    ├── CursorModeControl.svelte      ← cursor-mode dropdown (used in Pointer tab)
    ├── PointerTrackingSettings.svelte
    │   └── SliderControl.svelte
    ├── CheckboxControl.svelte / SelectControl.svelte  ← shared labeled inputs
    └── [flyouts, #viewer]
```

| Component | Responsibility |
|---|---|
| `App.svelte` | Owns reactive state; bridges UI → `Pen3DSim`; flyouts, animations |
| `LeftPanel.svelte` | Control panel chrome, section headers, camera and action controls |
| `PenOrientationPanel.svelte` | Tabbed pen controls (position, orientation, format, annotations) |
| `CursorModeControl.svelte` | Cursor mode dropdown (mouse / crosshairs / none) — formerly `AnnotationSettings.svelte` |
| `PointerTrackingSettings.svelte` | Cursor pipeline + mouse sensitivity sliders |
| `SliderControl.svelte` | Labelled range input with click-to-edit value |
| `CheckboxControl.svelte` / `SelectControl.svelte` | Shared labeled checkbox / dropdown matching the dark panel style |

### State flow

`App.svelte` binds controls into a versioned scene document. `scene-document.js`
validates a complete candidate before publishing a detached accepted snapshot.
Manual edits, Demo, Reset, playback, and Space+drag use that same commit path.
Transient flyouts, panel selection, file status, and playback transport state stay
outside the document. LeftPanel forwards one `onSceneEdit` callback for bound settings.

`scene-renderer.js` projects changed fields into `Pen3DSim` and batches pen refreshes.
Space+drag sends one XY patch through `onPoseInput`; standalone simulator consumers
retain the legacy setter/event fallback. OrbitControls camera motion is observed
into the document without being reapplied to the renderer on each frame.

`SceneControls.svelte` owns browser file selection and downloads. The portable
schema/controller have no DOM, Svelte, or Three.js dependencies. See
[SCENE_DOCUMENT.md](./SCENE_DOCUMENT.md) for persistence and validation rules.

The scene controller also owns bounded before/after history. App marks playback
as unrecorded, while `edit-gestures.js` groups pointer and keyboard editing.
`HistoryControls.svelte` exposes Undo/Redo. Restore stops competing interaction
and reuses the scene application path; see [HISTORY.md](./HISTORY.md).

---

## Simulation layer — `src/lib/sim/`

### Entry point

`index.js` exports `Pen3DSim` (and re-exports `config.js`) and side-effect-imports companions in order:

```
index.js
├── Pen3DSim.js         ← class skeleton, public API, clamped setters
├── config.js           ← TABLET, DESK, ROOM, LIGHTING, MONITOR, DEFAULT_PEN, DEMO_POSE, ranges, colors, timings
├── math.js             ← pure pose, coordinate, cursor, monitor, and interpolation functions
├── input-coordinates.js ← validated Pointer Events/source-coordinate adapters for future importers
├── cursor-geometry.js  ← shared arrow silhouette for tablet + monitor cursors
├── pen-scene.js        ← scene, cameras, renderer, lights, OrbitControls, camera JSON
├── pen-room.js         ← desk (slab + legs), floor, walls, baseboards
├── pen-tablet.js       ← tablet body, digitizer grid, embedded screen
├── pen-monitor.js      ← external monitor + screen cursor
├── pen-pen.js          ← pen mesh; updatePenPose / updateCursorFromPen / updatePenTransform orchestrator
├── pen-annotations.js  ← annotation helpers, pie/tube updates, tilt math, axis markers, updateAnnotations
├── pen-mouse.js        ← Space + drag → tablet X/Y
├── materials.js        ← MaterialsFactory
├── textures.js         ← procedural canvas textures
└── animations.js       ← runParameterAnimation()
```

Companions call `Object.assign(Pen3DSim.prototype, { … })`. **Import order is load-order critical** — `Pen3DSim.js` must evaluate first.

The numerical core is independent of this initialization: import `math.js` directly for pose/orientation, tilt, cursor/monitor mapping, and interpolation. It accepts plain objects with explicit dimensions, units, and mapping settings. The companions adapt its results to scene nodes. See [SIMULATION_MATH.md](./SIMULATION_MATH.md) for the API contract and reference fixtures.

### Init chain

```
initScene → initCameras → initRenderer → initControls → initLighting
→ initDesk → initRoom → initTablet → initMonitor → initPen → initAnnotations → initAxisMarkers
→ onResize() → updatePenTransform() → initMouseControl() → animate()
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
Utility: `getDefaultPose()` (detached defaults), `reset()` (applies defaults),
`setPose()`, `batchSceneUpdate()`, `getCameraState()`, `restoreCameraState()`,
`exportAsPNG()`, `animateToDemo()`, `onResize()`

Setters clamp through `PEN_RANGES` / `clampValue` in `config.js`.

---

## Tablet body vs digitizer

**Tablet body** — visual plastic slab with a 25 mm bezel on each side (434×266×5.28 model mm).

**Digitizer** — 384×216 mm sensing area as a line grid at `yOffset`. All coordinate math uses digitizer space.

```
TABLET.thickness  (config.js)     → single source of truth
yOffset = thickness / 2           → digitizer plane world Y
```

---

## Coordinate systems

**Tablet (API):** X 0–384, Y 0–216, Z ≥ 0 in model millimetres. `SCALE = 24` preserves legacy proportions; physical inches convert with 25.4.

**World (Three.js Y-up, 1 unit = 1 mm):**

```
worldX = tabletX − width/2
worldY = yOffset + tabletZ
worldZ = tabletY − depth/2
```

Canonical input contract and direction diagram: [COORDINATES.md](./COORDINATES.md). Teaching glossary and axis-label remapping: [CONCEPTS.md](./CONCEPTS.md).

---

## Monitor cursor

External monitor screen is unlit (`MeshBasicMaterial`) with a procedural desktop texture. `updateMonitorCursor` maps digitizer world XZ onto the screen face; see [CURSOR_PIPELINE.md](./CURSOR_PIPELINE.md).

Shared arrow geometry: `cursor-geometry.js`.

---

## PNG export

`export.js` renders at the requested aspect for both perspective and orthographic cameras. It validates integer dimensions, limits output to 16,777,216 pixels and the drawing buffer to twice that pixel count, and checks graphics-device dimension limits. It normally uses `EXPORT.supersample` (2), reducing to 1 when necessary or retrying at 1 after a supersampled rendering failure. A `finally` block restores the exact renderer size, pixel ratio, viewport, and camera projection. CSS dimensions and camera zoom stay unchanged. Clipboard PNG encoding rejects null blobs explicitly.

## Simulator lifetime

Call `Pen3DSim.dispose()` when removing a viewer; Svelte's unmount callback does this after cancelling pending playback and removing app listeners. Disposal is idempotent and stops the render and animation RAFs, aborts input listeners, releases pointer capture, disposes OrbitControls and GPU resources, releases the WebGL context, and removes the canvas. Construction failure invokes the same cleanup.

Register newly allocated geometry, material, texture, and shadow resources with `this.own(resource)` immediately. `ResourceScope` deduplicates shared resources and forgets dynamically replaced resources when their `dispose` event fires. This also owns textures while detached from materials. Desktop textures are shared within one simulator, not globally; ArrowHelper's global geometries are cloned per simulator before being owned. Do not reuse a simulator after disposal.

`test/export-lifecycle.test.js` exercises real Three.js scene construction with a fake renderer, repeated disposal, independent viewers, construction failure, export errors, projection restoration, and encoding. These tests check resource ownership and scheduling, not GPU memory consumption; actual GPU behavior still requires browser testing.

---

## Z-fighting

Tablet body, digitizer grid, cursor, and (in pen display mode) embedded screen sit very close together. The renderer uses **`logarithmicDepthBuffer: true`** so tiny Y offsets (fractions of a millimetre) sort correctly at all zoom levels.

---

## Dependencies

- **Svelte 5** — `$state`, `$bindable`, `$props`
- **Three.js** — `three`, `OrbitControls`
- **Vite** + `@sveltejs/vite-plugin-svelte`
- **Google Fonts (Montserrat)** — `app.css`
- Deploy base path: `/WebDrawTabSim/` (`vite.config.js`)
