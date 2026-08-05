/**
 * Sprite sheet: compact typed-array pixel data with palette lookup.
 *
 * Pixel data is stored as Uint8Array of palette indices (0-255).
 * Frame 0 starts at offset 0, frame N at offset N * (width * height).
 * A palette index of 0 means transparent.
 */

export interface SpriteSheetMeta {
  /** Sprite width in pixels */
  width: number;
  /** Sprite height in pixels */
  height: number;
  /** Number of animation frames */
  frames: number;
  /** Frames per second for animation (0 = static) */
  fps: number;
}

/**
 * A sprite sheet holding pixel index data and a palette.
 */
export class SpriteSheet {
  /** Flat array: [frame0_row0_col0, ..., frame0_row0_colW, ..., frame1_...] */
  public readonly pixels: Uint8Array;
  public readonly meta: SpriteSheetMeta;

  constructor(pixels: Uint8Array, meta: SpriteSheetMeta) {
    this.pixels = pixels;
    this.meta = meta;
  }

  /** Total bytes needed for one frame */
  get frameBytes(): number {
    return this.meta.width * this.meta.height;
  }

  /** Total frames stored (may differ from meta.frames if data is padded) */
  get storedFrames(): number {
    return Math.floor(this.pixels.length / this.frameBytes);
  }

  /**
   * Get frame pixel data as a slice (palette indices, 0 = transparent).
   */
  getFramePixels(frame: number): Uint8Array {
    const start = frame * this.frameBytes;
    return this.pixels.subarray(start, start + this.frameBytes);
  }

  /**
   * Get frame as ImageData ready for putImageData.
   * @param palette 256-entry array of [r, g, b] tuples (index 0 unused/transparent)
   */
  getFrameImageData(frame: number, palette: [number, number, number][]): ImageData {
    const idx = this.getFramePixels(frame);
    const out = new Uint8ClampedArray(this.frameBytes * 4);

    for (let i = 0; i < idx.length; i++) {
      const oi = i * 4;
      const pi = idx[i];
      if (pi === 0) {
        // transparent
        out[oi] = 0;
        out[oi + 1] = 0;
        out[oi + 2] = 0;
        out[oi + 3] = 0;
      } else {
        const c = palette[pi] || [0, 0, 0];
        out[oi] = c[0];
        out[oi + 1] = c[1];
        out[oi + 2] = c[2];
        out[oi + 3] = 255;
      }
    }

    return new ImageData(out, this.meta.width, this.meta.height);
  }
}

/**
 * Build a palette: array of [r, g, b] for indices 0-255.
 * Index 0 is transparent (never used for rendering).
 */
export function buildPalette(hexColors: string[]): [number, number, number][] {
  const palette: [number, number, number][] = [[0, 0, 0]]; // index 0 = transparent
  for (const hex of hexColors) {
    const n = parseInt(hex.replace('#', ''), 16);
    palette.push([
      (n >> 16) & 0xff,
      (n >> 8) & 0xff,
      n & 0xff,
    ]);
  }
  // Pad to 256
  while (palette.length < 256) palette.push([0, 0, 0]);
  return palette;
}
