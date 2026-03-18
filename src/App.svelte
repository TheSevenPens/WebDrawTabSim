<script>
  import { onMount } from 'svelte';
  import { Pen3DSim } from './lib/sim/index.js';
  import SliderControl from './lib/SliderControl.svelte';
  import { runParameterAnimation } from './lib/sim/animations.js';

  // ── DOM reference ──────────────────────────────────────────────────────────
  let viewer;
  let sim;

  // ── Pen state (tablet coordinates) ────────────────────────────────────────
  let distance      = 0;
  let tabletX       = 8;
  let tabletY       = 4.5;
  let tiltAltitude  = 0;
  let tiltAzimuth   = 0;
  let barrelRotation = 0;
  let tiltXDisplay  = '0.0';
  let tiltYDisplay  = '0.0';
  let azimuthDisabled = true;

  // ── Annotation / display state ─────────────────────────────────────────────
  let showAltitude     = false;
  let showAzimuth      = false;
  let showTiltX        = false;
  let showTiltY        = false;
  let showBarrel       = false;
  let showAxis         = false;
  let showCursor       = true;
  let showPenShadow    = true;
  let showCheckerboard = false;
  let axonometric      = false;

  // ── Pointer-tracking state ─────────────────────────────────────────────────
  let cursorOffsetX            = 0;
  let cursorOffsetY            = 0;
  let compPosTiltX             = 0;
  let compNegTiltX             = 0;
  let compPosTiltY             = 0;
  let compNegTiltY             = 0;
  let scalingFactor            = 1;
  let edgeAttraction           = 0;
  let edgeAttractionRange      = 1;

  // ── Flyout / modal state ───────────────────────────────────────────────────
  let openFlyout = null; // 'pointer-tracking' | 'annotations' | 'animations' | null
  let cameraModalOpen = false;
  let cameraJsonText  = '';

  // ── Animation cancel handles ───────────────────────────────────────────────
  let cancelMainAnimation      = null;
  let cancelAltitudeAnimation  = null;
  let cancelAzimuthAnimation   = null;
  let cancelBarrelAnimation    = null;

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

<svelte:window on:keydown={handleKeyDown} on:resize={() => sim?.onResize()} />

<!-- ═══════════════════════════════════════════════════════════════════════════
     Control panel
     ═══════════════════════════════════════════════════════════════════════════ -->
<div id="control-panel">
  <h1>SevenPens DrawTabSim</h1>

  <SliderControl label="Z: (Hover distance)" bind:value={distance} min={0} max={1} step={0.05} decimals={2} unit=" in" on:input={onDistance} />

  <SliderControl label="X" bind:value={tabletX} min={0} max={16} step={0.1} decimals={1} unit=" in" on:input={onTabletX} />

  <SliderControl label="Y" bind:value={tabletY} min={0} max={9} step={0.1} decimals={1} unit=" in" on:input={onTabletY} />

  <SliderControl label="Tilt altitude" bind:value={tiltAltitude} min={0} max={60} step={1} decimals={0} unit="°" on:input={onAltitude} />

  <SliderControl label="Tilt azimuth" bind:value={tiltAzimuth} min={0} max={359} step={1} decimals={0} unit="°" disabled={azimuthDisabled} on:input={onAzimuth} />

  <SliderControl label="Barrel rotation" bind:value={barrelRotation} min={0} max={359} step={1} decimals={0} unit="°" on:input={onBarrel} />

  <div class="control-group">
    <label>Tilt X: <span class="slider-value">{tiltXDisplay}°</span></label>
  </div>

  <div class="control-group">
    <label>Tilt Y: <span class="slider-value">{tiltYDisplay}°</span></label>
  </div>

  <button class="action-btn" id="pointer-tracking-flyout-btn" on:click={() => toggleFlyout('pointer-tracking')}>Pointer tracking</button>
  <button class="action-btn" id="annotations-flyout-btn" on:click={() => toggleFlyout('annotations')}>Annotations</button>

  <div class="checkbox-grid">
    <div class="control-group">
      <label style="display:flex;align-items:center;gap:8px;">
        <input type="checkbox" bind:checked={axonometric} on:change={onAxonometric} style="width:auto;margin:0;">
        <span>Axonometric</span>
      </label>
    </div>
  </div>

  <button class="action-btn" on:click={resetPen}>Reset pen</button>
  <button class="action-btn" id="animations-flyout-btn" on:click={() => toggleFlyout('animations')}>Animations</button>
  <button class="action-btn" on:click={openCameraModal}>Edit View</button>
  <button class="action-btn" on:click={() => sim?.exportAsPNG()}>Export as PNG</button>
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
    <button class="flyout-close-btn" on:click={() => openFlyout = null}>×</button>
  </div>
  <div class="flyout-content">
    <div style="display:flex;gap:8px;margin-bottom:12px;">
      <button class="action-btn" style="flex:1;" on:click={allAnnotationsOn}>All On</button>
      <button class="action-btn" style="flex:1;" on:click={allAnnotationsOff}>All Off</button>
    </div>
    <div class="control-group"><label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" bind:checked={showAltitude}     on:change={onShowAltitude}     style="width:auto;margin:0;"><span>Tilt altitude</span></label></div>
    <div class="control-group"><label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" bind:checked={showAzimuth}      on:change={onShowAzimuth}      style="width:auto;margin:0;"><span>Tilt azimuth</span></label></div>
    <div class="control-group"><label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" bind:checked={showTiltX}        on:change={onShowTiltX}        style="width:auto;margin:0;"><span>Tilt X</span></label></div>
    <div class="control-group"><label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" bind:checked={showTiltY}        on:change={onShowTiltY}        style="width:auto;margin:0;"><span>Tilt Y</span></label></div>
    <div class="control-group"><label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" bind:checked={showBarrel}       on:change={onShowBarrel}       style="width:auto;margin:0;"><span>Barrel rotation</span></label></div>
    <div class="control-group"><label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" bind:checked={showAxis}         on:change={onShowAxis}         style="width:auto;margin:0;"><span>Axis</span></label></div>
    <div class="control-group"><label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" bind:checked={showCursor}       on:change={onShowCursor}       style="width:auto;margin:0;"><span>Mouse cursor</span></label></div>
    <div class="control-group"><label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" bind:checked={showPenShadow}    on:change={onShowPenShadow}    style="width:auto;margin:0;"><span>Pen shadow</span></label></div>
    <div class="control-group"><label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" bind:checked={showCheckerboard} on:change={onShowCheckerboard} style="width:auto;margin:0;"><span>Tablet checkerboard</span></label></div>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════════════════════
     Pointer tracking flyout
     ═══════════════════════════════════════════════════════════════════════════ -->
<div id="pointer-tracking-flyout" class="flyout-panel" class:open={openFlyout === 'pointer-tracking'}>
  <div class="flyout-header">
    <h3>Pointer Tracking</h3>
    <button class="flyout-close-btn" on:click={() => openFlyout = null}>×</button>
  </div>
  <div class="flyout-content">
    <SliderControl label="Cursor X offset" bind:value={cursorOffsetX} min={-5} max={5} step={0.05} decimals={2} unit=" in" on:input={onCursorOffsetX} />
    <SliderControl label="Cursor Y offset" bind:value={cursorOffsetY} min={-5} max={5} step={0.05} decimals={2} unit=" in" on:input={onCursorOffsetY} />
    <SliderControl label="Tilt Compensation PosTiltX" bind:value={compPosTiltX} min={0} max={1} step={0.05} decimals={2} on:input={onCompPosTiltX} />
    <SliderControl label="Tilt Compensation NegTiltX" bind:value={compNegTiltX} min={0} max={1} step={0.05} decimals={2} on:input={onCompNegTiltX} />
    <SliderControl label="Tilt Compensation PosTiltY" bind:value={compPosTiltY} min={0} max={1} step={0.05} decimals={2} on:input={onCompPosTiltY} />
    <SliderControl label="Tilt Compensation NegTiltY" bind:value={compNegTiltY} min={0} max={1} step={0.05} decimals={2} on:input={onCompNegTiltY} />
    <SliderControl label="Scaling factor" bind:value={scalingFactor} min={0} max={2} step={0.05} decimals={2} on:input={onScalingFactor} />
    <SliderControl label="Edge attraction" bind:value={edgeAttraction} min={-1} max={1} step={0.05} decimals={2} on:input={onEdgeAttraction} />
    <SliderControl label="Edge attraction range" bind:value={edgeAttractionRange} min={0} max={5} step={0.1} decimals={2} unit=" in" on:input={onEdgeAttractionRange} />
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════════════════════
     Animations flyout
     ═══════════════════════════════════════════════════════════════════════════ -->
<div id="animations-flyout" class="flyout-panel" class:open={openFlyout === 'animations'}>
  <div class="flyout-header">
    <h3>Animations</h3>
    <button class="flyout-close-btn" on:click={() => openFlyout = null}>×</button>
  </div>
  <div class="flyout-content">
    <button class="action-btn" on:click={runDemo}>Demo</button>
    <button class="action-btn" on:click={runAnimAll}>Anim Rot all</button>
    <button class="action-btn" on:click={runAnimAltitude}>Anim Tilt Altitude</button>
    <button class="action-btn" on:click={runAnimAzimuth}>Anim Tilt Azimuth</button>
    <button class="action-btn" on:click={runAnimBarrel}>Anim Barrel</button>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════════════════════
     Camera edit modal
     ═══════════════════════════════════════════════════════════════════════════ -->
{#if cameraModalOpen}
<div id="camera-edit-modal" style="display:flex;" on:click|self={() => cameraModalOpen = false}>
  <div class="modal-content">
    <h2>Edit Camera Settings</h2>
    <textarea id="camera-json-editor" bind:value={cameraJsonText}></textarea>
    <div class="modal-actions">
      <button id="camera-edit-cancel" on:click={() => cameraModalOpen = false}>CANCEL</button>
      <button id="camera-edit-ok" on:click={applyCameraSettings}>OK</button>
    </div>
  </div>
</div>
{/if}
