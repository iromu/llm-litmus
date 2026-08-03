import * as THREE from 'three';
import {
  BiomeId, getBiome, BiomeDefinition,
} from '../data/BiomeDefinitions.js';
import {
  PlayerShip, Enemy, Boss, Projectile, Particle, Pickup,
} from '../entities/index.js';
import {
  WeaponSystem, BulletPattern, CollisionSystem,
  Spawner, AudioSystem, DemoController,
} from '../systems/index.js';
import { CameraRig } from '@thunderforce/engine';
import { TweenManager, ShakeRig, HitstopManager, FovPunch } from '@thunderforce/engine';
import { disposeObject, disposeArray } from '@thunderforce/engine';
import { createStarFieldTexture, createProceduralTexture } from '@thunderforce/engine';

/**
 * Stage — manages a single biome stage (background, enemies, bosses, etc.)
 */
export class Stage {
  biome: BiomeDefinition;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;

  player: PlayerShip;
  cameraRig: CameraRig;
  tweenManager: TweenManager;
  shakeRig: ShakeRig;
  hitstopManager: HitstopManager;
  fovPunch: FovPunch;

  weaponSystem: WeaponSystem;
  bulletPattern: BulletPattern;
  collisionSystem: CollisionSystem;
  spawner: Spawner;
  audioSystem: AudioSystem;
  demoController: DemoController;

  enemies: Enemy[] = [];
  bosses: Boss[] = [];
  particles: Particle[] = [];
  pickups: Pickup[] = [];
  projectiles: Projectile[] = [];

  scrollZ: number = 0;
  stageTime: number = 0;
  active: boolean = true;

  // Background elements
  backgroundMesh: THREE.Mesh | null = null;
  parallaxLayers: THREE.Group[] = [];

  constructor(
    biomeId: BiomeId,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
  ) {
    this.biome = getBiome(biomeId);
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    // Core systems
    this.player = new PlayerShip(scene);
    this.cameraRig = new CameraRig(camera, 5, 2.0, 0.5, 0.5);
    this.tweenManager = new TweenManager();
    this.shakeRig = new ShakeRig();
    this.hitstopManager = new HitstopManager();
    this.fovPunch = new FovPunch();
    this.fovPunch.setBaseFov(camera.fov);

    // Game systems
    this.weaponSystem = new WeaponSystem(scene);
    this.bulletPattern = new BulletPattern(scene);
    this.collisionSystem = new CollisionSystem();
    this.spawner = new Spawner(scene);
    this.audioSystem = new AudioSystem();
    this.demoController = new DemoController();

    // Setup biome
    this._setupBiome();
    this.cameraRig.snapTo(this.player.data.position);
  }

  private _setupBiome(): void {
    const biome = this.biome;

    // Scene background and fog
    this.scene.background = new THREE.Color(biome.backgroundColor);
    this.scene.fog = new THREE.Fog(
      new THREE.Color(biome.fogColor),
      biome.fogNear,
      biome.fogFar,
    );

    // Lighting
    const ambientLight = new THREE.AmbientLight(
      new THREE.Color(biome.ambientColor),
      biome.ambientIntensity,
    );
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(
      new THREE.Color(biome.dirLightColor),
      biome.dirLightIntensity,
    );
    dirLight.position.set(0, 0, 10);
    this.scene.add(dirLight);

    // Background
    this._createBackground();

    // Parallax layers
    this._createParallaxLayers();
  }

  private _createBackground(): void {
    // Create a procedural background
    const bgTexture = createProceduralTexture(
      256,
      256,
      (u, v) => {
        const biome = this.biome;
        // Base color from biome
        const base = new THREE.Color(biome.backgroundColor);
        // Add some noise
        const noise = (Math.sin(u * 20 + v * 15) * 0.5 + 0.5) * 0.1;
        base.r += noise;
        base.g += noise * 0.5;
        base.b += noise * 0.3;
        return base;
      },
    );

    const bgGeom = new THREE.PlaneGeometry(30, 20);
    const bgMat = new THREE.MeshBasicMaterial({
      map: bgTexture,
      depthWrite: false,
    });
    this.backgroundMesh = new THREE.Mesh(bgGeom, bgMat);
    this.backgroundMesh.position.z = -20;
    this.scene.add(this.backgroundMesh);
  }

  private _createParallaxLayers(): void {
    // Create 3 parallax layers for depth
    for (let i = 0; i < 3; i++) {
      const layer = new THREE.Group();
      const count = 10 + i * 5;
      createStarFieldTexture(64, 64, count);
      for (let j = 0; j < count; j++) {
        const starGeom = new THREE.PlaneGeometry(0.1 + Math.random() * 0.2, 0.1 + Math.random() * 0.2);
        const starMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(this.biome.fogColor).lerp(new THREE.Color(0xffffff), 0.5),
          transparent: true,
          opacity: 0.3 + Math.random() * 0.5,
          depthWrite: false,
        });
        const star = new THREE.Mesh(starGeom, starMat);
        star.position.set(
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 10,
          -5 - i * 3,
        );
        layer.add(star);
      }

      layer.userData.parallaxFactor = 0.2 + i * 0.3;
      this.scene.add(layer);
      this.parallaxLayers.push(layer);
    }
  }

  update(delta: number, inputX: number, inputY: number): void {
    if (!this.active) return;

    this.stageTime += delta;

    // Hitstop scaling
    const gameplayDelta = this.hitstopManager.getGameplayDelta(delta);

    // Determine effective input: AI when demo is actively playing, otherwise human input
    const demoResult = this.demoController.update(delta, this.player, new THREE.Vector2(inputX, inputY));
    const effectiveX = demoResult.input.x;
    const effectiveY = demoResult.input.y;

    // Update player with effective input
    this.player.update(gameplayDelta, effectiveX, effectiveY);
    // Fire player weapons
    this.player.fire(this.weaponSystem);
    this.cameraRig.update(delta, this.player.data.position);

    // Update FOV punch, tweens, screenshake
    this.fovPunch.apply(this.camera);
    this.tweenManager.update(delta);
    this.shakeRig.update(delta, this.camera);

    // Update spawner
    const newEnemies = this.spawner.update(
      delta,
      this.biome,
      this.enemies.length,
      20,
      this.player.data.position,
    );
    this.enemies.push(...newEnemies);

    // Check boss spawn
    if (this.spawner.shouldSpawnBoss(this.biome, this.stageTime)) {
      const boss = this.spawner.spawnBoss(this.biome.bossId ?? -1, this.scene);
      if (boss) {
        this.bosses.push(boss);
        this.audioSystem.playSfx('boss');
        this.shakeRig.addTrauma(0.5);
      }
    }

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(delta, this.biome.scrollSpeed, this.player.data.position);

      // Enemy attacks
      const enemyBullets = enemy.attack(this.bulletPattern);
      this.projectiles.push(...enemyBullets);

      if (!enemy.alive) {
        // Enemy destroyed
        this.player.addScore(enemy.scoreValue);
        this.audioSystem.playSfx('explosion');
        this.shakeRig.addTrauma(0.3);
        this.hitstopManager.hitstop(50);
        this.fovPunch.punch(3);

        // Spawn particles
        this._spawnExplosion(enemy.position, parseInt(enemy.def.bulletColor.slice(1), 16));

        // Remove enemy
        enemy.dispose();
        this.enemies.splice(i, 1);
        continue;
      }

      // Check player collision
      if (CollisionSystem.playerVsEnemy(this.player, enemy)) {
        if (this.player.takeDamage(1)) {
          this.shakeRig.addTrauma(0.5);
          this.hitstopManager.hitstop(100);
        }
      }
    }

    // Update bosses
    for (let i = this.bosses.length - 1; i >= 0; i--) {
      const boss = this.bosses[i];
      boss.update(delta, this.biome.scrollSpeed, this.player.data.position);

      if (boss.isDestructing()) {
        boss.updateDestruction(delta);
        if (boss.destructionTimer <= 0) {
          this.player.addScore(boss.scoreValue);
          this.audioSystem.playSfx('explosion');
          this.shakeRig.addTrauma(1.0);
          this._spawnExplosion(boss.position, 0xff4422);
          boss.dispose();
          this.bosses.splice(i, 1);
          this.spawner.markBossDefeated();
        }
        continue;
      }

      if (!boss.alive) continue;

      // Boss attacks
      boss.attackTimer -= delta;
      if (boss.attackTimer <= 0) {
        this._bossAttack(boss);
        boss.attackTimer = boss.def.phases[boss.currentPhase].attackCooldown;
      }
    }

    // Update weapon system
    this.weaponSystem.update(delta);
    this.projectiles.push(...this.weaponSystem.getProjectiles());

    // Update bullet pattern
    this.bulletPattern.update(delta);
    const enemyBullets = this.bulletPattern.getProjectiles();
    this.projectiles.push(...enemyBullets);

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.update(delta);
      if (!particle.alive) {
        particle.dispose();
        this.particles.splice(i, 1);
      }
    }

    // Update pickups
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pickup = this.pickups[i];
      pickup.update(delta);
      if (!pickup.alive) {
        pickup.dispose();
        this.pickups.splice(i, 1);
        continue;
      }

      // Check player pickup collision
      if (CollisionSystem.playerVsPickup(this.player, pickup)) {
        this._applyPickup(pickup.type);
        pickup.alive = false;
        pickup.dispose();
        this.pickups.splice(i, 1);
        this.audioSystem.playSfx('pickup');
      }
    }

    // Collision detection
    this._checkCollisions(enemyBullets);

    // Update parallax layers
    this._updateParallax(delta);

    // Update scroll
    this.scrollZ += this.biome.scrollSpeed * delta;
  }

  private _bossAttack(boss: Boss): void {
    const phase = boss.def.phases[boss.currentPhase];
    const color = parseInt(phase.bulletColor.slice(1), 16);

    // Simple attack: fire a spread pattern
    this.bulletPattern.fireSpread(
      boss.position,
      new THREE.Vector3(0, 1, 0),
      8,
      Math.PI / 2,
      color,
      1,
    );

    this.shakeRig.addTrauma(0.2);
  }

  private _checkCollisions(enemyBullets: Projectile[]): void {
    // Enemy bullets vs player
    CollisionSystem.processEnemyBulletsVsPlayer(enemyBullets, this.player);

    // Player projectiles vs enemies/bosses
    const playerProjectiles = this.weaponSystem.getProjectiles();
    const { hitEnemies, hitBosses } = CollisionSystem.processProjectileHits(
      playerProjectiles,
      this.enemies,
      this.bosses,
    );

    for (const _enemy of hitEnemies) {
      this.shakeRig.addTrauma(0.1);
      this.audioSystem.playSfx('hit');
    }

    for (const _boss of hitBosses) {
      this.shakeRig.addTrauma(0.2);
      this.fovPunch.punch(2);
      this.audioSystem.playSfx('hit');
    }
  }

  private _spawnExplosion(position: THREE.Vector3, color: number): void {
    for (let i = 0; i < 15; i++) {
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5,
        0,
      );
      const particle = new Particle(
        position,
        velocity,
        color,
        0.2 + Math.random() * 0.3,
        0.5 + Math.random() * 0.5,
        this.scene,
      );
      this.particles.push(particle);
    }
  }

  private _applyPickup(type: number): void {
    switch (type) {
      case 0: // Health
        this.player.addScore(100);
        break;
      case 1: // Shield
        this.player.addShield();
        break;
      case 2: // Weapon upgrade
        const weaponId = Math.floor(Math.random() * 4);
        this.player.addWeaponLevel(weaponId);
        break;
      case 3: // Score
        this.player.addScore(500);
        break;
    }
  }

  private _updateParallax(_delta: number): void {
    for (const layer of this.parallaxLayers) {
      const factor = layer.userData.parallaxFactor || 0.3;
      layer.position.z = -this.scrollZ * factor;
    }
  }

  /** Switch to a new biome. */
  switchTo(biomeId: BiomeId): void {
    this.biome = getBiome(biomeId);
    this.scene.background = new THREE.Color(this.biome.backgroundColor);
    if (this.scene.fog) {
      (this.scene.fog as THREE.Fog).color.set(this.biome.fogColor);
      (this.scene.fog as THREE.Fog).near = this.biome.fogNear;
      (this.scene.fog as THREE.Fog).far = this.biome.fogFar;
    }
    this.stageTime = 0;
    this.spawner.reset();
    this.enemies.forEach(e => e.dispose());
    this.enemies = [];
    this.bosses.forEach(b => b.dispose());
    this.bosses = [];
    this.particles.forEach(p => p.dispose());
    this.particles = [];
    this.pickups.forEach(p => p.dispose());
    this.pickups = [];
  }

  /** Dispose all resources. */
  dispose(): void {
    this.player.dispose();
    this.weaponSystem.dispose();
    this.bulletPattern.dispose();
    this.enemies.forEach(e => e.dispose());
    this.bosses.forEach(b => b.dispose());
    this.particles.forEach(p => p.dispose());
    this.pickups.forEach(p => p.dispose());
    this.audioSystem.dispose();
    this.demoController.dispose();
    disposeArray(this.parallaxLayers);
    if (this.backgroundMesh) {
      disposeObject(this.backgroundMesh);
    }
  }
}
