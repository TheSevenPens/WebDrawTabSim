import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Pen3DSim } from './Pen3DSim.js';
import { SCENE, CAMERA_INITIAL, LIGHTING, SCALE } from './config.js';

// pen-scene.js — Scene, renderer, cameras, lighting, and camera settings
// Extends Pen3DSim.prototype (must be loaded after Pen3DSim.js)

Object.assign(Pen3DSim.prototype, {

    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(SCENE.background);
    },

    initCameras() {
        const cameraAspectRatio = this.viewer.clientWidth / this.viewer.clientHeight;
        const cameraNear = 0.1 * SCALE;
        const cameraFar = 1000 * SCALE;

        // Initial position from azimuth/elevation/distance around the origin,
        // so the camera readout starts at exactly these values.
        const theta = THREE.MathUtils.degToRad(CAMERA_INITIAL.azimuthDeg);
        const phi = THREE.MathUtils.degToRad(90 - CAMERA_INITIAL.elevationDeg);
        const sinPhiR = Math.sin(phi) * CAMERA_INITIAL.distance;
        const rotatedX = sinPhiR * Math.sin(theta);
        const camY = Math.cos(phi) * CAMERA_INITIAL.distance;
        const rotatedZ = sinPhiR * Math.cos(theta);

        // Orbit around a target on the tablet surface (y = yOffset), shifting the
        // whole rig up by it so azimuth/elevation/distance stay exact.
        const targetY = this.yOffset;
        this.perspectiveCamera = new THREE.PerspectiveCamera(30, cameraAspectRatio, cameraNear, cameraFar);
        this.perspectiveCamera.position.set(rotatedX, camY + targetY, rotatedZ);
        this.perspectiveCamera.lookAt(0, targetY, 0);

        const orthoSize = 20 * SCALE;
        this.orthographicCamera = new THREE.OrthographicCamera(
            -orthoSize * cameraAspectRatio,
            orthoSize * cameraAspectRatio,
            orthoSize,
            -orthoSize,
            cameraNear,
            cameraFar
        );
        this.orthographicCamera.position.set(rotatedX, camY + targetY, rotatedZ);
        this.orthographicCamera.lookAt(0, targetY, 0);

        this.camera = this.perspectiveCamera;
        this.orthoSize = orthoSize;
    },

    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, logarithmicDepthBuffer: true });
        this.renderer.setSize(this.viewer.clientWidth, this.viewer.clientHeight);
        this.renderer.shadowMap.enabled = true;
        // PCF-filtered shadow map: keeps edges crisp at this texel density while
        // anti-aliasing the stair-stepping that BasicShadowMap left on the small
        // pen shadow.
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        // Shadows are static except when the pen (or monitor visibility) changes,
        // so don't re-render the shadow map every frame. Callers flip
        // shadowMap.needsUpdate via markShadowsDirty() when geometry moves; the
        // continuous render loop otherwise just re-composites the cached map.
        this.renderer.shadowMap.autoUpdate = false;
        this.renderer.shadowMap.needsUpdate = true;   // render once at startup
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.viewer.appendChild(this.renderer.domElement);
    },

    initControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        // Replace OrbitControls' multiplicative wheel zoom with our own fixed
        // 20 mm step (see handleWheel), matching the camera distance buttons.
        this.controls.enableZoom = false;
        this.controls.minDistance = 20;   // mm (matches the 20 mm zoom step)
        this.controls.maxDistance = 100 * SCALE;
        // Cap elevation at the horizon so the camera stays on/above the target
        // plane; combined with the target being kept at/above the tablet surface
        // (see animate loop), the camera can never go below the surface.
        this.controls.maxPolarAngle = Math.PI / 2;
        this.controls.target.set(0, this.yOffset, 0);
        this.controls.update();
    },

    initLighting() {
        // Soft ambient so light wood and white walls stay bright
        const ambientLight = new THREE.AmbientLight(LIGHTING.ambient.color, LIGHTING.ambient.intensity);
        this.scene.add(ambientLight);

        // Warm key from above-front (position sets direction; scaled to keep the
        // light outside the now-larger scene so the shadow frustum stays valid)
        const key = LIGHTING.key;
        const directionalLight = new THREE.DirectionalLight(key.color, key.intensity);
        directionalLight.position.set(...key.position);
        directionalLight.castShadow = true;
        // Frustum wide enough to cover the whole desk (incl. its legs) so their
        // shadows aren't clipped. 4096 over this frustum is ~0.56 mm/texel, which
        // PCF filtering keeps smooth on the small pen shadow while costing 4× less
        // to render than 8192 (updated only when markShadowsDirty() fires).
        directionalLight.shadow.mapSize.width = key.shadow.mapSize;
        directionalLight.shadow.mapSize.height = key.shadow.mapSize;
        directionalLight.shadow.camera.left = -key.shadow.frustum;
        directionalLight.shadow.camera.right = key.shadow.frustum;
        directionalLight.shadow.camera.top = key.shadow.frustum;
        directionalLight.shadow.camera.bottom = -key.shadow.frustum;
        directionalLight.shadow.camera.near = key.shadow.near;
        directionalLight.shadow.camera.far = key.shadow.far;
        directionalLight.shadow.bias = key.shadow.bias;
        this.scene.add(directionalLight);

        // Cool fill from the front so the desk isn’t flat
        const fillLight = new THREE.DirectionalLight(LIGHTING.fill.color, LIGHTING.fill.intensity);
        fillLight.position.set(...LIGHTING.fill.position);
        this.scene.add(fillLight);

        // Soft bounce from behind to lift the walls
        const wallFill = new THREE.DirectionalLight(LIGHTING.wallFill.color, LIGHTING.wallFill.intensity);
        wallFill.position.set(...LIGHTING.wallFill.position);
        this.scene.add(wallFill);

        // Point light has distance falloff (decay), so scaling its position ×SCALE
        // would dim it by SCALE²; compensate the intensity to keep the same look.
        const pointLight = new THREE.PointLight(LIGHTING.point.color, LIGHTING.point.intensity * SCALE * SCALE);
        pointLight.position.set(...LIGHTING.point.position);
        this.scene.add(pointLight);
    },

});
