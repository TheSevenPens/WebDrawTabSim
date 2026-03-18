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
    onToggleFlyout,
    onResetPen,
    onOpenCameraModal,
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
        <input type="checkbox" bind:checked={axonometric} onchange={onAxonometric} style="width:auto;margin:0;">
        <span>Axonometric</span>
      </label>
    </div>
  </div>

  <button class="action-btn" onclick={onResetPen}>Reset pen</button>
  <button class="action-btn" id="animations-flyout-btn" onclick={() => onToggleFlyout('animations')}>Animations</button>
  <button class="action-btn" onclick={onOpenCameraModal}>Edit View</button>
  <button class="action-btn" onclick={onExportPNG}>Export as PNG</button>
</div>
