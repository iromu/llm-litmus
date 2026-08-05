/**
 * Pickup system: weapon upgrades, shields, speed boosts
 */
import { CONFIG } from '../core/Config';
import { Renderer } from '../core/Renderer';
import { AnimatedSprite } from '../core/AnimatedSprite';
import { Camera } from './Camera';
import {
  createWeaponPickup, createShieldPickup, createSpeedPickup, createPowerPickup,
  SPRITE_PALETTE,
} from '../data/sprites';

/**
 * Pickup types
 */
export enum PickupType {
  WEAPON = 'weapon',
  SHIELD = 'shield',
  SPEED = 'speed',
  POWER = 'power',
}

/**
 * Pickup entity
 */
export class Pickup {
  x: number;
  y: number;
  worldX: number;
  type: string;
  collected: boolean;
  animFrame: number;
  private sprite: AnimatedSprite;
  private static palette: [number, number, number][] | null = null;

  /** Get or build the shared palette */
  private static getPalette(): [number, number, number][] {
    if (!Pickup.palette) {
      Pickup.palette = SPRITE_PALETTE.map((hex) => {
        const n = parseInt(hex.replace('#', ''), 16);
        return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff] as [number, number, number];
      });
      Pickup.palette[0] = [0, 0, 0];
      while (Pickup.palette.length < 256) Pickup.palette.push([0, 0, 0]);
    }
    return Pickup.palette;
  }

  constructor(worldX: number, y: number, type: string) {
    this.worldX = worldX;
    this.x = worldX;
    this.y = y;
    this.type = type;
    this.collected = false;
    this.animFrame = 0;

    // Create sprite based on type
    switch (type) {
      case 'weapon': this.sprite = new AnimatedSprite(createWeaponPickup()); break;
      case 'shield': this.sprite = new AnimatedSprite(createShieldPickup()); break;
      case 'speed': this.sprite = new AnimatedSprite(createSpeedPickup()); break;
      case 'power': this.sprite = new AnimatedSprite(createPowerPickup()); break;
      default: this.sprite = new AnimatedSprite(createWeaponPickup()); break;
    }
  }

  update(dt: number, camera: Camera): void {
    this.x = this.worldX - camera.scrollX;
    this.animFrame = (this.animFrame + 1) % 60;
  }

  render(renderer: Renderer): void {
    if (this.collected) return;

    const x = Math.floor(this.x);
    const y = Math.floor(this.y + Math.sin(this.animFrame * 0.1) * 3);

    // Update sprite animation
    this.sprite.update(1 / CONFIG.FPS);

    // Draw sprite sheet
    const imageData = this.sprite.getImageData(Pickup.getPalette());
    renderer.drawSpriteData(x, y, imageData);
  }
}
