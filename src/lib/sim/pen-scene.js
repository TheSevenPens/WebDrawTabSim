import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Pen3DSim } from './Pen3DSim.js';

// pen-scene.js — Scene, renderer, cameras, lighting, and camera settings
// Extends Pen3DSim.prototype (must be loaded after Pen3DSim.js)

Object.assign(Pen3DSim.prototype, {

    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a);
    },

    initCameras() {
        const cameraAspectRatio = this.viewer.clientWidth / this.viewer.clientHeight;
        const cameraNear = 0.1;
        const cameraFar = 1000;

        this.perspectiveCamera = new THREE.PerspectiveCamera(30, cameraAspectRatio, cameraNear, cameraFar);
        const yRotation = 50 * Math.PI / 180;
        const initialX = 0;
        const initialZ = 25;
        const rotatedX = initialX * Math.cos(yRotation) - initialZ * Math.sin(yRotation);
        const rotatedZ = initialX * Math.sin(yRotation) + initialZ * Math.cos(yRotation);
        this.perspectiveCamera.position.set(rotatedX, 15, rotatedZ);
        this.perspectiveCamera.lookAt(0, 0, 0);

        const orthoSize = 20;
        this.orthographicCamera = new THREE.OrthographicCamera(
            -orthoSize * cameraAspectRatio,
            orthoSize * cameraAspectRatio,
            orthoSize,
            -orthoSize,
            cameraNear,
            cameraFar
        );
        this.orthographicCamera.position.set(rotatedX, 15, rotatedZ);
        this.orthographicCamera.lookAt(0, 0, 0);

        this.camera = this.perspectiveCamera;
        this.orthoSize = orthoSize;
    },

    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        this.renderer.setSize(this.viewer.clientWidth, this.viewer.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.viewer.appendChild(this.renderer.domElement);
    },

    initControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 100;
        this.controls.maxPolarAngle = Math.PI / 2;
        this.controls.update();
    },

    initLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 20, 0);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.left = -15;
        directionalLight.shadow.camera.right = 15;
        directionalLight.shadow.camera.top = 15;
        directionalLight.shadow.camera.bottom = -15;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 50;
        this.scene.add(directionalLight);

        const pointLight = new THREE.PointLight(0xffffff, 0.3);
        pointLight.position.set(-10, 10, -10);
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
