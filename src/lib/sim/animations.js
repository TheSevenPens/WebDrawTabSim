/**
 * Generic RAF animation loop helper.
 * @param {object} sim - Pen3DSim instance (for easing)
 * @param {number} duration - animation duration in ms
 * @param {function} onFrame - called each frame with (eased, progress)
 * @returns {function} cancel function
 */
export function runParameterAnimation(sim, duration, onFrame) {
    const startTime = performance.now();
    let frameId = null;
    let cancelled = false;
    const cancel = () => {
        cancelled = true;
        if (frameId !== null) cancelAnimationFrame(frameId);
        frameId = null;
        sim.animations?.delete(cancel);
    };
    sim.trackAnimation?.(cancel);

    const tick = (now) => {
        if (cancelled || sim.disposed) return;
        const progress = Math.min((now - startTime) / duration, 1);
        onFrame(sim.easeInOutCubic(progress), progress);
        if (!cancelled && progress < 1) {
            frameId = requestAnimationFrame(tick);
        } else {
            cancel();
        }
    };

    if (!cancelled) frameId = requestAnimationFrame(tick);
    return cancel;
}
