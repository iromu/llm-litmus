package com.thunderforce.particle;

import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.g2d.Batch;
import com.badlogic.gdx.graphics.g2d.TextureRegion;
import com.badlogic.gdx.math.MathUtils;
import com.badlogic.gdx.utils.Array;
import com.thunderforce.engine.FixedPool;

/**
 * Particle system with FixedPool-backed recycling.
 * Emits typed particles, manages active list, and enforces
 * a quality-tier cap on concurrent live particles.
 */
public class ParticleSystem {

    private final FixedPool<Particle> pool;
    private final Array<Particle> active;
    private final int maxActive;

    // Rendering: cached TextureRegion (avoids per-particle allocation)
    private Texture particleTexture;
    private TextureRegion particleRegion;

    // Pre-allocated index arrays for type-sorted rendering (zero-GC)
    private final int[] shockwaveIndices;
    private final int[] smokeIndices;
    private final int[] topIndices;
    private int shockwaveCount;
    private int smokeCount;
    private int topCount;

    // Pre-allocated random values to avoid GC
    private final float[] randomAngles;
    private static final int RANDOM_BUCKET_COUNT = 64;

    /**
     * Create a particle system with the given active cap.
     *
     * @param maxActive maximum concurrent live particles (from QualityTier)
     */
    public ParticleSystem(int maxActive) {
        this.maxActive = maxActive;
        this.pool = new FixedPool<>(maxActive, Particle::new);
        this.active = new Array<>(maxActive);
        this.shockwaveIndices = new int[maxActive];
        this.smokeIndices = new int[maxActive];
        this.topIndices = new int[maxActive];
        this.randomAngles = new float[RANDOM_BUCKET_COUNT];
        for (int i = 0; i < RANDOM_BUCKET_COUNT; i++) {
            randomAngles[i] = MathUtils.random() * MathUtils.PI2;
        }
    }

    /**
     * @return number of currently active particles
     */
    public int getActiveCount() {
        return active.size;
    }

    /**
     * @return the configured maximum active particle count
     */
    public int getMaxActive() {
        return maxActive;
    }

    /**
     * @return the internal active particle array (package-visible for ExplosionEffect)
     */
    Array<Particle> getActiveArray() {
        return active;
    }

    /**
     * Acquire a particle from the pool if under capacity.
     * Package-visible for ExplosionEffect direct access.
     *
     * @return a fresh particle, or null if at capacity
     */
    Particle obtainParticle() {
        return acquire();
    }

    // ------------------------------------------------------------------
    // Emit helpers
    // ------------------------------------------------------------------

    /**
     * Emit a batch of particles of a single type at a point.
     * Particles are spread in a full circle with random speeds.
     *
     * @param x      centre X
     * @param y      centre Y
     * @param type   particle visual type
     * @param count  number of particles to emit
     */
    public void emit(float x, float y, Particle.ParticleType type, int count) {
        for (int i = 0; i < count; i++) {
            Particle p = acquire();
            if (p == null) break;
            float angle = randomAngles[MathUtils.random(RANDOM_BUCKET_COUNT - 1)];
            float speed = MathUtils.random(40f, 120f);
            float vx = (float) Math.cos(angle) * speed;
            float vy = (float) Math.sin(angle) * speed;
            float lifetime = MathUtils.random(0.2f, 0.6f);
            float size = MathUtils.random(1f, 3f);
            float rotSpeed = MathUtils.random(-180f, 180f);
            p.init(x, y, vx, vy, lifetime, size,
                    1f, 1f, 1f, 1f, type, rotSpeed);
            active.add(p);
        }
    }

    /**
     * Emit a full explosion: sparks, debris, and smoke layered together.
     *
     * @param x     centre X
     * @param y     centre Y
     * @param sparks number of spark particles
     * @param debris number of debris particles
     * @param smoke  number of smoke particles
     */
    public void emitExplosion(float x, float y, int sparks, int debris, int smoke) {
        // Sparks: bright white-yellow, fast outward
        for (int i = 0; i < sparks; i++) {
            Particle p = acquire();
            if (p == null) break;
            float angle = randomAngles[MathUtils.random(RANDOM_BUCKET_COUNT - 1)];
            float speed = MathUtils.random(60f, 160f);
            float vx = (float) Math.cos(angle) * speed;
            float vy = (float) Math.sin(angle) * speed;
            float lifetime = MathUtils.random(0.15f, 0.45f);
            float size = MathUtils.random(1f, 2.5f);
            float rotSpeed = MathUtils.random(-200f, 200f);
            // Warm white-yellow
            float warmth = MathUtils.random(0.8f, 1f);
            p.init(x, y, vx, vy, lifetime, size,
                    warmth, warmth * MathUtils.random(0.6f, 0.9f), warmth * 0.3f, 1f,
                    Particle.ParticleType.SPARK, rotSpeed);
            active.add(p);
        }

        // Debris: darker fragments, slower
        for (int i = 0; i < debris; i++) {
            Particle p = acquire();
            if (p == null) break;
            float angle = randomAngles[MathUtils.random(RANDOM_BUCKET_COUNT - 1)];
            float speed = MathUtils.random(20f, 80f);
            float vx = (float) Math.cos(angle) * speed;
            float vy = (float) Math.sin(angle) * speed + MathUtils.random(20f, 60f);
            float lifetime = MathUtils.random(0.4f, 0.8f);
            float size = MathUtils.random(2f, 5f);
            float rotSpeed = MathUtils.random(-120f, 120f);
            float gray = MathUtils.random(0.3f, 0.6f);
            p.init(x, y, vx, vy, lifetime, size,
                    gray, gray * 0.8f, gray * 0.5f, 0.9f,
                    Particle.ParticleType.DEBRIS, rotSpeed);
            active.add(p);
        }

        // Smoke: dark expanding clouds
        for (int i = 0; i < smoke; i++) {
            Particle p = acquire();
            if (p == null) break;
            float angle = randomAngles[MathUtils.random(RANDOM_BUCKET_COUNT - 1)];
            float speed = MathUtils.random(10f, 40f);
            float vx = (float) Math.cos(angle) * speed;
            float vy = (float) Math.sin(angle) * speed;
            float lifetime = MathUtils.random(0.5f, 1.0f);
            float size = MathUtils.random(3f, 6f);
            float gray = MathUtils.random(0.2f, 0.4f);
            p.init(x, y, vx, vy, lifetime, size,
                    gray, gray, gray, 0.5f,
                    Particle.ParticleType.SMOKE, 0);
            active.add(p);
        }
    }

    /**
     * Emit a single engine trail particle (small spark drifting backward).
     *
     * @param x trail X
     * @param y trail Y
     */
    public void emitTrail(float x, float y) {
        Particle p = acquire();
        if (p == null) return;
        float vx = MathUtils.random(-10f, -30f);
        float vy = MathUtils.random(-8f, 8f);
        float lifetime = MathUtils.random(0.1f, 0.25f);
        float size = MathUtils.random(1f, 2f);
        // Orange-blue engine flame
        float t = MathUtils.random();
        p.init(x, y, vx, vy, lifetime, size,
                1f, 0.5f + t * 0.3f, t * 0.4f, 0.8f,
                Particle.ParticleType.SPARK, 0);
        active.add(p);
    }

    /**
     * Emit an expanding shockwave ring at a point.
     *
     * @param x centre X
     * @param y centre Y
     */
    public void emitShockwave(float x, float y) {
        Particle p = acquire();
        if (p == null) return;
        p.init(x, y, 0, 0, 0.5f, 4f,
                1f, 1f, 1f, 0.7f,
                Particle.ParticleType.SHOCKWAVE, 0);
        active.add(p);
    }

    /**
     * Emit a pulsing glow particle at a point.
     *
     * @param x centre X
     * @param y centre Y
     * @param r red component
     * @param g green component
     * @param b blue component
     */
    public void emitGlow(float x, float y, float r, float g, float b) {
        Particle p = acquire();
        if (p == null) return;
        p.init(x, y, 0, 0, 1.0f, 8f,
                r, g, b, 0.6f,
                Particle.ParticleType.GLOW, 0);
        active.add(p);
    }

    /**
     * Emit a pulsing glow with default white color.
     *
     * @param x centre X
     * @param y centre Y
     */
    public void emitGlow(float x, float y) {
        emitGlow(x, y, 1f, 1f, 1f);
    }

    /**
     * Emit a single ambient particle of the given type.
     * Callers should throttle calls to control emission rate.
     *
     * @param x     position X
     * @param y     position Y
     * @param type  ambient sub-type (ASH, NEON_SPARK, DEBRIS, SPORE)
     */
    public void emitAmbient(float x, float y, AmbientEffect.AmbientType type) {
        Particle p = acquire();
        if (p == null) return;

        switch (type) {
            case ASH: {
                // Orange/red ember, falls downward, flickers
                float vx = MathUtils.random(-5f, 5f);
                float vy = MathUtils.random(15f, 40f);
                float lifetime = MathUtils.random(2f, 4f);
                float size = MathUtils.random(1f, 2f);
                float warmth = MathUtils.random(0.6f, 1f);
                p.init(x, y, vx, vy, lifetime, size,
                        warmth, warmth * 0.3f, 0f, 0.6f,
                        Particle.ParticleType.AMBIENT, 0);
                break;
            }
            case NEON_SPARK: {
                // Blue/purple, floats upward, pulses
                float vx = MathUtils.random(-8f, 8f);
                float vy = MathUtils.random(-20f, -40f);
                float lifetime = MathUtils.random(1.5f, 3f);
                float size = MathUtils.random(1f, 2f);
                float t = MathUtils.random();
                p.init(x, y, vx, vy, lifetime, size,
                        0.3f + t * 0.2f, 0.2f, 0.8f + t * 0.2f, 0.7f,
                        Particle.ParticleType.AMBIENT, 0);
                break;
            }
            case DEBRIS: {
                // Gray/brown, drifts slowly, rotates
                float vx = MathUtils.random(-15f, 15f);
                float vy = MathUtils.random(-5f, 5f);
                float lifetime = MathUtils.random(3f, 6f);
                float size = MathUtils.random(2f, 4f);
                float rotSpeed = MathUtils.random(-40f, 40f);
                float gray = MathUtils.random(0.3f, 0.5f);
                p.init(x, y, vx, vy, lifetime, size,
                        gray, gray * 0.9f, gray * 0.7f, 0.5f,
                        Particle.ParticleType.AMBIENT, rotSpeed);
                break;
            }
            case SPORE: {
                // Green/pink, bobs sinusoidally, glows
                float vx = MathUtils.random(-10f, 10f);
                float vy = MathUtils.random(-10f, 10f);
                float lifetime = MathUtils.random(2f, 5f);
                float size = MathUtils.random(1.5f, 3f);
                float t = MathUtils.random();
                // Interpolate between green and pink
                float r = MathUtils.lerp(0.2f, 0.9f, t);
                float g = MathUtils.lerp(0.8f, 0.2f, t);
                float b = MathUtils.lerp(0.3f, 0.6f, t);
                p.init(x, y, vx, vy, lifetime, size,
                        r, g, b, 0.6f,
                        Particle.ParticleType.AMBIENT, 0);
                break;
            }
        }
        active.add(p);
    }

    // ------------------------------------------------------------------
    // Update & render
    // ------------------------------------------------------------------

    /**
     * Update all active particles and recycle dead ones.
     *
     * @param delta frame time in seconds
     */
    public void update(float delta) {
        for (int i = active.size - 1; i >= 0; i--) {
            Particle p = active.get(i);
            p.update(delta);
            if (!p.isAlive()) {
                active.removeIndex(i);
                recycle(p);
            }
        }
    }

    /**
     * Render all active particles in correct draw order:
     * shockwaves (background) → smoke → everything else.
     *
     * Batching strategy:
     * - All particles share a single texture (1×1 white pixel, tinted per particle)
     * - Type-sorted into 3 passes to maintain correct draw order
     * - Within each pass, particles use the same draw method (rotated vs non-rotated)
     *   so the SpriteBatch does not flush mid-pass
     * - Zero-GC: pre-allocated index arrays, direct array access
     *
     * @param batch the sprite batch (must already be begun by caller)
     */
    public void render(Batch batch) {
        // Early exit: nothing to render
        if (active.size == 0) return;

        Texture tex = particleTexture;
        TextureRegion region = particleRegion;
        if (tex == null) return;

        // Single-pass type sort into index arrays
        shockwaveCount = 0;
        smokeCount = 0;
        topCount = 0;
        for (int i = 0; i < active.size; i++) {
            Particle.ParticleType type = active.get(i).particleType;
            if (type == Particle.ParticleType.SHOCKWAVE) {
                shockwaveIndices[shockwaveCount++] = i;
            } else if (type == Particle.ParticleType.SMOKE) {
                smokeIndices[smokeCount++] = i;
            } else {
                topIndices[topCount++] = i;
            }
        }

        // Draw in order: shockwaves → smoke → top
        // Each pass uses the same texture and draw method, so no batch flush mid-pass
        Particle[] items = active.items;

        // Shockwaves (non-rotated, background)
        for (int i = 0; i < shockwaveCount; i++) {
            items[shockwaveIndices[i]].render(batch, tex, region);
        }

        // Smoke (non-rotated, mid-layer)
        for (int i = 0; i < smokeCount; i++) {
            items[smokeIndices[i]].render(batch, tex, region);
        }

        // Top layer: sparks, debris, glow, ambient (mixed rotated/non-rotated)
        for (int i = 0; i < topCount; i++) {
            items[topIndices[i]].render(batch, tex, region);
        }

        // Update debug stats
        debugRenderCalls++;
    }

    // ------------------------------------------------------------------
    // Debug / profiling
    // ------------------------------------------------------------------

    /** Total render() calls since creation (for profiling) */
    private int debugRenderCalls;

    /**
     * @return total render() calls since creation
     */
    public int getDebugRenderCalls() {
        return debugRenderCalls;
    }

    /**
     * @return number of shockwave particles in last render pass
     */
    public int getLastShockwaveCount() {
        return shockwaveCount;
    }

    /**
     * @return number of smoke particles in last render pass
     */
    public int getLastSmokeCount() {
        return smokeCount;
    }

    /**
     * @return number of top-layer particles in last render pass
     */
    public int getLastTopCount() {
        return topCount;
    }

    /**
     * Set the texture used for particle rendering.
     * Creates a cached TextureRegion for rotated draws.
     *
     * @param texture the particle texture (typically 1×1 white pixel)
     */
    public void setParticleTexture(Texture texture) {
        this.particleTexture = texture;
        if (texture != null) {
            this.particleRegion = new TextureRegion(texture);
        }
    }

    // ------------------------------------------------------------------
    // Pool management
    // ------------------------------------------------------------------

    /**
     * Acquire a particle from the pool if the active count is below cap.
     *
     * @return a fresh particle, or null if at capacity
     */
    private Particle acquire() {
        if (active.size >= maxActive) {
            return null;
        }
        return pool.obtain();
    }

    /**
     * Return a particle to the pool for reuse.
     *
     * @param particle the particle to recycle
     */
    public void recycle(Particle particle) {
        particle.kill();
        pool.free(particle);
    }

    /**
     * Clear all active particles and return them to the pool.
     */
    public void clear() {
        for (int i = 0; i < active.size; i++) {
            recycle(active.get(i));
        }
        active.clear();
    }
}
