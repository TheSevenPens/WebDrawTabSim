import * as THREE from 'three';
import { TexturesFactory } from './textures.js';
import {
    TABLET, DEFAULT_PEN, DEMO_POSE, PEN_RANGES, POINTER_DEFAULTS,
    ANNOTATION, CURSOR, EXPORT, ANIMATION, SCENE, SCALE, clampValue,
} from './config.js';

// Pen3DSim.js — Class skeleton: constructor, animate loop, and public API
// All init/handle/geometry/update methods live in companion files:
//   pen-scene.js      — scene, cameras, renderer, lighting, camera settings
//   pen-room.js       — desk (slab + legs) and studio room (floor, walls, baseboards)
//   pen-tablet.js     — tablet body, digitizer grid, embedded tablet screen
//   pen-monitor.js    — external monitor mesh and screen cursor
//   pen-pen.js        — pen mesh, cursor arrow, updatePenTransform
//   pen-annotations.js — annotation geometry, updateAnnotations, axis markers, math helpers
//   pen-mouse.js      — spacebar + mouse drag control
//
// Coordinate systems used throughout this codebase:
//   Tablet coords  — the logical pen/tablet API space (millimetres):
//                    tabletX  0–384 left → right
//                    tabletY  0–216 front → back (depth)
//                    tabletZ  ≥0    height of pen tip above surface (distance)
//   World coords   — Three.js scene space (1 unit = 1 mm):
//                    worldX   ±192  = tabletX − tabletWidth/2
//                    worldY   ≥…    = tabletSurfaceY + tabletZ   (Y is up)
//                    worldZ   ±108  = tabletY − tabletDepth/2

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
        this.monitorVisible = true;   // external monitor shown (Other → Monitor)
        this.nibShape = 'rounded';   // 'rounded' | 'sharp'
        this.penBodyFormat = 'checkerboard';   // 'checkerboard' | 'solid'
        this.cursorMode = 'mouse';   // 'mouse' | 'crosshairs' | 'none'
        this.onCameraUpdate = null;
        this.viewportAspect = 16 / 9;   // target render aspect (width / height)

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
        this.initDesk();
        this.initRoom();
        this.initTablet();
        this.initMonitor();
        this.initPen();
        this.initAnnotations();
        this.initAxisMarkers();

        // Size the canvas to the target aspect within the viewer before drawing.
        this.onResize();

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
            // Keep the orbit target on/above the tablet surface so that, with
            // maxPolarAngle = 90°, the camera can never drop below the surface.
            if (this.controls.target.y < this.yOffset) this.controls.target.y = this.yOffset;
            this.controls.update();
            this.renderer.render(this.scene, this.camera);
            if (this.onCameraUpdate) {
                const pos = this.camera.position;
                const target = this.controls.target;
                const azimuth = ((THREE.MathUtils.radToDeg(this.controls.getAzimuthalAngle()) % 360) + 360) % 360;
                const elevation = 90 - THREE.MathUtils.radToDeg(this.controls.getPolarAngle());
                const distance = pos.distanceTo(target);
                this.onCameraUpdate({
                    posX: pos.x, posY: pos.y, posZ: pos.z,
                    targetX: target.x, targetY: target.y, targetZ: target.z,
                    azimuth, elevation, distance,
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

    // Select the pointer cursor: 'mouse' (arrow), 'crosshairs', or 'none'.
    setCursorMode(mode) {
        this.cursorMode = mode;
        this._applyCursorMode();
    }

    // Show whichever cursor matches the mode; the monitor copies are also gated
    // off in pen-display mode (the cursor lives on the tablet screen instead).
    _applyCursorMode() {
        const showMouse = this.cursorMode === 'mouse';
        const showCross = this.cursorMode === 'crosshairs';
        if (this.cursorArrow)      this.cursorArrow.visible      = showMouse;
        if (this.cursorCrosshair)  this.cursorCrosshair.visible  = showCross;
        const monitorOn = this.monitorVisible && !this.penDisplayMode;
        if (this.monitorCursor)    this.monitorCursor.visible    = showMouse && monitorOn;
        if (this.monitorCrosshair) this.monitorCrosshair.visible = showCross && monitorOn;
    }

    // Show/hide the external monitor (body + screen + its cursor). Pen-display
    // mode still force-hides the monitor regardless of this toggle.
    setMonitorVisible(visible) {
        this.monitorVisible = visible;
        if (this.monitorGroup) this.monitorGroup.visible = visible && !this.penDisplayMode;
        this._applyCursorMode();
        this.markShadowsDirty();   // the monitor casts a shadow
    }

    // The yellow dashed line dropping from the pen top down to the surface.
    setPenTopLineVisible(visible) {
        if (this.penLine) this.penLine.visible = visible;
    }

    // The white dashed line from the pen tip along the pen axis to the surface.
    setPenAxisLineVisible(visible) {
        if (this.penAxisLine) this.penAxisLine.visible = visible;
    }

    // The yellow dotted line dropping vertically from the pen tip to the surface
    // point directly below it.
    setPenTipLineVisible(visible) {
        if (this.penTipLine) this.penTipLine.visible = visible;
    }

    // The thin line grid over the digitizer active area.
    setGridVisible(visible) {
        if (this.digitizerGrid) this.digitizerGrid.visible = visible;
    }

    // Re-render the shadow map on the next frame. Call whenever shadow-casting
    // geometry moves or its visibility changes (the map is not auto-updated).
    markShadowsDirty() {
        if (this.renderer) this.renderer.shadowMap.needsUpdate = true;
    }

    setPenShadowVisible(visible) {
        const meshes = this.penShadowMeshes || [this.penTipMesh, this.penBarrelMesh];
        for (const mesh of meshes) {
            if (mesh) mesh.castShadow = visible;
        }
        this.markShadowsDirty();
    }

    setTabletCheckerboardVisible(visible) {
        if (!this.tabletMaterial) return;
        this.tabletCheckerboardVisible = visible;
        if (visible) {
            const dark = this.darkTablet;
            const hexToCss = (hex) => '#' + hex.toString(16).padStart(6, '0');
            const c1 = hexToCss(dark ? SCENE.tabletCheckDark1 : SCENE.tabletCheckLight1);
            const c2 = hexToCss(dark ? SCENE.tabletCheckDark2 : SCENE.tabletCheckLight2);
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
        if (this.monitorGroup) this.monitorGroup.visible = this.monitorVisible && !enabled;
        this._applyCursorMode();
        if (this.digitizerGrid) this.digitizerGrid.position.y = enabled ? 0.008 * SCALE : 0;
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

    // Orbit the camera around its target by the given deltas (degrees).
    // +azimuth rotates right (around world Y); +elevation raises the camera.
    rotateCamera(deltaAzimuthDeg = 0, deltaElevationDeg = 0) {
        const offset = this.camera.position.clone().sub(this.controls.target);
        const spherical = new THREE.Spherical().setFromVector3(offset);
        spherical.theta += THREE.MathUtils.degToRad(deltaAzimuthDeg);
        // Elevation up = polar angle down, so subtract.
        spherical.phi -= THREE.MathUtils.degToRad(deltaElevationDeg);
        const eps = 0.0001;
        const minPhi = (this.controls.minPolarAngle ?? 0) + eps;
        const maxPhi = (this.controls.maxPolarAngle ?? Math.PI) - eps;
        spherical.phi = Math.max(minPhi, Math.min(maxPhi, spherical.phi));
        spherical.makeSafe();
        offset.setFromSpherical(spherical);
        this.camera.position.copy(this.controls.target).add(offset);
        this.camera.lookAt(this.controls.target);
        this.controls.update();
    }

    // Move the camera toward/away from its target by a fixed distance delta
    // (negative = closer, positive = farther). Clamped to the OrbitControls
    // min/max distance. In axonometric mode the orthographic zoom is scaled
    // inversely, since ortho scale is independent of distance.
    changeCameraDistance(delta) {
        const offset = this.camera.position.clone().sub(this.controls.target);
        const oldDist = offset.length();
        const minD = this.controls.minDistance ?? 0.01;
        const maxD = this.controls.maxDistance ?? Infinity;
        const newDist = Math.max(minD, Math.min(maxD, oldDist + delta));
        offset.setLength(newDist);
        this.camera.position.copy(this.controls.target).add(offset);
        if (this.camera.isOrthographicCamera && newDist > 0) {
            this.camera.zoom = Math.max(0.05, Math.min(100, this.camera.zoom * (oldDist / newDist)));
            this.camera.updateProjectionMatrix();
        }
        this.controls.update();
    }

    // Aim the camera at a named point on the tablet's active area (or the pen
    // tip) by moving the orbit target there; the camera keeps its position and
    // re-aims. Points are in world space on the digitizer surface (y = yOffset).
    pointCameraAt(name) {
        const hw = this.tabletWidth / 2;   // half of the active-area width
        const hd = this.tabletDepth / 2;   // half of the active-area depth
        const y = this.yOffset;            // digitizer surface height
        let p;
        switch (name) {
            case 'pen-tip':    p = this.penTipWorld ? this.penTipWorld.clone() : new THREE.Vector3(0, y, 0); break;
            case 'center':     p = new THREE.Vector3(  0, y,   0); break;
            case 'corner-fl':  p = new THREE.Vector3(-hw, y, -hd); break;
            case 'corner-fr':  p = new THREE.Vector3( hw, y, -hd); break;
            case 'corner-bl':  p = new THREE.Vector3(-hw, y,  hd); break;
            case 'corner-br':  p = new THREE.Vector3( hw, y,  hd); break;
            case 'edge-front': p = new THREE.Vector3(  0, y, -hd); break;
            case 'edge-back':  p = new THREE.Vector3(  0, y,  hd); break;
            case 'edge-left':  p = new THREE.Vector3(-hw, y,   0); break;
            case 'edge-right': p = new THREE.Vector3( hw, y,   0); break;
            default: return;
        }
        this.controls.target.copy(p);
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

    reset() {
        return { ...DEFAULT_PEN };
    }

    // Render the scene at the requested resolution (supersampled) and return a
    // 2D canvas holding the downsampled image. Restores the live renderer size.
    renderToCanvas(width, height) {
        const origPixelRatio = this.renderer.getPixelRatio();

        this.renderer.setPixelRatio(EXPORT.supersample);
        this.renderer.setSize(width, height);
        this.perspectiveCamera.aspect = width / height;
        this.perspectiveCamera.updateProjectionMatrix();
        this.renderer.render(this.scene, this.camera);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(this.renderer.domElement, 0, 0, width, height);

        // Restore the live render size + aspect (canvas fitted to the viewer).
        this.renderer.setPixelRatio(origPixelRatio);
        this.onResize();

        return canvas;
    }

    exportAsPNG(width = EXPORT.hd.width, height = EXPORT.hd.height) {
        const canvas = this.renderToCanvas(width, height);
        const link = document.createElement('a');
        link.download = `Pen3DSim-${width}x${height}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    // Copy the rendered view to the clipboard as a PNG. Returns a promise that
    // rejects if the browser blocks clipboard access. The ClipboardItem is built
    // with a Blob promise so the write stays inside the user gesture (Safari).
    async copyPNGToClipboard(width = EXPORT.hd.width, height = EXPORT.hd.height) {
        if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
            throw new Error('Clipboard image copy is not supported in this browser');
        }
        const canvas = this.renderToCanvas(width, height);
        const item = new ClipboardItem({
            'image/png': new Promise((resolve) => canvas.toBlob(resolve, 'image/png')),
        });
        await navigator.clipboard.write([item]);
    }

    // Set the target render aspect (width / height) and re-fit the canvas.
    setViewportAspect(width, height) {
        if (width > 0 && height > 0) this.viewportAspect = width / height;
        this.onResize();
    }

    onResize() {
        const cw = this.viewer.clientWidth;
        const ch = this.viewer.clientHeight;
        const aspect = this.viewportAspect || (cw / ch);

        // Largest box of `aspect` that fits inside the viewer (letterboxed).
        let w = cw;
        let h = cw / aspect;
        if (h > ch) { h = ch; w = ch * aspect; }
        w = Math.max(1, Math.floor(w));
        h = Math.max(1, Math.floor(h));

        this.perspectiveCamera.aspect = aspect;
        this.perspectiveCamera.updateProjectionMatrix();
        this.orthographicCamera.left   = -this.orthoSize * aspect;
        this.orthographicCamera.right  =  this.orthoSize * aspect;
        this.orthographicCamera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
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
