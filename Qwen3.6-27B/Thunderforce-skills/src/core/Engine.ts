/**
 * Core game engine: game loop, timing, state management, and system orchestration
 */
import { CONFIG, GameState } from './Config';
import { Renderer } from './Renderer';

export class Engine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private renderer: Renderer;
  private running: boolean = false;
  private state: GameState = GameState.TITLE;
  private frameCount: number = 0;
  private lastTime: number = 0;
  private accumulator: number = 0;
  private fixedDt: number = CONFIG.FRAME_TIME;

  /** Score tracking */
  public score: number = 0;
  public highScores: number[] = [999999, 750000, 500000, 300000, 100000];

  /** Frame-accurate timing for deterministic updates */
  public get frame(): number { return this.frameCount; }
  public get time(): number { return this.frameCount / CONFIG.FPS; }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.ctx.imageSmoothingEnabled = false;
    this.renderer = new Renderer(this.ctx);
  }

  /**
   * Get the renderer for system access
   */
  get render(): Renderer {
    return this.renderer;
  }

  /**
   * Set the current game state
   */
  setState(state: GameState): void {
    this.state = state;
  }

  /**
   * Get the current game state
   */
  getState(): GameState {
    return this.state;
  }

  /**
   * Start the game loop
   */
  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    requestAnimationFrame((t) => this.loop(t));
  }

  /**
   * Stop the game loop
   */
  stop(): void {
    this.running = false;
  }

  /**
   * Main game loop using fixed timestep
   */
  private loop(timestamp: number): void {
    if (!this.running) return;

    const deltaTime = timestamp - this.lastTime;
    this.lastTime = timestamp;

    // Cap delta to avoid spiral of death
    const cappedDelta = Math.min(deltaTime, 200);
    this.accumulator += cappedDelta;

    // Fixed timestep updates
    while (this.accumulator >= this.fixedDt) {
      this.update(this.fixedDt);
      this.accumulator -= this.fixedDt;
      this.frameCount++;
    }

    // Render with interpolation
    this.renderFrame();

    requestAnimationFrame((t) => this.loop(t));
  }

  /**
   * Update all game systems
   */
  protected update(_dt: number): void {
    // Override in Game class
  }

  /**
   * Render a single frame
   */
  protected renderFrame(): void {
    // Override in Game class
  }

  /**
   * Clear the screen to a solid color
   */
  clear(color: string = '#000000'): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
  }
}
