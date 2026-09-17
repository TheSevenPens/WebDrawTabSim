import test from 'node:test';
import { createSceneDocument, parseSceneDocument, serializeSceneDocument } from '../src/lib/sim/scene-document.js';
import { applySceneDocument } from '../src/lib/sim/scene-renderer.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { Pen3DSim } from '../src/lib/sim/index.js';
import { ResourceScope } from '../src/lib/sim/resources.js';
import { pngBlob } from '../src/lib/sim/export.js';
import { runParameterAnimation } from '../src/lib/sim/animations.js';

globalThis.requestAnimationFrame ??= () => 1;
globalThis.cancelAnimationFrame ??= () => {};

function replaceProperty(t, target, key, value) {
    const old = Object.getOwnPropertyDescriptor(target, key);
    Object.defineProperty(target, key, { value, configurable: true, writable: true });
    t.after(() => old ? Object.defineProperty(target, key, old) : delete target[key]);
}

globalThis.navigator ??= {};

function renderer() {
    return {
        size: new THREE.Vector2(800, 450), ratio: 1.5,
        viewport: new THREE.Vector4(2, 3, 796, 444), ratios: [], renders: 0,
        domElement: { style: { width: '800px', height: '450px' }, remove() { this.removed = true; } },
        shadowMap: {},
        getContext: () => ({ isContextLost: () => false, MAX_VIEWPORT_DIMS: 1,
            getParameter: key => key === 1 ? [4096, 4096] : 4096 }),
        getSize(out) { return out.copy(this.size); },
        getPixelRatio() { return this.ratio; },
        getViewport(out) { return out.copy(this.viewport); },
        setPixelRatio(ratio) { this.ratio = ratio; this.ratios.push(ratio); },
        setSize(w, h, style) { this.size.set(w, h); this.viewport.set(0, 0, w, h); assert.notEqual(style, true); },
        setViewport(value) { this.viewport.copy(value); },
        render() { this.renders++; },
        dispose() { this.disposals = (this.disposals ?? 0) + 1; },
        forceContextLoss() { this.lost = true; },
    };
}

function documentStub(t, context = {}) {
    const ctx = new Proxy(context, { get: (target, key) => key in target ? target[key] : () => {} });
    replaceProperty(t, globalThis, 'document', { createElement: () => ({ getContext: () => ctx }) });
}
// Node does not have document; define it so MockTracker can replace it.
globalThis.document ??= {};

function exportSim(t, context) {
    documentStub(t, context);
    return Object.assign(Object.create(Pen3DSim.prototype), {
        renderer: renderer(), scene: new THREE.Scene(),
        perspectiveCamera: new THREE.PerspectiveCamera(30, 16 / 9, 1, 1000),
        orthographicCamera: new THREE.OrthographicCamera(-12, 16, 8, -6, 1, 1000),
    });
}

for (const mode of ['perspectiveCamera', 'orthographicCamera']) {
    for (const failure of ['none', 'render', 'copy', 'resize']) {
        test(`${mode} export restores exact state after ${failure}`, t => {
            const sim = exportSim(t, { drawImage() { if (failure === 'copy') throw new Error('copy failure'); } });
            sim.camera = sim[mode];
            sim.camera.zoom = 1.75;
            sim.camera.updateProjectionMatrix();
            const matrices = [sim.perspectiveCamera, sim.orthographicCamera].map(c => c.projectionMatrix.clone());
            if (failure === 'resize') {
                const setSize = sim.renderer.setSize;
                sim.renderer.setSize = function(w, h, style) {
                    setSize.call(this, w, h, style);
                    if (w === 1600) throw new Error('resize failure');
                };
            }
            sim.renderer.render = () => {
                assert.equal(sim.perspectiveCamera.aspect, 2);
                assert.equal(sim.orthographicCamera.right - sim.orthographicCamera.left, 28);
                if (failure === 'render') throw new Error('render failure');
            };
            if (failure === 'none') {
                const canvas = sim.renderToCanvas(1600, 800);
                assert.equal(canvas.width, 1600);
                assert.equal(canvas.height, 800);
            } else assert.throws(() => sim.renderToCanvas(1600, 800), new RegExp(`${failure} failure`));
            assert.deepEqual(sim.renderer.size.toArray(), [800, 450]);
            assert.equal(sim.renderer.ratio, 1.5);
            assert.deepEqual(sim.renderer.viewport.toArray(), [2, 3, 796, 444]);
            assert.deepEqual(sim.renderer.domElement.style, { width: '800px', height: '450px' });
            assert.equal(sim.camera.zoom, 1.75);
            [sim.perspectiveCamera, sim.orthographicCamera].forEach((c, i) => assert.deepEqual(c.projectionMatrix, matrices[i]));
        });
    }
}

test('export validates dimensions and reduces supersampling to hardware limits', t => {
    const sim = exportSim(t);
    for (const dims of [[0, 20], [-1, 1], [NaN, 2], [1.5, 2], [Infinity, 2], [10000, 10000], [4097, 1]]) {
        assert.throws(() => sim.renderToCanvas(...dims));
    }
    assert.equal(sim.renderer.ratios.length, 0);
    sim.renderToCanvas(3840, 2160);
    assert.deepEqual(sim.renderer.ratios, [1, 1.5]);
});

test('missing 2D context and lost graphics context produce actionable errors', t => {
    const sim = exportSim(t);
    t.mock.method(document, 'createElement', () => ({ getContext: () => null }));
    assert.throws(() => sim.renderToCanvas(800, 450), /smaller size/);
    sim.renderer.getContext = () => ({ isContextLost: () => true });
    assert.throws(() => sim.renderToCanvas(800, 450), /Reload/);
    assert.equal(sim.renderer.ratios.length, 0);
});

test('a supersampled rendering failure retries at native resolution', t => {
    const sim = exportSim(t);
    const attempts = [];
    sim.renderer.render = () => {
        attempts.push(sim.renderer.ratio);
        if (sim.renderer.ratio > 1) throw new Error('allocation failed');
    };
    assert.equal(sim.renderToCanvas(1920, 1080).width, 1920);
    assert.deepEqual(attempts, [2, 1]);
    assert.equal(sim.renderer.ratio, 1.5);
});

test('PNG download uses requested dimensions and rejects an empty data URL', t => {
    const sim = exportSim(t);
    let clicked = false;
    const link = { click() { clicked = true; } };
    t.mock.method(document, 'createElement', () => link);
    sim.renderToCanvas = (w, h) => {
        assert.deepEqual([w, h], [1920, 1080]);
        return { toDataURL: () => 'data:image/png;base64,test' };
    };
    sim.exportAsPNG();
    assert.equal(link.download, 'Pen3DSim-1920x1080.png');
    assert.equal(clicked, true);
    sim.renderToCanvas = () => ({ toDataURL: () => 'data:,' });
    assert.throws(() => sim.exportAsPNG(), /encoding failed/);
});

test('clipboard keeps PNG encoding inside the write gesture and propagates rejection', async t => {
    const sim = exportSim(t);
    const blob = new Blob(['png'], { type: 'image/png' });
    sim.renderToCanvas = () => ({ toBlob: cb => cb(blob) });
    globalThis.ClipboardItem ??= class {};
    replaceProperty(t, globalThis, 'ClipboardItem', class { constructor(data) { this.data = data; } });
    replaceProperty(t, navigator, 'clipboard', { write: async ([item]) => {
        assert.equal(await item.data['image/png'], blob);
    } });
    await sim.copyPNGToClipboard();
    t.mock.method(navigator.clipboard, 'write', async () => { throw new Error('permission denied'); });
    await assert.rejects(sim.copyPNGToClipboard(), /permission denied/);
});

test('PNG encoder rejects null results and synchronous errors', async () => {
    await assert.rejects(pngBlob({ toBlob: cb => cb(null) }), /encoding failed/);
    await assert.rejects(pngBlob({ toBlob() { throw new Error('encoder error'); } }), /encoder error/);
    const blob = new Blob(['png']);
    assert.equal(await pngBlob({ toBlob: cb => cb(blob) }), blob);
});

class HeadlessSim extends Pen3DSim {
    initRenderer() { this.renderer = renderer(); }
    initControls() {
        this.controls = { target: new THREE.Vector3(), update() {}, dispose() { this.disposed = true; },
            getAzimuthalAngle: () => 0, getPolarAngle: () => 0 };
    }
    initMouseControl() {} // Real input teardown is covered in editing-playback.test.js.
}

function scheduledSim(t) {
    documentStub(t);
    const frames = new Map(); let id = 0;
    t.mock.method(globalThis, 'requestAnimationFrame', fn => { frames.set(++id, fn); return id; });
    t.mock.method(globalThis, 'cancelAnimationFrame', id => frames.delete(id));
    const sim = new HeadlessSim({ clientWidth: 800, clientHeight: 450 });
    t.after(() => sim.dispose());
    const step = () => {
        const pending = [...frames.values()]; frames.clear();
        pending.forEach(fn => fn(0));
    };
    return { sim, frames, step };
}

test('render requests coalesce, continue camera damping and stop at idle/disposal', t => {
    const { sim, frames, step } = scheduledSim(t);
    for (let i = 0; i < 20; i++) sim.setDistance(i);
    assert.equal(frames.size, 1);
    step();
    assert.equal(sim.renderer.renders, 1);
    assert.equal(frames.size, 0);
    let remaining = 3;
    sim.controls.update = () => remaining-- > 0;
    sim.requestRender();
    for (let i = 0; i < 4; i++) step();
    assert.equal(frames.size, 0);
    assert.equal(sim.renderer.renders, 5);
    sim.setGridVisible(false);
    const stale = [...frames.values()];
    sim.dispose();
    stale.forEach(fn => fn(0));
    sim.requestRender();
    assert.equal(frames.size, 0);
    assert.equal(sim.renderer.renders, 5);
});

test('mapping edits reuse pen and annotations, preserve shadows, and coalesce mixed batches', t => {
    const { sim, step } = scheduledSim(t);
    step();
    sim.renderer.shadowMap.needsUpdate = false;
    const pose = t.mock.method(sim, 'updatePenPose');
    const annotations = t.mock.method(sim, 'updateAnnotations');
    const cursor = t.mock.method(sim, 'updateCursorFromPen');
    const oldCursor = sim.cursorArrow.position.clone();
    sim.batchSceneUpdate(() => {
        sim.setCursorOffsetX(10);
        sim.setCursorOffsetY(5);
        sim.setScalingFactor(0.5);
    });
    assert.equal(pose.mock.callCount(), 0);
    assert.equal(annotations.mock.callCount(), 0);
    assert.equal(cursor.mock.callCount(), 1);
    assert.equal(sim.renderer.shadowMap.needsUpdate, false);
    assert.notDeepEqual(sim.cursorArrow.position, oldCursor);
    sim.batchSceneUpdate(() => {
        sim.setCursorOffsetX(20);
        sim.batchSceneUpdate(() => sim.setTiltAltitude(45));
    });
    assert.equal(pose.mock.callCount(), 1);
    assert.equal(annotations.mock.callCount(), 1);
    assert.equal(cursor.mock.callCount(), 2);
    assert.equal(sim.renderer.shadowMap.needsUpdate, true);
});

test('export success and failure request restoration of the live pixels', t => {
    const { sim, frames, step } = scheduledSim(t);
    step();
    sim.renderToCanvas(480, 270);
    assert.equal(frames.size, 1);
    step();
    const original = sim.renderer.render;
    sim.renderer.render = () => { throw new Error('render failed'); };
    assert.throws(() => sim.renderToCanvas(480, 270), /render failed/);
    assert.equal(frames.size, 1);
    sim.renderer.render = original;
    step();
    assert.equal(frames.size, 0);
});

test('saved documents restore real scene geometry and preferences with one pen refresh', t => {
    documentStub(t);
    const sim = new HeadlessSim({ clientWidth: 800, clientHeight: 450 });
    t.after(() => sim.dispose());
    const scene = createSceneDocument();
    Object.assign(scene.pose, { distance: 10, tiltAltitude: 45, tiltAzimuth: 242, barrelRotation: 318, tabletX: 20 });
    Object.assign(scene.mapping, { cursorOffsetX: 20, compPosTiltY: 0.7, scalingFactor: 0.5 });
    Object.assign(scene.annotations, { showAltitude: true, showBarrel: true, showPenTopLine: false });
    Object.assign(scene.presentation, { penDisplayMode: true, axonometric: true, darkTablet: true,
        sharpNib: true, showCheckerboard: true, showGrid: false, showMonitor: false,
        showPenShadow: false, cursorMode: 'crosshairs', penBodyFormat: 'solid', aspectRatio: '2 / 3' });
    scene.camera.orthographicZoom = 2;
    const original = sim.updatePenTransform.bind(sim);
    let refreshes = 0;
    sim.updatePenTransform = (...args) => { refreshes++; original(...args); };
    applySceneDocument(sim, scene);
    assert.equal(refreshes, 1);
    const tip = sim.penTipWorld.toArray(), quaternion = sim.penGroup.quaternion.toArray();
    const serialized = serializeSceneDocument(scene);
    applySceneDocument(sim, createSceneDocument());
    refreshes = 0;
    applySceneDocument(sim, parseSceneDocument(serialized));
    assert.equal(refreshes, 1);
    assert.deepEqual(sim.penTipWorld.toArray(), tip);
    assert.deepEqual(sim.penGroup.quaternion.toArray(), quaternion);
    assert.deepEqual(sim.getCameraState(), scene.camera);
    assert.equal(sim.camera, sim.orthographicCamera);
    assert.equal(sim.viewportAspect, 2 / 3);
    assert.equal(sim.penLine.visible, false);
    assert.equal(sim.monitorVisible, false);
    assert.equal(sim.digitizerGrid.visible, false);
    assert.equal(sim.tabletScreen.visible, true);
    assert.equal(sim.cursorMode, 'crosshairs');
    assert.equal(sim.nibShape, 'sharp');
    assert.equal(sim.penBodyFormat, 'solid');
    const texture = sim.tabletCheckerboardTexture;
    applySceneDocument(sim, { ...scene, pose: { ...scene.pose, tabletX: 21 } }, scene);
    assert.equal(sim.tabletCheckerboardTexture, texture, 'pose frames must not rebuild materials');
});

test('scene adapters preserve the numeric reference in both device modes', t => {
    documentStub(t);
    const reference = JSON.parse(readFileSync(new URL('./fixtures/math-reference.json', import.meta.url)));
    const sim = new HeadlessSim({ clientWidth: 800, clientHeight: 450 });
    t.after(() => sim.dispose());
    const near = (actual, expected) => actual.forEach((n, i) => assert.ok(Math.abs(n - expected[i]) < 1e-10));
    Object.assign(sim, { tabletWidth: reference.tablet.width, tabletDepth: reference.tablet.depth,
        yOffset: reference.tablet.surfaceY });
    for (const penDisplayMode of [false, true]) {
        sim.penDisplayMode = penDisplayMode;
        for (const { pose, mapping, expected } of reference.fixtures) {
            Object.assign(sim, mapping, { tabletOffsetX: pose.tabletX, tabletOffsetY: pose.tabletY });
            sim.updatePenTransform(pose.distance, pose.altitude, pose.azimuth, pose.barrel);
            near(sim.penTipWorld.toArray(), expected.tip);
            near(sim.penGroup.position.toArray(), expected.origin);
            near(sim.penGroup.quaternion.toArray(), expected.quaternion);
            near([sim.cursorArrow.position.x, sim.cursorArrow.position.z], expected.cursor);
            near(sim.cursorCrosshair.position.toArray(), sim.cursorArrow.position.toArray());
            const screen = reference.screen;
            // Compare monitor position in its normalized screen space; actual mesh sizes differ.
            near([sim.monitorCursor.position.x / sim.monitorScreenWidth,
                (sim.monitorCursor.position.y - sim.monitorBodyCenterY) / sim.monitorScreenHeight],
            [expected.monitor[0] / screen.width, (expected.monitor[1] - screen.centerY) / screen.height]);
        }
    }
});

test('repeated full scene creation/disposal owns detached and shared resources without affecting another instance', t => {
    documentStub(t);
    const queued = new Map(); let id = 0;
    t.mock.method(globalThis, 'requestAnimationFrame', fn => { queued.set(++id, fn); return id; });
    t.mock.method(globalThis, 'cancelAnimationFrame', id => queued.delete(id));
    const viewer = { clientWidth: 800, clientHeight: 450 };
    const survivor = new HeadlessSim(viewer);
    let survivorDisposals = 0;
    survivor.desktopTexture.addEventListener('dispose', () => survivorDisposals++);
    for (let i = 0; i < 3; i++) {
        const sim = new HeadlessSim(viewer);
        assert.notEqual(sim.desktopTexture, survivor.desktopTexture);
        assert.notEqual(sim.xArrow.line.geometry, survivor.xArrow.line.geometry);
        const baseline = sim.resources.resources.size;
        for (let n = 0; n < 20; n++) sim.setTiltAltitude(n + 1);
        assert.ok(sim.resources.resources.size <= baseline + 5, 'replaced geometries must not accumulate');
        let disposed = 0;
        const resources = [...sim.resources.resources];
        for (const resource of resources) {
            const original = resource.dispose.bind(resource);
            resource.dispose = () => { disposed++; original(); };
        }
        sim.animateToDemo(() => assert.fail('disposed animation ran'));
        runParameterAnimation(sim, 1000, () => assert.fail('disposed animation ran'));
        const stale = [...queued.values()].slice(1);
        sim.dispose(); sim.dispose();
        stale.forEach(fn => fn(performance.now()));
        assert.equal(disposed, resources.length);
        assert.equal(sim.resources.resources.size, 0);
        assert.equal(sim.animations.size, 0);
        assert.equal(sim.renderer.disposals, 1);
        assert.equal(sim.renderer.domElement.removed, true);
        assert.equal(sim.renderer.lost, true);
        assert.equal(sim.controls.disposed, true);
        assert.equal(queued.size, 1);
        assert.equal(survivorDisposals, 0);
        assert.throws(() => sim.renderToCanvas(800, 450), /disposed/);
    }
    survivor.dispose();
    assert.equal(queued.size, 0);
    assert.equal(survivorDisposals, 1);
});

test('constructor failure cleans up resources allocated before scene attachment', t => {
    documentStub(t);
    let failed;
    class BrokenSim extends HeadlessSim {
        initTablet() {
            failed = this;
            this.own(new THREE.BoxGeometry());
            throw new Error('initialization failed');
        }
    }
    assert.throws(() => new BrokenSim({ clientWidth: 800, clientHeight: 450 }), /initialization failed/);
    assert.equal(failed.resources.resources.size, 0);
    assert.equal(failed.disposed, true);
    assert.equal(failed.renderer.disposals, 1);
    assert.equal(failed.renderer.domElement.removed, true);
});

test('resource cleanup continues after a failing disposer', () => {
    const scope = new ResourceScope(); let cleaned = false;
    scope.own({ dispose() { throw new Error('failure'); } });
    scope.own({ dispose() { cleaned = true; } });
    assert.throws(() => scope.dispose(), AggregateError);
    assert.equal(cleaned, true);
    assert.equal(scope.resources.size, 0);
    scope.dispose();
});
