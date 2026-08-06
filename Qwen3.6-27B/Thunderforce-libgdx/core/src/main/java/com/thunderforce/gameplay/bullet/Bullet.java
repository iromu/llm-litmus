package com.thunderforce.gameplay.bullet;

import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.g2d.Batch;
import com.badlogic.gdx.graphics.glutils.ShapeRenderer;
import com.badlogic.gdx.math.Rectangle;
import com.badlogic.gdx.math.Vector2;

/**
 * Enemy bullet base class.
 * All enemy projectiles extend or are instances of this class.
 */
public class Bullet implements SpatialEntity {

    public static final int ENTITY_TYPE = 1;
    private static final Texture WHITE = WhiteTexture.get();

    public enum BulletType {
        SPIRAL,
        SWEEP,
        AIMED,
        HOMING,
        LASER,
        AREA_DENIAL
    }

    public float x;
    public float y;
    public final Vector2 velocity;
    public float lifetime;
    public float maxLifetime;
    public float collisionRadius;
    public int damage;
    public boolean alive;
    public BulletType bulletType;

    private final Rectangle bounds;
    private final Color color;
    private Vector2 target;

    public Bullet(float x, float y, float vx, float vy, BulletType type) {
        this.x = x;
        this.y = y;
        this.velocity = new Vector2(vx, vy);
        this.lifetime = 0;
        this.maxLifetime = 5f;
        this.collisionRadius = 4f;
        this.damage = 1;
        this.alive = true;
        this.bulletType = type;
        this.bounds = new Rectangle();
        this.color = new Color();
        this.target = null;
        setBulletColor(type);
    }

    public Bullet(float x, float y, float vx, float vy, BulletType type, int damage) {
        this(x, y, vx, vy, type);
        this.damage = damage;
    }

    public Bullet setMaxLifetime(float seconds) {
        this.maxLifetime = seconds;
        return this;
    }

    public Bullet setCollisionRadius(float radius) {
        this.collisionRadius = radius;
        return this;
    }

    public Bullet setTarget(float tx, float ty) {
        this.target = new Vector2(tx, ty);
        return this;
    }

    private void setBulletColor(BulletType type) {
        switch (type) {
            case SPIRAL:
                color.set(1f, 0.4f, 0f, 1f);
                break;
            case SWEEP:
                color.set(1f, 0.6f, 0f, 1f);
                break;
            case AIMED:
                color.set(1f, 0.2f, 0.2f, 1f);
                break;
            case HOMING:
                color.set(1f, 0.35f, 0f, 1f);
                break;
            case LASER:
                color.set(1f, 0f, 0f, 1f);
                break;
            case AREA_DENIAL:
                color.set(1f, 0.5f, 0f, 0.6f);
                break;
        }
    }

    /**
     * Update position, lifetime, and homing behavior.
     */
    public void update(float delta) {
        lifetime += delta;
        if (lifetime >= maxLifetime) {
            alive = false;
            return;
        }

        if (bulletType == BulletType.HOMING && target != null) {
            float dx = target.x - x;
            float dy = target.y - y;
            float dist = (float) Math.sqrt(dx * dx + dy * dy);
            if (dist > 1f) {
                float turnRate = 3.0f;
                Vector2 desired = new Vector2(dx, dy).nor();
                float t = Math.min(1f, turnRate * delta);
                velocity.x = velocity.x + (desired.x - velocity.x) * t;
                velocity.y = velocity.y + (desired.y - velocity.y) * t;
                velocity.nor().scl(velocity.len());
            }
        }

        x += velocity.x * delta;
        y += velocity.y * delta;

        if (x < -32 || x > 352 || y < -32 || y > 256) {
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
     * Render the bullet as a colored circle.
     * Use ShapeRenderer for circle drawing; falls back to a filled rect if no ShapeRenderer.
     */
    public void render(Batch batch) {
        batch.setColor(color);
        float half = collisionRadius;
        batch.draw(WHITE, x - half, y - half, half * 2, half * 2);
        batch.setColor(Color.WHITE);
    }

    public void render(ShapeRenderer shapeRenderer) {
        shapeRenderer.setColor(color);
        shapeRenderer.circle(x, y, collisionRadius, 8);
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

    public float getLifetime() {
        return lifetime;
    }

    public float getMaxLifetime() {
        return maxLifetime;
    }

    public float getCollisionRadius() {
        return collisionRadius;
    }

    public int getDamage() {
        return damage;
    }

    public BulletType getBulletType() {
        return bulletType;
    }

    public void kill() {
        this.alive = false;
    }
}
