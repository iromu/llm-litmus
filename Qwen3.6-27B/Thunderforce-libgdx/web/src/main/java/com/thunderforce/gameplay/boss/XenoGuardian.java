package com.thunderforce.gameplay.boss;

import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.utils.Array;

/**
 * "Xeno Guardian" — biomechanical alien guardian boss.
 *
 * Sections: CORE, TENTACLE_1, TENTACLE_2, TENTACLE_3, BEAM_EYE.
 * Phase 1: Tentacles sweep, beam eye charges.
 * Phase 2 (65% HP): Tentacles become aggressive, beam fires.
 * Phase 3 (20% HP): All-out attack — tentacles + beam + spiral patterns.
 * Death: Tentacles wither → eye explodes → core dissolves (3.5 seconds).
 *
 * HP: 250, Score: 6000
 */
public class XenoGuardian extends Boss {

    private static final int MAX_HP = 250;
    private static final int SCORE = 6000;
    private static final float[] PHASE_THRESHOLDS = {0.65f, 0.20f};
    private static final float[] ATTACK_INTERVALS = {2.0f, 1.2f, 0.6f};
    private static final float DEATH_DURATION = 3.5f;

    // Section references
    private BossSection core;
    private final Array<BossSection> tentacles = new Array<>();
    private BossSection beamEye;

    // Tentacle animation
    private float tentaclePhase;
    private float tentacleAmp;

    // Beam charge
    private float beamChargeTimer;
    private float beamChargeThreshold;
    private boolean beamCharging;
    private boolean beamFiring;
    private float beamFireTimer;
    private static final float BEAM_FIRE_DURATION = 1.0f;

    public XenoGuardian() {
        super(MAX_HP, PHASE_THRESHOLDS, ATTACK_INTERVALS, DEATH_DURATION);
        tentaclePhase = 0f;
        tentacleAmp = 10f;
        beamChargeTimer = 0f;
        beamChargeThreshold = 3f;
        beamCharging = false;
        beamFiring = false;
        beamFireTimer = 0f;
    }

    @Override
    protected void defineSections() {
        // Core — alien body
        core = new BossSection(BossSection.SectionType.CORE, 100,
            0f, 0f, 44f, 40f, "aimed", 3f);
        sections.add(core);

        // 3 tentacles at different offsets
        float[][] tentaclePositions = {
            {-30f, 20f}, {0f, 28f}, {30f, 20f}
        };
        for (float[] pos : tentaclePositions) {
            BossSection tentacle = new BossSection(BossSection.SectionType.TENTACLE, 20,
                pos[0], pos[1], 16f, 24f, "sweep", 2f);
            tentacles.add(tentacle);
            sections.add(tentacle);
        }

        // Beam eye
        beamEye = new BossSection(BossSection.SectionType.BEAM_EYE, 15,
            0f, -16f, 14f, 14f, "beam", 4f);
        sections.add(beamEye);
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

        // Tentacle wobble animation
        tentaclePhase += delta * 1.5f;
        tentacleAmp = 10f + phase * 5f;

        // Animate tentacle positions with sine wave
        for (int i = 0; i < tentacles.size; i++) {
            BossSection tentacle = tentacles.get(i);
            float baseOffsetX = (i - 1) * 30f;
            float wobble = (float) Math.sin(tentaclePhase + i * 1.2f) * tentacleAmp;
            tentacle.offsetX = baseOffsetX + wobble * 0.3f;
            tentacle.offsetY = 20f + i * 4f + (float) Math.cos(tentaclePhase + i * 0.8f) * tentacleAmp * 0.2f;
        }

        // Beam charge / fire logic
        updateBeam(delta, playerX, playerY, commands);

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

    private void updateBeam(float delta, float playerX, float playerY,
                            Array<BossSection.BossFireCommand> commands) {
        if (!beamEye.isAlive()) return;

        if (phase >= 1) {
            // Beam is active from phase 2 onward
            if (!beamFiring) {
                beamChargeTimer += delta;
                if (beamChargeTimer >= beamChargeThreshold) {
                    beamCharging = true;
                    beamChargeTimer = 0f;
                }
            }

            if (beamCharging && !beamFiring) {
                beamChargeTimer += delta;
                if (beamChargeTimer >= 1.5f) {
                    beamCharging = false;
                    beamFiring = true;
                    beamFireTimer = 0f;
                }
            }

            if (beamFiring) {
                beamFireTimer += delta;
                // Fire beam continuously during fire phase
                commands.add(new BossSection.BossFireCommand(
                    beamEye.getWorldX(), beamEye.getWorldY(),
                    playerX, playerY, 0f, 2f));
                if (beamFireTimer >= BEAM_FIRE_DURATION) {
                    beamFiring = false;
                    beamChargeTimer = 0f;
                    beamChargeThreshold = 2.5f - phase * 0.5f;
                    if (beamChargeThreshold < 1f) beamChargeThreshold = 1f;
                }
            }
        }
    }

    @Override
    protected void executePhaseAttack(float delta, float playerX, float playerY,
                                      Array<BossSection.BossFireCommand> commands) {
        switch (phase) {
            case 0:
                // Tentacles sweep, core aimed shots
                commands.add(new BossSection.BossFireCommand(
                    x, y, playerX, playerY, 0f, 1f));
                break;
            case 1:
                // Aggressive tentacle aimed fire
                for (BossSection tentacle : tentacles) {
                    if (tentacle.isAlive()) {
                        commands.add(new BossSection.BossFireCommand(
                            tentacle.getWorldX(), tentacle.getWorldY(),
                            playerX, playerY, 0f, 0.8f));
                    }
                }
                break;
            case 2:
                // Spiral pattern from core + tentacle aimed
                for (int i = 0; i < 5; i++) {
                    float angle = (i / 5f) * MathUtils.PI2 + tentaclePhase;
                    commands.add(new BossSection.BossFireCommand(x, y, angle, 1f));
                }
                for (BossSection tentacle : tentacles) {
                    if (tentacle.isAlive()) {
                        commands.add(new BossSection.BossFireCommand(
                            tentacle.getWorldX(), tentacle.getWorldY(),
                            playerX, playerY, 0f, 1f));
                    }
                }
                break;
        }
    }

    @Override
    protected void renderPhaseEffects(SpriteBatch batch) {
        // Beam charge indicator
        if (beamEye.isAlive() && beamCharging) {
            float chargeRatio = beamChargeTimer / 1.5f;
            float pulse = 0.5f + 0.5f * (float) Math.sin(beamChargeTimer * 10f);
            batch.setColor(1f, 0f, 0.8f, chargeRatio * pulse * 0.6f);
            float size = 14f + chargeRatio * 20f;
            batch.draw((Texture) null, beamEye.getWorldX() - size * 0.5f,
                beamEye.getWorldY() - size * 0.5f, size, size);
            batch.setColor(1f, 1f, 1f, 1f);
        }

        // Beam firing visual
        if (beamEye.isAlive() && beamFiring) {
            float fireRatio = beamFireTimer / BEAM_FIRE_DURATION;
            float width = 4f + fireRatio * 8f;
            batch.setColor(1f, 0.2f, 0.8f, 0.7f);
            batch.draw((Texture) null, beamEye.getWorldX() - width * 0.5f,
                beamEye.getWorldY(), width, 80f);
            batch.setColor(1f, 1f, 1f, 1f);
        }

        // Phase aura
        float r, g, b;
        switch (phase) {
            case 0: r = 0.2f; g = 0.8f; b = 0.3f; break;
            case 1: r = 0.6f; g = 0.2f; b = 0.8f; break;
            case 2: r = 1f; g = 0.1f; b = 0.5f; break;
            default: r = 0.4f; g = 0.6f; b = 0.4f; break;
        }
        batch.setColor(r, g, b, 0.1f);
        batch.draw((Texture) null, x - 48f, y - 40f, 96f, 80f);
        batch.setColor(1f, 1f, 1f, 1f);
    }

    @Override
    protected void renderDeathSequence(SpriteBatch batch) {
        float stageDuration = DEATH_DURATION / getDeathStageCount();
        float stageProgress = deathStageTimer / stageDuration;

        switch (deathStage) {
            case 0:
                // Tentacles wither — shrink and turn dark
                float witherScale = 1f - stageProgress;
                batch.setColor(0.2f, 0.4f, 0.1f, witherScale);
                for (BossSection tentacle : tentacles) {
                    if (tentacle.isAlive()) {
                        float s = 16f * witherScale;
                        batch.draw((Texture) null, tentacle.getWorldX() - s * 0.5f,
                            tentacle.getWorldY() - s * 0.5f, s, s * 1.5f);
                    }
                }
                batch.setColor(1f, 1f, 1f, 1f);
                break;

            case 1:
                // Eye explodes — bright flash then fade
                float explodeScale = 1f + stageProgress * 2.5f;
                float alpha = 1f - stageProgress * 0.5f;
                batch.setColor(1f, 0f, 0.8f, alpha);
                float es = 14f * explodeScale;
                batch.draw((Texture) null, beamEye.getWorldX() - es * 0.5f,
                    beamEye.getWorldY() - es * 0.5f, es, es);
                batch.setColor(1f, 1f, 1f, 1f);
                break;

            case 2:
                // Core dissolves — pixel scatter effect (simplified as shrinking with flicker)
                float dissolve = 1f - stageProgress;
                float flicker = (float) Math.sin(stageProgress * 30f) * 0.5f + 0.5f;
                batch.setColor(0.3f, 0.9f, 0.4f, dissolve * flicker);
                float cs = 44f * dissolve;
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
        return "Xeno Guardian";
    }
}
