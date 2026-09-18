<script>
  let { onPlay, onSelect, options, selected, note, active, frame, count } = $props();
</script>

<section data-playback-controls aria-label="Sample recording">
  <label>Sample recording
    <select aria-label="Sample recording" value={selected} onchange={event => onSelect(event.currentTarget.value)}>
      {#each options as option}<option value={option.id}>{option.label}</option>{/each}
    </select>
  </label>
  <button type="button" onclick={onPlay}>Play sample stroke</button>
  <small>{note}</small>
  {#if active && frame}
    <p data-testid="sample-reading">{frame.values.phase} · Pressure {(frame.values.pressure * 100).toFixed(1)}%<br />
      {frame.index === null ? 'Interpolated pose' : `Sample ${frame.index + 1} of ${count}`}</p>
  {/if}
  <small><a href="https://thesevenpens.github.io/StrokeCorpus/" target="_blank" rel="noreferrer">Stroke Corpus · TheSevenPens</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a><br />Extracted and mapped for this demonstration.</small>
</section>

<style>
  section { color: #eee; margin-top: 12px; padding: 10px; border: 1px solid #687382; border-radius: 5px; }
  button { width: 100%; padding: 7px; background: #343b46; color: #eee; border: 1px solid #687382; border-radius: 3px; }
  label { display: block; font-size: 12px; }
  select { display: block; width: 100%; margin: 5px 0 8px; padding: 5px; background: #343b46; color: #eee; border: 1px solid #687382; border-radius: 3px; }
  button { margin-bottom: 8px; }
  p { font-size: 12px; margin: 8px 0; }
  small { display: block; font-size: 11px; line-height: 1.5; color: #cbd2dc; }
  a { color: #9cd3ff; }
  button:focus-visible, a:focus-visible, select:focus-visible { outline: 2px solid #75bdff; outline-offset: 2px; }
</style>
