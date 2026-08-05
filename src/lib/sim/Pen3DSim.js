import * as THREE from 'three';
import { TexturesFactory } from './textures.js';
import {
    TABLET, DEFAULT_PEN, DEMO_POSE, PEN_RANGES, POINTER_DEFAULTS,
    ANNOTATION, CURSOR, EXPORT, ANIMATION, SCENE, clampValue,
} from './config.js';

// Pen3DSim.js — Class skeleton: constructor, animate loop, and public API
// All init/handle/geometry/update methods live in companion files:
//   pen-scene.js      — scene, cameras, renderer, lighting, camera settings
//   pen-tablet.js     — tablet mesh and grid
//   pen-pen.js        — pen mesh, cursor arrow, updatePenTransform
//   pen-annotations.js — annotation geometry, axis markers, math helpers
//   pen-mouse.js      — spacebar + mouse drag control
//
// Coordinate systems used throughout this codebase:
//   Tablet coords  — the logical pen/tablet API space (inches):
//                    tabletX  0–16  left → right
//                    tabletY  0–9   front → back (depth)
//                    tabletZ  ≥0    height of pen tip above surface (distance)
//   World coords   — Three.js scene space (inches):
//                    worldX   ±8    = tabletX − tabletWidth/2
//                    worldY   ≥0.05 = tabletSurfaceY + tabletZ   (Y is up)
//                    worldZ   ±4.5  = tabletY − tabletDepth/2

export class Pen3DSim {
    constructor(viewerElement) {
        this.viewer = viewerElement;

        // Pen state — all values in tablet coordinates
        this.tiltAltitude = DEFAULT_PEN.tiltAltitude;
        this.tiltAzimuth = DEFAULT_PEN.tiltAzimuth;
        this.barrelRotation = DEFAULT_PEN.barrelRotation;
        this.tabletOffsetX = DEFAULT_PEN.tabletX;
        this.tabletOffsetY = DEFAULT_PEN.tabletY;
        this.distance = DEFAULT_PEN.distance;
        this.showAltitudeAnnotations = false;
        this.showBarrelAnnotations = false;
        this.showTiltXAnnotations = false;
        this.showTiltYAnnotations = false;
        this.cursorRotation = CURSOR.rotation;
        this.cursorTipRotationY = CURSOR.tipRotationY;
        this.cursorOffsetX = POINTER_DEFAULTS.cursorOffsetX;
        this.cursorOffsetY = POINTER_DEFAULTS.cursorOffsetY;
        this.tiltCompensationPosTiltXValue = POINTER_DEFAULTS.tiltCompensationPosTiltX;
        this.tiltCompensationNegTiltXValue = POINTER_DEFAULTS.tiltCompensationNegTiltX;
        this.tiltCompensationPosTiltYValue = POINTER_DEFAULTS.tiltCompensationPosTiltY;
        this.tiltCompensationNegTiltYValue = POINTER_DEFAULTS.tiltCompensationNegTiltY;
        this.scalingFactor = POINTER_DEFAULTS.scalingFactor;
        this.edgeAttraction = POINTER_DEFAULTS.edgeAttraction;
        this.edgeAttractionRange = POINTER_DEFAULTS.edgeAttractionRange;
        this.mouseSensitivity = POINTER_DEFAULTS.mouseSensitivity;
        this.penDisplayMode = false;
        this.onCameraUpdate = null;

        // Constants (tablet coordinate dimensions)
        this.tabletWidth = TABLET.width;
        this.tabletDepth = TABLET.depth;
        this.tabletThickness = TABLET.thickness;
        this.yOffset = this.tabletThickness / 2;
        this.arcRadius = ANNOTATION.arcRadius;
        this.barrelArcRadius = ANNOTATION.barrelArcRadius;
        this.azimuthColor = ANNOTATION.azimuthColor;
        this.tiltAltitudeColor = ANNOTATION.tiltAltitudeColor;

        // Build scene (methods from companion files via Object.assign)
        this.initScene();
        this.initCameras();
        this.initRenderer();
        this.initControls();
        this.initLighting();
        this.initTablet();
        this.initMonitor();
        this.initPen();
        this.initAnnotations();
        this.initAxisMarkers();
        this.initComposer();

        // Start render loop
        this.animate();

        // Initial pen position
        this.updatePenTransform(this.distance, this.tiltAltitude, this.tiltAzimuth, this.barrelRotation);

        // Spacebar + mouse drag
        this.initMouseControl();
    }

    animate() {
        const loop = () => {
            requestAnimationFrame(loop);
            this.controls.update();
            this.renderFrame();
            if (this.onCameraUpdate) {
                const pos = this.camera.position;
                const target = this.controls.target;
                this.onCameraUpdate({
                    posX: pos.x, posY: pos.y, posZ: pos.z,
                    targetX: target.x, targetY: target.y, targetZ: target.z,
                });
            }
        };
        loop();
    }

    _refreshPen() {
        this.updatePenTransform(this.distance, this.tiltAltitude, this.tiltAzimuth, this.barrelRotation);
    }

    _tiltResult() {
        return {
            shouldEnableAzimuth: this.tiltAltitude !== 0,
            tiltX: this.calculateTiltX(this.tiltAltitude, this.tiltAzimuth),
            tiltY: this.calculateTiltY(this.tiltAltitude, this.tiltAzimuth),
        };
    }

    _dispatchTabletPosition() {
        if (!this.viewer) return;
        this.viewer.dispatchEvent(new CustomEvent('tabletPositionChanged', {
            detail: { x: this.tabletOffsetX, y: this.tabletOffsetY }
        }));
    }

    // ── Pen parameters ────────────────────────────────────────────────────────

    setDistance(value) {
        this.distance = clampValue(value, PEN_RANGES.distance.min, PEN_RANGES.distance.max, this.distance);
        this._refreshPen();
    }

    setTiltAltitude(value) {
        this.tiltAltitude = clampValue(value, PEN_RANGES.tiltAltitude.min, PEN_RANGES.tiltAltitude.max, this.tiltAltitude);
        this._refreshPen();
        return this._tiltResult();
    }

    setTiltAzimuth(value) {
        this.tiltAzimuth = clampValue(value, PEN_RANGES.tiltAzimuth.min, PEN_RANGES.tiltAzimuth.max, this.tiltAzimuth);
        this._refreshPen();
        return this._tiltResult();
    }

    setBarrelRotation(value) {
        this.barrelRotation = clampValue(value, PEN_RANGES.barrelRotation.min, PEN_RANGES.barrelRotation.max, this.barrelRotation);
        this._refreshPen();
    }

    // ── Tablet / cursor position (all values in tablet coordinates) ────────────

    setTabletPositionX(value) {
        this.tabletOffsetX = clampValue(value, PEN_RANGES.tabletX.min, PEN_RANGES.tabletX.max, this.tabletOffsetX);
        this._refreshPen();
        this._dispatchTabletPosition();
    }

    setTabletPositionY(value) {
        this.tabletOffsetY = clampValue(value, PEN_RANGES.tabletY.min, PEN_RANGES.tabletY.max, this.tabletOffsetY);
        this._refreshPen();
        this._dispatchTabletPosition();
    }

    setCursorOffsetX(value) {
        this.cursorOffsetX = clampValue(value, PEN_RANGES.cursorOffsetX.min, PEN_RANGES.cursorOffsetX.max, this.cursorOffsetX);
        this._refreshPen();
    }

    setCursorOffsetY(value) {
        this.cursorOffsetY = clampValue(value, PEN_RANGES.cursorOffsetY.min, PEN_RANGES.cursorOffsetY.max, this.cursorOffsetY);
        this._refreshPen();
    }

    // ── Tilt compensation ─────────────────────────────────────────────────────

    setTiltCompensationPosTiltXValue(value) {
        this.tiltCompensationPosTiltXValue = clampValue(value, PEN_RANGES.tiltCompensation.min, PEN_RANGES.tiltCompensation.max, this.tiltCompensationPosTiltXValue);
        this._refreshPen();
    }

    setTiltCompensationNegTiltXValue(value) {
        this.tiltCompensationNegTiltXValue = clampValue(value, PEN_RANGES.tiltCompensation.min, PEN_RANGES.tiltCompensation.max, this.tiltCompensationNegTiltXValue);
        this._refreshPen();
    }

    setTiltCompensationPosTiltYValue(value) {
        this.tiltCompensationPosTiltYValue = clampValue(value, PEN_RANGES.tiltCompensation.min, PEN_RANGES.tiltCompensation.max, this.tiltCompensationPosTiltYValue);
        this._refreshPen();
    }

    setTiltCompensationNegTiltYValue(value) {
        this.tiltCompensationNegTiltYValue = clampValue(value, PEN_RANGES.tiltCompensation.min, PEN_RANGES.tiltCompensation.max, this.tiltCompensationNegTiltYValue);
        this._refreshPen();
    }

    // ── Cursor scaling / edge attraction ──────────────────────────────────────

    setScalingFactor(value) {
        this.scalingFactor = clampValue(value, PEN_RANGES.scalingFactor.min, PEN_RANGES.scalingFactor.max, this.scalingFactor);
        this._refreshPen();
    }

    setEdgeAttraction(value) {
        this.edgeAttraction = clampValue(value, PEN_RANGES.edgeAttraction.min, PEN_RANGES.edgeAttraction.max, this.edgeAttraction);
        this._refreshPen();
    }

    setEdgeAttractionRange(value) {
        this.edgeAttractionRange = clampValue(value, PEN_RANGES.edgeAttractionRange.min, PEN_RANGES.edgeAttractionRange.max, this.edgeAttractionRange);
        this._refreshPen();
    }

    setMouseSensitivity(value) {
        this.mouseSensitivity = clampValue(
            value,
            PEN_RANGES.mouseSensitivity.min,
            PEN_RANGES.mouseSensitivity.max,
            this.mouseSensitivity
        );
    }

    // ── Visibility toggles ────────────────────────────────────────────────────

    setAzimuthAnnotationsVisible(visible) {
        this.arcAnnotationGroup.visible = visible;
        this.surfaceLine.visible = visible;
    }

    setAltitudeAnnotationsVisible(visible) {
        this.showAltitudeAnnotations = visible;
        this._refreshPen();
    }

    setBarrelAnnotationsVisible(visible) {
        this.showBarrelAnnotations = visible;
        this._refreshPen();
    }

    setTiltXAnnotationsVisible(visible) {
        this.showTiltXAnnotations = visible;
        this._refreshPen();
    }

    setTiltYAnnotationsVisible(visible) {
        this.showTiltYAnnotations = visible;
        this._refreshPen();
    }

    setCursorVisible(visible) {
        if (this.cursorArrow)   this.cursorArrow.visible   = visible;
        if (this.monitorCursor) this.monitorCursor.visible = visible && !this.penDisplayMode;
    }

    setPenShadowVisible(visible) {
        if (this.penTipMesh)    this.penTipMesh.castShadow    = visible;
        if (this.penBarrelMesh) this.penBarrelMesh.castShadow = visible;
    }

    setTabletCheckerboardVisible(visible) {
        if (!this.tabletMaterial) return;
        this.tabletCheckerboardVisible = visible;
        if (visible) {
            const dark = this.darkTablet;
            const c1 = dark ? '#5c4a6e' : '#e4d8f0';
            const c2 = dark ? '#3a2c48' : '#c8b4dc';
            // Rebuild so light/dark mode always matches
            if (this.tabletCheckerboardTexture) {
                this.tabletCheckerboardTexture.dispose();
            }
            this.tabletCheckerboardTexture = TexturesFactory.createTabletCheckerboardTexture(
                this.tabletWidth, this.tabletDepth, c1, c2
            );
            this.tabletMaterial.map = this.tabletCheckerboardTexture;
            this.tabletMaterial.roughness = 0.92;
            this.tabletMaterial.metalness = 0.0;
            this.tabletMaterial.color.setHex(0xffffff);
        } else {
            this.tabletMaterial.map = null;
            this.tabletMaterial.color.setHex(this.tabletBaseColor);
            this.tabletMaterial.roughness = 0.92;
            this.tabletMaterial.metalness = 0.0;
        }
        this.tabletMaterial.needsUpdate = true;
    }

    /**
     * Switch tablet body between light lavender and a much darker lavender.
     * @param {boolean} dark
     */
    setDarkTablet(dark) {
        this.darkTablet = !!dark;
        this.tabletBaseColor = dark ? SCENE.tabletDark : SCENE.tablet;
        if (this.gridMaterial) {
            this.gridMaterial.color.setHex(dark ? SCENE.gridDark : SCENE.grid);
            this.gridMaterial.opacity = dark ? 0.4 : 0.55;
        }
        if (this.tabletCheckerboardVisible) {
            this.setTabletCheckerboardVisible(true);
        } else if (this.tabletMaterial) {
            this.tabletMaterial.color.setHex(this.tabletBaseColor);
            this.tabletMaterial.needsUpdate = true;
        }
    }

    setPenDisplayMode(enabled) {
        this.penDisplayMode = enabled;
        if (this.tabletScreen) this.tabletScreen.visible = enabled;
        if (this.monitorGroup) this.monitorGroup.visible = !enabled;
        if (this.monitorCursor) this.monitorCursor.visible = !enabled;
        if (this.digitizerGrid) this.digitizerGrid.position.y = enabled ? 0.008 : 0;
        this._refreshPen();
    }

    setAxisMarkersVisible(visible) {
        this.xArrow.visible = visible;
        this.yArrow.visible = visible;
        this.zArrow.visible = visible;
        this.xLabel.visible = visible;
        this.yLabel.visible = visible;
        this.zLabel.visible = visible;
    }

    // ── Camera ────────────────────────────────────────────────────────────────

    setCameraView(pos, target) {
        this.camera.position.set(pos.x, pos.y, pos.z);
        this.controls.target.set(target.x, target.y, target.z);
        this.controls.update();
    }

    setAxonometricView(enabled) {
        if (enabled) {
            this.orthographicCamera.position.copy(this.perspectiveCamera.position);
            this.orthographicCamera.rotation.copy(this.perspectiveCamera.rotation);
            this.camera = this.orthographicCamera;
        } else {
            this.perspectiveCamera.position.copy(this.orthographicCamera.position);
            this.perspectiveCamera.rotation.copy(this.orthographicCamera.rotation);
            this.camera = this.perspectiveCamera;
        }
        this.controls.object = this.camera;
        this.controls.update();
        this.syncComposerCamera();
    }

    // ── Cursor orientation ────────────────────────────────────────────────────

    setCursorRotation(angle) {
        this.cursorRotation = angle;
        this.updateCursorRotation();
    }

    setCursorTipRotationY(angle) {
        this.cursorTipRotationY = angle;
        this.updateCursorRotation();
    }

    // ── Utility ───────────────────────────────────────────────────────────────

    reset() {
        return { ...DEFAULT_PEN };
    }

    exportAsPNG(width = EXPORT.hd.width, height = EXPORT.hd.height) {
        const origWidth = this.viewer.clientWidth;
        const origHeight = this.viewer.clientHeight;
        const origPixelRatio = this.renderer.getPixelRatio();

        this.renderer.setPixelRatio(EXPORT.supersample);
        this.renderer.setSize(width, height);
        if (this.composer) this.composer.setSize(width, height);
        this.perspectiveCamera.aspect = width / height;
        this.perspectiveCamera.updateProjectionMatrix();
        this.renderFrame();

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(this.renderer.domElement, 0, 0, width, height);

        const link = document.createElement('a');
        link.download = `Pen3DSim-${width}x${height}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        this.renderer.setPixelRatio(origPixelRatio);
        this.renderer.setSize(origWidth, origHeight);
        if (this.composer) this.composer.setSize(origWidth, origHeight);
        this.perspectiveCamera.aspect = origWidth / origHeight;
        this.perspectiveCamera.updateProjectionMatrix();
    }

    onResize() {
        const aspect = this.viewer.clientWidth / this.viewer.clientHeight;
        this.perspectiveCamera.aspect = aspect;
        this.perspectiveCamera.updateProjectionMatrix();
        this.orthographicCamera.left   = -this.orthoSize * aspect;
        this.orthographicCamera.right  =  this.orthoSize * aspect;
        this.orthographicCamera.updateProjectionMatrix();
        this.renderer.setSize(this.viewer.clientWidth, this.viewer.clientHeight);
        if (this.composer) {
            this.composer.setSize(this.viewer.clientWidth, this.viewer.clientHeight);
        }
    }

    // ── Animation helpers ─────────────────────────────────────────────────────

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    interpolateAngle(start, end, t) {
        start = ((start % 360) + 360) % 360;
        end   = ((end   % 360) + 360) % 360;
        let diff = end - start;
        if (diff < 0)    diff += 360;
        if (diff >= 360) diff %= 360;
        return ((( start + diff * t) % 360) + 360) % 360;
    }

    // Animates from default position to the shared demo pose.
    // onProgress receives (current, progress) where current uses tablet coordinates.
    animateToDemo(onProgress) {
        const start = { ...DEFAULT_PEN };
        const end   = { ...DEMO_POSE };
        const duration = ANIMATION.durationMs;
        const startTime = performance.now();
        let frameId = null;

        const tick = (now) => {
            const progress = Math.min((now - startTime) / duration, 1);
            const eased    = this.easeInOutCubic(progress);
            const current = {
                distance:       start.distance       + (end.distance       - start.distance)       * eased,
                tiltAltitude:   start.tiltAltitude   + (end.tiltAltitude   - start.tiltAltitude)   * eased,
                tiltAzimuth:    this.interpolateAngle(start.tiltAzimuth,    end.tiltAzimuth,    eased),
                barrelRotation: this.interpolateAngle(start.barrelRotation, end.barrelRotation, eased),
                tabletX:        start.tabletX + (end.tabletX - start.tabletX) * eased,
                tabletY:        start.tabletY + (end.tabletY - start.tabletY) * eased,
            };

            this.distance       = current.distance;
            this.tiltAltitude   = current.tiltAltitude;
            this.tiltAzimuth    = current.tiltAzimuth;
            this.barrelRotation = current.barrelRotation;
            this.tabletOffsetX  = current.tabletX;
            this.tabletOffsetY  = current.tabletY;

            this.updatePenTransform(current.distance, current.tiltAltitude, current.tiltAzimuth, current.barrelRotation);
            if (onProgress) onProgress(current, progress);

            if (progress < 1) frameId = requestAnimationFrame(tick);
            else frameId = null;
        };

        frameId = requestAnimationFrame(tick);
        return () => { if (frameId !== null) { cancelAnimationFrame(frameId); frameId = null; } };
    }
}
