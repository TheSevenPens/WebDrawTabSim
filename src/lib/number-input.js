/** Commit a finite value without treating zero as an absent value. */
export function normalizeNumber(value, min, max, decimals) {
    const number = Number(value);
    const rounded = Number.isFinite(number) ? Number(number.toFixed(decimals)) : min;
    return Math.min(max, Math.max(min, rounded));
}
