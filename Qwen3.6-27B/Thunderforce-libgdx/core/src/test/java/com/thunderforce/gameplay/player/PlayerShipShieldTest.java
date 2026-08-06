package com.thunderforce.gameplay.player;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for PlayerShip shield visual and damage absorption.
 * Covers shield HP, hit flash timer, pulse animation constants,
 * and damage absorption logic.
 */
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
class PlayerShipShieldTest {

    private PlayerShip ship;

    @BeforeEach
    void setUp() {
        ship = new PlayerShip(0, 400, 480, 0);
    }

    // ------------------------------------------------------------------
    // Shield constants
    // ------------------------------------------------------------------

    @Nested
    @DisplayName("Shield constants")
    class ShieldConstantsTests {

        @Test
        void shield_radius_is_positive() {
            assertTrue(PlayerShip.SHIELD_RADIUS > 0,
                    "SHIELD_RADIUS should be positive, was " + PlayerShip.SHIELD_RADIUS);
        }

        @Test
        void shield_radius_larger_than_ship_half_width() {
            assertTrue(PlayerShip.SHIELD_RADIUS > PlayerShip.HALF_W,
                    "SHIELD_RADIUS (" + PlayerShip.SHIELD_RADIUS +
                            ") should be larger than HALF_W (" + PlayerShip.HALF_W + ")");
        }

        @Test
        void shield_line_thickness_is_positive() {
            assertTrue(PlayerShip.SHIELD_LINE_THICKNESS > 0,
                    "SHIELD_LINE_THICKNESS should be positive");
        }

        @Test
        void shield_pulse_period_is_reasonable() {
            // Pulse period should be between 1 and 5 seconds
            assertTrue(PlayerShip.SHIELD_PULSE_PERIOD >= 1.0f &&
                    PlayerShip.SHIELD_PULSE_PERIOD <= 5.0f,
                    "SHIELD_PULSE_PERIOD should be 1-5s, was " + PlayerShip.SHIELD_PULSE_PERIOD);
        }

        @Test
        void shield_pulse_amplitude_is_small() {
            // Pulse amplitude should be small (1-5 pixel range)
            assertTrue(PlayerShip.SHIELD_PULSE_AMPLITUDE > 0 &&
                    PlayerShip.SHIELD_PULSE_AMPLITUDE <= 5.0f,
                    "SHIELD_PULSE_AMPLITUDE should be small, was " + PlayerShip.SHIELD_PULSE_AMPLITUDE);
        }

        @Test
        void shield_hit_flash_duration_is_positive() {
            assertTrue(PlayerShip.SHIELD_HIT_FLASH_DURATION > 0,
                    "SHIELD_HIT_FLASH_DURATION should be positive");
        }

        @Test
        void shield_hexagon_segments_is_six() {
            assertEquals(6, PlayerShip.SHIELD_HEX_SEGMENTS,
                    "SHIELD_HEX_SEGMENTS should be 6 for a hexagon");
        }
    }

    // ------------------------------------------------------------------
    // Shield HP state
    // ------------------------------------------------------------------

    @Nested
    @DisplayName("Shield HP state")
    class ShieldHPTests {

        @Test
        void shield_hp_starts_at_zero() {
            assertEquals(0, ship.getShieldHP());
        }

        @Test
        void addShield_increases_hp() {
            ship.addShield(3);
            assertEquals(3, ship.getShieldHP());
        }

        @Test
        void addShield_caps_at_five() {
            ship.addShield(10);
            assertEquals(5, ship.getShieldHP());
        }

        @Test
        void addShield_partial_then_cap() {
            ship.addShield(3);
            ship.addShield(3);
            assertEquals(5, ship.getShieldHP());
        }

        @Test
        void shield_hp_resets_to_zero() {
            ship.addShield(5);
            ship.reset();
            assertEquals(0, ship.getShieldHP());
        }
    }

    // ------------------------------------------------------------------
    // Shield damage absorption
    // ------------------------------------------------------------------

    @Nested
    @DisplayName("Shield damage absorption")
    class ShieldDamageAbsorptionTests {

        @Test
        void takeDamage_with_shield_decrements_shield() {
            ship.addShield(3);
            boolean damaged = ship.takeDamage();
            assertFalse(damaged, "Should not register damage when shield absorbs");
            assertEquals(2, ship.getShieldHP());
        }

        @Test
        void takeDamage_without_shield_registers_damage() {
            boolean damaged = ship.takeDamage();
            assertTrue(damaged, "Should register damage when no shield");
            assertEquals(0, ship.getShieldHP());
        }

        @Test
        void shield_absorbs_until_depleted_then_damage() {
            ship.addShield(2);
            // First hit: shield absorbs
            assertFalse(ship.takeDamage());
            assertEquals(1, ship.getShieldHP());
            // Second hit: shield absorbs
            assertFalse(ship.takeDamage());
            assertEquals(0, ship.getShieldHP());
            // Third hit: no shield, damage taken
            assertTrue(ship.takeDamage());
        }

        @Test
        void shield_absorb_sets_hit_flash() {
            ship.addShield(3);
            ship.takeDamage();
            assertTrue(ship.isHitFlashing(),
                    "Shield absorb should trigger hit flash");
        }

        @Test
        void shield_absorb_sets_shield_hit_timer() {
            ship.addShield(3);
            ship.takeDamage();
            assertTrue(ship.getShieldHitTimer() > 0,
                    "Shield absorb should set shieldHitTimer > 0");
            assertEquals(PlayerShip.SHIELD_HIT_FLASH_DURATION,
                    ship.getShieldHitTimer(), 0.001f);
        }

        @Test
        void shield_depletes_to_zero_on_last_absorb() {
            ship.addShield(1);
            assertFalse(ship.takeDamage());
            assertEquals(0, ship.getShieldHP());
            assertTrue(ship.getShieldHitTimer() > 0,
                    "Last shield absorb should still set flash timer");
        }

        @Test
        void invincible_ship_does_not_lose_shield() {
            ship.addShield(3);
            // First hit starts invincibility... wait, shield absorbs first
            // Let me test: ship with no shield becomes invincible
            ship.reset();
            assertTrue(ship.takeDamage()); // no shield, becomes invincible
            // Now add shield while invincible
            ship.addShield(2);
            // Try to damage while invincible
            assertFalse(ship.takeDamage());
            assertEquals(2, ship.getShieldHP(),
                    "Shield should not decrement while invincible");
        }
    }

    // ------------------------------------------------------------------
    // Shield hit timer
    // ------------------------------------------------------------------

    @Nested
    @DisplayName("Shield hit timer")
    class ShieldHitTimerTests {

        @Test
        void shield_hit_timer_starts_at_zero() {
            assertEquals(0f, ship.getShieldHitTimer(), 0.001f);
        }

        @Test
        void shield_hit_timer_set_on_shield_absorb() {
            ship.addShield(3);
            ship.takeDamage();
            assertEquals(PlayerShip.SHIELD_HIT_FLASH_DURATION,
                    ship.getShieldHitTimer(), 0.001f);
        }

        @Test
        void shield_hit_timer_decrements_on_update() {
            ship.addShield(3);
            ship.takeDamage();
            float initial = ship.getShieldHitTimer();
            ship.update(0.05f, InputDirection.NONE);
            float after = ship.getShieldHitTimer();
            assertTrue(after < initial,
                    "shieldHitTimer should decrease over time");
            assertEquals(initial - 0.05f, after, 0.001f);
        }

        @Test
        void shield_hit_timer_clamps_to_zero() {
            ship.addShield(3);
            ship.takeDamage();
            // Advance well beyond flash duration
            ship.update(1.0f, InputDirection.NONE);
            assertEquals(0f, ship.getShieldHitTimer(), 0.001f);
        }

        @Test
        void shield_hit_timer_resets_on_reset() {
            ship.addShield(3);
            ship.takeDamage();
            ship.reset();
            assertEquals(0f, ship.getShieldHitTimer(), 0.001f);
        }

        @Test
        void shield_hit_timer_independent_of_hit_flash_timer() {
            ship.addShield(3);
            ship.takeDamage();
            // Both timers should be set
            assertTrue(ship.getShieldHitTimer() > 0,
                    "shieldHitTimer should be > 0 after shield absorb");
            assertTrue(ship.isHitFlashing(),
                    "hitFlashTimer should also be > 0");
            // But they may have different durations
            // shieldHitTimer = SHIELD_HIT_FLASH_DURATION (0.15s)
            // hitFlashTimer = HIT_FLASH_DURATION (0.1s)
            // Advance 0.12s: hitFlash should be 0, shieldHitTimer should be > 0
            ship.update(0.12f, InputDirection.NONE);
            assertFalse(ship.isHitFlashing(),
                    "hitFlashTimer (0.1s) should expire after 0.12s");
            assertTrue(ship.getShieldHitTimer() > 0,
                    "shieldHitTimer (0.15s) should still be active after 0.12s");
        }
    }

    // ------------------------------------------------------------------
    // Shield has visual (hasShield)
    // ------------------------------------------------------------------

    @Nested
    @DisplayName("Shield visibility")
    class ShieldVisibilityTests {

        @Test
        void hasShield_is_false_when_no_shield() {
            assertFalse(ship.hasShield());
        }

        @Test
        void hasShield_is_true_when_shield_hp_positive() {
            ship.addShield(1);
            assertTrue(ship.hasShield());
        }

        @Test
        void hasShield_is_false_after_shield_depleted() {
            ship.addShield(1);
            assertTrue(ship.hasShield());
            ship.takeDamage();
            assertFalse(ship.hasShield());
        }

        @Test
        void hasShield_with_max_shield() {
            ship.addShield(5);
            assertTrue(ship.hasShield());
        }
    }

    // ------------------------------------------------------------------
    // Shield is flashing
    // ------------------------------------------------------------------

    @Nested
    @DisplayName("Shield flash state")
    class ShieldFlashTests {

        @Test
        void isShieldFlashing_is_false_initially() {
            assertFalse(ship.isShieldFlashing());
        }

        @Test
        void isShieldFlashing_is_true_after_shield_absorb() {
            ship.addShield(3);
            ship.takeDamage();
            assertTrue(ship.isShieldFlashing());
        }

        @Test
        void isShieldFlashing_is_false_after_timer_expires() {
            ship.addShield(3);
            ship.takeDamage();
            assertTrue(ship.isShieldFlashing());
            // Advance beyond shield flash duration
            ship.update(1.0f, InputDirection.NONE);
            assertFalse(ship.isShieldFlashing());
        }

        @Test
        void isShieldFlashing_false_when_no_shield_hit() {
            // Direct damage (no shield) should not set shield flash
            ship.takeDamage();
            assertFalse(ship.isShieldFlashing(),
                    "Direct damage should not trigger shield flash");
        }
    }

    // ------------------------------------------------------------------
    // Shield pulse animation state
    // ------------------------------------------------------------------

    @Nested
    @DisplayName("Shield pulse animation")
    class ShieldPulseTests {

        @Test
        void shield_pulse_phase_starts_at_zero() {
            assertEquals(0f, ship.getShieldPulsePhase(), 0.001f);
        }

        @Test
        void shield_pulse_phase_advances_with_time() {
            ship.addShield(3);
            ship.update(0.1f, InputDirection.NONE);
            float phase = ship.getShieldPulsePhase();
            assertTrue(phase > 0, "Pulse phase should advance over time");
        }

        @Test
        void shield_pulse_phase_wraps() {
            ship.addShield(3);
            // Advance 2 seconds (more than one pulse cycle)
            ship.update(2.0f, InputDirection.NONE);
            float phase = ship.getShieldPulsePhase();
            // Phase should wrap within [0, 2PI)
            assertTrue(phase >= 0 && phase < Math.PI * 2,
                    "Pulse phase should wrap within [0, 2PI), was " + phase);
        }

        @Test
        void shield_radius_at_rest_is_close_to_base() {
            ship.addShield(3);
            // At phase 0, sin(0) = 0, so radius = base + 0 = base
            float expectedRadius = PlayerShip.SHIELD_RADIUS;
            float actualRadius = ship.getShieldRenderRadius();
            assertEquals(expectedRadius, actualRadius, 0.01f,
                    "Shield radius at phase 0 should equal base radius");
        }

        @Test
        void shield_radius_varies_with_pulse() {
            ship.addShield(3);
            // Advance to quarter cycle (phase = PI/2, sin = 1)
            // phase = (delta / period) * 2PI
            // For phase = PI/2: delta = period / 4
            float quarterPeriod = PlayerShip.SHIELD_PULSE_PERIOD / 4f;
            ship.update(quarterPeriod, InputDirection.NONE);
            float radius = ship.getShieldRenderRadius();
            float expectedMax = PlayerShip.SHIELD_RADIUS + PlayerShip.SHIELD_PULSE_AMPLITUDE;
            assertEquals(expectedMax, radius, 0.01f,
                    "Shield radius at quarter cycle should be base + amplitude");
        }

        @Test
        void shield_radius_at_half_cycle_returns_to_base() {
            ship.addShield(3);
            // Half cycle: phase = PI, sin(PI) = 0
            float halfPeriod = PlayerShip.SHIELD_PULSE_PERIOD / 2f;
            ship.update(halfPeriod, InputDirection.NONE);
            float radius = ship.getShieldRenderRadius();
            assertEquals(PlayerShip.SHIELD_RADIUS, radius, 0.01f,
                    "Shield radius at half cycle should return to base");
        }

        @Test
        void shield_radius_at_three_quarter_cycle_is_minimum() {
            ship.addShield(3);
            // 3/4 cycle: phase = 3PI/2, sin = -1
            float threeQuarterPeriod = PlayerShip.SHIELD_PULSE_PERIOD * 0.75f;
            ship.update(threeQuarterPeriod, InputDirection.NONE);
            float radius = ship.getShieldRenderRadius();
            float expectedMin = PlayerShip.SHIELD_RADIUS - PlayerShip.SHIELD_PULSE_AMPLITUDE;
            assertEquals(expectedMin, radius, 0.01f,
                    "Shield radius at 3/4 cycle should be base - amplitude");
        }
    }

    // ------------------------------------------------------------------
    // Integration: shield + damage flow
    // ------------------------------------------------------------------

    @Nested
    @DisplayName("Shield + damage integration")
    class ShieldDamageIntegrationTests {

        @Test
        void full_shield_absorbs_five_hits() {
            ship.addShield(5);
            for (int i = 0; i < 5; i++) {
                assertFalse(ship.takeDamage(),
                        "Hit " + (i + 1) + " should be absorbed by shield");
                assertEquals(4 - i, ship.getShieldHP());
            }
        }

        @Test
        void sixth_hit_after_full_shield_registers_damage() {
            ship.addShield(5);
            for (int i = 0; i < 5; i++) {
                ship.takeDamage();
            }
            assertEquals(0, ship.getShieldHP());
            assertTrue(ship.takeDamage(),
                    "6th hit should register as damage");
        }

        @Test
        void shield_reabsorb_after_damage() {
            ship.addShield(2);
            ship.takeDamage(); // shield: 1
            ship.takeDamage(); // shield: 0
            assertTrue(ship.takeDamage()); // damage taken, invincible starts

            // Wait for invincibility to expire
            ship.update(PlayerShip.INVINCIBILITY_DURATION + 0.1f, InputDirection.NONE);

            // Add shield again
            ship.addShield(1);
            assertFalse(ship.takeDamage()); // shield absorbs
            assertEquals(0, ship.getShieldHP());
        }

        @Test
        void shield_hit_timer_and_hit_flash_timer_both_set_on_absorb() {
            ship.addShield(3);
            ship.takeDamage();
            assertTrue(ship.getShieldHitTimer() > 0,
                    "shieldHitTimer should be set");
            assertTrue(ship.isHitFlashing(),
                    "hitFlashTimer should also be set");
        }

        @Test
        void only_hit_flash_set_on_direct_damage() {
            // No shield
            ship.takeDamage();
            assertEquals(0f, ship.getShieldHitTimer(), 0.001f,
                    "shieldHitTimer should NOT be set on direct damage");
            assertTrue(ship.isHitFlashing(),
                    "hitFlashTimer should be set on direct damage");
        }
    }
}
