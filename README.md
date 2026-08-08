# WebDrawTabSim

Interactive 3D teaching simulator for how a **drawing tablet** works: pen pose (position, hover, tilt, barrel) and how drivers map that pose to a **cursor**.

Live demo (GitHub Pages): **https://thesevenpens.github.io/WebDrawTabSim/**

## Quick start

```bash
npm install
npm run dev
```

Open the local URL Vite prints (base path is `/WebDrawTabSim/`), e.g. `http://localhost:5173/WebDrawTabSim/`.

```bash
npm run build    # production build → dist/
npm run preview  # preview the production build
```

## What it does

- Visualise **tilt altitude**, **tilt azimuth**, and **barrel rotation** in 3D
- Map **tablet coordinates** to a screen cursor (external monitor or pen-display mode)
- Explore **pointer-tracking** behaviours: offset, tilt compensation, scaling, edge attraction
- Export crisp **1080p / 4K** PNGs for docs and teaching

## Documentation

| Doc | Contents |
|---|---|
| [docs/OVERVIEW.md](./docs/OVERVIEW.md) | Purpose and feature summary |
| [docs/CONCEPTS.md](./docs/CONCEPTS.md) | Glossary: orientation, coordinates, annotations |
| [docs/CONTROLS.md](./docs/CONTROLS.md) | UI panel, Space+drag, camera, animations, export |
| [docs/CURSOR_PIPELINE.md](./docs/CURSOR_PIPELINE.md) | How cursor position is computed |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Svelte + Three.js code structure |
| [docs/FUTURES.md](./docs/FUTURES.md) | Known gaps and ideas |

## Stack

- **Svelte 5** + **Vite**
- **Three.js**

## License

See repository for license details (if present). Private package metadata is in `package.json`.
