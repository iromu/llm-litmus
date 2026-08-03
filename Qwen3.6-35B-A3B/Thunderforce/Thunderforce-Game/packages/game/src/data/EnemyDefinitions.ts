/** Enemy type definitions — 22 enemy types. */

export interface EnemyDefinition {
  id: number;
  name: string;
  /** Health points */
  health: number;
  /** Speed (world units per second) */
  speed: number;
  /** Score value on destruction */
  scoreValue: number;
  /** Sprite scale */
  scale: number;
  /** Bullet material color */
  bulletColor: string;
  /** Bullet speed */
  bulletSpeed: number;
  /** Attack cooldown (seconds) */
  attackCooldown: number;
  /** Attack pattern type */
  attackType: AttackPatternType;
  /** Movement pattern type */
  moveType: MovePatternType;
  /** Size category for rendering */
  size: 'small' | 'medium' | 'large';
}

export type AttackPatternType =
  | 'single'
  | 'spread'
  | 'homing'
  | 'ring'
  | 'burst'
  | 'pinch'
  | 'shield'
  | 'cross'
  | 'spiral'
  | 'focused'
  | 'cloud'
  | 'mine'
  | 'triple'
  | 'bounce'
  | 'emp';

export type MovePatternType =
  | 'zigzag'
  | 'dive'
  | 'orbit'
  | 'sweep'
  | 'stationary'
  | 'erratic'
  | 'armored'
  | 'swarm'
  | 'hover'
  | 'charging'
  | 'strafe'
  | 'organic'
  | 'drone';

export const EnemyDefinitions: EnemyDefinition[] = [
  // Volcanic Canyon enemies (E01-E06)
  {
    id: 0, name: 'Spark Wing', health: 1, speed: 3.0, scoreValue: 100,
    scale: 0.6, bulletColor: '#ff4444', bulletSpeed: 4, attackCooldown: 2.0,
    attackType: 'spread', moveType: 'zigzag', size: 'small',
  },
  {
    id: 1, name: 'Ember Dart', health: 1, speed: 4.0, scoreValue: 150,
    scale: 0.5, bulletColor: '#ff6622', bulletSpeed: 5, attackCooldown: 2.5,
    attackType: 'homing', moveType: 'dive', size: 'small',
  },
  {
    id: 2, name: 'Cinder Fly', health: 1, speed: 2.5, scoreValue: 120,
    scale: 0.5, bulletColor: '#ffaa22', bulletSpeed: 3.5, attackCooldown: 3.0,
    attackType: 'ring', moveType: 'orbit', size: 'small',
  },
  {
    id: 3, name: 'Blaze Runner', health: 2, speed: 5.0, scoreValue: 200,
    scale: 0.7, bulletColor: '#ff2222', bulletSpeed: 5.5, attackCooldown: 1.5,
    attackType: 'burst', moveType: 'sweep', size: 'small',
  },
  {
    id: 4, name: 'Warhead Carrier', health: 3, speed: 1.5, scoreValue: 500,
    scale: 1.0, bulletColor: '#ff8844', bulletSpeed: 3, attackCooldown: 4.0,
    attackType: 'spread', moveType: 'stationary', size: 'medium',
  },
  {
    id: 5, name: 'Lava Walker', health: 4, speed: 0.5, scoreValue: 400,
    scale: 1.2, bulletColor: '#ff4400', bulletSpeed: 4, attackCooldown: 3.0,
    attackType: 'burst', moveType: 'stationary', size: 'medium',
  },
  // Futuristic City enemies (E07-E13)
  {
    id: 6, name: 'Gear Wasp', health: 2, speed: 4.5, scoreValue: 300,
    scale: 0.6, bulletColor: '#44ddff', bulletSpeed: 5, attackCooldown: 1.5,
    attackType: 'pinch', moveType: 'erratic', size: 'small',
  },
  {
    id: 7, name: 'Chrome Beetle', health: 5, speed: 2.0, scoreValue: 600,
    scale: 0.9, bulletColor: '#aabbcc', bulletSpeed: 4, attackCooldown: 2.5,
    attackType: 'shield', moveType: 'zigzag', size: 'medium',
  },
  {
    id: 8, name: 'Alloy Mantis', health: 3, speed: 3.5, scoreValue: 450,
    scale: 0.8, bulletColor: '#88ffaa', bulletSpeed: 5.5, attackCooldown: 2.0,
    attackType: 'cross', moveType: 'sweep', size: 'medium',
  },
  {
    id: 9, name: 'Ironclad Cruiser', health: 8, speed: 1.0, scoreValue: 1500,
    scale: 1.5, bulletColor: '#ff4488', bulletSpeed: 4.5, attackCooldown: 3.0,
    attackType: 'spread', moveType: 'stationary', size: 'large',
  },
  {
    id: 10, name: 'Titan Frame', health: 10, speed: 0.8, scoreValue: 2000,
    scale: 1.8, bulletColor: '#ff8844', bulletSpeed: 3.5, attackCooldown: 2.0,
    attackType: 'spiral', moveType: 'stationary', size: 'large',
  },
  {
    id: 11, name: 'Bastion Class', health: 12, speed: 0.5, scoreValue: 2500,
    scale: 1.6, bulletColor: '#ff2244', bulletSpeed: 6, attackCooldown: 4.0,
    attackType: 'focused', moveType: 'stationary', size: 'large',
  },
  {
    id: 12, name: 'Drone Hive', health: 4, speed: 2.0, scoreValue: 800,
    scale: 1.0, bulletColor: '#44ffaa', bulletSpeed: 3, attackCooldown: 2.0,
    attackType: 'burst', moveType: 'drone', size: 'medium',
  },
  // Asteroid Field enemies (E14-E18)
  {
    id: 13, name: 'Fortress Gunship', health: 8, speed: 1.5, scoreValue: 2000,
    scale: 1.4, bulletColor: '#ffaa44', bulletSpeed: 4, attackCooldown: 2.5,
    attackType: 'ring', moveType: 'hover', size: 'large',
  },
  {
    id: 14, name: 'Siege Breaker', health: 10, speed: 3.0, scoreValue: 2500,
    scale: 1.5, bulletColor: '#ffdd44', bulletSpeed: 8, attackCooldown: 5.0,
    attackType: 'focused', moveType: 'charging', size: 'large',
  },
  {
    id: 15, name: 'Wardog Interceptor', health: 5, speed: 6.0, scoreValue: 1500,
    scale: 0.9, bulletColor: '#ff6644', bulletSpeed: 6, attackCooldown: 1.5,
    attackType: 'spread', moveType: 'strafe', size: 'medium',
  },
  {
    id: 16, name: 'Spore Cruiser', health: 6, speed: 1.2, scoreValue: 1200,
    scale: 1.1, bulletColor: '#88ff44', bulletSpeed: 3, attackCooldown: 3.0,
    attackType: 'cloud', moveType: 'organic', size: 'medium',
  },
  {
    id: 17, name: 'Mine Layer', health: 3, speed: 1.8, scoreValue: 700,
    scale: 0.8, bulletColor: '#ffaa88', bulletSpeed: 2, attackCooldown: 4.0,
    attackType: 'mine', moveType: 'zigzag', size: 'medium',
  },
  // Alien Fortress enemies (E19-E22)
  {
    id: 18, name: 'Guardian Scout', health: 4, speed: 5.0, scoreValue: 1000,
    scale: 0.7, bulletColor: '#aa44ff', bulletSpeed: 5.5, attackCooldown: 1.0,
    attackType: 'triple', moveType: 'erratic', size: 'small',
  },
  {
    id: 19, name: 'Flesh Turret', health: 6, speed: 0, scoreValue: 800,
    scale: 1.0, bulletColor: '#ff44aa', bulletSpeed: 4, attackCooldown: 2.0,
    attackType: 'spiral', moveType: 'stationary', size: 'medium',
  },
  {
    id: 20, name: 'Spore Launcher', health: 5, speed: 0.5, scoreValue: 900,
    scale: 1.1, bulletColor: '#44ff88', bulletSpeed: 3, attackCooldown: 3.5,
    attackType: 'bounce', moveType: 'stationary', size: 'medium',
  },
  {
    id: 21, name: 'Pulse Weaver', health: 7, speed: 1.0, scoreValue: 1200,
    scale: 1.0, bulletColor: '#ff44ff', bulletSpeed: 5, attackCooldown: 5.0,
    attackType: 'emp', moveType: 'organic', size: 'medium',
  },
];

export function getEnemyDef(id: number): EnemyDefinition {
  return EnemyDefinitions[id];
}
