/**
 * Player ship sprite sheets: 4 animation frames, 16×12 pixels.
 * Blue fighter jet with animated engine exhaust and wing details.
 */
import { SpriteSheet } from '../../core/SpriteSheet';
import { PI, blankSprite, hLine, diagLine, buildSheet } from './generator';

/**
 * Generate player ship sprite sheet (4 frames, 16×12, animated engine).
 */
export function createPlayerShipSheet(): SpriteSheet {
  const W = 16, H = 12;
  const frames: Uint8Array[] = [];

  for (let f = 0; f < 4; f++) {
    const buf = blankSprite(W, H);

    // === Ship body (static across frames) ===
    // Top wing (row 0-1)
    hLine(buf, 5, 0, W, 6, PI.blueDark);
    hLine(buf, 6, 1, W, 4, PI.blueDark);

    // Upper body (row 2-3)
    hLine(buf, 3, 2, W, 10, PI.blueDark);
    hLine(buf, 4, 3, W, 8, PI.blue);

    // Mid body (row 4-7) - widest part
    hLine(buf, 1, 4, W, 14, PI.blue);
    hLine(buf, 1, 5, W, 14, PI.blue);
    hLine(buf, 1, 6, W, 14, PI.blueLight);
    hLine(buf, 1, 7, W, 14, PI.blue);

    // Lower body (row 8-9)
    hLine(buf, 3, 8, W, 10, PI.blue);
    hLine(buf, 5, 9, W, 6, PI.blueDark);

    // Bottom wing (row 10-11)
    hLine(buf, 5, 10, W, 6, PI.blueDark);
    hLine(buf, 6, 11, W, 4, PI.blueDark);

    // === Nose cone ===
    buf[4 * W + 15] = PI.cyan;
    buf[5 * W + 15] = PI.cyan;
    buf[6 * W + 15] = PI.cyan;
    buf[4 * W + 14] = PI.cyan;
    buf[5 * W + 14] = PI.white;
    buf[6 * W + 14] = PI.cyan;

    // === Cockpit ===
    buf[4 * W + 11] = PI.yellowLight;
    buf[5 * W + 11] = PI.white;
    buf[6 * W + 11] = PI.yellowLight;
    buf[5 * W + 12] = PI.yellow;

    // === Wing tip highlights ===
    buf[0 * W + 7] = PI.cyan;
    buf[0 * W + 8] = PI.cyan;
    buf[11 * W + 7] = PI.cyan;
    buf[11 * W + 8] = PI.cyan;

    // === Body detail lines ===
    buf[3 * W + 5] = PI.blueLight;
    buf[3 * W + 6] = PI.blueLight;
    buf[8 * W + 5] = PI.blueLight;
    buf[8 * W + 6] = PI.blueLight;

    // === Engine exhaust (animated per frame) ===
    const engineLengths = [6, 4, 8, 5]; // varying exhaust length
    const engineLen = engineLengths[f];

    // Main exhaust flame
    for (let ex = 0; ex < engineLen; ex++) {
      const exX = 2 - ex;
      if (exX < 0) continue;
      // Outer flame (orange)
      buf[4 * W + exX] = PI.orange;
      buf[7 * W + exX] = PI.orange;
      // Inner flame (yellow)
      if (ex < engineLen - 2) {
        buf[5 * W + exX] = PI.yellow;
        buf[6 * W + exX] = PI.yellow;
      }
      // Core (white)
      if (ex < engineLen - 4) {
        buf[5 * W + exX] = PI.white;
        buf[6 * W + exX] = PI.white;
      }
    }

    // Exhaust sparks (frame-dependent)
    if (f === 0 || f === 2) {
      buf[3 * W + 0] = PI.orange;
      buf[8 * W + 0] = PI.orange;
    }
    if (f === 1 || f === 3) {
      buf[4 * W + 0] = PI.yellow;
      buf[7 * W + 0] = PI.yellow;
    }

    frames.push(buf);
  }

  return buildSheet(frames, W, H, 8); // 8 fps animation
}

/** Pre-built player ship sheet */
export const PLAYER_SHIP_SHEET = createPlayerShipSheet();
