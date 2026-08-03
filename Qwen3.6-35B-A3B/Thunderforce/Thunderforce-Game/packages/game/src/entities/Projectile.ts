import * as THREE from 'three';

/** Projectile types. */
export enum ProjectileType {
  Player = 0,
  Enemy,
  Boss,
}

/** Projectile entity. */
export class Projectile {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  type: ProjectileType;
  damage: number;
  alive: boolean;
  lifetime: number;
  /** For homing projectiles */
  target: THREE.Vector3 | null;
  /** For penetrating projectiles (like Lightning Beam) */
  penetrating: boolean;
  /** Scene this mesh is attached to (null when pooled) */
  private _scene: THREE.Scene | null = null;

  constructor(
    type: ProjectileType,
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    color: number,
    damage: number,
    penetrating = false,
    scene?: THREE.Scene,
  ) {
    this.type = type;
    this.position = position.clone();
    this.velocity = velocity.clone();
    this.damage = damage;
    this.alive = true;
    this.lifetime = 5; // seconds
    this.target = null;
    this.penetrating = penetrating;

    const geom = new THREE.SphereGeometry(type === ProjectileType.Player ? 0.12 : 0.15, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color });
    this.mesh = new THREE.Mesh(geom, mat);

    // Add glow
    const glowGeom = new THREE.SphereGeometry(0.2, 6, 6);
    const glowMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3 });
    const glow = new THREE.Mesh(glowGeom, glowMat);
    this.mesh.add(glow);

    this.mesh.position.copy(this.position);
    if (scene) {
      this._scene = scene;
      scene.add(this.mesh);
    } else {
      this._scene = null;
      this.mesh.visible = false;
    }
  }

  /** Reset to pool-ready state. Called by ObjectPool.release(). */
  reset(): void {
    this.alive = false;
    this.lifetime = 0;
    this.target = null;
    this.penetrating = false;
    this.position.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
    this.damage = 0;
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

  update(delta: number, playerPos: THREE.Vector3 | null) {
    if (!this.alive) return;

    this.lifetime -= delta;
    if (this.lifetime <= 0) {
      this.alive = false;
      return;
    }

    // Homing behavior — clone velocity to avoid mutating the pool reference
    if (this.type === ProjectileType.Enemy && this.target && playerPos) {
      const dx = playerPos.x - this.position.x;
      const dy = playerPos.y - this.position.y;
      const angle = Math.atan2(dy, dx);
      const currentAngle = Math.atan2(this.velocity.y, this.velocity.x);
      let diff = angle - currentAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const newVel = this.velocity.clone();
      newVel.applyAxisAngle(new THREE.Vector3(0, 0, 1), diff * delta * 3);
      this.velocity.copy(newVel);
    }

    this.position.add(this.velocity.clone().multiplyScalar(delta));
    this.mesh.position.copy(this.position);

    // Remove if off screen
    if (
      this.position.x < -10 || this.position.x > 10 ||
      this.position.y < -6 || this.position.y > 6
    ) {
      this.alive = false;
    }
  }

  dispose() {
    this.mesh.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
