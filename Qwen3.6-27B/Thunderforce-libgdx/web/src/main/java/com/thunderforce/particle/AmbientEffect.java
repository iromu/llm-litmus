package com.thunderforce.particle;

import com.badlogic.gdx.math.MathUtils;

/**
 * Biome-specific ambient particle effects.
 * Emits themed particles at controlled rates based on biome type.
 */
public class AmbientEffect {

    /**
     * Ambient particle sub-types mapped to biomes.
     */
    public enum AmbientType {
        /** Volcanic biome: falling orange/red ash embers */
        ASH,
        /** City biome: floating blue/purple neon sparks */
        NEON_SPARK,
        /** Asteroid biome: drifting gray/brown debris */
        DEBRIS,
        /** Alien biome: bobbing green/pink glowing spores */
        SPORE
    }

    // Emission accumulator (avoids per-frame allocation)
    private float emitAccumulator;

    // Emission rate per second per type
    private static final float ASH_RATE = 3f;
    private static final float NEON_SPARK_RATE = 2f;
    private static final float DEBRIS_RATE = 1.5f;
    private static final float SPORE_RATE = 2.5f;

    /**
     * Create a new ambient effect emitter.
     */
    public AmbientEffect() {
        this.emitAccumulator = 0f;
    }

    /**
     * Update and emit ambient particles for the current biome.
     * Particles are spawned across the viewport width at the top edge
     * (or bottom for upward-drifting types).
     *
     * @param delta         frame time in seconds
     * @param type          ambient type for the current biome
     * @param particleSystem target system to emit into
     * @param viewportWidth current viewport width in internal pixels
     */
    public void update(float delta, AmbientType type, ParticleSystem particleSystem, float viewportWidth) {
        float rate = getEmitRate(type);
        emitAccumulator += delta * rate;

        while (emitAccumulator >= 1f) {
            emitAccumulator -= 1f;
            emitSingle(type, particleSystem, viewportWidth);
        }
    }

    private void emitSingle(AmbientType type, ParticleSystem particleSystem, float viewportWidth) {
        float x = MathUtils.random(viewportWidth);
        float y;

        switch (type) {
            case ASH:
                // Spawn at top, falls downward
                y = -5f;
                particleSystem.emitAmbient(x, y, type);
                break;
            case NEON_SPARK:
                // Spawn at bottom, floats upward
                y = 229f;
                particleSystem.emitAmbient(x, y, type);
                break;
            case DEBRIS:
                // Spawn at edges, drifts inward
                if (MathUtils.random() > 0.5f) {
                    x = -10f;
                } else {
                    x = viewportWidth + 10f;
                }
                y = MathUtils.random(224f);
                particleSystem.emitAmbient(x, y, type);
                break;
            case SPORE:
                // Spawn randomly across bottom quarter
                y = MathUtils.random(168f, 229f);
                particleSystem.emitAmbient(x, y, type);
                break;
        }
    }

    private float getEmitRate(AmbientType type) {
        switch (type) {
            case ASH:          return ASH_RATE;
            case NEON_SPARK:   return NEON_SPARK_RATE;
            case DEBRIS:       return DEBRIS_RATE;
            case SPORE:        return SPORE_RATE;
            default:           return 1f;
        }
    }

    /**
     * Reset the emission accumulator (e.g., on biome change).
     */
    public void reset() {
        emitAccumulator = 0f;
    }
}
