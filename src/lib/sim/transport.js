import { evaluateClip } from './timeline.js';

export function createTransport({ onFrame, onChange = () => {}, now = () => performance.now(),
    requestFrame = callback => requestAnimationFrame(callback), cancelFrame = id => cancelAnimationFrame(id) }) {
    let clip = null, frame = null, generation = 0, disposed = false;
    let time = 0, inPoint = 0, outPoint = 0, speed = 1, loop = false, playing = false, index = null;
    let anchorClock = 0, anchorTime = 0;
    const snapshot = () => ({ loaded: !!clip, time, duration: clip?.duration ?? 0, inPoint, outPoint, speed, loop, playing, index });
    const notify = () => onChange(snapshot());
    function invalidate() {
        generation++;
        if (frame !== null) cancelFrame(frame);
        frame = null; playing = false;
    }
    function render(exactIndex = null) {
        if (!clip || disposed) return;
        const result = exactIndex === null ? evaluateClip(clip, time) :
            { time, index: exactIndex, sampleId: clip.samples[exactIndex].id, values: { ...clip.samples[exactIndex].values } };
        index = result.index;
        try { onFrame(result); } catch (error) { invalidate(); notify(); throw error; }
        notify();
    }
    function advance(clock) {
        time = Math.max(inPoint, anchorTime + Math.max(0, clock - anchorClock) * speed);
        if (time >= outPoint) {
            if (loop) time = inPoint + (time - inPoint) % (outPoint - inPoint);
            else { time = outPoint; playing = false; }
        }
        render();
    }
    function schedule() {
        const token = generation;
        frame = requestFrame(clock => {
            if (token !== generation || !playing || disposed) return;
            frame = null;
            advance(clock);
            if (token === generation && playing && !disposed) schedule();
        });
    }
    const api = {
        snapshot,
        load(nextClip) {
            if (disposed) return;
            invalidate(); clip = nextClip; time = inPoint = 0; outPoint = clip.duration; index = null;
            render();
        },
        play() {
            if (!clip || playing || disposed) return;
            const token = generation;
            if (time >= outPoint) { time = inPoint; render(); }
            if (!clip || disposed || token !== generation) return;
            playing = true; anchorClock = now(); anchorTime = time; notify();
            if (playing && !disposed) schedule();
        },
        pause() {
            const wasPlaying = playing;
            invalidate();
            if (wasPlaying && clip && !disposed) advance(now());
            notify();
        },
        seek(value) {
            if (!Number.isFinite(value)) throw new RangeError('Time must be finite');
            if (!clip || disposed) return;
            invalidate(); time = Math.max(inPoint, Math.min(outPoint, value)); render();
        },
        stop() { api.seek(inPoint); },
        step(direction) {
            if (direction !== 1 && direction !== -1) throw new RangeError('Step must be +1 or -1');
            if (!clip || disposed) return;
            invalidate();
            let candidate = index === null ? (direction > 0 ? clip.samples.findIndex(s => s.time > time) : clip.samples.findLastIndex(s => s.time < time)) : index + direction;
            if (candidate >= 0 && candidate < clip.samples.length && clip.samples[candidate].time >= inPoint && clip.samples[candidate].time <= outPoint) {
                time = clip.samples[candidate].time; render(candidate);
            } else notify();
        },
        setSpeed(value) {
            if (!Number.isFinite(value) || value <= 0 || value > 8) throw new RangeError('Speed must be in (0,8]');
            const resume = playing;
            api.pause(); speed = value; notify();
            if (resume && (time < outPoint || loop)) api.play();
        },
        setLoop(value) { loop = !!value; notify(); },
        setRange(start, end) {
            if (!clip || disposed) return;
            if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start >= end || end > clip.duration) throw new RangeError('Invalid in/out range');
            invalidate(); inPoint = start; outPoint = end; api.seek(time);
        },
        clear() { invalidate(); clip = null; time = inPoint = outPoint = 0; index = null; notify(); },
        dispose() { disposed = true; api.clear(); },
    };
    return api;
}
