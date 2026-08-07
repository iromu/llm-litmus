package com.thunderforce.gameplay.weapon;

import com.badlogic.gdx.utils.Array;
import com.thunderforce.gameplay.enemy.Enemy;

/**
 * Plasma Stream weapon -- straight, fast-firing projectiles.
 *
 * Level 1: single shot, 0.1s fire rate, 1 damage
 * Level 2: double shot (spread), 0.08s fire rate, 2 damage
 * Level 3: triple shot (spread), 0.06s fire rate, 3 damage
 */
public class PlasmaStream extends Weapon {

    private static final float PROJECTILE_SPEED = 400f;

    public PlasmaStream() {
        super(WeaponType.PLASMA_STREAM, 1);
    }

    @Override
    protected void initStats() {
        switch (powerLevel) {
            case 1:
                fireRate = 0.1f;
                damage = 1f;
                break;
            case 2:
                fireRate = 0.08f;
                damage = 2f;
                break;
            case 3:
                fireRate = 0.06f;
                damage = 3f;
                break;
        }
    }

    @Override
    public Projectile createProjectile(float x, float y) {
        Projectile p = new Projectile(x, y, 0f, -PROJECTILE_SPEED, Projectile.ProjectileType.PLASMA);
        p.collisionRadius = 2f;
        p.maxLifetime = 1.5f;
        return p;
    }

    @Override
    protected void fire(float playerX, float playerY, Array<Projectile> projectiles) {
        switch (powerLevel) {
            case 1:
                Projectile p1 = createProjectile(playerX, playerY - 8f);
                p1.damage = damage;
                projectiles.add(p1);
                break;

            case 2:
                Projectile p2a = createProjectile(playerX - 4f, playerY - 8f);
                p2a.velocity.set(-20f, -PROJECTILE_SPEED);
                p2a.damage = damage;
                projectiles.add(p2a);

                Projectile p2b = createProjectile(playerX + 4f, playerY - 8f);
                p2b.velocity.set(20f, -PROJECTILE_SPEED);
                p2b.damage = damage;
                projectiles.add(p2b);
                break;

            case 3:
                Projectile p3a = createProjectile(playerX - 6f, playerY - 8f);
                p3a.velocity.set(-30f, -PROJECTILE_SPEED);
                p3a.damage = damage;
                projectiles.add(p3a);

                Projectile p3b = createProjectile(playerX, playerY - 8f);
                p3b.damage = damage;
                projectiles.add(p3b);

                Projectile p3c = createProjectile(playerX + 6f, playerY - 8f);
                p3c.velocity.set(30f, -PROJECTILE_SPEED);
                p3c.damage = damage;
                projectiles.add(p3c);
                break;
        }
    }
}
