import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { penTransform, planarTilt, tabletToWorld, mapCursor, mapMonitor,
    easeInOutCubic, interpolateAngle } from '../src/lib/sim/math.js';

const reference = JSON.parse(readFileSync(new URL('./fixtures/math-reference.json', import.meta.url)));
const xyz = point => [point.x, point.y, point.z];
const near = (actual, expected, epsilon = 1e-10) => {
    assert.equal(actual.length, expected.length);
    actual.forEach((value, i) => assert.ok(Math.abs(value - expected[i]) <= epsilon,
        `component ${i}: expected ${expected[i]}, got ${value}`));
};

for (const fixture of reference.fixtures) {
    test(`portable math matches pre-extraction reference: ${fixture.name}`, () => {
        const { pose, mapping, expected } = fixture;
        Object.freeze(pose); Object.freeze(mapping);
        const result = penTransform(pose, reference.tablet, reference.tipLength);
        near(xyz(result.tip), expected.tip);
        near(xyz(result.origin), expected.origin);
        near(xyz(result.axis), expected.axis);
        near([...xyz(result.quaternion), result.quaternion.w], expected.quaternion);
        const tilt = planarTilt(pose.altitude, pose.azimuth);
        near([tilt.tiltX, tilt.tiltY], expected.tilt);
        const cursor = mapCursor({ x: result.tip.x, z: result.tip.z }, tilt, mapping, reference.tablet);
        near([cursor.x, cursor.z], expected.cursor);
        near(xyz(mapMonitor(cursor, reference.tablet, reference.screen)), expected.monitor);
    });
}

test('cardinal lean directions and barrel invariance have explicit expected axes', () => {
    const pose = { tabletX: 192, tabletY: 108, distance: 4, altitude: 30, barrel: 0 };
    const up = Math.sqrt(3) / 2;
    for (const [azimuth, axis, tilt] of [
        [0, [0, up, 0.5], [0, 30]], [90, [0.5, up, 0], [30, 0]],
        [180, [0, up, -0.5], [0, -30]], [270, [-0.5, up, 0], [-30, 0]],
    ]) {
        for (const barrel of [0, 90, 180, 360]) {
            const result = penTransform({ ...pose, azimuth, barrel }, reference.tablet, 3);
            near(xyz(result.axis), axis);
            near(xyz(result.tip), [0, 6.64, 0]);
        }
        const result = planarTilt(pose.altitude, azimuth);
        near([result.tiltX, result.tiltY], tilt);
    }
});

test('upright and parallel pose axis are finite; tablet coordinates clamp before mapping', () => {
    const pose = { tabletX: -10, tabletY: 999, distance: 5, altitude: 0, azimuth: 123, barrel: 42 };
    near(xyz(tabletToWorld(pose, reference.tablet)), [-192, 7.64, 108]);
    near(xyz(penTransform(pose, reference.tablet, 3).axis), [0, 1, 0]);
    near(xyz(penTransform({ ...pose, altitude: 90, azimuth: 90 }, reference.tablet, 3).axis), [1, 0, 0]);
});

test('monitor maps tablet corners with front at screen top and extrapolates outside', () => {
    const { tablet, screen } = reference;
    near(xyz(mapMonitor({ x: -192, z: -108 }, tablet, screen)), [-240, 355, 30]);
    near(xyz(mapMonitor({ x: 192, z: 108 }, tablet, screen)), [240, 85, 30]);
    near(xyz(mapMonitor({ x: 384, z: 216 }, tablet, screen)), [480, -50, 30]);
});

test('edge range includes the edge, fades to zero, and does not pull an outside point back', () => {
    const mapping = { ...reference.fixtures[0].mapping, edgeAttraction: 10, edgeAttractionRange: 20 };
    const tilt = { tiltX: 0, tiltY: 0 };
    for (const [x, expected] of [[-192, -182], [-182, -177], [-172, -172], [-193, -193], [192, 182]]) {
        const cursor = mapCursor({ x, z: 0 }, tilt, mapping, reference.tablet);
        near([cursor.x, cursor.z], [expected, 0]);
    }
    const cursor = mapCursor({ x: -192, z: -108 }, tilt, { ...mapping, edgeAttraction: -10 }, reference.tablet);
    near([cursor.x, cursor.z], [-202, -118]);
});

test('nonpositive scale pins the source, nonpositive compensation gains disable that direction', () => {
    const mapping = { ...reference.fixtures[0].mapping, scalingFactor: -1,
        cursorOffsetX: 5, cursorOffsetY: -4, tiltCompensationPosTiltXValue: -2,
        tiltCompensationNegTiltYValue: 2 };
    const cursor = mapCursor({ x: 180, z: 90 }, { tiltX: 30, tiltY: -45 }, mapping, reference.tablet);
    near([cursor.x, cursor.z], [5, -25.6]);
});

test('animation easing and forward wrapping retain existing endpoints and direction', () => {
    near([0, 0.25, 0.5, 0.75, 1].map(easeInOutCubic), [0, 0.0625, 0.5, 0.9375, 1]);
    assert.equal(interpolateAngle(350, 10, 0.5), 0);
    assert.equal(interpolateAngle(10, 350, 0.5), 180);
    assert.equal(interpolateAngle(-10, 370, 1), 10);
    assert.equal(interpolateAngle(0, 360, 0.5), 0);
    assert.equal(interpolateAngle(720, -90, 0), 0);
});
