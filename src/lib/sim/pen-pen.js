import * as THREE from 'three';
import { MaterialsFactory } from './materials.js';
import { TexturesFactory } from './textures.js';
import { Pen3DSim } from './Pen3DSim.js';

// pen-pen.js — Pen mesh, cursor arrow, and the core updatePenTransform loop
// Extends Pen3DSim.prototype (must be loaded after Pen3DSim.js)

Object.assign(Pen3DSim.prototype, {

    // -------------------------------------------------------------------------
    // Initialization
    // -------------------------------------------------------------------------

    initPen() {
        this.penGroup = new THREE.Group();

        const checkerboardTexture = TexturesFactory.createCheckerboardTexture();
        checkerboardTexture.wrapS = THREE.RepeatWrapping;
        checkerboardTexture.wrapT = THREE.RepeatWrapping;

        const tipHeight = 0.5;
        const tipGeometry = new THREE.ConeGeometry(0.1, tipHeight, 16);
        const tipTexture = checkerboardTexture.clone();
        tipTexture.needsUpdate = true;
        tipTexture.repeat.set(2, 1);
        const tipMaterial = MaterialsFactory.createPenMaterial(tipTexture);
        const penTip = new THREE.Mesh(tipGeometry, tipMaterial);
        penTip.castShadow = true;
        penTip.rotation.x = Math.PI;
        penTip.position.y = -tipHeight / 2;
        this.penGroup.add(penTip);
        this.penTipMesh = penTip;

        const barrelHeight = 4;
        const barrelGeometry = new THREE.CylinderGeometry(0.15, 0.15, barrelHeight, 16);
        const barrelTexture = checkerboardTexture.clone();
        barrelTexture.needsUpdate = true;
        barrelTexture.repeat.set(2, 2);
        const barrelMaterial = MaterialsFactory.createPenMaterial(barrelTexture);
        const penBarrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
        penBarrel.castShadow = true;
        penBarrel.position.y = barrelHeight / 2;
        this.penGroup.add(penBarrel);
        this.penBarrelMesh = penBarrel;

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

        // Reusable world-space vectors (all in Three.js world coordinates)
        this.penTopLocal         = new THREE.Vector3(0,  4, 0); // pen-local space
        this.penTopWorld         = new THREE.Vector3();          // world space
        this.penTopSurfaceBelow  = new THREE.Vector3();          // world space: point directly below penTopWorld on tablet surface
        this.penTipLocal         = new THREE.Vector3(0, -0.5, 0); // pen-local space
        this.penTipWorld         = new THREE.Vector3();           // world space
        this.penTipSurfaceBelow  = new THREE.Vector3();           // world space: point directly below penTipWorld on tablet surface
        this.penAxisIntersection = new THREE.Vector3();           // world space: where pen axis meets tablet surface
    },

    createCursorArrow() {
        const cursorSize = 0.6;
        const shape = new THREE.Shape();
        // Shape defined in local 2D space; will be rotated to lie flat on tablet surface
        const tipX = 0, tipZ = 0;
        shape.moveTo(tipX, tipZ);
        shape.lineTo(tipX - cursorSize * 0.2, tipZ + cursorSize * 0.3);
        shape.lineTo(tipX - cursorSize * 0.1, tipZ + cursorSize * 0.3);
        shape.lineTo(tipX - cursorSize * 0.1, tipZ + cursorSize * 0.6);
        shape.lineTo(tipX + cursorSize * 0.1, tipZ + cursorSize * 0.6);
        shape.lineTo(tipX + cursorSize * 0.1, tipZ + cursorSize * 0.3);
        shape.lineTo(tipX + cursorSize * 0.2, tipZ + cursorSize * 0.3);
        shape.lineTo(tipX, tipZ);

        const geometry = new THREE.ShapeGeometry(shape);
        const mesh = new THREE.Mesh(geometry, MaterialsFactory.createCursorMaterial());

        // Rotate flat onto world XZ plane (tablet surface), then orient northwest
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

        mesh.position.set(0, this.yOffset, 0); // yOffset = world Y of tablet surface

        // Black outline
        const wireframe = new THREE.LineSegments(
            new THREE.EdgesGeometry(geometry),
            MaterialsFactory.createCursorOutlineMaterial()
        );
        mesh.add(wireframe);

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
    // Core simulation update
    //
    // Parameters are in tablet coordinate space:
    //   distance  — tablet Z: pen tip height above surface (inches, ≥0)
    //   altitude  — tilt angle from vertical (degrees)
    //   azimuth   — rotation of tilt direction around tablet surface (degrees)
    //   barrel    — spin around pen's own long axis (degrees)
    //
    // Internally converts tablet coords → world coords for Three.js positioning.
    // Tablet→world mapping:
    //   worldX = tabletOffsetX − tabletWidth/2
    //   worldY = yOffset (tablet surface) + distance
    //   worldZ = tabletOffsetY − tabletDepth/2
    // -------------------------------------------------------------------------

    updatePenTransform(distance, altitude, azimuth, barrel) {
        const worldSurfaceY = this.yOffset;  // world Y of the tablet surface
        const tipLength     = 0.5;   // length of pen tip cone (inches)

        const altitudeRad = (altitude * Math.PI) / 180;
        const azimuthRad  = (azimuth  * Math.PI) / 180;
        const barrelRad   = (barrel   * Math.PI) / 180;

        // ── Tablet → world coordinate conversion ────────────────────────────
        // tabletOffsetX (tablet X, 0–tabletWidth)  → worldX (centered, ±tabletWidth/2)
        // tabletOffsetY (tablet Y, 0–tabletDepth)  → worldZ (centered, ±tabletDepth/2)
        // distance      (tablet Z, height ≥0)      → worldY (above tablet surface)
        const worldTipX = THREE.MathUtils.clamp(
            this.tabletOffsetX - this.tabletWidth  / 2,
            -this.tabletWidth  / 2, this.tabletWidth  / 2
        );
        const worldTipY = worldSurfaceY + distance;
        const worldTipZ = THREE.MathUtils.clamp(
            this.tabletOffsetY - this.tabletDepth / 2,
            -this.tabletDepth / 2, this.tabletDepth / 2
        );

        // ── Pen orientation quaternion ───────────────────────────────────────
        const azimuthQuat  = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), azimuthRad);
        const altitudeQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), altitudeRad);
        const barrelQuat   = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), barrelRad);

        const quaternion = new THREE.Quaternion();
        quaternion.multiplyQuaternions(altitudeQuat, barrelQuat);
        quaternion.premultiply(azimuthQuat);

        this.penGroup.setRotationFromQuaternion(quaternion);

        // Position pen group so that the tip sits at (worldTipX, worldTipY, worldTipZ)
        const tipOffsetWorld = new THREE.Vector3(0, -tipLength, 0).applyQuaternion(quaternion);
        this.penGroup.position.set(
            worldTipX - tipOffsetWorld.x,
            worldTipY - tipOffsetWorld.y,
            worldTipZ - tipOffsetWorld.z
        );
        this.penGroup.updateMatrixWorld(true);

        // ── Top-of-pen drop line (world coords) ─────────────────────────────
        this.penTopWorld.copy(this.penTopLocal).applyMatrix4(this.penGroup.matrixWorld);
        this.penTopSurfaceBelow.set(this.penTopWorld.x, worldSurfaceY, this.penTopWorld.z);
        this.penLinePositions[0] = this.penTopWorld.x;
        this.penLinePositions[1] = this.penTopWorld.y;
        this.penLinePositions[2] = this.penTopWorld.z;
        this.penLinePositions[3] = this.penTopSurfaceBelow.x;
        this.penLinePositions[4] = this.penTopSurfaceBelow.y;
        this.penLinePositions[5] = this.penTopSurfaceBelow.z;
        this.penLine.visible = (altitude !== 0);

        // ── Pen tip world position ───────────────────────────────────────────
        this.penTipWorld.copy(this.penTipLocal).applyMatrix4(this.penGroup.matrixWorld);
        this.penTipSurfaceBelow.set(this.penTipWorld.x, worldSurfaceY, this.penTipWorld.z);

        // ── Pen axis → tablet surface intersection (world coords) ────────────
        const penAxisDir = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion).normalize();
        if (Math.abs(penAxisDir.y) > 0.001) {
            const t = (worldSurfaceY - this.penTipWorld.y) / penAxisDir.y;
            this.penAxisIntersection.copy(this.penTipWorld).add(penAxisDir.clone().multiplyScalar(t));
        } else {
            // Pen is nearly horizontal — extend 20 inches along axis and project to surface
            this.penAxisIntersection.copy(this.penTipWorld).add(penAxisDir.clone().multiplyScalar(20));
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

        // ── Tilt compensation offsets (world coords, applied to cursor position) ──
        // tiltX and tiltY are in degrees; compensation values (0–1) scale the effect.
        // The result is a world-space offset (inches) along worldX and worldZ.
        let worldCompOffsetX = 0;
        let worldCompOffsetZ = 0;
        const tiltXDeg = this.calculateTiltX(altitude, azimuth);
        const tiltYDeg = this.calculateTiltY(altitude, azimuth);
        if (tiltXDeg > 0 && this.tiltCompensationPosTiltXValue > 0) {
            worldCompOffsetX = tiltXDeg * this.tiltCompensationPosTiltXValue * 0.01;
        } else if (tiltXDeg < 0 && this.tiltCompensationNegTiltXValue > 0) {
            worldCompOffsetX = tiltXDeg * this.tiltCompensationNegTiltXValue * 0.01;
        }
        if (tiltYDeg > 0 && this.tiltCompensationPosTiltYValue > 0) {
            worldCompOffsetZ = tiltYDeg * this.tiltCompensationPosTiltYValue * 0.01;
        } else if (tiltYDeg < 0 && this.tiltCompensationNegTiltYValue > 0) {
            worldCompOffsetZ = tiltYDeg * this.tiltCompensationNegTiltYValue * 0.01;
        }

        // ── Cursor world position ────────────────────────────────────────────
        // penTipSurfaceBelow.x/.z are world X/Z directly below the pen tip.
        // cursorOffsetX/Y are tablet-direction offsets (tabletX→worldX, tabletY→worldZ).
        let worldCursorX, worldCursorZ;
        if (this.scalingFactor > 0) {
            worldCursorX = this.penTipSurfaceBelow.x * this.scalingFactor + this.cursorOffsetX + worldCompOffsetX;
            worldCursorZ = this.penTipSurfaceBelow.z * this.scalingFactor + this.cursorOffsetY + worldCompOffsetZ;
        } else {
            // scalingFactor=0: cursor stays at world origin regardless of pen position
            worldCursorX = this.cursorOffsetX + worldCompOffsetX;
            worldCursorZ = this.cursorOffsetY + worldCompOffsetZ;
        }

        // ── Edge attraction (world coords) ───────────────────────────────────
        if (this.edgeAttraction !== 0 && this.edgeAttractionRange > 0) {
            const leftEdge   = -this.tabletWidth  / 2;  // world X
            const rightEdge  =  this.tabletWidth  / 2;  // world X
            const frontEdge  = -this.tabletDepth  / 2;  // world Z
            const backEdge   =  this.tabletDepth  / 2;  // world Z

            const distFromLeft  = worldCursorX - leftEdge;
            const distFromRight = rightEdge    - worldCursorX;
            const distFromFront = worldCursorZ - frontEdge;
            const distFromBack  = backEdge     - worldCursorZ;

            let attractX = 0;
            let attractZ = 0;

            // Positive attraction pushes cursor away from the nearest edge
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

        // Place cursor arrow at computed world position on tablet surface
        // In pen display mode, raise cursor above the embedded screen
        const cursorY = this.yOffset + (this.penDisplayMode ? 0.03 : 0.005);
        this.cursorArrow.position.set(worldCursorX, cursorY, worldCursorZ);

        // Mirror cursor on monitor screen and tablet screen (pen display mode)
        this.updateMonitorCursor(worldCursorX, worldCursorZ);

        // ── Tilt altitude annotation ─────────────────────────────────────────
        const arcCenter  = this.penTipWorld.clone();  // world coords
        const arcRadius  = 2.0;
        const tiltAltitudeU = new THREE.Vector3(0, 1, 0); // world up
        const penAxisProjected = penAxisDir.clone().sub(
            tiltAltitudeU.clone().multiplyScalar(penAxisDir.dot(tiltAltitudeU))
        );

        let tiltAltitudeV;
        if (penAxisProjected.length() > 0.001) {
            tiltAltitudeV = penAxisProjected.normalize();
        } else {
            // Altitude=0: use azimuth direction to maintain consistent circle orientation
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

            this.tiltAltitudePieMesh = this.cleanupPieMesh(this.tiltAltitudePieMesh, this.scene);
            const tiltAltitudePieShape = new THREE.Shape();
            tiltAltitudePieShape.moveTo(0, 0);
            const segments = 32;
            for (let i = 0; i <= segments; i++) {
                const angle = tiltAltitudeStartAngle + (tiltAltitudeEndAngle - tiltAltitudeStartAngle) * (i / segments);
                tiltAltitudePieShape.lineTo(arcRadius * Math.cos(angle), arcRadius * Math.sin(angle));
            }
            tiltAltitudePieShape.lineTo(0, 0);
            this.tiltAltitudePieMesh = new THREE.Mesh(new THREE.ShapeGeometry(tiltAltitudePieShape), this.tiltAltitudePieMaterial);
            this.tiltAltitudePieMesh.position.copy(arcCenter);
            this.tiltAltitudePieMesh.setRotationFromQuaternion(this.calculatePieRotationQuaternion(tiltAltitudeU, tiltAltitudeV));
            this.scene.add(this.tiltAltitudePieMesh);
        } else {
            this.tiltAltitudeVerticalLine.visible = false;
            this.tiltAltitudeArcLine.visible = false;
            this.tiltAltitudePieMesh = this.cleanupPieMesh(this.tiltAltitudePieMesh, this.scene);
        }

        const tiltX = this.calculateTiltX(altitude, azimuth);
        const tiltY = this.calculateTiltY(altitude, azimuth);

        // ── Tilt X annotation ────────────────────────────────────────────────
        if (this.showTiltXAnnotations) {
            const tiltXArcCenter = this.penTipWorld.clone();
            const tiltXArcRadius = 2.0;
            const tiltXU = new THREE.Vector3(0, 1, 0);
            const tiltXV = new THREE.Vector3(1, 0, 0);
            const tiltXStartAngle = 0;
            const tiltXEndAngle   = (tiltX * Math.PI) / 180;

            this.updateDottedCircle(this.tiltXDottedCircleLine, tiltXArcCenter, tiltXU, tiltXV, tiltXArcRadius, 64);

            if (tiltX !== 0) {
                const tiltXArcStartPoint = tiltXArcCenter.clone().add(tiltXU.clone().multiplyScalar(tiltXArcRadius));
                this.updateVerticalLine(this.tiltXVerticalLine, this.penTipWorld.clone(), tiltXArcStartPoint);
                this.updateArcWithTube(this.tiltXArcLine, tiltXArcCenter, tiltXU, tiltXV, tiltXArcRadius, tiltXStartAngle, tiltXEndAngle, 32);
                this.tiltXPieMesh = this.cleanupPieMesh(this.tiltXPieMesh, this.scene);
                this.tiltXPieMesh = this.createPieShapeInPlane(tiltXArcCenter, tiltXU, tiltXV, tiltXArcRadius, tiltXStartAngle, tiltXEndAngle, 32);
                this.tiltXPieMesh.material = this.tiltXPieMaterial;
                this.scene.add(this.tiltXPieMesh);
            } else {
                this.tiltXVerticalLine.visible = false;
                this.tiltXArcLine.visible = false;
                this.tiltXPieMesh = this.cleanupPieMesh(this.tiltXPieMesh, this.scene);
            }
        } else {
            this.tiltXVerticalLine.visible = false;
            this.tiltXArcLine.visible = false;
            this.tiltXDottedCircleLine.visible = false;
            this.tiltXPieMesh = this.cleanupPieMesh(this.tiltXPieMesh, this.scene);
        }

        // ── Tilt Y annotation ────────────────────────────────────────────────
        if (this.showTiltYAnnotations) {
            const tiltYArcCenter = this.penTipWorld.clone();
            const tiltYArcRadius = 2.0;
            const tiltYU = new THREE.Vector3(0, 1, 0);
            const tiltYV = new THREE.Vector3(0, 0, 1);
            const tiltYStartAngle = 0;
            const tiltYEndAngle   = (tiltY * Math.PI) / 180;

            this.updateDottedCircle(this.tiltYDottedCircleLine, tiltYArcCenter, tiltYU, tiltYV, tiltYArcRadius, 64);

            if (tiltY !== 0) {
                const tiltYArcStartPoint = tiltYArcCenter.clone().add(tiltYU.clone().multiplyScalar(tiltYArcRadius));
                this.updateVerticalLine(this.tiltYVerticalLine, this.penTipWorld.clone(), tiltYArcStartPoint);
                this.updateArcWithTube(this.tiltYArcLine, tiltYArcCenter, tiltYU, tiltYV, tiltYArcRadius, tiltYStartAngle, tiltYEndAngle, 32);

                this.tiltYPieMesh = this.cleanupPieMesh(this.tiltYPieMesh, this.scene);
                const tiltYPieShape = new THREE.Shape();
                tiltYPieShape.moveTo(0, 0);
                const tYSegs = 32;
                for (let i = 0; i <= tYSegs; i++) {
                    const angle = tiltYStartAngle + (tiltYEndAngle - tiltYStartAngle) * (i / tYSegs);
                    tiltYPieShape.lineTo(tiltYArcRadius * Math.cos(angle), tiltYArcRadius * Math.sin(angle));
                }
                tiltYPieShape.lineTo(0, 0);
                this.tiltYPieMesh = new THREE.Mesh(new THREE.ShapeGeometry(tiltYPieShape), this.tiltYPieMaterial);
                this.tiltYPieMesh.position.copy(tiltYArcCenter);
                this.tiltYPieMesh.setRotationFromQuaternion(this.calculatePieRotationQuaternion(tiltYU, tiltYV));
                this.scene.add(this.tiltYPieMesh);
            } else {
                this.tiltYVerticalLine.visible = false;
                this.tiltYArcLine.visible = false;
                this.tiltYPieMesh = this.cleanupPieMesh(this.tiltYPieMesh, this.scene);
            }
        } else {
            this.tiltYVerticalLine.visible = false;
            this.tiltYArcLine.visible = false;
            this.tiltYDottedCircleLine.visible = false;
            this.tiltYPieMesh = this.cleanupPieMesh(this.tiltYPieMesh, this.scene);
        }

        // ── Update tip drop-line buffer ──────────────────────────────────────
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

        // ── Azimuth surface line (world coords, on tablet surface plane) ─────
        const fixedLineLength = 2.0;
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

        // ── Azimuth arc (world coords, on tablet surface plane) ──────────────
        const azimuthArcCenter = new THREE.Vector3(this.penTipSurfaceBelow.x, this.yOffset, this.penTipSurfaceBelow.z);
        // Rotate arc from XY plane to world XZ plane (flat on tablet surface)
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
            const tubeGeometry = new THREE.TubeGeometry(arcCurve, arcSegments, 0.02, 8, false);
            if (this.arcLine.geometry) this.arcLine.geometry.dispose();
            this.arcLine.geometry = tubeGeometry;
            this.arcLine.visible  = true;

            this.arcPieMesh = this.cleanupPieMesh(this.arcPieMesh, this.arcAnnotationGroup);
            const azimuthPieShape = new THREE.Shape();
            azimuthPieShape.moveTo(0, 0);
            for (let i = 0; i <= arcSegments; i++) {
                const angle = startAngle + (endAngle - startAngle) * (i / arcSegments);
                azimuthPieShape.lineTo(this.arcRadius * Math.cos(angle), this.arcRadius * Math.sin(angle));
            }
            azimuthPieShape.lineTo(0, 0);
            this.arcPieMesh = new THREE.Mesh(new THREE.ShapeGeometry(azimuthPieShape), this.arcPieMaterial);
            this.arcPieMesh.position.set(this.penTipSurfaceBelow.x, this.yOffset, this.penTipSurfaceBelow.z);
            this.arcPieMesh.setRotationFromQuaternion(xzPlaneQuat);
            this.arcAnnotationGroup.add(this.arcPieMesh);
        } else {
            this.arcLine.visible = false;
            this.arcPieMesh = this.cleanupPieMesh(this.arcPieMesh, this.arcAnnotationGroup);
        }

        // ── Barrel rotation annotation (world coords, around pen axis) ───────
        const barrelCenter = this.penTopWorld.clone();
        const penAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion).normalize();

        const orientationQuat = new THREE.Quaternion();
        orientationQuat.multiplyQuaternions(altitudeQuat, new THREE.Quaternion());
        orientationQuat.premultiply(azimuthQuat);

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
                const barrelTubeGeometry = new THREE.TubeGeometry(barrelArcCurve, barrelArcSegments, 0.02, 8, false);
                if (this.barrelArcLine.geometry) this.barrelArcLine.geometry.dispose();
                this.barrelArcLine.geometry = barrelTubeGeometry;
                this.barrelArcLine.visible  = true;

                this.barrelPieMesh = this.cleanupPieMesh(this.barrelPieMesh, this.barrelAnnotationGroup);
                const pieStartAngle = (barrelStartAngle - Math.PI) - Math.PI;
                const pieEndAngle   = (barrelEndAngle   - Math.PI) - Math.PI;
                const pieShape = new THREE.Shape();
                pieShape.moveTo(0, 0);
                const pieSegments = 32;
                for (let i = 0; i <= pieSegments; i++) {
                    const angle = pieStartAngle + (pieEndAngle - pieStartAngle) * (i / pieSegments);
                    pieShape.lineTo(this.barrelArcRadius * Math.cos(angle), this.barrelArcRadius * Math.sin(angle));
                }
                pieShape.lineTo(0, 0);
                this.barrelPieMesh = new THREE.Mesh(new THREE.ShapeGeometry(pieShape), this.barrelPieMaterial);
                this.barrelPieMesh.position.copy(barrelCenter);
                this.barrelPieMesh.setRotationFromQuaternion(this.calculatePieRotationQuaternion(u, v));
                this.barrelAnnotationGroup.add(this.barrelPieMesh);
            } else {
                this.barrelArcLine.visible = false;
                this.barrelPieMesh = this.cleanupPieMesh(this.barrelPieMesh, this.barrelAnnotationGroup);
            }

            const barrelDottedPoints = this.createBarrelArcPoints(barrelCenter, penAxis, u, v, this.barrelArcRadius, 0, 2 * Math.PI, 64);
            this.barrelDottedCircleLine.geometry.setFromPoints(barrelDottedPoints);
            this.barrelDottedCircleLine.geometry.attributes.position.needsUpdate = true;
            this.barrelDottedCircleLine.computeLineDistances();
            this.barrelDottedCircleLine.visible = true;

            const barrelFixedLineLength = 1.5;
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
            this.barrelPieMesh = this.cleanupPieMesh(this.barrelPieMesh, this.barrelAnnotationGroup);
        }
    },

});
