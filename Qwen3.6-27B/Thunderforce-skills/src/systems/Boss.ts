/**
 * Boss framework: multi-phase boss battles with destructible sections
 */
import { CONFIG } from '../core/Config';
import { Renderer, PALETTE } from '../core/Renderer';
import { SeededRandom } from '../utils/SeededRandom';
import { Bullet } from './Bullet';
import { Camera } from './Camera';

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

    switch (this.type) {
      case BossType.MINING_MACHINE:
        this.renderMiningMachine(renderer, x, y);
        break;
      case BossType.ORBITAL_SHIP:
        this.renderOrbitalShip(renderer, x, y);
        break;
      case BossType.ALIEN_GUARDIAN:
        this.renderAlienGuardian(renderer, x, y);
        break;
    }
  }

  /**
   * Boss 1: Mining Machine
   */
  private renderMiningMachine(r: Renderer, x: number, y: number): void {
    // Main body
    r.rect(x, y, 80, 60, PALETTE.steelDark);
    r.rect(x + 2, y + 2, 76, 56, PALETTE.steel);

    // Sections
    for (const section of this.sections) {
      if (!section.alive) continue;
      const sx = x + section.x;
      const sy = y + section.y;
      r.rect(sx, sy, section.w, section.h, section.color);
      r.rect(sx + 2, sy + 2, section.w - 4, section.h - 4, shadeColor(section.color, 20));
      // Damage indicator
      if (section.hp < section.maxHp * 0.5) {
        r.rect(sx + 4, sy + 4, 2, 2, PALETTE.red);
      }
    }

    // Drills
    const drillAngle = this.animFrame * 0.5;
    for (let i = 0; i < 2; i++) {
      const dx = x + (i === 0 ? -5 : 75);
      const dy = y + 30 + Math.sin(drillAngle + i * Math.PI) * 5;
      r.rect(dx, dy, 8, 4, PALETTE.gray);
      r.rect(dx - 3, dy + 1, 3, 2, PALETTE.orange);
    }

    // Core glow
    const glow = Math.sin(this.animFrame * 0.5) > 0;
    if (glow) {
      r.rect(x + 35, y + 25, 10, 10, PALETTE.orange);
      r.rect(x + 37, y + 27, 6, 6, PALETTE.yellow);
    }
  }

  /**
   * Boss 2: Orbital Battleship
   */
  private renderOrbitalShip(r: Renderer, x: number, y: number): void {
    const transform = this.transformProgress;

    // Hull
    r.rect(x, y, 60, 60, PALETTE.steelDark);
    r.rect(x + 2, y + 2, 56, 56, PALETTE.steel);

    // Rotating weapon arrays
    for (let i = 0; i < 6; i++) {
      const angle = this.spiralAngle + (i / 6) * Math.PI * 2;
      const wx = x + 30 + Math.cos(angle) * 25;
      const wy = y + 30 + Math.sin(angle) * 25;
      r.rect(wx - 3, wy - 3, 6, 6, PALETTE.darkGray);
      r.rect(wx - 1, wy - 1, 2, 2, PALETTE.red);
    }

    // Transformation effect
    if (transform > 0 && transform < 1) {
      r.ctx.globalAlpha = transform * 0.5;
      r.rect(x - 5, y - 5, 70, 70, PALETTE.cyan);
      r.ctx.globalAlpha = 1;
    }

    // Phase 2 armor
    if (this.phase === 2) {
      r.rect(x - 3, y - 3, 66, 66, PALETTE.darkRed);
      r.rect(x, y, 60, 60, PALETTE.red);
      // Wing extensions
      r.rect(x - 10, y + 10, 10, 40, PALETTE.darkRed);
      r.rect(x + 60, y + 10, 10, 40, PALETTE.darkRed);
    }

    // Bridge
    r.rect(x + 25, y + 25, 10, 10, PALETTE.lightBlue);
    r.rect(x + 27, y + 27, 6, 6, PALETTE.cyan);
  }

  /**
   * Boss 3: Alien Guardian
   */
  private renderAlienGuardian(r: Renderer, x: number, y: number): void {
    // Organic body
    const pulse = Math.sin(this.animFrame * 0.4) * 3;

    // Main body
    r.rect(x, y, 60, 50, PALETTE.organicDark);
    r.rect(x + 2, y + 2, 56, 46, PALETTE.organic);

    // Inner organs
    r.rect(x + 15, y + 10, 30, 30, PALETTE.flesh);
    r.rect(x + 20, y + 15, 20, 20, PALETTE.fleshDark);

    // Eyes
    const eyeGlow = Math.sin(this.animFrame * 0.3) > 0;
    r.rect(x + 22, y + 20, 6, 6, eyeGlow ? PALETTE.neonGreen : PALETTE.green);
    r.rect(x + 32, y + 20, 6, 6, eyeGlow ? PALETTE.neonGreen : PALETTE.green);
    r.rect(x + 24, y + 22, 2, 2, PALETTE.white);
    r.rect(x + 34, y + 22, 2, 2, PALETTE.white);

    // Tendrils
    for (let i = 0; i < 4; i++) {
      const tx = x + 10 + i * 12;
      const ty = y + 50 + Math.sin(this.animFrame * 0.5 + i) * 5;
      r.rect(tx, ty, 4, 8 + pulse, PALETTE.organic);
    }

    // Phase effects
    if (this.phase >= 2) {
      // Energy aura
      r.ctx.globalAlpha = 0.3 + Math.sin(this.animFrame * 0.6) * 0.2;
      r.rect(x - 5, y - 5, 70, 60, PALETTE.magenta);
      r.ctx.globalAlpha = 1;
    }

    if (this.phase >= 3) {
      // Final phase - exposed core
      r.rect(x + 22, y + 18, 16, 16, PALETTE.magenta);
      r.rect(x + 26, y + 22, 8, 8, PALETTE.white);
    }
  }

  /**
   * Render destruction sequence
   */
  private renderDestruction(r: Renderer): void {
    const progress = this.destroyTimer / this.destroyDuration;
    const x = Math.floor(this.x);
    const y = Math.floor(this.y);

    // Flash and crumble
    if (progress < 0.3) {
      // White flash
      r.ctx.globalAlpha = 1 - progress / 0.3;
      r.rect(x - 10, y - 10, this.type === BossType.MINING_MACHINE ? 100 : 80, this.type === BossType.ALIEN_GUARDIAN ? 70 : 80, PALETTE.white);
      r.ctx.globalAlpha = 1;
    } else if (progress < 0.7) {
      // Crumbling pieces
      const shake = (progress - 0.3) * 20;
      for (let i = 0; i < 8; i++) {
        const px = x + (i % 4) * 20 + (Math.random() - 0.5) * shake;
        const py = y + Math.floor(i / 4) * 30 + (Math.random() - 0.5) * shake;
        r.rect(px, py, 15, 20, this.type === BossType.ALIEN_GUARDIAN ? PALETTE.flesh : PALETTE.steel);
      }
    } else {
      // Final explosion
      r.ctx.globalAlpha = 1 - (progress - 0.7) / 0.3;
      r.circle(x + 30, y + 30, 40 * (progress - 0.7) * 3, PALETTE.white);
      r.circle(x + 30, y + 30, 30 * (progress - 0.7) * 3, PALETTE.yellow);
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
