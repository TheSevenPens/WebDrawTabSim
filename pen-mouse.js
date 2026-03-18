// pen-mouse.js — Spacebar + mouse drag control for pen position
// Extends Pen3DSim.prototype (must be loaded after pen3dsim.js)

Object.assign(Pen3DSim.prototype, {

    initMouseControl() {
        this.spaceBarPressed = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.isDraggingPen = false;

        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup',   (e) => this.handleKeyUp(e));

        // Use capture phase to intercept before OrbitControls
        this.renderer.domElement.addEventListener('mousedown',  (e) => this.handleMouseDown(e), true);
        this.renderer.domElement.addEventListener('mousemove',  (e) => this.handleMouseMove(e), true);
        this.renderer.domElement.addEventListener('mouseup',    (e) => this.handleMouseUp(e),   true);
        this.renderer.domElement.addEventListener('mouseleave', (e) => this.handleMouseUp(e));
    },

    handleKeyDown(e) {
        if (e.code === 'Space' && !e.repeat) {
            e.preventDefault();
            this.spaceBarPressed = true;
            this.controls.enabled = false;
            this.renderer.domElement.style.cursor = 'move';
        }
    },

    handleKeyUp(e) {
        if (e.code === 'Space') {
            e.preventDefault();
            this.spaceBarPressed = false;
            this.isDraggingPen = false;
            this.renderer.domElement.style.cursor = '';
            this.controls.enabled = true;
        }
    },

    handleMouseDown(e) {
        if (this.spaceBarPressed) {
            e.preventDefault();
            e.stopPropagation();
            this.isDraggingPen = true;
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.lastMouseX = e.clientX - rect.left;
            this.lastMouseY = e.clientY - rect.top;
            this.renderer.domElement.style.cursor = 'move';
            this.controls.enabled = false;
        }
    },

    handleMouseMove(e) {
        if (this.isDraggingPen && this.spaceBarPressed) {
            e.preventDefault();
            e.stopPropagation();
            const rect = this.renderer.domElement.getBoundingClientRect();
            const currentMouseX = e.clientX - rect.left;
            const currentMouseY = e.clientY - rect.top;

            const deltaX = currentMouseX - this.lastMouseX;
            const deltaY = currentMouseY - this.lastMouseY;

            // 0.01 inches per pixel — adjust to taste
            const scaleFactor = 0.01;
            const newTabletX = this.tabletOffsetX + deltaX * scaleFactor;
            const newTabletZ = this.tabletOffsetZ + deltaY * scaleFactor;

            this.setTabletPositionX(THREE.MathUtils.clamp(newTabletX, 0, this.tabletWidth));
            this.setTabletPositionZ(THREE.MathUtils.clamp(newTabletZ, 0, this.tabletDepth));

            this.lastMouseX = currentMouseX;
            this.lastMouseY = currentMouseY;
        } else if (this.spaceBarPressed) {
            this.renderer.domElement.style.cursor = 'move';
        }
    },

    handleMouseUp(e) {
        if (this.isDraggingPen && this.spaceBarPressed) {
            e.preventDefault();
            e.stopPropagation();
        }
        this.isDraggingPen = false;
        if (!this.spaceBarPressed) {
            this.renderer.domElement.style.cursor = '';
            this.controls.enabled = true;
        }
    },

});
