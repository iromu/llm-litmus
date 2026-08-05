/**
 * Canvas2D renderer for pixel-perfect 16-bit rendering
 * Handles sprite drawing, palette management, palette cycling, and visual effects
 */
import { CONFIG } from './Config';

/**
 * Palette cycling rule: shift a color index through hue/saturation/brightness over time.
 */
export interface PaletteCycleRule {
  /** Palette index to cycle (1-255, 0 = transparent) */
  index: number;
  /** Base color as [r, g, b] */
  base: [number, number, number];
  /** Frames per full cycle (60 = 1 second) */
  speed: number;
  /** Hue shift range in degrees (-180 to 180) */
  hueRange: number;
  /** Saturation boost 0-1 */
  satBoost: number;
  /** Brightness offset -255 to 255 */
  brightOffset: number;
}

/**
 * Color palette entries for 16-bit style rendering
 */
export const PALETTE = {
  // Background colors
  black: '#000000',
  deepSpace: '#0a0a1a',
  darkBlue: '#000044',
  blue: '#0000aa',
  lightBlue: '#0088ff',
  cyan: '#00ffff',

  // Foreground colors
  white: '#ffffff',
  offWhite: '#cccccc',
  gray: '#888888',
  darkGray: '#444444',

  // Warm colors
  red: '#ff0000',
  darkRed: '#880000',
  orange: '#ff8800',
  yellow: '#ffff00',
  lightYellow: '#ffff88',

  // Earth tones
  green: '#00ff00',
  darkGreen: '#008800',
  brown: '#884400',
  darkBrown: '#442200',

  // Special effects
  magenta: '#ff00ff',
  pink: '#ff88cc',
  purple: '#8800ff',
  neonGreen: '#88ff00',

  // Volcanic biome
  lava: '#ff4400',
  lavaGlow: '#ff8800',
  rock: '#664433',
  rockDark: '#332211',

  // City biome
  steel: '#8899aa',
  steelDark: '#445566',
  neon: '#00ffcc',

  // Asteroid biome
  asteroid: '#776655',
  asteroidDark: '#443322',

  // Organic biome
  organic: '#44aa44',
  organicDark: '#226622',
  flesh: '#aa4444',
  fleshDark: '#662222',
};

/**
 * Pre-built color gradients for backgrounds
 */
export const GRADIENTS = {
  volcanic: [
    '#0a0000', '#220000', '#441100', '#662200', '#883300', '#aa4400',
  ],
  city: [
    '#000022', '#000044', '#001166', '#002288', '#0033aa', '#0044cc',
  ],
  asteroid: [
    '#000000', '#0a0a1a', '#111133', '#1a1a44', '#222255', '#2a2a66',
  ],
  organic: [
    '#001100', '#002200', '#003300', '#004400', '#005500', '#006600',
  ],
};

/**
 * Sprite drawing helper
 */
export class Sprite {
  /**
   * Draw a pixel-art sprite from a 2D array of color indices
   * @param ctx Canvas context
   * @param x Top-left X position
   * @param y Top-left Y position
   * @param data 2D array of color strings (null for transparent)
   * @param scale Pixel scale factor (default 1)
   */
  static draw(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    data: (string | null)[][],
    scale: number = 1
  ): void {
    for (let row = 0; row < data.length; row++) {
      for (let col = 0; col < data[row].length; col++) {
        const color = data[row][col];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(
            Math.floor(x + col * scale),
            Math.floor(y + row * scale),
            scale, scale
          );
        }
      }
    }
  }

  /**
   * Get sprite dimensions
   */
  static size(data: (string | null)[][], scale: number = 1): { w: number; h: number } {
    const firstRow = data[0];
    return {
      w: firstRow ? firstRow.length * scale : 0,
      h: data.length * scale,
    };
  }
}

/**
 * Main renderer class
 */
export class Renderer {
  public ctx: CanvasRenderingContext2D;

  /** Active palette cycling rules */
  private _cycleRules: PaletteCycleRule[] = [];
  /** Current palette (256-entry [r,g,b] lookup) - modified each frame by cycling */
  public palette: [number, number, number][];
  /** Base palette snapshot (restored each frame before cycling) */
  private basePalette: [number, number, number][];
  /** Internal frame counter for cycling */
  private _cycleFrame: number = 0;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    // Initialize palette: index 0 = transparent, rest = black
    this.palette = new Array(256).fill(null).map(() => [0, 0, 0]);
    this.basePalette = new Array(256).fill(null).map(() => [0, 0, 0]);
  }

  /**
   * Draw a filled rectangle
   */
  rect(x: number, y: number, w: number, h: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
  }

  /**
   * Draw a line
   */
  line(x1: number, y1: number, x2: number, y2: number, color: string, width: number = 1): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.beginPath();
    this.ctx.moveTo(Math.floor(x1), Math.floor(y1));
    this.ctx.lineTo(Math.floor(x2), Math.floor(y2));
    this.ctx.stroke();
  }

  /**
   * Draw a circle
   */
  circle(x: number, y: number, radius: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(Math.floor(x), Math.floor(y), radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /**
   * Draw a horizontal gradient bar (for HUD)
   */
  gradientBar(x: number, y: number, w: number, h: number, colors: string[]): void {
    const segW = Math.ceil(w / colors.length);
    for (let i = 0; i < colors.length; i++) {
      this.ctx.fillStyle = colors[i];
      this.ctx.fillRect(Math.floor(x + i * segW), Math.floor(y), segW + 1, h);
    }
  }

  /**
   * Draw text with pixel font approximation
   */
  text(str: string, x: number, y: number, color: string = PALETTE.white, size: number = 8): void {
    this.ctx.fillStyle = color;
    this.ctx.font = `${size}px monospace`;
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(str, Math.floor(x), Math.floor(y));
  }

  /**
   * Draw a scrolling background tile
   */
  drawTile(
    x: number, y: number, w: number, h: number,
    colors: string[], pattern: 'gradient' | 'stars' | 'grid' | 'noise' = 'gradient',
    scrollX: number = 0, scrollY: number = 0
  ): void {
    switch (pattern) {
      case 'gradient':
        this.gradientBar(x, y, w, h, colors);
        break;
      case 'stars':
        this.rect(x, y, w, h, colors[0]);
        // Draw star field
        for (let i = 0; i < 20; i++) {
          const sx = ((i * 37 + Math.floor(scrollX * 0.1)) % w + w) % w;
          const sy = ((i * 53 + Math.floor(scrollY * 0.1)) % h + h) % h;
          const brightness = (i % 3 === 0) ? colors[2] : colors[1];
          this.rect(x + sx, y + sy, 1, 1, brightness);
        }
        break;
      case 'grid':
        this.rect(x, y, w, h, colors[0]);
        this.ctx.strokeStyle = colors[1];
        this.ctx.lineWidth = 1;
        const gridSize = 16;
        for (let gx = ((scrollX % gridSize) - gridSize) % gridSize; gx < w; gx += gridSize) {
          this.ctx.beginPath();
          this.ctx.moveTo(Math.floor(x + gx), y);
          this.ctx.lineTo(Math.floor(x + gx), y + h);
          this.ctx.stroke();
        }
        for (let gy = ((scrollY % gridSize) - gridSize) % gridSize; gy < h; gy += gridSize) {
          this.ctx.beginPath();
          this.ctx.moveTo(x, Math.floor(y + gy));
          this.ctx.lineTo(x + w, Math.floor(y + gy));
          this.ctx.stroke();
        }
        break;
      case 'noise':
        this.rect(x, y, w, h, colors[0]);
        for (let i = 0; i < 50; i++) {
          const nx = ((i * 41 + Math.floor(scrollX)) % w + w) % w;
          const ny = ((i * 67 + Math.floor(scrollY)) % h + h) % h;
          this.rect(x + nx, y + ny, 1, 1, colors[i % 2 === 0 ? 1 : 2]);
        }
        break;
    }
  }

  /**
   * Draw a scanline overlay for CRT effect
   */
  scanlines(alpha: number = 0.1): void {
    this.ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    for (let y = 0; y < CONFIG.HEIGHT; y += 2) {
      this.ctx.fillRect(0, y, CONFIG.WIDTH, 1);
    }
  }

  /**
   * Draw a vignette effect
   */
  vignette(): void {
    const gradient = this.ctx.createRadialGradient(
      CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH * 0.3,
      CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH * 0.7
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.4)');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
  }

  /**
   * Draw a flashing effect (for explosions)
   */
  flash(color: string, alpha: number): void {
    this.ctx.fillStyle = color;
    this.ctx.globalAlpha = alpha;
    this.ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    this.ctx.globalAlpha = 1;
  }

  /**
   * Draw a sprite from pixel data
   */
  sprite(x: number, y: number, data: (string | null)[][], scale: number = 1): void {
    Sprite.draw(this.ctx, x, y, data, scale);
  }

  /**
   * Draw a scaled and optionally rotated sprite
   */
  spriteRotated(
    x: number, y: number,
    data: (string | null)[][],
    scale: number,
    angle: number,
    pivotX: number = 0.5,
    pivotY: number = 0.5
  ): void {
    const { w, h } = Sprite.size(data, scale);
    const px = w * pivotX;
    const py = h * pivotY;

    this.ctx.save();
    this.ctx.translate(Math.floor(x + px), Math.floor(y + py));
    this.ctx.rotate(angle);
    this.ctx.translate(-px, -py);
    Sprite.draw(this.ctx, 0, 0, data, scale);
    this.ctx.restore();
  }

  /**
   * Draw a horizontal laser beam
   */
  laser(x: number, y: number, w: number, h: number, color: string, flicker: number = 0): void {
    // Core beam
    this.rect(x, y, w, h, color);
    // Glow
    this.ctx.globalAlpha = 0.5 + flicker * 0.3;
    this.rect(x, y - 1, w, h + 2, color);
    this.ctx.globalAlpha = 1;
  }

  /**
   * Draw a particle
   */
  particle(x: number, y: number, size: number, color: string, alpha: number = 1): void {
    this.ctx.globalAlpha = alpha;
    this.rect(Math.floor(x), Math.floor(y), size, size, color);
    this.ctx.globalAlpha = 1;
  }

  // ===== Sprite Data Rendering =====

  /**
   * Draw pre-computed ImageData at a position using putImageData.
   * Much faster than per-pixel fillRect for sprite rendering.
   */
  drawSpriteData(x: number, y: number, imageData: ImageData): void {
    this.ctx.putImageData(imageData, Math.floor(x), Math.floor(y));
  }

  /**
   * Draw ImageData with palette index lookup (for sprite sheets).
   * Converts palette indices to RGBA on-the-fly and writes to canvas.
   * @param x Destination X
   * @param y Destination Y
   * @param pixels Palette index data (0 = transparent)
   * @param width Pixel width
   * @param height Pixel height
   * @param palette 256-entry [r,g,b] palette
   */
  drawIndexedSprite(
    x: number, y: number,
    pixels: Uint8Array,
    width: number, height: number,
    palette: [number, number, number][]
  ): void {
    // Convert to ImageData and draw
    const imageData = this.indexedImageData(pixels, width, height, palette);
    this.ctx.putImageData(imageData, Math.floor(x), Math.floor(y));
  }

  /**
   * Draw indexed sprite with horizontal flip.
   */
  drawIndexedSpriteFlipX(
    x: number, y: number,
    pixels: Uint8Array,
    width: number, height: number,
    palette: [number, number, number][]
  ): void {
    const flipped = new Uint8Array(width * height);
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        flipped[row * width + col] = pixels[row * width + (width - 1 - col)];
      }
    }
    const imageData = this.indexedImageData(flipped, width, height, palette);
    this.ctx.putImageData(imageData, Math.floor(x), Math.floor(y));
  }

  /**
   * Convert palette indices to ImageData (cached per call).
   */
  private indexedImageData(
    pixels: Uint8Array,
    width: number, height: number,
    palette: [number, number, number][]
  ): ImageData {
    const out = new Uint8ClampedArray(pixels.length * 4);
    for (let i = 0; i < pixels.length; i++) {
      const oi = i * 4;
      const pi = pixels[i];
      if (pi === 0) {
        out[oi] = out[oi + 1] = out[oi + 2] = out[oi + 3] = 0;
      } else {
        const c = palette[pi] || [0, 0, 0];
        out[oi] = c[0];
        out[oi + 1] = c[1];
        out[oi + 2] = c[2];
        out[oi + 3] = 255;
      }
    }
    return new ImageData(out, width, height);
  }

  // ===== Palette Cycling =====

  /**
   * Set palette colors from hex strings.
   * Index 0 remains transparent.
   * Stores a base snapshot for palette cycling to restore each frame.
   */
  setPalette(hexColors: string[]): void {
    this.palette[0] = [0, 0, 0];
    this.basePalette[0] = [0, 0, 0];
    for (let i = 0; i < hexColors.length; i++) {
      const n = parseInt(hexColors[i].replace('#', ''), 16);
      const rgb: [number, number, number] = [
        (n >> 16) & 0xff,
        (n >> 8) & 0xff,
        n & 0xff,
      ];
      this.palette[i + 1] = rgb;
      this.basePalette[i + 1] = rgb;
    }
  }

  /**
   * Get a palette color as hex string.
   */
  getPaletteColor(index: number): string {
    const [r, g, b] = this.palette[index] || [0, 0, 0];
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  /**
   * Set palette cycling rules for the current biome.
   */
  setCycleRules(rules: PaletteCycleRule[]): void {
    this._cycleRules = rules;
  }

  /**
   * Update palette cycling for the current frame.
   * Must be called once per frame before rendering.
   * Restores base palette first, then applies cycle overrides.
   */
  updatePaletteCycling(): void {
    // Restore base palette to prevent drift
    for (let i = 0; i < 256; i++) {
      this.palette[i] = this.basePalette[i];
    }

    if (this._cycleRules.length === 0) return;

    this._cycleFrame++;

    for (const rule of this._cycleRules) {
      const t = (this._cycleFrame % rule.speed) / rule.speed; // 0-1 cycle position
      const [br, bg, bb] = rule.base;

      // Convert RGB to HSL
      const hsl = rgbToHsl(br, bg, bb);
      if (hsl === null) continue;

      // Apply hue shift based on sine wave
      const hueShift = Math.sin(t * Math.PI * 2) * rule.hueRange;
      hsl[0] = ((hsl[0] + hueShift) % 360 + 360) % 360;

      // Apply saturation boost
      hsl[1] = Math.min(1, hsl[1] + rule.satBoost * Math.sin(t * Math.PI * 2));

      // Apply brightness offset
      hsl[2] = Math.max(0, Math.min(1, hsl[2] + (rule.brightOffset / 255) * Math.sin(t * Math.PI * 2)));

      // Convert back to RGB
      const rgb = hslToRgb(hsl[0], hsl[1], hsl[2]);
      this.palette[rule.index] = [rgb[0], rgb[1], rgb[2]];
    }
  }

  /**
   * Reset palette to base colors (clear cycling overrides).
   */
  resetPalette(): void {
    this._cycleRules = [];
    this._cycleFrame = 0;
    this.palette = new Array(256).fill(null).map(() => [0, 0, 0]);
    this.basePalette = new Array(256).fill(null).map(() => [0, 0, 0]);
  }
}

// ===== HSL color utilities =====

function rgbToHsl(r: number, g: number, b: number): [number, number, number] | null {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return [0, 0, l]; // achromatic
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;

  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return [h * 360, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;

  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, h) * 255);
  const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);

  return [r, g, b];
}
