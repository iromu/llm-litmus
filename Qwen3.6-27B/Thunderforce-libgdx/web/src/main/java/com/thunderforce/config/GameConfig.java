package com.thunderforce.config;

import com.badlogic.gdx.utils.ObjectMap;

/**
 * Runtime configuration: quality tier overrides, debug flags, window settings.
 */
public class GameConfig {

    public static final int INTERNAL_WIDTH = 320;
    public static final int INTERNAL_HEIGHT = 224;
    public static final float FIXED_DT = 1f / 60f;

    // Window
    public int windowWidth = 1280;
    public int windowHeight = 960;
    public boolean fullscreen = false;
    public boolean vsync = true;

    // Quality
    public QualityTier qualityTier = QualityTier.MEDIUM;
    public boolean forceQualityTier = false;

    // Debug
    public boolean showDebug = false;
    public boolean showFPS = false;
    public boolean showCollisionDebug = false;
    public boolean showSpatialHash = false;

    // Audio
    public float masterVolume = 1.0f;
    public float musicVolume = 0.8f;
    public float sfxVolume = 1.0f;

    // Gameplay
    public boolean attractMode = true;
    public int demoSeed = 42;

    // Internal
    private final ObjectMap<String, String> overrides = new ObjectMap<>();

    public GameConfig() {
    }

    public void applyOverrides(ObjectMap<String, String> params) {
        if (params.containsKey("quality")) {
            String val = params.get("quality");
            this.qualityTier = QualityTier.valueOf(val.toUpperCase());
            this.forceQualityTier = true;
        }
        if (params.containsKey("debug")) {
            this.showDebug = Boolean.parseBoolean(params.get("debug"));
            this.showFPS = this.showDebug;
        }
        if (params.containsKey("width")) {
            this.windowWidth = Integer.parseInt(params.get("width"));
            this.windowHeight = Integer.parseInt(params.get("height"));
        }
    }

    public ObjectMap<String, String> getOverrides() {
        return overrides;
    }
}
