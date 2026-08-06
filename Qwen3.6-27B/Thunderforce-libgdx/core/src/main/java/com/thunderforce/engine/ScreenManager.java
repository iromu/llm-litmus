package com.thunderforce.engine;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.Screen;
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.GL20;
import com.badlogic.gdx.graphics.g2d.Batch;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.math.Interpolation;
import com.badlogic.gdx.utils.Array;

/**
 * Manages game screens with fade-to-black transitions.
 * Handles screen lifecycle and animated transitions.
 */
public class ScreenManager implements Screen {

    private final Array<ManagedScreen> screenStack;
    private final SpriteBatch batch;
    private final FadeOverlay fadeOverlay;
    private Screen currentScreen;

    public ScreenManager() {
        this.screenStack = new Array<>();
        this.batch = new SpriteBatch();
        this.fadeOverlay = new FadeOverlay();
    }

    /**
     * Push a new screen onto the stack with a fade transition.
     * The current screen is paused, new screen is shown after fade.
     *
     * @param screen     the new screen
     * @param fadeDuration transition duration in seconds
     */
    public void push(Screen screen, float fadeDuration) {
        if (currentScreen != null) {
            currentScreen.pause();
        }

        fadeOverlay.startFade(fadeDuration);
        screenStack.add(new ManagedScreen(screen));
        currentScreen = screen;
        currentScreen.show();
    }

    /**
     * Replace the current screen with a new one (pop + push).
     */
    public void replace(Screen screen, float fadeDuration) {
        pop(false);
        push(screen, fadeDuration);
    }

    /**
     * Pop the current screen off the stack.
     *
     * @return the popped screen, or null if stack is empty
     */
    public Screen pop(boolean dispose) {
        Screen popped = currentScreen;
        if (popped != null) {
            popped.hide();
            if (dispose) {
                popped.dispose();
            }
        }

        if (!screenStack.isEmpty()) {
            screenStack.removeIndex(screenStack.size - 1);
        }

        if (!screenStack.isEmpty()) {
            currentScreen = screenStack.peek().screen;
            currentScreen.resume();
            currentScreen.show();
        } else {
            currentScreen = null;
        }

        return popped;
    }

    /**
     * Get the current active screen.
     */
    public Screen getCurrent() {
        return currentScreen;
    }

    // === Screen lifecycle ===

    @Override
    public void show() {
        fadeOverlay.reset();
    }

    @Override
    public void render(float delta) {
        // Update fade
        fadeOverlay.update(delta);

        // Render current screen
        if (currentScreen != null) {
            currentScreen.render(delta);
        }

        // Render fade overlay
        if (fadeOverlay.isActive()) {
            Gdx.gl.glEnable(GL20.GL_BLEND);
            Gdx.gl.glBlendFunc(GL20.GL_SRC_ALPHA, GL20.GL_ONE_MINUS_SRC_ALPHA);

            batch.begin();
            batch.setColor(Color.BLACK);
            batch.draw(fadeOverlay.getFadeTexture(), 0, 0, Gdx.graphics.getWidth(), Gdx.graphics.getHeight());
            batch.end();

            Gdx.gl.glDisable(GL20.GL_BLEND);
        }
    }

    @Override
    public void resize(int width, int height) {
        if (currentScreen != null) {
            currentScreen.resize(width, height);
        }
    }

    @Override
    public void pause() {
        if (currentScreen != null) {
            currentScreen.pause();
        }
    }

    @Override
    public void resume() {
        if (currentScreen != null) {
            currentScreen.resume();
        }
    }

    @Override
    public void hide() {
        if (currentScreen != null) {
            currentScreen.hide();
        }
    }

    @Override
    public void dispose() {
        if (currentScreen != null) {
            currentScreen.dispose();
        }
        for (ManagedScreen ms : screenStack) {
            ms.screen.dispose();
        }
        screenStack.clear();
        batch.dispose();
        fadeOverlay.dispose();
    }

    private static class ManagedScreen {
        final Screen screen;
        ManagedScreen(Screen screen) {
            this.screen = screen;
        }
    }

    /**
     * Fade overlay for screen transitions.
     */
    private static class FadeOverlay {
        private static final com.badlogic.gdx.graphics.Texture FADE_TEXTURE =
            new com.badlogic.gdx.graphics.Texture(1, 1, com.badlogic.gdx.graphics.Pixmap.Format.RGBA8888);

        static {
            com.badlogic.gdx.graphics.Pixmap pixmap = new com.badlogic.gdx.graphics.Pixmap(1, 1, com.badlogic.gdx.graphics.Pixmap.Format.RGBA8888);
            pixmap.setColor(Color.WHITE);
            pixmap.drawPixel(0, 0);
            FADE_TEXTURE.draw(pixmap, 0, 0);
            pixmap.dispose();
            FADE_TEXTURE.setFilter(com.badlogic.gdx.graphics.Texture.TextureFilter.Nearest, com.badlogic.gdx.graphics.Texture.TextureFilter.Nearest);
        }

        private float alpha;
        private float targetAlpha;
        private float fadeSpeed;
        private boolean fading;
        private boolean fadingIn;

        FadeOverlay() {
            alpha = 0f;
            targetAlpha = 0f;
            fading = false;
            fadingIn = false;
        }

        void startFade(float duration) {
            // Fade in then out
            fading = true;
            fadingIn = true;
            fadeSpeed = 1f / (duration / 2f);
            targetAlpha = 1f;
        }

        void update(float delta) {
            if (!fading) return;

            if (fadingIn) {
                alpha += fadeSpeed * delta;
                if (alpha >= 1f) {
                    alpha = 1f;
                    fadingIn = false;
                    // Start fading out
                    targetAlpha = 0f;
                }
            } else {
                alpha -= fadeSpeed * delta;
                if (alpha <= 0f) {
                    alpha = 0f;
                    fading = false;
                }
            }
        }

        void reset() {
            alpha = 0f;
            fading = false;
        }

        boolean isActive() {
            return alpha > 0.01f;
        }

        com.badlogic.gdx.graphics.Texture getFadeTexture() {
            return FADE_TEXTURE;
        }

        void dispose() {
            // FADE_TEXTURE is static, don't dispose
        }
    }
}
