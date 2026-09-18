<script>
  import { onMount } from 'svelte';
  import { Pen3DSim } from './lib/sim/index.js';
  import LeftPanel from './lib/LeftPanel.svelte';
  import CursorModeControl from './lib/CursorModeControl.svelte';
  import PointerTrackingSettings from './lib/PointerTrackingSettings.svelte';
  import CheckboxControl from './lib/CheckboxControl.svelte';
  import { createPlaybackController } from './lib/sim/playback.js';
  import PlaybackControls from './lib/PlaybackControls.svelte';
  import SampleRecording from './lib/SampleRecording.svelte';
  import sampleSource from './lib/samples/approach-confirmed-stroke-1.json';
  import { createSampleRecording } from './lib/sim/sample-recording.js';
  import { createClip } from './lib/sim/timeline.js';
  import { createTransport } from './lib/sim/transport.js';
  import { DEFAULT_PEN, DEMO_POSE, ANIMATION, EXPORT, SCALE } from './lib/sim/config.js';

  import SceneControls from './lib/SceneControls.svelte';
  import HistoryControls from './lib/HistoryControls.svelte';
  import { attachEditGestures, historyShortcut } from './lib/edit-gestures.js';
  import { createSceneDocument, createSceneController, parseSceneDocument, serializeSceneDocument } from './lib/sim/scene-document.js';
  import { applySceneDocument } from './lib/sim/scene-renderer.js';

  let scene = $state(createSceneDocument());
  let historyStatus = $state({ canUndo: false, canRedo: false, undoLabel: '', redoLabel: '' });
  let editGestures;
  const scenes = createSceneController({
    apply: (next, previous) => applySceneDocument(sim, next, previous),
    onChange: next => { scene = next; },
    onHistoryChange: status => { historyStatus = status; },
  });
  function commitScene(candidate = scene, options = {}) { return scenes.replace(candidate, options); }
  const onSceneEdit = () => commitScene();
  function commitPose(pose, options = {}) { return commitScene({ ...scene, pose: { ...scene.pose, ...pose } }, options); }
  function finishEdit() { editGestures?.finish(); scenes.endEdit(); }
  function syncCamera(record = false, settle = false) {
    if (settle) {
      sim.controls.target.y = Math.max(sim.yOffset, sim.controls.target.y);
      sim.controls.update();
      sim.restoreCameraState(sim.getCameraState());
    }
    const camera = sim.getCameraState();
    if (JSON.stringify(camera) !== JSON.stringify(scene.camera))
      scenes.replace({ ...scene, camera }, { render: false, record, label: 'Camera' });
  }
  function cameraCommand(action) {
    finishEdit();
    action(); syncCamera(true, true);
  }
  function restoreHistory(direction) {
    finishEdit(); playback.cancel(); sim.resetPenInteraction();
    scenes[direction]();
  }
  function saveScene() {
    finishEdit();
    if (playbackStatus.loaded) transport.pause();
    else playback.cancel();
    sim.restoreCameraState(sim.getCameraState());
    return serializeSceneDocument({ ...scene, camera: sim.getCameraState() });
  }
  function loadScene(text) {
    const next = parseSceneDocument(text);
    finishEdit();
    playback.cancel();
    sim.resetPenInteraction();
    scenes.replace(next, { force: true, label: 'Load scene' });
    openFlyout = null;
  }

  // ── DOM reference ──────────────────────────────────────────────────────────
  let viewer = $state();
  let sim;

  // ── Pen state (tablet coordinates) ────────────────────────────────────────
  let azimuthDisabled = $derived(scene.pose.tiltAltitude === 0);

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
    if (view) cameraCommand(() => sim.setCameraView(view.pos, view.target));
    e.target.value = ''; // reset dropdown
  }

  // ── Export / copy image ────────────────────────────────────────────────────
  let exportStatus = $state('');
  let exportStatusTimer = null;

  function flashExportStatus(msg) {
    if (sim?.disposed) return;
    exportStatus = msg;
    if (exportStatusTimer) clearTimeout(exportStatusTimer);
    exportStatusTimer = setTimeout(() => { exportStatus = ''; }, 2500);
  }

  function onRotateCamera(deltaAzimuth, deltaElevation) {
    cameraCommand(() => sim.rotateCamera(deltaAzimuth, deltaElevation));
  }

  function onChangeDistance(delta) {
    cameraCommand(() => sim.changeCameraDistance(delta));
  }

  function onPointCameraAt(name) {
    cameraCommand(() => sim.pointCameraAt(name));
  }

  // Export dimensions follow the selected viewport aspect: the vertical
  // resolution stays 1080 ("1080p") / 2160 ("4K"), width is derived from it.
  function exportDims(height) {
    const [aw, ah] = scene.presentation.aspectRatio.split('/').map(Number);
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
      flashExportStatus(`${action.startsWith('copy-') ? 'Copy' : 'Export'} failed: ${err.message}`);
    }
  }

  // ── Playback ownership ───────────────────────────────────────────────
  const playback = createPlaybackController();
  const sampleRecording = createSampleRecording(sampleSource);
  let sampleActive = $state(false);
  let sampleFrame = $state(null);
  let playbackStatus = $state({ loaded: false, playing: false, time: 0, duration: 0,
    inPoint: 0, outPoint: 0, speed: 1, loop: false, index: null });
  const transport = createTransport({
    onFrame: frame => {
      const { phase, pressure, ...pose } = frame.values;
      commitPose(pose, { record: false });
      if (sampleActive) sampleFrame = frame;
    },
    onChange: status => { playbackStatus = status; },
  });
  const currentPose = () => ({ ...scene.pose });
  function playSample() {
    finishEdit();
    openFlyout = null;
    playback.start(() => {
      if (!sim || sim.disposed) return () => {};
      sampleActive = true;
      const defaults = createSceneDocument();
      commitScene({ ...scene, mapping: defaults.mapping,
        camera: { ...defaults.camera, position: { x: 200, y: 300, z: 450 }, target: { x: 0, y: sim.yOffset, z: 0 } },
        presentation: { ...scene.presentation, axonometric: false, cursorMode: 'crosshairs' } }, { label: 'Sample recording' });
      const cancel = () => {
        transport.clear(); sampleActive = false; sampleFrame = null; sim.animations?.delete(cancel);
      };
      sim.trackAnimation(cancel);
      transport.load(sampleRecording.clip);
      transport.play();
      return cancel;
    });
  }
  function startClip(start, end, showAnnotations = false) {
    finishEdit();
    openFlyout = null;
    playback.start(() => {
      if (!sim || sim.disposed) return () => {};
      if (showAnnotations) {
        scene.annotations.showAltitude = scene.annotations.showAzimuth = scene.annotations.showBarrel = true;
      }
      const cancel = () => { transport.clear(); sim.animations?.delete(cancel); };
      sim.trackAnimation(cancel);
      transport.load(createClip([
        { id: 'start', time: 0, values: start },
        { id: 'end', time: ANIMATION.durationMs, values: end },
      ], { easing: 'cubic', channels: { tiltAzimuth: 'angle', barrelRotation: 'angle' } }));
      transport.play();
      return cancel;
    }, ANIMATION.startDelayMs);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function toggleFlyout(name) {
    openFlyout = openFlyout === name ? null : name;
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
      syncCamera(editGestures?.viewportActive() ?? false);
    };

    applySceneDocument(sim, scene);
    sim.onPoseInput = pose => commitPose(pose);
    sim.onCameraInput = delta => onChangeDistance(delta);

    sim.onPenInteraction = playback.cancel;
    // Capture user edits before bindings/setters; animation writes emit no DOM events.
    const cancelOnEdit = event => {
      if (!event.target.closest?.('[data-playback-controls], [data-scene-controls]')) playback.cancel();
    };
    const appElement = viewer.parentElement;
    editGestures = attachEditGestures({ root: appElement, windowTarget: window,
      onBegin: (label, kind) => {
        if (kind !== 'viewport') playback.cancel();
        scenes.beginEdit(label);
      },
      onEnd: kind => {
        if (kind === 'viewport') syncCamera(true, true);
        scenes.endEdit();
      },
    });
    appElement.addEventListener('input', cancelOnEdit, true);
    appElement.addEventListener('change', cancelOnEdit, true);

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

    return () => {
      editGestures.dispose();
      playback.dispose();
      transport.dispose();
      clearTimeout(exportStatusTimer);
      sim.onPenInteraction = null;
      sim.onPoseInput = null;
      sim.onCameraInput = null;
      appElement.removeEventListener('input', cancelOnEdit, true);
      appElement.removeEventListener('change', cancelOnEdit, true);
      document.removeEventListener('click', onDocClick);
      sim.dispose();
    };
  });

  function onAspectRatio(value) {
    scene.presentation.aspectRatio = value;
    commitScene();
  }

  // ── Reset ──────────────────────────────────────────────────────────────────

  function resetPen() {
    finishEdit();
    playback.cancel();
    commitPose({ ...DEFAULT_PEN }, { label: 'Reset pen' });
  }

  // ── Demo ───────────────────────────────────────────────────────────────────

  function runDemo() {
    finishEdit();
    playback.cancel();
    openFlyout = null;
    scene.annotations.showAltitude = scene.annotations.showAzimuth = true;
    scene.annotations.showTiltX = scene.annotations.showTiltY = scene.annotations.showBarrel = true;
    commitPose({ ...DEMO_POSE }, { label: 'Demo' });
  }

  // Authored clips retain the existing endpoints and cubic easing.
  function runAnimAll() { startClip({ ...DEFAULT_PEN }, { ...DEMO_POSE }, true); }
  function runAnimAltitude() {
    const pose = currentPose();
    startClip({ ...pose, tiltAltitude: 0 }, { ...pose, tiltAltitude: ANIMATION.altitudeEnd });
  }
  function runAnimAzimuth() {
    const pose = currentPose();
    startClip({ ...pose, tiltAzimuth: 0 }, { ...pose, tiltAzimuth: ANIMATION.azimuthEnd });
  }
  function runAnimBarrel() {
    const pose = currentPose();
    startClip({ ...pose, barrelRotation: 0 }, { ...pose, barrelRotation: ANIMATION.barrelEnd });
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') openFlyout = null;
    const direction = historyShortcut(e);
    if (direction) {
      e.preventDefault();
      if (!e.repeat) restoreHistory(direction);
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} onresize={() => sim?.onResize()} />

<!-- Scene tab contents, passed to LeftPanel as snippets (state stays here). -->
{#snippet sceneAnnTab()}
  <CursorModeControl
    bind:cursorMode={scene.presentation.cursorMode}
    onCursorMode={onSceneEdit}
  />
{/snippet}

{#snippet sceneControls()}
  <SceneControls onSave={saveScene} onLoad={loadScene} />
{/snippet}

{#snippet historyControls()}
  <HistoryControls status={historyStatus} onUndo={() => restoreHistory('undo')} onRedo={() => restoreHistory('redo')} />
{/snippet}

{#snippet animationsTab()}
  <button class="action-btn" onclick={runDemo}>Demo</button>
  <button class="action-btn" onclick={runAnimAll}>Anim Rot all</button>
  <button class="action-btn" onclick={runAnimAltitude}>Anim Tilt Altitude</button>
  <button class="action-btn" onclick={runAnimAzimuth}>Anim Tilt Azimuth</button>
  <button class="action-btn" onclick={runAnimBarrel}>Anim Barrel</button>
  <SampleRecording onPlay={playSample} active={sampleActive} frame={sampleFrame} count={sampleRecording.rows.length} />
  <PlaybackControls {transport} status={playbackStatus} sampleMode={sampleActive} />
{/snippet}

{#snippet penAnnTab()}
  <div style="display:flex;gap:16px;">
    <!-- Left column: rotation annotations -->
    <div style="flex:1;">
      <CheckboxControl label="Tilt altitude"   bind:checked={scene.annotations.showAltitude}   onchange={onSceneEdit} />
      <CheckboxControl label="Tilt azimuth"    bind:checked={scene.annotations.showAzimuth}    onchange={onSceneEdit} />
      <CheckboxControl label="Tilt X"          bind:checked={scene.annotations.showTiltX}      onchange={onSceneEdit} />
      <CheckboxControl label="Tilt Y"          bind:checked={scene.annotations.showTiltY}      onchange={onSceneEdit} />
      <CheckboxControl label="Barrel rotation" bind:checked={scene.annotations.showBarrel}     onchange={onSceneEdit} />
    </div>
    <!-- Right column: line annotations -->
    <div style="flex:1;">
      <CheckboxControl label="Pen top line"  bind:checked={scene.annotations.showPenTopLine}  onchange={onSceneEdit} />
      <CheckboxControl label="Pen axis line" bind:checked={scene.annotations.showPenAxisLine} onchange={onSceneEdit} />
      <CheckboxControl label="Pen tip line"  bind:checked={scene.annotations.showPenTipLine}  onchange={onSceneEdit} />
    </div>
  </div>
{/snippet}

<!-- ═══════════════════════════════════════════════════════════════════════════
     Control panel
     ═══════════════════════════════════════════════════════════════════════════ -->
<LeftPanel
  {onSceneEdit}
  bind:distance={scene.pose.distance}
  bind:tabletX={scene.pose.tabletX}
  bind:tabletY={scene.pose.tabletY}
  bind:tiltAltitude={scene.pose.tiltAltitude}
  bind:tiltAzimuth={scene.pose.tiltAzimuth}
  bind:barrelRotation={scene.pose.barrelRotation}
  bind:penDisplayMode={scene.presentation.penDisplayMode}
  bind:darkTablet={scene.presentation.darkTablet}
  bind:sharpNib={scene.presentation.sharpNib}
  bind:penBodyFormat={scene.presentation.penBodyFormat}
  bind:showPenShadow={scene.presentation.showPenShadow}
  {azimuthDisabled}
  {penAnnTab}
  {sceneAnnTab}
  {animationsTab}
  bind:axonometric={scene.presentation.axonometric}
  bind:showCheckerboard={scene.presentation.showCheckerboard}
  bind:showGrid={scene.presentation.showGrid}
  bind:showAxis={scene.presentation.showAxis}
  bind:showMonitor={scene.presentation.showMonitor}
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
  {sceneControls}
  {historyControls}
  aspectRatio={scene.presentation.aspectRatio}
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
      bind:cursorOffsetX={scene.mapping.cursorOffsetX}
      bind:cursorOffsetY={scene.mapping.cursorOffsetY}
      bind:compPosTiltX={scene.mapping.compPosTiltX}
      bind:compNegTiltX={scene.mapping.compNegTiltX}
      bind:compPosTiltY={scene.mapping.compPosTiltY}
      bind:compNegTiltY={scene.mapping.compNegTiltY}
      bind:scalingFactor={scene.mapping.scalingFactor}
      bind:edgeAttraction={scene.mapping.edgeAttraction}
      bind:edgeAttractionRange={scene.mapping.edgeAttractionRange}
      bind:mouseSensitivity={scene.mapping.mouseSensitivity}
      onCursorOffsetX={onSceneEdit}
      onCursorOffsetY={onSceneEdit}
      onCompPosTiltX={onSceneEdit}
      onCompNegTiltX={onSceneEdit}
      onCompPosTiltY={onSceneEdit}
      onCompNegTiltY={onSceneEdit}
      onScalingFactor={onSceneEdit}
      onEdgeAttraction={onSceneEdit}
      onEdgeAttractionRange={onSceneEdit}
      onMouseSensitivity={onSceneEdit}
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
