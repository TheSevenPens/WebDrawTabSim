import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { createSceneDocument, validateSceneDocument, parseSceneDocument, serializeSceneDocument,
    createSceneController, MAX_SCENE_BYTES } from '../src/lib/sim/scene-document.js';
import { applySceneDocument } from '../src/lib/sim/scene-renderer.js';
import { Pen3DSim } from '../src/lib/sim/index.js';
import { DEFAULT_PEN, DEMO_POSE } from '../src/lib/sim/config.js';

test('browser-saved orthographic fixture retains exact demo pose and framing', () => {
    const text = readFileSync(new URL('./fixtures/scenes/demo-orthographic.json', import.meta.url), 'utf8');
    const scene = parseSceneDocument(text);
    assert.deepEqual(scene.pose, DEMO_POSE);
    assert.equal(scene.presentation.axonometric, true);
    assert.equal(scene.presentation.darkTablet, true);
    assert.equal(scene.camera.orthographicZoom, 720 / 700);
    assert.deepEqual(parseSceneDocument(serializeSceneDocument(scene)), scene);
});

test('a complete scene round-trips pose, mapping, annotations, presentation and camera', () => {
    const scene = createSceneDocument();
    scene.pose = { ...DEMO_POSE, distance: 12, tabletX: 0, tabletY: 216 };
    scene.mapping.compNegTiltY = 0.75;
    scene.mapping.scalingFactor = 0;
    scene.annotations.showTiltX = true;
    scene.annotations.showPenTopLine = false;
    Object.assign(scene.presentation, { penDisplayMode: true, axonometric: true, aspectRatio: '2 / 3',
        sharpNib: true, cursorMode: 'none', penBodyFormat: 'solid' });
    scene.camera.orthographicZoom = 2.5;
    assert.deepEqual(parseSceneDocument(serializeSceneDocument(scene)), scene);
    assert.equal(serializeSceneDocument(parseSceneDocument(serializeSceneDocument(scene))), serializeSceneDocument(scene));
});

test('invalid documents are rejected before any state or renderer change', () => {
    let applies = 0, notifications = 0;
    const controller = createSceneController({ apply: () => applies++, onChange: () => notifications++ });
    const initial = controller.snapshot();
    for (const corrupt of [
        s => { s.version = 2; }, s => { delete s.pose.tabletX; }, s => { s.extra = 1; },
        s => { s.pose.distance = null; }, s => { s.pose.tabletX = '0'; }, s => { s.mapping.scalingFactor = Infinity; },
        s => { s.annotations.showBarrel = 1; }, s => { s.presentation.cursorMode = 'bad'; },
        s => { s.presentation.aspectRatio = '4 / 3'; }, s => { s.pose.tiltAltitude = 61; },
        s => { s.mapping.mouseSensitivity = -1; }, s => { s.camera.target.y = -1; },
        s => { s.camera.position = { ...s.camera.target }; }, s => { s.camera.orthographicZoom = 0; },
        s => { s.camera.position.y = -50; }, s => { s.camera.position.x = 1e9; },
        s => { s.camera.position.x = 4000; }, s => { s.pose = []; },
        s => { s.camera.position.z = NaN; },
    ]) {
        const candidate = controller.snapshot(); corrupt(candidate);
        assert.throws(() => controller.replace(candidate));
        assert.deepEqual(controller.snapshot(), initial);
    }
    for (const input of [null, [], {}, false]) assert.throws(() => validateSceneDocument(input));
    assert.throws(() => parseSceneDocument('{broken'));
    assert.throws(() => parseSceneDocument(' '.repeat(MAX_SCENE_BYTES + 1)), /too large/);
    assert.equal(applies, 0); assert.equal(notifications, 0);
});

test('accepted state is detached from caller, renderer, observers and returned snapshots', () => {
    let observed;
    const controller = createSceneController({
        apply: next => { next.pose.distance = 22; }, onChange: next => { observed = next; },
    });
    const candidate = createSceneDocument(); candidate.pose.distance = 4;
    const returned = controller.replace(candidate);
    candidate.pose.distance = returned.pose.distance = observed.pose.distance = 20;
    const snapshot = controller.snapshot(); snapshot.pose.distance = 18;
    assert.equal(controller.snapshot().pose.distance, 4);
});

test('camera observations do not feed back into rendering and forced loads apply fully', () => {
    const previousValues = [];
    const controller = createSceneController({ apply: (_next, previous) => previousValues.push(previous) });
    const next = createSceneDocument(); next.camera.orthographicZoom = 2;
    controller.replace(next, { render: false });
    assert.equal(previousValues.length, 0);
    assert.equal(controller.snapshot().camera.orthographicZoom, 2);
    controller.replace(next, { force: true });
    assert.deepEqual(previousValues, [null]);
});

test('manual pose, Demo, Reset and playback snapshots each produce one coherent pen refresh', () => {
    const sim = Object.create(Pen3DSim.prototype);
    const poses = [];
    sim.updatePenTransform = () => poses.push({ distance: sim.distance, tiltAltitude: sim.tiltAltitude,
        tiltAzimuth: sim.tiltAzimuth, barrelRotation: sim.barrelRotation,
        tabletX: sim.tabletOffsetX, tabletY: sim.tabletOffsetY });
    const controller = createSceneController({ apply: (next, previous) => applySceneDocument(sim, next, previous) });
    for (const pose of [{ ...DEFAULT_PEN, distance: 5 }, DEMO_POSE, DEFAULT_PEN,
        { ...DEFAULT_PEN, tiltAltitude: 22.5, tiltAzimuth: 121, barrelRotation: 159 }]) {
        controller.replace({ ...controller.snapshot(), pose });
        assert.deepEqual(poses.at(-1), pose);
    }
    assert.equal(poses.length, 4);
    const invalid = controller.snapshot(); invalid.pose.distance = -1;
    assert.throws(() => applySceneDocument(sim, invalid));
    assert.equal(poses.length, 4);
    assert.deepEqual(sim.reset(), DEFAULT_PEN);
    assert.deepEqual(poses.at(-1), DEFAULT_PEN);
    assert.deepEqual(sim.getDefaultPose(), DEFAULT_PEN);
});

test('camera restore drains damping before restoring exact position, target and both zooms', () => {
    const sim = Object.create(Pen3DSim.prototype);
    sim.perspectiveCamera = new THREE.PerspectiveCamera();
    sim.orthographicCamera = new THREE.OrthographicCamera();
    let residual = true;
    sim.controls = { enableDamping: true, target: new THREE.Vector3(), update() {
        if (residual) { sim.camera.position.x += 10; residual = this.enableDamping; }
    } };
    const saved = createSceneDocument().camera;
    saved.orthographicZoom = 3;
    for (const camera of [sim.perspectiveCamera, sim.orthographicCamera]) {
        sim.camera = camera; residual = true;
        sim.restoreCameraState(saved); sim.controls.update();
        assert.deepEqual(sim.getCameraState(), saved);
        assert.equal(sim.controls.enableDamping, true);
    }
});

test('pen drag emits one complete XY input command when a scene owner is attached', () => {
    const sim = Object.create(Pen3DSim.prototype);
    Object.assign(sim, { isDraggingPen: true, penPointerId: 1, mouseSensitivity: 1,
        tabletOffsetX: 192, tabletOffsetY: 108, tabletWidth: 384, tabletDepth: 216,
        lastMouseX: 0, lastMouseY: 0 });
    const commands = [];
    sim.onPoseInput = patch => commands.push(patch);
    sim.setTabletPositionX = sim.setTabletPositionY = () => assert.fail('bypassed scene owner');
    sim.handleMouseMove({ pointerId: 1, clientX: 1000, clientY: -1000, preventDefault() {}, stopImmediatePropagation() {} });
    assert.deepEqual(commands, [{ tabletX: 384, tabletY: 0 }]);
});
