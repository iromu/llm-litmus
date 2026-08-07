package com.thunderforce.engine;

import com.badlogic.gdx.Game;
import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.GL20;
import com.badlogic.gdx.graphics.Pixmap;
import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.thunderforce.config.GameConfig;
import com.thunderforce.config.QualityTier;
import com.thunderforce.presentation.screen.TitleScreen;

/**
 * Main ApplicationListener entry point.
 * Manages the game lifecycle, fixed-timestep loop, and screen transitions.
 */
public class ThunderforceGame extends Game {

    public static final int INTERNAL_WIDTH = 320;
    public static final int INTERNAL_HEIGHT = 224;
    public static final float FIXED_DT = 1f / 60f;

    // Shared systems
    public GameConfig config;
    public AssetLoader assetLoader;
    public SpriteBatch batch;
    public Texture whiteTexture;

    // Fixed timestep accumulator
    private float accumulator;

    @Override
    public void create() {
        // Initialize configuration
        this.config = new GameConfig();

        // GPU probe for quality tier
        if (!config.forceQualityTier) {
            config.qualityTier = GPUProbe.detect();
        }

        Gdx.app.log("Thunderforce", "Quality tier: " + config.qualityTier);
        Gdx.app.log("Thunderforce", "Renderer: " + GPUProbe.getRenderer());
        Gdx.app.log("Thunderforce", "Max texture: " + GPUProbe.getMaxTextureSize());

        // Initialize shared resources
        this.batch = new SpriteBatch();
        this.whiteTexture = createWhiteTexture();

        // Initialize asset loader
        this.assetLoader = new AssetLoader();
        this.assetLoader.registerAll();

        // Set initial screen (title screen handles loading)
        setScreen(new TitleScreen(this));
    }

    @Override
    public void render() {
        // Fixed timestep game loop
        float frameTime = Math.min(Gdx.graphics.getDeltaTime(), 0.25f); // cap at 250ms
        accumulator += frameTime;

        GameScreen screen = (GameScreen) getScreen();
        while (accumulator >= FIXED_DT) {
            if (screen != null) {
                screen.update(FIXED_DT);
            }
            accumulator -= FIXED_DT;
        }

        // Render
        Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT);
        if (screen != null) {
            screen.render(batch);
        }
    }

    @Override
    public void resize(int width, int height) {
        GameScreen screen = (GameScreen) getScreen();
        if (screen != null) {
            screen.resize(width, height);
        }
    }

    @Override
    public void pause() {
        GameScreen screen = (GameScreen) getScreen();
        if (screen != null) {
            screen.pause();
        }
    }

    @Override
    public void resume() {
        GameScreen screen = (GameScreen) getScreen();
        if (screen != null) {
            screen.resume();
        }
    }

    @Override
    public void dispose() {
        batch.dispose();
        whiteTexture.dispose();
        if (assetLoader != null) {
            assetLoader.dispose();
        }
    }

    /**
     * Create a 1x1 white texture used for drawing colored rectangles.
     */
    private Texture createWhiteTexture() {
        Pixmap pixmap = new Pixmap(1, 1, Pixmap.Format.RGBA8888);
        pixmap.setColor(com.badlogic.gdx.graphics.Color.WHITE);
        pixmap.drawPixel(0, 0);
        Texture texture = new Texture(pixmap);
        texture.setFilter(Texture.TextureFilter.Nearest, Texture.TextureFilter.Nearest);
        pixmap.dispose();
        return texture;
    }

    /**
     * Custom screen interface with separate update and render phases.
     */
    public interface GameScreen extends com.badlogic.gdx.Screen {
        void update(float delta);
        void render(SpriteBatch batch);
    }
}
