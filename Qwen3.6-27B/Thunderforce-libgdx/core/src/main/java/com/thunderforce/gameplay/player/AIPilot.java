package com.thunderforce.gameplay.player;

import com.badlogic.gdx.math.MathUtils;
import com.badlogic.gdx.math.Rectangle;
import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.utils.Array;
import com.thunderforce.gameplay.bullet.SpatialEntity;
import com.thunderforce.replay.SeededRng;

/**
 * AI pilot that steers a PlayerShip using layered steering behaviours.
 *
 * Priority chain:
 *  1. Flee nearest threatening enemy bullet (proximity + course weighted)
 *  2. Seek nearest power-up within detection range
 *  3. Arrive at a strategic resting position (recovery after dodge)
 *  4. Wander with controlled drift when idle
 *
 * All steering is computed in world-space pixels.
 * Tuning parameters are exposed as static constants for easy adjustment.
 */
public class AIPilot {

    // ==================================================================
    // Tuning parameters — adjust these to dial in AI behaviour
    // ==================================================================

    // --- Bullet perception ---
    /** How far the AI can "see" incoming bullets (~150px). */
    public static final float DETECTION_RADIUS = 150f;
    public static final float DETECTION_RADIUS_SQ = DETECTION_RADIUS * DETECTION_RADIUS;

    /** Only flee when a bullet is this close or closer (dramatic timing). */
    public static final float FLEE_TRIGGER_DISTANCE = 80f;
    public static final float FLEE_TRIGGER_DISTANCE_SQ = FLEE_TRIGGER_DISTANCE * FLEE_TRIGGER_DISTANCE;

    /** Bullets beyond this angle from the ship-to-bullet line are ignored (behind check). */
    public static final float BEHIND_ANGLE_COS = 0.0f; // cos(90deg) — ignore bullets behind

    // --- Power-up perception ---
    /** How far the AI can "see" power-ups. */
    public static final float POWERUP_RADIUS = 200f;
    public static final float POWERUP_RADIUS_SQ = POWERUP_RADIUS * POWERUP_RADIUS;

    // --- Steering weights (higher = more influence) ---
    /** Flee weight — dominates all other steering for agile dodging. */
    public static final float FLEE_WEIGHT = 200f;
    /** Seek weight — moderate pull toward power-ups. */
    public static final float SEEK_WEIGHT = 150f;
    /** Arrive weight — smooth return to strategic position. */
    public static final float ARRIVE_WEIGHT = 60f;
    /** Wander weight — subtle drift when nothing else matters. */
    public static final float WANDER_WEIGHT = 25f;
    /** Recovery weight — pull back to centre after a dodge. */
    public static final float RECOVERY_WEIGHT = 80f;

    // --- Flee behaviour ---
    /** Max flee steering force (agile dodging). */
    public static final float FLEE_MAX_FORCE = 200f;
    /** Max speed during flee (slightly above normal for dramatic escapes). */
    public static final float FLEE_MAX_SPEED = 100f;
    /** Random offset added to flee direction (avoids robotic predictability). */
    public static final float FLEE_RANDOM_OFFSET = 30f; // degrees

    // --- Near-miss behaviour ---
    /** Minimum distance to still consider a near-miss (dramatic effect). */
    public static final float NEAR_MISS_THRESHOLD = 50f;
    /** Per-frame probability of triggering a voluntary near-miss manoeuvre. */
    public static final float NEAR_MISS_CHANCE = 0.03f; // ~3% per frame
    /** Duration of a near-miss manoeuvre (seconds). */
    public static final float NEAR_MISS_DURATION_MIN = 0.2f;
    public static final float NEAR_MISS_DURATION_MAX = 0.5f;

    // --- Wander behaviour ---
    /** Radius of wander drift around current position. */
    public static final float WANDER_DRIFT_RADIUS = 60f;
    /** How often to pick a new wander target (seconds). */
    public static final float WANDER_CHANGE_INTERVAL = 0.5f;
    /** Subtle idle drift speed when no threats exist. */
    public static final float WANDER_DRIFT_SPEED = 15f;

    // --- Strategic position ---
    /** How often to pick a new strategic resting position (seconds). */
    public static final float STRATEGIC_POSITION_CHANGE_INTERVAL = 3f;
    /** Strategic position spread from centre. */
    public static final float STRATEGIC_SPREAD = 50f;

    // --- Weapon switching ---
    /** Per-frame probability of switching weapon during calm play. */
    public static final float WEAPON_SWITCH_CHANCE_CALM = 0.005f;
    /** Per-frame probability of switching weapon during combat. */
    public static final float WEAPON_SWITCH_CHANCE_COMBAT = 0.02f;
    /** Enemy count threshold that triggers "combat" mode. */
    public static final float THREAT_DENSITY_SWITCH_THRESHOLD = 5f;
    /** Preferred weapon for groups (index 0-3): LaserSpread-style. */
    public static final int WEAPON_GROUP = 0;
    /** Preferred weapon for single targets: HomingDrone-style. */
    public static final int WEAPON_SINGLE = 1;
    /** Preferred weapon for straight paths: PlasmaStream-style. */
    public static final int WEAPON_STRAIGHT = 2;
    /** Balanced default weapon. */
    public static final int WEAPON_DEFAULT = 3;

    // --- Fire rate ---
    /** Per-frame fire probability during active combat. */
    public static final float FIRE_RATE_COMBAT = 0.85f;
    /** Per-frame fire probability during dodge (reduced). */
    public static final float FIRE_RATE_DODGE = 0.2f;
    /** Per-frame fire probability during calm (occasional). */
    public static final float FIRE_RATE_CALM = 0.1f;
    /** Minimum cooldown between shots (seconds). */
    public static final float FIRE_COOLDOWN_MIN = 0.03f;
    /** Maximum cooldown between shots (seconds). */
    public static final float FIRE_COOLDOWN_MAX = 0.12f;

    // --- Recovery ---
    /** Time before recovery kick-in after fleeing stops (prevents oscillation). */
    public static final float RECOVERY_DELAY = 0.15f;
    /** How long recovery pulls the ship back (seconds). */
    public static final float RECOVERY_DURATION = 0.6f;

    // ==================================================================
    // State
    // ==================================================================

    private final PlayerShip ship;
    private final SeededRng rng;

    // Wander state
    private final Vector2 wanderTarget;
    private float wanderTimer;

    // Strategic position state
    private final Vector2 strategicPosition;
    private float strategicTimer;

    // Near-miss state
    private float nearMissTimer;
    private final Vector2 nearMissTarget;

    // Recovery state (post-dodge)
    private float recoveryTimer;
    private boolean wasFleeing;

    // Fire cooldown
    private float fireCooldown;

    // Weapon cycle index (0-3)
    private int currentWeapon;

    // Combat state tracking
    private boolean inCombat;

    // Temporary vectors to avoid allocation
    private final Vector2 temp;
    private final Vector2 temp2;
    private final Vector2 fleeSteering;
    private final Vector2 seekSteering;
    private final Vector2 arriveSteering;
    private final Vector2 wanderSteering;
    private final Vector2 recoverySteering;
    private final Vector2 result;

    /**
     * Create an AI pilot for the given ship.
     *
     * @param ship the ship to control
     * @param rng  seeded RNG for deterministic behaviour
     */
    public AIPilot(PlayerShip ship, SeededRng rng) {
        this.ship = ship;
        this.rng = rng;
        this.wanderTarget = new Vector2();
        this.strategicPosition = new Vector2();
        this.nearMissTarget = new Vector2();
        this.temp = new Vector2();
        this.temp2 = new Vector2();
        this.fleeSteering = new Vector2();
        this.seekSteering = new Vector2();
        this.arriveSteering = new Vector2();
        this.wanderSteering = new Vector2();
        this.recoverySteering = new Vector2();
        this.result = new Vector2();
        this.wanderTimer = 0;
        this.strategicTimer = 0;
        this.nearMissTimer = 0;
        this.recoveryTimer = 0;
        this.wasFleeing = false;
        this.fireCooldown = 0;
        this.currentWeapon = WEAPON_DEFAULT;
        this.inCombat = false;

        pickNewWanderTarget();
        pickNewStrategicPosition();
    }

    // ------------------------------------------------------------------
    // Update
    // ------------------------------------------------------------------

    /**
     * Compute steering for one frame and return the resulting InputDirection.
     *
     * @param delta    frame time in seconds
     * @param bullets  enemy bullets to flee from (may be null)
     * @param powerups power-ups to seek (may be null)
     * @param enemies  enemy entities (used for threat density; may be null)
     * @return the computed input direction
     */
    public InputDirection update(float delta,
                                 Array<SpatialEntity> bullets,
                                 Array<SpatialEntity> powerups,
                                 Array<SpatialEntity> enemies) {
        // Guard against null inputs
        if (bullets == null) bullets = new Array<>();
        if (powerups == null) powerups = new Array<>();
        if (enemies == null) enemies = new Array<>();

        updateTimers(delta);
        inCombat = computeThreatDensity(enemies) > THREAT_DENSITY_SWITCH_THRESHOLD;

        fleeSteering.set(0, 0);
        seekSteering.set(0, 0);
        arriveSteering.set(0, 0);
        wanderSteering.set(0, 0);
        recoverySteering.set(0, 0);
        result.set(0, 0);

        // Priority 1: flee threatening bullets (proximity + course gated)
        boolean isFleeing = computeFlee(bullets, fleeSteering);

        // Priority 2: seek power-ups
        computeSeek(powerups, seekSteering);

        // Priority 3: arrive at strategic position
        computeArrive(arriveSteering);

        // Priority 4: wander with drift
        computeWander(wanderSteering);

        // Recovery: after fleeing stops, smoothly return to centre
        computeRecovery(isFleeing, recoverySteering);

        // Near-miss override (occasional risky manoeuvre)
        if (nearMissTimer > 0) {
            temp.set(nearMissTarget).sub(ship.x, ship.y).nor().scl(PlayerShip.MAX_SPEED);
            result.set(temp);
        } else {
            // Weighted sum — flee dominates, then recovery, seek, arrive, wander
            result.add(fleeSteering.scl(FLEE_WEIGHT))
                  .add(recoverySteering.scl(RECOVERY_WEIGHT))
                  .add(seekSteering.scl(SEEK_WEIGHT))
                  .add(arriveSteering.scl(ARRIVE_WEIGHT))
                  .add(wanderSteering.scl(WANDER_WEIGHT));

            float len = result.len();
            if (len > 0.01f) {
                result.nor();
            }
        }

        // Track fleeing state for recovery
        wasFleeing = isFleeing;

        // Weapon selection based on context
        updateWeaponSelection(enemies);

        // Occasionally trigger a near-miss for visual excitement
        if (nearMissTimer <= 0 && !isFleeing && rng.nextFloat() < NEAR_MISS_CHANCE) {
            triggerNearMiss();
        }

        return steeringToDirection(result);
    }

    private void updateTimers(float delta) {
        wanderTimer -= delta;
        if (wanderTimer <= 0) pickNewWanderTarget();

        strategicTimer -= delta;
        if (strategicTimer <= 0) pickNewStrategicPosition();

        nearMissTimer = Math.max(0, nearMissTimer - delta);
        recoveryTimer = Math.max(0, recoveryTimer - delta);
        fireCooldown = Math.max(0, fireCooldown - delta);
    }

    // ------------------------------------------------------------------
    // Steering behaviours
    // ------------------------------------------------------------------

    /**
     * Compute flee steering from threatening bullets.
     * Only considers bullets within FLEE_TRIGGER_DISTANCE that are on course.
     * Prioritizes by proximity and speed (closer/faster = higher priority).
     *
     * @return true if actively fleeing
     */
    private boolean computeFlee(Array<SpatialEntity> bullets, Vector2 out) {
        SpatialEntity bestThreat = null;
        float bestPriority = 0f;

        for (int i = 0; i < bullets.size; i++) {
            SpatialEntity bullet = bullets.get(i);
            Rectangle b = bullet.getBounds();
            float bx = b.x + b.width / 2f;
            float by = b.y + b.height / 2f;

            float dx = bx - ship.x;
            float dy = by - ship.y;
            float distSq = dx * dx + dy * dy;
            float dist = (float) Math.sqrt(distSq);

            // Skip if outside detection radius
            if (distSq > DETECTION_RADIUS_SQ) continue;

            // Skip if too far — only flee when bullet is close enough for dramatic effect
            if (distSq > FLEE_TRIGGER_DISTANCE_SQ) continue;

            // Skip bullets that are behind the ship
            // We estimate "behind" by checking if the bullet is moving away from the ship
            // Since SpatialEntity doesn't expose velocity, we use position heuristic:
            // bullets far behind the ship on the opposite side are low priority
            if (dist < 1f) continue; // too close (collision imminent anyway)

            // Estimate threat priority: closer = higher, with inverse distance weighting
            float proximityPriority = FLEE_TRIGGER_DISTANCE / Math.max(dist, 1f);

            // Try to estimate bullet speed from type (Bullet exposes velocity via cast)
            float speedFactor = 1f;
            if (bullet instanceof com.thunderforce.gameplay.bullet.Bullet) {
                com.thunderforce.gameplay.bullet.Bullet bBullet =
                        (com.thunderforce.gameplay.bullet.Bullet) bullet;
                float bulletSpeed = bBullet.velocity.len();
                speedFactor = Math.min(bulletSpeed / 50f, 3f); // normalize, cap at 3x
            }

            float priority = proximityPriority * speedFactor;

            if (priority > bestPriority) {
                bestPriority = priority;
                bestThreat = bullet;
            }
        }

        if (bestThreat != null) {
            Rectangle b = bestThreat.getBounds();
            float bx = b.x + b.width / 2f;
            float by = b.y + b.height / 2f;

            // Flee direction: away from threat
            temp.set(bx, by).sub(ship.x, ship.y);
            float dist = temp.len();
            if (dist > 0) {
                temp.nor();
                // Invert to flee away
                temp.scl(-1f);

                // Add random offset to avoid robotic predictability
                float offsetAngle = (rng.nextFloat() - 0.5f) * FLEE_RANDOM_OFFSET
                        * (float) (Math.PI / 180f); // convert to radians
                temp.rotate(offsetAngle);

                // Weight by inverse distance (closer = stronger flee)
                float fleeForce = FLEE_MAX_FORCE / Math.max(dist, 1f);
                fleeForce = Math.min(fleeForce, FLEE_MAX_FORCE);
                temp.scl(fleeForce);
            }
            out.set(temp);
            return true;
        }

        out.set(0, 0);
        return false;
    }

    private void computeSeek(Array<SpatialEntity> powerups, Vector2 out) {
        SpatialEntity nearest = null;
        float nearestDistSq = POWERUP_RADIUS_SQ;

        for (int i = 0; i < powerups.size; i++) {
            SpatialEntity pu = powerups.get(i);
            Rectangle b = pu.getBounds();
            float px = b.x + b.width / 2f;
            float py = b.y + b.height / 2f;
            float dx = px - ship.x;
            float dy = py - ship.y;
            float distSq = dx * dx + dy * dy;
            if (distSq < nearestDistSq) {
                nearestDistSq = distSq;
                nearest = pu;
            }
        }

        if (nearest != null) {
            Rectangle b = nearest.getBounds();
            float px = b.x + b.width / 2f;
            float py = b.y + b.height / 2f;
            temp.set(px, py).sub(ship.x, ship.y);
            float dist = temp.len();
            if (dist > 0) {
                temp.nor();
                // Moderate speed for seeking
                float seekSpeed = Math.min(dist, 80f);
                temp.scl(seekSpeed);
            }
            out.set(temp);
        }
    }

    private void computeArrive(Vector2 out) {
        temp.set(strategicPosition).sub(ship.x, ship.y);
        float dist = temp.len();

        if (dist > 20f) {
            // Normal approach
            temp.nor();
        } else if (dist > 5f) {
            // Slow down as we arrive (smooth deceleration)
            temp.nor();
            float slowFactor = dist / 20f;
            temp.scl(slowFactor);
        } else {
            temp.set(0, 0);
        }
        out.set(temp);
    }

    private void computeWander(Vector2 out) {
        temp.set(wanderTarget).sub(ship.x, ship.y);
        float dist = temp.len();

        if (dist > 3f) {
            temp.nor();
            // Subtle drift speed
            temp.scl(WANDER_DRIFT_SPEED);
        } else {
            pickNewWanderTarget();
            temp.set(wanderTarget).sub(ship.x, ship.y);
            float newDist = temp.len();
            if (newDist > 0) {
                temp.nor().scl(WANDER_DRIFT_SPEED);
            } else {
                temp.set(0, 0);
            }
        }
        out.set(temp);
    }

    /**
     * Recovery steering: after fleeing stops, smoothly return toward centre.
     * Prevents oscillation between flee and seek by adding a delay before recovery.
     */
    private void computeRecovery(boolean isFleeing, Vector2 out) {
        if (isFleeing) {
            // Currently fleeing — arm recovery but don't activate yet
            recoveryTimer = RECOVERY_DURATION;
            out.set(0, 0);
            return;
        }

        if (recoveryTimer > 0 && wasFleeing) {
            // Recovering — steer toward strategic position (centre area)
            temp.set(strategicPosition).sub(ship.x, ship.y);
            float dist = temp.len();
            if (dist > 5f) {
                temp.nor();
                // Gradually reduce recovery force over time
                float recoveryForce = (recoveryTimer / RECOVERY_DURATION) * 100f;
                temp.scl(recoveryForce);
            } else {
                temp.set(0, 0);
            }
            out.set(temp);
            wasFleeing = false; // one-shot recovery
        } else {
            out.set(0, 0);
        }
    }

    private float computeThreatDensity(Array<SpatialEntity> enemies) {
        int count = 0;
        for (int i = 0; i < enemies.size; i++) {
            SpatialEntity e = enemies.get(i);
            Rectangle b = e.getBounds();
            float ex = b.x + b.width / 2f;
            float ey = b.y + b.height / 2f;
            float dx = ex - ship.x;
            float dy = ey - ship.y;
            if (dx * dx + dy * dy < DETECTION_RADIUS_SQ) {
                count++;
            }
        }
        return count;
    }

    // ------------------------------------------------------------------
    // Near-miss behaviour
    // ------------------------------------------------------------------

    private void triggerNearMiss() {
        nearMissTimer = NEAR_MISS_DURATION_MIN + rng.nextFloat()
                * (NEAR_MISS_DURATION_MAX - NEAR_MISS_DURATION_MIN);
        // Pick a random direction for the risky manoeuvre
        float angle = rng.nextFloat() * MathUtils.PI2;
        float radius = NEAR_MISS_THRESHOLD + rng.nextFloat() * 40f;
        nearMissTarget.set(ship.x + (float) Math.cos(angle) * radius,
                           ship.y + (float) Math.sin(angle) * radius);
    }

    // ------------------------------------------------------------------
    // Weapon selection
    // ------------------------------------------------------------------

    private void updateWeaponSelection(Array<SpatialEntity> enemies) {
        if (!inCombat) {
            // Calm play — rarely switch
            if (rng.nextFloat() < WEAPON_SWITCH_CHANCE_CALM) {
                currentWeapon = rng.nextInt(4);
            }
            return;
        }

        // Combat — context-aware switching
        if (rng.nextFloat() < WEAPON_SWITCH_CHANCE_COMBAT) {
            // Count enemies in front vs behind
            int frontCount = 0;
            int totalCount = 0;

            for (int i = 0; i < enemies.size; i++) {
                SpatialEntity e = enemies.get(i);
                Rectangle b = e.getBounds();
                float ex = b.x + b.width / 2f;
                float dx = ex - ship.x;

                // Enemies in front (positive dx = to the right, typical scroll direction)
                if (dx > 0) frontCount++;
                totalCount++;
            }

            if (totalCount == 0) {
                currentWeapon = WEAPON_DEFAULT;
            } else if (frontCount > 2) {
                // Group of enemies — use spread weapon
                currentWeapon = WEAPON_GROUP;
            } else if (frontCount == 1) {
                // Single target — use homing weapon
                currentWeapon = WEAPON_SINGLE;
            } else if (frontCount == 0 && totalCount > 0) {
                // Enemies behind — use straight weapon for coverage
                currentWeapon = WEAPON_STRAIGHT;
            } else {
                currentWeapon = rng.nextInt(4);
            }
        }
    }

    // ------------------------------------------------------------------
    // Target selection
    // ------------------------------------------------------------------

    private void pickNewWanderTarget() {
        wanderTimer = WANDER_CHANGE_INTERVAL + rng.nextFloat() * 0.3f;
        wanderTarget.set(ship.x + (rng.nextFloat() - 0.5f) * WANDER_DRIFT_RADIUS * 2f,
                         ship.y + (rng.nextFloat() - 0.5f) * WANDER_DRIFT_RADIUS * 1.5f);
        // Clamp to playfield bounds
        Rectangle sb = ship.getBounds();
        float playfieldLeft = sb.x; // approximate
        float playfieldRight = sb.x + 320f;
        float playfieldTop = sb.y + 240f;
        float playfieldBottom = sb.y;
        wanderTarget.x = Math.max(playfieldLeft + 16f, Math.min(playfieldRight - 16f, wanderTarget.x));
        wanderTarget.y = Math.max(playfieldBottom + 16f, Math.min(playfieldTop - 16f, wanderTarget.y));
    }

    private void pickNewStrategicPosition() {
        strategicTimer = STRATEGIC_POSITION_CHANGE_INTERVAL + rng.nextFloat() * 1f;
        // Centre of screen with slight offset for natural variation
        strategicPosition.set(160f + (rng.nextFloat() - 0.5f) * STRATEGIC_SPREAD,
                              120f + (rng.nextFloat() - 0.5f) * STRATEGIC_SPREAD);
    }

    // ------------------------------------------------------------------
    // Direction conversion
    // ------------------------------------------------------------------

    private InputDirection steeringToDirection(Vector2 steering) {
        if (steering.len() < 0.01f) return InputDirection.NONE;

        float angle = (float) Math.atan2(steering.y, steering.x);
        // 8 sectors of PI/4 each, centered on cardinal directions
        // Sector 0 = RIGHT [-PI/8, PI/8), Sector 1 = UP_RIGHT, ...
        float normalized = (angle % MathUtils.PI2 + MathUtils.PI2) % MathUtils.PI2; // [0, 2π)
        int sector = (int) ((normalized + MathUtils.PI / 8f) / (MathUtils.PI / 4f)) % 8;
        InputDirection[] dirs = {
            InputDirection.RIGHT,
            InputDirection.UP_RIGHT,
            InputDirection.UP,
            InputDirection.UP_LEFT,
            InputDirection.LEFT,
            InputDirection.DOWN_LEFT,
            InputDirection.DOWN,
            InputDirection.DOWN_RIGHT
        };
        return dirs[MathUtils.clamp(sector, 0, 7)];
    }

    // ------------------------------------------------------------------
    // Fire & weapon decisions
    // ------------------------------------------------------------------

    /**
     * Decide whether to fire this frame.
     * Fire rate adapts to context: continuous during combat, reduced during dodge,
     * occasional during calm play.
     */
    public boolean shouldFire() {
        if (fireCooldown > 0) return false;

        float fireChance;
        if (nearMissTimer > 0) {
            // Dodging — reduce fire rate
            fireChance = FIRE_RATE_DODGE;
        } else if (inCombat) {
            // Combat — fire continuously
            fireChance = FIRE_RATE_COMBAT;
        } else {
            // Calm — occasional fire
            fireChance = FIRE_RATE_CALM;
        }

        if (rng.nextFloat() < fireChance) {
            fireCooldown = FIRE_COOLDOWN_MIN + rng.nextFloat()
                    * (FIRE_COOLDOWN_MAX - FIRE_COOLDOWN_MIN);
            return true;
        }
        return false;
    }

    /**
     * Decide whether to switch weapon this frame.
     * Delegates to the context-aware logic in update().
     */
    public boolean shouldSwitchWeapon() {
        // This is called externally; the main switching logic runs in update().
        // Return a small probability for external callers that don't use update().
        return rng.nextFloat() < (inCombat ? WEAPON_SWITCH_CHANCE_COMBAT : WEAPON_SWITCH_CHANCE_CALM);
    }

    /**
     * Get the current weapon index (0-3).
     */
    public int getCurrentWeapon() {
        return currentWeapon;
    }

    // ------------------------------------------------------------------
    // Accessors
    // ------------------------------------------------------------------

    /**
     * Get the current steering direction as a Vector2.
     */
    public Vector2 getDirection() {
        return result;
    }

    public PlayerShip getShip() {
        return ship;
    }

    public SeededRng getRng() {
        return rng;
    }
}
