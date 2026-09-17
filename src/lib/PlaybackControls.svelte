<script>
  let { transport, status } = $props();
  function rangeChange(event, start) {
    const value = event.currentTarget.valueAsNumber * 1000;
    const low = start ? value : status.inPoint;
    const high = start ? status.outPoint : value;
    if (Number.isFinite(value) && low >= 0 && low < high && high <= status.duration) transport.setRange(low, high);
    event.currentTarget.value = String((start ? status.inPoint : status.outPoint) / 1000);
  }
</script>

<fieldset data-playback-controls disabled={!status.loaded}>
  <legend>Playback</legend>
  <div class="buttons">
    <button type="button" onclick={() => status.playing ? transport.pause() : transport.play()}>{status.playing ? 'Pause' : 'Play'}</button>
    <button type="button" onclick={() => transport.stop()}>Stop</button>
    <button type="button" aria-label="Previous keyframe" onclick={() => transport.step(-1)}>◀ Key</button>
    <button type="button" aria-label="Next keyframe" onclick={() => transport.step(1)}>Key ▶</button>
  </div>
  <label>Time: {(status.time / 1000).toFixed(3)} s / {(status.duration / 1000).toFixed(3)} s
    <input aria-label="Playback time" type="range" min={status.inPoint} max={status.outPoint || 1} step="1" value={status.time} oninput={event => transport.seek(Number(event.currentTarget.value))} />
  </label>
  <div class="settings">
    <label>Speed <select aria-label="Playback speed" value={status.speed} onchange={event => transport.setSpeed(Number(event.currentTarget.value))}>
      <option value={0.25}>0.25×</option><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option><option value={4}>4×</option>
    </select></label>
    <label><input type="checkbox" checked={status.loop} onchange={event => transport.setLoop(event.currentTarget.checked)} /> Loop</label>
  </div>
  <div class="settings">
    <label>In (s) <input aria-label="Playback in point" type="number" min="0" max={status.outPoint / 1000} step="0.001" value={status.inPoint / 1000} onchange={event => rangeChange(event, true)} /></label>
    <label>Out (s) <input aria-label="Playback out point" type="number" min={status.inPoint / 1000} max={status.duration / 1000} step="0.001" value={status.outPoint / 1000} onchange={event => rangeChange(event, false)} /></label>
  </div>
  <small>{!status.loaded ? 'Choose an animation to load a clip.' : status.index === null ? 'Between keyframes' : `Keyframe ${status.index + 1}`}</small>
</fieldset>

<style>
  fieldset { margin: 10px 0; padding: 10px; border: 1px solid #666; border-radius: 5px; }
  legend { padding: 0 4px; }
  .buttons, .settings { display: flex; gap: 8px; margin-bottom: 8px; align-items: center; }
  .buttons button { flex: 1; padding: 5px 2px; }
  label { font-size: 12px; }
  input[type=range] { width: 100%; margin: 8px 0; }
  input[type=number] { width: 80px; }
  button, select, input[type=number] { background: #343b46; color: #eee; border: 1px solid #687382; border-radius: 3px; }
  :disabled { opacity: 0.65; }
  button:focus-visible, select:focus-visible, input:focus-visible { outline: 2px solid #75bdff; outline-offset: 2px; }
</style>
