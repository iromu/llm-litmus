import * as THREE from 'three';

/** Pickup types. */
export enum PickupType {
  Health = 0,
  Shield,
  WeaponUpgrade,
  Score,
}

/** Pickup entity. */
export class Pickup {
  mesh: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  type: PickupType;
  alive: boolean;
  lifetime: number;
  bobPhase: number;

  constructor(type: PickupType, position: THREE.Vector3, scene: THREE.Scene) {
    this.type = type;
    this.position = position.clone();
    this.velocity = new THREE.Vector3(0, -1.5, 0); // Drift upward (toward player)
    this.alive = true;
    this.lifetime = 15;
    this.bobPhase = Math.random() * Math.PI * 2;

    this.mesh = this._createMesh(scene);
    this.mesh.position.copy(this.position);
  }

  private _createMesh(scene: THREE.Scene): THREE.Group {
    const group = new THREE.Group();
    let color: number;
    let geom: THREE.BufferGeometry;

    switch (this.type) {
      case PickupType.Health:
        color = 0xff4444;
        geom = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        break;
      case PickupType.Shield:
        color = 0x4488ff;
        geom = new THREE.OctahedronGeometry(0.2);
        break;
      case PickupType.WeaponUpgrade:
        color = 0xffdd44;
        geom = new THREE.ConeGeometry(0.15, 0.4, 4);
        geom.rotateX(Math.PI / 2);
        break;
      case PickupType.Score:
        color = 0x44ff44;
        geom = new THREE.SphereGeometry(0.15, 6, 6);
        break;
    }

    const mat = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(geom, mat);
    group.add(mesh);

    // Glow
    const glowGeom = new THREE.SphereGeometry(0.3, 6, 6);
    const glowMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3 });
    const glow = new THREE.Mesh(glowGeom, glowMat);
    group.add(glow);

    scene.add(group);
    return group;
  }

  update(delta: number) {
    if (!this.alive) return;

    this.lifetime -= delta;
    if (this.lifetime <= 0) {
      this.alive = false;
      return;
    }

    this.position.add(this.velocity.clone().multiplyScalar(delta));
    this.bobPhase += delta * 4;
    this.position.y += Math.sin(this.bobPhase) * 0.01;

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y += delta * 2;
    this.mesh.rotation.x += delta;
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
  }
}
