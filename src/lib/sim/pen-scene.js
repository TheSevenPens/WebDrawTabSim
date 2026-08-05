import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Pen3DSim } from './Pen3DSim.js';
import { SCENE } from './config.js';

// pen-scene.js — Scene, renderer, cameras, lighting, and camera settings
// Extends Pen3DSim.prototype (must be loaded after Pen3DSim.js)

Object.assign(Pen3DSim.prototype, {

    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(SCENE.background);
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
        // No logarithmic depth — GTAO reconstructs positions from a linear depth buffer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        this.renderer.setSize(this.viewer.clientWidth, this.viewer.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.viewer.appendChild(this.renderer.domElement);
    },

    /** Ground-truth AO for contact shading around the pen, tablet, and desk. */
    initComposer() {
        const width = this.viewer.clientWidth;
        const height = this.viewer.clientHeight;

        this.composer = new EffectComposer(this.renderer);

        this.renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(this.renderPass);

        this.gtaoPass = new GTAOPass(this.scene, this.camera, width, height);
        this.gtaoPass.output = GTAOPass.OUTPUT.Default;
        // World units are inches; keep AO local to creases / contact edges
        this.gtaoPass.updateGtaoMaterial({
            radius: 2.5,
            distanceExponent: 1.5,
            thickness: 1.5,
            scale: 1.15,
            samples: 16,
            distanceFallOff: 1.0,
            screenSpaceRadius: false,
        });
        this.gtaoPass.updatePdMaterial({
            lumaPhi: 10,
            depthPhi: 2,
            normalPhi: 3,
            radius: 8,
            radiusExponent: 1.5,
            rings: 2,
            samples: 16,
        });
        this.gtaoPass.blendIntensity = 0.7;
        this.composer.addPass(this.gtaoPass);

        this.composer.addPass(new OutputPass());

        const clipBox = new THREE.Box3().setFromObject(this.scene);
        if (!clipBox.isEmpty()) {
            this.gtaoPass.setSceneClipBox(clipBox);
        }
    },

    /** Keep AO / render passes pointed at the active camera (perspective ↔ ortho). */
    syncComposerCamera() {
        if (!this.composer || !this.gtaoPass || !this.renderPass) return;
        this.renderPass.camera = this.camera;
        this.gtaoPass.camera = this.camera;
        const isPersp = this.camera.isPerspectiveCamera ? 1 : 0;
        if (this.gtaoPass.gtaoMaterial.defines.PERSPECTIVE_CAMERA !== isPersp) {
            this.gtaoPass.gtaoMaterial.defines.PERSPECTIVE_CAMERA = isPersp;
            this.gtaoPass.gtaoMaterial.needsUpdate = true;
        }
        this.gtaoPass.gtaoMaterial.uniforms.cameraNear.value = this.camera.near;
        this.gtaoPass.gtaoMaterial.uniforms.cameraFar.value = this.camera.far;
    },

    renderFrame() {
        if (this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
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
        // Soft ambient so light wood and white walls stay bright
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.88);
        this.scene.add(ambientLight);

        // Warm key from above-front
        const directionalLight = new THREE.DirectionalLight(0xfff5eb, 0.75);
        directionalLight.position.set(8, 28, 12);
        directionalLight.castShadow = true;
        // Higher res + PCF (not soft) keeps the pen shadow sharper without
        // clipping the rest of the room’s shadow coverage.
        directionalLight.shadow.mapSize.width = 4096;
        directionalLight.shadow.mapSize.height = 4096;
        directionalLight.shadow.camera.left = -50;
        directionalLight.shadow.camera.right = 50;
        directionalLight.shadow.camera.top = 40;
        directionalLight.shadow.camera.bottom = -40;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 100;
        directionalLight.shadow.bias = -0.0002;
        this.scene.add(directionalLight);

        // Cool fill from the front so the desk isn’t flat
        const fillLight = new THREE.DirectionalLight(0xe8f0ff, 0.45);
        fillLight.position.set(-6, 12, 22);
        this.scene.add(fillLight);

        // Soft bounce from behind to lift white walls
        const wallFill = new THREE.DirectionalLight(0xffffff, 0.3);
        wallFill.position.set(0, 20, -30);
        this.scene.add(wallFill);

        const pointLight = new THREE.PointLight(0xffffff, 0.2);
        pointLight.position.set(-12, 14, -8);
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
            this.syncComposerCamera();
            return true;
        } catch (error) {
            throw new Error(`Error applying camera settings: ${error.message}`);
        }
    },

});
