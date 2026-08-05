/**
 * Multi-layer parallax scrolling backgrounds
 * Supports 6-10 layers with different scroll speeds, colors, and patterns
 */
import { CONFIG } from '../core/Config';
import { Renderer, PALETTE, GRADIENTS } from '../core/Renderer';
import { Camera } from './Camera';

/**
 * Biome types for background themes
 */
export enum Biome {
  VOLCANIC,
  CITY,
  ASTEROID,
  ORGANIC,
}

/**
 * Parallax layer definition
 */
interface ParallaxLayer {
  speed: number;       // Scroll speed multiplier (0-1)
  color: string;       // Base color
  pattern: string;     // Pattern type
  detail?: any;        // Pattern-specific data
  height?: number;     // Layer height (for partial screen layers)
  y?: number;          // Y position
  size?: 'small' | 'medium' | 'large';  // Size for asteroid layers
}

/**
 * Procedural background generator for each biome
 */
class BackgroundGenerator {
  /**
   * Generate volcanic canyon background layers
   */
  static volcanic(): ParallaxLayer[] {
    return [
      // Far sky
      { speed: 0.05, color: '#441100', pattern: 'gradient', height: CONFIG.HEIGHT },
      // Distant mountains
      { speed: 0.15, color: '#773311', pattern: 'mountain', y: 40, height: 184 },
      // Mid canyon walls
      { speed: 0.3, color: '#aa5533', pattern: 'canyon', y: 60, height: 164 },
      // Near canyon features
      { speed: 0.5, color: '#cc6644', pattern: 'rock', y: 80, height: 144 },
      // Lava rivers
      { speed: 0.7, color: '#ff4400', pattern: 'lava', y: 160, height: 64 },
      // Foreground debris
      { speed: 0.9, color: '#663322', pattern: 'debris' },
      // Close foreground
      { speed: 1.0, color: '#442211', pattern: 'foreground', y: 190, height: 34 },
    ];
  }

  /**
   * Generate futuristic city background layers
   */
  static city(): ParallaxLayer[] {
    return [
      // Far space
      { speed: 0.05, color: '#000022', pattern: 'stars' },
      // Distant city skyline
      { speed: 0.15, color: '#001144', pattern: 'skyline', y: 30, height: 194 },
      // Mid buildings
      { speed: 0.3, color: '#002266', pattern: 'buildings', y: 50, height: 174 },
      // Near structures
      { speed: 0.5, color: '#003388', pattern: 'structures', y: 70, height: 154 },
      // Neon signs / lights
      { speed: 0.7, color: '#00ffcc', pattern: 'neon' },
      // Flying vehicles
      { speed: 0.8, color: '#88aacc', pattern: 'vehicles' },
      // Foreground railings
      { speed: 1.0, color: '#224466', pattern: 'foreground', y: 180, height: 44 },
    ];
  }

  /**
   * Generate asteroid field background layers
   */
  static asteroid(): ParallaxLayer[] {
    return [
      // Deep space
      { speed: 0.02, color: '#000000', pattern: 'deepSpace' },
      // Star field
      { speed: 0.1, color: '#111133', pattern: 'stars' },
      // Distant asteroids
      { speed: 0.25, color: '#333355', pattern: 'asteroids', size: 'small' },
      // Mid asteroids
      { speed: 0.45, color: '#555577', pattern: 'asteroids', size: 'medium' },
      // Near asteroids
      { speed: 0.7, color: '#777799', pattern: 'asteroids', size: 'large' },
      // Space debris
      { speed: 0.85, color: '#444466', pattern: 'debris' },
      // Close floating rocks
      { speed: 1.0, color: '#666688', pattern: 'foreground' },
    ];
  }

  /**
   * Generate alien organic fortress background layers
   */
  static organic(): ParallaxLayer[] {
    return [
      // Alien sky
      { speed: 0.05, color: '#001100', pattern: 'gradient', height: CONFIG.HEIGHT },
      // Distant organic structures
      { speed: 0.15, color: '#003300', pattern: 'organicFar', y: 20, height: 204 },
      // Mid fortress walls
      { speed: 0.3, color: '#005500', pattern: 'organicMid', y: 40, height: 184 },
      // Pulsating membranes
      { speed: 0.5, color: '#228822', pattern: 'membrane' },
      // Organic tendrils
      { speed: 0.65, color: '#44aa44', pattern: 'tendrils' },
      // Glowing nodes
      { speed: 0.8, color: '#88ff00', pattern: 'nodes' },
      // Foreground organic
      { speed: 1.0, color: '#114411', pattern: 'foreground', y: 170, height: 54 },
    ];
  }
}

/**
 * Parallax background system
 */
export class ParallaxSystem {
  private currentBiome: Biome = Biome.VOLCANIC;
  private targetBiome: Biome = Biome.VOLCANIC;
  private transitionProgress: number = 1;
  private previousLayers: ParallaxLayer[] = [];
  private layers: ParallaxLayer[] = [];
  private seed: number = 42;
  private time: number = 0;

  constructor() {
    this.loadBiome(this.currentBiome);
  }

  /**
   * Set the current biome
   */
  setBiome(biome: Biome): void {
    this.targetBiome = biome;
    if (this.currentBiome !== this.targetBiome && this.transitionProgress >= 1) {
      this.previousLayers = [...this.layers];
      this.transitionProgress = 0;
    }
  }

  /**
   * Get current biome
   */
  getBiome(): Biome {
    return this.currentBiome;
  }

  /**
   * Update parallax system
   */
  update(dt: number, camera: Camera): void {
    this.time += dt;

    // Handle biome transitions
    if (this.currentBiome !== this.targetBiome) {
      this.transitionProgress += dt * 0.5; // 2 second transition
      if (this.transitionProgress >= 1) {
        this.transitionProgress = 1;
        this.currentBiome = this.targetBiome;
        this.loadBiome(this.currentBiome);
      }
    }
  }

  /**
   * Load biome layers
   */
  public loadBiome(biome: Biome): void {
    switch (biome) {
      case Biome.VOLCANIC:
        this.layers = BackgroundGenerator.volcanic();
        break;
      case Biome.CITY:
        this.layers = BackgroundGenerator.city();
        break;
      case Biome.ASTEROID:
        this.layers = BackgroundGenerator.asteroid();
        break;
      case Biome.ORGANIC:
        this.layers = BackgroundGenerator.organic();
        break;
    }
  }

  /**
   * Render all parallax layers
   */
  render(renderer: Renderer, camera: Camera): void {
    const layers = this.currentBiome === this.targetBiome
      ? this.layers
      : this.layers;

    for (const layer of layers) {
      this.renderLayer(renderer, layer, camera);
    }

    // Handle transition fade
    if (this.currentBiome !== this.targetBiome) {
      renderer.flash('#000000', 0.5 * (1 - this.transitionProgress));
    }
  }

  /**
   * Render a single parallax layer
   */
  private renderLayer(renderer: Renderer, layer: ParallaxLayer, camera: Camera): void {
    const scrollX = camera.scrollX * layer.speed;
    const y = layer.y ?? 0;
    const h = layer.height ?? CONFIG.HEIGHT - (layer.y ?? 0);

    switch (layer.pattern) {
      case 'gradient':
        this.renderGradient(renderer, 0, y, CONFIG.WIDTH, h, layer.color);
        break;
      case 'stars':
        this.renderStars(renderer, scrollX, y, h);
        break;
      case 'deepSpace':
        this.renderDeepSpace(renderer, scrollX, y, h);
        break;
      case 'mountain':
        this.renderMountain(renderer, scrollX, y, h, layer.color);
        break;
      case 'canyon':
        this.renderCanyon(renderer, scrollX, y, h, layer.color);
        break;
      case 'rock':
        this.renderRock(renderer, scrollX, y, h, layer.color);
        break;
      case 'lava':
        this.renderLava(renderer, scrollX, y, h, this.time);
        break;
      case 'skyline':
        this.renderSkyline(renderer, scrollX, y, h, layer.color);
        break;
      case 'buildings':
        this.renderBuildings(renderer, scrollX, y, h, layer.color);
        break;
      case 'structures':
        this.renderStructures(renderer, scrollX, y, h, layer.color);
        break;
      case 'neon':
        this.renderNeon(renderer, scrollX, this.time);
        break;
      case 'vehicles':
        this.renderVehicles(renderer, scrollX, this.time);
        break;
      case 'asteroids':
        this.renderAsteroids(renderer, scrollX, layer.size ?? 'medium');
        break;
      case 'debris':
        this.renderDebris(renderer, scrollX);
        break;
      case 'organicFar':
        this.renderOrganicFar(renderer, scrollX, y, h, layer.color, this.time);
        break;
      case 'organicMid':
        this.renderOrganicMid(renderer, scrollX, y, h, layer.color, this.time);
        break;
      case 'membrane':
        this.renderMembrane(renderer, scrollX, this.time);
        break;
      case 'tendrils':
        this.renderTendrils(renderer, scrollX, this.time);
        break;
      case 'nodes':
        this.renderNodes(renderer, scrollX, this.time);
        break;
      case 'foreground':
        this.renderForeground(renderer, scrollX, y, h, layer.color);
        break;
    }
  }

  /* ===== Rendering methods for each pattern ===== */

  private renderGradient(r: Renderer, x: number, y: number, w: number, h: number, baseColor: string): void {
    r.rect(x, y, w, h, baseColor);
  }

  private renderStars(r: Renderer, scrollX: number, y: number, h: number): void {
    r.rect(0, y, CONFIG.WIDTH, h, '#000011');
    for (let i = 0; i < 40; i++) {
      const sx = ((i * 73 + Math.floor(scrollX * 0.3)) % CONFIG.WIDTH + CONFIG.WIDTH) % CONFIG.WIDTH;
      const sy = y + ((i * 97) % h);
      const bright = i % 5 === 0 ? PALETTE.white : (i % 3 === 0 ? PALETTE.offWhite : PALETTE.gray);
      const twinkle = Math.sin(this.time * 3 + i) > 0.5 ? 1 : 0;
      if (twinkle || i % 3 === 0) {
        r.rect(sx, sy, 1, 1, bright);
      }
    }
  }

  private renderDeepSpace(r: Renderer, scrollX: number, y: number, h: number): void {
    r.rect(0, y, CONFIG.WIDTH, h, '#000000');
    // Distant nebula
    for (let i = 0; i < 15; i++) {
      const nx = ((i * 137 + Math.floor(scrollX * 0.05)) % CONFIG.WIDTH + CONFIG.WIDTH) % CONFIG.WIDTH;
      const ny = y + ((i * 173) % h);
      const size = 2 + (i % 3);
      const colors = ['#110022', '#220033', '#001133'];
      r.rect(nx, ny, size, size, colors[i % 3]);
    }
  }

  private renderMountain(r: Renderer, scrollX: number, y: number, h: number, color: string): void {
    r.rect(0, y, CONFIG.WIDTH, h, color);
    // Mountain silhouette
    for (let x = 0; x < CONFIG.WIDTH; x++) {
      const worldX = x + Math.floor(scrollX);
      const height = Math.sin(worldX * 0.02) * 30 + Math.sin(worldX * 0.05) * 15 + 40;
      const mountainY = y + h - height;
      r.rect(x, mountainY, 1, height, shadeColor(color, -20));
    }
  }

  private renderCanyon(r: Renderer, scrollX: number, y: number, h: number, color: string): void {
    r.rect(0, y, CONFIG.WIDTH, h, color);
    // Canyon wall features
    for (let i = 0; i < 12; i++) {
      const worldX = i * 80;
      const sx = ((worldX + Math.floor(scrollX)) % (CONFIG.WIDTH + 80)) - 40;
      const wallH = 30 + (i % 4) * 15;
      // Top wall
      r.rect(sx, y, 20, wallH, shadeColor(color, -15));
      // Bottom wall
      r.rect(sx + 10, y + h - wallH, 20, wallH, shadeColor(color, -10));
    }
  }

  private renderRock(r: Renderer, scrollX: number, y: number, h: number, color: string): void {
    r.rect(0, y, CONFIG.WIDTH, h, color);
    for (let i = 0; i < 8; i++) {
      const sx = ((i * 113 + Math.floor(scrollX * 0.5)) % CONFIG.WIDTH + CONFIG.WIDTH) % CONFIG.WIDTH;
      const rockH = 20 + (i % 3) * 10;
      r.rect(sx, y, 15, rockH, shadeColor(color, -25));
      r.rect(sx + 5, y + h - rockH, 12, rockH, shadeColor(color, -20));
    }
  }

  private renderLava(r: Renderer, scrollX: number, y: number, h: number, time: number): void {
    // Base lava
    r.rect(0, y, CONFIG.WIDTH, h, '#441100');
    // Lava flow
    for (let x = 0; x < CONFIG.WIDTH; x++) {
      const worldX = x + Math.floor(scrollX * 0.7);
      const wave = Math.sin(worldX * 0.1 + time * 2) * 5;
      const lavaY = y + h / 2 + wave;
      const lavaH = h / 2 - wave;
      r.rect(x, lavaY, 1, lavaH, '#ff4400');
      // Lava glow
      if (Math.sin(worldX * 0.2 + time * 3) > 0.7) {
        r.rect(x, lavaY, 1, 2, '#ffaa00');
      }
    }
    // Lava bubbles
    for (let i = 0; i < 6; i++) {
      const bx = ((i * 67 + Math.floor(scrollX * 0.7)) % CONFIG.WIDTH + CONFIG.WIDTH) % CONFIG.WIDTH;
      const by = y + 5 + Math.sin(time * 2 + i * 1.5) * 3;
      r.circle(bx, by, 2, '#ff8800');
    }
  }

  private renderSkyline(r: Renderer, scrollX: number, y: number, h: number, color: string): void {
    r.rect(0, y, CONFIG.WIDTH, h, color);
    for (let i = 0; i < 20; i++) {
      const sx = ((i * 50 + Math.floor(scrollX * 0.15)) % (CONFIG.WIDTH + 40)) - 20;
      const bH = 20 + (i % 5) * 12;
      r.rect(sx, y + h - bH, 12, bH, shadeColor(color, 10));
      // Windows
      for (let wy = 0; wy < bH - 4; wy += 4) {
        for (let wx = 2; wx < 10; wx += 4) {
          if ((i + wy + wx) % 3 !== 0) {
            r.rect(sx + wx, y + h - bH + wy + 1, 2, 2, '#ffff88');
          }
        }
      }
    }
  }

  private renderBuildings(r: Renderer, scrollX: number, y: number, h: number, color: string): void {
    r.rect(0, y, CONFIG.WIDTH, h, color);
    for (let i = 0; i < 15; i++) {
      const sx = ((i * 60 + Math.floor(scrollX * 0.3)) % (CONFIG.WIDTH + 50)) - 25;
      const bH = 30 + (i % 4) * 20;
      r.rect(sx, y + h - bH, 18, bH, shadeColor(color, 15));
      // Antenna
      if (i % 3 === 0) {
        r.rect(sx + 8, y + h - bH - 6, 2, 6, shadeColor(color, 20));
        // Blinking light
        if (Math.sin(this.time * 4 + i) > 0) {
          r.rect(sx + 8, y + h - bH - 6, 2, 2, '#ff0000');
        }
      }
    }
  }

  private renderStructures(r: Renderer, scrollX: number, y: number, h: number, color: string): void {
    r.rect(0, y, CONFIG.WIDTH, h, color);
    for (let i = 0; i < 10; i++) {
      const sx = ((i * 80 + Math.floor(scrollX * 0.5)) % (CONFIG.WIDTH + 60)) - 30;
      const sH = 25 + (i % 3) * 15;
      // Platform
      r.rect(sx, y + h - sH, 25, 4, shadeColor(color, 20));
      // Support
      r.rect(sx + 10, y + h - sH + 4, 4, sH - 4, shadeColor(color, 10));
    }
  }

  private renderNeon(r: Renderer, _scrollX: number, time: number): void {
    // Scrolling neon signs
    for (let i = 0; i < 5; i++) {
      const x = ((i * 90 + Math.floor(_scrollX * 0.7)) % CONFIG.WIDTH + CONFIG.WIDTH) % CONFIG.WIDTH;
      const y = 30 + (i % 3) * 40;
      const colors = ['#ff00ff', '#00ffff', '#ffff00', '#ff8800', '#00ff00'];
      const c = colors[i % colors.length];
      // Flickering neon
      if (Math.sin(time * 5 + i * 2) > -0.5) {
        r.rect(x, y, 16, 3, c);
        r.rect(x + 1, y + 1, 14, 1, '#ffffff');
      }
    }
  }

  private renderVehicles(r: Renderer, scrollX: number, time: number): void {
    // Flying vehicles in background
    for (let i = 0; i < 4; i++) {
      const speed = 0.4 + i * 0.1;
      const x = ((i * 120 + Math.floor(scrollX * speed + time * 20 * (i % 2 === 0 ? 1 : -1))) % CONFIG.WIDTH + CONFIG.WIDTH) % CONFIG.WIDTH;
      const y = 20 + i * 35 + Math.sin(time + i) * 5;
      r.rect(x, y, 8, 3, '#aabbcc');
      r.rect(x + 7, y + 1, 2, 1, '#ff8800'); // Engine glow
    }
  }

  private renderAsteroids(r: Renderer, scrollX: number, size: 'small' | 'medium' | 'large'): void {
    const count = size === 'small' ? 15 : (size === 'medium' ? 8 : 4);
    const asteroidSize = size === 'small' ? 3 : (size === 'medium' ? 6 : 12);
    const speed = size === 'small' ? 0.25 : (size === 'medium' ? 0.45 : 0.7);

    for (let i = 0; i < count; i++) {
      const sx = ((i * (CONFIG.WIDTH / count) * 2 + Math.floor(scrollX * speed)) % (CONFIG.WIDTH + asteroidSize * 2)) - asteroidSize;
      const sy = 20 + (i * 37 % (CONFIG.HEIGHT - 40));
      r.circle(sx + asteroidSize / 2, sy + asteroidSize / 2, asteroidSize / 2,
        size === 'small' ? '#555566' : (size === 'medium' ? '#666677' : '#777788'));
      // Crater detail
      if (asteroidSize > 4) {
        r.circle(sx + asteroidSize * 0.3, sy + asteroidSize * 0.4, asteroidSize * 0.15,
          shadeColor('#666677', -20));
      }
    }
  }

  private renderDebris(r: Renderer, scrollX: number): void {
    for (let i = 0; i < 20; i++) {
      const sx = ((i * 47 + Math.floor(scrollX * 0.85)) % CONFIG.WIDTH + CONFIG.WIDTH) % CONFIG.WIDTH;
      const sy = (i * 71 % CONFIG.HEIGHT);
      r.rect(sx, sy, 1 + (i % 2), 1 + (i % 3), '#556677');
    }
  }

  private renderOrganicFar(r: Renderer, scrollX: number, y: number, h: number, color: string, time: number): void {
    r.rect(0, y, CONFIG.WIDTH, h, color);
    // Distant organic shapes
    for (let i = 0; i < 8; i++) {
      const sx = ((i * 100 + Math.floor(scrollX * 0.15)) % (CONFIG.WIDTH + 60)) - 30;
      const pulse = Math.sin(time * 0.5 + i) * 3;
      const oH = 40 + pulse + (i % 3) * 15;
      r.rect(sx, y + h / 2 - oH / 2, 30, oH, shadeColor(color, 10));
      // Glowing spots
      if (Math.sin(time * 2 + i) > 0.5) {
        r.rect(sx + 10, y + h / 2 - 5, 3, 3, '#88ff00');
      }
    }
  }

  private renderOrganicMid(r: Renderer, scrollX: number, y: number, h: number, color: string, time: number): void {
    r.rect(0, y, CONFIG.WIDTH, h, color);
    // Organic wall segments
    for (let i = 0; i < 12; i++) {
      const sx = ((i * 70 + Math.floor(scrollX * 0.3)) % (CONFIG.WIDTH + 40)) - 20;
      const pulse = Math.sin(time * 1.5 + i * 0.7) * 4;
      const oH = 25 + pulse + (i % 4) * 10;
      r.rect(sx, y, 20, oH, shadeColor(color, -10));
      r.rect(sx, y + h - oH, 20, oH, shadeColor(color, -5));
    }
  }

  private renderMembrane(r: Renderer, scrollX: number, time: number): void {
    // Pulsating membrane strips
    for (let i = 0; i < 6; i++) {
      const x = ((i * 80 + Math.floor(scrollX * 0.5)) % (CONFIG.WIDTH + 40)) - 20;
      const pulse = Math.sin(time * 2 + i) * 8;
      const mH = 15 + pulse;
      const my = 50 + i * 25;
      r.rect(x, my, 30, mH, `rgba(34, 136, 34, 0.6)`);
      // Vein lines
      r.line(x + 5, my, x + 25, my + mH, '#44cc44', 1);
    }
  }

  private renderTendrils(r: Renderer, scrollX: number, time: number): void {
    // Wavy organic tendrils
    for (let i = 0; i < 4; i++) {
      const baseX = ((i * 100 + Math.floor(scrollX * 0.65)) % (CONFIG.WIDTH + 50)) - 25;
      for (let t = 0; t < 20; t++) {
        const tx = baseX + t * 2;
        const ty = 40 + Math.sin(time * 3 + t * 0.5 + i) * 20 + i * 30;
        r.rect(tx, ty, 2, 2, '#66cc66');
      }
    }
  }

  private renderNodes(r: Renderer, scrollX: number, time: number): void {
    // Glowing organic nodes
    for (let i = 0; i < 6; i++) {
      const x = ((i * 70 + Math.floor(scrollX * 0.8)) % CONFIG.WIDTH + CONFIG.WIDTH) % CONFIG.WIDTH;
      const y = 30 + (i % 4) * 40;
      const pulse = Math.sin(time * 4 + i * 1.3) * 0.5 + 0.5;
      const size = 2 + pulse * 2;
      r.circle(x, y, size, '#88ff00');
      r.circle(x, y, size * 0.5, '#ffffff');
    }
  }

  private renderForeground(r: Renderer, scrollX: number, y: number, h: number, color: string): void {
    r.rect(0, y, CONFIG.WIDTH, h, color);
    // Scrolling foreground details
    for (let i = 0; i < 16; i++) {
      const sx = ((i * 40 + Math.floor(scrollX)) % (CONFIG.WIDTH + 20)) - 10;
      r.rect(sx, y, 10, 2, shadeColor(color, 15));
      r.rect(sx + 2, y + h - 2, 6, 2, shadeColor(color, 10));
    }
  }
}

/**
 * Helper: shade a hex color by a percentage
 */
function shadeColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xFF) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xFF) + percent));
  const b = Math.min(255, Math.max(0, (num & 0xFF) + percent));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
