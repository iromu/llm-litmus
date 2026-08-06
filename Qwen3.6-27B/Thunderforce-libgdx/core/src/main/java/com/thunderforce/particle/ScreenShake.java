package com.thunderforce.particle;

import com.badlogic.gdx.math.MathUtils;

/**
 * Screen shake effect using damped sine waves with random phase.
 * Produces an organic, non-repetitive camera offset that decays
 * over the configured duration.
 */
public class ScreenShake {

    // Current shake parameters
    private float intensity;
    private float duration;
    private float elapsed;

    // Frequency in Hz for the base sine wave
    private float frequency;

    // Current offset output
    private float offsetX;
    private float offsetY;

    // Phase offsets for X and Y (randomized on trigger)
    private float phaseX;
    private float phaseY;

    // Secondary frequency for irregularity
    private float frequencySecondary;
    private float phaseX2;
    private float phaseY2;

    /**
     * @return true while the shake is still active
     */
    public boolean isActive() {
        return elapsed < duration && intensity > 0.01f;
    }

    /**
     * Trigger a new screen shake, replacing any current shake.
     *
     * @param intensity   peak pixel displacement amplitude
     * @param duration    total shake duration in seconds
     * @param frequency   base oscillation frequency in Hz
     */
    public void trigger(float intensity, float duration, float frequency) {
        this.intensity = intensity;
        this.duration = duration;
        this.elapsed = 0f;
        this.frequency = frequency;
        this.offsetX = 0f;
        this.offsetY = 0f;

        // Random phases for organic feel
        this.phaseX = MathUtils.random() * MathUtils.PI2;
        this.phaseY = MathUtils.random() * MathUtils.PI2;
        this.frequencySecondary = frequency * MathUtils.random(1.3f, 2.1f);
        this.phaseX2 = MathUtils.random() * MathUtils.PI2;
        this.phaseY2 = MathUtils.random() * MathUtils.PI2;
    }

    /**
     * Advance the shake by delta seconds.
     * Computes a new offset each frame from layered sine waves
     * with a decay envelope.
     *
     * @param delta frame time in seconds
     * @return false when the shake has completed
     */
    public boolean update(float delta) {
        if (!isActive()) {
            offsetX = 0f;
            offsetY = 0f;
            return false;
        }

        elapsed += delta;

        // Decay envelope: 1.0 → 0.0 over duration
        float decay = 1.0f - (elapsed / duration);
        decay = Math.max(0f, decay);
        // Slight ease-out curve
        decay = decay * decay;

        float currentIntensity = intensity * decay;

        // Primary sine wave
        float waveX1 = (float) Math.sin(elapsed * frequency * MathUtils.PI2 + phaseX);
        float waveY1 = (float) Math.sin(elapsed * frequency * MathUtils.PI2 + phaseY);

        // Secondary wave for irregularity (lower amplitude)
        float waveX2 = (float) Math.sin(elapsed * frequencySecondary * MathUtils.PI2 + phaseX2);
        float waveY2 = (float) Math.sin(elapsed * frequencySecondary * MathUtils.PI2 + phaseY2);

        // Combine: primary at full weight, secondary at 0.4 weight
        offsetX = (waveX1 + waveX2 * 0.4f) * currentIntensity;
        offsetY = (waveY1 + waveY2 * 0.4f) * currentIntensity;

        return elapsed < duration;
    }

    /**
     * @return current horizontal shake offset in pixels
     */
    public float getOffsetX() {
        return offsetX;
    }

    /**
     * @return current vertical shake offset in pixels
     */
    public float getOffsetY() {
        return offsetY;
    }

    /**
     * Immediately stop the shake and zero offsets.
     */
    public void stop() {
        intensity = 0f;
        elapsed = duration;
        offsetX = 0f;
        offsetY = 0f;
    }

    /**
     * @return current peak intensity (before decay)
     */
    public float getIntensity() {
        return intensity;
    }

    /**
     * @return remaining shake time in seconds
     */
    public float getRemaining() {
        return Math.max(0f, duration - elapsed);
    }
}
