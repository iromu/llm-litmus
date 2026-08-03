import * as THREE from 'three';
import { range } from '@thunderforce/engine';

/**
 * AI controller for scripted player behavior.
 * Used for attract demo mode.
 */
export class AIController {
  private targetX: number = 0;
  private targetY: number = 0;
  private timer: number = 0;
  private phase: number = 0;

  /**
   * Update AI target based on current phase.
   * Returns input vector for player movement.
   */
  update(delta: number, playerPos: THREE.Vector3, bounds: { minX: number; maxX: number; minY: number; maxY: number }): THREE.Vector2 {
    this.timer -= delta;

    if (this.timer <= 0) {
      this.phase = (this.phase + 1) % 10;
      this._setNextTarget(playerPos, bounds);
      this.timer = range(Math.random, 0.5, 2.0);
    }

    const input = new THREE.Vector2();
    input.x = THREE.MathUtils.clamp((this.targetX - playerPos.x) * 0.5, -1, 1);
    input.y = THREE.MathUtils.clamp((this.targetY - playerPos.y) * 0.5, -1, 1);

    if (Math.abs(input.x) < 0.1) input.x = 0;
    if (Math.abs(input.y) < 0.1) input.y = 0;

    return input;
  }

  private _setNextTarget(playerPos: THREE.Vector3, bounds: { minX: number; maxX: number; minY: number; maxY: number }): void {
    switch (this.phase) {
      case 0:
        // Move to center
        this.targetX = 0;
        this.targetY = 0;
        break;
      case 1:
        // Move left
        this.targetX = bounds.minX + 2;
        this.targetY = playerPos.y;
        break;
      case 2:
        // Move right
        this.targetX = bounds.maxX - 2;
        this.targetY = playerPos.y;
        break;
      case 3:
        // Move up
        this.targetX = playerPos.x;
        this.targetY = bounds.maxY - 1;
        break;
      case 4:
        // Move down
        this.targetX = playerPos.x;
        this.targetY = bounds.minY + 1;
        break;
      case 5:
        // Diagonal pattern
        this.targetX = (Math.random() - 0.5) * (bounds.maxX - bounds.minX);
        this.targetY = (Math.random() - 0.5) * (bounds.maxY - bounds.minY);
        break;
      case 6:
        // Circle pattern
        const t = Date.now() * 0.002;
        this.targetX = Math.cos(t) * 3;
        this.targetY = Math.sin(t) * 2;
        break;
      case 7:
        // Evade down
        this.targetX = playerPos.x + (Math.random() - 0.5) * 2;
        this.targetY = bounds.minY + 0.5;
        break;
      case 8:
        // Position for attack (up)
        this.targetX = 0;
        this.targetY = -1;
        break;
      case 9:
        // Random position
        this.targetX = range(Math.random, bounds.minX + 1, bounds.maxX - 1);
        this.targetY = range(Math.random, bounds.minY + 1, bounds.maxY - 1);
        break;
    }
  }

  reset(): void {
    this.phase = 0;
    this.timer = 0;
    this.targetX = 0;
    this.targetY = 0;
  }
}
