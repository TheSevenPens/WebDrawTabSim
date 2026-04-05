import * as THREE from 'three';
import { MaterialsFactory } from './materials.js';
import { TexturesFactory } from './textures.js';
import { Pen3DSim } from './Pen3DSim.js';

// pen-tablet.js — Tablet mesh, grid, and checkerboard
// Extends Pen3DSim.prototype (must be loaded after Pen3DSim.js)

Object.assign(Pen3DSim.prototype, {

    initTablet() {
        const bodyMargin = 1.5;
        const geometry = new THREE.BoxGeometry(this.tabletWidth + bodyMargin * 2, this.tabletThickness, this.tabletDepth + bodyMargin * 2);
        const material = MaterialsFactory.createTabletMaterial();
        const tablet = new THREE.Mesh(geometry, material);
        tablet.castShadow = true;
        tablet.receiveShadow = true;
        this.scene.add(tablet);

        const deskHeight = 1;
        const deskGeometry = new THREE.BoxGeometry(60, deskHeight, 30);
        const deskMesh = new THREE.Mesh(deskGeometry, MaterialsFactory.createDeskMaterial());
        deskMesh.position.set(0, -deskHeight / 2, -6.5);
        deskMesh.receiveShadow = true;
        deskMesh.castShadow = true;
        this.scene.add(deskMesh);

        // Store references for checkerboard pattern toggle
        this.tabletMesh = tablet;
        this.tabletMaterial = material;
        this.tabletBaseColor = 0x505050;
        this.tabletCheckerboardTexture = null;

        const gridGroup = new THREE.Group();
        const gridMaterial = MaterialsFactory.createGridMaterial();
        const gridSpacing = 0.5;

        for (let x = -this.tabletWidth / 2; x <= this.tabletWidth / 2; x += gridSpacing) {
            const points = [
                new THREE.Vector3(x, this.yOffset + 0.001, -this.tabletDepth / 2),
                new THREE.Vector3(x, this.yOffset + 0.001,  this.tabletDepth / 2)
            ];
            gridGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), gridMaterial));
        }

        for (let z = -this.tabletDepth / 2; z <= this.tabletDepth / 2; z += gridSpacing) {
            const points = [
                new THREE.Vector3(-this.tabletWidth / 2, this.yOffset + 0.001, z),
                new THREE.Vector3( this.tabletWidth / 2, this.yOffset + 0.001, z)
            ];
            gridGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), gridMaterial));
        }

        this.digitizerGrid = gridGroup;
        this.scene.add(gridGroup);

        const gridHelper = new THREE.GridHelper(50, 50, 0x444444, 0x222222);
        gridHelper.position.y = -1;
        this.scene.add(gridHelper);

        // ── Pen display mode: embedded screen on tablet surface ──────────────
        const tabletScreenMaterial = MaterialsFactory.createMonitorScreenMaterial(
            TexturesFactory.createDesktopTexture()
        );
        // Push the screen back in the depth buffer so the grid and cursor draw on top
        const tabletScreenGeometry = new THREE.PlaneGeometry(this.tabletWidth, this.tabletDepth);
        this.tabletScreen = new THREE.Mesh(tabletScreenGeometry, tabletScreenMaterial);
        // Rotate to lie flat on the tablet surface (PlaneGeometry faces +Y after -90° X rotation)
        this.tabletScreen.rotation.x = -Math.PI / 2;
        this.tabletScreen.position.y = this.yOffset + 0.005; // just above tablet surface
        this.tabletScreen.visible = false; // hidden by default (pen tablet mode)
        this.scene.add(this.tabletScreen);

    },

});
