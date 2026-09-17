import test from 'node:test';
import assert from 'node:assert/strict';
import { createSceneController } from '../src/lib/sim/scene-document.js';
import { attachEditGestures, historyShortcut } from '../src/lib/edit-gestures.js';

function fixture(options = {}) {
    const rendered = [];
    const controller = createSceneController({ apply: next => rendered.push(next), ...options });
    const edit = (distance, options) => controller.replace({ ...controller.snapshot(),
        pose: { ...controller.snapshot().pose, distance } }, options);
    return { controller, edit, rendered };
}

test('undo and redo restore complete snapshots and emit their availability and labels', () => {
    const statuses = [];
    const { controller: c } = fixture({ onHistoryChange: status => statuses.push(status) });
    const initial = c.snapshot(), next = c.snapshot();
    next.pose.distance = 10; next.mapping.scalingFactor = 0.5;
    next.annotations.showTiltX = true; next.presentation.axonometric = true;
    next.camera.orthographicZoom = 3;
    c.replace(next, { label: 'Load scene' });
    assert.equal(c.historyStatus().undoLabel, 'Load scene');
    assert.equal(c.undo(), true); assert.deepEqual(c.snapshot(), initial);
    assert.deepEqual(statuses.at(-1), { canUndo: false, canRedo: true, undoLabel: '', redoLabel: 'Load scene' });
    assert.equal(c.redo(), true); assert.deepEqual(c.snapshot(), next);
    assert.equal(c.redo(), false);
});

test('a continuous gesture has one history entry and undo during a gesture finalizes it', () => {
    const { controller: c, edit } = fixture();
    c.beginEdit('Drag pen');
    for (let i = 1; i <= 20; i++) edit(i);
    assert.equal(c.historyStatus().undoLabel, 'Drag pen');
    c.undo(); assert.equal(c.snapshot().pose.distance, 0);
    assert.equal(c.undo(), false);
    c.redo(); assert.equal(c.snapshot().pose.distance, 20);
    c.beginEdit('Second drag'); edit(21); edit(22); c.endEdit();
    c.undo(); assert.equal(c.snapshot().pose.distance, 20);
});

test('no-op edits and gestures preserve redo; a new edit clears the redo branch', () => {
    const { controller: c, edit } = fixture();
    edit(10); c.undo();
    edit(0); c.beginEdit('No change'); edit(5); edit(0); c.endEdit();
    assert.equal(c.historyStatus().canRedo, true);
    c.beginEdit('New edit'); edit(7);
    assert.equal(c.historyStatus().canRedo, false);
    c.endEdit(); assert.equal(c.redo(), false);
    c.undo(); assert.equal(c.snapshot().pose.distance, 0);
});

test('playback and passive camera observations do not add entries or clear redo', () => {
    const { controller: c, edit } = fixture();
    for (let i = 1; i < 20; i++) edit(i, { record: false });
    assert.equal(c.undo(), false);
    edit(20); c.undo(); assert.equal(c.snapshot().pose.distance, 19);
    edit(21, { record: false });
    const next = c.snapshot(); next.camera.orthographicZoom = 2;
    c.replace(next, { render: false });
    c.redo(); assert.equal(c.snapshot().pose.distance, 20);
    assert.equal(c.snapshot().camera.orthographicZoom, 1);
});

test('invalid input and renderer failures leave history usable', () => {
    let fail = false;
    const { controller: c, edit } = fixture({ apply: () => { if (fail) throw new Error('render failure'); } });
    edit(10);
    const status = c.historyStatus();
    assert.throws(() => edit(25));
    assert.deepEqual(c.historyStatus(), status);
    fail = true;
    assert.throws(() => c.undo(), /render failure/);
    assert.equal(c.snapshot().pose.distance, 10);
    assert.deepEqual(c.historyStatus(), status);
    fail = false; c.undo(); assert.equal(c.snapshot().pose.distance, 0);
});

test('bounded history evicts oldest edits without corrupting redo or leaking snapshot references', () => {
    const { controller: c, edit } = fixture({ historyLimit: 2 });
    edit(1); edit(2); edit(3);
    const copy = c.snapshot(); copy.pose.distance = 22;
    c.undo(); assert.equal(c.snapshot().pose.distance, 2);
    c.undo(); assert.equal(c.snapshot().pose.distance, 1);
    assert.equal(c.undo(), false);
    c.redo(); c.redo(); assert.equal(c.snapshot().pose.distance, 3);
    assert.throws(() => fixture({ historyLimit: 0 }), RangeError);
});

// Exercise the actual DOM grouping adapter using EventTargets, including the
// release paths that are hard to repeat reliably with a physical drag.
function gestureFixture() {
    const root = new EventTarget(), win = new EventTarget();
    const { controller: c, edit } = fixture();
    const gestures = attachEditGestures({ root, windowTarget: win,
        onBegin: label => c.beginEdit(label), onEnd: () => c.endEdit() });
    const target = (type, excluded = false) => ({
        matches: selector => selector === (type === 'canvas' ? '#viewer canvas' : `input[type="${type}"]`),
        closest: () => excluded ? {} : null, getAttribute: () => 'Altitude',
    });
    function emit(owner, type, target, props = {}) {
        const event = new Event(type);
        Object.defineProperty(event, 'target', { value: target });
        Object.assign(event, props); owner.dispatchEvent(event);
    }
    return { c, edit, root, win, gestures, target, emit };
}

for (const ending of ['pointerup', 'pointercancel', 'lostpointercapture', 'blur']) {
    test(`slider gesture ends on ${ending} and the next edit is independent`, () => {
        const f = gestureFixture(), range = f.target('range');
        f.emit(f.root, 'pointerdown', range, { button: 0, pointerId: 1 });
        f.edit(5); f.edit(10);
        f.emit(f.win, ending, range, { pointerId: 1 });
        f.edit(15); f.c.undo(); assert.equal(f.c.snapshot().pose.distance, 10);
        f.c.undo(); assert.equal(f.c.snapshot().pose.distance, 0);
        f.gestures.dispose();
    });
}

test('numeric typing and keyboard slider repeats group until blur or key release', () => {
    const f = gestureFixture(), number = f.target('number'), range = f.target('range');
    f.emit(f.root, 'focusin', number); f.edit(1); f.edit(12);
    f.emit(f.root, 'focusout', number);
    f.emit(f.root, 'keydown', range, { key: 'ArrowRight' }); f.edit(13);
    f.emit(f.root, 'keydown', range, { key: 'ArrowRight', repeat: true }); f.edit(14);
    f.emit(f.win, 'keyup', range, { key: 'ArrowRight' });
    f.c.undo(); assert.equal(f.c.snapshot().pose.distance, 12);
    f.c.undo(); assert.equal(f.c.snapshot().pose.distance, 0);
    f.gestures.dispose();
});

test('unrelated pointers cannot end a pen drag; Space release and teardown do end it', () => {
    const f = gestureFixture(), canvas = f.target('canvas');
    f.emit(f.root, 'pointerdown', canvas, { button: 0, pointerId: 1 }); f.edit(5);
    f.emit(f.win, 'pointerup', canvas, { pointerId: 2 });
    assert.equal(f.gestures.viewportActive(), true); f.edit(10);
    f.emit(f.win, 'keyup', canvas, { code: 'Space' });
    assert.equal(f.gestures.viewportActive(), false);
    f.c.undo(); assert.equal(f.c.snapshot().pose.distance, 0);
    f.gestures.dispose();
    f.emit(f.root, 'pointerdown', canvas, { button: 0, pointerId: 3 });
    assert.equal(f.gestures.viewportActive(), false);
});

test('playback controls are excluded from editing gestures', () => {
    const f = gestureFixture(), range = f.target('range', true);
    f.emit(f.root, 'pointerdown', range, { button: 0, pointerId: 1 });
    f.edit(1); f.edit(2); f.c.undo();
    assert.equal(f.c.snapshot().pose.distance, 1, 'must not group unrelated edits');
    f.gestures.dispose();
});

test('switching tabs closes numeric history even if the removed field emits no blur', () => {
    const f = gestureFixture(), number = f.target('number');
    f.emit(f.root, 'focusin', number); f.edit(1); f.edit(12);
    f.emit(f.root, 'click', f.target('button'));
    f.edit(15); f.c.undo(); assert.equal(f.c.snapshot().pose.distance, 12);
    f.c.undo(); assert.equal(f.c.snapshot().pose.distance, 0);
    f.gestures.dispose();
});

test('history shortcuts leave native input undo, IME and unrelated shortcuts alone', () => {
    const event = { key: 'z', ctrlKey: true, target: { closest: () => null } };
    assert.equal(historyShortcut(event), 'undo');
    assert.equal(historyShortcut({ ...event, shiftKey: true }), 'redo');
    assert.equal(historyShortcut({ ...event, key: 'y' }), 'redo');
    assert.equal(historyShortcut({ ...event, ctrlKey: false, metaKey: true }), 'undo');
    for (const extra of [{ target: { closest: () => ({}) } }, { isComposing: true },
        { defaultPrevented: true }, { altKey: true }, { key: 's' }, { ctrlKey: false }])
        assert.equal(historyShortcut({ ...event, ...extra }), null);
});
