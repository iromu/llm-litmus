package com.thunderforce.gameplay.weapon;

import com.badlogic.gdx.math.MathUtils;
import com.badlogic.gdx.utils.Array;
import com.thunderforce.gameplay.enemy.Enemy;

/**
 * Homing Drone weapon -- slow projectiles that seek the nearest enemy.
 *
 * Level 1: 1 drone, 0.3s fire rate, 2 damage
 * Level 2: 2 drones, 0.25s fire rate, 3 damage
 * Level 3: 3 drones, 0.2s fire rate, 4 damage
 */
public class HomingDrone extends Weapon {

    private static final float PROJECTILE_SPEED = 200f;
    private static final float TURN_RATE = 3.0f;

    public HomingDrone() {
        super(WeaponType.HOMING_DRONE, 1);
    }

    @Override
    protected void initStats() {
        switch (powerLevel) {
            case 1:
                fireRate = 0.3f;
                damage = 2f;
                break;
            case 2:
                fireRate = 0.25f;
                damage = 3f;
                break;
            case 3:
                fireRate = 0.2f;
                damage = 4f;
                break;
        }
    }

    @Override
    public Projectile createProjectile(float x, float y) {
        Projectile p = new Projectile(x, y, 0f, -PROJECTILE_SPEED, Projectile.ProjectileType.HOMING);
        p.collisionRadius = 3f;
        p.maxLifetime = 4f;
        p.turnRate = TURN_RATE;
        return p;
    }

    @Override
    protected void fire(float playerX, float playerY, Array<Projectile> projectiles) {
        Enemy target = nearestEnemy(playerX, playerY);

        int count = powerLevel;
        float[] offsets = {0f, -6f, 0f, 6f};

        for (int i = 0; i < count; i++) {
            Projectile p = createProjectile(playerX + offsets[i], playerY - 8f);
            p.damage = damage;

            if (target != null) {
                p.targetX = target.x + 8f;
                p.targetY = target.y + 8f;
            } else {
                p.targetY = -100f;
            }

            // Slight horizontal spread per drone
            if (count > 1) {
                float spread = (i - (count - 1) / 2f) * 30f;
                p.velocity.set(spread, -PROJECTILE_SPEED);
            }

            projectiles.add(p);
        }
    }
}
