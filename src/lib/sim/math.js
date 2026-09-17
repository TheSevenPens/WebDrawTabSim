// Portable numerical core. No imports, host APIs, scene nodes, or hidden defaults.
// Angles are degrees; positions/dimensions are model millimetres.
/** @typedef {{x: number, y: number, z: number}} Point3 */
/** @typedef {{width: number, depth: number, surfaceY: number}} TabletGeometry */
/** @typedef {{tabletX: number, tabletY: number, distance: number, altitude: number, azimuth: number, barrel: number}} PenPose */
/** @typedef {{x: number, y: number, z: number, w: number}} Quaternion */
/**
 * @typedef {object} CursorMapping
 * @property {number} scalingFactor Dimensionless; nonpositive pins at center before offsets.
 * @property {number} cursorOffsetX Millimetres along world X.
 * @property {number} cursorOffsetY Millimetres along world Z.
 * @property {number} tiltCompensationPosTiltXValue Dimensionless gain.
 * @property {number} tiltCompensationNegTiltXValue Dimensionless gain.
 * @property {number} tiltCompensationPosTiltYValue Dimensionless gain.
 * @property {number} tiltCompensationNegTiltYValue Dimensionless gain.
 * @property {number} tiltCompensationScale Millimetres per degree at unit gain.
 * @property {number} edgeAttraction Millimetres; positive repels, negative attracts.
 * @property {number} edgeAttractionRange Millimetres inward from each edge.
 */

const radians = degrees => degrees * Math.PI / 180;
const degrees = radians => radians * 180 / Math.PI;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * @param {number} altitude Lean from vertical, not Pointer Events altitude.
 *
 * @param {number} azimuth Rotation about world +Y; zero leans toward world +Z.
 *
 * @returns {{tiltX: number, tiltY: number}} Signed planar lean in degrees.
 */
export function planarTilt(altitude, azimuth) {
    const lean = Math.tan(radians(altitude));
    return {
        tiltX: degrees(Math.atan(lean * Math.sin(radians(azimuth)))),
        tiltY: degrees(Math.atan(lean * Math.cos(radians(azimuth)))),
    };
}

/**
 * @param {PenPose} pose
 * @param {TabletGeometry} tablet
 * @returns {Point3} */
export function tabletToWorld(pose, tablet) {
    return {
        x: clamp(pose.tabletX - tablet.width / 2, -tablet.width / 2, tablet.width / 2),
        y: tablet.surfaceY + pose.distance,
        z: clamp(pose.tabletY - tablet.depth / 2, -tablet.depth / 2, tablet.depth / 2),
    };
}

/**
 * @param {Quaternion} a
 * @param {Quaternion} b
 * @returns {Quaternion} */
function multiplyQuaternion(a, b) {
    return {
        x: a.x * b.w + a.w * b.x + a.y * b.z - a.z * b.y,
        y: a.y * b.w + a.w * b.y + a.z * b.x - a.x * b.z,
        z: a.z * b.w + a.w * b.z + a.x * b.y - a.y * b.x,
        w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    };
}

/** Rotation order is Y(azimuth) * X(lean) * Y(barrel).
 *
 * @param {PenPose} pose
 * @param {TabletGeometry} tablet
 *
 * @param {number} tipLength Millimetres from pen group's origin to its local tip.
 *
 * @returns {{tip: Point3, origin: Point3, axis: Point3, quaternion: Quaternion}}
 */
export function penTransform(pose, tablet, tipLength) {
    const alt = radians(pose.altitude), az = radians(pose.azimuth);
    const quaternion = penOrientation(pose.altitude, pose.azimuth, pose.barrel);
    const axis = { x: Math.sin(alt) * Math.sin(az), y: Math.cos(alt), z: Math.sin(alt) * Math.cos(az) };
    const tip = tabletToWorld(pose, tablet);
    const origin = { x: tip.x + tipLength * axis.x, y: tip.y + tipLength * axis.y, z: tip.z + tipLength * axis.z };
    return { tip, origin, axis, quaternion };
}

/**
 * @param {number} altitude Lean degrees.
 * @param {number} azimuth Degrees.
 *
 * @param {number} barrel Degrees.
 * @returns {Quaternion}
 */
export function penOrientation(altitude, azimuth, barrel) {
    const alt = radians(altitude), az = radians(azimuth), twist = radians(barrel);
    return multiplyQuaternion(
        { x: 0, y: Math.sin(az / 2), z: 0, w: Math.cos(az / 2) },
        multiplyQuaternion(
            { x: Math.sin(alt / 2), y: 0, z: 0, w: Math.cos(alt / 2) },
            { x: 0, y: Math.sin(twist / 2), z: 0, w: Math.cos(twist / 2) },
        ),
    );
}

/** Educational mapping, not a hardware driver model. No output clamping.
 *
 * @param {{x: number, z: number}} tip Surface projection in world millimetres.
 *
 * @param {{tiltX: number, tiltY: number}} tilt Signed planar degrees.
 *
 * @param {CursorMapping} mapping
 *
 * @param {{width: number, depth: number}} tablet
 *
 * @returns {{x: number, z: number}}
 */
export function mapCursor(tip, tilt, mapping, tablet) {
    const compensation = (angle, positive, negative) => {
        const gain = angle > 0 ? positive : negative;
        return gain > 0 ? angle * gain * mapping.tiltCompensationScale : 0;
    };
    const scale = mapping.scalingFactor > 0 ? mapping.scalingFactor : 0;
    let x = tip.x * scale + mapping.cursorOffsetX + compensation(tilt.tiltX,
        mapping.tiltCompensationPosTiltXValue, mapping.tiltCompensationNegTiltXValue);
    let z = tip.z * scale + mapping.cursorOffsetY + compensation(tilt.tiltY,
        mapping.tiltCompensationPosTiltYValue, mapping.tiltCompensationNegTiltYValue);
    const edgeShift = (position, dimension) => {
        const range = mapping.edgeAttractionRange;
        if (mapping.edgeAttraction === 0 || range <= 0) return 0;
        const low = position + dimension / 2, high = dimension / 2 - position;
        let shift = 0;
        if (low <= range && low >= 0) shift += mapping.edgeAttraction * (1 - low / range);
        if (high <= range && high >= 0) shift -= mapping.edgeAttraction * (1 - high / range);
        return shift;
    };
    x += edgeShift(x, tablet.width);
    z += edgeShift(z, tablet.depth);
    return { x, z };
}

/** Screen position in world millimetres. Out-of-bounds cursor values extrapolate.
 *
 * @param {{x: number, z: number}} cursor
 *
 * @param {{width: number, depth: number}} tablet
 *
 * @param {{width: number, height: number, centerY: number, frontZ: number}} screen
 *
 * @returns {Point3}
 */
export function mapMonitor(cursor, tablet, screen) {
    return {
        x: cursor.x / (tablet.width / 2) * (screen.width / 2),
        y: screen.centerY - cursor.z / (tablet.depth / 2) * (screen.height / 2),
        z: screen.frontZ,
    };
}

/**
 * @param {number} t Normalized progress in [0,1].
 * @returns {number} */
export function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Increasing-angle interpolation (not shortest path), wrapped to [0,360).
 *
 * @param {number} start Degrees.
 * @param {number} end Degrees.
 *
 * @param {number} t Normalized progress in [0,1].
 * @returns {number}
 */
export function interpolateAngle(start, end, t) {
    start = ((start % 360) + 360) % 360;
    end = ((end % 360) + 360) % 360;
    let diff = end - start;
    if (diff < 0) diff += 360;
    if (diff >= 360) diff %= 360;
    return ((start + diff * t) % 360 + 360) % 360;
}
