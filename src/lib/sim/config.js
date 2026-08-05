/**
 * Central defaults and shared constants for Pen3DSim.
 * All lengths are in inches unless noted.
 */

export const TABLET = {
    width: 16,
    depth: 9,
    thickness: 0.35,
    bodyMargin: 1.5,
};

/** Bright studio palette for the 3D environment (not the control panel). */
export const SCENE = {
    background: 0xf0eee8,
    wall: 0xf7f6f2,
    floor: 0xe8e4dc,
    desk: 0xd4b896,
    deskGrainDark: 0xc9a87c,
    tablet: 0xf3d4d8,
    tabletBase: 0xf3d4d8,
    grid: 0x9a6a75,
    monitorBezel: 0x2a2a2e,
};

export const DEFAULT_PEN = {
    distance: 0,
    tiltAltitude: 0,
    tiltAzimuth: 0,
    barrelRotation: 0,
    tabletX: 8,
    tabletY: 4.5,
};

/** Shared end pose for Demo jump and Anim Rot all. */
export const DEMO_POSE = {
    distance: 0,
    tiltAltitude: 45,
    tiltAzimuth: 242,
    barrelRotation: 318,
    tabletX: 8,
    tabletY: 4.5,
};

export const PEN_RANGES = {
    distance:       { min: 0, max: 1 },
    tabletX:        { min: 0, max: TABLET.width },
    tabletY:        { min: 0, max: TABLET.depth },
    tiltAltitude:   { min: 0, max: 60 },
    tiltAzimuth:    { min: 0, max: 359 },
    barrelRotation: { min: 0, max: 359 },
    cursorOffsetX:  { min: -5, max: 5 },
    cursorOffsetY:  { min: -5, max: 5 },
    tiltCompensation: { min: 0, max: 1 },
    scalingFactor:  { min: 0, max: 2 },
    edgeAttraction: { min: -1, max: 1 },
    edgeAttractionRange: { min: 0, max: 5 },
    mouseSensitivity: { min: 0.001, max: 0.1 },
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
    edgeAttractionRange: 1,
    /** Inches of cursor shift per degree of tilt when compensation is 1.0 */
    tiltCompensationScale: 0.01,
    /** Screen pixels → tablet inches for spacebar+drag */
    mouseSensitivity: 0.01,
};

export const ANNOTATION = {
    arcRadius: 1.5,
    barrelArcRadius: 1.5,
    tiltArcRadius: 2.0,
    tubeRadius: 0.02,
    azimuthColor: 0x77dd33,
    tiltAltitudeColor: 0xee33cc,
    tiltXColor: 0x88ccff,
    tiltYColor: 0xff88cc,
    barrelColor: 0xff8800,
};

export const PEN_MESH = {
    tipHeight: 0.5,
    tipRadius: 0.1,
    barrelHeight: 4,
    barrelRadius: 0.15,
};

export const CURSOR = {
    tabletSize: 0.6,
    monitorSize: 0.8,
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

/**
 * Clamp to [min, max]. Non-finite values fall back to `fallback` (default: min).
 */
export function clampValue(value, min, max, fallback = min) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
}
