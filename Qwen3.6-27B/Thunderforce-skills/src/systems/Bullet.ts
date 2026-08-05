/**
 * Bullet system: projectiles, lasers, and homing missiles
 */
import { CONFIG } from '../core/Config';
import { Renderer, PALETTE } from '../core/Renderer';
import { AnimatedSprite } from '../core/AnimatedSprite';
import { Enemy } from './Enemy';
import { Boss } from './Boss';
import {
  createPlasmaBolt, createHomingDrone, createSpreadLaser, createLightningBeam,
  createEnemyBullet, createSpiralBullet, createEnemyMissile,
  createBossBullet, createBossLaser,
  SPRITE_PALETTE,
} from '../data/sprites';

/**
 * Bullet types
 */
export enum BulletKind {
  PLASMA = 'plasma',
  HOMING = 'homing',
  SPREAD = 'spread',
  LIGHTNING = 'lightning',
  ENEMY_BULLET = 'enemy_bullet',
  ENEMY_MISSILE = 'enemy_missile',
  ENEMY_LASER = 'enemy_laser',
  ENEMY_SPIRAL = 'enemy_spiral',
  BOSS_BULLET = 'boss_bullet',
  BOSS_LASER = 'boss_laser',
}

/**
 * Bullet entity
 */
export class Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hostile: boolean;
  kind: string;
  level: number;
  alive: boolean;
  lifetime: number;
  homingTarget: { x: number; y: number } | null = null;
  angle: number = 0;       // For spiral bullets
  sweepAngle: number = 0;  // For sweep lasers
  laserLength: number = 0; // For laser beams
  isLaser: boolean = false;
  animationFrame: number = 0;
  private sprite: AnimatedSprite | null = null;
  private static palette: [number, number, number][] | null = null;

  /** Get or build the shared palette */
  private static getPalette(): [number, number, number][] {
    if (!Bullet.palette) {
      Bullet.palette = SPRITE_PALETTE.map((hex) => {
        const n = parseInt(hex.replace('#', ''), 16);
        return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff] as [number, number, number];
      });
      Bullet.palette[0] = [0, 0, 0];
      while (Bullet.palette.length < 256) Bullet.palette.push([0, 0, 0]);
    }
    return Bullet.palette;
  }

  constructor(
    x: number, y: number,
    vx: number, vy: number,
    hostile: boolean,
    kind: string,
    level: number = 1
  ) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.hostile = hostile;
    this.kind = kind;
    this.level = level;
    this.alive = true;
    this.lifetime = 0;
    this.isLaser = kind === 'enemy_laser' || kind === 'boss_laser';

    // Create sprite for non-laser bullets
    if (!this.isLaser) {
      this.sprite = this.createSprite(kind);
    }
  }

  /** Create the appropriate sprite based on bullet kind */
  private createSprite(kind: string): AnimatedSprite {
    switch (kind) {
      case 'plasma': return new AnimatedSprite(createPlasmaBolt());
      case 'homing': return new AnimatedSprite(createHomingDrone());
      case 'spread': return new AnimatedSprite(createSpreadLaser());
      case 'lightning': return new AnimatedSprite(createLightningBeam());
      case 'enemy_bullet': return new AnimatedSprite(createEnemyBullet());
      case 'enemy_spiral': return new AnimatedSprite(createSpiralBullet());
      case 'enemy_missile': return new AnimatedSprite(createEnemyMissile());
      case 'boss_bullet': return new AnimatedSprite(createBossBullet());
      default: return new AnimatedSprite(createEnemyBullet());
    }
  }

  /**
   * Update bullet position
   */
  update(dt: number, enemies: Enemy[], boss: Boss | null, playerX: number, playerY: number): void {
    this.lifetime += dt;
    this.animationFrame = (this.animationFrame + 1) % 4;

    if (this.isLaser) {
      // Lasers extend over time
      this.laserLength = Math.min(this.laserLength + 200 * dt * CONFIG.FPS, CONFIG.WIDTH * 2);
      if (this.laserLength >= CONFIG.WIDTH * 2) {
        this.alive = false;
      }
      return;
    }

    // Homing behavior
    if (this.kind === 'homing' && !this.hostile) {
      // Find nearest enemy
      let nearest: Enemy | null = null;
      let nearestDist = Infinity;

      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        const dx = enemy.x - this.x;
        const dy = enemy.y - this.y;
        const dist = dx * dx + dy * dy;
        if (dist < nearestDist && dx > 0) {
          nearestDist = dist;
          nearest = enemy;
        }
      }

      if (nearest) {
        const targetAngle = Math.atan2(nearest.y - this.y, nearest.x - this.x);
        const currentAngle = Math.atan2(this.vy, this.vx);
        let angleDiff = targetAngle - currentAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        const turnRate = 0.15;
        angleDiff = Math.max(-turnRate, Math.min(turnRate, angleDiff));
        const newAngle = currentAngle + angleDiff;
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        this.vx = Math.cos(newAngle) * speed;
        this.vy = Math.sin(newAngle) * speed;
      }
    }

    // Enemy homing missiles
    if (this.kind === 'enemy_missile') {
      const targetAngle = Math.atan2(playerY - this.y, playerX - this.x);
      const currentAngle = Math.atan2(this.vy, this.vx);
      let angleDiff = targetAngle - currentAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      const turnRate = 0.03;
      angleDiff = Math.max(-turnRate, Math.min(turnRate, angleDiff));
      const newAngle = currentAngle + angleDiff;
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      this.vx = Math.cos(newAngle) * speed;
      this.vy = Math.sin(newAngle) * speed;
    }

    this.x += this.vx * dt * CONFIG.FPS;
    this.y += this.vy * dt * CONFIG.FPS;

    // Remove if off screen
    if (this.x < -50 || this.x > CONFIG.WIDTH + 50 ||
        this.y < -50 || this.y > CONFIG.HEIGHT + 50) {
      this.alive = false;
    }

    // Lifetime expiry
    if (this.lifetime > 10) {
      this.alive = false;
    }
  }

  /**
   * Get collision box
   */
  getBox(): { x: number; y: number; w: number; h: number } {
    if (this.kind === 'lightning') {
      return { x: this.x, y: this.y - 2, w: CONFIG.WIDTH - this.x, h: 4 };
    }
    const size = this.hostile ? 4 : 3 + this.level;
    return { x: this.x - size / 2, y: this.y - size / 2, w: size, h: size };
  }

  /**
   * Render the bullet
   */
  render(renderer: Renderer): void {
    if (this.isLaser) {
      this.renderLaser(renderer);
      return;
    }

    if (!this.sprite) return;

    const x = Math.floor(this.x);
    const y = Math.floor(this.y);

    // Update sprite animation
    this.sprite.update(1 / CONFIG.FPS);

    // Draw sprite sheet (centered)
    const meta = this.sprite.sheet.meta;
    const px = x - Math.floor(meta.width / 2);
    const py = y - Math.floor(meta.height / 2);

    const imageData = this.sprite.getImageData(Bullet.getPalette());
    renderer.drawSpriteData(px, py, imageData);
  }

  private renderLaser(r: Renderer): void {
    const x = Math.floor(this.x);
    const y = Math.floor(this.y);
    const endX = x + this.laserLength;

    // Build up effect
    const width = this.hostile ? 8 : 4;
    // Outer glow
    r.ctx.globalAlpha = 0.4;
    r.rect(x, y - width, endX - x, width * 2, PALETTE.red);
    r.ctx.globalAlpha = 0.7;
    r.rect(x, y - width / 2, endX - x, width, PALETTE.orange);
    // Core
    r.ctx.globalAlpha = 1;
    r.rect(x, y - 1, endX - x, 2, PALETTE.white);
  }
}
