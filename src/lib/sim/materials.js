import * as THREE from 'three';
import { SCENE } from './config.js';

// Materials Factory - Creates all materials used in Pen3DSim

export class MaterialsFactory {
    // Create a standard mesh material (for tablet, pen parts)
    static createStandardMaterial(color, roughness = 0.7, metalness = 0.2, map = null) {
        const material = new THREE.MeshStandardMaterial({
            color: color,
            roughness: roughness,
            metalness: metalness
        });
        if (map) {
            material.map = map;
        }
        return material;
    }

    // Create a basic mesh material (for annotations, cursor)
    static createBasicMaterial(color, transparent = false, opacity = 1.0, side = THREE.FrontSide) {
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: transparent,
            opacity: opacity,
            side: side
        });
        return material;
    }

    // Create a basic line material (for wireframes, grids, arrows, surface lines)
    static createLineBasicMaterial(color, linewidth = 1) {
        return new THREE.LineBasicMaterial({
            color: color,
            linewidth: linewidth
        });
    }

    // Create a dashed line material (for dotted arcs, circles)
    static createDashedLineMaterial(color, linewidth = 2) {
        return new THREE.LineDashedMaterial({
            color: color,
            dashSize: 0.04,
            gapSize: 0.025,
            linewidth: linewidth
        });
    }

    // Create a sprite material (for axis labels)
    static createSpriteMaterial(map) {
        return new THREE.SpriteMaterial({ map: map });
    }

    // Specific material creators for common use cases

    // Desk material — light maple; optional wood-grain map for the top
    static createDeskMaterial(map = null) {
        // When a grain map is provided it already carries the wood color — use white
        // as the tint so the texture is not darkened by multiplication.
        const color = map ? 0xffffff : SCENE.desk;
        return this.createStandardMaterial(color, 0.82, 0.02, map);
    }

    // Desk leg material — solid light wood (no grain map)
    static createDeskLegMaterial() {
        return this.createStandardMaterial(SCENE.deskGrainDark, 0.85, 0.02);
    }

    // Wall material — matte white studio (slight emissive so walls stay bright)
    static createWallMaterial() {
        const material = this.createStandardMaterial(0xffffff, 0.98, 0.0);
        material.emissive = new THREE.Color(0xf5f4f0);
        material.emissiveIntensity = 0.22;
        return material;
    }

    // Floor material — pale warm gray
    static createFloorMaterial() {
        return this.createStandardMaterial(SCENE.floor, 0.92, 0.0);
    }

    // Monitor bezel / stand material
    static createMonitorBezelMaterial() {
        return this.createStandardMaterial(SCENE.monitorBezel, 0.75, 0.15);
    }

    // Monitor screen material — self-lit (MeshBasicMaterial) so the desktop
    // texture is not affected by scene lighting, mimicking a real display.
    static createMonitorScreenMaterial(texture) {
        return new THREE.MeshBasicMaterial({ map: texture });
    }

    // Tablet material — soft lavender, matte low-poly slab
    static createTabletMaterial() {
        return this.createStandardMaterial(SCENE.tablet, 0.92, 0.0);
    }

    // Tablet wireframe material
    static createTabletWireframeMaterial() {
        return this.createLineBasicMaterial(0x808080, 1);
    }

    // Grid material — soft contrast against the tablet body
    static createGridMaterial() {
        return new THREE.LineBasicMaterial({
            color: SCENE.grid,
            transparent: true,
            opacity: 0.55,
        });
    }

    // Pen tip/barrel material (with texture)
    static createPenMaterial(texture) {
        return this.createStandardMaterial(0xffffff, 0.8, 0.1, texture);
    }

    // Cursor material
    static createCursorMaterial() {
        return this.createBasicMaterial(0xffffff, false, 1.0, THREE.DoubleSide);
    }

    // Cursor outline material
    static createCursorOutlineMaterial() {
        return this.createLineBasicMaterial(0x000000, 2);
    }

    // Arc material (for azimuth, barrel, tilt annotations)
    static createArcMaterial(color) {
        return this.createBasicMaterial(color);
    }

    // Arrow material (for annotation arrows)
    static createArrowMaterial(color) {
        return this.createLineBasicMaterial(color, 2);
    }

    // Pie material (for annotation pie slices)
    static createPieMaterial(color) {
        return this.createBasicMaterial(color, true, 0.3, THREE.DoubleSide);
    }

    // Surface line material
    static createSurfaceLineMaterial(color) {
        return this.createLineBasicMaterial(color, 2);
    }

    // Vertical line material
    static createVerticalLineMaterial(color) {
        return this.createLineBasicMaterial(color, 2);
    }

    // Dotted circle/semicircle material
    static createDottedCircleMaterial(color) {
        return this.createDashedLineMaterial(color, 2);
    }
}
