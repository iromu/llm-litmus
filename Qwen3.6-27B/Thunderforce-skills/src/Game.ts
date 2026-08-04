/**
 * Main Game class: orchestrates all systems for the attract mode demo
 */
import { Engine } from './core/Engine';
import { CONFIG, GameState } from './core/Config';
import { Renderer, PALETTE } from './core/Renderer';
import { SeededRandom } from './utils/SeededRandom';
import { clamp } from './utils/Math';
import { Camera } from './systems/Camera';
import { ParallaxSystem, Biome } from './systems/Parallax';
import { Player, WeaponType } from './systems/Player';
import { Bullet } from './systems/Bullet';
import { Enemy } from './systems/Enemy';
import { Boss, BossType } from './systems/Boss';
import { Pickup } from './systems/Pickup';
import { ParticleSystem } from './systems/Particle';
import { CollisionSystem } from './systems/Collision';
import { SoundSystem, SFX } from './systems/Sound';
import { HUD } from './systems/HUD';
import { ENEMY_TYPES } from './data/EnemyData';
import { LevelData, ScriptedEvent } from './data/LevelData';

export class Game extends Engine {
  // Systems
  private camera: Camera;
  private parallax: ParallaxSystem;
  private player: Player;
  private bullets: Bullet[];
  private enemies: Enemy[];
  private boss: Boss | null;
  private pickups: Pickup[];
  private particles: ParticleSystem;
  private collision: CollisionSystem;
  private sound: SoundSystem;
  private hud: HUD;
  private level: LevelData;

  // State
  private rng: SeededRandom;
  private processedEvents: Set<number>;
  private bossActive: boolean;
  private gameOverTimer: number;
  private titleTimer: number;
  private highScoreTimer: number;
  private demoLoopTimer: number;
  private currentBiome: Biome;
  private musicIntensity: number;
  private flashAlpha: number;
  private flashColor: string;
  private introTimer: number;
  private introPhase: number;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);

    this.camera = new Camera();
    this.parallax = new ParallaxSystem();
    this.player = new Player();
    this.bullets = [];
    this.enemies = [];
    this.boss = null;
    this.pickups = [];
    this.particles = new ParticleSystem();
    this.collision = new CollisionSystem();
    this.sound = new SoundSystem();
    this.hud = new HUD();
    this.level = new LevelData(42);
    this.rng = new SeededRandom(42);

    this.processedEvents = new Set();
    this.bossActive = false;
    this.gameOverTimer = 0;
    this.titleTimer = 0;
    this.highScoreTimer = 0;
    this.demoLoopTimer = 0;
    this.currentBiome = Biome.VOLCANIC;
    this.musicIntensity = 0.3;
    this.flashAlpha = 0;
    this.flashColor = '#ffffff';
    this.introTimer = 0;
    this.introPhase = 0;
  }

  /**
   * Try to initialize audio (from user gesture)
   */
  tryInitAudio(): void {
    this.sound.init();
  }

  /**
   * Start the game
   */
  start(): void {
    this.setState(GameState.TITLE);
    this.titleTimer = 0;
    super.start();
  }

  /**
   * Reset game state for a new run
   */
  reset(): void {
    this.camera.reset();
    this.player.reset();
    this.bullets = [];
    this.enemies = [];
    this.boss = null;
    this.pickups = [];
    this.particles.clear();
    this.hud.reset();
    this.level = new LevelData(42);
    this.processedEvents = new Set();
    this.bossActive = false;
    this.gameOverTimer = 0;
    this.demoLoopTimer = 0;
    this.currentBiome = Biome.VOLCANIC;
    this.musicIntensity = 0.3;
    this.flashAlpha = 0;
    this.introTimer = 0;
    this.introPhase = 0;
    this.parallax.setBiome(Biome.VOLCANIC);
  }

  /**
   * Main update loop
   */
  protected update(dt: number): void {
    const state = this.getState();

    switch (state) {
      case GameState.TITLE:
        this.updateTitle(dt);
        break;
      case GameState.INTRO:
        this.updateIntro(dt);
        break;
      case GameState.PLAYING:
      case GameState.BOSS:
        this.updateGameplay(dt);
        break;
      case GameState.GAME_OVER:
        this.updateGameOver(dt);
        break;
      case GameState.HIGH_SCORE:
        this.updateHighScore(dt);
        break;
    }

    // Update HUD
    this.hud.update(dt);
    this.hud.setTime(this.demoLoopTimer);

    // Update sound
    this.sound.update(dt, this.musicIntensity);

    // Update particles (always)
    this.particles.update(dt);
  }

  /**
   * Render frame
   */
  protected renderFrame(): void {
    const state = this.getState();
    const r = this.render;

    // Clear
    this.clear();

    switch (state) {
      case GameState.TITLE:
        this.renderTitle(r);
        break;
      case GameState.INTRO:
        this.renderGameplay(r);
        break;
      case GameState.PLAYING:
      case GameState.BOSS:
        this.renderGameplay(r);
        break;
      case GameState.GAME_OVER:
        this.renderGameplay(r);
        this.renderHUD(r);
        break;
      case GameState.HIGH_SCORE:
        this.renderHUD(r);
        break;
    }

    // CRT effects
    r.scanlines(0.08);
    r.vignette();

    // Flash effect
    if (this.flashAlpha > 0) {
      r.flash(this.flashColor, this.flashAlpha);
    }
  }

  // ===== Title Screen =====

  private updateTitle(dt: number): void {
    this.titleTimer += dt;

    // Auto-start after 4 seconds, or on any key
    if (this.titleTimer > 4) {
      this.startGameplay();
    }
  }

  private renderTitle(r: Renderer): void {
    this.renderHUD(r);
  }

  // ===== Intro Sequence =====

  private updateIntro(dt: number): void {
    this.introTimer += dt;

    // Cinematic fly-in: slow scroll that speeds up
    if (this.introPhase === 0) {
      this.camera.scrollSpeed = this.introTimer * 2;
      if (this.introTimer > 2) {
        this.introPhase = 1;
        this.introTimer = 0;
        this.setState(GameState.PLAYING);
        this.hud.setStage('VOLCANIC CANYON');
      }
    }

    // Update player during intro (so invincibility timer decrements)
    const firedBullets = this.player.update(
      dt / CONFIG.FRAME_TIME,
      this.bullets.filter(b => b.hostile),
      this.enemies,
      this.boss,
      this.pickups
    );
    if (firedBullets) {
      this.bullets.push(...firedBullets);
    }

    // Engine trail particles
    if (this.frame % 2 === 0) {
      this.particles.engineTrail(this.player.px - 2, this.player.py + this.player.ph / 2);
    }

    // Update bullets
    for (const bullet of this.bullets) {
      bullet.update(dt / CONFIG.FRAME_TIME, this.enemies, this.boss, this.player.px, this.player.py);
    }
    this.bullets = this.bullets.filter(b => b.alive);

    // Update particles
    this.particles.update(dt);
    this.camera.update(dt / CONFIG.FRAME_TIME);
  }

  // ===== Gameplay =====

  private startGameplay(): void {
    this.reset();
    this.setState(GameState.INTRO);
    this.introTimer = 0;
    this.introPhase = 0;
    this.sound.startMusic();
  }

  private updateGameplay(dt: number): void {
    this.demoLoopTimer += dt;

    // Update camera
    this.camera.update(dt / CONFIG.FRAME_TIME);

    // Boss shake
    if (this.boss && this.boss.alive) {
      const shake = this.boss.getShake();
      if (shake > 0.5) {
        this.camera.shake(shake, 0.1);
      }
    }

    // Update parallax
    this.parallax.update(dt / CONFIG.FRAME_TIME, this.camera);

    // Process level events
    this.processEvents();

    // Update player
    const firedBullets = this.player.update(
      dt / CONFIG.FRAME_TIME,
      this.bullets.filter(b => b.hostile),
      this.enemies,
      this.boss,
      this.pickups
    );
    if (firedBullets) {
      this.bullets.push(...firedBullets);
      // Play weapon sound
      if (this.frame % 3 === 0) { // Don't play every frame
        switch (this.player.weapon) {
          case WeaponType.PLASMA: this.sound.play(SFX.PLASMA_SHOT); break;
          case WeaponType.HOMING: this.sound.play(SFX.HOMING_SHOT); break;
          case WeaponType.SPREAD: this.sound.play(SFX.SPREAD_SHOT); break;
          case WeaponType.LIGHTNING: this.sound.play(SFX.LIGHTNING_SHOT); break;
        }
      }
    }

    // Engine trail particles
    if (this.frame % 2 === 0) {
      this.particles.engineTrail(this.player.px - 2, this.player.py + this.player.ph / 2);
    }

    // Update bullets
    for (const bullet of this.bullets) {
      bullet.update(dt / CONFIG.FRAME_TIME, this.enemies, this.boss, this.player.px, this.player.py);
    }

    // Update enemies
    for (const enemy of this.enemies) {
      const enemyBullets = enemy.update(dt / CONFIG.FRAME_TIME, this.camera, this.player.px, this.player.py);
      this.bullets.push(...enemyBullets);
    }

    // Update boss
    if (this.boss && this.boss.alive) {
      const bossBullets = this.boss.update(dt / CONFIG.FRAME_TIME, this.camera, this.player.px, this.player.py);
      this.bullets.push(...bossBullets);

      // Check boss destruction
      if (!this.boss.alive && this.boss.destroying) {
        // Trigger destruction effects
        if (this.frame % 10 === 0) {
          this.particles.bossExplosion(
            this.boss.x + 30,
            this.boss.y + 25
          );
          this.sound.play(SFX.BOSS_EXPLOSION);
          this.camera.shake(5, 0.2);
          this.flashAlpha = 0.3;
          this.flashColor = '#ffffff';
        }
      }

      if (!this.boss.alive && !this.boss.destroying) {
        this.bossActive = false;
        this.boss = null;
        this.camera.scrollSpeed = CONFIG.SCROLL_SPEED;
        this.setState(GameState.PLAYING);
        this.hud.addScore(5000);
        this.hud.flashText('BOSS DESTROYED!');
      }
    }

    // Update pickups
    for (const pickup of this.pickups) {
      pickup.update(dt / CONFIG.FRAME_TIME, this.camera);
    }

    // Collision detection
    const result = this.collision.update(
      this.player,
      this.bullets,
      this.bullets,
      this.enemies,
      this.boss,
      this.pickups,
      this.particles
    );

    this.hud.addScore(result.score);

    // Cleanup
    this.bullets = this.bullets.filter(b => b.alive);
    this.enemies = this.enemies.filter(e => e.alive && !e.isOffScreen(this.camera));
    this.pickups = this.pickups.filter(p => !p.collected && p.x > -50);

    // Music intensity based on action
    this.musicIntensity = clamp(
      0.3 + this.enemies.length * 0.05 + (this.boss ? 0.3 : 0),
      0.3, 1
    );

    // Flash decay
    this.flashAlpha *= 0.9;

    // Check for game over (demo end)
    if (this.demoLoopTimer > CONFIG.DEMO_DURATION) {
      this.setState(GameState.GAME_OVER);
      this.gameOverTimer = 0;
    }
  }

  /**
   * Process scripted level events
   */
  private processEvents(): void {
    const worldX = this.camera.scrollX;
    const events = this.level.getEventsAt(worldX, 5);

    for (const event of events) {
      if (this.processedEvents.has(event.worldX)) continue;
      this.processedEvents.add(event.worldX);

      switch (event.type) {
        case 'enemy_wave':
          this.spawnEnemy(event.data);
          break;
        case 'pickup':
          this.pickups.push(new Pickup(event.data.x, event.data.y, event.data.type));
          break;
        case 'boss':
          this.spawnBoss(event.data.type);
          break;
        case 'scroll_change':
          this.camera.scrollSpeed = event.data.speed;
          break;
        case 'biome_change':
          this.currentBiome = event.data.biome;
          this.parallax.setBiome(event.data.biome);
          this.hud.setStage(this.getBiomeName(event.data.biome));
          break;
        case 'environmental':
          this.triggerEnvironmentalEvent(event.data);
          break;
      }
    }
  }

  /**
   * Spawn an enemy
   */
  private spawnEnemy(data: any): void {
    const enemy = new Enemy(data.x, data.y, data.type, this.rng);
    this.enemies.push(enemy);
  }

  /**
   * Spawn a boss
   */
  private spawnBoss(type: BossType): void {
    this.boss = new Boss(type);
    this.bossActive = true;
    this.setState(GameState.BOSS);
    this.camera.scrollSpeed = CONFIG.SCROLL_SPEED_BOSS;
    this.hud.setStage(this.getBossName(type));
    this.flashAlpha = 0.5;
    this.flashColor = '#ffffff';
    this.camera.shake(3, 0.5);
  }

  /**
   * Get biome name
   */
  private getBiomeName(biome: Biome): string {
    switch (biome) {
      case Biome.VOLCANIC: return 'VOLCANIC CANYON';
      case Biome.CITY: return 'MEGACITY';
      case Biome.ASTEROID: return 'ASTEROID FIELD';
      case Biome.ORGANIC: return 'ALIEN FORTRESS';
    }
  }

  /**
   * Get boss name
   */
  private getBossName(type: BossType): string {
    switch (type) {
      case BossType.MINING_MACHINE: return 'BOSS: MEGA DRILL';
      case BossType.ORBITAL_SHIP: return 'BOSS: ORBITAL FORT';
      case BossType.ALIEN_GUARDIAN: return 'BOSS: GUARDIAN';
    }
  }

  /**
   * Trigger environmental event
   */
  private triggerEnvironmentalEvent(data: any): void {
    switch (data.effect) {
      case 'quake':
        this.camera.shake(4, 1);
        this.flashAlpha = 0.2;
        this.flashColor = '#ff8800';
        break;
      case 'lightning':
        this.flashAlpha = 0.4;
        this.flashColor = '#ffffff';
        break;
      case 'explosion':
        this.particles.explosion(data.x ?? 200, data.y ?? 112, 3);
        this.camera.shake(3, 0.5);
        this.sound.play(SFX.BOSS_EXPLOSION);
        break;
    }
  }

  // ===== Game Over =====

  private updateGameOver(dt: number): void {
    this.gameOverTimer += dt;

    // Continue showing gameplay in background
    if (this.gameOverTimer > 3) {
      this.updateGameplay(dt);
    }

    // Transition to high score after 5 seconds
    if (this.gameOverTimer > 5) {
      this.setState(GameState.HIGH_SCORE);
      this.highScoreTimer = 0;
    }
  }

  // ===== High Score =====

  private updateHighScore(dt: number): void {
    this.highScoreTimer += dt;

    // Loop back to title after 5 seconds
    if (this.highScoreTimer > 5) {
      this.setState(GameState.TITLE);
      this.titleTimer = 0;
      this.demoLoopTimer = 0;
      this.sound.stopMusic();
    }
  }

  // ===== Rendering =====

  private renderGameplay(r: Renderer): void {
    // Render parallax backgrounds
    this.parallax.render(r, this.camera);

    // Render pickups
    for (const pickup of this.pickups) {
      pickup.render(r);
    }

    // Render enemies
    for (const enemy of this.enemies) {
      enemy.render(r);
    }

    // Render boss
    if (this.boss) {
      this.boss.render(r);
    }

    // Render player
    this.player.render(r);

    // Render bullets
    for (const bullet of this.bullets) {
      bullet.render(r);
    }

    // Render particles
    this.particles.render(r);

    // Render HUD
    this.renderHUD(r);
  }

  private renderHUD(r: Renderer): void {
    this.hud.render(r, this.getState(), this.player);
  }
}
