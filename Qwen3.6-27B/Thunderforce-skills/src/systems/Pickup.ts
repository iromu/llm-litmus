/**
 * Pickup system: weapon upgrades, shields, speed boosts
 */
import { CONFIG } from '../core/Config';
import { Renderer, PALETTE } from '../core/Renderer';
import { Camera } from './Camera';

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

  constructor(worldX: number, y: number, type: string) {
    this.worldX = worldX;
    this.x = worldX;
    this.y = y;
    this.type = type;
    this.collected = false;
    this.animFrame = 0;
  }

  update(dt: number, camera: Camera): void {
    this.x = this.worldX - camera.scrollX;
    this.animFrame = (this.animFrame + 1) % 60;
  }

  render(renderer: Renderer): void {
    if (this.collected) return;

    const x = Math.floor(this.x);
    const y = Math.floor(this.y + Math.sin(this.animFrame * 0.1) * 3);

    switch (this.type) {
      case 'weapon':
        this.renderWeapon(renderer, x, y);
        break;
      case 'shield':
        this.renderShield(renderer, x, y);
        break;
      case 'speed':
        this.renderSpeed(renderer, x, y);
        break;
      case 'power':
        this.renderPower(renderer, x, y);
        break;
    }
  }

  private renderWeapon(r: Renderer, x: number, y: number): void {
    // W icon
    r.rect(x, y, 8, 2, PALETTE.cyan);
    r.rect(x, y + 2, 2, 4, PALETTE.cyan);
    r.rect(x + 6, y + 2, 2, 4, PALETTE.cyan);
    r.rect(x + 3, y + 3, 2, 3, PALETTE.cyan);
    r.rect(x + 1, y + 1, 6, 1, PALETTE.white);
  }

  private renderShield(r: Renderer, x: number, y: number): void {
    // Shield bubble
    r.rect(x + 1, y, 6, 2, PALETTE.lightBlue);
    r.rect(x, y + 2, 8, 4, PALETTE.lightBlue);
    r.rect(x + 1, y + 6, 6, 2, PALETTE.lightBlue);
    r.rect(x + 2, y + 1, 4, 1, PALETTE.white);
    r.rect(x + 3, y + 3, 2, 2, PALETTE.white);
  }

  private renderSpeed(r: Renderer, x: number, y: number): void {
    // S icon
    r.rect(x, y, 8, 2, PALETTE.yellow);
    r.rect(x, y + 2, 2, 2, PALETTE.yellow);
    r.rect(x + 6, y + 4, 2, 2, PALETTE.yellow);
    r.rect(x, y + 6, 8, 2, PALETTE.yellow);
    r.rect(x + 2, y + 1, 4, 1, PALETTE.white);
  }

  private renderPower(r: Renderer, x: number, y: number): void {
    // P icon
    r.rect(x, y, 2, 8, PALETTE.orange);
    r.rect(x + 2, y, 6, 4, PALETTE.orange);
    r.rect(x + 2, y + 1, 4, 2, PALETTE.white);
  }
}
