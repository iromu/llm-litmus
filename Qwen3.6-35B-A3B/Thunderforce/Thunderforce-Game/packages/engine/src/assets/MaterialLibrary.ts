import * as THREE from 'three';

// --- Shared Material Library ---

export class MaterialLibrary {
  readonly materials = new Map<string, THREE.Material>();

  getOrAdd<T extends THREE.Material>(name: string, factory: () => T): T {
    const existing = this.materials.get(name);
    if (existing) return existing as T;
    const mat = factory();
    this.materials.set(name, mat);
    return mat;
  }

  get playerBody(): THREE.MeshStandardMaterial {
    return this.getOrAdd('player-body', () =>
      new THREE.MeshStandardMaterial({
        color: 0x4488ff,
        metalness: 0.7,
        roughness: 0.3,
      }),
    );
  }

  get playerAccent(): THREE.MeshStandardMaterial {
    return this.getOrAdd('player-accent', () =>
      new THREE.MeshStandardMaterial({
        color: 0x2244aa,
        metalness: 0.8,
        roughness: 0.2,
      }),
    );
  }

  get engineGlow(): THREE.MeshBasicMaterial {
    return this.getOrAdd('engine-glow', () =>
      new THREE.MeshBasicMaterial({ color: 0x44aaff }),
    );
  }

  get plasmaBeam(): THREE.MeshBasicMaterial {
    return this.getOrAdd('plasma-beam', () =>
      new THREE.MeshBasicMaterial({ color: 0x44ff44 }),
    );
  }

  get droneOrb(): THREE.MeshBasicMaterial {
    return this.getOrAdd('drone-orb', () =>
      new THREE.MeshBasicMaterial({ color: 0xffdd44 }),
    );
  }

  get laserBeam(): THREE.MeshBasicMaterial {
    return this.getOrAdd('laser-beam', () =>
      new THREE.MeshBasicMaterial({ color: 0x44ddff }),
    );
  }

  get lightningBolt(): THREE.MeshBasicMaterial {
    return this.getOrAdd('lightning-bolt', () =>
      new THREE.MeshBasicMaterial({ color: 0xaaccff }),
    );
  }

  get enemySmall(): THREE.MeshStandardMaterial {
    return this.getOrAdd('enemy-small', () =>
      new THREE.MeshStandardMaterial({ color: 0xcc4444, metalness: 0.5, roughness: 0.4 }),
    );
  }

  get enemyMedium(): THREE.MeshStandardMaterial {
    return this.getOrAdd('enemy-medium', () =>
      new THREE.MeshStandardMaterial({ color: 0xcc8844, metalness: 0.6, roughness: 0.3 }),
    );
  }

  get enemyLarge(): THREE.MeshStandardMaterial {
    return this.getOrAdd('enemy-large', () =>
      new THREE.MeshStandardMaterial({ color: 0x884444, metalness: 0.7, roughness: 0.3 }),
    );
  }

  get bossBody(): THREE.MeshStandardMaterial {
    return this.getOrAdd('boss-body', () =>
      new THREE.MeshStandardMaterial({ color: 0x664466, metalness: 0.8, roughness: 0.2 }),
    );
  }

  get bossWeakPoint(): THREE.MeshBasicMaterial {
    return this.getOrAdd('boss-weak', () =>
      new THREE.MeshBasicMaterial({ color: 0xff4444 }),
    );
  }

  get bulletFriendly(): THREE.MeshBasicMaterial {
    return this.getOrAdd('bullet-friendly', () =>
      new THREE.MeshBasicMaterial({ color: 0x44ff88 }),
    );
  }

  get bulletEnemy(): THREE.MeshBasicMaterial {
    return this.getOrAdd('bullet-enemy', () =>
      new THREE.MeshBasicMaterial({ color: 0xff4444 }),
    );
  }

  get pickupPower(): THREE.MeshBasicMaterial {
    return this.getOrAdd('pickup-power', () =>
      new THREE.MeshBasicMaterial({ color: 0x44ff44 }),
    );
  }

  get pickupShield(): THREE.MeshBasicMaterial {
    return this.getOrAdd('pickup-shield', () =>
      new THREE.MeshBasicMaterial({ color: 0x4488ff }),
    );
  }

  get pickupSpeed(): THREE.MeshBasicMaterial {
    return this.getOrAdd('pickup-speed', () =>
      new THREE.MeshBasicMaterial({ color: 0xffaa44 }),
    );
  }

  get pickupScore(): THREE.MeshBasicMaterial {
    return this.getOrAdd('pickup-score', () =>
      new THREE.MeshBasicMaterial({ color: 0xffdd44 }),
    );
  }

  get particleWhite(): THREE.MeshBasicMaterial {
    return this.getOrAdd('particle-white', () =>
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
  }

  get particleOrange(): THREE.MeshBasicMaterial {
    return this.getOrAdd('particle-orange', () =>
      new THREE.MeshBasicMaterial({ color: 0xff6622 }),
    );
  }

  get particleRed(): THREE.MeshBasicMaterial {
    return this.getOrAdd('particle-red', () =>
      new THREE.MeshBasicMaterial({ color: 0xff2222 }),
    );
  }

  get particleYellow(): THREE.MeshBasicMaterial {
    return this.getOrAdd('particle-yellow', () =>
      new THREE.MeshBasicMaterial({ color: 0xffcc44 }),
    );
  }

  get particleBlue(): THREE.MeshBasicMaterial {
    return this.getOrAdd('particle-blue', () =>
      new THREE.MeshBasicMaterial({ color: 0x4488ff }),
    );
  }

  get particleGreen(): THREE.MeshBasicMaterial {
    return this.getOrAdd('particle-green', () =>
      new THREE.MeshBasicMaterial({ color: 0x44ff44 }),
    );
  }

  get particlePurple(): THREE.MeshBasicMaterial {
    return this.getOrAdd('particle-purple', () =>
      new THREE.MeshBasicMaterial({ color: 0xaa44ff }),
    );
  }

  get particleCyan(): THREE.MeshBasicMaterial {
    return this.getOrAdd('particle-cyan', () =>
      new THREE.MeshBasicMaterial({ color: 0x44ffff }),
    );
  }

  /** Dispose all materials. */
  dispose(): void {
    for (const mat of this.materials.values()) {
      mat.dispose();
    }
    this.materials.clear();
  }
}
