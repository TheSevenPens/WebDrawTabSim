# WebDrawTabSim - Project Overview

WebDrawTabSim is an interactive 3D web-based simulator — a teaching tool to explain how a drawing tablet works in a clear way.

## Purpose

It is useful for:

- Explaining pen orientation concepts (tilt altitude, tilt azimuth, barrel rotation) visually
- Demonstrating how tablet coordinates map to screen cursor position
- Exploring pointer-tracking behaviors like tilt compensation, cursor offset, and edge attraction
- Producing screenshots or animations for documentation and teaching

## Notable Features

- **Multiple camera modes** — interactive orbit, axonometric toggle, live Az/El/Dist controls and named views
- **Animations** — demo preset and per-parameter animated sweeps (altitude, azimuth, barrel) with cancellation support
- **PNG export** — export the current 3D view at 1080p (1920x1080) or 4K (3840x2160). Exports are rendered at 2x internally and downsampled for crisp lines and edges
- **Pointer tracking** — cursor offset, tilt compensation, scaling, edge attraction, and mouse-drag sensitivity
- **Visual annotations** — togglable arcs, pies, axis arrows, and helper lines clarify spatial relationships

## Documentation map

| Doc | Contents |
|---|---|
| [CONCEPTS.md](./CONCEPTS.md) | Teaching glossary |
| [CONTROLS.md](./CONTROLS.md) | How to use the UI |
| [CURSOR_PIPELINE.md](./CURSOR_PIPELINE.md) | Cursor computation stages |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Code structure |
| [FUTURES.md](./FUTURES.md) | Known issues and ideas |
