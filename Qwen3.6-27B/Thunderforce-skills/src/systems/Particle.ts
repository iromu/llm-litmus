/**
 * Particle system: explosions, debris, smoke, sparks, shockwaves, energy effects
 * Uses object pooling (pre-allocated slots) and batch rendering via putImageData.
 */
import { CONFIG } from '../core/Config';
import { Renderer, PALETTE } from '../core/Renderer';
import { Biome } from './Parallax';

/**
 * Particle types covering all visual effects
 */
export enum ParticleType {
  EXPLOSION,
  DEBRIS,
  SMOKE,
  SPARK,
  EMBER,
  SHOCKWAVE,
  ENERGY,
  ENERGY_TRAIL,
  ENGINE_EXHAUST,
  LASER_SPARK,
  LAVA_SPLASH,
  DUST,
  SPORE,
}

/**
 * Single particle in the pool
 */
export class Particle {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  life = 0;
  maxLife = 0.2;
  size = 2;
  baseSize = 2;
  color = PALETTE.white;
  type = ParticleType.EXPLOSION;
  active = false;
  gravity = 0;
  drag = 0.98;
  riseSpeed = 0;
  rotation = 0;
  rotationSpeed = 0;
  hueShift = 0;
}

/**
 * Pre-allocated color palettes for common effects
 */
const EXPLOSION_COLORS = [
  PALETTE.white, PALETTE.yellow, PALETTE.orange, PALETTE.red,
];
const FIRE_COLORS = [PALETTE.orange, PALETTE.yellow, PALETTE.red, PALETTE.red];
const SMOKE_COLORS = [PALETTE.darkGray, PALETTE.gray, '#222222'];
const SPARK_COLORS = [PALETTE.white, PALETTE.yellow, PALETTE.lightYellow];
const EMBER_COLORS = [PALETTE.orange, PALETTE.red, PALETTE.yellow];
const ENERGY_COLORS = [PALETTE.cyan, PALETTE.lightBlue, PALETTE.white];
const EXHAUST_COLORS = [PALETTE.orange, PALETTE.yellow, PALETTE.lightYellow];
const LAVA_COLORS = [PALETTE.lava, PALETTE.lavaGlow, PALETTE.orange, PALETTE.yellow];
const NEON_COLORS = [PALETTE.neon, PALETTE.cyan, PALETTE.magenta];
const SPORE_COLORS = [PALETTE.neonGreen, PALETTE.green, '#44ff88'];

/**
 * Particle system with object pooling and batch rendering.
 *
 * - Pre-allocates 500 particle slots to avoid GC pressure
 * - Renders all particles to an offscreen canvas, then blits once
 * - Supports biome-specific environmental particles
 */
export class ParticleSystem {
  private pool: Particle[];
  private free: number[];
  private maxPool: number;

  /** Offscreen canvas for batch rendering */
  private offCanvas: OffscreenCanvas | HTMLCanvasElement;
  private offCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

  constructor(maxParticles: number = 500) {
    this.maxPool = maxParticles;
    this.pool = new Array(maxParticles);
    for (let i = 0; i < maxParticles; i++) {
      this.pool[i] = new Particle();
    }
    this.free = [];
    for (let i = maxParticles - 1; i >= 0; i--) {
      this.free.push(i);
    }

    // Create offscreen canvas for batch rendering
    if (typeof OffscreenCanvas !== 'undefined') {
      this.offCanvas = new OffscreenCanvas(CONFIG.WIDTH, CONFIG.HEIGHT);
    } else {
      this.offCanvas = document.createElement('canvas');
      this.offCanvas.width = CONFIG.WIDTH;
      this.offCanvas.height = CONFIG.HEIGHT;
    }
    this.offCtx = this.offCanvas.getContext('2d')!;
  }

  /**
   * Acquire a particle from the pool
   */
  private acquire(): Particle | null {
    if (this.free.length === 0) return null;
    const idx = this.free.pop()!;
    const p = this.pool[idx];
    p.active = true;
    return p;
  }

  /**
   * Return a particle to the pool
   */
  private release(p: Particle): void {
    p.active = false;
    const idx = this.pool.indexOf(p);
    if (idx >= 0) {
      this.free.push(idx);
    }
  }

  /**
   * Update all active particles
   */
  update(dt: number): void {
    for (let i = 0; i < this.maxPool; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      p.life -= dt;
      if (p.life <= 0) {
        this.release(p);
        continue;
      }

      // Physics
      p.vy += p.gravity * dt * CONFIG.FPS;
      p.x += p.vx * dt * CONFIG.FPS;
      p.y += p.vy * dt * CONFIG.FPS;

      // Type-specific behavior
      switch (p.type) {
        case ParticleType.SMOKE:
          // Rising smoke
          p.vy -= p.riseSpeed * dt * CONFIG.FPS;
          p.vx *= 0.97;
          break;
        case ParticleType.EMBER:
          // Floating embers with sinusoidal drift
          p.vx += Math.sin(p.life * 15 + p.rotation) * 0.02;
          p.vy -= 0.01; // slight upward drift
          p.vx *= 0.99;
          p.vy *= 0.99;
          break;
        case ParticleType.DEBRIS:
          // Parabolic trajectory with gravity
          p.rotation += p.rotationSpeed;
          p.vx *= 0.99;
          break;
        case ParticleType.SPORE:
          // Glowing spores float and pulse
          p.vx += Math.sin(p.life * 8 + p.rotation) * 0.03;
          p.vy -= 0.005;
          p.vx *= 0.98;
          p.vy *= 0.98;
          break;
        default:
          p.vx *= p.drag;
          p.vy *= p.drag;
          break;
      }
    }
  }

  /**
   * Render all particles using batch putImageData rendering.
   * Particles are drawn to an offscreen canvas, then blitted in one operation.
   */
  render(renderer: Renderer): void {
    const ctx = this.offCtx;
    // Clear offscreen canvas
    ctx.clearRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    // Collect and sort active particles by render order
    const active: Particle[] = [];
    for (let i = 0; i < this.maxPool; i++) {
      if (this.pool[i].active) active.push(this.pool[i]);
    }

    if (active.length === 0) return;

    // Sort: smoke/shockwave first (background), then explosion/debris, then sparks/energy on top
    active.sort((a, b) => PARTICLE_RENDER_ORDER[a.type] - PARTICLE_RENDER_ORDER[b.type]);

    // Draw each particle to offscreen canvas
    for (const p of active) {
      this.drawParticle(ctx, p);
    }

    // Blit offscreen canvas to main canvas in one operation
    renderer.ctx.drawImage(this.offCanvas, 0, 0);
  }

  /**
   * Draw a single particle to the offscreen context
   */
  private drawParticle(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, p: Particle): void {
    const progress = 1 - p.life / p.maxLife; // 0 = birth, 1 = death
    const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
    const x = Math.floor(p.x);
    const y = Math.floor(p.y);

    // Compute dynamic size
    let size = p.baseSize;
    switch (p.type) {
      case ParticleType.EXPLOSION:
        size = p.baseSize * (1 + progress * 2);
        break;
      case ParticleType.SMOKE:
        size = p.baseSize * (1 + progress * 3);
        break;
      case ParticleType.SHOCKWAVE:
        size = p.baseSize * (1 + progress * 5);
        break;
      case ParticleType.DEBRIS:
        size = p.baseSize * (1 - progress * 0.5);
        break;
      case ParticleType.SPORE:
        // Pulsating glow
        size = p.baseSize * (1 + Math.sin(progress * Math.PI * 4) * 0.3);
        break;
    }
    size = Math.max(1, Math.floor(size));

    ctx.save();

    switch (p.type) {
      case ParticleType.EXPLOSION:
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
        ctx.fill();
        break;

      case ParticleType.DEBRIS:
        ctx.globalAlpha = alpha;
        ctx.translate(x, y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-size / 2, -size / 2, size, size);
        break;

      case ParticleType.SPARK:
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        // Elongated in velocity direction
        const sparkLen = Math.max(1, size);
        const sparkW = Math.max(1, Math.floor(size / 2));
        ctx.fillRect(x, y, sparkLen, sparkW);
        break;

      case ParticleType.EMBER:
        ctx.globalAlpha = alpha * (0.5 + Math.sin(progress * Math.PI * 3) * 0.5);
        ctx.fillStyle = p.color;
        ctx.fillRect(x, y, size, size);
        break;

      case ParticleType.SMOKE:
        ctx.globalAlpha = alpha * 0.4;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
        ctx.fill();
        break;

      case ParticleType.SHOCKWAVE:
        ctx.globalAlpha = alpha * 0.3;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case ParticleType.ENERGY:
      case ParticleType.ENERGY_TRAIL:
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
        ctx.fill();
        // White core
        ctx.globalAlpha = alpha * 0.7;
        ctx.fillStyle = PALETTE.white;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size / 4, 0, Math.PI * 2);
        ctx.fill();
        break;

      case ParticleType.ENGINE_EXHAUST:
        ctx.globalAlpha = alpha * 0.7;
        ctx.fillStyle = p.color;
        ctx.fillRect(x, y, size, size);
        break;

      case ParticleType.LASER_SPARK:
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(x, y, 2, 2);
        break;

      case ParticleType.LAVA_SPLASH:
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(x, y, size, size);
        // Glow
        ctx.globalAlpha = alpha * 0.3;
        ctx.fillRect(x - 1, y - 1, size + 2, size + 2);
        break;

      case ParticleType.DUST:
        ctx.globalAlpha = alpha * 0.5;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
        ctx.fill();
        break;

      case ParticleType.SPORE:
        ctx.globalAlpha = alpha * (0.6 + Math.sin(progress * Math.PI * 4) * 0.4);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
        ctx.fill();
        // Glow
        ctx.globalAlpha = alpha * 0.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
        break;
    }

    ctx.restore();
  }

  // ===== Spawn helpers =====

  /**
   * Create explosion effect at position
   */
  explosion(x: number, y: number, size: number = 1, colors?: string[]): void {
    const c = colors || EXPLOSION_COLORS;
    const count = Math.floor(15 * size);

    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      if (!p) continue;
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const speed = (1 + Math.random() * 3) * size;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = 0.2 + Math.random() * 0.3;
      p.maxLife = p.life;
      p.baseSize = (2 + Math.random() * 4) * size;
      p.color = c[Math.floor(Math.random() * c.length)];
      p.type = Math.random() < 0.3 ? ParticleType.SPARK : ParticleType.EXPLOSION;
      p.gravity = 0;
      p.drag = 0.96;
    }

    // Smoke
    for (let i = 0; i < Math.floor(5 * size); i++) {
      const p = this.acquire();
      if (!p) continue;
      p.x = x + (Math.random() - 0.5) * 10;
      p.y = y + (Math.random() - 0.5) * 10;
      p.vx = (Math.random() - 0.5) * 1;
      p.vy = -Math.random() * 1;
      p.life = 0.5 + Math.random() * 0.5;
      p.maxLife = p.life;
      p.baseSize = 3 + Math.random() * 5;
      p.color = SMOKE_COLORS[Math.floor(Math.random() * SMOKE_COLORS.length)];
      p.type = ParticleType.SMOKE;
      p.gravity = -0.02;
      p.riseSpeed = 0.5;
      p.drag = 0.97;
    }

    // Shockwave ring
    const sp = this.acquire();
    if (sp) {
      sp.x = x;
      sp.y = y;
      sp.vx = 0;
      sp.vy = 0;
      sp.life = 0.2;
      sp.maxLife = 0.2;
      sp.baseSize = 5 * size;
      sp.color = PALETTE.white;
      sp.type = ParticleType.SHOCKWAVE;
      sp.gravity = 0;
      sp.drag = 1;
    }
  }

  /**
   * Screen-filling boss explosion (40%+ screen coverage, multi-stage)
   */
  bossExplosion(x: number, y: number): void {
    const cx = Math.floor(x);
    const cy = Math.floor(y);

    // Stage 1: Central white flash (large explosion)
    for (let i = 0; i < 40; i++) {
      const p = this.acquire();
      if (!p) continue;
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      p.x = cx + (Math.random() - 0.5) * 20;
      p.y = cy + (Math.random() - 0.5) * 20;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = 0.3 + Math.random() * 0.4;
      p.maxLife = p.life;
      p.baseSize = 4 + Math.random() * 8;
      p.color = Math.random() < 0.5 ? PALETTE.white : PALETTE.yellow;
      p.type = ParticleType.EXPLOSION;
      p.gravity = 0;
      p.drag = 0.95;
    }

    // Stage 2: Expanding fireball ring
    for (let i = 0; i < 60; i++) {
      const p = this.acquire();
      if (!p) continue;
      const angle = (i / 60) * Math.PI * 2;
      const speed = 4 + Math.random() * 5;
      p.x = cx;
      p.y = cy;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = 0.5 + Math.random() * 0.5;
      p.maxLife = p.life;
      p.baseSize = 3 + Math.random() * 6;
      p.color = FIRE_COLORS[Math.floor(Math.random() * FIRE_COLORS.length)];
      p.type = ParticleType.EXPLOSION;
      p.gravity = 0.01;
      p.drag = 0.97;
    }

    // Stage 3: Heavy debris with parabolic arcs
    for (let i = 0; i < 40; i++) {
      const p = this.acquire();
      if (!p) continue;
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 6;
      p.x = cx + (Math.random() - 0.5) * 30;
      p.y = cy + (Math.random() - 0.5) * 20;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 2; // upward bias for parabolic arc
      p.life = 1.0 + Math.random() * 1.0;
      p.maxLife = p.life;
      p.baseSize = 2 + Math.random() * 4;
      p.color = [PALETTE.gray, PALETTE.darkGray, PALETTE.steel, PALETTE.steelDark][Math.floor(Math.random() * 4)];
      p.type = ParticleType.DEBRIS;
      p.gravity = 0.08; // gravity for parabolic arc
      p.drag = 0.99;
      p.rotation = Math.random() * Math.PI * 2;
      p.rotationSpeed = (Math.random() - 0.5) * 0.3;
    }

    // Stage 4: Rising smoke clouds
    for (let i = 0; i < 30; i++) {
      const p = this.acquire();
      if (!p) continue;
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 20;
      p.x = cx + Math.cos(angle) * dist;
      p.y = cy + Math.sin(angle) * dist;
      p.vx = (Math.random() - 0.5) * 2;
      p.vy = -1 - Math.random() * 2;
      p.life = 1.0 + Math.random() * 1.5;
      p.maxLife = p.life;
      p.baseSize = 6 + Math.random() * 12;
      p.color = SMOKE_COLORS[Math.floor(Math.random() * SMOKE_COLORS.length)];
      p.type = ParticleType.SMOKE;
      p.gravity = -0.03;
      p.riseSpeed = 1.0;
      p.drag = 0.97;
    }

    // Stage 5: Energy burst (outward ring)
    for (let i = 0; i < 30; i++) {
      const p = this.acquire();
      if (!p) continue;
      const angle = (i / 30) * Math.PI * 2;
      const speed = 5 + Math.random() * 3;
      p.x = cx;
      p.y = cy;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = 0.6 + Math.random() * 0.4;
      p.maxLife = p.life;
      p.baseSize = 2 + Math.random() * 3;
      p.color = ENERGY_COLORS[Math.floor(Math.random() * ENERGY_COLORS.length)];
      p.type = ParticleType.ENERGY;
      p.gravity = 0;
      p.drag = 0.96;
    }

    // Stage 6: Secondary shockwaves
    for (let i = 0; i < 3; i++) {
      const sp = this.acquire();
      if (!sp) continue;
      sp.x = cx + (Math.random() - 0.5) * 20;
      sp.y = cy + (Math.random() - 0.5) * 15;
      sp.vx = 0;
      sp.vy = 0;
      sp.life = 0.3 + i * 0.1;
      sp.maxLife = sp.life;
      sp.baseSize = 15 + i * 8;
      sp.color = i === 0 ? PALETTE.white : (i === 1 ? PALETTE.yellow : PALETTE.orange);
      sp.type = ParticleType.SHOCKWAVE;
      sp.gravity = 0;
      sp.drag = 1;
    }

    // Stage 7: Ember shower
    for (let i = 0; i < 25; i++) {
      const p = this.acquire();
      if (!p) continue;
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      p.x = cx + (Math.random() - 0.5) * 15;
      p.y = cy + (Math.random() - 0.5) * 15;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = 0.8 + Math.random() * 1.2;
      p.maxLife = p.life;
      p.baseSize = 1 + Math.random() * 2;
      p.color = EMBER_COLORS[Math.floor(Math.random() * EMBER_COLORS.length)];
      p.type = ParticleType.EMBER;
      p.gravity = 0.03;
      p.drag = 0.99;
      p.rotation = Math.random() * Math.PI * 2;
    }
  }

  /**
   * Player engine trail (3-5 particles per call)
   */
  engineTrail(x: number, y: number): void {
    const count = 3 + Math.floor(Math.random() * 3); // 3-5 particles
    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      if (!p) continue;
      p.x = x + (Math.random() - 0.5) * 4;
      p.y = y + (Math.random() - 0.5) * 2;
      p.vx = -1.5 - Math.random() * 1.5;
      p.vy = (Math.random() - 0.5) * 0.8;
      p.life = 0.12 + Math.random() * 0.08;
      p.maxLife = p.life;
      p.baseSize = 1 + Math.random() * 1.5;
      p.color = EXHAUST_COLORS[Math.floor(Math.random() * EXHAUST_COLORS.length)];
      p.type = ParticleType.ENGINE_EXHAUST;
      p.gravity = 0;
      p.drag = 0.95;
    }
  }

  /**
   * Laser spark effect
   */
  laserSpark(x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      const p = this.acquire();
      if (!p) continue;
      p.x = x;
      p.y = y;
      p.vx = (Math.random() - 0.5) * 3;
      p.vy = (Math.random() - 0.5) * 3;
      p.life = 0.1 + Math.random() * 0.1;
      p.maxLife = p.life;
      p.baseSize = 1;
      p.color = Math.random() < 0.5 ? PALETTE.white : PALETTE.yellow;
      p.type = ParticleType.LASER_SPARK;
      p.gravity = 0;
      p.drag = 0.9;
    }
  }

  /**
   * Impact sparks (bullet hitting armor)
   */
  impact(x: number, y: number, direction: number = 0): void {
    for (let i = 0; i < 8; i++) {
      const p = this.acquire();
      if (!p) continue;
      const angle = direction + (Math.random() - 0.5) * 1.5;
      const speed = 2 + Math.random() * 3;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = 0.1 + Math.random() * 0.15;
      p.maxLife = p.life;
      p.baseSize = 1 + Math.random() * 2;
      p.color = SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)];
      p.type = ParticleType.SPARK;
      p.gravity = 0;
      p.drag = 0.9;
    }
  }

  /**
   * Weapon projectile trail: energy particles matching weapon color.
   * Call per frame for each active player bullet.
   */
  weaponTrail(x: number, y: number, color: string): void {
    const p = this.acquire();
    if (!p) return;
    p.x = x + (Math.random() - 0.5) * 2;
    p.y = y + (Math.random() - 0.5) * 2;
    p.vx = (Math.random() - 0.5) * 0.5;
    p.vy = (Math.random() - 0.5) * 0.5;
    p.life = 0.15 + Math.random() * 0.1;
    p.maxLife = p.life;
    p.baseSize = 2 + Math.random() * 2;
    p.color = color;
    p.type = ParticleType.ENERGY_TRAIL;
    p.gravity = 0;
    p.drag = 0.85;
  }

  /**
   * Biome-specific environmental particles.
   * Call once per frame to maintain ambient atmosphere.
   */
  environmentalParticles(biome: Biome, frame: number): void {
    // Spawn a few particles per frame based on biome
    switch (biome) {
      case Biome.VOLCANIC:
        // Rising embers from bottom
        if (frame % 3 === 0) {
          const p = this.acquire();
          if (p) {
            p.x = Math.random() * CONFIG.WIDTH;
            p.y = CONFIG.HEIGHT + 2;
            p.vx = (Math.random() - 0.5) * 0.5;
            p.vy = -0.5 - Math.random() * 1.0;
            p.life = 2.0 + Math.random() * 2.0;
            p.maxLife = p.life;
            p.baseSize = 1 + Math.random();
            p.color = EMBER_COLORS[Math.floor(Math.random() * EMBER_COLORS.length)];
            p.type = ParticleType.EMBER;
            p.gravity = -0.01;
            p.drag = 0.99;
            p.rotation = Math.random() * Math.PI * 2;
          }
        }
        // Lava splashes from bottom edges
        if (frame % 20 === 0) {
          for (let i = 0; i < 5; i++) {
            const p = this.acquire();
            if (!p) continue;
            p.x = Math.random() * CONFIG.WIDTH;
            p.y = CONFIG.HEIGHT;
            p.vx = (Math.random() - 0.5) * 2;
            p.vy = -2 - Math.random() * 3;
            p.life = 0.5 + Math.random() * 0.5;
            p.maxLife = p.life;
            p.baseSize = 2 + Math.random() * 2;
            p.color = LAVA_COLORS[Math.floor(Math.random() * LAVA_COLORS.length)];
            p.type = ParticleType.LAVA_SPLASH;
            p.gravity = 0.05;
            p.drag = 0.98;
          }
        }
        break;

      case Biome.CITY:
        // Sparks from buildings
        if (frame % 8 === 0) {
          const p = this.acquire();
          if (p) {
            p.x = Math.random() * CONFIG.WIDTH;
            p.y = Math.random() * CONFIG.HEIGHT * 0.5;
            p.vx = (Math.random() - 0.5) * 1;
            p.vy = Math.random() * 0.5;
            p.life = 0.3 + Math.random() * 0.3;
            p.maxLife = p.life;
            p.baseSize = 1;
            p.color = SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)];
            p.type = ParticleType.SPARK;
            p.gravity = 0.02;
            p.drag = 0.95;
          }
        }
        // Neon particles floating
        if (frame % 12 === 0) {
          const p = this.acquire();
          if (p) {
            p.x = CONFIG.WIDTH + 2;
            p.y = Math.random() * CONFIG.HEIGHT;
            p.vx = -0.5 - Math.random() * 0.5;
            p.vy = (Math.random() - 0.5) * 0.3;
            p.life = 3.0 + Math.random() * 2.0;
            p.maxLife = p.life;
            p.baseSize = 1 + Math.random();
            p.color = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
            p.type = ParticleType.ENERGY;
            p.gravity = 0;
            p.drag = 0.99;
          }
        }
        break;

      case Biome.ASTEROID:
        // Dust clouds
        if (frame % 15 === 0) {
          const p = this.acquire();
          if (p) {
            p.x = CONFIG.WIDTH + 2;
            p.y = Math.random() * CONFIG.HEIGHT;
            p.vx = -0.3 - Math.random() * 0.5;
            p.vy = (Math.random() - 0.5) * 0.2;
            p.life = 4.0 + Math.random() * 3.0;
            p.maxLife = p.life;
            p.baseSize = 3 + Math.random() * 4;
            p.color = [PALETTE.asteroid, PALETTE.asteroidDark, PALETTE.darkGray][Math.floor(Math.random() * 3)];
            p.type = ParticleType.DUST;
            p.gravity = 0;
            p.drag = 0.995;
          }
        }
        // Meteor trails
        if (frame % 40 === 0) {
          for (let i = 0; i < 8; i++) {
            const p = this.acquire();
            if (!p) continue;
            p.x = CONFIG.WIDTH + i * 5;
            p.y = Math.random() * CONFIG.HEIGHT * 0.6;
            p.vx = -3 - Math.random() * 2;
            p.vy = 0.5 + Math.random() * 0.5;
            p.life = 0.3 + Math.random() * 0.3;
            p.maxLife = p.life;
            p.baseSize = 1 + Math.random();
            p.color = Math.random() < 0.3 ? PALETTE.white : PALETTE.offWhite;
            p.type = ParticleType.SPARK;
            p.gravity = 0;
            p.drag = 0.95;
          }
        }
        break;

      case Biome.ORGANIC:
        // Glowing spores
        if (frame % 6 === 0) {
          const p = this.acquire();
          if (p) {
            p.x = Math.random() * CONFIG.WIDTH;
            p.y = CONFIG.HEIGHT + 2;
            p.vx = (Math.random() - 0.5) * 0.3;
            p.vy = -0.3 - Math.random() * 0.5;
            p.life = 3.0 + Math.random() * 3.0;
            p.maxLife = p.life;
            p.baseSize = 1 + Math.random() * 2;
            p.color = SPORE_COLORS[Math.floor(Math.random() * SPORE_COLORS.length)];
            p.type = ParticleType.SPORE;
            p.gravity = -0.01;
            p.drag = 0.98;
            p.rotation = Math.random() * Math.PI * 2;
          }
        }
        break;
    }
  }

  /**
   * Active particle count
   */
  get count(): number {
    return this.maxPool - this.free.length;
  }

  /**
   * Clear all particles
   */
  clear(): void {
    for (let i = 0; i < this.maxPool; i++) {
      if (this.pool[i].active) {
        this.release(this.pool[i]);
      }
    }
  }
}

/** Render order: lower = drawn first (background) */
const PARTICLE_RENDER_ORDER: number[] = [
  ParticleType.SMOKE,       // 0 - background
  ParticleType.DUST,        // 1
  ParticleType.SHOCKWAVE,   // 2
  ParticleType.ENGINE_EXHAUST, // 3
  ParticleType.EMBER,       // 4
  ParticleType.LAVA_SPLASH, // 5
  ParticleType.SPORE,       // 6
  ParticleType.EXPLOSION,   // 7
  ParticleType.DEBRIS,      // 8
  ParticleType.ENERGY,      // 9
  ParticleType.ENERGY_TRAIL,// 10
  ParticleType.SPARK,       // 11 - foreground
  ParticleType.LASER_SPARK, // 12
];
