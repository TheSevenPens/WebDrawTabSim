# WebDrawTabSim — Concepts

Teaching glossary for the simulator. For how the code is structured, see [ARCHITECTURE.md](./ARCHITECTURE.md). For what each control does in the UI, see [CONTROLS.md](./CONTROLS.md).

## Pen orientation

Drawing tablets report pen orientation as angles relative to the digitizer surface. This sim uses the same three primary angles plus hover distance.

| Term | Meaning | UI range |
|---|---|---|
| **Hover distance (Z)** | Height of the pen tip above the digitizer surface | 0–24 mm |
| **Tilt altitude** | Angle from vertical. `0°` = upright; larger values lean the pen | 0–60° |
| **Tilt azimuth** | Direction of the lean around the tablet surface. Only meaningful when altitude ≠ 0 | 0–359° |
| **Barrel rotation** | Spin around the pen’s long axis (how the barrel is twisted) | 0–359° |

### Tilt X and Tilt Y

**Tilt X** and **Tilt Y** are *derived* from altitude + azimuth. They answer: “how much is the pen leaning along tablet X?” and “how much along tablet Y?”

```
tiltX = atan(tan(altitude) × sin(azimuth))
tiltY = atan(tan(altitude) × cos(azimuth))
```

They are read-outs only (not independently settable). Pointer-tracking **tilt compensation** uses these signed degrees.

When altitude is `0`, azimuth is disabled in the UI — there is no lean direction to choose.

## Coordinate systems

### Tablet coordinates (API / teaching space)

Millimetres on the digitizer active area (`SCALE = 24` maps the original 16×9 inch design):

```
tabletX   0 – 384   left → right
tabletY   0 – 216   front → back (toward the monitor)
tabletZ   ≥ 0       tip height above the surface (hover distance)
```

All sliders, mouse-drag, and the public `Pen3DSim` setters use tablet coordinates.

### World coordinates (Three.js)

Y-up scene space, also in millimetres (1 world unit = 1 mm):

```
worldX = tabletX − tabletWidth/2     (±192)
worldY = yOffset + tabletZ           (surface at yOffset ≈ tablet thickness / 2)
worldZ = tabletY − tabletDepth/2     (±108)
```

`yOffset` is half the tablet body thickness — the world Y of the digitizer plane.

### Axis markers

The optional axis arrows sit at the front-left corner of the digitizer. Labels use **tablet** names on **world** axes:

| Arrow direction | World axis | Label shown |
|---|---|---|
| Right | +X | **X** |
| Up | +Y | **Z** (hover) |
| Back | +Z | **Y** (front→back) |

That remapping is intentional for teaching tablet space, not a bug.

## Tablet body vs digitizer

Two different things are drawn on top of each other:

- **Tablet body** — physical plastic slab with bezel. Visual only. Size = digitizer + `bodyMargin` (1.5") on each side → **19 × 12 × 0.35 in**.
- **Digitizer** — active sensing area. A line grid (**16 × 9 in**) on the body top surface. All pen math uses this area only.

Defaults live in `src/lib/sim/config.js` (`TABLET`).

## Pen tablet vs pen display

| Mode | Meaning in this sim |
|---|---|
| **Pen tablet** (default) | Opaque tablet + external desk monitor. Digitizer cursor is mirrored onto the monitor screen. |
| **Pen display** | Embedded screen on the tablet surface; external monitor hidden. The digitizer cursor sits slightly above the embedded screen. |

Toggle with the **Pen display** checkbox.

## Pose vs cursor

Two layers matter for teaching:

1. **Pen pose** — where the tip is and how the pen is oriented (orientation + tablet X/Y/Z).
2. **Cursor** — where the OS-style pointer is drawn on the digitizer (and mirrored to the monitor).

Drivers often do *not* put the cursor exactly under the tip. This sim models that gap with pointer-tracking parameters (offset, scaling, tilt compensation, edge attraction). See [CURSOR_PIPELINE.md](./CURSOR_PIPELINE.md).

## Annotations

Togglable overlays that make angles visible:

| Annotation | Color (approx.) | What it shows |
|---|---|---|
| Tilt altitude | Magenta | Lean angle from vertical at the tip |
| Tilt azimuth | Green | Direction of lean on the tablet surface |
| Tilt X / Tilt Y | Cyan / pink | Axis-aligned lean components |
| Barrel rotation | Orange | Twist around the pen axis (at the top of the pen) |
| Axis | RGB arrows | Tablet-oriented axes (see above) |

Each angle annotation typically draws a dotted reference circle, a thick arc, a translucent pie, and helper lines.

## Related docs

- [OVERVIEW.md](./OVERVIEW.md) — purpose and feature summary
- [CONTROLS.md](./CONTROLS.md) — UI and interaction reference
- [CURSOR_PIPELINE.md](./CURSOR_PIPELINE.md) — cursor math stages
- [ARCHITECTURE.md](./ARCHITECTURE.md) — code structure
- [FUTURES.md](./FUTURES.md) — known gaps and ideas
