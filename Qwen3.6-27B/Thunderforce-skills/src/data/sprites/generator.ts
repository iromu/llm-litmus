/**
 * Procedural sprite generator: creates pixel art sprite data as typed arrays.
 *
 * Generates compact Uint8Array sprite sheets with palette indices.
 * Index 0 = transparent. Indices 1+ = palette colors.
 *
 * This is the POC approach: instead of calling an image API, we generate
 * pixel art programmatically using pattern primitives (lines, curves, blocks).
 * The output integrates directly with SpriteSheet + AnimatedSprite.
 */
import { SpriteSheet, SpriteSheetMeta } from '../../core/SpriteSheet';

/** Palette index constants (shared across all sprites) */
export const PI = {
  transparent: 0,
  // Blues (player ship)
  blueDark: 1,
  blue: 2,
  blueLight: 3,
  cyan: 4,
  // Yellows (highlights)
  yellow: 5,
  yellowLight: 6,
  white: 7,
  // Reds (enemies, explosions)
  red: 8,
  redDark: 9,
  redLight: 10,
  // Oranges (fire, explosions)
  orange: 11,
  orangeLight: 12,
  // Greens (organic)
  green: 13,
  greenDark: 14,
  greenLight: 15,
  // Grays (metal, mechanical)
  grayDark: 16,
  gray: 17,
  grayLight: 18,
  // Purples (magic, alien)
  purple: 19,
  purpleDark: 20,
  // Browns (terrain)
  brown: 21,
  brownDark: 22,
  // Flesh tones (organic boss)
  flesh: 23,
  fleshDark: 24,
  // Magenta (effects)
  magenta: 25,
  // Black (outlines)
  black: 26,
} as const;

/**
 * Standard 26-color palette for all sprites.
 * Index 0 is transparent; indices match PI constants.
 */
export const SPRITE_PALETTE: string[] = [
  '#000000', // 0: transparent (never rendered)
  '#000088', // 1: blueDark
  '#0044ff', // 2: blue
  '#00aaff', // 3: blueLight
  '#00ffff', // 4: cyan
  '#ffff00', // 5: yellow
  '#ffff88', // 6: yellowLight
  '#ffffff', // 7: white
  '#ff0000', // 8: red
  '#880000', // 9: redDark
  '#ff4444', // 10: redLight
  '#ff8800', // 11: orange
  '#ffcc00', // 12: orangeLight
  '#00ff00', // 13: green
  '#008800', // 14: greenDark
  '#88ff00', // 15: greenLight
  '#444444', // 16: grayDark
  '#888888', // 17: gray
  '#bbbbbb', // 18: grayLight
  '#8800ff', // 19: purple
  '#440088', // 20: purpleDark
  '#884400', // 21: brown
  '#442200', // 22: brownDark
  '#cc6666', // 23: flesh
  '#883333', // 24: fleshDark
  '#ff00ff', // 25: magenta
  '#111111', // 26: black
];

/**
 * Create a blank sprite buffer (all transparent).
 */
export function blankSprite(w: number, h: number): Uint8Array {
  return new Uint8Array(w * h);
}

/**
 * Set a pixel in a sprite buffer.
 */
export function setPixel(buf: Uint8Array, x: number, y: number, w: number, color: number): void {
  if (x >= 0 && x < w && y >= 0 && y < buf.length / w) {
    buf[y * w + x] = color;
  }
}

/**
 * Draw a horizontal line.
 */
export function hLine(buf: Uint8Array, x: number, y: number, w: number, len: number, color: number): void {
  for (let i = 0; i < len; i++) setPixel(buf, x + i, y, w, color);
}

/**
 * Draw a filled rectangle.
 */
export function fillRect(buf: Uint8Array, x: number, y: number, w: number, rw: number, rh: number, color: number): void {
  for (let dy = 0; dy < rh; dy++) {
    for (let dx = 0; dx < rw; dx++) {
      setPixel(buf, x + dx, y + dy, w, color);
    }
  }
}

/**
 * Draw a diagonal line (simple Bresenham).
 */
export function diagLine(buf: Uint8Array, x0: number, y0: number, x1: number, y1: number, w: number, h: number, color: number): void {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0, y = y0;

  while (true) {
    setPixel(buf, x, y, w, color);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
    if (x < 0 || x >= w || y < 0 || y >= h) break;
  }
}

/**
 * Build a SpriteSheet from frames of pixel data.
 */
export function buildSheet(frames: Uint8Array[], w: number, h: number, fps: number): SpriteSheet {
  const totalBytes = frames.length * w * h;
  const pixels = new Uint8Array(totalBytes);
  for (let i = 0; i < frames.length; i++) {
    pixels.set(frames[i], i * w * h);
  }
  const meta: SpriteSheetMeta = { width: w, height: h, frames: frames.length, fps };
  return new SpriteSheet(pixels, meta);
}

/**
 * Copy a frame with horizontal flip.
 */
export function flipX(frame: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      out[y * w + x] = frame[y * w + (w - 1 - x)];
    }
  }
  return out;
}

/**
 * Copy a frame with vertical flip.
 */
export function flipY(frame: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      out[y * w + x] = frame[(h - 1 - y) * w + x];
    }
  }
  return out;
}
