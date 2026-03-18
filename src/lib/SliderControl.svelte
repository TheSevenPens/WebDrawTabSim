<script>
  export let label    = '';
  export let value    = 0;
  export let min      = 0;
  export let max      = 1;
  export let step     = 1;
  export let unit     = '';
  export let decimals = 2;
  export let disabled = false;

  const id = `slider-${Math.random().toString(36).slice(2)}`;
  $: displayValue = Number(value).toFixed(decimals);
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
    on:input
  />
</div>
