package com.thunderforce.gameplay.bullet;

import com.badlogic.gdx.math.Rectangle;
import com.badlogic.gdx.utils.Array;
import com.thunderforce.engine.FixedPool;

/**
 * Collision detection system using spatial hashing for broad-phase
 * and AABB checks for narrow-phase.
 *
 * Cache-friendly design:
 * - Pre-allocates temp results buffer with fixed capacity
 * - Uses direct cell array access for hot-path collision queries
 * - Pooled Collision objects to avoid per-frame allocation
 * - Separate clear for collisions vs grid (avoids redundant clears)
 */
public class CollisionDetector {

    public static final int PLAYER_ENTITY_TYPE = 0;
    public static final int ENEMY_ENTITY_TYPE = 2;
    public static final int PLAYER_BULLET_ENTITY_TYPE = 3;

    // Max expected entities in a single query (4x4 cell window × 8 per cell = 128)
    private static final int MAX_QUERY_RESULTS = 128;

    public final GridSpatialHash grid;

    // Pre-allocated query results buffer — fixed capacity, no resize
    public final Array<SpatialEntity> tempResults;

    private final FixedPool<Collision> collisionPool;
    public final Array<Collision> collisions;

    public CollisionDetector() {
        this.grid = new GridSpatialHash();
        this.tempResults = new Array<>(true, MAX_QUERY_RESULTS); // noResize=true
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
     * @return array of pooled collision pairs (return via {@link #returnCollisions()} after use)
     */
    public Array<Collision> update(
            Array<Bullet> enemyBullets,
            Array<SpatialEntity> enemies,
            Array<SpatialEntity> playerBullets,
            SpatialEntity player) {

        collisions.clear();
        grid.clear();

        checkPlayerBulletsVsEnemies(playerBullets, enemies);
        checkEnemyBulletsVsPlayer(enemyBullets, player);

        return collisions;
    }

    /**
     * Check player bullets against all enemies using spatial hash.
     * Uses direct cell array access for cache-friendly iteration.
     */
    public Array<Collision> checkPlayerBulletsVsEnemies(
            Array<SpatialEntity> playerBullets,
            Array<SpatialEntity> enemies) {

        // Build spatial index: insert all enemies into grid
        for (int i = 0; i < enemies.size; i++) {
            grid.insert(enemies.get(i));
        }

        // Query each bullet against the grid
        Array<Array<SpatialEntity>> cells = grid.getCells();
        @SuppressWarnings("unchecked")
        Array<SpatialEntity>[] cellsItems = (Array<SpatialEntity>[]) cells.items;

        for (int i = 0; i < playerBullets.size; i++) {
            SpatialEntity bullet = playerBullets.get(i);
            Rectangle b = bullet.getBounds();

            // Compute cell range
            int cellX1 = GridSpatialHash.cellX(b.x);
            int cellY1 = GridSpatialHash.cellY(b.y);
            int cellX2 = GridSpatialHash.cellX(b.x + b.width);
            int cellY2 = GridSpatialHash.cellY(b.y + b.height);

            // Direct cell scan — avoids query() method overhead
            tempResults.clear();
            for (int cy = cellY1; cy <= cellY2; cy++) {
                int rowOffset = cy * GridSpatialHash.GRID_WIDTH;
                for (int cx = cellX1; cx <= cellX2; cx++) {
                    Array<SpatialEntity> cell = cellsItems[rowOffset + cx];
                    for (int j = 0; j < cell.size; j++) {
                        tempResults.add(cell.items[j]);
                    }
                }
            }

            // Narrow-phase: AABB check against candidates
            for (int j = 0; j < tempResults.size; j++) {
                SpatialEntity candidate = tempResults.items[j];
                if (candidate.getEntityType() == ENEMY_ENTITY_TYPE) {
                    Rectangle e = candidate.getBounds();
                    if (checkAABB(b, e)) {
                        Collision c = collisionPool.obtain();
                        c.a = bullet;
                        c.b = candidate;
                        collisions.add(c);
                    }
                }
            }
        }
        return collisions;
    }

    /**
     * Check enemy bullets against the player.
     * Simple linear scan — player is a single entity.
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
     * Return all recorded collisions to the pool and clear the grid.
     * Must be called after processing collisions to avoid pool leaks.
     */
    public void returnCollisions() {
        for (int i = 0; i < collisions.size; i++) {
            Collision c = collisions.items[i];
            c.a = null;
            c.b = null;
            collisionPool.free(c);
        }
        collisions.clear();
    }

    /**
     * Clear the grid for the next frame (separate from collision return).
     * Called at the start of the next update() to avoid redundant clears.
     *
     * @deprecated Use {@link #update} which clears the grid at the start.
     */
    @Deprecated
    public void clear() {
        returnCollisions();
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
