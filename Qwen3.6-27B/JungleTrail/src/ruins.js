import * as THREE from 'three';
import { PerlinNoise } from './terrain.js';

// ============================================================================
// STONE RUINS - Photorealistic temple ruins with weathering and overgrowth
// ============================================================================

// --- Procedural stone textures ---

function createStoneTexture(size = 1024, variant = 0) {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    const n1 = new PerlinNoise(55555 + variant * 1000);
    const n2 = new PerlinNoise(66666 + variant * 1000);
    const n3 = new PerlinNoise(77777 + variant * 1000);
    const n4 = new PerlinNoise(88888 + variant * 1000);

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const u = x / size, v = y / size;
            const idx = y * size + x;

            // Base stone: warm grey-brown (tropical sandstone/limestone)
            const base = n1.fbm(u*6, v*6, 0, 5, 2.0, 0.5);
            const detail = n2.fbm(u*18, v*18, 0, 3, 2.0, 0.5);
            const micro = n3.fbm(u*40, v*40, 0, 2, 2.0, 0.5);

            let r = 105 + base * 25 + detail * 12 + micro * 5;
            let g = 95 + base * 22 + detail * 10 + micro * 4;
            let b = 80 + base * 18 + detail * 8 + micro * 3;

            // Stone strata (horizontal layering)
            const strata = Math.abs(n1.fbm(u*1.5, v*20, 0, 3, 2.0, 0.5));
            if (strata < 0.08) {
                const sf = 1 - strata / 0.08;
                r = r * (1-sf*0.15) + (80) * sf*0.15;
                g = g * (1-sf*0.15) + (72) * sf*0.15;
                b = b * (1-sf*0.15) + (65) * sf*0.15;
            }

            // Pitting and weathering
            const pit = n4.fbm(u*25+100, v*25+100, 0, 3, 2.0, 0.6);
            if (pit > 0.4) {
                const pf = (pit - 0.4) * 1.67;
                r -= pf * 12;
                g -= pf * 10;
                b -= pf * 8;
            }

            // Cracks
            const crack = n2.fbm(u*20+200, v*20+200, 0, 3, 2.0, 0.7);
            if (crack > 0.45) {
                const cf = (crack - 0.45) * 1.82;
                r *= (1 - cf * 0.45);
                g *= (1 - cf * 0.45);
                b *= (1 - cf * 0.45);
            }

            // Moss coverage (more on top surfaces and in crevices)
            const moss = Math.max(0, n3.fbm(u*5+300, v*3+300, 0, 4, 2.0, 0.55));
            if (moss > 0.3) {
                const mf = (moss - 0.3) * 1.43;
                // Top-heavy moss distribution
                const topBias = smoothstep(0.6, 1.0, v);
                const mossFactor = mf * (0.4 + topBias * 0.6);

                // Moss: desaturated green-grey
                const mr = 35 + moss * 18;
                const mg = 58 + moss * 28;
                const mb = 22 + moss * 10;
                r = r * (1-mossFactor*0.65) + mr * mossFactor*0.65;
                g = g * (1-mossFactor*0.65) + mg * mossFactor*0.65;
                b = b * (1-mossFactor*0.65) + mb * mossFactor*0.65;
            }

            // Lichen spots (lighter grey-green patches)
            const lichen = Math.max(0, n4.fbm(u*15+400, v*10+400, 0, 3, 2.0, 0.5));
            if (lichen > 0.35) {
                const lf = (lichen - 0.35) * 1.54;
                const lr = 85 + lichen * 15;
                const lg = 95 + lichen * 12;
                const lb = 75 + lichen * 8;
                r = r * (1-lf*0.25) + lr * lf*0.25;
                g = g * (1-lf*0.25) + lg * lf*0.25;
                b = b * (1-lf*0.25) + lb * lf*0.25;
            }

            // Water staining (darker streaks from water runoff)
            const stain = n1.fbm(u*3+500, v*15+500, 0, 3, 2.0, 0.5);
            if (stain > 0.2) {
                const sf2 = (stain - 0.2) * 1.25;
                r -= sf2 * 8;
                g -= sf2 * 6;
                b -= sf2 * 4;
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

function createStoneNormalMap(size = 1024, variant = 0) {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    const n1 = new PerlinNoise(55555 + variant * 1000);
    const n2 = new PerlinNoise(66666 + variant * 1000);
    const eps = 0.004;
    const scale = 8;

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const u = x / size * scale;
            const v = y / size * scale;
            const idx = y * size + x;

            const h = (nx, ny) => {
                let val = n1.fbm(nx, ny, 0, 5, 2.0, 0.5);
                val += n2.fbm(nx*2.2, ny*2.2, 0.5, 3, 2.0, 0.5) * 0.5;
                // Strata contribution
                val += Math.abs(n1.fbm(nx*0.2, ny*2.5, 0, 3, 2.0, 0.5)) * 0.3;
                return val;
            };

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

function createStoneRoughnessMap(size = 512, variant = 0) {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    const n1 = new PerlinNoise(55555 + variant * 1000);

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = y * size + x;
            const u = x / size, v = y / size;

            let roughness = 0.82 + n1.fbm(u*12, v*12, 0, 4, 2.0, 0.5) * 0.12;

            // Moss areas are slightly rougher
            const moss = Math.max(0, n1.fbm(u*5+300, v*3+300, 0, 4, 2.0, 0.55));
            if (moss > 0.3) {
                roughness += (moss - 0.3) * 0.15;
            }

            const val = Math.max(0, Math.min(255, roughness * 255));
            data[idx*4] = val; data[idx*4+1] = val; data[idx*4+2] = val; data[idx*4+3] = 255;
        }
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

// --- Shared stone materials ---
const stoneMaterials = new Map();

function getStoneMaterial(variant = 0) {
    if (!stoneMaterials.has(variant)) {
        const diffuseCanvas = createStoneTexture(1024, variant);
        const normalCanvas = createStoneNormalMap(1024, variant);
        const roughnessCanvas = createStoneRoughnessMap(512, variant);

        const mat = new THREE.MeshStandardMaterial({
            map: new THREE.CanvasTexture(diffuseCanvas),
            normalMap: new THREE.CanvasTexture(normalCanvas),
            normalScale: new THREE.Vector2(0.7, 0.7),
            roughnessMap: new THREE.CanvasTexture(roughnessCanvas),
            roughness: 0.85,
            metalness: 0.03,
            color: 0xffffff
        });
        stoneMaterials.set(variant, mat);
    }
    return stoneMaterials.get(variant);
}

// --- Stone block with weathering ---

function createWeatheredBlock(w, h, d, noise, segments = 4) {
    const geo = new THREE.BoxGeometry(w, h, d, segments, segments, segments);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);

        // Weathering displacement
        const weather = noise.fbm(x*0.4+100, y*0.4+100, z*0.4+100, 3, 2.0, 0.5);
        const erosion = Math.max(0, weather) * 0.08;

        // More erosion on top and edges
        const topFactor = smoothstep(h*0.3, h*0.5, y);
        const edgeX = smoothstep(w*0.3, w*0.5, Math.abs(x));
        const edgeZ = smoothstep(d*0.3, d*0.5, Math.abs(z));
        const edgeFactor = Math.max(edgeX, edgeZ);

        const totalErosion = erosion * (0.5 + topFactor * 0.3 + edgeFactor * 0.2);
        const normal = new THREE.Vector3(x, y, z).normalize();

        pos.setX(i, x + normal.x * totalErosion);
        pos.setY(i, y + normal.y * totalErosion);
        pos.setZ(i, z + normal.z * totalErosion);
    }
    geo.computeVertexNormals();
    return geo;
}

// --- Crumbling wall section ---

function createWallSection(noise, w, h, d, damage = 0.3, variant = 0) {
    const group = new THREE.Group();
    const mat = getStoneMaterial(variant);

    // Main wall body
    const wallGeo = createWeatheredBlock(w, h, d, noise, 5);
    const wall = new THREE.Mesh(wallGeo, mat);
    wall.castShadow = true;
    wall.receiveShadow = true;
    group.add(wall);

    // Broken top edge
    if (damage > 0.15) {
        const pieceCount = Math.floor(damage * 6);
        for (let i = 0; i < pieceCount; i++) {
            const pw = 0.2 + Math.random() * 0.5;
            const ph = 0.15 + Math.random() * 0.3;
            const pd = 0.2 + Math.random() * 0.4;
            const pieceGeo = createWeatheredBlock(pw, ph, pd, noise, 2);
            const piece = new THREE.Mesh(pieceGeo, mat);
            piece.position.set(
                (Math.random() - 0.5) * w * 0.7,
                h/2 + Math.random() * 0.3,
                (Math.random() - 0.5) * d * 0.7
            );
            piece.rotation.set(
                Math.random() * 0.2,
                Math.random() * Math.PI,
                Math.random() * 0.2
            );
            piece.castShadow = true;
            group.add(piece);
        }
    }

    // Fallen stones at base
    const fallenCount = Math.floor(damage * 10);
    for (let i = 0; i < fallenCount; i++) {
        const size = 0.15 + Math.random() * 0.5;
        const fallenGeo = createWeatheredBlock(size, size*0.35, size*0.8, noise, 2);
        const fallen = new THREE.Mesh(fallenGeo, mat);
        fallen.position.set(
            (Math.random() - 0.5) * (w + 2.5),
            0.1,
            d/2 + 0.5 + Math.random() * 2.5
        );
        fallen.rotation.y = Math.random() * Math.PI;
        fallen.castShadow = true;
        fallen.receiveShadow = true;
        group.add(fallen);
    }

    return group;
}

// --- Temple pillar ---

function createPillar(noise, height = 6, radius = 0.55, broken = false, variant = 0) {
    const group = new THREE.Group();
    const mat = getStoneMaterial(variant);

    const shaftH = broken ? height * (0.35 + Math.random() * 0.3) : height;

    // Fluted shaft
    const shaftGeo = new THREE.CylinderGeometry(radius*0.88, radius, shaftH, 12, 4);
    const pos = shaftGeo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const angle = Math.atan2(z, x);
        const dist = Math.sqrt(x*x + z*z);

        // Fluting (vertical grooves)
        const flute = Math.sin(angle * 10) * 0.04;
        // Carved bands
        const band = Math.sin(y * 2.5) * 0.025;
        // Weathering
        const weather = noise.fbm(angle*2+100, y*0.3+100, 0, 3, 2.0, 0.5) * 0.04;

        const scale = 1 + (flute + band + weather) / dist;
        pos.setX(i, x * scale);
        pos.setZ(i, z * scale);
    }
    shaftGeo.computeVertexNormals();

    const shaft = new THREE.Mesh(shaftGeo, mat);
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    group.add(shaft);

    // Capital (top decoration)
    if (!broken) {
        const capGeo = createWeatheredBlock(radius*2.2, 0.45, radius*2.2, noise, 3);
        const cap = new THREE.Mesh(capGeo, mat);
        cap.position.y = shaftH/2 + 0.22;
        cap.castShadow = true;
        group.add(cap);

        // Capital decoration - small blocks
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const decGeo = createWeatheredBlock(0.3, 0.25, 0.3, noise, 2);
            const dec = new THREE.Mesh(decGeo, mat);
            dec.position.set(
                Math.cos(angle) * radius * 1.1,
                shaftH/2 + 0.55,
                Math.sin(angle) * radius * 1.1
            );
            dec.castShadow = true;
            group.add(dec);
        }
    }

    // Base
    const baseGeo = createWeatheredBlock(radius*2.2, 0.35, radius*2.2, noise, 3);
    const base = new THREE.Mesh(baseGeo, mat);
    base.position.y = -shaftH/2 - 0.17;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // Base step
    const stepGeo = createWeatheredBlock(radius*2.8, 0.2, radius*2.8, noise, 2);
    const step = new THREE.Mesh(stepGeo, mat);
    step.position.y = -shaftH/2 - 0.4;
    step.receiveShadow = true;
    group.add(step);

    return group;
}

// --- Carved stone slab (for altar, steps, floor) ---

function createCarvedSlab(w, h, d, noise, variant = 0) {
    const group = new THREE.Group();
    const mat = getStoneMaterial(variant);

    const slabGeo = createWeatheredBlock(w, h, d, noise, 4);
    const slab = new THREE.Mesh(slabGeo, mat);
    slab.castShadow = true;
    slab.receiveShadow = true;
    group.add(slab);

    return group;
}

// --- Vine overlay for ruins ---

function createRuinsVines(noise, count = 8) {
    const vineGroup = new THREE.Group();

    const vineMat = new THREE.MeshStandardMaterial({
        color: 0x3a4a2a,
        roughness: 0.8,
        metalness: 0.0
    });

    const leafMat = new THREE.MeshStandardMaterial({
        color: 0x2a5a1a,
        roughness: 0.7,
        metalness: 0.0,
        side: THREE.DoubleSide
    });

    for (let i = 0; i < count; i++) {
        const points = [];
        const segs = 18;
        const startX = (Math.random() - 0.5) * 5;
        const startZ = (Math.random() - 0.5) * 3;
        const vineHeight = 3 + Math.random() * 5;

        for (let j = 0; j <= segs; j++) {
            const t = j / segs;
            points.push(new THREE.Vector3(
                startX + noise.fbm(t*2.5+i*10, 0, 0, 2, 2.0, 0.5) * 0.6,
                t * vineHeight,
                startZ + noise.fbm(0, t*2.5+i*10, 0, 2, 2.0, 0.5) * 0.6
            ));
        }

        const curve = new THREE.CatmullRomCurve3(points);
        const thickness = 0.02 + Math.random() * 0.03;
        const vineGeo = new THREE.TubeGeometry(curve, 12, thickness, 5, false);
        const vine = new THREE.Mesh(vineGeo, vineMat);
        vine.castShadow = true;
        vineGroup.add(vine);

        // Leaf clusters along vine
        for (let j = 3; j < segs; j += 2) {
            const t = j / segs;
            const pos = curve.getPoint(t);
            const leafSize = 0.2 + Math.random() * 0.25;

            const leafGeo = new THREE.PlaneGeometry(leafSize * 2, leafSize);
            const leaf = new THREE.Mesh(leafGeo, leafMat);
            leaf.position.copy(pos);
            leaf.rotation.set(
                Math.random() * 0.6,
                Math.random() * Math.PI * 2,
                Math.random() * 0.6
            );
            vineGroup.add(leaf);
        }
    }

    return vineGroup;
}

// --- Moss patches on stone ---

function createMossPatch(noise, size = 1) {
    const group = new THREE.Group();

    const mossMat = new THREE.MeshStandardMaterial({
        color: 0x2a5a1a,
        roughness: 0.9,
        metalness: 0.0
    });

    // Irregular moss blob
    const mossGeo = new THREE.IcosahedronGeometry(size * 0.3, 2);
    const pos = mossGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const n = noise.fbm(x*2, y*2, z*2, 3, 2.0, 0.5);
        const scale = 1 + n * 0.5;
        pos.setX(i, x * scale);
        pos.setY(i, y * scale * 0.4); // Flatten
        pos.setZ(i, z * scale);
    }
    mossGeo.computeVertexNormals();

    const moss = new THREE.Mesh(mossGeo, mossMat);
    moss.receiveShadow = true;
    group.add(moss);

    return group;
}

// ============================================================================
// FULL RUINS COMPLEX
// ============================================================================

function createRuins(scene, pathCurve) {
    const ruins = new THREE.Group();
    const noise = new PerlinNoise(88888);
    const noise2 = new PerlinNoise(99999);

    // Position at clearing
    const ruinsPos = pathCurve.getPointAt(0.85);
    const ruinsTangent = pathCurve.getTangentAt(0.85);
    ruins.position.set(ruinsPos.x, 0, ruinsPos.z);
    // Align with path direction
    ruins.rotation.y = Math.atan2(ruinsTangent.x, ruinsTangent.z);

    // --- MAIN TEMPLE STRUCTURE ---

    // Back wall (largest, against cliff face)
    const backWall = createWallSection(noise, 14, 7, 1.8, 0.15, 0);
    backWall.position.set(0, 3.5, -6);
    ruins.add(backWall);

    // Carved relief on back wall
    const reliefGeo = createWeatheredBlock(4, 3, 0.3, noise, 3);
    const relief = new THREE.Mesh(reliefGeo, getStoneMaterial(0));
    relief.position.set(0, 4, -5.05);
    relief.castShadow = true;
    ruins.add(relief);

    // Side walls (partially collapsed)
    const leftWall = createWallSection(noise, 1.8, 5.5, 10, 0.45, 1);
    leftWall.position.set(-7, 2.75, -1);
    leftWall.rotation.y = Math.PI / 2;
    ruins.add(leftWall);

    const rightWall = createWallSection(noise, 1.8, 4.5, 8, 0.55, 1);
    rightWall.position.set(7, 2.25, -0.5);
    rightWall.rotation.y = Math.PI / 2;
    ruins.add(rightWall);

    // Front wall sections (most damaged)
    const frontLeft = createWallSection(noise, 3.5, 3.5, 1.5, 0.65, 2);
    frontLeft.position.set(-5, 1.75, 4);
    ruins.add(frontLeft);

    const frontRight = createWallSection(noise, 2.5, 2.5, 1.5, 0.75, 2);
    frontRight.position.set(5.5, 1.25, 4);
    ruins.add(frontRight);

    // --- PILLARS ---
    const pillarPositions = [
        { x: -5, z: -3 }, { x: 5, z: -3 },
        { x: -5, z: 1 }, { x: 5, z: 1 },
        { x: 0, z: -4 },
        { x: -3, z: 3 }, { x: 3, z: 3 }
    ];

    pillarPositions.forEach((p, i) => {
        const broken = Math.random() > 0.45;
        const pillar = createPillar(noise, 5 + Math.random() * 2, 0.5, broken, i % 3);
        pillar.position.set(p.x, 2.5, p.z);
        pillar.rotation.y = (Math.random() - 0.5) * 0.15;
        // Slight lean for broken pillars
        if (broken) {
            pillar.rotation.x = (Math.random() - 0.5) * 0.1;
        }
        ruins.add(pillar);
    });

    // Fallen pillar (dramatic)
    const fallenPillar = createPillar(noise, 6, 0.5, true, 0);
    fallenPillar.position.set(3, 0.3, 5);
    fallenPillar.rotation.z = Math.PI / 2 - 0.2;
    fallenPillar.rotation.y = 0.4;
    ruins.add(fallenPillar);

    // --- TEMPLE FLOOR ---
    // Stone floor tiles with cracks and overgrowth
    for (let ix = -2; ix <= 2; ix++) {
        for (let iz = -2; iz <= 2; iz++) {
            if (Math.random() > 0.7) continue; // Some missing tiles
            const tileGeo = createWeatheredBlock(2.5, 0.25, 2.5, noise2, 2);
            const tile = new THREE.Mesh(tileGeo, getStoneMaterial(Math.floor(Math.random()*3)));
            tile.position.set(ix * 2.6, 0.12, iz * 2.6 - 1);
            tile.receiveShadow = true;
            tile.castShadow = true;
            ruins.add(tile);

            // Moss on some tiles
            if (Math.random() > 0.5) {
                const moss = createMossPatch(noise2, 0.8);
                moss.position.set(ix * 2.6 + (Math.random()-0.5), 0.25, iz * 2.6 - 1 + (Math.random()-0.5));
                ruins.add(moss);
            }
        }
    }

    // --- STEPS ---
    for (let i = 0; i < 5; i++) {
        const stepW = 5 - i * 0.2;
        const stepGeo = createWeatheredBlock(stepW, 0.3, 1.4, noise, 3);
        const step = new THREE.Mesh(stepGeo, getStoneMaterial(i % 3));
        step.position.set(0, i * 0.3, 5.5 + i * 1.3);
        step.castShadow = true;
        step.receiveShadow = true;
        ruins.add(step);
    }

    // --- ALTAR / STONE TABLE ---
    const altarGroup = new THREE.Group();

    // Base
    const altarBase = createWeatheredBlock(2.5, 0.4, 2, noise, 3);
    const altarBaseMesh = new THREE.Mesh(altarBase, getStoneMaterial(0));
    altarBaseMesh.position.y = 0.2;
    altarBaseMesh.castShadow = true;
    altarBaseMesh.receiveShadow = true;
    altarGroup.add(altarBaseMesh);

    // Pillar supports
    for (let i = 0; i < 4; i++) {
        const px = (i % 2 === 0 ? -1 : 1) * 0.9;
        const pz = (i < 2 ? -1 : 1) * 0.7;
        const pillarGeo = createWeatheredBlock(0.3, 0.8, 0.3, noise, 2);
        const pillarMesh = new THREE.Mesh(pillarGeo, getStoneMaterial(0));
        pillarMesh.position.set(px, 0.8, pz);
        pillarMesh.castShadow = true;
        altarGroup.add(pillarMesh);
    }

    // Top slab
    const altarTop = createWeatheredBlock(2.2, 0.3, 1.8, noise, 3);
    const altarTopMesh = new THREE.Mesh(altarTop, getStoneMaterial(0));
    altarTopMesh.position.y = 1.35;
    altarTopMesh.castShadow = true;
    altarTopMesh.receiveShadow = true;
    altarGroup.add(altarTopMesh);

    altarGroup.position.set(0, 0, -2);
    ruins.add(altarGroup);

    // --- CARVED STONE HEAD (broken) ---
    const headGeo = new THREE.IcosahedronGeometry(0.6, 3);
    const hPos = headGeo.attributes.position;
    for (let i = 0; i < hPos.count; i++) {
        const x = hPos.getX(i), y = hPos.getY(i), z = hPos.getZ(i);
        const n = noise.fbm(x*1.5, y*1.5, z*1.5, 4, 2.0, 0.5);
        // Shape into a rough head
        let scale = 1 + n * 0.3;
        // Flatten bottom
        if (y < -0.2) scale *= 0.7;
        // Elongate slightly
        hPos.setX(i, x * scale * 0.9);
        hPos.setY(i, y * scale * 1.1);
        hPos.setZ(i, z * scale * 0.8);
    }
    headGeo.computeVertexNormals();
    const headMesh = new THREE.Mesh(headGeo, getStoneMaterial(1));
    headMesh.position.set(-3, 0.6, -4.5);
    headMesh.rotation.y = 0.3;
    headMesh.castShadow = true;
    ruins.add(headMesh);

    // --- SCATTERED DEBRIS ---
    for (let i = 0; i < 40; i++) {
        const size = 0.15 + Math.random() * 0.7;
        const rockGeo = createWeatheredBlock(size, size*0.4, size*0.6, noise2, 2);
        const rock = new THREE.Mesh(rockGeo, getStoneMaterial(Math.floor(Math.random()*3)));
        rock.position.set(
            (Math.random() - 0.5) * 22,
            0.1,
            (Math.random() - 0.5) * 16
        );
        rock.rotation.set(
            Math.random() * 0.3,
            Math.random() * Math.PI,
            Math.random() * 0.3
        );
        rock.castShadow = true;
        rock.receiveShadow = true;
        ruins.add(rock);
    }

    // --- VINES ON STRUCTURES ---
    // Add vines to major structures
    const majorStructures = [backWall, leftWall, rightWall, altarGroup];
    majorStructures.forEach(struct => {
        const vines = createRuinsVines(noise2, 4 + Math.floor(Math.random() * 5));
        vines.position.copy(struct.position);
        ruins.add(vines);
    });

    // Additional free-standing vines
    for (let i = 0; i < 15; i++) {
        const vines = createRuinsVines(noise, 2 + Math.floor(Math.random() * 3));
        vines.position.set(
            (Math.random() - 0.5) * 16,
            0,
            (Math.random() - 0.5) * 12
        );
        ruins.add(vines);
    }

    // --- SMALL PLANTS GROWING IN CRACKS ---
    for (let i = 0; i < 20; i++) {
        const moss = createMossPatch(noise2, 0.5 + Math.random() * 0.8);
        moss.position.set(
            (Math.random() - 0.5) * 14,
            0.15 + Math.random() * 0.3,
            (Math.random() - 0.5) * 12
        );
        ruins.add(moss);
    }

    scene.add(ruins);
    return ruins;
}

function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

export { createRuins };
