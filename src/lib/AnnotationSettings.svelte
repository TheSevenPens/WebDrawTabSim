<script>
  let {
    showAltitude     = $bindable(),
    showAzimuth      = $bindable(),
    showTiltX        = $bindable(),
    showTiltY        = $bindable(),
    showBarrel       = $bindable(),
    showAxis         = $bindable(),
    showCursor       = $bindable(),
    showPenShadow    = $bindable(),
    showCheckerboard = $bindable(),
    onShowAltitude,
    onShowAzimuth,
    onShowTiltX,
    onShowTiltY,
    onShowBarrel,
    onShowAxis,
    onShowCursor,
    onShowPenShadow,
    onShowCheckerboard,
    onAllOn,
    onAllOff,
  } = $props();
</script>

<div style="display:flex;gap:8px;margin-bottom:12px;">
  <button class="action-btn" style="flex:1;" onclick={onAllOn}>All On</button>
  <button class="action-btn" style="flex:1;" onclick={onAllOff}>All Off</button>
</div>
<div class="control-group"><label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" bind:checked={showAltitude}     onchange={onShowAltitude}     style="width:auto;margin:0;"><span>Tilt altitude</span></label></div>
<div class="control-group"><label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" bind:checked={showAzimuth}      onchange={onShowAzimuth}      style="width:auto;margin:0;"><span>Tilt azimuth</span></label></div>
<div class="control-group"><label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" bind:checked={showTiltX}        onchange={onShowTiltX}        style="width:auto;margin:0;"><span>Tilt X</span></label></div>
<div class="control-group"><label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" bind:checked={showTiltY}        onchange={onShowTiltY}        style="width:auto;margin:0;"><span>Tilt Y</span></label></div>
<div class="control-group"><label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" bind:checked={showBarrel}       onchange={onShowBarrel}       style="width:auto;margin:0;"><span>Barrel rotation</span></label></div>
<div class="control-group"><label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" bind:checked={showAxis}         onchange={onShowAxis}         style="width:auto;margin:0;"><span>Axis</span></label></div>
<div class="control-group"><label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" bind:checked={showCursor}       onchange={onShowCursor}       style="width:auto;margin:0;"><span>Mouse cursor</span></label></div>
<div class="control-group"><label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" bind:checked={showPenShadow}    onchange={onShowPenShadow}    style="width:auto;margin:0;"><span>Pen shadow</span></label></div>
<div class="control-group"><label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" bind:checked={showCheckerboard} onchange={onShowCheckerboard} style="width:auto;margin:0;"><span>Tablet checkerboard</span></label></div>
