# Deterministic playback

The Animations section loads each existing demonstration as an eight-second,
two-keyframe clip. Play/Pause, Stop, the time slider, previous/next keyframe,
speed, loop, and in/out points control that clip. Time and range fields display
seconds; internal timestamps are milliseconds. Commit range edits by leaving
the field. Invalid ranges are restored to their previous values.

Seeking and stepping pause playback. Stop returns to the in point. Play at the
out point restarts from the in point. Range changes pause and clamp the current
time. Speed changes preserve the current time and playing state. Looping wraps
inside the selected range, including after a long frame delay. Keyframe stepping
only visits source keyframes inside the range; an authored two-keyframe clip
has no intermediate source samples.

Manual editing, pen dragging, Reset, Demo, and another animation cancel the old
clip, including its delayed start. Playback controls are excluded from manual-edit
cancellation. Camera orbit and camera buttons remain available during playback.

## Portable evaluation and scheduling

`src/lib/sim/timeline.js` contains no browser, Svelte, or Three.js dependencies.
`createClip` copies and freezes complete flat samples `{ id, time, values }`.
IDs must be unique strings; times must be finite, ordered, start at zero, and
end after zero. All samples must have the same numeric, boolean, or string
channels. Numeric values must be finite.

`evaluateClip(clip, time)` clamps time to the clip duration and returns a new
snapshot. Evaluation does not depend on frame cadence or prior seeks:

- Numeric channels interpolate linearly, with optional cubic easing.
- `angle` channels follow the existing positive wrapped-degree convention.
  Full turns require intermediate samples or an unwrapped linear channel.
- `hold` channels, booleans, and strings keep the preceding value until the next
  timestamp. These represent state transitions, not side-effect callbacks.
- Gaps larger than `maxGapMs` hold the preceding snapshot; the default is Infinity.
- At duplicate timestamps, seeking selects the last sample. Explicit stepping
  preserves every source index and ID, including earlier duplicates.

`transport.js` owns time and scheduling. Its clock and animation-frame functions
are injectable for tests or a different host. Cancellation invalidates queued
callbacks with a generation token. The app's existing playback owner also owns
the delayed start, and simulator disposal cancels the transport.

`Pen3DSim.setPose` validates all six pose fields before changing any field, clamps
them to the teaching controls' ranges, then refreshes the pen once. The app copies
that accepted pose into its controls.

## Scope and follow-up

The evaluator supports numeric camera channels and discrete annotation channels,
tested at the same explicit timestamp as pose channels. The current app only
applies pose clips; camera/annotation track authoring and rendering are not yet
wired to the transport. Recorded-file import, live capture, arbitrary keyframe
editing, scene persistence, and timestamped publication export remain separate
work. This is not yet a complete recorded-stroke player or scene state model.

`test/timeline.test.js` covers cadence independence, duplicate identities,
interpolation and gap policies, stale callbacks, ranges, looping, speed, and
atomic pose updates. Run `npm test` and `npm run build`; browser smoke checks
also verify initial mount, playback controls, and reset cancellation.
