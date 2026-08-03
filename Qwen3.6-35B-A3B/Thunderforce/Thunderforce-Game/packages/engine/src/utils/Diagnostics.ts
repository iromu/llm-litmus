/** Debug diagnostics exposed to window for QA/inspection. */
export class Diagnostics {
  private frame = 0;
  private fps = 0;
  private frameTime = 0;
  private lastFpsTime = 0;
  private frameCount = 0;

  constructor(
    private readonly onDiagnostics: (d: Record<string, unknown>) => void,
  ) {}

  tick(frameTimeMs: number): void {
    this.frame++;
    this.frameTime = frameTimeMs;
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsTime = now;
    }
  }

  publish(extra: Record<string, unknown> = {}): void {
    const d = {
      frame: this.frame,
      fps: this.fps,
      frameTimeMs: this.frameTime,
      ...extra,
    };
    this.onDiagnostics(d);
    (window as any).__THREE_GAME_DIAGNOSTICS__ = d as any;
  }

  reset(): void {
    this.frame = 0;
    this.fps = 0;
    this.frameTime = 0;
    this.frameCount = 0;
    this.lastFpsTime = 0;
  }
}
