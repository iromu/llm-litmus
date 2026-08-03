import * as THREE from 'three';
import { WeaponId, WeaponState, WeaponDefinitions } from '../data/WeaponDefinitions.js';
import { WeaponSystem } from '../systems/WeaponSystem.js';

/** Player ship state. */
export interface PlayerShipData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  health: number;
  maxHealth: number;
  shield: number;
  score: number;
  lives: number;
  currentWeapon: WeaponId;
  weaponStates: WeaponState[];
  invulnerable: number;
  dashCooldown: number;
  alive: boolean;
}

/** Player ship entity. */
export class PlayerShip {
  data: PlayerShipData;
  mesh: THREE.Group;
  weaponGroup: THREE.Group;
  engineFlame: THREE.Mesh;

  constructor(scene: THREE.Scene) {
    this.data = {
      position: new THREE.Vector3(0, 0, -5),
      velocity: new THREE.Vector3(),
      health: 5,
      maxHealth: 5,
      shield: 0,
      score: 0,
      lives: 3,
      currentWeapon: WeaponId.PlasmaStream,
      weaponStates: WeaponDefinitions.map(def => ({
        id: def.id,
        level: 1,
        active: def.id === WeaponId.PlasmaStream,
        cooldown: 0,
        fireTimer: 0,
      })),
      invulnerable: 0,
      dashCooldown: 0,
      alive: true,
    };

    this.mesh = new THREE.Group();
    this.weaponGroup = new THREE.Group();
    this.engineFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.15, 0.6, 6),
      new THREE.MeshBasicMaterial({ color: 0x44ff44 })
    );
    this.engineFlame.position.z = 0.8;
    this.engineFlame.rotation.x = Math.PI / 2;

    // Main body
    const bodyGeom = new THREE.ConeGeometry(0.3, 1.2, 6);
    bodyGeom.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshBasicMaterial({ color: 0x00aaff });
    const body = new THREE.Mesh(bodyGeom, bodyMat);

    // Wings
    const wingGeom = new THREE.BoxGeometry(1.2, 0.05, 0.4);
    const wingMat = new THREE.MeshBasicMaterial({ color: 0x0088cc });
    const wings = new THREE.Mesh(wingGeom, wingMat);
    wings.position.z = -0.2;

    // Engine
    const engineGeom = new THREE.CylinderGeometry(0.12, 0.18, 0.4, 8);
    engineGeom.rotateX(Math.PI / 2);
    const engineMat = new THREE.MeshBasicMaterial({ color: 0x006699 });
    const engine = new THREE.Mesh(engineGeom, engineMat);
    engine.position.z = -0.6;

    this.mesh.add(body, wings, engine, this.engineFlame, this.weaponGroup);
    this.mesh.position.copy(this.data.position);
    scene.add(this.mesh);
  }

  update(delta: number, inputX: number, inputY: number) {
    if (!this.data.alive) return;

    const speed = 12;
    this.data.velocity.x = inputX * speed;
    this.data.velocity.y = inputY * speed;

    this.data.position.x += this.data.velocity.x * delta;
    this.data.position.y += this.data.velocity.y * delta;

    // Clamp to screen bounds
    this.data.position.x = THREE.MathUtils.clamp(this.data.position.x, -7, 7);
    this.data.position.y = THREE.MathUtils.clamp(this.data.position.y, -3.5, 3.5);

    // Tilt based on horizontal movement
    this.mesh.rotation.z = -inputX * 0.4;
    this.mesh.rotation.x = inputY * 0.2;

    // Engine flame flicker
    this.engineFlame.scale.setScalar(0.8 + Math.random() * 0.4);

    // Timers
    if (this.data.invulnerable > 0) {
      this.data.invulnerable -= delta;
      // Blink when invulnerable
      this.mesh.visible = Math.floor(this.data.invulnerable * 10) % 2 === 0;
    } else {
      this.mesh.visible = true;
    }

    if (this.data.dashCooldown > 0) {
      this.data.dashCooldown -= delta;
    }
  }

  /** Fire all active weapons through the WeaponSystem. */
  fire(weaponSystem: WeaponSystem): void {
    const direction = new THREE.Vector3(0, 1, 0); // Fire upward
    for (const ws of this.data.weaponStates) {
      if (ws.active) {
        weaponSystem.fire(ws, this.data.position, direction, 1);
      }
    }
  }

  activateWeapon(id: WeaponId) {
    const ws = this.data.weaponStates.find(w => w.id === id);
    if (ws) {
      ws.active = true;
      this.data.currentWeapon = id;
    }
  }

  deactivateWeapon(id: WeaponId) {
    const ws = this.data.weaponStates.find(w => w.id === id);
    if (ws && this.data.weaponStates.filter(w => w.active).length > 1) {
      ws.active = false;
    }
  }

  upgradeWeapon(id: WeaponId) {
    const ws = this.data.weaponStates.find(w => w.id === id);
    if (ws && ws.level < 3) {
      ws.level++;
    }
  }

  takeDamage(amount: number) {
    if (this.data.invulnerable > 0 || !this.data.alive) return false;

    if (this.data.shield > 0) {
      this.data.shield -= amount;
      if (this.data.shield < 0) {
        this.data.health += this.data.shield; // overflow damage
        this.data.shield = 0;
      }
    } else {
      this.data.health -= amount;
    }

    if (this.data.health <= 0) {
      this.data.lives--;
      if (this.data.lives > 0) {
        this.respawn();
        return true; // survived
      }
      this.data.alive = false;
      return false; // game over
    }

    this.data.invulnerable = 2; // 2 seconds invulnerability
    return true;
  }

  private respawn() {
    this.data.health = this.data.maxHealth;
    this.data.invulnerable = 3;
    this.mesh.visible = true;
    this.data.position.set(0, 0, -5);
  }

  addScore(points: number) {
    this.data.score += points;
  }

  addShield() {
    this.data.shield = Math.min(this.data.shield + 2, 5);
  }

  addWeaponLevel(id: WeaponId) {
    this.upgradeWeapon(id);
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
