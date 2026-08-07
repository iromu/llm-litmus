package com.thunderforce.parallax;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.Camera;
import com.badlogic.gdx.graphics.g2d.Batch;
import com.badlogic.gdx.graphics.g2d.TextureRegion;
import com.badlogic.gdx.math.Interpolation;
import com.badlogic.gdx.utils.Array;

/**
 * Manages 4-10 parallax layers with per-biome configuration.
 * Supports biome transitions with crossfade.
 */
public class ParallaxManager {

    private final Array<ParallaxLayer> currentLayers;
    private final Array<ParallaxLayer> targetLayers;
    private final Array<ParallaxLayer> fadeLayers;

    // Scroll state
    private float worldScroll;
    private float currentSpeed;
    private float targetSpeed;
    private float speedChangeRate;

    // Biome transition
    private boolean transitioning;
    private float transitionProgress;
    private float transitionDuration;

    // Active biome
    private Biome activeBiome;

    public enum Biome {
        VOLCANIC, CITY, ASTEROID, ALIEN
    }

    public ParallaxManager(int maxLayers) {
        this.currentLayers = new Array<>(maxLayers);
        this.targetLayers = new Array<>(maxLayers);
        this.fadeLayers = new Array<>(maxLayers);
        this.worldScroll = 0;
        this.currentSpeed = 60f; // pixels per second
        this.targetSpeed = 60f;
        this.speedChangeRate = 30f;
        this.activeBiome = Biome.VOLCANIC;
    }

    /**
     * Set layers for a biome.
     */
    public void setBiomeLayers(Biome biome, Array<TextureRegion> textures, float[] speeds, float[] yPositions, float[] heights) {
        targetLayers.clear();
        for (int i = 0; i < textures.size && i < speeds.length; i++) {
            float h = (i < heights.length) ? heights[i] : 224f;
            targetLayers.add(new ParallaxLayer(textures.get(i), speeds[i], yPositions[i], h));
        }
    }

    /**
     * Start biome transition with crossfade.
     */
    public void startTransition(float duration) {
        transitioning = true;
        transitionProgress = 0f;
        transitionDuration = duration;
    }

    /**
     * Update scroll and transition.
     */
    public void update(float delta) {
        // Smooth speed changes
        if (Math.abs(targetSpeed - currentSpeed) > 0.1f) {
            currentSpeed += (targetSpeed - currentSpeed) * speedChangeRate * delta;
        } else {
            currentSpeed = targetSpeed;
        }

        // Update world scroll
        worldScroll += currentSpeed * delta;

        // Update current layers
        for (ParallaxLayer layer : currentLayers) {
            layer.update(currentSpeed * delta);
        }

        // Handle transition
        if (transitioning) {
            transitionProgress += delta / transitionDuration;
            if (transitionProgress >= 1f) {
                // Complete transition
                currentLayers.clear();
                for (ParallaxLayer layer : targetLayers) {
                    currentLayers.add(layer);
                }
                transitioning = false;
                transitionProgress = 0f;
            } else {
                // Crossfade: blend alphas
                float fade = Interpolation.fade.apply(transitionProgress);
                for (ParallaxLayer layer : currentLayers) {
                    layer.setAlpha(1f - fade);
                }
                // Render target layers with increasing alpha
                for (int i = 0; i < targetLayers.size && i < currentLayers.size; i++) {
                    targetLayers.get(i).setAlpha(fade);
                    targetLayers.get(i).update(currentSpeed * delta);
                }
            }
        }
    }

    /**
     * Render all layers.
     */
    public void render(Batch batch, Camera camera, float viewportWidth) {
        // Render current layers (fading out during transition)
        for (ParallaxLayer layer : currentLayers) {
            layer.render(batch, camera, viewportWidth);
        }

        // Render target layers (fading in during transition)
        if (transitioning) {
            for (ParallaxLayer layer : targetLayers) {
                layer.render(batch, camera, viewportWidth);
            }
        }
    }

    /**
     * Set scroll speed target (for acceleration/deceleration).
     */
    public void setTargetSpeed(float speed) {
        this.targetSpeed = speed;
    }

    public float getCurrentSpeed() {
        return currentSpeed;
    }

    public float getWorldScroll() {
        return worldScroll;
    }

    public Biome getActiveBiome() {
        return activeBiome;
    }

    public void setActiveBiome(Biome biome) {
        this.activeBiome = biome;
    }

    public boolean isTransitioning() {
        return transitioning;
    }

    public Array<ParallaxLayer> getCurrentLayers() {
        return currentLayers;
    }
}
