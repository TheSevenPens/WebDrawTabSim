<script>
  // Labeled checkbox matching the dark panel style used throughout the left
  // panel / flyouts. Reuses the global `.control-group` / checkbox styles
  // from app.css rather than re-declaring them here.
  let { label = '', checked = $bindable(false), onchange, disabled = false } = $props();
</script>

<div class="control-group">
  <label style="display:flex;align-items:center;gap:8px;">
    <input type="checkbox" bind:checked {disabled} {onchange} style="width:auto;margin:0;">
    <span>{label}</span>
  </label>
</div>
