import * as THREE from 'three';
import { Projectile, ProjectileType } from '../entities/Projectile.js';
import { ObjectPool } from '@thunderforce/engine';

/**
 * Bullet pattern generator — creates bullet patterns for enemies and bosses.
 */
export class BulletPattern {
  private pool: ObjectPool<Projectile>;
  private readonly scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.pool = new ObjectPool<Projectile>(
      () => this._createBullet(),
      (b: Projectile) => b.dispose(),
      500,
    );
  }

  /** Fire a single bullet. */
  fire(
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    color: number,
    damage: number,
    type: ProjectileType = ProjectileType.Enemy,
  ): Projectile {
    const bullet = this.pool.acquire();
    bullet.attachToScene(this.scene);
    bullet.position.copy(position);
    bullet.velocity.copy(velocity);
    bullet.damage = damage;
    bullet.type = type;
    // Update the material color
    if (bullet.mesh.material instanceof THREE.MeshBasicMaterial) {
      bullet.mesh.material.color.setHex(color);
    }
    return bullet;
  }

  /** Fire a spread pattern (N bullets fanning out). */
  fireSpread(
    position: THREE.Vector3,
    baseVelocity: THREE.Vector3,
    count: number,
    spreadAngle: number,
    color: number,
    damage: number,
    type: ProjectileType = ProjectileType.Enemy,
  ): Projectile[] {
    const bullets: Projectile[] = [];
    const angleStep = spreadAngle / (count - 1 || 1);
    const startAngle = -spreadAngle / 2;

    for (let i = 0; i < count; i++) {
      const angle = startAngle + i * angleStep;
      const vel = baseVelocity.clone();
      vel.applyAxisAngle(new THREE.Vector3(0, 0, 1), angle);
      vel.normalize().multiplyScalar(baseVelocity.length());
      bullets.push(this.fire(position, vel, color, damage, type));
    }
    return bullets;
  }

  /** Fire a ring pattern (N bullets in a circle). */
  fireRing(
    position: THREE.Vector3,
    speed: number,
    count: number,
    color: number,
    damage: number,
    type: ProjectileType = ProjectileType.Enemy,
  ): Projectile[] {
    const bullets: Projectile[] = [];
    const angleStep = (Math.PI * 2) / count;

    for (let i = 0; i < count; i++) {
      const angle = i * angleStep;
      const vel = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0).multiplyScalar(speed);
      bullets.push(this.fire(position, vel, color, damage, type));
    }
    return bullets;
  }

  /** Fire a spiral pattern. */
  fireSpiral(
    position: THREE.Vector3,
    speed: number,
    count: number,
    rotationOffset: number,
    color: number,
    damage: number,
    type: ProjectileType = ProjectileType.Enemy,
  ): Projectile[] {
    const bullets: Projectile[] = [];
    const angleStep = (Math.PI * 2) / count;

    for (let i = 0; i < count; i++) {
      const angle = i * angleStep + rotationOffset;
      const vel = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0).multiplyScalar(speed);
      bullets.push(this.fire(position, vel, color, damage, type));
    }
    return bullets;
  }

  /** Fire a homing bullet toward target. */
  fireHoming(
    position: THREE.Vector3,
    target: THREE.Vector3,
    speed: number,
    color: number,
    damage: number,
  ): Projectile {
    const vel = target.clone().sub(position).normalize().multiplyScalar(speed);
    return this.fire(position, vel, color, damage, ProjectileType.Enemy);
  }

  /** Fire a burst (quick succession of bullets). */
  fireBurst(
    position: THREE.Vector3,
    baseVelocity: THREE.Vector3,
    count: number,
    delay: number,
    color: number,
    damage: number,
    type: ProjectileType = ProjectileType.Enemy,
  ): Projectile[] {
    const bullets: Projectile[] = [];
    for (let i = 0; i < count; i++) {
      const vel = baseVelocity.clone();
      vel.x += (Math.random() - 0.5) * delay;
      vel.y += (Math.random() - 0.5) * delay;
      vel.normalize().multiplyScalar(baseVelocity.length());
      bullets.push(this.fire(position, vel, color, damage, type));
    }
    return bullets;
  }

  update(delta: number): void {
    const active = this.pool.getActive();
    for (let i = active.length - 1; i >= 0; i--) {
      const b = active[i];
      b.update(delta, null);
      if (!b.alive) {
        this.pool.release(b);
      }
    }
  }

  getProjectiles(): Projectile[] {
    return this.pool.getActive();
  }

  dispose(): void {
    this.pool.clear();
  }

  private _createBullet(): Projectile {
    return new Projectile(
      ProjectileType.Enemy,
      new THREE.Vector3(),
      new THREE.Vector3(),
      0xff0000,
      1,
      false,
      this.scene,
    );
  }
}
