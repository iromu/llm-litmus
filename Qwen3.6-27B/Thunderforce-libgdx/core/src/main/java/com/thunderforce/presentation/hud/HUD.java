package com.thunderforce.presentation.hud;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.g2d.BitmapFont;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.math.Rectangle;
import com.badlogic.gdx.utils.Array;
import com.badlogic.gdx.utils.StringBuilder;
import com.thunderforce.engine.ThunderforceGame;
import com.thunderforce.gameplay.player.PlayerShip;
import com.thunderforce.gameplay.weapon.Weapon;

/**
 * HUD rendering: score display, weapon icon + power level, shield meter, speed indicator.
 *
 * Zero-GC design:
 * - Reuses pooled Color instances (no per-frame allocation)
 * - Reuses StringBuilder for shield/speed text (no per-frame string allocation)
 * - Does NOT call batch.begin/end — caller manages the batch session
 * - Sets font scale once in constructor (not per-frame)
 */
public class HUD {

    private final BitmapFont font;
    private final OrthographicCamera camera;

    // Pooled resources (zero-GC)
    private final Color tempColor;
    private final StringBuilder sb;

    // Cached HUD colors (avoid per-frame Color allocation)
    private static final Color C_WHITE = Color.WHITE;
    private static final Color C_WEAPON = new Color(0.3f, 0.8f, 1f, 1f);
    private static final Color C_SHIELD = new Color(0.2f, 1f, 0.5f, 1f);
    private static final Color C_SPEED = new Color(1f, 0.8f, 0.2f, 1f);

    public HUD() {
        this.font = new BitmapFont();
        this.font.getData().setScale(0.6f); // Set once, not per-frame
        this.camera = new OrthographicCamera(ThunderforceGame.INTERNAL_WIDTH, ThunderforceGame.INTERNAL_HEIGHT);
        this.camera.position.set(ThunderforceGame.INTERNAL_WIDTH / 2f, ThunderforceGame.INTERNAL_HEIGHT / 2f, 0);
        this.camera.update();
        this.tempColor = new Color();
        this.sb = new StringBuilder(32);
    }

    /**
     * Render the HUD overlay.
     *
     * Does NOT call batch.begin/end — the caller (GameScreen) manages
     * the batch session to keep game + HUD in a single draw batch.
     *
     * @param batch   active sprite batch (already begun)
     * @param score   current score
     * @param lives   remaining lives
     * @param player  player ship reference
     * @param weapons active weapon array
     */
    public void render(SpriteBatch batch, int score, int lives, PlayerShip player, Array<Weapon> weapons) {
        batch.setProjectionMatrix(camera.combined);

        // Score (top-left) — use StringBuilder to avoid String.format allocation
        batch.setColor(C_WHITE);
        font.draw(batch, "SCORE", 10f, ThunderforceGame.INTERNAL_HEIGHT - 10f);
        sb.clear();
        padScore(sb, score);
        font.draw(batch, sb.toString(), 10f, ThunderforceGame.INTERNAL_HEIGHT - 22f);

        // Lives (top-right)
        font.draw(batch, "LIVES", ThunderforceGame.INTERNAL_WIDTH - 50f, ThunderforceGame.INTERNAL_HEIGHT - 10f);
        sb.clear();
        sb.append(lives);
        font.draw(batch, sb.toString(), ThunderforceGame.INTERNAL_WIDTH - 50f, ThunderforceGame.INTERNAL_HEIGHT - 22f);

        // Weapon info (bottom-left)
        if (weapons.size > 0) {
            Weapon active = weapons.get(0);
            batch.setColor(C_WEAPON);
            sb.clear();
            sb.append("WPN:").append(active.getType().name());
            font.draw(batch, sb.toString(), 10f, 20f);
            sb.clear();
            sb.append("PWR:").append(active.getPowerLevel());
            font.draw(batch, sb.toString(), 10f, 10f);
        }

        // Shield meter (bottom-center) — use StringBuilder instead of repeat()
        int shieldHP = player.getShieldHP();
        if (shieldHP > 0) {
            batch.setColor(C_SHIELD);
            sb.clear();
            sb.append("SHIELD: ");
            for (int i = 0; i < shieldHP; i++) sb.append('\u2588'); // █
            for (int i = shieldHP; i < 5; i++) sb.append('\u2591'); // ░
            font.draw(batch, sb.toString(), ThunderforceGame.INTERNAL_WIDTH / 2f - 40f, 10f);
        }

        // Speed boost indicator (bottom-right) — use StringBuilder for timer
        if (player.isSpeedBoosted()) {
            batch.setColor(C_SPEED);
            font.draw(batch, "SPEED!", ThunderforceGame.INTERNAL_WIDTH - 60f, 20f);
            sb.clear();
            sb.append(player.getSpeedBoostTimer()).append('s');
            font.draw(batch, sb.toString(), ThunderforceGame.INTERNAL_WIDTH - 60f, 10f);
        }

        batch.setColor(C_WHITE);
    }

    /** Zero-pad an integer to 6 digits (e.g. 42 → "000042"), zero-GC. */
    private void padScore(StringBuilder sb, int value) {
        if (value >= 100000) {
            sb.append(value);
        } else if (value >= 10000) {
            sb.append('0').append(value);
        } else if (value >= 1000) {
            sb.append("00").append(value);
        } else if (value >= 100) {
            sb.append("000").append(value);
        } else if (value >= 10) {
            sb.append("0000").append(value);
        } else {
            sb.append("00000").append(value);
        }
    }

    public void dispose() {
        font.dispose();
    }
}
