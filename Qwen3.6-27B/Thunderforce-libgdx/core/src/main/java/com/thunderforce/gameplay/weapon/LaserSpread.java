package com.thunderforce.gameplay.weapon;

import com.badlogic.gdx.math.MathUtils;
import com.badlogic.gdx.utils.Array;

/**
 * Laser Spread weapon -- fan of angled beams.
 *
 * Level 1: 3 beams at -15, 0, +15 degrees, 0.2s fire rate, 1 damage
 * Level 2: 4 beams at -20, -7, +7, +20 degrees, 0.15s fire rate, 2 damage
 * Level 3: 5 beams at -25, -12, 0, +12, +25 degrees, 0.12s fire rate, 3 damage
 */
public class LaserSpread extends Weapon {

    private static final float PROJECTILE_SPEED = 350f;

    public LaserSpread() {
        super(WeaponType.LASER_SPREAD, 1);
    }

    @Override
    protected void initStats() {
        switch (powerLevel) {
            case 1:
                fireRate = 0.2f;
                damage = 1f;
                break;
            case 2:
                fireRate = 0.15f;
                damage = 2f;
                break;
            case 3:
                fireRate = 0.12f;
                damage = 3f;
                break;
        }
    }

    @Override
    public Projectile createProjectile(float x, float y) {
        Projectile p = new Projectile(x, y, 0f, -PROJECTILE_SPEED, Projectile.ProjectileType.LASER);
        p.collisionRadius = 2f;
        p.maxLifetime = 1.2f;
        return p;
    }

    @Override
    protected void fire(float playerX, float playerY, Array<Projectile> projectiles) {
        float[] angles;
        switch (powerLevel) {
            case 1:
                angles = new float[]{-15f, 0f, 15f};
                break;
            case 2:
                angles = new float[]{-20f, -7f, 7f, 20f};
                break;
            case 3:
            default:
                angles = new float[]{-25f, -12f, 0f, 12f, 25f};
                break;
        }

        for (int i = 0; i < angles.length; i++) {
            Projectile p = createProjectile(playerX, playerY - 8f);
            p.damage = damage;

            float angleRad = angles[i] * MathUtils.degreesToRadians;
            float vx = (float) (PROJECTILE_SPEED * Math.sin(angleRad));
            float vy = -(float) (PROJECTILE_SPEED * Math.cos(angleRad));
            p.velocity.set(vx, vy);

            projectiles.add(p);
        }
    }
}
