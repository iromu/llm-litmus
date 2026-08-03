import * as THREE from 'three';
import { EnemyDefinition } from '../data/EnemyDefinitions.js';
import { BulletPattern } from '../systems/BulletPattern.js';
import type { Projectile } from '../entities/Projectile.js';

/** Enemy entity. */
export class Enemy {
  def: EnemyDefinition;
  mesh: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  health: number;
  maxHealth: number;
  alive: boolean;
  scoreValue: number;
  attackTimer: number;
  moveTimer: number;
  /** For zigzag movement */
  zigzagPhase: number;
  /** For orbit movement */
  orbitCenter: THREE.Vector3;
  orbitAngle: number;
  /** For charging */
  charging: boolean;
  chargeTimer: number;

  constructor(def: EnemyDefinition, position: THREE.Vector3, scene: THREE.Scene) {
    this.def = def;
    this.position = position.clone();
    this.velocity = new THREE.Vector3();
    this.health = def.health;
    this.maxHealth = def.health;
    this.alive = true;
    this.scoreValue = def.scoreValue;
    this.attackTimer = Math.random() * def.attackCooldown;
    this.moveTimer = 0;
    this.zigzagPhase = Math.random() * Math.PI * 2;
    this.orbitCenter = new THREE.Vector3();
    this.orbitAngle = Math.random() * Math.PI * 2;
    this.charging = false;
    this.chargeTimer = 0;

    this.mesh = this._createMesh(scene);
    this.mesh.position.copy(this.position);
  }

  private _createMesh(scene: THREE.Scene): THREE.Group {
    const group = new THREE.Group();
    const color = parseInt(this.def.bulletColor.slice(1), 16);

    let body: THREE.Mesh;
    if (this.def.size === 'small') {
      const geom = new THREE.ConeGeometry(0.25, 0.7, 4);
      geom.rotateX(Math.PI / 2);
      body = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color }));
    } else if (this.def.size === 'medium') {
      const geom = new THREE.BoxGeometry(0.6, 0.4, 0.8);
      body = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color }));
    } else {
      const geom = new THREE.DodecahedronGeometry(0.5);
      body = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color }));
    }

    group.add(body);
    group.scale.setScalar(this.def.scale);
    group.rotation.z = Math.PI; // Face player (down screen)
    scene.add(group);
    return group;
  }

  update(delta: number, scrollSpeed: number, playerPos: THREE.Vector3 | null) {
    if (!this.alive) return;

    this.moveTimer += delta;
    this.attackTimer -= delta;

    // Movement patterns
    switch (this.def.moveType) {
      case 'zigzag':
        this.zigzagPhase += delta * 4;
        this.velocity.x = Math.sin(this.zigzagPhase) * this.def.speed;
        this.velocity.y = -scrollSpeed * 0.3;
        break;
      case 'dive':
        if (playerPos) {
          const dx = playerPos.x - this.position.x;
          const dy = playerPos.y - this.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          // Cap velocity to prevent runaway acceleration
          const maxSpeed = this.def.speed * 2;
          this.velocity.x += (dx / dist) * this.def.speed * delta * 2;
          this.velocity.y += (dy / dist) * this.def.speed * delta * 2;
          // Clamp speed
          const currentSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
          if (currentSpeed > maxSpeed) {
            this.velocity.x = (this.velocity.x / currentSpeed) * maxSpeed;
            this.velocity.y = (this.velocity.y / currentSpeed) * maxSpeed;
          }
          this.velocity.x *= 0.95;
          this.velocity.y *= 0.95;
        }
        break;
      case 'orbit':
        this.orbitAngle += delta * 2;
        this.velocity.x = Math.cos(this.orbitAngle) * this.def.speed;
        this.velocity.y = -scrollSpeed * 0.2 + Math.sin(this.orbitAngle) * this.def.speed * 0.5;
        break;
      case 'sweep':
        this.velocity.x = Math.sin(this.moveTimer * 1.5) * this.def.speed * 1.5;
        this.velocity.y = -scrollSpeed * 0.5;
        break;
      case 'stationary':
        this.velocity.y = -scrollSpeed * 0.1;
        this.velocity.x = 0;
        break;
      case 'erratic':
        if (Math.random() < 0.05) {
          this.velocity.x = (Math.random() - 0.5) * this.def.speed * 4;
        }
        this.velocity.y = -scrollSpeed * 0.4;
        this.velocity.x *= 0.9;
        break;
      case 'armored':
        this.velocity.y = -scrollSpeed * 0.2;
        this.velocity.x = Math.sin(this.moveTimer) * 0.5;
        break;
      case 'swarm':
        this.velocity.y = -scrollSpeed * 0.6;
        this.velocity.x = Math.sin(this.moveTimer * 3 + this.zigzagPhase) * 2;
        break;
      case 'hover':
        this.velocity.x = Math.sin(this.moveTimer * 0.8) * this.def.speed;
        this.velocity.y = -scrollSpeed * 0.15;
        break;
      case 'charging':
        this.chargeTimer += delta;
        if (!this.charging && this.chargeTimer > 2) {
          this.charging = true;
          this.chargeTimer = 0;
          if (playerPos) {
            const dx = playerPos.x - this.position.x;
            const dy = playerPos.y - this.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            this.velocity.x = (dx / dist) * this.def.speed * 3;
            this.velocity.y = (dy / dist) * this.def.speed * 3;
          }
        }
        if (this.charging) {
          this.velocity.y *= 0.98;
          this.velocity.x *= 0.98;
          if (this.chargeTimer > 3) {
            this.charging = false;
            this.chargeTimer = 0;
          }
        }
        break;
      case 'strafe':
        this.velocity.x = this.def.speed;
        this.velocity.y = -scrollSpeed * 0.4;
        if (Math.abs(this.position.x) > 8) {
          this.velocity.x = -this.velocity.x;
        }
        break;
      case 'organic':
        this.velocity.y = -scrollSpeed * 0.3;
        this.velocity.x = Math.sin(this.moveTimer * 2) * Math.cos(this.moveTimer * 0.7) * 2;
        break;
      case 'drone':
        this.velocity.y = -scrollSpeed * 0.5;
        this.velocity.x = Math.sin(this.moveTimer * 1.2) * 1.5;
        break;
      default:
        this.velocity.y = -scrollSpeed * 0.3;
    }

    this.position.add(this.velocity.clone().multiplyScalar(delta));
    this.mesh.position.copy(this.position);

    // Remove if off screen bottom
    if (this.position.y < -5) {
      this.alive = false;
    }
  }

  takeDamage(amount: number) {
    this.health -= amount;
    if (this.health <= 0) {
      this.alive = false;
    }
  }

  /** Fire bullets based on attackType. Returns projectiles to add to the stage. */
  attack(pattern: BulletPattern): Projectile[] {
    if (this.attackTimer <= 0) {
      this.attackTimer = this.def.attackCooldown;
      const color = parseInt(this.def.bulletColor.slice(1), 16);
      const bullets: Projectile[] = [];

      switch (this.def.attackType) {
        case 'single':
          bullets.push(pattern.fire(
            this.position,
            new THREE.Vector3(0, 1, 0).multiplyScalar(5),
            color, 1,
          ));
          break;
        case 'spread':
          bullets.push(...pattern.fireSpread(
            this.position,
            new THREE.Vector3(0, 1, 0),
            3, Math.PI / 4,
            color, 1,
          ));
          break;
        case 'homing':
          bullets.push(pattern.fireHoming(
            this.position,
            new THREE.Vector3(0, 0, 0), // target set in update
            4, color, 1,
          ));
          break;
        case 'ring':
          bullets.push(...pattern.fireRing(
            this.position, 3, 8, color, 1,
          ));
          break;
        case 'burst':
          bullets.push(...pattern.fireBurst(
            this.position,
            new THREE.Vector3(0, 1, 0).multiplyScalar(5),
            5, 2, color, 1,
          ));
          break;
        case 'pinch':
          bullets.push(...pattern.fireSpread(
            this.position,
            new THREE.Vector3(0, 1, 0),
            2, Math.PI / 6,
            color, 1,
          ));
          break;
        case 'triple':
          bullets.push(...pattern.fireSpread(
            this.position,
            new THREE.Vector3(0, 1, 0),
            3, Math.PI / 6,
            color, 1,
          ));
          break;
        case 'bounce':
          bullets.push(pattern.fire(
            this.position,
            new THREE.Vector3((Math.random() - 0.5) * 3, 1, 0).normalize().multiplyScalar(5),
            color, 1,
          ));
          break;
        case 'emp':
          bullets.push(pattern.fire(
            this.position,
            new THREE.Vector3(0, 1, 0).multiplyScalar(3),
            color, 1,
          ));
          break;
        default:
          // shield, cross, spiral, focused, cloud, mine — use single as fallback
          bullets.push(pattern.fire(
            this.position,
            new THREE.Vector3(0, 1, 0).multiplyScalar(5),
            color, 1,
          ));
          break;
      }
      return bullets;
    }
    return [];
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
