/**
 * Player ship: physics, rendering, and AI-controlled gameplay
 */
import { CONFIG } from '../core/Config';
import { Renderer, PALETTE } from '../core/Renderer';
import { SeededRandom } from '../utils/SeededRandom';
import { clamp, lerp } from '../utils/Math';
import { Bullet } from './Bullet';
import { Enemy } from './Enemy';
import { Boss } from './Boss';
import { Pickup } from './Pickup';

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

  // Animation
  private animFrame: number = 0;
  private animTimer: number = 0;

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
   */
  private updateAI(dt: number, enemyBullets: Bullet[], enemies: Enemy[], boss: Boss | null, pickups: Pickup[]): void {
    this.aiTimer += dt;

    // Dodge enemy bullets
    const threatBullets = enemyBullets.filter(b =>
      b.hostile &&
      b.vx > 0 &&
      b.x < this.x + 80 &&
      b.x > this.x - 20 &&
      Math.abs(b.y - this.y) < 60
    );

    if (threatBullets.length > 0) {
      // Find the most threatening bullet
      const nearest = threatBullets.reduce((a, b) =>
        (a.x > this.x ? a : b)
      );
      // Dodge away from the bullet
      if (nearest && nearest.y < this.y - 10) {
        this.vy += 2 * dt * CONFIG.FPS;
      } else if (nearest && nearest.y > this.y + 10) {
        this.vy -= 2 * dt * CONFIG.FPS;
      }
      // Horizontal dodge
      this.aiDodgeDirection = this.ai.chance(0.5) ? 1 : -1;
      this.vx += this.aiDodgeDirection * 1.5 * dt * CONFIG.FPS;
    } else {
      // Strategic positioning
      if (this.aiTimer > 0.3) {
        this.aiTimer = 0;
        // Move toward optimal position based on enemy patterns
        if (boss) {
          // Position for boss fights
          this.aiTargetY = boss.patternY ? boss.patternY : CONFIG.PLAYER_Y_CENTER;
          this.aiTargetX = CONFIG.PLAYER_X + this.ai.range(-10, 20);
        } else {
          // General positioning
          this.aiTargetX = CONFIG.PLAYER_X + this.ai.range(-15, 30);
          this.aiTargetY = CONFIG.PLAYER_Y_CENTER + this.ai.range(-40, 40);
        }
      }

      // Move toward target
      const dx = this.aiTargetX - this.x;
      const dy = this.aiTargetY - this.y;
      if (Math.abs(dx) > 2) this.vx += Math.sign(dx) * 1.5 * dt * CONFIG.FPS;
      if (Math.abs(dy) > 2) this.vy += Math.sign(dy) * 1.5 * dt * CONFIG.FPS;
    }

    // Collect pickups
    for (const pickup of pickups) {
      if (!pickup.collected && Math.abs(pickup.x - this.x) < 40 && Math.abs(pickup.y - this.y) < 30) {
        // Move toward pickup
        const dx = pickup.x - this.x;
        const dy = pickup.y - this.y;
        this.vx += Math.sign(dx) * 2 * dt * CONFIG.FPS;
        this.vy += Math.sign(dy) * 2 * dt * CONFIG.FPS;
      }
    }

    // Weapon switching
    this.aiWeaponTimer += dt;
    if (this.aiWeaponTimer > 3) {
      this.aiWeaponTimer = 0;
      // Switch weapons based on situation
      if (boss && boss.phase > 1) {
        this.aiPreferredWeapon = WeaponType.LIGHTNING; // Penetrating for bosses
      } else if (enemies.length > 5) {
        this.aiPreferredWeapon = WeaponType.SPREAD; // Wide coverage
      } else {
        this.aiPreferredWeapon = this.ai.pick([WeaponType.PLASMA, WeaponType.HOMING, WeaponType.SPREAD]);
      }
      if (this.ai.chance(0.4)) {
        this.weapon = this.aiPreferredWeapon;
      }
    }

    // Speed management
    if (boss && this.speedLevel < 2) {
      this.speedLevel = 2; // Higher speed for boss fights
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

    // Ship body
    this.renderShip(renderer, x, y);

    // Engine exhaust
    this.renderEngine(renderer, x, y);

    // Shield
    if (this.shield > 0) {
      this.renderShield(renderer, x, y);
    }
  }

  /**
   * Render the player ship sprite
   */
  private renderShip(r: Renderer, x: number, y: number): void {
    // Main body
    r.rect(x + 4, y + 2, 12, 8, PALETTE.lightBlue);
    r.rect(x + 2, y + 4, 16, 4, PALETTE.blue);
    // Nose
    r.rect(x + 12, y + 4, 4, 4, PALETTE.cyan);
    r.rect(x + 14, y + 5, 2, 2, PALETTE.white);
    // Wings
    r.rect(x + 6, y, 6, 2, PALETTE.darkBlue);
    r.rect(x + 6, y + 10, 6, 2, PALETTE.darkBlue);
    // Wing tips
    r.rect(x + 8, y - 1, 2, 1, PALETTE.cyan);
    r.rect(x + 8, y + 12, 2, 1, PALETTE.cyan);
    // Cockpit
    r.rect(x + 10, y + 5, 3, 2, PALETTE.lightYellow);
    // Detail
    r.rect(x + 4, y + 5, 2, 2, PALETTE.offWhite);
  }

  /**
   * Render engine exhaust
   */
  private renderEngine(r: Renderer, x: number, y: number): void {
    const flicker = this.engineFlicker;
    const length = 4 + flicker * 2;

    // Main exhaust
    r.rect(x + 2, y + 4, length, 4, PALETTE.orange);
    r.rect(x + 3, y + 5, length - 1, 2, PALETTE.yellow);
    r.rect(x + 4, y + 6, length - 2, 1, PALETTE.lightYellow);

    // Exhaust particles
    if (flicker < 2) {
      r.rect(x - 2, y + 5, 2, 2, PALETTE.orange);
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
