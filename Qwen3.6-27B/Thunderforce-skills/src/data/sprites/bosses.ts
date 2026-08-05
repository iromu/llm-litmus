/**
 * Boss sprite sheets: 8+ frames each, dramatic multi-part designs.
 */
import { SpriteSheet } from '../../core/SpriteSheet';
import { PI, blankSprite, hLine, fillRect, buildSheet } from './generator';

/**
 * Boss 1: Mining Machine - 64×48, 8 frames
 * Multi-part mechanical boss with drills and turrets.
 */
export function createMiningMachineSheet(): SpriteSheet {
  const W = 64, H = 48;
  const frames: Uint8Array[] = [];

  for (let f = 0; f < 8; f++) {
    const buf = blankSprite(W, H);

    // Main body
    fillRect(buf, 8, 8, W, 48, 32, PI.grayDark);
    fillRect(buf, 10, 10, W, 44, 28, PI.gray);

    // Top turret
    fillRect(buf, 12, 4, W, 16, 8, PI.gray);
    fillRect(buf, 14, 6, W, 12, 4, PI.grayLight);

    // Bottom turret
    fillRect(buf, 12, 36, W, 16, 8, PI.gray);
    fillRect(buf, 14, 38, W, 12, 4, PI.grayLight);

    // Core (animated glow)
    const glowPhase = Math.sin(f * 0.8) > 0;
    fillRect(buf, 26, 18, W, 12, 12, PI.orange);
    if (glowPhase) {
      fillRect(buf, 28, 20, W, 8, 8, PI.yellow);
      fillRect(buf, 30, 22, W, 4, 4, PI.white);
    }

    // Left drill (rotating)
    const drillAngle = f % 4;
    const drillY = 20 + Math.sin(drillAngle) * 2;
    fillRect(buf, 2, drillY, W, 8, 6, PI.grayLight);
    fillRect(buf, 0, drillY + 1, W, 4, 4, PI.orange);

    // Right drill (rotating opposite)
    const drillY2 = 20 + Math.sin(drillAngle + Math.PI) * 2;
    fillRect(buf, 54, drillY2, W, 8, 6, PI.grayLight);
    fillRect(buf, 58, drillY2 + 1, W, 4, 4, PI.orange);

    // Armor plates
    hLine(buf, 10, 8, W, 44, PI.grayDark);
    hLine(buf, 10, 40, W, 44, PI.grayDark);

    // Panel lines
    for (let i = 0; i < 4; i++) {
      buf[(12 + i * 8) * W + 24] = PI.grayDark;
      buf[(12 + i * 8) * W + 25] = PI.grayDark;
    }

    // Damage sparks (frame-dependent)
    if (f % 2 === 0) {
      buf[14 * W + 16] = PI.yellow;
      buf[34 * W + 40] = PI.orange;
    }

    frames.push(buf);
  }

  return buildSheet(frames, W, H, 4);
}

/**
 * Boss 2: Orbital Battleship - 56×56, 8 frames
 * Transforming battleship with rotating weapon arrays.
 */
export function createOrbitalShipSheet(): SpriteSheet {
  const W = 56, H = 56;
  const frames: Uint8Array[] = [];

  for (let f = 0; f < 8; f++) {
    const buf = blankSprite(W, H);

    // Main hull
    fillRect(buf, 4, 8, W, 48, 40, PI.grayDark);
    fillRect(buf, 6, 10, W, 44, 36, PI.gray);

    // Bridge
    fillRect(buf, 22, 22, W, 12, 12, PI.blueLight);
    fillRect(buf, 24, 24, W, 8, 8, PI.cyan);
    fillRect(buf, 26, 26, W, 4, 4, PI.white);

    // Rotating weapon arrays
    const angle = f * Math.PI / 4;
    for (let i = 0; i < 6; i++) {
      const a = angle + (i / 6) * Math.PI * 2;
      const wx = 28 + Math.cos(a) * 20;
      const wy = 28 + Math.sin(a) * 20;
      fillRect(buf, wx - 2, wy - 2, W, 4, 4, PI.grayDark);
      buf[Math.floor(wy) * W + Math.floor(wx)] = PI.red;
    }

    // Wing extensions (phase 2 effect)
    if (f >= 4) {
      fillRect(buf, 0, 16, W, 4, 24, PI.redDark);
      fillRect(buf, 52, 16, W, 4, 24, PI.redDark);
    }

    // Engine glow
    const enginePulse = Math.sin(f * 0.5) > 0;
    if (enginePulse) {
      fillRect(buf, 0, 24, W, 4, 8, PI.orange);
      fillRect(buf, 2, 26, W, 2, 4, PI.yellow);
    }

    // Armor detail
    hLine(buf, 6, 8, W, 44, PI.grayDark);
    hLine(buf, 6, 48, W, 44, PI.grayDark);

    // Transformation energy (frames 3-4)
    if (f === 3 || f === 4) {
      buf[28 * W + 0] = PI.cyan;
      buf[28 * W + 55] = PI.cyan;
      buf[0 * W + 28] = PI.cyan;
      buf[55 * W + 28] = PI.cyan;
    }

    frames.push(buf);
  }

  return buildSheet(frames, W, H, 3);
}

/**
 * Boss 3: Alien Guardian - 56×48, 8 frames
 * Organic biomechanical boss with pulsating animations.
 */
export function createAlienGuardianSheet(): SpriteSheet {
  const W = 56, H = 48;
  const frames: Uint8Array[] = [];

  for (let f = 0; f < 8; f++) {
    const buf = blankSprite(W, H);

    const pulse = Math.sin(f * 0.5) * 2;

    // Organic body
    fillRect(buf, 6 + pulse, 6, W, 44 - pulse * 2, 36, PI.greenDark);
    fillRect(buf, 8 + pulse, 8, W, 40 - pulse * 2, 32, PI.green);

    // Inner organs
    fillRect(buf, 16, 14, W, 24, 20, PI.flesh);
    fillRect(buf, 20, 18, W, 16, 12, PI.fleshDark);

    // Eyes (glowing)
    const eyeGlow = f % 3 !== 0;
    fillRect(buf, 20, 20, W, 6, 6, eyeGlow ? PI.greenLight : PI.green);
    fillRect(buf, 30, 20, W, 6, 6, eyeGlow ? PI.greenLight : PI.green);
    buf[22 * W + 22] = PI.white;
    buf[23 * W + 22] = PI.white;
    buf[32 * W + 22] = PI.white;
    buf[33 * W + 22] = PI.white;

    // Tendrils (animated)
    for (let i = 0; i < 4; i++) {
      const tx = 12 + i * 10;
      const ty = 42 + Math.sin(f * 0.4 + i) * 3;
      fillRect(buf, tx, ty, W, 4, 6 + Math.floor(pulse), PI.green);
    }

    // Phase effects
    if (f >= 4) {
      // Energy aura
      buf[(4 + pulse) * W + 8] = PI.magenta;
      buf[(4 + pulse) * W + 40] = PI.magenta;
      buf[44 * W + 8 + pulse] = PI.magenta;
      buf[44 * W + 44 - pulse] = PI.magenta;
    }

    // Final phase core exposure
    if (f >= 6) {
      fillRect(buf, 22, 18, W, 12, 12, PI.magenta);
      fillRect(buf, 26, 22, W, 4, 4, PI.white);
    }

    // Organic texture
    for (let i = 0; i < 6; i++) {
      const tx = 10 + (i * 7) % 36;
      const ty = 10 + (i * 5) % 28;
      buf[ty * W + tx] = PI.greenDark;
    }

    frames.push(buf);
  }

  return buildSheet(frames, W, H, 3);
}
