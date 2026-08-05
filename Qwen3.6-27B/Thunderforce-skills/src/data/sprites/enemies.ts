/**
 * Enemy sprite sheets: procedural pixel art for all enemy types.
 * Each enemy type gets 2+ frames of animation.
 */
import { SpriteSheet } from '../../core/SpriteSheet';
import { PI, blankSprite, hLine, diagLine, buildSheet } from './generator';

/**
 * Small fighter enemy (STRAIGHT/SINE behavior) - 12×8, 2 frames
 */
function createSmallFighter(c1: number, c2: number, c3: number): SpriteSheet {
  const W = 12, H = 8;
  const frames: Uint8Array[] = [];

  for (let f = 0; f < 2; f++) {
    const buf = blankSprite(W, H);

    // Body
    hLine(buf, 2, 1, W, 8, c1);
    hLine(buf, 1, 2, W, 10, c2);
    hLine(buf, 1, 3, W, 10, c2);
    hLine(buf, 1, 4, W, 10, c1);
    hLine(buf, 1, 5, W, 10, c1);
    hLine(buf, 2, 6, W, 8, c2);

    // Nose (pointing left)
    buf[3 * W + 0] = c3;
    buf[4 * W + 0] = c3;
    buf[2 * W + 1] = c3;
    buf[5 * W + 1] = c3;

    // Cockpit
    buf[3 * W + 9] = PI.white;
    buf[4 * W + 9] = PI.white;

    // Wings
    buf[0 * W + 4] = c1;
    buf[0 * W + 5] = c1;
    buf[7 * W + 4] = c1;
    buf[7 * W + 5] = c1;

    // Engine (animated)
    const exLen = f === 0 ? 2 : 1;
    for (let e = 0; e < exLen; e++) {
      buf[3 * W + 11 + e] = PI.orange;
      buf[4 * W + 11 + e] = PI.orange;
    }

    frames.push(buf);
  }

  return buildSheet(frames, W, H, 6);
}

/**
 * Heavy cruiser (HOVER/CIRCLE behavior) - 16×12, 2 frames
 */
function createHeavyCruiser(c1: number, c2: number): SpriteSheet {
  const W = 16, H = 12;
  const frames: Uint8Array[] = [];

  for (let f = 0; f < 2; f++) {
    const buf = blankSprite(W, H);

    // Hull
    hLine(buf, 2, 0, W, 12, c1);
    hLine(buf, 1, 1, W, 14, c1);
    hLine(buf, 0, 2, W, 16, c2);
    hLine(buf, 0, 3, W, 16, c2);
    hLine(buf, 0, 4, W, 16, c1);
    hLine(buf, 0, 5, W, 16, c1);
    hLine(buf, 0, 6, W, 16, c1);
    hLine(buf, 0, 7, W, 16, c2);
    hLine(buf, 0, 8, W, 16, c2);
    hLine(buf, 1, 9, W, 14, c1);
    hLine(buf, 2, 10, W, 12, c1);

    // Turret
    hLine(buf, 6, 2, W, 4, PI.gray);
    hLine(buf, 6, 3, W, 4, PI.grayLight);
    hLine(buf, 6, 4, W, 4, PI.gray);
    hLine(buf, 6, 7, W, 4, PI.gray);
    hLine(buf, 6, 8, W, 4, PI.grayLight);
    hLine(buf, 6, 9, W, 4, PI.gray);

    // Turret eye
    buf[5 * W + 7] = PI.red;
    buf[5 * W + 8] = PI.red;

    // Engine glow (animated)
    if (f === 0) {
      buf[5 * W + 15] = PI.orange;
      buf[6 * W + 15] = PI.orange;
    }

    frames.push(buf);
  }

  return buildSheet(frames, W, H, 5);
}

/**
 * Mechanical insect (ZIGZAG/DIVE behavior) - 10×10, 2 frames
 */
function createInsect(c1: number, c2: number): SpriteSheet {
  const W = 10, H = 10;
  const frames: Uint8Array[] = [];

  for (let f = 0; f < 2; f++) {
    const buf = blankSprite(W, H);

    // Body
    hLine(buf, 3, 2, W, 4, c1);
    hLine(buf, 2, 3, W, 6, c2);
    hLine(buf, 2, 4, W, 6, c1);
    hLine(buf, 2, 5, W, 6, c2);
    hLine(buf, 3, 6, W, 4, c1);

    // Eyes
    buf[4 * W + 1] = PI.red;
    buf[5 * W + 1] = PI.red;

    // Wings (animated)
    const wingY = f === 0 ? -1 : 1;
    buf[(1 + wingY) * W + 3] = c2;
    buf[(1 + wingY) * W + 4] = c2;
    buf[(1 + wingY) * W + 5] = c2;
    buf[(1 + wingY) * W + 6] = c2;
    buf[(8 + wingY) * W + 3] = c2;
    buf[(8 + wingY) * W + 4] = c2;
    buf[(8 + wingY) * W + 5] = c2;
    buf[(8 + wingY) * W + 6] = c2;

    // Tail
    buf[5 * W + 9] = c1;
    buf[4 * W + 8] = c1;
    buf[5 * W + 8] = c1;

    frames.push(buf);
  }

  return buildSheet(frames, W, H, 8);
}

/**
 * Missile carrier (CHARGE behavior) - 14×6, 2 frames
 */
function createMissileCarrier(c1: number, c2: number): SpriteSheet {
  const W = 14, H = 6;
  const frames: Uint8Array[] = [];

  for (let f = 0; f < 2; f++) {
    const buf = blankSprite(W, H);

    // Body
    hLine(buf, 2, 1, W, 10, c1);
    hLine(buf, 1, 2, W, 12, c2);
    hLine(buf, 1, 3, W, 12, c2);
    hLine(buf, 2, 4, W, 10, c1);

    // Nose cone
    buf[2 * W + 0] = PI.orange;
    buf[3 * W + 0] = PI.orange;
    buf[1 * W + 1] = PI.orange;
    buf[4 * W + 1] = PI.orange;

    // Fins
    buf[0 * W + 4] = c1;
    buf[0 * W + 5] = c1;
    buf[5 * W + 4] = c1;
    buf[5 * W + 5] = c1;

    // Engine (animated)
    const exLen = f === 0 ? 3 : 2;
    for (let e = 0; e < exLen; e++) {
      const exX = 13 + e;
      if (exX < W) {
        buf[2 * W + exX] = PI.orange;
        buf[3 * W + exX] = PI.orange;
        if (e < exLen - 1) {
          buf[2 * W + exX] = PI.yellow;
          buf[3 * W + exX] = PI.yellow;
        }
      }
    }

    frames.push(buf);
  }

  return buildSheet(frames, W, H, 6);
}

/**
 * Swarm unit (SWARM behavior) - 8×8, 2 frames
 */
function createSwarmUnit(c1: number, c2: number): SpriteSheet {
  const W = 8, H = 8;
  const frames: Uint8Array[] = [];

  for (let f = 0; f < 2; f++) {
    const buf = blankSprite(W, H);

    // Circular body
    hLine(buf, 2, 1, W, 4, c1);
    hLine(buf, 1, 2, W, 6, c2);
    hLine(buf, 1, 3, W, 6, c1);
    hLine(buf, 1, 4, W, 6, c2);
    hLine(buf, 1, 5, W, 6, c1);
    hLine(buf, 2, 6, W, 4, c2);

    // Eye
    buf[3 * W + 2] = PI.white;
    buf[4 * W + 2] = PI.white;
    buf[3 * W + 3] = PI.red;
    buf[4 * W + 3] = PI.red;

    // Legs (animated)
    const legOffset = f === 0 ? -1 : 1;
    buf[(1 + legOffset) * W + 2] = c2;
    buf[(1 + legOffset) * W + 5] = c2;
    buf[(6 + legOffset) * W + 2] = c2;
    buf[(6 + legOffset) * W + 5] = c2;

    frames.push(buf);
  }

  return buildSheet(frames, W, H, 10);
}

/**
 * Walker (FORMATION behavior) - 12×14, 2 frames
 */
function createWalker(c1: number, c2: number): SpriteSheet {
  const W = 12, H = 14;
  const frames: Uint8Array[] = [];

  for (let f = 0; f < 2; f++) {
    const buf = blankSprite(W, H);

    // Body
    hLine(buf, 3, 2, W, 6, c1);
    hLine(buf, 2, 3, W, 8, c2);
    hLine(buf, 2, 4, W, 8, c1);
    hLine(buf, 2, 5, W, 8, c2);
    hLine(buf, 3, 6, W, 6, c1);

    // Turret
    hLine(buf, 4, 3, W, 4, PI.gray);
    hLine(buf, 5, 3, W, 2, PI.grayLight);

    // Legs (animated)
    const legPhase = f === 0 ? 0 : 1;
    // Left leg
    hLine(buf, 3, 7, W, 2, c2);
    buf[(8 + legPhase) * W + 3] = c1;
    buf[(9 + legPhase) * W + 3] = c1;
    // Right leg
    hLine(buf, 6, 7, W, 2, c2);
    buf[(8 + (1 - legPhase)) * W + 7] = c1;
    buf[(9 + (1 - legPhase)) * W + 7] = c1;

    // Tracks
    hLine(buf, 2, 10, W, 8, PI.grayDark);
    hLine(buf, 3, 11, W, 6, PI.gray);
    hLine(buf, 3, 12, W, 6, PI.grayDark);

    frames.push(buf);
  }

  return buildSheet(frames, W, H, 5);
}

/**
 * Boss minion (BOSS_MINION behavior) - 14×10, 2 frames
 */
function createBossMinion(c1: number, c2: number): SpriteSheet {
  const W = 14, H = 10;
  const frames: Uint8Array[] = [];

  for (let f = 0; f < 2; f++) {
    const buf = blankSprite(W, H);

    // Armor plates
    hLine(buf, 1, 1, W, 12, c1);
    hLine(buf, 0, 2, W, 14, c2);
    hLine(buf, 0, 3, W, 14, c1);
    hLine(buf, 0, 4, W, 14, c2);
    hLine(buf, 0, 5, W, 14, c1);
    hLine(buf, 0, 6, W, 14, c2);
    hLine(buf, 1, 7, W, 12, c1);

    // Core
    hLine(buf, 5, 3, W, 4, PI.red);
    hLine(buf, 6, 3, W, 2, PI.redLight);

    // Armor detail
    buf[1 * W + 2] = PI.gray;
    buf[1 * W + 3] = PI.gray;
    buf[8 * W + 2] = PI.gray;
    buf[8 * W + 3] = PI.gray;

    // Engine (animated)
    if (f === 0) {
      buf[4 * W + 13] = PI.orange;
      buf[5 * W + 13] = PI.orange;
    }

    frames.push(buf);
  }

  return buildSheet(frames, W, H, 5);
}

// ===== Export all enemy sprite factories =====

export const EnemySpriteFactory = {
  createSmallFighter,
  createHeavyCruiser,
  createInsect,
  createMissileCarrier,
  createSwarmUnit,
  createWalker,
  createBossMinion,
};
