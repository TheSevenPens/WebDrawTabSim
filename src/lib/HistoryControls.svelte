<script>
  let { status, onUndo, onRedo } = $props();
</script>

<div data-history-controls class="history-controls">
  <button type="button" disabled={!status.canUndo} onclick={onUndo} title={status.undoLabel ? `Undo: ${status.undoLabel}` : 'Nothing to undo'}>Undo</button>
  <button type="button" disabled={!status.canRedo} onclick={onRedo} title={status.redoLabel ? `Redo: ${status.redoLabel}` : 'Nothing to redo'}>Redo</button>
</div>
<small>Ctrl/Cmd+Z · Ctrl/Cmd+Shift+Z</small>

<style>
  .history-controls { display: flex; gap: 8px; margin-top: 10px; }
  button { flex: 1; padding: 6px; background: #343b46; color: #eee; border: 1px solid #687382; border-radius: 3px; }
  button:disabled { opacity: 0.5; }
  button:focus-visible { outline: 2px solid #75bdff; outline-offset: 2px; }
  small { display: block; margin-top: 4px; font-size: 11px; color: #bbb; }
</style>
