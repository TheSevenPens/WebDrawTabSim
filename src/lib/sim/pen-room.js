import * as THREE from 'three';
import { MaterialsFactory } from './materials.js';
import { Pen3DSim } from './Pen3DSim.js';
import { DESK, ROOM } from './config.js';

// pen-room.js — Desk (slab + legs) and studio room (floor, walls, baseboards)
// Extends Pen3DSim.prototype (must be loaded after Pen3DSim.js)

Object.assign(Pen3DSim.prototype, {

    initDesk() {
        const deskGeometry = new THREE.BoxGeometry(DESK.width, DESK.height, DESK.depth);
        const deskMesh = new THREE.Mesh(deskGeometry, MaterialsFactory.createDeskMaterial());
        deskMesh.position.set(0, -DESK.height / 2, DESK.z);
        deskMesh.receiveShadow = true;
        deskMesh.castShadow = true;
        this.scene.add(deskMesh);

        // Desk legs — solid light wood (no grain)
        const legGeometry = new THREE.BoxGeometry(DESK.legSize, DESK.legHeight, DESK.legSize);
        const legMaterial = MaterialsFactory.createDeskLegMaterial();
        const legY = -DESK.height - DESK.legHeight / 2;
        const legPositions = [
            [-DESK.width / 2 + DESK.legInset, legY, DESK.z - DESK.depth / 2 + DESK.legInset],
            [ DESK.width / 2 - DESK.legInset, legY, DESK.z - DESK.depth / 2 + DESK.legInset],
            [-DESK.width / 2 + DESK.legInset, legY, DESK.z + DESK.depth / 2 - DESK.legInset],
            [ DESK.width / 2 - DESK.legInset, legY, DESK.z + DESK.depth / 2 - DESK.legInset],
        ];
        for (const [x, y, z] of legPositions) {
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            leg.position.set(x, y, z);
            leg.castShadow = true;
            leg.receiveShadow = true;
            this.scene.add(leg);
        }
    },

    initRoom() {
        // Floor + studio walls (no dark GridHelper)
        // Grow depth toward the camera (+Z); keep the back wall fixed
        const roomDExtra = ROOM.depth * ROOM.depthExtraTowardCamera;
        const roomDFull = ROOM.depth + roomDExtra;
        const roomCenterZ = DESK.z + roomDExtra / 2;
        const wallZBack = DESK.z - ROOM.depth / 2;
        const wallMaterial = MaterialsFactory.createWallMaterial();

        const floorGeometry = new THREE.PlaneGeometry(ROOM.width, roomDFull);
        const floor = new THREE.Mesh(floorGeometry, MaterialsFactory.createFloorMaterial());
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(0, ROOM.floorY, roomCenterZ);
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Back wall (behind monitor)
        const backWall = new THREE.Mesh(
            new THREE.PlaneGeometry(ROOM.width, ROOM.height),
            wallMaterial
        );
        backWall.position.set(0, ROOM.floorY + ROOM.height / 2, wallZBack);
        backWall.receiveShadow = true;
        this.scene.add(backWall);

        // Left wall
        const leftWall = new THREE.Mesh(
            new THREE.PlaneGeometry(roomDFull, ROOM.height),
            wallMaterial.clone()
        );
        leftWall.rotation.y = Math.PI / 2;
        leftWall.position.set(-ROOM.width / 2, ROOM.floorY + ROOM.height / 2, roomCenterZ);
        leftWall.receiveShadow = true;
        this.scene.add(leftWall);

        // Right wall
        const rightWall = new THREE.Mesh(
            new THREE.PlaneGeometry(roomDFull, ROOM.height),
            wallMaterial.clone()
        );
        rightWall.rotation.y = -Math.PI / 2;
        rightWall.position.set(ROOM.width / 2, ROOM.floorY + ROOM.height / 2, roomCenterZ);
        rightWall.receiveShadow = true;
        this.scene.add(rightWall);

        // Lighter baseboards along each wall
        const boardMaterial = MaterialsFactory.createBaseboardMaterial();
        const boardY = ROOM.floorY + ROOM.baseboardHeight / 2;
        const wallXLeft = -ROOM.width / 2;
        const wallXRight = ROOM.width / 2;

        const backBoard = new THREE.Mesh(
            new THREE.BoxGeometry(ROOM.width, ROOM.baseboardHeight, ROOM.baseboardDepth),
            boardMaterial
        );
        backBoard.position.set(0, boardY, wallZBack + ROOM.baseboardDepth / 2);
        backBoard.receiveShadow = true;
        this.scene.add(backBoard);

        const leftBoard = new THREE.Mesh(
            new THREE.BoxGeometry(ROOM.baseboardDepth, ROOM.baseboardHeight, roomDFull),
            boardMaterial.clone()
        );
        leftBoard.position.set(wallXLeft + ROOM.baseboardDepth / 2, boardY, roomCenterZ);
        leftBoard.receiveShadow = true;
        this.scene.add(leftBoard);

        const rightBoard = new THREE.Mesh(
            new THREE.BoxGeometry(ROOM.baseboardDepth, ROOM.baseboardHeight, roomDFull),
            boardMaterial.clone()
        );
        rightBoard.position.set(wallXRight - ROOM.baseboardDepth / 2, boardY, roomCenterZ);
        rightBoard.receiveShadow = true;
        this.scene.add(rightBoard);
    },

});
