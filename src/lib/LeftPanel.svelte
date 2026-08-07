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
    darkTablet     = $bindable(),
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
    onDarkTablet,
    showCameraInfo = $bindable(),
    cameraPos,
    cameraTarget,
    cameraAzimuth,
    cameraElevation,
    cameraDistance,
    onRotateCamera,
    onChangeDistance,
    onPointCameraAt,
    cameraViews,
    onViewChange,
    onToggleFlyout,
    onResetPen,
    onExportAction,
    onEditCamera,
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
        <input type="checkbox" bind:checked={darkTablet} onchange={onDarkTablet} style="width:auto;margin:0;">
        <span>Dark tablet</span>
      </label>
    </div>
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
  <select class="action-btn" onchange={(e) => { const v = e.target.value; e.target.value = ''; onExportAction(v); }} style="text-align:left;">
    <option value="">Export / Copy...</option>
    <option value="png-hd">Export 1080p PNG</option>
    <option value="png-uhd">Export 4K PNG</option>
    <option value="copy-hd">Copy 1080p to clipboard</option>
    <option value="copy-uhd">Copy 4K to clipboard</option>
  </select>
  <div class="camera-controls">
    <span class="cam-value">Az: {cameraAzimuth}°</span>
    <button class="rot-btn" onclick={() => onRotateCamera(-5, 0)} title="Rotate left 5°">◀ 5°</button>
    <button class="rot-btn" onclick={() => onRotateCamera(5, 0)} title="Rotate right 5°">5° ▶</button>

    <span class="cam-value">El: {cameraElevation}°</span>
    <button class="rot-btn" onclick={() => onRotateCamera(0, 5)} title="Raise 5°">▲ 5°</button>
    <button class="rot-btn" onclick={() => onRotateCamera(0, -5)} title="Lower 5°">▼ 5°</button>

    <span class="cam-value">Dist: {cameraDistance} mm</span>
    <button class="rot-btn" onclick={() => onChangeDistance(-25)} title="Move 25 mm closer">−25</button>
    <button class="rot-btn" onclick={() => onChangeDistance(25)} title="Move 25 mm farther">+25</button>
  </div>

  <select class="action-btn" onchange={(e) => { const v = e.target.value; e.target.value = ''; onPointCameraAt(v); }} style="text-align:left;">
    <option value="">Point camera at...</option>
    <option value="pen-tip">Pen tip</option>
    <option value="center">Active area: center</option>
    <option value="corner-fl">Corner: front-left</option>
    <option value="corner-fr">Corner: front-right</option>
    <option value="corner-bl">Corner: back-left</option>
    <option value="corner-br">Corner: back-right</option>
    <option value="edge-front">Edge midpoint: front</option>
    <option value="edge-back">Edge midpoint: back</option>
    <option value="edge-left">Edge midpoint: left</option>
    <option value="edge-right">Edge midpoint: right</option>
  </select>

  <button class="action-btn" onclick={onEditCamera}>Edit camera JSON</button>
  <select class="action-btn" onchange={onViewChange} style="text-align:left;">
    <option value="">Views...</option>
    {#each cameraViews as view}
      <option value={view.name}>{view.name}</option>
    {/each}
  </select>
</div>

<style>
  .camera-controls {
    display: grid;
    grid-template-columns: auto 1fr 1fr;
    gap: 4px;
    align-items: center;
    margin: 4px 0;
  }

  .cam-value {
    font-size: 12px;
    color: #ccc;
    font-family: monospace;
    white-space: nowrap;
    padding-right: 4px;
  }

  .rot-btn {
    padding: 5px 4px;
    font-size: 12px;
    background: #3a3f47;
    color: #eee;
    border: 1px solid #555;
    border-radius: 4px;
    cursor: pointer;
  }

  .rot-btn:hover {
    background: #4a5059;
    border-color: #777;
  }

  .rot-btn:active {
    background: #2f333a;
  }
</style>
