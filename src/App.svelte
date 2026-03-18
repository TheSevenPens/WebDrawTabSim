<script>
  import { onMount } from 'svelte';
  import { Pen3DSim } from './lib/sim/index.js';
  import SliderControl from './lib/SliderControl.svelte';
  import { runParameterAnimation } from './lib/sim/animations.js';

  // ── DOM reference ──────────────────────────────────────────────────────────
  let viewer = $state();
  let sim;

  // ── Pen state (tablet coordinates) ────────────────────────────────────────
  let distance       = $state(0);
  let tabletX        = $state(8);
  let tabletY        = $state(4.5);
  let tiltAltitude   = $state(0);
  let tiltAzimuth    = $state(0);
  let barrelRotation = $state(0);
  let tiltXDisplay   = $state('0.0');
  let tiltYDisplay   = $state('0.0');
  let azimuthDisabled = $state(true);

  // ── Annotation / display state ─────────────────────────────────────────────
  let showAltitude     = $state(false);
  let showAzimuth      = $state(false);
  let showTiltX        = $state(false);
  let showTiltY        = $state(false);
  let showBarrel       = $state(false);
  let showAxis         = $state(false);
  let showCursor       = $state(true);
  let showPenShadow    = $state(true);
  let showCheckerboard = $state(false);
  let axonometric      = $state(false);

  // ── Pointer-tracking state ─────────────────────────────────────────────────
  let cursorOffsetX       = $state(0);
  let cursorOffsetY       = $state(0);
  let compPosTiltX        = $state(0);
  let compNegTiltX        = $state(0);
  let compPosTiltY        = $state(0);
  let compNegTiltY        = $state(0);
  let scalingFactor       = $state(1);
  let edgeAttraction      = $state(0);
  let edgeAttractionRange = $state(1);

  // ── Flyout / modal state ───────────────────────────────────────────────────
  let openFlyout      = $state(null); // 'pointer-tracking' | 'annotations' | 'animations' | null
  let cameraModalOpen = $state(false);
  let cameraJsonText  = $state('');

  // ── Animation cancel handles ───────────────────────────────────────────────
  let cancelMainAnimation     = null;
  let cancelAltitudeAnimation = null;
  let cancelAzimuthAnimation  = null;
  let cancelBarrelAnimation   = null;

  // ── Helpers ────────────────────────────────────────────────────────────────

  function updateAzimuthState() {
    azimuthDisabled = tiltAltitude === 0;
  }

  function setTiltXY(result) {
    tiltXDisplay = result.tiltX.toFixed(1);
    tiltYDisplay = result.tiltY.toFixed(1);
  }

  function toggleFlyout(name) {
    openFlyout = openFlyout === name ? null : name;
  }

  // ── Mount ──────────────────────────────────────────────────────────────────

  onMount(() => {
    sim = new Pen3DSim(viewer);

    // Apply initial checkbox state
    sim.setAzimuthAnnotationsVisible(showAzimuth);
    sim.setCursorVisible(showCursor);
    sim.setPenShadowVisible(showPenShadow);
    sim.setAxisMarkersVisible(showAxis);

    // Sync slider values when mouse-drag moves the pen
    viewer.addEventListener('tabletPositionChanged', (e) => {
      tabletX = e.detail.x;
      tabletY = e.detail.y;
    });

    // Click-outside closes flyout
    const onDocClick = (e) => {
      if (!openFlyout) return;
      const panel = document.getElementById(`${openFlyout}-flyout`);
      const btn   = document.getElementById(`${openFlyout}-flyout-btn`);
      if (panel && !panel.contains(e.target) && e.target !== btn) {
        openFlyout = null;
      }
    };
    document.addEventListener('click', onDocClick);

    return () => document.removeEventListener('click', onDocClick);
  });

  // ── Slider handlers ────────────────────────────────────────────────────────

  function onDistance()       { sim.setDistance(distance); }
  function onTabletX()        { sim.setTabletPositionX(tabletX); }
  function onTabletY()        { sim.setTabletPositionY(tabletY); }

  function onAltitude() {
    const result = sim.setTiltAltitude(tiltAltitude);
    setTiltXY(result);
    updateAzimuthState();
  }

  function onAzimuth() {
    const result = sim.setTiltAzimuth(tiltAzimuth);
    setTiltXY(result);
  }

  function onBarrel()            { sim.setBarrelRotation(barrelRotation); }
  function onCursorOffsetX()     { sim.setCursorOffsetX(cursorOffsetX); }
  function onCursorOffsetY()     { sim.setCursorOffsetY(cursorOffsetY); }
  function onCompPosTiltX()      { sim.setTiltCompensationPosTiltXValue(compPosTiltX); }
  function onCompNegTiltX()      { sim.setTiltCompensationNegTiltXValue(compNegTiltX); }
  function onCompPosTiltY()      { sim.setTiltCompensationPosTiltYValue(compPosTiltY); }
  function onCompNegTiltY()      { sim.setTiltCompensationNegTiltYValue(compNegTiltY); }
  function onScalingFactor()     { sim.setScalingFactor(scalingFactor); }
  function onEdgeAttraction()    { sim.setEdgeAttraction(edgeAttraction); }
  function onEdgeAttractionRange() { sim.setEdgeAttractionRange(edgeAttractionRange); }

  // ── Annotation checkbox handlers ───────────────────────────────────────────

  function onShowAltitude()     { sim.setAltitudeAnnotationsVisible(showAltitude); }
  function onShowAzimuth()      { sim.setAzimuthAnnotationsVisible(showAzimuth); }
  function onShowTiltX()        { sim.setTiltXAnnotationsVisible(showTiltX); }
  function onShowTiltY()        { sim.setTiltYAnnotationsVisible(showTiltY); }
  function onShowBarrel()       { sim.setBarrelAnnotationsVisible(showBarrel); }
  function onShowAxis()         { sim.setAxisMarkersVisible(showAxis); }
  function onShowCursor()       { sim.setCursorVisible(showCursor); }
  function onShowPenShadow()    { sim.setPenShadowVisible(showPenShadow); }
  function onShowCheckerboard() { sim.setTabletCheckerboardVisible(showCheckerboard); }
  function onAxonometric()      { sim.setAxonometricView(axonometric); }

  function allAnnotationsOn() {
    showAltitude = showAzimuth = showTiltX = showTiltY = showBarrel = showAxis = showCursor = showPenShadow = true;
    sim.setAltitudeAnnotationsVisible(true);
    sim.setAzimuthAnnotationsVisible(true);
    sim.setTiltXAnnotationsVisible(true);
    sim.setTiltYAnnotationsVisible(true);
    sim.setBarrelAnnotationsVisible(true);
    sim.setAxisMarkersVisible(true);
    sim.setCursorVisible(true);
    sim.setPenShadowVisible(true);
  }

  function allAnnotationsOff() {
    showAltitude = showAzimuth = showTiltX = showTiltY = showBarrel = showAxis = showCursor = showPenShadow = false;
    sim.setAltitudeAnnotationsVisible(false);
    sim.setAzimuthAnnotationsVisible(false);
    sim.setTiltXAnnotationsVisible(false);
    sim.setTiltYAnnotationsVisible(false);
    sim.setBarrelAnnotationsVisible(false);
    sim.setAxisMarkersVisible(false);
    sim.setCursorVisible(false);
    sim.setPenShadowVisible(false);
  }

  // ── Reset ──────────────────────────────────────────────────────────────────

  function resetPen() {
    const d = sim.reset();
    distance = d.distance;
    tiltAltitude = d.tiltAltitude;
    tiltAzimuth = d.tiltAzimuth;
    barrelRotation = d.barrelRotation;
    tabletX = d.tabletX;
    tabletY = d.tabletY;
    updateAzimuthState();
    sim.setDistance(d.distance);
    sim.setTiltAltitude(d.tiltAltitude);
    sim.setTiltAzimuth(d.tiltAzimuth);
    sim.setBarrelRotation(d.barrelRotation);
    sim.setTabletPositionX(d.tabletX);
    sim.setTabletPositionY(d.tabletY);
  }

  // ── Demo ───────────────────────────────────────────────────────────────────

  function runDemo() {
    openFlyout = null;
    const demo = { distance: 0, tiltAltitude: 45, tiltAzimuth: 242, barrelRotation: 318, tabletX: 8.6, tabletY: 5.3 };
    distance = demo.distance;
    tiltAltitude = demo.tiltAltitude;
    tiltAzimuth = demo.tiltAzimuth;
    barrelRotation = demo.barrelRotation;
    tabletX = demo.tabletX;
    tabletY = demo.tabletY;
    showAltitude = showAzimuth = showTiltX = showTiltY = showBarrel = true;
    updateAzimuthState();
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
    const result = sim.setTiltAzimuth(demo.tiltAzimuth);
    setTiltXY(result);
  }

  // ── Anim all ───────────────────────────────────────────────────────────────

  function runAnimAll() {
    openFlyout = null;
    if (cancelMainAnimation) cancelMainAnimation();
    setTimeout(() => {
      showAltitude = showAzimuth = showBarrel = true;
      sim.setAltitudeAnnotationsVisible(true);
      sim.setAzimuthAnnotationsVisible(true);
      sim.setBarrelAnnotationsVisible(true);

      const d = sim.reset();
      distance = d.distance; tiltAltitude = d.tiltAltitude; tiltAzimuth = d.tiltAzimuth;
      barrelRotation = d.barrelRotation; tabletX = d.tabletX; tabletY = d.tabletY;
      updateAzimuthState();
      sim.setDistance(d.distance); sim.setTiltAltitude(d.tiltAltitude);
      sim.setTiltAzimuth(d.tiltAzimuth); sim.setBarrelRotation(d.barrelRotation);
      sim.setTabletPositionX(d.tabletX); sim.setTabletPositionY(d.tabletY);

      cancelMainAnimation = sim.animateToDemo((current, progress) => {
        distance = current.distance;
        tiltAltitude = current.tiltAltitude;
        tiltAzimuth = current.tiltAzimuth;
        barrelRotation = current.barrelRotation;
        tabletX = current.tabletX;
        tabletY = current.tabletY;
        const result = sim.setTiltAzimuth(current.tiltAzimuth);
        setTiltXY(result);
        if (progress >= 1) cancelMainAnimation = null;
      });
    }, 500);
  }

  // ── Individual animations ──────────────────────────────────────────────────

  function runAnimAltitude() {
    openFlyout = null;
    if (cancelAltitudeAnimation) cancelAltitudeAnimation();
    setTimeout(() => {
      const curAzimuth = tiltAzimuth;
      const startAlt = 0, endAlt = 45;
      tiltAltitude = startAlt;
      sim.setTiltAltitude(startAlt);
      sim.setTiltAzimuth(curAzimuth);
      cancelAltitudeAnimation = runParameterAnimation(sim, 8000, (eased, progress) => {
        tiltAltitude = startAlt + (endAlt - startAlt) * eased;
        tiltAzimuth = curAzimuth;
        const result = sim.setTiltAltitude(tiltAltitude);
        sim.setTiltAzimuth(curAzimuth);
        setTiltXY(result);
        updateAzimuthState();
        if (progress >= 1) cancelAltitudeAnimation = null;
      });
    }, 500);
  }

  function runAnimAzimuth() {
    openFlyout = null;
    if (cancelAzimuthAnimation) cancelAzimuthAnimation();
    setTimeout(() => {
      const curAlt = tiltAltitude;
      const startAz = 0, endAz = 252;
      tiltAzimuth = startAz;
      sim.setTiltAltitude(curAlt);
      sim.setTiltAzimuth(startAz);
      cancelAzimuthAnimation = runParameterAnimation(sim, 8000, (eased, progress) => {
        tiltAltitude = curAlt;
        tiltAzimuth = sim.interpolateAngle(startAz, endAz, eased);
        sim.setTiltAltitude(curAlt);
        const result = sim.setTiltAzimuth(tiltAzimuth);
        setTiltXY(result);
        updateAzimuthState();
        if (progress >= 1) cancelAzimuthAnimation = null;
      });
    }, 500);
  }

  function runAnimBarrel() {
    openFlyout = null;
    if (cancelBarrelAnimation) cancelBarrelAnimation();
    setTimeout(() => {
      const startBarrel = 0, endBarrel = 316;
      barrelRotation = startBarrel;
      sim.setBarrelRotation(startBarrel);
      cancelBarrelAnimation = runParameterAnimation(sim, 8000, (eased, progress) => {
        barrelRotation = sim.interpolateAngle(startBarrel, endBarrel, eased);
        sim.setBarrelRotation(barrelRotation);
        if (progress >= 1) cancelBarrelAnimation = null;
      });
    }, 500);
  }

  // ── Camera modal ───────────────────────────────────────────────────────────

  function openCameraModal() {
    try {
      cameraJsonText = sim.getCameraSettingsJSON();
      cameraModalOpen = true;
    } catch (e) {
      alert(`Error loading camera settings: ${e.message}`);
    }
  }

  function applyCameraSettings() {
    try {
      sim.setCameraSettingsJSON(cameraJsonText);
      cameraModalOpen = false;
    } catch (e) {
      alert(`Error applying camera settings: ${e.message}`);
    }
  }

  // ── Keyboard ───────────────────────────────────────────────────────────────

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      if (cameraModalOpen) { cameraModalOpen = false; return; }
      openFlyout = null;
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} onresize={() => sim?.onResize()} />

<!-- ═══════════════════════════════════════════════════════════════════════════
     Control panel
     ═══════════════════════════════════════════════════════════════════════════ -->
<div id="control-panel">
  <h1>SevenPens DrawTabSim</h1>

  <SliderControl label="Z: (Hover distance)" bind:value={distance} min={0} max={1} step={0.05} decimals={2} unit=" in" oninput={onDistance} />

  <SliderControl label="X" bind:value={tabletX} min={0} max={16} step={0.1} decimals={1} unit=" in" oninput={onTabletX} />

  <SliderControl label="Y" bind:value={tabletY} min={0} max={9} step={0.1} decimals={1} unit=" in" oninput={onTabletY} />

  <SliderControl label="Tilt altitude" bind:value={tiltAltitude} min={0} max={60} step={1} decimals={0} unit="°" oninput={onAltitude} />

  <SliderControl label="Tilt azimuth" bind:value={tiltAzimuth} min={0} max={359} step={1} decimals={0} unit="°" disabled={azimuthDisabled} oninput={onAzimuth} />

  <SliderControl label="Barrel rotation" bind:value={barrelRotation} min={0} max={359} step={1} decimals={0} unit="°" oninput={onBarrel} />

  <div class="control-group">
    <label>Tilt X: <span class="slider-value">{tiltXDisplay}°</span></label>
  </div>

  <div class="control-group">
    <label>Tilt Y: <span class="slider-value">{tiltYDisplay}°</span></label>
  </div>

  <button class="action-btn" id="pointer-tracking-flyout-btn" onclick={() => toggleFlyout('pointer-tracking')}>Pointer tracking</button>
  <button class="action-btn" id="annotations-flyout-btn" onclick={() => toggleFlyout('annotations')}>Annotations</button>

  <div class="checkbox-grid">
    <div class="control-group">
      <label style="display:flex;align-items:center;gap:8px;">
        <input type="checkbox" bind:checked={axonometric} onchange={onAxonometric} style="width:auto;margin:0;">
        <span>Axonometric</span>
      </label>
    </div>
  </div>

  <button class="action-btn" onclick={resetPen}>Reset pen</button>
  <button class="action-btn" id="animations-flyout-btn" onclick={() => toggleFlyout('animations')}>Animations</button>
  <button class="action-btn" onclick={openCameraModal}>Edit View</button>
  <button class="action-btn" onclick={() => sim?.exportAsPNG()}>Export as PNG</button>
</div>

<!-- ═══════════════════════════════════════════════════════════════════════════
     3D Viewer
     ═══════════════════════════════════════════════════════════════════════════ -->
<div id="viewer" bind:this={viewer}></div>

<!-- ═══════════════════════════════════════════════════════════════════════════
     Annotations flyout
     ═══════════════════════════════════════════════════════════════════════════ -->
<div id="annotations-flyout" class="flyout-panel" class:open={openFlyout === 'annotations'}>
  <div class="flyout-header">
    <h3>Annotations</h3>
    <button class="flyout-close-btn" onclick={() => openFlyout = null}>×</button>
  </div>
  <div class="flyout-content">
    <div style="display:flex;gap:8px;margin-bottom:12px;">
      <button class="action-btn" style="flex:1;" onclick={allAnnotationsOn}>All On</button>
      <button class="action-btn" style="flex:1;" onclick={allAnnotationsOff}>All Off</button>
    </div>
    <div class="control-group"><label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" bind:checked={showAltitude}     onchange={onShowAltitude}     style="width:auto;margin:0;"><span>Tilt altitude</span></label></div>
    <div class="control-group"><label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" bind:checked={showAzimuth}      onchange={onShowAzimuth}      style="width:auto;margin:0;"><span>Tilt azimuth</span></label></div>
    <div class="control-group"><label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" bind:checked={showTiltX}        onchange={onShowTiltX}        style="width:auto;margin:0;"><span>Tilt X</span></label></div>
    <div class="control-group"><label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" bind:checked={showTiltY}        onchange={onShowTiltY}        style="width:auto;margin:0;"><span>Tilt Y</span></label></div>
    <div class="control-group"><label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" bind:checked={showBarrel}       onchange={onShowBarrel}       style="width:auto;margin:0;"><span>Barrel rotation</span></label></div>
    <div class="control-group"><label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" bind:checked={showAxis}         onchange={onShowAxis}         style="width:auto;margin:0;"><span>Axis</span></label></div>
    <div class="control-group"><label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" bind:checked={showCursor}       onchange={onShowCursor}       style="width:auto;margin:0;"><span>Mouse cursor</span></label></div>
    <div class="control-group"><label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" bind:checked={showPenShadow}    onchange={onShowPenShadow}    style="width:auto;margin:0;"><span>Pen shadow</span></label></div>
    <div class="control-group"><label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" bind:checked={showCheckerboard} onchange={onShowCheckerboard} style="width:auto;margin:0;"><span>Tablet checkerboard</span></label></div>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════════════════════
     Pointer tracking flyout
     ═══════════════════════════════════════════════════════════════════════════ -->
<div id="pointer-tracking-flyout" class="flyout-panel" class:open={openFlyout === 'pointer-tracking'}>
  <div class="flyout-header">
    <h3>Pointer Tracking</h3>
    <button class="flyout-close-btn" onclick={() => openFlyout = null}>×</button>
  </div>
  <div class="flyout-content">
    <SliderControl label="Cursor X offset" bind:value={cursorOffsetX} min={-5} max={5} step={0.05} decimals={2} unit=" in" oninput={onCursorOffsetX} />
    <SliderControl label="Cursor Y offset" bind:value={cursorOffsetY} min={-5} max={5} step={0.05} decimals={2} unit=" in" oninput={onCursorOffsetY} />
    <SliderControl label="Tilt Compensation PosTiltX" bind:value={compPosTiltX} min={0} max={1} step={0.05} decimals={2} oninput={onCompPosTiltX} />
    <SliderControl label="Tilt Compensation NegTiltX" bind:value={compNegTiltX} min={0} max={1} step={0.05} decimals={2} oninput={onCompNegTiltX} />
    <SliderControl label="Tilt Compensation PosTiltY" bind:value={compPosTiltY} min={0} max={1} step={0.05} decimals={2} oninput={onCompPosTiltY} />
    <SliderControl label="Tilt Compensation NegTiltY" bind:value={compNegTiltY} min={0} max={1} step={0.05} decimals={2} oninput={onCompNegTiltY} />
    <SliderControl label="Scaling factor" bind:value={scalingFactor} min={0} max={2} step={0.05} decimals={2} oninput={onScalingFactor} />
    <SliderControl label="Edge attraction" bind:value={edgeAttraction} min={-1} max={1} step={0.05} decimals={2} oninput={onEdgeAttraction} />
    <SliderControl label="Edge attraction range" bind:value={edgeAttractionRange} min={0} max={5} step={0.1} decimals={2} unit=" in" oninput={onEdgeAttractionRange} />
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════════════════════
     Animations flyout
     ═══════════════════════════════════════════════════════════════════════════ -->
<div id="animations-flyout" class="flyout-panel" class:open={openFlyout === 'animations'}>
  <div class="flyout-header">
    <h3>Animations</h3>
    <button class="flyout-close-btn" onclick={() => openFlyout = null}>×</button>
  </div>
  <div class="flyout-content">
    <button class="action-btn" onclick={runDemo}>Demo</button>
    <button class="action-btn" onclick={runAnimAll}>Anim Rot all</button>
    <button class="action-btn" onclick={runAnimAltitude}>Anim Tilt Altitude</button>
    <button class="action-btn" onclick={runAnimAzimuth}>Anim Tilt Azimuth</button>
    <button class="action-btn" onclick={runAnimBarrel}>Anim Barrel</button>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════════════════════
     Camera edit modal
     ═══════════════════════════════════════════════════════════════════════════ -->
{#if cameraModalOpen}
<div id="camera-edit-modal" style="display:flex;" onclick={(e) => { if (e.target === e.currentTarget) cameraModalOpen = false; }}>
  <div class="modal-content">
    <h2>Edit Camera Settings</h2>
    <textarea id="camera-json-editor" bind:value={cameraJsonText}></textarea>
    <div class="modal-actions">
      <button id="camera-edit-cancel" onclick={() => cameraModalOpen = false}>CANCEL</button>
      <button id="camera-edit-ok" onclick={applyCameraSettings}>OK</button>
    </div>
  </div>
</div>
{/if}
