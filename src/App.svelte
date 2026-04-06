<script>
  import { onMount } from 'svelte';
  import { Pen3DSim } from './lib/sim/index.js';
  import LeftPanel from './lib/LeftPanel.svelte';
  import AnnotationSettings from './lib/AnnotationSettings.svelte';
  import PointerTrackingSettings from './lib/PointerTrackingSettings.svelte';
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
  let penDisplayMode   = $state(false);

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
  let showCameraInfo  = $state(false);
  let cameraPos       = $state({ x: 0, y: 0, z: 0 });
  let cameraTarget    = $state({ x: 0, y: 0, z: 0 });

  // ── Camera views ───────────────────────────────────────────────────────────
  const cameraViews = [
    {
      name: 'DEFAULT',
      pos: { x: 1.30, y: 38.39, z: 61.98 },
      target: { x: 1.83, y: 0, z: -3.93 },
    },
    {
      name: 'DEFAULT_ZOOMED',
      pos: { x: -0.91, y: 0.92, z: 0.80 },
      target: { x: 0.26, y: 0, z: -0.18 },
    },
    {
      name: 'TOP_DOWN',
      pos: { x: 0.26, y: 28.07, z: -0.18 },
      target: { x: 0.26, y: 0, z: -0.18 },
    },
    {
      name: 'CURRENTDEFAULT',
      pos: { x: -19.15, y: 15, z: 16.07 },
      target: { x: 0, y: 0, z: 0 },
    },
  ];

  function onViewChange(e) {
    const name = e.target.value;
    if (!name) return;
    const view = cameraViews.find(v => v.name === name);
    if (view) sim.setCameraView(view.pos, view.target);
    e.target.value = ''; // reset dropdown
  }

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

    // Live camera info callback
    sim.onCameraUpdate = (info) => {
      if (!showCameraInfo) return;
      cameraPos    = { x: info.posX, y: info.posY, z: info.posZ };
      cameraTarget = { x: info.targetX, y: info.targetY, z: info.targetZ };
    };

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
  function onPenDisplayMode()   { sim.setPenDisplayMode(penDisplayMode); }

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

  // ── Keyboard ───────────────────────────────────────────────────────────────

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      openFlyout = null;
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} onresize={() => sim?.onResize()} />

<!-- ═══════════════════════════════════════════════════════════════════════════
     Control panel
     ═══════════════════════════════════════════════════════════════════════════ -->
<LeftPanel
  bind:distance
  bind:tabletX
  bind:tabletY
  bind:tiltAltitude
  bind:tiltAzimuth
  bind:barrelRotation
  bind:axonometric
  bind:penDisplayMode
  {azimuthDisabled}
  {tiltXDisplay}
  {tiltYDisplay}
  {onDistance}
  {onTabletX}
  {onTabletY}
  {onAltitude}
  {onAzimuth}
  {onBarrel}
  {onAxonometric}
  {onPenDisplayMode}
  bind:showCameraInfo
  {cameraPos}
  {cameraTarget}
  {cameraViews}
  {onViewChange}
  onToggleFlyout={toggleFlyout}
  onResetPen={resetPen}
  onExportPNG={(w, h) => sim?.exportAsPNG(w, h)}
/>

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
    <AnnotationSettings
      bind:showAltitude
      bind:showAzimuth
      bind:showTiltX
      bind:showTiltY
      bind:showBarrel
      bind:showAxis
      bind:showCursor
      bind:showPenShadow
      bind:showCheckerboard
      {onShowAltitude}
      {onShowAzimuth}
      {onShowTiltX}
      {onShowTiltY}
      {onShowBarrel}
      {onShowAxis}
      {onShowCursor}
      {onShowPenShadow}
      {onShowCheckerboard}
      onAllOn={allAnnotationsOn}
      onAllOff={allAnnotationsOff}
    />
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
    <PointerTrackingSettings
      bind:cursorOffsetX
      bind:cursorOffsetY
      bind:compPosTiltX
      bind:compNegTiltX
      bind:compPosTiltY
      bind:compNegTiltY
      bind:scalingFactor
      bind:edgeAttraction
      bind:edgeAttractionRange
      {onCursorOffsetX}
      {onCursorOffsetY}
      {onCompPosTiltX}
      {onCompNegTiltX}
      {onCompPosTiltY}
      {onCompNegTiltY}
      {onScalingFactor}
      {onEdgeAttraction}
      {onEdgeAttractionRange}
    />
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

