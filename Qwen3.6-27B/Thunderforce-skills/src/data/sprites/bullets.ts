/**
 * Bullet and pickup sprite sheets.
 */
import { SpriteSheet } from '../../core/SpriteSheet';
import { PI, blankSprite, hLine, buildSheet } from './generator';

// ===== Player Bullets =====

/** Plasma bolt - 8×4, 2 frames */
export function createPlasmaBolt(): SpriteSheet {
  const W = 8, H = 4;
  const frames: Uint8Array[] = [];

  for (let f = 0; f < 2; f++) {
    const buf = blankSprite(W, H);
    hLine(buf, 2, 1, W, 4, PI.cyan);
    hLine(buf, 1, 2, W, 6, PI.blueLight);
    buf[1 * W + 3] = PI.white;
    buf[2 * W + 3] = PI.white;
    // Trail
    if (f === 0) {
      buf[1 * W + 0] = PI.blue;
      buf[2 * W + 0] = PI.blue;
    }
    frames.push(buf);
  }

  return buildSheet(frames, W, H, 12);
}

/** Homing drone - 8×6, 2 frames */
export function createHomingDrone(): SpriteSheet {
  const W = 8, H = 6;
  const frames: Uint8Array[] = [];

  for (let f = 0; f < 2; f++) {
    const buf = blankSprite(W, H);
    hLine(buf, 2, 1, W, 4, PI.yellow);
    hLine(buf, 1, 2, W, 6, PI.orange);
    hLine(buf, 1, 3, W, 6, PI.orange);
    hLine(buf, 2, 4, W, 4, PI.yellow);
    buf[2 * W + 2] = PI.white;
    buf[3 * W + 2] = PI.white;
    // Wings
    buf[f * W + 2] = PI.yellow;
    buf[f * W + 3] = PI.yellow;
    buf[(5 - f) * W + 2] = PI.yellow;
    buf[(5 - f) * W + 3] = PI.yellow;
    frames.push(buf);
  }

  return buildSheet(frames, W, H, 10);
}

/** Spread laser - 6×2, 1 frame (static) */
export function createSpreadLaser(): SpriteSheet {
  const W = 6, H = 2;
  const buf = blankSprite(W, H);
  hLine(buf, 1, 0, W, 4, PI.cyan);
  hLine(buf, 0, 1, W, 6, PI.blueLight);
  buf[0 * W + 2] = PI.white;
  buf[0 * W + 3] = PI.white;
  buf[1 * W + 2] = PI.white;
  buf[1 * W + 3] = PI.white;
  return buildSheet([buf], W, H, 0);
}

/** Lightning beam - 4×8, 2 frames */
export function createLightningBeam(): SpriteSheet {
  const W = 4, H = 8;
  const frames: Uint8Array[] = [];

  for (let f = 0; f < 2; f++) {
    const buf = blankSprite(W, H);
    hLine(buf, 1, 0, W, 2, PI.cyan);
    hLine(buf, 1, 1, W, 2, PI.white);
    hLine(buf, 1, 2, W, 2, PI.cyan);
    hLine(buf, 0, 3, W, 4, PI.blueLight);
    hLine(buf, 0, 4, W, 4, PI.cyan);
    hLine(buf, 1, 5, W, 2, PI.white);
    hLine(buf, 1, 6, W, 2, PI.cyan);
    // Branch (alternating)
    if (f === 0) {
      buf[2 * W + 0] = PI.blueLight;
      buf[3 * W + 0] = PI.blueLight;
    } else {
      buf[5 * W + 3] = PI.blueLight;
      buf[6 * W + 3] = PI.blueLight;
    }
    frames.push(buf);
  }

  return buildSheet(frames, W, H, 15);
}

// ===== Enemy Bullets =====

/** Enemy bullet - 6×4, 1 frame */
export function createEnemyBullet(): SpriteSheet {
  const W = 6, H = 4;
  const buf = blankSprite(W, H);
  hLine(buf, 1, 1, W, 4, PI.red);
  hLine(buf, 0, 2, W, 6, PI.redLight);
  buf[1 * W + 2] = PI.yellow;
  buf[2 * W + 2] = PI.yellow;
  return buildSheet([buf], W, H, 0);
}

/** Spiral bullet - 6×6, 4 frames */
export function createSpiralBullet(): SpriteSheet {
  const W = 6, H = 6;
  const frames: Uint8Array[] = [];

  for (let f = 0; f < 4; f++) {
    const buf = blankSprite(W, H);
    hLine(buf, 1, 1, W, 4, PI.red);
    hLine(buf, 0, 2, W, 6, PI.redLight);
    hLine(buf, 0, 3, W, 6, PI.red);
    hLine(buf, 1, 4, W, 4, PI.redLight);
    buf[2 * W + 2] = PI.yellow;
    buf[3 * W + 2] = PI.yellow;
    // Rotating arms
    const angle = f * Math.PI / 2;
    const ax = 3 + Math.cos(angle) * 2;
    const ay = 3 + Math.sin(angle) * 2;
    buf[Math.floor(ay) * W + Math.floor(ax)] = PI.orange;
    frames.push(buf);
  }

  return buildSheet(frames, W, H, 8);
}

/** Enemy missile - 8×4, 2 frames */
export function createEnemyMissile(): SpriteSheet {
  const W = 8, H = 4;
  const frames: Uint8Array[] = [];

  for (let f = 0; f < 2; f++) {
    const buf = blankSprite(W, H);
    hLine(buf, 2, 1, W, 4, PI.redDark);
    hLine(buf, 1, 2, W, 6, PI.red);
    hLine(buf, 2, 3, W, 4, PI.redDark);
    // Nose
    buf[1 * W + 0] = PI.redLight;
    buf[2 * W + 0] = PI.redLight;
    // Engine
    const exLen = f === 0 ? 2 : 1;
    for (let e = 0; e < exLen; e++) {
      buf[1 * W + 7 + e] = PI.orange;
      buf[2 * W + 7 + e] = PI.orange;
    }
    frames.push(buf);
  }

  return buildSheet(frames, W, H, 8);
}

/** Boss bullet - 8×6, 2 frames */
export function createBossBullet(): SpriteSheet {
  const W = 8, H = 6;
  const frames: Uint8Array[] = [];

  for (let f = 0; f < 2; f++) {
    const buf = blankSprite(W, H);
    hLine(buf, 2, 1, W, 4, PI.red);
    hLine(buf, 1, 2, W, 6, PI.redLight);
    hLine(buf, 1, 3, W, 6, PI.red);
    hLine(buf, 2, 4, W, 4, PI.redLight);
    buf[2 * W + 3] = PI.yellow;
    buf[3 * W + 3] = PI.yellow;
    // Energy ring (alternating)
    if (f === 0) {
      buf[0 * W + 3] = PI.orange;
      buf[5 * W + 3] = PI.orange;
    } else {
      buf[2 * W + 0] = PI.orange;
      buf[2 * W + 7] = PI.orange;
    }
    frames.push(buf);
  }

  return buildSheet(frames, W, H, 6);
}

/** Boss laser - 4×12, 2 frames */
export function createBossLaser(): SpriteSheet {
  const W = 4, H = 12;
  const frames: Uint8Array[] = [];

  for (let f = 0; f < 2; f++) {
    const buf = blankSprite(W, H);
    hLine(buf, 1, 0, W, 2, PI.red);
    for (let y = 1; y < 11; y++) {
      hLine(buf, 0, y, W, 4, y % 2 === 0 ? PI.redLight : PI.red);
    }
    hLine(buf, 1, 11, W, 2, PI.red);
    // Core
    for (let y = 1; y < 11; y++) {
      buf[y * W + 1] = PI.yellow;
      buf[y * W + 2] = PI.yellow;
    }
    frames.push(buf);
  }

  return buildSheet(frames, W, H, 10);
}

// ===== Pickups =====

/** Weapon pickup - 8×8, 2 frames */
export function createWeaponPickup(): SpriteSheet {
  const W = 8, H = 8;
  const frames: Uint8Array[] = [];

  for (let f = 0; f < 2; f++) {
    const buf = blankSprite(W, H);
    const bob = f === 0 ? 0 : 1;
    // Body
    hLine(buf, 2, 1 + bob, W, 4, PI.cyan);
    hLine(buf, 1, 2 + bob, W, 6, PI.blueLight);
    hLine(buf, 1, 3 + bob, W, 6, PI.cyan);
    hLine(buf, 1, 4 + bob, W, 6, PI.blueLight);
    hLine(buf, 2, 5 + bob, W, 4, PI.cyan);
    // Star
    buf[(2 + bob) * W + 3] = PI.white;
    buf[(3 + bob) * W + 2] = PI.white;
    buf[(3 + bob) * W + 5] = PI.white;
    buf[(4 + bob) * W + 3] = PI.white;
    frames.push(buf);
  }

  return buildSheet(frames, W, H, 6);
}

/** Shield pickup - 10×10, 2 frames */
export function createShieldPickup(): SpriteSheet {
  const W = 10, H = 10;
  const frames: Uint8Array[] = [];

  for (let f = 0; f < 2; f++) {
    const buf = blankSprite(W, H);
    const bob = f === 0 ? 0 : 1;
    // Shield shape
    hLine(buf, 3, 1 + bob, W, 4, PI.green);
    hLine(buf, 2, 2 + bob, W, 6, PI.greenLight);
    hLine(buf, 1, 3 + bob, W, 8, PI.green);
    hLine(buf, 1, 4 + bob, W, 8, PI.greenLight);
    hLine(buf, 1, 5 + bob, W, 8, PI.green);
    hLine(buf, 2, 6 + bob, W, 6, PI.greenLight);
    hLine(buf, 3, 7 + bob, W, 4, PI.green);
    // Cross
    buf[(4 + bob) * W + 4] = PI.white;
    buf[(4 + bob) * W + 5] = PI.white;
    buf[(5 + bob) * W + 4] = PI.white;
    buf[(5 + bob) * W + 5] = PI.white;
    frames.push(buf);
  }

  return buildSheet(frames, W, H, 6);
}

/** Speed pickup - 8×8, 2 frames */
export function createSpeedPickup(): SpriteSheet {
  const W = 8, H = 8;
  const frames: Uint8Array[] = [];

  for (let f = 0; f < 2; f++) {
    const buf = blankSprite(W, H);
    const bob = f === 0 ? 0 : 1;
    // Lightning bolt shape
    hLine(buf, 4, 1 + bob, W, 1, PI.yellow);
    hLine(buf, 3, 2 + bob, W, 2, PI.yellow);
    hLine(buf, 2, 3 + bob, W, 3, PI.yellowLight);
    hLine(buf, 4, 4 + bob, W, 1, PI.yellow);
    hLine(buf, 3, 5 + bob, W, 2, PI.yellowLight);
    hLine(buf, 4, 6 + bob, W, 1, PI.yellow);
    // Glow
    if (f === 0) {
      buf[(1 + bob) * W + 3] = PI.white;
      buf[(6 + bob) * W + 3] = PI.white;
    }
    frames.push(buf);
  }

  return buildSheet(frames, W, H, 6);
}

/** Power pickup - 8×8, 2 frames */
export function createPowerPickup(): SpriteSheet {
  const W = 8, H = 8;
  const frames: Uint8Array[] = [];

  for (let f = 0; f < 2; f++) {
    const buf = blankSprite(W, H);
    const bob = f === 0 ? 0 : 1;
    // Diamond shape
    hLine(buf, 3, 1 + bob, W, 2, PI.magenta);
    hLine(buf, 2, 2 + bob, W, 4, PI.purple);
    hLine(buf, 1, 3 + bob, W, 6, PI.magenta);
    hLine(buf, 1, 4 + bob, W, 6, PI.purple);
    hLine(buf, 2, 5 + bob, W, 4, PI.magenta);
    hLine(buf, 3, 6 + bob, W, 2, PI.purple);
    // Core
    buf[(3 + bob) * W + 3] = PI.white;
    buf[(3 + bob) * W + 4] = PI.white;
    buf[(4 + bob) * W + 3] = PI.white;
    buf[(4 + bob) * W + 4] = PI.white;
    frames.push(buf);
  }

  return buildSheet(frames, W, H, 6);
}

// ===== Explosion sequence =====

/** Multi-stage explosion: flash → fireball → debris → smoke (4 frames, 16×16) */
export function createExplosionSheet(): SpriteSheet {
  const W = 16, H = 16;
  const frames: Uint8Array[] = [];

  // Frame 0: White flash
  {
    const buf = blankSprite(W, H);
    for (let y = 4; y < 12; y++) {
      for (let x = 4; x < 12; x++) {
        buf[y * W + x] = PI.white;
      }
    }
    for (let y = 5; y < 11; y++) {
      for (let x = 5; x < 11; x++) {
        buf[y * W + x] = PI.yellowLight;
      }
    }
    frames.push(buf);
  }

  // Frame 1: Fireball
  {
    const buf = blankSprite(W, H);
    for (let y = 2; y < 14; y++) {
      for (let x = 2; x < 14; x++) {
        const dist = Math.sqrt((x - 7) ** 2 + (y - 7) ** 2);
        if (dist < 6) buf[y * W + x] = PI.orange;
        if (dist < 4) buf[y * W + x] = PI.yellow;
        if (dist < 2) buf[y * W + x] = PI.white;
      }
    }
    frames.push(buf);
  }

  // Frame 2: Debris
  {
    const buf = blankSprite(W, H);
    // Scattered debris
    const debris = [
      [1, 3], [1, 12], [3, 1], [12, 1],
      [14, 3], [14, 12], [3, 14], [12, 14],
      [0, 7], [15, 7], [7, 0], [7, 15],
      [4, 4], [11, 11], [11, 4], [4, 11],
    ];
    for (const [dx, dy] of debris) {
      buf[dy * W + dx] = PI.orange;
    }
    // Smoke center
    for (let y = 5; y < 11; y++) {
      for (let x = 5; x < 11; x++) {
        if ((x + y) % 2 === 0) buf[y * W + x] = PI.gray;
      }
    }
    frames.push(buf);
  }

  // Frame 3: Smoke fading
  {
    const buf = blankSprite(W, H);
    for (let y = 4; y < 12; y++) {
      for (let x = 4; x < 12; x++) {
        const dist = Math.sqrt((x - 7) ** 2 + (y - 7) ** 2);
        if (dist < 5 && (x + y) % 3 === 0) buf[y * W + x] = PI.grayDark;
      }
    }
    frames.push(buf);
  }

  return buildSheet(frames, W, H, 6);
}
