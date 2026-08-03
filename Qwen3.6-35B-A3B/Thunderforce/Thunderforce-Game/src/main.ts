/**
 * Thunder Force — Main entry point.
 * Initializes the game engine, stages, UI, and game loop.
 */
import './styles.css';
import * as THREE from 'three';
import {
  Renderer, Loop, InputController,
} from '@engine';
import {
  Stage, TitleStage, GameOverStage,
  BiomeId,
  WeaponState,
} from '@game';
import { HUD, TitleScreen, GameOverScreen, Transition } from '@ui';

/** Game states. */
enum GameState {
  Title = 'title',
  Playing = 'playing',
  Transitioning = 'transitioning',
  GameOver = 'gameover',
}

class ThunderForceGame {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private loop: Loop;
  private input: InputController;

  // Game objects
  private stage: Stage | null = null;
  private titleStage: TitleStage | null = null;
  private gameOverStage: GameOverStage | null = null;

  // UI
  private hud: HUD | null = null;
  private titleScreen: TitleScreen | null = null;
  private gameOverScreen: GameOverScreen | null = null;
  private transition: Transition | null = null;

  // State
  private gameState: GameState = GameState.Title;
  private transitionTimer: number = 0;
  private transitionTarget: GameState = GameState.Title;
  private frameCount: number = 0;

  // Canvas and UI container
  private canvas: HTMLCanvasElement;
  private uiContainer: HTMLElement;

  constructor() {
    // Setup canvas
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.uiContainer = document.getElementById('ui-overlay') as HTMLElement;

    // Initialize Three.js
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 320 / 224, 0.1, 100);
    this.camera.position.set(0, 0, 10);

    this.renderer = Renderer.create(this.canvas, 320, 224);
    this.renderer.setClearColor(0x000000, 1);

    // Game loop
    this.loop = new Loop(
      (delta: number) => this.update(delta),
      () => this.renderer.render(this.scene, this.camera),
    );

    // Input
    const stick = document.getElementById('joystick-stick') as HTMLElement;
    const knob = document.getElementById('joystick-knob') as HTMLElement;
    const dashBtn = document.getElementById('dash-button') as HTMLElement;
    this.input = new InputController(stick, knob, dashBtn);

    // UI
    this.hud = new HUD(this.uiContainer);
    this.titleScreen = new TitleScreen(this.uiContainer);
    this.gameOverScreen = new GameOverScreen(this.uiContainer);
    this.transition = new Transition(this.uiContainer);

    // Show title screen
    this.titleScreen.show();

    // Start loop
    this.loop.start();
  }

  private update(delta: number): void {
    this.frameCount++;

    // Publish diagnostics for QA/testing
    const diag: Record<string, unknown> = { frame: this.frameCount, state: this.gameState };
    if (this.stage) {
      diag.stageExists = true;
      if (this.stage.player) {
        const p = this.stage.player.data.position;
        diag.player = { position: { x: p.x, y: p.y, z: p.z } };
      } else {
        diag.stageHasNoPlayer = true;
      }
    }
    (window as any).__THREE_GAME_DIAGNOSTICS__ = diag;

    switch (this.gameState) {
      case GameState.Title:
        this._updateTitle(delta);
        break;
      case GameState.Playing:
        this._updatePlaying(delta);
        break;
      case GameState.Transitioning:
        this._updateTransitioning(delta);
        break;
      case GameState.GameOver:
        this._updateGameOver(delta);
        break;
    }
  }

  private _updateTitle(delta: number): void {
    if (!this.titleStage) {
      this.titleStage = new TitleStage(this.scene, this.camera);
    }
    this.titleStage.update(delta);

    // Check for start input
    if (this.input.hasKey('Space')) {
      this._startGame();
    }
  }

  private _updatePlaying(delta: number): void {
    if (!this.stage) return;

    // Get input
    const movement = this.input.readMovement(new THREE.Vector2());
    const inputX = movement.x;
    const inputY = movement.y;

    // Update stage
    this.stage.update(delta, inputX, inputY);

    // Update HUD
    if (this.hud && this.stage.player) {
      const player = this.stage.player;
      const weaponDef = player.data.weaponStates.find((w: WeaponState) => w.active);
      this.hud.update(
        player.data.score,
        player.data.health,
        player.data.maxHealth,
        player.data.lives,
        weaponDef ? weaponDef.id.toString() : 'NONE',
      );
    }

    // Check for game over
    if (!this.stage.player.data.alive) {
      this._goToGameOver();
    }
  }

  private _updateTransitioning(delta: number): void {
    this.transitionTimer -= delta;

    if (this.transition) {
      this.transition.update(delta);
    }

    if (this.transitionTimer <= 0) {
      this.gameState = this.transitionTarget;
      if (this.transitionTarget === GameState.Playing) {
        this.hud?.update(0, 5, 5, 3, 'PLASMA STREAM');
      }
    }
  }

  private _updateGameOver(delta: number): void {
    if (!this.stage) return;

    // Keep rendering the stage in background
    this.stage.update(delta, 0, 0);

    // Check for retry
    if (this.input.hasKey('Space')) {
      this._restartGame();
    }
  }

  private _startGame(): void {
    this.titleScreen?.hide();
    this.gameState = GameState.Transitioning;
    this.transitionTarget = GameState.Playing;
    this.transitionTimer = 1.5;

    this.transition?.startIn(() => {
      // Create game stage after fade in
      this.stage = new Stage(BiomeId.VolcanicCanyon, this.scene, this.camera, this.renderer);
      this.stage.audioSystem.init();
      this.stage.audioSystem.startMusic();
    });
  }

  private _goToGameOver(): void {
    this.gameState = GameState.Transitioning;
    this.transitionTarget = GameState.GameOver;
    this.transitionTimer = 2;

    this.transition?.startIn(() => {
      this.gameOverScreen?.show(this.stage?.player.data.score ?? 0);
    });
  }

  private _restartGame(): void {
    this.gameOverScreen?.hide();
    this.gameState = GameState.Transitioning;
    this.transitionTarget = GameState.Title;
    this.transitionTimer = 1.5;

    // Clean up current stage
    this.stage?.dispose();
    this.stage = null;

    this.transition?.startIn(() => {
      this.gameState = GameState.Title;
      this.titleScreen?.show();
    });
  }

  /** Dispose all resources. */
  dispose(): void {
    this.loop.stop();
    this.stage?.dispose();
    this.titleStage?.dispose();
    this.gameOverStage?.dispose();
    this.hud?.dispose();
    this.titleScreen?.dispose();
    this.gameOverScreen?.dispose();
    this.transition?.dispose();
    this.renderer.dispose();
  }
}

// Start the game when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ThunderForceGame();
  });
} else {
  new ThunderForceGame();
}
