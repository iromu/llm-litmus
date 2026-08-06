package com.thunderforce.audio;

import com.badlogic.gdx.audio.Music;
import com.badlogic.gdx.audio.Sound;
import com.badlogic.gdx.utils.ObjectMap;
import com.thunderforce.engine.AssetLoader;

/**
 * Audio manager with music streaming (OGG) and SFX playback (WAV).
 * Supports dynamic crossfade, boss music layering, and audio ducking.
 */
public class AudioManager {

    private final ObjectMap<String, Sound> sfxMap;
    private Music currentBiomeMusic;
    private Music currentBossMusic;
    private Music nextBiomeMusic;

    // Volume control
    private float masterVolume;
    private float musicVolume;
    private float sfxVolume;
    private float duckAmount;

    // Crossfade
    private boolean crossfading;
    private float crossfadeProgress;
    private float crossfadeDuration;
    private Music crossfadeFrom;
    private Music crossfadeTo;

    public AudioManager() {
        this.sfxMap = new ObjectMap<>();
        this.masterVolume = 1.0f;
        this.musicVolume = 0.8f;
        this.sfxVolume = 1.0f;
        this.duckAmount = 0f;
        this.crossfadeDuration = 1.0f;
    }

    /**
     * Register a sound effect.
     */
    public void registerSfx(String name, Sound sound) {
        sfxMap.put(name, sound);
    }

    /**
     * Play a sound effect by name.
     */
    public void playSfx(String name) {
        Sound sound = sfxMap.get(name, null);
        if (sound != null) {
            sound.play(sfxVolume * masterVolume);
        }
    }

    /**
     * Play biome music with optional crossfade from current.
     */
    public void playBiomeMusic(Music music) {
        if (currentBiomeMusic == music) return;

        Music previous = currentBiomeMusic;
        currentBiomeMusic = music;
        currentBiomeMusic.setLooping(true);
        currentBiomeMusic.setVolume(musicVolume * masterVolume);
        currentBiomeMusic.play();

        if (previous != null && previous.isPlaying()) {
            startCrossfade(previous, currentBiomeMusic, crossfadeDuration);
        }
    }

    /**
     * Play boss music layer over biome music.
     */
    public void playBossMusic(Music music) {
        if (currentBossMusic != null && currentBossMusic.isPlaying()) {
            currentBossMusic.stop();
        }
        currentBossMusic = music;
        currentBossMusic.setLooping(true);
        currentBossMusic.setVolume(musicVolume * masterVolume * 0.7f); // slightly quieter than biome
        currentBossMusic.play();

        // Duck biome music
        setDucking(0.3f);
    }

    /**
     * Stop boss music and restore biome volume.
     */
    public void stopBossMusic() {
        if (currentBossMusic != null) {
            currentBossMusic.stop();
            currentBossMusic = null;
        }
        setDucking(0f);
    }

    /**
     * Set audio ducking amount (0 = no duck, 0.3 = -30%).
     */
    public void setDucking(float amount) {
        this.duckAmount = amount;
        if (currentBiomeMusic != null) {
            currentBiomeMusic.setVolume(musicVolume * masterVolume * (1f - amount));
        }
    }

    /**
     * Start crossfade between two music tracks.
     */
    private void startCrossfade(Music from, Music to, float duration) {
        crossfading = true;
        crossfadeProgress = 0f;
        crossfadeDuration = duration;
        crossfadeFrom = from;
        crossfadeTo = to;
    }

    /**
     * Update crossfade progress.
     */
    public void update(float delta) {
        if (crossfading && crossfadeFrom != null && crossfadeTo != null) {
            crossfadeProgress += delta / crossfadeDuration;

            float fadeOut = Math.max(0f, 1f - crossfadeProgress);
            float fadeIn = Math.min(1f, crossfadeProgress);

            crossfadeFrom.setVolume(fadeOut * musicVolume * masterVolume);
            crossfadeTo.setVolume(fadeIn * musicVolume * masterVolume);

            if (crossfadeProgress >= 1f) {
                crossfading = false;
                if (crossfadeFrom != null) {
                    crossfadeFrom.stop();
                    crossfadeFrom = null;
                }
                crossfadeTo = null;
            }
        }
    }

    // === Volume setters ===

    public void setMasterVolume(float volume) {
        this.masterVolume = volume;
        updateVolumes();
    }

    public void setMusicVolume(float volume) {
        this.musicVolume = volume;
        updateVolumes();
    }

    public void setSfxVolume(float volume) {
        this.sfxVolume = volume;
    }

    private void updateVolumes() {
        if (currentBiomeMusic != null) {
            currentBiomeMusic.setVolume(musicVolume * masterVolume * (1f - duckAmount));
        }
        if (currentBossMusic != null) {
            currentBossMusic.setVolume(musicVolume * masterVolume * 0.7f);
        }
    }

    /**
     * Stop all music.
     */
    public void stopAll() {
        if (currentBiomeMusic != null) {
            currentBiomeMusic.stop();
        }
        if (currentBossMusic != null) {
            currentBossMusic.stop();
        }
        crossfadeFrom = null;
        crossfadeTo = null;
        crossfading = false;
    }

    public void dispose() {
        stopAll();
        for (Sound sound : sfxMap.values()) {
            sound.dispose();
        }
        sfxMap.clear();
    }
}
