import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Pen3DSim } from './Pen3DSim.js';
import { SCENE, CAMERA_INITIAL, SCALE } from './config.js';

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
        // Basic (unfiltered) shadow map for crisp, hard-edged shadows.
        this.renderer.shadowMap.type = THREE.BasicShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.viewer.appendChild(this.renderer.domElement);
    },

    initControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 1 * SCALE;
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
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.88);
        this.scene.add(ambientLight);

        // Warm key from above-front (position sets direction; scaled to keep the
        // light outside the now-larger scene so the shadow frustum stays valid)
        const directionalLight = new THREE.DirectionalLight(0xfff5eb, 0.75);
        directionalLight.position.set(8 * SCALE, 28 * SCALE, 12 * SCALE);
        directionalLight.castShadow = true;
        // High-res map over a frustum tightened to the desk/tablet area so each
        // texel is small and the (unfiltered) pen shadow stays crisp.
        directionalLight.shadow.mapSize.width = 4096;
        directionalLight.shadow.mapSize.height = 4096;
        directionalLight.shadow.camera.left = -24 * SCALE;
        directionalLight.shadow.camera.right = 24 * SCALE;
        directionalLight.shadow.camera.top = 24 * SCALE;
        directionalLight.shadow.camera.bottom = -24 * SCALE;
        directionalLight.shadow.camera.near = 0.1 * SCALE;
        directionalLight.shadow.camera.far = 100 * SCALE;
        directionalLight.shadow.bias = -0.0002;   // normalized depth — not scaled
        this.scene.add(directionalLight);

        // Cool fill from the front so the desk isn’t flat
        const fillLight = new THREE.DirectionalLight(0xe8f0ff, 0.45);
        fillLight.position.set(-6 * SCALE, 12 * SCALE, 22 * SCALE);
        this.scene.add(fillLight);

        // Soft bounce from behind to lift white walls
        const wallFill = new THREE.DirectionalLight(0xffffff, 0.3);
        wallFill.position.set(0, 20 * SCALE, -30 * SCALE);
        this.scene.add(wallFill);

        // Point light has distance falloff (decay), so scaling its position ×SCALE
        // would dim it by SCALE²; compensate the intensity to keep the same look.
        const pointLight = new THREE.PointLight(0xffffff, 0.2 * SCALE * SCALE);
        pointLight.position.set(-12 * SCALE, 14 * SCALE, -8 * SCALE);
        this.scene.add(pointLight);
    },

    getCameraSettings() {
        try {
            const cam = this.camera;
            const pos = cam.position;
            const rot = cam.rotation;
            const isPerspective = cam === this.perspectiveCamera;
            const target = this.controls.target || new THREE.Vector3(0, 0, 0);
            const distance = pos.distanceTo(target);

            let settings = `Type: ${isPerspective ? 'Perspective' : 'Orthographic'}\n`;
            settings += `Position: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})\n`;
            settings += `Rotation: (${(rot.x * 180 / Math.PI).toFixed(2)}°, ${(rot.y * 180 / Math.PI).toFixed(2)}°, ${(rot.z * 180 / Math.PI).toFixed(2)}°)\n`;

            if (isPerspective) {
                settings += `FOV: ${cam.fov.toFixed(1)}°\n`;
                settings += `Aspect: ${cam.aspect.toFixed(3)}\n`;
            } else {
                settings += `Size: ${this.orthoSize.toFixed(2)}\n`;
                settings += `Aspect: ${cam.aspect.toFixed(3)}\n`;
            }

            settings += `Near: ${cam.near.toFixed(2)}, Far: ${cam.far.toFixed(0)}\n`;
            settings += `Distance: ${distance.toFixed(2)}\n`;
            settings += `Target: (${target.x.toFixed(2)}, ${target.y.toFixed(2)}, ${target.z.toFixed(2)})`;

            return settings;
        } catch (error) {
            return `Error getting camera settings: ${error.message}`;
        }
    },

    getCameraSettingsJSON() {
        try {
            const cam = this.camera;
            const pos = cam.position;
            const rot = cam.rotation;
            const isPerspective = cam === this.perspectiveCamera;
            const target = this.controls.target || new THREE.Vector3(0, 0, 0);

            const settings = {
                type: isPerspective ? 'perspective' : 'orthographic',
                position: { x: pos.x, y: pos.y, z: pos.z },
                rotation: { x: rot.x, y: rot.y, z: rot.z },
                target:   { x: target.x, y: target.y, z: target.z },
                near: cam.near,
                far: cam.far,
                aspect: cam.aspect
            };

            if (isPerspective) {
                settings.fov = cam.fov;
            } else {
                settings.size = this.orthoSize;
            }

            return JSON.stringify(settings, null, 2);
        } catch (error) {
            throw new Error(`Error getting camera settings: ${error.message}`);
        }
    },

    setCameraSettingsJSON(jsonString) {
        try {
            const settings = JSON.parse(jsonString);

            if (!settings.position || !settings.rotation || !settings.target) {
                throw new Error('Missing required fields: position, rotation, or target');
            }

            const usePerspective = settings.type === 'perspective' || (settings.type !== 'orthographic' && this.camera === this.perspectiveCamera);

            if (usePerspective && this.camera !== this.perspectiveCamera) {
                this.perspectiveCamera.position.copy(this.orthographicCamera.position);
                this.perspectiveCamera.rotation.copy(this.orthographicCamera.rotation);
                this.camera = this.perspectiveCamera;
                this.controls.object = this.camera;
            } else if (!usePerspective && this.camera !== this.orthographicCamera) {
                this.orthographicCamera.position.copy(this.perspectiveCamera.position);
                this.orthographicCamera.rotation.copy(this.perspectiveCamera.rotation);
                this.camera = this.orthographicCamera;
                this.controls.object = this.camera;
            }

            this.camera.position.set(settings.position.x, settings.position.y, settings.position.z);
            this.camera.rotation.set(settings.rotation.x, settings.rotation.y, settings.rotation.z);

            if (settings.target) {
                this.controls.target.set(settings.target.x, settings.target.y, settings.target.z);
            }

            if (usePerspective && settings.fov !== undefined) {
                this.perspectiveCamera.fov = settings.fov;
                this.perspectiveCamera.updateProjectionMatrix();
            } else if (!usePerspective && settings.size !== undefined) {
                this.orthoSize = settings.size;
                const aspect = this.camera.aspect;
                this.orthographicCamera.left   = -this.orthoSize * aspect;
                this.orthographicCamera.right  =  this.orthoSize * aspect;
                this.orthographicCamera.top    =  this.orthoSize;
                this.orthographicCamera.bottom = -this.orthoSize;
                this.orthographicCamera.updateProjectionMatrix();
            }

            if (settings.near   !== undefined) this.camera.near   = settings.near;
            if (settings.far    !== undefined) this.camera.far    = settings.far;
            if (settings.aspect !== undefined) this.camera.aspect = settings.aspect;
            this.camera.updateProjectionMatrix();

            this.controls.update();
            return true;
        } catch (error) {
            throw new Error(`Error applying camera settings: ${error.message}`);
        }
    },

});
