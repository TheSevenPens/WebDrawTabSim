<script>
  import PenOrientationPanel from './PenOrientationPanel.svelte';

  let {
    distance       = $bindable(),
    tabletX        = $bindable(),
    tabletY        = $bindable(),
    tiltAltitude   = $bindable(),
    tiltAzimuth    = $bindable(),
    barrelRotation = $bindable(),
    penDisplayMode = $bindable(),
    darkTablet     = $bindable(),
    showCheckerboard = $bindable(),
    onShowCheckerboard,
    showAxis       = $bindable(),
    onShowAxis,
    sharpNib       = $bindable(),
    onSharpNib,
    showPenShadow  = $bindable(),
    onShowPenShadow,
    azimuthDisabled,
    onDistance,
    onTabletX,
    onTabletY,
    onAltitude,
    onAzimuth,
    onBarrel,
    onPenDisplayMode,
    onDarkTablet,
    axonometric    = $bindable(),
    onAxonometric,
    penAnnTab,
    sceneAnnTab,
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

  let activeCamTab = $state('dir'); // 'dir' | 'targ'
</script>

<div id="control-panel">
  <h1>SevenPens DrawTabSim</h1>

  <div class="section-header">Pen</div>
  <PenOrientationPanel
    bind:distance
    bind:tabletX
    bind:tabletY
    bind:tiltAltitude
    bind:tiltAzimuth
    bind:barrelRotation
    bind:sharpNib
    {azimuthDisabled}
    {onDistance}
    {onTabletX}
    {onTabletY}
    {onAltitude}
    {onAzimuth}
    {onBarrel}
    {onSharpNib}
    bind:showPenShadow
    {onShowPenShadow}
    {penAnnTab}
  />

  <div class="section-header">Mapping</div>
  <button class="action-btn" id="pointer-tracking-flyout-btn" onclick={() => onToggleFlyout('pointer-tracking')}>Pointer tracking</button>

  <div class="section-header">Pointer</div>
  {@render sceneAnnTab()}

  {#if showCameraInfo}
  <div class="camera-info" style="font-size:11px;line-height:1.4;padding:4px 0;font-family:monospace;color:#aaa;">
    <div>Pos: {cameraPos.x.toFixed(2)}, {cameraPos.y.toFixed(2)}, {cameraPos.z.toFixed(2)}</div>
    <div>Target: {cameraTarget.x.toFixed(2)}, {cameraTarget.y.toFixed(2)}, {cameraTarget.z.toFixed(2)}</div>
  </div>
  {/if}

  <button class="action-btn" onclick={onResetPen}>Reset pen</button>
  <div class="section-header">Camera</div>
  <div class="tabs">
    <button type="button" class="tab" class:active={activeCamTab === 'dir'} onclick={() => (activeCamTab = 'dir')}>Cam Dir</button>
    <button type="button" class="tab" class:active={activeCamTab === 'targ'} onclick={() => (activeCamTab = 'targ')}>Cam Targ</button>
  </div>

  {#if activeCamTab === 'dir'}
    <div class="camera-controls">
      <span class="cam-value">Az: {cameraAzimuth}°</span>
      <button class="rot-btn" onclick={() => onRotateCamera(-5, 0)} title="Rotate left 5°">◀ 5°</button>
      <button class="rot-btn" onclick={() => onRotateCamera(-1, 0)} title="Rotate left 1°">◀ 1°</button>
      <button class="rot-btn" onclick={() => onRotateCamera(1, 0)} title="Rotate right 1°">1° ▶</button>
      <button class="rot-btn" onclick={() => onRotateCamera(5, 0)} title="Rotate right 5°">5° ▶</button>

      <span class="cam-value">El: {cameraElevation}°</span>
      <button class="rot-btn" onclick={() => onRotateCamera(0, 5)} title="Raise 5°">▲ 5°</button>
      <button class="rot-btn" onclick={() => onRotateCamera(0, 1)} title="Raise 1°">▲ 1°</button>
      <button class="rot-btn" onclick={() => onRotateCamera(0, -1)} title="Lower 1°">▼ 1°</button>
      <button class="rot-btn" onclick={() => onRotateCamera(0, -5)} title="Lower 5°">▼ 5°</button>

      <span class="cam-value">Dist: {cameraDistance} mm</span>
      <button class="rot-btn" style="grid-column: span 2;" onclick={() => onChangeDistance(-25)} title="Move 25 mm closer">−25</button>
      <button class="rot-btn" style="grid-column: span 2;" onclick={() => onChangeDistance(25)} title="Move 25 mm farther">+25</button>
    </div>
  {:else}
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
  {/if}

  <div class="section-header">Tablet</div>
  <div class="control-group">
    <label style="display:flex;align-items:center;gap:8px;">
      <input type="checkbox" bind:checked={showCheckerboard} onchange={onShowCheckerboard} style="width:auto;margin:0;">
      <span>Tablet checkerboard</span>
    </label>
  </div>
  <div class="control-group" style="display:flex;align-items:center;gap:8px;">
    <span style="white-space:nowrap;color:#fff;font-size:12px;">Device type:</span>
    <select class="action-btn" style="flex:1;width:auto;margin-top:0;text-align:left;" value={penDisplayMode ? 'display' : 'tablet'} onchange={(e) => { penDisplayMode = e.target.value === 'display'; onPenDisplayMode(); }}>
      <option value="tablet">pen tablet</option>
      <option value="display">pen display</option>
    </select>
  </div>
  <div class="control-group">
    <label style="display:flex;align-items:center;gap:8px;">
      <input type="checkbox" bind:checked={darkTablet} onchange={onDarkTablet} style="width:auto;margin:0;">
      <span>Dark tablet</span>
    </label>
  </div>

  <div class="section-header">Other</div>
  <div class="control-group">
    <label style="display:flex;align-items:center;gap:8px;">
      <input type="checkbox" bind:checked={showAxis} onchange={onShowAxis} style="width:auto;margin:0;">
      <span>Axis</span>
    </label>
  </div>
  <div class="control-group">
    <label style="display:flex;align-items:center;gap:8px;">
      <input type="checkbox" bind:checked={axonometric} onchange={onAxonometric} style="width:auto;margin:0;">
      <span>Axonometric</span>
    </label>
  </div>
  <button class="action-btn" id="animations-flyout-btn" onclick={() => onToggleFlyout('animations')}>Animations</button>
  <select class="action-btn" onchange={(e) => { const v = e.target.value; e.target.value = ''; onExportAction(v); }} style="text-align:left;">
    <option value="">Export / Copy...</option>
    <option value="png-hd">Export 1080p PNG</option>
    <option value="png-uhd">Export 4K PNG</option>
    <option value="copy-hd">Copy 1080p to clipboard</option>
    <option value="copy-uhd">Copy 4K to clipboard</option>
  </select>
  <select class="action-btn" onchange={onViewChange} style="text-align:left;">
    <option value="">Views...</option>
    {#each cameraViews as view}
      <option value={view.name}>{view.name}</option>
    {/each}
  </select>
</div>

<style>
  .section-header {
    font-size: 14px;
    font-weight: 600;
    color: #ddd;
    margin: 12px 0 6px;
    padding-bottom: 3px;
    border-bottom: 1px solid #444;
  }

  .tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 8px;
  }

  .tab {
    flex: 1;
    padding: 6px 8px;
    background: #3a3f47;
    color: #ccc;
    border: 1px solid #555;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    font-family: inherit;
  }

  .tab.active {
    background: #4a90d9;
    color: #fff;
    border-color: #4a90d9;
  }

  .tab:hover:not(.active) {
    background: #4a5059;
  }

  .camera-controls {
    display: grid;
    grid-template-columns: auto 1fr 1fr 1fr 1fr;
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
