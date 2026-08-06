package com.thunderforce.config;

/**
 * GPU quality tier selection based on renderer capabilities.
 * Controls particle caps, parallax layers, and post-processing.
 */
public enum QualityTier {
    LOW(200, 4, false, 500),
    MEDIUM(500, 6, false, 1000),
    HIGH(1000, 10, true, 2000);

    private final int maxParticles;
    private final int maxParallaxLayers;
    private final boolean postProcessing;
    private final int maxBullets;

    QualityTier(int maxParticles, int maxParallaxLayers, boolean postProcessing, int maxBullets) {
        this.maxParticles = maxParticles;
        this.maxParallaxLayers = maxParallaxLayers;
        this.postProcessing = postProcessing;
        this.maxBullets = maxBullets;
    }

    public int getMaxParticles() {
        return maxParticles;
    }

    public int getMaxParallaxLayers() {
        return maxParallaxLayers;
    }

    public boolean isPostProcessing() {
        return postProcessing;
    }

    public int getMaxBullets() {
        return maxBullets;
    }
}
