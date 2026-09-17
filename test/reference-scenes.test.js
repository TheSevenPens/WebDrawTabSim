import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateSceneDocument } from '../src/lib/sim/scene-document.js';
import { penTransform, planarTilt, mapCursor } from '../src/lib/sim/math.js';
import { TABLET, PEN_MESH, POINTER_DEFAULTS } from '../src/lib/sim/config.js';

const references = JSON.parse(readFileSync(new URL('../visual/references.json', import.meta.url), 'utf8'));
for (const reference of references.scenes) {
    test(`portable reference scene: ${reference.name}`, () => {
        const scene = validateSceneDocument(JSON.parse(readFileSync(new URL(`./fixtures/scenes/reference/${reference.name}.json`, import.meta.url), 'utf8')));
        const p = scene.pose, m = scene.mapping;
        const transform = penTransform({ ...p, altitude: p.tiltAltitude, azimuth: p.tiltAzimuth, barrel: p.barrelRotation },
            { width: TABLET.width, depth: TABLET.depth, surfaceY: TABLET.thickness / 2 }, PEN_MESH.tipHeight);
        const cursor = mapCursor(transform.tip, planarTilt(p.tiltAltitude, p.tiltAzimuth), {
            ...m, tiltCompensationPosTiltXValue: m.compPosTiltX, tiltCompensationNegTiltXValue: m.compNegTiltX,
            tiltCompensationPosTiltYValue: m.compPosTiltY, tiltCompensationNegTiltYValue: m.compNegTiltY,
            tiltCompensationScale: POINTER_DEFAULTS.tiltCompensationScale,
        }, TABLET);
        const actual = { tip: Object.values(transform.tip), quaternion: Object.values(transform.quaternion), cursor: [cursor.x, cursor.z] };
        for (const key of Object.keys(actual)) actual[key].forEach((value, index) =>
            assert.ok(Math.abs(value - reference.expected[key][index]) < references.numericTolerance, `${key}[${index}]`));
    });
}
