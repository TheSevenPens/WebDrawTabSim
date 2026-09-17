import { validateSceneDocument } from './scene-document.js';

const setters = {
    mapping: {
        cursorOffsetX: 'setCursorOffsetX', cursorOffsetY: 'setCursorOffsetY',
        compPosTiltX: 'setTiltCompensationPosTiltXValue', compNegTiltX: 'setTiltCompensationNegTiltXValue',
        compPosTiltY: 'setTiltCompensationPosTiltYValue', compNegTiltY: 'setTiltCompensationNegTiltYValue',
        scalingFactor: 'setScalingFactor', edgeAttraction: 'setEdgeAttraction',
        edgeAttractionRange: 'setEdgeAttractionRange', mouseSensitivity: 'setMouseSensitivity',
    },
    annotations: {
        showAltitude: 'setAltitudeAnnotationsVisible', showAzimuth: 'setAzimuthAnnotationsVisible',
        showTiltX: 'setTiltXAnnotationsVisible', showTiltY: 'setTiltYAnnotationsVisible',
        showBarrel: 'setBarrelAnnotationsVisible', showPenTopLine: 'setPenTopLineVisible',
        showPenAxisLine: 'setPenAxisLineVisible', showPenTipLine: 'setPenTipLineVisible',
    },
    presentation: {
        showAxis: 'setAxisMarkersVisible', cursorMode: 'setCursorMode', showPenShadow: 'setPenShadowVisible',
        darkTablet: 'setDarkTablet', showCheckerboard: 'setTabletCheckerboardVisible',
        showGrid: 'setGridVisible', showMonitor: 'setMonitorVisible',
        axonometric: 'setAxonometricView', penDisplayMode: 'setPenDisplayMode', penBodyFormat: 'setPenBodyFormat',
    },
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Renderer is a projection of the accepted document. Diffs avoid rebuilding
// materials on every pose frame; the batch coalesces all pen refreshes.
export function applySceneDocument(sim, candidate, previous = null) {
    const next = validateSceneDocument(candidate);
    sim.batchSceneUpdate(() => {
        for (const [group, fields] of Object.entries(setters)) {
            for (const [key, method] of Object.entries(fields)) {
                if (!previous || next[group][key] !== previous[group][key]) sim[method](next[group][key]);
            }
        }
        if (!previous || next.presentation.sharpNib !== previous.presentation.sharpNib)
            sim.setNibShape(next.presentation.sharpNib ? 'sharp' : 'rounded');
        if (!previous || next.presentation.aspectRatio !== previous.presentation.aspectRatio)
            sim.setViewportAspect(...next.presentation.aspectRatio.split('/').map(Number));
        if (!previous || !same(next.pose, previous.pose)) sim.setPose(next.pose);
        if (!previous || !same(next.camera, previous.camera) || next.presentation.axonometric !== previous.presentation.axonometric)
            sim.restoreCameraState(next.camera);
    });
    return next;
}
