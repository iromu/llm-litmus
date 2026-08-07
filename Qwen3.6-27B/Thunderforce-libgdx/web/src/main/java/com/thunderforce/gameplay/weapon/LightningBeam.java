package com.thunderforce.gameplay.weapon;

import com.badlogic.gdx.math.MathUtils;
import com.badlogic.gdx.utils.Array;

/**
 * Lightning Beam weapon -- fast, penetrating projectiles that pass through enemies.
 *
 * All levels: 0.15s fire rate
 * Level 1: single beam, 1 damage
 * Level 2: wider beam (larger collision radius), 2 damage
 * Level 3: dual beams with slight spread, 3 damage
 */
public class LightningBeam extends Weapon {

    private static final float PROJECTILE_SPEED = 500f;

    public LightningBeam() {
        super(WeaponType.LIGHTNING_BEAM, 1);
    }

    @Override
    protected void initStats() {
        fireRate = 0.15f;
        switch (powerLevel) {
            case 1:
                damage = 1f;
                break;
            case 2:
                damage = 2f;
                break;
            case 3:
                damage = 3f;
                break;
        }
    }

    @Override
    public Projectile createProjectile(float x, float y) {
        Projectile p = new Projectile(x, y, 0f, -PROJECTILE_SPEED, Projectile.ProjectileType.LIGHTNING);
        p.collisionRadius = 2f;
        p.maxLifetime = 1.0f;
        p.penetrating = true;
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
                Projectile p2 = createProjectile(playerX, playerY - 8f);
                p2.damage = damage;
                p2.collisionRadius = 4f; // wider beam
                projectiles.add(p2);
                break;

            case 3:
            default:
                // Dual beams with slight horizontal spread
                Projectile p3a = createProjectile(playerX - 4f, playerY - 8f);
                p3a.velocity.set(-15f, -PROJECTILE_SPEED);
                p3a.damage = damage;
                projectiles.add(p3a);

                Projectile p3b = createProjectile(playerX + 4f, playerY - 8f);
                p3b.velocity.set(15f, -PROJECTILE_SPEED);
                p3b.damage = damage;
                projectiles.add(p3b);
                break;
        }
    }
}
