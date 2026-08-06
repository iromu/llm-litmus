package com.thunderforce.presentation.screen;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.Input;
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.g2d.BitmapFont;
import com.badlogic.gdx.graphics.g2d.GlyphLayout;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.utils.Array;
import com.thunderforce.engine.ThunderforceGame;

/**
 * High score table with 10 placeholder entries and demo score insertion.
 * Loops back to title screen after display.
 */
public class HighScoreScreen implements ThunderforceGame.GameScreen {

    private final ThunderforceGame game;
    private final int demoScore;
    private final SpriteBatch batch;
    private final BitmapFont font;
    private final OrthographicCamera camera;
    private float elapsedTime;
    private static final float DISPLAY_DURATION = 5f;

    // High score entries
    private final Array<ScoreEntry> scores;

    public HighScoreScreen(ThunderforceGame game, int demoScore) {
        this.game = game;
        this.demoScore = demoScore;
        this.batch = new SpriteBatch();
        this.font = new BitmapFont();
        this.camera = new OrthographicCamera(ThunderforceGame.INTERNAL_WIDTH, ThunderforceGame.INTERNAL_HEIGHT);
        this.camera.position.set(ThunderforceGame.INTERNAL_WIDTH / 2f, ThunderforceGame.INTERNAL_HEIGHT / 2f, 0);
        this.camera.update();
        this.elapsedTime = 0;

        // Initialize with placeholder scores
        this.scores = new Array<>(10);
        scores.add(new ScoreEntry("THD", 50000));
        scores.add(new ScoreEntry("ABC", 35000));
        scores.add(new ScoreEntry("XYZ", 28000));
        scores.add(new ScoreEntry("DEF", 22000));
        scores.add(new ScoreEntry("GHI", 18000));
        scores.add(new ScoreEntry("JKL", 15000));
        scores.add(new ScoreEntry("MNO", 12000));
        scores.add(new ScoreEntry("PQR", 10000));
        scores.add(new ScoreEntry("STU", 8000));
        scores.add(new ScoreEntry("VWX", 5000));

        // Insert demo score in correct position
        insertScore(demoScore, "DEMO");
    }

    private void insertScore(int score, String initials) {
        ScoreEntry newEntry = new ScoreEntry(initials, score);

        // Find insertion position
        int insertIndex = scores.size;
        for (int i = 0; i < scores.size; i++) {
            if (score > scores.get(i).score) {
                insertIndex = i;
                break;
            }
        }

        // Insert and remove last if over 10
        if (insertIndex < scores.size) {
            scores.insert(insertIndex, newEntry);
            if (scores.size > 10) {
                scores.removeIndex(scores.size - 1);
            }
        }
    }

    @Override
    public void show() {
        elapsedTime = 0;
    }

    public void update(float delta) {
        elapsedTime += delta;

        // Auto-transition to title screen
        if (elapsedTime >= DISPLAY_DURATION
            || Gdx.input.isKeyJustPressed(Input.Keys.SPACE)
            || Gdx.input.justTouched()) {
            game.setScreen(new TitleScreen(game));
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

        // Fade in
        float alpha = Math.min(1f, elapsedTime * 2f);

        // Title
        batch.setColor(new Color(1f, 0.8f, 0.2f, alpha));
        font.getData().setScale(1.2f);
        GlyphLayout titleLayout = new GlyphLayout(font, "HIGH SCORES");
        font.draw(batch, "HIGH SCORES",
            ThunderforceGame.INTERNAL_WIDTH / 2f - titleLayout.width / 2f,
            ThunderforceGame.INTERNAL_HEIGHT - 40f);

        // Score entries
        font.getData().setScale(0.7f);
        batch.setColor(new Color(1f, 1f, 1f, alpha));

        float startY = ThunderforceGame.INTERNAL_HEIGHT - 80f;
        float lineSpacing = 22f;

        for (int i = 0; i < scores.size; i++) {
            ScoreEntry entry = scores.get(i);

            // Highlight demo score
            if (entry.initials.equals("DEMO")) {
                batch.setColor(new Color(0.3f, 1f, 0.3f, alpha));
            } else {
                batch.setColor(new Color(1f, 1f, 1f, alpha));
            }

            String line = String.format("%2d  %-4s  %d", i + 1, entry.initials, entry.score);
            font.draw(batch, line, 40f, startY - i * lineSpacing);
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

    private static class ScoreEntry {
        final String initials;
        final int score;

        ScoreEntry(String initials, int score) {
            this.initials = initials;
            this.score = score;
        }
    }
}
