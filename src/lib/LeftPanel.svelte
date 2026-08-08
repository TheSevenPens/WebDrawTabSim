<script>
  import PenOrientationPanel from './PenOrientationPanel.svelte';
  import CheckboxControl from './CheckboxControl.svelte';
  import SelectControl from './SelectControl.svelte';

  const deviceTypeOptions = [
    { value: 'tablet', label: 'pen tablet' },
    { value: 'display', label: 'pen display' },
  ];

  const aspectOptions = [
    { value: '16 / 9', label: '16:9' },
    { value: '1 / 1', label: '1:1' },
    { value: '2 / 3', label: '2:3' },
  ];

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
    showGrid       = $bindable(),
    onShowGrid,
    showAxis       = $bindable(),
    onShowAxis,
    showMonitor    = $bindable(),
    onShowMonitor,
    sharpNib       = $bindable(),
    onSharpNib,
    penBodyFormat  = $bindable(),
    onPenBodyFormat,
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
    animationsTab,
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
    aspectRatio,
    onAspectRatio,
  } = $props();

  let activeCamTab = $state('dir'); // 'dir' | 'targ'

  // Per-section collapse state (all expanded by default).
  let collapsed = $state({
    pen: false, mapping: false, pointer: false, camera: false, tablet: false, animations: false, other: false,
  });
</script>

{#snippet sectionHeader(key, label)}
  <button type="button" class="section-header" onclick={() => (collapsed[key] = !collapsed[key])} aria-expanded={!collapsed[key]}>
    <span>{label}</span>
    <span class="collapse-chevron">{collapsed[key] ? '▸' : '▾'}</span>
  </button>
{/snippet}

<div id="control-panel">
  <h1>SevenPens DrawTabSim</h1>

  {@render sectionHeader('pen', 'Pen')}
  {#if !collapsed.pen}
  <PenOrientationPanel
    bind:distance
    bind:tabletX
    bind:tabletY
    bind:tiltAltitude
    bind:tiltAzimuth
    bind:barrelRotation
    bind:sharpNib
    bind:penBodyFormat
    {azimuthDisabled}
    {onDistance}
    {onTabletX}
    {onTabletY}
    {onAltitude}
    {onAzimuth}
    {onBarrel}
    {onSharpNib}
    {onPenBodyFormat}
    bind:showPenShadow
    {onShowPenShadow}
    {penAnnTab}
  />
  {/if}

  {@render sectionHeader('mapping', 'Mapping')}
  {#if !collapsed.mapping}
  <button class="action-btn" id="pointer-tracking-flyout-btn" onclick={() => onToggleFlyout('pointer-tracking')}>Pointer tracking</button>
  {/if}

  {@render sectionHeader('pointer', 'Pointer')}
  {#if !collapsed.pointer}
  {@render sceneAnnTab()}

  <button class="action-btn" onclick={onResetPen}>Reset pen</button>
  {/if}

  {@render sectionHeader('camera', 'Camera')}
  {#if !collapsed.camera}
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
      <button class="rot-btn" style="grid-column: span 2;" onclick={() => onChangeDistance(-20)} title="Move 20 mm closer">−20</button>
      <button class="rot-btn" style="grid-column: span 2;" onclick={() => onChangeDistance(20)} title="Move 20 mm farther">+20</button>
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
  {/if}

  {@render sectionHeader('tablet', 'Tablet')}
  {#if !collapsed.tablet}
  <CheckboxControl label="Tablet checkerboard" bind:checked={showCheckerboard} onchange={onShowCheckerboard} />
  <CheckboxControl label="Active area grid" bind:checked={showGrid} onchange={onShowGrid} />
  <SelectControl
    label="Device type:"
    value={penDisplayMode ? 'display' : 'tablet'}
    onchange={(e) => { penDisplayMode = e.target.value === 'display'; onPenDisplayMode(); }}
    options={deviceTypeOptions}
  />
  <CheckboxControl label="Dark tablet" bind:checked={darkTablet} onchange={onDarkTablet} />
  {/if}

  {@render sectionHeader('animations', 'Animations')}
  {#if !collapsed.animations}
  {@render animationsTab()}
  {/if}

  {@render sectionHeader('other', 'Other')}
  {#if !collapsed.other}
  <CheckboxControl label="Axis" bind:checked={showAxis} onchange={onShowAxis} />
  <CheckboxControl label="Monitor" bind:checked={showMonitor} onchange={onShowMonitor} />
  <CheckboxControl label="Axonometric" bind:checked={axonometric} onchange={onAxonometric} />
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
  <SelectControl label="Aspect:" value={aspectRatio} onchange={(e) => onAspectRatio(e.target.value)} options={aspectOptions} />
  {/if}
</div>

<style>
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    font-size: 14px;
    font-weight: 600;
    color: #ddd;
    margin: 12px 0 6px;
    padding: 0 0 3px;
    border: none;
    border-bottom: 1px solid #444;
    background: none;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
  }

  .section-header:hover {
    color: #fff;
  }

  .collapse-chevron {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 26px;
    height: 26px;
    font-size: 18px;
    line-height: 1;
    color: #ddd;
    background: #3a3f47;
    border: 1px solid #666;
    border-radius: 4px;
    margin-left: 8px;
  }

  .section-header:hover .collapse-chevron {
    color: #fff;
    background: #4a5059;
    border-color: #888;
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
