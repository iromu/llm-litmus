/**
 * Enemy framework: 20+ enemy types with unique behaviors, sprites, and explosions
 */
import { CONFIG } from '../core/Config';
import { Renderer, PALETTE } from '../core/Renderer';
import { SeededRandom } from '../utils/SeededRandom';
import { clamp } from '../utils/Math';
import { Bullet } from './Bullet';
import { Camera } from './Camera';
import { Biome } from './Parallax';

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

  // Explosion
  public exploding: boolean = false;
  private explosionTimer: number = 0;
  private explosionDuration: number = 0.3;

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

    this.renderSprite(renderer, x, y);
  }

  /**
   * Render enemy sprite based on type
   */
  private renderSprite(r: Renderer, x: number, y: number): void {
    const [c1, c2, c3] = this.colors;
    const w = this.width;
    const h = this.height;
    const frame = this.animFrame;

    // Generic enemy sprite based on behavior type
    switch (this.behavior) {
      case EnemyBehavior.STRAIGHT:
      case EnemyBehavior.SINE:
        // Small fighter
        r.rect(x + 2, y + 2, w - 4, h - 4, c1);
        r.rect(x, y + 3, w, h - 6, c2);
        r.rect(x, y + h / 2 - 1, 4, 2, c3); // Nose
        r.rect(x + 4, y + h / 2, w - 8, 2, c2);
        // Engine glow
        if (frame % 2 === 0) {
          r.rect(x + w, y + h / 2 - 1, 2, 2, PALETTE.orange);
        }
        break;

      case EnemyBehavior.ZIGZAG:
      case EnemyBehavior.DIVE:
        // Mechanical insect
        r.rect(x + 2, y, w - 4, h, c1);
        r.rect(x, y + 2, w, h - 4, c2);
        // Wings
        const wingOffset = frame % 2 === 0 ? -2 : 2;
        r.rect(x + 2, y - 2 + wingOffset, w - 4, 2, c3);
        r.rect(x + 2, y + h + wingOffset, w - 4, 2, c3);
        // Eyes
        r.rect(x + 2, y + h / 2 - 1, 2, 2, PALETTE.red);
        break;

      case EnemyBehavior.HOVER:
      case EnemyBehavior.CIRCLE:
        // Heavy cruiser
        r.rect(x, y + 2, w, h - 4, c1);
        r.rect(x + 2, y, w - 4, h, c2);
        r.rect(x + 4, y + 2, w - 8, h - 4, c3);
        // Turret
        r.rect(x + w / 2 - 2, y + h / 2 - 2, 4, 4, PALETTE.gray);
        break;

      case EnemyBehavior.CHARGE:
        // Missile carrier
        r.rect(x + 1, y + 1, w - 2, h - 2, c1);
        r.rect(x, y + 2, w, h - 4, c2);
        r.rect(x + w - 2, y + h / 2 - 1, 3, 2, PALETTE.orange);
        break;

      case EnemyBehavior.SWARM:
        // Small biomechanical
        r.circle(x + w / 2, y + h / 2, Math.min(w, h) / 2, c1);
        r.circle(x + w / 2, y + h / 2, Math.min(w, h) / 3, c2);
        break;

      case EnemyBehavior.BOSS_MINION:
        // Armored gunship
        r.rect(x, y, w, h, c1);
        r.rect(x + 2, y + 2, w - 4, h - 4, c2);
        r.rect(x + w / 2 - 1, y + h / 2 - 1, 3, 3, c3);
        // Armor plates
        r.rect(x, y, w, 2, shadeColor(c1, -20));
        r.rect(x, y + h - 2, w, 2, shadeColor(c1, -20));
        break;

      case EnemyBehavior.FORMATION:
        // Walker
        r.rect(x + 2, y, w - 4, h, c1);
        r.rect(x, y + 2, w, h - 4, c2);
        // Legs
        const legOffset = frame % 2 === 0 ? 0 : 2;
        r.rect(x + 2, y + h, 2, 3 + legOffset, c3);
        r.rect(x + w - 4, y + h, 2, 3 + (1 - legOffset), c3);
        break;
    }
  }

  /**
   * Render explosion effect
   */
  private renderExplosion(r: Renderer): void {
    const progress = this.explosionTimer / this.explosionDuration;
    const x = Math.floor(this.x + this.width / 2);
    const y = Math.floor(this.y + this.height / 2);

    if (progress < 0.3) {
      // Initial flash
      const size = this.width * (1 + progress * 4);
      r.circle(x, y, size / 2, PALETTE.white);
    } else if (progress < 0.6) {
      // Expansion
      const size = this.width * (2 + (progress - 0.3) * 6);
      r.circle(x, y, size / 2, PALETTE.orange);
      r.circle(x, y, size / 3, PALETTE.yellow);
    } else {
      // Fade out
      const alpha = 1 - (progress - 0.6) / 0.4;
      r.ctx.globalAlpha = alpha;
      const size = this.width * (4 + (progress - 0.6) * 4);
      r.circle(x, y, size / 2, PALETTE.orange);
      r.circle(x, y, size / 4, PALETTE.yellow);
      r.ctx.globalAlpha = 1;
    }

    // Debris particles
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + this.explosionTimer * 5;
      const dist = progress * this.width * 2;
      const dx = x + Math.cos(angle) * dist;
      const dy = y + Math.sin(angle) * dist;
      r.rect(Math.floor(dx), Math.floor(dy), 2, 2, this.colors[i % 3]);
    }
  }

  /**
   * Check if off screen (for cleanup)
   */
  isOffScreen(camera: Camera): boolean {
    return this.x < -200 || !this.alive;
  }
}

/**
 * Helper: shade a hex color
 */
function shadeColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xFF) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xFF) + percent));
  const b = Math.min(255, Math.max(0, (num & 0xFF) + percent));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
