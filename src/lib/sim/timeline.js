import { easeInOutCubic, interpolateAngle } from './math.js';

// Complete flat snapshots support pose, camera numbers, and discrete annotation
// flags. They are deliberately independent of any renderer or application state.
export function createClip(samples, { channels = {}, easing = 'linear', maxGapMs = Infinity } = {}) {
    if (!Array.isArray(samples) || samples.length < 2) throw new RangeError('A clip needs at least two samples');
    if (!['linear', 'cubic'].includes(easing) || typeof maxGapMs !== 'number' || !(maxGapMs > 0)) throw new RangeError('Invalid interpolation options');
    const keys = Object.keys(samples[0].values);
    if (!keys.length) throw new RangeError('Samples must contain values');
    for (const [key, mode] of Object.entries(channels)) {
        if (!keys.includes(key) || !['linear', 'angle', 'hold'].includes(mode)) throw new RangeError('Invalid channel');
    }
    const ids = new Set();
    let previous = -Infinity;
    const copied = samples.map(sample => {
        if (!Number.isFinite(sample.time) || sample.time < 0 || sample.time < previous) throw new RangeError('Sample times must be finite and ordered');
        if (typeof sample.id !== 'string' || ids.has(sample.id)) throw new RangeError('Sample IDs must be unique strings');
        ids.add(sample.id); previous = sample.time;
        if (Object.keys(sample.values).length !== keys.length) throw new RangeError('Samples must have identical channels');
        const values = Object.fromEntries(keys.map(key => {
            const value = sample.values[key], initial = samples[0].values[key];
            if (typeof value !== typeof initial || !['number', 'boolean', 'string'].includes(typeof value) ||
                (typeof value === 'number' && !Number.isFinite(value))) throw new RangeError(`Invalid value for ${key}`);
            if (channels[key] && channels[key] !== 'hold' && typeof value !== 'number') throw new RangeError('Interpolated channels must be numeric');
            return [key, value];
        }));
        return Object.freeze({ id: sample.id, time: sample.time, values: Object.freeze(values) });
    });
    if (copied[0].time !== 0 || copied.at(-1).time <= 0) throw new RangeError('A clip must start at zero and have positive duration');
    return Object.freeze({ samples: Object.freeze(copied), channels: Object.freeze({ ...channels }),
        easing, maxGapMs, duration: copied.at(-1).time });
}

export function evaluateClip(clip, time) {
    if (!Number.isFinite(time)) throw new RangeError('Time must be finite');
    time = Math.max(0, Math.min(clip.duration, time));
    // Last duplicate at a timestamp wins during seeking. Stepping uses the
    // original index instead, so even duplicate-time events remain inspectable.
    let low = 0, high = clip.samples.length;
    while (low < high) {
        const middle = (low + high) >>> 1;
        if (clip.samples[middle].time <= time) low = middle + 1;
        else high = middle;
    }
    const index = low - 1, left = clip.samples[index], right = clip.samples[index + 1];
    if (time === left.time || !right) return { time, index, sampleId: left.id, values: { ...left.values } };
    const fraction = (time - left.time) / (right.time - left.time);
    const t = clip.easing === 'cubic' ? easeInOutCubic(fraction) : fraction;
    const values = Object.fromEntries(Object.keys(left.values).map(key => {
        const a = left.values[key], b = right.values[key];
        const mode = clip.channels[key];
        const hold = mode === 'hold' || typeof a !== 'number' || right.time - left.time > clip.maxGapMs;
        return [key, hold ? a : mode === 'angle' ? interpolateAngle(a, b, t) : a + (b - a) * t];
    }));
    return { time, index: null, sampleId: null, values };
}
