/** Title screen UI overlay. */
export class TitleScreen {
  private container: HTMLElement;
  private titleEl: HTMLElement;
  private promptEl: HTMLElement;

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 20;
      pointer-events: none;
    `;

    this.titleEl = document.createElement('div');
    this.titleEl.textContent = 'THUNDER FORCE';
    this.titleEl.style.cssText = `
      font-family: monospace;
      font-size: 48px;
      font-weight: bold;
      color: #00aaff;
      text-shadow: 4px 4px 0 #000000, 0 0 20px #00aaff;
      margin-bottom: 40px;
    `;

    this.promptEl = document.createElement('div');
    this.promptEl.textContent = 'PRESS SPACE TO START';
    this.promptEl.style.cssText = `
      font-family: monospace;
      font-size: 20px;
      color: #ffffff;
      text-shadow: 2px 2px 0 #000000;
      animation: pulse 1s ease-in-out infinite;
    `;

    this.container.append(this.titleEl, this.promptEl);
    parent.appendChild(this.container);

    // Add pulse animation
    if (!document.getElementById('title-pulse-style')) {
      const style = document.createElement('style');
      style.id = 'title-pulse-style';
      style.textContent = `
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  show(): void {
    this.container.style.display = 'flex';
  }

  hide(): void {
    this.container.style.display = 'none';
  }

  dispose(): void {
    this.container.remove();
  }
}
