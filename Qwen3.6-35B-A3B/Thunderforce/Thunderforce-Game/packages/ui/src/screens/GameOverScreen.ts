/** Game over screen UI overlay. */
export class GameOverScreen {
  private container: HTMLElement;
  private titleEl: HTMLElement;
  private scoreEl: HTMLElement;
  private promptEl: HTMLElement;

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.8);
      z-index: 20;
      pointer-events: none;
    `;

    this.titleEl = document.createElement('div');
    this.titleEl.textContent = 'GAME OVER';
    this.titleEl.style.cssText = `
      font-family: monospace;
      font-size: 48px;
      font-weight: bold;
      color: #ff4444;
      text-shadow: 4px 4px 0 #000000, 0 0 20px #ff4444;
      margin-bottom: 20px;
    `;

    this.scoreEl = document.createElement('div');
    this.scoreEl.style.cssText = `
      font-family: monospace;
      font-size: 24px;
      color: #ffffff;
      text-shadow: 2px 2px 0 #000000;
      margin-bottom: 40px;
    `;

    this.promptEl = document.createElement('div');
    this.promptEl.textContent = 'PRESS SPACE TO RETRY';
    this.promptEl.style.cssText = `
      font-family: monospace;
      font-size: 20px;
      color: #ffffff;
      text-shadow: 2px 2px 0 #000000;
      animation: pulse 1s ease-in-out infinite;
    `;

    this.container.append(this.titleEl, this.scoreEl, this.promptEl);
    parent.appendChild(this.container);
  }

  show(score: number): void {
    this.scoreEl.textContent = `FINAL SCORE: ${score.toString().padStart(8, '0')}`;
    this.container.style.display = 'flex';
  }

  hide(): void {
    this.container.style.display = 'none';
  }

  dispose(): void {
    this.container.remove();
  }
}
