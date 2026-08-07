package com.thunderforce.gameplay.enemy;

import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.g2d.TextureRegion;
import com.badlogic.gdx.math.Rectangle;
import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.utils.Array;
import com.thunderforce.gameplay.bullet.SpatialEntity;

/**
 * Base enemy class with JSON-driven initialization.
 * Implements SpatialEntity for grid-based collision detection.
 */
public class Enemy implements SpatialEntity {

    public static final int ENTITY_TYPE_ENEMY = 2;

    public enum BehaviorType {
        ZIGZAG, PATROL, AMBUSH, CHASE, RETREAT, FORMATION_FLY
    }

    // Position & movement
    public float x;
    public float y;
    public final Vector2 velocity = new Vector2();

    // Stats
    public int hp;
    public final int maxHp;
    public final float speed;
    public final BehaviorType behaviorType;
    public final String attackPattern;
    public final int scoreValue;
    public final boolean dropsPowerUp;

    // State
    public boolean alive;
    public final Rectangle bounds;

    // Sprite / animation
    public String sprite;
    public int spriteFrame;
    public float animationTimer;
    public TextureRegion currentFrame;

    // Behavior state (reused to avoid allocation)
    private final Vector2 _target = new Vector2();
    float _patrolPhase;
    float _ambushTriggerDist;
    float _retreatDist;
    float _formationOffsetX;
    float _formationOffsetY;
    float _zigzagPhase;
    float _patrolCenterX;
    float _patrolCenterY;
    float _patrolRange;
    float _leaderX;
    float _leaderY;

    // Dimensions
    private static final float DEFAULT_WIDTH = 16f;
    private static final float DEFAULT_HEIGHT = 16f;

    public Enemy(EnemyData data) {
        this.x = data.spawnX;
        this.y = data.spawnY;
        this.hp = data.hp;
        this.maxHp = data.hp;
        this.speed = data.speed;
        this.behaviorType = parseBehavior(data.behavior);
        this.attackPattern = data.attackPattern;
        this.scoreValue = data.score;
        this.dropsPowerUp = data.dropsPowerUp;
        this.alive = true;
        this.sprite = data.sprite;
        this.spriteFrame = 0;
        this.animationTimer = 0f;
        this.bounds = new Rectangle(x, y, DEFAULT_WIDTH, DEFAULT_HEIGHT);
        this._zigzagPhase = 0f;
        this._patrolPhase = 0f;
        this._ambushTriggerDist = 120f;
        this._retreatDist = 80f;
        this._patrolCenterX = this.x;
        this._patrolCenterY = this.y;
        this._patrolRange = 40f;
    }

    public Enemy(float x, float y, int hp, float speed, BehaviorType behaviorType,
                 String attackPattern, int scoreValue, boolean dropsPowerUp, String sprite) {
        this.x = x;
        this.y = y;
        this.hp = hp;
        this.maxHp = hp;
        this.speed = speed;
        this.behaviorType = behaviorType;
        this.attackPattern = attackPattern;
        this.scoreValue = scoreValue;
        this.dropsPowerUp = dropsPowerUp;
        this.alive = true;
        this.sprite = sprite;
        this.spriteFrame = 0;
        this.animationTimer = 0f;
        this.bounds = new Rectangle(x, y, DEFAULT_WIDTH, DEFAULT_HEIGHT);
        this._zigzagPhase = 0f;
        this._patrolPhase = 0f;
        this._ambushTriggerDist = 120f;
        this._retreatDist = 80f;
        this._patrolCenterX = this.x;
        this._patrolCenterY = this.y;
        this._patrolRange = 40f;
    }

    /**
     * Update enemy position, animation, and attack logic.
     *
     * @param delta       frame time in seconds
     * @param playerX     player X position
     * @param playerY     player Y position
     * @param bullets     array of player bullets (for dodge / interaction logic)
     */
    public void update(float delta, float playerX, float playerY, Array<Object> bullets) {
        if (!alive) return;

        // Advance animation
        animationTimer += delta;
        if (animationTimer >= 0.12f) {
            animationTimer -= 0.12f;
            spriteFrame = (spriteFrame + 1) % 4;
        }

        // Apply behavior-driven movement
        switch (behaviorType) {
            case ZIGZAG:
                EnemyBehavior.zigzag(this, delta);
                break;
            case PATROL:
                EnemyBehavior.patrol(this, delta, _patrolCenterX, _patrolCenterY, _patrolRange);
                break;
            case AMBUSH:
                EnemyBehavior.ambush(this, delta, playerX, playerY, _ambushTriggerDist);
                break;
            case CHASE:
                EnemyBehavior.chase(this, delta, playerX, playerY);
                break;
            case RETREAT:
                EnemyBehavior.retreat(this, delta, playerX, playerY, _retreatDist);
                break;
            case FORMATION_FLY:
                EnemyBehavior.formationFly(this, delta, _formationOffsetX, _formationOffsetY, _leaderX, _leaderY);
                break;
        }

        // Apply velocity
        x += velocity.x * delta;
        y += velocity.y * delta;

        // Sync bounds
        bounds.x = x;
        bounds.y = y;

        // Soft boundary clamping to keep enemies on screen
        if (x < -32f) x = -32f;
        if (x > 352f) x = 352f;
        if (y < -32f) y = -32f;
        if (y > 256f) y = 256f;
        bounds.x = x;
        bounds.y = y;
    }

    /**
     * Take damage and check for death.
     *
     * @param amount damage to apply
     * @return true if the enemy died from this hit
     */
    public boolean takeDamage(int amount) {
        if (!alive) return false;
        hp -= amount;
        if (hp <= 0) {
            die();
            return true;
        }
        return false;
    }

    /**
     * Mark enemy as dead. Triggers explosion, score award, and possible power-up drop.
     * Callers are responsible for spawning visual effects and collecting score.
     */
    public void die() {
        alive = false;
        hp = 0;
        velocity.set(0, 0);
    }

    /**
     * Render the enemy sprite.
     * Callers supply the batch; the enemy draws its current animation frame.
     *
     * @param batch the SpriteBatch to draw with
     */
    public void render(SpriteBatch batch) {
        if (!alive) return;
        if (currentFrame != null) {
            batch.draw(currentFrame, x, y, DEFAULT_WIDTH, DEFAULT_HEIGHT);
        }
    }

    @Override
    public Rectangle getBounds() {
        return bounds;
    }

    @Override
    public int getEntityType() {
        return ENTITY_TYPE_ENEMY;
    }

    // === Behavior state setters ===

    public void setPatrol(float centerX, float centerY, float range) {
        this._patrolCenterX = centerX;
        this._patrolCenterY = centerY;
        this._patrolRange = range;
    }

    public void setAmbushTrigger(float distance) {
        this._ambushTriggerDist = distance;
    }

    public void setRetreatDistance(float distance) {
        this._retreatDist = distance;
    }

    public void setFormationOffset(float offsetX, float offsetY) {
        this._formationOffsetX = offsetX;
        this._formationOffsetY = offsetY;
    }

    public void setLeaderPosition(float leaderX, float leaderY) {
        this._leaderX = leaderX;
        this._leaderY = leaderY;
    }

    private static BehaviorType parseBehavior(String behavior) {
        try {
            return BehaviorType.valueOf(behavior.toUpperCase());
        } catch (IllegalArgumentException e) {
            return BehaviorType.ZIGZAG;
        }
    }
}
