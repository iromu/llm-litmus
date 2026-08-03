/** Boss definitions — 4 bosses (3 regular + 1 final). */

export interface BossPhase {
  /** Phase name */
  name: string;
  /** Duration in seconds (0 = indefinite) */
  duration: number;
  /** Attack pattern type for this phase */
  attackType: string;
  /** Bullet color */
  bulletColor: string;
  /** Bullet speed */
  bulletSpeed: number;
  /** Attack cooldown (seconds) */
  attackCooldown: number;
  /** Movement pattern */
  movePattern: string;
  /** Health for this phase (cumulative) */
  health: number;
}

export interface BossDefinition {
  id: number;
  name: string;
  /** Total health */
  totalHealth: number;
  /** Scale */
  scale: number;
  /** Speed */
  speed: number;
  /** Phases */
  phases: BossPhase[];
  /** Score on destruction */
  scoreValue: number;
  /** Destruction animation duration */
  destructionDuration: number;
}

export const BossDefinitions: BossDefinition[] = [
  {
    id: 0, name: 'GIGAMINE-7',
    totalHealth: 50,
    scale: 2.5,
    speed: 1.0,
    scoreValue: 15000,
    destructionDuration: 3,
    phases: [
      { name: 'Full Operation', duration: 0, attackType: 'drill_laser', bulletColor: '#ff4422', bulletSpeed: 5, attackCooldown: 1.5, movePattern: 'hover', health: 20 },
      { name: 'Drill Destroyed', duration: 0, attackType: 'arm_missiles', bulletColor: '#ff8844', bulletSpeed: 6, attackCooldown: 1.0, movePattern: 'aggressive', health: 15 },
      { name: 'Desperate Core', duration: 0, attackType: 'core_barrage', bulletColor: '#ff2200', bulletSpeed: 7, attackCooldown: 0.5, movePattern: 'erratic', health: 15 },
    ],
  },
  {
    id: 1, name: 'ORBITAL-X',
    totalHealth: 80,
    scale: 3.0,
    speed: 0.8,
    scoreValue: 25000,
    destructionDuration: 4,
    phases: [
      { name: 'Horizontal Sweep', duration: 0, attackType: 'horizontal_spread', bulletColor: '#4488ff', bulletSpeed: 5, attackCooldown: 1.0, movePattern: 'hover', health: 25 },
      { name: 'Transformation', duration: 0, attackType: 'spiral_pattern', bulletColor: '#44aaff', bulletSpeed: 6, attackCooldown: 0.8, movePattern: 'rotate', health: 25 },
      { name: 'Reactor Unleashed', duration: 0, attackType: 'beam_rain', bulletColor: '#2266ff', bulletSpeed: 7, attackCooldown: 0.6, movePattern: 'stationary', health: 30 },
    ],
  },
  {
    id: 2, name: 'GUARDIAN-PRIME',
    totalHealth: 100,
    scale: 2.0,
    speed: 1.5,
    scoreValue: 35000,
    destructionDuration: 5,
    phases: [
      { name: 'Melee Assault', duration: 0, attackType: 'charge_swipe', bulletColor: '#aa44ff', bulletSpeed: 6, attackCooldown: 1.5, movePattern: 'aggressive', health: 30 },
      { name: 'Minion Summon', duration: 0, attackType: 'summon_spread', bulletColor: '#8844aa', bulletSpeed: 4, attackCooldown: 2.0, movePattern: 'orbit', health: 35 },
      { name: 'Full Transformation', duration: 0, attackType: 'bullet_curtain', bulletColor: '#cc44ff', bulletSpeed: 5, attackCooldown: 0.4, movePattern: 'erratic', health: 35 },
    ],
  },
  {
    id: 3, name: 'CORE-ORGANISM',
    totalHealth: 150,
    scale: 4.0,
    speed: 0.5,
    scoreValue: 50000,
    destructionDuration: 6,
    phases: [
      { name: 'Organ Destruction', duration: 0, attackType: 'organ_fire', bulletColor: '#ff4488', bulletSpeed: 4, attackCooldown: 1.0, movePattern: 'pulse', health: 50 },
      { name: 'Counter-Attack', duration: 0, attackType: 'all_organ_fire', bulletColor: '#ff2266', bulletSpeed: 5, attackCooldown: 0.5, movePattern: 'stationary', health: 50 },
      { name: 'Pure Energy', duration: 0, attackType: 'screen_patterns', bulletColor: '#ff88aa', bulletSpeed: 6, attackCooldown: 0.3, movePattern: 'drift', health: 50 },
    ],
  },
];

export function getBossDef(id: number): BossDefinition {
  return BossDefinitions[id];
}
