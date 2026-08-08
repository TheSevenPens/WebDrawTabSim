<script>
  import { onMount } from 'svelte';
  import { Pen3DSim } from './lib/sim/index.js';
  import LeftPanel from './lib/LeftPanel.svelte';
  import CursorModeControl from './lib/CursorModeControl.svelte';
  import PointerTrackingSettings from './lib/PointerTrackingSettings.svelte';
  import CheckboxControl from './lib/CheckboxControl.svelte';
  import { runParameterAnimation } from './lib/sim/animations.js';
  import { DEFAULT_PEN, DEMO_POSE, POINTER_DEFAULTS, ANIMATION, EXPORT, SCALE } from './lib/sim/config.js';

  // ── DOM reference ──────────────────────────────────────────────────────────
  let viewer = $state();
  let sim;

  // ── Pen state (tablet coordinates) ────────────────────────────────────────
  let distance       = $state(DEFAULT_PEN.distance);
  let tabletX        = $state(DEFAULT_PEN.tabletX);
  let tabletY        = $state(DEFAULT_PEN.tabletY);
  let tiltAltitude   = $state(0);
  let tiltAzimuth    = $state(0);
  let barrelRotation = $state(0);
  let azimuthDisabled = $state(true);

  // ── Annotation / display state ─────────────────────────────────────────────
  let showAltitude     = $state(false);
  let showAzimuth      = $state(false);
  let showTiltX        = $state(false);
  let showTiltY        = $state(false);
  let showBarrel       = $state(false);
  let showPenTopLine   = $state(true);   // yellow drop line from the pen top
  let showPenAxisLine  = $state(true);   // white tip → surface axis line
  let showPenTipLine   = $state(true);   // yellow vertical tip → surface-below line
  let showAxis         = $state(false);
  let cursorMode       = $state('mouse'); // 'mouse' | 'crosshairs' | 'none'
  let showPenShadow    = $state(true);
  let showCheckerboard = $state(false);
  let showGrid         = $state(true);   // active-area line grid
  let showMonitor      = $state(true);   // external monitor visibility
  let axonometric      = $state(false);
  let penDisplayMode   = $state(false);
  let darkTablet       = $state(false);
  let sharpNib         = $state(false);
  let penBodyFormat    = $state('checkerboard'); // 'checkerboard' | 'solid'
  let aspectRatio      = $state('16 / 9'); // CSS aspect-ratio for #viewer

  // ── Pointer-tracking state ─────────────────────────────────────────────────
  let cursorOffsetX       = $state(0);
  let cursorOffsetY       = $state(0);
  let compPosTiltX        = $state(0);
  let compNegTiltX        = $state(0);
  let compPosTiltY        = $state(0);
  let compNegTiltY        = $state(0);
  let scalingFactor       = $state(1);
  let edgeAttraction      = $state(0);
  let edgeAttractionRange = $state(POINTER_DEFAULTS.edgeAttractionRange);
  let mouseSensitivity    = $state(POINTER_DEFAULTS.mouseSensitivity);

  // ── Flyout / modal state ───────────────────────────────────────────────────
  let openFlyout      = $state(null); // 'pointer-tracking' | null
  let cameraAzimuth   = $state(0);
  let cameraElevation = $state(0);
  let cameraDistance  = $state(0);

  // ── Camera views ───────────────────────────────────────────────────────────
  // Preset views were authored in the original scale; scale to the mm world.
  const cameraViews = [
    {
      name: 'DEFAULT',
      pos: { x: 1.30 * SCALE, y: 38.39 * SCALE, z: 61.98 * SCALE },
      target: { x: 1.83 * SCALE, y: 0, z: -3.93 * SCALE },
    },
    {
      name: 'DEFAULT_ZOOMED',
      pos: { x: -0.91 * SCALE, y: 0.92 * SCALE, z: 0.80 * SCALE },
      target: { x: 0.26 * SCALE, y: 0, z: -0.18 * SCALE },
    },
    {
      name: 'TOP_DOWN',
      pos: { x: 0.26 * SCALE, y: 28.07 * SCALE, z: -0.18 * SCALE },
      target: { x: 0.26 * SCALE, y: 0, z: -0.18 * SCALE },
    },
    {
      name: 'CURRENTDEFAULT',
      pos: { x: -19.15 * SCALE, y: 15 * SCALE, z: 16.07 * SCALE },
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

  // Export dimensions follow the selected viewport aspect: the vertical
  // resolution stays 1080 ("1080p") / 2160 ("4K"), width is derived from it.
  function exportDims(height) {
    const [aw, ah] = aspectRatio.split('/').map(Number);
    return [Math.round(height * (aw / ah)), height];
  }

  async function onExportAction(action) {
    if (!sim || !action) return;
    const { hd, uhd } = EXPORT;
    try {
      if (action === 'png-hd')        sim.exportAsPNG(...exportDims(hd.height));
      else if (action === 'png-uhd')  sim.exportAsPNG(...exportDims(uhd.height));
      else if (action === 'copy-hd')  { await sim.copyPNGToClipboard(...exportDims(hd.height)); flashExportStatus('Copied 1080p to clipboard'); }
      else if (action === 'copy-uhd') { await sim.copyPNGToClipboard(...exportDims(uhd.height)); flashExportStatus('Copied 4K to clipboard'); }
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

    // Live camera readout for the rotation/distance controls (guarded so idle
    // frames don't churn reactive state).
    sim.onCameraUpdate = (info) => {
      const az = Math.round(info.azimuth);
      const el = Math.round(info.elevation);
      const dist = Math.round(info.distance * 10) / 10;
      if (az !== cameraAzimuth)     cameraAzimuth = az;
      if (el !== cameraElevation)   cameraElevation = el;
      if (dist !== cameraDistance)  cameraDistance = dist;
    };

    // Apply initial checkbox state
    sim.setAzimuthAnnotationsVisible(showAzimuth);
    sim.setCursorMode(cursorMode);
    sim.setPenTopLineVisible(showPenTopLine);
    sim.setPenAxisLineVisible(showPenAxisLine);
    sim.setPenTipLineVisible(showPenTipLine);
    sim.setPenBodyFormat(penBodyFormat);
    sim.setGridVisible(showGrid);
    sim.setPenShadowVisible(showPenShadow);
    sim.setAxisMarkersVisible(showAxis);
    sim.setMonitorVisible(showMonitor);

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
    sim.setTiltAltitude(tiltAltitude);
    updateAzimuthState();
  }

  function onAzimuth() {
    sim.setTiltAzimuth(tiltAzimuth);
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
  function onShowPenTopLine()   { sim.setPenTopLineVisible(showPenTopLine); }
  function onShowPenAxisLine()  { sim.setPenAxisLineVisible(showPenAxisLine); }
  function onShowPenTipLine()   { sim.setPenTipLineVisible(showPenTipLine); }
  function onShowAxis()         { sim.setAxisMarkersVisible(showAxis); }
  function onShowMonitor()      { sim.setMonitorVisible(showMonitor); }
  function onCursorMode()       { sim.setCursorMode(cursorMode); }
  function onShowPenShadow()    { sim.setPenShadowVisible(showPenShadow); }
  function onShowCheckerboard() { sim.setTabletCheckerboardVisible(showCheckerboard); }
  function onShowGrid()         { sim.setGridVisible(showGrid); }
  function onAxonometric()      { sim.setAxonometricView(axonometric); }
  function onPenDisplayMode()   { sim.setPenDisplayMode(penDisplayMode); }
  function onDarkTablet()       { sim.setDarkTablet(darkTablet); }
  function onSharpNib()         { sim.setNibShape(sharpNib ? 'sharp' : 'rounded'); }
  function onPenBodyFormat()    { sim.setPenBodyFormat(penBodyFormat); }

  function onAspectRatio(value) {
    aspectRatio = value;
    const [aw, ah] = value.split('/').map(Number);
    sim?.setViewportAspect(aw, ah);   // re-fit the canvas to the new aspect
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
    sim.setTiltAzimuth(demo.tiltAzimuth);
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
        sim.setTiltAzimuth(current.tiltAzimuth);
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
        sim.setTiltAltitude(tiltAltitude);
        sim.setTiltAzimuth(curAzimuth);
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
        sim.setTiltAzimuth(tiltAzimuth);
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

  // ── Keyboard ───────────────────────────────────────────────────────────────

  function handleKeyDown(e) {
    if (e.key === 'Escape') openFlyout = null;
  }
</script>

<svelte:window onkeydown={handleKeyDown} onresize={() => sim?.onResize()} />

<!-- Scene tab contents, passed to LeftPanel as snippets (state stays here). -->
{#snippet sceneAnnTab()}
  <CursorModeControl
    bind:cursorMode
    {onCursorMode}
  />
{/snippet}

{#snippet animationsTab()}
  <button class="action-btn" onclick={runDemo}>Demo</button>
  <button class="action-btn" onclick={runAnimAll}>Anim Rot all</button>
  <button class="action-btn" onclick={runAnimAltitude}>Anim Tilt Altitude</button>
  <button class="action-btn" onclick={runAnimAzimuth}>Anim Tilt Azimuth</button>
  <button class="action-btn" onclick={runAnimBarrel}>Anim Barrel</button>
{/snippet}

{#snippet penAnnTab()}
  <div style="display:flex;gap:16px;">
    <!-- Left column: rotation annotations -->
    <div style="flex:1;">
      <CheckboxControl label="Tilt altitude"   bind:checked={showAltitude}   onchange={onShowAltitude} />
      <CheckboxControl label="Tilt azimuth"    bind:checked={showAzimuth}    onchange={onShowAzimuth} />
      <CheckboxControl label="Tilt X"          bind:checked={showTiltX}      onchange={onShowTiltX} />
      <CheckboxControl label="Tilt Y"          bind:checked={showTiltY}      onchange={onShowTiltY} />
      <CheckboxControl label="Barrel rotation" bind:checked={showBarrel}     onchange={onShowBarrel} />
    </div>
    <!-- Right column: line annotations -->
    <div style="flex:1;">
      <CheckboxControl label="Pen top line"  bind:checked={showPenTopLine}  onchange={onShowPenTopLine} />
      <CheckboxControl label="Pen axis line" bind:checked={showPenAxisLine} onchange={onShowPenAxisLine} />
      <CheckboxControl label="Pen tip line"  bind:checked={showPenTipLine}  onchange={onShowPenTipLine} />
    </div>
  </div>
{/snippet}


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
  bind:penDisplayMode
  bind:darkTablet
  bind:sharpNib
  {onSharpNib}
  bind:penBodyFormat
  {onPenBodyFormat}
  bind:showPenShadow
  {onShowPenShadow}
  {azimuthDisabled}
  {onDistance}
  {onTabletX}
  {onTabletY}
  {onAltitude}
  {onAzimuth}
  {onBarrel}
  {onPenDisplayMode}
  {penAnnTab}
  {sceneAnnTab}
  {animationsTab}
  bind:axonometric
  {onAxonometric}
  {onDarkTablet}
  bind:showCheckerboard
  {onShowCheckerboard}
  bind:showGrid
  {onShowGrid}
  bind:showAxis
  {onShowAxis}
  bind:showMonitor
  {onShowMonitor}
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
  {aspectRatio}
  {onAspectRatio}
/>

{#if exportStatus}
  <div class="export-toast">{exportStatus}</div>
{/if}

<!-- ═══════════════════════════════════════════════════════════════════════════
     3D Viewer
     ═══════════════════════════════════════════════════════════════════════════ -->
<div id="viewer" bind:this={viewer}></div>

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

