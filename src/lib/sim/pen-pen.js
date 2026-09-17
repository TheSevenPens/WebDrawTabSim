import { penTransform, planarTilt, mapCursor } from './math.js';
import * as THREE from 'three';
import { MaterialsFactory } from './materials.js';
import { TexturesFactory } from './textures.js';
import { Pen3DSim } from './Pen3DSim.js';
import { createCursorArrowMesh, createCrosshairCursorMesh } from './cursor-geometry.js';
import { PEN_MESH, PEN_PROFILE, PEN_CHECKER, PEN_COLORS, CURSOR, POINTER_DEFAULTS, SCALE } from './config.js';

// pen-pen.js — Pen mesh, cursor arrow, and the core updatePenTransform loop
// Extends Pen3DSim.prototype (must be loaded after Pen3DSim.js)

// Revolve a [radius, y] silhouette profile around the pen's local +Y axis.
// Profile values are in design units and scaled to the mm world here.
function latheFromProfile(profile, segments) {
    const points = profile.map(([r, y]) => new THREE.Vector2(r * SCALE, y * SCALE));
    return new THREE.LatheGeometry(points, segments);
}

// Total arc length of a [radius, y] profile (units cancel, so scale-independent).
function profileArcLength(profile) {
    let total = 0;
    for (let j = 1; j < profile.length; j++) {
        const dr = profile[j][0] - profile[j - 1][0];
        const dy = profile[j][1] - profile[j - 1][1];
        total += Math.hypot(dr, dy);
    }
    return total;
}

// LatheGeometry spaces the V texture coordinate per profile *index*, so an
// unevenly-sampled profile stretches the checkerboard. Re-map V to the
// cumulative arc length of the profile so the checks stay square along the body.
function remapLatheVByArcLength(geometry, profile) {
    const n = profile.length;
    const cum = [0];
    for (let j = 1; j < n; j++) {
        const dr = profile[j][0] - profile[j - 1][0];
        const dy = profile[j][1] - profile[j - 1][1];
        cum[j] = cum[j - 1] + Math.hypot(dr, dy);
    }
    const total = cum[n - 1] || 1;
    const uv = geometry.attributes.uv;
    for (let v = 0; v < uv.count; v++) {
        uv.setY(v, cum[v % n] / total);   // vertices are grouped in rings of n
    }
    uv.needsUpdate = true;
}

Object.assign(Pen3DSim.prototype, {

    // -------------------------------------------------------------------------
    // Initialization
    // -------------------------------------------------------------------------

    initPen() {
        this.penGroup = new THREE.Group();

        const tipHeight    = PEN_MESH.tipHeight;     // nib apex at local y = -tipHeight
        const barrelHeight = PEN_MESH.barrelHeight;  // eraser apex at local y = +barrelHeight
        const segments     = PEN_MESH.latheSegments;

        // Three pieces revolved from the hand-drawn wacpen-half.svg profile:
        // a dark nib tip, a graphite body, and a tail eraser dome. All parts
        // share the pen's local +Y axis (nib at the bottom), so the existing
        // pose/tilt/barrel math is unaffected.
        const nib = new THREE.Mesh(
            this.own(latheFromProfile(this.nibProfileFor(this.nibShape), segments)),
            this.own(MaterialsFactory.createPenNibMaterial())
        );

        // Body and eraser both carry a checkerboard wrap so barrel rotation is
        // visible. A fresh texture per piece lets each set its own length-repeat;
        // the eraser's is scaled by its arc length relative to the body so the
        // checks stay the same size across the seam.
        const makeChecker = (repeatLength) => {
            const tex = this.own(TexturesFactory.createCheckerboardTexture());
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(PEN_CHECKER.repeatAround, repeatLength);
            return tex;
        };
        const bodyArc = profileArcLength(PEN_PROFILE.body);

        const bodyGeometry = this.own(latheFromProfile(PEN_PROFILE.body, segments));
        remapLatheVByArcLength(bodyGeometry, PEN_PROFILE.body);
        const bodyChecker = makeChecker(PEN_CHECKER.repeatLength);
        const body = new THREE.Mesh(
            bodyGeometry,
            this.own(MaterialsFactory.createPenBodyMaterial(bodyChecker))
        );
        // Kept so the body can switch between checkerboard and solid color.
        this.penBodyMaterial = body.material;
        this.penBodyCheckerTexture = bodyChecker;

        const eraserGeometry = this.own(latheFromProfile(PEN_PROFILE.eraser, segments));
        remapLatheVByArcLength(eraserGeometry, PEN_PROFILE.eraser);
        const eraserRepeatLength = PEN_CHECKER.repeatLength * (profileArcLength(PEN_PROFILE.eraser) / bodyArc);
        const eraserChecker = makeChecker(eraserRepeatLength);
        const eraser = new THREE.Mesh(
            eraserGeometry,
            this.own(MaterialsFactory.createPenEraserMaterial(eraserChecker))
        );
        // Kept so the eraser checkerboard follows the body format toggle (see setPenBodyFormat).
        this.penEraserMaterial = eraser.material;
        this.penEraserCheckerTexture = eraserChecker;

        this.penShadowMeshes = [nib, body, eraser];
        for (const mesh of this.penShadowMeshes) {
            mesh.castShadow = true;
            this.penGroup.add(mesh);
        }

        // Retained references (tip = nib, barrel = body) for shadow toggling.
        this.penTipMesh    = nib;
        this.penBarrelMesh  = body;

        this.penGroup.position.set(0, 0, 0);
        this.scene.add(this.penGroup);

        // Dashed line: top of pen → tablet surface (world coords)
        this.penLinePositions = new Float32Array(6);
        this.penLineGeometry = this.own(new THREE.BufferGeometry());
        this.penLineGeometry.setAttribute('position', new THREE.BufferAttribute(this.penLinePositions, 3));
        this.penLine = new THREE.Line(this.penLineGeometry, this.own(MaterialsFactory.createDashedLineMaterial(0xffff00)));
        this.scene.add(this.penLine);

        // Dashed line: pen tip → tablet surface (world coords)
        this.penTipLinePositions = new Float32Array(6);
        this.penTipLineGeometry = this.own(new THREE.BufferGeometry());
        this.penTipLineGeometry.setAttribute('position', new THREE.BufferAttribute(this.penTipLinePositions, 3));
        this.penTipLine = new THREE.Line(this.penTipLineGeometry, this.own(MaterialsFactory.createDashedLineMaterial(0xffff00)));
        this.scene.add(this.penTipLine);

        // Dashed white line: pen axis → tablet surface (world coords)
        this.penAxisLinePositions = new Float32Array(6);
        this.penAxisLineGeometry = this.own(new THREE.BufferGeometry());
        this.penAxisLineGeometry.setAttribute('position', new THREE.BufferAttribute(this.penAxisLinePositions, 3));
        this.penAxisLine = new THREE.Line(this.penAxisLineGeometry, this.own(MaterialsFactory.createDashedLineMaterial(0xffffff)));
        this.scene.add(this.penAxisLine);

        // Cursor arrow + crosshair (only one is visible at a time; see setCursorMode)
        this.cursorArrow = this.createCursorArrow();
        this.scene.add(this.cursorArrow);
        this.cursorCrosshair = this.createCursorCrosshair();
        this.scene.add(this.cursorCrosshair);

        // Reusable world-space vectors
        this.penTopLocal         = new THREE.Vector3(0,  barrelHeight, 0);
        this.penTopWorld         = new THREE.Vector3();
        this.penTopSurfaceBelow  = new THREE.Vector3();
        this.penTipLocal         = new THREE.Vector3(0, -tipHeight, 0);
        this.penTipWorld         = new THREE.Vector3();
        this.penTipSurfaceBelow  = new THREE.Vector3();
        this.penAxisIntersection = new THREE.Vector3();
        this._penQuaternion      = new THREE.Quaternion();
        this._penAxisDir         = new THREE.Vector3();
    },

    nibProfileFor(shape) {
        return shape === 'sharp' ? PEN_PROFILE.nibSharp : PEN_PROFILE.nibRounded;
    },

    // Swap the nib tip between 'rounded' and 'sharp'. Both profiles share the
    // same tip apex, so the contact point / pen pose are unaffected.
    setNibShape(shape) {
        this.nibShape = shape;
        if (!this.penTipMesh) return;
        if (this.penTipMesh.geometry) this.penTipMesh.geometry.dispose();
        this.penTipMesh.geometry = this.own(latheFromProfile(this.nibProfileFor(shape), PEN_MESH.latheSegments));
        this.markShadowsDirty();   // nib silhouette changed
    },

    // Switch the pen body (and matching eraser dome) between the checkerboard
    // wrap and a solid graphite color. Mutates the existing materials so
    // shadows/refs stay intact.
    setPenBodyFormat(format) {
        this.requestRender();
        this.penBodyFormat = format;
        const solid = format === 'solid';
        for (const [mat, checkerTexture, solidColor] of [
            [this.penBodyMaterial, this.penBodyCheckerTexture, PEN_COLORS.body],
            [this.penEraserMaterial, this.penEraserCheckerTexture, PEN_COLORS.eraser],
        ]) {
            if (!mat) continue;
            if (solid) {
                mat.map = null;
                mat.color.setHex(solidColor);
            } else {
                mat.map = checkerTexture;
                mat.color.setHex(0xffffff);
            }
            mat.needsUpdate = true;
        }
    },

    createCursorArrow() {
        const { mesh } = createCursorArrowMesh(CURSOR.tabletSize);
        this.own(mesh);

        const toXZPlaneQuat = new THREE.Quaternion();
        toXZPlaneQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);

        const pointNorthwestQuat = new THREE.Quaternion();
        pointNorthwestQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 4);

        const baseQuat = new THREE.Quaternion();
        baseQuat.multiplyQuaternions(pointNorthwestQuat, toXZPlaneQuat);

        const localXAxis  = new THREE.Vector3(1, 0, 0);
        const longAxisDir = localXAxis.applyQuaternion(baseQuat).normalize();

        this.cursorBaseQuat    = baseQuat.clone();
        this.cursorLongAxisDir = longAxisDir.clone();
        this.cursorArrowMesh   = mesh;

        this.updateCursorRotation();

        mesh.position.set(0, this.yOffset, 0);
        return mesh;
    },

    createCursorCrosshair() {
        const { mesh } = createCrosshairCursorMesh(CURSOR.tabletSize);
        this.own(mesh);
        // Lay the XY-plane crosshair flat on the digitizer surface (XZ plane).
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(0, this.yOffset, 0);
        mesh.visible = false;
        return mesh;
    },

    updateCursorRotation() {
        if (!this.cursorArrowMesh || !this.cursorBaseQuat) return;

        const tipYRotQuat = new THREE.Quaternion();
        tipYRotQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (this.cursorTipRotationY * Math.PI) / 180);

        const baseWithYRot = new THREE.Quaternion();
        baseWithYRot.multiplyQuaternions(tipYRotQuat, this.cursorBaseQuat);

        const localXAxis  = new THREE.Vector3(1, 0, 0);
        const longAxisDir = localXAxis.applyQuaternion(baseWithYRot).normalize();

        const longAxisRotQuat = new THREE.Quaternion();
        longAxisRotQuat.setFromAxisAngle(longAxisDir, (this.cursorRotation * Math.PI) / 180);

        const finalQuat = new THREE.Quaternion();
        finalQuat.multiplyQuaternions(longAxisRotQuat, baseWithYRot);

        this.cursorArrowMesh.setRotationFromQuaternion(finalQuat);
    },

    // -------------------------------------------------------------------------
    // Core simulation update (orchestrator)
    // -------------------------------------------------------------------------

    updatePenTransform(distance, altitude, azimuth, barrel) {
        this.updatePenPose(distance, altitude, azimuth, barrel);
        this.updateCursorFromPen(altitude, azimuth);
        this.updateAnnotations(distance, altitude, azimuth, barrel);
        this.markShadowsDirty();   // the pen moved → refresh its shadow
    },

    // -------------------------------------------------------------------------
    // 1. Pen pose — tablet→world, orientation, helper drop-lines
    // -------------------------------------------------------------------------

    updatePenPose(distance, altitude, azimuth, barrel) {
        const worldSurfaceY = this.yOffset;
        const tipLength     = PEN_MESH.tipHeight;

        const transform = penTransform({
            tabletX: this.tabletOffsetX, tabletY: this.tabletOffsetY,
            distance, altitude, azimuth, barrel,
        }, { width: this.tabletWidth, depth: this.tabletDepth, surfaceY: worldSurfaceY }, tipLength);
        const quaternion = this._penQuaternion;
        const q = transform.quaternion;
        quaternion.set(q.x, q.y, q.z, q.w);
        this.penGroup.setRotationFromQuaternion(quaternion);
        this.penGroup.position.set(transform.origin.x, transform.origin.y, transform.origin.z);
        this.penGroup.updateMatrixWorld(true);

        this.penTopWorld.copy(this.penTopLocal).applyMatrix4(this.penGroup.matrixWorld);
        this.penTopSurfaceBelow.set(this.penTopWorld.x, worldSurfaceY, this.penTopWorld.z);
        this.penLinePositions[0] = this.penTopWorld.x;
        this.penLinePositions[1] = this.penTopWorld.y;
        this.penLinePositions[2] = this.penTopWorld.z;
        this.penLinePositions[3] = this.penTopSurfaceBelow.x;
        this.penLinePositions[4] = this.penTopSurfaceBelow.y;
        this.penLinePositions[5] = this.penTopSurfaceBelow.z;
        this.penLine.visible = this.showPenTopLine && altitude !== 0;

        this.penTipWorld.copy(this.penTipLocal).applyMatrix4(this.penGroup.matrixWorld);
        this.penTipSurfaceBelow.set(this.penTipWorld.x, worldSurfaceY, this.penTipWorld.z);

        this._penAxisDir.set(0, 1, 0).applyQuaternion(quaternion).normalize();
        if (Math.abs(this._penAxisDir.y) > 0.001) {
            const t = (worldSurfaceY - this.penTipWorld.y) / this._penAxisDir.y;
            this.penAxisIntersection.copy(this.penTipWorld).add(this._penAxisDir.clone().multiplyScalar(t));
        } else {
            this.penAxisIntersection.copy(this.penTipWorld).add(this._penAxisDir.clone().multiplyScalar(20 * SCALE));
            this.penAxisIntersection.y = worldSurfaceY;
        }
        this.penAxisLinePositions[0] = this.penTipWorld.x;
        this.penAxisLinePositions[1] = this.penTipWorld.y;
        this.penAxisLinePositions[2] = this.penTipWorld.z;
        this.penAxisLinePositions[3] = this.penAxisIntersection.x;
        this.penAxisLinePositions[4] = this.penAxisIntersection.y;
        this.penAxisLinePositions[5] = this.penAxisIntersection.z;
        this.penAxisLineGeometry.attributes.position.needsUpdate = true;
        this.penAxisLine.computeLineDistances();

        this.penTipLinePositions[0] = this.penTipWorld.x;
        this.penTipLinePositions[1] = this.penTipWorld.y;
        this.penTipLinePositions[2] = this.penTipWorld.z;
        this.penTipLinePositions[3] = this.penTipSurfaceBelow.x;
        this.penTipLinePositions[4] = this.penTipSurfaceBelow.y;
        this.penTipLinePositions[5] = this.penTipSurfaceBelow.z;
        this.penLineGeometry.attributes.position.needsUpdate    = true;
        this.penLine.computeLineDistances();
        this.penTipLineGeometry.attributes.position.needsUpdate = true;
        this.penTipLine.computeLineDistances();
    },

    // -------------------------------------------------------------------------
    // 2. Cursor pipeline — scaling, offset, tilt compensation, edge attraction
    // -------------------------------------------------------------------------

    updateCursorFromPen(altitude, azimuth) {
        const { x: worldCursorX, z: worldCursorZ } = mapCursor(
            this.penTipSurfaceBelow, planarTilt(altitude, azimuth), {
                scalingFactor: this.scalingFactor,
                cursorOffsetX: this.cursorOffsetX, cursorOffsetY: this.cursorOffsetY,
                tiltCompensationPosTiltXValue: this.tiltCompensationPosTiltXValue,
                tiltCompensationNegTiltXValue: this.tiltCompensationNegTiltXValue,
                tiltCompensationPosTiltYValue: this.tiltCompensationPosTiltYValue,
                tiltCompensationNegTiltYValue: this.tiltCompensationNegTiltYValue,
                tiltCompensationScale: POINTER_DEFAULTS.tiltCompensationScale,
                edgeAttraction: this.edgeAttraction, edgeAttractionRange: this.edgeAttractionRange,
            }, { width: this.tabletWidth, depth: this.tabletDepth },
        );

        const cursorY = this.yOffset + (this.penDisplayMode ? 0.01 : 0.002) * SCALE;
        this.cursorArrow.position.set(worldCursorX, cursorY, worldCursorZ);
        this.cursorCrosshair.position.set(worldCursorX, cursorY, worldCursorZ);
        this.updateMonitorCursor(worldCursorX, worldCursorZ);
    },

});
