# WebDrawTabSim - Project Overview

WebDrawTabSim is an interactive 3D web-based simulator - a teaching tool to exaplin how a drawing tablet works in a clear way. 

## Purpose

It is useful for:

- Explaining pen orientation concepts (tilt altitude, tilt azimuth, barrel rotation) visually
- Demonstrating how tablet coordinates map to screen cursor position
- Exploring pointer-tracking behaviors like tilt compensation, cursor offset, and edge attraction
- Producing screenshots or animations for documentation and teaching

## Notable Features

- **Multiple camera modes** — interactive orbit, axonometric toggle, camera settings import/export (JSON)
- **Animations** — demo preset and per-parameter animated sweeps (altitude, azimuth, barrel) with cancellation support
- **PNG export** — export the current 3D view at 1080p (1920x1080) or 4K (3840x2160). Exports are rendered at 2x internally and downsampled for crisp lines and edges
- **Pointer tracking** — nine parameters model real-world cursor behaviors like parallax offset, tilt compensation, and edge snapping
- **Visual annotations** — togglable arcs, pies, axis arrows, and helper lines clarify spatial relationships
