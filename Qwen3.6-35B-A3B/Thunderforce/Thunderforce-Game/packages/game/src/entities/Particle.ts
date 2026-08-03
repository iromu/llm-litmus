import * as THREE from 'three';

/** Particle entity for explosions, trails, etc. */
export class Particle {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  lifetime: number;
  maxLifetime: number;
  alive: boolean;
  size: number;
  /** Scene this mesh is attached to (null when pooled) */
  private _scene: THREE.Scene | null = null;

  constructor(
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    color: number,
    size: number,
    lifetime: number,
    scene: THREE.Scene,
  ) {
    this.position = position.clone();
    this.velocity = velocity.clone();
    this.lifetime = lifetime;
    this.maxLifetime = lifetime;
    this.alive = true;
    this.size = size;

    const geom = new THREE.PlaneGeometry(size, size);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(geom, mat);
    this.mesh.position.copy(this.position);
    this.mesh.lookAt(new THREE.Vector3(0, 0, 10));
    this._scene = scene;
    scene.add(this.mesh);
  }

  /** Reset to pool-ready state. Called by ObjectPool.release(). */
  reset(): void {
    this.alive = false;
    this.lifetime = 0;
    this.maxLifetime = 0;
    this.position.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
    this.size = 0;
    this.mesh.visible = false;
    // Detach from scene when pooled
    if (this._scene) {
      this._scene.remove(this.mesh);
      this._scene = null;
    }
  }

  /** Attach mesh to scene. Called by ObjectPool.acquire consumer. */
  attachToScene(scene: THREE.Scene): void {
    if (!this._scene && scene) {
      this._scene = scene;
      scene.add(this.mesh);
    }
  }

  update(delta: number) {
    if (!this.alive) return;

    this.lifetime -= delta;
    if (this.lifetime <= 0) {
      this.alive = false;
      return;
    }

    this.position.add(this.velocity.clone().multiplyScalar(delta));
    this.velocity.multiplyScalar(0.98); // Drag
    this.mesh.position.copy(this.position);

    const t = this.lifetime / this.maxLifetime;
    (this.mesh.material as THREE.MeshBasicMaterial).opacity = t;
    this.mesh.scale.setScalar(0.5 + t * 0.5);
  }

  dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
