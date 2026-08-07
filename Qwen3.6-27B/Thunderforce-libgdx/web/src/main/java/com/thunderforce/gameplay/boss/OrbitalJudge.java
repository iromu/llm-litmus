package com.thunderforce.gameplay.boss;

import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.utils.Array;

/**
 * "Orbital Judge" — transforming orbital battleship boss.
 *
 * Sections: CORE, WING_LEFT, WING_RIGHT, ROTATING_WEAPONS.
 * Phase 1: Ship formation, sweeping laser patterns.
 * Phase 2 (60% HP): Transforms to attack mode, homing missiles.
 * Phase 3 (20% HP): Final form, area denial zones + aimed spreads.
 * Death: Wings detach → weapons explode → core supernova (4 seconds).
 *
 * HP: 300, Score: 8000
 */
public class OrbitalJudge extends Boss {

    private static final int MAX_HP = 300;
    private static final int SCORE = 8000;
    private static final float[] PHASE_THRESHOLDS = {0.60f, 0.20f};
    private static final float[] ATTACK_INTERVALS = {2.5f, 1.5f, 0.7f};
    private static final float DEATH_DURATION = 4.0f;

    // Section references
    private BossSection core;
    private BossSection wingLeft;
    private BossSection wingRight;
    private BossSection rotatingWeapons;

    // Transformation animation
    private float transformProgress;
    private boolean transforming;
    private float transformTimer;
    private static final float TRANSFORM_DURATION = 1.5f;

    // Wing positions per phase: [phase][wing][offsetX, offsetY]
    private static final float[][][] WING_POSITIONS = {
        // Phase 0: wide ship formation
        {{-48f, 0f}, {48f, 0f}},
        // Phase 1: attack mode — wings fold inward
        {{-24f, -20f}, {24f, -20f}},
        // Phase 2: final form — wings spread and angle down
        {{-40f, 24f}, {40f, 24f}}
    };

    // Rotation for weapons section
    private float weaponRotation;

    public OrbitalJudge() {
        super(MAX_HP, PHASE_THRESHOLDS, ATTACK_INTERVALS, DEATH_DURATION);
        transformProgress = 0f;
        transforming = false;
        transformTimer = 0f;
        weaponRotation = 0f;
    }

    @Override
    protected void defineSections() {
        // Core — battleship body
        core = new BossSection(BossSection.SectionType.CORE, 120,
            0f, 0f, 40f, 32f, "sweep", 3f);
        sections.add(core);

        // Left wing
        wingLeft = new BossSection(BossSection.SectionType.WING, 40,
            -48f, 0f, 28f, 20f, "sweep", 2.5f);
        sections.add(wingLeft);

        // Right wing
        wingRight = new BossSection(BossSection.SectionType.WING, 40,
            48f, 0f, 28f, 20f, "sweep", 2.5f);
        sections.add(wingRight);

        // Rotating weapons array
        rotatingWeapons = new BossSection(BossSection.SectionType.ROTATING_WEAPONS, 30,
            0f, -24f, 16f, 16f, "area_denial", 2f);
        sections.add(rotatingWeapons);
    }

    @Override
    protected void onPhaseChange(int newPhase) {
        super.onPhaseChange(newPhase);
        // Start transformation animation
        transforming = true;
        transformProgress = 0f;
        transformTimer = 0f;
    }

    @Override
    public void update(float delta, float playerX, float playerY,
                       Array<BossSection.BossFireCommand> commands) {
        if (defeated) return;

        if (!alive) {
            updateDeathSequence(delta);
            return;
        }

        if (!entryComplete) {
            entryAnimationTimer += delta;
            if (entryAnimationTimer >= 2f) {
                entryComplete = true;
            }
            return;
        }

        // Handle transformation animation
        if (transforming) {
            transformTimer += delta;
            transformProgress = Math.min(1f, transformTimer / TRANSFORM_DURATION);
            if (transformProgress >= 1f) {
                transforming = false;
            }
            applyTransformedPositions();
        }

        // Weapon rotation
        weaponRotation += delta * 40f * Math.PI / 180f;

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

        checkPhaseTransition();
        recalculateBounds();
    }

    private void applyTransformedPositions() {
        float[][] target = WING_POSITIONS[Math.min(phase, WING_POSITIONS.length - 1)];
        float ease = transformProgress * transformProgress * (3f - 2f * transformProgress); // smoothstep

        wingLeft.offsetX = lerp(-48f, target[0][0], ease);
        wingLeft.offsetY = lerp(0f, target[0][1], ease);
        wingRight.offsetX = lerp(48f, target[1][0], ease);
        wingRight.offsetY = lerp(0f, target[1][1], ease);
    }

    private float lerp(float a, float b, float t) {
        return a + (b - a) * t;
    }

    @Override
    protected void executePhaseAttack(float delta, float playerX, float playerY,
                                      Array<BossSection.BossFireCommand> commands) {
        switch (phase) {
            case 0:
                // Sweeping laser from wings
                if (wingLeft.isAlive()) {
                    commands.add(new BossSection.BossFireCommand(
                        wingLeft.getWorldX(), wingLeft.getWorldY(), 0f, 0.8f));
                }
                if (wingRight.isAlive()) {
                    commands.add(new BossSection.BossFireCommand(
                        wingRight.getWorldX(), wingRight.getWorldY(), (float)(Math.PI * 2f), 0.8f));
                }
                break;
            case 1:
                // Homing missiles from rotating weapons
                if (rotatingWeapons.isAlive()) {
                    for (int i = 0; i < 3; i++) {
                        float angle = weaponRotation + i * (float)(Math.PI * 2f) / 3f;
                        float wx = rotatingWeapons.getWorldX() + (float) Math.cos(angle) * 20f;
                        float wy = rotatingWeapons.getWorldY() + (float) Math.sin(angle) * 20f;
                        commands.add(new BossSection.BossFireCommand(
                            wx, wy, playerX, playerY, 0.7f, 0.6f));
                    }
                }
                break;
            case 2:
                // Area denial + aimed spread
                commands.add(new BossSection.BossFireCommand(
                    x, y, playerX, playerY, 0f, 1.5f));
                for (int i = 0; i < 6; i++) {
                    float angle = (i / 6f) * (float)(Math.PI * 2f) + weaponRotation;
                    commands.add(new BossSection.BossFireCommand(x, y, angle, 0.5f));
                }
                break;
        }
    }

    @Override
    protected void renderPhaseEffects(SpriteBatch batch) {
        // Transformation flash
        if (transforming) {
            float flash = (1f - transformProgress) * 0.4f;
            batch.setColor(0.5f, 0.7f, 1f, flash);
            batch.draw((com.badlogic.gdx.graphics.Texture) null, x - 60f, y - 40f, 120f, 80f);
            batch.setColor(1f, 1f, 1f, 1f);
        }

        // Phase aura
        float r, g, b;
        switch (phase) {
            case 0: r = 0.3f; g = 0.5f; b = 1f; break;
            case 1: r = 0.8f; g = 0.3f; b = 1f; break;
            case 2: r = 1f; g = 0.2f; b = 0.5f; break;
            default: r = 0.5f; g = 0.5f; b = 1f; break;
        }
        batch.setColor(r, g, b, 0.1f);
        batch.draw((com.badlogic.gdx.graphics.Texture) null, x - 56f, y - 36f, 112f, 72f);
        batch.setColor(1f, 1f, 1f, 1f);
    }

    @Override
    protected void renderDeathSequence(SpriteBatch batch) {
        float stageDuration = DEATH_DURATION / getDeathStageCount();
        float stageProgress = deathStageTimer / stageDuration;

        switch (deathStage) {
            case 0:
                // Wings detach — fly outward
                float detachDist = stageProgress * 60f;
                batch.setColor(0.5f, 0.7f, 1f, 1f - stageProgress * 0.3f);
                if (wingLeft.isAlive()) {
                    batch.draw((com.badlogic.gdx.graphics.Texture) null, wingLeft.getWorldX() - detachDist - 14f,
                        wingLeft.getWorldY() - 10f, 28f, 20f);
                }
                if (wingRight.isAlive()) {
                    batch.draw((com.badlogic.gdx.graphics.Texture) null, wingRight.getWorldX() + detachDist - 14f,
                        wingRight.getWorldY() - 10f, 28f, 20f);
                }
                batch.setColor(1f, 1f, 1f, 1f);
                break;

            case 1:
                // Weapons explode — bright flash
                float explodeScale = 1f + stageProgress * 3f;
                float alpha = 1f - stageProgress * 0.4f;
                batch.setColor(1f, 0.9f, 0.3f, alpha);
                float ws = 16f * explodeScale;
                batch.draw((com.badlogic.gdx.graphics.Texture) null, x - ws * 0.5f, y - 24f - ws * 0.5f, ws, ws);
                batch.setColor(1f, 1f, 1f, 1f);
                break;

            case 2:
                // Core supernova — expanding bright circle
                float novaScale = stageProgress * 3f;
                float novaAlpha = 1f - stageProgress * 0.5f;
                batch.setColor(1f, 0.8f, 0.5f, novaAlpha);
                float ns = 40f * novaScale;
                batch.draw((com.badlogic.gdx.graphics.Texture) null, x - ns * 0.5f, y - ns * 0.5f, ns, ns);
                batch.setColor(1f, 1f, 1f, 1f);
                break;
        }
    }

    @Override
    protected int getDeathStageCount() {
        return 3;
    }

    @Override
    public int getScoreValue() {
        return SCORE;
    }

    @Override
    public String getName() {
        return "Orbital Judge";
    }
}
