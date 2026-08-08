import * as THREE from 'three';
import { MaterialsFactory } from './materials.js';
import { TexturesFactory } from './textures.js';
import { Pen3DSim } from './Pen3DSim.js';
import { createCursorArrowMesh, createCrosshairCursorMesh } from './cursor-geometry.js';
import { CURSOR, MONITOR } from './config.js';

// pen-monitor.js — Desk monitor mesh and screen cursor
// Extends Pen3DSim.prototype (must be loaded after Pen3DSim.js)

Object.assign(Pen3DSim.prototype, {

    initMonitor() {
        // Screen dimensions: 21" diagonal, 16:9 aspect ratio (in the mm world)
        const diagonal     = MONITOR.diagonal;
        const screenWidth  = diagonal * 16 / Math.sqrt(16 * 16 + 9 * 9);
        const screenHeight = diagonal *  9 / Math.sqrt(16 * 16 + 9 * 9);

        const bezelSize  = MONITOR.bezelSize;
        const bodyDepth  = MONITOR.bodyDepth;
        const neckHeight = MONITOR.neckHeight;
        const neckWidth  = MONITOR.neckWidth;
        const neckDepth  = MONITOR.neckDepth;
        const baseHeight = MONITOR.baseHeight;
        const baseWidth  = MONITOR.baseWidth;
        const baseDepth  = MONITOR.baseDepth;

        const monitorZ = MONITOR.z;

        const bezelWidth  = screenWidth  + bezelSize * 2;
        const bezelHeight = screenHeight + bezelSize * 2;

        const baseCenterY  = baseHeight / 2;
        const neckCenterY  = baseHeight + neckHeight / 2;
        const bodyCenterY  = baseHeight + neckHeight + bezelHeight / 2;

        const bezelMaterial  = MaterialsFactory.createMonitorBezelMaterial();
        this.desktopTexture = TexturesFactory.getSharedDesktopTexture();
        const screenMaterial = MaterialsFactory.createMonitorScreenMaterial(
            this.desktopTexture
        );

        this.monitorGroup = new THREE.Group();

        const bodyMesh = new THREE.Mesh(
            new THREE.BoxGeometry(bezelWidth, bezelHeight, bodyDepth),
            bezelMaterial
        );
        bodyMesh.position.set(0, bodyCenterY, monitorZ);
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        this.monitorGroup.add(bodyMesh);

        const screenMesh = new THREE.Mesh(
            new THREE.BoxGeometry(screenWidth, screenHeight, MONITOR.screenThickness),
            screenMaterial
        );
        screenMesh.position.set(0, bodyCenterY, monitorZ + bodyDepth / 2 + MONITOR.screenOffset);
        this.monitorGroup.add(screenMesh);

        const neckMesh = new THREE.Mesh(
            new THREE.BoxGeometry(neckWidth, neckHeight, neckDepth),
            bezelMaterial
        );
        neckMesh.position.set(0, neckCenterY, monitorZ);
        neckMesh.castShadow = true;
        this.monitorGroup.add(neckMesh);

        const baseMesh = new THREE.Mesh(
            new THREE.BoxGeometry(baseWidth, baseHeight, baseDepth),
            bezelMaterial
        );
        baseMesh.position.set(0, baseCenterY, monitorZ);
        baseMesh.castShadow = true;
        baseMesh.receiveShadow = true;
        this.monitorGroup.add(baseMesh);

        this.scene.add(this.monitorGroup);

        this.monitorScreenWidth  = screenWidth;
        this.monitorScreenHeight = screenHeight;
        this.monitorBodyCenterY  = bodyCenterY;
        this.monitorBodyDepth    = bodyDepth;
        this.monitorZ            = monitorZ;

        this.monitorCursor = this.createMonitorCursor();
        this.scene.add(this.monitorCursor);
        this.monitorCrosshair = this.createMonitorCrosshair();
        this.scene.add(this.monitorCrosshair);
    },

    createMonitorCursor() {
        const { mesh } = createCursorArrowMesh(CURSOR.monitorSize);
        // ShapeGeometry is in the XY plane (facing +Z). Rotate so tip points northwest.
        mesh.rotation.z = -3 * Math.PI / 4;
        return mesh;
    },

    createMonitorCrosshair() {
        // Already in the XY plane facing the viewer; symmetric, so no rotation.
        const { mesh } = createCrosshairCursorMesh(CURSOR.monitorSize);
        mesh.visible = false;
        return mesh;
    },

    updateMonitorCursor(worldCursorX, worldCursorZ) {
        if (!this.monitorCursor) return;

        const normalizedX =  worldCursorX / (this.tabletWidth  / 2);
        const normalizedZ =  worldCursorZ / (this.tabletDepth  / 2);

        const screenCursorX = normalizedX * (this.monitorScreenWidth  / 2);
        const screenCursorY = this.monitorBodyCenterY - normalizedZ * (this.monitorScreenHeight / 2);
        const screenCursorZ = this.monitorZ + this.monitorBodyDepth / 2 + MONITOR.cursorOffset;

        this.monitorCursor.position.set(screenCursorX, screenCursorY, screenCursorZ);
        this.monitorCrosshair.position.set(screenCursorX, screenCursorY, screenCursorZ);
    },

});
