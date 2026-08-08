<script>
  // Labeled dropdown matching the dark panel style used throughout the left
  // panel / flyouts (a `label:` prefix beside an `.action-btn`-styled select).
  // For "action" style selects that reset to a placeholder after choosing
  // (Point camera at..., Export / Copy..., Views...), keep the raw markup —
  // this component targets the common "persisted setting" case.
  let {
    label = '',
    value = $bindable(),
    options = [],
    onchange,
    disabled = false,
  } = $props();
</script>

<div class="control-group" style="display:flex;align-items:center;gap:8px;">
  {#if label}<span style="white-space:nowrap;color:#fff;font-size:12px;">{label}</span>{/if}
  <select class="action-btn" style="flex:1;width:auto;margin-top:0;text-align:left;" bind:value {onchange} {disabled}>
    {#each options as opt (opt.value)}
      <option value={opt.value}>{opt.label}</option>
    {/each}
  </select>
</div>
