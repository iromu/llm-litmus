import * as THREE from 'three';

export interface ParallaxLayerConfig {
  /** Scroll speed multiplier relative to game speed */
  speed: number;
  /** Background color for this layer */
  bgColor?: string;
  /** Mesh or group to add to scene */
  group: THREE.Group;
  /** Whether this layer scrolls in Z (forward scroll) */
  scrollZ?: boolean;
  /** Whether this layer scrolls in X (lateral movement parallax) */
  scrollX?: boolean;
}

/**
 * Manages multiple parallax scrolling layers.
 * Each layer scrolls at a different speed to create depth.
 */
export class ParallaxManager {
  private readonly layers: ParallaxLayerConfig[] = [];

  addLayer(config: ParallaxLayerConfig): void {
    this.layers.push(config);
  }

  /**
   * Update all parallax layers based on camera movement.
   * Call each frame after the camera has moved.
   */
  update(delta: number, scrollZ: number, scrollX: number): void {
    for (const layer of this.layers) {
      const group = layer.group;
      if (!group) continue;

      if (layer.scrollZ !== false) {
        // Scroll in Z direction (forward scrolling)
        const offset = scrollZ * layer.speed * delta;
        group.position.z = -offset % 100;
      }

      if (layer.scrollX) {
        // Parallax in X based on camera X position
        const offset = scrollX * layer.speed * delta;
        group.position.x = -offset % 50;
      }
    }
  }

  /**
   * Set the absolute Z position for all layers (for transitions).
   */
  setZ(z: number): void {
    for (const layer of this.layers) {
      layer.group.position.z = z * layer.speed;
    }
  }

  /**
   * Clear all layers.
   */
  clear(): void {
    this.layers.length = 0;
  }

  get layerCount(): number {
    return this.layers.length;
  }
}
