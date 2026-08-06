package com.thunderforce.gameplay.boss;

/**
 * Minimal math constants shared across boss code.
 * Avoids pulling in extra dependencies.
 */
final class MathUtils {
    static final float PI2 = (float) (Math.PI * 2);
    static final float DEGTORAD = (float) (Math.PI / 180f);

    private MathUtils() {}
}
