<script>
  let {
    showCursor       = $bindable(),
    onShowCursor,
  } = $props();
</script>

<div class="control-group"><label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" bind:checked={showCursor}       onchange={onShowCursor}       style="width:auto;margin:0;"><span>Mouse cursor</span></label></div>
