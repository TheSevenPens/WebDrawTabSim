import * as THREE from 'three';
import { Pen3DSim } from './Pen3DSim.js';

// Viewport-scoped Space + pointer drag; document listeners only release/recover
// an interaction owned by this canvas and never consume Space on other controls.
Object.assign(Pen3DSim.prototype, {
    initMouseControl() {
        const canvas = this.renderer.domElement;
        canvas.tabIndex = 0;
        canvas.setAttribute('aria-label', '3D tablet viewer. Hold Space and drag to move the pen.');
        this.spaceBarPressed = false;
        this.isDraggingPen = false;
        this.penPointerId = null;
        this.pointerOverViewer = false;
        this.inputEvents = new AbortController();
        const signal = this.inputEvents.signal;
        const listen = (target, name, callback, options = {}) =>
            target.addEventListener(name, callback, { ...options, signal });

        listen(document, 'keydown', e => this.handleKeyDown(e));
        listen(document, 'keyup', e => this.handleKeyUp(e));
        listen(window, 'blur', () => this.resetPenInteraction());
        listen(document, 'visibilitychange', () => {
            if (document.hidden) this.resetPenInteraction();
        });
        listen(canvas, 'blur', () => this.resetPenInteraction());
        listen(canvas, 'pointerenter', () => { this.pointerOverViewer = true; });
        listen(canvas, 'pointerleave', () => {
            this.pointerOverViewer = false;
            if (!this.isDraggingPen) this.resetPenInteraction();
        });
        listen(canvas, 'pointerdown', e => this.handleMouseDown(e), { capture: true });
        listen(canvas, 'pointermove', e => this.handleMouseMove(e), { capture: true });
        listen(canvas, 'pointerup', e => this.handleMouseUp(e), { capture: true });
        listen(canvas, 'pointercancel', e => this.handleMouseUp(e), { capture: true });
        listen(canvas, 'lostpointercapture', e => {
            if (e.pointerId === this.penPointerId) this.resetPenInteraction();
        });
        listen(canvas, 'wheel', e => this.handleWheel(e), { passive: false });
    },

    disposeMouseControl() {
        this.inputEvents?.abort();
        this.resetPenInteraction();
    },

    resetPenInteraction() {
        const canvas = this.renderer?.domElement;
        const pointerId = this.penPointerId;
        this.penPointerId = null;
        this.spaceBarPressed = false;
        this.isDraggingPen = false;
        if (canvas) canvas.style.cursor = '';
        if (this.controls) this.controls.enabled = true;
        if (pointerId != null && canvas?.hasPointerCapture(pointerId)) {
            canvas.releasePointerCapture(pointerId);
        }
    },

    handleWheel(e) {
        if (!this.controls.enabled) return;
        e.preventDefault();
        this.changeCameraDistance(e.deltaY > 0 ? 20 : -20);
    },

    handleKeyDown(e) {
        const canvas = this.renderer.domElement;
        const inViewer = e.target === canvas ||
            (e.target === document.body && this.pointerOverViewer);
        if (e.code !== 'Space' || e.repeat || e.defaultPrevented || e.isComposing ||
            e.ctrlKey || e.metaKey || e.altKey || !inViewer) return;
        e.preventDefault();
        this.spaceBarPressed = true;
        this.controls.enabled = false;
        canvas.style.cursor = 'move';
    },

    handleKeyUp(e) {
        if (e.code === 'Space' && this.spaceBarPressed) {
            e.preventDefault();
            this.resetPenInteraction();
        }
    },

    handleMouseDown(e) {
        const canvas = this.renderer.domElement;
        if (!this.spaceBarPressed) {
            canvas.focus({ preventScroll: true });
            return;
        }
        if (e.button !== 0 || this.penPointerId != null) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        canvas.focus({ preventScroll: true });
        this.onPenInteraction?.(); // Cancel playback before changing the pose.
        this.isDraggingPen = true;
        this.penPointerId = e.pointerId;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        canvas.setPointerCapture(e.pointerId);
    },

    handleMouseMove(e) {
        if (!this.isDraggingPen || e.pointerId !== this.penPointerId) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        const mmPerPixel = this.mouseSensitivity;
        const x = this.tabletOffsetX + (e.clientX - this.lastMouseX) * mmPerPixel;
        const y = this.tabletOffsetY + (e.clientY - this.lastMouseY) * mmPerPixel;
        const tabletX = THREE.MathUtils.clamp(x, 0, this.tabletWidth);
        const tabletY = THREE.MathUtils.clamp(y, 0, this.tabletDepth);
        if (this.onPoseInput) this.onPoseInput({ tabletX, tabletY });
        else {
            this.setTabletPositionX(tabletX);
            this.setTabletPositionY(tabletY);
        }
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
    },

    handleMouseUp(e) {
        if (e.pointerId !== this.penPointerId) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        this.resetPenInteraction();
    },
});
