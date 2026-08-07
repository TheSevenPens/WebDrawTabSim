<script>
  import SliderControl from './SliderControl.svelte';

  let {
    cursorOffsetX       = $bindable(),
    cursorOffsetY       = $bindable(),
    compPosTiltX        = $bindable(),
    compNegTiltX        = $bindable(),
    compPosTiltY        = $bindable(),
    compNegTiltY        = $bindable(),
    scalingFactor       = $bindable(),
    edgeAttraction      = $bindable(),
    edgeAttractionRange = $bindable(),
    mouseSensitivity    = $bindable(),
    onCursorOffsetX,
    onCursorOffsetY,
    onCompPosTiltX,
    onCompNegTiltX,
    onCompPosTiltY,
    onCompNegTiltY,
    onScalingFactor,
    onEdgeAttraction,
    onEdgeAttractionRange,
    onMouseSensitivity,
  } = $props();
</script>

<SliderControl label="Cursor X offset"        bind:value={cursorOffsetX}       min={-120} max={120} step={0.01} decimals={2} unit=" mm" oninput={onCursorOffsetX} />
<SliderControl label="Cursor Y offset"        bind:value={cursorOffsetY}       min={-120} max={120} step={0.01} decimals={2} unit=" mm" oninput={onCursorOffsetY} />
<SliderControl label="Tilt Compensation PosTiltX" bind:value={compPosTiltX}   min={0}  max={1} step={0.05} decimals={2}          oninput={onCompPosTiltX} />
<SliderControl label="Tilt Compensation NegTiltX" bind:value={compNegTiltX}   min={0}  max={1} step={0.05} decimals={2}          oninput={onCompNegTiltX} />
<SliderControl label="Tilt Compensation PosTiltY" bind:value={compPosTiltY}   min={0}  max={1} step={0.05} decimals={2}          oninput={onCompPosTiltY} />
<SliderControl label="Tilt Compensation NegTiltY" bind:value={compNegTiltY}   min={0}  max={1} step={0.05} decimals={2}          oninput={onCompNegTiltY} />
<SliderControl label="Scaling factor"         bind:value={scalingFactor}       min={0}  max={2} step={0.05} decimals={2}          oninput={onScalingFactor} />
<SliderControl label="Edge attraction"        bind:value={edgeAttraction}      min={-1} max={1} step={0.05} decimals={2}          oninput={onEdgeAttraction} />
<SliderControl label="Edge attraction range"  bind:value={edgeAttractionRange} min={0}  max={120} step={0.01} decimals={2} unit=" mm" oninput={onEdgeAttractionRange} />
<SliderControl label="Mouse drag sensitivity" bind:value={mouseSensitivity}    min={0.024} max={2.4} step={0.001} decimals={3} unit=" mm/px" oninput={onMouseSensitivity} />
