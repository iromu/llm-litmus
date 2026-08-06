package com.thunderforce.gameplay.bullet;

import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.g2d.Batch;
import com.badlogic.gdx.graphics.glutils.ShapeRenderer;
import com.badlogic.gdx.math.Circle;
import com.badlogic.gdx.math.Rectangle;

/**
 * Persistent zone that damages the player on overlap.
 * Draws an expanding/fading circle and ticks damage at regular intervals.
 */
public class AreaDenial implements SpatialEntity {

    public static final int ENTITY_TYPE = 1;
    private static final Texture WHITE = WhiteTexture.get();

    public final float x;
    public final float y;
    public final float radius;
    public final int damage;
    public final float maxLifetime;

    public float lifetime;
    public float damageTimer;
    public float damageInterval;
    public boolean alive;

    private final Rectangle bounds;
    private final Circle circle;

    public AreaDenial(float x, float y, float radius, int damage, float lifetime) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.damage = damage;
        this.maxLifetime = lifetime;
        this.lifetime = 0;
        this.damageInterval = 0.25f;
        this.damageTimer = 0;
        this.alive = true;
        this.bounds = new Rectangle();
        this.circle = new Circle(x, y, 0);
    }

    /**
     * Update lifetime, damage timer, and circle expansion.
     */
    public void update(float delta) {
        lifetime += delta;
        damageTimer += delta;

        if (lifetime >= maxLifetime) {
            alive = false;
        }

        circle.x = x;
        circle.y = y;

        float fadeIn = Math.min(1f, lifetime / 0.3f);
        float fadeOut = Math.max(0f, 1f - (lifetime - maxLifetime + 0.3f) / 0.3f);
        float scale = Math.min(fadeIn, fadeOut);
        circle.radius = radius * scale;
    }

    /**
     * Check if the player's bounds overlap this area and deal damage at interval rate.
     *
     * @param playerBounds the player's collision rectangle
     * @return true if damage was dealt this tick
     */
    public boolean dealsDamage(Rectangle playerBounds) {
        if (!alive || lifetime < 0.3f) {
            return false;
        }

        float cx = playerBounds.x + playerBounds.width * 0.5f;
        float cy = playerBounds.y + playerBounds.height * 0.5f;
        float playerRadius = Math.max(playerBounds.width, playerBounds.height) * 0.5f;

        float dx = cx - x;
        float dy = cy - y;
        float dist = (float) Math.sqrt(dx * dx + dy * dy);

        if (dist < circle.radius + playerRadius) {
            if (damageTimer >= damageInterval) {
                damageTimer -= damageInterval;
                return true;
            }
        }
        return false;
    }

    public boolean isAlive() {
        return alive;
    }

    public float getAlpha() {
        float fadeIn = Math.min(1f, lifetime / 0.3f);
        float fadeOut = Math.max(0f, 1f - (lifetime - maxLifetime + 0.3f) / 0.3f);
        return Math.min(fadeIn, fadeOut) * 0.5f;
    }

    @Override
    public Rectangle getBounds() {
        float r = circle.radius;
        bounds.setPosition(x - r, y - r);
        bounds.setSize(r * 2, r * 2);
        return bounds;
    }

    @Override
    public int getEntityType() {
        return ENTITY_TYPE;
    }

    /**
     * Render the area denial zone as a fading circle.
     */
    public void render(Batch batch) {
        if (!alive) return;

        float alpha = getAlpha();
        float r = circle.radius;
        if (r <= 0) return;

        batch.setColor(1f, 0.4f, 0f, alpha);
        batch.draw(WHITE, x - r, y - r, r * 2, r * 2);
        batch.setColor(Color.WHITE);
    }

    /**
     * Render with ShapeRenderer for a proper circle outline and fill.
     */
    public void render(ShapeRenderer shapeRenderer) {
        if (!alive) return;

        float alpha = getAlpha();
        float r = circle.radius;
        if (r <= 0) return;

        shapeRenderer.setColor(1f, 0.4f, 0f, alpha * 0.3f);
        shapeRenderer.circle(x, y, r, 24);

        shapeRenderer.setColor(1f, 0.3f, 0f, alpha);
        shapeRenderer.circle(x, y, r, 24);
    }

    public float getRadius() {
        return radius;
    }

    public float getCurrentRadius() {
        return circle.radius;
    }

    public void kill() {
        this.alive = false;
    }
}
