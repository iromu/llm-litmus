/** HUD (Heads-Up Display) — shows score, health, weapons, etc. */
export class HUD {
  private container: HTMLElement;
  private scoreEl: HTMLElement;
  private healthEl: HTMLElement;
  private weaponEl: HTMLElement;
  private livesEl: HTMLElement;

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      font-family: monospace;
      font-size: 14px;
      color: #ffffff;
      text-shadow: 2px 2px 0 #000000;
      z-index: 10;
    `;

    this.scoreEl = this._createText('SCORE: 0', 10, 10);
    this.healthEl = this._createText('HP: 5', 10, 30);
    this.weaponEl = this._createText('WEAPON: PLASMA STREAM', 10, 50);
    this.livesEl = this._createText('LIVES: 3', 10, 70);

    this.container.append(this.scoreEl, this.healthEl, this.weaponEl, this.livesEl);
    parent.appendChild(this.container);
  }

  private _createText(text: string, x: number, y: number): HTMLElement {
    const el = document.createElement('div');
    el.textContent = text;
    el.style.position = 'absolute';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    return el;
  }

  update(score: number, health: number, maxHealth: number, lives: number, weaponName: string): void {
    this.scoreEl.textContent = `SCORE: ${score.toString().padStart(8, '0')}`;
    this.healthEl.textContent = `HP: ${health}/${maxHealth}`;
    this.livesEl.textContent = `LIVES: ${lives}`;
    this.weaponEl.textContent = `WEAPON: ${weaponName.toUpperCase()}`;
  }

  dispose(): void {
    this.container.remove();
  }
}
