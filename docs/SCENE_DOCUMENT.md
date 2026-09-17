# Saved scenes

Use **Other → Save scene** to download `DrawTabSim-scene.json`. Saving pauses
active playback, cancels a pending animation start, and stops residual camera
damping at the captured view. Use **Load scene…** to restore a file. Loading a
valid file stops playback and pen dragging; it does not start an animation.

Scene files contain pose, cursor mapping, annotation preferences, device mode,
appearance, aspect ratio, camera position/target, and both camera zoom values.
Panel expansion, flyouts, transport time/range/speed, and recordings are not saved.
Files are local JSON with no remote asset references or network upload.

## Version 1 contract

The required top-level fields are `version`, `pose`, `mapping`, `annotations`,
`presentation`, and `camera`. `createSceneDocument()` is the canonical default;
the browser-saved example is `test/fixtures/scenes/demo-orthographic.json`.

- Pose and mapping distances are millimetres. Pose angles are degrees; altitude
  retains the simulator's lean-from-normal convention. See COORDINATES.md.
- Numeric settings use the existing teaching-control ranges in `PEN_RANGES`.
  This scene format is not an unrestricted recorded-input format.
- Camera position and target are world millimetres. The target must be on or
  above the tablet surface, with the camera above the target and 20–2400 mm away.
  Zoom is dimensionless, 0.05–100. A 1e-6 mm tolerance admits orbit round-off.
- Booleans must be booleans; enums must match supported options. Numeric strings,
  missing fields, unknown fields, non-finite values, and unsupported versions fail.
  Files are limited to 128 KiB before reading. The parser also bounds text length.
- There is no older document format to migrate. A future schema version must
  supply an explicit migration; version 1 never guesses how to read newer data.

Malformed input fails validation before playback is cancelled or renderer/state
updates begin. File reading errors appear inline. A newer file selection supersedes
an older pending read; destroying the file controls prevents a late read from applying.
As elsewhere in the app, a renderer/GPU failure is not a transactional rollback of
already-applied graphics operations.

## Update path

`createSceneController` owns a detached accepted snapshot. UI bindings edit a
candidate, and the controller validates the whole candidate before applying it.
Snapshots passed to consumers are copies. Derived angles/cursors are computed by
the renderer; they are not duplicate stored state.

`applySceneDocument` diffs accepted snapshots. Its batch commits pose and mapping
fields before one pen/cursor/annotation refresh. Appearance is only rebuilt when
it changes. Loading forces a complete application and clears residual camera
damping; camera observations avoid a render feedback loop.

The application uses this path for editing, pen dragging, Demo, Reset, and
authored playback. The legacy simulator setters remain available for standalone
consumers, but those consumers must own their own state synchronization.
`getDefaultPose()` returns defaults; `reset()` now actually applies them.

The scene schema is checked by `npm run check:math` alongside the portable math
and input adapters. Tests cover rejection before mutation, detached snapshots,
pose transitions, camera damping/zoom, drag commands, and restoration of real
Three.js scene geometry/preferences. The saved fixture is a numeric regression
reference, not a cross-GPU pixel-equality promise.

Scene editing now supports [undo/redo](./HISTORY.md), including valid file loads.
History is transient and is not serialized in a scene document.

Named scene libraries, recording references, automatic image sidecars,
and cross-version migrations are follow-up work.
