# Dependency review — 2026-09-17

The previous npm lockfile reported **8 affected packages: 4 high, 4 moderate**, using npm 11.6.2's live advisory service. These are package counts; individual packages can have multiple advisories. The updated lockfile reports **zero vulnerabilities** across all dependencies. This is an advisory snapshot, not proof that the application is free of vulnerabilities.

## Changes and applicability

- Vite 5.4.21 and its esbuild dependency had development-server access/path findings, including [Windows filesystem-deny bypass](https://github.com/advisories/GHSA-fx2h-pf6j-xcff) and [esbuild development-server response access](https://github.com/advisories/GHSA-67mh-4wv8-2f99). These concern development tooling rather than the static Pages server. Updated Vite to 8.3.0 and its compatible Svelte plugin to 7.3.0, removing the old esbuild chain. The two plugin package findings were inherited through their dependency graph.
- Svelte had SSR serialization/spread-attribute, DOM-clobbering, and dynamic-tag-validation advisories. This application uses client-side rendering, with no SSR server, user-authored HTML, or dynamic tag input. SSR findings are not evidence of an exposed SSR endpoint here; [DOM clobbering](https://github.com/advisories/GHSA-rcqx-6q8c-2c42) concerns browser runtime behavior. Updated Svelte to 5.57.0 rather than relying on the current app's narrower input surface.
- devalue had [sparse-array deserialization denial of service](https://github.com/advisories/GHSA-77vg-94rm-hx3p). The app does not deserialize user data with devalue. The updated dependency graph resolves this finding.
- nanoid had negative/zero-size generator and integer-overflow findings; PostCSS had CSS serialization and source-map path-disclosure findings. These were transitive build dependencies; the app does not accept user-provided CSS/source maps or generator sizes. Resolving the updated dependency graph removed their reported affected versions. Examples: [nanoid size validation](https://github.com/advisories/GHSA-2v37-7h3g-55p8), [PostCSS source-map access](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp).

Three.js remains at the existing locked version; no renderer upgrade is included. TypeScript 5.9.3 was added for strict checking of the portable math module. `package-lock.json` records the complete resolved dependency versions and integrity hashes.

## Verification and ongoing checks

Validated with Node 24.19.0 and npm 11.6.2: a fresh `npm ci --ignore-scripts --no-audit --no-fund`, strict math type checking, all 49 regression tests, production compilation, and a live `npm audit --json` returning an empty vulnerability map. CI runs `npm audit --audit-level=moderate` for the full graph, including development dependencies. A production-only audit would miss build tooling and can also misrepresent client runtime dependencies recorded under devDependencies.

Dependencies and advisories change independently. Repeat the audit when updating the lockfile or investigating a new finding; do not retain an old count as an assertion of current security status.
