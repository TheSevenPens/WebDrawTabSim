/**
 * Central defaults and shared constants for Pen3DSim.
 * All lengths are in millimetres (1 world unit = 1 mm).
 *
 * SCALE converts the original inch-based design values to the mm world so the
 * scene keeps its proportions. The tablet active area (16×9 → 384×216) and every
 * other distance are scaled by it; a few values (e.g. the bezel) are absolute mm.
 */
export const SCALE = 24;

export const TABLET = {
    width: 16 * SCALE,   // active-area width  = 384 mm
    depth: 9 * SCALE,    // active-area depth  = 216 mm
    thickness: 0.22 * SCALE,
    bodyMargin: 25,      // bezel around the active area = 25 mm
};

/** Bright studio palette for the 3D environment (not the control panel). */
export const SCENE = {
    background: 0xf0eee8,
    wall: 0xf7f6f2,
    floor: 0xd8d2c6,
    /** Brighter than wall paint — soft trim at the floor line */
    baseboard: 0xffffff,
    desk: 0xd4b896,
    deskGrainDark: 0xc9a87c,
    tablet: 0xd4c4e4,
    tabletBase: 0xd4c4e4,
    /** Dark lavender variant of the tablet body */
    tabletDark: 0x4a3a58,
    /** Digitizer grid on light tablet — deeper lavender for readable contrast */
    grid: 0x8f6fa8,
    /** Digitizer grid on dark tablet — slightly lighter lavender */
    gridDark: 0x6e5a82,
    monitorBezel: 0x2a2a2e,
};

export const DEFAULT_PEN = {
    distance: 0,
    tiltAltitude: 0,
    tiltAzimuth: 0,
    barrelRotation: 0,
    tabletX: 8 * SCALE,    // centre of the active area (192 mm)
    tabletY: 4.5 * SCALE,  // centre of the active area (108 mm)
};

/** Shared end pose for Demo jump and Anim Rot all. */
export const DEMO_POSE = {
    distance: 0,
    tiltAltitude: 45,
    tiltAzimuth: 242,
    barrelRotation: 318,
    tabletX: 8 * SCALE,
    tabletY: 4.5 * SCALE,
};

export const PEN_RANGES = {
    distance:       { min: 0, max: 1 * SCALE },
    tabletX:        { min: 0, max: TABLET.width },
    tabletY:        { min: 0, max: TABLET.depth },
    tiltAltitude:   { min: 0, max: 60 },
    tiltAzimuth:    { min: 0, max: 359 },
    barrelRotation: { min: 0, max: 359 },
    cursorOffsetX:  { min: -5 * SCALE, max: 5 * SCALE },
    cursorOffsetY:  { min: -5 * SCALE, max: 5 * SCALE },
    tiltCompensation: { min: 0, max: 1 },
    scalingFactor:  { min: 0, max: 2 },
    edgeAttraction: { min: -1, max: 1 },
    edgeAttractionRange: { min: 0, max: 5 * SCALE },
    mouseSensitivity: { min: 0.001 * SCALE, max: 0.1 * SCALE },
};

export const POINTER_DEFAULTS = {
    cursorOffsetX: 0,
    cursorOffsetY: 0,
    tiltCompensationPosTiltX: 0,
    tiltCompensationNegTiltX: 0,
    tiltCompensationPosTiltY: 0,
    tiltCompensationNegTiltY: 0,
    scalingFactor: 1,
    edgeAttraction: 0,
    edgeAttractionRange: 1 * SCALE,
    /** mm of cursor shift per degree of tilt when compensation is 1.0 */
    tiltCompensationScale: 0.01 * SCALE,
    /** Screen pixels → tablet mm for spacebar+drag */
    mouseSensitivity: 0.01 * SCALE,
};

export const ANNOTATION = {
    arcRadius: 1.5 * SCALE,
    barrelArcRadius: 1.5 * SCALE,
    tiltArcRadius: 2.0 * SCALE,
    tubeRadius: 0.02 * SCALE,
    azimuthColor: 0x77dd33,
    tiltAltitudeColor: 0xee33cc,
    tiltXColor: 0x88ccff,
    tiltYColor: 0xff88cc,
    barrelColor: 0xff8800,
};

export const PEN_MESH = {
    tipHeight: 0.5 * SCALE,      // nib tip sits at local y = -tipHeight (pen contact point)
    tipRadius: 0.1 * SCALE,      // legacy; retained for reference
    barrelHeight: 4 * SCALE,     // pen top sits at local y = +barrelHeight (eraser apex)
    barrelRadius: 0.15 * SCALE,  // legacy; retained for reference
    latheSegments: 48,           // radial resolution of the revolved pen parts
};

// Colors for the individual pen parts — three pieces revolved from the
// hand-drawn wacpen-half.svg profile: eraser tail, graphite body, dark nib.
export const PEN_COLORS = {
    eraser: 0x676c73,  // tail dome (slightly lighter graphite)
    body:   0x565b62,  // matte graphite barrel (used when checkerboard is off)
    nib:    0x141518,  // dark drawing nib tip
};

// Checkerboard wrap on the body — helps the viewer see barrel rotation.
// Repeat is in tiles; the source texture is 2×2 checks, so [cols, rows] tiles
// give 2·cols checks around the circumference and 2·rows up the length.
export const PEN_CHECKER = {
    repeatAround: 4,   // → 8 checks around the barrel
    repeatLength: 13,  // → 26 checks along the barrel (arc-length even)
};

// Silhouette profiles for the revolved (LatheGeometry) pen parts, generated
// from wacpen-half.svg (see scratchpad/parse-svg-pen.mjs). Each entry is
// [radius, y] in the original design units; they are multiplied by SCALE when
// the lathe is built (latheFromProfile), matching the scaled PEN_MESH anchors.
// Ordered bottom → top; a radius of 0 caps that end.
// All parts share the pen's local +Y axis with the nib at the bottom. Adjacent
// pieces share their boundary ring (nib↔body at r0.0151, body↔eraser at
// r0.0935). See PEN_MESH for the tip/top anchors the pose math relies on.
export const PEN_PROFILE = {
    // Tiny rounded drawing nib protruding from the body's front face.
    nib: [
        [0.0000, -0.5000], [0.0094, -0.4975], [0.0143, -0.4909], [0.0151, -0.4540],
    ],
    // Main body: flat nib-cone face → tapered front → widest grip → long taper
    // → shoulder lip under the eraser.
    body: [
        [0.0151, -0.4540], [0.0441, -0.4540], [0.1776, -0.0533], [0.2046, 0.0462],
        [0.2017, 0.0777], [0.1853, 0.1568], [0.1794, 0.2328], [0.1559, 2.1313],
        [0.1183, 3.8136], [0.0935, 3.8136],
    ],
    // Rounded tail eraser dome, apex at y = barrelHeight.
    eraser: [
        [0.0935, 3.8136], [0.0846, 3.9310], [0.0743, 3.9748], [0.0635, 3.9873],
        [0.0493, 3.9947], [0.0000, 4.0000],
    ],
};

export const CURSOR = {
    tabletSize: 0.6 * SCALE,
    monitorSize: 0.8 * SCALE,
    rotation: 180,
    tipRotationY: 90,
};

export const ANIMATION = {
    durationMs: 8000,
    startDelayMs: 500,
    altitudeEnd: 45,
    azimuthEnd: 252,
    barrelEnd: 316,
};

export const EXPORT = {
    hd: { width: 1920, height: 1080 },
    uhd: { width: 3840, height: 2160 },
    supersample: 2,
};

// Initial camera orbit around the origin (matches the Az/El/Dist readout).
export const CAMERA_INITIAL = {
    azimuthDeg: 310,
    elevationDeg: 30,
    distance: 30 * SCALE,   // 720 mm
};

/**
 * Clamp to [min, max]. Non-finite values fall back to `fallback` (default: min).
 */
export function clampValue(value, min, max, fallback = min) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
}
