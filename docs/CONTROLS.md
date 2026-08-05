# WebDrawTabSim — Controls

How to operate the simulator. For term definitions, see [CONCEPTS.md](./CONCEPTS.md).

## 3D view

| Action | How |
|---|---|
| Orbit | Left-drag on the viewer |
| Zoom | Scroll wheel |
| Pan | Restricted — orbit target stays on the ground plane (`screenSpacePanning` off; polar angle capped at horizon) |
| Move the pen | Hold **Space** and drag on the viewer (OrbitControls disabled while Space is held) |

Space+drag maps screen pixels to tablet inches using **Mouse drag sensitivity** (Pointer tracking flyout). Default is `0.01 in/px`.

## Left panel — pen orientation

| Control | Effect |
|---|---|
| **Z: (Hover distance)** | Tip height above digitizer |
| **X** / **Y** | Tip position on the digitizer |
| **Tilt altitude** | Lean from vertical |
| **Tilt azimuth** | Lean direction (disabled when altitude is 0) |
| **Barrel rotation** | Twist around the pen axis |
| **Tilt X** / **Tilt Y** | Read-only derived lean components |

Slider numeric values are click-to-edit; typed values clamp to the slider min/max.

## Modes

| Control | Effect |
|---|---|
| **Pen display** | Embedded tablet screen on; external monitor off |
| **Axonometric** | Switch between perspective and orthographic camera |

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
| Mouse drag sensitivity | Space+drag inches per screen pixel |

### Annotations

Toggles for altitude, azimuth, tilt X/Y, barrel, axis markers, mouse cursor, pen shadow, and tablet checkerboard. **All On** / **All Off** shortcuts included.

### Animations

| Button | Effect |
|---|---|
| **Demo** | Jump to the shared demo pose and turn key annotations on |
| **Anim Rot all** | Ease from defaults to the same demo pose (~8 s) |
| **Anim Tilt Altitude** | Sweep altitude 0→45° |
| **Anim Tilt Azimuth** | Sweep azimuth 0→252° |
| **Anim Barrel** | Sweep barrel 0→316° |

Demo and Anim Rot all share `DEMO_POSE` in `src/lib/sim/config.js`. Starting a new parameter animation cancels the previous one.

## Camera

| Control | Effect |
|---|---|
| **Camera info** | Live position / target read-out |
| **Views…** | Jump to named presets (DEFAULT, TOP_DOWN, etc.) |
| **Edit camera JSON** | Open modal to view/edit camera settings JSON |

Invalid JSON shows an **inline error** in the modal (no blocking `alert`). **Escape** or Cancel closes the modal.

## Export

| Button | Output |
|---|---|
| **Export 1080p** | `1920×1080` PNG |
| **Export 4K** | `3840×2160` PNG |

Exports render at 2× internally, then downsample for sharper edges. Filename: `Pen3DSim-{width}x{height}.png`.

## Reset

**Reset pen** restores default orientation and position (`DEFAULT_PEN` in config). It does not reset pointer-tracking sliders, annotations, or camera.
