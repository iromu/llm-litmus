// Quick terrain height sampler - tests the height function directly
// Run with: node --experimental-vm-modules terrain-test.mjs

class SimplexNoise {
  constructor(seed = 42) {
    const p = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16805 + (i % 1000)) % 2147483647;
      const j = s % (i + 1);
      [p[i], p[j]] = [p[j], p[i]];
    }
    this.perm = new Array(512);
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }

  noise2D(x, y) {
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
    const gi0 = this.perm[(i & 255) + this.perm[(j & 255)]] % 12;
    const gi1 = this.perm[(i & 255) + i1 + this.perm[(j & 255) + j1]] % 12;
    const gi2 = this.perm[(i & 255) + 1 + this.perm[(j & 255) + 1]] % 12;
    let n0 = 0, n1 = 0, n2 = 0;
    let t0 = 0.5 - x1*x1 - y1*y1;
    if (t0 >= 0) { t0 *= t0; n0 = t0*t0 * this.dot3(gi0, x1, y1); }
    let t1 = 0.5 - x2*x2 - y2*y2;
    if (t1 >= 0) { t1 *= t1; n1 = t1*t1 * this.dot3(gi1, x2, y2); }
    let t2 = 0.5 - x1*x1 - y1*y1;
    if (t2 >= 0) { t2 *= t2; n2 = t2*t2 * this.dot3(gi2, x1, y1); }
    return 70 * (n0 + n1 + n2);
  }

  dot3(gi, x, y) {
    const grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
    const g = grad3[gi % 12];
    return g[0]*x + g[1]*y;
  }

  fbm(x, y, octaves = 6, lacunarity = 2, gain = 0.5) {
    let value = 0, amplitude = 0.5, frequency = 1, maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      value += amplitude * this.noise2D(x * frequency, y * frequency);
      maxValue += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }
    return value / maxValue;
  }

  ridgedFbm(x, y, octaves = 5, lacunarity = 2.1, gain = 0.4) {
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

// Simplified path lookup (matching Terrain.ts)
const noise = new SimplexNoise(42);
const noise2 = new SimplexNoise(137);
const noise3 = new SimplexNoise(999);

function getPathX(z) {
  // Simplified path - just sample the same formula
  const segs = 600;
  const t = Math.max(0, Math.min(1, -z / 130));
  let x;
  if (t < 0.25) {
    x = Math.sin(t * 22) * 2.2 + Math.sin(t * 13.7) * 1.0 + Math.cos(t * 8.3) * 0.6;
  } else if (t < 0.55) {
    x = Math.sin(t * 10) * 3.5 + Math.sin(t * 6.3) * 1.8 + Math.cos(t * 4.1) * 1.0;
  } else if (t < 0.80) {
    x = Math.sin(t * 5) * 5.0 + Math.cos(t * 2.3) * 2.8 + Math.sin(t * 1.7) * 1.2;
  } else {
    const baseX = Math.sin(0.8 * 5) * 5.0 + Math.cos(0.8 * 2.3) * 2.8 + Math.sin(0.8 * 1.7) * 1.2;
    const blend = (t - 0.8) / 0.2;
    x = (baseX + Math.sin(t * 3) * 4.0 * blend * 0.5) + Math.sin(t * 7.1) * 0.8;
  }
  return x;
}

function getPathHeight(z) {
  const t = Math.max(0, Math.min(1, -z / 130));
  let elevation = noise.fbm(t * 5, 0.5, 5) * 1.2 - 0.2;
  if (t > 0.75) elevation -= (t - 0.75) * 3.0;
  return elevation;
}

function getHeightAt(x, z) {
  // Base terrain
  let height = noise.fbm(x * 0.035, z * 0.035, 6) * 5;
  height += noise.ridgedFbm(x * 0.05, z * 0.05, 5) * 3;
  height += noise2.fbm(x * 0.12, z * 0.12, 4) * 0.8;
  height += noise3.fbm(x * 0.3, z * 0.3, 3) * 0.3;

  // Canyon walls
  const pathCenterX = getPathX(z);
  const distFromPath = x - pathCenterX;
  const absDist = Math.abs(distFromPath);

  if (absDist < 2.2) {
    const pathHeight = getPathHeight(z);
    const blend = 1 - Math.pow(Math.min(absDist / 2.2, 1), 2);
    height = height * (1 - blend) + (pathHeight - 0.15) * blend;
  }

  if (absDist >= 2.2 && absDist < 8.0) {
    const wallT = (absDist - 2.2) / 5.8;
    const wallHeight = Math.pow(wallT, 0.6) * 10;
    const wallTexture = noise.ridgedFbm(x * 0.3 + z * 0.05, z * 0.1, 5) * 2.5;
    const wallBlend = Math.min(wallT * 2.5, 1);
    height = height * (1 - wallBlend) + (wallHeight + wallTexture) * wallBlend;
  }

  if (absDist >= 8.0 && absDist < 10.0) {
    const shoulder = (1 - (absDist - 8.0) / 2.0) * 0.5;
    height += shoulder;
  }

  // Cliff face
  const cliffT = Math.max(0, Math.min(1, (z + 115) / 18));
  if (cliffT > 0 && cliffT < 1 && absDist >= 2.2) {
    const cliffNoise = noise.ridgedFbm(x * 0.25 + z * 0.03, z * 0.08, 6);
    const cliffHeight = cliffT * 12 * (0.4 + cliffNoise * 2.0);
    const fracture = Math.sin(x * 0.5 + noise.fbm(x * 0.3, z * 0.06, 5) * 5) * 2.0;
    const stratification = Math.sin(x * 1.2 + z * 0.3 + noise2.fbm(x * 0.2, z * 0.1, 3) * 3) * 0.8;
    const talusT = Math.max(0, cliffT / 0.15);
    const talus = (1 - talusT) * 2.5 * (1 + noise.fbm(x * 0.4, z * 0.25, 4) * 0.6);
    const combined = cliffHeight + fracture + stratification + talus;
    // Cap cliff height to prevent extreme outliers from noise spikes
    const capped = Math.min(combined, 16);
    if (capped > height) {
      height = capped;
    }
  }

  return height;
}

// Sample terrain along path and at edges
console.log('=== Terrain Height Samples ===\n');

// Along the path center
console.log('--- Path center heights ---');
for (let z = 0; z >= -125; z -= 10) {
  const px = getPathX(z);
  const h = getHeightAt(px, z);
  console.log(`  z=${z.toString().padStart(4)}  pathX=${px.toFixed(2)}  height=${h.toFixed(2)}`);
}

// Cross-section at z=-10 (start area)
console.log('\n--- Cross-section at z=-10 (start area) ---');
const pathX10 = getPathX(-10);
for (let x = -20; x <= 20; x += 2) {
  const h = getHeightAt(x, -10);
  const marker = Math.abs(x - pathX10) < 2.2 ? '<< PATH' : '';
  console.log(`  x=${x.toString().padStart(3)}  height=${h.toFixed(2)}  ${marker}`);
}

// Cross-section at z=-50 (mid area)
console.log('\n--- Cross-section at z=-50 (mid area) ---');
const pathX50 = getPathX(-50);
for (let x = -20; x <= 20; x += 2) {
  const h = getHeightAt(x, -50);
  const marker = Math.abs(x - pathX50) < 2.2 ? '<< PATH' : '';
  console.log(`  x=${x.toString().padStart(3)}  height=${h.toFixed(2)}  ${marker}`);
}

// Cross-section at z=-80 (before ruins)
console.log('\n--- Cross-section at z=-80 (before ruins) ---');
const pathX80 = getPathX(-80);
for (let x = -20; x <= 20; x += 2) {
  const h = getHeightAt(x, -80);
  const marker = Math.abs(x - pathX80) < 2.2 ? '<< PATH' : '';
  console.log(`  x=${x.toString().padStart(3)}  height=${h.toFixed(2)}  ${marker}`);
}

// Cross-section at z=-100 (ruins area)
console.log('\n--- Cross-section at z=-100 (ruins area) ---');
const pathX100 = getPathX(-100);
for (let x = -20; x <= 20; x += 2) {
  const h = getHeightAt(x, -100);
  const marker = Math.abs(x - pathX100) < 2.2 ? '<< PATH' : '';
  console.log(`  x=${x.toString().padStart(3)}  height=${h.toFixed(2)}  ${marker}`);
}

// Summary stats
console.log('\n=== Summary ===');
let minH = Infinity, maxH = -Infinity;
for (let x = -30; x <= 30; x += 1) {
  for (let z = 0; z >= -125; z -= 5) {
    const h = getHeightAt(x, z);
    if (h < minH) minH = h;
    if (h > maxH) maxH = h;
  }
}
console.log(`Height range: ${minH.toFixed(2)} to ${maxH.toFixed(2)}`);
console.log(`Height span: ${(maxH - minH).toFixed(2)} units`);
