# Build and verification

The supported toolchain is Node 24.19.0 with npm 11.6.2. `.nvmrc`, `package.json` engines/packageManager, and the GitHub workflow pin these versions. `.npmrc` rejects unsupported engine versions and saves exact versions for future dependency additions. Use `package-lock.json` for every install; do not regenerate a Bun lockfile.

From a clean checkout:

```sh
npm install --global npm@11.6.2
npm ci --ignore-scripts --no-audit --no-fund
npm run check:math
npm test
npm audit --audit-level=moderate
npm run build
```

Install Node from `.nvmrc` before these commands. `npm ci` verifies manifest/lockfile agreement and replaces the installed dependency tree without rewriting the lockfile. Lifecycle scripts are disabled; the current dependencies build successfully with their packaged platform binaries. Future packages requiring install scripts need an explicit review of this policy.

The type check deliberately covers `src/lib/sim/math.js` and `input-coordinates.js`, with strict JSDoc checking and no DOM or ambient package types. It enforces the renderer-independent numerical and input-adapter APIs. It is not a full Svelte/application type check. Node tests cover math, editing, playback, input, image export, and resource lifetime. The production build compiles the Svelte application.

## GitHub Actions

`.github/workflows/deploy.yml` runs `Verify` for pull requests targeting `master`, pushes to `master`, and manual runs. It uses the pinned runtime/package manager, immutable Action commit IDs, and the commands above. npm caching is keyed by the lockfile; installed `node_modules` is not cached. Verification has read-only repository permissions, and checkout does not persist credentials.

The audit includes development dependencies because they execute during builds, and some (notably Svelte) contribute browser runtime code. Moderate or higher advisories and audit service errors fail verification. Reproduce failures locally, inspect advisory applicability, update dependencies deliberately, and commit the reviewed lockfile. Do not automatically use `npm audit fix --force` or disable the audit to obtain a green build.

Only non-PR runs on `master` upload a Pages artifact. The deployment job depends on successful verification and deploys that exact artifact without rebuilding. Only that job receives Pages and OIDC write permissions. Deployments are serialized, and manual runs from other branches cannot deploy.

Repository branch protection should require the `Verify` status check to prevent merging failing PRs. This change defines the check; it does not alter GitHub branch-protection settings. The workflow itself cannot be validated on a hosted runner until pushed.

## Toolchain upgrade compatibility

Vite 8 replaces the older bundler implementation. The app uses standard Svelte plugin configuration with no custom bundler plugins. `vite.config.js` explicitly preserves the Vite 5 compilation targets (ES2020, Edge 88, Firefox 78, Chrome 87, Safari 14) rather than adopting Vite 8's newer defaults. This is a compilation target, not a claim that all application features work in each old browser. The Pages base path remains `/WebDrawTabSim/`.

References: [setup-node version files and caching](https://github.com/actions/setup-node/blob/main/docs/advanced-usage.md), [Vite migration guidance](https://vite.dev/guide/migration), [previous Vite target definition](https://github.com/vitejs/vite/blob/v5.4.21/packages/vite/src/node/constants.ts).
