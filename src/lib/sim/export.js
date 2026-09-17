import * as THREE from 'three';
import { EXPORT } from './config.js';

// Bound both the output allocation and supersampled drawing buffer. 4K fits.
const MAX_PIXELS = 16_777_216;
export function renderExport(sim, width, height) {
    if (sim.disposed) throw new Error('The simulator has been disposed');
    if (![width, height].every(n => Number.isSafeInteger(n) && n > 0) || width * height > MAX_PIXELS) {
        throw new Error('Choose positive whole-number dimensions totaling at most 16 megapixels');
    }
    const renderer = sim.renderer;
    const gl = renderer.getContext();
    if (gl.isContextLost()) throw new Error('The graphics context was lost. Reload the page and retry');
    const viewportLimit = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
    const limit = Math.min(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE), gl.getParameter(gl.MAX_TEXTURE_SIZE), ...viewportLimit);
    if (width > limit || height > limit) throw new Error('This export exceeds the graphics device limit. Choose a smaller size');
    const ratio = Math.min(EXPORT.supersample, Math.floor(limit / Math.max(width, height)),
        Math.floor(Math.sqrt(MAX_PIXELS * 2 / (width * height))));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not allocate the export canvas. Choose a smaller size');
    const size = renderer.getSize(new THREE.Vector2());
    const pixelRatio = renderer.getPixelRatio();
    const viewport = renderer.getViewport(new THREE.Vector4());
    const perspective = sim.perspectiveCamera;
    const ortho = sim.orthographicCamera;
    const aspect = perspective.aspect;
    const bounds = { left: ortho.left, right: ortho.right, top: ortho.top, bottom: ortho.bottom };
    try {
        perspective.aspect = width / height;
        perspective.updateProjectionMatrix();
        const center = (ortho.left + ortho.right) / 2;
        const halfWidth = (ortho.top - ortho.bottom) / 2 * width / height;
        ortho.left = center - halfWidth;
        ortho.right = center + halfWidth;
        ortho.updateProjectionMatrix();
        for (const sample of new Set([ratio, 1])) {
            try {
                renderer.setPixelRatio(sample);
                renderer.setSize(width, height, false);
                renderer.render(sim.scene, sim.camera);
                if (gl.isContextLost()) throw new Error('The graphics context was lost. Reload the page');
                break;
            } catch (error) {
                if (sample === 1 || gl.isContextLost()) {
                    throw new Error(`Export rendering failed. Choose a smaller size. ${error.message}`, { cause: error });
                }
            }
        }
        ctx.drawImage(renderer.domElement, 0, 0, width, height);
        return canvas;
    } finally {
        perspective.aspect = aspect;
        perspective.updateProjectionMatrix();
        Object.assign(ortho, bounds);
        ortho.updateProjectionMatrix();
        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(size.x, size.y, false);
        renderer.setViewport(viewport);
        sim.requestRender?.(); // Resizing clears the live canvas, even after failure.
    }
}

export function pngBlob(canvas) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG encoding failed. Choose a smaller export size')), 'image/png');
    });
}
