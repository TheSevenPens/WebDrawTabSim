import * as THREE from 'three';
import { SCALE } from './config.js';

// Textures Factory - Creates all textures used in Pen3DSim

export class TexturesFactory {
    // Create a checkerboard texture for the pen
    static createCheckerboardTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext('2d');

        const checkSize = 256;
        const checksX = canvas.width / checkSize;
        const checksY = canvas.height / checkSize;

        const checkColor1 = '#ff77dd';
        const checkColor2 = '#aa33bb';
        for (let y = 0; y < checksY; y++) {
            for (let x = 0; x < checksX; x++) {
                const isEven = (x + y) % 2 === 0;
                context.fillStyle = isEven ? checkColor1 : checkColor2;
                context.fillRect(x * checkSize, y * checkSize, checkSize, checkSize);
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        return texture;
    }

    // Create a checkerboard texture for the tablet
    static createTabletCheckerboardTexture(tabletWidth, tabletDepth, color1 = '#e4d8f0', color2 = '#c8b4dc') {
        // Grid spacing 0.25 in (→ mm), tablet active area 384x216 mm → 64x36 squares
        // So we need 64x36 squares
        const gridSpacing = 0.25 * SCALE;
        const squaresX = tabletWidth / gridSpacing; // 64
        const squaresZ = tabletDepth / gridSpacing; // 36

        // Create a high-resolution texture for crisp squares
        // Use aspect ratio to ensure squares appear square on the tablet
        const baseTextureSize = 512;
        const canvas = document.createElement('canvas');
        canvas.width = baseTextureSize;
        canvas.height = Math.round(baseTextureSize * (tabletDepth / tabletWidth)); // Account for aspect ratio
        const context = canvas.getContext('2d');

        const squareSizeX = canvas.width / squaresX;
        const squareSizeZ = canvas.height / squaresZ;

        const checkColor1 = color1;
        const checkColor2 = color2;

        for (let z = 0; z < squaresZ; z++) {
            for (let x = 0; x < squaresX; x++) {
                const isEven = (x + z) % 2 === 0;
                context.fillStyle = isEven ? checkColor1 : checkColor2;
                context.fillRect(x * squareSizeX, z * squareSizeZ, squareSizeX, squareSizeZ);
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 1);
        return texture;
    }

    // Create a simple Windows-style desktop texture (1920x1080)
    static createDesktopTexture() {
        const W = 1920, H = 1080;
        const taskbarH = 40;

        const canvas = document.createElement('canvas');
        canvas.width  = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');

        // Desktop background — Windows blue
        ctx.fillStyle = '#2b5797';
        ctx.fillRect(0, 0, W, H);

        // Taskbar — light gray strip at the bottom
        ctx.fillStyle = '#c0c0c0';
        ctx.fillRect(0, H - taskbarH, W, taskbarH);

        return new THREE.CanvasTexture(canvas);
    }

    /**
     * Subtle procedural wood grain for the desk top (light maple).
     * Grain runs along the desk depth (V) so strips read as planks from above.
     */
    static createWoodGrainTexture() {
        const W = 512, H = 512;
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#d4b896';
        ctx.fillRect(0, 0, W, H);

        for (let i = 0; i < 48; i++) {
            const x = (i / 48) * W + (Math.sin(i * 1.7) * 3);
            const alpha = 0.04 + (i % 5) * 0.012;
            ctx.strokeStyle = `rgba(160, 120, 70, ${alpha})`;
            ctx.lineWidth = 1 + (i % 3) * 0.5;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            for (let y = 0; y <= H; y += 8) {
                ctx.lineTo(x + Math.sin(y * 0.04 + i) * 2.5, y);
            }
            ctx.stroke();
        }

        // Soft plank separators
        for (let p = 1; p < 6; p++) {
            const y = (p / 6) * H;
            ctx.strokeStyle = 'rgba(140, 105, 60, 0.08)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 2);
        return texture;
    }

    // Create a text label texture for axis markers
    static createTextLabelTexture(text, color) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 64;
        canvas.height = 64;

        context.fillStyle = color;
        context.font = 'Bold 16px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, 32, 32);

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }
}
