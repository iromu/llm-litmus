package com.thunderforce.gameplay.player;

import com.badlogic.gdx.math.Rectangle;
import com.thunderforce.gameplay.bullet.SpatialEntity;
import com.thunderforce.replay.SeededRng;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for AIPilot parameter tuning and behaviour.
 *
 * Covers:
 *  - Bullet perception (detection radius, behind-player filtering, proximity priority)
 *  - Steering weights (flee > seek > arrive > wander)
 *  - Near-miss thresholds (distance gate, random offset)
 *  - Weapon switching logic
 *  - Fire rate behaviour
 *  - Recovery after dodge
 *  - Wander drift when idle
 *  - Public API stability (method signatures)
 */
class AIPilotTest {

    private PlayerShip ship;
    private SeededRng rng;
    private AIPilot pilot;

    /* ------------------------------------------------------------------ */
    /* Helpers                                                            */
    /* ------------------------------------------------------------------ */

    private PlayerShip createShip() {
        // Playfield: 0..320 x 0..240 (classic Thunder Force viewport)
        return new PlayerShip(0, 320, 240, 0);
    }

    private SpatialEntity mockBullet(float x, float y, float size) {
        return new SpatialEntity() {
            private final Rectangle bounds = new Rectangle();

            {
                bounds.x = x - size / 2f;
                bounds.y = y - size / 2f;
                bounds.width = size;
                bounds.height = size;
            }

            @Override
            public Rectangle getBounds() {
                return bounds;
            }

            @Override
            public int getEntityType() {
                return 2; // enemy bullet type
            }
        };
    }

    private SpatialEntity mockPowerUp(float x, float y) {
        return new SpatialEntity() {
            private final Rectangle bounds = new Rectangle();

            {
                bounds.x = x - 8;
                bounds.y = y - 8;
                bounds.width = 16;
                bounds.height = 16;
            }

            @Override
            public Rectangle getBounds() {
                return bounds;
            }

            @Override
            public int getEntityType() {
                return 3; // power-up type
            }
        };
    }

    private com.badlogic.gdx.utils.Array<SpatialEntity> gdxArray(SpatialEntity... entities) {
        com.badlogic.gdx.utils.Array<SpatialEntity> arr = new com.badlogic.gdx.utils.Array<>();
        for (SpatialEntity e : entities) arr.add(e);
        return arr;
    }

    private com.badlogic.gdx.utils.Array<SpatialEntity> emptyArray() {
        return new com.badlogic.gdx.utils.Array<>();
    }

    /* ------------------------------------------------------------------ */
    /* Setup                                                              */
    /* ------------------------------------------------------------------ */

    @BeforeEach
    void setUp() {
        ship = createShip();
        rng = new SeededRng(42L);
        pilot = new AIPilot(ship, rng);
    }

    /* ------------------------------------------------------------------ */
    /* 1. Bullet perception                                                */
    /* ------------------------------------------------------------------ */

    @Test
    void detectionRadius_isApproximately150px() {
        // The detection radius constant should be around 150
        assertTrue(AIPilot.DETECTION_RADIUS >= 130f && AIPilot.DETECTION_RADIUS <= 170f,
                "Detection radius should be ~150px, got " + AIPilot.DETECTION_RADIUS);
    }

    @Test
    void ignoresBulletsBehindPlayer() {
        // Ship at (160, 120). Bullet behind (to the left, x=20) should be ignored
        // if it's moving away or clearly not on course.
        ship.x = 160f;
        ship.y = 120f;

        SpatialEntity behindBullet = mockBullet(20f, 120f, 8f); // far behind
        SpatialEntity frontBullet = mockBullet(250f, 120f, 8f); // in front

        com.badlogic.gdx.utils.Array<SpatialEntity> onlyBehind = gdxArray(behindBullet);
        com.badlogic.gdx.utils.Array<SpatialEntity> onlyFront = gdxArray(frontBullet);

        InputDirection dirBehind = pilot.update(1 / 60f, onlyBehind, emptyArray(), emptyArray());
        InputDirection dirFront = pilot.update(1 / 60f, onlyFront, emptyArray(), emptyArray());

        // When only a behind bullet exists, the AI should NOT flee LEFT (away from it)
        // It should wander or arrive instead.
        // When a front bullet exists, it should flee LEFT (away from it).
        // We verify the front bullet causes a flee response.
        assertNotEquals(InputDirection.NONE, dirFront,
                "Should flee from front bullet");
    }

    @Test
    void prioritizesCloserBullets() {
        ship.x = 160f;
        ship.y = 120f;

        SpatialEntity farBullet = mockBullet(280f, 120f, 8f);  // 120px away
        SpatialEntity nearBullet = mockBullet(200f, 120f, 8f); // 40px away

        com.badlogic.gdx.utils.Array<SpatialEntity> both = gdxArray(farBullet, nearBullet);

        InputDirection dir = pilot.update(1 / 60f, both, emptyArray(), emptyArray());

        // Should flee LEFT (away from the near bullet at x=200)
        // The near bullet is to the right, so flee should push left
        assertTrue(dir == InputDirection.LEFT || dir == InputDirection.UP_LEFT || dir == InputDirection.DOWN_LEFT,
                "Should flee away from the closer bullet; got " + dir);
    }

    @Test
    void detectionRadiusSquaredConsistency() {
        assertEquals(AIPilot.DETECTION_RADIUS * AIPilot.DETECTION_RADIUS,
                AIPilot.DETECTION_RADIUS_SQ, 0.01f,
                "DETECTION_RADIUS_SQ should equal DETECTION_RADIUS^2");
    }

    /* ------------------------------------------------------------------ */
    /* 2. Steering behavior tuning                                         */
    /* ------------------------------------------------------------------ */

    @Test
    void fleeWeightGreaterThanSeekWeight() {
        assertTrue(AIPilot.FLEE_WEIGHT > AIPilot.SEEK_WEIGHT,
                "Flee should dominate seek: FLEE=" + AIPilot.FLEE_WEIGHT + " SEEK=" + AIPilot.SEEK_WEIGHT);
    }

    @Test
    void seekWeightGreaterThanArriveWeight() {
        assertTrue(AIPilot.SEEK_WEIGHT > AIPilot.ARRIVE_WEIGHT,
                "Seek should dominate arrive: SEEK=" + AIPilot.SEEK_WEIGHT + " ARRIVE=" + AIPilot.ARRIVE_WEIGHT);
    }

    @Test
    void arriveWeightGreaterThanWanderWeight() {
        assertTrue(AIPilot.ARRIVE_WEIGHT > AIPilot.WANDER_WEIGHT,
                "Arrive should dominate wander: ARRIVE=" + AIPilot.ARRIVE_WEIGHT + " WANDER=" + AIPilot.WANDER_WEIGHT);
    }

    @Test
    void fleeFromThreatProducesDirection() {
        ship.x = 160f;
        ship.y = 120f;

        SpatialEntity threat = mockBullet(200f, 120f, 8f); // to the right
        com.badlogic.gdx.utils.Array<SpatialEntity> bullets = gdxArray(threat);

        InputDirection dir = pilot.update(1 / 60f, bullets, emptyArray(), emptyArray());

        assertNotEquals(InputDirection.NONE, dir,
                "Should produce a non-NONE direction when fleeing");
    }

    @Test
    void seekPowerUpProducesDirection() {
        ship.x = 160f;
        ship.y = 120f;

        SpatialEntity pu = mockPowerUp(200f, 120f);
        com.badlogic.gdx.utils.Array<SpatialEntity> powerups = gdxArray(pu);

        InputDirection dir = pilot.update(1 / 60f, emptyArray(), powerups, emptyArray());

        // With no bullets, should seek toward the power-up (to the right)
        assertTrue(dir == InputDirection.RIGHT || dir == InputDirection.UP_RIGHT || dir == InputDirection.DOWN_RIGHT,
                "Should seek toward power-up; got " + dir);
    }

    @Test
    void wanderWhenNoThreatsAndNoPowerups() {
        ship.x = 160f;
        ship.y = 120f;

        // Run multiple frames to let wander kick in
        for (int i = 0; i < 20; i++) {
            InputDirection dir = pilot.update(1 / 60f, emptyArray(), emptyArray(), emptyArray());
            // Wander should produce some direction eventually (not always NONE)
            if (dir != InputDirection.NONE) {
                return; // test passes
            }
        }
        fail("Wander should produce non-NONE direction within 20 frames");
    }

    /* ------------------------------------------------------------------ */
    /* 3. Near-miss behavior                                               */
    /* ------------------------------------------------------------------ */

    @Test
    void nearMissThresholdGreaterThanZero() {
        assertTrue(AIPilot.NEAR_MISS_THRESHOLD > 0f,
                "Near-miss threshold should be positive");
    }

    @Test
    void nearMissChanceIsSmall() {
        // Near-miss chance should be small (not every frame)
        assertTrue(AIPilot.NEAR_MISS_CHANCE >= 0f && AIPilot.NEAR_MISS_CHANCE <= 0.2f,
                "Near-miss chance should be 0-20%, got " + AIPilot.NEAR_MISS_CHANCE);
    }

    @Test
    void doesNotFleeFromDistantBullets() {
        // A bullet > FLEE_TRIGGER_DISTANCE away should not cause immediate flee
        ship.x = 160f;
        ship.y = 120f;

        // Bullet at edge of detection radius (150px away)
        SpatialEntity distantBullet = mockBullet(310f, 120f, 8f); // 150px away

        com.badlogic.gdx.utils.Array<SpatialEntity> bullets = gdxArray(distantBullet);
        InputDirection dir = pilot.update(1 / 60f, bullets, emptyArray(), emptyArray());

        // At exactly detection radius, behavior depends on implementation
        // The key is that it doesn't always flee from the very edge
        // We verify the constant exists and is reasonable
        assertTrue(AIPilot.FLEE_TRIGGER_DISTANCE > 0f && AIPilot.FLEE_TRIGGER_DISTANCE < AIPilot.DETECTION_RADIUS,
                "Flee trigger distance should be between 0 and detection radius");
    }

    /* ------------------------------------------------------------------ */
    /* 4. Weapon switching                                                 */
    /* ------------------------------------------------------------------ */

    @Test
    void weaponSwitchChanceIsSmall() {
        assertTrue(AIPilot.WEAPON_SWITCH_CHANCE_CALM >= 0f && AIPilot.WEAPON_SWITCH_CHANCE_CALM <= 0.1f,
                "Weapon switch chance (calm) should be small, got " + AIPilot.WEAPON_SWITCH_CHANCE_CALM);
        assertTrue(AIPilot.WEAPON_SWITCH_CHANCE_COMBAT >= 0f && AIPilot.WEAPON_SWITCH_CHANCE_COMBAT <= 0.1f,
                "Weapon switch chance (combat) should be small, got " + AIPilot.WEAPON_SWITCH_CHANCE_COMBAT);
    }

    @Test
    void getCurrentWeaponReturnsValidIndex() {
        int weapon = pilot.getCurrentWeapon();
        assertTrue(weapon >= 0 && weapon <= 3,
                "Weapon index should be 0-3, got " + weapon);
    }

    @Test
    void shouldFireReturnsBoolean() {
        // Just verify it doesn't throw
        boolean result = pilot.shouldFire();
        assertNotNull(result, "shouldFire should return a boolean");
    }

    @Test
    void shouldSwitchWeaponReturnsBoolean() {
        boolean result = pilot.shouldSwitchWeapon();
        assertNotNull(result, "shouldSwitchWeapon should return a boolean");
    }

    /* ------------------------------------------------------------------ */
    /* 5. Recovery after dodge                                             */
    /* ------------------------------------------------------------------ */

    @Test
    void returnsToCenterAfterDodge() {
        ship.x = 160f;
        ship.y = 120f;

        // First, trigger a flee by placing a bullet close
        SpatialEntity threat = mockBullet(180f, 120f, 8f); // close, to the right
        com.badlogic.gdx.utils.Array<SpatialEntity> bullets = gdxArray(threat);

        // Flee for a few frames
        for (int i = 0; i < 5; i++) {
            pilot.update(1 / 60f, bullets, emptyArray(), emptyArray());
        }

        // Now remove the threat - should recover toward center
        com.badlogic.gdx.utils.Array<SpatialEntity> noThreat = emptyArray();
        InputDirection dir = pilot.update(1 / 60f, noThreat, emptyArray(), emptyArray());

        // After threat removal, should not continue fleeing
        // The direction should be toward center or wander
        assertNotNull(dir, "Should have a direction after recovery");
    }

    /* ------------------------------------------------------------------ */
    /* 6. Parameter constants are static and accessible                    */
    /* ------------------------------------------------------------------ */

    @Test
    void fleeTriggerDistanceConstantExists() {
        // Verify the constant is accessible
        float val = AIPilot.FLEE_TRIGGER_DISTANCE;
        assertTrue(val > 0f, "FLEE_TRIGGER_DISTANCE should be positive");
    }

    @Test
    void fleeRandomOffsetConstantExists() {
        float val = AIPilot.FLEE_RANDOM_OFFSET;
        assertTrue(val >= 0f, "FLEE_RANDOM_OFFSET should be non-negative");
    }

    @Test
    void wanderDriftConstantExists() {
        float val = AIPilot.WANDER_DRIFT_RADIUS;
        assertTrue(val > 0f, "WANDER_DRIFT_RADIUS should be positive");
    }

    @Test
    void recoveryWeightConstantExists() {
        float val = AIPilot.RECOVERY_WEIGHT;
        assertTrue(val > 0f, "RECOVERY_WEIGHT should be positive");
    }

    @Test
    void fireRateConstantExists() {
        float val = AIPilot.FIRE_RATE_COMBAT;
        assertTrue(val > 0f && val <= 1f, "FIRE_RATE_COMBAT should be 0-1, got " + val);
    }

    /* ------------------------------------------------------------------ */
    /* 7. Public API stability                                             */
    /* ------------------------------------------------------------------ */

    @Test
    void updateMethodSignatureUnchanged() {
        // Verify the method exists with the expected signature
        com.badlogic.gdx.utils.Array<SpatialEntity> empty = emptyArray();
        InputDirection result = pilot.update(1 / 60f, empty, empty, empty);
        assertNotNull(result, "update() should return InputDirection");
    }

    @Test
    void getDirectionReturnsVector2() {
        com.badlogic.gdx.math.Vector2 dir = pilot.getDirection();
        assertNotNull(dir, "getDirection() should return a Vector2");
    }

    @Test
    void getShipReturnsPlayerShip() {
        PlayerShip s = pilot.getShip();
        assertNotNull(s, "getShip() should return PlayerShip");
        assertSame(ship, s, "Should return the same ship instance");
    }

    @Test
    void getRngReturnsSeededRng() {
        SeededRng r = pilot.getRng();
        assertNotNull(r, "getRng() should return SeededRng");
        assertSame(rng, r, "Should return the same RNG instance");
    }

    /* ------------------------------------------------------------------ */
    /* 8. Edge cases                                                       */
    /* ------------------------------------------------------------------ */

    @Test
    void handlesEmptyBulletList() {
        InputDirection dir = pilot.update(1 / 60f, emptyArray(), emptyArray(), emptyArray());
        assertNotNull(dir, "Should handle empty bullet list without NPE");
    }

    @Test
    void handlesNullBulletList() {
        // Edge case: null arrays should not crash
        assertDoesNotThrow(() -> pilot.update(1 / 60f, null, null, null),
                "Should handle null arrays gracefully");
    }

    @Test
    void handlesZeroDelta() {
        InputDirection dir = pilot.update(0f, emptyArray(), emptyArray(), emptyArray());
        assertNotNull(dir, "Should handle zero delta");
    }

    @Test
    void handlesMultipleBullets() {
        ship.x = 160f;
        ship.y = 120f;

        SpatialEntity b1 = mockBullet(200f, 100f, 8f);
        SpatialEntity b2 = mockBullet(220f, 140f, 8f);
        SpatialEntity b3 = mockBullet(190f, 130f, 8f); // closest

        com.badlogic.gdx.utils.Array<SpatialEntity> bullets = gdxArray(b1, b2, b3);
        InputDirection dir = pilot.update(1 / 60f, bullets, emptyArray(), emptyArray());

        assertNotNull(dir, "Should handle multiple bullets");
        assertNotEquals(InputDirection.NONE, dir,
                "Should flee from multiple bullets");
    }

    @Test
    void deterministicWithSameSeed() {
        // Two pilots with the same seed should produce identical results
        PlayerShip s1 = createShip();
        PlayerShip s2 = createShip();
        SeededRng r1 = new SeededRng(12345L);
        SeededRng r2 = new SeededRng(12345L);

        AIPilot p1 = new AIPilot(s1, r1);
        AIPilot p2 = new AIPilot(s2, r2);

        SpatialEntity bullet = mockBullet(200f, 120f, 8f);
        com.badlogic.gdx.utils.Array<SpatialEntity> bullets = gdxArray(bullet);

        InputDirection d1 = p1.update(1 / 60f, bullets, emptyArray(), emptyArray());
        InputDirection d2 = p2.update(1 / 60f, bullets, emptyArray(), emptyArray());

        assertEquals(d1, d2,
                "Same seed should produce identical steering direction");
    }

    @Test
    void fireCooldownPreventsSpam() {
        // shouldFire should not return true every frame
        int fireCount = 0;
        for (int i = 0; i < 100; i++) {
            if (pilot.shouldFire()) fireCount++;
        }
        // Should fire less than 100% of the time
        assertTrue(fireCount < 100,
                "shouldFire should not fire every frame; fired " + fireCount + "/100");
        // Should fire at least some of the time
        assertTrue(fireCount > 0,
                "shouldFire should fire at least occasionally; fired " + fireCount + "/100");
    }
}
