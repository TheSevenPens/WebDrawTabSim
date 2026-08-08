import * as THREE from 'three';
import { MaterialsFactory } from './materials.js';
import { TexturesFactory } from './textures.js';
import { Pen3DSim } from './Pen3DSim.js';
import { TABLET, SCENE, SCALE } from './config.js';

// pen-tablet.js — Tablet mesh, grid, desk, studio room
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

        const deskHeight = 1 * SCALE;
        const deskW = 60 * SCALE, deskD = 30 * SCALE, deskZ = -6.5 * SCALE;
        const deskGeometry = new THREE.BoxGeometry(deskW, deskHeight, deskD);
        const deskMesh = new THREE.Mesh(deskGeometry, MaterialsFactory.createDeskMaterial());
        deskMesh.position.set(0, -deskHeight / 2, deskZ);
        deskMesh.receiveShadow = true;
        deskMesh.castShadow = true;
        this.scene.add(deskMesh);

        // Desk legs — solid light wood (no grain)
        const legHeight = 28 * SCALE;
        const legSize = 1.5 * SCALE;
        const legGeometry = new THREE.BoxGeometry(legSize, legHeight, legSize);
        const legMaterial = MaterialsFactory.createDeskLegMaterial();
        const legY = -deskHeight - legHeight / 2;
        const legInset = 2 * SCALE;
        const legPositions = [
            [-deskW / 2 + legInset, legY, deskZ - deskD / 2 + legInset],
            [ deskW / 2 - legInset, legY, deskZ - deskD / 2 + legInset],
            [-deskW / 2 + legInset, legY, deskZ + deskD / 2 - legInset],
            [ deskW / 2 - legInset, legY, deskZ + deskD / 2 - legInset],
        ];
        for (const [x, y, z] of legPositions) {
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            leg.position.set(x, y, z);
            leg.castShadow = true;
            leg.receiveShadow = true;
            this.scene.add(leg);
        }

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

        // Floor + studio walls (no dark GridHelper)
        const floorY = -29 * SCALE;
        const roomW = 200 * SCALE;
        const roomD = 160 * SCALE;
        // Grow depth 50% toward the camera (+Z); keep the back wall fixed
        const roomDExtra = roomD * 0.5;
        const roomDFull = roomD + roomDExtra;
        const roomCenterZ = deskZ + roomDExtra / 2;
        const wallZBack = deskZ - roomD / 2;
        const roomH = 90 * SCALE;
        const wallMaterial = MaterialsFactory.createWallMaterial();

        const floorGeometry = new THREE.PlaneGeometry(roomW, roomDFull);
        const floor = new THREE.Mesh(floorGeometry, MaterialsFactory.createFloorMaterial());
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(0, floorY, roomCenterZ);
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Back wall (behind monitor)
        const backWall = new THREE.Mesh(
            new THREE.PlaneGeometry(roomW, roomH),
            wallMaterial
        );
        backWall.position.set(0, floorY + roomH / 2, wallZBack);
        backWall.receiveShadow = true;
        this.scene.add(backWall);

        // Left wall
        const leftWall = new THREE.Mesh(
            new THREE.PlaneGeometry(roomDFull, roomH),
            wallMaterial.clone()
        );
        leftWall.rotation.y = Math.PI / 2;
        leftWall.position.set(-roomW / 2, floorY + roomH / 2, roomCenterZ);
        leftWall.receiveShadow = true;
        this.scene.add(leftWall);

        // Right wall
        const rightWall = new THREE.Mesh(
            new THREE.PlaneGeometry(roomDFull, roomH),
            wallMaterial.clone()
        );
        rightWall.rotation.y = -Math.PI / 2;
        rightWall.position.set(roomW / 2, floorY + roomH / 2, roomCenterZ);
        rightWall.receiveShadow = true;
        this.scene.add(rightWall);

        // Lighter baseboards along each wall
        const boardH = 5 * SCALE;
        const boardDepth = 0.75 * SCALE;
        const boardMaterial = MaterialsFactory.createBaseboardMaterial();
        const boardY = floorY + boardH / 2;
        const wallXLeft = -roomW / 2;
        const wallXRight = roomW / 2;

        const backBoard = new THREE.Mesh(
            new THREE.BoxGeometry(roomW, boardH, boardDepth),
            boardMaterial
        );
        backBoard.position.set(0, boardY, wallZBack + boardDepth / 2);
        backBoard.receiveShadow = true;
        this.scene.add(backBoard);

        const leftBoard = new THREE.Mesh(
            new THREE.BoxGeometry(boardDepth, boardH, roomDFull),
            boardMaterial.clone()
        );
        leftBoard.position.set(wallXLeft + boardDepth / 2, boardY, roomCenterZ);
        leftBoard.receiveShadow = true;
        this.scene.add(leftBoard);

        const rightBoard = new THREE.Mesh(
            new THREE.BoxGeometry(boardDepth, boardH, roomDFull),
            boardMaterial.clone()
        );
        rightBoard.position.set(wallXRight - boardDepth / 2, boardY, roomCenterZ);
        rightBoard.receiveShadow = true;
        this.scene.add(rightBoard);

        // ── Pen display mode: embedded screen on tablet surface ──────────────
        const tabletScreenMaterial = MaterialsFactory.createMonitorScreenMaterial(
            TexturesFactory.createDesktopTexture()
        );
        const tabletScreenGeometry = new THREE.PlaneGeometry(this.tabletWidth, this.tabletDepth);
        this.tabletScreen = new THREE.Mesh(tabletScreenGeometry, tabletScreenMaterial);
        this.tabletScreen.rotation.x = -Math.PI / 2;
        this.tabletScreen.position.y = this.yOffset + 0.005 * SCALE;
        this.tabletScreen.visible = false;
        this.scene.add(this.tabletScreen);
    },

});
