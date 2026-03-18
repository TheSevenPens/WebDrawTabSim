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

<SliderControl label="Z: (Hover distance)" bind:value={distance} min={0} max={1} step={0.05} decimals={2} unit=" in" oninput={onDistance} />

<SliderControl label="X" bind:value={tabletX} min={0} max={16} step={0.1} decimals={1} unit=" in" oninput={onTabletX} />

<SliderControl label="Y" bind:value={tabletY} min={0} max={9} step={0.1} decimals={1} unit=" in" oninput={onTabletY} />

<SliderControl label="Tilt altitude" bind:value={tiltAltitude} min={0} max={60} step={1} decimals={0} unit="°" oninput={onAltitude} />

<SliderControl label="Tilt azimuth" bind:value={tiltAzimuth} min={0} max={359} step={1} decimals={0} unit="°" disabled={azimuthDisabled} oninput={onAzimuth} />

<SliderControl label="Barrel rotation" bind:value={barrelRotation} min={0} max={359} step={1} decimals={0} unit="°" oninput={onBarrel} />

<div class="control-group">
  <label>Tilt X: <span class="slider-value">{tiltXDisplay}°</span></label>
</div>

<div class="control-group">
  <label>Tilt Y: <span class="slider-value">{tiltYDisplay}°</span></label>
</div>
