package com.thunderforce.gameplay.encounter;

import com.badlogic.gdx.utils.Array;

/**
 * JSON data model for an encounter definition.
 * Parsed from encounter JSON files by libGDX JsonReader.
 */
public class EncounterData {

    // Documentation metadata fields (ignored at runtime, absorbed by JsonReader)
    @SuppressWarnings("unused")
    public String _documentation;
    @SuppressWarnings("unused")
    public Object _fields;

    public String biome;
    public Array<WaveData> waves;

    public EncounterData() {
        // Default constructor required by JsonReader
        this.biome = "";
        this.waves = new Array<>();
    }

    public EncounterData(String biome, Array<WaveData> waves) {
        this.biome = biome;
        this.waves = waves;
    }
}

/**
 * A wave definition within an encounter.
 */
class WaveData {

    public float startTime;
    public Array<SpawnData> spawns;

    public WaveData() {
        // Default constructor required by JsonReader
        this.startTime = 0f;
        this.spawns = new Array<>();
    }

    public WaveData(float startTime, Array<SpawnData> spawns) {
        this.startTime = startTime;
        this.spawns = spawns;
    }
}

/**
 * A single enemy spawn definition within a wave.
 */
class SpawnData {

    public String enemyType;
    public float x;
    public float y;
    public float delay;

    public SpawnData() {
        // Default constructor required by JsonReader
        this.enemyType = "";
        this.x = 0f;
        this.y = 0f;
        this.delay = 0f;
    }

    public SpawnData(String enemyType, float x, float y, float delay) {
        this.enemyType = enemyType;
        this.x = x;
        this.y = y;
        this.delay = delay;
    }
}
