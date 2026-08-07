package com.thunderforce.presentation.screen;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.Input;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.g2d.BitmapFont;
import com.badlogic.gdx.utils.Array;
import com.thunderforce.engine.FixedPool;
import com.thunderforce.engine.ThunderforceGame;
import com.thunderforce.gameplay.bullet.Bullet;
import com.thunderforce.gameplay.bullet.CollisionDetector;
import com.thunderforce.gameplay.bullet.SpatialEntity;
import com.thunderforce.gameplay.enemy.Enemy;
import com.thunderforce.gameplay.player.AIPilot;
import com.thunderforce.gameplay.player.InputDirection;
import com.thunderforce.gameplay.player.PlayerShip;
import com.thunderforce.gameplay.weapon.*;
import com.thunderforce.parallax.ParallaxManager;
import com.thunderforce.particle.ParticleSystem;
import com.thunderforce.particle.ScreenShake;
import com.thunderforce.particle.ExplosionEffect;
import com.thunderforce.presentation.hud.HUD;
import com.thunderforce.replay.InputFrame;
import com.thunderforce.replay.InputReplay;
import com.thunderforce.replay.SeededRng;

/**
 * Main gameplay screen. Handles the game loop, entity management,
 * and rendering of all gameplay elements.
 */
public class GameScreen implements com.thunderforce.engine.ThunderforceGame.GameScreen {

    private final ThunderforceGame game;

    private final com.badlogic.gdx.graphics.OrthographicCamera camera;
    private final BitmapFont font;

    // Gameplay systems
    private final PlayerShip player;
    private final AIPilot aiPilot;
    private final Array<Weapon> weapons;
    private final Array<Enemy> enemies;
    private final Array<Bullet> enemyBullets;
    private final Array<Projectile> playerProjectiles;
    private final Array<PowerUp> powerUps;
    private final CollisionDetector collisionDetector;
    private final ParticleSystem particleSystem;
    private final ScreenShake screenShake;
    private final ParallaxManager parallax;

    // Replay system
    private final InputReplay inputReplay;

    // Game state
    private float gameTime;
    private int score;
    private int lives;
    private boolean gameOver;
    private float gameSpeed;

    // HUD
    private final HUD hud;

    // Biome/encounter state
    private int currentBiome;
    private float biomeTimer;
    private static final float BIOME_DURATION = 30f; // seconds per biome

    public GameScreen(ThunderforceGame game) {
        this.game = game;
        this.camera = new com.badlogic.gdx.graphics.OrthographicCamera(ThunderforceGame.INTERNAL_WIDTH, ThunderforceGame.INTERNAL_HEIGHT);
        this.camera.position.set(ThunderforceGame.INTERNAL_WIDTH / 2f, ThunderforceGame.INTERNAL_HEIGHT / 2f, 0);
        this.camera.update();
        this.font = new BitmapFont();

        // Initialize gameplay systems
        this.player = new PlayerShip(0f, ThunderforceGame.INTERNAL_WIDTH, ThunderforceGame.INTERNAL_HEIGHT, 0f);
        this.aiPilot = new AIPilot(player, new SeededRng(game.config.demoSeed));

        this.weapons = new Array<>();
        weapons.add(new PlasmaStream());
        this.enemies = new Array<>();
        this.enemyBullets = new Array<>();
        this.playerProjectiles = new Array<>();
        this.powerUps = new Array<>();

        this.collisionDetector = new CollisionDetector();
        this.particleSystem = new ParticleSystem(game.config.qualityTier.getMaxParticles());
        this.screenShake = new ScreenShake();
        this.parallax = new ParallaxManager(game.config.qualityTier.getMaxParallaxLayers());

        // Replay system
        this.inputReplay = new InputReplay(game.config.demoSeed);
        this.inputReplay.startReplay();

        // Game state
        this.gameTime = 0;
        this.score = 0;
        this.lives = 3;
        this.gameOver = false;
        this.gameSpeed = 60f;
        this.currentBiome = 0;
        this.biomeTimer = 0;

        // HUD
        this.hud = new HUD();
    }

    @Override
    public void show() {
        // Start attract mode
    }

    public void update(float delta) {
        if (gameOver) {
            // Transition to game over screen
            gameTime += delta;
            if (gameTime > 2f) {
                game.setScreen(new GameOverScreen(game, score));
            }
            return;
        }

        gameTime += delta;
        biomeTimer += delta;

        // Check biome transition
        if (biomeTimer >= BIOME_DURATION) {
            biomeTimer = 0;
            currentBiome = (currentBiome + 1) % 4;
        }

        // Get input (from replay or AI)
        InputFrame input = getInputFrame();

        // Update AI pilot
        aiPilot.update(delta,
            (Array<SpatialEntity>) (Array<?>) enemyBullets,
            (Array<SpatialEntity>) (Array<?>) powerUps,
            (Array<SpatialEntity>) (Array<?>) enemies);

        // Update player
        InputDirection dir = InputDirection.fromCode(input.direction);
        player.update(delta, dir);

        // Update weapons (indexed loop avoids Iterator allocation)
        for (int i = 0; i < weapons.size; i++) {
            weapons.get(i).update(delta, player.x, player.y, playerProjectiles, enemies);
        }

        // Update enemies
        for (int i = enemies.size - 1; i >= 0; i--) {
            Enemy enemy = enemies.get(i);
            enemy.update(delta, player.x, player.y, (Array<Object>) (Object) enemyBullets);
            if (!enemy.alive) {
                onEnemyDeath(enemy);
                enemies.removeIndex(i);
            }
        }

        // Update enemy bullets
        for (int i = enemyBullets.size - 1; i >= 0; i--) {
            Bullet bullet = enemyBullets.get(i);
            bullet.update(delta);
            if (!bullet.isAlive()) {
                enemyBullets.removeIndex(i);
            }
        }

        // Update player projectiles
        for (int i = playerProjectiles.size - 1; i >= 0; i--) {
            Projectile proj = playerProjectiles.get(i);
            proj.update(delta);
            if (!proj.isAlive()) {
                playerProjectiles.removeIndex(i);
            }
        }

        // Update power-ups
        for (int i = powerUps.size - 1; i >= 0; i--) {
            PowerUp pu = powerUps.get(i);
            pu.update(delta);
            if (pu.checkCollision(player.getBounds())) {
                applyPowerUp(pu);
                powerUps.removeIndex(i);
            }
        }

        // Collision detection
        Array<CollisionDetector.Collision> collisions = collisionDetector.update(
            enemyBullets,
            (Array<SpatialEntity>) (Array<?>) enemies,
            (Array<SpatialEntity>) (Array<?>) playerProjectiles,
            player);

        // Handle collisions (indexed loop avoids Iterator allocation)
        boolean playerHit = false;
        for (int i = 0; i < collisions.size; i++) {
            CollisionDetector.Collision collision = collisions.get(i);
            if (collision.a == player || collision.b == player) {
                if (player.takeDamage()) {
                    lives--;
                    if (lives <= 0) {
                        gameOver = true;
                        gameTime = 0;
                    }
                }
                playerHit = true;
                break;
            }
        }

        // Return pooled Collision objects to the detector
        collisionDetector.returnCollisions();

        // Update systems
        particleSystem.update(delta);
        screenShake.update(delta);
        parallax.update(delta);

        // Spawn enemies (simple timer-based for now)
        spawnEnemies(delta);
    }

    private InputFrame getInputFrame() {
        if (game.config.attractMode) {
            // Use AI-generated input for attract mode
            InputDirection aiDir = aiPilot.update(0f,
                (Array<SpatialEntity>) (Array<?>) enemyBullets,
                (Array<SpatialEntity>) (Array<?>) powerUps,
                (Array<SpatialEntity>) (Array<?>) enemies);
            int dir = aiDir.getCode();
            boolean fire = aiPilot.shouldFire();
            boolean switchWeapon = aiPilot.shouldSwitchWeapon();
            return new InputFrame(dir, fire, switchWeapon);
        } else {
            // Player input
            InputDirection dir = InputDirection.fromInput(
                Gdx.input.isKeyPressed(Input.Keys.UP) || Gdx.input.isKeyPressed(Input.Keys.W),
                Gdx.input.isKeyPressed(Input.Keys.DOWN) || Gdx.input.isKeyPressed(Input.Keys.S),
                Gdx.input.isKeyPressed(Input.Keys.LEFT) || Gdx.input.isKeyPressed(Input.Keys.A),
                Gdx.input.isKeyPressed(Input.Keys.RIGHT) || Gdx.input.isKeyPressed(Input.Keys.D)
            );
            boolean fire = Gdx.input.isKeyPressed(Input.Keys.SPACE);
            boolean switchWeapon = Gdx.input.isKeyJustPressed(Input.Keys.SHIFT_LEFT);
            return new InputFrame(dir.ordinal(), fire, switchWeapon);
        }
    }

    private void spawnEnemies(float delta) {
        // Simple spawn logic - spawn enemies based on game time
        SeededRng rng = inputReplay.getRng();
        if (rng.nextFloat() < 0.02f && enemies.size < 15) {
            Enemy enemy = new Enemy(
                ThunderforceGame.INTERNAL_WIDTH + 20,
                rng.nextInt(20, ThunderforceGame.INTERNAL_HEIGHT - 20),
                1,                          // hp
                60f,                        // speed
                Enemy.BehaviorType.ZIGZAG,  // behavior
                "basic",                    // attackPattern
                100,                        // scoreValue
                false,                      // dropsPowerUp
                "grunt"                     // sprite
            );
            enemies.add(enemy);
        }
    }

    private void onEnemyDeath(Enemy enemy) {
        score += enemy.scoreValue;
        ExplosionEffect.create(ExplosionEffect.ExplosionSize.MEDIUM, enemy.x, enemy.y, particleSystem);

        // Chance to drop power-up
        if (enemy.dropsPowerUp && inputReplay.getRng().nextFloat() < 0.15f) {
            PowerUp.PowerUpType type = PowerUp.PowerUpType.values()[inputReplay.getRng().nextInt(3)];
            powerUps.add(new PowerUp(enemy.x, enemy.y, type));
        }
    }

    private void applyPowerUp(PowerUp powerUp) {
        switch (powerUp.getType()) {
            case WEAPON_CYCLE:
                // Cycle to next weapon
                break;
            case SHIELD:
                player.addShield(2);
                break;
            case SPEED_BOOST:
                player.activateSpeedBoost();
                break;
        }
        score += 50;
    }

    @Override
    public void render(float delta) {
        update(delta);
        render(game.batch);
    }

    @Override
    public void render(SpriteBatch gameBatch) {
        // Single batch session: game + HUD rendered in one begin/end pair
        // to maximize vertex batching and minimize GPU state transitions
        game.batch.begin();
        game.batch.setProjectionMatrix(camera.combined);

        // Apply screen shake
        float shakeX = screenShake.getOffsetX();
        float shakeY = screenShake.getOffsetY();

        // Render parallax background
        parallax.render(game.batch, camera, camera.viewportWidth);

        // Render entities (indexed loops avoid Iterator allocation)
        for (int i = 0; i < enemies.size; i++) {
            enemies.get(i).render(game.batch);
        }

        for (int i = 0; i < enemyBullets.size; i++) {
            enemyBullets.get(i).render(game.batch);
        }

        for (int i = 0; i < playerProjectiles.size; i++) {
            playerProjectiles.get(i).render(game.batch);
        }

        for (int i = 0; i < powerUps.size; i++) {
            powerUps.get(i).render(game.batch);
        }

        // Render player
        player.render(game.batch, camera);

        // Render particles
        particleSystem.render(game.batch);

        // Render HUD within the same batch session (no extra begin/end)
        hud.render(game.batch, score, lives, player, weapons);

        game.batch.end();
    }

    @Override
    public void resize(int width, int height) {
    }

    @Override
    public void pause() {
    }

    @Override
    public void resume() {
    }

    @Override
    public void hide() {
    }

    @Override
    public void dispose() {
        font.dispose();
        hud.dispose();
        // Return pooled objects and clear entity arrays to prevent memory leaks
        particleSystem.clear();
        collisionDetector.returnCollisions();
        enemies.clear();
        enemyBullets.clear();
        playerProjectiles.clear();
        powerUps.clear();
        weapons.clear();
    }
}
