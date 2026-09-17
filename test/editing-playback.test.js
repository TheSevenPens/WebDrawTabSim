import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { normalizeNumber } from '../src/lib/number-input.js';
import { createPlaybackController } from '../src/lib/sim/playback.js';
import { runParameterAnimation } from '../src/lib/sim/animations.js';
import { Pen3DSim } from '../src/lib/sim/index.js';

test('numeric commits preserve zero and round/clamp without truthiness fallback', () => {
    for (const min of [-120, -1, 0]) {
        assert.equal(normalizeNumber(0, min, 120, 2), 0);
        assert.equal(normalizeNumber(0.001, min, 120, 2), 0);
    }
    assert.equal(normalizeNumber(-1.236, -120, 120, 2), -1.24);
    assert.equal(normalizeNumber(-999, -120, 120, 2), -120);
    assert.equal(normalizeNumber(999, -120, 120, 2), 120);
    for (const value of [NaN, Infinity, -Infinity, undefined]) {
        assert.equal(normalizeNumber(value, -120, 120, 2), -120);
    }
});

function timers() {
    const callbacks = [];
    const cleared = new Set();
    const controller = createPlaybackController({
        setTimer: callback => { callbacks.push(callback); return callbacks.length - 1; },
        clearTimer: id => cleared.add(id),
    });
    return { controller, callbacks, cleared };
}

test('rapid starts replace pending work even if an old timer is delivered', () => {
    const { controller, callbacks, cleared } = timers();
    const starts = [];
    controller.start(() => { starts.push('old'); }, 500);
    controller.start(() => { starts.push('new'); }, 500);
    callbacks[0]();
    callbacks[1]();
    assert.deepEqual(starts, ['new']);
    assert.ok(cleared.has(0));
});

test('cancel handles pending Reset and active edits; new animation stops its predecessor', () => {
    const { controller, callbacks } = timers();
    let starts = 0, stops = 0;
    const start = () => { starts++; return () => stops++; };
    controller.start(start, 500);
    controller.cancel();
    callbacks[0]();
    assert.equal(starts, 0);
    controller.start(start);
    callbacks[1]();
    controller.start(start);
    assert.equal(stops, 1);
    callbacks[2]();
    controller.cancel();
    controller.cancel();
    assert.equal(starts, 2);
    assert.equal(stops, 2);
});

test('disposal cancels work and permanently rejects new starts', () => {
    const { controller, callbacks } = timers();
    let starts = 0;
    controller.start(() => starts++);
    controller.dispose();
    callbacks[0]();
    controller.start(() => starts++);
    assert.equal(starts, 0);
    assert.equal(callbacks.length, 1);
});

test('a synchronous cancellation during start also stops the returned animation', () => {
    const { controller, callbacks } = timers();
    let stopped = false;
    controller.start(() => {
        controller.cancel();
        return () => { stopped = true; };
    });
    callbacks[0]();
    assert.ok(stopped);
});

for (const kind of ['parameter', 'demo']) {
    test(`${kind} cancellation from a frame callback does not schedule another frame`, t => {
        const callbacks = [];
        t.mock.method(globalThis, 'requestAnimationFrame', callback => {
            callbacks.push(callback); return callbacks.length;
        });
        t.mock.method(globalThis, 'cancelAnimationFrame', () => {});
        const sim = Object.create(Pen3DSim.prototype);
        sim.updatePenTransform = () => {};
        let stop;
        const onFrame = () => stop();
        stop = kind === 'demo' ? sim.animateToDemo(onFrame) :
            runParameterAnimation(sim, 8000, onFrame);
        callbacks[0](performance.now() + 100);
        assert.equal(callbacks.length, 1);
    });

    test(`${kind} RAF cannot write or reschedule after cancellation`, t => {
        const callbacks = [];
        t.mock.method(globalThis, 'requestAnimationFrame', callback => {
            callbacks.push(callback); return callbacks.length;
        });
        t.mock.method(globalThis, 'cancelAnimationFrame', () => {});
        const sim = Object.create(Pen3DSim.prototype);
        let writes = 0;
        sim.updatePenTransform = () => { writes++; };
        const stop = kind === 'demo' ? sim.animateToDemo(() => {}) :
            runParameterAnimation(sim, 8000, () => writes++);
        stop();
        callbacks[0](performance.now() + 100);
        assert.equal(writes, 0);
        assert.equal(callbacks.length, 1);
    });
}

// Node has no browser RAF globals. Define placeholders for mock.method above.
globalThis.requestAnimationFrame ??= () => { throw new Error('Unexpected RAF'); };
globalThis.cancelAnimationFrame ??= () => {};

function poseFixture() {
    const sim = Object.create(Pen3DSim.prototype);
    Object.assign(sim, { yOffset: 2.64, tabletWidth: 384, tabletDepth: 216,
        tabletOffsetX: 192, tabletOffsetY: 108, tiltAltitude: 45, penGroup: new THREE.Group() });
    for (const key of ['_azimuthQuat', '_altitudeQuat', '_barrelQuat', '_penQuaternion']) sim[key] = new THREE.Quaternion();
    for (const key of ['penTopWorld', 'penTopLocal', 'penTopSurfaceBelow', 'penTipWorld',
        'penTipLocal', 'penTipSurfaceBelow', '_penAxisDir', 'penAxisIntersection']) sim[key] = new THREE.Vector3();
    for (const key of ['penLine', 'penAxisLine', 'penTipLine']) {
        sim[key + 'Positions'] = new Float32Array(6);
        sim[key + 'Geometry'] = new THREE.BufferGeometry().setAttribute('position',
            new THREE.BufferAttribute(sim[key + 'Positions'], 3));
        sim[key] = new THREE.Line(sim[key + 'Geometry'], new THREE.LineDashedMaterial());
    }
    return sim;
}

test('pen-top-line preference survives pose updates in both device modes', () => {
    const sim = poseFixture();
    for (const mode of [false, true]) {
        sim.penDisplayMode = mode;
        sim.setPenTopLineVisible(false);
        for (const altitude of [45, 0, 30]) {
            sim.updatePenPose(5, altitude, 120, 90);
            assert.equal(sim.penLine.visible, false);
        }
        sim.setPenTopLineVisible(true);
        sim.updatePenPose(5, 30, 0, 0);
        assert.equal(sim.penLine.visible, true);
        sim.updatePenPose(5, 0, 0, 0);
        assert.equal(sim.penLine.visible, false);
    }
});

function inputFixture(t) {
    const originalDocument = globalThis.document, originalWindow = globalThis.window;
    const doc = new EventTarget(), win = new EventTarget(), canvas = new EventTarget();
    doc.body = new EventTarget();
    const captures = new Set();
    Object.assign(canvas, { style: {}, setAttribute() {}, focus() {},
        setPointerCapture: id => captures.add(id), hasPointerCapture: id => captures.has(id),
        releasePointerCapture: id => captures.delete(id) });
    globalThis.document = doc;
    globalThis.window = win;
    const sim = Object.create(Pen3DSim.prototype);
    Object.assign(sim, { renderer: { domElement: canvas }, controls: { enabled: true },
        mouseSensitivity: 0.24, tabletWidth: 384, tabletDepth: 216,
        tabletOffsetX: 192, tabletOffsetY: 108,
        setTabletPositionX(x) { this.tabletOffsetX = x; },
        setTabletPositionY(y) { this.tabletOffsetY = y; } });
    sim.initMouseControl();
    t.after(() => {
        sim.disposeMouseControl();
        globalThis.document = originalDocument;
        globalThis.window = originalWindow;
    });
    return { sim, doc, win, canvas, captures };
}
function key(target) {
    return { code: 'Space', target, preventDefault() { this.prevented = true; } };
}
function pointer(canvas, type, id = 1, x = 10, y = 20) {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { pointerId: id, button: 0, clientX: x, clientY: y });
    canvas.dispatchEvent(event);
}

test('Space is not consumed on inputs/buttons or away from the viewport', t => {
    const { sim, doc, canvas } = inputFixture(t);
    canvas.dispatchEvent(new Event('pointerenter'));
    for (const target of [new EventTarget(), new EventTarget()]) {
        const event = key(target);
        sim.handleKeyDown(event);
        assert.equal(event.prevented, undefined);
        assert.equal(sim.controls.enabled, true);
    }
    canvas.dispatchEvent(new Event('pointerleave'));
    const event = key(doc.body);
    sim.handleKeyDown(event);
    assert.equal(event.prevented, undefined);
});

test('captured pen drag cancels playback, ignores other pointers, and maps mm per pixel', t => {
    const { sim, canvas, captures } = inputFixture(t);
    let cancelled = false;
    sim.onPenInteraction = () => { cancelled = true; };
    sim.handleKeyDown(key(canvas));
    pointer(canvas, 'pointerdown');
    assert.ok(cancelled);
    assert.ok(captures.has(1));
    pointer(canvas, 'pointermove', 2, 100, 100);
    assert.equal(sim.tabletOffsetX, 192);
    pointer(canvas, 'pointermove', 1, 20, 40);
    assert.equal(sim.tabletOffsetX, 194.4);
    assert.equal(sim.tabletOffsetY, 112.8);
    pointer(canvas, 'pointerup');
    assert.equal(sim.controls.enabled, true);
    assert.equal(captures.size, 0);
});

for (const recovery of ['blur', 'pointercancel', 'lostpointercapture', 'keyup', 'dispose']) {
    test(`${recovery} releases drag and restores camera controls`, t => {
        const { sim, canvas, win, captures } = inputFixture(t);
        sim.handleKeyDown(key(canvas));
        pointer(canvas, 'pointerdown');
        if (recovery === 'blur') win.dispatchEvent(new Event('blur'));
        else if (recovery === 'keyup') sim.handleKeyUp(key(canvas));
        else if (recovery === 'dispose') sim.disposeMouseControl();
        else pointer(canvas, recovery);
        assert.equal(sim.controls.enabled, true);
        assert.equal(sim.isDraggingPen, false);
        assert.equal(sim.spaceBarPressed, false);
        assert.equal(canvas.style.cursor, '');
        assert.equal(captures.size, 0);
    });
}
