/**
 * Bullet system: projectiles, lasers, and homing missiles
 */
import { CONFIG } from '../core/Config';
import { Renderer, PALETTE } from '../core/Renderer';
import { Enemy } from './Enemy';
import { Boss } from './Boss';

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

    const x = Math.floor(this.x);
    const y = Math.floor(this.y);

    switch (this.kind) {
      case 'plasma':
        this.renderPlasma(renderer, x, y);
        break;
      case 'homing':
        this.renderHoming(renderer, x, y);
        break;
      case 'spread':
        this.renderSpread(renderer, x, y);
        break;
      case 'lightning':
        this.renderLightning(renderer, x, y);
        break;
      case 'enemy_bullet':
        this.renderEnemyBullet(renderer, x, y);
        break;
      case 'enemy_missile':
        this.renderEnemyMissile(renderer, x, y);
        break;
      case 'enemy_spiral':
        this.renderEnemySpiral(renderer, x, y);
        break;
      case 'boss_bullet':
        this.renderBossBullet(renderer, x, y);
        break;
    }
  }

  private renderPlasma(r: Renderer, x: number, y: number): void {
    const size = 2 + this.level;
    r.rect(x - size / 2, y - 1, size, 2, PALETTE.cyan);
    r.rect(x - size / 2 + 1, y, size - 2, 1, PALETTE.white);
    // Trail
    r.rect(x - size / 2 - 3, y, 2, 1, PALETTE.lightBlue);
  }

  private renderHoming(r: Renderer, x: number, y: number): void {
    const angle = Math.atan2(this.vy, this.vx);
    r.ctx.save();
    r.ctx.translate(x, y);
    r.ctx.rotate(angle);
    // Drone body
    r.rect(-4, -2, 8, 4, PALETTE.magenta);
    r.rect(-2, -1, 4, 2, PALETTE.pink);
    r.rect(2, 0, 2, 1, PALETTE.white);
    r.ctx.restore();
    // Glow
    r.circle(x, y, 3, 'rgba(255, 0, 255, 0.3)');
  }

  private renderSpread(r: Renderer, x: number, y: number): void {
    r.rect(x - 2, y - 1, 5, 3, PALETTE.orange);
    r.rect(x - 1, y, 3, 1, PALETTE.yellow);
  }

  private renderLightning(r: Renderer, x: number, y: number): void {
    // Lightning beam extends to right edge
    const beamW = CONFIG.WIDTH - x;
    // Core
    r.rect(x, y - 1, beamW, 3, PALETTE.yellow);
    r.rect(x, y, beamW, 1, PALETTE.white);
    // Outer glow
    r.ctx.globalAlpha = 0.5;
    r.rect(x, y - 3, beamW, 7, PALETTE.orange);
    r.ctx.globalAlpha = 1;
    // Crackling effect
    for (let i = 0; i < 5; i++) {
      const lx = x + (i * beamW / 5);
      const ly = y + (Math.sin(this.animationFrame * 3 + i) * 4);
      r.rect(lx, ly, 3, 1, PALETTE.white);
    }
  }

  private renderEnemyBullet(r: Renderer, x: number, y: number): void {
    r.circle(x, y, 3, PALETTE.red);
    r.circle(x, y, 1, PALETTE.lightYellow);
  }

  private renderEnemyMissile(r: Renderer, x: number, y: number): void {
    const angle = Math.atan2(this.vy, this.vx);
    r.ctx.save();
    r.ctx.translate(x, y);
    r.ctx.rotate(angle);
    r.rect(-5, -2, 10, 4, PALETTE.darkRed);
    r.rect(-3, -1, 6, 2, PALETTE.red);
    r.rect(3, 0, 2, 1, PALETTE.orange);
    // Exhaust
    r.rect(-7, -1, 2, 2, PALETTE.orange);
    r.ctx.restore();
  }

  private renderEnemySpiral(r: Renderer, x: number, y: number): void {
    const pulse = Math.sin(this.lifetime * 10) > 0 ? PALETTE.magenta : PALETTE.purple;
    r.circle(x, y, 3, pulse);
    r.circle(x, y, 1, PALETTE.white);
  }

  private renderBossBullet(r: Renderer, x: number, y: number): void {
    r.circle(x, y, 4, PALETTE.orange);
    r.circle(x, y, 2, PALETTE.yellow);
    r.circle(x, y, 1, PALETTE.white);
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
