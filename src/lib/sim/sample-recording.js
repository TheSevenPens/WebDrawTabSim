import { createClip } from './timeline.js';

// A deliberately illustrative mapping for the bundled sample, not device calibration.
// Uniform XY scaling preserves the recorded shape within a 120 x 70 mm region.
export function createSampleRecording(source) {
    const column = name => {
        const index = source.columns.indexOf(name);
        if (index < 0) throw new Error(`Sample recording is missing ${name}`);
        return index;
    };
    const slots = Object.fromEntries(['arrived', 'x', 'y', 'height', 'lean', 'azimuth', 'twist', 'pressure'].map(name => [name, column(name)]));
    const rows = ['approach', 'readings', 'departure'].flatMap(list => source.stroke[list].map((row, index) => ({
        id: `stroke-0/${list}/${index}`, row, phase: list === 'readings' ? 'Contact' : list === 'approach' ? 'Approach' : 'Departure',
    })));
    if (rows.length < 2) throw new Error('Sample recording needs at least two readings');
    for (const { row } of rows) for (const index of Object.values(slots)) {
        if (!Number.isFinite(row[index])) throw new Error('Invalid sample value');
    }
    const xs = rows.map(({ row }) => row[slots.x]), ys = rows.map(({ row }) => row[slots.y]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const scale = Math.min(120 / Math.max(maxX - minX, 1), 70 / Math.max(maxY - minY, 1));
    const maxHeight = Math.max(1, ...rows.map(({ row }) => row[slots.height]));
    const origin = rows[0].row[slots.arrived];
    const wrap = angle => ((angle % 360) + 360) % 360;
    const clip = createClip(rows.map(({ id, row, phase }) => ({
        id, time: (row[slots.arrived] - origin) / 1000,
        values: {
            tabletX: 192 + (row[slots.x] - (minX + maxX) / 2) * scale,
            tabletY: 108 + (row[slots.y] - (minY + maxY) / 2) * scale,
            distance: phase === 'Contact' ? 0 : Math.max(0, row[slots.height]) / maxHeight * 8,
            tiltAltitude: row[slots.lean],
            // Assume compass zero at screen up, clockwise; choose arbitrary twist zero.
            tiltAzimuth: wrap(180 - row[slots.azimuth]),
            barrelRotation: wrap(-row[slots.twist]),
            phase, pressure: row[slots.pressure] / source.device.fullScalePressure,
        },
    })), { channels: { tiltAzimuth: 'angle', barrelRotation: 'angle', phase: 'hold', distance: 'hold', pressure: 'hold' } });
    // Hold measured height/pressure at batch boundaries: don't blend contact into hover.
    // XY and angles interpolate for display; exact stepping retains every original row.
    return { clip, rows, scale, timeOriginMicroseconds: origin };
}
