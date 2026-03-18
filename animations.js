// Animation handlers for individual parameter animations

function runParameterAnimation(sim, duration, onFrame) {
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

function initializeAnimations(sim, uiElements) {
    const {
        tiltAzimuthSlider,
        tiltAltitudeSlider,
        barrelRotationSlider,
        altitudeValueDisplay,
        azimuthValueDisplay,
        barrelRotationValueDisplay,
        updateAzimuthSliderState,
        animationsFlyout
    } = uiElements;

    let cancelTiltAltitudeAnimation = null;
    let cancelTiltAzimuthAnimation = null;
    let cancelBarrelAnimation = null;

    function closeFlyout() {
        if (animationsFlyout && animationsFlyout.classList.contains('open')) {
            animationsFlyout.classList.remove('open');
        }
    }

    // Tilt altitude animation (0 → 45°)
    document.getElementById('anim-tilt-altitude-btn').addEventListener('click', () => {
        closeFlyout();
        if (cancelTiltAltitudeAnimation) cancelTiltAltitudeAnimation();

        setTimeout(() => {
            const currentAzimuth = parseFloat(tiltAzimuthSlider.value);
            const startAltitude = 0;
            const endAltitude = 45;

            sim.setTiltAltitude(startAltitude);
            sim.setTiltAzimuth(currentAzimuth);

            cancelTiltAltitudeAnimation = runParameterAnimation(sim, 8000, (eased, progress) => {
                const currentAltitude = startAltitude + (endAltitude - startAltitude) * eased;
                const result = sim.setTiltAltitude(currentAltitude);
                sim.setTiltAzimuth(currentAzimuth);

                tiltAltitudeSlider.value = currentAltitude;
                tiltAzimuthSlider.value = currentAzimuth;
                altitudeValueDisplay.textContent = Math.round(currentAltitude);
                azimuthValueDisplay.textContent = Math.round(currentAzimuth);
                document.getElementById('tilt-x-value').textContent = result.tiltX.toFixed(1);
                document.getElementById('tilt-y-value').textContent = result.tiltY.toFixed(1);
                updateAzimuthSliderState();

                if (progress >= 1) cancelTiltAltitudeAnimation = null;
            });
        }, 500);
    });

    // Tilt azimuth animation (0 → 252°)
    document.getElementById('anim-tilt-azimuth-btn').addEventListener('click', () => {
        closeFlyout();
        if (cancelTiltAzimuthAnimation) cancelTiltAzimuthAnimation();

        setTimeout(() => {
            const currentAltitude = parseFloat(tiltAltitudeSlider.value);
            const startAzimuth = 0;
            const endAzimuth = 252;

            sim.setTiltAltitude(currentAltitude);
            sim.setTiltAzimuth(startAzimuth);

            cancelTiltAzimuthAnimation = runParameterAnimation(sim, 8000, (eased, progress) => {
                const currentAzimuth = sim.interpolateAngle(startAzimuth, endAzimuth, eased);
                sim.setTiltAltitude(currentAltitude);
                const result = sim.setTiltAzimuth(currentAzimuth);

                tiltAltitudeSlider.value = currentAltitude;
                tiltAzimuthSlider.value = currentAzimuth;
                altitudeValueDisplay.textContent = Math.round(currentAltitude);
                azimuthValueDisplay.textContent = Math.round(currentAzimuth);
                document.getElementById('tilt-x-value').textContent = result.tiltX.toFixed(1);
                document.getElementById('tilt-y-value').textContent = result.tiltY.toFixed(1);
                updateAzimuthSliderState();

                if (progress >= 1) cancelTiltAzimuthAnimation = null;
            });
        }, 500);
    });

    // Barrel rotation animation (0 → 316°)
    document.getElementById('anim-barrel-btn').addEventListener('click', () => {
        closeFlyout();
        if (cancelBarrelAnimation) cancelBarrelAnimation();

        setTimeout(() => {
            const startBarrel = 0;
            const endBarrel = 316;

            sim.setBarrelRotation(startBarrel);

            cancelBarrelAnimation = runParameterAnimation(sim, 8000, (eased, progress) => {
                const currentBarrel = sim.interpolateAngle(startBarrel, endBarrel, eased);
                sim.setBarrelRotation(currentBarrel);

                barrelRotationSlider.value = currentBarrel;
                barrelRotationValueDisplay.textContent = Math.round(currentBarrel);

                if (progress >= 1) cancelBarrelAnimation = null;
            });
        }, 500);
    });
}
