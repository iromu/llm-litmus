package com.thunderforce.gameplay.weapon;

import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.g2d.Batch;
import com.badlogic.gdx.math.MathUtils;
import com.badlogic.gdx.math.Rectangle;
import com.badlogic.gdx.math.Vector2;
import com.thunderforce.gameplay.bullet.SpatialEntity;
import com.thunderforce.gameplay.bullet.WhiteTexture;

/**
 * Player projectile base class.
 * Implements SpatialEntity so the existing CollisionDetector can process player bullets.
 */
public class Projectile implements SpatialEntity {

    public static final int ENTITY_TYPE = 3; // PLAYER_BULLET_ENTITY_TYPE
    private static final Texture WHITE = WhiteTexture.get();

    public enum ProjectileType {
        PLASMA,
        HOMING,
        LASER,
        LIGHTNING
    }

    public float x;
    public float y;
    public final Vector2 velocity;
    public float lifetime;
    public float maxLifetime;
    public float collisionRadius;
    public float damage;
    public boolean alive;
    public boolean isEnemy;
    public boolean penetrating;
    public final ProjectileType projectileType;

    // Homing-specific fields
    public float targetX;
    public float targetY;
    public float turnRate;

    private final Rectangle bounds;
    private final Color color;

    public Projectile(float x, float y, float vx, float vy, ProjectileType type) {
        this.x = x;
        this.y = y;
        this.velocity = new Vector2(vx, vy);
        this.lifetime = 0f;
        this.maxLifetime = 3f;
        this.collisionRadius = 3f;
        this.damage = 1f;
        this.alive = true;
        this.isEnemy = false;
        this.penetrating = false;
        this.projectileType = type;
        this.bounds = new Rectangle();
        this.color = new Color();
        this.targetX = 0f;
        this.targetY = 0f;
        this.turnRate = 3.0f;
        setProjectileColor(type, isEnemy);
    }

    public Projectile setMaxLifetime(float seconds) {
        this.maxLifetime = seconds;
        return this;
    }

    public Projectile setCollisionRadius(float radius) {
        this.collisionRadius = radius;
        return this;
    }

    public Projectile setPenetrating(boolean penetrating) {
        this.penetrating = penetrating;
        return this;
    }

    public Projectile setTarget(float tx, float ty) {
        this.targetX = tx;
        this.targetY = ty;
        return this;
    }

    public Projectile setTurnRate(float turnRate) {
        this.turnRate = turnRate;
        return this;
    }

    private void setProjectileColor(ProjectileType type, boolean enemy) {
        if (enemy) {
            switch (type) {
                case PLASMA:
                    color.set(1f, 0.4f, 0f, 1f);
                    break;
                case HOMING:
                    color.set(1f, 0.35f, 0f, 1f);
                    break;
                case LASER:
                    color.set(1f, 0.2f, 0.2f, 1f);
                    break;
                case LIGHTNING:
                    color.set(1f, 0.6f, 0f, 0.8f);
                    break;
            }
        } else {
            switch (type) {
                case PLASMA:
                    color.set(0f, 0.7f, 1f, 1f);
                    break;
                case HOMING:
                    color.set(0f, 1f, 0.5f, 1f);
                    break;
                case LASER:
                    color.set(0.3f, 0.8f, 1f, 1f);
                    break;
                case LIGHTNING:
                    color.set(0.8f, 0.9f, 1f, 1f);
                    break;
            }
        }
    }

    /**
     * Update position, lifetime, and homing steering.
     */
    public void update(float delta) {
        lifetime += delta;
        if (lifetime >= maxLifetime) {
            alive = false;
            return;
        }

        if (projectileType == ProjectileType.HOMING && !isEnemy) {
            float dx = targetX - x;
            float dy = targetY - y;
            float dist = (float) Math.sqrt(dx * dx + dy * dy);
            if (dist > 1f) {
                Vector2 desired = new Vector2(dx, dy).nor();
                float t = Math.min(1f, turnRate * delta);
                velocity.x = velocity.x + (desired.x - velocity.x) * t;
                velocity.y = velocity.y + (desired.y - velocity.y) * t;
                velocity.nor();
            }
        }

        x += velocity.x * delta;
        y += velocity.y * delta;

        // Kill when well outside the playfield
        if (x < -32f || x > 352f || y < -32f || y > 256f) {
            alive = false;
        }
    }

    public boolean isAlive() {
        return alive;
    }

    @Override
    public Rectangle getBounds() {
        bounds.setPosition(x - collisionRadius, y - collisionRadius);
        bounds.setSize(collisionRadius * 2, collisionRadius * 2);
        return bounds;
    }

    @Override
    public int getEntityType() {
        return ENTITY_TYPE;
    }

    /**
     * Render the projectile as a colored square.
     */
    public void render(Batch batch) {
        if (!alive) return;
        batch.setColor(color);
        float half = collisionRadius;
        batch.draw(WHITE, x - half, y - half, half * 2, half * 2);
        batch.setColor(Color.WHITE);
    }

    public void kill() {
        this.alive = false;
    }

    public float getX() {
        return x;
    }

    public float getY() {
        return y;
    }

    public Vector2 getVelocity() {
        return velocity;
    }

    public float getDamage() {
        return damage;
    }

    public ProjectileType getProjectileType() {
        return projectileType;
    }
}
