import * as THREE from 'three';

// ─── Simplex Noise (2D/3D with seeded permutation) ─────────────────────────────

class SimplexNoise {
  private readonly grad3: [number, number, number][] = [
    [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
    [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
    [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
  ];
  private readonly perm: number[];

  constructor(seed = 42) {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16805 + (i % 1000)) % 2147483647;
      const j = s % (i + 1);
      [p[i], p[j]] = [p[j], p[i]];
    }
    const permTemp: number[] = new Array(512);
    for (let i = 0; i < 512; i++) permTemp[i] = p[i & 255];
    this.perm = permTemp;
  }

  private dot3(g: [number, number, number], x: number, y: number, z: number): number {
    return g[0] * x + g[1] * y + g[2] * z;
  }

  noise2D(x: number, y: number): number {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const i1 = x > X0 + t ? 1 : 0;
    const j1 = y > Y0 + t ? 1 : 0;
    const x1 = x - X0 + i1 * G2;
    const y1 = y - Y0 + j1 * G2;
    const x2 = x - X0 + 2 * G2;
    const y2 = y - Y0 + 2 * G2;
    const ii = i & 255;
    const jj = j & 255;
    const gi0 = this.perm[ii + this.perm[jj]] % 12;
    const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;
    const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;
    let n0 = 0, n1 = 0, n2 = 0;
    let t0 = 0.5 - x1 * x1 - y1 * y1;
    if (t0 >= 0) { t0 *= t0; n0 = t0 * t0 * this.dot3(this.grad3[gi0], x1, y1, 0); }
    let t1 = 0.5 - x2 * x2 - y2 * y2;
    if (t1 >= 0) { t1 *= t1; n1 = t1 * t1 * this.dot3(this.grad3[gi1], x2, y2, 0); }
    let t2 = 0.5 - x1 * x1 - y1 * y1;
    if (t2 >= 0) { t2 *= t2; n2 = t2 * t2 * this.dot3(this.grad3[gi2], x1, y1, 0); }
    return 70 * (n0 + n1 + n2);
  }

  noise3D(x: number, y: number, z: number): number {
    const F3 = 1 / 3;
    const G3 = 1 / 6;
    const s = (x + y + z) * F3;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const k = Math.floor(z + s);
    const t = (i + j + k) * G3;
    const X0 = i - t;
    const Y0 = j - t;
    const Z0 = k - t;
    let i1, j1, k1, i2, j2, k2;
    if (x >= X0 + t) { if (y >= Y0 + t) { i1 = 1; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      else { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; } }
    else { if (y < Y0 + t) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 0; k2 = 1; }
      else { i1 = 0; j1 = 0; k1 = 0; i2 = 0; j2 = 1; k2 = 1; } }
    const x1 = x - X0 + (i1 - 0.5) * G3;
    const y1 = y - Y0 + (j1 - 0.5) * G3;
    const z1 = z - Z0 + (k1 - 0.5) * G3;
    const x2 = x - X0 + (i2 - 0.5) * G3;
    const y2 = y - Y0 + (j2 - 0.5) * G3;
    const z2 = z - Z0 + (k2 - 0.5) * G3;
    const x3 = x - X0 - 0.5 * G3;
    const y3 = y - Y0 - 0.5 * G3;
    const z3 = z - Z0 - 0.5 * G3;
    const ii = i & 255;
    const jj = j & 255;
    const kk = k & 255;
    const gi0 = this.perm[ii + this.perm[jj + this.perm[kk]]] % 12;
    const gi1 = this.perm[ii + i1 + this.perm[jj + j1 + this.perm[kk + k1]]] % 12;
    const gi2 = this.perm[ii + i2 + this.perm[jj + j2 + this.perm[kk + k2]]] % 12;
    const gi3 = this.perm[ii + 1 + this.perm[jj + 1 + this.perm[kk + 1]]] % 12;
    let n0 = 0, n1 = 0, n2 = 0, n3 = 0;
    let t0 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t0 >= 0) { t0 *= t0; n0 = t0 * t0 * this.dot3(this.grad3[gi0], x1, y1, z1); }
    let t1 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t1 >= 0) { t1 *= t1; n1 = t1 * t1 * this.dot3(this.grad3[gi1], x2, y2, z2); }
    let t2 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t2 >= 0) { t2 *= t2; n2 = t2 * t2 * this.dot3(this.grad3[gi2], x3, y3, z3); }
    let t3 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t3 >= 0) { t3 *= t3; n3 = t3 * t3 * this.dot3(this.grad3[gi3], x1, y1, z1); }
    return 32 * (n0 + n1 + n2 + n3);
  }

  /** Fractional Brownian Motion — layered noise for terrain detail */
  fbm(x: number, y: number, octaves: number = 6, lacunarity: number = 2, gain: number = 0.5): number {
    let value = 0, amplitude = 0.5, frequency = 1, maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      value += amplitude * this.noise2D(x * frequency, y * frequency);
      maxValue += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }
    return value / maxValue;
  }

  /** Ridged FBM — creates mountain-like ridges, ideal for cliff faces and erosion */
  ridgedFbm(x: number, y: number, octaves: number = 5, lacunarity: number = 2.1, gain: number = 0.4): number {
    let value = 0, amplitude = 0.5, frequency = 1, maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      let n = this.noise2D(x * frequency, y * frequency);
      n = 1 - Math.abs(n) * 2;
      n = n * n;
      value += amplitude * n;
      maxValue += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }
    return value / maxValue;
  }
}

// ─── Path definition ──────────────────────────────────────────────────────────

export interface PathPoint {
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  normal: THREE.Vector3;
}

// ─── Terrain ──────────────────────────────────────────────────────────────────

export class Terrain {
  private readonly noise = new SimplexNoise(42);
  private readonly noise2 = new SimplexNoise(137);
  private readonly noise3 = new SimplexNoise(999);
  private path: PathPoint[] = [];
  private readonly _group = new THREE.Group();
  private readonly terrainSize = 240;
  private readonly segments: number;

  get group(): THREE.Group { return this._group; }

  constructor() {
    // Reduce geometry complexity in headless mode
    const headless = (window as any).__DISABLE_POST_PROCESSING === true;
    this.segments = headless ? 128 : 384;
    this.generatePath();
    this.createTerrain();
    this.createPathSurface();
    this.createRiverBed();
  }

  // ── Path generation: winding trail through 4 distinct zones ──────────────

  private generatePath(): void {
    const points: PathPoint[] = [];
    const segs = 600;

    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const z = -t * 130;

      // Zone 1 (0-0.25): Dense canopy, tight winding trail
      // Zone 2 (0.25-0.55): Medium curves, trail narrows slightly
      // Zone 3 (0.55-0.80): Opening clearing, wider path
      // Zone 4 (0.80-1.0): Ruins and waterfall area
      let x: number;
      if (t < 0.25) {
        x = Math.sin(t * 22) * 2.2 + Math.sin(t * 13.7) * 1.0 + Math.cos(t * 8.3) * 0.6;
      } else if (t < 0.55) {
        x = Math.sin(t * 10) * 3.5 + Math.sin(t * 6.3) * 1.8 + Math.cos(t * 4.1) * 1.0;
      } else if (t < 0.80) {
        x = Math.sin(t * 5) * 5.0 + Math.cos(t * 2.3) * 2.8 + Math.sin(t * 1.7) * 1.2;
      } else {
        const baseX = Math.sin(0.8 * 5) * 5.0 + Math.cos(0.8 * 2.3) * 2.8 + Math.sin(0.8 * 1.7) * 1.2;
        const blend = (t - 0.8) / 0.2;
        x = THREE.MathUtils.lerp(baseX, Math.sin(t * 3) * 4.0, blend * 0.5)
          + Math.sin(t * 7.1) * 0.8;
      }

      // Elevation: gentle undulation, slight dip at waterfall
      let elevation = this.noise.fbm(t * 5, 0.5, 5) * 1.2 - 0.2;
      if (t > 0.75) {
        elevation -= (t - 0.75) * 3.0; // Erosion toward waterfall
      }

      const pos = new THREE.Vector3(x, elevation, z);
      points.push({ position: pos, tangent: new THREE.Vector3(), normal: new THREE.Vector3() });
    }

    // Compute tangents via central differences
    for (let i = 0; i < points.length; i++) {
      const prev = i > 0 ? points[i - 1].position : points[0].position;
      const next = i < points.length - 1 ? points[i + 1].position : points[points.length - 1].position;
      const tangent = new THREE.Vector3().subVectors(next, prev).normalize();
      points[i].tangent = tangent;
      points[i].normal = new THREE.Vector3(0, 1, 0);
    }

    this.path = points;
  }

  // ── Height function: multi-layered terrain with canyon walls, erosion ────

  private getHeightAt(x: number, z: number): number {
    // ── Base terrain: large-scale undulation (3-4 cycles over terrain width) ──
    let height = this.noise.fbm(x * 0.035, z * 0.035, 6) * 5;
    height += this.noise.ridgedFbm(x * 0.05, z * 0.05, 5) * 3;

    // Medium detail: adds texture and small ridges
    height += this.noise2.fbm(x * 0.12, z * 0.12, 4) * 0.8;

    // Fine detail: surface texture
    height += this.noise3.fbm(x * 0.3, z * 0.3, 3) * 0.3;

    // ── Canyon wall carving: steep walls alongside the path ──
    const pathCenterX = this.getPathX(z);
    const distFromPath = x - pathCenterX;
    const absDist = Math.abs(distFromPath);

    // Path floor: narrow, smooth carving
    if (absDist < 2.2) {
      const pathHeight = this.getPathHeight(z);
      const blend = 1 - Math.pow(Math.min(absDist / 2.2, 1), 2);
      height = THREE.MathUtils.lerp(height, pathHeight - 0.15, blend);
    }

    // Canyon wall: steep rise from path to wall top
    if (absDist >= 2.2 && absDist < 8.0) {
      const wallT = (absDist - 2.2) / 5.8; // 0..1 across wall zone
      const wallHeight = Math.pow(wallT, 0.6) * 10;
      const wallTexture = this.noise.ridgedFbm(
        x * 0.3 + z * 0.05, z * 0.1, 5
      ) * 2.5;
      const wallBlend = Math.min(wallT * 2.5, 1);
      height = THREE.MathUtils.lerp(
        height,
        wallHeight + wallTexture,
        wallBlend
      );
    }

    // Path shoulder: slight berm at wall base
    if (absDist >= 8.0 && absDist < 10.0) {
      const shoulder = (1 - (absDist - 8.0) / 2.0) * 0.5;
      height += shoulder;
    }

    // ── Cliff face behind ruins (z < -115): ridged FBM with stratification ──
    const cliffT = Math.max(0, Math.min(1, (z + 115) / 18));
    if (cliffT > 0 && cliffT < 1) {
      if (absDist >= 2.2) {
        // Ridged FBM for natural rock face (not a sine wave)
        const cliffNoise = this.noise.ridgedFbm(
          x * 0.25 + z * 0.03, z * 0.08, 6
        );
        const cliffHeight = cliffT * 12 * (0.4 + cliffNoise * 2.0);

        // Vertical fractures: asymmetric noise (steep on one side)
        const fracture = Math.sin(
          x * 0.5 + this.noise.fbm(x * 0.3, z * 0.06, 5) * 5
        ) * 2.0;

        // Horizontal stratification (sedimentary layers)
        const stratification = Math.sin(
          x * 1.2 + z * 0.3 + this.noise2.fbm(x * 0.2, z * 0.1, 3) * 3
        ) * 0.8;

        // Talus slope at base: loose rock debris
        const talusT = Math.max(0, cliffT / 0.15);
        const talus = (1 - talusT) * 2.5 * (1 + this.noise.fbm(
          x * 0.4, z * 0.25, 4
        ) * 0.6);

        const combined = cliffHeight + fracture + stratification + talus;
        const capped = Math.min(combined, 16);
        if (capped > height) {
          height = capped;
        }
      }
    }

    // River depression near waterfall
    if (z < -88) {
      const riverDepression = (z + 88) / 20 * 3;
      height = Math.min(height, height + riverDepression);
    }

    return height;
  }

  // ── Main terrain mesh ────────────────────────────────────────────────────

  private createTerrain(): void {
    const size = this.terrainSize;
    const segs = this.segments;
    const geometry = new THREE.PlaneGeometry(size, size, segs, segs);
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    const heights = new Float32Array(positions.count);

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      const height = this.getHeightAt(x, z);
      positions.setY(i, height);
      heights[i] = height;

      // ── Vertex colors: photorealistic jungle ground ────────────────────
      // Real jungle soil: warm dark brown (low blue, low green)
      // rgb ~ (0.15-0.25, 0.08-0.15, 0.04-0.08)
      const distFromPath = Math.abs(x - this.getPathX(z));
      const normalizedHeight = THREE.MathUtils.clamp((height + 1) / 16, 0, 1);

      let r: number, g: number, b: number;

      // River bed: dark warm grey (NOT blue-grey)
      if (height < -0.5) {
        r = 0.12 + normalizedHeight * 0.08;
        g = 0.10 + normalizedHeight * 0.06;
        b = 0.06 + normalizedHeight * 0.04;
      }
      // Jungle floor: rich dark brown organic soil
      else if (height < 1.0) {
        r = 0.18 + normalizedHeight * 0.06;
        g = 0.10 + normalizedHeight * 0.04;
        b = 0.05 + normalizedHeight * 0.02;
      }
      // Mid-elevation: earth with moss patches
      else if (height < 5.0) {
        r = 0.20 + normalizedHeight * 0.05;
        g = 0.14 + normalizedHeight * 0.05;
        b = 0.07 + normalizedHeight * 0.03;
      }
      // High ground: rocky
      else {
        r = 0.28 + normalizedHeight * 0.08;
        g = 0.24 + normalizedHeight * 0.06;
        b = 0.18 + normalizedHeight * 0.04;
      }

      // Organic noise variation (not uniform bands)
      const nv1 = this.noise.fbm(x * 0.10, z * 0.10, 4) * 0.06;
      const nv2 = this.noise2.fbm(x * 0.25, z * 0.25, 3) * 0.03;
      r += nv1 + nv2;
      g += nv1 * 0.65 + nv2 * 0.4;
      b += nv1 * 0.25 + nv2 * 0.15;

      // Moss band near path edges (wide green zone)
      const mossFactor = Math.exp(-distFromPath * 0.2) * 0.18;
      g += mossFactor * 1.2;
      r -= mossFactor * 0.15;
      b -= mossFactor * 0.05;

      // Canyon wall coloring: rocky vertical faces with moss drips
      if (distFromPath >= 2.2 && distFromPath < 8.0) {
        const wallT = (distFromPath - 2.2) / 5.8;
        const wallRock = 0.22 + this.noise.fbm(x * 0.4, z * 0.4, 4) * 0.08;
        const wallStriation = Math.sin(x * 2.0 + z * 0.5) * 0.03;
        const wallNoise = this.noise2.fbm(x * 0.6, z * 0.6, 3) * 0.04;
        r = THREE.MathUtils.lerp(r, wallRock + wallStriation + wallNoise, wallT * 0.8);
        g = THREE.MathUtils.lerp(g, wallRock * 0.85 + wallStriation * 0.7 + wallNoise * 0.6, wallT * 0.8);
        b = THREE.MathUtils.lerp(b, wallRock * 0.7 + wallNoise * 0.4, wallT * 0.8);
        // Moss drip: green streaks running down walls
        const mossDrip = Math.sin(x * 3.0 + this.noise.fbm(x * 0.5, z * 0.3, 4) * 8) * 0.5 + 0.5;
        if (mossDrip > 0.7 && height < 3) {
          const dripFactor = (mossDrip - 0.7) * 3.0 * (1 - wallT);
          g += dripFactor * 0.12;
          r -= dripFactor * 0.06;
        }
      }

      // Leaf litter patches (darker brown spots)
      const leafLitter = this.noise2.fbm(x * 0.5, z * 0.5, 3);
      if (leafLitter > 0.3 && height > -0.5 && height < 1.5) {
        const llFactor = (leafLitter - 0.3) * 2.0;
        r += llFactor * 0.04;
        g += llFactor * 0.02;
        b -= llFactor * 0.02;
      }

      // Wetness near river/waterfall: darker, slight blue-green tint
      if (z < -80) {
        const wetFactor = Math.max(0, 1 - Math.abs(z + 100) / 18);
        r -= wetFactor * 0.04;
        g -= wetFactor * 0.02;
        b += wetFactor * 0.03;
      }

      // Cliff face coloring (rocky grey-brown)
      const cliffT = Math.max(0, Math.min(1, (z + 115) / 22));
      if (cliffT > 0.1 && height > 2) {
        const rockFactor = Math.min((height - 2) / 12, 1);
        r = THREE.MathUtils.lerp(r, 0.24 + this.noise.fbm(x * 0.3, z * 0.3, 3) * 0.08, rockFactor);
        g = THREE.MathUtils.lerp(g, 0.21 + this.noise.fbm(x * 0.3 + 100, z * 0.3, 3) * 0.06, rockFactor);
        b = THREE.MathUtils.lerp(b, 0.17 + this.noise.fbm(x * 0.3 + 200, z * 0.3, 3) * 0.05, rockFactor);
      }

      colors[i * 3] = THREE.MathUtils.clamp(r, 0, 1);
      colors[i * 3 + 1] = THREE.MathUtils.clamp(g, 0, 1);
      colors[i * 3 + 2] = THREE.MathUtils.clamp(b, 0, 1);
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // True surface normals from height function (not from geometry)
    this.computeTerrainNormals(geometry, geometry.attributes.position as THREE.BufferAttribute);

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1.0,
      metalness: 0.0,
      flatShading: false,
    });

    const terrain = new THREE.Mesh(geometry, material);
    terrain.receiveShadow = true;
    this._group.add(terrain);
  }

  // ── True surface normals from height function ────────────────────────────

  private computeTerrainNormals(geometry: THREE.BufferGeometry, positions: THREE.BufferAttribute): void {
    const step = 0.8;
    const normals = new Float32Array(positions.count * 3);

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      const hR = this.getHeightAt(x + step, z);
      const hL = this.getHeightAt(x - step, z);
      const hF = this.getHeightAt(x, z + step);
      const hB = this.getHeightAt(x, z - step);

      const tangentX = new THREE.Vector3(step, hR - hL, 0);
      const tangentZ = new THREE.Vector3(0, hF - hB, step);
      const normal = new THREE.Vector3().crossVectors(tangentX, tangentZ).normalize();

      normals[i * 3] = normal.x;
      normals[i * 3 + 1] = normal.y;
      normals[i * 3 + 2] = normal.z;
    }

    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  }

  // ── Path surface with procedural textures ────────────────────────────────

  private createPathSurface(): void {
    const segments = this.path.length - 1;
    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];

    for (let i = 0; i < this.path.length - 1; i++) {
      const p1 = this.path[i];
      const p2 = this.path[i + 1];
      const dir = new THREE.Vector3().subVectors(p2.position, p1.position);
      const perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

      const t = i / segments;
      let width: number;
      if (t < 0.25) width = 1.1 + Math.sin(t * 20) * 0.25;
      else if (t < 0.55) width = 1.4 + Math.sin(t * 12) * 0.2;
      else if (t < 0.80) width = 1.8 + Math.sin(t * 6) * 0.25;
      else width = 2.2 + Math.sin(t * 3) * 0.3;

      const h1 = this.getPathHeight(p1.position.z);

      const baseIdx = i * 2;
      vertices.push(
        p1.position.x + perp.x * width, h1 + 0.02, p1.position.z + perp.z * width,
        p1.position.x - perp.x * width, h1 + 0.02, p1.position.z - perp.z * width,
      );
      uvs.push(0, i * 0.6, 1, i * 0.6);

      if (i > 0) {
        indices.push(baseIdx - 2, baseIdx, baseIdx - 1, baseIdx - 2, baseIdx - 1, baseIdx + 1);
      }
      indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
      indices.push(baseIdx + 1, baseIdx + 3, baseIdx + 2);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();

    const { colorMap, normalMap, roughMap } = this.createPathTexture();

    const material = new THREE.MeshStandardMaterial({
      map: colorMap,
      normalMap: normalMap,
      normalScale: new THREE.Vector2(1.2, 1.2),
      roughnessMap: roughMap,
      roughness: 0.95,
      metalness: 0.0,
      color: 0x3a3328,
    });

    const pathMesh = new THREE.Mesh(geometry, material);
    pathMesh.receiveShadow = true;
    this._group.add(pathMesh);
  }

  // ── Procedural path texture: packed earth, foot impressions, stones ──────

  private createPathTexture(): {
    colorMap: THREE.CanvasTexture;
    normalMap: THREE.CanvasTexture;
    roughMap: THREE.CanvasTexture;
  } {
    const size = 1024;

    // ── Color map: packed earth with organic detail ──────────────────────
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = size;
    colorCanvas.height = size;
    const ctx = colorCanvas.getContext('2d')!;

    // Base: warm dark brown packed earth (not uniform)
    ctx.fillStyle = '#231c13';
    ctx.fillRect(0, 0, size, size);

    // Fine packed-earth grain: varied particle sizes, not uniform dots
    for (let i = 0; i < 30000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = Math.random() * 1.8 + 0.2;
      const brightness = Math.random() * 20 - 10;
      const base = 35 + brightness;
      ctx.fillStyle = `rgba(${base + 8}, ${base + 3}, ${base - 5}, ${0.15 + Math.random() * 0.2})`;
      ctx.beginPath();
      ctx.ellipse(x, y, r * (1 + Math.random()), r, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    // Packed-earth compression rings (foot traffic wear patterns)
    for (let i = 0; i < 300; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const rx = 5 + Math.random() * 15;
      const ry = 2.5 + Math.random() * 8;
      ctx.strokeStyle = `rgba(${30 + Math.random() * 15}, ${24 + Math.random() * 10}, ${14 + Math.random() * 8}, ${0.06 + Math.random() * 0.06})`;
      ctx.lineWidth = 0.5 + Math.random() * 0.8;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Stones of varied sizes and shapes (not perfect circles)
    for (let i = 0; i < 800; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const rx = 1.5 + Math.random() * 5;
      const ry = 1 + Math.random() * 3.5;
      const shade = 55 + Math.random() * 60;
      ctx.fillStyle = `rgb(${shade + 8}, ${shade + 3}, ${shade - 5})`;
      ctx.beginPath();
      const pts = 5 + Math.floor(Math.random() * 4);
      for (let p = 0; p <= pts; p++) {
        const angle = (p / pts) * Math.PI * 2;
        const radius = (rx + ry) / 2 * (0.55 + Math.random() * 0.8);
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        if (p === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.fill();
    }

    // Darker worn patches (compaction from foot traffic)
    for (let i = 0; i < 120; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 6 + Math.random() * 20;
      ctx.fillStyle = `rgba(18, 14, 9, ${0.06 + Math.random() * 0.08})`;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 2, r, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    // Lighter worn patches (bare soil exposure)
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 4 + Math.random() * 12;
      ctx.fillStyle = `rgba(55, 45, 30, ${0.05 + Math.random() * 0.06})`;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.5, r * 0.7, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    const colorTexture = new THREE.CanvasTexture(colorCanvas);
    colorTexture.wrapS = THREE.RepeatWrapping;
    colorTexture.wrapT = THREE.RepeatWrapping;
    colorTexture.repeat.set(1, 12);
    colorTexture.colorSpace = THREE.SRGBColorSpace;

    // ── Normal map: fine grain + stone bumps ─────────────────────────────
    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = 512;
    normalCanvas.height = 512;
    const nCtx = normalCanvas.getContext('2d')!;

    nCtx.fillStyle = 'rgb(128, 128, 255)';
    nCtx.fillRect(0, 0, 512, 512);

    // Fine grain bumps
    for (let i = 0; i < 20000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = 0.3 + Math.random() * 2.5;
      const rVal = 128 + (Math.random() - 0.5) * 60;
      const gVal = 128 + (Math.random() - 0.5) * 60;
      nCtx.fillStyle = `rgba(${Math.floor(rVal)}, ${Math.floor(gVal)}, 255, ${0.1 + Math.random() * 0.15})`;
      nCtx.beginPath();
      nCtx.arc(x, y, r, 0, Math.PI * 2);
      nCtx.fill();
    }

    // Stone bumps
    for (let i = 0; i < 800; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = 2 + Math.random() * 6;
      const rVal = 128 + (Math.random() - 0.5) * 100;
      const gVal = 128 + (Math.random() - 0.5) * 100;
      nCtx.fillStyle = `rgba(${Math.floor(rVal)}, ${Math.floor(gVal)}, 255, ${0.2 + Math.random() * 0.2})`;
      nCtx.beginPath();
      nCtx.arc(x, y, r, 0, Math.PI * 2);
      nCtx.fill();
    }

    // Compression ring bumps
    for (let i = 0; i < 150; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const rx = 4 + Math.random() * 10;
      const ry = 2 + Math.random() * 5;
      nCtx.strokeStyle = `rgba(${115 + Math.floor(Math.random() * 35)}, ${115 + Math.floor(Math.random() * 35)}, 255, 0.15)`;
      nCtx.lineWidth = 1 + Math.random() * 1.5;
      nCtx.beginPath();
      nCtx.ellipse(x, y, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
      nCtx.stroke();
    }

    const normalTexture = new THREE.CanvasTexture(normalCanvas);
    normalTexture.wrapS = THREE.RepeatWrapping;
    normalTexture.wrapT = THREE.RepeatWrapping;
    normalTexture.repeat.set(1, 12);

    // ── Roughness map: packed earth is uniformly rough ───────────────────
    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = 256;
    roughCanvas.height = 256;
    const rCtx = roughCanvas.getContext('2d')!;
    rCtx.fillStyle = '#e0d8cc';
    rCtx.fillRect(0, 0, 256, 256);

    // Slight variation
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const shade = 200 + Math.floor(Math.random() * 40);
      rCtx.fillStyle = `rgba(${shade}, ${shade}, ${shade}, 0.1)`;
      rCtx.fillRect(x, y, 1 + Math.random() * 3, 1 + Math.random() * 3);
    }

    const roughTexture = new THREE.CanvasTexture(roughCanvas);
    roughTexture.wrapS = THREE.RepeatWrapping;
    roughTexture.wrapT = THREE.RepeatWrapping;
    roughTexture.repeat.set(1, 12);

    return { colorMap: colorTexture, normalMap: normalTexture, roughMap: roughTexture };
  }

  // ── River bed depression ─────────────────────────────────────────────────

  private createRiverBed(): void {
    // River bed near waterfall: dark, wet-looking, slight undulation
    const width = 8;
    const length = 25;
    const segments = 32;

    const geometry = new THREE.PlaneGeometry(width, length, segments, Math.floor(segments * 2));
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      // Slight undulation for natural river bed
      const undulation = this.noise.fbm(x * 0.5, z * 0.3, 3) * 0.15;
      positions.setY(i, undulation - 0.6);
    }
    geometry.computeVertexNormals();

    // River bed color: dark warm grey-green (wet sediment)
    const colors = new Float32Array(positions.count * 3);
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const nv = this.noise.fbm(x * 0.3, z * 0.3, 3) * 0.05;
      colors[i * 3] = 0.10 + nv;
      colors[i * 3 + 1] = 0.11 + nv * 0.8;
      colors[i * 3 + 2] = 0.06 + nv * 0.5;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.0,
    });

    const riverBed = new THREE.Mesh(geometry, material);
    riverBed.position.set(0, 0, -100);
    riverBed.receiveShadow = true;
    this._group.add(riverBed);
  }

  // ── Helper: get path X at a given Z ──────────────────────────────────────

  private getPathX(z: number): number {
    const t = -z / 130;
    if (t < 0.25) {
      return Math.sin(t * 22) * 2.2 + Math.sin(t * 13.7) * 1.0 + Math.cos(t * 8.3) * 0.6;
    } else if (t < 0.55) {
      return Math.sin(t * 10) * 3.5 + Math.sin(t * 6.3) * 1.8 + Math.cos(t * 4.1) * 1.0;
    } else if (t < 0.80) {
      return Math.sin(t * 5) * 5.0 + Math.cos(t * 2.3) * 2.8 + Math.sin(t * 1.7) * 1.2;
    } else {
      const baseX = Math.sin(0.8 * 5) * 5.0 + Math.cos(0.8 * 2.3) * 2.8 + Math.sin(0.8 * 1.7) * 1.2;
      const blend = (t - 0.8) / 0.2;
      return THREE.MathUtils.lerp(baseX, Math.sin(t * 3) * 4.0, blend * 0.5)
        + Math.sin(t * 7.1) * 0.8;
    }
  }

  private getPathHeight(z: number): number {
    const t = -z / 130;
    let elevation = this.noise.fbm(t * 5, 0.5, 5) * 1.2 - 0.2;
    if (t > 0.75) {
      elevation -= (t - 0.75) * 3.0;
    }
    return elevation;
  }

  update(_delta: number, _elapsed: number): void {
    // Terrain is static
  }
}
