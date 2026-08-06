package com.thunderforce.rendering;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.Camera;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.Pixmap;
import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.glutils.FrameBuffer;
import com.badlogic.gdx.graphics.glutils.ShaderProgram;
import com.badlogic.gdx.math.Rectangle;
import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.math.Vector3;
import com.thunderforce.config.GameConfig;

/**
 * Adaptive rendering pipeline:
 * - Fixed 320×224 internal resolution with nearest-neighbor filtering
 * - Dynamic camera viewport from display aspect ratio
 * - Integer-scaled output with overscan crop
 */
public class RenderPipeline {

    public static final int INTERNAL_WIDTH = 320;
    public static final int INTERNAL_HEIGHT = 224;

    private final OrthographicCamera camera;
    private final FrameBuffer frameBuffer;
    private final Texture frameBufferTexture;
    private final SpriteBatch screenBatch;

    // Viewport calculation
    private float viewportWidth;
    private float viewportHeight;
    private int scaleFactor;
    private boolean overscanEnabled;
    private float overscanFactor;

    // Render bounds (for overscan crop)
    private final Vector3 touchPos;
    private final Rectangle renderBounds;

    public RenderPipeline() {
        this.camera = new OrthographicCamera();
        this.camera.position.set(INTERNAL_WIDTH / 2f, INTERNAL_HEIGHT / 2f, 0);

        // Create internal render target
        this.frameBuffer = new FrameBuffer(
            Pixmap.Format.RGBA8888,
            INTERNAL_WIDTH, INTERNAL_HEIGHT, false
        );
        this.frameBufferTexture = frameBuffer.getColorBufferTexture();
        this.frameBufferTexture.setFilter(
            Texture.TextureFilter.Nearest, Texture.TextureFilter.Nearest
        );

        this.screenBatch = new SpriteBatch();
        this.touchPos = new Vector3();
        this.renderBounds = new Rectangle();

        updateViewport(Gdx.graphics.getWidth(), Gdx.graphics.getHeight());
    }

    /**
     * Recalculate viewport based on display dimensions.
     */
    public void updateViewport(int displayWidth, int displayHeight) {
        float displayAspect = (float) displayWidth / displayHeight;
        float internalAspect = (float) INTERNAL_WIDTH / INTERNAL_HEIGHT;

        // Dynamic viewport: wider displays see more horizontal content
        if (displayAspect > internalAspect) {
            viewportHeight = INTERNAL_HEIGHT;
            viewportWidth = INTERNAL_HEIGHT * displayAspect;
        } else {
            viewportWidth = INTERNAL_WIDTH;
            viewportHeight = INTERNAL_WIDTH / displayAspect;
        }

        camera.viewportWidth = viewportWidth;
        camera.viewportHeight = viewportHeight;
        camera.update();

        // Integer scaling
        float scaleX = displayWidth / (float) INTERNAL_WIDTH;
        float scaleY = displayHeight / (float) INTERNAL_HEIGHT;
        scaleFactor = Math.min((int) scaleX, (int) scaleY);
        if (scaleFactor < 1) scaleFactor = 1;

        int scaledWidth = INTERNAL_WIDTH * scaleFactor;
        int scaledHeight = INTERNAL_HEIGHT * scaleFactor;

        // Overscan crop: if letterboxing > 20px, scale up slightly
        float remainingH = displayWidth - scaledWidth;
        float remainingV = displayHeight - scaledHeight;
        if (Math.max(remainingH, remainingV) > 20) {
            overscanEnabled = true;
            // Scale up 2-3% to minimize letterboxing
            if (remainingH > remainingV) {
                overscanFactor = (float) displayWidth / scaledWidth;
            } else {
                overscanFactor = (float) displayHeight / scaledHeight;
            }
            overscanFactor = Math.min(overscanFactor, 1.05f); // cap at 5%
        } else {
            overscanEnabled = false;
            overscanFactor = 1f;
        }

        // Calculate render bounds
        float finalWidth = scaledWidth * overscanFactor;
        float finalHeight = scaledHeight * overscanFactor;
        renderBounds.x = (displayWidth - finalWidth) / 2f;
        renderBounds.y = (displayHeight - finalHeight) / 2f;
        renderBounds.width = finalWidth;
        renderBounds.height = finalHeight;
    }

    /**
     * Begin rendering to the internal frame buffer.
     * Returns the camera for use with SpriteBatch.
     */
    public Camera beginFrameBuffer() {
        frameBuffer.begin();
        Gdx.gl.glClearColor(0, 0, 0, 1);
        Gdx.gl.glClear(Gdx.gl.GL_COLOR_BUFFER_BIT);
        camera.update();
        return camera;
    }

    /**
     * Finish rendering to the frame buffer.
     */
    public void endFrameBuffer() {
        frameBuffer.end();
    }

    /**
     * Render the frame buffer to the screen with integer scaling.
     */
    public void renderToScreen() {
        screenBatch.begin();
        screenBatch.setProjectionMatrix(
            new com.badlogic.gdx.math.Matrix4()
                .setToOrtho2D(0, 0, Gdx.graphics.getWidth(), Gdx.graphics.getHeight())
        );
        screenBatch.draw(
            frameBufferTexture,
            renderBounds.x, renderBounds.y,
            renderBounds.width, renderBounds.height
        );
        screenBatch.end();
    }

    /**
     * Unproject screen coordinates to world coordinates.
     */
    public Vector2 unproject(float screenX, float screenY) {
        touchPos.set(screenX, screenY, 0);
        // Adjust for render bounds offset
        touchPos.x -= renderBounds.x;
        touchPos.y -= renderBounds.y;
        // Scale from screen to internal
        touchPos.x *= (renderBounds.width / INTERNAL_WIDTH);
        touchPos.y *= (renderBounds.height / INTERNAL_HEIGHT);
        camera.unproject(touchPos);
        return new Vector2(touchPos.x, touchPos.y);
    }

    public OrthographicCamera getCamera() {
        return camera;
    }

    public int getScaleFactor() {
        return scaleFactor;
    }

    public float getViewportWidth() {
        return viewportWidth;
    }

    public float getViewportHeight() {
        return viewportHeight;
    }

    public Rectangle getRenderBounds() {
        return renderBounds;
    }

    public void dispose() {
        frameBuffer.dispose();
        screenBatch.dispose();
    }
}
