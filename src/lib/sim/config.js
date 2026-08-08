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
    /** Tablet checkerboard overlay (light tablet body) */
    tabletCheckLight1: 0xe4d8f0,
    tabletCheckLight2: 0xc8b4dc,
    /** Tablet checkerboard overlay (dark tablet body) */
    tabletCheckDark1: 0x5c4a6e,
    tabletCheckDark2: 0x3a2c48,
};

/** Desk slab + legs (world mm). Monitor and tablet sit on top of this. */
export const DESK = {
    height: 1 * SCALE,
    width: 60 * SCALE,
    depth: 30 * SCALE,
    z: -6.5 * SCALE,
    legHeight: 28 * SCALE,
    legSize: 1.5 * SCALE,
    /** Legs are inset this far from each desk edge */
    legInset: 2 * SCALE,
};

/** Studio floor, walls, and baseboards. */
export const ROOM = {
    floorY: -29 * SCALE,
    width: 200 * SCALE,
    depth: 160 * SCALE,
    /** Fraction of `depth` the room grows toward the camera (+Z); the back wall stays fixed */
    depthExtraTowardCamera: 0.5,
    height: 90 * SCALE,
    baseboardHeight: 5 * SCALE,
    baseboardDepth: 0.75 * SCALE,
};

/** Scene lighting rig: soft ambient + warm key (shadow-casting) + cool fill + wall bounce + point accent. */
export const LIGHTING = {
    ambient: { color: 0xffffff, intensity: 0.88 },
    key: {
        color: 0xfff5eb,
        intensity: 0.75,
        position: [8 * SCALE, 28 * SCALE, 12 * SCALE],
        shadow: {
            mapSize: 4096,
            /** Half-width/height of the (square) orthographic shadow frustum — wide enough to cover the whole desk incl. legs */
            frustum: 48 * SCALE,
            near: 0.1 * SCALE,
            far: 100 * SCALE,
            bias: -0.0002,   // normalized depth — not scaled
        },
    },
    fill: { color: 0xe8f0ff, intensity: 0.45, position: [-6 * SCALE, 12 * SCALE, 22 * SCALE] },
    wallFill: { color: 0xffffff, intensity: 0.3, position: [0, 20 * SCALE, -30 * SCALE] },
    /** Point light has distance falloff (decay), so its intensity is pre-compensated by
     *  SCALE² in pen-scene.js to counteract scaling its position by SCALE. */
    point: { color: 0xffffff, intensity: 0.2, position: [-12 * SCALE, 14 * SCALE, -8 * SCALE] },
};

/** External desk monitor: body/bezel/neck/base dimensions and screen placement. */
export const MONITOR = {
    diagonal: 21 * SCALE,   // 16:9 aspect; screenWidth/Height derived in pen-monitor.js
    bezelSize: 0.4 * SCALE,
    bodyDepth: 0.8 * SCALE,
    neckHeight: 5.0 * SCALE,
    neckWidth: 1.2 * SCALE,
    neckDepth: 0.5 * SCALE,
    baseHeight: 0.4 * SCALE,
    baseWidth: 7.0 * SCALE,
    baseDepth: 4.0 * SCALE,
    z: -12 * SCALE,
    screenThickness: 0.05 * SCALE,
    /** Gap between the body's front face and the screen plane */
    screenOffset: 0.025 * SCALE,
    /** Cursor Z offset in front of the screen plane (avoids z-fighting) */
    cursorOffset: 0.08 * SCALE,
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
    tipHeight: 0.52083 * SCALE,  // nib tip at local y = -tipHeight (contact point); 0.5 mm longer → ≈12.5 mm
    barrelHeight: 4 * SCALE,     // pen top sits at local y = +barrelHeight (eraser apex)
    latheSegments: 48,           // radial resolution of the revolved pen parts
};

// Colors for the individual pen parts — three pieces revolved from the
// hand-drawn wacpen-half.svg profile: eraser tail, graphite body, dark nib.
export const PEN_COLORS = {
    eraser: 0x676c73,  // tail dome (slightly lighter graphite)
    body:   0xaa33bb,  // darker check of the barrel checkerboard (used when checkerboard is off)
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
    // Drawing nib profiles (bottom → top). Both share the tip apex at -0.52083
    // so the contact point matches PEN_MESH.tipHeight regardless of shape.
    //   rounded — original bullet-nose tip (radius grows fast off the apex)
    //   sharp   — slender point (radius grows slowly off the apex)
    nibRounded: [
        [0.0000, -0.52083], [0.0094, -0.51833], [0.0143, -0.51173], [0.0151, -0.4540],
    ],
    nibSharp: [
        [0.0000, -0.52083], [0.0094, -0.4975], [0.0143, -0.4909], [0.0151, -0.4540],
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

/** Individual-axis sweep ends; kept equal to DEMO_POSE so all animations agree. */
export const ANIMATION = {
    durationMs: 8000,
    startDelayMs: 500,
    altitudeEnd: DEMO_POSE.tiltAltitude,
    azimuthEnd: DEMO_POSE.tiltAzimuth,
    barrelEnd: DEMO_POSE.barrelRotation,
};

export const EXPORT = {
    hd: { width: 1920, height: 1080 },
    uhd: { width: 3840, height: 2160 },
    supersample: 2,
};

// Initial camera orbit around the origin (matches the Az/El/Dist readout).
export const CAMERA_INITIAL = {
    azimuthDeg: 0,
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
