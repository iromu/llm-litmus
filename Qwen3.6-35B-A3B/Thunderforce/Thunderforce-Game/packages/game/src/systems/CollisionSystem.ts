import * as THREE from 'three';
import { PlayerShip } from '../entities/PlayerShip.js';
import { Enemy } from '../entities/Enemy.js';
import { Boss } from '../entities/Boss.js';
import { Projectile, ProjectileType } from '../entities/Projectile.js';
import { Pickup } from '../entities/Pickup.js';

/** Collision detection system. */
export class CollisionSystem {
  /** Check circle-circle collision. */
  static circleCollision(
    aPos: THREE.Vector3,
    aRadius: number,
    bPos: THREE.Vector3,
    bRadius: number,
  ): boolean {
    const dx = aPos.x - bPos.x;
    const dy = aPos.y - bPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < aRadius + bRadius;
  }

  /** Check player vs enemy collision. */
  static playerVsEnemy(
    player: PlayerShip,
    enemy: Enemy,
  ): boolean {
    return CollisionSystem.circleCollision(
      player.data.position, 0.4,
      enemy.position, 0.5 * enemy.def.scale,
    );
  }

  /** Check player vs boss collision. */
  static playerVsBoss(
    player: PlayerShip,
    boss: Boss,
  ): boolean {
    return CollisionSystem.circleCollision(
      player.data.position, 0.4,
      boss.position, 1.5 * boss.def.scale,
    );
  }

  /** Check projectile vs entity collision. */
  static projectileVsEntity(
    projectile: Projectile,
    entityPos: THREE.Vector3,
    entityRadius: number,
  ): boolean {
    return CollisionSystem.circleCollision(
      projectile.position, 0.15,
      entityPos, entityRadius,
    );
  }

  /** Check player vs pickup collision. */
  static playerVsPickup(
    player: PlayerShip,
    pickup: Pickup,
  ): boolean {
    return CollisionSystem.circleCollision(
      player.data.position, 0.4,
      pickup.position, 0.3,
    );
  }

  /**
   * Process all collisions between projectiles and enemies/bosses.
   * Returns list of enemies/bosses that were hit.
   */
  static processProjectileHits(
    projectiles: Projectile[],
    enemies: Enemy[],
    bosses: Boss[],
  ): { hitEnemies: Set<Enemy>; hitBosses: Set<Boss> } {
    const hitEnemies = new Set<Enemy>();
    const hitBosses = new Set<Boss>();

    for (const proj of projectiles) {
      if (!proj.alive) continue;
      if (proj.type === ProjectileType.Player) {
        // Check vs enemies
        for (const enemy of enemies) {
          if (!enemy.alive) continue;
          if (CollisionSystem.projectileVsEntity(proj, enemy.position, 0.5 * enemy.def.scale)) {
            enemy.takeDamage(proj.damage);
            hitEnemies.add(enemy);
            if (!proj.penetrating) {
              proj.alive = false;
            }
          }
        }
        // Check vs bosses
        for (const boss of bosses) {
          if (!boss.alive) continue;
          if (CollisionSystem.projectileVsEntity(proj, boss.position, 1.5 * boss.def.scale)) {
            boss.takeDamage(proj.damage);
            hitBosses.add(boss);
            if (!proj.penetrating) {
              proj.alive = false;
            }
          }
        }
      } else {
        // Enemy/boss bullet vs player
        if (proj.type === ProjectileType.Enemy || proj.type === ProjectileType.Boss) {
          // Handled separately in game loop
        }
      }
    }

    return { hitEnemies, hitBosses };
  }

  /**
   * Process enemy bullets vs player.
   * Returns true if player was hit.
   */
  static processEnemyBulletsVsPlayer(
    bullets: Projectile[],
    player: PlayerShip,
  ): boolean {
    let hit = false;
    for (const bullet of bullets) {
      if (!bullet.alive || bullet.type !== ProjectileType.Enemy) continue;
      if (CollisionSystem.projectileVsEntity(bullet, player.data.position, 0.35)) {
        player.takeDamage(bullet.damage);
        bullet.alive = false;
        hit = true;
      }
    }
    return hit;
  }
}
