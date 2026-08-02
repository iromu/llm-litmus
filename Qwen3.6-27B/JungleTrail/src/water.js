import * as THREE from 'three';
import { PerlinNoise } from './terrain.js';

// ============================================================================
// WATERFALL AND WATER — Photorealistic water systems
// ============================================================================

// Shared material cache
const waterMaterials = new Map();

// ---- NOISE FUNCTIONS (GLSL) ----
const noiseGLSL = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

float fbm3(vec3 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) {
        v += a * snoise(p);
        p = p * 2.0 + vec3(0.123, 0.456, 0.789);
        a *= 0.5;
    }
    return v;
}
`;

// ---- PROCEDURAL WATER TEXTURE (for normal map) ----
function createWaterNormalTexture(size = 512) {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    const noise = new PerlinNoise(77777);
    const noise2 = new PerlinNoise(88888);

    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const u = x / size;
            const v = y / size;

            // Flow direction noise
            const n1 = noise.fbm(u * 8, v * 4, 0, 4, 2.0, 0.5);
            const n2 = noise2.fbm(u * 6 + 100, v * 8 + 100, 0, 4, 2.0, 0.5);

            // Encode as normal (blue-ish = flat, variations = waves)
            const r = 128 + n1 * 40;
            const g = 128 + n2 * 40;
            const b = 200 + (n1 + n2) * 20;

            const idx = (y * size + x) * 4;
            data[idx] = Math.max(0, Math.min(255, r));
            data[idx + 1] = Math.max(0, Math.min(255, g));
            data[idx + 2] = Math.max(0, Math.min(255, b));
            data[idx + 3] = 255;
        }
    }
    ctx.putImageData(imageData, 0, 0);
    return new THREE.CanvasTexture(canvas);
}

// ---- FOAM TEXTURE ----
function createFoamTexture(size = 256) {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    const noise = new PerlinNoise(55555);

    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const u = x / size;
            const v = y / size;

            // Foam: cellular noise pattern
            const n = noise.fbm(u * 20, v * 20, 0, 4, 2.0, 0.5);
            const foam = smoothstepJS(0.2, 0.6, n);
            const detail = noise.fbm(u * 40 + 50, v * 40 + 50, 0, 3, 2.0, 0.5) * 0.3;

            const val = Math.max(0, Math.min(1, foam + detail));

            const idx = (y * size + x) * 4;
            data[idx] = 240 + val * 15;
            data[idx + 1] = 245 + val * 10;
            data[idx + 2] = 250;
            data[idx + 3] = val * 255;
        }
    }
    ctx.putImageData(imageData, 0, 0);
    return new THREE.CanvasTexture(canvas);
}

// ---- WET STAIN TEXTURE ----
function createWetStainTexture(size = 256) {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    const noise = new PerlinNoise(66666);

    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const u = x / size;
            const v = y / size;

            // Vertical water stain pattern (water runs down)
            const vertical = noise.fbm(u * 6, v * 12, 0, 4, 2.0, 0.5);
            const detail = noise.fbm(u * 16, v * 32, 0, 3, 2.0, 0.5) * 0.3;
            const stain = smoothstepJS(0.0, 0.5, vertical + detail);

            // Mineral deposits (lighter streaks)
            const mineral = Math.max(0, noise.fbm(u * 10 + 200, v * 20 + 200, 0, 3, 2.0, 0.6));
            const mineralStreak = smoothstepJS(0.4, 0.7, mineral) * 0.3;

            const idx = (y * size + x) * 4;
            data[idx] = 30 + mineralStreak * 60;     // Dark with mineral lightening
            data[idx + 1] = 35 + mineralStreak * 50;
            data[idx + 2] = 30 + mineralStreak * 40;
            data[idx + 3] = stain * 255;
        }
    }
    ctx.putImageData(imageData, 0, 0);
    return new THREE.CanvasTexture(canvas);
}

// ============================================================================
// WATERFALL — Multi-layer with turbulence, foam, spray
// ============================================================================

function createWaterfall(scene, position, height = 22, width = 10) {
    const group = new THREE.Group();
    group.position.copy(position);
    const noise = new PerlinNoise(12121);

    const waterNormal = createWaterNormalTexture();
    const foamTex = createFoamTexture();

    // ---- MAIN WATERFALL SHEET ----
    // High-segment plane for displacement
    const mainGeo = new THREE.PlaneGeometry(width, height, 64, 128);

    // Deform vertices for natural flow
    const mainPos = mainGeo.attributes.position;
    for (let i = 0; i < mainPos.count; i++) {
        const x = mainPos.getX(i);
        const y = mainPos.getY(i);
        const t = (y / height) + 0.5; // 0=top, 1=bottom

        // Water spreads as it falls
        const spread = Math.abs(t - 0.5) * 1.5;
        const turbX = noise.fbm(x * 0.3 + 100, t * 4, 0, 3, 2.0, 0.5) * spread;
        const turbZ = noise.fbm(x * 0.5 + 200, t * 6, 0, 3, 2.0, 0.5) * 0.8;

        // Water separation: splits into streams near bottom
        const separation = smoothstepJS(0.6, 1.0, t) * noise.fbm(x * 0.8, t * 2, 0, 2, 2.0, 0.5) * 2.0;

        mainPos.setX(i, x + turbX + separation * Math.sign(x));
        mainPos.setZ(i, turbZ + Math.abs(x) * 0.15);
    }
    mainGeo.computeVertexNormals();

    const mainMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uWaterNormal: { value: waterNormal },
            uFoamTex: { value: foamTex },
            uHeight: { value: height },
            uColorDeep: { value: new THREE.Color(0.05, 0.15, 0.2) },
            uColorShallow: { value: new THREE.Color(0.4, 0.6, 0.65) },
            uFoamColor: { value: new THREE.Color(0.9, 0.93, 0.95) }
        },
        vertexShader: noiseGLSL + `
            uniform float uTime;
            uniform float uHeight;
            varying vec2 vUv;
            varying vec3 vWorldPos;
            varying float vFallProgress;

            void main() {
                vUv = uv;
                vec3 pos = position;
                vFallProgress = 1.0 - uv.y; // 0=top, 1=bottom

                // Animated flow
                float speed = vFallProgress * 3.0 + 1.0;
                pos.x += sin(pos.y * 0.3 + uTime * speed) * 0.15 * vFallProgress;
                pos.z += cos(pos.y * 0.5 + uTime * speed * 0.7) * 0.1 * vFallProgress;

                // Turbulence increases toward bottom
                float turb = fbm3(vec3(pos.x * 0.5, pos.y * 0.2 + uTime * 2.0, 0.0)) * 0.3 * vFallProgress;
                pos.x += turb;
                pos.z += fbm3(vec3(pos.x * 0.7, pos.y * 0.3 + uTime * 1.5, 1.0)) * 0.2 * vFallProgress;

                vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `,
        fragmentShader: noiseGLSL + `
            uniform float uTime;
            uniform float uHeight;
            uniform sampler2D uWaterNormal;
            uniform sampler2D uFoamTex;
            uniform vec3 uColorDeep;
            uniform vec3 uColorShallow;
            uniform vec3 uFoamColor;
            varying vec2 vUv;
            varying vec3 vWorldPos;
            varying float vFallProgress;

            void main() {
                // Flowing UV
                vec2 flowUv = vUv;
                flowUv.y -= uTime * 0.3 * (1.0 + vFallProgress * 2.0);
                flowUv.x += sin(flowUv.y * 8.0 + uTime) * 0.02;

                // Water color based on depth and turbulence
                float turb = fbm3(vec3(flowUv.x * 6.0, flowUv.y * 4.0, uTime * 0.5));
                float aerated = smoothstep(0.2, 0.6, turb);

                // Deep water at top, aerated at bottom
                vec3 waterColor = mix(uColorDeep, uColorShallow, vFallProgress * 0.5 + aerated * 0.5);

                // Foam along edges
                float edgeDist = min(vUv.x, 1.0 - vUv.x);
                float edgeFoam = smoothstep(0.12, 0.0, edgeDist);
                // Foam increases at bottom
                edgeFoam *= 0.5 + vFallProgress * 0.5;

                // Internal foam streaks (turbulent white water)
                float foamStreak = fbm3(vec3(flowUv.x * 10.0, flowUv.y * 6.0, uTime * 0.8));
                foamStreak = smoothstep(0.3, 0.7, foamStreak) * 0.4;

                // Foam texture
                vec2 foamUv = flowUv * 3.0;
                foamUv.x += sin(foamUv.y * 5.0 + uTime) * 0.1;
                float foamPattern = texture2D(uFoamTex, foamUv).a;

                float totalFoam = max(edgeFoam, foamStreak * foamPattern);
                totalFoam = min(totalFoam, 0.85);

                // Bright specular highlights
                float spec = fbm3(vec3(flowUv.x * 20.0, flowUv.y * 15.0, uTime));
                spec = pow(max(spec, 0.0), 4.0) * 0.3;

                vec3 color = mix(waterColor, uFoamColor, totalFoam);
                color += spec;

                // Slight transparency
                float alpha = 0.85 + totalFoam * 0.15;

                gl_FragColor = vec4(color, alpha);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
    });

    const mainSheet = new THREE.Mesh(mainGeo, mainMat);
    mainSheet.position.y = height / 2 + 1;
    group.add(mainSheet);

    // ---- SECONDARY SHEET (behind, thinner) ----
    // Creates depth: water falling behind the main sheet
    const backGeo = new THREE.PlaneGeometry(width * 0.7, height * 0.85, 32, 64);
    const backMat = mainMat.clone();
    backMat.uniforms = {
        uTime: { value: 0 },
        uWaterNormal: { value: waterNormal },
        uFoamTex: { value: foamTex },
        uHeight: { value: height },
        uColorDeep: { value: new THREE.Color(0.03, 0.1, 0.15) },
        uColorShallow: { value: new THREE.Color(0.3, 0.5, 0.55) },
        uFoamColor: { value: new THREE.Color(0.85, 0.88, 0.9) }
    };

    const backSheet = new THREE.Mesh(backGeo, backMat);
    backSheet.position.set(0, height / 2 + 0.5, -1.5);
    group.add(backSheet);

    // ---- SIDE TRICKLE SHEETS ----
    // Water trickling down cliff sides
    for (let side = -1; side <= 1; side += 2) {
        const trickleW = 1.5 + Math.random();
        const trickleH = height * (0.6 + Math.random() * 0.3);
        const trickleGeo = new THREE.PlaneGeometry(trickleW, trickleH, 16, 32);
        const trickleMat = mainMat.clone();
        trickleMat.uniforms = {
            uTime: { value: 0 },
            uWaterNormal: { value: waterNormal },
            uFoamTex: { value: foamTex },
            uHeight: { value: height },
            uColorDeep: { value: new THREE.Color(0.08, 0.18, 0.22) },
            uColorShallow: { value: new THREE.Color(0.35, 0.55, 0.6) },
            uFoamColor: { value: new THREE.Color(0.88, 0.92, 0.94) }
        };

        const trickle = new THREE.Mesh(trickleGeo, trickleMat);
        trickle.position.set(side * (width / 2 + 1.5 + Math.random()), height / 2 - 1, -0.5);
        trickle.rotation.y = side * 0.3;
        group.add(trickle);
    }

    // ---- SPLASH PARTICLES (high velocity, small) ----
    const splashCount = 500;
    const splashGeo = new THREE.BufferGeometry();
    const splashPos = new Float32Array(splashCount * 3);
    const splashVel = new Float32Array(splashCount * 3);
    const splashSizes = new Float32Array(splashCount);

    for (let i = 0; i < splashCount; i++) {
        resetSplashParticle(i, splashPos, splashVel, splashSizes, width);
    }

    splashGeo.setAttribute('position', new THREE.BufferAttribute(splashPos, 3));
    splashGeo.setAttribute('size', new THREE.BufferAttribute(splashSizes, 1));

    const splashCanvas = document.createElement('canvas');
    splashCanvas.width = 32; splashCanvas.height = 32;
    const sCtx = splashCanvas.getContext('2d');
    const sGrad = sCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
    sGrad.addColorStop(0, 'rgba(255,255,255,1)');
    sGrad.addColorStop(0.3, 'rgba(220,235,245,0.6)');
    sGrad.addColorStop(1, 'rgba(200,220,230,0)');
    sCtx.fillStyle = sGrad;
    sCtx.fillRect(0, 0, 32, 32);

    const splashMat = new THREE.PointsMaterial({
        map: new THREE.CanvasTexture(splashCanvas),
        size: 0.25,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: THREE.NormalBlending,
        color: 0xddeeff,
        sizeAttenuation: true
    });

    const splashParticles = new THREE.Points(splashGeo, splashMat);
    group.add(splashParticles);

    // ---- HEAVY MIST / SPRAY (larger, slower, more voluminous) ----
    const mistCount = 400;
    const mistGeo = new THREE.BufferGeometry();
    const mistPos = new Float32Array(mistCount * 3);
    const mistVel = new Float32Array(mistCount * 3);
    const mistSizes = new Float32Array(mistCount);

    for (let i = 0; i < mistCount; i++) {
        mistPos[i * 3] = (Math.random() - 0.5) * width * 3;
        mistPos[i * 3 + 1] = Math.random() * 6;
        mistPos[i * 3 + 2] = 1 + Math.random() * 8;
        mistVel[i * 3] = (Math.random() - 0.5) * 0.5;
        mistVel[i * 3 + 1] = 0.2 + Math.random() * 0.5;
        mistVel[i * 3 + 2] = 0.3 + Math.random() * 0.8;
        mistSizes[i] = 2 + Math.random() * 5;
    }

    mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPos, 3));
    mistGeo.setAttribute('size', new THREE.BufferAttribute(mistSizes, 1));

    const mistCanvas = document.createElement('canvas');
    mistCanvas.width = 64; mistCanvas.height = 64;
    const mCtx = mistCanvas.getContext('2d');
    const mGrad = mCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    mGrad.addColorStop(0, 'rgba(210,225,220,0.4)');
    mGrad.addColorStop(0.4, 'rgba(200,215,210,0.15)');
    mGrad.addColorStop(1, 'rgba(180,200,190,0)');
    mCtx.fillStyle = mGrad;
    mCtx.fillRect(0, 0, 64, 64);

    const mistMat = new THREE.PointsMaterial({
        map: new THREE.CanvasTexture(mistCanvas),
        size: 4,
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
        blending: THREE.NormalBlending,
        color: 0xc8ddd8,
        sizeAttenuation: true
    });

    const mistParticles = new THREE.Points(mistGeo, mistMat);
    group.add(mistParticles);

    // ---- WATER VAPOR PLANE ----
    // Rising mist plane at base for volumetric feel
    const vaporGeo = new THREE.PlaneGeometry(20, 12, 1, 1);
    const vaporMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            varying vec2 vUv;

            float hash(vec2 p) {
                return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
            }
            float noise(vec2 p) {
                vec2 i = floor(p), f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
                           mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
            }
            float fbm(vec2 p) {
                float v = 0.0, a = 0.5;
                for (int i = 0; i < 4; i++) {
                    v += a * noise(p);
                    p = p * 2.0 + vec2(0.123, 0.456);
                    a *= 0.5;
                }
                return v;
            }

            void main() {
                vec2 uv = vUv;
                float n1 = fbm(uv * 5.0 + uTime * 0.08);
                float n2 = fbm(uv * 3.0 - uTime * 0.05 + 100.0);
                float mist = n1 * 0.6 + n2 * 0.4;

                // Fade at edges
                float fade = smoothstep(0.0, 0.15, uv.x) * smoothstep(1.0, 0.85, uv.x);
                fade *= smoothstep(0.0, 0.2, uv.y) * smoothstep(1.0, 0.5, uv.y);

                // Rising motion: bottom is denser
                float vertical = smoothstep(1.0, 0.0, uv.y);

                float alpha = mist * fade * vertical * 0.15;
                gl_FragColor = vec4(0.8, 0.85, 0.83, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
    });

    const vaporPlane = new THREE.Mesh(vaporGeo, vaporMat);
    vaporPlane.position.set(0, 5, 4);
    vaporPlane.rotation.x = -0.3;
    group.add(vaporPlane);

    scene.add(group);

    return {
        group,
        mainSheet, backSheet,
        mainMat, backMat,
        splashParticles, splashPos, splashVel, splashSizes,
        mistParticles, mistPos, mistVel, mistSizes,
        vaporPlane, vaporMat,
        height, width
    };
}

function resetSplashParticle(i, pos, vel, sizes, width) {
    pos[i * 3] = (Math.random() - 0.5) * width * 1.2;
    pos[i * 3 + 1] = Math.random() * 0.5;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 2;
    vel[i * 3] = (Math.random() - 0.5) * 3;
    vel[i * 3 + 1] = 3 + Math.random() * 5;
    vel[i * 3 + 2] = (Math.random() - 0.5) * 2;
    sizes[i] = 0.15 + Math.random() * 0.25;
}

// ============================================================================
// RIVER — Flowing water following terrain
// ============================================================================

function createRiver(scene, pathCurve) {
    const group = new THREE.Group();
    const noise = new PerlinNoise(78787);

    const waterNormal = createWaterNormalTexture();
    const foamTex = createFoamTexture();

    // Build river as a ribbon following the path
    const riverStart = 0.65;
    const riverEnd = 0.92;
    const segments = 80;
    const riverWidth = 3; // Base width, widens near falls

    // Create ribbon geometry
    const vertices = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i <= segments; i++) {
        const t = riverStart + (i / segments) * (riverEnd - riverStart);
        const point = pathCurve.getPointAt(t);
        const tangent = pathCurve.getTangentAt(t);

        // Perpendicular direction
        const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

        // Width increases near waterfall
        const progress = (t - riverStart) / (riverEnd - riverStart);
        const w = riverWidth + progress * progress * 4;

        // Left and right bank
        const left = point.clone().add(normal.clone().multiplyScalar(w));
        const right = point.clone().sub(normal.clone().multiplyScalar(w));

        // Slight bank height variation
        const bankNoise = noise.fbm(t * 10, 0, 0, 3, 2.0, 0.5);

        vertices.push(left.x, 0.05 + bankNoise * 0.1, left.z);
        vertices.push(right.x, 0.05 - bankNoise * 0.1, right.z);

        uvs.push(0, t);
        uvs.push(1, t);

        if (i < segments) {
            const idx = i * 2;
            indices.push(idx, idx + 1, idx + 2);
            indices.push(idx + 1, idx + 3, idx + 2);
        }
    }

    const riverGeo = new THREE.BufferGeometry();
    riverGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    riverGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    riverGeo.setIndex(indices);
    riverGeo.computeVertexNormals();

    const riverMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uWaterNormal: { value: waterNormal },
            uFoamTex: { value: foamTex },
            uRiverStart: { value: riverStart },
            uRiverEnd: { value: riverEnd },
            uColorDeep: { value: new THREE.Color(0.08, 0.2, 0.25) },
            uColorShallow: { value: new THREE.Color(0.25, 0.45, 0.4) },
            uFoamColor: { value: new THREE.Color(0.85, 0.9, 0.92) }
        },
        vertexShader: `
            uniform float uTime;
            varying vec2 vUv;
            varying float vRiverProgress;
            varying vec3 vWorldPos;

            void main() {
                vUv = uv;
                vec3 pos = position;
                vRiverProgress = uv.y;

                // Gentle wave animation
                pos.y += sin(pos.x * 1.5 + uTime * 1.2) * 0.03;
                pos.y += cos(pos.z * 2.0 + uTime * 0.8) * 0.02;

                vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform sampler2D uWaterNormal;
            uniform sampler2D uFoamTex;
            uniform float uRiverStart;
            uniform float uRiverEnd;
            uniform vec3 uColorDeep;
            uniform vec3 uColorShallow;
            uniform vec3 uFoamColor;
            varying vec2 vUv;
            varying float vRiverProgress;
            varying vec3 vWorldPos;

            void main() {
                // Flow direction
                vec2 flowUv = vUv;
                flowUv.y -= uTime * 0.08;

                // Water color: calmer upstream, more turbulent near falls
                float turbulence = smoothstep(0.5, 1.0, vRiverProgress);

                // Depth variation across river
                float across = abs(vUv.x - 0.5) * 2.0;
                float depth = smoothstep(0.0, 0.7, across); // Deeper at edges

                vec3 waterColor = mix(uColorShallow, uColorDeep, depth * 0.5);
                waterColor = mix(waterColor, uColorShallow * 0.8, turbulence * 0.3);

                // Foam along banks
                float bankFoam = smoothstep(0.45, 0.5, across);
                float foamPattern = texture2D(uFoamTex, flowUv * 4.0).a;
                float foam = bankFoam * foamPattern * (0.3 + turbulence * 0.4);

                // Flow lines (streaks in current)
                float flowLine = sin(flowUv.y * 20.0 + sin(flowUv.x * 6.0 + uTime) * 2.0);
                flowLine = smoothstep(0.7, 1.0, flowLine) * 0.15 * turbulence;

                // Specular shimmer
                float shimmer = sin(flowUv.x * 15.0 + flowUv.y * 30.0 + uTime * 2.0);
                shimmer = pow(max(shimmer, 0.0), 8.0) * 0.2;

                vec3 color = mix(waterColor, uFoamColor, foam);
                color += flowLine + shimmer;

                // Fresnel-like effect
                float fresnel = pow(across, 2.0) * 0.2;
                color += vec3(0.2, 0.25, 0.25) * fresnel;

                gl_FragColor = vec4(color, 0.82);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
    });

    const riverMesh = new THREE.Mesh(riverGeo, riverMat);
    group.add(riverMesh);

    // ---- RIVER BANKS ----
    // Rocky, muddy banks along the river
    const bankMat = new THREE.MeshStandardMaterial({
        color: 0x3a2a1a,
        roughness: 0.9,
        metalness: 0.0
    });

    const bankCount = 40;
    for (let i = 0; i < bankCount; i++) {
        const t = riverStart + Math.random() * (riverEnd - riverStart);
        const point = pathCurve.getPointAt(t);
        const tangent = pathCurve.getTangentAt(t);
        const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

        const progress = (t - riverStart) / (riverEnd - riverStart);
        const w = riverWidth + progress * progress * 4;

        for (let side = -1; side <= 1; side += 2) {
            if (Math.random() > 0.5) continue;

            const size = 0.3 + Math.random() * 0.8;
            const rockGeo = new THREE.IcosahedronGeometry(size, 1);

            // Deform
            const rPos = rockGeo.attributes.position;
            for (let j = 0; j < rPos.count; j++) {
                const nx = rPos.getX(j);
                const ny = rPos.getY(j);
                const nz = rPos.getZ(j);
                const n = noise.fbm(nx + i * 10, ny + i * 10, nz + i * 10, 2, 2.0, 0.5);
                rPos.setX(j, nx * (1 + n * 0.4));
                rPos.setY(j, ny * 0.5);
                rPos.setZ(j, nz * (1 + n * 0.3));
            }
            rockGeo.computeVertexNormals();

            const rock = new THREE.Mesh(rockGeo, bankMat);
            rock.position.set(
                point.x + normal.x * w * side * (1.1 + Math.random() * 0.3),
                -0.1,
                point.z + normal.z * w * side * (1.1 + Math.random() * 0.3)
            );
            rock.rotation.y = Math.random() * Math.PI;
            rock.castShadow = true;
            rock.receiveShadow = true;
            group.add(rock);
        }
    }

    scene.add(group);

    return { group, mesh: riverMesh, riverMat };
}

// ============================================================================
// SPLASH POOL — Turbulent pool at waterfall base
// ============================================================================

function createSplashPool(scene, position, radius = 8) {
    const group = new THREE.Group();
    group.position.copy(position);

    const waterNormal = createWaterNormalTexture();
    const foamTex = createFoamTexture();

    // Pool: high-segment circle for ripple displacement
    const poolGeo = new THREE.CircleGeometry(radius, 64, 32);
    poolGeo.rotateX(-Math.PI / 2);

    const poolMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uWaterNormal: { value: waterNormal },
            uFoamTex: { value: foamTex },
            uRadius: { value: radius },
            uColorDeep: { value: new THREE.Color(0.06, 0.18, 0.22) },
            uColorTurbulent: { value: new THREE.Color(0.35, 0.55, 0.55) },
            uFoamColor: { value: new THREE.Color(0.88, 0.92, 0.94) }
        },
        vertexShader: `
            uniform float uTime;
            uniform float uRadius;
            varying vec2 vUv;
            varying float vDistFromCenter;
            varying vec3 vWorldPos;

            void main() {
                vUv = uv;
                vec3 pos = position;
                float dist = length(pos.xz);
                vDistFromCenter = dist / uRadius;

                // Concentric ripples from center
                float ripple1 = sin(dist * 3.0 - uTime * 2.0) * exp(-dist * 0.2);
                float ripple2 = sin(dist * 5.0 - uTime * 3.0 + 1.0) * exp(-dist * 0.3) * 0.5;
                float ripple3 = sin(dist * 2.0 - uTime * 1.5 + 2.0) * exp(-dist * 0.15) * 0.3;
                pos.y += (ripple1 + ripple2 + ripple3) * 0.15;

                // Turbulent center
                float centerTurb = exp(-dist * 0.4) * sin(uTime * 4.0 + dist * 8.0) * 0.1;
                pos.y += centerTurb;

                vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform float uRadius;
            uniform sampler2D uWaterNormal;
            uniform sampler2D uFoamTex;
            uniform vec3 uColorDeep;
            uniform vec3 uColorTurbulent;
            uniform vec3 uFoamColor;
            varying vec2 vUv;
            varying float vDistFromCenter;
            varying vec3 vWorldPos;

            void main() {
                vec2 flowUv = vUv;
                flowUv.y -= uTime * 0.03;

                // Turbulent center, calmer edges
                float turb = exp(-vDistFromCenter * 1.5);

                // Base water color
                vec3 waterColor = mix(uColorTurbulent, uColorDeep, vDistFromCenter);

                // Foam ring around impact zone
                float foamRing = exp(-pow((vDistFromCenter - 0.15) * 4.0, 2.0));
                float foamPattern = texture2D(uFoamTex, flowUv * 5.0 + vec2(uTime * 0.1)).a;
                float foam = foamRing * foamPattern * 0.7;

                // Scattered foam patches
                float scatteredFoam = texture2D(uFoamTex, flowUv * 8.0 + vec2(0.0, uTime * 0.05)).a;
                scatteredFoam *= turb * 0.3;
                foam = max(foam, scatteredFoam);

                // Ripple highlight
                float dist = length(vWorldPos.xz - vec3(0.0, 0.0, 0.0));
                float rippleHighlight = sin(dist * 3.0 - uTime * 2.0) * exp(-dist * 0.2);
                rippleHighlight = max(rippleHighlight, 0.0) * 0.1;

                // Specular
                float spec = sin(vUv.x * 25.0 + uTime * 1.5) * sin(vUv.y * 20.0 + uTime);
                spec = pow(max(spec, 0.0), 6.0) * 0.25;

                vec3 color = mix(waterColor, uFoamColor, foam);
                color += rippleHighlight + spec;

                gl_FragColor = vec4(color, 0.88);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
    });

    const poolMesh = new THREE.Mesh(poolGeo, poolMat);
    poolMesh.position.y = 0.05;
    group.add(poolMesh);

    // ---- POOL EDGE ROCKS ----
    // Rocks around the pool edge, wet and mossy
    const noise = new PerlinNoise(56565);
    const wetRockMat = new THREE.MeshStandardMaterial({
        color: 0x3a4a3a,
        roughness: 0.25,
        metalness: 0.05,
        envMapIntensity: 0.8
    });

    const dryRockMat = new THREE.MeshStandardMaterial({
        color: 0x4a5a4a,
        roughness: 0.7,
        metalness: 0.0
    });

    for (let i = 0; i < 25; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = radius * (0.8 + Math.random() * 0.6);
        const size = 0.4 + Math.random() * 1.2;

        const rockGeo = new THREE.IcosahedronGeometry(size, 2);
        const rPos = rockGeo.attributes.position;
        for (let j = 0; j < rPos.count; j++) {
            const nx = rPos.getX(j);
            const ny = rPos.getY(j);
            const nz = rPos.getZ(j);
            const n = noise.fbm(nx * 0.5 + i * 10, ny * 0.5 + i * 10, nz * 0.5 + i * 10, 3, 2.0, 0.5);
            rPos.setX(j, nx * (1 + n * 0.35));
            rPos.setY(j, ny * (0.4 + n * 0.2));
            rPos.setZ(j, nz * (1 + n * 0.3));
        }
        rockGeo.computeVertexNormals();

        const isWet = dist < radius * 1.0;
        const rock = new THREE.Mesh(rockGeo, isWet ? wetRockMat : dryRockMat);
        rock.position.set(
            Math.cos(angle) * dist,
            -0.15 + Math.random() * 0.2,
            Math.sin(angle) * dist
        );
        rock.rotation.set(
            (Math.random() - 0.5) * 0.3,
            Math.random() * Math.PI,
            (Math.random() - 0.5) * 0.3
        );
        rock.castShadow = true;
        rock.receiveShadow = true;
        group.add(rock);
    }

    scene.add(group);

    return { group, mesh: poolMesh, poolMat };
}

// ============================================================================
// WATERFALL CLIFF — Wet rock face behind waterfall
// ============================================================================

function createWaterfallCliff(scene, position, width = 14, height = 26) {
    const group = new THREE.Group();
    group.position.copy(position);
    const noise = new PerlinNoise(45454);

    const wetStainTex = createWetStainTexture();

    // Cliff face geometry
    const cliffGeo = new THREE.PlaneGeometry(width, height, 40, 60);

    // Displace for natural rock face
    const cPos = cliffGeo.attributes.position;
    for (let i = 0; i < cPos.count; i++) {
        const x = cPos.getX(i);
        const y = cPos.getY(i);
        const n = noise.fbm(x * 0.3 + 50, y * 0.2 + 50, 0, 4, 2.0, 0.5);
        const detail = noise.fbm(x * 0.8, y * 0.6, 0, 3, 2.0, 0.5) * 0.3;
        cPos.setZ(i, (n + detail) * 1.5);
    }
    cliffGeo.computeVertexNormals();

    // Cliff material with wet stains
    const cliffMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uWetStainTex: { value: wetStainTex },
            uColorDry: { value: new THREE.Color(0.28, 0.32, 0.28) },
            uColorWet: { value: new THREE.Color(0.15, 0.18, 0.16) },
            uMossColor: { value: new THREE.Color(0.2, 0.35, 0.15) }
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vWorldPos;
            void main() {
                vUv = uv;
                vNormal = normalize(normalMatrix * normal);
                vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform sampler2D uWetStainTex;
            uniform vec3 uColorDry;
            uniform vec3 uColorWet;
            uniform vec3 uMossColor;
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vWorldPos;

            void main() {
                vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
                float diff = max(dot(vNormal, lightDir), 0.0);

                // Wet stain pattern
                vec4 stain = texture2D(uWetStainTex, vUv * 2.0);
                float wetness = stain.a / 255.0;

                // Water flow animation (stains pulse slightly)
                float flowPulse = sin(vUv.y * 10.0 - uTime * 0.5) * 0.05;
                wetness += flowPulse;

                // Base rock color
                vec3 color = mix(uColorDry, uColorWet, wetness);

                // Moss patches (more on less wet areas)
                float moss = smoothstep(0.3, 0.6, stain.r / 255.0);
                moss *= (1.0 - wetness); // Less moss where wet
                color = mix(color, uMossColor, moss * 0.4);

                // Lighting
                color *= (0.3 + diff * 0.7);

                // Wet areas have specular
                float spec = pow(max(dot(reflect(-lightDir, vNormal), vec3(0.0, 1.0, 0.0)), 0.0), 32.0);
                color += spec * wetness * 0.3;

                gl_FragColor = vec4(color, 1.0);
            }
        `,
        side: THREE.DoubleSide
    });

    const cliffMesh = new THREE.Mesh(cliffGeo, cliffMat);
    cliffMesh.position.y = height / 2;
    cliffMesh.castShadow = true;
    cliffMesh.receiveShadow = true;
    group.add(cliffMesh);

    // ---- ROCK LEDGES ----
    // Horizontal ledges on the cliff face
    for (let i = 0; i < 6; i++) {
        const y = 3 + Math.random() * (height - 6);
        const ledgeW = 2 + Math.random() * 4;
        const ledgeX = (Math.random() - 0.5) * (width - ledgeW);

        const ledgeGeo = new THREE.BoxGeometry(ledgeW, 0.3, 1 + Math.random() * 0.5);
        const ledgeMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0.2 + Math.random() * 0.1, 0.25 + Math.random() * 0.1, 0.2),
            roughness: 0.6 + Math.random() * 0.3,
            metalness: 0.0
        });

        const ledge = new THREE.Mesh(ledgeGeo, ledgeMat);
        ledge.position.set(ledgeX, y, 1.5 + Math.random());
        ledge.rotation.y = (Math.random() - 0.5) * 0.2;
        ledge.castShadow = true;
        ledge.receiveShadow = true;
        group.add(ledge);
    }

    scene.add(group);

    return { group, cliffMesh, cliffMat };
}

// ============================================================================
// WET SURFACES — General wet ground/rock effect near water
// ============================================================================

function createWetSurfaces(scene, position, radius = 12) {
    const group = new THREE.Group();
    group.position.copy(position);

    // Wet ground plane
    const wetGroundGeo = new THREE.CircleGeometry(radius, 32);
    wetGroundGeo.rotateX(-Math.PI / 2);

    const wetStainTex = createWetStainTexture();

    const wetGroundMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uWetStainTex: { value: wetStainTex },
            uColorDry: { value: new THREE.Color(0.25, 0.2, 0.15) },
            uColorWet: { value: new THREE.Color(0.12, 0.1, 0.08) }
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vWorldPos;
            void main() {
                vUv = uv;
                vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform sampler2D uWetStainTex;
            uniform vec3 uColorDry;
            uniform vec3 uColorWet;
            varying vec2 vUv;
            varying vec3 vWorldPos;

            void main() {
                float dist = length(vWorldPos.xz);
                float wetness = 1.0 - smoothstep(0.0, ${radius.toFixed(1)}, dist);
                wetness = pow(wetness, 1.5);

                vec4 stain = texture2D(uWetStainTex, vUv * 4.0);
                wetness *= 0.5 + stain.a / 255.0 * 0.5;

                vec3 color = mix(uColorDry, uColorWet, wetness);

                // Specular on wet areas
                float spec = pow(max(sin(vUv.x * 30.0 + uTime) * sin(vUv.y * 25.0 + uTime * 0.7), 0.0), 16.0);
                color += spec * wetness * 0.15;

                gl_FragColor = vec4(color, wetness * 0.5);
            }
        `,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
    });

    const wetGround = new THREE.Mesh(wetGroundGeo, wetGroundMat);
    wetGround.position.y = 0.02;
    group.add(wetGround);

    scene.add(group);

    return { group, wetGroundMat };
}

// ============================================================================
// ANIMATION HELPERS
// ============================================================================

function animateWaterfall(water, delta, elapsed) {
    // Update shader uniforms
    if (water.mainMat) water.mainMat.uniforms.uTime.value = elapsed;
    if (water.backMat) water.backMat.uniforms.uTime.value = elapsed;
    if (water.vaporMat) water.vaporMat.uniforms.uTime.value = elapsed;

    // Animate splash particles
    if (water.splashParticles) {
        const pos = water.splashPos;
        const vel = water.splashVel;
        const w = water.width || 10;

        for (let i = 0; i < pos.length / 3; i++) {
            pos[i * 3] += vel[i * 3] * delta;
            pos[i * 3 + 1] += vel[i * 3 + 1] * delta;
            pos[i * 3 + 2] += vel[i * 3 + 2] * delta;

            vel[i * 3 + 1] -= 9.8 * delta; // gravity

            // Reset when fallen below pool
            if (pos[i * 3 + 1] < -0.5) {
                resetSplashParticle(i, pos, vel, water.splashSizes, w);
            }
        }
        water.splashParticles.geometry.attributes.position.needsUpdate = true;
    }

    // Animate mist particles
    if (water.mistParticles) {
        const pos = water.mistPos;
        const vel = water.mistVel;
        const w = water.width || 10;

        for (let i = 0; i < pos.length / 3; i++) {
            pos[i * 3] += vel[i * 3] * delta + Math.sin(elapsed + i) * 0.01;
            pos[i * 3 + 1] += vel[i * 3 + 1] * delta;
            pos[i * 3 + 2] += vel[i * 3 + 2] * delta;

            // Reset when too high or too far
            if (pos[i * 3 + 1] > 10 || Math.abs(pos[i * 3]) > w * 3 || pos[i * 3 + 2] > 15) {
                pos[i * 3] = (Math.random() - 0.5) * w * 1.5;
                pos[i * 3 + 1] = Math.random() * 2;
                pos[i * 3 + 2] = 1 + Math.random() * 3;
                vel[i * 3] = (Math.random() - 0.5) * 0.5;
                vel[i * 3 + 1] = 0.2 + Math.random() * 0.5;
                vel[i * 3 + 2] = 0.3 + Math.random() * 0.8;
            }
        }
        water.mistParticles.geometry.attributes.position.needsUpdate = true;
    }
}

function animateRiver(river, elapsed) {
    if (river.riverMat) {
        river.riverMat.uniforms.uTime.value = elapsed;
    }
}

function animateSplashPool(pool, elapsed) {
    if (pool.poolMat) {
        pool.poolMat.uniforms.uTime.value = elapsed;
    }
}

function smoothstepJS(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

export {
    createWaterfall,
    createRiver,
    createSplashPool,
    createWaterfallCliff,
    createWetSurfaces,
    animateWaterfall,
    animateRiver,
    animateSplashPool
};
