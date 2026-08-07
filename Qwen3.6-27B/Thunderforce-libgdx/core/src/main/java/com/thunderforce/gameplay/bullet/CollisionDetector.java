package com.thunderforce.gameplay.bullet;

import com.badlogic.gdx.math.Rectangle;
import com.badlogic.gdx.utils.Array;
import com.thunderforce.engine.FixedPool;

/**
 * Collision detection system using spatial hashing for broad-phase
 * and AABB checks for narrow-phase.
 *
 * Uses pooled Collision objects to avoid per-frame allocation.
 */
public class CollisionDetector {

    public static final int PLAYER_ENTITY_TYPE = 0;
    public static final int ENEMY_ENTITY_TYPE = 2;
    public static final int PLAYER_BULLET_ENTITY_TYPE = 3;

    public final GridSpatialHash grid;
    public final Array<SpatialEntity> tempResults;

    private final FixedPool<Collision> collisionPool;
    public final Array<Collision> collisions;

    public CollisionDetector() {
        this.grid = new GridSpatialHash();
        this.tempResults = new Array<>();
        this.collisionPool = new FixedPool<>(64, Collision::create);
        this.collisions = new Array<>(32);
    }

    /**
     * Run all collision checks for the current frame.
     *
     * @param enemyBullets  active enemy bullets
     * @param enemies       active enemies
     * @param playerBullets active player bullets
     * @param player        the player entity
     * @return array of pooled collision pairs (return via {@link #clear()} after use)
     */
    public Array<Collision> update(
            Array<Bullet> enemyBullets,
            Array<SpatialEntity> enemies,
            Array<SpatialEntity> playerBullets,
            SpatialEntity player) {

        collisions.clear();

        checkPlayerBulletsVsEnemies(playerBullets, enemies);
        checkEnemyBulletsVsPlayer(enemyBullets, player);

        return collisions;
    }

    /**
     * Check player bullets against all enemies using spatial hash.
     */
    public Array<Collision> checkPlayerBulletsVsEnemies(
            Array<SpatialEntity> playerBullets,
            Array<SpatialEntity> enemies) {

        grid.clear();
        for (int i = 0; i < enemies.size; i++) {
            grid.insert(enemies.get(i));
        }

        for (int i = 0; i < playerBullets.size; i++) {
            SpatialEntity bullet = playerBullets.get(i);
            Rectangle b = bullet.getBounds();
            grid.query(b.x, b.y, b.width, b.height, tempResults);

            for (int j = 0; j < tempResults.size; j++) {
                SpatialEntity enemy = tempResults.get(j);
                if (enemy.getEntityType() == ENEMY_ENTITY_TYPE) {
                    Rectangle e = enemy.getBounds();
                    if (checkAABB(b, e)) {
                        Collision c = collisionPool.obtain();
                        c.a = bullet;
                        c.b = enemy;
                        collisions.add(c);
                    }
                }
            }
        }
        return collisions;
    }

    /**
     * Check enemy bullets against the player.
     */
    public Array<Collision> checkEnemyBulletsVsPlayer(
            Array<Bullet> enemyBullets,
            SpatialEntity player) {

        Rectangle playerBounds = player.getBounds();

        for (int i = 0; i < enemyBullets.size; i++) {
            Bullet bullet = enemyBullets.get(i);
            if (!bullet.isAlive()) continue;

            Rectangle bulletBounds = bullet.getBounds();
            if (checkAABB(bulletBounds, playerBounds)) {
                Collision c = collisionPool.obtain();
                c.a = bullet;
                c.b = player;
                collisions.add(c);
            }
        }
        return collisions;
    }

    /**
     * Simple AABB overlap check between two rectangles.
     */
    public static boolean checkAABB(Rectangle rect1, Rectangle rect2) {
        return rect1.x < rect2.x + rect2.width
                && rect1.x + rect1.width > rect2.x
                && rect1.y < rect2.y + rect2.height
                && rect1.y + rect1.height > rect2.y;
    }

    /**
     * Clear all recorded collisions and return them to the pool.
     * Must be called after processing collisions to avoid leaks.
     */
    public void clear() {
        for (int i = 0; i < collisions.size; i++) {
            Collision c = collisions.get(i);
            c.a = null;
            c.b = null;
            collisionPool.free(c);
        }
        collisions.clear();
        grid.clear();
        tempResults.clear();
    }

    /**
     * A pooled collision pair between two spatial entities.
     * Do not allocate directly — obtained from CollisionDetector.
     */
    public static class Collision {
        public SpatialEntity a;
        public SpatialEntity b;

        private Collision() {
        }

        static Collision create() {
            return new Collision();
        }
    }
}
