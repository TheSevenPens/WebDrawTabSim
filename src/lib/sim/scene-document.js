import { DEFAULT_PEN, PEN_RANGES, POINTER_DEFAULTS, CAMERA_INITIAL, TABLET } from './config.js';

export const SCENE_VERSION = 1;
export const MAX_SCENE_BYTES = 128 * 1024;

/** @typedef {ReturnType<typeof createSceneDocument>} SceneDocument */

export function createSceneDocument() {
    const elevation = CAMERA_INITIAL.elevationDeg * Math.PI / 180;
    const azimuth = CAMERA_INITIAL.azimuthDeg * Math.PI / 180;
    const radius = CAMERA_INITIAL.distance;
    return {
        version: SCENE_VERSION,
        pose: { ...DEFAULT_PEN },
        mapping: {
            cursorOffsetX: 0, cursorOffsetY: 0,
            compPosTiltX: 0, compNegTiltX: 0, compPosTiltY: 0, compNegTiltY: 0,
            scalingFactor: 1, edgeAttraction: 0,
            edgeAttractionRange: POINTER_DEFAULTS.edgeAttractionRange,
            mouseSensitivity: POINTER_DEFAULTS.mouseSensitivity,
        },
        annotations: {
            showAltitude: false, showAzimuth: false, showTiltX: false, showTiltY: false,
            showBarrel: false, showPenTopLine: true, showPenAxisLine: true, showPenTipLine: true,
        },
        presentation: {
            showAxis: false, cursorMode: 'mouse', showPenShadow: true,
            showCheckerboard: false, showGrid: true, showMonitor: true,
            axonometric: false, penDisplayMode: false, darkTablet: false,
            sharpNib: false, penBodyFormat: 'checkerboard', aspectRatio: '16 / 9',
        },
        camera: {
            position: { x: radius * Math.cos(elevation) * Math.sin(azimuth),
                y: TABLET.thickness / 2 + radius * Math.sin(elevation),
                z: radius * Math.cos(elevation) * Math.cos(azimuth) },
            target: { x: 0, y: TABLET.thickness / 2, z: 0 },
            perspectiveZoom: 1, orthographicZoom: 1,
        },
    };
}

/** @param {unknown} value @param {string[]} keys @param {string} path
 * @returns {asserts value is Record<string, any>} */
function record(value, keys, path) {
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) {
        throw new Error(`${path}: expected exactly ${keys.join(', ')}`);
    }
}
/** @param {unknown} value @param {number} min @param {number} max @param {string} path */
function number(value, min, max, path) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`${path}: expected a number from ${min} to ${max}`);
    return value;
}

// No coercion or silent truncation at the document boundary. Return a detached
// copy so callers cannot retain references into accepted state.
/** @param {unknown} input @returns {SceneDocument} */
export function validateSceneDocument(input) {
    const defaults = createSceneDocument();
    record(input, Object.keys(defaults), 'Scene');
    if (input.version !== SCENE_VERSION) throw new Error(`Unsupported scene version: ${input.version}`);
    /** @type {Record<string, any>} */
    const result = { version: SCENE_VERSION };
    /** @type {Array<'pose'|'mapping'|'annotations'|'presentation'>} */
    const groups = ['pose', 'mapping', 'annotations', 'presentation'];
    for (const group of groups) {
        record(input[group], Object.keys(defaults[group]), group);
        result[group] = {};
        for (const [key, initial] of Object.entries(defaults[group])) {
            const value = input[group][key];
            if (typeof initial === 'number') {
                const range = PEN_RANGES[/** @type {keyof typeof PEN_RANGES} */ (key.startsWith('comp') ? 'tiltCompensation' : key)];
                number(value, range.min, range.max, `${group}.${key}`);
            } else if (typeof initial === 'boolean') {
                if (typeof value !== 'boolean') throw new Error(`${group}.${key}: expected true or false`);
            } else {
                const options = /** @type {Record<string, string[]>} */ ({ cursorMode: ['mouse', 'crosshairs', 'none'],
                    penBodyFormat: ['checkerboard', 'solid'], aspectRatio: ['16 / 9', '1 / 1', '2 / 3'] })[key];
                if (!options.includes(value)) throw new Error(`${group}.${key}: unsupported value`);
            }
            result[group][key] = value;
        }
    }
    record(input.camera, Object.keys(defaults.camera), 'camera');
    result.camera = {};
    for (const key of ['position', 'target']) {
        record(input.camera[key], ['x', 'y', 'z'], `camera.${key}`);
        result.camera[key] = Object.fromEntries(['x', 'y', 'z'].map(axis =>
            [axis, number(input.camera[key][axis], -1e6, 1e6, `camera.${key}.${axis}`)]));
    }
    const { position, target } = result.camera;
    const distance = Math.hypot(position.x - target.x, position.y - target.y, position.z - target.z);
    if (target.y < TABLET.thickness / 2 - 1e-6 || position.y < target.y - 1e-6 || distance < 20 - 1e-6 || distance > 2400 + 1e-6) {
        throw new Error('camera: expected an above-surface view at a distance of 20–2400 mm');
    }
    for (const key of ['perspectiveZoom', 'orthographicZoom']) {
        result.camera[key] = number(input.camera[key], 0.05, 100, `camera.${key}`);
    }
    return /** @type {SceneDocument} */ (result);
}

/** @param {string} text */
export function parseSceneDocument(text) {
    if (typeof text !== 'string' || text.length > MAX_SCENE_BYTES) throw new Error('Scene file is too large (maximum 128 KiB)');
    return validateSceneDocument(JSON.parse(text));
}

/** @param {SceneDocument} scene */
export function serializeSceneDocument(scene) {
    return JSON.stringify(validateSceneDocument(scene), null, 2) + '\n';
}

/** @template T @param {T} value @returns {T} */
const clone = value => JSON.parse(JSON.stringify(value));

/** @param {{ apply: (next: SceneDocument, previous: SceneDocument | null) => void,
 * onChange?: (next: SceneDocument) => void }} callbacks */
export function createSceneController({ apply, onChange = () => {} }) {
    let state = validateSceneDocument(createSceneDocument());
    return {
        snapshot: () => clone(state),
        /** @param {unknown} candidate @param {{render?: boolean, force?: boolean}} options */
        replace(candidate, { render = true, force = false } = {}) {
            const next = validateSceneDocument(candidate);
            if (render) apply(clone(next), force ? null : clone(state));
            state = next;
            onChange(clone(state));
            return clone(state);
        },
    };
}
