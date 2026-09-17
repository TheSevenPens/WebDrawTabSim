# WebDrawTabSim

Interactive 3D teaching simulator for how a **drawing tablet** works: pen pose (position, hover, tilt, barrel) and how drivers map that pose to a **cursor**.

Live demo (GitHub Pages): **https://thesevenpens.github.io/WebDrawTabSim/**

## Quick start

Use **Node 24.19.0** (`.nvmrc`) and **npm 11.6.2**. With nvm, run `nvm install` and `nvm use`; other Node version managers can use the version in `.nvmrc`. Then install the pinned npm version if necessary:

```bash
npm install --global npm@11.6.2
npm ci --ignore-scripts --no-audit --no-fund
npm run dev
```

Open the local URL Vite prints (base path is `/WebDrawTabSim/`), e.g. `http://localhost:5173/WebDrawTabSim/`.

```bash
npm run build    # production build → dist/
npm run preview  # preview the production build
npm test         # portable math, editing, playback, input, export, and lifecycle regressions
npm run check:math # strict JSDoc checks for math, input adapters, and scene documents
npm audit --audit-level=moderate # include development/build dependencies
```

`package-lock.json` is the sole dependency lockfile; Bun is no longer a supported install path. CI runs the same frozen install, math type check, tests, audit, and build on pull requests and `master`. Only a verified `master` build can deploy to Pages. See [build and verification](docs/BUILD.md) and the [dated dependency audit](docs/DEPENDENCIES-2026-09-17.md).

## What it does

- Visualise **tilt altitude**, **tilt azimuth**, and **barrel rotation** in 3D
- Map **tablet coordinates** to a screen cursor (external monitor or pen-display mode)
- Explore **pointer-tracking** behaviours: offset, tilt compensation, scaling, edge attraction
- Export crisp **1080p / 4K** PNGs for docs and teaching
- Pause, seek, step, and loop demonstrations with [deterministic playback](docs/PLAYBACK.md)
- Save and restore [complete scenes as JSON](docs/SCENE_DOCUMENT.md), including camera framing
- [Undo and redo](docs/HISTORY.md) complete scene edits, with grouped slider and pen drags

## Documentation

| Doc | Contents |
|---|---|
| [docs/OVERVIEW.md](./docs/OVERVIEW.md) | Purpose and feature summary |
| [docs/CONCEPTS.md](./docs/CONCEPTS.md) | Glossary: orientation, coordinates, annotations |
| [docs/CONTROLS.md](./docs/CONTROLS.md) | UI panel, Space+drag, camera, animations, export |
| [docs/CURSOR_PIPELINE.md](./docs/CURSOR_PIPELINE.md) | How cursor position is computed |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Svelte + Three.js code structure |
| [docs/SIMULATION_MATH.md](./docs/SIMULATION_MATH.md) | Portable numerical API, units, reference fixtures |
| [docs/COORDINATES.md](./docs/COORDINATES.md) | Canonical coordinate contract and Pointer Events adapters |
| [docs/FUTURES.md](./docs/FUTURES.md) | Known gaps and ideas |

## Stack

- **Svelte 5** + **Vite**
- **Three.js**

## License

See repository for license details (if present). Private package metadata is in `package.json`.
