# WebDrawTabSim - Futures

## Known Issues

- **Dependency maintenance**: The 2026-09-17 toolchain update resolved the eight affected packages reported in the prior lockfile. The updated lockfile audited with zero reported vulnerabilities; this is a dated result, not a permanent guarantee. See [the dependency review](DEPENDENCIES-2026-09-17.md); CI audits all dependencies.
- **No WebGL fallback**: If the browser lacks WebGL support, the constructor silently fails with no error message shown to the user.

## Code Quality

- **Large annotation update path**: `updateAnnotations()` in `pen-annotations.js` is still sizable after the pose/cursor/annotation split; further extraction of per-annotation updaters would help.
- **Broader test coverage**: Node regression tests and strict type checking cover the portable math and input-adapter APIs, alongside editing/playback/export/lifecycle tests. Image baselines, full recorded-stroke fixtures, and cross-browser automation remain useful additions (#77).

## Suggested Features

- **Real tablet input**: Detect an actual drawing tablet (via Pointer Events API) and display its live pen state in the simulator.
- **Presets / snapshots**: Let users save and load combinations of pen parameters and camera settings by name.
- **Export pen state as JSON**: Add pen-state export/import (camera JSON I/O was removed with the unused edit modal).
- **Video/GIF recording**: Extend the existing PNG export to capture animations as video.
- **Comparison mode**: Side-by-side view of two different pen orientations.
- **Help panel**: In-app documentation explaining each parameter (tilt altitude vs. azimuth, what barrel rotation means, etc.).
- **Keyboard shortcuts guide**: The spacebar+drag feature is undiscoverable. A help overlay would surface it.

## UX Improvements

- **Mobile / touch support**: `pen-mouse.js` only handles keyboard + mouse events. Touch devices can view but not interact with pen positioning.
- **Responsive layout**: The control panel is fixed at 400px and doesn't adapt to small screens.
- **Light mode**: Currently dark-only. A theme toggle would help with accessibility and embedding in light-themed docs.
- **Undo/redo**: All state changes are immediate with no way to step back.

## Accessibility

- **Minimal ARIA attributes**: Sliders lack `aria-valuemin`/`aria-valuemax`/`aria-valuenow`.
- **No visible focus indicators**: `app.css` has no `:focus-visible` styles, making keyboard navigation difficult.
- **3D canvas not accessible**: The WebGL viewer has no text alternative for screen readers.
- **Color contrast**: Some UI text (e.g. light gray on dark background) may not meet WCAG 4.5:1 contrast requirements.

## Code Modernization

- **TypeScript migration**: The project is pure JavaScript. TypeScript would add type safety, especially around the coordinate math and Three.js API usage.
- Shared defaults live in `src/lib/sim/config.js` (tablet, desk/room, lighting, monitor, demo pose, ranges, colors, timings). Keep new magic numbers out of companion files when possible.
- **App ↔ panel prop drilling**: Many 1:1 `onFoo → sim.setFoo` wrappers remain after CheckboxControl/SelectControl; further bridge helpers are tracked in #61.
