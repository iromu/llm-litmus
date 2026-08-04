/**
 * HUD system: score, lives, weapon display, health bar, and game text
 */
import { CONFIG, GameState } from '../core/Config';
import { Renderer, PALETTE } from '../core/Renderer';
import { Player, WeaponType } from './Player';

export class HUD {
  private score: number = 0;
  private displayScore: number = 0;
  private scoreAccumulator: number = 0;
  private gameTime: number = 0;
  private flashTimer: number = 0;
  private _flashText: string = '';
  private stageName: string = '';
  private stageTransition: number = 0;

  /**
   * Set current score
   */
  setScore(score: number): void {
    this.score = score;
  }

  /**
   * Add to score (with rolling counter effect)
   */
  addScore(amount: number): void {
    this.scoreAccumulator += amount;
  }

  /**
   * Set game time
   */
  setTime(time: number): void {
    this.gameTime = time;
  }

  /**
   * Show flash text
   */
  flashText(text: string, duration: number = 1.5): void {
    this._flashText = text;
    this.flashTimer = duration;
  }

  /**
   * Set stage name
   */
  setStage(name: string): void {
    this.stageName = name;
    this.stageTransition = 2;
  }

  /**
   * Update HUD state
   */
  update(dt: number): void {
    // Rolling score counter
    if (this.scoreAccumulator > 0) {
      const rollAmount = Math.min(this.scoreAccumulator, 50);
      this.scoreAccumulator -= rollAmount;
      this.displayScore += rollAmount;
    }

    // Flash timer
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
    }

    // Stage transition
    if (this.stageTransition > 0) {
      this.stageTransition -= dt;
    }
  }

  /**
   * Render HUD overlay
   */
  render(renderer: Renderer, state: GameState, player: Player): void {
    if (state === GameState.TITLE) {
      this.renderTitle(renderer);
      return;
    }

    if (state === GameState.GAME_OVER) {
      this.renderGameOver(renderer);
      return;
    }

    if (state === GameState.HIGH_SCORE) {
      this.renderHighScore(renderer);
      return;
    }

    // In-game HUD
    this.renderScore(renderer);
    this.renderWeapon(renderer, player);
    this.renderShield(renderer, player);
    this.renderStageTransition(renderer);
    this.renderFlashText(renderer);
  }

  /**
   * Render score display
   */
  private renderScore(r: Renderer): void {
    // Score background - solid dark bar for visibility
    r.rect(0, 0, CONFIG.WIDTH, 14, '#111122');
    r.rect(0, 13, CONFIG.WIDTH, 1, PALETTE.cyan);

    // Score text
    const scoreStr = String(this.displayScore).padStart(8, '0');
    r.text('SCORE', 4, 2, PALETTE.offWhite, 8);
    r.text(scoreStr, 4, 8, PALETTE.white, 8);

    // Time
    const minutes = Math.floor(this.gameTime / 60);
    const seconds = Math.floor(this.gameTime % 60);
    const timeStr = `${minutes}:${String(seconds).padStart(2, '0')}`;
    r.text(timeStr, CONFIG.WIDTH - 36, 2, PALETTE.offWhite, 8);
  }

  /**
   * Render weapon display
   */
  private renderWeapon(r: Renderer, player: Player): void {
    const x = CONFIG.WIDTH / 2 - 40;
    const y = 2;

    // Weapon name
    const names = ['PLASMA', 'HOMING', 'SPREAD', 'LIGHTNING'];
    const colors = [PALETTE.cyan, PALETTE.magenta, PALETTE.orange, PALETTE.yellow];
    const name = names[player.weapon];
    const color = colors[player.weapon];

    r.text(name, x, y, color, 8);

    // Weapon level pips
    for (let i = 0; i < player.maxWeaponLevel; i++) {
      const pipX = x + name.length * 4 + 4 + i * 5;
      if (i < player.weaponLevel) {
        r.rect(pipX, y + 2, 3, 4, color);
      } else {
        r.rect(pipX, y + 2, 3, 4, PALETTE.darkGray);
      }
    }
  }

  /**
   * Render shield bar
   */
  private renderShield(r: Renderer, player: Player): void {
    if (player.shield <= 0) return;

    const x = 4;
    const y = CONFIG.HEIGHT - 8;
    const w = 60;
    const h = 4;

    // Background
    r.rect(x, y, w, h, PALETTE.darkGray);

    // Shield fill
    const fillW = Math.floor((player.shield / player.maxShield) * w);
    r.rect(x, y, fillW, h, PALETTE.cyan);

    // Label
    r.text('SH', x, y - 6, PALETTE.cyan, 6);
  }

  /**
   * Render stage transition text
   */
  private renderStageTransition(r: Renderer): void {
    if (this.stageTransition <= 0) return;

    const alpha = Math.min(1, this.stageTransition);
    r.ctx.globalAlpha = alpha;

    // Background
    r.rect(CONFIG.WIDTH / 2 - 80, CONFIG.HEIGHT / 2 - 15, 160, 30, 'rgba(0, 0, 0, 0.8)');

    // Stage name
    r.text(this.stageName, CONFIG.WIDTH / 2 - 50, CONFIG.HEIGHT / 2 - 8, PALETTE.white, 10);

    r.ctx.globalAlpha = 1;
  }

  /**
   * Render flash text (power-ups, etc.)
   */
  private renderFlashText(r: Renderer): void {
    if (this.flashTimer <= 0) return;

    const alpha = Math.min(1, this.flashTimer);
    const y = CONFIG.HEIGHT / 2 + 20 + (1 - this.flashTimer) * 20;

    r.ctx.globalAlpha = alpha;
    r.text(this._flashText, CONFIG.WIDTH / 2 - 30, y, PALETTE.yellow, 10);
    r.ctx.globalAlpha = 1;
  }

  /**
   * Render title screen
   */
  private renderTitle(r: Renderer): void {
    // Background
    r.rect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT, '#000011');

    // Star field
    for (let i = 0; i < 50; i++) {
      const x = (i * 37) % CONFIG.WIDTH;
      const y = (i * 53) % CONFIG.HEIGHT;
      const twinkle = Math.sin(Date.now() * 0.003 + i) > 0;
      if (twinkle) {
        r.rect(x, y, 1, 1, PALETTE.white);
      }
    }

    // Title
    const titleY = 60;

    // Title glow
    r.ctx.globalAlpha = 0.3 + Math.sin(Date.now() * 0.005) * 0.2;
    r.text('VOLT STORM', CONFIG.WIDTH / 2 - 44, titleY - 2, PALETTE.cyan, 16);
    r.ctx.globalAlpha = 1;

    // Title text
    r.text('VOLT STORM', CONFIG.WIDTH / 2 - 44, titleY, PALETTE.white, 16);

    // Subtitle
    r.text('ELECTRONIC FURY', CONFIG.WIDTH / 2 - 48, titleY + 20, PALETTE.lightBlue, 8);

    // Decorative line
    r.rect(CONFIG.WIDTH / 2 - 60, titleY + 32, 120, 2, PALETTE.cyan);

    // Press start
    const blink = Math.sin(Date.now() * 0.005) > 0;
    if (blink) {
      r.text('PRESS START', CONFIG.WIDTH / 2 - 40, 140, PALETTE.yellow, 10);
    }

    // Copyright
    r.text('© 2026 VOLT WORKS', CONFIG.WIDTH / 2 - 44, 180, PALETTE.gray, 8);

    // Version
    r.text('VER 1.00', CONFIG.WIDTH / 2 - 24, 192, PALETTE.darkGray, 8);
  }

  /**
   * Render game over screen
   */
  private renderGameOver(r: Renderer): void {
    // Darken background
    r.rect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT, 'rgba(0, 0, 0, 0.8)');

    // Game over text
    r.text('GAME OVER', CONFIG.WIDTH / 2 - 48, 70, PALETTE.red, 14);

    // Score
    const scoreStr = String(this.displayScore).padStart(8, '0');
    r.text('FINAL SCORE', CONFIG.WIDTH / 2 - 44, 100, PALETTE.offWhite, 8);
    r.text(scoreStr, CONFIG.WIDTH / 2 - 36, 112, PALETTE.white, 10);

    // Continue prompt
    const blink = Math.sin(Date.now() * 0.005) > 0;
    if (blink) {
      r.text('INSERT COIN', CONFIG.WIDTH / 2 - 44, 150, PALETTE.yellow, 8);
    }
  }

  /**
   * Render high score table
   */
  private renderHighScore(r: Renderer): void {
    // Background
    r.rect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT, '#000011');

    // Title
    r.text('HIGH SCORES', CONFIG.WIDTH / 2 - 44, 30, PALETTE.yellow, 12);

    // Decorative line
    r.rect(CONFIG.WIDTH / 2 - 60, 44, 120, 2, PALETTE.yellow);

    // Scores
    const scores = [999999, 750000, 500000, 300000, 100000];
    const names = ['VLT', 'ARC', 'DRN', 'SKY', 'BOB'];

    for (let i = 0; i < 5; i++) {
      const y = 60 + i * 20;
      const rank = String(i + 1).padStart(2, ' ');
      const score = String(scores[i]).padStart(8, '0');

      r.text(rank, 40, y, PALETTE.offWhite, 8);
      r.text(names[i], 60, y, PALETTE.white, 8);
      r.text(score, 120, y, PALETTE.cyan, 8);
    }

    // Return prompt
    const blink = Math.sin(Date.now() * 0.005) > 0;
    if (blink) {
      r.text('PRESS START', CONFIG.WIDTH / 2 - 40, 190, PALETTE.yellow, 8);
    }
  }

  /**
   * Reset HUD state
   */
  reset(): void {
    this.score = 0;
    this.displayScore = 0;
    this.scoreAccumulator = 0;
    this.gameTime = 0;
    this.flashTimer = 0;
    this._flashText = '';
    this.stageTransition = 0;
  }
}
