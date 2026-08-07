package com.thunderforce.replay;

import com.badlogic.gdx.math.RandomXS128;

/**
 * Seeded PRNG for deterministic gameplay.
 * Same seed produces identical random sequences across runs.
 */
public class SeededRng {

    private final RandomXS128 rng;

    public SeededRng(long seed) {
        this.rng = new RandomXS128(seed);
    }

    public float nextFloat() {
        return rng.nextFloat();
    }

    public int nextInt(int bound) {
        return rng.nextInt(bound);
    }

    public int nextInt(int startInclusive, int endExclusive) {
        return startInclusive + rng.nextInt(endExclusive - startInclusive);
    }

    public long nextLong() {
        return rng.nextLong();
    }

    public boolean nextBoolean() {
        return rng.nextBoolean();
    }

    public float nextGaussian() {
        return (float) rng.nextGaussian();
    }

    public long getSeed() {
        // RandomXS128 uses two 64-bit seeds; return the first
        return rng.getState(0);
    }
}
