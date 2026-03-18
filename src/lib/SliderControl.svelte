<script>
  let { label = '', value = $bindable(0), min = 0, max = 1, step = 1, unit = '', decimals = 2, disabled = false, oninput } = $props();

  const id = `slider-${Math.random().toString(36).slice(2)}`;
  let displayValue = $derived(Number(value).toFixed(decimals));
</script>

<div class="control-group">
  <label for={id}>{label}: <span class="slider-value">{displayValue}{unit}</span></label>
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
