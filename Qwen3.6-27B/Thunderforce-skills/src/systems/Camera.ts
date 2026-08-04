/**
 * Camera system: scrolling, viewport management, and screen effects
 */
import { CONFIG } from '../core/Config';

export class Camera {
  private _x: number = 0;
  private _y: number = 0;
  private _scrollSpeed: number = CONFIG.SCROLL_SPEED;
  private _targetScrollSpeed: number = CONFIG.SCROLL_SPEED;
  private shakeAmount: number = 0;
  private shakeDuration: number = 0;
  private shakeTimer: number = 0;
  private offsetX: number = 0;
  private offsetY: number = 0;

  get x(): number { return this._x + this.offsetX; }
  get y(): number { return this._y + this.offsetY; }
  get scrollX(): number { return this._x; }
  get scrollY(): number { return this._y; }
  get scrollSpeed(): number { return this._scrollSpeed; }

  set scrollSpeed(val: number) {
    this._targetScrollSpeed = val;
  }

  /**
   * Update camera position with smooth scrolling
   */
  update(dt: number): void {
    // Smooth scroll speed transitions
    const speedLerp = 0.05 * dt * CONFIG.FPS;
    this._scrollSpeed += (this._targetScrollSpeed - this._scrollSpeed) * speedLerp;

    this._x += this._scrollSpeed * dt * CONFIG.FPS;

    // Screen shake
    if (this.shakeDuration > 0) {
      this.shakeTimer += dt;
      this.shakeDuration -= dt;
      const intensity = this.shakeAmount * (this.shakeDuration > 0 ? 1 : 0);
      this.offsetX = (Math.random() - 0.5) * intensity * 2;
      this.offsetY = (Math.random() - 0.5) * intensity * 2;
    } else {
      this.offsetX *= 0.8;
      this.offsetY *= 0.8;
      if (Math.abs(this.offsetX) < 0.1) this.offsetX = 0;
      if (Math.abs(this.offsetY) < 0.1) this.offsetY = 0;
    }
  }

  /**
   * Trigger screen shake
   */
  shake(amount: number, duration: number): void {
    this.shakeAmount = amount;
    this.shakeDuration = duration;
    this.shakeTimer = 0;
  }

  /**
   * Reset camera
   */
  reset(): void {
    this._x = 0;
    this._y = 0;
    this._scrollSpeed = CONFIG.SCROLL_SPEED;
    this._targetScrollSpeed = CONFIG.SCROLL_SPEED;
    this.shakeAmount = 0;
    this.shakeDuration = 0;
    this.offsetX = 0;
    this.offsetY = 0;
  }

  /**
   * Get world-to-screen X conversion
   */
  worldToScreenX(worldX: number): number {
    return worldX - this.x;
  }
}
