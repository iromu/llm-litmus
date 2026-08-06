package com.thunderforce.presentation.hud;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.g2d.BitmapFont;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.math.Rectangle;
import com.badlogic.gdx.utils.Array;
import com.thunderforce.engine.ThunderforceGame;
import com.thunderforce.gameplay.player.PlayerShip;
import com.thunderforce.gameplay.weapon.Weapon;

/**
 * HUD rendering: score display, weapon icon + power level, shield meter, speed indicator.
 */
public class HUD {

    private final BitmapFont font;
    private final OrthographicCamera camera;

    public HUD() {
        this.font = new BitmapFont();
        this.camera = new OrthographicCamera(ThunderforceGame.INTERNAL_WIDTH, ThunderforceGame.INTERNAL_HEIGHT);
        this.camera.position.set(ThunderforceGame.INTERNAL_WIDTH / 2f, ThunderforceGame.INTERNAL_HEIGHT / 2f, 0);
        this.camera.update();
    }

    /**
     * Render the HUD overlay.
     */
    public void render(SpriteBatch batch, int score, int lives, PlayerShip player, Array<Weapon> weapons) {
        batch.begin();
        batch.setProjectionMatrix(camera.combined);

        font.getData().setScale(0.6f);

        // Score (top-left)
        batch.setColor(Color.WHITE);
        font.draw(batch, "SCORE", 10f, ThunderforceGame.INTERNAL_HEIGHT - 10f);
        font.draw(batch, String.format("%06d", score), 10f, ThunderforceGame.INTERNAL_HEIGHT - 22f);

        // Lives (top-right)
        font.draw(batch, "LIVES", ThunderforceGame.INTERNAL_WIDTH - 50f, ThunderforceGame.INTERNAL_HEIGHT - 10f);
        font.draw(batch, String.valueOf(lives), ThunderforceGame.INTERNAL_WIDTH - 50f, ThunderforceGame.INTERNAL_HEIGHT - 22f);

        // Weapon info (bottom-left)
        if (weapons.size > 0) {
            Weapon active = weapons.get(0);
            batch.setColor(new Color(0.3f, 0.8f, 1f, 1f));
            font.draw(batch, "WPN:" + active.getType().name(), 10f, 20f);
            font.draw(batch, "PWR:" + active.getPowerLevel(), 10f, 10f);
        }

        // Shield meter (bottom-center)
        int shieldHP = player.getShieldHP();
        if (shieldHP > 0) {
            batch.setColor(new Color(0.2f, 1f, 0.5f, 1f));
            String shieldText = "SHIELD: " + "█".repeat(shieldHP) + "░".repeat(5 - shieldHP);
            font.draw(batch, shieldText, ThunderforceGame.INTERNAL_WIDTH / 2f - 40f, 10f);
        }

        // Speed boost indicator (bottom-right)
        if (player.isSpeedBoosted()) {
            batch.setColor(new Color(1f, 0.8f, 0.2f, 1f));
            font.draw(batch, "SPEED!", ThunderforceGame.INTERNAL_WIDTH - 60f, 20f);
            font.draw(batch, String.format("%.1fs", player.getSpeedBoostTimer()),
                ThunderforceGame.INTERNAL_WIDTH - 60f, 10f);
        }

        font.getData().setScale(1f);
        batch.setColor(Color.WHITE);

        batch.end();
    }

    public void dispose() {
        font.dispose();
    }
}
