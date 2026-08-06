package com.thunderforce.gameplay.boss;

import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.math.Rectangle;
import com.badlogic.gdx.utils.Array;
import com.thunderforce.gameplay.bullet.SpatialEntity;

/**
 * Boss base class with section management, phase transitions,
 * and cinematic death sequences.
 *
 * Bosses are composed of multiple BossSection instances. Each section
 * has independent HP and attack behavior. Phase transitions trigger
 * at HP thresholds, changing attack patterns and intensity.
 */
public abstract class Boss implements SpatialEntity {

    public static final int ENTITY_TYPE_BOSS = 3;

    protected float x;
    protected float y;
    protected int hp;
    protected final int maxHp;
    protected int phase;
    protected boolean alive;
    protected boolean defeated;
    protected float deathSequenceTimer;
    protected final Array<BossSection> sections;
    protected float attackTimer;
    protected float entryAnimationTimer;
    protected boolean entryComplete;

    // Cached bounds
    private final Rectangle bounds = new Rectangle();

    // Phase threshold data: fraction of maxHp (0..1)
    protected final float[] phaseThresholds;
    protected final float[] phaseAttackIntervals;

    // Death sequence stages
    protected float deathStageTimer;
    protected int deathStage;
    protected final float deathDuration;

    public Boss(int maxHp, float[] phaseThresholds, float[] phaseAttackIntervals,
                float deathDuration) {
        this.maxHp = maxHp;
        this.hp = maxHp;
        this.phase = 0;
        this.alive = true;
        this.defeated = false;
        this.deathSequenceTimer = 0f;
        this.deathDuration = deathDuration;
        this.sections = new Array<>();
        this.attackTimer = 0f;
        this.entryAnimationTimer = 0f;
        this.entryComplete = false;
        this.phaseThresholds = phaseThresholds;
        this.phaseAttackIntervals = phaseAttackIntervals;
        this.deathStageTimer = 0f;
        this.deathStage = 0;
    }

    /**
     * Subclasses override to define their sections.
     */
    protected abstract void defineSections();

    /**
     * Subclasses override for phase-specific attack logic beyond section attacks.
     */
    protected abstract void executePhaseAttack(float delta, float playerX, float playerY,
                                               Array<BossSection.BossFireCommand> commands);

    /**
     * Subclasses override for phase-specific rendering effects.
     */
    protected abstract void renderPhaseEffects(SpriteBatch batch);

    /**
     * Subclasses override for death sequence animation stages.
     */
    protected abstract void renderDeathSequence(SpriteBatch batch);

    /**
     * Get the score awarded for defeating this boss.
     */
    public abstract int getScoreValue();

    /**
     * Get the boss name for display.
     */
    public abstract String getName();

    public void init(float x, float y) {
        this.x = x;
        this.y = y;
        defineSections();
        for (BossSection section : sections) {
            section.updateWorldPosition(this.x, this.y);
        }
        recalculateBounds();
    }

    public void update(float delta, float playerX, float playerY,
                       Array<BossSection.BossFireCommand> commands) {
        if (defeated) return;

        if (!alive) {
            updateDeathSequence(delta);
            return;
        }

        // Entry animation
        if (!entryComplete) {
            entryAnimationTimer += delta;
            if (entryAnimationTimer >= 2f) {
                entryComplete = true;
            }
            // During entry, boss slowly moves into position
            return;
        }

        // Update section positions
        for (BossSection section : sections) {
            section.updateWorldPosition(this.x, this.y);
        }

        // Update section attacks (apply phase-scaled interval)
        float scaledInterval = getSectionAttackInterval(null);
        for (BossSection section : sections) {
            section.setAttackInterval(scaledInterval);
            section.update(delta, x, y, playerX, playerY, commands);
        }

        // Phase-specific attacks
        attackTimer += delta;
        float interval = phaseAttackIntervals.length > phase
            ? phaseAttackIntervals[phase] : 1f;
        if (attackTimer >= interval) {
            attackTimer -= interval;
            executePhaseAttack(delta, playerX, playerY, commands);
        }

        // Check phase transitions
        checkPhaseTransition();

        recalculateBounds();
    }

    protected float getSectionAttackInterval(@SuppressWarnings("unused") BossSection section) {
        float baseInterval = 2f;
        switch (phase) {
            case 0: return baseInterval;
            case 1: return baseInterval * 0.7f;
            case 2: return baseInterval * 0.4f;
            default: return baseInterval * 0.3f;
        }
    }

    public void takeDamage(int amount) {
        if (!alive) return;
        hp -= amount;
        if (hp < 0) hp = 0;
        if (hp <= 0) {
            alive = false;
            startDeathSequence();
        }
    }

    protected void checkPhaseTransition() {
        if (!alive) return;
        float hpRatio = (float) hp / maxHp;

        for (int i = 0; i < phaseThresholds.length; i++) {
            if (hpRatio <= phaseThresholds[i] && phase < i + 1) {
                phase = i + 1;
                onPhaseChange(phase);
                break;
            }
        }
    }

    /**
     * Called when a phase change occurs. Subclasses can override for effects.
     */
    protected void onPhaseChange(int newPhase) {
        // Default: reset attack timers
        attackTimer = 0f;
        for (BossSection section : sections) {
            // Sections retain their attack timers
        }
    }

    protected void startDeathSequence() {
        deathSequenceTimer = 0f;
        deathStage = 0;
        deathStageTimer = 0f;
    }

    protected void updateDeathSequence(float delta) {
        deathSequenceTimer += delta;
        deathStageTimer += delta;

        // Advance through death stages
        float stageDuration = deathDuration / getDeathStageCount();
        if (deathStageTimer >= stageDuration) {
            deathStageTimer -= stageDuration;
            deathStage++;
        }

        if (deathSequenceTimer >= deathDuration) {
            defeated = true;
        }
    }

    protected int getDeathStageCount() {
        return 3;
    }

    public void render(SpriteBatch batch) {
        if (defeated) return;

        if (!alive) {
            renderDeathSequence(batch);
            return;
        }

        // Render all alive sections
        for (BossSection section : sections) {
            section.render(batch, x, y);
        }

        // Phase-specific visual effects
        renderPhaseEffects(batch);
    }

    protected void recalculateBounds() {
        float minX = Float.MAX_VALUE;
        float minY = Float.MAX_VALUE;
        float maxX = -Float.MAX_VALUE;
        float maxY = -Float.MAX_VALUE;

        for (BossSection section : sections) {
            if (!section.isAlive()) continue;
            Rectangle sb = section.getBounds();
            if (sb.x < minX) minX = sb.x;
            if (sb.y < minY) minY = sb.y;
            if (sb.x + sb.width > maxX) maxX = sb.x + sb.width;
            if (sb.y + sb.height > maxY) maxY = sb.y + sb.height;
        }

        if (minX > maxX) {
            // No alive sections
            bounds.set(x - 16f, y - 16f, 32f, 32f);
        } else {
            bounds.set(minX, minY, maxX - minX, maxY - minY);
        }
    }

    // === SpatialEntity implementation ===
    @Override
    public Rectangle getBounds() {
        return bounds;
    }

    @Override
    public int getEntityType() {
        return ENTITY_TYPE_BOSS;
    }

    // === Accessors ===
    public float getX() { return x; }
    public float getY() { return y; }
    public void setX(float x) { this.x = x; }
    public void setY(float y) { this.y = y; }
    public int getHp() { return hp; }
    public int getMaxHp() { return maxHp; }
    public int getPhase() { return phase; }
    public boolean isAlive() { return alive; }
    public boolean isDefeated() { return defeated; }
    public boolean isEntryComplete() { return entryComplete; }
    public Array<BossSection> getSections() { return sections; }
    public float getHpRatio() { return (float) hp / maxHp; }
    public float getDeathProgress() {
        if (!alive && !defeated) return deathSequenceTimer / deathDuration;
        return 0f;
    }
}
