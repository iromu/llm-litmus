package com.thunderforce.gameplay.boss;

import com.badlogic.gdx.utils.Array;

/**
 * JSON data model for boss definitions loaded from data/bosses/*.json.
 * Each boss defines sections, phases, and scoring.
 */
public class BossData {

    // Documentation metadata fields (ignored at runtime, absorbed by JsonReader)
    @SuppressWarnings("unused")
    public String _documentation;
    @SuppressWarnings("unused")
    public Object _fields;

    public String id;
    public String name;
    public Array<SectionData> sections;
    public Array<PhaseData> phases;
    public int scoreValue;

    public static class SectionData {
        public String type;
        public int hp;
        public float offsetX;
        public float offsetY;
        public String attackPattern;
    }

    public static class PhaseData {
        public int phase;
        public float hpThreshold;
        public Array<String> attacks;
        public float attackInterval;
    }
}
