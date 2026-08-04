/**
 * Canvas2D renderer for pixel-perfect 16-bit rendering
 * Handles sprite drawing, palette management, and visual effects
 */
import { CONFIG } from './Config';

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

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
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
}
