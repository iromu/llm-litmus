import * as THREE from 'three';
import { createPathCurve, createTerrain } from './terrain.js';
import { createVegetation } from './vegetation.js';
import { createLighting } from './lighting.js';
import { createRuins } from './ruins.js';
import {
    createWaterfall, createRiver, createSplashPool,
    createWaterfallCliff, createWetSurfaces,
    animateWaterfall, animateRiver, animateSplashPool
} from './water.js';
import { SoundEngine } from './sound.js';
import { PostProcessor } from './postprocessing.js';

// ============================================================================
// MAIN - Jungle Trail Exploration Game
// ============================================================================

// Scene setup
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 500);

// Renderer
const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.8;
document.body.appendChild(renderer.domElement);

// Post-processing
const postProcessor = new PostProcessor(renderer, window.innerWidth, window.innerHeight);

// Sound engine
const sound = new SoundEngine();

// First-person controls
class FPSControls {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;

        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;

        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.euler = new THREE.Euler(0, 0, 0, 'YXZ');

        this.isLocked = false;

        this.init();
    }

    init() {
        this.domElement.addEventListener('click', () => {
            if (!this.isLocked) {
                this.domElement.requestPointerLock();
                sound.init();
            }
        });

        document.addEventListener('pointerlockchange', () => {
            this.isLocked = document.pointerLockElement === this.domElement;
        });

        document.addEventListener('mousemove', (event) => {
            if (!this.isLocked) return;

            const movementX = event.movementX || 0;
            const movementY = event.movementY || 0;

            this.euler.y -= movementX * 0.002;
            this.euler.x -= movementY * 0.002;
            this.euler.x = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, this.euler.x));

            this.camera.quaternion.setFromEuler(this.euler);
        });

        document.addEventListener('keydown', (event) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW': this.moveForward = true; break;
                case 'ArrowLeft':
                case 'KeyA': this.moveLeft = true; break;
                case 'ArrowDown':
                case 'KeyS': this.moveBackward = true; break;
                case 'ArrowRight':
                case 'KeyD': this.moveRight = true; break;
            }
        });

        document.addEventListener('keyup', (event) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW': this.moveForward = false; break;
                case 'ArrowLeft':
                case 'KeyA': this.moveLeft = false; break;
                case 'ArrowDown':
                case 'KeyS': this.moveBackward = false; break;
                case 'ArrowRight':
                case 'KeyD': this.moveRight = false; break;
            }
        });
    }

    update(delta) {
        this.velocity.x -= this.velocity.x * 8.0 * delta;
        this.velocity.z -= this.velocity.z * 8.0 * delta;

        this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
        this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
        this.direction.normalize();

        const speed = 8.0;
        if (this.moveForward || this.moveBackward) {
            this.velocity.z -= this.direction.z * speed * delta;
        }
        if (this.moveLeft || this.moveRight) {
            this.velocity.x -= this.direction.x * speed * delta;
        }

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        right.y = 0;
        right.normalize();

        this.camera.position.addScaledVector(forward, -this.velocity.z);
        this.camera.position.addScaledVector(right, -this.velocity.x);

        if (this.moveForward || this.moveBackward || this.moveLeft || this.moveRight) {
            this.camera.position.y = 1.7 + Math.sin(performance.now() * 0.008) * 0.05;
        } else {
            this.camera.position.y = 1.7;
        }
    }
}

const controls = new FPSControls(camera, renderer.domElement);

// Build the world
console.log('Building jungle trail...');

// 1. Terrain and path
const pathCurve = createPathCurve();
const terrain = createTerrain(scene, pathCurve);

// 2. Vegetation
const vegetation = createVegetation(scene, pathCurve);

// 3. Lighting and atmosphere
const lighting = createLighting(scene, pathCurve);

// 4. Stone ruins
const ruins = createRuins(scene, pathCurve);

// 5. Waterfall and water
const waterfallPos = pathCurve.getPointAt(0.95);
const waterfallBase = new THREE.Vector3(waterfallPos.x, 0, waterfallPos.z - 5);

// Cliff face behind waterfall
const cliff = createWaterfallCliff(scene, waterfallBase, 14, 26);

// Waterfall
const waterfall = createWaterfall(scene, waterfallBase, 22, 10);

// River flowing to waterfall
const river = createRiver(scene, pathCurve);

// Splash pool at base
const splashPool = createSplashPool(scene, new THREE.Vector3(waterfallPos.x, 0, waterfallPos.z - 3), 8);

// Wet surfaces around waterfall area
const wetSurfaces = createWetSurfaces(scene, waterfallBase, 12);

// Start sounds
sound.createWaterfall();
sound.createRiver();
sound.createInsectBuzz(3500);
sound.createWind();

// Set initial camera position on path
const startPos = pathCurve.getPointAt(0.02);
camera.position.set(startPos.x, 2, startPos.z);

// Remove loading screen
document.getElementById('loading').style.display = 'none';

// Animation loop
let prevTime = performance.now();

function animate() {
    requestAnimationFrame(animate);

    const time = performance.now();
    const delta = Math.min((time - prevTime) / 1000, 0.1);
    prevTime = time;

    const elapsed = time / 1000;

    controls.update(delta);

    // Calculate player progress along path
    const pathStart = pathCurve.getPointAt(0);
    const pathEnd = pathCurve.getPointAt(1);
    const currentZ = camera.position.z;
    const progress = Math.max(0, Math.min(1, (currentZ - pathStart.z) / (pathEnd.z - pathStart.z)));

    sound.updateSounds(progress, delta);

    // ---- ANIMATE WATER SYSTEM ----
    animateWaterfall(waterfall, delta, elapsed);
    animateRiver(river, elapsed);
    animateSplashPool(splashPool, elapsed);

    // Animate cliff face (water flow animation)
    if (cliff.cliffMat) {
        cliff.cliffMat.uniforms.uTime.value = elapsed;
    }

    // Animate wet surfaces
    if (wetSurfaces.wetGroundMat) {
        wetSurfaces.wetGroundMat.uniforms.uTime.value = elapsed;
    }

    // ---- ANIMATE LIGHTING SYSTEM ----
    // Mist layers
    if (lighting.mist && lighting.mist.groundMistMat) {
        lighting.mist.groundMistMat.uniforms.uTime.value = elapsed;
    }
    if (lighting.mist && lighting.mist.midMistMat) {
        lighting.mist.midMistMat.uniforms.uTime.value = elapsed;
    }

    // God rays - subtle sway
    if (lighting.godRays) {
        lighting.godRays.children.forEach((shaft, i) => {
            shaft.rotation.z = Math.sin(elapsed * 0.3 + i * 0.7) * 0.02;
            shaft.material.opacity = 0.12 + Math.sin(elapsed * 0.5 + i) * 0.03;
        });
    }

    // Dust particles - gentle floating
    if (lighting.dappledLight && lighting.dappledLight.dustParticles) {
        const dustPos = lighting.dappledLight.dustParticles.geometry.attributes.position;
        for (let i = 0; i < dustPos.count; i++) {
            let x = dustPos.getX(i);
            let y = dustPos.getY(i);
            let z = dustPos.getZ(i);

            x += Math.sin(elapsed * 0.5 + i * 1.3) * 0.002;
            y += Math.cos(elapsed * 0.3 + i * 0.7) * 0.001;
            z += Math.sin(elapsed * 0.4 + i * 0.9) * 0.002;

            dustPos.setX(i, x);
            dustPos.setY(i, y);
            dustPos.setZ(i, z);
        }
        dustPos.needsUpdate = true;
    }

    // Dappled light spots - subtle flicker
    if (lighting.dappledLight && lighting.dappledLight.group) {
        lighting.dappledLight.group.children.forEach((spot, i) => {
            if (spot.material && spot.material.opacity !== undefined && i < 50) {
                spot.material.opacity = 0.15 + Math.sin(elapsed * 0.8 + i * 2.1) * 0.08 + Math.random() * 0.02;
            }
        });
    }

    // Ruins light shafts - subtle animation
    if (lighting.ruinsLight) {
        lighting.ruinsLight.children.forEach((shaft, i) => {
            if (shaft.material && shaft.material.opacity !== undefined) {
                shaft.rotation.z = Math.sin(elapsed * 0.2 + i * 1.1) * 0.015;
            }
        });
    }

    // Render with post-processing
    postProcessor.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    postProcessor.resize(window.innerWidth, window.innerHeight);
});

animate();

console.log('Jungle Trail loaded! Click to start, WASD to move, mouse to look.');
