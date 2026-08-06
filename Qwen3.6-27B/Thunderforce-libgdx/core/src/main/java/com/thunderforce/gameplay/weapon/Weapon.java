package com.thunderforce.gameplay.weapon;

import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.utils.Array;
import com.thunderforce.gameplay.enemy.Enemy;

/**
 * Abstract base class for player weapons.
 * Each weapon defines fire rate, damage, and projectile behavior per power level.
 */
public abstract class Weapon {

    public final WeaponType type;
    public int powerLevel;
    public float fireRate;
    public float fireTimer;
    public float damage;

    private final Array<Enemy> targetEnemies;

    public enum WeaponType {
        PLASMA_STREAM,
        HOMING_DRONE,
        LASER_SPREAD,
        LIGHTNING_BEAM
    }

    public Weapon(WeaponType type, int initialPowerLevel) {
        this.type = type;
        this.powerLevel = initialPowerLevel;
        this.fireTimer = 0f;
        this.targetEnemies = new Array<>();
        initStats();
    }

    /**
     * Subclasses define per-level fire rate and damage.
     */
    protected abstract void initStats();

    /**
     * Create one projectile at the given position.
     * Subclasses may override to set velocity, type, homing target, etc.
     */
    public abstract Projectile createProjectile(float x, float y);

    /**
     * Update fire timer and emit projectiles into the given array.
     *
     * @param delta       frame time in seconds
     * @param playerX     player ship centre X
     * @param playerY     player ship centre Y
     * @param projectiles destination array for newly spawned projectiles
     * @param enemies     visible enemies (used for homing targeting)
     */
    public void update(float delta, float playerX, float playerY,
                       Array<Projectile> projectiles, Array<Enemy> enemies) {
        fireTimer -= delta;
        if (fireTimer <= 0f) {
            fireTimer = fireRate;
            targetEnemies.clear();
            targetEnemies.addAll(enemies);
            fire(playerX, playerY, projectiles);
        }
    }

    /**
     * Render debug info (optional override in subclasses).
     */
    public void render(SpriteBatch batch, OrthographicCamera camera) {
    }

    /**
     * Upgrade weapon to next power level (max 3).
     */
    public void upgradePower() {
        if (powerLevel < 3) {
            powerLevel++;
            initStats();
        }
    }

    /**
     * Cycle weapon type to the next enum value.
     */
    public static WeaponType cycleType(WeaponType current) {
        WeaponType[] values = WeaponType.values();
        int next = (current.ordinal() + 1) % values.length;
        return values[next];
    }

    /**
     * Subclasses override to control multi-projectile spread.
     */
    protected void fire(float playerX, float playerY, Array<Projectile> projectiles) {
        Projectile p = createProjectile(playerX, playerY);
        p.damage = damage;
        projectiles.add(p);
    }

    /**
     * Return the nearest alive enemy to (x, y), or null.
     */
    protected Enemy nearestEnemy(float x, float y) {
        Enemy nearest = null;
        float bestDist = Float.MAX_VALUE;
        for (int i = 0; i < targetEnemies.size; i++) {
            Enemy e = targetEnemies.get(i);
            if (!e.alive) continue;
            float dx = e.x + 8f - x;
            float dy = e.y + 8f - y;
            float dist = dx * dx + dy * dy;
            if (dist < bestDist) {
                bestDist = dist;
                nearest = e;
            }
        }
        return nearest;
    }

    public WeaponType getType() {
        return type;
    }

    public int getPowerLevel() {
        return powerLevel;
    }

    public float getFireRate() {
        return fireRate;
    }

    public float getDamage() {
        return damage;
    }
}
