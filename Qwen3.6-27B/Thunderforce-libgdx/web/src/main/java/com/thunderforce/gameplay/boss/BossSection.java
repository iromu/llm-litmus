package com.thunderforce.gameplay.boss;

import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.math.Rectangle;
import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.utils.Array;

/**
 * Destructible section of a boss. Each section has independent HP,
 * position offsets relative to the boss center, and its own attack pattern.
 * Destroying sections reduces boss capabilities and can trigger phase shifts.
 */
public class BossSection {

    public enum SectionType {
        CORE, ARM, TURRET, WING, ENGINE, TENTACLE, DRILL, BEAM_EYE, ROTATING_WEAPONS
    }

    float offsetX;
    float offsetY;
    private final float width;
    private final float height;
    private final SectionType sectionType;
    private final String attackPattern;

    private int hp;
    private final int maxHp;
    private boolean alive;
    private float attackTimer;
    private float attackInterval;

    private final Rectangle bounds = new Rectangle();
    private final Vector2 worldPos = new Vector2();

    public BossSection(SectionType type, int hp, float offsetX, float offsetY,
                       float width, float height, String attackPattern, float attackInterval) {
        this.sectionType = type;
        this.maxHp = hp;
        this.hp = hp;
        this.alive = true;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.width = width;
        this.height = height;
        this.attackPattern = attackPattern;
        this.attackInterval = attackInterval;
    }

    public void update(float delta, float bossX, float bossY,
                       float playerX, float playerY, Array<BossFireCommand> commands) {
        if (!alive) return;

        attackTimer += delta;
        if (attackTimer >= attackInterval) {
            attackTimer -= attackInterval;
            fireAttack(bossX, bossY, playerX, playerY, commands);
        }
    }

    private void fireAttack(float bossX, float bossY,
                            float playerX, float playerY, Array<BossFireCommand> commands) {
        float wx = bossX + offsetX;
        float wy = bossY + offsetY;

        switch (attackPattern) {
            case "aimed":
                commands.add(new BossFireCommand(wx, wy, playerX, playerY, 0f, 1f));
                break;
            case "aimed_spread":
                for (int i = -2; i <= 2; i++) {
                    float angle = aimAngle(wx, wy, playerX, playerY) + i * 0.15f;
                    commands.add(new BossFireCommand(wx, wy, angle, 1f));
                }
                break;
            case "spiral":
                commands.add(new BossFireCommand(wx, wy, 0f, 1f));
                break;
            case "sweep":
                commands.add(new BossFireCommand(wx, wy, 0f, 0.8f));
                break;
            case "homing":
                commands.add(new BossFireCommand(wx, wy, playerX, playerY, 0.7f, 0.6f));
                break;
            case "area_denial":
                for (int i = 0; i < 8; i++) {
                    float angle = (float) ((i / 8f) * (Math.PI * 2f));
                    commands.add(new BossFireCommand(wx, wy, angle, 0.5f));
                }
                break;
            case "drill_advance":
                commands.add(new BossFireCommand(wx, wy, 0f, 1.2f));
                break;
            case "beam":
                commands.add(new BossFireCommand(wx, wy, playerX, playerY, 0f, 2f));
                break;
            default:
                commands.add(new BossFireCommand(wx, wy, 0f, 1f));
                break;
        }
    }

    private float aimAngle(float fx, float fy, float tx, float ty) {
        return (float) Math.atan2(ty - fy, tx - fx);
    }

    public void takeDamage(int amount) {
        if (!alive) return;
        hp -= amount;
        if (hp <= 0) {
            hp = 0;
            alive = false;
        }
    }

    public boolean isAlive() {
        return alive;
    }

    public int getHp() {
        return hp;
    }

    public int getMaxHp() {
        return maxHp;
    }

    public float getWorldX() {
        return worldPos.x;
    }

    public float getWorldY() {
        return worldPos.y;
    }

    public void updateWorldPosition(float bossX, float bossY) {
        worldPos.set(bossX + offsetX, bossY + offsetY);
        bounds.set(worldPos.x - width * 0.5f, worldPos.y - height * 0.5f, width, height);
    }

    public Rectangle getBounds() {
        return bounds;
    }

    public SectionType getSectionType() {
        return sectionType;
    }

    public String getAttackPattern() {
        return attackPattern;
    }

    public float getAttackInterval() {
        return attackInterval;
    }

    public void setAttackInterval(float interval) {
        this.attackInterval = interval;
    }

    public float getOffsetX() {
        return offsetX;
    }

    public float getOffsetY() {
        return offsetY;
    }

    public void render(SpriteBatch batch, float bossX, float bossY) {
        if (!alive) return;
        float wx = bossX + offsetX;
        float wy = bossY + offsetY;
        // Placeholder: render section as a colored rectangle based on type
        // Actual rendering will use sprite textures from AssetLoader
        float hpRatio = (float) hp / maxHp;
        float r, g, b;
        switch (sectionType) {
            case CORE:
                r = 1f; g = 0.2f; b = 0.2f;
                break;
            case TURRET:
                r = 0.8f; g = 0.8f; b = 0.2f;
                break;
            case WING:
                r = 0.3f; g = 0.6f; b = 1f;
                break;
            case DRILL:
                r = 0.9f; g = 0.5f; b = 0.1f;
                break;
            case TENTACLE:
                r = 0.2f; g = 0.9f; b = 0.4f;
                break;
            case BEAM_EYE:
                r = 1f; g = 0f; b = 0.8f;
                break;
            case ROTATING_WEAPONS:
                r = 0.6f; g = 0.3f; b = 1f;
                break;
            default:
                r = 0.7f; g = 0.7f; b = 0.7f;
                break;
        }
        // Dim based on HP
        float brightness = 0.4f + 0.6f * hpRatio;
        batch.setColor(r * brightness, g * brightness, b * brightness, 1f);
        // Draw as colored rectangle (null texture = white fill)
        batch.draw((com.badlogic.gdx.graphics.Texture) null, wx - width * 0.5f, wy - height * 0.5f, width, height);
        batch.setColor(1f, 1f, 1f, 1f);
    }

    /**
     * Command structure for boss sections to request bullet spawns.
     * The boss or game manager collects these and creates actual bullets.
     */
    public static class BossFireCommand {
        public float x, y;
        public float angle;
        public float speed;
        public float targetX, targetY;
        public boolean homing;

        public BossFireCommand(float x, float y, float angle, float speed) {
            this.x = x;
            this.y = y;
            this.angle = angle;
            this.speed = speed;
            this.homing = false;
        }

        public BossFireCommand(float x, float y, float targetX, float targetY,
                               float homing, float speed) {
            this.x = x;
            this.y = y;
            this.targetX = targetX;
            this.targetY = targetY;
            this.homing = homing > 0f;
            this.speed = speed;
            this.angle = (float) Math.atan2(targetY - y, targetX - x);
        }
    }
}
