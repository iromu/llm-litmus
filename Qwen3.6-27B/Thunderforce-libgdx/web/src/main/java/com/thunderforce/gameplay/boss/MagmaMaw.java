package com.thunderforce.gameplay.boss;

import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.utils.Array;

/**
 * "Magma Maw" — volcanic mining machine boss.
 *
 * Sections: CORE (main body), DRILL_LEFT, DRILL_RIGHT, 4x TURRET.
 * Phase 1: Turrets fire spiral patterns, drills advance forward.
 * Phase 2 (75% HP): Drills become independent attackers, faster attacks.
 * Phase 3 (25% HP): Desperate aimed spreads, screen-filling patterns.
 * Death: Drills collapse → turrets explode → core implodes (3.5 seconds).
 *
 * HP: 200, Score: 5000
 */
public class MagmaMaw extends Boss {

    private static final int MAX_HP = 200;
    private static final int SCORE = 5000;
    private static final float[] PHASE_THRESHOLDS = {0.75f, 0.25f};
    private static final float[] ATTACK_INTERVALS = {2.0f, 1.4f, 0.8f};
    private static final float DEATH_DURATION = 3.5f;

    // Section references for targeted death animation
    private BossSection core;
    private BossSection drillLeft;
    private BossSection drillRight;
    private final Array<BossSection> turrets = new Array<>();

    public MagmaMaw() {
        super(MAX_HP, PHASE_THRESHOLDS, ATTACK_INTERVALS, DEATH_DURATION);
    }

    @Override
    protected void defineSections() {
        // Core — main body
        core = new BossSection(BossSection.SectionType.CORE, 80,
            0f, 0f, 48f, 36f, "aimed_spread", 3f);
        sections.add(core);

        // Left drill
        drillLeft = new BossSection(BossSection.SectionType.DRILL, 20,
            -32f, 0f, 24f, 20f, "drill_advance", 2.5f);
        sections.add(drillLeft);

        // Right drill
        drillRight = new BossSection(BossSection.SectionType.DRILL, 20,
            32f, 0f, 24f, 20f, "drill_advance", 2.5f);
        sections.add(drillRight);

        // 4 turrets around the core
        float[][] turretPositions = {
            {-20f, -18f}, {20f, -18f}, {-20f, 18f}, {20f, 18f}
        };
        for (float[] pos : turretPositions) {
            BossSection turret = new BossSection(BossSection.SectionType.TURRET, 10,
                pos[0], pos[1], 12f, 12f, "spiral", 2f);
            turrets.add(turret);
            sections.add(turret);
        }
    }

    @Override
    protected void executePhaseAttack(float delta, float playerX, float playerY,
                                      Array<BossSection.BossFireCommand> commands) {
        switch (phase) {
            case 0:
                // Core fires aimed bursts
                commands.add(new BossSection.BossFireCommand(
                    x, y, playerX, playerY, 0f, 1f));
                break;
            case 1:
                // Drills fire independently at player
                if (drillLeft.isAlive()) {
                    commands.add(new BossSection.BossFireCommand(
                        drillLeft.getWorldX(), drillLeft.getWorldY(),
                        playerX, playerY, 0f, 1.2f));
                }
                if (drillRight.isAlive()) {
                    commands.add(new BossSection.BossFireCommand(
                        drillRight.getWorldX(), drillRight.getWorldY(),
                        playerX, playerY, 0f, 1.2f));
                }
                break;
            case 2:
                // Screen-filling spread from core
                for (int i = -3; i <= 3; i++) {
                    float angle = aimAngle(x, y, playerX, playerY) + i * 0.2f;
                    commands.add(new BossSection.BossFireCommand(x, y, angle, 1.5f));
                }
                break;
        }
    }

    @Override
    protected void renderPhaseEffects(SpriteBatch batch) {
        // Phase glow effects
        float r, g, b;
        switch (phase) {
            case 0:
                r = 1f; g = 0.3f; b = 0f;
                break;
            case 1:
                r = 1f; g = 0.6f; b = 0f;
                break;
            case 2:
                r = 1f; g = 0f; b = 0.3f;
                break;
            default:
                r = 1f; g = 0.5f; b = 0f;
                break;
        }
        batch.setColor(r, g, b, 0.15f);
        batch.draw((Texture) null, x - 40f, y - 30f, 80f, 60f);
        batch.setColor(1f, 1f, 1f, 1f);
    }

    @Override
    protected void renderDeathSequence(SpriteBatch batch) {
        float stageDuration = DEATH_DURATION / getDeathStageCount();
        float stageProgress = deathStageTimer / stageDuration;

        switch (deathStage) {
            case 0:
                // Drills collapse — shrink and dim
                float drillScale = 1f - stageProgress;
                batch.setColor(0.8f, 0.4f, 0f, drillScale);
                if (drillLeft.isAlive()) {
                    float s = 12f * drillScale;
                    batch.draw((Texture) null, drillLeft.getWorldX() - s * 0.5f,
                        drillLeft.getWorldY() - s * 0.5f, s, s);
                }
                if (drillRight.isAlive()) {
                    float s = 12f * drillScale;
                    batch.draw((Texture) null, drillRight.getWorldX() - s * 0.5f,
                        drillRight.getWorldY() - s * 0.5f, s, s);
                }
                batch.setColor(1f, 1f, 1f, 1f);
                break;

            case 1:
                // Turrets explode — flash and expand
                float explodeScale = 1f + stageProgress * 2f;
                float alpha = 1f - stageProgress * 0.5f;
                batch.setColor(1f, 0.8f, 0.2f, alpha);
                for (BossSection turret : turrets) {
                    if (turret.isAlive()) {
                        float s = 12f * explodeScale;
                        batch.draw((Texture) null, turret.getWorldX() - s * 0.5f,
                            turret.getWorldY() - s * 0.5f, s, s);
                    }
                }
                batch.setColor(1f, 1f, 1f, 1f);
                break;

            case 2:
                // Core implodes — shrink to nothing with bright flash
                float implodeScale = 1f - stageProgress;
                float flash = stageProgress < 0.3f ? stageProgress / 0.3f : 1f - (stageProgress - 0.3f) / 0.7f;
                batch.setColor(1f, 0.5f * flash, 0f, flash);
                float cs = 48f * implodeScale;
                batch.draw((Texture) null, x - cs * 0.5f, y - cs * 0.5f, cs, cs);
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
        return "Magma Maw";
    }

    private float aimAngle(float fx, float fy, float tx, float ty) {
        return (float) Math.atan2(ty - fy, tx - fx);
    }
}
