<script>
  import PenOrientationPanel from './PenOrientationPanel.svelte';

  let {
    distance       = $bindable(),
    tabletX        = $bindable(),
    tabletY        = $bindable(),
    tiltAltitude   = $bindable(),
    tiltAzimuth    = $bindable(),
    barrelRotation = $bindable(),
    axonometric    = $bindable(),
    penDisplayMode = $bindable(),
    azimuthDisabled,
    tiltXDisplay,
    tiltYDisplay,
    onDistance,
    onTabletX,
    onTabletY,
    onAltitude,
    onAzimuth,
    onBarrel,
    onAxonometric,
    onPenDisplayMode,
    showCameraInfo = $bindable(),
    cameraPos,
    cameraTarget,
    cameraViews,
    onViewChange,
    onToggleFlyout,
    onResetPen,
    onExportPNG,
  } = $props();
</script>

<div id="control-panel">
  <h1>SevenPens DrawTabSim</h1>

  <PenOrientationPanel
    bind:distance
    bind:tabletX
    bind:tabletY
    bind:tiltAltitude
    bind:tiltAzimuth
    bind:barrelRotation
    {azimuthDisabled}
    {tiltXDisplay}
    {tiltYDisplay}
    {onDistance}
    {onTabletX}
    {onTabletY}
    {onAltitude}
    {onAzimuth}
    {onBarrel}
  />

  <button class="action-btn" id="pointer-tracking-flyout-btn" onclick={() => onToggleFlyout('pointer-tracking')}>Pointer tracking</button>
  <button class="action-btn" id="annotations-flyout-btn" onclick={() => onToggleFlyout('annotations')}>Annotations</button>

  <div class="checkbox-grid">
    <div class="control-group">
      <label style="display:flex;align-items:center;gap:8px;">
        <input type="checkbox" bind:checked={penDisplayMode} onchange={onPenDisplayMode} style="width:auto;margin:0;">
        <span>Pen display</span>
      </label>
    </div>
    <div class="control-group">
      <label style="display:flex;align-items:center;gap:8px;">
        <input type="checkbox" bind:checked={axonometric} onchange={onAxonometric} style="width:auto;margin:0;">
        <span>Axonometric</span>
      </label>
    </div>
  </div>

  <div class="checkbox-grid">
    <div class="control-group">
      <label style="display:flex;align-items:center;gap:8px;">
        <input type="checkbox" bind:checked={showCameraInfo} style="width:auto;margin:0;">
        <span>Camera info</span>
      </label>
    </div>
  </div>

  {#if showCameraInfo}
  <div class="camera-info" style="font-size:11px;line-height:1.4;padding:4px 0;font-family:monospace;color:#aaa;">
    <div>Pos: {cameraPos.x.toFixed(2)}, {cameraPos.y.toFixed(2)}, {cameraPos.z.toFixed(2)}</div>
    <div>Target: {cameraTarget.x.toFixed(2)}, {cameraTarget.y.toFixed(2)}, {cameraTarget.z.toFixed(2)}</div>
  </div>
  {/if}

  <button class="action-btn" onclick={onResetPen}>Reset pen</button>
  <button class="action-btn" id="animations-flyout-btn" onclick={() => onToggleFlyout('animations')}>Animations</button>
  <button class="action-btn" onclick={onExportPNG}>Export as PNG</button>
  <select class="action-btn" onchange={onViewChange} style="text-align:left;">
    <option value="">Views...</option>
    {#each cameraViews as view}
      <option value={view.name}>{view.name}</option>
    {/each}
  </select>
</div>
