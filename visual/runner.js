// Test-only entry point. Vite's normal production build does not include it.
import * as THREE from 'three';
import { Pen3DSim } from '../src/lib/sim/index.js';
import { applySceneDocument } from '../src/lib/sim/scene-renderer.js';
import fontUrl from '@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff2?url';

const viewer = document.querySelector('#viewer');
let sim;
const render = () => sim.renderer.render(sim.scene, sim.camera);
function create() {
    sim?.dispose();
    sim = new Pen3DSim(viewer);
    cancelAnimationFrame(sim.renderFrame);
    sim.renderFrame = null;
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
        dispose() {
            sim.dispose();
            return { canvasCount: viewer.querySelectorAll('canvas').length,
                resources: sim.resources.resources.size, frame: sim.renderFrame };
        },
    };
}
initialize().catch(error => console.error(error));
