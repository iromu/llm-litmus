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
import {
  volcanicCycleRules, cityCycleRules, asteroidCycleRules, organicCycleRules,
} from './data/paletteCycles';

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

  // Cinematic state
  private titlePhase: number = 0; // 0=logo fade in, 1=subtitle scroll, 2=pulse start
  private titleLogoAlpha: number = 0;
  private titleSubtitleY: number = 0;
  private stageTransitionTimer: number = 0;
  private stageTransitionAlpha: number = 0;
  private stageTransitionPhase: number = 0; // 0=flash, 1=name, 2=fade
  private gameOverScoreTarget: number = 0;
  private gameOverScoreDisplay: number = 0;
  private highScoreLettersRevealed: number = 0;
  private highScoreAnimTimer: number = 0;
  private demoAlpha: number = 0; // background gameplay alpha during title

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
    this.titlePhase = 0;
    this.titleLogoAlpha = 0;
    this.titleSubtitleY = 0;
    this.stageTransitionTimer = 0;
    this.stageTransitionAlpha = 0;
    this.stageTransitionPhase = 0;
    this.gameOverScoreTarget = 0;
    this.gameOverScoreDisplay = 0;
    this.highScoreLettersRevealed = 0;
    this.highScoreAnimTimer = 0;
    this.demoAlpha = 0;
    this.parallax.loadBiome(Biome.VOLCANIC);
    this.setupPalette();
  }

  /**
   * Set up the renderer palette and cycle rules for the current biome.
   */
  private setupPalette(): void {
    const r = this.render;

    // Base palette: indices 1-16 cover common sprite colors
    const basePalette: string[] = [
      PALETTE.black,     // 1
      PALETTE.white,     // 2
      PALETTE.gray,      // 3
      PALETTE.darkGray,  // 4
      PALETTE.offWhite,  // 5
      PALETTE.red,       // 6
      PALETTE.orange,    // 7
      PALETTE.yellow,    // 8
      PALETTE.blue,      // 9
      PALETTE.lightBlue, // 10
      PALETTE.green,     // 11
      PALETTE.darkGreen, // 12
      PALETTE.lava,      // 13
      PALETTE.lavaGlow,  // 14
      PALETTE.neon,      // 15
      PALETTE.neonGreen, // 16
    ];

    r.setPalette(basePalette);
    this.applyCycleRules();
  }

  /**
   * Apply biome-specific palette cycle rules.
   */
  private applyCycleRules(): void {
    const r = this.render;
    switch (this.currentBiome) {
      case Biome.VOLCANIC:
        r.setCycleRules(volcanicCycleRules());
        break;
      case Biome.CITY:
        r.setCycleRules(cityCycleRules());
        break;
      case Biome.ASTEROID:
        r.setCycleRules(asteroidCycleRules());
        break;
      case Biome.ORGANIC:
        r.setCycleRules(organicCycleRules());
        break;
    }
  }

  /**
   * Main update loop
   */
  protected update(dt: number): void {
    const state = this.getState();
    // Convert ms to seconds for timer-based updates
    const dtSec = dt / 1000;

    switch (state) {
      case GameState.TITLE:
        this.updateTitle(dtSec);
        break;
      case GameState.INTRO:
        this.updateIntro(dtSec);
        break;
      case GameState.PLAYING:
      case GameState.BOSS:
        this.updateGameplay(dt);
        break;
      case GameState.GAME_OVER:
        this.updateGameOver(dtSec);
        break;
      case GameState.HIGH_SCORE:
        this.updateHighScore(dtSec);
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

    // Update palette cycling for this frame
    r.updatePaletteCycling();

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
        this.renderGameOver(r);
        break;
      case GameState.HIGH_SCORE:
        this.renderHighScore(r);
        break;
    }

    // Stage transition overlay (on top of gameplay)
    if (this.stageTransitionTimer > 0) {
      this.renderStageTransition(r);
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

    // Phase 0: Logo fades in (0-1s)
    if (this.titlePhase === 0) {
      this.titleLogoAlpha = Math.min(1, this.titleTimer * 1.5);
      if (this.titleTimer > 1) {
        this.titlePhase = 1;
        this.titleTimer = 0;
        this.titleSubtitleY = -20;
      }
    }
    // Phase 1: Subtitle scrolls in (1-2s)
    else if (this.titlePhase === 1) {
      this.titleSubtitleY += dt * 40;
      if (this.titleSubtitleY >= 80) {
        this.titleSubtitleY = 80;
        this.titlePhase = 2;
        this.titleTimer = 0;
      }
    }
    // Phase 2: Pulse "PRESS START" and wait (2-4s)
    else if (this.titlePhase === 2) {
      if (this.titleTimer > 3) {
        this.startGameplay();
      }
    }

    // Background gameplay fades in
    this.demoAlpha = Math.min(0.3, this.titleTimer * 0.15);
  }

  private renderTitle(r: Renderer): void {
    // Dark background
    r.rect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT, PALETTE.black);

    // Subtle star field
    for (let i = 0; i < 40; i++) {
      const sx = (i * 37 + Math.floor(this.titleTimer * 10)) % CONFIG.WIDTH;
      const sy = (i * 53) % CONFIG.HEIGHT;
      const brightness = (Math.sin(this.titleTimer * 3 + i) * 0.5 + 0.5);
      if (brightness > 0.6) {
        r.rect(sx, sy, 1, 1, PALETTE.white);
      }
    }

    // ===== Logo: "VOLT STORM" =====
    const logoY = 50;
    const logoAlpha = this.titleLogoAlpha;

    // Logo shadow
    r.ctx.globalAlpha = logoAlpha * 0.3;
    r.text('VOLT STORM', 62, logoY + 2, '#000000', 20);
    r.ctx.globalAlpha = 1;

    // Logo main text with gradient effect
    r.ctx.globalAlpha = logoAlpha;
    r.text('VOLT STORM', 61, logoY, PALETTE.lava, 20);
    r.text('VOLT STORM', 60, logoY - 1, PALETTE.lavaGlow, 20);
    r.ctx.globalAlpha = 1;

    // Lightning bolt accent
    const boltX = 160;
    const boltY = logoY - 5;
    const boltFlicker = Math.sin(this.titleTimer * 8) > 0.3 ? 1 : 0.3;
    r.ctx.globalAlpha = logoAlpha * boltFlicker;
    r.rect(boltX, boltY, 2, 12, PALETTE.yellow);
    r.rect(boltX - 2, boltY + 4, 2, 4, PALETTE.yellow);
    r.rect(boltX + 2, boltY + 8, 2, 4, PALETTE.yellow);
    r.ctx.globalAlpha = 1;

    // ===== Subtitle =====
    if (this.titleSubtitleY >= 0) {
      r.text('A 16-BIT SHOOT EM UP', 55, Math.floor(this.titleSubtitleY), PALETTE.gray, 10);
    }

    // ===== "PRESS START" pulsating =====
    if (this.titlePhase >= 2) {
      const pulse = Math.sin(this.titleTimer * 4) * 0.5 + 0.5;
      r.ctx.globalAlpha = 0.5 + pulse * 0.5;
      r.text('PRESS START', 70, 130, PALETTE.white, 12);
      r.ctx.globalAlpha = 1;
    }

    // ===== Version / credits =====
    r.text('VOLT STORM v1.0', 75, 180, PALETTE.darkGray, 8);
    r.text('(C) 2025 AI GAMES', 70, 192, PALETTE.darkGray, 8);

    // ===== Demo gameplay preview (bottom) =====
    if (this.demoAlpha > 0) {
      r.ctx.globalAlpha = this.demoAlpha;
      r.rect(0, 200, CONFIG.WIDTH, 24, PALETTE.black);
      // Mini gameplay strip
      for (let i = 0; i < 10; i++) {
        const x = ((i * 31 + Math.floor(this.titleTimer * 60)) % 320);
        r.rect(x, 205, 4, 2, PALETTE.lava);
      }
      r.ctx.globalAlpha = 1;
    }
  }

  // ===== Intro Sequence =====

  private updateIntro(dt: number): void {
    this.introTimer += dt;

    // Cinematic fly-in: slow scroll that speeds up
    if (this.introPhase === 0) {
      // Ship starts at top, slowly descends to center
      this.camera.scrollSpeed = this.introTimer * 2;

      // Engine particles build up
      if (this.frame % 2 === 0) {
        this.particles.engineTrail(this.player.px - 2, this.player.py + this.player.ph / 2);
      }

      if (this.introTimer > 2) {
        this.introPhase = 1;
        this.introTimer = 0;
        this.setState(GameState.PLAYING);
        this.hud.setStage('VOLCANIC CANYON');
        this.triggerStageTransition('VOLCANIC CANYON');
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

    // 6.5 Weapon projectile trails: emit energy particles for player bullets
    for (const bullet of this.bullets) {
      if (!bullet.alive || bullet.hostile || bullet.isLaser) continue;
      const trailColor = bullet.kind === 'plasma' ? PALETTE.cyan :
                         bullet.kind === 'homing' ? PALETTE.green :
                         bullet.kind === 'spread' ? PALETTE.yellow :
                         PALETTE.lightBlue;
      this.particles.weaponTrail(bullet.x, bullet.y, trailColor);
    }

    this.bullets = this.bullets.filter(b => b.alive);

    // Update particles
    this.particles.update(dt);
    this.camera.update(dt / CONFIG.FRAME_TIME);
  }

  /**
   * Trigger a stage transition cinematic
   */
  private triggerStageTransition(name: string): void {
    if (this.stageTransitionTimer > 0) return; // already transitioning
    this.stageTransitionTimer = 2.5;
    this.stageTransitionAlpha = 1;
    this.stageTransitionPhase = 0; // flash first
    this.hud.setStage(name);
  }

  /**
   * Render stage transition overlay
   */
  private renderStageTransition(r: Renderer): void {
    this.stageTransitionTimer -= 1 / 60;

    // Phase 0: White flash (0-0.3s)
    if (this.stageTransitionPhase === 0) {
      if (this.stageTransitionTimer < 2.2) {
        this.stageTransitionPhase = 1;
      } else {
        r.flash('#ffffff', 0.8);
      }
    }
    // Phase 1: Stage name with border (0.3-2s)
    else if (this.stageTransitionPhase === 1) {
      const alpha = Math.min(1, (2.5 - this.stageTransitionTimer) * 2);
      r.ctx.globalAlpha = alpha;

      // Dark overlay
      r.rect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT, 'rgba(0,0,0,0.7)');

      // Border box
      const bx = 30;
      const by = 80;
      const bw = 260;
      const bh = 50;

      // Outer border
      r.rect(bx - 2, by - 2, bw + 4, bh + 4, PALETTE.lava);
      // Inner fill
      r.rect(bx, by, bw, bh, PALETTE.black);
      // Inner border
      r.rect(bx + 2, by + 2, bw - 4, bh - 4, PALETTE.lavaGlow);

      // Stage name text
      r.text(this.hud.getStageName(), 55, by + 18, PALETTE.white, 16);

      r.ctx.globalAlpha = 1;

      if (this.stageTransitionTimer < 0.5) {
        this.stageTransitionPhase = 2;
      }
    }
    // Phase 2: Fade out (2-2.5s)
    else if (this.stageTransitionPhase === 2) {
      const fadeAlpha = this.stageTransitionTimer / 0.5;
      r.ctx.globalAlpha = fadeAlpha * 0.3;
      r.rect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT, '#000000');
      r.ctx.globalAlpha = 1;
    }
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

    // Engine trail particles (3-5 per frame)
    if (this.frame % 2 === 0) {
      this.particles.engineTrail(this.player.px - 2, this.player.py + this.player.ph / 2);
    }

    // Biome-specific environmental particles
    this.particles.environmentalParticles(this.currentBiome, this.frame);

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

    // Check for game over (demo end) - only trigger if not already in game over
    if (this.demoLoopTimer > CONFIG.DEMO_DURATION && this.getState() !== GameState.GAME_OVER) {
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
          this.applyCycleRules();
          this.sound.setBiome(event.data.biome);
          this.triggerStageTransition(this.getBiomeName(event.data.biome));
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

    // Capture target score at start
    if (this.gameOverTimer < 0.1) {
      this.gameOverScoreTarget = this.hud.getScore();
      this.gameOverScoreDisplay = 0;
    }

    // Animate score tally (rolling counter)
    if (this.gameOverScoreDisplay < this.gameOverScoreTarget) {
      const rollSpeed = Math.max(50, Math.floor((this.gameOverScoreTarget - this.gameOverScoreDisplay) * 0.1));
      this.gameOverScoreDisplay += rollSpeed;
      if (this.gameOverScoreDisplay > this.gameOverScoreTarget) {
        this.gameOverScoreDisplay = this.gameOverScoreTarget;
      }
    }

    // Continue showing gameplay in background
    if (this.gameOverTimer > 3) {
      this.updateGameplay(dt);
    }

    // Transition to high score after 5 seconds
    if (this.gameOverTimer > 5) {
      this.setState(GameState.HIGH_SCORE);
      this.highScoreTimer = 0;
      this.highScoreLettersRevealed = 0;
      this.highScoreAnimTimer = 0;
    }
  }

  private renderGameOver(r: Renderer): void {
    // Dark overlay
    r.ctx.globalAlpha = 0.6;
    r.rect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT, '#000000');
    r.ctx.globalAlpha = 1;

    // "GAME OVER" text with flicker
    const flicker = Math.sin(this.gameOverTimer * 10) > 0 ? 1 : 0.7;
    r.ctx.globalAlpha = flicker;
    r.text('GAME OVER', 90, 60, PALETTE.red, 20);
    r.ctx.globalAlpha = 1;

    // Score tally
    r.text('SCORE', 125, 100, PALETTE.gray, 10);
    r.text(String(this.gameOverScoreDisplay).padStart(8, '0'), 95, 112, PALETTE.white, 14);

    // Time bonus
    const timeBonus = Math.floor(this.demoLoopTimer * 100);
    r.text('TIME BONUS', 110, 140, PALETTE.gray, 10);
    r.text(String(timeBonus).padStart(8, '0'), 95, 152, PALETTE.yellow, 14);

    // Total
    const total = this.gameOverScoreDisplay + timeBonus;
    r.text('TOTAL', 125, 176, PALETTE.gray, 10);
    r.text(String(total).padStart(8, '0'), 95, 188, PALETTE.lavaGlow, 14);
  }

  // ===== High Score =====

  private readonly highScoreEntries: { name: string; score: number }[] = [
    { name: 'AI-01', score: 99999 },
    { name: 'VOLT', score: 75000 },
    { name: 'STORM', score: 50000 },
    { name: 'PLAYER', score: 25000 },
    { name: 'ROOKIE', score: 10000 },
  ];

  private updateHighScore(dt: number): void {
    this.highScoreTimer += dt;
    this.highScoreAnimTimer += dt;

    // Reveal letters one by one (1 per 0.1s)
    const totalLetters = this.highScoreEntries.reduce((sum, e) => sum + e.name.length, 0);
    this.highScoreLettersRevealed = Math.min(totalLetters, Math.floor(this.highScoreAnimTimer * 10));

    // Loop back to title after 6 seconds
    if (this.highScoreTimer > 6) {
      this.setState(GameState.TITLE);
      this.titleTimer = 0;
      this.titlePhase = 0;
      this.titleLogoAlpha = 0;
      this.titleSubtitleY = 0;
      this.demoLoopTimer = 0;
      this.stageTransitionTimer = 0;
      this.stageTransitionAlpha = 0;
      this.stageTransitionPhase = 0;
      this.sound.stopMusic();
    }
  }

  private renderHighScore(r: Renderer): void {
    // Background
    r.rect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT, PALETTE.black);

    // Subtle star field
    for (let i = 0; i < 30; i++) {
      const sx = (i * 37) % CONFIG.WIDTH;
      const sy = (i * 53) % CONFIG.HEIGHT;
      if (Math.sin(this.highScoreTimer * 2 + i) > 0.5) {
        r.rect(sx, sy, 1, 1, PALETTE.gray);
      }
    }

    // Title
    r.text('HIGH SCORES', 100, 20, PALETTE.lava, 16);

    // Score entries
    let lettersRevealed = 0;
    const entryY = 50;
    const lineH = 24;

    this.highScoreEntries.forEach((entry, i) => {
      const y = entryY + i * lineH;

      // Rank number
      r.text(String(i + 1).padStart(2), 30, y, PALETTE.lavaGlow, 10);

      // Name (letter by letter animation)
      const nameStart = lettersRevealed;
      const nameEnd = lettersRevealed + entry.name.length;
      const revealed = Math.max(0, Math.min(entry.name.length, this.highScoreLettersRevealed - nameStart));

      for (let c = 0; c < entry.name.length; c++) {
        const charX = 60 + c * 8;
        if (c < revealed) {
          r.text(entry.name[c], charX, y, PALETTE.white, 10);
        } else {
          r.text('_', charX, y, PALETTE.darkGray, 10);
        }
      }
      lettersRevealed += entry.name.length;

      // Score
      r.text(String(entry.score).padStart(8, '0'), 140, y, PALETTE.offWhite, 10);
    });

    // Current score insertion
    const currentScore = this.gameOverScoreTarget;
    if (currentScore > 0) {
      const insertY = entryY + this.highScoreEntries.length * lineH + 10;
      r.text('NEW SCORE', 80, insertY, PALETTE.yellow, 10);
      r.text(String(currentScore).padStart(8, '0'), 80, insertY + 14, PALETTE.lavaGlow, 12);
    }

    // "CONTINUING..." at end
    if (this.highScoreTimer > 4) {
      const pulse = Math.sin(this.highScoreTimer * 4) * 0.5 + 0.5;
      r.ctx.globalAlpha = 0.5 + pulse * 0.5;
      r.text('CONTINUING...', 95, 200, PALETTE.gray, 10);
      r.ctx.globalAlpha = 1;
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

  // ===== Test hooks =====

  /**
   * Override demo duration (for testing — default is 180s)
   */
  setDemoDuration(seconds: number): void {
    // Patch the CONFIG reference used in updateGameplay
    Object.defineProperty(CONFIG, 'DEMO_DURATION', { value: seconds, writable: true });
  }

  /**
   * Force a state transition (for testing)
   */
  forceState(state: GameState): void {
    if (state === GameState.PLAYING) {
      this.reset();
      this.setState(GameState.INTRO);
      this.introTimer = 0;
      this.introPhase = 0;
    } else if (state === GameState.BOSS) {
      this.setState(GameState.BOSS);
      this.spawnBoss(BossType.MINING_MACHINE);
    } else if (state === GameState.GAME_OVER) {
      this.setState(GameState.GAME_OVER);
      this.gameOverTimer = 0;
      this.gameOverScoreTarget = this.hud.getScore();
      this.gameOverScoreDisplay = 0;
    } else if (state === GameState.TITLE) {
      this.reset();
      this.setState(GameState.TITLE);
      this.titleTimer = 0;
      this.titlePhase = 0;
      this.titleLogoAlpha = 0;
    } else {
      this.setState(state);
    }
  }

  /**
   * Get demo timers for testing
   */
  getDemoTimers(): { demoLoop: number; title: number; intro: number; gameOver: number } {
    return {
      demoLoop: this.demoLoopTimer,
      title: this.titleTimer,
      intro: this.introTimer,
      gameOver: this.gameOverTimer,
    };
  }
}
