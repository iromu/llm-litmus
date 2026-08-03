/** Biome definitions — data-driven stage configuration. */

export enum BiomeId {
  Title = 'title',
  VolcanicCanyon = 'volcanic',
  FuturisticCity = 'city',
  AsteroidField = 'asteroid',
  AlienFortress = 'fortress',
  GameOver = 'gameover',
}

export interface BiomeDefinition {
  id: BiomeId;
  name: string;
  /** Duration in seconds */
  duration: number;
  /** Scroll speed (world units per second) */
  scrollSpeed: number;
  /** Background color */
  backgroundColor: string;
  /** Fog color */
  fogColor: string;
  /** Fog near/far */
  fogNear: number;
  fogFar: number;
  /** Ambient light color */
  ambientColor: string;
  /** Ambient light intensity */
  ambientIntensity: number;
  /** Directional light color */
  dirLightColor: string;
  /** Directional light intensity */
  dirLightIntensity: number;
  /** Enemy spawn table (indices into enemy definitions) */
  enemyTable: number[];
  /** Boss ID (null = no boss at end) */
  bossId: number | null;
  /** Pickup spawn intervals (seconds) */
  pickupInterval: number;
  /** Title screen specific */
  isTitle?: boolean;
  /** Game over specific */
  isGameOver?: boolean;
}

export const BiomeDefinitions: BiomeDefinition[] = [
  {
    id: BiomeId.Title,
    name: 'TITLE SCREEN',
    duration: 5,
    scrollSpeed: 0,
    backgroundColor: '#000000',
    fogColor: '#000000',
    fogNear: 0,
    fogFar: 100,
    ambientColor: '#333355',
    ambientIntensity: 0.5,
    dirLightColor: '#6666aa',
    dirLightIntensity: 0.3,
    enemyTable: [],
    bossId: null,
    pickupInterval: 0,
    isTitle: true,
  },
  {
    id: BiomeId.VolcanicCanyon,
    name: 'VOLCANIC CANYON',
    duration: 45,
    scrollSpeed: 4.5,
    backgroundColor: '#1a0800',
    fogColor: '#2a1000',
    fogNear: 15,
    fogFar: 50,
    ambientColor: '#442200',
    ambientIntensity: 0.6,
    dirLightColor: '#ff6622',
    dirLightIntensity: 1.5,
    enemyTable: [0, 1, 2, 3, 4, 5],
    bossId: 0, // GIGAMINE-7
    pickupInterval: 6,
  },
  {
    id: BiomeId.FuturisticCity,
    name: 'FUTURISTIC CITY',
    duration: 45,
    scrollSpeed: 5.0,
    backgroundColor: '#050510',
    fogColor: '#0a0a2a',
    fogNear: 18,
    fogFar: 55,
    ambientColor: '#112244',
    ambientIntensity: 0.5,
    dirLightColor: '#4488ff',
    dirLightIntensity: 1.2,
    enemyTable: [6, 7, 8, 9, 10, 11, 12],
    bossId: 1, // ORBITAL-X
    pickupInterval: 5.5,
  },
  {
    id: BiomeId.AsteroidField,
    name: 'ASTEROID FIELD',
    duration: 45,
    scrollSpeed: 5.5,
    backgroundColor: '#050a05',
    fogColor: '#0a1a0a',
    fogNear: 20,
    fogFar: 60,
    ambientColor: '#113322',
    ambientIntensity: 0.4,
    dirLightColor: '#44aa66',
    dirLightIntensity: 1.0,
    enemyTable: [13, 14, 15, 16, 17],
    bossId: 2, // GUARDIAN-PRIME
    pickupInterval: 5,
  },
  {
    id: BiomeId.AlienFortress,
    name: 'ALIEN FORTRESS',
    duration: 45,
    scrollSpeed: 6.0,
    backgroundColor: '#0a0510',
    fogColor: '#1a0a2a',
    fogNear: 15,
    fogFar: 45,
    ambientColor: '#221144',
    ambientIntensity: 0.4,
    dirLightColor: '#8844aa',
    dirLightIntensity: 1.0,
    enemyTable: [18, 19, 20, 21],
    bossId: 3, // CORE-ORGANISM
    pickupInterval: 4.5,
  },
  {
    id: BiomeId.GameOver,
    name: 'GAME OVER',
    duration: 8,
    scrollSpeed: 0,
    backgroundColor: '#000000',
    fogColor: '#000000',
    fogNear: 0,
    fogFar: 100,
    ambientColor: '#220000',
    ambientIntensity: 0.3,
    dirLightColor: '#440000',
    dirLightIntensity: 0.2,
    enemyTable: [],
    bossId: null,
    pickupInterval: 0,
    isGameOver: true,
  },
];

export function getBiome(id: BiomeId): BiomeDefinition {
  return BiomeDefinitions.find(b => b.id === id) ?? BiomeDefinitions[0];
}

export function getBiomeIndex(id: BiomeId): number {
  return Object.values(BiomeId).indexOf(id);
}
