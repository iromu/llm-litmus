package com.thunderforce.gameplay.enemy;

/**
 * JSON data model for a single enemy type definition.
 * Parsed from enemy_definitions.json entries by libGDX JsonReader.
 */
public class EnemyData {

    public String id;
    public String sprite;
    public int hp;
    public float speed;
    public String behavior;
    public String attackPattern;
    public int score;
    public boolean dropsPowerUp;
    public float spawnX;
    public float spawnY;

    public EnemyData() {
        // Default constructor required by JsonReader
    }

    public EnemyData(String id, String sprite, int hp, float speed, String behavior,
                     String attackPattern, int score, boolean dropsPowerUp,
                     float spawnX, float spawnY) {
        this.id = id;
        this.sprite = sprite;
        this.hp = hp;
        this.speed = speed;
        this.behavior = behavior;
        this.attackPattern = attackPattern;
        this.score = score;
        this.dropsPowerUp = dropsPowerUp;
        this.spawnX = spawnX;
        this.spawnY = spawnY;
    }
}
