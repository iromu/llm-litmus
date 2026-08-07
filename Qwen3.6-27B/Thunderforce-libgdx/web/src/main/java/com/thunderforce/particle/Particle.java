package com.thunderforce.particle;

import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.g2d.Batch;
import com.badlogic.gdx.graphics.g2d.TextureRegion;
import com.badlogic.gdx.math.Vector2;

/**
 * Base particle with type-driven visual behavior.
 * Each ParticleType defines distinct update and render logic
 * to cover sparks, debris, smoke, glow, shockwaves, and ambient drift.
 */
public class Particle {

    /**
     * Visual behaviour categories for particles.
     */
    public enum ParticleType {
        SPARK,
        DEBRIS,
        SMOKE,
        GLOW,
        SHOCKWAVE,
        AMBIENT
    }

    // Position
    public float x;
    public float y;

    // Motion
    public final Vector2 velocity;

    // Lifetime
    public float lifetime;
    public float maxLifetime;

    // Appearance
    public float size;
    public float r, g, b, a;

    // State
    public boolean alive;
    public ParticleType particleType;

    // Rotation (degrees)
    public float rotation;
    public float rotationSpeed;

    // Internal state for type-specific behavior
    private float initialSize;
    private float initialAlpha;
    private float pulsePhase;
    private float driftPhase;

    public Particle() {
        this.velocity = new Vector2();
        this.alive = false;
    }

    /**
     * Reset and configure a particle for reuse from a pool.
     *
     * @param x             starting X
     * @param y             starting Y
     * @param vx            initial velocity X
     * @param vy            initial velocity Y
     * @param maxLifetime   total lifetime in seconds
     * @param size          initial size in pixels
     * @param r             red component 0-1
     * @param g             green component 0-1
     * @param b             blue component 0-1
     * @param a             alpha component 0-1
     * @param type          particle visual type
     * @param rotationSpeed degrees per second
     */
    public void init(float x, float y, float vx, float vy,
                     float maxLifetime, float size,
                     float r, float g, float b, float a,
                     ParticleType type, float rotationSpeed) {
        this.x = x;
        this.y = y;
        this.velocity.set(vx, vy);
        this.maxLifetime = maxLifetime;
        this.lifetime = maxLifetime;
        this.size = size;
        this.initialSize = size;
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
        this.initialAlpha = a;
        this.alive = true;
        this.particleType = type;
        this.rotation = 0;
        this.rotationSpeed = rotationSpeed;
        this.pulsePhase = 0;
        this.driftPhase = 0;
    }

    /**
     * Advance particle state by delta seconds.
     * Each type applies its own motion, size, and alpha rules.
     *
     * @param delta frame time in seconds
     */
    public void update(float delta) {
        if (!alive) return;

        lifetime -= delta;
        if (lifetime <= 0) {
            alive = false;
            return;
        }

        float lifeRatio = lifetime / maxLifetime; // 1.0 → 0.0

        switch (particleType) {
            case SPARK:
                updateSpark(delta, lifeRatio);
                break;
            case DEBRIS:
                updateDebris(delta, lifeRatio);
                break;
            case SMOKE:
                updateSmoke(delta, lifeRatio);
                break;
            case GLOW:
                updateGlow(delta, lifeRatio);
                break;
            case SHOCKWAVE:
                updateShockwave(delta, lifeRatio);
                break;
            case AMBIENT:
                updateAmbient(delta, lifeRatio);
                break;
        }

        rotation += rotationSpeed * delta;
    }

    private void updateSpark(float delta, float lifeRatio) {
        // Outward emission with gravity pull, rapid fade
        float gravity = -120f;
        velocity.y += gravity * delta;
        x += velocity.x * delta;
        y += velocity.y * delta;
        a = initialAlpha * lifeRatio;
        size = initialSize * Math.max(0.2f, lifeRatio);
    }

    private void updateDebris(float delta, float lifeRatio) {
        // Larger fragments, slower fall, noticeable rotation
        float gravity = -60f;
        velocity.y += gravity * delta;
        // Slight drag
        velocity.scl(0.98f);
        x += velocity.x * delta;
        y += velocity.y * delta;
        a = initialAlpha * Math.max(0f, lifeRatio - 0.1f);
        size = initialSize * (0.6f + 0.4f * lifeRatio);
    }

    private void updateSmoke(float delta, float lifeRatio) {
        // Expanding, fading, slow upward drift
        float drift = 30f;
        velocity.y += drift * delta;
        velocity.scl(0.96f);
        x += velocity.x * delta;
        y += velocity.y * delta;
        a = initialAlpha * lifeRatio * lifeRatio;
        size = initialSize * (1.0f + (1.0f - lifeRatio) * 2.0f);
    }

    private void updateGlow(float delta, float lifeRatio) {
    // Pulsing alpha, stays near origin
        pulsePhase += delta * 6.0f;
        float pulse = 0.5f + 0.5f * (float) Math.sin(pulsePhase);
        a = initialAlpha * lifeRatio * (0.4f + 0.6f * pulse);
        size = initialSize * (0.8f + 0.4f * pulse);
        // Tiny drift
        x += velocity.x * delta * 0.3f;
        y += velocity.y * delta * 0.3f;
    }

    private void updateShockwave(float delta, float lifeRatio) {
        // Expanding ring from center, fast fade
        float expansionRate = 150f;
        size = initialSize * (1.0f + (1.0f - lifeRatio) * expansionRate * maxLifetime);
        a = initialAlpha * lifeRatio * lifeRatio;
        // Minimal position drift
        x += velocity.x * delta * 0.1f;
        y += velocity.y * delta * 0.1f;
    }

    private void updateAmbient(float delta, float lifeRatio) {
        // Slow drift, long lifetime, subtle movement
        driftPhase += delta * 2.0f;
        float sineDrift = (float) Math.sin(driftPhase);
        x += (velocity.x + sineDrift * 10f) * delta;
        y += velocity.y * delta;
        a = initialAlpha * Math.min(1.0f, lifeRatio * 2.0f) * Math.min(1.0f, (1.0f - lifeRatio) * 2.0f + 0.5f);
        size = initialSize * (0.8f + 0.2f * (float) Math.sin(driftPhase * 1.5f));
    }

    /**
     * @return true while the particle has not expired
     */
    public boolean isAlive() {
        return alive;
    }

    /**
     * Render the particle to the batch using the provided texture and optional region.
     * Rotated particles (SPARK, DEBRIS, AMBIENT) require a TextureRegion;
     * non-rotated types use direct texture draws to avoid allocation.
     *
     * @param batch   the sprite batch to draw on
     * @param texture 1×1 white pixel texture (tinted by particle color)
     * @param region  reusable TextureRegion for rotated draws (may be null)
     */
    public void render(Batch batch, Texture texture, TextureRegion region) {
        if (!alive) return;

        batch.setColor(r, g, b, a);
        float halfSize = size / 2f;

        switch (particleType) {
            case SPARK:
            case DEBRIS:
            case AMBIENT:
                // Rotated square — requires TextureRegion (9-param draw with rotation)
                if (region != null) {
                    batch.draw(region, x - halfSize, y - halfSize,
                            halfSize, halfSize,  // origin at particle centre
                            size, size, 1f, 1f, rotation);
                }
                break;

            case SMOKE:
            case GLOW:
            case SHOCKWAVE:
                // Non-rotated square — direct texture draw (no allocation)
                if (texture != null) {
                    batch.draw(texture, x - halfSize, y - halfSize, size, size);
                }
                break;
        }
    }

    /**
     * Render with only a texture (no region). Non-rotated types work;
     * rotated types are silently skipped.
     *
     * @param batch   the sprite batch to draw on
     * @param texture 1×1 white pixel texture
     */
    public void render(Batch batch, Texture texture) {
        render(batch, texture, null);
    }

    /**
     * Render the particle to the batch (no texture, uses batch color only).
     * Useful when no particle texture is available — draws nothing.
     *
     * @param batch the sprite batch to draw on
     */
    public void render(Batch batch) {
        // No-op: requires texture to render
    }

    /**
     * Mark this particle as dead for recycling.
     */
    public void kill() {
        alive = false;
    }
}
