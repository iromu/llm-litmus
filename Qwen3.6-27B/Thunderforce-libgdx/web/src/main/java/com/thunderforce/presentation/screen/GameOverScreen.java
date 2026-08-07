package com.thunderforce.presentation.screen;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.Input;
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.g2d.BitmapFont;
import com.badlogic.gdx.graphics.g2d.GlyphLayout;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.thunderforce.engine.ThunderforceGame;

/**
 * Game over screen with "GAME OVER" text and final score display.
 * Transitions to high score table after a delay.
 */
public class GameOverScreen implements ThunderforceGame.GameScreen {

    private final ThunderforceGame game;
    private final int finalScore;
    private final SpriteBatch batch;
    private final BitmapFont font;
    private final OrthographicCamera camera;
    private float elapsedTime;
    private static final float TRANSITION_DELAY = 3f;

    public GameOverScreen(ThunderforceGame game, int finalScore) {
        this.game = game;
        this.finalScore = finalScore;
        this.batch = new SpriteBatch();
        this.font = new BitmapFont();
        this.camera = new OrthographicCamera(ThunderforceGame.INTERNAL_WIDTH, ThunderforceGame.INTERNAL_HEIGHT);
        this.camera.position.set(ThunderforceGame.INTERNAL_WIDTH / 2f, ThunderforceGame.INTERNAL_HEIGHT / 2f, 0);
        this.camera.update();
        this.elapsedTime = 0;
    }

    @Override
    public void show() {
        elapsedTime = 0;
    }

    public void update(float delta) {
        elapsedTime += delta;

        // Auto-transition to high scores
        if (elapsedTime >= TRANSITION_DELAY
            || Gdx.input.isKeyJustPressed(Input.Keys.SPACE)
            || Gdx.input.justTouched()) {
            game.setScreen(new HighScoreScreen(game, finalScore));
        }
    }

    @Override
    public void render(float delta) {
        update(delta);
        render(null);
    }

    public void render(SpriteBatch gameBatch) {
        Gdx.gl.glClearColor(0, 0, 0, 1);
        Gdx.gl.glClear(Gdx.gl.GL_COLOR_BUFFER_BIT);

        batch.begin();
        batch.setProjectionMatrix(camera.combined);

        // Fade in effect
        float alpha = Math.min(1f, elapsedTime * 2f);
        batch.setColor(new Color(1, 0.2f, 0.2f, alpha));

        // "GAME OVER" text
        font.getData().setScale(1.5f);
        GlyphLayout layout = new GlyphLayout(font, "GAME OVER");
        float textWidth = layout.width;
        font.draw(batch, "GAME OVER",
            ThunderforceGame.INTERNAL_WIDTH / 2f - textWidth / 2f,
            ThunderforceGame.INTERNAL_HEIGHT / 2f + 20f);

        // Final score
        font.getData().setScale(0.8f);
        batch.setColor(new Color(1f, 1f, 1f, alpha));
        GlyphLayout scoreLayout = new GlyphLayout(font, "SCORE: 999999");
        font.draw(batch, "SCORE: " + finalScore,
            ThunderforceGame.INTERNAL_WIDTH / 2f - scoreLayout.width / 2f,
            ThunderforceGame.INTERNAL_HEIGHT / 2f - 20f);

        // Press start prompt
        if (elapsedTime > 1f && (int)(elapsedTime * 2f) % 2 == 0) {
            font.getData().setScale(0.6f);
            GlyphLayout promptLayout = new GlyphLayout(font, "PRESS START");
            font.draw(batch, "PRESS START",
                ThunderforceGame.INTERNAL_WIDTH / 2f - promptLayout.width / 2f,
                ThunderforceGame.INTERNAL_HEIGHT / 2f - 60f);
        }

        batch.end();
    }

    @Override
    public void resize(int width, int height) {
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
