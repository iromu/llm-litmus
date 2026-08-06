package com.thunderforce.gameplay.bullet;

import com.badlogic.gdx.math.Rectangle;
import com.badlogic.gdx.utils.Array;

/**
 * Collision detection system using spatial hashing for broad-phase
 * and AABB checks for narrow-phase.
 */
public class CollisionDetector {

    public static final int PLAYER_ENTITY_TYPE = 0;
    public static final int ENEMY_ENTITY_TYPE = 2;
    public static final int PLAYER_BULLET_ENTITY_TYPE = 3;

    public final GridSpatialHash grid;
    public final Array<SpatialEntity> tempResults;

    private final Array<Collision> collisions;

    public CollisionDetector() {
        this.grid = new GridSpatialHash();
        this.tempResults = new Array<>();
        this.collisions = new Array<>();
    }

    /**
     * Run all collision checks for the current frame.
     *
     * @param enemyBullets  active enemy bullets
     * @param enemies       active enemies
     * @param playerBullets active player bullets
     * @param player        the player entity
     * @return array of collision pairs
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
     *
     * @param playerBullets array of player bullet entities
     * @param enemies       array of enemy entities
     * @return collisions found
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
                        collisions.add(new Collision(bullet, enemy));
                    }
                }
            }
        }
        return collisions;
    }

    /**
     * Check enemy bullets against the player.
     *
     * @param enemyBullets array of enemy bullets
     * @param player       the player entity
     * @return collisions found
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
                collisions.add(new Collision(bullet, player));
            }
        }
        return collisions;
    }

    /**
     * Simple AABB overlap check between two rectangles.
     *
     * @param rect1 first rectangle
     * @param rect2 second rectangle
     * @return true if rectangles overlap
     */
    public static boolean checkAABB(Rectangle rect1, Rectangle rect2) {
        return rect1.x < rect2.x + rect2.width
                && rect1.x + rect1.width > rect2.x
                && rect1.y < rect2.y + rect2.height
                && rect1.y + rect1.height > rect2.y;
    }

    /**
     * Clear all recorded collisions.
     */
    public void clear() {
        collisions.clear();
        grid.clear();
        tempResults.clear();
    }

    /**
     * A collision pair between two spatial entities.
     */
    public static class Collision {
        public final SpatialEntity a;
        public final SpatialEntity b;

        public Collision(SpatialEntity a, SpatialEntity b) {
            this.a = a;
            this.b = b;
        }
    }
}
