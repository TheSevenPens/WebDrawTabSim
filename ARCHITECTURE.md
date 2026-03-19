# WebDrawTabSim — Architecture

## Overview

WebDrawTabSim is a 3D pen-tablet simulator built with **Svelte 5** (UI) and **Three.js** (3D rendering). It visualises the orientation parameters reported by a drawing tablet pen: X/Y position, hover distance (Z), tilt altitude, tilt azimuth, and barrel rotation.

---

## UI Layer — Svelte Components

```
src/main.js
└── App.svelte                        ← root, owns all state and sim lifecycle
    ├── LeftPanel.svelte              ← #control-panel wrapper
    │   ├── PenOrientationPanel.svelte  ← X/Y/Z/tilt/barrel sliders + Tilt X/Y display
    │   │   └── SliderControl.svelte  ← reusable labelled range slider (inline-editable value)
    │   ├── AnnotationSettings (flyout content, rendered in App.svelte)
    │   └── PointerTrackingSettings (flyout content, rendered in App.svelte)
    ├── AnnotationSettings.svelte     ← annotation visibility checkboxes + All On/Off
    ├── PointerTrackingSettings.svelte ← cursor offset, tilt compensation, scaling sliders
    │   └── SliderControl.svelte
    └── [flyout panels, camera modal, 3D viewer div]
```

### Component responsibilities

| Component | Responsibility |
|---|---|
| `App.svelte` | Owns all reactive state; bridges UI events to `Pen3DSim` API calls; manages flyout open/close state and camera modal |
| `LeftPanel.svelte` | Renders `#control-panel`; receives all pen state and callbacks as props |
| `PenOrientationPanel.svelte` | The six primary pen-parameter sliders and the derived Tilt X/Y read-outs |
| `AnnotationSettings.svelte` | Nine annotation visibility checkboxes and the All On/All Off shortcuts |
| `PointerTrackingSettings.svelte` | Nine sliders for cursor offset, per-axis tilt compensation, scaling, and edge attraction |
| `SliderControl.svelte` | A labelled `<input type="range">` whose numeric display is click-to-edit; clamps typed values to `[min, max]` on Enter or blur |

### State flow

All mutable state lives in `App.svelte` as Svelte 5 `$state` variables. Child components receive values via `$bindable()` props and fire plain callback props (e.g. `onDistance`, `onAltitude`) when a slider changes. The callbacks call the corresponding `Pen3DSim` method, keeping the 3D scene in sync.

The sim fires a `tabletPositionChanged` custom DOM event on the viewer element when the pen is dragged with the mouse; `App.svelte` listens for this and updates `tabletX`/`tabletY` state so the sliders stay in sync.

---

## Simulation Layer — `src/lib/sim/`

### Entry point

`index.js` exports `Pen3DSim` and side-effect-imports the companion files in dependency order:

```
index.js
├── Pen3DSim.js        ← class skeleton, constructor, public API
├── pen-scene.js       ← extends prototype: scene, cameras, renderer, lighting
├── pen-tablet.js      ← extends prototype: tablet body, digitizer grid, desk
├── pen-pen.js         ← extends prototype: pen mesh, cursor arrow, updatePenTransform
├── pen-annotations.js ← extends prototype: tilt/barrel/azimuth annotation geometry
└── pen-mouse.js       ← extends prototype: spacebar + mouse-drag pen movement
```

Each companion file calls `Object.assign(Pen3DSim.prototype, { … })`. **Import order in `index.js` is load-order critical** — `Pen3DSim.js` must be evaluated first.

### `Pen3DSim.js` — class skeleton

Initialises all state constants and calls the init chain in order:

```
initScene → initCameras → initRenderer → initControls → initLighting
→ initTablet → initPen → initAnnotations → initAxisMarkers
→ animate() → updatePenTransform() → initMouseControl()
```

Exposes the full public API consumed by `App.svelte`: `setDistance`, `setTiltAltitude`, `setTiltAzimuth`, `setBarrelRotation`, `setTabletPositionX/Y`, cursor/tilt-compensation/scaling setters, visibility toggles, `reset()`, `exportAsPNG()`, `animateToDemo()`.

### Companion files

| File | Responsibility |
|---|---|
| `pen-scene.js` | Three.js scene, perspective + orthographic cameras, WebGL renderer, OrbitControls, ambient/directional/point lights, camera settings import/export |
| `pen-tablet.js` | **Tablet body**, **digitizer grid**, desk mesh (see concepts below) |
| `pen-pen.js` | Pen tip (cone) + barrel (cylinder) mesh group; cursor arrow; `updatePenTransform()` — the core function that repositions and reorients the pen every frame |
| `pen-annotations.js` | Arc, pie, arrow, and label geometry for tilt altitude, tilt azimuth, barrel rotation, tilt X/Y annotations; axis marker arrows and labels |
| `pen-mouse.js` | Spacebar toggles mouse-drag mode; drag events map pixel deltas to tablet-coordinate offsets and call `setTabletPositionX/Y` |

### Support files

| File | Responsibility |
|---|---|
| `materials.js` | `MaterialsFactory` — static factory methods for every material in the scene (tablet, desk, pen, grid, wireframe, annotations) |
| `textures.js` | `TexturesFactory` — generates procedural canvas textures (checkerboard for pen barrel and tablet overlay) |
| `animations.js` | `runParameterAnimation()` — generic RAF loop helper used by individual parameter animations (altitude, azimuth, barrel) |

---

## Key Concepts

### Tablet body vs. digitizer

The physical drawing tablet has two conceptually distinct parts, rendered separately:

**Tablet body** — the physical plastic slab. Rendered as a `BoxGeometry` with a gray `MeshStandardMaterial`. It is slightly larger than the active area to represent the bezel:
- Digitizer active area + `bodyMargin` (1.5 in) on every side → **19 × 12 inches**
- Thickness controlled by `this.tabletThickness` (0.35 in), defined in `Pen3DSim.js`

**Digitizer** — the active sensing area; conceptually a 2D surface with no physical thickness. Rendered as a fine line grid (0.5 in spacing) drawn at exactly `yOffset` (the tablet surface world-Y). The digitizer is **16 × 9 inches** — the values stored in `this.tabletWidth` and `this.tabletDepth`. All coordinate math (pen position, annotations, mouse drag) operates exclusively in digitizer coordinates; the tablet body is purely visual.

The relationship between the two:
```
tabletThickness = 0.35 in   (Pen3DSim.js — single source of truth)
yOffset         = tabletThickness / 2   (top surface of body = digitizer plane)

Tablet body:   19 × 0.35 × 12 in  (centered at world origin, Y=0)
Digitizer grid: 16 ×  0   ×  9 in  (lines drawn at Y = yOffset)
```

To change tablet thickness, update only `tabletThickness` in `Pen3DSim.js`; `yOffset` and the geometry derive from it automatically.

### Coordinate systems

Two coordinate spaces are used throughout:

**Tablet coordinates** (the logical API space, in inches):
```
tabletX   0 – 16    left → right
tabletY   0 – 9     front → back
tabletZ   ≥ 0       pen tip height above digitizer surface (hover distance)
```

**World coordinates** (Three.js scene space, Y-up, in inches):
```
worldX  = tabletX − tabletWidth/2       (range ±8)
worldY  = yOffset + tabletZ             (≥ 0.175)
worldZ  = tabletY − tabletDepth/2       (range ±4.5)
```

### Scene objects (world positions)

| Object | Position | Size |
|---|---|---|
| Desk | Y = −2.5, Z = −6.5 (center) | 60 × 5 × 30 in |
| Tablet body | Y = 0 (center) | 19 × 0.35 × 12 in |
| Digitizer grid | Y = 0.175 (surface) | 16 × 9 in |
| Pen group | Y = yOffset + distance | driven by `updatePenTransform` |
| Floor grid helper | Y = −5 | 50 × 50 in |

The desk is offset in Z so its front edge sits 4 inches in front of the digitizer's front edge, as a person sitting at the desk would position a tablet.

---

## Dependencies

- **Svelte 5** — UI framework (runes-based reactivity: `$state`, `$derived`, `$bindable`, `$props`)
- **Three.js** — 3D rendering (`three`, `three/examples/jsm/controls/OrbitControls`)
- **Vite** + **vite-plugin-svelte** — build tooling
- **Google Fonts (Montserrat)** — loaded via `@import` in `app.css`
