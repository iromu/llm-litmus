import * as THREE from 'three';
import { Enemy } from '../entities/Enemy.js';
import { Boss } from '../entities/Boss.js';
import { Pickup, PickupType } from '../entities/Pickup.js';
import { getEnemyDef } from '../data/EnemyDefinitions.js';
import { getBossDef } from '../data/BossDefinitions.js';
import { BiomeDefinition } from '../data/BiomeDefinitions.js';
import { createSeededRandom } from '@thunderforce/engine';

/** Spawn manager — handles spawning enemies, bosses, and pickups. */
export class Spawner {
  private spawnTimer: number = 0;
  private bossSpawned: boolean = false;
  private pickupTimer: number = 0;
  private stageProgress: number = 0;
  private readonly rng: () => number;

  constructor(private readonly scene: THREE.Scene) {
    this.rng = createSeededRandom(Date.now() | 0);
  }

  /**
   * Update spawn timers and spawn entities as needed.
   * Returns newly spawned enemies.
   */
  update(
    delta: number,
    biome: BiomeDefinition,
    enemyCount: number,
    maxEnemies: number,
    _playerPos: THREE.Vector3,
  ): Enemy[] {
    const newEnemies: Enemy[] = [];

    // Spawn enemies based on biome enemy table
    if (biome.enemyTable.length > 0 && enemyCount < maxEnemies) {
      this.spawnTimer -= delta;
      if (this.spawnTimer <= 0) {
        const enemyId = biome.enemyTable[Math.floor(this.rng() * biome.enemyTable.length)];
        const def = getEnemyDef(enemyId);
        const pos = this._spawnPosition();
        const enemy = new Enemy(def, pos, this.scene);
        newEnemies.push(enemy);
        this.spawnTimer = 0.8 + this.rng() * 1.2;
      }
    }

    // Spawn pickups
    if (biome.pickupInterval > 0) {
      this.pickupTimer -= delta;
      if (this.pickupTimer <= 0) {
        this._spawnPickup(biome);
        this.pickupTimer = biome.pickupInterval;
      }
    }

    this.stageProgress += delta;
    return newEnemies;
  }

  /** Spawn boss when stage is ready. */
  spawnBoss(bossId: number, scene: THREE.Scene): Boss | null {
    if (this.bossSpawned || bossId === null) return null;
    const def = getBossDef(bossId);
    const boss = new Boss(def, scene);
    this.bossSpawned = true;
    return boss;
  }

  /** Check if boss should be spawned based on stage progress. */
  shouldSpawnBoss(biome: BiomeDefinition, stageProgress: number): boolean {
    if (this.bossSpawned || biome.bossId === null) return false;
    // Spawn boss at 80% of stage duration
    return stageProgress >= biome.duration * 0.8;
  }

  /** Reset spawn state for a new stage. */
  reset(): void {
    this.spawnTimer = 0;
    this.bossSpawned = false;
    this.pickupTimer = 0;
    this.stageProgress = 0;
  }

  markBossDefeated(): void {
    this.bossSpawned = true;
  }

  private _spawnPosition(): THREE.Vector3 {
    // Spawn off-screen at the top (positive Y) or sides
    const side = this.rng();
    if (side < 0.6) {
      // Top of screen
      return new THREE.Vector3(
        (this.rng() - 0.5) * 14,
        6 + this.rng() * 2,
        -8 - this.rng() * 4,
      );
    } else if (side < 0.8) {
      // Left side
      return new THREE.Vector3(
        -10 - this.rng() * 2,
        (this.rng() - 0.5) * 6,
        -8 - this.rng() * 4,
      );
    } else {
      // Right side
      return new THREE.Vector3(
        10 + this.rng() * 2,
        (this.rng() - 0.5) * 6,
        -8 - this.rng() * 4,
      );
    }
  }

  private _spawnPickup(_biome: BiomeDefinition): void {
    let type: PickupType;
    const roll = this.rng();
    if (roll < 0.3) {
      type = PickupType.Health;
    } else if (roll < 0.5) {
      type = PickupType.Shield;
    } else if (roll < 0.7) {
      type = PickupType.WeaponUpgrade;
    } else {
      type = PickupType.Score;
    }

    const pos = new THREE.Vector3(
      (this.rng() - 0.5) * 12,
      5 + this.rng() * 2,
      -5 - this.rng() * 3,
    );
    new Pickup(type, pos, this.scene);
  }
}
