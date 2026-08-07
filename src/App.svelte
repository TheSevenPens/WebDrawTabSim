<script>
  import { onMount } from 'svelte';
  import { Pen3DSim } from './lib/sim/index.js';
  import LeftPanel from './lib/LeftPanel.svelte';
  import AnnotationSettings from './lib/AnnotationSettings.svelte';
  import PointerTrackingSettings from './lib/PointerTrackingSettings.svelte';
  import { runParameterAnimation } from './lib/sim/animations.js';
  import { DEMO_POSE, POINTER_DEFAULTS, ANIMATION, EXPORT } from './lib/sim/config.js';

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
  let darkTablet       = $state(false);

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
  let mouseSensitivity    = $state(POINTER_DEFAULTS.mouseSensitivity);

  // ── Flyout / modal state ───────────────────────────────────────────────────
  let openFlyout      = $state(null); // 'pointer-tracking' | 'annotations' | 'animations' | null
  let showCameraInfo  = $state(false);
  let showCameraEdit  = $state(false);
  let cameraJsonText  = $state('');
  let cameraEditError = $state('');
  let cameraPos       = $state({ x: 0, y: 0, z: 0 });
  let cameraTarget    = $state({ x: 0, y: 0, z: 0 });
  let cameraAzimuth   = $state(0);
  let cameraElevation = $state(0);
  let cameraDistance  = $state(0);

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

  // ── Export / copy image ────────────────────────────────────────────────────
  let exportStatus = $state('');
  let exportStatusTimer = null;

  function flashExportStatus(msg) {
    exportStatus = msg;
    if (exportStatusTimer) clearTimeout(exportStatusTimer);
    exportStatusTimer = setTimeout(() => { exportStatus = ''; }, 2500);
  }

  function onRotateCamera(deltaAzimuth, deltaElevation) {
    sim?.rotateCamera(deltaAzimuth, deltaElevation);
  }

  function onChangeDistance(delta) {
    sim?.changeCameraDistance(delta);
  }

  function onPointCameraAt(name) {
    sim?.pointCameraAt(name);
  }

  async function onExportAction(action) {
    if (!sim || !action) return;
    const { hd, uhd } = EXPORT;
    try {
      if (action === 'png-hd')        sim.exportAsPNG(hd.width, hd.height);
      else if (action === 'png-uhd')  sim.exportAsPNG(uhd.width, uhd.height);
      else if (action === 'copy-hd')  { await sim.copyPNGToClipboard(hd.width, hd.height); flashExportStatus('Copied 1080p to clipboard'); }
      else if (action === 'copy-uhd') { await sim.copyPNGToClipboard(uhd.width, uhd.height); flashExportStatus('Copied 4K to clipboard'); }
    } catch (err) {
      flashExportStatus(`Copy failed: ${err.message}`);
    }
  }

  // ── Animation cancel handles ───────────────────────────────────────────────
  let cancelMainAnimation = null;
  let cancelParamAnimation = null;

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

  /**
   * Generic single-parameter animation used by altitude / azimuth / barrel buttons.
   * @param {{ start: number, end: number, angular?: boolean,
   *           apply: (value: number) => void }} opts
   */
  function runParamAnim({ start, end, angular = false, apply }) {
    openFlyout = null;
    if (cancelParamAnimation) cancelParamAnimation();
    setTimeout(() => {
      apply(start);
      cancelParamAnimation = runParameterAnimation(sim, ANIMATION.durationMs, (eased, progress) => {
        const value = angular
          ? sim.interpolateAngle(start, end, eased)
          : start + (end - start) * eased;
        apply(value);
        if (progress >= 1) cancelParamAnimation = null;
      });
    }, ANIMATION.startDelayMs);
  }

  // ── Mount ──────────────────────────────────────────────────────────────────

  onMount(() => {
    sim = new Pen3DSim(viewer);

    // Live camera info callback. Rotation always updates (guarded so idle
    // frames don't churn); position/target only when the info panel is shown.
    sim.onCameraUpdate = (info) => {
      const az = Math.round(info.azimuth);
      const el = Math.round(info.elevation);
      const dist = Math.round(info.distance * 10) / 10;
      if (az !== cameraAzimuth)     cameraAzimuth = az;
      if (el !== cameraElevation)   cameraElevation = el;
      if (dist !== cameraDistance)  cameraDistance = dist;
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
  function onMouseSensitivity()  { sim.setMouseSensitivity(mouseSensitivity); }

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
  function onDarkTablet()       { sim.setDarkTablet(darkTablet); }

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
    const demo = { ...DEMO_POSE };
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
    }, ANIMATION.startDelayMs);
  }

  // ── Individual animations ──────────────────────────────────────────────────

  function runAnimAltitude() {
    const curAzimuth = tiltAzimuth;
    runParamAnim({
      start: 0,
      end: ANIMATION.altitudeEnd,
      apply: (value) => {
        tiltAltitude = value;
        tiltAzimuth = curAzimuth;
        const result = sim.setTiltAltitude(tiltAltitude);
        sim.setTiltAzimuth(curAzimuth);
        setTiltXY(result);
        updateAzimuthState();
      },
    });
  }

  function runAnimAzimuth() {
    const curAlt = tiltAltitude;
    runParamAnim({
      start: 0,
      end: ANIMATION.azimuthEnd,
      angular: true,
      apply: (value) => {
        tiltAltitude = curAlt;
        tiltAzimuth = value;
        sim.setTiltAltitude(curAlt);
        const result = sim.setTiltAzimuth(tiltAzimuth);
        setTiltXY(result);
        updateAzimuthState();
      },
    });
  }

  function runAnimBarrel() {
    runParamAnim({
      start: 0,
      end: ANIMATION.barrelEnd,
      angular: true,
      apply: (value) => {
        barrelRotation = value;
        sim.setBarrelRotation(barrelRotation);
      },
    });
  }

  // ── Camera settings edit (inline error, no alert) ──────────────────────────

  function openCameraEdit() {
    cameraEditError = '';
    try {
      cameraJsonText = sim.getCameraSettingsJSON();
      showCameraEdit = true;
    } catch (error) {
      cameraEditError = `Error loading camera settings: ${error.message}`;
      showCameraEdit = true;
    }
  }

  function closeCameraEdit() {
    showCameraEdit = false;
    cameraEditError = '';
  }

  function applyCameraEdit() {
    try {
      sim.setCameraSettingsJSON(cameraJsonText);
      cameraEditError = '';
      showCameraEdit = false;
    } catch (error) {
      cameraEditError = `Error applying camera settings: ${error.message}`;
    }
  }

  // ── Keyboard ───────────────────────────────────────────────────────────────

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      if (showCameraEdit) closeCameraEdit();
      else openFlyout = null;
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
  bind:darkTablet
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
  {onDarkTablet}
  bind:showCameraInfo
  {cameraPos}
  {cameraTarget}
  {cameraAzimuth}
  {cameraElevation}
  {cameraDistance}
  {onRotateCamera}
  {onChangeDistance}
  {onPointCameraAt}
  {cameraViews}
  {onViewChange}
  onToggleFlyout={toggleFlyout}
  onResetPen={resetPen}
  {onExportAction}
  onEditCamera={openCameraEdit}
/>

{#if exportStatus}
  <div class="export-toast">{exportStatus}</div>
{/if}

<!-- ═══════════════════════════════════════════════════════════════════════════
     3D Viewer
     ═══════════════════════════════════════════════════════════════════════════ -->
<div id="viewer" bind:this={viewer}></div>

<!-- ═══════════════════════════════════════════════════════════════════════════
     Camera settings modal (inline errors, no alert)
     ═══════════════════════════════════════════════════════════════════════════ -->
{#if showCameraEdit}
<div
  id="camera-edit-modal"
  style="display:flex;"
  role="presentation"
  onclick={(e) => { if (e.target === e.currentTarget) closeCameraEdit(); }}
  onkeydown={(e) => { if (e.key === 'Escape') closeCameraEdit(); }}
>
  <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="camera-edit-title">
    <h2 id="camera-edit-title">Camera Settings</h2>
    <textarea id="camera-json-editor" bind:value={cameraJsonText} spellcheck="false"></textarea>
    {#if cameraEditError}
      <p class="camera-edit-error">{cameraEditError}</p>
    {/if}
    <div class="modal-actions">
      <button id="camera-edit-cancel" type="button" onclick={closeCameraEdit}>Cancel</button>
      <button id="camera-edit-ok" type="button" onclick={applyCameraEdit}>Apply</button>
    </div>
  </div>
</div>
{/if}

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
      bind:mouseSensitivity
      {onCursorOffsetX}
      {onCursorOffsetY}
      {onCompPosTiltX}
      {onCompNegTiltX}
      {onCompPosTiltY}
      {onCompNegTiltY}
      {onScalingFactor}
      {onEdgeAttraction}
      {onEdgeAttractionRange}
      {onMouseSensitivity}
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

<style>
  .export-toast {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(20, 22, 26, 0.92);
    color: #eee;
    padding: 8px 16px;
    border-radius: 6px;
    border: 1px solid #4a90d9;
    font-size: 13px;
    z-index: 1000;
    pointer-events: none;
  }
</style>

