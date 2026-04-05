# WebDrawTabSim - Architecture

## Simulation layer (`src/lib/sim/`)

The core `Pen3DSim` class manages the Three.js scene and all pen state. It is extended by six companion files via prototype assignment:

| File | Responsibility |
|---|---|
| `pen-scene.js` | Scene setup, cameras (perspective + orthographic), renderer, lights, OrbitControls |
| `pen-tablet.js` | Tablet body mesh, digitizer grid, desk platform |
| `pen-monitor.js` | Desktop monitor model with procedural screen texture and mirrored cursor |
| `pen-pen.js` | Pen mesh (tip + barrel), helper lines, cursor arrow, and the central `updatePenTransform()` function |
| `pen-annotations.js` | Visual overlays: altitude arc, azimuth pie, barrel rotation indicator, tilt X/Y arcs, axis markers |
| `pen-mouse.js` | Spacebar-activated drag control for moving the pen with the mouse |

Supporting modules (`materials.js`, `textures.js`, `animations.js`) provide material factories, procedural canvas textures, and an eased animation helper.

## UI layer (`src/lib/`)

| Component | Role |
|---|---|
| `App.svelte` | Root component; owns all reactive state and bridges UI events to the sim API |
| `LeftPanel.svelte` | Sidebar containing all controls, actions, and settings panels |
| `PenOrientationPanel.svelte` | Sliders for distance, X/Y position, tilt altitude, tilt azimuth, barrel rotation |
| `AnnotationSettings.svelte` | Checkboxes toggling visual overlays (arcs, axes, shadow, checkerboard, etc.) |
| `PointerTrackingSettings.svelte` | Sliders for cursor offset, tilt compensation, scaling, edge attraction |
| `SliderControl.svelte` | Reusable labeled range input with click-to-edit numeric display |

## Key Technologies

- **Three.js** — 3D rendering of the tablet, pen, monitor, and annotation overlays
- **Svelte 5** — Reactive UI framework (using rune-based reactivity) for the control panel
- **Vite** — Build tool and dev server
- Deployed to **GitHub Pages** at the `/WebDrawTabSim/` base path

## Coordinate Systems

The sim defines two coordinate spaces:

- **Tablet coordinates** (API space): `tabletX` 0-16 in, `tabletY` 0-9 in, `tabletZ` >= 0 in
- **World coordinates** (Three.js): converted automatically with origin offset so the tablet surface sits at the correct height

`updatePenTransform()` converts tablet coords to world coords, applies tilt via quaternion rotations, applies barrel rotation around the pen axis, and syncs the monitor cursor position.