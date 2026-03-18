import * as THREE from 'three';
import { MaterialsFactory } from './materials.js';
import { TexturesFactory } from './textures.js';
import { Pen3DSim } from './Pen3DSim.js';

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

        const arrowMaterial = MaterialsFactory.createArrowMaterial(this.azimuthColor);
        const arrowGeometry = new THREE.BufferGeometry();
        const arrowLine = new THREE.Line(arrowGeometry, arrowMaterial);
        arrowLine.visible = false;
        this.arcAnnotationGroup.add(arrowLine);

        const dottedArcMaterial = MaterialsFactory.createDottedCircleMaterial(this.azimuthColor);
        const dottedArcGeometry = new THREE.BufferGeometry();
        this.dottedArcLine = new THREE.Line(dottedArcGeometry, dottedArcMaterial);
        this.arcAnnotationGroup.add(this.dottedArcLine);

        this.arcPieMaterial = MaterialsFactory.createPieMaterial(this.azimuthColor);
        this.arcPieMesh = null;

        this.scene.add(this.arcAnnotationGroup);

        // Surface line
        this.surfaceLineGeometry = new THREE.BufferGeometry();
        const surfaceLineMaterial = MaterialsFactory.createSurfaceLineMaterial(this.azimuthColor);
        this.surfaceLine = new THREE.Line(this.surfaceLineGeometry, surfaceLineMaterial);
        this.scene.add(this.surfaceLine);

        const surfaceArrowGeometry = new THREE.BufferGeometry();
        const surfaceArrowLine = new THREE.Line(surfaceArrowGeometry, surfaceLineMaterial);
        surfaceArrowLine.visible = false;
        this.scene.add(surfaceArrowLine);

        // Barrel rotation annotation group
        this.barrelAnnotationGroup = new THREE.Group();
        const barrelAnnotationMaterial = MaterialsFactory.createArcMaterial(0xff8800);
        const barrelArrowMaterial = MaterialsFactory.createArrowMaterial(0xff8800);

        const barrelArcGeometry = new THREE.BufferGeometry();
        this.barrelArcLine = new THREE.Mesh(barrelArcGeometry, barrelAnnotationMaterial);
        this.barrelAnnotationGroup.add(this.barrelArcLine);

        const barrelArrowGeometry = new THREE.BufferGeometry();
        const barrelArrowLine = new THREE.Line(barrelArrowGeometry, barrelArrowMaterial);
        barrelArrowLine.visible = false;
        this.barrelAnnotationGroup.add(barrelArrowLine);

        const barrelSurfaceLineGeometry = new THREE.BufferGeometry();
        this.barrelSurfaceLine = new THREE.Line(barrelSurfaceLineGeometry, barrelArrowMaterial);
        this.barrelAnnotationGroup.add(this.barrelSurfaceLine);

        const barrelSurfaceArrowGeometry = new THREE.BufferGeometry();
        const barrelSurfaceArrowLine = new THREE.Line(barrelSurfaceArrowGeometry, barrelArrowMaterial);
        barrelSurfaceArrowLine.visible = false;
        this.barrelAnnotationGroup.add(barrelSurfaceArrowLine);

        const barrelDottedCircleMaterial = MaterialsFactory.createDottedCircleMaterial(0xff8800);
        const barrelDottedCircleGeometry = new THREE.BufferGeometry();
        this.barrelDottedCircleLine = new THREE.Line(barrelDottedCircleGeometry, barrelDottedCircleMaterial);
        this.barrelAnnotationGroup.add(this.barrelDottedCircleLine);

        this.barrelPieMaterial = MaterialsFactory.createPieMaterial(0xff8800);
        this.barrelPieMesh = null;

        this.scene.add(this.barrelAnnotationGroup);

        // Tilt altitude arc annotation
        const tiltAltitudeArcMaterial = MaterialsFactory.createArcMaterial(this.tiltAltitudeColor);
        const tiltAltitudeArcGeometry = new THREE.BufferGeometry();
        this.tiltAltitudeArcLine = new THREE.Mesh(tiltAltitudeArcGeometry, tiltAltitudeArcMaterial);
        this.scene.add(this.tiltAltitudeArcLine);

        this.tiltAltitudePieMaterial = MaterialsFactory.createPieMaterial(this.tiltAltitudeColor);
        this.tiltAltitudePieMesh = null;

        const tiltAltitudeVerticalLineMaterial = MaterialsFactory.createVerticalLineMaterial(this.tiltAltitudeColor);
        const tiltAltitudeVerticalLineGeometry = new THREE.BufferGeometry();
        this.tiltAltitudeVerticalLine = new THREE.Line(tiltAltitudeVerticalLineGeometry, tiltAltitudeVerticalLineMaterial);
        this.scene.add(this.tiltAltitudeVerticalLine);

        const tiltAltitudeSemicircleMaterial = MaterialsFactory.createDottedCircleMaterial(this.tiltAltitudeColor);
        const tiltAltitudeSemicircleGeometry = new THREE.BufferGeometry();
        this.tiltAltitudeSemicircleLine = new THREE.Line(tiltAltitudeSemicircleGeometry, tiltAltitudeSemicircleMaterial);
        this.scene.add(this.tiltAltitudeSemicircleLine);

        // Tilt X annotation
        const tiltXArcMaterial = MaterialsFactory.createArcMaterial(0x88ccff);
        const tiltXArcGeometry = new THREE.BufferGeometry();
        this.tiltXArcLine = new THREE.Mesh(tiltXArcGeometry, tiltXArcMaterial);
        this.scene.add(this.tiltXArcLine);

        this.tiltXPieMaterial = MaterialsFactory.createPieMaterial(0x88ccff);
        this.tiltXPieMesh = null;

        const tiltXVerticalLineMaterial = MaterialsFactory.createVerticalLineMaterial(0x88ccff);
        const tiltXVerticalLineGeometry = new THREE.BufferGeometry();
        this.tiltXVerticalLine = new THREE.Line(tiltXVerticalLineGeometry, tiltXVerticalLineMaterial);
        this.scene.add(this.tiltXVerticalLine);

        const tiltXDottedCircleMaterial = MaterialsFactory.createDottedCircleMaterial(0x88ccff);
        const tiltXDottedCircleGeometry = new THREE.BufferGeometry();
        this.tiltXDottedCircleLine = new THREE.Line(tiltXDottedCircleGeometry, tiltXDottedCircleMaterial);
        this.scene.add(this.tiltXDottedCircleLine);

        // Tilt Y annotation
        const tiltYArcMaterial = MaterialsFactory.createArcMaterial(0xff88cc);
        const tiltYArcGeometry = new THREE.BufferGeometry();
        this.tiltYArcLine = new THREE.Mesh(tiltYArcGeometry, tiltYArcMaterial);
        this.scene.add(this.tiltYArcLine);

        this.tiltYPieMaterial = MaterialsFactory.createPieMaterial(0xff88cc);
        this.tiltYPieMesh = null;

        const tiltYVerticalLineMaterial = MaterialsFactory.createVerticalLineMaterial(0xff88cc);
        const tiltYVerticalLineGeometry = new THREE.BufferGeometry();
        this.tiltYVerticalLine = new THREE.Line(tiltYVerticalLineGeometry, tiltYVerticalLineMaterial);
        this.scene.add(this.tiltYVerticalLine);

        const tiltYDottedCircleMaterial = MaterialsFactory.createDottedCircleMaterial(0xff88cc);
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
            sprite.scale.set(2, 2, 1);
            return sprite;
        };

        const tabletTopY  = 0.05;
        const arrowOffset = 0.5;
        const arrowPos = new THREE.Vector3(
            -this.tabletWidth  / 2 - arrowOffset,
            tabletTopY,
            -this.tabletDepth / 2 - arrowOffset
        );

        const labelDistance = 3;
        const xAxisColor = '#cc0055';
        const yAxisColor = '#00cc66';
        const zAxisColor = '#0055cc';

        this.xLabel = createTextLabel('X', xAxisColor, arrowPos.clone().add(new THREE.Vector3(labelDistance, 0, 0)));
        this.yLabel = createTextLabel('Z', yAxisColor, arrowPos.clone().add(new THREE.Vector3(0, labelDistance, 0)));
        this.zLabel = createTextLabel('Y', zAxisColor, arrowPos.clone().add(new THREE.Vector3(0, 0, labelDistance)));

        this.scene.add(this.xLabel);
        this.scene.add(this.yLabel);
        this.scene.add(this.zLabel);

        const arrowGap = 0.5;
        this.xArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), arrowPos, labelDistance - arrowGap, xAxisColor);
        this.yArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), arrowPos, labelDistance - arrowGap, yAxisColor);
        this.zArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), arrowPos, labelDistance - arrowGap, zAxisColor);

        this.scene.add(this.xArrow);
        this.scene.add(this.yArrow);
        this.scene.add(this.zArrow);
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

    createSurfaceArrow(startX, startZ, endX, endZ) {
        const arrowHeadLength = 0.3;
        const arrowWidth = 0.15;
        const dx = endX - startX;
        const dz = endZ - startZ;
        const length = Math.sqrt(dx * dx + dz * dz);

        if (length < 0.001) return [];

        const dirX = dx / length;
        const dirZ = dz / length;
        const perpX = -dirZ;
        const perpZ = dirX;

        return [
            new THREE.Vector3(endX, this.yOffset, endZ),
            new THREE.Vector3(endX - arrowHeadLength * dirX - arrowWidth * perpX, this.yOffset, endZ - arrowHeadLength * dirZ - arrowWidth * perpZ),
            new THREE.Vector3(endX - arrowHeadLength * dirX + arrowWidth * perpX, this.yOffset, endZ - arrowHeadLength * dirZ + arrowWidth * perpZ),
            new THREE.Vector3(endX, this.yOffset, endZ)
        ];
    },

    createBarrelArrow(center, axis, u, v, radius, angle) {
        const arrowHeadLength = 0.3;
        const arrowWidth = 0.15;
        const endPoint = center.clone()
            .add(u.clone().multiplyScalar(radius * Math.cos(angle)))
            .add(v.clone().multiplyScalar(radius * Math.sin(angle)));

        const tangent = u.clone().multiplyScalar(Math.sin(angle)).add(v.clone().multiplyScalar(-Math.cos(angle))).normalize();
        const perp    = u.clone().multiplyScalar(Math.cos(angle)).add(v.clone().multiplyScalar( Math.sin(angle))).normalize();

        return [
            endPoint.clone(),
            endPoint.clone().add(tangent.clone().multiplyScalar(-arrowHeadLength)).add(perp.clone().multiplyScalar(-arrowWidth)),
            endPoint.clone().add(tangent.clone().multiplyScalar(-arrowHeadLength)).add(perp.clone().multiplyScalar( arrowWidth)),
            endPoint.clone()
        ];
    },

    createBarrelSurfaceArrow(center, direction, axis) {
        const arrowHeadLength = 0.3;
        const arrowWidth = 0.15;
        if (direction.length() < 0.001) return [];

        const endPoint = center.clone().add(direction);
        const dir  = direction.clone().normalize();
        const perp = new THREE.Vector3().crossVectors(dir, axis).normalize();

        return [
            endPoint.clone(),
            endPoint.clone().add(dir.clone().multiplyScalar(-arrowHeadLength)).add(perp.clone().multiplyScalar(-arrowWidth)),
            endPoint.clone().add(dir.clone().multiplyScalar(-arrowHeadLength)).add(perp.clone().multiplyScalar( arrowWidth)),
            endPoint.clone()
        ];
    },

    createArrow(centerX, centerZ, radius, angle) {
        const arrowHeadLength = 0.3;
        const arrowWidth = 0.15;
        const endX = centerX + radius * Math.cos(angle);
        const endZ = centerZ + radius * Math.sin(angle);
        const dirX =  Math.sin(angle);
        const dirZ = -Math.cos(angle);
        const perpX = Math.cos(angle);
        const perpZ = Math.sin(angle);

        return [
            new THREE.Vector3(endX, this.yOffset, endZ),
            new THREE.Vector3(endX - arrowHeadLength * dirX - arrowWidth * perpX, this.yOffset, endZ - arrowHeadLength * dirZ - arrowWidth * perpZ),
            new THREE.Vector3(endX - arrowHeadLength * dirX + arrowWidth * perpX, this.yOffset, endZ - arrowHeadLength * dirZ + arrowWidth * perpZ),
            new THREE.Vector3(endX, this.yOffset, endZ)
        ];
    },

    createPieShapeInPlane(center, u, v, radius, startAngle, endAngle, segments = 32) {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        for (let i = 0; i <= segments; i++) {
            const angle = startAngle + (endAngle - startAngle) * (i / segments);
            shape.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
        }
        shape.lineTo(0, 0);

        const geometry = new THREE.ShapeGeometry(shape);
        const mesh = new THREE.Mesh(geometry);
        mesh.position.copy(center);

        const uNorm  = u.clone().normalize();
        const vNorm  = v.clone().normalize();
        const normal = new THREE.Vector3().crossVectors(uNorm, vNorm).normalize();

        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeBasis(uNorm, vNorm, normal);
        rotationMatrix.transpose();
        const quaternion = new THREE.Quaternion();
        quaternion.setFromRotationMatrix(rotationMatrix);
        mesh.setRotationFromQuaternion(quaternion);

        return mesh;
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

    createDashedLineMaterial(color, linewidth = 2) {
        return MaterialsFactory.createDashedLineMaterial(color, linewidth);
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
        const tubeGeometry = new THREE.TubeGeometry(curve, segments, 0.02, 8, false);
        if (arcLine.geometry) arcLine.geometry.dispose();
        arcLine.geometry = tubeGeometry;
        arcLine.visible  = true;
    },

    cleanupPieMesh(pieMesh, parent) {
        if (pieMesh) {
            parent.remove(pieMesh);
            if (pieMesh.geometry) pieMesh.geometry.dispose();
        }
        return null;
    },

    updateDottedCircle(line, center, u, v, radius, segments = 64) {
        const points = this.createCircularArcInPlane(center, u, v, radius, 0, 2 * Math.PI, segments);
        line.geometry.setFromPoints(points);
        line.geometry.attributes.position.needsUpdate = true;
        line.computeLineDistances();
        line.visible = true;
    },

});
