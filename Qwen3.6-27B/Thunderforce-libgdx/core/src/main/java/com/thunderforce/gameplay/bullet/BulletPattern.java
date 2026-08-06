package com.thunderforce.gameplay.bullet;

import com.badlogic.gdx.utils.Array;

/**
 * Static factory methods for generating common enemy bullet patterns.
 * All angles are in degrees, 0 = right, increasing clockwise (screen coords).
 */
public final class BulletPattern {

    /** Convert degrees to radians. */
    private static float degToRad(float deg) {
        return (float) (deg * Math.PI / 180.0);
    }

    private BulletPattern() {
    }

    /**
     * Create a spiral of bullets fired from a single origin.
     *
     * @param originX       spawn X
     * @param originY       spawn Y
     * @param bulletCount   number of bullets in the spiral
     * @param speed         pixel/second travel speed
     * @param rotationSpeed degrees per bullet step
     * @param spreadAngle   total arc spread in degrees (ignored for full 360 spiral)
     * @return array of configured bullets
     */
    public static Array<Bullet> createSpiral(float originX, float originY,
            int bulletCount, float speed, float rotationSpeed, float spreadAngle) {
        Array<Bullet> bullets = new Array<>(bulletCount);
        float angleStep = (spreadAngle > 0) ? spreadAngle / Math.max(bulletCount - 1, 1) : rotationSpeed;
        float baseAngle = 0;

        for (int i = 0; i < bulletCount; i++) {
            float angle = degToRad(baseAngle + i * angleStep);
            float vx = (float) Math.cos(angle) * speed;
            float vy = (float) Math.sin(angle) * speed;
            Bullet b = new Bullet(originX, originY, vx, vy, Bullet.BulletType.SPIRAL)
                    .setMaxLifetime(4f);
            bullets.add(b);
        }
        return bullets;
    }

    /**
     * Create a fan/sweep of bullets between two angles.
     *
     * @param originX    spawn X
     * @param originY    spawn Y
     * @param bulletCount number of bullets
     * @param speed      pixel/second travel speed
     * @param startAngle degrees, start of sweep arc
     * @param endAngle   degrees, end of sweep arc
     * @return array of configured bullets
     */
    public static Array<Bullet> createSweep(float originX, float originY,
            int bulletCount, float speed, float startAngle, float endAngle) {
        Array<Bullet> bullets = new Array<>(bulletCount);
        float angleRange = endAngle - startAngle;
        float angleStep = (bulletCount > 1) ? angleRange / (bulletCount - 1) : 0;

        for (int i = 0; i < bulletCount; i++) {
            float angleDeg = startAngle + i * angleStep;
            float angle = degToRad(angleDeg);
            float vx = (float) Math.cos(angle) * speed;
            float vy = (float) Math.sin(angle) * speed;
            Bullet b = new Bullet(originX, originY, vx, vy, Bullet.BulletType.SWEEP)
                    .setMaxLifetime(3.5f);
            bullets.add(b);
        }
        return bullets;
    }

    /**
     * Create bullets aimed at a target position with angular spread.
     *
     * @param originX     spawn X
     * @param originY     spawn Y
     * @param targetX     aim target X
     * @param targetY     aim target Y
     * @param bulletCount number of bullets
     * @param speed       pixel/second travel speed
     * @param spreadAngle total spread in degrees around the aim line
     * @return array of configured bullets
     */
    public static Array<Bullet> createAimedSpread(float originX, float originY,
            float targetX, float targetY, int bulletCount, float speed, float spreadAngle) {
        Array<Bullet> bullets = new Array<>(bulletCount);
        float baseAngle = (float) Math.atan2(targetY - originY, targetX - originX);
        float halfSpread = degToRad(spreadAngle * 0.5f);
        float angleStep = (bulletCount > 1) ? (halfSpread * 2) / (bulletCount - 1) : 0;

        for (int i = 0; i < bulletCount; i++) {
            float angle = baseAngle - halfSpread + i * angleStep;
            float vx = (float) Math.cos(angle) * speed;
            float vy = (float) Math.sin(angle) * speed;
            Bullet b = new Bullet(originX, originY, vx, vy, Bullet.BulletType.AIMED)
                    .setMaxLifetime(3f);
            bullets.add(b);
        }
        return bullets;
    }

    /**
     * Create a single homing bullet that tracks a target position.
     *
     * @param originX  spawn X
     * @param originY  spawn Y
     * @param targetX  target X (the bullet will chase this)
     * @param targetY  target Y
     * @param speed    pixel/second travel speed
     * @param turnRate radians per second max turn rate
     * @return a homing bullet
     */
    public static Bullet createHoming(float originX, float originY,
            float targetX, float targetY, float speed, float turnRate) {
        float angle = (float) Math.atan2(targetY - originY, targetX - originX);
        float vx = (float) Math.cos(angle) * speed;
        float vy = (float) Math.sin(angle) * speed;
        return new Bullet(originX, originY, vx, vy, Bullet.BulletType.HOMING)
                .setMaxLifetime(6f)
                .setCollisionRadius(5f)
                .setTarget(targetX, targetY);
    }

    /**
     * Create a laser warning indicator.
     *
     * @param x1       start point X
     * @param y1       start point Y
     * @param x2       end point X
     * @param y2       end point Y
     * @param duration total fire duration in seconds (after warning)
     * @return a laser warning object
     */
    public static LaserWarning createLaserWarning(float x1, float y1,
            float x2, float y2, float duration) {
        return new LaserWarning(x1, y1, x2, y2, duration);
    }

    /**
     * Create an area denial zone.
     *
     * @param x        center X
     * @param y        center Y
     * @param radius   area radius in pixels
     * @param damage   damage per tick
     * @param lifetime total lifetime in seconds
     * @return an area denial object
     */
    public static AreaDenial createAreaDenial(float x, float y,
            float radius, int damage, float lifetime) {
        return new AreaDenial(x, y, radius, damage, lifetime);
    }
}
