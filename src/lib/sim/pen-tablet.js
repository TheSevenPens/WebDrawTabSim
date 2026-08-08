import * as THREE from 'three';
import { MaterialsFactory } from './materials.js';
import { TexturesFactory } from './textures.js';
import { Pen3DSim } from './Pen3DSim.js';
import { TABLET, SCENE, SCALE } from './config.js';

// pen-tablet.js — Tablet body, digitizer grid, embedded tablet screen
// Extends Pen3DSim.prototype (must be loaded after Pen3DSim.js)

Object.assign(Pen3DSim.prototype, {

    initTablet() {
        const bodyMargin = TABLET.bodyMargin;
        const geometry = new THREE.BoxGeometry(this.tabletWidth + bodyMargin * 2, this.tabletThickness, this.tabletDepth + bodyMargin * 2);
        const material = MaterialsFactory.createTabletMaterial();
        const tablet = new THREE.Mesh(geometry, material);
        tablet.castShadow = true;
        tablet.receiveShadow = true;
        this.scene.add(tablet);

        // Store references for checkerboard pattern toggle
        this.tabletMesh = tablet;
        this.tabletMaterial = material;
        this.tabletBaseColor = SCENE.tabletBase;
        this.tabletCheckerboardTexture = null;

        const gridGroup = new THREE.Group();
        const gridMaterial = MaterialsFactory.createGridMaterial();
        const gridSpacing = 0.5 * SCALE;

        for (let x = -this.tabletWidth / 2; x <= this.tabletWidth / 2; x += gridSpacing) {
            const points = [
                new THREE.Vector3(x, this.yOffset + 0.001 * SCALE, -this.tabletDepth / 2),
                new THREE.Vector3(x, this.yOffset + 0.001 * SCALE,  this.tabletDepth / 2)
            ];
            gridGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), gridMaterial));
        }

        for (let z = -this.tabletDepth / 2; z <= this.tabletDepth / 2; z += gridSpacing) {
            const points = [
                new THREE.Vector3(-this.tabletWidth / 2, this.yOffset + 0.001 * SCALE, z),
                new THREE.Vector3( this.tabletWidth / 2, this.yOffset + 0.001 * SCALE, z)
            ];
            gridGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), gridMaterial));
        }

        this.digitizerGrid = gridGroup;
        this.gridMaterial = gridMaterial;
        this.scene.add(gridGroup);
        this.darkTablet = false;
        this.tabletCheckerboardVisible = false;

        // ── Pen display mode: embedded screen on tablet surface ──────────────
        const tabletScreenMaterial = MaterialsFactory.createMonitorScreenMaterial(
            TexturesFactory.getSharedDesktopTexture()
        );
        const tabletScreenGeometry = new THREE.PlaneGeometry(this.tabletWidth, this.tabletDepth);
        this.tabletScreen = new THREE.Mesh(tabletScreenGeometry, tabletScreenMaterial);
        this.tabletScreen.rotation.x = -Math.PI / 2;
        this.tabletScreen.position.y = this.yOffset + 0.005 * SCALE;
        this.tabletScreen.visible = false;
        this.scene.add(this.tabletScreen);
    },

});
