import * as THREE from 'three';
import { MaterialsFactory } from './materials.js';

/**
 * Shared arrow cursor silhouette used on the digitizer and monitor.
 * @param {number} cursorSize
 * @returns {{ mesh: THREE.Mesh, geometry: THREE.ShapeGeometry }}
 */
export function createCursorArrowMesh(cursorSize) {
    const shape = new THREE.Shape();
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

    const outline = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry),
        MaterialsFactory.createCursorOutlineMaterial()
    );
    mesh.add(outline);

    return { mesh, geometry };
}

/**
 * Precision crosshair cursor: four white arms around a center gap, black
 * outlined so it reads on any background. Symmetric, so no orientation needed.
 * Built in the XY plane (facing +Z), matching the arrow cursor.
 * @param {number} cursorSize
 * @returns {{ mesh: THREE.Mesh, geometry: THREE.ShapeGeometry }}
 */
export function createCrosshairCursorMesh(cursorSize) {
    const s = cursorSize * 0.8;    // 20% smaller than the arrow cursor
    const t = s * 0.07;            // arm half-thickness
    const gap = s * 0.12;          // half-width of the empty center
    const len = s * 0.5;           // arm length beyond the gap

    const rect = (x0, y0, x1, y1) => {
        const s = new THREE.Shape();
        s.moveTo(x0, y0);
        s.lineTo(x1, y0);
        s.lineTo(x1, y1);
        s.lineTo(x0, y1);
        s.lineTo(x0, y0);
        return s;
    };

    const shapes = [
        rect(-t, gap, t, gap + len),               // up
        rect(-t, -(gap + len), t, -gap),           // down
        rect(gap, -t, gap + len, t),               // right
        rect(-(gap + len), -t, -gap, t),           // left
    ];

    const geometry = new THREE.ShapeGeometry(shapes);
    const mesh = new THREE.Mesh(geometry, MaterialsFactory.createCursorMaterial());

    const outline = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry),
        MaterialsFactory.createCursorOutlineMaterial()
    );
    mesh.add(outline);

    return { mesh, geometry };
}
