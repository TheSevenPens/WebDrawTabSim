import * as THREE from 'three';
import { MaterialsFactory } from './materials.js';
import { TexturesFactory } from './textures.js';
import { Pen3DSim } from './Pen3DSim.js';
import { ANNOTATION, SCALE } from './config.js';

// pen-annotations.js — Annotation scene objects, geometry helpers, and visibility setters
// Extends Pen3DSim.prototype (must be loaded after Pen3DSim.js)

Object.assign(Pen3DSim.prototype, {

    // -------------------------------------------------------------------------
    // Initialization
    // -------------------------------------------------------------------------

    initAnnotations() {
        // Azimuth arc annotation group
        this.arcAnnotationGroup = new THREE.Group();
        const arcMaterial = MaterialsFactory.createArcMaterial(this.azimuthColor);

        const arcGeometry = new THREE.BufferGeometry();
        this.arcLine = new THREE.Mesh(arcGeometry, arcMaterial);
        this.arcAnnotationGroup.add(this.arcLine);

        const dottedArcMaterial = MaterialsFactory.createDottedCircleMaterial(this.azimuthColor);
        const dottedArcGeometry = new THREE.BufferGeometry();
        this.dottedArcLine = new THREE.Line(dottedArcGeometry, dottedArcMaterial);
        this.arcAnnotationGroup.add(this.dottedArcLine);

        this.arcPieMaterial = MaterialsFactory.createPieMaterial(this.azimuthColor);
        this.arcPieMesh = new THREE.Mesh(new THREE.BufferGeometry(), this.arcPieMaterial);
        this.arcPieMesh.visible = false;
        this.arcAnnotationGroup.add(this.arcPieMesh);

        this.scene.add(this.arcAnnotationGroup);

        // Surface line
        this.surfaceLineGeometry = new THREE.BufferGeometry();
        const surfaceLineMaterial = MaterialsFactory.createSurfaceLineMaterial(this.azimuthColor);
        this.surfaceLine = new THREE.Line(this.surfaceLineGeometry, surfaceLineMaterial);
        this.scene.add(this.surfaceLine);

        // Barrel rotation annotation group
        this.barrelAnnotationGroup = new THREE.Group();
        const barrelAnnotationMaterial = MaterialsFactory.createArcMaterial(ANNOTATION.barrelColor);
        const barrelArrowMaterial = MaterialsFactory.createArrowMaterial(ANNOTATION.barrelColor);

        const barrelArcGeometry = new THREE.BufferGeometry();
        this.barrelArcLine = new THREE.Mesh(barrelArcGeometry, barrelAnnotationMaterial);
        this.barrelAnnotationGroup.add(this.barrelArcLine);

        const barrelSurfaceLineGeometry = new THREE.BufferGeometry();
        this.barrelSurfaceLine = new THREE.Line(barrelSurfaceLineGeometry, barrelArrowMaterial);
        this.barrelAnnotationGroup.add(this.barrelSurfaceLine);

        const barrelDottedCircleMaterial = MaterialsFactory.createDottedCircleMaterial(ANNOTATION.barrelColor);
        const barrelDottedCircleGeometry = new THREE.BufferGeometry();
        this.barrelDottedCircleLine = new THREE.Line(barrelDottedCircleGeometry, barrelDottedCircleMaterial);
        this.barrelAnnotationGroup.add(this.barrelDottedCircleLine);

        this.barrelPieMaterial = MaterialsFactory.createPieMaterial(ANNOTATION.barrelColor);
        this.barrelPieMesh = new THREE.Mesh(new THREE.BufferGeometry(), this.barrelPieMaterial);
        this.barrelPieMesh.visible = false;
        this.barrelAnnotationGroup.add(this.barrelPieMesh);

        this.scene.add(this.barrelAnnotationGroup);

        // Tilt altitude arc annotation
        const tiltAltitudeArcMaterial = MaterialsFactory.createArcMaterial(this.tiltAltitudeColor);
        const tiltAltitudeArcGeometry = new THREE.BufferGeometry();
        this.tiltAltitudeArcLine = new THREE.Mesh(tiltAltitudeArcGeometry, tiltAltitudeArcMaterial);
        this.scene.add(this.tiltAltitudeArcLine);

        this.tiltAltitudePieMaterial = MaterialsFactory.createPieMaterial(this.tiltAltitudeColor);
        this.tiltAltitudePieMesh = new THREE.Mesh(new THREE.BufferGeometry(), this.tiltAltitudePieMaterial);
        this.tiltAltitudePieMesh.visible = false;
        this.scene.add(this.tiltAltitudePieMesh);

        const tiltAltitudeVerticalLineMaterial = MaterialsFactory.createVerticalLineMaterial(this.tiltAltitudeColor);
        const tiltAltitudeVerticalLineGeometry = new THREE.BufferGeometry();
        this.tiltAltitudeVerticalLine = new THREE.Line(tiltAltitudeVerticalLineGeometry, tiltAltitudeVerticalLineMaterial);
        this.scene.add(this.tiltAltitudeVerticalLine);

        const tiltAltitudeSemicircleMaterial = MaterialsFactory.createDottedCircleMaterial(this.tiltAltitudeColor);
        const tiltAltitudeSemicircleGeometry = new THREE.BufferGeometry();
        this.tiltAltitudeSemicircleLine = new THREE.Line(tiltAltitudeSemicircleGeometry, tiltAltitudeSemicircleMaterial);
        this.scene.add(this.tiltAltitudeSemicircleLine);

        // Tilt X annotation
        const tiltXArcMaterial = MaterialsFactory.createArcMaterial(ANNOTATION.tiltXColor);
        const tiltXArcGeometry = new THREE.BufferGeometry();
        this.tiltXArcLine = new THREE.Mesh(tiltXArcGeometry, tiltXArcMaterial);
        this.scene.add(this.tiltXArcLine);

        this.tiltXPieMaterial = MaterialsFactory.createPieMaterial(ANNOTATION.tiltXColor);
        this.tiltXPieMesh = new THREE.Mesh(new THREE.BufferGeometry(), this.tiltXPieMaterial);
        this.tiltXPieMesh.visible = false;
        this.scene.add(this.tiltXPieMesh);

        const tiltXVerticalLineMaterial = MaterialsFactory.createVerticalLineMaterial(ANNOTATION.tiltXColor);
        const tiltXVerticalLineGeometry = new THREE.BufferGeometry();
        this.tiltXVerticalLine = new THREE.Line(tiltXVerticalLineGeometry, tiltXVerticalLineMaterial);
        this.scene.add(this.tiltXVerticalLine);

        const tiltXDottedCircleMaterial = MaterialsFactory.createDottedCircleMaterial(ANNOTATION.tiltXColor);
        const tiltXDottedCircleGeometry = new THREE.BufferGeometry();
        this.tiltXDottedCircleLine = new THREE.Line(tiltXDottedCircleGeometry, tiltXDottedCircleMaterial);
        this.scene.add(this.tiltXDottedCircleLine);

        // Tilt Y annotation
        const tiltYArcMaterial = MaterialsFactory.createArcMaterial(ANNOTATION.tiltYColor);
        const tiltYArcGeometry = new THREE.BufferGeometry();
        this.tiltYArcLine = new THREE.Mesh(tiltYArcGeometry, tiltYArcMaterial);
        this.scene.add(this.tiltYArcLine);

        this.tiltYPieMaterial = MaterialsFactory.createPieMaterial(ANNOTATION.tiltYColor);
        this.tiltYPieMesh = new THREE.Mesh(new THREE.BufferGeometry(), this.tiltYPieMaterial);
        this.tiltYPieMesh.visible = false;
        this.scene.add(this.tiltYPieMesh);

        const tiltYVerticalLineMaterial = MaterialsFactory.createVerticalLineMaterial(ANNOTATION.tiltYColor);
        const tiltYVerticalLineGeometry = new THREE.BufferGeometry();
        this.tiltYVerticalLine = new THREE.Line(tiltYVerticalLineGeometry, tiltYVerticalLineMaterial);
        this.scene.add(this.tiltYVerticalLine);

        const tiltYDottedCircleMaterial = MaterialsFactory.createDottedCircleMaterial(ANNOTATION.tiltYColor);
        const tiltYDottedCircleGeometry = new THREE.BufferGeometry();
        this.tiltYDottedCircleLine = new THREE.Line(tiltYDottedCircleGeometry, tiltYDottedCircleMaterial);
        this.scene.add(this.tiltYDottedCircleLine);
    },

    initAxisMarkers() {
        const createTextLabel = (text, color, position) => {
            const texture = TexturesFactory.createTextLabelTexture(text, color);
            const spriteMaterial = MaterialsFactory.createSpriteMaterial(texture);
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.position.copy(position);
            sprite.scale.set(2 * SCALE, 2 * SCALE, 1);
            return sprite;
        };

        const tabletTopY  = this.yOffset;
        const arrowOffset = 0.5 * SCALE;
        const arrowPos = new THREE.Vector3(
            -this.tabletWidth  / 2 - arrowOffset,
            tabletTopY,
            -this.tabletDepth / 2 - arrowOffset
        );

        const labelDistance = 3 * SCALE;
        const xAxisColor = '#cc0055';
        const yAxisColor = '#00cc66';
        const zAxisColor = '#0055cc';

        // Labels use tablet-space names: world Y = tablet Z, world Z = tablet Y
        this.xLabel = createTextLabel('X', xAxisColor, arrowPos.clone().add(new THREE.Vector3(labelDistance, 0, 0)));
        this.yLabel = createTextLabel('Z', yAxisColor, arrowPos.clone().add(new THREE.Vector3(0, labelDistance, 0)));
        this.zLabel = createTextLabel('Y', zAxisColor, arrowPos.clone().add(new THREE.Vector3(0, 0, labelDistance)));

        this.scene.add(this.xLabel);
        this.scene.add(this.yLabel);
        this.scene.add(this.zLabel);

        const arrowGap = 0.5 * SCALE;
        this.xArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), arrowPos, labelDistance - arrowGap, xAxisColor);
        this.yArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), arrowPos, labelDistance - arrowGap, yAxisColor);
        this.zArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), arrowPos, labelDistance - arrowGap, zAxisColor);

        this.scene.add(this.xArrow);
        this.scene.add(this.yArrow);
        this.scene.add(this.zArrow);

        // Hidden by default; UI toggles visibility
        this.setAxisMarkersVisible(false);
    },

    // -------------------------------------------------------------------------
    // Geometry helpers
    // -------------------------------------------------------------------------

    createCurveFromPoints(points) {
        return new THREE.CatmullRomCurve3(points);
    },

    createCircularArcInPlane(center, u, v, radius, startAngle, endAngle, segments) {
        const points = [];
        for (let i = 0; i <= segments; i++) {
            const angle = startAngle + (endAngle - startAngle) * (i / segments);
            const point = center.clone()
                .add(u.clone().multiplyScalar(radius * Math.cos(angle)))
                .add(v.clone().multiplyScalar(radius * Math.sin(angle)));
            points.push(point);
        }
        return points;
    },

    createBarrelArcPoints(center, axis, u, v, radius, startAngle, endAngle, segments) {
        return this.createCircularArcInPlane(center, u, v, radius, startAngle, endAngle, segments);
    },

    /**
     * Rebuild geometry on a persistent pie mesh (avoids remove/re-add each frame).
     */
    updatePieMesh(pieMesh, material, center, u, v, radius, startAngle, endAngle, segments = 32, parent = null) {
        if (!pieMesh) return;
        if (pieMesh.geometry) pieMesh.geometry.dispose();

        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        for (let i = 0; i <= segments; i++) {
            const angle = startAngle + (endAngle - startAngle) * (i / segments);
            shape.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
        }
        shape.lineTo(0, 0);

        pieMesh.geometry = new THREE.ShapeGeometry(shape);
        pieMesh.material = material;
        pieMesh.position.copy(center);
        pieMesh.setRotationFromQuaternion(this.calculatePieRotationQuaternion(u, v));
        pieMesh.visible = true;
        if (parent && pieMesh.parent !== parent) parent.add(pieMesh);
    },

    /**
     * Azimuth pie uses a fixed XZ-plane quaternion rather than u/v basis.
     */
    updatePieMeshInGroup(pieMesh, material, group, position, quaternion, radius, startAngle, endAngle, segments = 32) {
        if (!pieMesh) return;
        if (pieMesh.geometry) pieMesh.geometry.dispose();

        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        for (let i = 0; i <= segments; i++) {
            const angle = startAngle + (endAngle - startAngle) * (i / segments);
            shape.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
        }
        shape.lineTo(0, 0);

        pieMesh.geometry = new THREE.ShapeGeometry(shape);
        pieMesh.material = material;
        pieMesh.position.copy(position);
        pieMesh.setRotationFromQuaternion(quaternion);
        pieMesh.visible = true;
        if (group && pieMesh.parent !== group) group.add(pieMesh);
    },

    hidePieMesh(pieMesh) {
        if (pieMesh) pieMesh.visible = false;
    },

    calculateTiltX(altitude, azimuth) {
        const altRad = (altitude * Math.PI) / 180;
        const azRad  = (azimuth  * Math.PI) / 180;
        return (Math.atan(Math.tan(altRad) * Math.sin(azRad)) * 180) / Math.PI;
    },

    calculateTiltY(altitude, azimuth) {
        const altRad = (altitude * Math.PI) / 180;
        const azRad  = (azimuth  * Math.PI) / 180;
        return (Math.atan(Math.tan(altRad) * Math.cos(azRad)) * 180) / Math.PI;
    },

    calculatePieRotationQuaternion(u, v) {
        const uNorm  = u.clone().normalize();
        const vNorm  = v.clone().normalize();
        const normal = new THREE.Vector3().crossVectors(uNorm, vNorm).normalize();

        const xAxis = new THREE.Vector3(1, 0, 0);
        const zAxis = new THREE.Vector3(0, 0, 1);

        const zToNormalQuat = new THREE.Quaternion();
        zToNormalQuat.setFromUnitVectors(zAxis, normal);

        const xAfterZRot = xAxis.clone().applyQuaternion(zToNormalQuat);
        const xInPlane   = xAfterZRot.clone().sub(normal.clone().multiplyScalar(xAfterZRot.dot(normal))).normalize();
        const angleToU   = Math.acos(Math.max(-1, Math.min(1, xInPlane.dot(uNorm))));
        const cross      = new THREE.Vector3().crossVectors(xInPlane, uNorm);
        const sign       = cross.dot(normal) >= 0 ? 1 : -1;
        const alignQuat  = new THREE.Quaternion().setFromAxisAngle(normal, sign * angleToU);

        const pieRotationQuat = new THREE.Quaternion();
        pieRotationQuat.multiplyQuaternions(alignQuat, zToNormalQuat);
        return pieRotationQuat;
    },

    updateVerticalLine(line, startPoint, endPoint) {
        line.geometry.setFromPoints([startPoint, endPoint]);
        line.geometry.attributes.position.needsUpdate = true;
        line.visible = true;
    },

    updateArcWithTube(arcLine, center, u, v, radius, startAngle, endAngle, segments = 32) {
        const points = this.createCircularArcInPlane(center, u, v, radius, startAngle, endAngle, segments);
        const curve  = this.createCurveFromPoints(points);
        const tubeGeometry = new THREE.TubeGeometry(curve, segments, ANNOTATION.tubeRadius, 8, false);
        if (arcLine.geometry) arcLine.geometry.dispose();
        arcLine.geometry = tubeGeometry;
        arcLine.visible  = true;
    },

    updateDottedCircle(line, center, u, v, radius, segments = 64) {
        const points = this.createCircularArcInPlane(center, u, v, radius, 0, 2 * Math.PI, segments);
        line.geometry.setFromPoints(points);
        line.geometry.attributes.position.needsUpdate = true;
        line.computeLineDistances();
        line.visible = true;
    },

    // -------------------------------------------------------------------------
    // Per-frame update — called from updatePenTransform (pen-pen.js)
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
