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
