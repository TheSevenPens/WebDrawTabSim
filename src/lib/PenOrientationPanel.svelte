<script>
  import SliderControl from './SliderControl.svelte';
  import CheckboxControl from './CheckboxControl.svelte';
  import SelectControl from './SelectControl.svelte';
  import { PEN_RANGES } from './sim/config.js';

  const bodyFormatOptions = [
    { value: 'checkerboard', label: 'checkerboard pattern' },
    { value: 'solid', label: 'solid color' },
  ];

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
  <SliderControl inline label="Z" title="Hover distance" bind:value={distance} min={PEN_RANGES.distance.min} max={PEN_RANGES.distance.max} step={0.01} decimals={2} unit=" mm" oninput={onDistance} />
  <SliderControl inline label="X" title="Tablet X position" bind:value={tabletX} min={PEN_RANGES.tabletX.min} max={PEN_RANGES.tabletX.max} step={0.01} decimals={2} unit=" mm" oninput={onTabletX} />
  <SliderControl inline label="Y" title="Tablet Y position" bind:value={tabletY} min={PEN_RANGES.tabletY.min} max={PEN_RANGES.tabletY.max} step={0.01} decimals={2} unit=" mm" oninput={onTabletY} />
{:else if activeTab === 'or'}
  <SliderControl inline label="Al" title="Tilt altitude" bind:value={tiltAltitude} min={PEN_RANGES.tiltAltitude.min} max={PEN_RANGES.tiltAltitude.max} step={1} decimals={0} unit="°" oninput={onAltitude} />
  <SliderControl inline label="Az" title="Tilt azimuth" bind:value={tiltAzimuth} min={PEN_RANGES.tiltAzimuth.min} max={PEN_RANGES.tiltAzimuth.max} step={1} decimals={0} unit="°" disabled={azimuthDisabled} oninput={onAzimuth} />
  <SliderControl inline label="Br" title="Barrel rotation" bind:value={barrelRotation} min={PEN_RANGES.barrelRotation.min} max={PEN_RANGES.barrelRotation.max} step={1} decimals={0} unit="°" oninput={onBarrel} />
{:else if activeTab === 'fmt'}
  <SelectControl label="Body:" bind:value={penBodyFormat} onchange={onPenBodyFormat} options={bodyFormatOptions} />
  <CheckboxControl label="Sharp nib tip" bind:checked={sharpNib} onchange={onSharpNib} />
  <CheckboxControl label="Pen shadow" bind:checked={showPenShadow} onchange={onShowPenShadow} />
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
