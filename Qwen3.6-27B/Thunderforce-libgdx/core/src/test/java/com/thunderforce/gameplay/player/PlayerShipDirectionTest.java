package com.thunderforce.gameplay.player;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for PlayerShip 4-directional sprite animation system.
 * Covers direction tracking, engine animation, and default state.
 */
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
class PlayerShipDirectionTest {

    private PlayerShip ship;

    @BeforeEach
    void setUp() {
        ship = new PlayerShip(0, 400, 480, 0);
    }

    // ------------------------------------------------------------------
    // Direction enum
    // ------------------------------------------------------------------

    @Nested
    @DisplayName("Direction enum")
    class DirectionEnumTests {

        @Test
        void has_four_cardinal_values() {
            assertArrayEquals(
                    new PlayerShip.Direction[]{
                            PlayerShip.Direction.UP,
                            PlayerShip.Direction.DOWN,
                            PlayerShip.Direction.LEFT,
                            PlayerShip.Direction.RIGHT
                    },
                    PlayerShip.Direction.values()
            );
        }

        @Test
        void up_direction_exists() {
            assertNotNull(PlayerShip.Direction.UP);
        }

        @Test
        void down_direction_exists() {
            assertNotNull(PlayerShip.Direction.DOWN);
        }

        @Test
        void left_direction_exists() {
            assertNotNull(PlayerShip.Direction.LEFT);
        }

        @Test
        void right_direction_exists() {
            assertNotNull(PlayerShip.Direction.RIGHT);
        }
    }

    // ------------------------------------------------------------------
    // Default facing direction
    // ------------------------------------------------------------------

    @Nested
    @DisplayName("Default facing direction")
    class DefaultFacingTests {

        @Test
        void defaults_to_UP_on_creation() {
            assertEquals(PlayerShip.Direction.UP, ship.getFacingDirection());
        }

        @Test
        void defaults_to_UP_after_reset() {
            ship.update(0.016f, InputDirection.RIGHT);
            ship.reset();
            assertEquals(PlayerShip.Direction.UP, ship.getFacingDirection());
        }
    }

    // ------------------------------------------------------------------
    // Facing direction tracking
    // ------------------------------------------------------------------

    @Nested
    @DisplayName("Facing direction tracking")
    class FacingDirectionTests {

        @Test
        void updates_to_UP_when_input_is_UP() {
            ship.update(0.016f, InputDirection.UP);
            assertEquals(PlayerShip.Direction.UP, ship.getFacingDirection());
        }

        @Test
        void updates_to_DOWN_when_input_is_DOWN() {
            ship.update(0.016f, InputDirection.DOWN);
            assertEquals(PlayerShip.Direction.DOWN, ship.getFacingDirection());
        }

        @Test
        void updates_to_LEFT_when_input_is_LEFT() {
            ship.update(0.016f, InputDirection.LEFT);
            assertEquals(PlayerShip.Direction.LEFT, ship.getFacingDirection());
        }

        @Test
        void updates_to_RIGHT_when_input_is_RIGHT() {
            ship.update(0.016f, InputDirection.RIGHT);
            assertEquals(PlayerShip.Direction.RIGHT, ship.getFacingDirection());
        }

        @Test
        void diagonal_UP_RIGHT_maps_to_UP() {
            ship.update(0.016f, InputDirection.UP_RIGHT);
            assertEquals(PlayerShip.Direction.UP, ship.getFacingDirection());
        }

        @Test
        void diagonal_UP_LEFT_maps_to_UP() {
            ship.update(0.016f, InputDirection.UP_LEFT);
            assertEquals(PlayerShip.Direction.UP, ship.getFacingDirection());
        }

        @Test
        void diagonal_DOWN_RIGHT_maps_to_DOWN() {
            ship.update(0.016f, InputDirection.DOWN_RIGHT);
            assertEquals(PlayerShip.Direction.DOWN, ship.getFacingDirection());
        }

        @Test
        void diagonal_DOWN_LEFT_maps_to_DOWN() {
            ship.update(0.016f, InputDirection.DOWN_LEFT);
            assertEquals(PlayerShip.Direction.DOWN, ship.getFacingDirection());
        }

        @Test
        void NONE_input_preserves_last_facing_direction() {
            ship.update(0.016f, InputDirection.RIGHT);
            ship.update(0.016f, InputDirection.NONE);
            assertEquals(PlayerShip.Direction.RIGHT, ship.getFacingDirection());
        }

        @Test
        void direction_persists_across_multiple_NONE_frames() {
            ship.update(0.016f, InputDirection.LEFT);
            ship.update(0.016f, InputDirection.NONE);
            ship.update(0.016f, InputDirection.NONE);
            ship.update(0.016f, InputDirection.NONE);
            assertEquals(PlayerShip.Direction.LEFT, ship.getFacingDirection());
        }

        @Test
        void direction_overwrites_on_new_input() {
            ship.update(0.016f, InputDirection.UP);
            ship.update(0.016f, InputDirection.DOWN);
            assertEquals(PlayerShip.Direction.DOWN, ship.getFacingDirection());
        }

        @Test
        void direction_changes_from_UP_to_RIGHT() {
            ship.update(0.016f, InputDirection.UP);
            ship.update(0.016f, InputDirection.RIGHT);
            assertEquals(PlayerShip.Direction.RIGHT, ship.getFacingDirection());
        }

        @Test
        void direction_changes_from_RIGHT_to_DOWN() {
            ship.update(0.016f, InputDirection.RIGHT);
            ship.update(0.016f, InputDirection.DOWN);
            assertEquals(PlayerShip.Direction.DOWN, ship.getFacingDirection());
        }

        @Test
        void direction_changes_from_DOWN_to_LEFT() {
            ship.update(0.016f, InputDirection.DOWN);
            ship.update(0.016f, InputDirection.LEFT);
            assertEquals(PlayerShip.Direction.LEFT, ship.getFacingDirection());
        }

        @Test
        void direction_changes_from_LEFT_to_UP() {
            ship.update(0.016f, InputDirection.LEFT);
            ship.update(0.016f, InputDirection.UP);
            assertEquals(PlayerShip.Direction.UP, ship.getFacingDirection());
        }
    }

    // ------------------------------------------------------------------
    // Engine animation
    // ------------------------------------------------------------------

    @Nested
    @DisplayName("Engine animation")
    class EngineAnimationTests {

        @Test
        void engine_frame_starts_at_zero() {
            assertEquals(0, ship.getEngineFrame());
        }

        @Test
        void engine_frame_advances_over_time() {
            // Advance enough time to cycle frames (4 frames at 8fps = 0.5s full cycle)
            ship.update(0.125f, InputDirection.UP);
            assertTrue(ship.getEngineFrame() >= 0);
            assertTrue(ship.getEngineFrame() < 4);
        }

        @Test
        void engine_frame_cycles_through_all_four_frames() {
            // Advance through a full cycle (4 * 0.125 = 0.5s)
            for (int i = 0; i < 4; i++) {
                ship.update(0.125f, InputDirection.UP);
            }
            // After a full cycle, should be back to frame 0
            assertEquals(0, ship.getEngineFrame());
        }

        @Test
        void engine_frame_wraps_at_four() {
            // Advance 5 frames (more than 4)
            for (int i = 0; i < 5; i++) {
                ship.update(0.125f, InputDirection.UP);
            }
            // Should be at frame 1 (5 % 4 = 1)
            assertEquals(1, ship.getEngineFrame());
        }

        @Test
        void engine_frame_stays_in_valid_range() {
            for (int i = 0; i < 20; i++) {
                ship.update(0.125f, InputDirection.UP);
                int frame = ship.getEngineFrame();
                assertTrue(frame >= 0 && frame < 4,
                        "Frame " + frame + " out of range [0, 4)");
            }
        }

        @Test
        void engine_frame_resets_to_zero_on_reset() {
            // Advance some frames
            for (int i = 0; i < 3; i++) {
                ship.update(0.125f, InputDirection.UP);
            }
            ship.reset();
            assertEquals(0, ship.getEngineFrame());
        }

        @Test
        void small_delta_does_not_advance_frame() {
            ship.update(0.001f, InputDirection.UP);
            assertEquals(0, ship.getEngineFrame());
        }

        @Test
        void engine_frame_increments_by_one_per_interval() {
            int lastFrame = ship.getEngineFrame();
            for (int i = 0; i < 8; i++) {
                ship.update(0.125f, InputDirection.UP);
                int newFrame = ship.getEngineFrame();
                int expected = (lastFrame + 1) % 4;
                assertEquals(expected, newFrame,
                        "Frame should increment by 1, was " + lastFrame + " expected " + expected + " got " + newFrame);
                lastFrame = newFrame;
            }
        }
    }

    // ------------------------------------------------------------------
    // Engine frame interval constant
    // ------------------------------------------------------------------

    @Nested
    @DisplayName("Engine frame interval")
    class EngineIntervalTests {

        @Test
        void engine_frame_interval_is_0_125_seconds() {
            // 8fps = 1/8 = 0.125s per frame
            assertEquals(0.125f, PlayerShip.ENGINE_FRAME_INTERVAL, 0.001f);
        }

        @Test
        void engine_frame_count_is_four() {
            assertEquals(4, PlayerShip.ENGINE_FRAME_COUNT);
        }
    }
}
