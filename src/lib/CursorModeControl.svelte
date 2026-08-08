<script>
  import SelectControl from './SelectControl.svelte';

  // Only controls the on-screen cursor mode (mouse / crosshairs / none) —
  // previously named AnnotationSettings, but it never touched annotations.
  let {
    cursorMode = $bindable(),
    onCursorMode,
  } = $props();

  const options = [
    { value: 'mouse', label: 'mouse' },
    { value: 'crosshairs', label: 'crosshairs' },
    { value: 'none', label: 'none' },
  ];
</script>

<SelectControl label="Cursor:" bind:value={cursorMode} onchange={onCursorMode} {options} />
