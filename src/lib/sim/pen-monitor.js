import * as THREE from 'three';
import { MaterialsFactory } from './materials.js';
import { TexturesFactory } from './textures.js';
import { Pen3DSim } from './Pen3DSim.js';

// pen-monitor.js — Desk monitor mesh and screen cursor
// Extends Pen3DSim.prototype (must be loaded after Pen3DSim.js)

Object.assign(Pen3DSim.prototype, {

    initMonitor() {
        // Screen dimensions: 21" diagonal, 16:9 aspect ratio
        //   diagonal / √(16²+9²) = 21 / 18.358
        const screenWidth  = 21 * 16 / Math.sqrt(16 * 16 + 9 * 9); // ≈ 18.30 in
        const screenHeight = 21 *  9 / Math.sqrt(16 * 16 + 9 * 9); // ≈ 10.30 in

        const bezelSize  = 0.4;   // uniform bezel around screen (in)
        const bodyDepth  = 0.8;   // monitor body thickness (in)
        const neckHeight = 5.0;   // stand neck height (in)
        const neckWidth  = 1.2;
        const neckDepth  = 0.5;
        const baseHeight = 0.4;
        const baseWidth  = 7.0;
        const baseDepth  = 4.0;

        const monitorZ = -12;     // world Z centre of monitor (behind tablet)

        const bezelWidth  = screenWidth  + bezelSize * 2;
        const bezelHeight = screenHeight + bezelSize * 2;

        // Y positions (desk top surface = Y 0)
        const baseCenterY  = baseHeight / 2;
        const neckCenterY  = baseHeight + neckHeight / 2;
        const bodyCenterY  = baseHeight + neckHeight + bezelHeight / 2;

        const bezelMaterial  = MaterialsFactory.createMonitorBezelMaterial();
        this.desktopTexture = TexturesFactory.createDesktopTexture();
        const screenMaterial = MaterialsFactory.createMonitorScreenMaterial(
            this.desktopTexture
        );

        // Group all monitor parts so they can be toggled as a unit
        this.monitorGroup = new THREE.Group();

        // Monitor body (bezel)
        const bodyMesh = new THREE.Mesh(
            new THREE.BoxGeometry(bezelWidth, bezelHeight, bodyDepth),
            bezelMaterial
        );
        bodyMesh.position.set(0, bodyCenterY, monitorZ);
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        this.monitorGroup.add(bodyMesh);

        // Screen face — sits flush on the front face of the body
        const screenMesh = new THREE.Mesh(
            new THREE.BoxGeometry(screenWidth, screenHeight, 0.05),
            screenMaterial
        );
        screenMesh.position.set(0, bodyCenterY, monitorZ + bodyDepth / 2 + 0.025);
        this.monitorGroup.add(screenMesh);

        // Stand neck
        const neckMesh = new THREE.Mesh(
            new THREE.BoxGeometry(neckWidth, neckHeight, neckDepth),
            bezelMaterial
        );
        neckMesh.position.set(0, neckCenterY, monitorZ);
        neckMesh.castShadow = true;
        this.monitorGroup.add(neckMesh);

        // Stand base
        const baseMesh = new THREE.Mesh(
            new THREE.BoxGeometry(baseWidth, baseHeight, baseDepth),
            bezelMaterial
        );
        baseMesh.position.set(0, baseCenterY, monitorZ);
        baseMesh.castShadow = true;
        baseMesh.receiveShadow = true;
        this.monitorGroup.add(baseMesh);

        this.scene.add(this.monitorGroup);

        // Store geometry constants needed for cursor positioning
        this.monitorScreenWidth  = screenWidth;
        this.monitorScreenHeight = screenHeight;
        this.monitorBodyCenterY  = bodyCenterY;
        this.monitorBodyDepth    = bodyDepth;
        this.monitorZ            = monitorZ;

        // Screen cursor — lies on the screen face plane (XY, facing +Z)
        this.monitorCursor = this.createMonitorCursor();
        this.scene.add(this.monitorCursor);
    },

    createMonitorCursor() {
        const cursorSize = 0.8;
        const shape = new THREE.Shape();
        // Same profile as the tablet cursor
        shape.moveTo(0, 0);
        shape.lineTo(-cursorSize * 0.2, cursorSize * 0.3);
        shape.lineTo(-cursorSize * 0.1, cursorSize * 0.3);
        shape.lineTo(-cursorSize * 0.1, cursorSize * 0.6);
        shape.lineTo( cursorSize * 0.1, cursorSize * 0.6);
        shape.lineTo( cursorSize * 0.1, cursorSize * 0.3);
        shape.lineTo( cursorSize * 0.2, cursorSize * 0.3);
        shape.lineTo(0, 0);

        const geometry = new THREE.ShapeGeometry(shape);
        const mesh = new THREE.Mesh(geometry, MaterialsFactory.createCursorMaterial());

        // ShapeGeometry is already in the XY plane (facing +Z toward viewer).
        // Rotate -135° around Z so the tip points upper-left (northwest), body lower-right.
        mesh.rotation.z = -3 * Math.PI / 4;

        const outline = new THREE.LineSegments(
            new THREE.EdgesGeometry(geometry),
            MaterialsFactory.createCursorOutlineMaterial()
        );
        mesh.add(outline);

        return mesh;
    },

    // Called each frame from updatePenTransform with the already-computed
    // digitizer cursor world position.
    updateMonitorCursor(worldCursorX, worldCursorZ) {
        if (!this.monitorCursor) return;

        // Map digitizer world coords → normalised [-1, 1]
        const normalizedX =  worldCursorX / (this.tabletWidth  / 2);
        const normalizedZ =  worldCursorZ / (this.tabletDepth  / 2);

        // Project onto screen face:
        //   tablet X  → screen X  (same direction)
        //   tablet Z  → screen Y  (positive Z = toward back of desk = higher on screen)
        const screenCursorX = normalizedX * (this.monitorScreenWidth  / 2);
        const screenCursorY = this.monitorBodyCenterY - normalizedZ * (this.monitorScreenHeight / 2);
        const screenCursorZ = this.monitorZ + this.monitorBodyDepth / 2 + 0.08; // just in front of screen face

        this.monitorCursor.position.set(screenCursorX, screenCursorY, screenCursorZ);
    },

});
