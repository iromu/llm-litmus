import * as THREE from 'three';

// --- Tween / Easing Helper ---

export type Easing = (t: number) => number;

export const easeInQuad: Easing = (t) => t * t;
export const easeOutCubic: Easing = (t) => 1 - Math.pow(1 - t, 3);
export const easeOutBack: Easing = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

interface ActiveTween {
  elapsed: number;
  duration: number;
  easing: Easing;
  onUpdate: (value: number) => void;
  onComplete?: () => void;
}

export class TweenManager {
  private readonly tweens: ActiveTween[] = [];

  tween(
    durationSec: number,
    onUpdate: (value: number) => void,
    easing: Easing = easeOutCubic,
    onComplete?: () => void,
  ): void {
    this.tweens.push({ elapsed: 0, duration: durationSec, easing, onUpdate, onComplete });
  }

  update(delta: number): void {
    for (let i = this.tweens.length - 1; i >= 0; i -= 1) {
      const t = this.tweens[i];
      t.elapsed += delta;
      const k = Math.min(t.elapsed / t.duration, 1);
      t.onUpdate(t.easing(k));
      if (t.elapsed >= t.duration) {
        t.onComplete?.();
        this.tweens.splice(i, 1);
      }
    }
  }

  clear(): void {
    this.tweens.length = 0;
  }
}

// --- Trauma-Based Screenshake ---

const TRAUMA_MAX = 1;
const TRAUMA_DECAY = 1.4;
const MAX_OFFSET = 0.55;
const MAX_ROLL = 0.1;

function pseudoNoise(t: number, seed: number): number {
  const x = Math.sin(t * 12.9898 + seed * 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

export class ShakeRig {
  private trauma = 0;
  private time = 0;

  addTrauma(amount: number): void {
    this.trauma = Math.min(TRAUMA_MAX, this.trauma + amount);
  }

  update(delta: number, camera: THREE.PerspectiveCamera): void {
    this.time += delta;
    this.trauma = Math.max(0, this.trauma - TRAUMA_DECAY * delta);
    if (this.trauma <= 0) return;
    const shake = this.trauma * this.trauma;
    const freq = this.time * 32;
    camera.position.x += MAX_OFFSET * shake * pseudoNoise(freq, 1);
    camera.position.y += MAX_OFFSET * shake * pseudoNoise(freq, 2);
    camera.rotation.z += MAX_ROLL * shake * pseudoNoise(freq, 3);
  }

  clear(): void {
    this.trauma = 0;
    this.time = 0;
  }
}

// --- Hitstop ---

export class HitstopManager {
  private timeScale = 1;
  private hitstopRemaining = 0;

  hitstop(durationMs: number, scale = 0.05): void {
    this.hitstopRemaining = Math.max(this.hitstopRemaining, durationMs / 1000);
    this.timeScale = scale;
  }

  getGameplayDelta(delta: number): number {
    if (this.hitstopRemaining > 0) {
      this.hitstopRemaining -= delta;
      if (this.hitstopRemaining <= 0) {
        this.hitstopRemaining = 0;
        this.timeScale = 1;
      }
    }
    return delta * this.timeScale;
  }

  getRealDelta(delta: number): number {
    return delta;
  }

  reset(): void {
    this.timeScale = 1;
    this.hitstopRemaining = 0;
  }
}

// --- FOV Punch ---

export class FovPunch {
  private baseFov = 60;
  private fovPunch = 0;

  setBaseFov(fov: number): void {
    this.baseFov = fov;
  }

  punch(degrees: number): void {
    this.fovPunch = Math.min(15, this.fovPunch + degrees);
  }

  apply(camera: THREE.PerspectiveCamera): void {
    if (this.fovPunch <= 0.001) {
      this.fovPunch = 0;
      if (camera.fov !== this.baseFov) {
        camera.fov = this.baseFov;
        camera.updateProjectionMatrix();
      }
      return;
    }
    this.fovPunch *= Math.exp(-0.016 / 0.2); // ~60fps decay
    if (this.fovPunch < 0.001) this.fovPunch = 0;
    camera.fov = this.baseFov + this.fovPunch;
    camera.updateProjectionMatrix();
  }

  reset(): void {
    this.fovPunch = 0;
  }
}
