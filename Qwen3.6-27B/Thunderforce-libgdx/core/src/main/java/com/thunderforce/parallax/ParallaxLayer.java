package com.thunderforce.parallax;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.Camera;
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.g2d.Batch;
import com.badlogic.gdx.graphics.g2d.TextureRegion;
import com.badlogic.gdx.graphics.glutils.ShaderProgram;
import com.badlogic.gdx.math.Interpolation;
import com.badlogic.gdx.utils.Array;

/**
 * Parallax layer with scroll speed multiplier, texture, and vertical position.
 * Supports seamless horizontal tile wrapping via UV coordinate management.
 */
public class ParallaxLayer {

    private final TextureRegion texture;
    private final float scrollSpeed; // 0.1f (far) to 1.0f (near)
    private final float yPos; // vertical position in internal coords (0-224)
    private final float layerHeight;
    private float scrollOffset;
    private float alpha;
    private ShaderProgram shader;
    private final Array<Float> paletteShift;

    public ParallaxLayer(TextureRegion texture, float scrollSpeed, float yPos, float layerHeight) {
        this.texture = texture;
        this.scrollSpeed = scrollSpeed;
        this.yPos = yPos;
        this.layerHeight = layerHeight;
        this.scrollOffset = 0;
        this.alpha = 1f;
        this.paletteShift = new Array<>(256);
    }

    /**
     * Update scroll position.
     *
     * @param worldScroll the world scroll amount (pixels moved this frame)
     */
    public void update(float worldScroll) {
        scrollOffset += worldScroll * scrollSpeed;
        // Wrap at texture width for seamless tiling
        float texWidth = texture.getRegionWidth();
        if (scrollOffset >= texWidth) {
            scrollOffset -= texWidth;
        } else if (scrollOffset < 0) {
            scrollOffset += texWidth;
        }
    }

    /**
     * Render the layer with seamless horizontal tiling.
     *
     * @param batch the sprite batch
     * @param camera the camera
     * @param viewportWidth the current viewport width
     */
    public void render(Batch batch, Camera camera, float viewportWidth) {
        if (shader != null) {
            batch.setShader(shader);
        }

        float texWidth = texture.getRegionWidth();
        float texHeight = texture.getRegionHeight();

        // Calculate how many tiles we need to cover the viewport
        float tilesNeeded = (float) Math.ceil((viewportWidth + scrollOffset) / texWidth) + 1;

        batch.setColor(1f, 1f, 1f, alpha);

        for (int i = -1; i < tilesNeeded; i++) {
            float drawX = i * texWidth - scrollOffset;
            batch.draw(texture, drawX, yPos, texWidth, layerHeight);
        }

        batch.setShader(null);
    }

    public void setShader(ShaderProgram shader) {
        this.shader = shader;
    }

    public void setAlpha(float alpha) {
        this.alpha = alpha;
    }

    public float getScrollSpeed() {
        return scrollSpeed;
    }

    public float getScrollOffset() {
        return scrollOffset;
    }

    public TextureRegion getTexture() {
        return texture;
    }
}
