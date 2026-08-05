/**
 * Enemy framework: 20+ enemy types with unique behaviors, sprites, and explosions
 */
import { CONFIG } from '../core/Config';
import { Renderer, PALETTE } from '../core/Renderer';
import { AnimatedSprite } from '../core/AnimatedSprite';
import { SpriteSheet } from '../core/SpriteSheet';
import { SeededRandom } from '../utils/SeededRandom';
import { Bullet } from './Bullet';
import { Camera } from './Camera';
import { Biome } from './Parallax';
import { EnemySpriteFactory, SPRITE_PALETTE, createExplosionSheet } from '../data/sprites';
import { PI } from '../data/sprites/generator';

/**
 * Enemy type definitions
 */
export interface EnemyType {
  name: string;
  hp: number;
  score: number;
  width: number;
  height: number;
  speed: number;
  biomes: Biome[];
  behavior: EnemyBehavior;
  attackPattern: AttackPattern;
  colors: [string, string, string];
}

/**
 * Enemy behavior types
 */
export enum EnemyBehavior {
  STRAIGHT,         // Fly straight across
  SINE,             // Sine wave movement
  ZIGZAG,           // Zigzag pattern
  DIVE,             // Dive toward player
  CIRCLE,           // Circular orbit
  FORMATION,        // Follow formation leader
  CHARGE,           // Charge at player
  HOVER,            // Hover in place and shoot
  SWARM,            // Swarm behavior
  BOSS_MINION,      // Boss support unit
}

/**
 * Attack pattern types
 */
export enum AttackPattern {
  NONE,
  SINGLE,           // Single bullet
  AIMED,            // Aimed at player
  SPREAD,           // Spread shot
  SPIRAL,           // Spiral pattern
  SWEEP,            // Sweeping laser
  HOMING,           // Homing missile
  CURTAIN,          // Bullet curtain
  AREA,             // Area denial
}

/**
 * Enemy entity
 */
export class Enemy {
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  hp: number;
  maxHp: number;
  score: number;
  width: number;
  height: number;
  alive: boolean;
  behavior: EnemyBehavior;
  attackPattern: AttackPattern;
  colors: [string, string, string];
  name: string;

  // Movement
  private baseY: number;
  private speed: number;
  private phase: number;
  private sineAmplitude: number;
  private sineFrequency: number;

  // Attack
  private attackTimer: number;
  private attackInterval: number;
  private spiralAngle: number = 0;

  // Animation
  private animFrame: number = 0;
  private animTimer: number = 0;
  private sprite: AnimatedSprite;
  private palette: [number, number, number][];

  // Explosion
  public exploding: boolean = false;
  private explosionTimer: number = 0;
  private explosionDuration: number = 0.4; // slightly longer for 4-frame sprite
  private explosionSprite: AnimatedSprite;
  private static explosionSheet: SpriteSheet | null = null;

  private static getExplosionSheet(): SpriteSheet {
    if (!Enemy.explosionSheet) {
      Enemy.explosionSheet = createExplosionSheet();
    }
    return Enemy.explosionSheet;
  }

  constructor(
    worldX: number, worldY: number,
    type: EnemyType,
    rng: SeededRandom
  ) {
    this.worldX = worldX;
    this.worldY = worldY;
    this.x = worldX;
    this.y = worldY;
    this.hp = type.hp;
    this.maxHp = type.hp;
    this.score = type.score;
    this.width = type.width;
    this.height = type.height;
    this.alive = true;
    this.behavior = type.behavior;
    this.attackPattern = type.attackPattern;
    this.colors = type.colors;
    this.name = type.name;
    this.baseY = worldY;
    this.speed = type.speed;
    this.phase = rng.next() * Math.PI * 2;
    this.sineAmplitude = rng.range(10, 40);
    this.sineFrequency = rng.range(2, 6) * 0.1;
    this.attackTimer = rng.next() * 2;
    this.attackInterval = rng.range(60, 180) / CONFIG.FPS;

    // Create sprite based on behavior type
    const [c1, c2, c3] = type.colors;
    this.sprite = this.createSprite(type, c1, c2, c3, rng);
    this.explosionSprite = new AnimatedSprite(Enemy.getExplosionSheet());
    this.palette = SPRITE_PALETTE.map((hex, i) => {
      const n = parseInt(hex.replace('#', ''), 16);
      return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff] as [number, number, number];
    });
    this.palette[0] = [0, 0, 0];
    while (this.palette.length < 256) this.palette.push([0, 0, 0]);
  }

  /**
   * Create the appropriate sprite based on enemy behavior
   */
  private createSprite(type: EnemyType, c1: string, c2: string, c3: string, rng: SeededRandom): AnimatedSprite {
    // Map hex colors to palette indices
    const mapColor = (hex: string): number => {
      const lower = hex.toLowerCase();
      for (let i = 1; i < SPRITE_PALETTE.length; i++) {
        if (SPRITE_PALETTE[i].toLowerCase() === lower) return i;
      }
      // Default to red if no match
      return PI.red;
    };
    const pi1 = mapColor(c1);
    const pi2 = mapColor(c2);
    const pi3 = mapColor(c3);

    switch (this.behavior) {
      case EnemyBehavior.STRAIGHT:
      case EnemyBehavior.SINE:
        return new AnimatedSprite(EnemySpriteFactory.createSmallFighter(pi1, pi2, pi3));
      case EnemyBehavior.ZIGZAG:
      case EnemyBehavior.DIVE:
        return new AnimatedSprite(EnemySpriteFactory.createInsect(pi1, pi2));
      case EnemyBehavior.HOVER:
      case EnemyBehavior.CIRCLE:
        return new AnimatedSprite(EnemySpriteFactory.createHeavyCruiser(pi1, pi2));
      case EnemyBehavior.CHARGE:
        return new AnimatedSprite(EnemySpriteFactory.createMissileCarrier(pi1, pi2));
      case EnemyBehavior.SWARM:
        return new AnimatedSprite(EnemySpriteFactory.createSwarmUnit(pi1, pi2));
      case EnemyBehavior.FORMATION:
        return new AnimatedSprite(EnemySpriteFactory.createWalker(pi1, pi2));
      case EnemyBehavior.BOSS_MINION:
        return new AnimatedSprite(EnemySpriteFactory.createBossMinion(pi1, pi2));
      default:
        return new AnimatedSprite(EnemySpriteFactory.createSmallFighter(pi1, pi2, pi3));
    }
  }

  /**
   * Update enemy behavior
   */
  update(dt: number, camera: Camera, playerX: number, playerY: number): Bullet[] {
    if (this.exploding) {
      this.explosionTimer += dt;
      if (this.explosionTimer >= this.explosionDuration) {
        this.alive = false;
      }
      return [];
    }

    // Update screen position
    this.x = this.worldX - camera.scrollX;
    this.y = this.worldY;

    // Animation
    this.animTimer += dt;
    if (this.animTimer > 0.15) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 4;
    }

    // Movement behavior
    this.updateMovement(dt);

    // Attack behavior
    return this.updateAttack(dt, playerX, playerY);
  }

  /**
   * Update movement based on behavior type
   */
  private updateMovement(dt: number): void {
    this.phase += dt;

    switch (this.behavior) {
      case EnemyBehavior.STRAIGHT:
        this.worldY = this.baseY;
        break;
      case EnemyBehavior.SINE:
        this.worldY = this.baseY + Math.sin(this.phase * this.sineFrequency * 10) * this.sineAmplitude;
        break;
      case EnemyBehavior.ZIGZAG:
        this.worldY = this.baseY + Math.sign(Math.sin(this.phase * this.sineFrequency * 8)) * this.sineAmplitude;
        break;
      case EnemyBehavior.DIVE:
        this.worldY = this.baseY + Math.sin(this.phase * 2) * this.sineAmplitude * 0.5;
        break;
      case EnemyBehavior.CIRCLE:
        this.worldY = this.baseY + Math.sin(this.phase * 3) * this.sineAmplitude;
        this.worldX += Math.cos(this.phase * 3) * 0.5;
        break;
      case EnemyBehavior.FORMATION:
        this.worldY = this.baseY + Math.sin(this.phase * 1.5) * 10;
        break;
      case EnemyBehavior.CHARGE:
        this.worldY = this.baseY;
        this.worldX -= this.speed * 2;
        break;
      case EnemyBehavior.HOVER:
        this.worldY = this.baseY + Math.sin(this.phase * 0.5) * 5;
        break;
      case EnemyBehavior.SWARM:
        this.worldY = this.baseY + Math.sin(this.phase * 4 + this.phase * 0.7) * this.sineAmplitude * 0.7;
        break;
      case EnemyBehavior.BOSS_MINION:
        this.worldY = this.baseY + Math.sin(this.phase * 2) * 15;
        break;
    }

    this.y = this.worldY;
  }

  /**
   * Update attack patterns
   */
  private updateAttack(dt: number, playerX: number, playerY: number): Bullet[] {
    this.attackTimer -= dt;
    if (this.attackTimer > 0) return [];
    this.attackTimer = this.attackInterval;

    // Only attack if on screen
    if (this.x < -50 || this.x > CONFIG.WIDTH + 50) return [];

    const bullets: Bullet[] = [];
    const cx = this.x;
    const cy = this.y + this.height / 2;

    switch (this.attackPattern) {
      case AttackPattern.NONE:
        break;
      case AttackPattern.SINGLE:
        bullets.push(new Bullet(cx, cy, -CONFIG.ENEMY_BULLET_SPEED, 0, true, 'enemy_bullet'));
        break;
      case AttackPattern.AIMED: {
        const angle = Math.atan2(playerY - cy, playerX - cx);
        const speed = CONFIG.ENEMY_BULLET_SPEED * 1.5;
        bullets.push(new Bullet(
          cx, cy,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          true, 'enemy_bullet'
        ));
        break;
      }
      case AttackPattern.SPREAD:
        for (let i = -2; i <= 2; i++) {
          bullets.push(new Bullet(cx, cy, -CONFIG.ENEMY_BULLET_SPEED, i * 0.5, true, 'enemy_bullet'));
        }
        break;
      case AttackPattern.SPIRAL:
        this.spiralAngle += Math.PI / 6;
        for (let i = 0; i < 2; i++) {
          const angle = this.spiralAngle + i * Math.PI;
          bullets.push(new Bullet(
            cx, cy,
            Math.cos(angle) * CONFIG.ENEMY_BULLET_SPEED,
            Math.sin(angle) * CONFIG.ENEMY_BULLET_SPEED,
            true, 'enemy_spiral'
          ));
        }
        break;
      case AttackPattern.SWEEP:
        // Create a laser that sweeps
        const sweepY = cy + Math.sin(this.phase * 2) * 50;
        bullets.push(new Bullet(cx, sweepY, 0, 0, true, 'enemy_laser'));
        break;
      case AttackPattern.HOMING:
        bullets.push(new Bullet(cx, cy, -CONFIG.ENEMY_BULLET_SPEED * 0.8, 0, true, 'enemy_missile'));
        break;
      case AttackPattern.CURTAIN:
        for (let i = 0; i < 5; i++) {
          bullets.push(new Bullet(cx, cy - 20 + i * 10, -CONFIG.ENEMY_BULLET_SPEED * 0.7, 0, true, 'enemy_bullet'));
        }
        break;
      case AttackPattern.AREA:
        // Drop bombs in an area
        for (let i = 0; i < 3; i++) {
          bullets.push(new Bullet(
            cx + i * 10,
            cy,
            -CONFIG.ENEMY_BULLET_SPEED * 0.3,
            (Math.random() - 0.5) * 2,
            true, 'enemy_bullet'
          ));
        }
        break;
    }

    return bullets;
  }

  /**
   * Take damage
   */
  takeDamage(amount: number = 1): boolean {
    if (this.exploding) return false;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.exploding = true;
      this.explosionTimer = 0;
      return true;
    }
    return false;
  }

  /**
   * Get collision box
   */
  getBox(): { x: number; y: number; w: number; h: number } {
    return {
      x: this.x,
      y: this.y,
      w: this.width,
      h: this.height,
    };
  }

  /**
   * Render the enemy
   */
  render(renderer: Renderer): void {
    if (this.exploding) {
      this.renderExplosion(renderer);
      return;
    }

    const x = Math.floor(this.x);
    const y = Math.floor(this.y);

    // Skip if off screen
    if (x < -this.width || x > CONFIG.WIDTH + this.width) return;

    // Update sprite animation
    this.sprite.update(1 / CONFIG.FPS);

    // Draw sprite sheet
    const imageData = this.sprite.getImageData(this.palette);
    renderer.drawSpriteData(x, y, imageData);
  }

  /**
   * Render explosion effect using multi-stage sprite sequence
   */
  private renderExplosion(r: Renderer): void {
    const progress = this.explosionTimer / this.explosionDuration;
    const x = Math.floor(this.x + this.width / 2 - 8); // center 16x16 sprite
    const y = Math.floor(this.y + this.height / 2 - 8);

    // Map progress to frame (4 frames: flash → fireball → debris → smoke)
    const frameIndex = Math.min(3, Math.floor(progress * 4));
    this.explosionSprite.setFrame(frameIndex);

    // Draw explosion sprite
    const imageData = this.explosionSprite.getImageData(this.palette);

    // Fade out in later stages
    if (progress > 0.6) {
      r.ctx.globalAlpha = 1 - (progress - 0.6) / 0.4;
    }

    r.drawSpriteData(x, y, imageData);

    if (progress > 0.6) {
      r.ctx.globalAlpha = 1;
    }

    // Debris particles (spray outward)
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + this.explosionTimer * 5;
      const dist = progress * this.width * 2;
      const dx = Math.floor(this.x + this.width / 2 + Math.cos(angle) * dist);
      const dy = Math.floor(this.y + this.height / 2 + Math.sin(angle) * dist);
      r.rect(dx, dy, 2, 2, this.colors[i % 3]);
    }
  }

  /**
   * Check if off screen (for cleanup)
   */
  isOffScreen(camera: Camera): boolean {
    return this.x < -200 || !this.alive;
  }
}
