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

    const tick = (now) => {
        const progress = Math.min((now - startTime) / duration, 1);
        onFrame(sim.easeInOutCubic(progress), progress);
        if (progress < 1) {
            frameId = requestAnimationFrame(tick);
        } else {
            frameId = null;
        }
    };

    frameId = requestAnimationFrame(tick);
    return () => { if (frameId !== null) { cancelAnimationFrame(frameId); frameId = null; } };
}
