// UI Controller for Pen3DSim

// --- Helpers ---

function bindSlider(sliderId, displayId, decimals, simSetter, onChange) {
    const slider = document.getElementById(sliderId);
    const display = document.getElementById(displayId);
    slider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        display.textContent = value.toFixed(decimals);
        const result = simSetter(value);
        if (onChange) onChange(value, result);
    });
    return { slider, display };
}

function setSliderAndDisplay(slider, display, value, decimals) {
    slider.value = value;
    display.textContent = value.toFixed(decimals);
}

function updateTiltXYDisplay(result) {
    document.getElementById('tilt-x-value').textContent = result.tiltX.toFixed(1);
    document.getElementById('tilt-y-value').textContent = result.tiltY.toFixed(1);
}

// --- Initialization ---

const viewer = document.getElementById('viewer');
const sim = new Pen3DSim(viewer);

function updateAzimuthSliderState() {
    const slider = document.getElementById('tilt-azimuth');
    const disabled = parseFloat(document.getElementById('tilt-altitude').value) === 0;
    slider.disabled = disabled;
    slider.style.opacity = disabled ? '0.5' : '1';
    slider.style.cursor = disabled ? 'not-allowed' : 'pointer';
}

// --- Slider bindings ---

const { slider: penDistanceSlider, display: distanceValueDisplay } =
    bindSlider('pen-distance', 'distance-value', 2, v => sim.setDistance(v));

const { slider: tiltAltitudeSlider, display: altitudeValueDisplay } =
    bindSlider('tilt-altitude', 'altitude-value', 0, v => sim.setTiltAltitude(v), (_, result) => {
        updateAzimuthSliderState();
        updateTiltXYDisplay(result);
    });

const { slider: tiltAzimuthSlider, display: azimuthValueDisplay } =
    bindSlider('tilt-azimuth', 'azimuth-value', 0, v => sim.setTiltAzimuth(v), (_, result) => {
        updateTiltXYDisplay(result);
    });

const { slider: barrelRotationSlider, display: barrelRotationValueDisplay } =
    bindSlider('barrel-rotation', 'barrel-rotation-value', 0, v => sim.setBarrelRotation(v));

const { slider: tabletPositionXSlider, display: tabletPositionXValueDisplay } =
    bindSlider('tablet-position-x', 'tablet-position-x-value', 1, v => sim.setTabletPositionX(v));

const { slider: tabletPositionYSlider, display: tabletPositionYValueDisplay } =
    bindSlider('tablet-position-y', 'tablet-position-y-value', 1, v => sim.setTabletPositionY(v));

bindSlider('cursor-offset-x', 'cursor-offset-x-value', 2, v => sim.setCursorOffsetX(v));
bindSlider('cursor-offset-y', 'cursor-offset-y-value', 2, v => sim.setCursorOffsetY(v));
bindSlider('tilt-compensation-postiltx-value', 'tilt-compensation-postiltx-value-display', 2, v => sim.setTiltCompensationPosTiltXValue(v));
bindSlider('tilt-compensation-negtiltx-value', 'tilt-compensation-negtiltx-value-display', 2, v => sim.setTiltCompensationNegTiltXValue(v));
bindSlider('tilt-compensation-postilty-value', 'tilt-compensation-postilty-value-display', 2, v => sim.setTiltCompensationPosTiltYValue(v));
bindSlider('tilt-compensation-negtilty-value', 'tilt-compensation-negtilty-value-display', 2, v => sim.setTiltCompensationNegTiltYValue(v));
bindSlider('scaling-factor-value', 'scaling-factor-value-display', 2, v => sim.setScalingFactor(v));
bindSlider('edge-attraction-value', 'edge-attraction-value-display', 2, v => sim.setEdgeAttraction(v));
bindSlider('edge-attraction-range-value', 'edge-attraction-range-value-display', 2, v => sim.setEdgeAttractionRange(v));

updateAzimuthSliderState();

// --- Event handlers ---

viewer.addEventListener('tabletPositionChanged', (e) => {
    const { x, y } = e.detail;
    setSliderAndDisplay(tabletPositionXSlider, tabletPositionXValueDisplay, x, 1);
    setSliderAndDisplay(tabletPositionYSlider, tabletPositionYValueDisplay, y, 1);
});

window.addEventListener('resize', () => sim.onResize());

document.getElementById('axonometric-view').addEventListener('change', (e) => {
    sim.setAxonometricView(e.target.checked);
});

// --- Annotation checkboxes ---

const azimuthAnnotationsCheckbox = document.getElementById('azimuth-annotations');
sim.setAzimuthAnnotationsVisible(azimuthAnnotationsCheckbox.checked);
azimuthAnnotationsCheckbox.addEventListener('change', (e) => sim.setAzimuthAnnotationsVisible(e.target.checked));

const altitudeAnnotationsCheckbox = document.getElementById('altitude-annotations');
altitudeAnnotationsCheckbox.addEventListener('change', (e) => sim.setAltitudeAnnotationsVisible(e.target.checked));

const barrelAnnotationsCheckbox = document.getElementById('barrel-annotations');
barrelAnnotationsCheckbox.addEventListener('change', (e) => sim.setBarrelAnnotationsVisible(e.target.checked));

const tiltXAnnotationsCheckbox = document.getElementById('tilt-x-annotations');
tiltXAnnotationsCheckbox.addEventListener('change', (e) => sim.setTiltXAnnotationsVisible(e.target.checked));

const tiltYAnnotationsCheckbox = document.getElementById('tilt-y-annotations');
tiltYAnnotationsCheckbox.addEventListener('change', (e) => sim.setTiltYAnnotationsVisible(e.target.checked));

const axisMarkersCheckbox = document.getElementById('axis-markers');
sim.setAxisMarkersVisible(axisMarkersCheckbox.checked);
axisMarkersCheckbox.addEventListener('change', (e) => sim.setAxisMarkersVisible(e.target.checked));

const cursorVisibleCheckbox = document.getElementById('cursor-visible');
sim.setCursorVisible(cursorVisibleCheckbox.checked);
cursorVisibleCheckbox.addEventListener('change', (e) => sim.setCursorVisible(e.target.checked));

const penShadowVisibleCheckbox = document.getElementById('pen-shadow-visible');
sim.setPenShadowVisible(penShadowVisibleCheckbox.checked);
penShadowVisibleCheckbox.addEventListener('change', (e) => sim.setPenShadowVisible(e.target.checked));

const tabletCheckerboardCheckbox = document.getElementById('tablet-checkerboard');
sim.setTabletCheckerboardVisible(tabletCheckerboardCheckbox.checked);
tabletCheckerboardCheckbox.addEventListener('change', (e) => sim.setTabletCheckerboardVisible(e.target.checked));

document.getElementById('annotations-all-on-btn').addEventListener('click', () => {
    altitudeAnnotationsCheckbox.checked = true;
    azimuthAnnotationsCheckbox.checked = true;
    tiltXAnnotationsCheckbox.checked = true;
    tiltYAnnotationsCheckbox.checked = true;
    barrelAnnotationsCheckbox.checked = true;
    axisMarkersCheckbox.checked = true;
    cursorVisibleCheckbox.checked = true;
    penShadowVisibleCheckbox.checked = true;

    sim.setAltitudeAnnotationsVisible(true);
    sim.setAzimuthAnnotationsVisible(true);
    sim.setTiltXAnnotationsVisible(true);
    sim.setTiltYAnnotationsVisible(true);
    sim.setBarrelAnnotationsVisible(true);
    sim.setAxisMarkersVisible(true);
    sim.setCursorVisible(true);
    sim.setPenShadowVisible(true);
});

document.getElementById('annotations-all-off-btn').addEventListener('click', () => {
    altitudeAnnotationsCheckbox.checked = false;
    azimuthAnnotationsCheckbox.checked = false;
    tiltXAnnotationsCheckbox.checked = false;
    tiltYAnnotationsCheckbox.checked = false;
    barrelAnnotationsCheckbox.checked = false;
    axisMarkersCheckbox.checked = false;
    cursorVisibleCheckbox.checked = false;
    penShadowVisibleCheckbox.checked = false;

    sim.setAltitudeAnnotationsVisible(false);
    sim.setAzimuthAnnotationsVisible(false);
    sim.setTiltXAnnotationsVisible(false);
    sim.setTiltYAnnotationsVisible(false);
    sim.setBarrelAnnotationsVisible(false);
    sim.setAxisMarkersVisible(false);
    sim.setCursorVisible(false);
    sim.setPenShadowVisible(false);
});

// --- Reset pen ---

document.getElementById('reset-btn').addEventListener('click', () => {
    const defaults = sim.reset();

    setSliderAndDisplay(penDistanceSlider, distanceValueDisplay, defaults.distance, 2);
    setSliderAndDisplay(tiltAltitudeSlider, altitudeValueDisplay, defaults.tiltAltitude, 0);
    setSliderAndDisplay(tiltAzimuthSlider, azimuthValueDisplay, defaults.tiltAzimuth, 0);
    setSliderAndDisplay(barrelRotationSlider, barrelRotationValueDisplay, defaults.barrelRotation, 0);
    setSliderAndDisplay(tabletPositionXSlider, tabletPositionXValueDisplay, defaults.tabletX, 1);
    setSliderAndDisplay(tabletPositionYSlider, tabletPositionYValueDisplay, defaults.tabletY, 1);
    updateAzimuthSliderState();

    sim.setDistance(defaults.distance);
    sim.setTiltAltitude(defaults.tiltAltitude);
    sim.setTiltAzimuth(defaults.tiltAzimuth);
    sim.setBarrelRotation(defaults.barrelRotation);
    sim.setTabletPositionX(defaults.tabletX);
    sim.setTabletPositionY(defaults.tabletY);
});

// --- Animations flyout reference (needed by button handlers and initializeAnimations) ---
// Resolved here before the flyouts array is built; initializeAnimations also receives it.

const animationsFlyout = document.getElementById('animations-flyout');

// --- Demo button ---

document.getElementById('demo-btn').addEventListener('click', () => {
    if (animationsFlyout.classList.contains('open')) animationsFlyout.classList.remove('open');

    const demo = { distance: 0, tiltAltitude: 45, tiltAzimuth: 242, barrelRotation: 318, tabletX: 8.6, tabletY: 5.3 };

    setSliderAndDisplay(penDistanceSlider, distanceValueDisplay, demo.distance, 2);
    setSliderAndDisplay(tiltAltitudeSlider, altitudeValueDisplay, demo.tiltAltitude, 0);
    setSliderAndDisplay(tiltAzimuthSlider, azimuthValueDisplay, demo.tiltAzimuth, 0);
    setSliderAndDisplay(barrelRotationSlider, barrelRotationValueDisplay, demo.barrelRotation, 0);
    setSliderAndDisplay(tabletPositionXSlider, tabletPositionXValueDisplay, demo.tabletX, 1);
    setSliderAndDisplay(tabletPositionYSlider, tabletPositionYValueDisplay, demo.tabletY, 1);
    updateAzimuthSliderState();

    altitudeAnnotationsCheckbox.checked = true;
    azimuthAnnotationsCheckbox.checked = true;
    tiltXAnnotationsCheckbox.checked = true;
    tiltYAnnotationsCheckbox.checked = true;
    barrelAnnotationsCheckbox.checked = true;

    sim.setDistance(demo.distance);
    sim.setTiltAltitude(demo.tiltAltitude);
    sim.setBarrelRotation(demo.barrelRotation);
    sim.setTabletPositionX(demo.tabletX);
    sim.setTabletPositionY(demo.tabletY);
    sim.setAltitudeAnnotationsVisible(true);
    sim.setAzimuthAnnotationsVisible(true);
    sim.setTiltXAnnotationsVisible(true);
    sim.setTiltYAnnotationsVisible(true);
    sim.setBarrelAnnotationsVisible(true);

    const tiltResult = sim.setTiltAzimuth(demo.tiltAzimuth);
    updateTiltXYDisplay(tiltResult);
});

// --- Anim all button ---

let cancelAnimation = null;
document.getElementById('anim-btn').addEventListener('click', () => {
    if (animationsFlyout.classList.contains('open')) animationsFlyout.classList.remove('open');
    if (cancelAnimation) cancelAnimation();

    setTimeout(() => {
        document.getElementById('altitude-annotations').checked = true;
        document.getElementById('azimuth-annotations').checked = true;
        document.getElementById('barrel-annotations').checked = true;
        sim.setAltitudeAnnotationsVisible(true);
        sim.setAzimuthAnnotationsVisible(true);
        sim.setBarrelAnnotationsVisible(true);

        const defaults = sim.reset();

        setSliderAndDisplay(penDistanceSlider, distanceValueDisplay, defaults.distance, 2);
        setSliderAndDisplay(tiltAltitudeSlider, altitudeValueDisplay, defaults.tiltAltitude, 0);
        setSliderAndDisplay(tiltAzimuthSlider, azimuthValueDisplay, defaults.tiltAzimuth, 0);
        setSliderAndDisplay(barrelRotationSlider, barrelRotationValueDisplay, defaults.barrelRotation, 0);
        setSliderAndDisplay(tabletPositionXSlider, tabletPositionXValueDisplay, defaults.tabletX, 1);
        setSliderAndDisplay(tabletPositionYSlider, tabletPositionYValueDisplay, defaults.tabletY, 1);
        updateAzimuthSliderState();

        sim.setDistance(defaults.distance);
        sim.setTiltAltitude(defaults.tiltAltitude);
        sim.setTiltAzimuth(defaults.tiltAzimuth);
        sim.setBarrelRotation(defaults.barrelRotation);
        sim.setTabletPositionX(defaults.tabletX);
        sim.setTabletPositionY(defaults.tabletY);

        cancelAnimation = sim.animateToDemo((current, progress) => {
            setSliderAndDisplay(penDistanceSlider, distanceValueDisplay, current.distance, 2);
            setSliderAndDisplay(tiltAltitudeSlider, altitudeValueDisplay, current.tiltAltitude, 0);
            setSliderAndDisplay(tiltAzimuthSlider, azimuthValueDisplay, current.tiltAzimuth, 0);
            setSliderAndDisplay(barrelRotationSlider, barrelRotationValueDisplay, current.barrelRotation, 0);
            setSliderAndDisplay(tabletPositionXSlider, tabletPositionXValueDisplay, current.tabletX, 1);
            setSliderAndDisplay(tabletPositionYSlider, tabletPositionYValueDisplay, current.tabletY, 1);

            const tiltResult = sim.setTiltAzimuth(current.tiltAzimuth);
            updateTiltXYDisplay(tiltResult);

            if (progress >= 1) cancelAnimation = null;
        });
    }, 500);
});

// --- Export as PNG ---

document.getElementById('export-btn').addEventListener('click', () => sim.exportAsPNG());

// --- Initialize animation handlers ---

initializeAnimations(sim, {
    tiltAzimuthSlider,
    tiltAltitudeSlider,
    barrelRotationSlider,
    altitudeValueDisplay,
    azimuthValueDisplay,
    barrelRotationValueDisplay,
    updateAzimuthSliderState,
    animationsFlyout
});

// --- Edit View modal ---

const cameraEditModal = document.getElementById('camera-edit-modal');
const cameraJsonEditor = document.getElementById('camera-json-editor');

document.getElementById('edit-view-btn').addEventListener('click', () => {
    try {
        cameraJsonEditor.value = sim.getCameraSettingsJSON();
        cameraEditModal.style.display = 'flex';
        cameraJsonEditor.focus();
    } catch (error) {
        alert(`Error loading camera settings: ${error.message}`);
    }
});

document.getElementById('camera-edit-cancel').addEventListener('click', () => {
    cameraEditModal.style.display = 'none';
});

cameraEditModal.addEventListener('click', (e) => {
    if (e.target === cameraEditModal) cameraEditModal.style.display = 'none';
});

document.getElementById('camera-edit-ok').addEventListener('click', () => {
    try {
        sim.setCameraSettingsJSON(cameraJsonEditor.value);
        cameraEditModal.style.display = 'none';
    } catch (error) {
        alert(`Error applying camera settings: ${error.message}`);
    }
});

// --- Flyout toggles (data-driven) ---

const flyouts = [
    { id: 'pointer-tracking', btnId: 'pointer-tracking-flyout-btn' },
    { id: 'annotations',      btnId: 'annotations-flyout-btn' },
    { id: 'animations',       btnId: 'animations-flyout-btn' },
].map(({ id, btnId }) => ({
    panel: document.getElementById(`${id}-flyout`),
    btn:   document.getElementById(btnId),
    close: document.getElementById(`${id}-flyout-close`),
}));

flyouts.forEach(({ panel, btn, close }) => {
    btn.addEventListener('click', () => {
        const isOpen = panel.classList.contains('open');
        flyouts.forEach(f => f.panel.classList.remove('open'));
        if (!isOpen) panel.classList.add('open');
    });
    close.addEventListener('click', () => panel.classList.remove('open'));
});

// --- Keyboard and click-outside handlers ---

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (cameraEditModal.style.display === 'flex') cameraEditModal.style.display = 'none';
        flyouts.forEach(f => f.panel.classList.remove('open'));
    }
});

document.addEventListener('click', (e) => {
    flyouts.forEach(({ panel, btn }) => {
        if (panel.classList.contains('open') &&
            !panel.contains(e.target) &&
            e.target !== btn) {
            panel.classList.remove('open');
        }
    });
});
