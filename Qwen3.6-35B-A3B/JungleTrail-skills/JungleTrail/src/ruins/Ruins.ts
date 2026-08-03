import * as THREE from 'three';

// ── Simplex noise ────────────────────────────────────────────────────────────
class SimpleNoise {
  hash(x: number, y: number): number {
    const n = Math.sin(x * 127.1 + y * 311.7 + 99) * 43758.5453;
    return n - Math.floor(n);
  }

  noise2D(x: number, y: number): number {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const top = this.hash(ix, iy) * (1 - sx) + this.hash(ix + 1, iy) * sx;
    const bot = this.hash(ix, iy + 1) * (1 - sx) + this.hash(ix + 1, iy + 1) * sy;
    return top * (1 - sy) + bot * sy;
  }

  fbm(x: number, y: number, octaves = 4): number {
    let value = 0, amplitude = 0.5, frequency = 1, maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      value += amplitude * this.noise2D(x * frequency, y * frequency);
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    return value / maxValue;
  }

  ridgedFbm(x: number, y: number, octaves = 4): number {
    let value = 0, amplitude = 0.5, frequency = 1, maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      let n = this.noise2D(x * frequency, y * frequency);
      n = 1 - Math.abs(n) * 2;
      n = n * n;
      value += amplitude * n;
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    return value / maxValue;
  }
}

// ── Procedural stone texture generator ───────────────────────────────────────
// Creates PBR-ready stone textures with realistic detail
function createStoneTextures(): {
  color: THREE.CanvasTexture;
  normal: THREE.CanvasTexture;
  roughness: THREE.CanvasTexture;
} {
  // Color map — reduce size in headless mode
  const headless = (window as any).__DISABLE_POST_PROCESSING === true;
  const texSize = headless ? 256 : 512;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = texSize;
  colorCanvas.height = texSize;
  const cCtx = colorCanvas.getContext('2d')!;

  // Base stone: warm grey with slight variation
  cCtx.fillStyle = '#7a7568';
  cCtx.fillRect(0, 0, 512, 512);

  // Stone grain: multi-scale noise
  for (let i = 0; i < 20000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = Math.random() * 4 + 0.3;
    const brightness = Math.random() * 50 - 25;
    const base = 118 + brightness;
    // Warm stone: slight yellow/brown tint
    cCtx.fillStyle = `rgba(${base + 8}, ${base + 3}, ${base - 5}, ${0.08 + Math.random() * 0.12})`;
    cCtx.beginPath();
    cCtx.arc(x, y, r, 0, Math.PI * 2);
    cCtx.fill();
  }

  // Stratification lines: thin horizontal bands (sedimentary stone)
  for (let i = 0; i < 30; i++) {
    const y = Math.random() * 512;
    const shade = 90 + Math.floor(Math.random() * 50);
    cCtx.strokeStyle = `rgba(${shade + 10}, ${shade + 5}, ${shade - 2}, ${0.1 + Math.random() * 0.15})`;
    cCtx.lineWidth = 0.5 + Math.random() * 2;
    cCtx.beginPath();
    cCtx.moveTo(0, y);
    let cx = 0;
    while (cx < 512) {
      cx += 20 + Math.random() * 40;
      const cy = y + (Math.random() - 0.5) * 8;
      cCtx.lineTo(cx, cy);
    }
    cCtx.stroke();
  }

  // Micro-cracks: fine irregular lines
  for (let i = 0; i < 80; i++) {
    const startX = Math.random() * 512;
    const startY = Math.random() * 512;
    cCtx.strokeStyle = `rgba(60, 55, 45, ${0.08 + Math.random() * 0.12})`;
    cCtx.lineWidth = 0.3 + Math.random() * 0.7;
    cCtx.beginPath();
    cCtx.moveTo(startX, startY);
    let cx = startX, cy = startY;
    for (let j = 0; j < 5 + Math.floor(Math.random() * 8); j++) {
      cx += (Math.random() - 0.5) * 15;
      cy += (Math.random() - 0.5) * 15;
      cCtx.lineTo(cx, cy);
    }
    cCtx.stroke();
  }

  // Mineral veins: thin bright lines with quartz/feldspar color
  for (let i = 0; i < 15; i++) {
    const startX = Math.random() * 512;
    const startY = Math.random() * 512;
    cCtx.strokeStyle = `rgba(${180 + Math.floor(Math.random() * 40)}, ${170 + Math.floor(Math.random() * 35)}, ${155 + Math.floor(Math.random() * 30)}, ${0.1 + Math.random() * 0.15})`;
    cCtx.lineWidth = 0.5 + Math.random();
    cCtx.beginPath();
    cCtx.moveTo(startX, startY);
    let cx = startX, cy = startY;
    for (let j = 0; j < 8 + Math.floor(Math.random() * 12); j++) {
      cx += (Math.random() - 0.5) * 20;
      cy += (Math.random() - 0.5) * 20;
      cCtx.lineTo(cx, cy);
    }
    cCtx.stroke();
  }

  // Block joint lines: subtle grid lines showing stone block boundaries
  const blockH = 64;
  for (let x = 0; x <= 512; x += blockH) {
    cCtx.strokeStyle = `rgba(50, 45, 35, ${0.15 + Math.random() * 0.1})`;
    cCtx.lineWidth = 1 + Math.random();
    cCtx.beginPath();
    cCtx.moveTo(x + (Math.random() - 0.5) * 4, 0);
    cCtx.lineTo(x + (Math.random() - 0.5) * 4, 512);
    cCtx.stroke();
  }
  for (let y = 0; y <= 512; y += blockH) {
    cCtx.strokeStyle = `rgba(50, 45, 35, ${0.15 + Math.random() * 0.1})`;
    cCtx.lineWidth = 1 + Math.random();
    cCtx.beginPath();
    cCtx.moveTo(0, y + (Math.random() - 0.5) * 4);
    cCtx.lineTo(512, y + (Math.random() - 0.5) * 4);
    cCtx.stroke();
  }

  const colorTexture = new THREE.CanvasTexture(colorCanvas);
  colorTexture.wrapS = THREE.RepeatWrapping;
  colorTexture.wrapT = THREE.RepeatWrapping;
  colorTexture.colorSpace = THREE.SRGBColorSpace;

  // Normal map — reduced in headless mode
  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = texSize;
  normalCanvas.height = texSize;
  const nCtx = normalCanvas.getContext('2d')!;

  // Base: flat normal (128, 128, 255)
  nCtx.fillStyle = 'rgb(128, 128, 255)';
  nCtx.fillRect(0, 0, 512, 512);

  // Stone grain bumps
  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = Math.random() * 3 + 0.5;
    const bump = Math.floor(Math.random() * 40);
    nCtx.fillStyle = `rgba(${128 + bump}, ${128 + bump}, ${255 - bump}, ${0.15})`;
    nCtx.beginPath();
    nCtx.arc(x, y, r, 0, Math.PI * 2);
    nCtx.fill();
  }

  // Stratification lines (raised edges)
  for (let i = 0; i < 30; i++) {
    const y = Math.random() * 512;
    const bump = 30 + Math.floor(Math.random() * 30);
    nCtx.strokeStyle = `rgba(${128 + bump}, ${128 + bump}, ${255 - bump}, ${0.2 + Math.random() * 0.2})`;
    nCtx.lineWidth = 1 + Math.random() * 2;
    nCtx.beginPath();
    nCtx.moveTo(0, y);
    let cx = 0;
    while (cx < 512) {
      cx += 20 + Math.random() * 40;
      nCtx.lineTo(cx, y + (Math.random() - 0.5) * 6);
    }
    nCtx.stroke();
  }

  // Block joint recesses (lower blue channel)
  for (let x = 0; x <= 512; x += blockH) {
    nCtx.strokeStyle = `rgba(128, 128, ${220 + Math.floor(Math.random() * 20)}, 0.3)`;
    nCtx.lineWidth = 2 + Math.floor(Math.random() * 2);
    nCtx.beginPath();
    nCtx.moveTo(x + (Math.random() - 0.5) * 4, 0);
    nCtx.lineTo(x + (Math.random() - 0.5) * 4, 512);
    nCtx.stroke();
  }
  for (let y = 0; y <= 512; y += blockH) {
    nCtx.strokeStyle = `rgba(128, 128, ${220 + Math.floor(Math.random() * 20)}, 0.3)`;
    nCtx.lineWidth = 2 + Math.floor(Math.random() * 2);
    nCtx.beginPath();
    nCtx.moveTo(0, y + (Math.random() - 0.5) * 4);
    nCtx.lineTo(512, y + (Math.random() - 0.5) * 4);
    nCtx.stroke();
  }

  const normalTexture = new THREE.CanvasTexture(normalCanvas);
  normalTexture.wrapS = THREE.RepeatWrapping;
  normalTexture.wrapT = THREE.RepeatWrapping;

  // Roughness map — reduced in headless mode
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = headless ? 128 : 256;
  roughCanvas.height = headless ? 128 : 256;
  const rCtx = roughCanvas.getContext('2d')!;

  // Base roughness: medium-high for stone
  rCtx.fillStyle = 'rgb(180, 180, 180)';
  rCtx.fillRect(0, 0, 256, 256);

  // Variation
  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = Math.random() * 5 + 0.5;
    const shade = 160 + Math.floor(Math.random() * 50);
    rCtx.fillStyle = `rgba(${shade}, ${shade}, ${shade}, ${0.1 + Math.random() * 0.15})`;
    rCtx.beginPath();
    rCtx.arc(x, y, r, 0, Math.PI * 2);
    rCtx.fill();
  }

  const roughnessTexture = new THREE.CanvasTexture(roughCanvas);
  roughnessTexture.wrapS = THREE.RepeatWrapping;
  roughnessTexture.wrapT = THREE.RepeatWrapping;

  return { color: colorTexture, normal: normalTexture, roughness: roughnessTexture };
}

// ── Water-stained stone texture ──────────────────────────────────────────────
function createWaterStainedStoneTextures(): {
  color: THREE.CanvasTexture;
  normal: THREE.CanvasTexture;
  roughness: THREE.CanvasTexture;
} {
  const headless = (window as any).__DISABLE_POST_PROCESSING === true;
  const { color: _baseColor, normal: baseNormal, roughness: baseRoughness } = createStoneTextures();

  // Now add water staining on top of the base texture
  const stainCanvas = document.createElement('canvas');
  stainCanvas.width = headless ? 256 : 512;
  stainCanvas.height = headless ? 256 : 512;
  const sCtx = stainCanvas.getContext('2d')!;

  // Dark water streaks running down from top
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * 512;
    const darkness = 30 + Math.floor(Math.random() * 50);
    const width = 2 + Math.floor(Math.random() * 8);
    sCtx.strokeStyle = `rgba(${darkness}, ${darkness + 8}, ${darkness + 12}, ${0.15 + Math.random() * 0.25})`;
    sCtx.lineWidth = width;
    sCtx.beginPath();
    sCtx.moveTo(x, 0);
    let cy = 0;
    while (cy < 512) {
      cy += 8 + Math.random() * 25;
      const cx = x + (Math.random() - 0.5) * 15 + Math.sin(cy * 0.03) * 4;
      sCtx.lineTo(cx, cy);
    }
    sCtx.stroke();
  }

  // Water streak branching (dripping pattern)
  for (let i = 0; i < 40; i++) {
    const startX = Math.random() * 512;
    const startY = Math.random() * 200;
    sCtx.strokeStyle = `rgba(${35 + Math.floor(Math.random() * 30)}, ${40 + Math.floor(Math.random() * 30)}, ${45 + Math.floor(Math.random() * 30)}, ${0.1 + Math.random() * 0.15})`;
    sCtx.lineWidth = 1 + Math.random() * 3;
    sCtx.beginPath();
    sCtx.moveTo(startX, startY);
    let cx = startX, cy = startY;
    for (let j = 0; j < 3 + Math.floor(Math.random() * 6); j++) {
      cy += 5 + Math.random() * 15;
      cx += (Math.random() - 0.5) * 10;
      sCtx.lineTo(cx, cy);
    }
    sCtx.stroke();
  }

  // Mineral deposits (lighter spots along water paths)
  for (let i = 0; i < 150; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 1 + Math.random() * 5;
    const shade = 140 + Math.floor(Math.random() * 50);
    sCtx.fillStyle = `rgba(${shade}, ${shade - 8}, ${shade - 15}, ${0.08 + Math.random() * 0.12})`;
    sCtx.beginPath();
    sCtx.arc(x, y, r, 0, Math.PI * 2);
    sCtx.fill();
  }

  // Algae/green growth at bottom (permanently wet area)
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * 512;
    const y = 350 + Math.random() * 162;
    const r = 2 + Math.random() * 12;
    sCtx.fillStyle = `rgba(${20 + Math.floor(Math.random() * 30)}, ${45 + Math.floor(Math.random() * 55)}, ${12 + Math.floor(Math.random() * 20)}, ${0.08 + Math.random() * 0.12})`;
    sCtx.beginPath();
    sCtx.arc(x, y, r, 0, Math.PI * 2);
    sCtx.fill();
  }

  // Apply water stains on top of base color
  sCtx.globalCompositeOperation = 'multiply';
  sCtx.drawImage(stainCanvas as unknown as HTMLCanvasElement, 0, 0);
  sCtx.globalCompositeOperation = 'source-over';

  // Darken overall slightly
  sCtx.fillStyle = 'rgba(80, 75, 65, 0.08)';
  sCtx.fillRect(0, 0, 512, 512);

  const stainTexture = new THREE.CanvasTexture(stainCanvas);
  stainTexture.wrapS = THREE.RepeatWrapping;
  stainTexture.wrapT = THREE.RepeatWrapping;
  stainTexture.colorSpace = THREE.SRGBColorSpace;

  return {
    color: stainTexture,
    normal: baseNormal,
    roughness: baseRoughness,
  };
}

// ── Moss texture ─────────────────────────────────────────────────────────────
function createMossTexture(): THREE.CanvasTexture {
  const headless = (window as any).__DISABLE_POST_PROCESSING === true;
  const mSize = headless ? 128 : 256;
  const canvas = document.createElement('canvas');
  canvas.width = mSize;
  canvas.height = mSize;
  const ctx = canvas.getContext('2d')!;

  // Base moss: deep green with variation
  ctx.fillStyle = '#2a4a1a';
  ctx.fillRect(0, 0, 256, 256);

  // Moss tufts: small irregular bumps
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = Math.random() * 4 + 0.5;
    const green = 50 + Math.floor(Math.random() * 80);
    const red = 15 + Math.floor(Math.random() * 30);
    const blue = 8 + Math.floor(Math.random() * 20);
    ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${0.1 + Math.random() * 0.2})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Moss tips: lighter green/yellow at tips
  for (let i = 0; i < 1000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = Math.random() * 2 + 0.5;
    ctx.fillStyle = `rgba(${30 + Math.floor(Math.random() * 30)}, ${80 + Math.floor(Math.random() * 60)}, ${15 + Math.floor(Math.random() * 20)}, ${0.15 + Math.random() * 0.2})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// ── Main Ruins class ─────────────────────────────────────────────────────────

export class Ruins {
  private readonly noise = new SimpleNoise();
  private readonly _group = new THREE.Group();

  get group(): THREE.Group { return this._group; }

  // PBR stone materials
  private readonly stoneMaterial: THREE.MeshStandardMaterial;
  private readonly waterStainedMaterial: THREE.MeshStandardMaterial;
  private readonly mossMaterial: THREE.MeshStandardMaterial;

  constructor() {
    // Create materials
    const stoneTextures = createStoneTextures();
    this.stoneMaterial = new THREE.MeshStandardMaterial({
      map: stoneTextures.color,
      normalMap: stoneTextures.normal,
      normalScale: new THREE.Vector2(0.6, 0.6),
      roughnessMap: stoneTextures.roughness,
      roughness: 0.85,
      metalness: 0.02,
      color: 0x8a8578,
    });

    const waterTextures = createWaterStainedStoneTextures();
    this.waterStainedMaterial = new THREE.MeshStandardMaterial({
      map: waterTextures.color,
      normalMap: waterTextures.normal,
      normalScale: new THREE.Vector2(0.5, 0.5),
      roughnessMap: waterTextures.roughness,
      roughness: 0.75, // Slightly smoother from water
      metalness: 0.02,
      color: 0x7a7568,
    });

    const mossTexture = createMossTexture();
    this.mossMaterial = new THREE.MeshStandardMaterial({
      map: mossTexture,
      roughness: 0.95,
      metalness: 0.0,
      color: 0x2a4a1a,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });

    this.createTempleFoundation();
    this.createColumns();
    this.createArchways();
    this.createCrumbledWalls();
    this.createStaircase();
    this.createMossOnSurfaces();
    this.createVinesOnRuins();
    this.createDecorativeStones();
    this.createWaterPuddle();
  }

  // ── Temple foundation/platform ───────────────────────────────────────────

  private createTempleFoundation(): void {
    // Main platform: large stone slab with weathered edges
    const platformGeo = this.createWeatheredBox(18, 0.6, 14, 0.2);

    const platform = new THREE.Mesh(platformGeo, this.waterStainedMaterial);
    platform.position.set(0, 0.3, -75);
    platform.receiveShadow = true;
    platform.castShadow = true;
    this._group.add(platform);

    // Raised step below platform
    const stepGeo = this.createWeatheredBox(20, 0.4, 16, 0.15);
    const step = new THREE.Mesh(stepGeo, this.stoneMaterial);
    step.position.set(0, 0.1, -75);
    step.receiveShadow = true;
    step.castShadow = true;
    this._group.add(step);

    // Scattered debris: weathered stone chunks
    for (let i = 0; i < 20; i++) {
      const chunkGeo = this.createWeatheredBox(
        0.5 + Math.random() * 2.5,
        0.15 + Math.random() * 0.5,
        0.5 + Math.random() * 2,
        0.08
      );
      const chunk = new THREE.Mesh(chunkGeo, this.stoneMaterial);
      chunk.position.set(
        (Math.random() - 0.5) * 18,
        0.08,
        -75 + (Math.random() - 0.5) * 14
      );
      chunk.rotation.y = Math.random() * Math.PI * 2;
      chunk.castShadow = true;
      chunk.receiveShadow = true;
      this._group.add(chunk);
    }

    // Moss on platform edges
    for (let i = 0; i < 12; i++) {
      const moss = this.createMossCluster(0.3 + Math.random() * 0.6);
      const edge = Math.floor(Math.random() * 4);
      if (edge === 0) { // Front edge
        moss.position.set((Math.random() - 0.5) * 16, 0.6, -68 + Math.random() * 2);
        moss.scale.set(1, 0.3, 1);
      } else if (edge === 1) { // Back edge
        moss.position.set((Math.random() - 0.5) * 16, 0.6, -82 + Math.random() * 2);
        moss.scale.set(1, 0.3, 1);
      } else if (edge === 2) { // Left edge
        moss.position.set(-9 + Math.random() * 2, 0.6, -75 + (Math.random() - 0.5) * 12);
        moss.scale.set(1, 0.3, 1);
      } else { // Right edge
        moss.position.set(9 + Math.random() * 2, 0.6, -75 + (Math.random() - 0.5) * 12);
        moss.scale.set(1, 0.3, 1);
      }
      this._group.add(moss);
    }
  }

  // ── Columns: properly fluted with capitals and bases ─────────────────────

  private createColumns(): void {
    const columnConfigs = [
      { x: -5.5, z: -75 }, { x: -2.2, z: -75 }, { x: 2.2, z: -75 }, { x: 5.5, z: -75 },
      { x: -5.5, z: -68 }, { x: -2.2, z: -68 }, { x: 2.2, z: -68 }, { x: 5.5, z: -68 },
    ];

    for (const config of columnConfigs) {
      const roll = Math.random();
      if (roll < 0.5) {
        this.createStandingColumn(config.x, config.z, 4 + Math.random() * 3);
      } else if (roll < 0.8) {
        this.createBrokenColumn(config.x, config.z, 1 + Math.random() * 2);
      } else {
        this.createFallenColumn(config.x, config.z);
      }
    }
  }

  private createStandingColumn(x: number, z: number, height: number): void {
    const column = new THREE.Group();

    // Column base (plinth): slightly wider cylinder
    const baseGeo = this.createWeatheredCylinder(0.42, 0.48, 0.2, 24);
    const base = new THREE.Mesh(baseGeo, this.waterStainedMaterial);
    base.position.y = 0.1;
    base.castShadow = true;
    column.add(base);

    // Column shaft: properly fluted with organic variation
    const shaftGeo = this.createFlutedColumn(height, 0.32, 16, 24);
    const shaft = new THREE.Mesh(shaftGeo, this.waterStainedMaterial);
    shaft.position.y = 0.2 + height * 0.5;
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    column.add(shaft);

    // Weathering at base: slight darkening via additional geometry
    const baseWearGeo = new THREE.CylinderGeometry(0.30, 0.35, 0.4, 16);
    const baseWear = new THREE.Mesh(baseWearGeo, this.waterStainedMaterial);
    baseWear.position.y = 0.4;
    baseWear.castShadow = false;
    column.add(baseWear);

    // Column capital (top): wider, decorative
    const capGeo = this.createWeatheredCylinder(0.42, 0.32, 0.25, 16);
    const cap = new THREE.Mesh(capGeo, this.waterStainedMaterial);
    cap.position.y = 0.2 + height;
    cap.castShadow = true;
    column.add(cap);

    // Moss on capital top
    if (Math.random() > 0.3) {
      const moss = this.createMossCluster(0.2 + Math.random() * 0.3);
      moss.position.y = 0.2 + height + 0.13;
      moss.scale.set(1.5, 0.4, 1.5);
      column.add(moss);
    }

    column.position.set(x, 0.6, z);
    this._group.add(column);
  }

  private createBrokenColumn(x: number, z: number, height: number): void {
    const column = new THREE.Group();

    // Broken shaft with jagged top
    const jaggedTopGeo = this.createJaggedCylinder(height, 0.26, 0.30, 12);
    const jaggedTop = new THREE.Mesh(jaggedTopGeo, this.waterStainedMaterial);
    jaggedTop.position.y = height * 0.5;
    jaggedTop.rotation.z = (Math.random() - 0.5) * 0.12;
    jaggedTop.castShadow = true;
    column.add(jaggedTop);

    // Moss on broken top
    const moss = this.createMossCluster(0.15);
    moss.position.y = height + 0.05;
    moss.scale.set(1.2, 0.3, 1.2);
    column.add(moss);

    column.position.set(x, 0.6, z);
    this._group.add(column);

    // Fallen piece nearby
    if (Math.random() > 0.35) {
      const fallGeo = this.createJaggedCylinder(height * 0.5, 0.20, 0.25, 10);
      const fall = new THREE.Mesh(fallGeo, this.waterStainedMaterial);
      fall.position.set(x + 1.5 + Math.random() * 2, 0.12, z + 0.8 + Math.random());
      fall.rotation.z = Math.PI * 0.5;
      fall.rotation.y = Math.random() * Math.PI;
      fall.castShadow = true;
      fall.receiveShadow = true;
      this._group.add(fall);
    }
  }

  private createFallenColumn(x: number, z: number): void {
    const length = 3 + Math.random() * 4;
    const geo = this.createJaggedCylinder(length, 0.20, 0.28, 14);
    const fallen = new THREE.Mesh(geo, this.waterStainedMaterial);
    fallen.position.set(x, 0.2, z);
    fallen.rotation.z = Math.PI * 0.5;
    fallen.rotation.y = (Math.random() - 0.5) * 0.5;
    fallen.castShadow = true;
    fallen.receiveShadow = true;
    this._group.add(fallen);
  }

  // ── Archways: proper stone arch with voussoirs ────────────────────────────

  private createArchways(): void {
    // Left pillar
    const leftPillar = this.createArchPillar(-3.5, -71);
    this._group.add(leftPillar);

    // Right pillar
    const rightPillar = this.createArchPillar(3.5, -71);
    this._group.add(rightPillar);

    // Arch top: semicircular arch with voussoir (wedge-shaped stone) segments
    const archRadius = 3.5;
    const archHeight = 5.5;
    const voussoirCount = 12;

    for (let i = 0; i < voussoirCount; i++) {
      const angle1 = Math.PI + (i / voussoirCount) * Math.PI;
      const angle2 = Math.PI + ((i + 0.9) / voussoirCount) * Math.PI;

      // Create wedge shape
      const wedgeGeo = this.createWedgeGeometry(
        archRadius,
        archRadius + 0.5,
        0.5,
        angle1,
        angle2
      );

      const wedge = new THREE.Mesh(wedgeGeo, this.waterStainedMaterial);
      wedge.position.set(0, archHeight, -71);
      wedge.castShadow = true;
      this._group.add(wedge);
    }

    // Missing voussoirs (gaps in arch — damaged section)
    // Skip a few for realism (already handled by the loop above)
  }

  private createArchPillar(x: number, z: number): THREE.Group {
    const pillar = new THREE.Group();
    const height = 5.5;

    // Pillar body: weathered rectangular column
    const bodyGeo = this.createWeatheredBox(0.6, height, 0.6, 0.08);
    const body = new THREE.Mesh(bodyGeo, this.waterStainedMaterial);
    body.position.y = height * 0.5;
    body.castShadow = true;
    body.receiveShadow = true;
    pillar.add(body);

    // Pillar cap
    const capGeo = this.createWeatheredBox(0.75, 0.2, 0.75, 0.05);
    const cap = new THREE.Mesh(capGeo, this.waterStainedMaterial);
    cap.position.y = height + 0.1;
    cap.castShadow = true;
    pillar.add(cap);

    // Moss on pillar top
    if (Math.random() > 0.4) {
      const moss = this.createMossCluster(0.25);
      moss.position.y = height + 0.2;
      moss.scale.set(1.5, 0.4, 1.5);
      pillar.add(moss);
    }

    pillar.position.set(x, 0.6, z);
    return pillar;
  }

  // ── Crumbled walls ──────────────────────────────────────────────────────

  private createCrumbledWalls(): void {
    const wallDefs = [
      { x: -8, z: -73, length: 7, angle: 0.08, height: 2.5 },
      { x: 8, z: -72, length: 5, angle: -0.06, height: 2 },
      { x: -4, z: -80, length: 4, angle: 0.25, height: 1.8 },
      { x: 5, z: -66, length: 3, angle: -0.15, height: 1.5 },
    ];

    for (const def of wallDefs) {
      const wallGeo = this.createWeatheredBox(def.length, def.height, 0.6, 0.12);
      const wall = new THREE.Mesh(wallGeo, this.waterStainedMaterial);
      wall.position.set(def.x, def.height * 0.5 + 0.6, def.z);
      wall.rotation.y = def.angle;
      wall.castShadow = true;
      wall.receiveShadow = true;
      this._group.add(wall);

      // Moss on wall top
      if (Math.random() > 0.35) {
        const moss = this.createMossCluster(def.length * 0.4);
        moss.position.set(def.x, def.height + 0.6, def.z);
        moss.scale.set(2, 0.35, 1.2);
        this._group.add(moss);
      }
    }
  }

  // ── Staircase ────────────────────────────────────────────────────────────

  private createStaircase(): void {
    const steps = 16;

    for (let i = 0; i < steps; i++) {
      const stepGeo = this.createWeatheredBox(
        4.5 + Math.random() * 0.2,
        0.22,
        0.75 + Math.random() * 0.08,
        0.06
      );

      const step = new THREE.Mesh(stepGeo, this.waterStainedMaterial);
      step.position.set(
        0,
        0.6 + 0.11 + i * 0.20,
        -85.5 - i * 0.72
      );
      step.castShadow = true;
      step.receiveShadow = true;
      this._group.add(step);
    }

    // Stairside railings (broken)
    for (let side = -1; side <= 1; side += 2) {
      const railingSegments = 6 + Math.floor(Math.random() * 4);
      for (let i = 0; i < railingSegments; i++) {
        // Baluster
        const balusterGeo = this.createWeatheredCylinder(0.04, 0.05, 0.8, 8);
        const baluster = new THREE.Mesh(balusterGeo, this.stoneMaterial);
        baluster.position.set(
          side * 2.3,
          0.6 + 0.11 + i * 0.20 + 0.4,
          -85.5 - i * 0.72
        );
        baluster.rotation.z = (Math.random() - 0.5) * 0.15;
        baluster.castShadow = true;
        this._group.add(baluster);

        // Skip some for broken look
        if (i < railingSegments - 1 && Math.random() > 0.25) {
          // Top rail segment
          const railGeo = this.createWeatheredBox(0.12, 0.08, 0.85, 0.03);
          const rail = new THREE.Mesh(railGeo, this.stoneMaterial);
          const nextY = 0.6 + 0.11 + (i + 1) * 0.20 + 0.4;
          rail.position.set(
            side * 2.3,
            (0.6 + 0.11 + i * 0.20 + 0.4 + nextY) * 0.5,
            -85.5 - i * 0.72 - 0.36
          );
          rail.rotation.z = (Math.random() - 0.5) * 0.1;
          rail.castShadow = true;
          this._group.add(rail);
        }
      }
    }
  }

  // ── Volumetric moss clusters ─────────────────────────────────────────────

  private createMossOnSurfaces(): void {
    // Moss on column tops
    const columnPositions = [
      { x: -5.5, z: -75 }, { x: -2.2, z: -75 }, { x: 2.2, z: -75 }, { x: 5.5, z: -75 },
      { x: -5.5, z: -68 }, { x: -2.2, z: -68 }, { x: 2.2, z: -68 }, { x: 5.5, z: -68 },
    ];

    for (const pos of columnPositions) {
      if (Math.random() > 0.4) {
        const moss = this.createMossCluster(0.3 + Math.random() * 0.4);
        moss.position.set(pos.x, 4 + Math.random() * 2.5, pos.z);
        moss.scale.set(1.8, 0.4, 1.8);
        this._group.add(moss);
      }
    }

    // Moss on ground around ruins
    for (let i = 0; i < 30; i++) {
      const moss = this.createMossCluster(0.2 + Math.random() * 0.8);
      moss.position.set(
        (Math.random() - 0.5) * 18,
        0.06,
        -75 + (Math.random() - 0.5) * 20
      );
      moss.scale.set(1, 0.25, 1);
      this._group.add(moss);
    }
  }

  private createMossCluster(radius: number): THREE.Group {
    const cluster = new THREE.Group();
    const blobCount = 4 + Math.floor(Math.random() * 6);

    for (let i = 0; i < blobCount; i++) {
      const blobRadius = radius * (0.3 + Math.random() * 0.7);
      const geo = new THREE.SphereGeometry(blobRadius, 8, 5);

      // Deform for organic shape
      const pos = geo.attributes.position;
      for (let j = 0; j < pos.count; j++) {
        const px = pos.getX(j);
        const py = pos.getY(j);
        const pz = pos.getZ(j);
        const n = this.noise.fbm(px * 6, pz * 6, 2) * radius * 0.2;
        pos.setXYZ(j, px + n, py * 0.35 + n * 0.3, pz + n);
      }
      geo.computeVertexNormals();

      // Color variation: fresh green vs older darker green
      const fresh = Math.random() > 0.5;
      const color = new THREE.Color(
        fresh ? 0.12 + Math.random() * 0.1 : 0.06 + Math.random() * 0.06,
        fresh ? 0.35 + Math.random() * 0.2 : 0.2 + Math.random() * 0.15,
        fresh ? 0.06 + Math.random() * 0.04 : 0.04 + Math.random() * 0.03
      );

      const mat = this.mossMaterial.clone();
      mat.color = color;
      mat.opacity = 0.85 + Math.random() * 0.1;

      const blob = new THREE.Mesh(geo, mat);
      blob.position.set(
        (Math.random() - 0.5) * radius * 1.5,
        blobRadius * 0.2,
        (Math.random() - 0.5) * radius * 1.5
      );
      blob.castShadow = false;
      cluster.add(blob);
    }

    return cluster;
  }

  // ── Vines on ruins ──────────────────────────────────────────────────────

  private createVinesOnRuins(): void {
    const vineMat = new THREE.MeshStandardMaterial({
      color: 0x2a3a1a,
      roughness: 0.85,
      metalness: 0.0,
    });

    // Vines hanging from archway
    const archVinePositions = [
      { x: -3.5, y: 5.5, z: -71 },
      { x: 3.5, y: 5.5, z: -71 },
      { x: 0, y: 5.8, z: -71 },
    ];

    for (const pos of archVinePositions) {
      if (Math.random() > 0.4) {
        const vine = this.createDrapedVine(2 + Math.random() * 3, vineMat);
        vine.position.set(pos.x, pos.y, pos.z);
        this._group.add(vine);
      }
    }

    // Vines on column shafts
    const columnPositions = [
      { x: -5.5, z: -75 }, { x: 2.2, z: -68 }, { x: -2.2, z: -75 },
    ];

    for (const pos of columnPositions) {
      if (Math.random() > 0.5) {
        const vine = this.createDrapedVine(1.5 + Math.random() * 2.5, vineMat);
        vine.position.set(pos.x, 3 + Math.random() * 2, pos.z);
        this._group.add(vine);
      }
    }

    // Climbing vines on walls
    for (let i = 0; i < 5; i++) {
      const vine = this.createClimbingVine(vineMat);
      vine.position.set(
        (Math.random() - 0.5) * 14,
        1 + Math.random() * 2,
        -73 + (Math.random() - 0.5) * 10
      );
      this._group.add(vine);
    }
  }

  private createDrapedVine(length: number, material: THREE.MeshStandardMaterial): THREE.Group {
    const group = new THREE.Group();

    const points: THREE.Vector3[] = [];
    const segs = 16;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const x = Math.sin(t * Math.PI * 1.8 + Math.random()) * 0.15;
      const y = -t * length + Math.sin(t * Math.PI) * 1.0; // Gravity sag
      const z = Math.cos(t * Math.PI * 1.3) * 0.08;
      points.push(new THREE.Vector3(x, y, z));
    }

    const tubeGeo = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points),
      16,
      0.008,
      5,
      false
    );

    const tube = new THREE.Mesh(tubeGeo, material);
    group.add(tube);

    // Leaf clusters along vine
    const leafCount = 2 + Math.floor(Math.random() * 4);
    for (let l = 0; l < leafCount; l++) {
      const leafT = 0.3 + Math.random() * 0.6;
      const idx = Math.floor(leafT * segs);
      if (idx < points.length) {
        const leafGeo = new THREE.CircleGeometry(0.035, 5);
        const leafMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(0.08 + Math.random() * 0.08, 0.28 + Math.random() * 0.15, 0.04 + Math.random() * 0.03),
          roughness: 0.65,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8,
        });
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.position.copy(points[idx]);
        leaf.position.x += (Math.random() - 0.5) * 0.2;
        leaf.position.z += (Math.random() - 0.5) * 0.2;
        leaf.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI * 2, Math.random() * Math.PI);
        group.add(leaf);
      }
    }

    return group;
  }

  private createClimbingVine(material: THREE.MeshStandardMaterial): THREE.Group {
    const group = new THREE.Group();
    const height = 2 + Math.random() * 3;

    // Main climbing vine: spiral up
    const points: THREE.Vector3[] = [];
    const segs = 20;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const angle = t * Math.PI * 3;
      const radius = 0.08;
      const x = Math.cos(angle) * radius;
      const y = t * height;
      const z = Math.sin(angle) * radius;
      points.push(new THREE.Vector3(x, y, z));
    }

    const tubeGeo = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points),
      20,
      0.006,
      4,
      false
    );

    const tube = new THREE.Mesh(tubeGeo, material);
    group.add(tube);

    return group;
  }

  // ── Decorative carved stones ─────────────────────────────────────────────

  private createDecorativeStones(): void {
    for (let i = 0; i < 20; i++) {
      const size = 0.15 + Math.random() * 0.6;
      const geo = this.createWeatheredBox(size, size * 0.4, size * 0.5, size * 0.08);

      const stone = new THREE.Mesh(geo, this.stoneMaterial);
      stone.position.set(
        (Math.random() - 0.5) * 16,
        size * 0.2,
        -75 + (Math.random() - 0.5) * 14
      );
      stone.rotation.set(
        (Math.random() - 0.5) * 0.2,
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * 0.3
      );
      stone.castShadow = true;
      stone.receiveShadow = true;
      this._group.add(stone);
    }
  }

  // ── Water puddle near ruins ─────────────────────────────────────────────

  private createWaterPuddle(): void {
    // Shallow puddle on the platform near the waterfall area
    const puddleGeo = new THREE.CircleGeometry(2.5, 24);
    const puddleMat = new THREE.MeshStandardMaterial({
      color: 0x1a2a2a,
      roughness: 0.1,
      metalness: 0.3,
      transparent: true,
      opacity: 0.7,
    });
    const puddle = new THREE.Mesh(puddleGeo, puddleMat);
    puddle.rotation.x = -Math.PI * 0.5;
    puddle.position.set(2, 0.62, -70);
    this._group.add(puddle);
  }

  // ── Helper: create weathered box geometry ────────────────────────────────

  private createWeatheredBox(w: number, h: number, d: number, weathering: number): THREE.BufferGeometry {
    const geo = new THREE.BoxGeometry(w, h, d, 8, 4, 8);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);

      // Edge rounding
      const halfW = w * 0.5, halfH = h * 0.5, halfD = d * 0.5;
      const edgeDistX = Math.abs(x) / halfW;
      const edgeDistY = Math.abs(y) / halfH;
      const edgeDistZ = Math.abs(z) / halfD;
      const maxEdge = Math.max(edgeDistX, edgeDistY, edgeDistZ);

      if (maxEdge > 0.85) {
        const edgeFactor = (maxEdge - 0.85) / 0.15;
        // Round edges
        if (edgeDistX > edgeDistZ && edgeDistX > edgeDistY) {
          pos.setX(i, x - Math.sign(x) * edgeFactor * weathering * 0.1);
        }
        if (edgeDistY > edgeDistX && edgeDistY > edgeDistZ) {
          pos.setY(i, y - Math.sign(y) * edgeFactor * weathering * 0.08);
        }
        if (edgeDistZ > edgeDistX && edgeDistZ > edgeDistY) {
          pos.setZ(i, z - Math.sign(z) * edgeFactor * weathering * 0.1);
        }
      }

      // Organic noise displacement
      const n = this.noise.fbm(x * 3, z * 3, 2) * weathering * 0.05;
      pos.setX(i, x + n * 0.5);
      pos.setY(i, y + n * 0.3);
      pos.setZ(i, z + n * 0.5);
    }

    geo.computeVertexNormals();
    return geo;
  }

  // ── Helper: create fluted column geometry ────────────────────────────────

  private createFlutedColumn(height: number, baseRadius: number, fluteCount: number, ringCount: number): THREE.BufferGeometry {
    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];

    for (let r = 0; r <= ringCount; r++) {
      const t = r / ringCount;
      const y = t * height;
      // Taper
      const radius = baseRadius * (1 - t * 0.12);
      // Organic variation
      const organic = this.noise.fbm(t * 5, 0, 2) * 0.02;

      for (let f = 0; f <= fluteCount; f++) {
        const angle = (f / fluteCount) * Math.PI * 2;
        // Fluting: semi-circular groove
        const fluteAngle = angle - Math.floor(angle / (Math.PI * 2 / fluteCount)) * (Math.PI * 2 / fluteCount);
        const fluteDepth = Math.cos(fluteAngle) * 0.025;
        // Only flute the outer half of each flute segment
        const fluteFactor = fluteAngle < Math.PI / fluteCount ? 1 : 0;
        const r2 = radius + fluteDepth * fluteFactor + organic;

        vertices.push(
          Math.cos(angle) * r2,
          y,
          Math.sin(angle) * r2
        );
        uvs.push(f / fluteCount, t);
      }
    }

    for (let r = 0; r < ringCount; r++) {
      for (let f = 0; f < fluteCount; f++) {
        const a = r * (fluteCount + 1) + f;
        const b = a + 1;
        const c = (r + 1) * (fluteCount + 1) + f;
        const d = c + 1;
        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  // ── Helper: create weathered cylinder ────────────────────────────────────

  private createWeatheredCylinder(radiusTop: number, radiusBottom: number, height: number, segments: number): THREE.BufferGeometry {
    const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments, 4);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);

      // Organic variation
      const n = this.noise.fbm(x * 4, z * 4, 2) * 0.02;
      pos.setX(i, x + n);
      pos.setZ(i, z + n);

      // Edge weathering
      const edgeDist = Math.abs(y) / (height * 0.5);
      if (edgeDist > 0.8) {
        pos.setY(i, y - Math.sign(y) * (edgeDist - 0.8) * 0.03);
      }
    }

    geo.computeVertexNormals();
    return geo;
  }

  // ── Helper: create jagged cylinder (broken column piece) ──────────────────

  private createJaggedCylinder(length: number, radiusTop: number, radiusBottom: number, segments: number): THREE.BufferGeometry {
    const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, length, segments, 6);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);

      // Organic variation
      const n = this.noise.fbm(x * 3, z * 3, 2) * 0.03;
      pos.setX(i, x + n);
      pos.setZ(i, z + n);

      // Jagged top edge
      const t = (y / length) + 0.5;
      if (t > 0.85) {
        const jag = this.noise.fbm(x * 10, z * 10, 2) * 0.08 * (t - 0.85) * 6;
        pos.setY(i, y + jag);
      }
    }

    geo.computeVertexNormals();
    return geo;
  }

  // ── Helper: create wedge geometry for arch voussoirs ─────────────────────

  private createWedgeGeometry(
    innerRadius: number,
    outerRadius: number,
    thickness: number,
    angle1: number,
    angle2: number
  ): THREE.BufferGeometry {
    const segments = 6;
    const rings = 3;
    const vertices: number[] = [];
    const indices: number[] = [];

    for (let r = 0; r <= rings; r++) {
      const t = r / rings;
      const radius = innerRadius + (outerRadius - innerRadius) * t;
      const y = (t - 0.5) * thickness;

      for (let s = 0; s <= segments; s++) {
        const a = angle1 + (angle2 - angle1) * (s / segments);
        vertices.push(
          Math.cos(a) * radius,
          y,
          Math.sin(a) * radius
        );
      }
    }

    for (let r = 0; r < rings; r++) {
      for (let s = 0; s < segments; s++) {
        const a = r * (segments + 1) + s;
        const b = a + 1;
        const c = (r + 1) * (segments + 1) + s;
        const d = c + 1;
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  update(_delta: number, _elapsed: number): void {
    // Ruins are static
  }
}
