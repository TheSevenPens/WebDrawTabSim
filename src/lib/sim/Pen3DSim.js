import * as THREE from 'three';

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
        this.tiltAltitude = 0;          // degrees from vertical (0 = upright)
        this.tiltAzimuth = 0;           // degrees around tablet surface plane
        this.barrelRotation = 0;        // degrees of barrel spin around pen axis
        this.tabletOffsetX = 8;         // tablet X: 0–tabletWidth inches
        this.tabletOffsetY = 4.5;       // tablet Y: 0–tabletDepth inches (front-to-back)
        this.distance = 0;              // tablet Z: pen tip height above surface in inches
        this.showAltitudeAnnotations = false;
        this.showBarrelAnnotations = false;
        this.showTiltXAnnotations = false;
        this.showTiltYAnnotations = false;
        this.cursorRotation = 180;       // degrees around cursor long axis
        this.cursorTipRotationY = 90;    // degrees around world Y axis at tip
        this.cursorOffsetX = 0;          // cursor offset in tablet X direction (inches)
        this.cursorOffsetY = 0;          // cursor offset in tablet Y direction (inches)
        this.tiltCompensationPosTiltXValue = 0;
        this.tiltCompensationNegTiltXValue = 0;
        this.tiltCompensationPosTiltYValue = 0;
        this.tiltCompensationNegTiltYValue = 0;
        this.scalingFactor = 1;          // 0–2, 1 = no scaling
        this.edgeAttraction = 0;         // -1 to 1, 0 = no effect
        this.edgeAttractionRange = 1;    // tablet inches from edges where attraction applies
        this.penDisplayMode = false;     // false = pen tablet (no screen), true = pen display (embedded screen)
        this.onCameraUpdate = null;      // callback(info) called each frame with live camera data

        // Constants (tablet coordinate dimensions)
        this.tabletWidth = 16;           // tablet X extent in inches
        this.tabletDepth = 9;            // tablet Y extent in inches
        this.tabletThickness = 0.35;     // tablet body height in inches
        this.yOffset = this.tabletThickness / 2; // world Y of tablet surface
        this.arcRadius = 1.5;
        this.barrelArcRadius = 1.5;
        this.azimuthColor = 0x77dd33;
        this.tiltAltitudeColor = 0xee33cc;

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
            this.renderer.render(this.scene, this.camera);
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

    // ── Pen parameters ────────────────────────────────────────────────────────

    setDistance(value) {
        this.distance = value;
        this.updatePenTransform(this.distance, this.tiltAltitude, this.tiltAzimuth, this.barrelRotation);
    }

    setTiltAltitude(value) {
        this.tiltAltitude = value;
        this.updatePenTransform(this.distance, this.tiltAltitude, this.tiltAzimuth, this.barrelRotation);
        return {
            shouldEnableAzimuth: this.tiltAltitude !== 0,
            tiltX: this.calculateTiltX(this.tiltAltitude, this.tiltAzimuth),
            tiltY: this.calculateTiltY(this.tiltAltitude, this.tiltAzimuth),
        };
    }

    setTiltAzimuth(value) {
        this.tiltAzimuth = value;
        this.updatePenTransform(this.distance, this.tiltAltitude, this.tiltAzimuth, this.barrelRotation);
        return {
            tiltX: this.calculateTiltX(this.tiltAltitude, this.tiltAzimuth),
            tiltY: this.calculateTiltY(this.tiltAltitude, this.tiltAzimuth),
        };
    }

    setBarrelRotation(value) {
        this.barrelRotation = value;
        this.updatePenTransform(this.distance, this.tiltAltitude, this.tiltAzimuth, this.barrelRotation);
    }

    // ── Tablet / cursor position (all values in tablet coordinates) ────────────

    // value: tablet X, 0–tabletWidth inches (left → right)
    setTabletPositionX(value) {
        this.tabletOffsetX = value;
        this.updatePenTransform(this.distance, this.tiltAltitude, this.tiltAzimuth, this.barrelRotation);
        if (this.viewer) {
            this.viewer.dispatchEvent(new CustomEvent('tabletPositionChanged', {
                detail: { x: value, y: this.tabletOffsetY }
            }));
        }
    }

    // value: tablet Y, 0–tabletDepth inches (front → back)
    setTabletPositionY(value) {
        this.tabletOffsetY = value;
        this.updatePenTransform(this.distance, this.tiltAltitude, this.tiltAzimuth, this.barrelRotation);
        if (this.viewer) {
            this.viewer.dispatchEvent(new CustomEvent('tabletPositionChanged', {
                detail: { x: this.tabletOffsetX, y: value }
            }));
        }
    }

    // value: cursor offset in tablet X direction (inches)
    setCursorOffsetX(value) {
        this.cursorOffsetX = value;
        this.updatePenTransform(this.distance, this.tiltAltitude, this.tiltAzimuth, this.barrelRotation);
    }

    // value: cursor offset in tablet Y direction (inches)
    setCursorOffsetY(value) {
        this.cursorOffsetY = value;
        this.updatePenTransform(this.distance, this.tiltAltitude, this.tiltAzimuth, this.barrelRotation);
    }

    // ── Tilt compensation ─────────────────────────────────────────────────────

    setTiltCompensationPosTiltXValue(value) {
        this.tiltCompensationPosTiltXValue = value;
        this.updatePenTransform(this.distance, this.tiltAltitude, this.tiltAzimuth, this.barrelRotation);
    }

    setTiltCompensationNegTiltXValue(value) {
        this.tiltCompensationNegTiltXValue = value;
        this.updatePenTransform(this.distance, this.tiltAltitude, this.tiltAzimuth, this.barrelRotation);
    }

    setTiltCompensationPosTiltYValue(value) {
        this.tiltCompensationPosTiltYValue = value;
        this.updatePenTransform(this.distance, this.tiltAltitude, this.tiltAzimuth, this.barrelRotation);
    }

    setTiltCompensationNegTiltYValue(value) {
        this.tiltCompensationNegTiltYValue = value;
        this.updatePenTransform(this.distance, this.tiltAltitude, this.tiltAzimuth, this.barrelRotation);
    }

    // ── Cursor scaling / edge attraction ──────────────────────────────────────

    setScalingFactor(value) {
        this.scalingFactor = value;
        this.updatePenTransform(this.distance, this.tiltAltitude, this.tiltAzimuth, this.barrelRotation);
    }

    setEdgeAttraction(value) {
        this.edgeAttraction = value;
        this.updatePenTransform(this.distance, this.tiltAltitude, this.tiltAzimuth, this.barrelRotation);
    }

    setEdgeAttractionRange(value) {
        this.edgeAttractionRange = value;
        this.updatePenTransform(this.distance, this.tiltAltitude, this.tiltAzimuth, this.barrelRotation);
    }

    // ── Visibility toggles ────────────────────────────────────────────────────

    setAzimuthAnnotationsVisible(visible) {
        this.arcAnnotationGroup.visible = visible;
        this.surfaceLine.visible = visible;
    }

    setAltitudeAnnotationsVisible(visible) {
        this.showAltitudeAnnotations = visible;
        this.updatePenTransform(this.distance, this.tiltAltitude, this.tiltAzimuth, this.barrelRotation);
    }

    setBarrelAnnotationsVisible(visible) {
        this.showBarrelAnnotations = visible;
        this.updatePenTransform(this.distance, this.tiltAltitude, this.tiltAzimuth, this.barrelRotation);
    }

    setTiltXAnnotationsVisible(visible) {
        this.showTiltXAnnotations = visible;
        this.updatePenTransform(this.distance, this.tiltAltitude, this.tiltAzimuth, this.barrelRotation);
    }

    setTiltYAnnotationsVisible(visible) {
        this.showTiltYAnnotations = visible;
        this.updatePenTransform(this.distance, this.tiltAltitude, this.tiltAzimuth, this.barrelRotation);
    }

    setCursorVisible(visible) {
        if (this.cursorArrow)   this.cursorArrow.visible   = visible;
        if (this.monitorCursor) this.monitorCursor.visible = visible;
    }

    setPenShadowVisible(visible) {
        if (this.penTipMesh)    this.penTipMesh.castShadow    = visible;
        if (this.penBarrelMesh) this.penBarrelMesh.castShadow = visible;
    }

    setTabletCheckerboardVisible(visible) {
        if (!this.tabletMaterial) return;
        if (visible) {
            if (!this.tabletCheckerboardTexture) {
                this.tabletCheckerboardTexture = TexturesFactory.createTabletCheckerboardTexture(this.tabletWidth, this.tabletDepth);
            }
            this.tabletMaterial.map = this.tabletCheckerboardTexture;
            this.tabletMaterial.roughness = 0.7;
            this.tabletMaterial.metalness = 0.2;
            this.tabletMaterial.color.setHex(0xffffff);
        } else {
            this.tabletMaterial.map = null;
            this.tabletMaterial.color.setHex(this.tabletBaseColor);
            this.tabletMaterial.roughness = 0.7;
            this.tabletMaterial.metalness = 0.2;
        }
        this.tabletMaterial.needsUpdate = true;
    }

    setPenDisplayMode(enabled) {
        this.penDisplayMode = enabled;
        // Show/hide the tablet embedded screen
        if (this.tabletScreen) this.tabletScreen.visible = enabled;
        // Show/hide the external monitor
        if (this.monitorGroup) this.monitorGroup.visible = !enabled;
        if (this.monitorCursor) this.monitorCursor.visible = !enabled;
        // Raise digitizer grid above the screen in pen display mode
        if (this.digitizerGrid) this.digitizerGrid.position.y = enabled ? 0.008 : 0;
        // Refresh pen transform so cursor position updates
        this.updatePenTransform(this.distance, this.tiltAltitude, this.tiltAzimuth, this.barrelRotation);
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

    // Returns default tablet-coordinate values for all pen parameters.
    reset() {
        return {
            distance: 0,
            tiltAltitude: 0,
            tiltAzimuth: 0,
            barrelRotation: 0,
            tabletX: 8,    // tablet X (inches)
            tabletY: 4.5,  // tablet Y (inches)
        };
    }

    exportAsPNG() {
        this.renderer.render(this.scene, this.camera);
        const link = document.createElement('a');
        link.download = 'Pen3DSim-render.png';
        link.href = this.renderer.domElement.toDataURL('image/png');
        link.click();
    }

    onResize() {
        const aspect = this.viewer.clientWidth / this.viewer.clientHeight;
        this.perspectiveCamera.aspect = aspect;
        this.perspectiveCamera.updateProjectionMatrix();
        this.orthographicCamera.left   = -this.orthoSize * aspect;
        this.orthographicCamera.right  =  this.orthoSize * aspect;
        this.orthographicCamera.updateProjectionMatrix();
        this.renderer.setSize(this.viewer.clientWidth, this.viewer.clientHeight);
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

    // Animates from default position to a demo position.
    // onProgress receives (current, progress) where current uses tablet coordinates.
    animateToDemo(onProgress) {
        // All positions in tablet coordinates
        const start = { distance: 0, tiltAltitude:   0, tiltAzimuth:   0, barrelRotation:   0, tabletX: 8, tabletY: 4.5 };
        const end   = { distance: 0, tiltAltitude:  45, tiltAzimuth: 242, barrelRotation: 318, tabletX: 8, tabletY: 4.5 };
        const duration = 8000;
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

            // Update internal tablet-coordinate state
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
