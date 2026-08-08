<script>
  import SliderControl from './SliderControl.svelte';
  import { PEN_RANGES } from './sim/config.js';

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

<SliderControl label="Cursor X offset"        bind:value={cursorOffsetX}       min={PEN_RANGES.cursorOffsetX.min} max={PEN_RANGES.cursorOffsetX.max} step={0.01} decimals={2} unit=" mm" oninput={onCursorOffsetX} />
<SliderControl label="Cursor Y offset"        bind:value={cursorOffsetY}       min={PEN_RANGES.cursorOffsetY.min} max={PEN_RANGES.cursorOffsetY.max} step={0.01} decimals={2} unit=" mm" oninput={onCursorOffsetY} />
<SliderControl label="Tilt Compensation PosTiltX" bind:value={compPosTiltX}   min={PEN_RANGES.tiltCompensation.min} max={PEN_RANGES.tiltCompensation.max} step={0.05} decimals={2}          oninput={onCompPosTiltX} />
<SliderControl label="Tilt Compensation NegTiltX" bind:value={compNegTiltX}   min={PEN_RANGES.tiltCompensation.min} max={PEN_RANGES.tiltCompensation.max} step={0.05} decimals={2}          oninput={onCompNegTiltX} />
<SliderControl label="Tilt Compensation PosTiltY" bind:value={compPosTiltY}   min={PEN_RANGES.tiltCompensation.min} max={PEN_RANGES.tiltCompensation.max} step={0.05} decimals={2}          oninput={onCompPosTiltY} />
<SliderControl label="Tilt Compensation NegTiltY" bind:value={compNegTiltY}   min={PEN_RANGES.tiltCompensation.min} max={PEN_RANGES.tiltCompensation.max} step={0.05} decimals={2}          oninput={onCompNegTiltY} />
<SliderControl label="Scaling factor"         bind:value={scalingFactor}       min={PEN_RANGES.scalingFactor.min} max={PEN_RANGES.scalingFactor.max} step={0.05} decimals={2}          oninput={onScalingFactor} />
<SliderControl label="Edge attraction"        bind:value={edgeAttraction}      min={PEN_RANGES.edgeAttraction.min} max={PEN_RANGES.edgeAttraction.max} step={0.05} decimals={2}          oninput={onEdgeAttraction} />
<SliderControl label="Edge attraction range"  bind:value={edgeAttractionRange} min={PEN_RANGES.edgeAttractionRange.min} max={PEN_RANGES.edgeAttractionRange.max} step={0.01} decimals={2} unit=" mm" oninput={onEdgeAttractionRange} />
<SliderControl label="Mouse drag sensitivity" bind:value={mouseSensitivity}    min={PEN_RANGES.mouseSensitivity.min} max={PEN_RANGES.mouseSensitivity.max} step={0.001} decimals={3} unit=" mm/px" oninput={onMouseSensitivity} />
