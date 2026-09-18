# Bundled stroke playback

Under **Animations**, choose **Play sample stroke**. The bundled “approach confirmed” stroke starts playing immediately. Use the existing Play/Pause, Stop, time slider, speed, loop, and in/out controls. Previous/Next sample steps through exact original readings, including readings delivered in the same batch. Manual pen edits, Reset, loading a scene, or starting another animation cancel the sample.

The sample panel shows approach/contact/departure, normalized pressure, and either the selected source sample number or “Interpolated pose.” Pressure is displayed, not used to infer height or render brush marks. Scene saving captures the current pose and camera; it does not save the recording or playback position.

## Source and attribution

[Stroke Corpus](https://thesevenpens.github.io/StrokeCorpus/), TheSevenPens, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

Source: [approach-confirmed-wacom-cintiq-24-20260917-071628.json](https://thesevenpens.github.io/StrokeCorpus/traces/approach-confirmed-wacom-cintiq-24-20260917-071628.json), format `stroke-field-guide/take`, version 6, Wacom Cintiq 24 / WintabDigitizer. The bundled JSON extracts stroke 1 (index 0), retaining its original 39 approach, 342 contact, and 37 departure rows plus columns/device/placement metadata. Other strokes and the overlapping aloft list are omitted. The bundle requires no network request or upload at runtime.

## Illustrative mapping

- Fit all 418 XY samples uniformly into a central 120 × 70 mm box on the 384 × 216 mm active area, preserving the path's aspect ratio. Centre the actual bounds at tablet coordinate (192, 108). This is a visualization scale, not physical pixel-to-millimetre calibration. The desktop placement transform is retained as metadata; the fit uses the original XY coordinates directly.
- Map the largest airborne raw height in this stroke to 8 mm; contact height is zero according to list membership. Zero-height airborne readings remain zero. No physical distance claim is made for raw Wintab height.
- Use recorded lean directly. For this demonstration, assume compass azimuth zero is screen up and increases clockwise: simulator azimuth = (180 − recorded azimuth) modulo 360. Choose an arbitrary barrel zero: simulator barrel = −recorded twist modulo 360. These are explicit visualization assumptions, not verified device calibration.
- Use `(arrived − first approach arrived) / 1000` for playback milliseconds. The first approach timestamp is −234232 microseconds; total playback duration is 2599.141 ms. Retain both original clocks in the bundled rows. Do not use the device `at` counter to estimate elapsed time.
- Preserve all timestamp ties and source-list identities. Seeking uses the transport's existing last-sample-at-a-timestamp policy; Stop therefore lands on sample 3 at time zero. Previous sample can reach samples 2 and 1. Do not invent acquisition timestamps between batched arrivals.
- Interpolate XY and angles for visualization (shortest angular path). Hold pressure, height, and phase until the next timestamp so contact is not blended into hover. Exact stepping uses the original mapped samples.

Loading the sample resets cursor mapping offsets/compensation and supplies a camera view of the active area with a crosshair cursor. Other appearance choices remain editable. This is a bundled demonstration, not a general importer: support for arbitrary recordings, missing channels, calibrated dimensions, and older schema versions remains future work under #82.

Validation covers all row identities, timestamp ties, bounds, contact height, source immutability, browser playback, seeking, stepping, and cancellation. `npm test` and `npm run test:visual` run these checks.
