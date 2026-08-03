import * as THREE from 'three';
import { WeaponId, WeaponState, WeaponDefinitions, getWeaponDef, WeaponDefinition } from '../data/WeaponDefinitions.js';
import { Projectile, ProjectileType } from '../entities/Projectile.js';
import { ObjectPool } from '@thunderforce/engine';

/** Weapon system — handles firing all player weapons. */
export class WeaponSystem {
  private pools: Map<WeaponId, ObjectPool<Projectile>> = new Map();

  constructor(private readonly scene: THREE.Scene) {
    for (const def of WeaponDefinitions) {
      this.pools.set(def.id, new ObjectPool<Projectile>(
        () => this._createProjectile(def),
        (p) => p.dispose(),
        200,
      ));
    }
  }

  fire(
    ws: WeaponState,
    position: THREE.Vector3,
    direction: THREE.Vector3,
    damage: number,
    penetrating = false,
  ): Projectile[] {
    const def = getWeaponDef(ws.id);
    const mult = def.levelMultipliers[ws.level - 1];
    const pool = this.pools.get(ws.id)!;
    const results: Projectile[] = [];

    const count = mult.count ?? 1;
    const spread = mult.spread ?? 1;
    const arcs = mult.arcs ?? 0;
    const tickDamage = mult.damage * damage;

    // Primary projectile(s)
    for (let i = 0; i < count; i++) {
      const offset = spread > 1 ? (i - (spread - 1) / 2) * 0.3 : 0;
      const vel = direction.clone();
      if (spread > 1) {
        vel.x += offset;
        vel.normalize().multiplyScalar(15);
      } else {
        vel.multiplyScalar(15);
      }
      const p = pool.acquire();
      p.attachToScene(this.scene);
      p.position.copy(position);
      p.position.x += offset;
      p.velocity.copy(vel);
      p.damage = tickDamage;
      p.type = ProjectileType.Player;
      p.penetrating = penetrating;
      results.push(p);
    }

    // Chain lightning arcs (Energy Drones L3)
    for (let i = 0; i < arcs; i++) {
      const arcVel = direction.clone();
      arcVel.x += (Math.random() - 0.5) * 2;
      arcVel.normalize().multiplyScalar(20);
      const p = pool.acquire();
      p.attachToScene(this.scene);
      p.position.copy(position);
      p.position.x += (i - arcs / 2) * 0.2;
      p.velocity.copy(arcVel);
      p.damage = tickDamage * 0.5;
      p.type = ProjectileType.Player;
      p.penetrating = true;
      results.push(p);
    }

    return results;
  }

  update(delta: number): void {
    for (const pool of this.pools.values()) {
      const active = pool.getActive();
      for (let i = active.length - 1; i >= 0; i--) {
        const p = active[i];
        p.update(delta, null);
        if (!p.alive) {
          pool.release(p);
        }
      }
    }
  }

  getProjectiles(): Projectile[] {
    const results: Projectile[] = [];
    for (const pool of this.pools.values()) {
      results.push(...pool.getActive());
    }
    return results;
  }

  dispose(): void {
    for (const pool of this.pools.values()) {
      pool.clear();
    }
  }

  private _createProjectile(def: WeaponDefinition): Projectile {
    const color = parseInt(def.color.slice(1), 16);
    return new Projectile(
      ProjectileType.Player,
      new THREE.Vector3(),
      new THREE.Vector3(),
      color,
      1,
      false,
      this.scene,
    );
  }
}
