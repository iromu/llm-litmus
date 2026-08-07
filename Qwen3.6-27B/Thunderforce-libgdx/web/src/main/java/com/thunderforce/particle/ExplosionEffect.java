package com.thunderforce.particle;

/**
 * Explosion effect factory with five predefined sizes.
 * Each size controls particle counts, duration, and screen shake intensity.
 */
public final class ExplosionEffect {

    /**
     * Explosion size categories from tiny hit to screen-filling blast.
     */
    public enum ExplosionSize {
        TINY,
        SMALL,
        MEDIUM,
        LARGE,
        MASSIVE
    }

    private ExplosionEffect() {
        // Utility class
    }

    /**
     * Create and emit an explosion of the given size at the specified position.
     *
     * @param size         explosion size category
     * @param x            centre X
     * @param y            centre Y
     * @param particleSystem target system to emit into
     */
    public static void create(ExplosionSize size, float x, float y, ParticleSystem particleSystem) {
        switch (size) {
            case TINY:
                // 5 sparks, ~0.2s duration
                for (int i = 0; i < 5; i++) {
                    Particle p = acquireOrReturn(particleSystem);
                    if (p == null) return;
                    float angle = com.badlogic.gdx.math.MathUtils.random() * com.badlogic.gdx.math.MathUtils.PI2;
                    float speed = com.badlogic.gdx.math.MathUtils.random(30f, 70f);
                    float vx = (float) Math.cos(angle) * speed;
                    float vy = (float) Math.sin(angle) * speed;
                    p.init(x, y, vx, vy, 0.2f, 1f,
                            1f, 0.9f, 0.5f, 1f,
                            Particle.ParticleType.SPARK, com.badlogic.gdx.math.MathUtils.random(-180f, 180f));
                    particleSystem.getActiveArray().add(p);
                }
                break;

            case SMALL:
                // 10 sparks + 3 debris, ~0.4s
                particleSystem.emitExplosion(x, y, 10, 3, 0);
                break;

            case MEDIUM:
                // 20 sparks + 8 debris + 5 smoke, ~0.6s
                particleSystem.emitExplosion(x, y, 20, 8, 5);
                break;

            case LARGE:
                // 30 sparks + 15 debris + 10 smoke + 1 shockwave, ~0.8s
                particleSystem.emitExplosion(x, y, 30, 15, 10);
                particleSystem.emitShockwave(x, y);
                break;

            case MASSIVE:
                // 50 sparks + 25 debris + 20 smoke + 2 shockwave, ~1.2s
                particleSystem.emitExplosion(x, y, 50, 25, 20);
                particleSystem.emitShockwave(x, y);
                // Second offset shockwave for depth
                Particle p2 = acquireOrReturn(particleSystem);
                if (p2 != null) {
                    p2.init(x + 2f, y - 1f, 0, 0, 0.6f, 3f,
                            1f, 0.9f, 0.8f, 0.5f,
                            Particle.ParticleType.SHOCKWAVE, 0);
                    particleSystem.getActiveArray().add(p2);
                }
                break;
        }
    }

    /**
     * Get the screen shake intensity for a given explosion size.
     *
     * @param size explosion size
     * @return shake intensity (pixel displacement amplitude)
     */
    public static float getScreenShakeIntensity(ExplosionSize size) {
        switch (size) {
            case TINY:    return 0f;
            case SMALL:   return 1.5f;
            case MEDIUM:  return 3f;
            case LARGE:   return 5f;
            case MASSIVE: return 8f;
            default:      return 0f;
        }
    }

    /**
     * Get the recommended screen shake duration for a given explosion size.
     *
     * @param size explosion size
     * @return shake duration in seconds
     */
    public static float getScreenShakeDuration(ExplosionSize size) {
        switch (size) {
            case TINY:    return 0f;
            case SMALL:   return 0.15f;
            case MEDIUM:  return 0.3f;
            case LARGE:   return 0.5f;
            case MASSIVE: return 0.8f;
            default:      return 0f;
        }
    }

    /**
     * Try to acquire a particle from the system's pool.
     * Returns null if the system is at capacity.
     */
    private static Particle acquireOrReturn(ParticleSystem system) {
        if (system.getActiveCount() >= system.getMaxActive()) {
            return null;
        }
        return system.obtainParticle();
    }
}
