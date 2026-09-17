# Portable simulation math

Import numerical functions directly from `src/lib/sim/math.js`. This module has no imports and does not require Three.js, Svelte, a DOM, a clock, or requestAnimationFrame. Its JSDoc types describe plain objects; functions return new plain objects and do not mutate inputs. Host applications own validation, defaults, persistence, and scheduling. The existing `Pen3DSim` API remains the browser-facing facade.

## Inputs and units

All values must be finite numbers. Tablet and screen dimensions must be positive. Distances use model millimetres, and angles use degrees. `SCALE = 24` in the rendering configuration is an artistic model scale, not a physical inches-to-millimetres conversion. The current active area is 384 by 216 model millimetres.

`PenPose` carries `tabletX`, `tabletY`, `distance`, `altitude`, `azimuth`, and `barrel`. `altitude` means lean away from vertical: 0 is upright, 90 is horizontal. The UI limits it to 60 degrees. `planarTilt` preserves the existing tangent-based formula for lean below 90 degrees; exactly horizontal planar tilt is singular and is not a supported input to that function. `penTransform` itself supports a horizontal axis. This API is not a Pointer Events adapter; recorded input must be converted and validated before use. Defining that source conversion is tracked separately in #76.

Tablet X increases left to right; tablet Y increases front to back. `tabletToWorld` subtracts half the active width/depth, clamps X/Z to the active area, and sets world Y to surface height plus hover distance. World Y is up. At the default size, tablet (0,0) maps to world X/Z (-192,-108), and (384,216) maps to (192,108).

Azimuth rotates about world +Y. With a positive lean, azimuth 0 points the pen's upper end toward +Z, 90 toward +X, 180 toward -Z, and 270 toward -X. Barrel rotates about the pen's local +Y axis before lean and azimuth are applied. Quaternion multiplication order is `Y(azimuth) * X(altitude) * Y(barrel)`; outputs use x/y/z/w components. `penTransform` returns the tip, mesh-group origin, axis, and quaternion. It accepts the local tip length explicitly so mesh dimensions are not hidden domain dependencies.

## Cursor and monitor mapping

`planarTilt` produces signed tilt X/Y in degrees. `mapCursor` accepts that result, the world tip projection, tablet dimensions, and every mapping setting explicitly. It applies center-relative scale, constant offsets, directional tilt compensation, then edge displacement. Nonpositive scale pins the source at the center; offsets and compensation still apply. Nonpositive compensation gains disable that direction. The configured compensation coefficient is currently 0.24 model millimetres per degree at unit gain.

Positive edge strength repels from an edge; negative strength attracts. The effect fades linearly to zero at the inward range boundary. An already-outside point receives no contribution from that edge. Contributions from opposite edges add when their ranges overlap. Cursor output is not clamped.

`mapMonitor` maps world X/Z to screen X/Y using explicit tablet and screen dimensions. Tablet front maps toward screen top; tablet back maps toward screen bottom. Out-of-bounds input extrapolates beyond the monitor face. These are illustrative mapping behaviors, not measured hardware-driver predictions.

## Playback and ownership

`easeInOutCubic` and `interpolateAngle` accept normalized progress in [0,1]. Angle interpolation follows increasing angles, not the shortest path: 350 to 10 passes through 0, while 10 to 350 passes through 180. Equivalent endpoints such as 0 and 360 do not produce a full turn. Timing and cancellation remain in `playback.js`, `animations.js`, and the simulator's animation owner.

The browser adapters in `pen-pen.js`, `pen-monitor.js`, and `pen-annotations.js` supply configuration/state and apply numerical results to Three.js nodes. Import the browser simulator through `sim/index.js` so its prototype companions initialize; direct math imports have no such initialization requirement. Scene geometry and annotation rendering remain Three.js responsibilities, owned through `ResourceScope`. File access, clipboard, and image export remain host/browser responsibilities.

## Verification

`test/math.test.js` runs without browser globals. It compares eight fixed pose/cursor/monitor cases captured from the pre-extraction implementation and checks hand-derived cardinal directions, corners, edge boundaries, compensation, and interpolation. `test/export-lifecycle.test.js` also applies those fixtures through the actual scene adapters in both device modes. See `test/fixtures/README.md` for provenance and numerical tolerance. This establishes numerical equivalence; it does not replace image baselines or cross-platform rendering checks.
