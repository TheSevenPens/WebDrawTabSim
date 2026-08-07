import * as THREE from 'three';
import { MaterialsFactory } from './materials.js';
import { TexturesFactory } from './textures.js';
import { Pen3DSim } from './Pen3DSim.js';
import { createCursorArrowMesh } from './cursor-geometry.js';
import { PEN_MESH, PEN_PROFILE, PEN_CHECKER, CURSOR, ANNOTATION, POINTER_DEFAULTS, SCALE } from './config.js';

// pen-pen.js — Pen mesh, cursor arrow, and the core updatePenTransform loop
// Extends Pen3DSim.prototype (must be loaded after Pen3DSim.js)

// Revolve a [radius, y] silhouette profile around the pen's local +Y axis.
// Profile values are in design units and scaled to the mm world here.
function latheFromProfile(profile, segments) {
    const points = profile.map(([r, y]) => new THREE.Vector2(r * SCALE, y * SCALE));
    return new THREE.LatheGeometry(points, segments);
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
            latheFromProfile(PEN_PROFILE.nib, segments),
            MaterialsFactory.createPenNibMaterial()
        );

        // Body carries a checkerboard wrap so barrel rotation is visible.
        const checkerTexture = TexturesFactory.createCheckerboardTexture();
        checkerTexture.wrapS = THREE.RepeatWrapping;
        checkerTexture.wrapT = THREE.RepeatWrapping;
        checkerTexture.repeat.set(PEN_CHECKER.repeatAround, PEN_CHECKER.repeatLength);
        const bodyGeometry = latheFromProfile(PEN_PROFILE.body, segments);
        remapLatheVByArcLength(bodyGeometry, PEN_PROFILE.body);
        const body = new THREE.Mesh(
            bodyGeometry,
            MaterialsFactory.createPenBodyMaterial(checkerTexture)
        );

        const eraser = new THREE.Mesh(
            latheFromProfile(PEN_PROFILE.eraser, segments),
            MaterialsFactory.createPenEraserMaterial()
        );

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
        this.penLineGeometry = new THREE.BufferGeometry();
        this.penLineGeometry.setAttribute('position', new THREE.BufferAttribute(this.penLinePositions, 3));
        this.penLine = new THREE.Line(this.penLineGeometry, MaterialsFactory.createDashedLineMaterial(0xffff00));
        this.scene.add(this.penLine);

        // Dashed line: pen tip → tablet surface (world coords)
        this.penTipLinePositions = new Float32Array(6);
        this.penTipLineGeometry = new THREE.BufferGeometry();
        this.penTipLineGeometry.setAttribute('position', new THREE.BufferAttribute(this.penTipLinePositions, 3));
        this.penTipLine = new THREE.Line(this.penTipLineGeometry, MaterialsFactory.createDashedLineMaterial(0xffff00));
        this.scene.add(this.penTipLine);

        // Dashed white line: pen axis → tablet surface (world coords)
        this.penAxisLinePositions = new Float32Array(6);
        this.penAxisLineGeometry = new THREE.BufferGeometry();
        this.penAxisLineGeometry.setAttribute('position', new THREE.BufferAttribute(this.penAxisLinePositions, 3));
        this.penAxisLine = new THREE.Line(this.penAxisLineGeometry, MaterialsFactory.createDashedLineMaterial(0xffffff));
        this.scene.add(this.penAxisLine);

        // Cursor arrow
        this.cursorArrow = this.createCursorArrow();
        this.scene.add(this.cursorArrow);

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
        this._altitudeQuat       = new THREE.Quaternion();
        this._azimuthQuat        = new THREE.Quaternion();
        this._barrelQuat         = new THREE.Quaternion();
    },

    createCursorArrow() {
        const { mesh } = createCursorArrowMesh(CURSOR.tabletSize);

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
    },

    // -------------------------------------------------------------------------
    // 1. Pen pose — tablet→world, orientation, helper drop-lines
    // -------------------------------------------------------------------------

    updatePenPose(distance, altitude, azimuth, barrel) {
        const worldSurfaceY = this.yOffset;
        const tipLength     = PEN_MESH.tipHeight;

        const altitudeRad = (altitude * Math.PI) / 180;
        const azimuthRad  = (azimuth  * Math.PI) / 180;
        const barrelRad   = (barrel   * Math.PI) / 180;

        const worldTipX = THREE.MathUtils.clamp(
            this.tabletOffsetX - this.tabletWidth  / 2,
            -this.tabletWidth  / 2, this.tabletWidth  / 2
        );
        const worldTipY = worldSurfaceY + distance;
        const worldTipZ = THREE.MathUtils.clamp(
            this.tabletOffsetY - this.tabletDepth / 2,
            -this.tabletDepth / 2, this.tabletDepth / 2
        );

        this._azimuthQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), azimuthRad);
        this._altitudeQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), altitudeRad);
        this._barrelQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), barrelRad);

        const quaternion = this._penQuaternion;
        quaternion.multiplyQuaternions(this._altitudeQuat, this._barrelQuat);
        quaternion.premultiply(this._azimuthQuat);

        this.penGroup.setRotationFromQuaternion(quaternion);

        const tipOffsetWorld = new THREE.Vector3(0, -tipLength, 0).applyQuaternion(quaternion);
        this.penGroup.position.set(
            worldTipX - tipOffsetWorld.x,
            worldTipY - tipOffsetWorld.y,
            worldTipZ - tipOffsetWorld.z
        );
        this.penGroup.updateMatrixWorld(true);

        this.penTopWorld.copy(this.penTopLocal).applyMatrix4(this.penGroup.matrixWorld);
        this.penTopSurfaceBelow.set(this.penTopWorld.x, worldSurfaceY, this.penTopWorld.z);
        this.penLinePositions[0] = this.penTopWorld.x;
        this.penLinePositions[1] = this.penTopWorld.y;
        this.penLinePositions[2] = this.penTopWorld.z;
        this.penLinePositions[3] = this.penTopSurfaceBelow.x;
        this.penLinePositions[4] = this.penTopSurfaceBelow.y;
        this.penLinePositions[5] = this.penTopSurfaceBelow.z;
        this.penLine.visible = (altitude !== 0);

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
        const scale = POINTER_DEFAULTS.tiltCompensationScale;
        let worldCompOffsetX = 0;
        let worldCompOffsetZ = 0;
        const tiltXDeg = this.calculateTiltX(altitude, azimuth);
        const tiltYDeg = this.calculateTiltY(altitude, azimuth);
        if (tiltXDeg > 0 && this.tiltCompensationPosTiltXValue > 0) {
            worldCompOffsetX = tiltXDeg * this.tiltCompensationPosTiltXValue * scale;
        } else if (tiltXDeg < 0 && this.tiltCompensationNegTiltXValue > 0) {
            worldCompOffsetX = tiltXDeg * this.tiltCompensationNegTiltXValue * scale;
        }
        if (tiltYDeg > 0 && this.tiltCompensationPosTiltYValue > 0) {
            worldCompOffsetZ = tiltYDeg * this.tiltCompensationPosTiltYValue * scale;
        } else if (tiltYDeg < 0 && this.tiltCompensationNegTiltYValue > 0) {
            worldCompOffsetZ = tiltYDeg * this.tiltCompensationNegTiltYValue * scale;
        }

        let worldCursorX, worldCursorZ;
        if (this.scalingFactor > 0) {
            worldCursorX = this.penTipSurfaceBelow.x * this.scalingFactor + this.cursorOffsetX + worldCompOffsetX;
            worldCursorZ = this.penTipSurfaceBelow.z * this.scalingFactor + this.cursorOffsetY + worldCompOffsetZ;
        } else {
            worldCursorX = this.cursorOffsetX + worldCompOffsetX;
            worldCursorZ = this.cursorOffsetY + worldCompOffsetZ;
        }

        if (this.edgeAttraction !== 0 && this.edgeAttractionRange > 0) {
            const leftEdge   = -this.tabletWidth  / 2;
            const rightEdge  =  this.tabletWidth  / 2;
            const frontEdge  = -this.tabletDepth  / 2;
            const backEdge   =  this.tabletDepth  / 2;

            const distFromLeft  = worldCursorX - leftEdge;
            const distFromRight = rightEdge    - worldCursorX;
            const distFromFront = worldCursorZ - frontEdge;
            const distFromBack  = backEdge     - worldCursorZ;

            let attractX = 0;
            let attractZ = 0;

            if (distFromLeft  <= this.edgeAttractionRange && distFromLeft  >= 0)
                attractX += this.edgeAttraction * (1 - distFromLeft  / this.edgeAttractionRange);
            if (distFromRight <= this.edgeAttractionRange && distFromRight >= 0)
                attractX -= this.edgeAttraction * (1 - distFromRight / this.edgeAttractionRange);
            if (distFromFront <= this.edgeAttractionRange && distFromFront >= 0)
                attractZ += this.edgeAttraction * (1 - distFromFront / this.edgeAttractionRange);
            if (distFromBack  <= this.edgeAttractionRange && distFromBack  >= 0)
                attractZ -= this.edgeAttraction * (1 - distFromBack  / this.edgeAttractionRange);

            worldCursorX += attractX;
            worldCursorZ += attractZ;
        }

        const cursorY = this.yOffset + (this.penDisplayMode ? 0.01 : 0.002) * SCALE;
        this.cursorArrow.position.set(worldCursorX, cursorY, worldCursorZ);
        this.updateMonitorCursor(worldCursorX, worldCursorZ);
    },

    // -------------------------------------------------------------------------
    // 3. Annotation overlays
    // -------------------------------------------------------------------------

    updateAnnotations(_distance, altitude, azimuth, barrel) {
        const azimuthRad  = (azimuth  * Math.PI) / 180;
        const penAxisDir = this._penAxisDir;
        const quaternion = this._penQuaternion;
        const arcRadius = ANNOTATION.tiltArcRadius;

        // ── Tilt altitude annotation ─────────────────────────────────────────
        const arcCenter  = this.penTipWorld.clone();
        const tiltAltitudeU = new THREE.Vector3(0, 1, 0);
        const penAxisProjected = penAxisDir.clone().sub(
            tiltAltitudeU.clone().multiplyScalar(penAxisDir.dot(tiltAltitudeU))
        );

        let tiltAltitudeV;
        if (penAxisProjected.length() > 0.001) {
            tiltAltitudeV = penAxisProjected.normalize();
        } else {
            tiltAltitudeV = new THREE.Vector3(Math.sin(azimuthRad), 0, Math.cos(azimuthRad)).normalize();
        }

        const tiltAltitudeStartAngle = 0;
        const tiltAltitudeEndAngle   = Math.atan2(penAxisDir.dot(tiltAltitudeV), penAxisDir.dot(tiltAltitudeU));

        if (this.showAltitudeAnnotations) {
            this.updateDottedCircle(this.tiltAltitudeSemicircleLine, arcCenter, tiltAltitudeU, tiltAltitudeV, arcRadius, 64);
        } else {
            this.tiltAltitudeSemicircleLine.visible = false;
        }

        if (altitude !== 0 && this.showAltitudeAnnotations) {
            const arcStartPoint = arcCenter.clone().add(tiltAltitudeU.clone().multiplyScalar(arcRadius));
            this.updateVerticalLine(this.tiltAltitudeVerticalLine, this.penTipWorld.clone(), arcStartPoint);
            this.updateArcWithTube(this.tiltAltitudeArcLine, arcCenter, tiltAltitudeU, tiltAltitudeV, arcRadius, tiltAltitudeStartAngle, tiltAltitudeEndAngle, 32);
            this.updatePieMesh(this.tiltAltitudePieMesh, this.tiltAltitudePieMaterial, arcCenter, tiltAltitudeU, tiltAltitudeV, arcRadius, tiltAltitudeStartAngle, tiltAltitudeEndAngle, 32);
        } else {
            this.tiltAltitudeVerticalLine.visible = false;
            this.tiltAltitudeArcLine.visible = false;
            this.hidePieMesh(this.tiltAltitudePieMesh);
        }

        const tiltX = this.calculateTiltX(altitude, azimuth);
        const tiltY = this.calculateTiltY(altitude, azimuth);

        // ── Tilt X annotation ────────────────────────────────────────────────
        if (this.showTiltXAnnotations) {
            const tiltXArcCenter = this.penTipWorld.clone();
            const tiltXU = new THREE.Vector3(0, 1, 0);
            const tiltXV = new THREE.Vector3(1, 0, 0);
            const tiltXStartAngle = 0;
            const tiltXEndAngle   = (tiltX * Math.PI) / 180;

            this.updateDottedCircle(this.tiltXDottedCircleLine, tiltXArcCenter, tiltXU, tiltXV, arcRadius, 64);

            if (tiltX !== 0) {
                const tiltXArcStartPoint = tiltXArcCenter.clone().add(tiltXU.clone().multiplyScalar(arcRadius));
                this.updateVerticalLine(this.tiltXVerticalLine, this.penTipWorld.clone(), tiltXArcStartPoint);
                this.updateArcWithTube(this.tiltXArcLine, tiltXArcCenter, tiltXU, tiltXV, arcRadius, tiltXStartAngle, tiltXEndAngle, 32);
                this.updatePieMesh(this.tiltXPieMesh, this.tiltXPieMaterial, tiltXArcCenter, tiltXU, tiltXV, arcRadius, tiltXStartAngle, tiltXEndAngle, 32);
            } else {
                this.tiltXVerticalLine.visible = false;
                this.tiltXArcLine.visible = false;
                this.hidePieMesh(this.tiltXPieMesh);
            }
        } else {
            this.tiltXVerticalLine.visible = false;
            this.tiltXArcLine.visible = false;
            this.tiltXDottedCircleLine.visible = false;
            this.hidePieMesh(this.tiltXPieMesh);
        }

        // ── Tilt Y annotation ────────────────────────────────────────────────
        if (this.showTiltYAnnotations) {
            const tiltYArcCenter = this.penTipWorld.clone();
            const tiltYU = new THREE.Vector3(0, 1, 0);
            const tiltYV = new THREE.Vector3(0, 0, 1);
            const tiltYStartAngle = 0;
            const tiltYEndAngle   = (tiltY * Math.PI) / 180;

            this.updateDottedCircle(this.tiltYDottedCircleLine, tiltYArcCenter, tiltYU, tiltYV, arcRadius, 64);

            if (tiltY !== 0) {
                const tiltYArcStartPoint = tiltYArcCenter.clone().add(tiltYU.clone().multiplyScalar(arcRadius));
                this.updateVerticalLine(this.tiltYVerticalLine, this.penTipWorld.clone(), tiltYArcStartPoint);
                this.updateArcWithTube(this.tiltYArcLine, tiltYArcCenter, tiltYU, tiltYV, arcRadius, tiltYStartAngle, tiltYEndAngle, 32);
                this.updatePieMesh(this.tiltYPieMesh, this.tiltYPieMaterial, tiltYArcCenter, tiltYU, tiltYV, arcRadius, tiltYStartAngle, tiltYEndAngle, 32);
            } else {
                this.tiltYVerticalLine.visible = false;
                this.tiltYArcLine.visible = false;
                this.hidePieMesh(this.tiltYPieMesh);
            }
        } else {
            this.tiltYVerticalLine.visible = false;
            this.tiltYArcLine.visible = false;
            this.tiltYDottedCircleLine.visible = false;
            this.hidePieMesh(this.tiltYPieMesh);
        }

        // ── Azimuth surface line ─────────────────────────────────────────────
        const fixedLineLength = 2.0 * SCALE;
        const dx = this.penTopSurfaceBelow.x - this.penTipSurfaceBelow.x;
        const dz = this.penTopSurfaceBelow.z - this.penTipSurfaceBelow.z;
        const horizLen = Math.sqrt(dx * dx + dz * dz);
        let extendedEndX = this.penTipSurfaceBelow.x;
        let extendedEndZ = this.penTipSurfaceBelow.z;
        if (horizLen > 0.001) {
            extendedEndX = this.penTipSurfaceBelow.x + (dx / horizLen) * fixedLineLength;
            extendedEndZ = this.penTipSurfaceBelow.z + (dz / horizLen) * fixedLineLength;
        }
        this.surfaceLineGeometry.setFromPoints([
            new THREE.Vector3(this.penTipSurfaceBelow.x, this.yOffset, this.penTipSurfaceBelow.z),
            new THREE.Vector3(extendedEndX, this.yOffset, extendedEndZ)
        ]);
        this.surfaceLineGeometry.attributes.position.needsUpdate = true;

        // ── Azimuth arc ──────────────────────────────────────────────────────
        const azimuthArcCenter = new THREE.Vector3(this.penTipSurfaceBelow.x, this.yOffset, this.penTipSurfaceBelow.z);
        const xzPlaneQuat  = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
        const startAngle   = Math.PI / 2 - Math.PI;
        const endAngle     = startAngle + (azimuth * Math.PI) / 180;
        const arcLength    = Math.abs(azimuth);
        const arcSegments  = Math.max(8, Math.floor(arcLength / 5));

        const dottedCirclePoints = [];
        for (let i = 0; i <= 64; i++) {
            const angle = (2 * Math.PI * i) / 64;
            const localPoint = new THREE.Vector3(this.arcRadius * Math.cos(angle), this.arcRadius * Math.sin(angle), 0);
            dottedCirclePoints.push(localPoint.applyQuaternion(xzPlaneQuat).add(azimuthArcCenter));
        }
        this.dottedArcLine.geometry.setFromPoints(dottedCirclePoints);
        this.dottedArcLine.geometry.attributes.position.needsUpdate = true;
        this.dottedArcLine.computeLineDistances();
        this.dottedArcLine.visible = true;

        if (arcLength > 0.1) {
            const arcPoints = [];
            for (let i = 0; i <= arcSegments; i++) {
                const angle = endAngle + (startAngle - endAngle) * (i / arcSegments);
                const localPoint = new THREE.Vector3(this.arcRadius * Math.cos(angle), this.arcRadius * Math.sin(angle), 0);
                arcPoints.push(localPoint.applyQuaternion(xzPlaneQuat).add(azimuthArcCenter));
            }
            const arcCurve = this.createCurveFromPoints(arcPoints);
            const tubeGeometry = new THREE.TubeGeometry(arcCurve, arcSegments, ANNOTATION.tubeRadius, 8, false);
            if (this.arcLine.geometry) this.arcLine.geometry.dispose();
            this.arcLine.geometry = tubeGeometry;
            this.arcLine.visible  = true;

            this.updatePieMeshInGroup(
                this.arcPieMesh, this.arcPieMaterial, this.arcAnnotationGroup,
                new THREE.Vector3(this.penTipSurfaceBelow.x, this.yOffset + 0.003 * SCALE, this.penTipSurfaceBelow.z),
                xzPlaneQuat, this.arcRadius, startAngle, endAngle, arcSegments
            );
        } else {
            this.arcLine.visible = false;
            this.hidePieMesh(this.arcPieMesh);
        }

        // ── Barrel rotation annotation ───────────────────────────────────────
        const barrelCenter = this.penTopWorld.clone();
        const penAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion).normalize();

        const orientationQuat = new THREE.Quaternion();
        orientationQuat.multiplyQuaternions(this._altitudeQuat, new THREE.Quaternion());
        orientationQuat.premultiply(this._azimuthQuat);

        const u = new THREE.Vector3(1, 0, 0).applyQuaternion(orientationQuat).normalize();
        const v = new THREE.Vector3(0, 0, 1).applyQuaternion(orientationQuat).normalize();

        const barrelStartAngle  = Math.PI / 2;
        const barrelEndAngle    = Math.PI / 2 - (barrel * Math.PI) / 180;
        const barrelArcLength   = Math.abs(barrel);
        const barrelArcSegments = Math.max(8, Math.floor(barrelArcLength / 5));

        if (this.showBarrelAnnotations) {
            if (barrelArcLength > 0.1) {
                const barrelArcPoints = this.createBarrelArcPoints(barrelCenter, penAxis, u, v, this.barrelArcRadius, barrelStartAngle, barrelEndAngle, barrelArcSegments);
                const barrelArcCurve  = this.createCurveFromPoints(barrelArcPoints);
                const barrelTubeGeometry = new THREE.TubeGeometry(barrelArcCurve, barrelArcSegments, ANNOTATION.tubeRadius, 8, false);
                if (this.barrelArcLine.geometry) this.barrelArcLine.geometry.dispose();
                this.barrelArcLine.geometry = barrelTubeGeometry;
                this.barrelArcLine.visible  = true;

                const pieStartAngle = (barrelStartAngle - Math.PI) - Math.PI;
                const pieEndAngle   = (barrelEndAngle   - Math.PI) - Math.PI;
                this.updatePieMesh(this.barrelPieMesh, this.barrelPieMaterial, barrelCenter, u, v, this.barrelArcRadius, pieStartAngle, pieEndAngle, 32, this.barrelAnnotationGroup);
            } else {
                this.barrelArcLine.visible = false;
                this.hidePieMesh(this.barrelPieMesh);
            }

            const barrelDottedPoints = this.createBarrelArcPoints(barrelCenter, penAxis, u, v, this.barrelArcRadius, 0, 2 * Math.PI, 64);
            this.barrelDottedCircleLine.geometry.setFromPoints(barrelDottedPoints);
            this.barrelDottedCircleLine.geometry.attributes.position.needsUpdate = true;
            this.barrelDottedCircleLine.computeLineDistances();
            this.barrelDottedCircleLine.visible = true;

            const barrelFixedLineLength = 1.5 * SCALE;
            const barrelDir = u.clone().multiplyScalar(Math.cos(barrelEndAngle))
                               .add(v.clone().multiplyScalar(Math.sin(barrelEndAngle)))
                               .normalize()
                               .multiplyScalar(barrelFixedLineLength);
            this.barrelSurfaceLine.geometry.setFromPoints([barrelCenter.clone(), barrelCenter.clone().add(barrelDir)]);
            this.barrelSurfaceLine.geometry.attributes.position.needsUpdate = true;
            this.barrelSurfaceLine.visible = true;
        } else {
            this.barrelArcLine.visible = false;
            this.barrelDottedCircleLine.visible = false;
            this.barrelSurfaceLine.visible = false;
            this.hidePieMesh(this.barrelPieMesh);
        }
    },

});
