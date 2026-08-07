<script>
  import SliderControl from './SliderControl.svelte';

  let {
    distance       = $bindable(),
    tabletX        = $bindable(),
    tabletY        = $bindable(),
    tiltAltitude   = $bindable(),
    tiltAzimuth    = $bindable(),
    barrelRotation = $bindable(),
    azimuthDisabled,
    tiltXDisplay,
    tiltYDisplay,
    onDistance,
    onTabletX,
    onTabletY,
    onAltitude,
    onAzimuth,
    onBarrel,
  } = $props();
</script>

<SliderControl label="Z: (Hover distance)" bind:value={distance} min={0} max={24} step={0.01} decimals={2} unit=" mm" oninput={onDistance} />

<SliderControl label="X" bind:value={tabletX} min={0} max={384} step={0.01} decimals={2} unit=" mm" oninput={onTabletX} />

<SliderControl label="Y" bind:value={tabletY} min={0} max={216} step={0.01} decimals={2} unit=" mm" oninput={onTabletY} />

<SliderControl label="Tilt altitude" bind:value={tiltAltitude} min={0} max={60} step={1} decimals={0} unit="°" oninput={onAltitude} />

<SliderControl label="Tilt azimuth" bind:value={tiltAzimuth} min={0} max={359} step={1} decimals={0} unit="°" disabled={azimuthDisabled} oninput={onAzimuth} />

<SliderControl label="Barrel rotation" bind:value={barrelRotation} min={0} max={359} step={1} decimals={0} unit="°" oninput={onBarrel} />

<div class="control-group">
  <span class="readout">Tilt X: <span class="slider-value">{tiltXDisplay}°</span></span>
</div>

<div class="control-group">
  <span class="readout">Tilt Y: <span class="slider-value">{tiltYDisplay}°</span></span>
</div>
