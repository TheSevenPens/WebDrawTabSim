# Rendering performance

The viewport renders on invalidation. Visual setters request a frame; multiple requests before the next animation frame coalesce. OrbitControls changes wake the renderer and keep frames running while damping changes the camera. Once it settles there is no recurring viewport callback. Playback retains its own clock and requests rendering through normal pose updates.

Cursor mapping edits update the tablet and monitor cursors without recomputing pen geometry, annotations, or shadows. Scene batches coalesce cursor work; a pending full pen update subsumes it. Pen movement and shadow-caster changes still invalidate the shadow map. Appearance, visibility, projection, resize, and context restoration explicitly request rendering. Export schedules a live redraw after restoring renderer dimensions, including on failure.

When adding a visual setter, request rendering even if the change does not move the pen or camera. Direct mesh mutations outside those methods must do the same. Keep numerical state updates synchronous so export, scene serialization, and sample inspection see the latest accepted state.

## Reproducible workload

After the setup in [REFERENCE_SCENES.md](REFERENCE_SCENES.md), run in PowerShell:

```powershell
npm run build:visual
$env:SIM_BENCHMARK = '1'
node node_modules/playwright/cli.js test performance --grep 'workload benchmark'
Remove-Item Env:SIM_BENCHMARK
```

The opt-in test attaches a JSON report to the Playwright report and prints it. It uses the default scene in a 960×720 container, a 1280×900 browser viewport, pixel ratio 1, and the reference suite's pinned Chromium/SwiftShader backend. Workloads are a 500 ms warm-up then one second idle, 100 cursor-offset writes in a synchronous burst, 60 altitude updates on successive animation-frame callbacks with altitude annotations enabled, and one 1920×1080 export. Capture timestamps are browser performance-clock milliseconds. GPU resources reported by Three.js are object counts, not bytes.

The regular suite skips this timing workload. It instead asserts scheduler behavior deterministically in Node and checks idle settling, edits, real mouse-driven camera damping, and export pixel restoration in Chromium. Timing thresholds would be unreliable across CI hosts.

## Local before/after observation, 2026-09-17

Baseline application: `1dd7aa5`, with the benchmark instrumentation added. Optimized application: the invalidation-rendering changes accompanying this document. Same machine and workload: AMD Ryzen AI 9 HX 370, Windows build 10.0.26200, Chromium 153.0.8010.12, Three.js r170, ANGLE Vulkan SwiftShader. These are software-rendering measurements, not a hardware-GPU performance claim.

- Idle render submissions over one second: **48 → 0**.
- 100 cursor edits: annotation updates **100 → 0**, shadow invalidations **100 → 0**, render submissions during the burst/settling window **3 → 1**.
- Synchronous cursor-update time: **4.2 → 0.6 ms**.
- Pose workload: **61 annotation updates and 61 shadow invalidations in both runs**, as expected for moving geometry (including the annotation toggle). Render submissions **62 → 61**.
- Pose-update median/p95: **0.6/1.4 → 0.8/1.7 ms**. This batch does not establish a pose-update speedup.
- One export: **201.9 → 159.3 ms**. A single timing sample is insufficient to claim an export speedup; its rendering algorithm is unchanged.
- Post-workload renderer resource counts: **80 geometries and 4 textures in both runs**. Existing repeated-lifecycle tests check ownership and disposal.

The robust result is elimination of unnecessary work, rather than the noisy timing differences. All existing image references passed unchanged. Antialiasing, shadows, output resolution, and `preserveDrawingBuffer` were retained.

## Remaining measurements

This is the first bounded portion of #79. Hardware-GPU frame-time distributions, recorded-stroke replay drops, export peak process/GPU memory, and longer lifecycle soak measurements remain before making an Avalonia-versus-browser performance decision. Annotation mesh reuse (#31) is also separate: cursor-only edits now bypass those allocations, but moving annotated poses still rebuild their existing geometry.
