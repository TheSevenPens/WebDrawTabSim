// Import the base class first, then each companion extends its prototype.
// Import order matters: Pen3DSim must be defined before companions run.
export { Pen3DSim } from './Pen3DSim.js';
import './pen-scene.js';
import './pen-tablet.js';
import './pen-monitor.js';
import './pen-pen.js';
import './pen-annotations.js';
import './pen-mouse.js';
