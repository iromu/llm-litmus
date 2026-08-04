/**
 * Enemy type definitions - 20+ original enemy types
 */
import { EnemyType, EnemyBehavior, AttackPattern } from '../systems/Enemy';
import { Biome } from '../systems/Parallax';
import { PALETTE } from '../core/Renderer';

export const ENEMY_TYPES: EnemyType[] = [
  // === Volcanic Canyon Enemies ===

  // 1. Scorch Fly - Small fast fighter
  {
    name: 'Scorch Fly', hp: 1, score: 100, width: 12, height: 8,
    speed: 3, biomes: [Biome.VOLCANIC],
    behavior: EnemyBehavior.STRAIGHT,
    attackPattern: AttackPattern.NONE,
    colors: [PALETTE.orange, PALETTE.red, PALETTE.yellow],
  },

  // 2. Magma Drifter - Sine wave mover
  {
    name: 'Magma Drifter', hp: 2, score: 150, width: 14, height: 10,
    speed: 2, biomes: [Biome.VOLCANIC],
    behavior: EnemyBehavior.SINE,
    attackPattern: AttackPattern.SINGLE,
    colors: [PALETTE.red, PALETTE.darkRed, PALETTE.orange],
  },

  // 3. Ember Swarm - Small swarming insect
  {
    name: 'Ember Swarm', hp: 1, score: 50, width: 8, height: 8,
    speed: 2.5, biomes: [Biome.VOLCANIC],
    behavior: EnemyBehavior.SWARM,
    attackPattern: AttackPattern.NONE,
    colors: [PALETTE.yellow, PALETTE.orange, PALETTE.red],
  },

  // 4. Lava Crawler - Mechanical insect
  {
    name: 'Lava Crawler', hp: 3, score: 200, width: 16, height: 12,
    speed: 1.5, biomes: [Biome.VOLCANIC],
    behavior: EnemyBehavior.ZIGZAG,
    attackPattern: AttackPattern.SPREAD,
    colors: [PALETTE.darkRed, PALETTE.red, PALETTE.orange],
  },

  // 5. Volcanic Gunship - Heavy cruiser
  {
    name: 'Volcanic Gunship', hp: 5, score: 300, width: 24, height: 16,
    speed: 1, biomes: [Biome.VOLCANIC],
    behavior: EnemyBehavior.HOVER,
    attackPattern: AttackPattern.CURTAIN,
    colors: [PALETTE.brown, PALETTE.darkBrown, PALETTE.orange],
  },

  // 6. Pyro Diver - Dive bomber
  {
    name: 'Pyro Diver', hp: 2, score: 175, width: 12, height: 10,
    speed: 3, biomes: [Biome.VOLCANIC],
    behavior: EnemyBehavior.DIVE,
    attackPattern: AttackPattern.AIMED,
    colors: [PALETTE.orange, PALETTE.yellow, PALETTE.red],
  },

  // 7. Ash Wasp - Mechanical insect
  {
    name: 'Ash Wasp', hp: 1, score: 75, width: 10, height: 8,
    speed: 2.5, biomes: [Biome.VOLCANIC],
    behavior: EnemyBehavior.SWARM,
    attackPattern: AttackPattern.SINGLE,
    colors: [PALETTE.gray, PALETTE.darkGray, PALETTE.orange],
  },

  // 8. Magma Tank - Armored walker
  {
    name: 'Magma Tank', hp: 6, score: 400, width: 20, height: 18,
    speed: 0.8, biomes: [Biome.VOLCANIC],
    behavior: EnemyBehavior.FORMATION,
    attackPattern: AttackPattern.HOMING,
    colors: [PALETTE.darkBrown, PALETTE.brown, PALETTE.red],
  },

  // === Futuristic City Enemies ===

  // 9. Neon Interceptor - Fast city fighter
  {
    name: 'Neon Interceptor', hp: 2, score: 150, width: 12, height: 8,
    speed: 3, biomes: [Biome.CITY],
    behavior: EnemyBehavior.SINE,
    attackPattern: AttackPattern.AIMED,
    colors: [PALETTE.cyan, PALETTE.lightBlue, PALETTE.white],
  },

  // 10. Cyber Hornet - Mechanical insect
  {
    name: 'Cyber Hornet', hp: 1, score: 100, width: 10, height: 8,
    speed: 2.5, biomes: [Biome.CITY],
    behavior: EnemyBehavior.ZIGZAG,
    attackPattern: AttackPattern.SPIRAL,
    colors: [PALETTE.magenta, PALETTE.purple, PALETTE.pink],
  },

  // 11. Steel Sentinel - Heavy cruiser
  {
    name: 'Steel Sentinel', hp: 5, score: 350, width: 22, height: 16,
    speed: 1, biomes: [Biome.CITY],
    behavior: EnemyBehavior.HOVER,
    attackPattern: AttackPattern.SWEEP,
    colors: [PALETTE.steel, PALETTE.steelDark, PALETTE.gray],
  },

  // 12. Data Drone - Small formation unit
  {
    name: 'Data Drone', hp: 1, score: 75, width: 8, height: 8,
    speed: 2, biomes: [Biome.CITY],
    behavior: EnemyBehavior.FORMATION,
    attackPattern: AttackPattern.NONE,
    colors: [PALETTE.neon, PALETTE.cyan, PALETTE.lightBlue],
  },

  // 13. Plasma Carrier - Missile carrier
  {
    name: 'Plasma Carrier', hp: 4, score: 250, width: 18, height: 14,
    speed: 1.2, biomes: [Biome.CITY],
    behavior: EnemyBehavior.CHARGE,
    attackPattern: AttackPattern.HOMING,
    colors: [PALETTE.purple, PALETTE.magenta, PALETTE.pink],
  },

  // 14. Grid Walker - Armored walker
  {
    name: 'Grid Walker', hp: 3, score: 200, width: 16, height: 16,
    speed: 1, biomes: [Biome.CITY],
    behavior: EnemyBehavior.FORMATION,
    attackPattern: AttackPattern.SPREAD,
    colors: [PALETTE.steelDark, PALETTE.steel, PALETTE.gray],
  },

  // 15. Signal Bug - Small swarm unit
  {
    name: 'Signal Bug', hp: 1, score: 50, width: 8, height: 6,
    speed: 3, biomes: [Biome.CITY],
    behavior: EnemyBehavior.SWARM,
    attackPattern: AttackPattern.NONE,
    colors: [PALETTE.cyan, PALETTE.neon, PALETTE.lightBlue],
  },

  // === Asteroid Field Enemies ===

  // 16. Void Raider - Space fighter
  {
    name: 'Void Raider', hp: 2, score: 175, width: 14, height: 10,
    speed: 2, biomes: [Biome.ASTEROID],
    behavior: EnemyBehavior.CIRCLE,
    attackPattern: AttackPattern.AIMED,
    colors: [PALETTE.purple, PALETTE.darkBlue, PALETTE.magenta],
  },

  // 17. Rock Crawler - Asteroid-dwelling insect
  {
    name: 'Rock Crawler', hp: 3, score: 200, width: 16, height: 12,
    speed: 1.5, biomes: [Biome.ASTEROID],
    behavior: EnemyBehavior.ZIGZAG,
    attackPattern: AttackPattern.SPREAD,
    colors: [PALETTE.asteroid, PALETTE.asteroidDark, PALETTE.gray],
  },

  // 18. Meteor Gunship - Heavy cruiser
  {
    name: 'Meteor Gunship', hp: 6, score: 400, width: 24, height: 18,
    speed: 0.8, biomes: [Biome.ASTEROID],
    behavior: EnemyBehavior.HOVER,
    attackPattern: AttackPattern.CURTAIN,
    colors: [PALETTE.asteroidDark, PALETTE.asteroid, PALETTE.darkGray],
  },

  // 19. Void Swarm - Space insect swarm
  {
    name: 'Void Swarm', hp: 1, score: 75, width: 8, height: 8,
    speed: 2.5, biomes: [Biome.ASTEROID],
    behavior: EnemyBehavior.SWARM,
    attackPattern: AttackPattern.SINGLE,
    colors: [PALETTE.darkBlue, PALETTE.purple, PALETTE.magenta],
  },

  // 20. Comet Charger - Fast charge unit
  {
    name: 'Comet Charger', hp: 2, score: 150, width: 12, height: 10,
    speed: 3.5, biomes: [Biome.ASTEROID],
    behavior: EnemyBehavior.CHARGE,
    attackPattern: AttackPattern.NONE,
    colors: [PALETTE.cyan, PALETTE.lightBlue, PALETTE.white],
  },

  // 21. Debris Drone - Small asteroid rider
  {
    name: 'Debris Drone', hp: 1, score: 100, width: 10, height: 8,
    speed: 2, biomes: [Biome.ASTEROID],
    behavior: EnemyBehavior.STRAIGHT,
    attackPattern: AttackPattern.AREA,
    colors: [PALETTE.gray, PALETTE.darkGray, PALETTE.asteroid],
  },

  // === Alien Organic Fortress Enemies ===

  // 22. Spore Fly - Organic flying organism
  {
    name: 'Spore Fly', hp: 1, score: 100, width: 10, height: 10,
    speed: 2, biomes: [Biome.ORGANIC],
    behavior: EnemyBehavior.SINE,
    attackPattern: AttackPattern.SPIRAL,
    colors: [PALETTE.organic, PALETTE.organicDark, PALETTE.neonGreen],
  },

  // 23. Flesh Crawler - Biomechanical organism
  {
    name: 'Flesh Crawler', hp: 3, score: 250, width: 16, height: 14,
    speed: 1.5, biomes: [Biome.ORGANIC],
    behavior: EnemyBehavior.ZIGZAG,
    attackPattern: AttackPattern.HOMING,
    colors: [PALETTE.flesh, PALETTE.fleshDark, PALETTE.organic],
  },

  // 24. Node Guardian - Organic heavy unit
  {
    name: 'Node Guardian', hp: 5, score: 350, width: 22, height: 20,
    speed: 1, biomes: [Biome.ORGANIC],
    behavior: EnemyBehavior.HOVER,
    attackPattern: AttackPattern.CURTAIN,
    colors: [PALETTE.organicDark, PALETTE.organic, PALETTE.flesh],
  },

  // 25. Tendril Swarm - Organic swarm
  {
    name: 'Tendril Swarm', hp: 1, score: 75, width: 8, height: 8,
    speed: 2.5, biomes: [Biome.ORGANIC],
    behavior: EnemyBehavior.SWARM,
    attackPattern: AttackPattern.NONE,
    colors: [PALETTE.neonGreen, PALETTE.organic, PALETTE.green],
  },

  // 26. Bio Charger - Organic charge unit
  {
    name: 'Bio Charger', hp: 2, score: 200, width: 14, height: 12,
    speed: 3, biomes: [Biome.ORGANIC],
    behavior: EnemyBehavior.CHARGE,
    attackPattern: AttackPattern.AIMED,
    colors: [PALETTE.fleshDark, PALETTE.flesh, PALETTE.organic],
  },

  // 27. Membrane Walker - Organic walker
  {
    name: 'Membrane Walker', hp: 4, score: 300, width: 18, height: 16,
    speed: 1, biomes: [Biome.ORGANIC],
    behavior: EnemyBehavior.FORMATION,
    attackPattern: AttackPattern.SPREAD,
    colors: [PALETTE.organic, PALETTE.flesh, PALETTE.neonGreen],
  },
];

/**
 * Get enemy types for a specific biome
 */
export function getEnemiesForBiome(biome: Biome): EnemyType[] {
  return ENEMY_TYPES.filter(e => e.biomes.includes(biome));
}
