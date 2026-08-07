package com.thunderforce.engine;

import com.badlogic.gdx.assets.AssetManager;
import com.badlogic.gdx.utils.Array;
import com.badlogic.gdx.utils.ObjectMap;
import com.thunderforce.gameplay.boss.BossData;
import com.thunderforce.gameplay.encounter.EncounterData;
import com.thunderforce.gameplay.enemy.EnemyDefinitions;

/**
 * Centralized asset loading with progress tracking.
 * Defines all asset paths and provides typed accessors.
 */
public class AssetLoader {

    // === Texture paths ===
    // Player
    public static final String TXT_PLAYER_SHIP = "textures/player/ship.png";
    public static final String TXT_PLAYER_EXPLOSION = "textures/player/explosion.png";

    // Weapons
    public static final String TXT_PLASMA = "textures/weapons/plasma.png";
    public static final String TXT_HOMING = "textures/weapons/homing.png";
    public static final String TXT_LASER = "textures/weapons/laser.png";
    public static final String TXT_LIGHTNING = "textures/weapons/lightning.png";

    // Power-ups
    public static final String TXT_POWERUP_WEAPON = "textures/powerups/weapon.png";
    public static final String TXT_POWERUP_SHIELD = "textures/powerups/shield.png";
    public static final String TXT_POWERUP_SPEED = "textures/powerups/speed.png";

    // Explosions
    public static final String TXT_EXPLOSION_TINY = "textures/explosions/tiny.png";
    public static final String TXT_EXPLOSION_SMALL = "textures/explosions/small.png";
    public static final String TXT_EXPLOSION_MEDIUM = "textures/explosions/medium.png";
    public static final String TXT_EXPLOSION_LARGE = "textures/explosions/large.png";
    public static final String TXT_EXPLOSION_MASSIVE = "textures/explosions/massive.png";

    // Particles
    public static final String TXT_PARTICLE_SPARK = "textures/particles/spark.png";
    public static final String TXT_PARTICLE_SMOKE = "textures/particles/smoke.png";
    public static final String TXT_PARTICLE_GLOW = "textures/particles/glow.png";
    public static final String TXT_PARTICLE_SHOCKWAVE = "textures/particles/shockwave.png";

    // UI
    public static final String TXT_UI_HUD = "textures/ui/hud.png";
    public static final String TXT_UI_LOGO = "textures/ui/logo.png";
    public static final String TXT_UI_WEAPONS = "textures/ui/weapons.png";

    // Fonts
    public static final String FONT_MAIN = "fonts/main.fnt";
    public static final String FONT_SCORE = "fonts/score.fnt";
    public static final String FONT_TITLE = "fonts/title.fnt";

    // Audio - Music (OGG)
    public static final String MUS_TITLE = "audio/music/title.ogg";
    public static final String MUS_BIOME_VOLCANIC = "audio/music/volcanic.ogg";
    public static final String MUS_BIOME_CITY = "audio/music/city.ogg";
    public static final String MUS_BIOME_ASTEROID = "audio/music/asteroid.ogg";
    public static final String MUS_BIOME_ALIEN = "audio/music/alien.ogg";
    public static final String MUS_BOSS_1 = "audio/music/boss1.ogg";
    public static final String MUS_BOSS_2 = "audio/music/boss2.ogg";
    public static final String MUS_BOSS_3 = "audio/music/boss3.ogg";

    // Audio - SFX (WAV)
    public static final String SFX_SHOOT_PLASMA = "audio/sfx/shoot_plasma.wav";
    public static final String SFX_SHOOT_HOMING = "audio/sfx/shoot_homing.wav";
    public static final String SFX_SHOOT_LASER = "audio/sfx/shoot_laser.wav";
    public static final String SFX_SHOOT_LIGHTNING = "audio/sfx/shoot_lightning.wav";
    public static final String SFX_EXPLOSION_SMALL = "audio/sfx/explosion_small.wav";
    public static final String SFX_EXPLOSION_LARGE = "audio/sfx/explosion_large.wav";
    public static final String SFX_POWERUP = "audio/sfx/powerup.wav";
    public static final String SFX_HIT = "audio/sfx/hit.wav";
    public static final String SFX_ENGINE = "audio/sfx/engine.wav";
    public static final String SFX_LASER_WARN = "audio/sfx/laser_warn.wav";

    // Data
    public static final String DATA_ENEMIES = "data/enemies/enemy_definitions.json";
    public static final String DATA_ENCOUNTER_VOLCANIC = "data/encounters/volcanic.json";
    public static final String DATA_ENCOUNTER_CITY = "data/encounters/city.json";
    public static final String DATA_ENCOUNTER_ASTEROID = "data/encounters/asteroid.json";
    public static final String DATA_ENCOUNTER_ALIEN = "data/encounters/alien.json";
    public static final String DATA_BOSS_MAGMA_MAW = "data/bosses/magma_maw.json";
    public static final String DATA_BOSS_ORBITAL_JUDGE = "data/bosses/orbital_judge.json";
    public static final String DATA_BOSS_XENO_GUARDIAN = "data/bosses/xeno_guardian.json";

    // Biome backgrounds (4 biomes × 4 layers each)
    public static final String[] BIOME_VOLCANIC_LAYERS = {
        "textures/biomes/volcanic/layer0.png",
        "textures/biomes/volcanic/layer1.png",
        "textures/biomes/volcanic/layer2.png",
        "textures/biomes/volcanic/layer3.png"
    };
    public static final String[] BIOME_CITY_LAYERS = {
        "textures/biomes/city/layer0.png",
        "textures/biomes/city/layer1.png",
        "textures/biomes/city/layer2.png",
        "textures/biomes/city/layer3.png"
    };
    public static final String[] BIOME_ASTEROID_LAYERS = {
        "textures/biomes/asteroid/layer0.png",
        "textures/biomes/asteroid/layer1.png",
        "textures/biomes/asteroid/layer2.png",
        "textures/biomes/asteroid/layer3.png"
    };
    public static final String[] BIOME_ALIEN_LAYERS = {
        "textures/biomes/alien/layer0.png",
        "textures/biomes/alien/layer1.png",
        "textures/biomes/alien/layer2.png",
        "textures/biomes/alien/layer3.png"
    };

    private final AssetManager assetManager;
    private final Array<String> loadQueue;
    private float progress;

    public AssetLoader() {
        this.assetManager = new AssetManager();
        this.loadQueue = new Array<>();
        this.progress = 0f;
    }

    /**
     * Register all required assets for loading.
     */
    public void registerAll() {
        // Textures
        registerTexture(TXT_PLAYER_SHIP);
        registerTexture(TXT_PLAYER_EXPLOSION);
        registerTexture(TXT_PLASMA);
        registerTexture(TXT_HOMING);
        registerTexture(TXT_LASER);
        registerTexture(TXT_LIGHTNING);
        registerTexture(TXT_POWERUP_WEAPON);
        registerTexture(TXT_POWERUP_SHIELD);
        registerTexture(TXT_POWERUP_SPEED);
        registerTexture(TXT_EXPLOSION_TINY);
        registerTexture(TXT_EXPLOSION_SMALL);
        registerTexture(TXT_EXPLOSION_MEDIUM);
        registerTexture(TXT_EXPLOSION_LARGE);
        registerTexture(TXT_EXPLOSION_MASSIVE);
        registerTexture(TXT_PARTICLE_SPARK);
        registerTexture(TXT_PARTICLE_SMOKE);
        registerTexture(TXT_PARTICLE_GLOW);
        registerTexture(TXT_PARTICLE_SHOCKWAVE);
        registerTexture(TXT_UI_HUD);
        registerTexture(TXT_UI_LOGO);
        registerTexture(TXT_UI_WEAPONS);

        // Fonts
        registerFont(FONT_MAIN);
        registerFont(FONT_SCORE);
        registerFont(FONT_TITLE);

        // Music
        registerMusic(MUS_TITLE);
        registerMusic(MUS_BIOME_VOLCANIC);
        registerMusic(MUS_BIOME_CITY);
        registerMusic(MUS_BIOME_ASTEROID);
        registerMusic(MUS_BIOME_ALIEN);
        registerMusic(MUS_BOSS_1);
        registerMusic(MUS_BOSS_2);
        registerMusic(MUS_BOSS_3);

        // SFX
        registerSfx(SFX_SHOOT_PLASMA);
        registerSfx(SFX_SHOOT_HOMING);
        registerSfx(SFX_SHOOT_LASER);
        registerSfx(SFX_SHOOT_LIGHTNING);
        registerSfx(SFX_EXPLOSION_SMALL);
        registerSfx(SFX_EXPLOSION_LARGE);
        registerSfx(SFX_POWERUP);
        registerSfx(SFX_HIT);
        registerSfx(SFX_ENGINE);
        registerSfx(SFX_LASER_WARN);

        // Data files
        registerJson(DATA_ENEMIES, EnemyDefinitions.class);
        registerJson(DATA_ENCOUNTER_VOLCANIC, EncounterData.class);
        registerJson(DATA_ENCOUNTER_CITY, EncounterData.class);
        registerJson(DATA_ENCOUNTER_ASTEROID, EncounterData.class);
        registerJson(DATA_ENCOUNTER_ALIEN, EncounterData.class);
        registerJson(DATA_BOSS_MAGMA_MAW, BossData.class);
        registerJson(DATA_BOSS_ORBITAL_JUDGE, BossData.class);
        registerJson(DATA_BOSS_XENO_GUARDIAN, BossData.class);

        // Biome backgrounds
        for (String path : BIOME_VOLCANIC_LAYERS) registerTexture(path);
        for (String path : BIOME_CITY_LAYERS) registerTexture(path);
        for (String path : BIOME_ASTEROID_LAYERS) registerTexture(path);
        for (String path : BIOME_ALIEN_LAYERS) registerTexture(path);
    }

    private void registerTexture(String path) {
        assetManager.load(path, com.badlogic.gdx.graphics.Texture.class);
        loadQueue.add(path);
    }

    private void registerFont(String path) {
        assetManager.load(path, com.badlogic.gdx.graphics.g2d.BitmapFont.class);
        loadQueue.add(path);
    }

    private void registerMusic(String path) {
        assetManager.load(path, com.badlogic.gdx.audio.Music.class);
        loadQueue.add(path);
    }

    private void registerSfx(String path) {
        assetManager.load(path, com.badlogic.gdx.audio.Sound.class);
        loadQueue.add(path);
    }

    @SuppressWarnings("unchecked")
    private <T> void registerJson(String path, Class<T> type) {
        assetManager.load(path, type);
        loadQueue.add(path);
    }

    public void update() {
        assetManager.update(0);
        this.progress = assetManager.getProgress();
    }

    public boolean isFinished() {
        return assetManager.isFinished();
    }

    public float getProgress() {
        return progress;
    }

    public AssetManager getAssetManager() {
        return assetManager;
    }

    public void dispose() {
        assetManager.dispose();
    }
}
