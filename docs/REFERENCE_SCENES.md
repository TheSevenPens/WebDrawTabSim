# Reference scenes and visual regression checks

The reference kit pairs portable version 1 scene documents with frozen numeric results and reviewed Windows Chromium images. It provides a concrete acceptance target for renderer refactors and a future desktop port. It does not replace physical tablet measurements.

## Run and review

Use the Node and npm versions in [BUILD.md](BUILD.md), then run:

```sh
npm ci --ignore-scripts --no-audit --no-fund
node node_modules/playwright/cli.js install chromium
npm test
npm run test:visual
```

The browser suite builds into `.visual-dist`, starts its own local preview server on port 4174, and shuts it down afterward. The normal production build excludes the test harness, its browser API, and its font. No running development server is needed.

Open the report with `node node_modules/playwright/cli.js show-report`. Failures include expected/actual/difference images, a browser trace, and environment metadata. Missing baselines fail ordinary runs. To deliberately refresh images on Windows:

```sh
npm run test:visual:update
npm run test:visual
```

Inspect every changed image and explain the intended behavior change before committing the images and `environment.json`. Updating snapshots is forbidden in CI. This command never regenerates numeric expectations; do not alter those merely to make a failing refactor pass.

## Coverage

- `upright-overview`: external monitor, screenless tablet, upright pen, axis labels, and wide perspective framing.
- `display-high-tilt`: embedded display, high tilt, barrel rotation, mapping compensation, dark tablet, annotations, and square framing.
- `nib-closeup`: sharp nib, hover, crosshairs, and portrait framing.
- `annotated-orthographic`: orthographic projection, dark tablet, angle annotations, and widescreen framing.

Each scene checks tip position, pen quaternion, and cursor position against `visual/references.json`, then compares its image before and after a resize round trip. Further browser tests check an exported PNG and restoration of the live viewport, visible pose changes, repeated disposal/recreation, and loading/undoing/redoing a scene through the real application UI. Existing Node tests cover export failure restoration and deterministic playback independently.

The documents live in `test/fixtures/scenes/reference`. Numeric values were captured from the portable math at commit `2b0a975`. Positions use model millimetres; quaternions use x/y/z/w order; the cursor pair is world x/z. Both Node and browser tests compare with absolute tolerance `1e-8`.

## Rendering environment and tolerances

The lockfile pins Playwright and its Chromium revision. The suite requires ANGLE SwiftShader software rendering, pixel ratio 1, a 1280×900 browser viewport, and a 960×720 scene container (the saved aspect ratio determines the canvas size). The simulation frame loop and camera damping are disabled. Scene application and rendering are explicit; no wall-clock animation drives reference captures.

Annotation textures use bundled Noto Sans Latin 700 from `@fontsource/noto-sans` (SIL Open Font License 1.1). The harness loads it before constructing the simulator and aliases Arial only on the test page. Production font behavior is unchanged. Browser, renderer, Three.js, Playwright, font, OS, and Node metadata accompany the references and reports. Comparisons reject mismatched browser, renderer, Three.js, Playwright, font, or pixel ratio.

Image comparisons use a per-pixel color threshold of `0.15` and allow at most `0.002` (0.2%) differing pixels. These accommodate small rasterization differences; they do not guarantee detection of every tiny detail. A deliberate tablet-color change was rejected with 84% differing pixels, while changing the nib shape alone remained within this tolerance. Add a tighter crop or geometry assertion when a future regression concerns such a small feature. See the [Playwright screenshot guidance](https://playwright.dev/docs/test-snapshots) and [comparison options](https://playwright.dev/docs/api/class-locatorassertions#locator-assertions-to-have-screenshot-1).

Only `win32` image baselines are supplied. Other operating systems require separately reviewed baselines; portable numeric tests run everywhere. The initial images were reviewed locally on Windows 11. CI uses `windows-2022`; software rendering and bundled fonts reduce host variation but do not promise identical output across all operating systems or GPUs. The first hosted run still needs verification after pushing.

## Desktop-port acceptance

Load the same scene JSON in a prospective desktop renderer and compare its tip, quaternion, and cursor against the frozen numeric values first. Reproduce the camera framing, annotations, device mode, and exported image composition next. A different rendering backend may need its own reviewed image references rather than inheriting Chromium pixel expectations. Keep the shared numeric contract and explain deliberate visual differences.

GitHub Actions runs `Visual references` alongside `Verify`, retains visual reports for 14 days, and requires both jobs before Pages deployment. Branch-protection settings are managed separately.
