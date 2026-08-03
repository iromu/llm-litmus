import * as THREE from 'three';
import { BossDefinition } from '../data/BossDefinitions.js';

/** Boss entity. */
export class Boss {
  def: BossDefinition;
  mesh: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  currentPhase: number;
  phaseHealth: number;
  totalHealth: number;
  health: number;
  alive: boolean;
  entering: boolean;
  destructionTimer: number;
  attackTimer: number;
  moveTimer: number;
  orbitAngle: number;
  scoreValue: number;

  constructor(def: BossDefinition, scene: THREE.Scene) {
    this.def = def;
    this.mesh = new THREE.Group();
    this.position = new THREE.Vector3(0, 0, -15);
    this.velocity = new THREE.Vector3();
    this.currentPhase = 0;
    this.phaseHealth = def.phases[0].health;
    this.totalHealth = def.totalHealth;
    this.health = def.totalHealth;
    this.alive = true;
    this.entering = true;
    this.destructionTimer = 0;
    this.attackTimer = 0;
    this.moveTimer = 0;
    this.orbitAngle = 0;
    this.scoreValue = def.scoreValue;

    this.mesh = this._createMesh(scene);
    this.mesh.position.copy(this.position);
    scene.add(this.mesh);
  }

  private _createMesh(scene: THREE.Scene): THREE.Group {
    const group = new THREE.Group();
    const color = 0xff4422;

    // Main body
    const bodyGeom = new THREE.TorusGeometry(0.8, 0.3, 8, 12);
    const bodyMat = new THREE.MeshBasicMaterial({ color });
    const body = new THREE.Mesh(bodyGeom, bodyMat);

    // Core
    const coreGeom = new THREE.SphereGeometry(0.4, 8, 8);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    const core = new THREE.Mesh(coreGeom, coreMat);

    // Arms/appendages
    for (let i = 0; i < 4; i++) {
      const armGeom = new THREE.BoxGeometry(0.2, 0.8, 0.1);
      const arm = new THREE.Mesh(armGeom, bodyMat);
      arm.position.x = Math.cos(i * Math.PI / 2) * 1.0;
      arm.position.y = Math.sin(i * Math.PI / 2) * 1.0;
      arm.rotation.z = i * Math.PI / 2;
      group.add(arm);
    }

    group.add(body, core);
    group.scale.setScalar(this.def.scale);
    scene.add(group);
    return group;
  }

  update(delta: number, _scrollSpeed: number, playerPos: THREE.Vector3 | null) {
    if (!this.alive) return;

    this.moveTimer += delta;
    this.attackTimer -= delta;

    // Entry animation
    if (this.entering) {
      this.position.z += delta * 2;
      if (this.position.z >= -10) {
        this.entering = false;
      }
      this.mesh.position.copy(this.position);
      return;
    }

    // Movement patterns
    const phase = this.def.phases[this.currentPhase];
    switch (phase.movePattern) {
      case 'hover':
        this.position.x = Math.sin(this.moveTimer * 0.8) * 4;
        this.position.y = Math.cos(this.moveTimer * 0.5) * 1.5;
        break;
      case 'aggressive':
        if (playerPos) {
          this.position.x += (playerPos.x - this.position.x) * delta * 0.5;
          this.position.y += (playerPos.y - this.position.y) * delta * 0.3;
        }
        break;
      case 'rotate':
        this.orbitAngle += delta;
        this.position.x = Math.cos(this.orbitAngle) * 5;
        this.position.y = Math.sin(this.orbitAngle) * 3;
        this.mesh.rotation.z += delta * 2;
        break;
      case 'stationary':
        this.position.x = Math.sin(this.moveTimer * 0.5) * 2;
        break;
      case 'erratic':
        if (Math.random() < 0.03) {
          this.velocity.x = (Math.random() - 0.5) * 8;
          this.velocity.y = (Math.random() - 0.5) * 4;
        }
        this.position.x += this.velocity.x * delta;
        this.position.y += this.velocity.y * delta;
        this.velocity.x *= 0.95;
        this.velocity.y *= 0.95;
        break;
      case 'pulse':
        this.position.x = Math.sin(this.moveTimer) * 3;
        this.position.y = Math.cos(this.moveTimer * 1.5) * 2;
        this.mesh.scale.setScalar(1 + Math.sin(this.moveTimer * 4) * 0.1);
        break;
      case 'drift':
        this.position.x += Math.sin(this.moveTimer * 0.7) * delta * 2;
        this.position.y += Math.cos(this.moveTimer * 0.5) * delta * 1.5;
        break;
      default:
        this.position.x = Math.sin(this.moveTimer) * 3;
    }

    // Clamp position
    this.position.x = THREE.MathUtils.clamp(this.position.x, -6, 6);
    this.position.y = THREE.MathUtils.clamp(this.position.y, -3, 3);

    this.mesh.position.copy(this.position);

    // Attack
    if (this.attackTimer <= 0 && !this.entering) {
      this._attack();
      this.attackTimer = phase.attackCooldown;
    }
  }

  private _attack() {
    // Emit attack event - systems will handle bullet spawning
    // For now, just mark that an attack occurred
  }

  takeDamage(amount: number) {
    if (!this.alive || this.entering) return;

    this.health -= amount;
    this.phaseHealth -= amount;

    // Check phase transition
    if (this.phaseHealth <= 0 && this.currentPhase < this.def.phases.length - 1) {
      this.currentPhase++;
      this.phaseHealth = this.def.phases[this.currentPhase].health;
    }

    // Check destruction
    if (this.health <= 0) {
      this.alive = false;
      this.destructionTimer = this.def.destructionDuration;
    }
  }

  isDestructing(): boolean {
    return !this.alive && this.destructionTimer > 0;
  }

  updateDestruction(delta: number) {
    if (this.destructionTimer > 0) {
      this.destructionTimer -= delta;
      // Explosion effect
      this.mesh.scale.setScalar(1 + (this.def.destructionDuration - this.destructionTimer) * 0.5);
      this.mesh.rotation.z += delta * 10;
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
  }
}
