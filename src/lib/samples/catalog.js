import approach from './approach-confirmed-stroke-1.json';
import loops from './four-loops-stroke-1.json';
import { createSampleRecording } from '../sim/sample-recording.js';

export const sampleRecordings = [
    { id: 'approach', label: 'Approach confirmed · stroke 1',
        note: 'Recorded batch-arrival timing. Position, hover height and orientation mapping are illustrative.',
        recording: createSampleRecording(approach) },
    { id: 'loop', label: 'Four loops, four orientations · loop 1',
        note: 'Contact only. Illustrative 2-second timing: this recording has no host clock or measured hover height. Position and orientation mapping are illustrative.',
        recording: createSampleRecording(loops, { contactOnly: true, illustrativeDurationMs: 2000 }) },
];
