package com.thunderforce.gameplay.enemy;

import com.badlogic.gdx.math.Vector2;

/**
 * Static behavior pattern implementations for Enemy movement.
 * Each method modifies the enemy's velocity directly.
 */
public final class EnemyBehavior {

    private static final float ZIGZAG_AMPLITUDE = 40f;
    private static final float ZIGZAG_FREQUENCY = 3.0f;
    private static final float PATROL_SPEED = 1.5f;
    private static final float AMBUSH_BASE_SPEED = 30f;
    private static final float CHASE_ACCEL = 200f;
    private static final float RETREAT_SPEED = 80f;
    private static final float FORMATION_LERP = 4.0f;

    private EnemyBehavior() {
        // utility class
    }

    /**
     * Sine wave movement: enemy moves left while oscillating vertically.
     */
    public static void zigzag(Enemy enemy, float delta) {
        enemy._zigzagPhase += delta * ZIGZAG_FREQUENCY;
        float zigzagY = (float) Math.sin(enemy._zigzagPhase) * ZIGZAG_AMPLITUDE;
        enemy.velocity.x = -enemy.speed;
        enemy.velocity.y = zigzagY;
    }

    /**
     * Patrol: enemy oscillates around a center point within a range.
     */
    public static void patrol(Enemy enemy, float delta, float patrolCenterX, float patrolCenterY, float range) {
        enemy._patrolPhase += delta * PATROL_SPEED;
        float offsetX = (float) Math.sin(enemy._patrolPhase) * range;
        float offsetY = (float) Math.cos(enemy._patrolPhase * 0.7f) * (range * 0.5f);
        float targetX = patrolCenterX + offsetX;
        float targetY = patrolCenterY + offsetY;

        float dx = targetX - enemy.x;
        float dy = targetY - enemy.y;
        float dist = (float) Math.sqrt(dx * dx + dy * dy);

        if (dist > 1f) {
            enemy.velocity.x = (dx / dist) * enemy.speed;
            enemy.velocity.y = (dy / dist) * enemy.speed;
        } else {
            enemy.velocity.set(0, 0);
        }
    }

    /**
     * Ambush: enemy holds position until player enters trigger distance, then charges.
     *
     * @param triggerDistance pixels at which the ambush triggers
     */
    public static void ambush(Enemy enemy, float delta, float playerX, float playerY, float triggerDistance) {
        float dx = playerX - enemy.x;
        float dy = playerY - enemy.y;
        float dist = (float) Math.sqrt(dx * dx + dy * dy);

        if (dist < triggerDistance) {
            // Charge toward player
            float chargeSpeed = AMBUSH_BASE_SPEED + enemy.speed;
            enemy.velocity.x = (dx / dist) * chargeSpeed;
            enemy.velocity.y = (dy / dist) * chargeSpeed;
        } else {
            // Drift slowly, holding position
            enemy.velocity.x *= 0.95f;
            enemy.velocity.y *= 0.95f;
        }
    }

    /**
     * Chase: enemy accelerates toward the player each frame.
     */
    public static void chase(Enemy enemy, float delta, float playerX, float playerY) {
        float dx = playerX - enemy.x;
        float dy = playerY - enemy.y;
        float dist = (float) Math.sqrt(dx * dx + dy * dy);

        if (dist > 1f) {
            float accel = CHASE_ACCEL * delta;
            enemy.velocity.x += (dx / dist) * accel;
            enemy.velocity.y += (dy / dist) * accel;

            // Clamp to max speed
            float speed = enemy.velocity.len();
            float maxSpeed = enemy.speed * 3f;
            if (speed > maxSpeed) {
                enemy.velocity.scl(maxSpeed / speed);
            }
        }
    }

    /**
     * Retreat: enemy moves away from the player when within retreat distance.
     *
     * @param retreatDistance pixels at which retreat behavior activates
     */
    public static void retreat(Enemy enemy, float delta, float playerX, float playerY, float retreatDistance) {
        float dx = playerX - enemy.x;
        float dy = playerY - enemy.y;
        float dist = (float) Math.sqrt(dx * dx + dy * dy);

        if (dist < retreatDistance) {
            // Move away from player
            float retreatSpeed = RETREAT_SPEED + enemy.speed;
            enemy.velocity.x = -(dx / dist) * retreatSpeed;
            enemy.velocity.y = -(dy / dist) * retreatSpeed;
        } else {
            // Slow drift toward center when player is far
            float centerX = 160f;
            float centerY = 112f;
            float cx = centerX - enemy.x;
            float cy = centerY - enemy.y;
            float cdist = (float) Math.sqrt(cx * cx + cy * cy);
            if (cdist > 1f) {
                enemy.velocity.x = (cx / cdist) * (enemy.speed * 0.5f);
                enemy.velocity.y = (cy / cdist) * (enemy.speed * 0.5f);
            } else {
                enemy.velocity.set(0, 0);
            }
        }
    }

    /**
     * Formation fly: enemy follows a target position relative to a leader.
     *
     * @param formationOffsetX offset X from leader
     * @param formationOffsetY offset Y from leader
     * @param leaderX          leader's current X
     * @param leaderY          leader's current Y
     */
    public static void formationFly(Enemy enemy, float delta, float formationOffsetX,
                                    float formationOffsetY, float leaderX, float leaderY) {
        float targetX = leaderX + formationOffsetX;
        float targetY = leaderY + formationOffsetY;

        float dx = targetX - enemy.x;
        float dy = targetY - enemy.y;
        float dist = (float) Math.sqrt(dx * dx + dy * dy);

        if (dist > 1f) {
            float lerpSpeed = FORMATION_LERP * delta;
            // Clamp lerp to avoid overshooting
            if (lerpSpeed > 1f) lerpSpeed = 1f;
            enemy.velocity.x = dx * lerpSpeed / delta;
            enemy.velocity.y = dy * lerpSpeed / delta;
        } else {
            enemy.velocity.set(0, 0);
        }
    }
}
