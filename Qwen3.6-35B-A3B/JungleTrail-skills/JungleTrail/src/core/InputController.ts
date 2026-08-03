export class InputController {
  public readonly keys = new Set<string>();
  public yaw = 0;
  public pitch = 0;
  public sprint = false;

  get yawAngle(): number { return this.yaw; }
  get pitchAngle(): number { return this.pitch; }
  get isSprinting(): boolean { return this.sprint; }

  get forward(): boolean { return this.keys.has('KeyW') || this.keys.has('ArrowUp'); }
  get backward(): boolean { return this.keys.has('KeyS') || this.keys.has('ArrowDown'); }
  get left(): boolean { return this.keys.has('KeyA') || this.keys.has('ArrowLeft'); }
  get right(): boolean { return this.keys.has('KeyD') || this.keys.has('ArrowRight'); }

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  handleMouseMove(movementX: number, movementY: number): void {
    const sensitivity = 0.002;
    this.yaw -= movementX * sensitivity;
    this.pitch -= movementY * sensitivity;
    // Clamp pitch to avoid flipping
    this.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.pitch));
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.code);
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      this.sprint = true;
    }
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      this.sprint = false;
    }
  };

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}
