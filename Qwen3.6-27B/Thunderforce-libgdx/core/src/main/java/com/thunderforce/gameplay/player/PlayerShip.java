package com.thunderforce.gameplay.player;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.g2d.TextureRegion;
import com.badlogic.gdx.math.Rectangle;
import com.badlogic.gdx.math.Vector2;
import com.thunderforce.gameplay.bullet.SpatialEntity;
import com.thunderforce.gameplay.bullet.WhiteTexture;

/**
 * Player-controlled ship with acceleration-based physics, invincibility frames,
 * shield absorption, optional speed boost, and 4-directional sprite animation.
 *
 * Internal hitbox: 16x16 pixels centred on (x, y).
 */
public class PlayerShip implements SpatialEntity {

    public static final int ENTITY_TYPE_PLAYER = 1;

    // Physics constants
    public static final float MAX_SPEED = 120f;
    public static final float ACCEL_RATE = 800f;
    public static final float INERTIA = 0.9f;

    // Dimensions
    public static final float WIDTH = 16f;
    public static final float HEIGHT = 16f;
    public static final float HALF_W = WIDTH / 2f;
    public static final float HALF_H = HEIGHT / 2f;

    // Timers
    public static final float INVINCIBILITY_DURATION = 1.5f;
    public static final float HIT_FLASH_DURATION = 0.1f;
    public static final float SPEED_BOOST_DURATION = 10f;

    // Engine animation: 4 frames at 8fps
    public static final float ENGINE_FRAME_INTERVAL = 0.125f;
    public static final int ENGINE_FRAME_COUNT = 4;

    // Ship colors (RGB 0-1)
    private static final float SHIP_R = 0.2f;   // #33
    private static final float SHIP_G = 0.4f;   // #66
    private static final float SHIP_B = 0.8f;   // #cc
    private static final float WING_R = 0.15f;
    private static final float WING_G = 0.3f;
    private static final float WING_B = 0.6f;
    private static final float COCKPIT_R = 0.4f;
    private static final float COCKPIT_G = 0.6f;
    private static final float COCKPIT_B = 1f;

    // Shield visual constants
    public static final float SHIELD_RADIUS = 14f;
    public static final float SHIELD_LINE_THICKNESS = 2f;
    public static final float SHIELD_PULSE_PERIOD = 2.0f;
    public static final float SHIELD_PULSE_AMPLITUDE = 2f;
    public static final float SHIELD_HIT_FLASH_DURATION = 0.15f;
    public static final int SHIELD_HEX_SEGMENTS = 6;

    // Shield colors (cyan energy barrier)
    private static final float SHIELD_R = 0.1f;
    private static final float SHIELD_G = 0.85f;
    private static final float SHIELD_B = 1f;
    private static final float SHIELD_ALPHA = 0.4f;

    // Engine flame colors per frame (orange/yellow gradient)
    private static final float[][] FLAME_COLORS = {
            {1f, 0.5f, 0f, 1f},       // frame 0: orange, full alpha
            {1f, 0.7f, 0f, 0.75f},    // frame 1: yellow-orange, reduced alpha
            {1f, 0.9f, 0.2f, 1f},     // frame 2: yellow, full alpha
            {1f, 0.6f, 0f, 0.6f},     // frame 3: deep orange, reduced alpha
    };

    // Engine flame sizes per frame (pulsing)
    private static final float[][] FLAME_SIZES = {
            {8f, 8f},   // frame 0: full size
            {6f, 6f},   // frame 1: medium
            {8f, 8f},   // frame 2: full size
            {4f, 4f},   // frame 3: small
    };

    // Shared white texture for tinted draw calls (lazy to avoid native init in headless tests)
    private static Texture whiteTexture;

    private static TextureRegion whiteRegion;

    private static Texture getWhiteTexture() {
        if (whiteTexture == null) {
            whiteTexture = WhiteTexture.get();
        }
        return whiteTexture;
    }

    private static TextureRegion getWhiteRegion() {
        if (whiteRegion == null) {
            whiteRegion = new TextureRegion(getWhiteTexture());
        }
        return whiteRegion;
    }

    /**
     * Four cardinal facing directions for the ship sprite.
     */
    public enum Direction {
        UP, DOWN, LEFT, RIGHT
    }

    // Position (centre of ship)
    public float x;
    public float y;

    // Velocity
    private final Vector2 velocity;

    // Shield (absorbs damage before ship HP)
    private int shieldHP;
    // Pre-allocated vertex arrays for shield hexagon rendering (avoids per-frame GC)
    private final float[] shieldVx = new float[SHIELD_HEX_SEGMENTS];
    private final float[] shieldVy = new float[SHIELD_HEX_SEGMENTS];

    // Timers (remaining seconds)
    private float invincibilityTimer;
    private float hitFlashTimer;
    private float speedBoostTimer;
    private float shieldHitTimer;

    // Engine animation
    private float engineTimer;
    private int engineFrame;

    // Shield pulse animation phase (radians, wraps at 2PI)
    private float shieldPulsePhase;

    // Facing direction (defaults to UP)
    private Direction facingDirection;

    // Playfield bounds (set at construction)
    private final float playfieldLeft;
    private final float playfieldRight;
    private final float playfieldTop;
    private final float playfieldBottom;

    // Texture regions (legacy, kept for backward compatibility)
    private Texture shipTexture;
    private Texture[] engineFlameFrames;

    // Derived bounds rectangle (mutable for reuse)
    private final Rectangle bounds;

    /**
     * Create a player ship clamped to the given playfield.
     *
     * @param playfieldLeft   left edge of the scrollable area
     * @param playfieldRight  right edge
     * @param playfieldTop    top edge
     * @param playfieldBottom bottom edge
     */
    public PlayerShip(float playfieldLeft, float playfieldRight,
                      float playfieldTop, float playfieldBottom) {
        this.playfieldLeft = playfieldLeft;
        this.playfieldRight = playfieldRight;
        this.playfieldTop = playfieldTop;
        this.playfieldBottom = playfieldBottom;
        this.velocity = new Vector2();
        this.bounds = new Rectangle();
        this.x = (playfieldLeft + playfieldRight) / 2f;
        this.y = (playfieldTop + playfieldBottom) / 2f;
        this.shieldHP = 0;
        this.invincibilityTimer = 0;
        this.hitFlashTimer = 0;
        this.speedBoostTimer = 0;
        this.shieldHitTimer = 0;
        this.engineTimer = 0;
        this.engineFrame = 0;
        this.shieldPulsePhase = 0;
        this.facingDirection = Direction.UP;
    }

    // ------------------------------------------------------------------
    // Update
    // ------------------------------------------------------------------

    /**
     * Advance physics by one frame.
     *
     * @param delta         frame time in seconds
     * @param inputDirection movement direction from input
     */
    public void update(float delta, InputDirection inputDirection) {
        updateTimers(delta);
        updateEngineAnimation(delta);
        updateFacingDirection(inputDirection);

        if (inputDirection == InputDirection.NONE) {
            applyInertia(delta);
        } else {
            accelerate(inputDirection, delta);
        }

        applyVelocity(delta);
        clampToBounds();
        updateBounds();
    }

    private void updateTimers(float delta) {
        if (invincibilityTimer > 0) invincibilityTimer = Math.max(0, invincibilityTimer - delta);
        if (hitFlashTimer > 0) hitFlashTimer = Math.max(0, hitFlashTimer - delta);
        if (speedBoostTimer > 0) speedBoostTimer = Math.max(0, speedBoostTimer - delta);
        if (shieldHitTimer > 0) shieldHitTimer = Math.max(0, shieldHitTimer - delta);
        // Advance shield pulse phase (wraps at 2PI)
        shieldPulsePhase = (shieldPulsePhase + delta / SHIELD_PULSE_PERIOD * (float) (Math.PI * 2))
                % (float) (Math.PI * 2);
    }

    private void updateEngineAnimation(float delta) {
        engineTimer += delta;
        if (engineTimer >= ENGINE_FRAME_INTERVAL) {
            engineTimer -= ENGINE_FRAME_INTERVAL;
            engineFrame = (engineFrame + 1) % ENGINE_FRAME_COUNT;
        }
    }

    /**
     * Update the ship's facing direction based on input.
     * Cardinal inputs map directly; diagonals map to the vertical component.
     * NONE input preserves the current facing direction.
     */
    private void updateFacingDirection(InputDirection inputDirection) {
        if (inputDirection == InputDirection.NONE) {
            return;
        }
        switch (inputDirection) {
            case UP:
            case UP_LEFT:
            case UP_RIGHT:
                facingDirection = Direction.UP;
                break;
            case DOWN:
            case DOWN_LEFT:
            case DOWN_RIGHT:
                facingDirection = Direction.DOWN;
                break;
            case LEFT:
                facingDirection = Direction.LEFT;
                break;
            case RIGHT:
                facingDirection = Direction.RIGHT;
                break;
            default:
                break;
        }
    }

    private void accelerate(InputDirection direction, float delta) {
        Vector2 dir = direction.toVector2();
        float currentMax = getCurrentMaxSpeed();
        float accel = ACCEL_RATE * delta;

        velocity.x += dir.x * accel;
        velocity.y += dir.y * accel;
        float speed = velocity.len();
        if (speed > currentMax) {
            velocity.scl(currentMax / speed);
        }
    }

    private void applyInertia(float delta) {
        velocity.scl((float) Math.pow(INERTIA, delta * 60f));
        if (velocity.len() < 0.5f) {
            velocity.set(0, 0);
        }
    }

    private void applyVelocity(float delta) {
        x += velocity.x * delta;
        y += velocity.y * delta;
    }

    private void clampToBounds() {
        x = Math.max(playfieldLeft + HALF_W, Math.min(playfieldRight - HALF_W, x));
        y = Math.max(playfieldBottom + HALF_H, Math.min(playfieldTop - HALF_H, y));
    }

    private void updateBounds() {
        bounds.x = x - HALF_W;
        bounds.y = y - HALF_H;
        bounds.width = WIDTH;
        bounds.height = HEIGHT;
    }

    private float getCurrentMaxSpeed() {
        return isSpeedBoosted() ? MAX_SPEED * 1.5f : MAX_SPEED;
    }

    // ------------------------------------------------------------------
    // Damage & shields
    // ------------------------------------------------------------------

    /**
     * Attempt to damage the ship. Returns true if damage was actually taken
     * (shield depleted and not invincible).
     */
    public boolean takeDamage() {
        if (isInvincible()) return false;
        if (shieldHP > 0) {
            shieldHP--;
            shieldHitTimer = SHIELD_HIT_FLASH_DURATION;
            startHitFlash();
            return false;
        }
        startInvincibility();
        startHitFlash();
        return true;
    }

    /**
     * Grant shield points (capped at 5).
     */
    public void addShield(int amount) {
        shieldHP = Math.min(5, shieldHP + amount);
    }

    /**
     * Activate a speed boost for the configured duration.
     */
    public void activateSpeedBoost() {
        speedBoostTimer = SPEED_BOOST_DURATION;
    }

    // ------------------------------------------------------------------
    // Timers
    // ------------------------------------------------------------------

    private void startInvincibility() {
        invincibilityTimer = INVINCIBILITY_DURATION;
    }

    private void startHitFlash() {
        hitFlashTimer = HIT_FLASH_DURATION;
    }

    /**
     * True while the ship is in its invincibility window after taking damage.
     */
    public boolean isInvincible() {
        return invincibilityTimer > 0;
    }

    /**
     * True while the ship is visually flashing from a hit.
     */
    public boolean isHitFlashing() {
        return hitFlashTimer > 0;
    }

    /**
     * True while a speed boost is active.
     */
    public boolean isSpeedBoosted() {
        return speedBoostTimer > 0;
    }

    // ------------------------------------------------------------------
    // Render
    // ------------------------------------------------------------------

    /**
     * Render the ship as a 4-directional sprite with animated engine flames.
     * During hit flash the ship alternates visibility each frame.
     * When invincible (but not hit flashing), a white flash overlay is drawn.
     */
    public void render(SpriteBatch batch, OrthographicCamera camera) {
        if (!shouldRender()) return;

        batch.setProjectionMatrix(camera.combined);

        // Draw shield (behind ship)
        if (shieldHP > 0) {
            drawShield(batch);
        }

        // Draw engine flames behind the ship
        drawEngineFlames(batch);

        // Draw ship body
        drawShipBody(batch);

        // Draw hit flash overlay (white flash when invincible)
        if (isInvincible()) {
            batch.setColor(1f, 1f, 1f, 0.5f);
            batch.draw(getWhiteTexture(), x - HALF_W, y - HALF_H, WIDTH, HEIGHT);
            batch.setColor(Color.WHITE);
        }
    }

    private boolean shouldRender() {
        if (isHitFlashing()) {
            // Blink: visible for half the flash duration, hidden for the other half
            return (Gdx.graphics.getFrameId() & 1) == 0;
        }
        return true;
    }


    /**
     * Draw the ship body as a directional sprite.
     * Composed of wing, body, and cockpit rectangles.
     */
    private void drawShipBody(SpriteBatch batch) {
        float cx = x - HALF_W;
        float cy = y - HALF_H;

        switch (facingDirection) {
            case UP -> {
                // Wings (wider, darker)
                batch.setColor(WING_R, WING_G, WING_B, 1f);
                batch.draw(getWhiteTexture(), cx - 2, cy, 20, 8);
                // Main body
                batch.setColor(SHIP_R, SHIP_G, SHIP_B, 1f);
                batch.draw(getWhiteTexture(), cx, cy + 2, 16, 14);
                // Cockpit highlight
                batch.setColor(COCKPIT_R, COCKPIT_G, COCKPIT_B, 1f);
                batch.draw(getWhiteTexture(), cx + 5, cy + 8, 6, 6);
            }
            case DOWN -> {
                // Wings
                batch.setColor(WING_R, WING_G, WING_B, 1f);
                batch.draw(getWhiteTexture(), cx - 2, cy + 8, 20, 8);
                // Main body
                batch.setColor(SHIP_R, SHIP_G, SHIP_B, 1f);
                batch.draw(getWhiteTexture(), cx, cy, 16, 14);
                // Cockpit highlight
                batch.setColor(COCKPIT_R, COCKPIT_G, COCKPIT_B, 1f);
                batch.draw(getWhiteTexture(), cx + 5, cy + 2, 6, 6);
            }
            case LEFT -> {
                // Wings
                batch.setColor(WING_R, WING_G, WING_B, 1f);
                batch.draw(getWhiteTexture(), cx, cy - 2, 8, 20);
                // Main body
                batch.setColor(SHIP_R, SHIP_G, SHIP_B, 1f);
                batch.draw(getWhiteTexture(), cx + 2, cy, 14, 16);
                // Cockpit highlight
                batch.setColor(COCKPIT_R, COCKPIT_G, COCKPIT_B, 1f);
                batch.draw(getWhiteTexture(), cx + 8, cy + 5, 6, 6);
            }
            case RIGHT -> {
                // Wings
                batch.setColor(WING_R, WING_G, WING_B, 1f);
                batch.draw(getWhiteTexture(), cx + 8, cy - 2, 8, 20);
                // Main body
                batch.setColor(SHIP_R, SHIP_G, SHIP_B, 1f);
                batch.draw(getWhiteTexture(), cx, cy, 14, 16);
                // Cockpit highlight
                batch.setColor(COCKPIT_R, COCKPIT_G, COCKPIT_B, 1f);
                batch.draw(getWhiteTexture(), cx + 2, cy + 5, 6, 6);
            }
        }

        batch.setColor(Color.WHITE);
    }

    /**
     * Draw animated engine flames behind the ship based on facing direction.
     * Flames pulse in size and alpha across 4 frames.
     */
    private void drawEngineFlames(SpriteBatch batch) {
        float[] color = FLAME_COLORS[engineFrame];
        float[] size = FLAME_SIZES[engineFrame];
        float fw = size[0];
        float fh = size[0];
        float fhalf = fw / 2f;

        float fx1, fy1, fx2, fy2;

        switch (facingDirection) {
            case UP:
                // Flames below ship
                fx1 = x - 5 - fhalf;
                fy1 = y - HALF_H - fw;
                fx2 = x + 5 - fhalf;
                fy2 = y - HALF_H - fw;
                break;
            case DOWN:
                // Flames above ship
                fx1 = x - 5 - fhalf;
                fy1 = y + HALF_H;
                fx2 = x + 5 - fhalf;
                fy2 = y + HALF_H;
                break;
            case LEFT:
                // Flames to the right of ship
                fx1 = x + HALF_H;
                fy1 = y - 5 - fhalf;
                fx2 = x + HALF_H;
                fy2 = y + 5 - fhalf;
                break;
            case RIGHT:
                // Flames to the left of ship
                fx1 = x - HALF_H - fw;
                fy1 = y - 5 - fhalf;
                fx2 = x - HALF_H - fw;
                fy2 = y + 5 - fhalf;
                break;
            default:
                return;
        }

        batch.setColor(color[0], color[1], color[2], color[3]);
        batch.draw(getWhiteTexture(), fx1, fy1, fw, fh);
        batch.draw(getWhiteTexture(), fx2, fy2, fw, fh);
        batch.setColor(Color.WHITE);
    }

    /**
     * Draw the shield as a hexagonal energy barrier outline with pulse animation.
     * When the shield was recently hit, a bright flash overlay is drawn on top.
     */
    private void drawShield(SpriteBatch batch) {
        float r = SHIELD_RADIUS + (float) Math.sin(shieldPulsePhase) * SHIELD_PULSE_AMPLITUDE;
        float halfThick = SHIELD_LINE_THICKNESS / 2f;
        TextureRegion region = getWhiteRegion();

        // Compute hexagon vertices into pre-allocated arrays (avoids per-frame GC)
        for (int i = 0; i < SHIELD_HEX_SEGMENTS; i++) {
            float angle = (float) (Math.PI / 3) * i;
            shieldVx[i] = x + r * (float) Math.cos(angle);
            shieldVy[i] = y + r * (float) Math.sin(angle);
        }

        // Draw hexagon outline as thin rotated quads along each edge
        batch.setColor(SHIELD_R, SHIELD_G, SHIELD_B, SHIELD_ALPHA);
        for (int i = 0; i < SHIELD_HEX_SEGMENTS; i++) {
            int next = (i + 1) % SHIELD_HEX_SEGMENTS;
            float dx = shieldVx[next] - shieldVx[i];
            float dy = shieldVy[next] - shieldVy[i];
            float mx = (shieldVx[i] + shieldVx[next]) / 2f;
            float my = (shieldVy[i] + shieldVy[next]) / 2f;
            float px = -dy * halfThick;
            float py = dx * halfThick;
            float cos = dx > 0 ? 1f : -1f;
            float sin = dy > 0 ? 1f : -1f;
            float ox = mx + px - (-px * cos - (-py * sin)) / 2f;
            float oy = my + py - (px * sin - py * cos) / 2f;
            float angleDeg = (float) (Math.atan2(dy, dx) * (180f / (float) Math.PI));
            batch.draw(region, ox, oy, -px, -py,
                    SHIELD_LINE_THICKNESS, SHIELD_LINE_THICKNESS,
                    1f, 1f, angleDeg);
        }

        // Flash overlay when shield was recently hit
        if (shieldHitTimer > 0) {
            float flashAlpha = shieldHitTimer / SHIELD_HIT_FLASH_DURATION;
            float flashHalfThick = halfThick * 1.5f;
            batch.setColor(1f, 1f, 1f, flashAlpha * 0.6f);
            for (int i = 0; i < SHIELD_HEX_SEGMENTS; i++) {
                int next = (i + 1) % SHIELD_HEX_SEGMENTS;
                float dx = shieldVx[next] - shieldVx[i];
                float dy = shieldVy[next] - shieldVy[i];
                float mx = (shieldVx[i] + shieldVx[next]) / 2f;
                float my = (shieldVy[i] + shieldVy[next]) / 2f;
                float px = -dy * flashHalfThick;
                float py = dx * flashHalfThick;
                float cos = dx > 0 ? 1f : -1f;
                float sin = dy > 0 ? 1f : -1f;
                float ox = mx + px - (-px * cos - (-py * sin)) / 2f;
                float oy = my + py - (px * sin - py * cos) / 2f;
                float angleDeg = (float) (Math.atan2(dy, dx) * (180f / (float) Math.PI));
                batch.draw(region, ox, oy, -px, -py,
                        SHIELD_LINE_THICKNESS * 1.5f, SHIELD_LINE_THICKNESS * 1.5f,
                        1f, 1f, angleDeg);
            }
        }

        batch.setColor(Color.WHITE);
    }

    // ------------------------------------------------------------------
    // Accessors
    // ------------------------------------------------------------------

    public Rectangle getBounds() {
        return bounds;
    }

    @Override
    public int getEntityType() {
        return ENTITY_TYPE_PLAYER;
    }

    public Vector2 getVelocity() {
        return velocity;
    }

    public int getShieldHP() {
        return shieldHP;
    }

    public int getEngineFrame() {
        return engineFrame;
    }

    public Direction getFacingDirection() {
        return facingDirection;
    }

    public float getInvincibilityTimer() {
        return invincibilityTimer;
    }

    public float getSpeedBoostTimer() {
        return speedBoostTimer;
    }

    /**
     * True while the shield has HP and is visible.
     */
    public boolean hasShield() {
        return shieldHP > 0;
    }

    /**
     * True while the shield flash is active (recently absorbed damage).
     */
    public boolean isShieldFlashing() {
        return shieldHitTimer > 0;
    }

    /**
     * Current shield hit flash timer value.
     */
    public float getShieldHitTimer() {
        return shieldHitTimer;
    }

    /**
     * Current shield pulse animation phase (radians).
     */
    public float getShieldPulsePhase() {
        return shieldPulsePhase;
    }

    /**
     * Current shield render radius (base + pulse offset).
     */
    public float getShieldRenderRadius() {
        return SHIELD_RADIUS + (float) Math.sin(shieldPulsePhase) * SHIELD_PULSE_AMPLITUDE;
    }

    /**
     * Set the base ship texture for rendering (legacy).
     */
    public void setShipTexture(Texture texture) {
        this.shipTexture = texture;
    }

    /**
     * Set engine flame animation frames (legacy, kept for backward compatibility).
     */
    public void setEngineFlameFrames(Texture[] frames) {
        this.engineFlameFrames = frames;
    }

    /**
     * Reset the ship to its starting state (position centre, zero velocity, no timers).
     */
    public void reset() {
        this.x = (playfieldLeft + playfieldRight) / 2f;
        this.y = (playfieldTop + playfieldBottom) / 2f;
        velocity.set(0, 0);
        shieldHP = 0;
        invincibilityTimer = 0;
        hitFlashTimer = 0;
        speedBoostTimer = 0;
        shieldHitTimer = 0;
        engineTimer = 0;
        engineFrame = 0;
        shieldPulsePhase = 0;
        facingDirection = Direction.UP;
        updateBounds();
    }
}
