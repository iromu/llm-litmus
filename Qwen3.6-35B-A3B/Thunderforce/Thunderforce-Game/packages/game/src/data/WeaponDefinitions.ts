/** Weapon definitions. */

export enum WeaponId {
  PlasmaStream = 0,
  EnergyDrones,
  LaserSpread,
  LightningBeam,
}

export const WeaponCount = 4;

export interface WeaponDefinition {
  id: WeaponId;
  name: string;
  /** Base damage per tick */
  damage: number;
  /** Fire rate (ticks per second) */
  fireRate: number;
  /** Visual color */
  color: string;
  /** Level 1-3 multipliers */
  levelMultipliers: { damage: number; spread?: number; count?: number; arcs?: number }[];
}

export const WeaponDefinitions: WeaponDefinition[] = [
  {
    id: WeaponId.PlasmaStream,
    name: 'PLASMA STREAM',
    damage: 1,
    fireRate: 10,
    color: '#44ff44',
    levelMultipliers: [
      { damage: 1 },           // Level 1: single beam
      { damage: 1, spread: 3 }, // Level 2: 3-beam spread
      { damage: 2, spread: 3 }, // Level 3: penetrating thick beam
    ],
  },
  {
    id: WeaponId.EnergyDrones,
    name: 'ENERGY DRONES',
    damage: 5,
    fireRate: 1,
    color: '#ffdd44',
    levelMultipliers: [
      { damage: 5, count: 2 },  // Level 1: 2 drones
      { damage: 5, count: 5 },  // Level 2: 5 drones
      { damage: 7, count: 8, arcs: 1 }, // Level 3: 8 drones + chain lightning
    ],
  },
  {
    id: WeaponId.LaserSpread,
    name: 'LASER SPREAD',
    damage: 2,
    fireRate: 8,
    color: '#44ddff',
    levelMultipliers: [
      { damage: 2, spread: 5 },  // Level 1: 5 beams
      { damage: 2, spread: 9 },  // Level 2: 9 beams
      { damage: 3, spread: 9 },  // Level 3: fan pattern
    ],
  },
  {
    id: WeaponId.LightningBeam,
    name: 'LIGHTNING BEAM',
    damage: 15,
    fireRate: 3,
    color: '#aaccff',
    levelMultipliers: [
      { damage: 15 },            // Level 1: single penetrating bolt
      { damage: 15, arcs: 2 },   // Level 2: 2 branch arcs
      { damage: 20, arcs: 4 },   // Level 3: 4 arcs + chain
    ],
  },
];

export function getWeaponDef(id: WeaponId): WeaponDefinition {
  return WeaponDefinitions[id];
}

export interface WeaponState {
  id: WeaponId;
  level: number; // 1, 2, or 3
  active: boolean;
  cooldown: number;
  fireTimer: number;
}
