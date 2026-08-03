import * as THREE from 'three';
import { PlayerShip } from '../entities/PlayerShip.js';
import { AIController } from './AIController.js';
import { BiomeId, getBiome } from '../data/BiomeDefinitions.js';

/**
 * Demo controller — manages the attract demo state machine.
 * Runs a scripted ~3-minute demo that loops seamlessly.
 */
export class DemoController {
  private _state: 'title' | 'playing' | 'transition' | 'gameover' = 'title';
  private _timer: number = 0;
  private transitionTarget: BiomeId = BiomeId.VolcanicCanyon;
  private currentBiomeIndex: number = 0;
  private _demoTime: number = 0;
  private readonly demoDuration: number = 180; // 3 minutes

  // AI for player
  private ai: AIController = new AIController();

  // Biome progression
  private readonly biomeOrder: BiomeId[] = [
    BiomeId.VolcanicCanyon,
    BiomeId.FuturisticCity,
    BiomeId.AsteroidField,
    BiomeId.AlienFortress,
  ];

  get state(): string { return this._state; }
  get currentBiome(): BiomeId { return this.biomeOrder[this.currentBiomeIndex] ?? BiomeId.Title; }
  get timer(): number { return this._timer; }
  get demoTime(): number { return this._demoTime; }
  get isLooping(): boolean { return this._demoTime >= this.demoDuration; }

  update(delta: number, player: PlayerShip, humanInput: THREE.Vector2 = new THREE.Vector2()): { input: THREE.Vector2; state: string; biome: BiomeId } {
    this._demoTime += delta;

    const input = new THREE.Vector2();

    switch (this._state) {
      case 'title':
        this._timer -= delta;
        if (this._timer <= 0) {
          this._state = 'playing';
          this.currentBiomeIndex = 0;
          this.transitionTarget = this.biomeOrder[0];
        }
        // During title/transition/gameover, let human input through
        input.copy(humanInput);
        break;

      case 'playing':
        // AI controls the player
        const bounds = { minX: -7, maxX: 7, minY: -3.5, maxY: 3.5 };
        input.copy(this.ai.update(delta, player.data.position, bounds));

        // Check if boss is defeated or stage is over
        if (this._timer <= 0) {
          this._advanceBiome();
        }
        break;

      case 'transition':
        this._timer -= delta;
        if (this._timer <= 0) {
          this._state = 'playing';
          this._timer = getBiome(this.transitionTarget).duration;
        }
        // During transition, let human input through
        input.copy(humanInput);
        break;

      case 'gameover':
        this._timer -= delta;
        if (this._timer <= 0) {
          // Loop the demo
          this._reset();
        }
        // During gameover, let human input through
        input.copy(humanInput);
        break;
    }

    return {
      input,
      state: this.state,
      biome: this.currentBiome,
    };
  }

  /** Get AI input for the player. */
  getInput(playerPos: THREE.Vector3): THREE.Vector2 {
    const bounds = { minX: -7, maxX: 7, minY: -3.5, maxY: 3.5 };
    return this.ai.update(0.016, playerPos, bounds);
  }

  startDemo(): void {
    this._state = 'title';
    this._timer = 2;
    this._demoTime = 0;
    this.currentBiomeIndex = 0;
  }

  private _advanceBiome(): void {
    this.currentBiomeIndex++;
    if (this.currentBiomeIndex >= this.biomeOrder.length) {
      // Demo complete, go to game over then loop
      this._state = 'gameover';
      this._timer = 3;
      return;
    }

    this.transitionTarget = this.biomeOrder[this.currentBiomeIndex];
    this._state = 'transition';
    this._timer = 1.5;
  }

  private _reset(): void {
    this._state = 'title';
    this._timer = 2;
    this._demoTime = 0;
    this.currentBiomeIndex = 0;
    this.ai.reset();
  }

  dispose(): void {
    this.ai = new AIController();
  }
}
