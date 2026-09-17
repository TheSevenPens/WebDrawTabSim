// Source adapters for an axis-aligned, unrotated input surface:
// client +X -> tablet +X; client +Y -> tablet +Y -> world +Z.
// These functions do not read browser globals or change teaching slider limits.
/** @typedef {{altitude: number, azimuth: number|null}} Orientation */
/** @typedef {{width: number, depth: number}} TabletSize */
/** @param {number} value @param {string} name */
function finite(value, name) {
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
    return value;
}
/** @param {number} value @param {number} low @param {number} high @param {string} name */
function range(value, low, high, name) {
    finite(value, name);
    if (value < low || value > high) throw new RangeError(`${name} must be in [${low}, ${high}]`);
    return value;
}
/** @param {number} value */
const wrap = value => ((value % 360) + 360) % 360;
/** @param {number|null|undefined} a @param {number|null|undefined} b */
function missingPair(a, b) {
    if (a == null && b == null) return true;
    if (a == null || b == null) throw new RangeError('Both coordinates or angles are required');
    return false;
}

/** Physical unit conversion; deliberately unrelated to the artistic SCALE=24.
 * @param {number} inches
 * @returns {number} Millimetres.
 */
export function inchesToMillimetres(inches) {
    return finite(finite(inches, 'inches') * 25.4, 'millimetres');
}

/** Pointer Events spherical radians -> simulator degrees of lean and azimuth.
 * Pass missing fields for unavailable hardware measurements, not browser defaults.
 * @param {{altitudeAngle?: number|null, azimuthAngle?: number|null}} sample
 * @returns {Orientation|null} Azimuth is null when upright; null result means unavailable.
 */
export function pointerAnglesToOrientation(sample) {
    const { altitudeAngle, azimuthAngle } = sample;
    if (missingPair(altitudeAngle, azimuthAngle)) return null;
    const altitude = range(/** @type {number} */ (altitudeAngle), 0, Math.PI / 2, 'altitudeAngle');
    const azimuth = range(/** @type {number} */ (azimuthAngle), 0, 2 * Math.PI, 'azimuthAngle');
    return {
        altitude: 90 - altitude * 180 / Math.PI,
        azimuth: altitude === Math.PI / 2 ? null : wrap(90 - azimuth * 180 / Math.PI),
    };
}

/** Pointer Events planar tilt degrees -> simulator orientation.
 * At horizontal ambiguous tilt pairs, preserve the unknown direction as null
 * instead of treating the specification's fallback azimuth as a measurement.
 * @param {{tiltX?: number|null, tiltY?: number|null}} sample
 * @returns {Orientation|null}
 */
export function pointerTiltToOrientation(sample) {
    if (missingPair(sample.tiltX, sample.tiltY)) return null;
    const x = range(/** @type {number} */ (sample.tiltX), -90, 90, 'tiltX');
    const y = range(/** @type {number} */ (sample.tiltY), -90, 90, 'tiltY');
    if (x === 0 && y === 0) return { altitude: 0, azimuth: null };
    if (Math.abs(x) === 90 || Math.abs(y) === 90) {
        return { altitude: 90, azimuth: y === 0 ? (x > 0 ? 90 : 270) :
            x === 0 ? (y > 0 ? 0 : 180) : null };
    }
    const tx = Math.tan(x * Math.PI / 180), ty = Math.tan(y * Math.PI / 180);
    return { altitude: Math.atan(Math.hypot(tx, ty)) * 180 / Math.PI,
        azimuth: wrap(Math.atan2(tx, ty) * 180 / Math.PI) };
}

/** Clockwise Pointer Events twist -> right-hand local +Y barrel rotation.
 * Explicit calibration aligns a device's arbitrary zero to the model marker.
 * @param {number|null|undefined} twist Degrees; missing is not zero.
 * @param {number} zeroDegrees Simulator barrel angle corresponding to device twist zero.
 * @returns {number|null}
 */
export function pointerTwistToBarrel(twist, zeroDegrees) {
    finite(zeroDegrees, 'zeroDegrees');
    if (twist == null) return null;
    return wrap(zeroDegrees - range(twist, 0, 359, 'twist'));
}

/** Axis-aligned client pixels -> active-area model millimetres. No output clamp.
 * Use the captured input surface's rectangle, never a perspective 3D canvas.
 * @param {{clientX?: number|null, clientY?: number|null}} sample
 * @param {{left: number, top: number, width: number, height: number}} rect CSS pixels.
 * @param {TabletSize} tablet Model millimetres.
 * @returns {{tabletX: number, tabletY: number, inside: boolean}|null}
 */
export function clientToTablet(sample, rect, tablet) {
    finite(rect.left, 'left'); finite(rect.top, 'top');
    for (const [name, value] of /** @type {[string, number][]} */ ([
        ['width', rect.width], ['height', rect.height], ['tablet.width', tablet.width], ['tablet.depth', tablet.depth],
    ])) {
        if (finite(value, name) <= 0) throw new RangeError(`${name} must be positive`);
    }
    if (missingPair(sample.clientX, sample.clientY)) return null;
    const u = (finite(/** @type {number} */ (sample.clientX), 'clientX') - rect.left) / rect.width;
    const v = (finite(/** @type {number} */ (sample.clientY), 'clientY') - rect.top) / rect.height;
    return { tabletX: finite(u * tablet.width, 'tabletX'), tabletY: finite(v * tablet.depth, 'tabletY'),
        inside: u >= 0 && u <= 1 && v >= 0 && v <= 1 };
}
