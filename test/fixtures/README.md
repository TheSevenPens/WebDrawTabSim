# Math reference fixtures

`math-reference.json` records results from the actual pre-extraction `updatePenPose`, `updateCursorFromPen`, `updateMonitorCursor`, and planar-tilt methods at commit `72b0e14`. The methods were loaded from that commit and run with real Three.js vectors, quaternions, groups, and line geometry, without a renderer. Expectations were captured before substituting the portable functions.

The eight cases cover upright, two corners, mixed orientation and compensation, zero scaling, positive/negative edge strength, and out-of-bounds mapping. Each fixture supplies all inputs and expected values; numbers are model millimetres and degrees. Quaternion components use x, y, z, w order. Tests compare within 1e-10 to allow equivalent floating-point operation ordering.

Do not regenerate this baseline merely to make a failing refactor pass. Intentional numerical behavior changes need reviewed expected results and an explanation. Separate hand-derived tests cover cardinal axes, edge boundaries, monitor corners, and animation wrapping. These are numeric regression fixtures, not image baselines or hardware measurements.
