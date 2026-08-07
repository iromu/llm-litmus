package com.thunderforce.presentation.screen;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.Input;
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.g2d.BitmapFont;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.math.Vector2;
import com.thunderforce.engine.AssetLoader;
import com.thunderforce.engine.ThunderforceGame;
import com.thunderforce.parallax.ParallaxManager;

/**
 * Title screen with animated logo, scrolling background, and "PRESS START" prompt.
 * Auto-starts demo after 8 seconds of inactivity.
 */
public class TitleScreen implements ThunderforceGame.GameScreen {

    private final ThunderforceGame game;
    private final SpriteBatch batch;
    private final BitmapFont font;
    private final OrthographicCamera camera;

    // Animation state
    private float elapsedTime;
    private float autoStartTimer;
    private static final float AUTO_START_DELAY = 8f;
    private boolean started;
    private float logoPulse;

    // Background scroll
    private final ParallaxManager parallax;
    private final Vector2 scrollVelocity;

    public TitleScreen(ThunderforceGame game) {
        this.game = game;
        this.batch = new SpriteBatch();
        this.font = new BitmapFont();
        this.camera = new OrthographicCamera(ThunderforceGame.INTERNAL_WIDTH, ThunderforceGame.INTERNAL_HEIGHT);
        this.camera.position.set(ThunderforceGame.INTERNAL_WIDTH / 2f, ThunderforceGame.INTERNAL_HEIGHT / 2f, 0);
        this.camera.update();

        this.elapsedTime = 0;
        this.autoStartTimer = 0;
        this.started = false;
        this.logoPulse = 0;

        this.parallax = new ParallaxManager(4);
        this.scrollVelocity = new Vector2(30f, 0);
    }

    @Override
    public void show() {
        started = false;
        autoStartTimer = 0;
        elapsedTime = 0;
    }

    public void update(float delta) {
        elapsedTime += delta;
        logoPulse += delta * 3f; // pulse speed

        if (!started) {
            autoStartTimer += delta;

            // Check for manual start
            if (Gdx.input.isKeyJustPressed(Input.Keys.SPACE)
                || Gdx.input.isKeyJustPressed(Input.Keys.ENTER)
                || Gdx.input.isKeyJustPressed(Input.Keys.ENTER)
                || Gdx.input.justTouched()) {
                startDemo();
            }

            // Auto-start after delay
            if (autoStartTimer >= AUTO_START_DELAY) {
                startDemo();
            }
        }

        // Scroll background
        parallax.update(delta);
    }

    private void startDemo() {
        started = true;
        game.setScreen(new GameScreen(game));
    }

    @Override
    public void render(float delta) {
        update(delta);
        render(null);
    }

    public void render(SpriteBatch gameBatch) {
        // Clear
        Gdx.gl.glClearColor(0, 0, 0, 1);
        Gdx.gl.glClear(Gdx.gl.GL_COLOR_BUFFER_BIT);

        batch.begin();
        batch.setProjectionMatrix(camera.combined);

        // Draw scrolling starfield background
        renderStarfield();

        // Draw logo
        float pulse = (float) Math.sin(logoPulse) * 0.1f + 1f;
        float logoX = ThunderforceGame.INTERNAL_WIDTH / 2f - 80f * pulse / 2f;
        float logoY = ThunderforceGame.INTERNAL_HEIGHT / 2f + 40f;

        batch.setColor(Color.WHITE);
        font.getData().setScale(pulse * 0.8f);
        font.draw(batch, "THUNDERFORCE", logoX, logoY);
        font.getData().setScale(1f);

        // Draw subtitle
        font.draw(batch, "16-BIT SHOOT 'EM UP", ThunderforceGame.INTERNAL_WIDTH / 2f - 60f, logoY - 30f);

        // Draw "PRESS START" with blink
        float startY = ThunderforceGame.INTERNAL_HEIGHT / 2f - 40f;
        if (!started && (int)(elapsedTime * 2f) % 2 == 0) {
            font.draw(batch, "PRESS START", ThunderforceGame.INTERNAL_WIDTH / 2f - 45f, startY);
        }

        // Draw auto-start timer
        if (!started) {
            float remaining = Math.max(0, AUTO_START_DELAY - autoStartTimer);
            font.draw(batch, String.format("Auto-start: %.0fs", remaining),
                ThunderforceGame.INTERNAL_WIDTH / 2f - 40f, startY - 25f);
        }

        // Draw credits
        font.getData().setScale(0.6f);
        font.draw(batch, "A libGDX Demo", ThunderforceGame.INTERNAL_WIDTH / 2f - 35f, 20f);
        font.getData().setScale(1f);

        batch.end();
    }

    private void renderStarfield() {
        // Simple procedural starfield
        batch.setColor(new Color(0.8f, 0.8f, 1f, 0.6f));
        for (int i = 0; i < 50; i++) {
            float x = ((i * 37 + (int)(elapsedTime * 20)) % ThunderforceGame.INTERNAL_WIDTH);
            float y = (i * 53) % ThunderforceGame.INTERNAL_HEIGHT;
            float size = 1 + (i % 3);
            batch.draw(game.whiteTexture, x, y, size, size);
        }
        batch.setColor(Color.WHITE);
    }

    @Override
    public void resize(int width, int height) {
        // Handle resize
    }

    @Override
    public void pause() {
    }

    @Override
    public void resume() {
    }

    @Override
    public void hide() {
    }

    @Override
    public void dispose() {
        batch.dispose();
        font.dispose();
    }
}
