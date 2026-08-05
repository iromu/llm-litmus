import { SpriteSheet } from './SpriteSheet';

/**
 * Configuration for an animated sprite instance.
 */
export interface AnimatedSpriteConfig {
  /** Horizontal flip (mirror) */
  flipX?: boolean;
  /** Vertical flip */
  flipY?: boolean;
  /** Rotation in degrees (0, 90, 180, 270) */
  rotation?: number;
  /** Override animation speed multiplier (1.0 = normal) */
  speedMultiplier?: number;
  /** Force a specific frame (negative = animate normally) */
  forcedFrame?: number;
}

/**
 * An animated sprite that wraps a SpriteSheet and handles frame cycling,
 * flipping, rotation, and speed control.
 */
export class AnimatedSprite {
  private _frame: number = 0;
  private _elapsed: number = 0;

  constructor(
    public sheet: SpriteSheet,
    public config: AnimatedSpriteConfig = {}
  ) {}

  /** Current frame index */
  get frame(): number {
    const ff = this.config.forcedFrame;
    if (ff !== undefined && ff >= 0) return ff;
    return this._frame;
  }

  /** Total frames available */
  get totalFrames(): number {
    return this.sheet.meta.frames;
  }

  /** Animation FPS from the sheet */
  get fps(): number {
    return this.sheet.meta.fps;
  }

  /**
   * Update animation state.
   * @param dt Delta time in seconds
   */
  update(dt: number): void {
    const ff = this.config.forcedFrame;
    if (ff !== undefined && ff >= 0) return;
    if (this.sheet.meta.fps <= 0) return; // static sprite

    const speed = this.config.speedMultiplier ?? 1;
    const frameDuration = 1.0 / (this.sheet.meta.fps * speed);

    this._elapsed += dt;
    if (this._elapsed >= frameDuration) {
      this._elapsed -= frameDuration;
      this._frame = (this._frame + 1) % this.sheet.meta.frames;
    }
  }

  /** Reset animation to frame 0 */
  reset(): void {
    this._frame = 0;
    this._elapsed = 0;
  }

  /** Set a specific frame */
  setFrame(frame: number): void {
    this._frame = frame % this.sheet.meta.frames;
    this._elapsed = 0;
  }

  /**
   * Get the current frame as ImageData with palette lookup.
   * Applies flip/rotation if configured.
   */
  getImageData(palette: [number, number, number][]): ImageData {
    const frame = this.frame;
    const { width, height } = this.sheet.meta;

    // No transform needed
    if (!this.config.flipX && !this.config.flipY && !this.config.rotation) {
      return this.sheet.getFrameImageData(frame, palette);
    }

    // Get source pixels
    const srcPixels = this.sheet.getFramePixels(frame);
    const src = new Uint8ClampedArray(width * height * 4);

    // Convert palette indices to RGBA
    for (let i = 0; i < srcPixels.length; i++) {
      const oi = i * 4;
      const pi = srcPixels[i];
      if (pi === 0) {
        src[oi] = src[oi + 1] = src[oi + 2] = src[oi + 3] = 0;
      } else {
        const c = palette[pi] || [0, 0, 0];
        src[oi] = c[0];
        src[oi + 1] = c[1];
        src[oi + 2] = c[2];
        src[oi + 3] = 255;
      }
    }

    // Handle rotation (swap dimensions)
    const rot = this.config.rotation ?? 0;
    let outW = width;
    let outH = height;
    if (rot === 90 || rot === 270) {
      outW = height;
      outH = width;
    }

    const out = new Uint8ClampedArray(outW * outH * 4);

    for (let sy = 0; sy < height; sy++) {
      for (let sx = 0; sx < width; sx++) {
        const si = (sy * width + sx) * 4;

        // Apply flip to source coordinates
        let fx = sx;
        let fy = sy;
        if (this.config.flipX) fx = width - 1 - sx;
        if (this.config.flipY) fy = height - 1 - sy;
        const fi = (fy * width + fx) * 4;

        // Apply rotation to destination coordinates
        let dx: number, dy: number;
        switch (rot) {
          case 90:
            dx = height - 1 - sy;
            dy = sx;
            break;
          case 180:
            dx = width - 1 - sx;
            dy = height - 1 - sy;
            break;
          case 270:
            dx = sy;
            dy = height - 1 - sx;
            break;
          default:
            dx = sx;
            dy = sy;
        }

        const di = (dy * outW + dx) * 4;
        out[di] = src[fi];
        out[di + 1] = src[fi + 1];
        out[di + 2] = src[fi + 2];
        out[di + 3] = src[fi + 3];
      }
    }

    return new ImageData(out, outW, outH);
  }
}
