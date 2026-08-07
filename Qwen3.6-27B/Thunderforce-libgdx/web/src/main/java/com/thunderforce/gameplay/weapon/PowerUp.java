package com.thunderforce.gameplay.weapon;

import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.g2d.Batch;
import com.badlogic.gdx.math.Intersector;
import com.badlogic.gdx.math.Rectangle;
import com.thunderforce.gameplay.bullet.WhiteTexture;

/**
 * Power-up items that drop from defeated enemies.
 * Player collects by overlapping the power-up bounds.
 */
public class PowerUp {

    private static final Texture WHITE = WhiteTexture.get();

    public enum PowerUpType {
        WEAPON_CYCLE,
        SHIELD,
        SPEED_BOOST
    }

    public static final float WIDTH = 12f;
    public static final float HEIGHT = 12f;
    public static final float HALF_W = WIDTH / 2f;
    public static final float HALF_H = HEIGHT / 2f;

    public float x;
    public float y;
    public final PowerUpType type;
    public float fallSpeed;
    public boolean collected;

    private final Rectangle bounds;
    private final Color color;
    private float blinkTimer;

    public PowerUp(float x, float y, PowerUpType type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.fallSpeed = 30f;
        this.collected = false;
        this.bounds = new Rectangle();
        this.color = new Color();
        this.blinkTimer = 0f;
        setColor();
    }

    private void setColor() {
        switch (type) {
            case WEAPON_CYCLE:
                color.set(1f, 1f, 0f, 1f); // yellow
                break;
            case SHIELD:
                color.set(0f, 0.6f, 1f, 1f); // cyan
                break;
            case SPEED_BOOST:
                color.set(1f, 0.5f, 0f, 1f); // orange
                break;
        }
    }

    /**
     * Advance fall position and blink animation.
     */
    public void update(float delta) {
        if (collected) return;
        y -= fallSpeed * delta;
        blinkTimer += delta;

        // Kill if fallen off screen
        if (y < -20f) {
            collected = true;
        }
    }

    public Rectangle getBounds() {
        bounds.setPosition(x - HALF_W, y - HALF_H);
        bounds.setSize(WIDTH, HEIGHT);
        return bounds;
    }

    /**
     * Check if this power-up overlaps the player hitbox.
     *
     * @param playerBounds player ship rectangle
     * @return true if overlapping (should be collected)
     */
    public boolean checkCollision(Rectangle playerBounds) {
        if (collected) return false;
        Rectangle pb = getBounds();
        return Intersector.overlaps(pb, playerBounds);
    }

    /**
     * Render as a colored square with a blinking border effect.
     */
    public void render(Batch batch) {
        if (collected) return;

        // Blink every 0.15s
        boolean visible = (int) (blinkTimer / 0.15f) % 2 == 0;
        if (!visible) return;

        batch.setColor(color);
        batch.draw(WHITE, x - HALF_W, y - HALF_H, WIDTH, HEIGHT);
        batch.setColor(Color.WHITE);
    }

    public boolean isCollected() {
        return collected;
    }

    public PowerUpType getType() {
        return type;
    }
}
