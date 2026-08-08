<script>
  import SliderControl from './SliderControl.svelte';

  let {
    distance       = $bindable(),
    tabletX        = $bindable(),
    tabletY        = $bindable(),
    tiltAltitude   = $bindable(),
    tiltAzimuth    = $bindable(),
    barrelRotation = $bindable(),
    sharpNib       = $bindable(),
    penBodyFormat  = $bindable(),
    azimuthDisabled,
    onDistance,
    onTabletX,
    onTabletY,
    onAltitude,
    onAzimuth,
    onBarrel,
    onSharpNib,
    onPenBodyFormat,
    showPenShadow  = $bindable(),
    onShowPenShadow,
    penAnnTab,
  } = $props();

  let activeTab = $state('pos'); // 'pos' | 'or' | 'fmt' | 'ann'
</script>

<div class="tabs">
  <button type="button" class="tab" class:active={activeTab === 'pos'} onclick={() => (activeTab = 'pos')}>pen pos</button>
  <button type="button" class="tab" class:active={activeTab === 'or'} onclick={() => (activeTab = 'or')}>Pen Or</button>
  <button type="button" class="tab" class:active={activeTab === 'fmt'} onclick={() => (activeTab = 'fmt')}>pen fmt</button>
  <button type="button" class="tab" class:active={activeTab === 'ann'} onclick={() => (activeTab = 'ann')}>pen ann</button>
</div>

{#if activeTab === 'pos'}
  <SliderControl inline label="Z" title="Hover distance" bind:value={distance} min={0} max={24} step={0.01} decimals={2} unit=" mm" oninput={onDistance} />
  <SliderControl inline label="X" title="Tablet X position" bind:value={tabletX} min={0} max={384} step={0.01} decimals={2} unit=" mm" oninput={onTabletX} />
  <SliderControl inline label="Y" title="Tablet Y position" bind:value={tabletY} min={0} max={216} step={0.01} decimals={2} unit=" mm" oninput={onTabletY} />
{:else if activeTab === 'or'}
  <SliderControl inline label="Al" title="Tilt altitude" bind:value={tiltAltitude} min={0} max={60} step={1} decimals={0} unit="°" oninput={onAltitude} />
  <SliderControl inline label="Az" title="Tilt azimuth" bind:value={tiltAzimuth} min={0} max={359} step={1} decimals={0} unit="°" disabled={azimuthDisabled} oninput={onAzimuth} />
  <SliderControl inline label="Br" title="Barrel rotation" bind:value={barrelRotation} min={0} max={359} step={1} decimals={0} unit="°" oninput={onBarrel} />
{:else if activeTab === 'fmt'}
  <div class="control-group" style="display:flex;align-items:center;gap:8px;">
    <span style="white-space:nowrap;color:#fff;font-size:12px;">Body:</span>
    <select class="action-btn" style="flex:1;width:auto;margin-top:0;text-align:left;" bind:value={penBodyFormat} onchange={onPenBodyFormat}>
      <option value="checkerboard">checkerboard pattern</option>
      <option value="solid">solid color</option>
    </select>
  </div>
  <div class="control-group">
    <label style="display:flex;align-items:center;gap:8px;">
      <input type="checkbox" bind:checked={sharpNib} onchange={onSharpNib} style="width:auto;margin:0;">
      <span>Sharp nib tip</span>
    </label>
  </div>
  <div class="control-group">
    <label style="display:flex;align-items:center;gap:8px;">
      <input type="checkbox" bind:checked={showPenShadow} onchange={onShowPenShadow} style="width:auto;margin:0;">
      <span>Pen shadow</span>
    </label>
  </div>
{:else}
  {@render penAnnTab()}
{/if}

<style>
  .tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 10px;
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
</style>
