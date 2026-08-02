import * as THREE from 'three';

// ============================================================================
// PERLIN NOISE - 3D implementation with smooth quintic interpolation
// ============================================================================
class PerlinNoise {
    constructor(seed = 42) {
        this.perm = new Uint8Array(512);
        this.grad3 = [
            [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
            [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
            [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
        ];
        const p = new Uint8Array(256);
        for (let i = 0; i < 256; i++) p[i] = i;
        let s = seed;
        for (let i = 255; i > 0; i--) {
            s = (s * 16807) % 2147483647;
            const j = s % (i + 1);
            [p[i], p[j]] = [p[j], p[i]];
        }
        for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
    }

    dot3(g, x, y, z) { return g[0]*x + g[1]*y + g[2]*z; }

    noise3D(x, y, z) {
        const floor = Math.floor;
        const X = floor(x) & 255, Y = floor(y) & 255, Z = floor(z) & 255;
        x -= floor(x); y -= floor(y); z -= floor(z);
        const u = x*x*x*(x*(x*6-15)+10);
        const v = y*y*y*(y*(y*6-15)+10);
        const w = z*z*z*(z*(z*6-15)+10);
        const o0 = this.perm[X]+Y, o1 = this.perm[X+1]+Y;
        const o2 = this.perm[X]+Y+1, o3 = this.perm[X+1]+Y+1;
        const gi000 = this.perm[o0+Z]%12, gi001 = this.perm[o1+Z]%12;
        const gi010 = this.perm[o2+Z]%12, gi011 = this.perm[o3+Z]%12;
        const gi100 = this.perm[o0+Z+1]%12, gi101 = this.perm[o1+Z+1]%12;
        const gi110 = this.perm[o2+Z+1]%12, gi111 = this.perm[o3+Z+1]%12;
        const nx00 = this.lerp(u, this.dot3(this.grad3[gi000],x,y,z), this.dot3(this.grad3[gi100],x-1,y,z));
        const nx01 = this.lerp(u, this.dot3(this.grad3[gi001],x,y-1,z), this.dot3(this.grad3[gi101],x-1,y-1,z));
        const nx10 = this.lerp(u, this.dot3(this.grad3[gi010],x,y-1,z), this.dot3(this.grad3[gi110],x-1,y-1,z));
        const nx11 = this.lerp(u, this.dot3(this.grad3[gi011],x,y-1,z-1), this.dot3(this.grad3[gi111],x-1,y-1,z-1));
        const nxy0 = this.lerp(v, nx00, nx10);
        const nxy1 = this.lerp(v, nx01, nx11);
        return this.lerp(w, nxy0, nxy1);
    }

    noise2D(x, y) { return this.noise3D(x, y, 0.5); }
    lerp(t, a, b) { return a + t*(b-a); }

    fbm(x, y, z, octaves, lacunarity, gain) {
        let total = 0, amp = 1, freq = 1, maxVal = 0;
        for (let i = 0; i < octaves; i++) {
            total += this.noise3D(x*freq, y*freq, z*freq) * amp;
            maxVal += amp; amp *= gain; freq *= lacunarity;
        }
        return total / maxVal;
    }

    ridged(x, y, z, octaves) {
        let total = 0, amp = 1, freq = 1, maxVal = 0;
        for (let i = 0; i < octaves; i++) {
            let n = Math.abs(this.noise3D(x*freq, y*freq, z*freq));
            n = 1 - n; n = n * n;
            total += n * amp; maxVal += amp;
            amp *= 0.5; freq *= 2.1;
        }
        return total / maxVal;
    }

    // Hybrid multi-octave noise with different blend modes
    hybridFbm(x, y, z, octaves, lacunarity, gain, offset) {
        let signal = 0, weight = 1, amp = 1, freq = 1, maxAmp = 0;
        for (let i = 0; i < octaves; i++) {
            const n = Math.abs(this.noise3D((x*freq)+offset, (y*freq)+offset*1.3, (z*freq)+offset*0.7));
            signal += (n * weight) * amp;
            weight = n; maxAmp += amp;
            amp *= gain; freq *= lacunarity;
        }
        return signal / maxAmp;
    }
}

// ============================================================================
// TERRAIN HEIGHTMAP - Geological realism with erosion simulation
// ============================================================================

function computeHeightfield(width, length, segX, segZ, pathCurve, noise, noise2, noise3, noise4) {
    const positions = new Float32Array(width * length * 3);
    // We'll store heights in a 1D array indexed by [z * segX + x]
    const heights = new Float32Array(segX * segZ);

    function getPathWidth(t) {
        let w = 2.8;
        w += Math.sin(t * Math.PI * 4.1) * 0.6;
        w += Math.sin(t * Math.PI * 8.3 + 1.1) * 0.3;
        // Trail widens slightly in open areas, narrows in dense sections
        w *= (1.0 + t * 0.2);
        return Math.max(2.0, Math.min(4.0, w));
    }

    // Pass 1: Base terrain generation
    for (let iz = 0; iz < segZ; iz++) {
        for (let ix = 0; ix < segX; ix++) {
            const x = (ix / segX - 0.5) * width;
            const z = (iz / segZ - 0.5) * length;
            const t = Math.max(0, Math.min(1, (z + length/2) / length));

            let h = 0;

            // Large-scale rolling hills
            h += noise.fbm(x*0.008, z*0.008, 0, 4, 2.0, 0.5) * 8;
            // Medium ridges
            h += noise2.ridged(x*0.02, z*0.015, 0, 4) * 3;
            // Fine detail
            h += noise3.fbm(x*0.06, z*0.06, 0, 3, 2.2, 0.45) * 1.2;
            // Micro bumps
            h += noise4.fbm(x*0.15, z*0.15, 0, 2, 2.0, 0.5) * 0.3;

            // Path carving
            const pathPoint = pathCurve.getPointAt(t);
            const pathTangent = pathCurve.getTangentAt(t);
            const perp = new THREE.Vector3(-pathTangent.z, 0, pathTangent.x).normalize();
            const dx = (new THREE.Vector3(x - pathPoint.x, 0, z - pathPoint.z)).dot(perp);
            const pathWidth = getPathWidth(t);

            if (Math.abs(dx) < pathWidth * 3) {
                const distRatio = Math.abs(dx) / pathWidth;
                const pathFactor = Math.pow(Math.max(0, 1 - distRatio / 3), 2.5);

                // Carved path depression
                h -= pathFactor * 0.8;

                // Ruts - two shallow channels where feet naturally walk
                const rutOffset = pathWidth * 0.25;
                const leftRut = Math.exp(-Math.pow((dx + rutOffset) / (pathWidth * 0.12), 2));
                const rightRut = Math.exp(-Math.pow((dx - rutOffset) / (pathWidth * 0.12), 2));
                const rutNoise = noise2.fbm(x*0.4, z*0.08, 0, 3, 2.0, 0.5);
                if (rutNoise > -0.1) {
                    h -= (leftRut + rightRut) * pathFactor * 0.25;
                }

                // Roots crossing the path
                const rootNoise = noise3.fbm(x*0.12+50, z*0.04+50, 0, 3, 2.0, 0.5);
                if (rootNoise > 0.3 && distRatio < 1.5) {
                    const rootFactor = (rootNoise - 0.3) * 1.8;
                    const rootAngle = noise4.noise2D(x*0.08, z*0.03) * Math.PI;
                    const rootDir = Math.sign(Math.sin(rootAngle));
                    if (Math.sign(dx) === rootDir || distRatio < 0.5) {
                        h += rootFactor * 0.25 * pathFactor;
                    }
                }

                // Path edge embankments
                if (distRatio > 0.8 && distRatio < 1.8) {
                    const edgeFactor = Math.sin((distRatio - 0.8) / 1.0 * Math.PI);
                    h += edgeFactor * 0.3 * pathFactor;
                }
            }

            // Waterfall cliff at the end
            const waterfallZ = -length/2 + 20;
            if (z < waterfallZ) {
                const cliffProgress = Math.max(0, Math.min(1, (waterfallZ - z) / 20));
                const cliffNoise = noise.ridged(x*0.04, z*0.01, 0, 5);
                const cliffHeight = cliffProgress * (10 + cliffNoise * 14);

                // Ledges and overhangs
                const ledgeNoise = noise2.fbm(x*0.08, z*0.04, 0, 3, 2.0, 0.5);
                const ledgeFactor = Math.max(0, ledgeNoise) * cliffProgress * 2.5;

                h += cliffHeight - ledgeFactor;

                // Talus slope at cliff base
                if (Math.abs(x) > 6 && Math.abs(x) < 14) {
                    const talusFactor = Math.exp(-Math.pow((Math.abs(x) - 10) / 3.5, 2));
                    h -= talusFactor * cliffProgress * 4;
                }

                // Splash pool depression
                if (z < waterfallZ - 8 && Math.abs(x) < 10) {
                    const poolFactor = Math.exp(-Math.pow(x / 7, 2));
                    h -= poolFactor * 2.5;
                }
            }

            // Small drainage channels
            const drainage = noise3.fbm(x*0.04+200, z*0.02+200, 0, 4, 2.0, 0.5);
            if (drainage > 0.35) {
                const channelFactor = (drainage - 0.35) * 1.5;
                h -= channelFactor * 0.6;
            }

            // Mounds and termite hills away from path
            const mound = noise.ridged(x*0.05, z*0.05, 0, 3);
            if (mound > 0.35 && Math.abs(dx) > pathWidth * 2) {
                h += (mound - 0.35) * 1.5;
            }

            heights[iz * segX + ix] = h;
        }
    }

    // Pass 2: Simulated water erosion - carve channels along flow directions
    const eroded = new Float32Array(heights);
    const sediment = new Float32Array(segX * segZ);
    const erosionStrength = 0.15;

    for (let iter = 0; iter < 3; iter++) {
        // Drop "rain" particles along the path
        for (let drop = 0; drop < 500; drop++) {
            let px = Math.floor(segX * 0.5 + (Math.random()-0.5) * segX * 0.3);
            let pz = Math.floor(Math.random() * segZ);
            let water = 5 + Math.random() * 10;

            for (let step = 0; step < 200 && water > 0.1; step++) {
                if (px < 0 || px >= segX || pz < 0 || pz >= segZ) break;

                const currentH = eroded[pz * segX + px];

                // Find steepest descent direction
                let bestDir = 0;
                let bestSlope = -Infinity;
                const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];

                for (const [dx, dz] of dirs) {
                    const nx = px + dx, nz = pz + dz;
                    if (nx < 0 || nx >= segX || nz < 0 || nz >= segZ) continue;
                    const slope = (currentH - eroded[nz * segX + nx]) / 1.0;
                    if (slope > bestSlope) {
                        bestSlope = slope;
                        bestDir = dx + dz * 10;
                    }
                }

                if (bestSlope > 0.01) {
                    // Erode
                    const erodeAmount = Math.min(water * erosionStrength * 0.01, bestSlope * 0.1);
                    eroded[pz * segX + px] -= erodeAmount;

                    const ndx = bestDir % 10;
                    const ndz = Math.floor(bestDir / 10);
                    const nIdx = (pz + ndz) * segX + (px + ndx);
                    eroded[nIdx] += erodeAmount * 0.8;

                    // Transport sediment
                    const curIdx = pz * segX + px;
                    sediment[nIdx] += sediment[curIdx] * 0.5;
                    sediment[curIdx] *= 0.5;

                    px += ndx;
                    pz += ndz;
                    water *= 0.98;
                } else {
                    // Flat area - deposit sediment
                    const curIdx = pz * segX + px;
                    sediment[curIdx] += water * 0.1;
                    if (sediment[curIdx] > 0.5) {
                        eroded[curIdx] += 0.02;
                        sediment[curIdx] *= 0.8;
                    }
                    break;
                }
            }
        }
    }

    // Smooth erosion result back into heights
    for (let i = 0; i < heights.length; i++) {
        heights[i] += (eroded[i] - heights[i]) * 0.4;
    }

    return { heights, segX, segZ, width, length, pathCurve, getPathWidth };
}

// ============================================================================
// PROCEDURAL TEXTURES - Multi-layer jungle soil with realistic detail
// ============================================================================

function createTerrainDiffuseMap(size = 1024) {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    const n1 = new PerlinNoise(12345);
    const n2 = new PerlinNoise(67890);
    const n3 = new PerlinNoise(11111);
    const n4 = new PerlinNoise(22222);
    const n5 = new PerlinNoise(33333);

    // Pre-compute noise layers
    const soilBase = new Float32Array(size * size);
    const soilDetail = new Float32Array(size * size);
    const mossMask = new Float32Array(size * size);
    const leafLitter = new Float32Array(size * size);
    const rockMask = new Float32Array(size * size);
    const wetMask = new Float32Array(size * size);
    const microNoise = new Float32Array(size * size);

    for (let i = 0; i < size * size; i++) {
        const x = (i % size) / size;
        const y = Math.floor(i / size) / size;
        soilBase[i] = n1.fbm(x*20, y*20, 0, 5, 2.0, 0.5);
        soilDetail[i] = n2.fbm(x*50, y*50, 0, 4, 2.0, 0.5);
        mossMask[i] = n3.fbm(x*12, y*12, 0, 5, 2.0, 0.55);
        leafLitter[i] = n4.fbm(x*35, y*35, 0, 3, 2.0, 0.5);
        rockMask[i] = n5.fbm(x*8, y*8, 0, 3, 2.0, 0.5);
        wetMask[i] = n2.fbm(x*6+77, y*6+77, 0, 4, 2.0, 0.5);
        microNoise[i] = n5.fbm(x*80, y*80, 0, 2, 2.0, 0.5);
    }

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = y * size + x;
            const u = x / size, v = y / size;

            // --- BASE: Dark tropical topsoil ---
            // Real jungle soil is dark, rich, organic: deep brown-black with green undertones
            let r = 28 + soilBase[idx] * 22;
            let g = 38 + soilBase[idx] * 28;
            let b = 16 + soilBase[idx] * 12;

            // --- LAYER 1: Fine organic detail ---
            r += soilDetail[idx] * 8;
            g += soilDetail[idx] * 12;
            b += soilDetail[idx] * 5;

            // --- LAYER 2: Moss patches (green-grey, not bright green) ---
            const moss = Math.max(0, mossMask[idx] - 0.15) * 1.176;
            if (moss > 0.05) {
                const mf = Math.min(1, moss * 0.6);
                // Moss is grey-green, desaturated
                const mr = 35 + moss * 20;
                const mg = 58 + moss * 30;
                const mb = 22 + moss * 12;
                r = r * (1-mf) + mr * mf;
                g = g * (1-mf) + mg * mf;
                b = b * (1-mf) + mb * mf;
            }

            // --- LAYER 3: Leaf litter (dead leaves, brown-orange) ---
            const ll = Math.max(0, leafLitter[idx] - 0.1) * 1.11;
            if (ll > 0.25) {
                const lf = Math.min(1, (ll - 0.25) * 1.5);
                // Dead leaf colors: brown, tan, orange-brown
                const lr = 75 + ll * 25;
                const lg = 50 + ll * 15;
                const lb = 22 + ll * 8;
                r = r * (1-lf*0.5) + lr * lf*0.5;
                g = g * (1-lf*0.5) + lg * lf*0.5;
                b = b * (1-lf*0.5) + lb * lf*0.5;
            }

            // --- LAYER 4: Small rocks and pebbles ---
            const rock = Math.max(0, rockMask[idx] - 0.25) * 1.33;
            if (rock > 0.3) {
                const rf = Math.min(1, (rock - 0.3) * 1.2);
                const rr = 65 + rock * 20;
                const rg = 60 + rock * 18;
                const rb = 50 + rock * 12;
                r = r * (1-rf*0.4) + rr * rf*0.4;
                g = g * (1-rf*0.4) + rg * rf*0.4;
                b = b * (1-rf*0.4) + rb * rf*0.4;
            }

            // --- LAYER 5: Wet soil (darker, slightly reflective) ---
            const wet = Math.max(0, wetMask[idx] - 0.2) * 1.25;
            if (wet > 0.2) {
                const wf = Math.min(1, (wet - 0.2) * 1.25);
                r *= (1 - wf * 0.3);
                g *= (1 - wf * 0.2);
                b *= (1 - wf * 0.15);
                // Wet soil has a slight sheen (boosted green)
                g += wf * 6;
            }

            // --- PATH ZONE: Worn trail, not a painted stripe ---
            const pathCenter = 0.5;
            const pathHalfWidth = 0.12;
            const distFromCenter = Math.abs(u - pathCenter);

            if (distFromCenter < pathHalfWidth * 2.5) {
                const distRatio = distFromCenter / pathHalfWidth;
                let pathFactor;

                if (distRatio < 1.0) {
                    // Core path: compacted reddish-brown clay
                    pathFactor = Math.pow(1 - distRatio, 1.8);
                    // Add noise to path edges for natural look
                    const pathEdgeNoise = n1.fbm(u*40, v*3, 0, 3, 2.0, 0.5);
                    pathFactor *= (0.85 + pathEdgeNoise * 0.3);

                    // Compacted clay: reddish-brown, not the same as surrounding soil
                    const clayNoise = n1.fbm(u*25, v*5, 0, 4, 2.0, 0.5);
                    const rutNoise = n2.fbm(u*15, v*8, 0, 3, 2.0, 0.5);
                    const rutDepth = Math.max(0, rutNoise) * 0.15;

                    const pr = 82 + clayNoise * 18 - rutDepth * 25;
                    const pg = 52 + clayNoise * 12 - rutDepth * 18;
                    const pb = 28 + clayNoise * 8 - rutDepth * 8;

                    // Vegetation encroachment on path edges
                    const encroachment = Math.max(0, n3.fbm(u*18, v*2, 0, 3, 2.0, 0.5));
                    const encFactor = (distRatio > 0.6 ? (distRatio - 0.6) * 2.5 : 0) * encroachment;

                    r = r * (1 - pathFactor) + pr * pathFactor;
                    g = g * (1 - pathFactor) + pg * pathFactor;
                    b = b * (1 - pathFactor) + pb * pathFactor;

                    // Apply encroachment on top
                    if (encFactor > 0.1) {
                        const ef = Math.min(1, encFactor * 0.5);
                        r = r * (1-ef) + (25 + encroachment*15) * ef;
                        g = g * (1-ef) + (48 + encroachment*20) * ef;
                        b = b * (1-ef) + (14 + encroachment*8) * ef;
                    }
                } else if (distRatio < 2.5) {
                    // Path shoulder: gradual transition
                    pathFactor = Math.pow(Math.max(0, 1 - (distRatio - 1) / 1.5), 2);
                    // Slightly compacted soil at edges
                    r -= pathFactor * 5;
                    g -= pathFactor * 3;
                    b -= pathFactor * 2;
                }
            }

            // --- MICRO: Pixel-level variation ---
            const micro = microNoise[idx] * 6;
            r += micro;
            g += micro * 1.3;
            b += micro * 0.7;

            // Clamp
            data[idx*4]   = Math.max(0, Math.min(255, r));
            data[idx*4+1] = Math.max(0, Math.min(255, g));
            data[idx*4+2] = Math.max(0, Math.min(255, b));
            data[idx*4+3] = 255;
        }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

function createTerrainNormalMap(size = 1024) {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    const n1 = new PerlinNoise(12345);
    const n2 = new PerlinNoise(67890);
    const eps = 0.008;
    const scale = 20;

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const u = x / size * scale;
            const v = y / size * scale;

            const h = (nx, ny) => {
                let val = n1.fbm(nx, ny, 0, 5, 2.0, 0.5);
                val += n2.fbm(nx*2.1, ny*2.1, 0.5, 4, 2.0, 0.5) * 0.5;
                val += n1.fbm(nx*4.3, ny*4.3, 1.0, 3, 2.0, 0.5) * 0.25;
                return val;
            };

            const hL = h(u - eps, v), hR = h(u + eps, v);
            const hU = h(u, v - eps), hD = h(u, v + eps);
            const hx = (hR - hL) / (2 * eps);
            const hy = (hD - hU) / (2 * eps);

            const len = Math.sqrt(hx*hx + hy*hy + 1);
            const nx = hx/len, ny = hy/len, nz = 1/len;

            const idx = y * size + x;
            data[idx*4]   = (nx*0.5+0.5)*255;
            data[idx*4+1] = (ny*0.5+0.5)*255;
            data[idx*4+2] = (nz*0.5+0.5)*255;
            data[idx*4+3] = 255;
        }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

function createTerrainRoughnessMap(size = 1024) {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    const n1 = new PerlinNoise(99999);
    const n2 = new PerlinNoise(88888);

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = y * size + x;
            const u = x / size, v = y / size;

            let roughness = 0.72 + n1.fbm(u*18, v*18, 0, 4, 2.0, 0.5) * 0.18;

            // Path is more compacted (smoother)
            const distFromCenter = Math.abs(u - 0.5);
            if (distFromCenter < 0.15) {
                const pf = Math.pow(1 - distFromCenter / 0.15, 2);
                roughness = roughness * (1-pf) + 0.65 * pf;
            }

            // Wet areas are smoother
            const wet = Math.max(0, n2.fbm(u*6+77, v*6+77, 0, 4, 2.0, 0.5));
            if (wet > 0.3) {
                roughness *= (1 - (wet-0.3) * 0.35);
            }

            const val = Math.max(0, Math.min(255, roughness * 255));
            data[idx*4] = val; data[idx*4+1] = val; data[idx*4+2] = val; data[idx*4+3] = 255;
        }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

// ============================================================================
// TERRAIN MESH - High-res geometry with displacement
// ============================================================================

function createPathCurve() {
    const points = [];
    const pathLength = 200;
    const segments = 200;

    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const x = Math.sin(t * Math.PI * 2.7) * 9 +
                  Math.sin(t * Math.PI * 1.3 + 0.5) * 5 +
                  Math.sin(t * Math.PI * 4.1 + 1.2) * 2;
        const z = -t * pathLength;
        const y = Math.sin(t * Math.PI * 1.8) * 0.8 +
                  Math.sin(t * Math.PI * 3.2 + 0.7) * 0.4;
        points.push(new THREE.Vector3(x, y, z));
    }

    return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
}

function createTerrain(scene, pathCurve) {
    const terrainWidth = 120;
    const terrainLength = 250;
    const segX = 400;
    const segZ = 600;

    const noise = new PerlinNoise(42);
    const noise2 = new PerlinNoise(123);
    const noise3 = new PerlinNoise(789);
    const noise4 = new PerlinNoise(456);

    // Compute heightfield with erosion
    const { heights, segX: sx, segZ: sz, getPathWidth } = computeHeightfield(
        terrainWidth, terrainLength, segX, segZ, pathCurve, noise, noise2, noise3, noise4
    );

    // Build geometry
    const geometry = new THREE.PlaneGeometry(terrainWidth, terrainLength, segX, segZ);
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    for (let iz = 0; iz < segZ; iz++) {
        for (let ix = 0; ix < segX; ix++) {
            const i = iz * segX + ix;
            positions.setY(i, heights[i]);
        }
    }
    geometry.computeVertexNormals();

    // Generate textures
    const diffuseCanvas = createTerrainDiffuseMap(1024);
    const normalCanvas = createTerrainNormalMap(1024);
    const roughnessCanvas = createTerrainRoughnessMap(1024);

    const diffuseMap = new THREE.CanvasTexture(diffuseCanvas);
    diffuseMap.wrapS = THREE.RepeatWrapping;
    diffuseMap.wrapT = THREE.RepeatWrapping;
    diffuseMap.repeat.set(2, 3);
    diffuseMap.colorSpace = THREE.SRGBColorSpace;

    const normalMap = new THREE.CanvasTexture(normalCanvas);
    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.repeat.set(4, 6);

    const roughnessMap = new THREE.CanvasTexture(roughnessCanvas);
    roughnessMap.wrapS = THREE.RepeatWrapping;
    roughnessMap.wrapT = THREE.RepeatWrapping;
    roughnessMap.repeat.set(2, 3);

    const material = new THREE.MeshStandardMaterial({
        map: diffuseMap,
        normalMap: normalMap,
        normalScale: new THREE.Vector2(1.0, 1.0),
        roughnessMap: roughnessMap,
        roughness: 0.85,
        metalness: 0.02,
        color: 0xffffff
    });

    const terrain = new THREE.Mesh(geometry, material);
    terrain.receiveShadow = true;
    scene.add(terrain);

    // Store path data for other systems
    terrain.userData.pathCurve = pathCurve;
    terrain.userData.getPathWidth = getPathWidth;

    return terrain;
}

export { PerlinNoise, createPathCurve, createTerrain };
