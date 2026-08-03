import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Loop } from './Loop';
import { InputController } from './InputController';
import { createRenderer } from './Renderer';
import { Terrain } from '../terrain/Terrain';
import { Vegetation } from '../vegetation/Vegetation';
import { Atmosphere, Lighting } from '../lighting/Atmosphere';
import { Ruins } from '../ruins/Ruins';
import { WaterSystem } from '../water/WaterSystem';
import { AudioSystem } from '../audio/AudioSystem';
import { PostProcessing } from '../post/PostProcessing';

export class Game {
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly controls: PointerLockControls;
  private readonly input = new InputController();
  private readonly loop: Loop;
  private terrain!: Terrain;
  private vegetation!: Vegetation;
  private atmosphere!: Atmosphere;
  private ruins!: Ruins;
  private water!: WaterSystem;
  private audio!: AudioSystem;
  private postProcessing!: PostProcessing;
  private usePostProcessing = true;
  private minimalMode = false;
  private elapsed = 0;
  private blocker: HTMLElement | null = null;
  private instructions: HTMLElement | null = null;
  private audioStarted = false;

  constructor(canvas: HTMLCanvasElement) {
    // Camera - cinematic FOV for documentary feel
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, 1.7, 0); // Eye height ~1.7m

    // Renderer
    this.renderer = createRenderer(canvas);

    // Pointer lock controls
    this.controls = new PointerLockControls(this.camera, document.body);

    // Game loop
    this.loop = new Loop(
      (delta, elapsed) => this.update(delta, elapsed),
      () => this.render()
    );
  }

  start(): void {
    this.initSystems();
    this.setupUI();
    this.setupEvents();
    this.loop.start();
  }

  private initSystems(): void {
    // Minimal mode: skip all complex systems for headless testing
    this.minimalMode = (window as any).__MINIMAL_MODE === true;
    if (this.minimalMode) {
      console.log('Minimal mode: skipping complex scene systems');
      // Just add a simple green background
      this.scene.background = new THREE.Color(0x2d4a1e);
      // Add a simple ground plane
      const groundGeo = new THREE.PlaneGeometry(100, 200);
      const groundMat = new THREE.MeshStandardMaterial({ color: 0x2d4a1e });
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = 0;
      this.scene.add(ground);
      // Add a simple directional light
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
      dirLight.position.set(5, 10, 5);
      this.scene.add(dirLight);
      this.scene.add(new THREE.AmbientLight(0x404040, 0.5));
    } else {
      const W = (window as any);
      // 1. Terrain
      if (W.__TEST_TERRAIN || W.__FULL_GAME) {
        this.terrain = new Terrain();
        this.scene.add(this.terrain.group);
        console.log('Terrain added');
      }
      // 2. Vegetation
      if (W.__TEST_VEGETATION || W.__FULL_GAME) {
        this.vegetation = new Vegetation(-5, -120);
        this.scene.add(this.vegetation.group);
        console.log('Vegetation added');
      }
      // 3. Lighting & Atmosphere
      if (W.__TEST_LIGHTING || W.__TEST_ATMOSPHERE || W.__FULL_GAME) {
        new Lighting(this.scene);
        this.atmosphere = new Atmosphere();
        this.scene.add(this.atmosphere.group);
        console.log('Lighting/Atmosphere added');
      }
      // 4. Ruins
      if (W.__TEST_RUINS || W.__FULL_GAME) {
        this.ruins = new Ruins();
        this.scene.add(this.ruins.group);
        console.log('Ruins added');
      }
      // 5. Water
      if (W.__TEST_WATER || W.__FULL_GAME) {
        this.water = new WaterSystem();
        this.scene.add(this.water.group);
        console.log('Water added');
      }
      // 6. Audio
      if (W.__TEST_AUDIO || W.__FULL_GAME) {
        this.audio = new AudioSystem();
        console.log('Audio added');
      }
    }

    // 7. Post-processing (skip in headless mode — SwiftShader chokes on render targets)
    const disablePP = (window as any).__DISABLE_POST_PROCESSING === true;
    this.usePostProcessing = !disablePP;
    if (disablePP) {
      console.log('Post-processing disabled (headless mode)');
    } else {
      this.postProcessing = new PostProcessing(
        this.renderer, window.innerWidth, window.innerHeight
      );
      this.postProcessing.setSceneAndCamera(this.scene, this.camera);
    }
  }

  private setupUI(): void {
    // Blocker overlay (skip in headless/automated browsers)
    const isHeadless = /HeadlessChrome/i.test(navigator.userAgent) ||
      (window as any).__HEADLESS_MODE === true;
    if (isHeadless) {
      // Auto-start in headless mode — no blocker needed
      try { this.controls.lock(); } catch { /* Pointer Lock not available in headless */ }
      return;
    }

    this.blocker = document.createElement('div');
    this.blocker.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      cursor: pointer;
      font-family: 'Georgia', serif;
    `;

    this.instructions = document.createElement('div');
    this.instructions.style.cssText = `
      text-align: center;
      color: #c8d8b0;
      max-width: 500px;
      padding: 40px;
    `;
    this.instructions.innerHTML = `
      <h1 style="font-size: 2.5em; margin-bottom: 0.5em; font-weight: 300; letter-spacing: 0.1em; color: #e0e8d0;">JUNGLE TRAIL</h1>
      <p style="font-size: 1.1em; line-height: 1.8; margin-bottom: 1.5em; opacity: 0.8;">
        Walk a winding path through dense jungle to ancient stone ruins and a hidden waterfall.
      </p>
      <p style="font-size: 0.95em; line-height: 1.6; opacity: 0.6;">
        Click to begin<br>
        <span style="opacity: 0.7;">WASD to move · Mouse to look · Shift to sprint</span>
      </p>
    `;

    this.blocker!.appendChild(this.instructions!);
    document.body.appendChild(this.blocker);
  }

  private setupEvents(): void {
    // Click to unlock pointer
    this.blocker?.addEventListener('click', () => {
      this.controls.lock();
    });

    // Pointer lock events
    this.controls.addEventListener('lock', () => {
      if (this.blocker) {
        this.blocker.style.display = 'none';
      }
      // Start audio on first interaction
      if (!this.audioStarted) {
        this.audio.start();
        this.audioStarted = true;
      }
    });

    this.controls.addEventListener('unlock', () => {
      if (this.blocker) {
        this.blocker.style.display = 'flex';
      }
    });

    // Move listener
    document.addEventListener('keydown', (e) => {
      this.input.keys.add(e.code);
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.input.sprint = true;
      }
    });
    document.addEventListener('keyup', (e) => {
      this.input.keys.delete(e.code);
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.input.sprint = false;
      }
    });

    // Mouse look
    document.addEventListener('mousemove', (e) => {
      if (this.controls.isLocked) {
        this.input.handleMouseMove(e.movementX, e.movementY);
      }
    });

    // Resize
    window.addEventListener('resize', () => {
      this.onWindowResize();
    });
  }

  private update(delta: number, elapsed: number): void {
    this.elapsed = elapsed;

    // Calculate progress along path (0 to 1)
    const progress = Math.min(this.elapsed / 180, 1); // 3-minute journey

    // Move camera along path
    this.moveCamera(delta);

    // Update systems
    if (this.terrain) this.terrain.update(delta, elapsed);
    if (this.vegetation) this.vegetation.update(delta, elapsed);
    if (this.atmosphere) this.atmosphere.update(elapsed);
    if (this.water) this.water.update(delta, elapsed);
    if (this.usePostProcessing) {
      this.postProcessing.update(progress, elapsed, delta, this.camera);
    }
    if (this.audio) {
      this.audio.update(progress, elapsed, this.camera.position);
    }
  }

  private moveCamera(delta: number): void {
    if (!this.controls.isLocked) return;

    const speed = this.input.sprint ? 8 : 4;
    const moveDirection = new THREE.Vector3();

    if (this.input.forward) moveDirection.z -= 1;
    if (this.input.backward) moveDirection.z += 1;
    if (this.input.left) moveDirection.x -= 1;
    if (this.input.right) moveDirection.x += 1;

    if (moveDirection.length() > 0) {
      moveDirection.normalize();
      moveDirection.applyEuler(new THREE.Euler(0, this.input.yaw, 0));

      this.camera.position.addScaledVector(moveDirection, speed * delta);
    }

    // Keep camera at eye height
    this.camera.position.y = 1.7;

    // Clamp to path bounds
    this.camera.position.x = Math.max(-14, Math.min(14, this.camera.position.x));
    this.camera.position.z = Math.max(-120, Math.min(5, this.camera.position.z));

    // Apply mouse look
    this.camera.rotation.y = this.input.yaw;
    this.camera.rotation.x = this.input.pitch;
  }

  private render(): void {
    if (this.usePostProcessing) {
      this.postProcessing.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  private onWindowResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    if (this.usePostProcessing) {
      this.postProcessing.resize(width, height);
    }
  }

  dispose(): void {
    this.loop.stop();
    if (!this.minimalMode) {
      this.audio.dispose();
    }
    if (this.usePostProcessing) {
      this.postProcessing.dispose();
    }
    this.renderer.dispose();
  }
}
