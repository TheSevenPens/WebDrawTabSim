import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSampleRecording } from '../src/lib/sim/sample-recording.js';
import { evaluateClip } from '../src/lib/sim/timeline.js';
import { createTransport } from '../src/lib/sim/transport.js';
import { PEN_RANGES } from '../src/lib/sim/config.js';

const source = JSON.parse(readFileSync(new URL('../src/lib/samples/approach-confirmed-stroke-1.json', import.meta.url)));

test('sample preserves all source rows and host-clock ties while fitting inside the tablet', () => {
    const original = JSON.stringify(source);
    const { clip, rows, timeOriginMicroseconds } = createSampleRecording(source);
    assert.equal(rows.length, 418);
    assert.equal(timeOriginMicroseconds, -234232);
    assert.equal(clip.duration, 2599.141);
    assert.equal(clip.samples.filter((s, i) => i && s.time === clip.samples[i - 1].time).length, 265);
    for (const { values } of clip.samples) {
        for (const [key, range] of Object.entries(PEN_RANGES)) if (key in values)
            assert.ok(values[key] >= range.min && values[key] <= range.max, key);
        assert.ok(values.tabletX >= 132 - 1e-10 && values.tabletX <= 252 + 1e-10);
        assert.ok(values.tabletY >= 73 - 1e-10 && values.tabletY <= 143 + 1e-10);
        if (values.phase === 'Contact') assert.equal(values.distance, 0);
    }
    assert.equal(clip.samples[0].values.tiltAzimuth, 55);
    assert.ok(Math.abs(clip.samples[0].values.barrelRotation - 65.6) < 1e-10);
    assert.equal(JSON.stringify(source), original);
});

test('sample stepping retains every identity including equal-time contact transitions', () => {
    const { clip } = createSampleRecording(source);
    let frame;
    const transport = createTransport({ onFrame: value => { frame = value; } });
    transport.load(clip);
    while (frame.index > 0) transport.step(-1);
    for (let i = 0; i < clip.samples.length; i++) {
        if (i) transport.step(1);
        assert.equal(frame.sampleId, clip.samples[i].id);
        assert.deepEqual(frame.values, clip.samples[i].values);
    }
    transport.seek(234.232);
    assert.equal(frame.values.phase, 'Contact');
    assert.equal(frame.values.distance, 0);
    assert.equal(evaluateClip(clip, 1000).values.phase, 'Contact');
    transport.dispose();
});
