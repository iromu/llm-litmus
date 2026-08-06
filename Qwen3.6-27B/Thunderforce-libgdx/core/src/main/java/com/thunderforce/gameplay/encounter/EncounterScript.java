package com.thunderforce.gameplay.encounter;

import com.badlogic.gdx.utils.Array;
import com.thunderforce.gameplay.enemy.Enemy;

/**
 * JSON-based encounter scripting system.
 * Manages timed waves of enemy spawns for a given biome encounter.
 */
public class EncounterScript {

    public final Array<EncounterWave> waves;
    public final String biomeName;

    public EncounterScript(String biomeName) {
        this.biomeName = biomeName;
        this.waves = new Array<>();
    }

    public EncounterScript() {
        // Default constructor for JsonReader
        this.biomeName = "";
        this.waves = new Array<>();
    }

    /**
     * Update the encounter script with elapsed game time.
     * Checks for waves that should activate and triggers their spawns.
     *
     * @param delta    frame time in seconds
     * @param gameTime total elapsed encounter time in seconds
     * @param enemies  array to add newly spawned enemies to
     */
    public void update(float delta, float gameTime, Array<Enemy> enemies) {
        for (int i = 0; i < waves.size; i++) {
            EncounterWave wave = waves.get(i);
            if (!wave.spawned && gameTime >= wave.startTime) {
                spawnWave(wave, gameTime, enemies);
                wave.spawned = true;
            }
        }
    }

    /**
     * Get all waves that are currently active at the given game time.
     * A wave is active from its startTime until all its spawns have been processed.
     *
     * @param gameTime elapsed encounter time
     * @return array of active waves (may be empty)
     */
    public Array<EncounterWave> getActiveWaves(float gameTime) {
        Array<EncounterWave> active = new Array<>();
        for (int i = 0; i < waves.size; i++) {
            EncounterWave wave = waves.get(i);
            float waveEnd = wave.startTime + wave.maxDelay();
            if (gameTime >= wave.startTime && gameTime <= waveEnd) {
                active.add(wave);
            }
        }
        return active;
    }

    /**
     * Spawn all pending waves up to the given game time.
     * Useful for initial setup or catching up after a pause.
     *
     * @param gameTime elapsed encounter time
     * @param enemies  array to add newly spawned enemies to
     */
    public void spawnWaves(float gameTime, Array<Enemy> enemies) {
        for (int i = 0; i < waves.size; i++) {
            EncounterWave wave = waves.get(i);
            if (!wave.spawned && gameTime >= wave.startTime) {
                spawnWave(wave, gameTime, enemies);
                wave.spawned = true;
            }
        }
    }

    /**
     * Reset all waves so the encounter can be replayed.
     */
    public void reset() {
        for (int i = 0; i < waves.size; i++) {
            waves.get(i).spawned = false;
        }
    }

    private void spawnWave(EncounterWave wave, float gameTime, Array<Enemy> enemies) {
        for (int i = 0; i < wave.spawns.size; i++) {
            EnemySpawn spawn = wave.spawns.get(i);
            float spawnTime = wave.startTime + spawn.delay;
            if (gameTime >= spawnTime) {
                Enemy enemy = createEnemy(spawn);
                if (enemy != null) {
                    enemies.add(enemy);
                }
            }
        }
    }

    /**
     * Create an Enemy instance from a spawn definition.
     * Override or extend to look up EnemyData by type ID.
     *
     * @param spawn the spawn definition
     * @return a new Enemy, or null if the type is unknown
     */
    protected Enemy createEnemy(EnemySpawn spawn) {
        // Default: create with spawn coordinates and type-derived defaults
        // Subclasses can override to look up full EnemyData definitions
        return new Enemy(
            spawn.x,
            spawn.y,
            1,  // default hp, override with data lookup
            40f,  // default speed
            Enemy.BehaviorType.ZIGZAG,
            "default",
            100,
            false,
            spawn.enemyTypeId
        );
    }
}

/**
 * A wave within an encounter, containing multiple timed enemy spawns.
 */
class EncounterWave {

    public final float startTime;
    public final Array<EnemySpawn> spawns;
    public boolean spawned;

    public EncounterWave(float startTime) {
        this.startTime = startTime;
        this.spawns = new Array<>();
        this.spawned = false;
    }

    public EncounterWave() {
        // Default constructor for JsonReader
        this.startTime = 0f;
        this.spawns = new Array<>();
        this.spawned = false;
    }

    /**
     * Get the maximum delay among all spawns in this wave.
     * Used to determine when a wave is fully active.
     */
    public float maxDelay() {
        float max = 0f;
        for (int i = 0; i < spawns.size; i++) {
            float d = spawns.get(i).delay;
            if (d > max) max = d;
        }
        return max;
    }
}

/**
 * A single enemy spawn within a wave.
 */
class EnemySpawn {

    public final String enemyTypeId;
    public final float x;
    public final float y;
    public final float delay;

    public EnemySpawn(String enemyTypeId, float x, float y, float delay) {
        this.enemyTypeId = enemyTypeId;
        this.x = x;
        this.y = y;
        this.delay = delay;
    }

    public EnemySpawn() {
        // Default constructor for JsonReader
        this.enemyTypeId = "";
        this.x = 0f;
        this.y = 0f;
        this.delay = 0f;
    }
}
