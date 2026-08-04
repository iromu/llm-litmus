/**
 * Collision detection system
 */
import { aabbCollision } from '../utils/Math';
import { Player } from './Player';
import { Bullet } from './Bullet';
import { Enemy } from './Enemy';
import { Boss } from './Boss';
import { Pickup } from './Pickup';
import { ParticleSystem } from './Particle';

export class CollisionSystem {
  /**
   * Check all collisions and return results
   */
  update(
    player: Player,
    playerBullets: Bullet[],
    enemyBullets: Bullet[],
    enemies: Enemy[],
    boss: Boss | null,
    pickups: Pickup[],
    particles: ParticleSystem
  ): { score: number; destroyed: number } {
    let score = 0;
    let destroyed = 0;

    // Player bullets vs enemies
    for (const bullet of playerBullets) {
      if (!bullet.alive || bullet.hostile || bullet.isLaser) continue;

      // vs regular enemies
      for (const enemy of enemies) {
        if (!enemy.alive || enemy.exploding) continue;
        const eBox = enemy.getBox();
        const bBox = bullet.getBox();
        if (aabbCollision(bBox.x, bBox.y, bBox.w, bBox.h, eBox.x, eBox.y, eBox.w, eBox.h)) {
          bullet.alive = false;
          if (enemy.takeDamage(bullet.level)) {
            score += enemy.score;
            destroyed++;
            particles.explosion(
              enemy.x + enemy.width / 2,
              enemy.y + enemy.height / 2,
              enemy.width > 20 ? 1.5 : 1
            );
          } else {
            particles.impact(bullet.x, bullet.y, 0);
          }
        }
      }

      // vs boss
      if (boss && boss.alive && !boss.destroying) {
        const bBox = bullet.getBox();
        const bossBox = boss.getBox();
        if (aabbCollision(bBox.x, bBox.y, bBox.w, bBox.h, bossBox.x, bossBox.y, bossBox.w, bossBox.h)) {
          bullet.alive = false;
          boss.takeDamage(bullet.level, bullet.x, bullet.y);
          particles.impact(bullet.x, bullet.y, 0);
        }
      }
    }

    // Enemy bullets vs player
    for (const bullet of enemyBullets) {
      if (!bullet.alive || !bullet.hostile) continue;

      const pBox = { x: player.px + 2, y: player.py + 2, w: player.pw - 4, h: player.ph - 4 };
      const bBox = bullet.isLaser
        ? { x: bullet.x, y: bullet.y - 4, w: bullet.laserLength, h: 8 }
        : bullet.getBox();

      if (aabbCollision(bBox.x, bBox.y, bBox.w, bBox.h, pBox.x, pBox.y, pBox.w, pBox.h)) {
        if (bullet.isLaser) {
          bullet.alive = false; // Laser already passed
        } else {
          bullet.alive = false;
        }
        if (player.takeDamage()) {
          particles.explosion(player.px + player.pw / 2, player.py + player.ph / 2, 2,
            [PALETTE.cyan, PALETTE.lightBlue, PALETTE.white]);
        } else {
          // Shield break
          particles.explosion(player.px + player.pw / 2, player.py + player.ph / 2, 1,
            [PALETTE.cyan, PALETTE.white]);
        }
      }
    }

    // Player vs enemies (collision)
    const pBox = { x: player.px + 2, y: player.py + 2, w: player.pw - 4, h: player.ph - 4 };
    for (const enemy of enemies) {
      if (!enemy.alive || enemy.exploding) continue;
      const eBox = enemy.getBox();
      if (aabbCollision(pBox.x, pBox.y, pBox.w, pBox.h, eBox.x, eBox.y, eBox.w, eBox.h)) {
        if (player.takeDamage()) {
          enemy.takeDamage(999);
          score += enemy.score;
          particles.explosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 1.5);
          particles.explosion(player.px + player.pw / 2, player.py + player.ph / 2, 2,
            [PALETTE.cyan, PALETTE.lightBlue, PALETTE.white]);
        }
      }
    }

    // Player vs boss
    if (boss && boss.alive && !boss.destroying) {
      const bossBox = boss.getBox();
      if (aabbCollision(pBox.x, pBox.y, pBox.w, pBox.h, bossBox.x, bossBox.y, bossBox.w, bossBox.h)) {
        player.takeDamage();
        particles.explosion(player.px + player.pw / 2, player.py + player.ph / 2, 2,
          [PALETTE.cyan, PALETTE.lightBlue, PALETTE.white]);
      }
    }

    // Player vs pickups
    const pickupBox = { x: player.px, y: player.py, w: player.pw, h: player.ph };
    for (const pickup of pickups) {
      if (pickup.collected) continue;
      const pBox2 = { x: pickup.x - 4, y: pickup.y - 4, w: 16, h: 16 };
      if (aabbCollision(pickupBox.x, pickupBox.y, pickupBox.w, pickupBox.h, pBox2.x, pBox2.y, pBox2.w, pBox2.h)) {
        pickup.collected = true;
        player.collectPickup(pickup.type);
        particles.explosion(pickup.x + 4, pickup.y + 4, 0.5,
          [PALETTE.yellow, PALETTE.white, PALETTE.cyan]);
      }
    }

    return { score, destroyed };
  }
}

// Import PALETTE for particle colors
import { PALETTE } from '../core/Renderer';
