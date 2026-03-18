import * as THREE from 'three';
import { MaterialsFactory } from './materials.js';
import { Pen3DSim } from './Pen3DSim.js';

// pen-tablet.js — Tablet mesh, grid, and checkerboard
// Extends Pen3DSim.prototype (must be loaded after Pen3DSim.js)

Object.assign(Pen3DSim.prototype, {

    initTablet() {
        const geometry = new THREE.BoxGeometry(16, 0.1, 9);
        const material = MaterialsFactory.createTabletMaterial();
        const tablet = new THREE.Mesh(geometry, material);
        tablet.castShadow = true;
        tablet.receiveShadow = true;
        this.scene.add(tablet);

        // Store references for checkerboard pattern toggle
        this.tabletMesh = tablet;
        this.tabletMaterial = material;
        this.tabletBaseColor = 0x505050;
        this.tabletCheckerboardTexture = null;

        const wireframe = new THREE.LineSegments(
            new THREE.EdgesGeometry(geometry),
            MaterialsFactory.createTabletWireframeMaterial()
        );
        tablet.add(wireframe);

        const gridGroup = new THREE.Group();
        const gridMaterial = MaterialsFactory.createGridMaterial();
        const gridSpacing = 0.5;

        for (let x = -this.tabletWidth / 2; x <= this.tabletWidth / 2; x += gridSpacing) {
            const points = [
                new THREE.Vector3(x, this.yOffset, -this.tabletDepth / 2),
                new THREE.Vector3(x, this.yOffset,  this.tabletDepth / 2)
            ];
            gridGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), gridMaterial));
        }

        for (let z = -this.tabletDepth / 2; z <= this.tabletDepth / 2; z += gridSpacing) {
            const points = [
                new THREE.Vector3(-this.tabletWidth / 2, this.yOffset, z),
                new THREE.Vector3( this.tabletWidth / 2, this.yOffset, z)
            ];
            gridGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), gridMaterial));
        }

        this.scene.add(gridGroup);

        const gridHelper = new THREE.GridHelper(50, 50, 0x444444, 0x222222);
        gridHelper.position.y = -5;
        this.scene.add(gridHelper);
    },

});
