import test from 'node:test';
import assert from 'node:assert/strict';
import { createClip, evaluateClip } from '../src/lib/sim/timeline.js';
import { createTransport } from '../src/lib/sim/transport.js';
import { Pen3DSim } from '../src/lib/sim/index.js';

const simple = () => createClip([
    { id: 'a', time: 0, values: { x: 0 } }, { id: 'b', time: 1000, values: { x: 100 } },
]);

test('recorded angles use the shortest path while authored forward sweeps remain unchanged', () => {
    for (const [a, b, expected] of [[55, 54, 54.5], [54, 55, 54.5], [359, 1, 0], [1, 359, 0], [20, 20, 20]]) {
        const samples = [{ id: 'a', time: 0, values: { angle: a } }, { id: 'b', time: 100, values: { angle: b } }];
        const clip = createClip(samples, { channels: { angle: 'angle-shortest' } });
        assert.equal(evaluateClip(clip, 50).values.angle, expected);
        assert.equal(evaluateClip(clip, 0).values.angle, a);
        assert.equal(evaluateClip(clip, 100).values.angle, b);
    }
    const sweep = createClip([{ id: 'a', time: 0, values: { angle: 0 } },
        { id: 'b', time: 100, values: { angle: 359 } }], { channels: { angle: 'angle' } });
    assert.equal(evaluateClip(sweep, 50).values.angle, 179.5);
});
function clock(clip = simple(), callback = () => {}) {
    let time = 0, id = 0;
    const queued = new Map(), history = [], frames = [];
    const transport = createTransport({ now: () => time,
        requestFrame: fn => { queued.set(++id, fn); history.push(fn); return id; },
        cancelFrame: id => queued.delete(id),
        onFrame: result => { frames.push(result); callback(result, transport); },
    });
    transport.load(clip);
    return { transport, frames, history, queued,
        setTime: value => { time = value; },
        tick: value => { time = value; const next = queued.entries().next().value;
            if (next) { queued.delete(next[0]); next[1](time); } },
    };
}

test('explicit timestamps evaluate identical values independent of playback cadence', () => {
    for (const times of [[500], [10, 50, 100, 499, 500]]) {
        const c = clock(); c.transport.play(); times.forEach(c.tick);
        assert.equal(c.frames.at(-1).values.x, 50);
        c.transport.seek(500); assert.equal(c.frames.at(-1).values.x, 50);
        c.transport.seek(100); c.transport.seek(500); assert.equal(c.frames.at(-1).values.x, 50);
    }
});

test('duplicate timestamps seek to last event while steps preserve every exact sample ID', () => {
    const clip = createClip([
        { id: 'down', time: 0, values: { x: 0, pressed: true } },
        { id: 'first', time: 500, values: { x: 50, pressed: true } },
        { id: 'up', time: 500, values: { x: 51, pressed: false } },
        { id: 'end', time: 1000, values: { x: 100, pressed: false } },
    ]);
    assert.equal(evaluateClip(clip, 500).sampleId, 'up');
    const c = clock(clip);
    c.transport.step(1); assert.equal(c.frames.at(-1).sampleId, 'first');
    c.transport.step(1); assert.equal(c.frames.at(-1).sampleId, 'up');
    c.transport.step(-1); assert.equal(c.frames.at(-1).sampleId, 'first');
    assert.equal(c.frames.at(-1).values.pressed, true);
    c.transport.seek(250); c.transport.step(1); assert.equal(c.frames.at(-1).sampleId, 'first');
});

test('camera numbers, angular pose and annotation state use a common time with explicit policies', () => {
    const samples = [
        { id: 'a', time: 0, values: { angle: 350, cameraX: 10, annotation: false, event: 'down' } },
        { id: 'b', time: 100, values: { angle: 10, cameraX: 30, annotation: true, event: 'up' } },
    ];
    const clip = createClip(samples, { channels: { angle: 'angle' } });
    assert.deepEqual(evaluateClip(clip, 50).values, { angle: 0, cameraX: 20, annotation: false, event: 'down' });
    assert.deepEqual(evaluateClip(clip, 100).values, samples[1].values);
    assert.deepEqual(evaluateClip(createClip(samples, { maxGapMs: 20 }), 90).values, samples[0].values);
    const held = createClip(samples, { channels: { cameraX: 'hold' } });
    assert.equal(evaluateClip(held, 90).values.cameraX, 10);
});

test('clip snapshots and configuration cannot be mutated by their author or consumer', () => {
    const samples = [{ id: 'a', time: 0, values: { x: 0 } }, { id: 'b', time: 100, values: { x: 100 } }];
    const clip = createClip(samples, { easing: 'cubic' });
    samples[0].values.x = 999;
    const result = evaluateClip(clip, 25);
    assert.equal(result.values.x, 6.25);
    result.values.x = 900;
    assert.equal(evaluateClip(clip, 25).values.x, 6.25);
    assert.throws(() => { clip.samples[0].values.x = 1; }, TypeError);
});

test('invalid timelines and timestamps fail before playback', () => {
    for (const samples of [[], [{ id: 'a', time: 0, values: { x: 0 } }],
        [{ id: 'a', time: 1, values: { x: 0 } }, { id: 'b', time: 2, values: { x: 1 } }],
        [{ id: 'a', time: 0, values: { x: 0 } }, { id: 'a', time: 2, values: { x: 1 } }],
        [{ id: 'a', time: 0, values: { x: 0 } }, { id: 'b', time: 2, values: { y: 1 } }],
        [{ id: 'a', time: 0, values: { x: 0 } }, { id: 'b', time: 2, values: { x: NaN } }]]) {
        assert.throws(() => createClip(samples), RangeError);
    }
    assert.throws(() => evaluateClip(simple(), NaN), RangeError);
    assert.throws(() => createClip(simple().samples, { maxGapMs: '100' }), RangeError);
    assert.equal(evaluateClip(simple(), -10).time, 0);
    assert.equal(evaluateClip(simple(), 9999).time, 1000);
});

for (const action of ['pause', 'seek', 'stop', 'clear', 'dispose']) {
    test(`${action} invalidates already-delivered RAF callbacks and prevents competing writes`, () => {
        const c = clock(); c.transport.play(); c.setTime(200);
        const stale = c.history[0]; c.transport[action](300);
        const count = c.frames.length; stale(900);
        assert.equal(c.frames.length, count); assert.equal(c.queued.size, 0);
        if (action === 'dispose') { c.transport.load(simple()); c.transport.play(); assert.equal(c.queued.size, 0); }
    });
}

test('pause resumes from the precise paused time and speed changes re-anchor the clock', () => {
    const c = clock(); c.transport.play(); c.tick(200); c.setTime(250); c.transport.pause();
    assert.equal(c.transport.snapshot().time, 250);
    c.setTime(1000); c.transport.play(); c.tick(1100);
    assert.equal(c.transport.snapshot().time, 350);
    c.transport.setSpeed(2); c.tick(1200);
    assert.equal(c.transport.snapshot().time, 550);
});

test('in/out range, speed and looping are deterministic across large frame gaps', () => {
    const c = clock(); c.transport.setRange(200, 800); c.transport.setLoop(true);
    c.transport.setSpeed(2); c.transport.play(); c.tick(1000);
    assert.equal(c.transport.snapshot().time, 400);
    c.transport.seek(999); assert.equal(c.transport.snapshot().time, 800);
    assert.equal(c.transport.snapshot().playing, false);
    c.transport.stop(); assert.equal(c.transport.snapshot().time, 200);
    c.transport.step(1); assert.equal(c.transport.snapshot().time, 200); // no key inside this range
    assert.throws(() => c.transport.setRange(800, 200), RangeError);
    assert.throws(() => c.transport.setSpeed(0), RangeError);
});

test('endpoints render exactly once at completion and Play can restart', () => {
    const c = clock(); c.transport.play(); c.tick(1500);
    assert.equal(c.frames.at(-1).sampleId, 'b'); assert.equal(c.queued.size, 0);
    assert.equal(c.transport.snapshot().playing, false);
    c.transport.play(); assert.equal(c.frames.at(-1).sampleId, 'a'); assert.equal(c.queued.size, 1);
});

test('a callback that cancels during a frame cannot schedule another writer', () => {
    const c = clock(simple(), (result, transport) => { if (result.time > 0) transport.clear(); });
    c.transport.play(); c.tick(200);
    assert.equal(c.queued.size, 0); assert.equal(c.transport.snapshot().loaded, false);
});

test('complete pose updates validate atomically and refresh the scene once', () => {
    const sim = Object.create(Pen3DSim.prototype); let writes = 0;
    sim._refreshPen = () => writes++;
    const pose = { distance: 5, tiltAltitude: 30, tiltAzimuth: 90, barrelRotation: 20, tabletX: 42, tabletY: 90 };
    assert.deepEqual(sim.setPose(pose), pose); assert.equal(writes, 1);
    assert.equal(sim.tabletOffsetX, 42);
    assert.throws(() => sim.setPose({ ...pose, distance: 9, tabletY: NaN }), RangeError);
    assert.equal(sim.distance, 5); assert.equal(writes, 1);
});
