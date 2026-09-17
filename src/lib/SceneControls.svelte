<script>
  import { onDestroy } from 'svelte';
  import { MAX_SCENE_BYTES } from './sim/scene-document.js';
  let { onSave, onLoad } = $props();
  let picker;
  let status = $state('');
  let request = 0;
  let disposed = false;
  onDestroy(() => { disposed = true; request++; });

  function save() {
    try {
      const text = onSave();
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      try {
        const link = document.createElement('a');
        link.href = url; link.download = 'DrawTabSim-scene.json'; link.click();
        status = 'Scene saved. Playback is paused.';
      } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
    } catch (error) { status = `Save failed: ${error.message}`; }
  }

  async function load(event) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    const token = ++request;
    status = 'Reading scene…';
    try {
      if (file.size > MAX_SCENE_BYTES) throw new Error('Scene file is too large (maximum 128 KiB)');
      const text = await file.text();
      if (disposed || token !== request) return;
      onLoad(text);
      status = `Loaded ${file.name}`;
    } catch (error) {
      if (!disposed && token === request) status = `Load failed: ${error.message}`;
    }
  }
</script>

<div data-scene-controls class="scene-controls">
  <div class="buttons">
    <button type="button" onclick={save}>Save scene</button>
    <button type="button" onclick={() => picker.click()}>Load scene…</button>
  </div>
  <input bind:this={picker} type="file" accept=".json,application/json" aria-label="Load scene file" onchange={load} hidden />
  <p role="status">{status}</p>
</div>

<style>
  .scene-controls { margin: 10px 0; }
  .buttons { display: flex; gap: 8px; }
  button { flex: 1; padding: 6px; background: #343b46; color: #eee; border: 1px solid #687382; border-radius: 3px; }
  button:focus-visible { outline: 2px solid #75bdff; outline-offset: 2px; }
  p { font-size: 12px; overflow-wrap: anywhere; margin: 5px 0; }
  p:empty { display: none; }
</style>
