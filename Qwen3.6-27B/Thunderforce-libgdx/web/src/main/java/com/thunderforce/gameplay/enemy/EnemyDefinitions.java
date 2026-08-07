package com.thunderforce.gameplay.enemy;

import com.badlogic.gdx.utils.Array;
import com.badlogic.gdx.utils.ObjectMap;

/**
 * Wrapper class for the enemy_definitions.json file.
 * The JSON root is {"enemies": [...]}, so this wrapper holds the array.
 * AssetLoader loads this class from data/enemies/enemy_definitions.json.
 */
public class EnemyDefinitions {

    // Documentation metadata fields (ignored at runtime, absorbed by JsonReader)
    @SuppressWarnings("unused")
    public String _documentation;
    @SuppressWarnings("unused")
    public Object _fields;

    public Array<EnemyData> enemies;
    private final ObjectMap<String, EnemyData> byId = new ObjectMap<>();

    public EnemyDefinitions() {
        this.enemies = new Array<>();
    }

    /**
     * Build a lookup map after deserialization.
     * Call once after loading from JSON.
     */
    public void index() {
        byId.clear();
        for (int i = 0; i < enemies.size; i++) {
            EnemyData data = enemies.get(i);
            if (data.id != null) {
                byId.put(data.id, data);
            }
        }
    }

    /**
     * Look up an enemy definition by its id.
     *
     * @param id the enemy type id (e.g. "grunt", "tank")
     * @return the EnemyData, or null if not found
     */
    public EnemyData get(String id) {
        return byId.get(id);
    }
}
