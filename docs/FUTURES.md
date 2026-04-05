# WebDrawTabSim - Futures

## Known Issues

- **npm audit vulnerabilities**: 4 moderate-severity issues in the esbuild dependency chain (affects Vite dev server). Run `npm audit` for details.
- **Mouse drag sensitivity is hardcoded**: `pixelsPerInch = 0.01` in `pen-mouse.js` (line 69) is a magic number with an "adjust to taste" comment. Should be configurable.
- **Alert dialogs for errors**: Camera settings import uses `alert()` for parse errors (`App.svelte`), which blocks interaction and is unfriendly UX. Should use an in-page message instead.
- **No validation on sim setters**: Methods like `setDistance()`, `setTiltAltitude()` accept values without range checks. Invalid values (NaN, out-of-range) could break the 3D scene.
- **No WebGL fallback**: If the browser lacks WebGL support, the constructor silently fails with no error message shown to the user.

## Code Quality

- **Duplicated cursor arrow geometry**: `pen-pen.js` (`createCursorArrow`) and `pen-monitor.js` (`createMonitorCursor`) contain nearly identical arrow-shape creation code. Could be extracted into a shared utility.
- **Large `updatePenTransform()` function**: ~250 lines in `pen-pen.js` handling coordinate conversion, quaternion math, tilt compensation, edge attraction, annotation updates, and monitor cursor sync. Would benefit from being broken into smaller focused functions.
- **Repetitive animation functions**: `runAnimAltitude()`, `runAnimAzimuth()`, `runAnimBarrel()` in `App.svelte` are ~95% identical. Could use a generic helper.
- **Boilerplate callbacks**: ~33 one-line callback functions in `App.svelte` that simply forward a value to the sim. Could be reduced with a factory or direct binding.
- **No tests**: No test files exist. Adding Vitest tests for the coordinate math and state logic would improve reliability.

## Suggested Features

- **Real tablet input**: Detect an actual drawing tablet (via Pointer Events API) and display its live pen state in the simulator.
- **Presets / snapshots**: Let users save and load combinations of pen parameters and camera settings by name.
- **Export pen state as JSON**: Complement the existing camera settings export with a full pen-state export/import.
- **Video/GIF recording**: Extend the existing PNG export to capture animations as video.
- **Comparison mode**: Side-by-side view of two different pen orientations.
- **Help panel**: In-app documentation explaining each parameter (tilt altitude vs. azimuth, what barrel rotation means, etc.).
- **Keyboard shortcuts guide**: The spacebar+drag feature is undiscoverable. A help overlay would surface it.

## UX Improvements

- **Mobile / touch support**: `pen-mouse.js` only handles keyboard + mouse events. Touch devices can view but not interact with pen positioning.
- **Responsive layout**: The control panel is fixed at 250px and doesn't adapt to small screens.
- **Light mode**: Currently dark-only. A theme toggle would help with accessibility and embedding in light-themed docs.
- **Undo/redo**: All state changes are immediate with no way to step back.

## Accessibility

- **Minimal ARIA attributes**: Sliders lack `aria-valuemin`/`aria-valuemax`/`aria-valuenow`. The camera modal has no `role="dialog"` or focus trap.
- **No visible focus indicators**: `app.css` has no `:focus-visible` styles, making keyboard navigation difficult.
- **3D canvas not accessible**: The WebGL viewer has no text alternative for screen readers.
- **Color contrast**: Some UI text (e.g. light gray on dark background) may not meet WCAG 4.5:1 contrast requirements.

## Code Modernization

- **TypeScript migration**: The project is pure JavaScript. TypeScript would add type safety, especially around the coordinate math and Three.js API usage.
- **Extract constants**: Magic numbers (animation durations, default pen values, material colors) are scattered across files. A central `config.js` would help.
