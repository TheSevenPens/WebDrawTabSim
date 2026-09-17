/** One owner for delayed starts and active animations. */
export function createPlaybackController({ setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
    let timer = null;
    let cancelAnimation = null;
    let generation = 0;
    let disposed = false;

    function cancel() {
        generation++;
        if (timer !== null) clearTimer(timer);
        timer = null;
        const stop = cancelAnimation;
        cancelAnimation = null;
        stop?.();
    }

    return {
        cancel,
        start(startAnimation, delay = 0) {
            cancel();
            if (disposed) return;
            const current = generation;
            timer = setTimer(() => {
                if (disposed || current !== generation) return;
                timer = null;
                const stop = startAnimation();
                // Starting can synchronously trigger an edit or disposal.
                if (disposed || current !== generation) stop?.();
                else cancelAnimation = stop;
            }, delay);
        },
        dispose() {
            disposed = true;
            cancel();
        },
    };
}
