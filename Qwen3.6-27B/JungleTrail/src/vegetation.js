import * as THREE from 'three';
import { PerlinNoise } from './terrain.js';

// ============================================================================
// VEGETATION SYSTEM - Photorealistic jungle flora
// ============================================================================

// --- Procedural textures ---

function createBarkTexture(size = 512) {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size * 2;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;
    const n1 = new PerlinNoise(54321);
    const n2 = new PerlinNoise(98765);
    const n3 = new PerlinNoise(13579);

    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < size; x++) {
            const u = x / size, v = y / canvas.height;
            const idx = y * size + x;

            // Vertical bark grain (long, narrow features)
            const grain = n1.fbm(u*2, v*60, 0, 5, 2.0, 0.5);
            const detail = n2.fbm(u*8, v*120, 0, 3, 2.0, 0.5);
            const lumps = n3.fbm(u*5+50, v*15+50, 0, 3, 2.0, 0.5);

            // Bark base: dark brown-grey
            let r = 50 + grain * 20 + detail * 8;
            let g = 32 + grain * 12 + detail * 5;
            let b = 22 + grain * 8;

            // Vertical fissures (dark cracks)
            const fissure = Math.max(0, n1.fbm(u*6+100, v*50+100, 0, 4, 2.0, 0.6));
            if (fissure > 0.35) {
                const ff = (fissure - 0.35) * 1.54;
                r *= (1 - ff * 0.55);
                g *= (1 - ff * 0.55);
                b *= (1 - ff * 0.55);
            }

            // Bark lumps (raised areas)
            if (lumps > 0.2) {
                const lf = (lumps - 0.2) * 1.25;
                r += lf * 12;
                g += lf * 8;
                b += lf * 4;
            }

            // Lichen patches (grey-green, more on upper trunk)
            const lichen = Math.max(0, n2.fbm(u*10+200, v*6+200, 0, 3, 2.0, 0.5));
            if (lichen > 0.3 && v > 0.3) {
                const lichenF = (lichen - 0.3) * 1.43 * Math.min(1, (v - 0.3) * 2);
                r = r * (1-lichenF*0.35) + (45 + lichen*15) * lichenF*0.35;
                g = g * (1-lichenF*0.35) + (60 + lichen*20) * lichenF*0.35;
                b = b * (1-lichenF*0.35) + (30 + lichen*10) * lichenF*0.35;
            }

            // Moss at base
            const baseMoss = Math.max(0, n3.fbm(u*8+300, v*4+300, 0, 3, 2.0, 0.5));
            if (baseMoss > 0.25 && v < 0.25) {
                const mf = (baseMoss - 0.25) * 1.33 * (1 - v * 4);
                r = r * (1-mf*0.4) + (30 + baseMoss*15) * mf*0.4;
                g = g * (1-mf*0.4) + (55 + baseMoss*25) * mf*0.4;
                b = b * (1-mf*0.4) + (18 + baseMoss*8) * mf*0.4;
            }

            data[idx*4]   = Math.max(0, Math.min(255, r));
            data[idx*4+1] = Math.max(0, Math.min(255, g));
            data[idx*4+2] = Math.max(0, Math.min(255, b));
            data[idx*4+3] = 255;
        }
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

function createBarkNormalMap(size = 512) {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size * 2;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;
    const n1 = new PerlinNoise(54321);
    const eps = 0.005;
    const scale = 50;

    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < size; x++) {
            const u = x / size * scale;
            const v = y / canvas.height * scale * 2;
            const idx = y * size + x;

            const h = (nx, ny) => n1.fbm(nx, ny, 0, 5, 2.0, 0.5) +
                new PerlinNoise(98765).fbm(nx*2, ny*2, 0.5, 3, 2.0, 0.5) * 0.5;

            const hx = (h(u+eps, v) - h(u-eps, v)) / (2*eps);
            const hy = (h(u, v+eps) - h(u, v-eps)) / (2*eps);
            const len = Math.sqrt(hx*hx + hy*hy + 1);

            data[idx*4]   = (hx/len*0.5+0.5)*255;
            data[idx*4+1] = (hy/len*0.5+0.5)*255;
            data[idx*4+2] = (1/len*0.5+0.5)*255;
            data[idx*4+3] = 255;
        }
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

// Leaf texture with vein structure
function createLeafTexture(size = 256, variant = 0) {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    const n1 = new PerlinNoise(13579 + variant * 1000);
    const n2 = new PerlinNoise(24680 + variant * 1000);

    // Color variants: dark green, olive green, yellowish-green
    const baseColors = [
        { r: 18, g: 55, b: 12 },  // Dark forest green
        { r: 30, g: 65, b: 18 },  // Medium green
        { r: 45, g: 72, b: 20 },  // Olive green
    ];
    const bc = baseColors[variant % baseColors.length];

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const u = x / size, v = y / size;
            const idx = y * size + x;

            const detail = n1.fbm(u*12, v*12, 0, 4, 2.0, 0.5);
            const micro = n2.fbm(u*30, v*30, 0, 2, 2.0, 0.5);

            let r = bc.r + detail * 20 + micro * 8;
            let g = bc.g + detail * 30 + micro * 12;
            let b = bc.b + detail * 12 + micro * 4;

            // Main vein (center line)
            const mainVein = Math.abs(u - 0.5);
            if (mainVein < 0.02) {
                const vf = 1 - mainVein / 0.02;
                r = r * (1-vf*0.4) + (12) * vf*0.4;
                g = g * (1-vf*0.4) + (35) * vf*0.4;
                b = b * (1-vf*0.4) + (8) * vf*0.4;
            }

            // Side veins
            const sideVein = Math.abs(Math.sin(v * Math.PI * 8) * (1 - Math.abs(u - 0.5) * 1.5));
            if (sideVein > 0.85 && Math.abs(u - 0.5) > 0.04) {
                const svf = (sideVein - 0.85) * 6.67;
                r = r * (1-svf*0.25) + (15) * svf*0.25;
                g = g * (1-svf*0.25) + (40) * svf*0.25;
                b = b * (1-svf*0.25) + (10) * svf*0.25;
            }

            // Wet sheen
            const wet = Math.max(0, n2.fbm(u*4+50, v*4+50, 0, 2, 2.0, 0.5));
            if (wet > 0.35) {
                const wf = (wet - 0.35) * 1.54;
                g += wf * 8;
                r += wf * 3;
            }

            // Edge fade for alpha blending
            const edgeDist = Math.min(u, 1-u, v, 1-v);
            const alpha = edgeDist < 0.05 ? edgeDist / 0.05 * 255 : 255;

            data[idx*4]   = Math.max(0, Math.min(255, r));
            data[idx*4+1] = Math.max(0, Math.min(255, g));
            data[idx*4+2] = Math.max(0, Math.min(255, b));
            data[idx*4+3] = alpha;
        }
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

// Create an alpha-masked leaf shape texture
function createLeafShapeTexture(size = 128) {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Draw an elliptical leaf shape
    ctx.clearRect(0, 0, size, size);
    ctx.beginPath();
    ctx.ellipse(size*0.5, size*0.5, size*0.45, size*0.25, 0, 0, Math.PI*2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    // Slight serration on edges
    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;
    const noise = new PerlinNoise(77777);

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            if (data[idx+3] > 0) {
                const u = x / size, v = y / size;
                const dx = u - 0.5, dv = (v - 0.5) * 2;
                const dist = Math.sqrt(dx*dx + dv*dv);
                if (dist > 0.35) {
                    const serration = noise.noise2D(u*20, v*20) * 0.05;
                    if (dist > 0.45 + serration) {
                        data[idx+3] = 0;
                    }
                }
            }
        }
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

// --- Tree generation ---

function createTreeTrunk(noise, height, radius, hasButtress = false) {
    const segments = 16;
    const heightSegs = 12;
    const geo = new THREE.CylinderGeometry(radius * 0.35, radius, height * 0.75, segments, heightSegs);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const t = (y / (height * 0.75)) + 0.5; // 0=bottom, 1=top
        const angle = Math.atan2(z, x);
        const dist = Math.sqrt(x*x + z*z);

        // Bark displacement
        const bump = noise.fbm(angle*3+100, t*8, 0, 3, 2.0, 0.5) * radius * 0.12;
        const detail = noise.fbm(angle*7+200, t*20, 0, 2, 2.0, 0.5) * radius * 0.04;

        // Buttress roots at base
        let buttress = 0;
        if (hasButtress && t < 0.25) {
            const buttressAngle = Math.cos(angle * 3) * 0.5 + 0.5;
            buttress = buttressAngle * (1 - t * 4) * radius * 0.5;
        }

        const scale = 1 + (bump + detail + buttress) / dist;
        pos.setX(i, x * scale);
        pos.setZ(i, z * scale);
    }
    geo.computeVertexNormals();
    return geo;
}

function createTreeBranch(noise, startLen, endLen, radius, segments = 8) {
    const points = [];
    const steps = 6;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const len = startLen + (endLen - startLen) * t;
        const x = noise.fbm(t*2, 0, 0, 2, 2.0, 0.5) * len * 0.3;
        const y = t * len * 0.5;
        const z = noise.fbm(0, t*2, 0, 2, 2.0, 0.5) * len * 0.3;
        points.push(new THREE.Vector3(x, y, z));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    return new THREE.TubeGeometry(curve, 8, radius, segments, false);
}

// Create organic canopy cluster - not an icosahedron
function createCanopyCluster(noise, radius, seed) {
    const geo = new THREE.IcosahedronGeometry(radius, 3);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const n = noise.fbm(x*0.4+seed, y*0.4+seed, z*0.4+seed, 4, 2.0, 0.5);
        const n2 = noise.fbm(x*1.2+seed*2, y*1.2+seed*2, z*1.2+seed*2, 2, 2.0, 0.5);

        // Create irregular, lumpy shape
        const scale = 1 + n * 0.5 + n2 * 0.2;
        // Flatten vertically slightly (canopies tend to be wider than tall)
        pos.setX(i, x * scale);
        pos.setY(i, y * scale * 0.7);
        pos.setZ(i, z * scale);
    }
    geo.computeVertexNormals();
    return geo;
}

// Create a full tree with trunk, branches, and canopy
function createFullTree(noise, height, radius, variant, hasButtress = false) {
    const group = new THREE.Group();
    const trunkH = height * 0.7;

    // Trunk
    const trunkGeo = createTreeTrunk(noise, height, radius, hasButtress);
    const trunkMat = new THREE.MeshStandardMaterial({
        map: new THREE.CanvasTexture(createBarkTexture()),
        normalMap: new THREE.CanvasTexture(createBarkNormalMap()),
        normalScale: new THREE.Vector2(0.6, 0.6),
        roughness: 0.92,
        metalness: 0.0,
        color: 0x5a4030
    });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);

    // Branches
    const branchCount = 3 + Math.floor(Math.random() * 3);
    const branchMat = trunkMat.clone();
    for (let i = 0; i < branchCount; i++) {
        const angle = (i / branchCount) * Math.PI * 2 + noise.noise2D(i * 17.3, variant) * 0.8;
        const branchLen = height * (0.2 + Math.random() * 0.2);
        const branchR = radius * (0.15 + Math.random() * 0.1);
        const branchGeo = createTreeBranch(noise, 0, branchLen, branchR);

        const branch = new THREE.Mesh(branchGeo, branchMat);
        branch.position.set(
            Math.cos(angle) * radius * 0.5,
            trunkH * (0.6 + Math.random() * 0.3),
            Math.sin(angle) * radius * 0.5
        );
        branch.rotation.y = angle;
        branch.rotation.x = -0.3 - Math.random() * 0.4;
        branch.castShadow = true;
        group.add(branch);
    }

    // Canopy - multiple overlapping clusters for density
    const leafTextures = [0, 1, 2].map(v => new THREE.CanvasTexture(createLeafTexture(256, v + variant * 3)));
    const canopyY = trunkH * 0.7;
    const canopyRadius = height * (0.35 + Math.random() * 0.15);

    // Main canopy mass
    const mainCanopyGeo = createCanopyCluster(noise, canopyRadius, variant * 100);
    const mainCanopyMat = new THREE.MeshStandardMaterial({
        map: leafTextures[variant % 3],
        roughness: 0.75,
        metalness: 0.0,
        color: new THREE.Color(0.7, 0.85, 0.65).lerp(new THREE.Color(0.4, 0.6, 0.35), Math.random() * 0.3),
        side: THREE.DoubleSide,
    });
    const mainCanopy = new THREE.Mesh(mainCanopyGeo, mainCanopyMat);
    mainCanopy.position.y = canopyY;
    mainCanopy.castShadow = true;
    mainCanopy.receiveShadow = true;
    group.add(mainCanopy);

    // Surrounding canopy clusters
    const clusterCount = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < clusterCount; i++) {
        const angle = (i / clusterCount) * Math.PI * 2 + noise.noise2D(i * 11.7, variant + 50) * 0.6;
        const r = canopyRadius * (0.4 + Math.random() * 0.6);
        const yOff = noise.noise2D(i * 7.3, variant) * height * 0.2;
        const clusterR = canopyRadius * (0.25 + Math.random() * 0.25);

        const clusterGeo = createCanopyCluster(noise, clusterR, variant * 100 + i * 37);
        const clusterMat = new THREE.MeshStandardMaterial({
            map: leafTextures[(i + variant) % 3],
            roughness: 0.7 + Math.random() * 0.15,
            metalness: 0.0,
            color: new THREE.Color(0.65, 0.8, 0.6).lerp(new THREE.Color(0.35, 0.55, 0.3), Math.random() * 0.4),
            side: THREE.DoubleSide,
        });
        const cluster = new THREE.Mesh(clusterGeo, clusterMat);
        cluster.position.set(
            Math.cos(angle) * r,
            canopyY + yOff,
            Math.sin(angle) * r
        );
        cluster.castShadow = true;
        cluster.receiveShadow = true;
        group.add(cluster);
    }

    // Top canopy spike
    const topGeo = createCanopyCluster(noise, canopyRadius * 0.4, variant * 100 + 999);
    const topMat = new THREE.MeshStandardMaterial({
        map: leafTextures[variant % 3],
        roughness: 0.65,
        metalness: 0.0,
        color: new THREE.Color(0.5, 0.75, 0.45),
        side: THREE.DoubleSide,
    });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.y = canopyY + canopyRadius * 0.5;
    top.castShadow = true;
    group.add(top);

    return group;
}

// --- Palm tree variant ---
function createPalmTree(noise, height) {
    const group = new THREE.Group();

    // Curved trunk
    const trunkPoints = [];
    const trunkSegs = 12;
    for (let i = 0; i <= trunkSegs; i++) {
        const t = i / trunkSegs;
        const lean = Math.sin(t * Math.PI * 0.5) * height * 0.15;
        trunkPoints.push(new THREE.Vector3(lean, t * height * 0.8, 0));
    }
    const trunkCurve = new THREE.CatmullRomCurve3(trunkPoints);

    // Create trunk with radius taper using a custom approach
    const trunkGeo = new THREE.TubeGeometry(trunkCurve, 16, 0.3, 8, false);
    const tPos = trunkGeo.attributes.position;
    for (let i = 0; i < tPos.count; i++) {
        const y = tPos.getY(i);
        const t = y / (height * 0.8);
        // Taper: thicker at base, thinner at top
        const taper = 1 + (1 - t) * 0.8;
        const x = tPos.getX(i);
        const z = tPos.getZ(i);
        const dist = Math.sqrt(x*x + z*z);
        if (dist > 0.001) {
            const scale = taper * 0.5;
            tPos.setX(i, x / dist * 0.3 * scale);
            tPos.setZ(i, z / dist * 0.3 * scale);
        }
        // Bark bumps
        const bump = noise.fbm(t*10, i*0.1, 0, 2, 2.0, 0.5) * 0.03;
        tPos.setX(i, tPos.getX(i) + bump);
    }
    trunkGeo.computeVertexNormals();

    const trunkMat = new THREE.MeshStandardMaterial({
        map: new THREE.CanvasTexture(createBarkTexture()),
        roughness: 0.85,
        metalness: 0.0,
        color: 0x5a4a30
    });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.castShadow = true;
    group.add(trunk);

    // Palm fronds
    const frondCount = 7 + Math.floor(Math.random() * 4);
    const topPos = trunkCurve.getPoint(1);

    for (let i = 0; i < frondCount; i++) {
        const angle = (i / frondCount) * Math.PI * 2;
        const frondLen = height * (0.3 + Math.random() * 0.2);
        const droop = 0.4 + Math.random() * 0.3;

        // Frond stem
        const frondPoints = [];
        for (let j = 0; j <= 8; j++) {
            const t = j / 8;
            const x = Math.cos(angle) * t * frondLen;
            const y = -Math.pow(t, 1.5) * frondLen * droop;
            const z = Math.sin(angle) * t * frondLen * 0.5;
            frondPoints.push(new THREE.Vector3(x, y, z));
        }
        const frondCurve = new THREE.CatmullRomCurve3(frondPoints);
        const stemGeo = new THREE.TubeGeometry(frondCurve, 8, 0.02, 4, false);
        const stem = new THREE.Mesh(stemGeo, trunkMat);
        stem.position.copy(topPos);
        stem.castShadow = true;
        group.add(stem);

        // Leaflets along frond
        for (let j = 2; j < 8; j++) {
            const t = j / 8;
            const pos = frondCurve.getPoint(t);
            const leafLen = (1 - t * 0.6) * frondLen * 0.2;

            const leafGeo = new THREE.PlaneGeometry(leafLen, leafLen * 0.15);
            const leafMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(0.25 + Math.random()*0.1, 0.55 + Math.random()*0.15, 0.15),
                roughness: 0.7,
                metalness: 0.0,
                side: THREE.DoubleSide
            });
            const leaf = new THREE.Mesh(leafGeo, leafMat);
            leaf.position.copy(pos);
            leaf.position.copy(topPos);
            leaf.position.x += pos.x;
            leaf.position.y += pos.y;
            leaf.position.z += pos.z;
            leaf.rotation.y = angle + (Math.random() - 0.5) * 0.5;
            leaf.rotation.x = (Math.random() - 0.5) * 0.3;
            group.add(leaf);
        }
    }

    return group;
}

// --- Hanging liana vines ---
function createLianaVine(noise, length, thickness) {
    const points = [];
    const segs = 24;
    for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const sway = noise.fbm(t*2.5, 0, 0, 3, 2.0, 0.5) * 0.8;
        const swayZ = noise.fbm(0, t*2.5, 0, 3, 2.0, 0.5) * 0.5;
        points.push(new THREE.Vector3(sway, -t * length, swayZ));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const geo = new THREE.TubeGeometry(curve, 16, thickness, 6, false);

    // Add slight thickness variation
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const t = 1 + (y / length) * 0.5; // Thicker at top
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const dist = Math.sqrt(x*x + z*z);
        if (dist > 0.001) {
            pos.setX(i, x * t);
            pos.setZ(i, z * t);
        }
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
        color: 0x3a3520,
        roughness: 0.85,
        metalness: 0.0
    });

    const vine = new THREE.Mesh(geo, mat);
    vine.castShadow = true;

    // Add leaf clusters along vine
    const leafGroup = new THREE.Group();
    const leafCount = Math.floor(length / 1.5);
    for (let i = 0; i < leafCount; i++) {
        const t = 0.2 + (i / leafCount) * 0.7;
        const pos = curve.getPoint(t);
        const clusterSize = 0.15 + Math.random() * 0.2;

        const leafGeo = new THREE.PlaneGeometry(clusterSize * 2, clusterSize);
        const leafMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0.2 + Math.random()*0.1, 0.45 + Math.random()*0.15, 0.12),
            roughness: 0.7,
            metalness: 0.0,
            side: THREE.DoubleSide
        });
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.position.copy(pos);
        leaf.rotation.set(
            Math.random() * 0.5,
            Math.random() * Math.PI * 2,
            Math.random() * 0.5
        );
        leafGroup.add(leaf);
    }

    const group = new THREE.Group();
    group.add(vine);
    group.add(leafGroup);
    return group;
}

// --- Fern ---
function createFern(scale = 1) {
    const group = new THREE.Group();
    const frondCount = 7 + Math.floor(Math.random() * 5);

    for (let i = 0; i < frondCount; i++) {
        const angle = (i / frondCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
        const length = (1.2 + Math.random() * 0.8) * scale;
        const droop = 0.25 + Math.random() * 0.35;

        const points = [];
        const segs = 10;
        for (let j = 0; j <= segs; j++) {
            const t = j / segs;
            points.push(new THREE.Vector3(
                Math.cos(angle) * t * length,
                t * length * 0.25 - Math.pow(t, 1.8) * length * droop,
                Math.sin(angle) * t * length
            ));
        }
        const curve = new THREE.CatmullRomCurve3(points);

        // Stem
        const stemGeo = new THREE.TubeGeometry(curve, 8, 0.015 * scale, 4, false);
        const stemMat = new THREE.MeshStandardMaterial({
            color: 0x2a4a1a,
            roughness: 0.8,
            metalness: 0.0
        });
        group.add(new THREE.Mesh(stemGeo, stemMat));

        // Leaflets
        for (let j = 2; j < segs; j++) {
            const t = j / segs;
            const pos = curve.getPoint(t);
            const tangent = curve.getTangent(t);
            const leafletLen = (1 - t * 0.65) * 0.35 * scale;

            const leafGeo = new THREE.PlaneGeometry(leafletLen, leafletLen * 0.25);
            const lp = leafGeo.attributes.position;
            for (let k = 0; k < lp.count; k++) {
                const ly = lp.getY(k);
                lp.setZ(k, ly * ly * 3);
            }
            leafGeo.computeVertexNormals();

            const leafMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(0.2 + Math.random()*0.08, 0.45 + Math.random()*0.12, 0.12),
                roughness: 0.7,
                metalness: 0.0,
                side: THREE.DoubleSide
            });
            const leaflet = new THREE.Mesh(leafGeo, leafMat);
            leaflet.position.copy(pos);

            const up = new THREE.Vector3(0, 1, 0);
            const side = new THREE.Vector3().crossVectors(tangent, up).normalize();
            leaflet.lookAt(pos.clone().add(side));
            leaflet.rotateY(Math.PI / 2);
            group.add(leaflet);
        }
    }
    return group;
}

// --- Broad-leaf plant (Monstera-like) ---
function createBroadLeafPlant(scale = 1) {
    const group = new THREE.Group();
    const leafCount = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < leafCount; i++) {
        const angle = (i / leafCount) * Math.PI * 2;
        const stemLen = (0.5 + Math.random() * 0.5) * scale;

        // Stem
        const stemPoints = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(Math.cos(angle) * stemLen * 0.5, stemLen * 0.6, Math.sin(angle) * stemLen * 0.5),
            new THREE.Vector3(Math.cos(angle) * stemLen, stemLen * 0.3, Math.sin(angle) * stemLen)
        ];
        const stemCurve = new THREE.CatmullRomCurve3(stemPoints);
        const stemGeo = new THREE.TubeGeometry(stemCurve, 6, 0.02 * scale, 4, false);
        const stemMat = new THREE.MeshStandardMaterial({ color: 0x2a4a1a, roughness: 0.8 });
        group.add(new THREE.Mesh(stemGeo, stemMat));

        // Broad leaf
        const leafSize = (0.4 + Math.random() * 0.3) * scale;
        const leafGeo = new THREE.PlaneGeometry(leafSize, leafSize * 0.8, 4, 4);
        const lp = leafGeo.attributes.position;
        for (let k = 0; k < lp.count; k++) {
            const lx = lp.getX(k), ly = lp.getY(k);
            // Curve the leaf
            lp.setZ(k, (lx*lx + ly*ly) * 0.5);
        }
        leafGeo.computeVertexNormals();

        const leafMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0.15 + Math.random()*0.1, 0.4 + Math.random()*0.15, 0.1),
            roughness: 0.65,
            metalness: 0.05, // Slight wet sheen
            side: THREE.DoubleSide
        });
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        const endPos = stemCurve.getPoint(1);
        leaf.position.copy(endPos);
        leaf.rotation.y = angle;
        leaf.rotation.x = -0.3;
        group.add(leaf);
    }
    return group;
}

// --- Ground cover: grass tufts, small plants ---
function createGrassTuft() {
    const group = new THREE.Group();
    const bladeCount = 6 + Math.floor(Math.random() * 6);

    for (let i = 0; i < bladeCount; i++) {
        const angle = (i / bladeCount) * Math.PI * 2 + Math.random() * 0.4;
        const height = 0.15 + Math.random() * 0.25;
        const lean = (Math.random() - 0.5) * 0.6;

        // Curved blade
        const points = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(Math.cos(angle) * 0.05, height * 0.5, Math.sin(angle) * 0.05),
            new THREE.Vector3(Math.cos(angle) * 0.1 + lean * 0.05, height, Math.sin(angle) * 0.1)
        ];
        const curve = new THREE.CatmullRomCurve3(points);
        const bladeGeo = new THREE.TubeGeometry(curve, 4, 0.012, 3, false);

        const bladeMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0.2 + Math.random()*0.1, 0.45 + Math.random()*0.15, 0.12),
            roughness: 0.8,
            metalness: 0.0
        });
        group.add(new THREE.Mesh(bladeGeo, bladeMat));
    }
    return group;
}

// --- Fallen leaf litter patches ---
function createLeafLitterPatch() {
    const group = new THREE.Group();
    const count = 5 + Math.floor(Math.random() * 8);

    for (let i = 0; i < count; i++) {
        const size = 0.05 + Math.random() * 0.12;
        const leafGeo = new THREE.PlaneGeometry(size, size * (0.6 + Math.random() * 0.4));

        // Dead leaf colors: brown, tan, orange-brown
        const deadColor = new THREE.Color(
            0.3 + Math.random() * 0.2,
            0.2 + Math.random() * 0.12,
            0.08 + Math.random() * 0.06
        );

        const leafMat = new THREE.MeshStandardMaterial({
            color: deadColor,
            roughness: 0.9,
            metalness: 0.0,
            side: THREE.DoubleSide
        });
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.position.set(
            (Math.random() - 0.5) * 0.5,
            0.01,
            (Math.random() - 0.5) * 0.5
        );
        leaf.rotation.set(
            -Math.PI / 2 + (Math.random() - 0.5) * 0.3,
            Math.random() * Math.PI,
            (Math.random() - 0.5) * 0.3
        );
        group.add(leaf);
    }
    return group;
}

// --- Understory bush ---
function createUnderstoryBush(noise, size) {
    const group = new THREE.Group();

    // Dense foliage cluster
    const clusterCount = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < clusterCount; i++) {
        const r = size * (0.3 + Math.random() * 0.3);
        const angle = (i / clusterCount) * Math.PI * 2;
        const yOff = Math.random() * size * 0.3;

        const geo = new THREE.IcosahedronGeometry(r, 2);
        const pos = geo.attributes.position;
        for (let j = 0; j < pos.count; j++) {
            const x = pos.getX(j), y = pos.getY(j), z = pos.getZ(j);
            const n = noise.fbm(x*0.8+i, y*0.8+i, z*0.8+i, 3, 2.0, 0.5);
            const scale = 1 + n * 0.4;
            pos.setX(j, x * scale);
            pos.setY(j, y * scale * 0.8);
            pos.setZ(j, z * scale);
        }
        geo.computeVertexNormals();

        const mat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0.15 + Math.random()*0.1, 0.35 + Math.random()*0.15, 0.1),
            roughness: 0.75,
            metalness: 0.0,
            side: THREE.DoubleSide
        });
        const cluster = new THREE.Mesh(geo, mat);
        cluster.position.set(
            Math.cos(angle) * size * 0.2,
            size * 0.3 + yOff,
            Math.sin(angle) * size * 0.2
        );
        cluster.castShadow = true;
        cluster.receiveShadow = true;
        group.add(cluster);
    }

    return group;
}

// ============================================================================
// VEGETATION PLACEMENT - Dense jungle along trail
// ============================================================================

function createVegetation(scene, pathCurve) {
    const vegetation = new THREE.Group();
    const noise = new PerlinNoise(77777);
    const noise2 = new PerlinNoise(88888);

    // --- TREE PLACEMENT ---
    // Dense at start, thinning towards ruins clearing
    const treeCount = 100;
    for (let i = 0; i < treeCount; i++) {
        const t = i / treeCount + (Math.random() - 0.5) * 0.02;
        const pathPoint = pathCurve.getPointAt(Math.max(0, Math.min(1, t)));
        const pathTangent = pathCurve.getTangentAt(Math.max(0, Math.min(1, t)));
        const perp = new THREE.Vector3(-pathTangent.z, 0, pathTangent.x).normalize();

        // Distance from path: dense jungle on both sides
        const minDist = 4 + t * 2;
        const maxDist = 22 - t * 4; // Opens up near ruins
        const side = (Math.random() > 0.5 ? 1 : -1);
        const dist = minDist + Math.random() * Math.max(1, maxDist - minDist);

        const treeHeight = 7 + Math.random() * 9;
        const treeRadius = 0.25 + Math.random() * 0.35;
        const variant = Math.floor(Math.random() * 4);
        const hasButtress = treeHeight > 10 && Math.random() > 0.4;

        let tree;
        // 15% chance of palm tree
        if (Math.random() > 0.85) {
            tree = createPalmTree(noise, treeHeight);
        } else {
            tree = createFullTree(noise, treeHeight, treeRadius, variant, hasButtress);
        }

        tree.position.set(
            pathPoint.x + perp.x * dist * side + noise.noise2D(i * 13.7, 0) * 2,
            0,
            pathPoint.z + perp.z * dist * side + noise.noise2D(i * 7.3, 0) * 2
        );
        tree.rotation.y = Math.random() * Math.PI * 2;
        const s = 0.85 + Math.random() * 0.3;
        tree.scale.setScalar(s);
        vegetation.add(tree);

        // --- LIANA VINES from tall trees ---
        if (treeHeight > 8 && Math.random() > 0.35) {
            const vineCount = 1 + Math.floor(Math.random() * 3);
            for (let v = 0; v < vineCount; v++) {
                const vineLen = 4 + Math.random() * 6;
                const vineThick = 0.02 + Math.random() * 0.03;
                const vine = createLianaVine(noise, vineLen, vineThick);
                vine.position.copy(tree.position);
                vine.position.y = treeHeight * 0.6 * s;
                vine.position.x += (Math.random() - 0.5) * 3;
                vine.position.z += (Math.random() - 0.5) * 3;
                vegetation.add(vine);
            }
        }
    }

    // --- UNDERSTORY BUSHES ---
    for (let i = 0; i < 50; i++) {
        const t = Math.random();
        const pathPoint = pathCurve.getPointAt(t);
        const pathTangent = pathCurve.getTangentAt(t);
        const perp = new THREE.Vector3(-pathTangent.z, 0, pathTangent.x).normalize();
        const side = (Math.random() > 0.5 ? 1 : -1);
        const dist = 3 + Math.random() * 15;
        const bushSize = 0.8 + Math.random() * 1.2;

        const bush = createUnderstoryBush(noise2, bushSize);
        bush.position.set(
            pathPoint.x + perp.x * dist * side,
            0,
            pathPoint.z + perp.z * dist * side
        );
        vegetation.add(bush);
    }

    // --- FERNS ---
    for (let i = 0; i < 70; i++) {
        const t = Math.random();
        const pathPoint = pathCurve.getPointAt(t);
        const pathTangent = pathCurve.getTangentAt(t);
        const perp = new THREE.Vector3(-pathTangent.z, 0, pathTangent.x).normalize();
        const side = (Math.random() > 0.5 ? 1 : -1);
        const dist = 2 + Math.random() * 12;
        const fernScale = 0.4 + Math.random() * 0.7;

        const fern = createFern(fernScale);
        fern.position.set(
            pathPoint.x + perp.x * dist * side,
            0,
            pathPoint.z + perp.z * dist * side
        );
        fern.rotation.y = Math.random() * Math.PI * 2;
        vegetation.add(fern);
    }

    // --- BROAD-LEAF PLANTS ---
    for (let i = 0; i < 30; i++) {
        const t = Math.random();
        const pathPoint = pathCurve.getPointAt(t);
        const pathTangent = pathCurve.getTangentAt(t);
        const perp = new THREE.Vector3(-pathTangent.z, 0, pathTangent.x).normalize();
        const side = (Math.random() > 0.5 ? 1 : -1);
        const dist = 2 + Math.random() * 10;
        const plantScale = 0.6 + Math.random() * 0.8;

        const plant = createBroadLeafPlant(plantScale);
        plant.position.set(
            pathPoint.x + perp.x * dist * side,
            0,
            pathPoint.z + perp.z * dist * side
        );
        vegetation.add(plant);
    }

    // --- GRASS TUFTS ---
    for (let i = 0; i < 250; i++) {
        const t = Math.random();
        const pathPoint = pathCurve.getPointAt(t);
        const pathTangent = pathCurve.getTangentAt(t);
        const perp = new THREE.Vector3(-pathTangent.z, 0, pathTangent.x).normalize();
        const side = (Math.random() > 0.5 ? 1 : -1);
        const dist = 1 + Math.random() * 20;

        const tuft = createGrassTuft();
        tuft.position.set(
            pathPoint.x + perp.x * dist * side,
            0,
            pathPoint.z + perp.z * dist * side
        );
        vegetation.add(tuft);
    }

    // --- LEAF LITTER PATCHES ---
    for (let i = 0; i < 80; i++) {
        const t = Math.random();
        const pathPoint = pathCurve.getPointAt(t);
        const pathTangent = pathCurve.getTangentAt(t);
        const perp = new THREE.Vector3(-pathTangent.z, 0, pathTangent.x).normalize();
        const side = (Math.random() > 0.5 ? 1 : -1);
        const dist = 1 + Math.random() * 15;

        const litter = createLeafLitterPatch();
        litter.position.set(
            pathPoint.x + perp.x * dist * side,
            0.02,
            pathPoint.z + perp.z * dist * side
        );
        vegetation.add(litter);
    }

    // --- DENSE CANOPY OVERLAY ---
    // Large leaf planes at canopy height to block sky and create dense overhead cover
    for (let i = 0; i < 60; i++) {
        const t = Math.random() * 0.75; // Mostly in first 75%
        const pathPoint = pathCurve.getPointAt(t);

        const leafSize = 2 + Math.random() * 3;
        const leafGeo = new THREE.PlaneGeometry(leafSize, leafSize * (0.6 + Math.random() * 0.4));

        // Curve the canopy leaf
        const lp = leafGeo.attributes.position;
        for (let j = 0; j < lp.count; j++) {
            const ly = lp.getY(j);
            lp.setZ(j, ly * ly * 0.5);
        }
        leafGeo.computeVertexNormals();

        const leafMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0.12 + Math.random()*0.08, 0.3 + Math.random()*0.12, 0.08),
            roughness: 0.8,
            metalness: 0.0,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8 + Math.random() * 0.15
        });

        const canopyLeaf = new THREE.Mesh(leafGeo, leafMat);
        canopyLeaf.position.set(
            pathPoint.x + (Math.random() - 0.5) * 22,
            9 + Math.random() * 7,
            pathPoint.z + (Math.random() - 0.5) * 22
        );
        canopyLeaf.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.4;
        canopyLeaf.rotation.z = Math.random() * Math.PI;
        canopyLeaf.receiveShadow = true;
        vegetation.add(canopyLeaf);
    }

    // --- CROSSING VINES (hanging between trees across the trail) ---
    for (let i = 0; i < 12; i++) {
        const t = Math.random() * 0.6;
        const pathPoint = pathCurve.getPointAt(t);
        const pathTangent = pathCurve.getTangentAt(t);
        const perp = new THREE.Vector3(-pathTangent.z, 0, pathTangent.x).normalize();

        // Vine hanging across the trail
        const vineHeight = 5 + Math.random() * 4;
        const vineLength = 6 + Math.random() * 6;
        const points = [];
        const segs = 16;
        for (let j = 0; j <= segs; j++) {
            const st = j / segs;
            const sag = Math.sin(st * Math.PI) * (2 + Math.random());
            points.push(new THREE.Vector3(
                (st - 0.5) * vineLength,
                -sag,
                noise.fbm(st*3+i, 0, 0, 2, 2.0, 0.5) * 0.3
            ));
        }
        const curve = new THREE.CatmullRomCurve3(points);
        const vineGeo = new THREE.TubeGeometry(curve, 12, 0.025, 5, false);
        const vineMat = new THREE.MeshStandardMaterial({
            color: 0x3a3520,
            roughness: 0.85,
            metalness: 0.0
        });
        const vine = new THREE.Mesh(vineGeo, vineMat);
        vine.position.set(
            pathPoint.x,
            vineHeight,
            pathPoint.z
        );
        vine.rotation.y = Math.atan2(pathTangent.x, pathTangent.z) + Math.PI / 2;
        vine.castShadow = true;
        vegetation.add(vine);
    }

    scene.add(vegetation);
    return vegetation;
}

export { createVegetation };
