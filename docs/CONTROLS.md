# WebDrawTabSim — Controls

How to operate the simulator. For term definitions, see [CONCEPTS.md](./CONCEPTS.md).

## 3D view

| Action | How |
|---|---|
| Orbit | Left-drag on the viewer |
| Zoom | Scroll wheel — fixed **20 mm** steps (same as the Cam Dist buttons); closest distance is **20 mm** |
| Pan | Restricted — orbit target stays on the ground plane (`screenSpacePanning` off; polar angle capped at horizon) |
| Move the pen | Hold **Space** and drag on the viewer (OrbitControls disabled while Space is held) |

The camera can never drop below the tablet surface: the polar angle is capped at the horizon and the orbit target is kept at/above the surface.

Space+drag maps screen pixels to tablet millimetres using **Mouse drag sensitivity** (Pointer tracking flyout).

The left panel is grouped into headers: **Pen**, **Mapping**, **Pointer**, **Camera**, **Tablet**, **Other**.

## Pen

Tabbed controls (`pen pos`, `Pen Or`, `pen fmt`, `pen ann`). Slider numeric values are click-to-edit; typed values clamp to the slider min/max. All distances are in millimetres.

| Tab | Control | Effect |
|---|---|---|
| **pen pos** | **Z** | Hover distance — tip height above the digitizer |
| **pen pos** | **X** / **Y** | Tip position on the digitizer (0–384 / 0–216 mm) |
| **Pen Or** | **Al** | Tilt altitude — lean from vertical |
| **Pen Or** | **Az** | Tilt azimuth — lean direction (disabled when altitude is 0) |
| **Pen Or** | **Br** | Barrel rotation — twist around the pen axis |
| **pen fmt** | **Sharp nib tip** | Swap the rounded nib for a sharp one (shared apex, so the contact point is unchanged) |
| **pen fmt** | **Pen shadow** | Toggle the pen's cast shadow |
| **pen ann** | **Tilt altitude / azimuth**, **Tilt X / Y**, **Barrel rotation** | Show the matching orientation annotation |
| **pen ann** | **Pen top line** | Show the yellow dashed line dropping from the pen top to the surface |

## Mapping

**Pointer tracking** opens the pointer-tracking flyout (see below).

## Pointer

**Cursor** dropdown — the on-screen pointer cursor: `mouse` (arrow), `crosshairs`, or `none`.

## Camera

Tabbed controls (`Cam Dir`, `Cam Targ`).

| Tab | Control | Effect |
|---|---|---|
| **Cam Dir** | **Az** ◀ 5° / ◀ 1° / 1° ▶ / 5° ▶ | Orbit azimuth in 1°/5° steps (live read-out) |
| **Cam Dir** | **El** ▲ 5° / ▲ 1° / ▼ 1° / ▼ 5° | Orbit elevation in 1°/5° steps (live read-out) |
| **Cam Dir** | **Dist** −20 / +20 | Move 20 mm closer / farther (live read-out) |
| **Cam Targ** | **Point camera at…** | Re-aim the orbit target: pen tip, active-area center, corners, or edge midpoints |

The initial view is azimuth 0°, elevation 30°, distance 720 mm.

## Tablet

| Control | Effect |
|---|---|
| **Tablet checkerboard** | Lavender checkerboard on the active area |
| **Device type** | `pen tablet` (external monitor shows the cursor) or `pen display` (cursor on the embedded screen) |
| **Dark tablet** | Darken the tablet body |

## Other

| Control | Effect |
|---|---|
| **Axis** | Show the X/Y/Z axis markers |
| **Axonometric** | Switch between perspective and orthographic camera |
| **Animations** | Open the animations flyout (see below) |
| **Export / Copy…** | Export or copy a PNG (see Export) |
| **Views…** | Jump to named camera presets (DEFAULT, TOP_DOWN, etc.) |
| **Aspect** | Viewport aspect ratio: `16:9`, `1:1`, or `2:3` (the render is fitted and centered) |

## Flyouts

Opened from the left panel; click outside or press **Escape** to close.

### Pointer tracking

Models driver-style cursor behavior (not pen pose). See [CURSOR_PIPELINE.md](./CURSOR_PIPELINE.md).

| Slider | Effect |
|---|---|
| Cursor X / Y offset | Constant shift of the cursor on the digitizer |
| Tilt Compensation Pos/Neg TiltX/Y | Per-axis, per-sign shift proportional to Tilt X/Y |
| Scaling factor | Scales tip projection from tablet center (`0` pins cursor at origin + offsets) |
| Edge attraction | Push/pull near edges (`+` = away from edge) |
| Edge attraction range | Distance from edge where attraction applies |
| Mouse drag sensitivity | Space+drag distance per screen pixel |

### Animations

| Button | Effect |
|---|---|
| **Demo** | Jump to the shared demo pose and turn key annotations on |
| **Anim Rot all** | Ease from defaults to the same demo pose (~8 s) |
| **Anim Tilt Altitude** | Sweep altitude 0→45° |
| **Anim Tilt Azimuth** | Sweep azimuth 0→252° |
| **Anim Barrel** | Sweep barrel 0→316° |

Demo and Anim Rot all share `DEMO_POSE` in `src/lib/sim/config.js`. Starting a new parameter animation cancels the previous one.

## Export

The **Export / Copy…** dropdown (Other section):

| Option | Output |
|---|---|
| **Export 1080p PNG** | Download a PNG, 1080 px tall |
| **Export 4K PNG** | Download a PNG, 2160 px tall |
| **Copy 1080p to clipboard** | Copy a 1080-tall PNG |
| **Copy 4K to clipboard** | Copy a 2160-tall PNG |

The width follows the selected viewport **Aspect** (e.g. 1920×1080 at 16:9, 1080×1080 at 1:1). Exports render at 2× internally, then downsample for sharper edges. Download filename: `Pen3DSim-{width}x{height}.png`.

## Reset

**Reset pen** restores default orientation and position (`DEFAULT_PEN` in config). It does not reset pointer-tracking sliders, annotations, or camera.
