import test from 'node:test';
import assert from 'node:assert/strict';
import { pointerAnglesToOrientation, pointerTiltToOrientation, pointerTwistToBarrel,
    clientToTablet, inchesToMillimetres } from '../src/lib/sim/input-coordinates.js';
import { penTransform, planarTilt } from '../src/lib/sim/math.js';
import { TABLET, MONITOR, PEN_RANGES, SCALE } from '../src/lib/sim/config.js';

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);
const tablet = { width: TABLET.width, depth: TABLET.depth, surfaceY: TABLET.thickness / 2 };
const rect = Object.freeze({ left: 10, top: 20, width: 768, height: 432 });

for (const [direction, radians, azimuth] of [
    ['right', 0, 90], ['down', Math.PI / 2, 0], ['left', Math.PI, 270], ['up', 3 * Math.PI / 2, 180],
]) {
    test(`Pointer Events ${direction} direction maps to simulator azimuth ${azimuth}`, () => {
        const result = pointerAnglesToOrientation({ altitudeAngle: Math.PI / 4, azimuthAngle: radians });
        near(result.altitude, 45);
        near(result.azimuth, azimuth);
    });
}

test('spherical and planar input agree throughout quadrants and reconstruct the source axis', () => {
    for (const altitudeAngle of [Math.PI / 12, Math.PI / 6, Math.PI / 4, Math.PI / 3]) {
        for (const azimuthAngle of [0, 0.25, 1, 2, 3, 4, 5, 6, 2 * Math.PI]) {
            const tiltX = Math.atan(Math.cos(azimuthAngle) / Math.tan(altitudeAngle)) * 180 / Math.PI;
            const tiltY = Math.atan(Math.sin(azimuthAngle) / Math.tan(altitudeAngle)) * 180 / Math.PI;
            const spherical = pointerAnglesToOrientation(Object.freeze({ altitudeAngle, azimuthAngle }));
            const planar = pointerTiltToOrientation(Object.freeze({ tiltX, tiltY }));
            near(planar.altitude, spherical.altitude);
            near(planar.azimuth, spherical.azimuth);
            const pose = { tabletX: 192, tabletY: 108, distance: 0, barrel: 0, ...spherical };
            const { axis } = penTransform(pose, tablet, 3);
            near(axis.x, Math.cos(altitudeAngle) * Math.cos(azimuthAngle));
            near(axis.y, Math.sin(altitudeAngle));
            near(axis.z, Math.cos(altitudeAngle) * Math.sin(azimuthAngle));
            const derived = planarTilt(spherical.altitude, spherical.azimuth);
            near(derived.tiltX, tiltX); near(derived.tiltY, tiltY);
        }
    }
});

test('upright direction is undefined and zero radians is valid horizontal input', () => {
    assert.deepEqual(pointerAnglesToOrientation({ altitudeAngle: Math.PI / 2, azimuthAngle: 0 }), { altitude: 0, azimuth: null });
    assert.deepEqual(pointerTiltToOrientation({ tiltX: 0, tiltY: 0 }), { altitude: 0, azimuth: null });
    assert.deepEqual(pointerAnglesToOrientation({ altitudeAngle: 0, azimuthAngle: 0 }), { altitude: 90, azimuth: 90 });
    assert.deepEqual(pointerAnglesToOrientation({ altitudeAngle: 0, azimuthAngle: 2 * Math.PI }), { altitude: 90, azimuth: 90 });
});

test('horizontal planar cardinal directions are known but ambiguous pairs retain null azimuth', () => {
    for (const [tiltX, tiltY, azimuth] of [[90, 0, 90], [-90, 0, 270], [0, 90, 0], [0, -90, 180], [90, 90, null], [-90, -90, null], [90, 12, null]]) {
        assert.deepEqual(pointerTiltToOrientation({ tiltX, tiltY }), { altitude: 90, azimuth });
    }
});

test('recorded orientation remains valid beyond the teaching slider limit', () => {
    const spherical = pointerAnglesToOrientation({ altitudeAngle: Math.PI / 18, azimuthAngle: 0 });
    near(spherical.altitude, 80);
    assert.ok(spherical.altitude > PEN_RANGES.tiltAltitude.max);
    near(pointerTiltToOrientation({ tiltX: 80, tiltY: 0 }).altitude, 80);
});

test('missing measurements stay null; incomplete pairs are rejected', () => {
    for (const convert of [pointerAnglesToOrientation, pointerTiltToOrientation]) {
        assert.equal(convert({}), null);
    }
    assert.equal(pointerAnglesToOrientation({ altitudeAngle: null, azimuthAngle: null }), null);
    assert.equal(pointerTwistToBarrel(undefined, 0), null);
    assert.equal(clientToTablet({}, rect, tablet), null);
    assert.throws(() => pointerAnglesToOrientation({ altitudeAngle: 0 }), /Both/);
    assert.throws(() => pointerTiltToOrientation({ tiltY: 0 }), /Both/);
    assert.throws(() => clientToTablet({ clientX: 0 }, rect, tablet), /Both/);
});

test('invalid angle values are rejected without coercion or clamping', () => {
    for (const invalid of [NaN, Infinity, -Infinity, '0']) {
        assert.throws(() => pointerAnglesToOrientation({ altitudeAngle: invalid, azimuthAngle: 0 }), /finite/);
        assert.throws(() => pointerTiltToOrientation({ tiltX: invalid, tiltY: 0 }), /finite/);
        assert.throws(() => pointerTwistToBarrel(invalid, 0), /finite/);
    }
    for (const altitudeAngle of [-0.01, 2]) assert.throws(() => pointerAnglesToOrientation({ altitudeAngle, azimuthAngle: 0 }), RangeError);
    for (const azimuthAngle of [-0.01, 7]) assert.throws(() => pointerAnglesToOrientation({ altitudeAngle: 1, azimuthAngle }), RangeError);
    for (const tiltX of [-91, 91]) assert.throws(() => pointerTiltToOrientation({ tiltX, tiltY: 0 }), RangeError);
    assert.throws(() => pointerTwistToBarrel(360, 0), RangeError);
});

test('twist reverses clockwise direction with explicit zero calibration and wrapping', () => {
    assert.equal(pointerTwistToBarrel(0, 0), 0);
    assert.equal(pointerTwistToBarrel(90, 0), 270);
    assert.equal(pointerTwistToBarrel(359, 0), 1);
    assert.equal(pointerTwistToBarrel(90, 30), 300);
    assert.equal(pointerTwistToBarrel(0, 720), 0);
    assert.throws(() => pointerTwistToBarrel(0, undefined), /finite/);
});

test('client rectangle maps all corners and center without a device-pixel-ratio assumption', () => {
    for (const [clientX, clientY, tabletX, tabletY] of [
        [10, 20, 0, 0], [778, 20, 384, 0], [10, 452, 0, 216], [778, 452, 384, 216], [394, 236, 192, 108],
    ]) assert.deepEqual(clientToTablet({ clientX, clientY }, rect, tablet), { tabletX, tabletY, inside: true });
    const outside = clientToTablet({ clientX: 8, clientY: 454 }, rect, tablet);
    near(outside.tabletX, -1); near(outside.tabletY, 217);
    assert.equal(outside.inside, false);
});

test('invalid capture geometry and coordinates fail before conversion', () => {
    for (const width of [0, -1, NaN, Infinity]) assert.throws(() => clientToTablet({}, { ...rect, width }, tablet), RangeError);
    assert.throws(() => clientToTablet({}, rect, { width: 0, depth: 216 }), RangeError);
    assert.throws(() => clientToTablet({ clientX: Infinity, clientY: 0 }, rect, tablet), RangeError);
    assert.throws(() => clientToTablet({ clientX: 1e308, clientY: 0 }, { ...rect, width: 1e-308 }, tablet), RangeError);
});

test('documented dimensions, placement, and physical units match config', () => {
    assert.equal(TABLET.width, 384); assert.equal(TABLET.depth, 216);
    assert.equal(TABLET.width + 2 * TABLET.bodyMargin, 434);
    assert.equal(TABLET.depth + 2 * TABLET.bodyMargin, 266);
    near(TABLET.thickness, 5.28);
    assert.equal(MONITOR.z, -288);
    assert.equal(inchesToMillimetres(1), 25.4);
    near(inchesToMillimetres(16), 406.4);
    assert.notEqual(inchesToMillimetres(1), SCALE);
    assert.throws(() => inchesToMillimetres(NaN), RangeError);
    assert.throws(() => inchesToMillimetres(1e308), RangeError);
});
