/**
 * Player ship: physics, rendering, and AI-controlled gameplay
 */
import { CONFIG } from '../core/Config';
import { Renderer, PALETTE } from '../core/Renderer';
import { AnimatedSprite } from '../core/AnimatedSprite';
import { SeededRandom } from '../utils/SeededRandom';
import { clamp, lerp } from '../utils/Math';
import { Bullet } from './Bullet';
import { Enemy } from './Enemy';
import { Boss } from './Boss';
import { Pickup } from './Pickup';
import { PLAYER_SHIP_SHEET, SPRITE_PALETTE } from '../data/sprites';

/**
 * Weapon types
 */
export enum WeaponType {
  PLASMA,     // Rapid plasma stream
  HOMING,     // Homing energy drones
  SPREAD,     // Wide laser spread
  LIGHTNING,  // Penetrating lightning beam
}

/**
 * Player ship state
 */
export class Player {
  private x: number = CONFIG.PLAYER_X;
  private y: number = CONFIG.PLAYER_Y_CENTER;
  private vx: number = 0;
  private vy: number = 0;
  private speed: number = 3;
  private speedLevel: number = 0;
  public shield: number = 0;
  public maxShield: number = 100;
  public weapon: WeaponType = WeaponType.PLASMA;
  public weaponLevel: number = 1;
  public maxWeaponLevel: number = 4;
  private invincible: number = 0;
  private engineFlicker: number = 0;
  private lastShot: number = 0;

  // AI state
  private ai: SeededRandom = new SeededRandom(42);
  private aiTargetX: number = CONFIG.PLAYER_X;
  private aiTargetY: number = CONFIG.PLAYER_Y_CENTER;
  private aiTimer: number = 0;
  private aiDodgeDirection: number = 0;
  private aiWeaponTimer: number = 0;
  private aiPreferredWeapon: WeaponType = WeaponType.PLASMA;

  // Threat horizon: projected bullet positions over 30 frames
  private threatMap: Uint8Array = new Uint8Array(0); // 20x60 grid (screen divided into cells)
  private threatMapW: number = 20;
  private threatMapH: number = 60;
  private threatCellW: number = 0;
  private threatCellH: number = 0;
  private threatHorizonFrames: number = 30;

  // Movement pattern variety
  private aiMovementPattern: number = 0; // 0=cruise, 1=zigzag, 2=orbit, 3=burst
  private aiPatternTimer: number = 0;
  private aiPatternChangeInterval: number = 2.5; // max 2.5s between pattern changes

  // Smooth acceleration
  private aiUrgency: number = 0; // 0=calm, 1=urgent
  private aiTargetSpeed: number = 3;
  private aiCruiseSpeed: number = 2.5;
  private aiEvasionSpeed: number = 5.0;

  // Close-dodge spectacle
  private aiCloseDodgeTimer: number = 0;
  private aiCloseDodgeInterval: number = 5; // attempt close dodge every ~5 seconds
  private aiCloseDodgeBullet: { x: number; y: number; vx: number; vy: number } | null = null;

  // Animation
  private animFrame: number = 0;
  private animTimer: number = 0;
  private sprite: AnimatedSprite;
  private palette: [number, number, number][];

  constructor() {
    this.sprite = new AnimatedSprite(PLAYER_SHIP_SHEET);
    this.palette = SPRITE_PALETTE.map((hex, i) => {
      const n = parseInt(hex.replace('#', ''), 16);
      return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff] as [number, number, number];
    });
    // Index 0 = transparent
    this.palette[0] = [0, 0, 0];
    // Pad to 256
    while (this.palette.length < 256) this.palette.push([0, 0, 0]);
  }

  get px(): number { return this.x; }
  get py(): number { return this.y; }
  get pw(): number { return 16; }
  get ph(): number { return 12; }

  /**
   * Update player physics and AI
   */
  update(dt: number, bullets: Bullet[], enemies: Enemy[], boss: Boss | null, pickups: Pickup[]): Bullet[] | null {
    this.animTimer += dt;
    if (this.animTimer > 0.1) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 4;
    }

    this.engineFlicker = (this.engineFlicker + 1) % 4;

    // Invincibility timer
    if (this.invincible > 0) this.invincible -= dt;

    // AI behavior
    this.updateAI(dt, bullets, enemies, boss, pickups);

    // Physics
    this.x += this.vx * dt * CONFIG.FPS;
    this.y += this.vy * dt * CONFIG.FPS;

    // Clamp to screen
    this.x = clamp(this.x, 0, CONFIG.WIDTH - this.pw);
    this.y = clamp(this.y, 0, CONFIG.HEIGHT - this.ph);

    // Smooth movement
    this.vx = lerp(this.vx, 0, 0.3);
    this.vy = lerp(this.vy, 0, 0.3);

    // Auto-fire
    this.lastShot += dt;
    const fireRate = this.weapon === WeaponType.LIGHTNING ? 0.15 : 0.1;
    if (this.lastShot >= fireRate) {
      this.lastShot = 0;
      return this.fireWeapon();
    }
    return null;
  }

  /**
   * AI-controlled movement and weapon switching
   * Features: threat horizon, gap-finding, smooth acceleration, close-dodge, strategic weapons
   */
  private updateAI(dt: number, enemyBullets: Bullet[], enemies: Enemy[], boss: Boss | null, pickups: Pickup[]): void {
    this.aiTimer += dt;
    this.aiPatternTimer += dt;
    this.aiCloseDodgeTimer += dt;

    // Initialize threat map
    if (this.threatMap.length !== this.threatMapW * this.threatMapH) {
      this.threatMap = new Uint8Array(this.threatMapW * this.threatMapH);
      this.threatCellW = CONFIG.WIDTH / this.threatMapW;
      this.threatCellH = CONFIG.HEIGHT / this.threatMapH;
    }

    // === 3.4 Threat Horizon: Project hostile bullets 30 frames ahead ===
    this.buildThreatHorizon(enemyBullets);

    // === Movement pattern variety (3.9): Change pattern every ~2.5s ===
    if (this.aiPatternTimer > this.aiPatternChangeInterval) {
      this.aiPatternTimer = 0;
      this.aiMovementPattern = (this.aiMovementPattern + 1) % 4;
    }

    // === 3.7 Close-dodge spectacle: Occasionally pass within 8px of bullets ===
    const closeDodgeActive = this.tryCloseDodge(dt, enemyBullets);

    // === 3.5 Gap-finding: Find safest corridor ===
    const gapTarget = this.findSafeGap();

    // === 3.6 Smooth acceleration: Urgency-based speed ===
    const urgency = this.computeUrgency(enemyBullets);
    this.aiUrgency = lerp(this.aiUrgency, urgency, 0.1);
    this.aiTargetSpeed = lerp(this.aiCruiseSpeed, this.aiEvasionSpeed, this.aiUrgency);

    // Apply movement based on current pattern
    if (closeDodgeActive) {
      // Close dodge takes priority
      this.applyCloseDodgeMovement(dt);
    } else if (gapTarget) {
      // Move toward safe gap
      this.moveToTarget(dt, gapTarget.x, gapTarget.y, this.aiTargetSpeed * 1.2);
    } else {
      // Pattern-based movement
      this.applyPatternMovement(dt, enemies, boss);
    }

    // === Pickup collection (prioritize dodging) ===
    if (urgency < 0.5) {
      for (const pickup of pickups) {
        if (!pickup.collected && Math.abs(pickup.x - this.x) < 40 && Math.abs(pickup.y - this.y) < 30) {
          const dx = pickup.x - this.x;
          const dy = pickup.y - this.y;
          this.vx += Math.sign(dx) * 2 * dt * CONFIG.FPS;
          this.vy += Math.sign(dy) * 2 * dt * CONFIG.FPS;
        }
      }
    }

    // === 3.8 Strategic weapon switching ===
    this.updateWeaponStrategy(dt, enemies, boss);

    // Speed management
    if (boss && this.speedLevel < 2) {
      this.speedLevel = 2;
    }
  }

  /**
   * 3.4 Build threat horizon: project hostile bullets 30 frames ahead
   */
  private buildThreatHorizon(bullets: Bullet[]): void {
    // Clear threat map
    this.threatMap.fill(0);

    for (const b of bullets) {
      if (!b.hostile || b.isLaser) continue;

      // Project bullet position forward
      for (let t = 0; t < this.threatHorizonFrames; t++) {
        const fx = b.x + b.vx * t;
        const fy = b.y + b.vy * t;

        // Mark threatened cells
        const cx = Math.floor(fx / this.threatCellW);
        const cy = Math.floor(fy / this.threatCellH);
        if (cx >= 0 && cx < this.threatMapW && cy >= 0 && cy < this.threatMapH) {
          const idx = cy * this.threatMapW + cx;
          this.threatMap[idx] = Math.min(255, this.threatMap[idx] + 1);
        }
      }
    }
  }

  /**
   * 3.5 Gap-finding: Find largest unthreatened corridor within movement range
   */
  private findSafeGap(): { x: number; y: number } | null {
    const playerCellX = Math.floor(this.x / this.threatCellW);
    const playerCellY = Math.floor(this.y / this.threatCellH);
    const searchRadius = 5; // cells to search

    let bestThreat = Infinity;
    let bestX = this.x;
    let bestY = this.y;

    for (let dy = -searchRadius; dy <= searchRadius; dy++) {
      for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        const cx = playerCellX + dx;
        const cy = playerCellY + dy;
        if (cx < 0 || cx >= this.threatMapW || cy < 0 || cy >= this.threatMapH) continue;

        const threat = this.threatMap[cy * this.threatMapW + cx];
        if (threat < bestThreat) {
          bestThreat = threat;
          bestX = cx * this.threatCellW + this.threatCellW / 2;
          bestY = cy * this.threatCellH + this.threatCellH / 2;
        }
      }
    }

    // Only return if we found a meaningfully safer spot
    if (bestThreat < 3 && (Math.abs(bestX - this.x) > 10 || Math.abs(bestY - this.y) > 10)) {
      return { x: bestX, y: bestY };
    }
    return null;
  }

  /**
   * 3.6 Compute urgency based on nearby threats
   */
  private computeUrgency(bullets: Bullet[]): number {
    let maxUrgency = 0;

    for (const b of bullets) {
      if (!b.hostile || b.isLaser) continue;
      const dist = Math.sqrt((b.x - this.x) ** 2 + (b.y - this.y) ** 2);

      if (dist < 20) {
        maxUrgency = 1.0; // Immediate danger
      } else if (dist < 40) {
        maxUrgency = Math.max(maxUrgency, 1.0 - (dist - 20) / 20);
      } else if (dist < 80) {
        maxUrgency = Math.max(maxUrgency, 0.5 * (1.0 - (dist - 40) / 40));
      }
    }

    return maxUrgency;
  }

  /**
   * 3.7 Close-dodge: Pass within 8 pixels of bullets for spectacle
   */
  private tryCloseDodge(dt: number, bullets: Bullet[]): boolean {
    if (this.aiCloseDodgeBullet) {
      // Already chasing a bullet for close dodge
      this.aiCloseDodgeTimer += dt;
      if (this.aiCloseDodgeTimer > 2) {
        // Give up after 2 seconds
        this.aiCloseDodgeBullet = null;
        this.aiCloseDodgeTimer = 0;
      }
      return true;
    }

    // Look for a good close-dodge opportunity
    if (this.aiCloseDodgeTimer > this.aiCloseDodgeInterval && this.aiUrgency < 0.3) {
      for (const b of bullets) {
        if (!b.hostile || b.isLaser) continue;
        const dist = Math.sqrt((b.x - this.x) ** 2 + (b.y - this.y) ** 2);
        if (dist > 30 && dist < 100 && b.vx < 0) {
          // Bullet approaching from the right, good candidate
          this.aiCloseDodgeBullet = { x: b.x, y: b.y, vx: b.vx, vy: b.vy };
          this.aiCloseDodgeTimer = 0;
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Apply close-dodge movement: stay within 8px of the bullet
   */
  private applyCloseDodgeMovement(dt: number): void {
    if (!this.aiCloseDodgeBullet) return;

    // Predict where the bullet will be and position alongside it
    const predictFrames = 10;
    const targetX = this.aiCloseDodgeBullet.x + this.aiCloseDodgeBullet.vx * predictFrames;
    const targetY = this.aiCloseDodgeBullet.y + this.aiCloseDodgeBullet.vy * predictFrames;

    // Offset to stay 8px away (safe but exciting)
    const dodgeOffset = 8;
    const finalY = targetY + (this.y < targetY ? dodgeOffset : -dodgeOffset);

    this.moveToTarget(dt, targetX - this.pw / 2, finalY, this.aiEvasionSpeed * 1.3);
  }

  /**
   * Move toward a target position with smooth acceleration
   */
  private moveToTarget(dt: number, targetX: number, targetY: number, speed: number): void {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 2) {
      const accel = Math.min(speed, dist * 0.1) / dist;
      this.vx += dx * accel * dt * CONFIG.FPS;
      this.vy += dy * accel * dt * CONFIG.FPS;
    }
  }

  /**
   * 3.9 Pattern-based movement variety
   */
  private applyPatternMovement(dt: number, enemies: Enemy[], boss: Boss | null): void {
    const t = this.aiPatternTimer / this.aiPatternChangeInterval; // 0-1 within pattern

    switch (this.aiMovementPattern) {
      case 0: // Cruise - smooth hovering
        this.aiTargetX = CONFIG.PLAYER_X + Math.sin(t * Math.PI * 2) * 20;
        this.aiTargetY = CONFIG.PLAYER_Y_CENTER + Math.cos(t * Math.PI * 1.5) * 15;
        break;
      case 1: // Zigzag - rapid directional changes
        this.aiTargetX = CONFIG.PLAYER_X + Math.sign(Math.sin(t * Math.PI * 6)) * 30;
        this.aiTargetY = CONFIG.PLAYER_Y_CENTER + Math.sign(Math.cos(t * Math.PI * 4)) * 25;
        break;
      case 2: // Orbit - circular movement
        this.aiTargetX = CONFIG.PLAYER_X + Math.cos(t * Math.PI * 2) * 25;
        this.aiTargetY = CONFIG.PLAYER_Y_CENTER + Math.sin(t * Math.PI * 2) * 30;
        break;
      case 3: // Burst - quick position changes
        if (t < 0.3) {
          this.aiTargetX = CONFIG.PLAYER_X - 20;
          this.aiTargetY = CONFIG.PLAYER_Y_CENTER - 30;
        } else if (t < 0.6) {
          this.aiTargetX = CONFIG.PLAYER_X + 30;
          this.aiTargetY = CONFIG.PLAYER_Y_CENTER + 20;
        } else {
          this.aiTargetX = CONFIG.PLAYER_X;
          this.aiTargetY = CONFIG.PLAYER_Y_CENTER;
        }
        break;
    }

    // Boss-specific positioning override
    if (boss) {
      this.aiTargetY = boss.patternY ? boss.patternY : CONFIG.PLAYER_Y_CENTER;
    }

    this.moveToTarget(dt, this.aiTargetX, this.aiTargetY, this.aiTargetSpeed);
  }

  /**
   * 3.8 Strategic weapon switching
   */
  private updateWeaponStrategy(dt: number, enemies: Enemy[], boss: Boss | null): void {
    this.aiWeaponTimer += dt;
    if (this.aiWeaponTimer < 2) return;
    this.aiWeaponTimer = 0;

    // Determine optimal weapon
    if (boss) {
      // Lightning for bosses (penetrating)
      this.aiPreferredWeapon = WeaponType.LIGHTNING;
    } else if (enemies.length > 5) {
      // Spread for dense formations
      this.aiPreferredWeapon = WeaponType.SPREAD;
    } else if (enemies.some(e => e.behavior === 8)) {
      // Homing for swarm/spread targets
      this.aiPreferredWeapon = WeaponType.HOMING;
    } else {
      // Plasma for general use
      this.aiPreferredWeapon = WeaponType.PLASMA;
    }

    // Switch with probability based on difference
    if (this.weapon !== this.aiPreferredWeapon) {
      if (this.ai.chance(boss ? 0.6 : 0.35)) {
        this.weapon = this.aiPreferredWeapon;
      }
    }
  }

  /**
   * Fire the current weapon
   */
  private fireWeapon(): Bullet[] {
    const bullets: Bullet[] = [];
    const cx = this.x + this.pw;
    const cy = this.y + this.ph / 2;

    switch (this.weapon) {
      case WeaponType.PLASMA:
        bullets.push(new Bullet(cx, cy, 8, 0, false, 'plasma', this.weaponLevel));
        if (this.weaponLevel >= 3) {
          bullets.push(new Bullet(cx, cy - 6, 8, -0.5, false, 'plasma', this.weaponLevel));
          bullets.push(new Bullet(cx, cy + 6, 8, 0.5, false, 'plasma', this.weaponLevel));
        }
        break;
      case WeaponType.HOMING:
        bullets.push(new Bullet(cx, cy, 6, 0, false, 'homing', this.weaponLevel));
        if (this.weaponLevel >= 2) {
          bullets.push(new Bullet(cx, cy - 4, 6, -0.8, false, 'homing', this.weaponLevel));
          bullets.push(new Bullet(cx, cy + 4, 6, 0.8, false, 'homing', this.weaponLevel));
        }
        break;
      case WeaponType.SPREAD:
        for (let i = -2; i <= 2; i++) {
          bullets.push(new Bullet(cx, cy, 7, i * 0.6, false, 'spread', this.weaponLevel));
        }
        break;
      case WeaponType.LIGHTNING:
        bullets.push(new Bullet(cx, cy, 10, 0, false, 'lightning', this.weaponLevel));
        break;
    }

    return bullets;
  }

  /**
   * Collect a power-up
   */
  collectPickup(type: string): void {
    switch (type) {
      case 'weapon':
        this.weaponLevel = Math.min(this.maxWeaponLevel, this.weaponLevel + 1);
        break;
      case 'shield':
        this.shield = this.maxShield;
        break;
      case 'speed':
        this.speedLevel = Math.min(3, this.speedLevel + 1);
        this.speed = 3 + this.speedLevel;
        break;
      case 'power':
        this.weapon = this.ai.pick([WeaponType.PLASMA, WeaponType.HOMING, WeaponType.SPREAD, WeaponType.LIGHTNING]);
        this.weaponLevel = Math.min(this.maxWeaponLevel, this.weaponLevel + 1);
        break;
    }
  }

  /**
   * Take damage
   */
  takeDamage(): boolean {
    if (this.invincible > 0) return false;
    if (this.shield > 0) {
      this.shield = 0;
      this.invincible = 1;
      return false;
    }
    this.invincible = 2;
    return true;
  }

  /**
   * Render the player ship
   */
  render(renderer: Renderer): void {
    // Skip rendering if invincible and blinking
    if (this.invincible > 0 && Math.floor(this.invincible * 10) % 2 === 0) return;

    const x = Math.floor(this.x);
    const y = Math.floor(this.y);

    // Update sprite animation
    this.sprite.update(1 / CONFIG.FPS);

    // Draw sprite sheet
    const imageData = this.sprite.getImageData(this.palette);
    renderer.drawSpriteData(x, y, imageData);

    // Shield overlay
    if (this.shield > 0) {
      this.renderShield(renderer, x, y);
    }
  }

  /**
   * Render shield bubble
   */
  private renderShield(r: Renderer, x: number, y: number): void {
    const alpha = this.shield / this.maxShield;
    const pulse = Math.sin(this.animTimer * 10) * 0.1 + 0.3;

    r.ctx.globalAlpha = pulse * alpha;
    // Shield outline
    for (let a = 0; a < Math.PI * 2; a += 0.3) {
      const sx = x + this.pw / 2 + Math.cos(a) * 12;
      const sy = y + this.ph / 2 + Math.sin(a) * 10;
      r.rect(Math.floor(sx), Math.floor(sy), 2, 2, PALETTE.cyan);
    }
    r.ctx.globalAlpha = 1;
  }

  /**
   * Reset player state
   */
  reset(): void {
    this.x = CONFIG.PLAYER_X;
    this.y = CONFIG.PLAYER_Y_CENTER;
    this.vx = 0;
    this.vy = 0;
    this.speed = 3;
    this.speedLevel = 0;
    this.shield = 0;
    this.weapon = WeaponType.PLASMA;
    this.weaponLevel = 1;
    this.invincible = 2;
    this.ai = new SeededRandom(42);
    this.aiTimer = 0;
    this.aiWeaponTimer = 0;
  }
}
