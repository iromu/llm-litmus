/** Transition screen — fade in/out between stages. */
export class Transition {
  private container: HTMLElement;
  private overlay: HTMLElement;
  private onComplete: (() => void) | null = null;
  private transitionTime: number = 0;
  private duration: number = 1.5;
  private phase: 'in' | 'hold' | 'out' = 'in';

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 30;
      pointer-events: none;
      display: none;
    `;

    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      width: 100%;
      height: 100%;
      background: #000000;
      opacity: 0;
      transition: none;
    `;

    this.container.appendChild(this.overlay);
    parent.appendChild(this.container);
  }

  /** Start a fade-in transition. */
  startIn(onComplete?: () => void): void {
    this.container.style.display = 'block';
    this.phase = 'in';
    this.transitionTime = 0;
    this.onComplete = onComplete ?? null;
    this.overlay.style.opacity = '0';
  }

  /** Start a fade-out transition. */
  startOut(): void {
    this.phase = 'out';
    this.transitionTime = 0;
    this.overlay.style.opacity = '1';
  }

  /** Update transition state. */
  update(delta: number): boolean {
    if (this.phase === 'in') {
      this.transitionTime += delta;
      const t = Math.min(this.transitionTime / this.duration, 1);
      this.overlay.style.opacity = t.toString();
      if (t >= 1) {
        this.phase = 'hold';
        this.onComplete?.();
        return true;
      }
    } else if (this.phase === 'out') {
      this.transitionTime += delta;
      const t = Math.min(this.transitionTime / this.duration, 1);
      this.overlay.style.opacity = (1 - t).toString();
      if (t >= 1) {
        this.container.style.display = 'none';
        this.phase = 'in';
        return true;
      }
    }
    return false;
  }

  /** Cancel current transition. */
  cancel(): void {
    this.container.style.display = 'none';
    this.phase = 'in';
    this.overlay.style.opacity = '0';
  }

  dispose(): void {
    this.container.remove();
  }
}
