import * as THREE from 'three';

export class CameraRig {
  private target = new THREE.Vector3();
  private _position = new THREE.Vector3();
  private lookAt = new THREE.Vector3();
  private readonly _lookAheadZ: number;
  private readonly _lookAheadX: number;
  private readonly _lookAheadY: number;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly followSpeed = 5,
    lookAheadZ = 2.0,
    lookAheadX = 0.5,
    lookAheadY = 0.5,
  ) {
    this._lookAheadZ = lookAheadZ;
    this._lookAheadX = lookAheadX;
    this._lookAheadY = lookAheadY;
    this._position.copy(camera.position);
    this.target.copy(camera.position);
    this.lookAt.copy(camera.position);
  }

  snapTo(pos: THREE.Vector3): void {
    this._position.copy(pos);
    this.target.copy(pos);
    this.lookAt.copy(pos);
    this.camera.position.copy(pos);
  }

  update(delta: number, playerPos: THREE.Vector3, lag = 0.16): void {
    // Follow with lag
    this.target.lerp(playerPos, 1 - Math.exp(-this.followSpeed * delta));
    this._position.lerp(this.target, 1 - Math.exp(-lag * 60 * delta));

    // Look ahead in scroll direction (+Z is forward)
    const ahead = playerPos.clone();
    ahead.z += this._lookAheadZ;
    ahead.x += this._lookAheadX;
    ahead.y += this._lookAheadY;
    this.lookAt.lerp(ahead, 1 - Math.exp(-this.followSpeed * delta * 0.7));

    this.camera.position.copy(this.position);
    this.camera.lookAt(this.lookAt);
  }

  setPosition(pos: THREE.Vector3): void {
    this._position.copy(pos);
    this.camera.position.copy(pos);
  }

  get position(): THREE.Vector3 {
    return this._position;
  }
}
