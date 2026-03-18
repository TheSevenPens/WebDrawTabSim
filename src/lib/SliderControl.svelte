<script>
  let { label = '', value = $bindable(0), min = 0, max = 1, step = 1, unit = '', decimals = 2, disabled = false, oninput } = $props();

  const id = `slider-${Math.random().toString(36).slice(2)}`;

  let editing = $state(false);
  let editText = $state('');

  function startEdit() {
    if (disabled) return;
    editText = Number(value).toFixed(decimals);
    editing = true;
  }

  function commitEdit() {
    const parsed = parseFloat(editText);
    if (!isNaN(parsed)) {
      value = Math.min(max, Math.max(min, parsed));
      oninput?.();
    }
    editing = false;
  }

  function onKeyDown(e) {
    if (e.key === 'Enter') { e.target.blur(); }
    if (e.key === 'Escape') { editing = false; }
  }
</script>

<div class="control-group">
  <div class="slider-label-row">
    <label for={id}>{label}:</label>
    {#if editing}
      <input
        class="slider-value-input"
        type="text"
        bind:value={editText}
        onblur={commitEdit}
        onkeydown={onKeyDown}
        autofocus
      />{unit}
    {:else}
      <span class="slider-value editable" role="button" tabindex="0" onclick={startEdit} onkeydown={(e) => e.key === 'Enter' && startEdit()}>
        {Number(value).toFixed(decimals)}{unit}
      </span>
    {/if}
  </div>
  <input {id}
    type="range"
    bind:value
    {min}
    {max}
    {step}
    {disabled}
    style:opacity={disabled ? 0.5 : 1}
    style:cursor={disabled ? 'not-allowed' : 'pointer'}
    {oninput}
  />
</div>

<style>
  .slider-label-row {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .slider-value-input {
    width: 4em;
    background: transparent;
    border: none;
    border-bottom: 1px solid #aaa;
    color: #aaa;
    font-size: 12px;
    font-family: inherit;
    padding: 0;
    outline: none;
  }

  .slider-value.editable {
    cursor: text;
  }
</style>
