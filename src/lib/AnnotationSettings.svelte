<script>
  let {
    cursorMode       = $bindable(),
    onCursorMode,
  } = $props();
</script>

<div class="control-group" style="display:flex;align-items:center;gap:8px;">
  <span style="white-space:nowrap;color:#fff;font-size:12px;">Cursor:</span>
  <select class="action-btn" style="flex:1;width:auto;margin-top:0;text-align:left;" bind:value={cursorMode} onchange={onCursorMode}>
    <option value="mouse">mouse</option>
    <option value="crosshairs">crosshairs</option>
    <option value="none">none</option>
  </select>
</div>
