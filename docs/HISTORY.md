# Undo and redo

Use **Undo** and **Redo** at the top of the control panel. Button tooltips name
the action. Keyboard shortcuts are Ctrl/Cmd+Z for Undo, Ctrl/Cmd+Shift+Z or
Ctrl/Cmd+Y for Redo. Text, number, select, and editable-content fields retain
their native keyboard behavior; leave the field or use the buttons for scene undo.

History restores the complete accepted scene: pose, mapping, annotations,
presentation/device settings, and camera framing. It holds the last 100 edits
in memory and is not included in saved scene files or retained after reload.

## What counts as an edit

- A pointer drag on a slider is one edit. Keyboard slider repeats are grouped
  until key release. Numeric typing is grouped until the field loses focus or
  Enter commits it, including rounding on blur.
- One pen drag or camera orbit/pan is one edit. Pointer release, cancellation,
  lost capture, focus loss, and Space release finish the gesture. Camera damping
  is settled at the gesture boundary so it cannot overwrite an undo.
- A checkbox, select, camera button, or wheel zoom is an individual edit.
- Demo, Reset pen, and a valid scene load each create one edit. Invalid loads and
  no-op edits create none. Save does not create an edit.
- A new edit after Undo clears Redo. A gesture that returns exactly to its
  starting state preserves Redo.

Undo and Redo stop playback and pen dragging before restoring state. Playback
frames, seeks, and stepping do not create entries or clear Redo. Undo therefore
returns to the previous **edit**, not the preceding animation frame; Redo restores
the recorded scene snapshot without restarting the transport. Camera controls
remain usable during playback; their history entries capture complete scene
snapshots, including the pose at those edits.

## Implementation and verification

`createSceneController` validates and applies a candidate before recording its
before/after snapshots. `beginEdit` / `endEdit` coalesce a gesture. `record: false`
excludes playback; passive camera observations default to unrecorded updates.
History restore uses the same validation and renderer path with recording off.
Renderer failures do not move the history cursor (graphics operations themselves
are not transactionally rolled back).

`edit-gestures.js` owns DOM gesture boundaries and shortcut filtering, independent
of scene schema and rendering. Its listeners are removed on teardown.
`test/history.test.js` exercises snapshots, grouping, no-op/redo behavior,
playback exclusion, history bounds, failed restores, gesture release paths, and
shortcut exclusions. Browser smoke checks cover numeric edit grouping, Demo,
Reset, keyboard Undo, redo invalidation, camera changes, and loading a scene.
