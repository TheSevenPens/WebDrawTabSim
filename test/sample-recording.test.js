import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSampleRecording } from '../src/lib/sim/sample-recording.js';
import { evaluateClip } from '../src/lib/sim/timeline.js';
import { createTransport } from '../src/lib/sim/transport.js';
import { PEN_RANGES } from '../src/lib/sim/config.js';

const source = JSON.parse(readFileSync(new URL('../src/lib/samples/approach-confirmed-stroke-1.json', import.meta.url)));
const loops = JSON.parse(readFileSync(new URL('../src/lib/samples/four-loops-stroke-1.json', import.meta.url)));

test('both recordings interpolate every angular interval without spurious full turns', () => {
    const clips = [createSampleRecording(source).clip,
        createSampleRecording(loops, { contactOnly: true, illustrativeDurationMs: 2000 }).clip];
    const delta = (a, b) => ((b - a + 540) % 360) - 180;
    let decreasingIntervals = 0;
    for (const clip of clips) for (let i = 0; i < clip.samples.length - 1; i++) {
        const a = clip.samples[i], b = clip.samples[i + 1];
        if (a.time === b.time) continue;
        const mid = evaluateClip(clip, (a.time + b.time) / 2);
        for (const key of ['tiltAzimuth', 'barrelRotation']) {
            const change = delta(a.values[key], b.values[key]);
            if (change < 0) decreasingIntervals++;
            assert.ok(Math.abs(delta(a.values[key], mid.values[key]) - change / 2) < 1e-8,
                `${a.id} ${key} should follow the short path`);
        }
    }
    assert.ok(decreasingIntervals > 0, 'exercise the decreases that previously caused spins');
});

test('older loop sample uses explicit illustrative timing without fabricating measured channels', () => {
    const original = JSON.stringify(loops);
    assert.throws(() => createSampleRecording(loops), /missing arrived/);
    const { clip, rows, timeOriginMicroseconds } = createSampleRecording(loops, { contactOnly: true, illustrativeDurationMs: 2000 });
    assert.equal(rows.length, 146);
    assert.equal(clip.duration, 2000);
    assert.equal(timeOriginMicroseconds, null);
    assert.equal(loops.columns.includes('height'), false);
    assert.equal(loops.columns.includes('arrived'), false);
    for (const [index, sample] of clip.samples.entries()) {
        assert.equal(sample.id, `stroke-0/readings/${index}`);
        assert.deepEqual(rows[index].row, loops.stroke.readings[index]);
        assert.equal(sample.values.phase, 'Contact');
        assert.equal(sample.values.distance, 0);
        assert.equal(sample.time, index / 145 * 2000);
        assert.ok(sample.values.tabletX >= 132 - 1e-10 && sample.values.tabletX <= 252 + 1e-10);
        assert.ok(sample.values.tabletY >= 73 - 1e-10 && sample.values.tabletY <= 143 + 1e-10);
        for (const [key, range] of Object.entries(PEN_RANGES)) if (key in sample.values)
            assert.ok(sample.values[key] >= range.min && sample.values[key] <= range.max, key);
    }
    assert.equal(JSON.stringify(loops), original);
    assert.throws(() => createSampleRecording(loops, { illustrativeDurationMs: 2000 }), /contact-only/);
});

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
