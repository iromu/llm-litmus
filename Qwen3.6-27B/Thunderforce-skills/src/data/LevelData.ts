/**
 * Level data: biome progression, enemy encounters, pickups, and boss triggers
 */
import { Biome } from '../systems/Parallax';
import { BossType } from '../systems/Boss';
import { EnemyType } from '../systems/Enemy';
import { SeededRandom } from '../utils/SeededRandom';
import { CONFIG } from '../core/Config';
import { getEnemiesForBiome as getEnemiesForBiomeData } from './EnemyData';

/**
 * Scripted event in the level
 */
export interface ScriptedEvent {
  worldX: number;
  type: 'enemy_wave' | 'pickup' | 'boss' | 'scroll_change' | 'biome_change' | 'environmental';
  data: any;
}

/**
 * Level definition
 */
export class LevelData {
  private events: ScriptedEvent[] = [];
  private rng: SeededRandom;

  constructor(seed: number = 1) {
    this.rng = new SeededRandom(seed);
    this.generate();
  }

  /**
   * Generate the level with all scripted events
   */
  private generate(): void {
    let worldX = 0;

    // === Title screen / intro ===
    worldX = 0;

    // === Volcanic Canyon (0 - 12000) ===
    worldX = this.generateVolcanicCanyon(worldX);

    // === Boss 1: Mining Machine ===
    this.events.push({
      worldX: worldX,
      type: 'scroll_change',
      data: { speed: CONFIG.SCROLL_SPEED_BOSS },
    });
    this.events.push({
      worldX: worldX + 200,
      type: 'boss',
      data: { type: BossType.MINING_MACHINE },
    });
    worldX += 1200;

    // === Futuristic City (transition) ===
    this.events.push({
      worldX: worldX,
      type: 'scroll_change',
      data: { speed: CONFIG.SCROLL_SPEED },
    });
    this.events.push({
      worldX: worldX,
      type: 'biome_change',
      data: { biome: Biome.CITY },
    });
    worldX = this.generateCitySection(worldX);

    // === Boss 2: Orbital Battleship ===
    this.events.push({
      worldX: worldX,
      type: 'scroll_change',
      data: { speed: CONFIG.SCROLL_SPEED_BOSS },
    });
    this.events.push({
      worldX: worldX + 200,
      type: 'boss',
      data: { type: BossType.ORBITAL_SHIP },
    });
    worldX += 1200;

    // === Asteroid Field (transition) ===
    this.events.push({
      worldX: worldX,
      type: 'scroll_change',
      data: { speed: CONFIG.SCROLL_SPEED_FAST },
    });
    this.events.push({
      worldX: worldX,
      type: 'biome_change',
      data: { biome: Biome.ASTEROID },
    });
    worldX = this.generateAsteroidField(worldX);

    // === Boss 3: Alien Guardian ===
    this.events.push({
      worldX: worldX,
      type: 'scroll_change',
      data: { speed: CONFIG.SCROLL_SPEED_BOSS },
    });
    this.events.push({
      worldX: worldX,
      type: 'biome_change',
      data: { biome: Biome.ORGANIC },
    });
    this.events.push({
      worldX: worldX + 200,
      type: 'boss',
      data: { type: BossType.ALIEN_GUARDIAN },
    });
    worldX += 1400;

    // === Game Over ===
    this.events.push({
      worldX: worldX,
      type: 'scroll_change',
      data: { speed: 0 },
    });
  }

  /**
   * Generate volcanic canyon section
   */
  private generateVolcanicCanyon(startX: number): number {
    let x = startX + 500; // Cinematic fly-in distance

    // Initial pickups
    this.events.push({ worldX: x, type: 'pickup', data: { x, y: 100, type: 'weapon' } });
    x += 300;
    this.events.push({ worldX: x, type: 'pickup', data: { x, y: 80, type: 'shield' } });
    x += 300;

    // Enemy waves
    for (let wave = 0; wave < 8; wave++) {
      x += 400 + this.rng.range(0, 200);
      this.generateEnemyWave(x, Biome.VOLCANIC, wave);
      x += 200;
    }

    // Speed boost pickup
    this.events.push({ worldX: x, type: 'pickup', data: { x, y: 120, type: 'speed' } });
    x += 400;

    // More intense waves
    for (let wave = 0; wave < 5; wave++) {
      x += 300;
      this.generateEnemyWave(x, Biome.VOLCANIC, wave + 8);
      x += 200;
    }

    // Power pickup before boss
    this.events.push({ worldX: x, type: 'pickup', data: { x, y: 100, type: 'power' } });
    x += 500;

    return x;
  }

  /**
   * Generate city section
   */
  private generateCitySection(startX: number): number {
    let x = startX + 500;

    // Pickups
    this.events.push({ worldX: x, type: 'pickup', data: { x, y: 90, type: 'weapon' } });
    x += 300;
    this.events.push({ worldX: x, type: 'pickup', data: { x, y: 110, type: 'shield' } });
    x += 400;

    // Enemy waves
    for (let wave = 0; wave < 10; wave++) {
      x += 350 + this.rng.range(0, 150);
      this.generateEnemyWave(x, Biome.CITY, wave);
      x += 200;
    }

    // Speed change for variety
    this.events.push({ worldX: x, type: 'scroll_change', data: { speed: CONFIG.SCROLL_SPEED_FAST } });
    x += 600;
    this.events.push({ worldX: x, type: 'scroll_change', data: { speed: CONFIG.SCROLL_SPEED } });
    x += 400;

    // Power pickup before boss
    this.events.push({ worldX: x, type: 'pickup', data: { x, y: 100, type: 'power' } });
    x += 500;

    return x;
  }

  /**
   * Generate asteroid field section
   */
  private generateAsteroidField(startX: number): number {
    let x = startX + 500;

    // Pickups
    this.events.push({ worldX: x, type: 'pickup', data: { x, y: 80, type: 'weapon' } });
    x += 300;
    this.events.push({ worldX: x, type: 'pickup', data: { x, y: 130, type: 'shield' } });
    x += 400;

    // Enemy waves
    for (let wave = 0; wave < 10; wave++) {
      x += 350 + this.rng.range(0, 200);
      this.generateEnemyWave(x, Biome.ASTEROID, wave);
      x += 200;
    }

    // Power pickup before boss
    this.events.push({ worldX: x, type: 'pickup', data: { x, y: 100, type: 'power' } });
    x += 500;

    return x;
  }

  /**
   * Generate an enemy wave
   */
  private generateEnemyWave(x: number, biome: Biome, waveIndex: number): void {
    const types = this.getEnemiesForBiome(biome);
    const count = 3 + Math.min(waveIndex, 8);
    const formation = this.rng.pick(['line', 'v', 'spread', 'circle']);

    for (let i = 0; i < count; i++) {
      const type = this.rng.pick(types);
      let ex = x + i * 30;
      let ey: number;

      switch (formation) {
        case 'line':
          ey = 40 + i * 20;
          break;
        case 'v':
          ey = 112 + Math.abs(i - count / 2) * 20;
          ex += Math.abs(i - count / 2) * 20;
          break;
        case 'spread':
          ey = this.rng.range(30, 190);
          ex += this.rng.range(0, 60);
          break;
        case 'circle':
          ey = 112 + Math.sin(i / count * Math.PI * 2) * 40;
          break;
        default:
          ey = 112;
      }

      this.events.push({
        worldX: ex,
        type: 'enemy_wave',
        data: { type, x: ex, y: ey },
      });
    }
  }

  /**
   * Get enemy types for a biome
   */
  private getEnemiesForBiome(biome: Biome): EnemyType[] {
    return getEnemiesForBiomeData(biome);
  }

  /**
   * Get events that should trigger at a given world X position
   */
  getEventsAt(worldX: number, threshold: number = 10): ScriptedEvent[] {
    return this.events.filter(e =>
      e.worldX >= worldX - threshold && e.worldX <= worldX + threshold
    );
  }

  /**
   * Get all events (for debugging)
   */
  getAllEvents(): ScriptedEvent[] {
    return this.events;
  }

  /**
   * Get total level length
   */
  getLength(): number {
    return this.events.length > 0 ? this.events[this.events.length - 1].worldX + 1000 : 0;
  }
}
