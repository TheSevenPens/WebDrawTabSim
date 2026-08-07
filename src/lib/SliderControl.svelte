<script>
  let { label = '', title = '', value = $bindable(0), min = 0, max = 1, step = 1, unit = '', decimals = 2, disabled = false, inline = false, oninput } = $props();

  const id = `slider-${Math.random().toString(36).slice(2)}`;

  // The number field is directly editable at any time. While it's focused we
  // let the user type freely (tracking the raw text); otherwise the display
  // stays in sync with the value driven by the range slider / mouse / reset.
  let focused = $state(false);
  let text = $state('');

  $effect(() => {
    if (!focused) text = Number(value).toFixed(decimals);
  });

  const clamp = (n) => Math.min(max, Math.max(min, n));

  function onNumberInput(e) {
    text = e.target.value;
    const parsed = parseFloat(text);
    if (!isNaN(parsed)) {
      value = clamp(parsed);
      oninput?.();
    }
  }

  function onNumberFocus(e) {
    focused = true;
    e.target.select();
  }

  function onNumberBlur() {
    focused = false;
    // Normalize to a clamped, rounded value and refresh the display.
    const rounded = clamp(parseFloat(Number(value).toFixed(decimals)) || min);
    if (rounded !== value) { value = rounded; oninput?.(); }
    text = Number(value).toFixed(decimals);
  }

  function onNumberKeyDown(e) {
    if (e.key === 'Enter') e.target.blur();
  }
</script>

<div class="control-group" class:inline>
  <div class="slider-label-row">
    <label for={id} title={title || label}>{label}:</label>
    <input
      class="slider-value-input"
      type="number"
      {min}
      {max}
      {step}
      {disabled}
      value={text}
      onfocus={onNumberFocus}
      oninput={onNumberInput}
      onblur={onNumberBlur}
      onkeydown={onNumberKeyDown}
    />{#if unit}<span class="unit">{unit}</span>{/if}
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

  /* Inline layout: label, number, and slider all on one row. */
  .control-group.inline {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .control-group.inline .slider-label-row {
    flex: 0 0 auto;
  }

  /* Fixed-width columns so labels, numbers, units, and sliders line up. */
  .control-group.inline label {
    flex: 0 0 2.2em;
    white-space: nowrap;
  }

  .control-group.inline .slider-value-input {
    flex: 0 0 auto;
  }

  .control-group.inline .unit {
    flex: 0 0 2.4em;
  }

  .control-group.inline input[type="range"] {
    flex: 1 1 auto;
    width: auto;
    min-width: 60px;
    margin: 0;
  }

  .slider-value-input {
    width: 5.5em;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid #555;
    border-radius: 3px;
    color: #ddd;
    font-size: 12px;
    font-family: inherit;
    padding: 1px 4px;
    outline: none;
    text-align: right;
  }

  .slider-value-input:hover:not(:disabled) {
    border-color: #777;
  }

  .slider-value-input:focus {
    border-color: #4a90d9;
    background: rgba(255, 255, 255, 0.1);
  }

  .slider-value-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .unit {
    color: #aaa;
    font-size: 12px;
  }
</style>
