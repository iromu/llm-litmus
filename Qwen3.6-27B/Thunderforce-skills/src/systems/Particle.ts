/**
 * Particle system: explosions, debris, smoke, sparks, shockwaves, energy effects
 */
import { CONFIG } from '../core/Config';
import { Renderer, PALETTE } from '../core/Renderer';

/**
 * Particle types
 */
export enum ParticleType {
  EXPLOSION,
  DEBRIS,
  SMOKE,
  SPARK,
  SHOCKWAVE,
  ENERGY,
  ENGINE_TRAIL,
  LASER_SPARK,
}

/**
 * Single particle
 */
export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: ParticleType;
  alive: boolean;
  gravity: number;
  fade: boolean;
  rotation: number;
  rotationSpeed: number;

  constructor(
    x: number, y: number,
    vx: number, vy: number,
    life: number, size: number,
    color: string, type: ParticleType,
    gravity: number = 0, fade: boolean = true
  ) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.size = size;
    this.color = color;
    this.type = type;
    this.alive = true;
    this.gravity = gravity;
    this.fade = fade;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.2;
  }

  update(dt: number): void {
    this.life -= dt;
    if (this.life <= 0) {
      this.alive = false;
      return;
    }

    this.x += this.vx * dt * CONFIG.FPS;
    this.y += this.vy * dt * CONFIG.FPS;
    this.vy += this.gravity * dt * CONFIG.FPS;
    this.rotation += this.rotationSpeed;

    // Slow down over time
    this.vx *= 0.98;
    this.vy *= 0.98;
  }

  get alpha(): number {
    if (!this.fade) return 1;
    return Math.max(0, this.life / this.maxLife);
  }

  get currentSize(): number {
    const progress = 1 - this.life / this.maxLife;
    switch (this.type) {
      case ParticleType.EXPLOSION:
        return this.size * (1 + progress * 2);
      case ParticleType.SMOKE:
        return this.size * (1 + progress * 3);
      case ParticleType.SHOCKWAVE:
        return this.size * (1 + progress * 5);
      default:
        return this.size * (1 - progress * 0.5);
    }
  }

  render(renderer: Renderer): void {
    if (!this.alive) return;

    const x = Math.floor(this.x);
    const y = Math.floor(this.y);
    const size = Math.max(1, Math.floor(this.currentSize));

    if (this.alpha < 1) {
      renderer.ctx.globalAlpha = this.alpha;
    }

    switch (this.type) {
      case ParticleType.EXPLOSION:
        renderer.circle(x, y, size / 2, this.color);
        break;
      case ParticleType.DEBRIS:
        renderer.ctx.save();
        renderer.ctx.translate(x, y);
        renderer.ctx.rotate(this.rotation);
        renderer.rect(-size / 2, -size / 2, size, size, this.color);
        renderer.ctx.restore();
        break;
      case ParticleType.SMOKE:
        renderer.ctx.globalAlpha = this.alpha * 0.5;
        renderer.circle(x, y, size / 2, this.color);
        break;
      case ParticleType.SPARK:
        renderer.rect(x, y, Math.max(1, size), Math.max(1, size / 2), this.color);
        break;
      case ParticleType.SHOCKWAVE:
        renderer.ctx.globalAlpha = this.alpha * 0.3;
        // Draw ring
        const radius = size / 2;
        for (let a = 0; a < Math.PI * 2; a += 0.5) {
          const sx = x + Math.cos(a) * radius;
          const sy = y + Math.sin(a) * radius;
          renderer.rect(Math.floor(sx), Math.floor(sy), 2, 2, this.color);
        }
        break;
      case ParticleType.ENERGY:
        renderer.circle(x, y, size / 2, this.color);
        renderer.circle(x, y, size / 4, PALETTE.white);
        break;
      case ParticleType.ENGINE_TRAIL:
        renderer.ctx.globalAlpha = this.alpha * 0.7;
        renderer.rect(x, y, size, size, this.color);
        break;
      case ParticleType.LASER_SPARK:
        renderer.rect(x, y, 2, 2, this.color);
        break;
    }

    renderer.ctx.globalAlpha = 1;
  }
}

/**
 * Particle system manager
 */
export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number = 500;

  /**
   * Update all particles
   */
  update(dt: number): void {
    for (const p of this.particles) {
      p.update(dt);
    }
    // Remove dead particles
    this.particles = this.particles.filter(p => p.alive);
  }

  /**
   * Render all particles
   */
  render(renderer: Renderer): void {
    // Sort by type for proper layering
    const sorted = [...this.particles].sort((a, b) => {
      const order = [
        ParticleType.SMOKE,
        ParticleType.SHOCKWAVE,
        ParticleType.EXPLOSION,
        ParticleType.DEBRIS,
        ParticleType.SPARK,
        ParticleType.ENERGY,
        ParticleType.ENGINE_TRAIL,
        ParticleType.LASER_SPARK,
      ];
      return order.indexOf(a.type) - order.indexOf(b.type);
    });

    for (const p of sorted) {
      p.render(renderer);
    }
  }

  /**
   * Create explosion effect
   */
  explosion(x: number, y: number, size: number = 1, colors?: string[]): void {
    const c = colors || [PALETTE.white, PALETTE.yellow, PALETTE.orange, PALETTE.red];
    const count = Math.floor(15 * size);

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = (1 + Math.random() * 3) * size;
      const color = c[Math.floor(Math.random() * c.length)];
      const type = Math.random() < 0.3 ? ParticleType.SPARK : ParticleType.EXPLOSION;
      this.particles.push(new Particle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0.2 + Math.random() * 0.3,
        (2 + Math.random() * 4) * size,
        color, type
      ));
    }

    // Smoke
    for (let i = 0; i < 5 * size; i++) {
      this.particles.push(new Particle(
        x + (Math.random() - 0.5) * 10,
        y + (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 1,
        -Math.random() * 1,
        0.5 + Math.random() * 0.5,
        3 + Math.random() * 5,
        PALETTE.darkGray, ParticleType.SMOKE, -0.02
      ));
    }

    // Shockwave
    this.particles.push(new Particle(
      x, y, 0, 0,
      0.2, 5 * size,
      PALETTE.white, ParticleType.SHOCKWAVE
    ));
  }

  /**
   * Create large boss explosion
   */
  bossExplosion(x: number, y: number): void {
    // Multi-stage explosion
    for (let stage = 0; stage < 5; stage++) {
      const delay = stage * 0.05;
      const cx = x + (Math.random() - 0.5) * 40;
      const cy = y + (Math.random() - 0.5) * 30;
      this.explosion(cx, cy, 2 + stage, [
        PALETTE.white, PALETTE.yellow, PALETTE.orange,
        PALETTE.red, PALETTE.magenta
      ]);
    }

    // Debris
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      this.particles.push(new Particle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        1 + Math.random(),
        2 + Math.random() * 4,
        [PALETTE.gray, PALETTE.darkGray, PALETTE.steel][Math.floor(Math.random() * 3)],
        ParticleType.DEBRIS, 0.05
      ));
    }

    // Energy burst
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      this.particles.push(new Particle(
        x, y,
        Math.cos(angle) * 3,
        Math.sin(angle) * 3,
        0.8,
        3,
        PALETTE.cyan, ParticleType.ENERGY
      ));
    }
  }

  /**
   * Create engine trail
   */
  engineTrail(x: number, y: number): void {
    const colors = [PALETTE.orange, PALETTE.yellow, PALETTE.lightYellow];
    this.particles.push(new Particle(
      x + (Math.random() - 0.5) * 4,
      y + (Math.random() - 0.5) * 2,
      -1 - Math.random(),
      (Math.random() - 0.5) * 0.5,
      0.15,
      1 + Math.random(),
      colors[Math.floor(Math.random() * colors.length)],
      ParticleType.ENGINE_TRAIL
    ));
  }

  /**
   * Create laser spark effect
   */
  laserSpark(x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      this.particles.push(new Particle(
        x, y,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3,
        0.1 + Math.random() * 0.1,
        1,
        Math.random() < 0.5 ? PALETTE.white : PALETTE.yellow,
        ParticleType.LASER_SPARK
      ));
    }
  }

  /**
   * Create impact sparks
   */
  impact(x: number, y: number, direction: number = 0): void {
    for (let i = 0; i < 8; i++) {
      const angle = direction + (Math.random() - 0.5) * 1.5;
      const speed = 2 + Math.random() * 3;
      this.particles.push(new Particle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0.1 + Math.random() * 0.15,
        1 + Math.random() * 2,
        Math.random() < 0.5 ? PALETTE.white : PALETTE.yellow,
        ParticleType.SPARK
      ));
    }
  }

  /**
   * Get particle count
   */
  get count(): number {
    return this.particles.length;
  }

  /**
   * Clear all particles
   */
  clear(): void {
    this.particles = [];
  }
}
