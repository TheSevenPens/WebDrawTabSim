// Group browser gestures without coupling the portable history to DOM events.
export function attachEditGestures({ root, windowTarget, onBegin, onEnd }) {
    let active = null;
    const events = new AbortController();
    const listen = (target, type, fn, capture = false) =>
        target.addEventListener(type, fn, { signal: events.signal, capture });
    const excluded = target => target.closest?.('[data-playback-controls], [data-scene-controls], [data-history-controls]');
    const finish = () => {
        if (!active) return;
        const old = active; active = null;
        onEnd(old.kind);
    };
    function begin(target, kind, label, pointerId = null) {
        if (active?.target === target && active.kind === kind) return;
        finish();
        active = { target, kind, pointerId };
        onBegin(label, kind);
    }
    listen(root, 'pointerdown', event => {
        if (excluded(event.target)) return;
        if (event.button === 0 && event.target.matches?.('input[type="range"]'))
            begin(event.target, 'range', 'Adjust slider', event.pointerId);
        else if (event.target.matches?.('#viewer canvas'))
            begin(event.target, 'viewport', 'Move view or pen', event.pointerId);
    }, true);
    listen(root, 'focusin', event => {
        if (active && active.target !== event.target) finish();
        if (!excluded(event.target) && event.target.matches?.('input[type="number"]'))
            begin(event.target, 'number', `Edit ${event.target.getAttribute('aria-label') || 'value'}`);
    });
    // Removing a focused field (for example by changing a tab) need not emit
    // blur/focusout. Click runs after normal blur rounding when blur does occur.
    listen(root, 'click', event => {
        if (active?.kind === 'number' && active.target !== event.target) finish();
    });
    listen(root, 'keydown', event => {
        if (!event.ctrlKey && !event.metaKey && !event.altKey && !excluded(event.target) &&
            event.target.matches?.('input[type="range"]') &&
            ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key))
            begin(event.target, 'keys', 'Adjust slider');
    }, true);
    listen(windowTarget, 'keyup', event => {
        if (active?.kind === 'keys' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) finish();
        if (active?.kind === 'viewport' && event.code === 'Space') finish();
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        listen(windowTarget, type, event => {
            if (active?.pointerId === event.pointerId) finish();
        });
    }
    // focusout follows the numeric field's blur normalization.
    listen(root, 'focusout', event => { if (active?.target === event.target) finish(); });
    listen(windowTarget, 'blur', finish);
    return { finish, viewportActive: () => active?.kind === 'viewport',
        dispose() { finish(); events.abort(); } };
}

export function historyShortcut(event) {
    if (event.defaultPrevented || event.isComposing || event.altKey || !(event.ctrlKey || event.metaKey)) return null;
    // Keep native editing history in text and numeric fields.
    if (event.target?.closest?.('input:not([type="range"]), textarea, select, [contenteditable]:not([contenteditable="false"])')) return null;
    const key = event.key.toLowerCase();
    if (key === 'z') return event.shiftKey ? 'redo' : 'undo';
    if (key === 'y' && !event.shiftKey) return 'redo';
    return null;
}
