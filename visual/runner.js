// Test-only entry point. Vite's normal production build does not include it.
import * as THREE from 'three';
import { Pen3DSim } from '../src/lib/sim/index.js';
import { applySceneDocument } from '../src/lib/sim/scene-renderer.js';
import fontUrl from '@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff2?url';

const viewer = document.querySelector('#viewer');
let sim;
let liveRenders = 0;
const render = () => sim.renderer.render(sim.scene, sim.camera);
function create() {
    sim?.dispose();
    sim = new Pen3DSim(viewer);
    cancelAnimationFrame(sim.renderFrame);
    sim.renderFrame = null;
    // Reference captures render explicitly; benchmarks restore the live scheduler.
    sim.requestRender = () => {};
    sim.controls.enableDamping = false;
    sim.controls.enabled = false;
    sim.renderer.setPixelRatio(1);
}
async function initialize() {
    // Alias the simulator's canvas font only in this test page. Load it before any
    // textures are generated; production retains its existing font behavior.
    const font = new FontFace('Arial', `url(${fontUrl})`, { weight: '700' });
    await font.load();
    document.fonts.add(font);
    create();
    window.referenceScene = {
        load(scene) {
            applySceneDocument(sim, scene);
            render();
            return {
                tip: sim.penTipWorld.toArray(),
                quaternion: sim.penGroup.quaternion.toArray(),
                cursor: [sim.cursorArrow.position.x, sim.cursorArrow.position.z],
                camera: sim.getCameraState(),
            };
        },
        metadata() {
            const gl = sim.renderer.getContext();
            const debug = gl.getExtension('WEBGL_debug_renderer_info');
            return { threeRevision: THREE.REVISION, userAgent: navigator.userAgent,
                renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
                pixelRatio: sim.renderer.getPixelRatio(), font: 'Noto Sans Latin 700 (test-only Arial alias)',
                fontLoaded: font.status === 'loaded',
                liveAnimationFrame: sim.renderFrame, damping: sim.controls.enableDamping };
        },
        resize(width, height) {
            viewer.style.width = `${width}px`; viewer.style.height = `${height}px`;
            sim.onResize(); render();
        },
        exportPng(width, height) {
            const result = sim.renderToCanvas(width, height).toDataURL('image/png');
            render(); // Export restores projection/size; restore the displayed pixels too.
            return result;
        },
        recreate: create,
        enableLive() {
            delete sim.requestRender;
            sim.controls.enabled = true;
            sim.controls.enableDamping = true;
            liveRenders = 0;
            const original = sim.renderer.render.bind(sim.renderer);
            sim.renderer.render = (...args) => { liveRenders++; return original(...args); };
            sim.animate();
        },
        liveState() {
            return { renders: liveRenders, pending: sim.renderFrame !== null, camera: sim.getCameraState() };
        },
        liveEdit(method, ...args) { sim[method](...args); },
        async benchmark() {
            create();
            delete sim.requestRender;
            const counts = { renders: 0, annotations: 0, shadows: 0 };
            for (const [object, method, key] of [[sim.renderer, 'render', 'renders'],
                [sim, 'updateAnnotations', 'annotations'], [sim, 'markShadowsDirty', 'shadows']]) {
                const original = object[method].bind(object);
                object[method] = (...args) => { counts[key]++; return original(...args); };
            }
            const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
            const reset = () => { for (const key in counts) counts[key] = 0; };
            sim.controls.enableDamping = true;
            sim.animate();
            await wait(500);
            reset();
            await wait(1000);
            const idle = { ...counts };
            reset();
            const start = performance.now();
            for (let i = 0; i < 100; i++) sim.setCursorOffsetX(i % 20);
            const cursorUpdateMs = performance.now() - start;
            await wait(100);
            const cursor = { ...counts, updateMs: cursorUpdateMs };
            reset();
            sim.setAltitudeAnnotationsVisible(true);
            const times = [];
            for (let i = 0; i < 60; i++) {
                await new Promise(resolve => requestAnimationFrame(resolve));
                const start = performance.now();
                sim.setTiltAltitude(i);
                times.push(performance.now() - start);
            }
            await wait(100);
            times.sort((a, b) => a - b);
            const playback = { ...counts, updateMedianMs: times[30], updateP95Ms: times[57] };
            const exportStart = performance.now();
            sim.renderToCanvas(1920, 1080);
            const exportMs = performance.now() - exportStart;
            const result = { idle, cursor, playback, exportMs, memory: { ...sim.renderer.info.memory } };
            create();
            return result;
        },
        dispose() {
            sim.dispose();
            return { canvasCount: viewer.querySelectorAll('canvas').length,
                resources: sim.resources.resources.size, frame: sim.renderFrame };
        },
    };
}
initialize().catch(error => console.error(error));
