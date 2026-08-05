/**
 * Boss framework: multi-phase boss battles with destructible sections
 */
import { CONFIG } from '../core/Config';
import { Renderer, PALETTE } from '../core/Renderer';
import { AnimatedSprite } from '../core/AnimatedSprite';
import { Bullet } from './Bullet';
import { Camera } from './Camera';
import {
  createMiningMachineSheet,
  createOrbitalShipSheet,
  createAlienGuardianSheet,
} from '../data/sprites/bosses';
import { SPRITE_PALETTE } from '../data/sprites';

/**
 * Boss types
 */
export enum BossType {
  MINING_MACHINE,    // Boss 1: Gigantic mining machine
  ORBITAL_SHIP,      // Boss 2: Transforming orbital battleship
  ALIEN_GUARDIAN,    // Boss 3: Biomechanical alien guardian
}

/**
 * Destructible section on a boss
 */
export class BossSection {
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  color: string;

  constructor(x: number, y: number, w: number, h: number, hp: number, color: string) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.hp = hp;
    this.maxHp = hp;
    this.alive = true;
    this.color = color;
  }

  takeDamage(amount: number): boolean {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.alive = false;
      return true;
    }
    return false;
  }
}

/**
 * Boss entity
 */
export class Boss {
  x: number;
  y: number;
  type: BossType;
  phase: number;
  maxPhase: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  entranceProgress: number;
  patternY: number | null = null;

  // Attack state
  private attackTimer: number;
  private attackPhase: number;
  private spiralAngle: number = 0;
  private sweepAngle: number = 0;
  private phaseTransition: boolean = false;
  private phaseTransitionTimer: number = 0;

  // Animation
  private animFrame: number = 0;
  private animTimer: number = 0;
  private transformProgress: number = 0; // For boss 2
  private sprite: AnimatedSprite;
  private palette: [number, number, number][];

  // Sections (for boss 1)
  sections: BossSection[] = [];

  // Destruction sequence
  public destroying: boolean = false;
  private destroyTimer: number = 0;
  private destroyDuration: number = 3;

  // Screen shake
  private shakeAmount: number = 0;

  constructor(type: BossType) {
    this.type = type;
    this.x = CONFIG.WIDTH + 50;
    this.y = CONFIG.HEIGHT / 2 - 30;
    this.phase = 1;
    this.maxPhase = type === BossType.ALIEN_GUARDIAN ? 3 : 2;
    this.hp = type === BossType.ALIEN_GUARDIAN ? 200 : (type === BossType.ORBITAL_SHIP ? 150 : 100);
    this.maxHp = this.hp;
    this.alive = true;
    this.entranceProgress = 0;
    this.attackTimer = 0;
    this.attackPhase = 0;

    // Create sprite based on boss type
    switch (type) {
      case BossType.MINING_MACHINE:
        this.sprite = new AnimatedSprite(createMiningMachineSheet());
        break;
      case BossType.ORBITAL_SHIP:
        this.sprite = new AnimatedSprite(createOrbitalShipSheet());
        break;
      case BossType.ALIEN_GUARDIAN:
        this.sprite = new AnimatedSprite(createAlienGuardianSheet());
        break;
    }

    // Build palette
    this.palette = SPRITE_PALETTE.map((hex) => {
      const n = parseInt(hex.replace('#', ''), 16);
      return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff] as [number, number, number];
    });
    this.palette[0] = [0, 0, 0];
    while (this.palette.length < 256) this.palette.push([0, 0, 0]);

    // Initialize sections for mining machine
    if (type === BossType.MINING_MACHINE) {
      this.sections = [
        new BossSection(0, 0, 20, 20, 20, PALETTE.steel),      // Top turret
        new BossSection(40, 0, 20, 20, 20, PALETTE.steel),     // Bottom turret
        new BossSection(20, 20, 20, 20, 30, PALETTE.steelDark), // Core
        new BossSection(0, 40, 20, 20, 20, PALETTE.steel),     // Left drill
        new BossSection(40, 40, 20, 20, 20, PALETTE.steel),    // Right drill
      ];
    }
  }

  /**
   * Update boss behavior
   */
  update(dt: number, camera: Camera, playerX: number, playerY: number): Bullet[] {
    if (this.destroying) {
      this.destroyTimer += dt;
      if (this.destroyTimer >= this.destroyDuration) {
        this.alive = false;
      }
      this.shakeAmount = 3;
      return [];
    }

    // Entrance animation
    if (this.entranceProgress < 1) {
      this.entranceProgress += dt * 0.3;
      this.x = CONFIG.WIDTH + 50 - this.entranceProgress * (CONFIG.WIDTH - 200);
      this.y = CONFIG.HEIGHT / 2 - 30 + Math.sin(this.entranceProgress * Math.PI) * 20;
      this.shakeAmount = 2 * this.entranceProgress;
      return [];
    }

    // Animation
    this.animTimer += dt;
    if (this.animTimer > 0.1) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 8;
    }

    // Phase transition
    if (this.phaseTransition) {
      this.phaseTransitionTimer += dt;
      this.shakeAmount = 4;
      if (this.phaseTransitionTimer >= 1.5) {
        this.phaseTransition = false;
        this.phaseTransitionTimer = 0;
        this.phase++;
        this.attackPhase = 0;
      }
      return [];
    }

    // Check phase transition
    const phaseThreshold = this.maxHp / this.maxPhase;
    if (this.hp < phaseThreshold * (this.maxPhase - this.phase) && this.phase < this.maxPhase) {
      this.phaseTransition = true;
      this.phaseTransitionTimer = 0;
    }

    // Boss-specific behavior
    const bullets: Bullet[] = [];

    switch (this.type) {
      case BossType.MINING_MACHINE:
        bullets.push(...this.updateMiningMachine(dt, playerX, playerY));
        break;
      case BossType.ORBITAL_SHIP:
        bullets.push(...this.updateOrbitalShip(dt, playerX, playerY));
        break;
      case BossType.ALIEN_GUARDIAN:
        bullets.push(...this.updateAlienGuardian(dt, playerX, playerY));
        break;
    }

    // Decay shake
    this.shakeAmount *= 0.95;

    return bullets;
  }

  /**
   * Boss 1: Mining Machine
   */
  private updateMiningMachine(dt: number, playerX: number, playerY: number): Bullet[] {
    this.x = 180 + Math.sin(this.animFrame * 0.3) * 10;
    this.y = 60 + Math.sin(this.animFrame * 0.2) * 20;
    this.patternY = this.y + 30;

    this.attackTimer += dt;
    const bullets: Bullet[] = [];

    // Check if all sections destroyed
    const aliveSections = this.sections.filter(s => s.alive);
    if (aliveSections.length === 0 && this.phase === 1) {
      this.phaseTransition = true;
      return [];
    }

    if (this.attackTimer < 0.5) return bullets;

    switch (this.attackPhase % 4) {
      case 0:
        // Section fire
        for (const section of aliveSections) {
          const sx = this.x + section.x;
          const sy = this.y + section.y + section.h / 2;
          const angle = Math.atan2(playerY - sy, playerX - sx);
          bullets.push(new Bullet(
            sx, sy,
            Math.cos(angle) * 2,
            Math.sin(angle) * 2,
            true, 'boss_bullet'
          ));
        }
        break;
      case 1:
        // Spiral pattern
        this.spiralAngle += 0.3;
        for (let i = 0; i < 4; i++) {
          const angle = this.spiralAngle + (i / 4) * Math.PI * 2;
          bullets.push(new Bullet(
            this.x, this.y + 30,
            Math.cos(angle) * 2.5,
            Math.sin(angle) * 2.5,
            true, 'boss_bullet'
          ));
        }
        break;
      case 2:
        // Bullet curtain
        for (let i = 0; i < 8; i++) {
          bullets.push(new Bullet(
            this.x,
            this.y - 10 + i * 10,
            -2, 0,
            true, 'boss_bullet'
          ));
        }
        break;
      case 3:
        // Laser sweep
        this.sweepAngle += 0.02;
        const laserY = this.y + 30 + Math.sin(this.sweepAngle) * 60;
        bullets.push(new Bullet(this.x, laserY, 0, 0, true, 'boss_laser'));
        break;
    }

    this.attackTimer = 0;
    this.attackPhase++;
    return bullets;
  }

  /**
   * Boss 2: Orbital Battleship
   */
  private updateOrbitalShip(dt: number, playerX: number, playerY: number): Bullet[] {
    this.x = 160 + Math.sin(this.animFrame * 0.15) * 30;
    this.y = 40 + Math.sin(this.animFrame * 0.25) * 30;
    this.patternY = this.y + 25;

    // Transform animation
    if (this.phase === 2) {
      this.transformProgress = Math.min(1, this.transformProgress + dt * 0.5);
    }

    this.attackTimer += dt;
    const bullets: Bullet[] = [];

    if (this.attackTimer < 0.4) return bullets;

    if (this.phase === 1) {
      // Phase 1: Rotating weapon arrays
      this.spiralAngle += 0.1;
      for (let i = 0; i < 6; i++) {
        const angle = this.spiralAngle + (i / 6) * Math.PI * 2;
        const wx = this.x + Math.cos(angle) * 25;
        const wy = this.y + 30 + Math.sin(angle) * 25;
        const targetAngle = Math.atan2(playerY - wy, playerX - wx);
        bullets.push(new Bullet(
          wx, wy,
          Math.cos(targetAngle) * 2.5,
          Math.sin(targetAngle) * 2.5,
          true, 'boss_bullet'
        ));
      }
    } else {
      // Phase 2: Transformed - aggressive patterns
      switch (this.attackPhase % 3) {
        case 0:
          // Dense spiral
          this.spiralAngle += 0.2;
          for (let i = 0; i < 8; i++) {
            const angle = this.spiralAngle + (i / 8) * Math.PI * 2;
            bullets.push(new Bullet(
              this.x + 20, this.y + 30,
              Math.cos(angle) * 3,
              Math.sin(angle) * 3,
              true, 'boss_bullet'
            ));
          }
          break;
        case 1:
          // Triple laser
          for (let i = -1; i <= 1; i++) {
            const laserY = this.y + 30 + i * 25;
            bullets.push(new Bullet(this.x, laserY, 0, 0, true, 'boss_laser'));
          }
          break;
        case 2:
          // Homing missiles
          for (let i = 0; i < 3; i++) {
            bullets.push(new Bullet(
              this.x + i * 15,
              this.y + 50,
              -1.5, (i - 1) * 0.5,
              true, 'enemy_missile'
            ));
          }
          break;
      }
    }

    this.attackTimer = 0;
    this.attackPhase++;
    return bullets;
  }

  /**
   * Boss 3: Alien Guardian
   */
  private updateAlienGuardian(dt: number, playerX: number, playerY: number): Bullet[] {
    this.x = 150 + Math.sin(this.animFrame * 0.2) * 20;
    this.y = 50 + Math.sin(this.animFrame * 0.3) * 25;
    this.patternY = this.y + 25;

    this.attackTimer += dt;
    const bullets: Bullet[] = [];

    if (this.attackTimer < 0.3) return bullets;

    switch (this.phase) {
      case 1:
        // Organic spread patterns
        for (let i = 0; i < 5; i++) {
          const angle = Math.atan2(playerY - this.y - 25, playerX - this.x) + (i - 2) * 0.2;
          bullets.push(new Bullet(
            this.x, this.y + 25,
            Math.cos(angle) * 2,
            Math.sin(angle) * 2,
            true, 'boss_bullet'
          ));
        }
        break;
      case 2:
        // Spiral + aimed
        this.spiralAngle += 0.15;
        for (let i = 0; i < 6; i++) {
          const angle = this.spiralAngle + (i / 6) * Math.PI * 2;
          bullets.push(new Bullet(
            this.x + 20, this.y + 25,
            Math.cos(angle) * 2.5,
            Math.sin(angle) * 2.5,
            true, 'enemy_spiral'
          ));
        }
        const aimAngle = Math.atan2(playerY - this.y - 25, playerX - this.x);
        bullets.push(new Bullet(
          this.x, this.y + 25,
          Math.cos(aimAngle) * 3,
          Math.sin(aimAngle) * 3,
          true, 'boss_bullet'
        ));
        break;
      case 3:
        // Desperate attack - everything at once
        this.spiralAngle += 0.2;
        for (let i = 0; i < 12; i++) {
          const angle = this.spiralAngle + (i / 12) * Math.PI * 2;
          bullets.push(new Bullet(
            this.x + 20, this.y + 25,
            Math.cos(angle) * 3,
            Math.sin(angle) * 3,
            true, 'boss_bullet'
          ));
        }
        // Laser
        const laserY = this.y + 25 + Math.sin(this.animFrame * 0.5) * 40;
        bullets.push(new Bullet(this.x, laserY, 0, 0, true, 'boss_laser'));
        break;
    }

    this.attackTimer = 0;
    this.attackPhase++;
    return bullets;
  }

  /**
   * Take damage
   */
  takeDamage(amount: number = 1, hitX?: number, hitY?: number): boolean {
    if (this.destroying) return false;

    // Check section hits for mining machine
    if (this.type === BossType.MINING_MACHINE && hitX !== undefined && hitY !== undefined) {
      for (const section of this.sections) {
        if (!section.alive) continue;
        const sx = this.x + section.x;
        const sy = this.y + section.y;
        if (hitX >= sx && hitX <= sx + section.w && hitY >= sy && hitY <= sy + section.h) {
          if (section.takeDamage(amount)) {
            // Section destroyed
          }
          return false;
        }
      }
    }

    this.hp -= amount;
    if (this.hp <= 0) {
      this.destroying = true;
      this.destroyTimer = 0;
      return true;
    }
    return false;
  }

  /**
   * Get collision box
   */
  getBox(): { x: number; y: number; w: number; h: number } {
    const w = this.type === BossType.MINING_MACHINE ? 80 : 60;
    const h = this.type === BossType.ALIEN_GUARDIAN ? 50 : 60;
    return { x: this.x, y: this.y, w, h };
  }

  /**
   * Render the boss
   */
  render(renderer: Renderer): void {
    if (this.destroying) {
      this.renderDestruction(renderer);
      return;
    }

    const x = Math.floor(this.x);
    const y = Math.floor(this.y);

    // Update sprite animation
    this.sprite.update(1 / CONFIG.FPS);

    // Draw sprite sheet (centered on boss position)
    const meta = this.sprite.sheet.meta;
    const offsetX = Math.floor((this.type === BossType.MINING_MACHINE ? 80 : 60) - meta.width) / 2;
    const offsetY = Math.floor((this.type === BossType.ALIEN_GUARDIAN ? 50 : 60) - meta.height) / 2;

    const imageData = this.sprite.getImageData(this.palette);
    renderer.drawSpriteData(x + offsetX, y + offsetY, imageData);

    // Phase overlay effects
    if (this.phase >= 2 && this.type === BossType.ORBITAL_SHIP) {
      // Transformation energy aura
      renderer.ctx.globalAlpha = 0.2 + Math.sin(this.animFrame * 0.5) * 0.1;
      renderer.rect(x - 3, y - 3, 66, 66, PALETTE.cyan);
      renderer.ctx.globalAlpha = 1;
    }

    if (this.phase >= 3 && this.type === BossType.ALIEN_GUARDIAN) {
      // Final phase energy aura
      renderer.ctx.globalAlpha = 0.3 + Math.sin(this.animFrame * 0.6) * 0.2;
      renderer.rect(x - 5, y - 5, 70, 60, PALETTE.magenta);
      renderer.ctx.globalAlpha = 1;
    }
  }

  /**
   * Render destruction sequence with sprite-based animations and shockwave
   */
  private renderDestruction(r: Renderer): void {
    const progress = this.destroyTimer / this.destroyDuration;
    const x = Math.floor(this.x);
    const y = Math.floor(this.y);
    const meta = this.sprite.sheet.meta;
    const offsetX = Math.floor((this.type === BossType.MINING_MACHINE ? 80 : 60) - meta.width) / 2;
    const offsetY = Math.floor((this.type === BossType.ALIEN_GUARDIAN ? 50 : 60) - meta.height) / 2;

    // === Stage 1: White flash (0-0.15) ===
    if (progress < 0.15) {
      r.ctx.globalAlpha = 1 - progress / 0.15;
      r.rect(x - 10, y - 10, (this.type === BossType.MINING_MACHINE ? 100 : 80),
        (this.type === BossType.ALIEN_GUARDIAN ? 70 : 80), PALETTE.white);
      r.ctx.globalAlpha = 1;
      return;
    }

    // === Stage 2: Crumbling sprite pieces (0.15-0.5) ===
    if (progress < 0.5) {
      const stageProgress = (progress - 0.15) / 0.35;
      const shake = stageProgress * 15;

      // Draw boss sprite as crumbling pieces
      r.ctx.globalAlpha = 1 - stageProgress * 0.5;

      // Split sprite into 6 chunks with offset
      const chunkW = Math.floor(meta.width / 3);
      const chunkH = Math.floor(meta.height / 2);
      for (let cy = 0; cy < 2; cy++) {
        for (let cx = 0; cx < 3; cx++) {
          const px = x + offsetX + cx * chunkW + (Math.random() - 0.5) * shake;
          const py = y + offsetY + cy * chunkH + (Math.random() - 0.5) * shake;
          // Draw sprite portion via clip
          r.ctx.save();
          r.ctx.beginPath();
          r.ctx.rect(px, py, chunkW + 1, chunkH + 1);
          r.ctx.clip();
          const imageData = this.sprite.getImageData(this.palette);
          r.drawSpriteData(x + offsetX, y + offsetY, imageData);
          r.ctx.restore();
        }
      }
      r.ctx.globalAlpha = 1;

      // === 5.5 Shockwave ring effect ===
      if (stageProgress < 0.3) {
        const shockProgress = stageProgress / 0.3;
        const shockRadius = 20 + shockProgress * 60;
        r.ctx.globalAlpha = (1 - shockProgress) * 0.6;
        r.ctx.strokeStyle = PALETTE.white;
        r.ctx.lineWidth = 3 * (1 - shockProgress);
        r.ctx.beginPath();
        r.ctx.arc(x + 30, y + 25, shockRadius, 0, Math.PI * 2);
        r.ctx.stroke();
        r.ctx.globalAlpha = 1;
      }
      return;
    }

    // === Stage 3: Explosion sprite sequence (0.5-0.8) ===
    if (progress < 0.8) {
      const stageProgress = (progress - 0.5) / 0.3;

      // Multi-frame explosion using boss sprite colors
      const explosionSize = 30 + stageProgress * 40;
      const cx = x + 30;
      const cy = y + 25;

      // Outer fireball
      r.circle(cx, cy, explosionSize, stageProgress < 0.5 ? PALETTE.orange : PALETTE.red);
      // Inner core
      r.circle(cx, cy, explosionSize * 0.6, stageProgress < 0.5 ? PALETTE.yellow : PALETTE.orange);
      // White flash center
      r.circle(cx, cy, explosionSize * 0.3, PALETTE.white);

      // Debris spray
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + stageProgress * 3;
        const dist = stageProgress * 50;
        const dx = cx + Math.cos(angle) * dist;
        const dy = cy + Math.sin(angle) * dist;
        r.rect(Math.floor(dx), Math.floor(dy), 3, 3,
          this.type === BossType.ALIEN_GUARDIAN ? PALETTE.flesh : PALETTE.steel);
      }

      // === 5.5 Secondary shockwave ===
      const shock2Radius = 10 + stageProgress * 80;
      r.ctx.globalAlpha = (1 - stageProgress) * 0.4;
      r.ctx.strokeStyle = PALETTE.yellow;
      r.ctx.lineWidth = 2 * (1 - stageProgress);
      r.ctx.beginPath();
      r.ctx.arc(cx, cy, shock2Radius, 0, Math.PI * 2);
      r.ctx.stroke();
      r.ctx.globalAlpha = 1;
      return;
    }

    // === Stage 4: Smoke fade (0.8-1.0) ===
    {
      const stageProgress = (progress - 0.8) / 0.2;
      r.ctx.globalAlpha = 1 - stageProgress;

      // Smoke clouds
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const dist = stageProgress * 20;
        const sx = x + 30 + Math.cos(angle) * dist;
        const sy = y + 25 + Math.sin(angle) * dist;
        r.circle(Math.floor(sx), Math.floor(sy), 15 - stageProgress * 10, PALETTE.steelDark);
      }
      r.ctx.globalAlpha = 1;
    }
  }

  /**
   * Get shake amount for camera
   */
  getShake(): number {
    return this.shakeAmount;
  }

  /**
   * Reset boss
   */
  reset(type: BossType): void {
    Object.assign(this, new Boss(type));
    this.type = type;
  }
}
