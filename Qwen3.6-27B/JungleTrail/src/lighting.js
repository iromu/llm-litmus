import * as THREE from 'three';
import { PerlinNoise } from './terrain.js';

// ============================================================================
// LIGHTING AND ATMOSPHERE - Photorealistic jungle lighting
// ============================================================================

function createLighting(scene, pathCurve) {
    // --- SKY ---
    // Jungle sky: mostly blocked by canopy, but visible gaps show warm tropical sky
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 2; skyCanvas.height = 512;
    const skyCtx = skyCanvas.getContext('2d');
    const skyGrad = skyCtx.createLinearGradient(0, 0, 0, 512);
    // Warm tropical sky fading to dark green canopy
    skyGrad.addColorStop(0.0, '#1a2a1a');   // Canopy dark
    skyGrad.addColorStop(0.15, '#2a3a28');  // Canopy layer
    skyGrad.addColorStop(0.3, '#3a5a3a');   // Upper canopy
    skyGrad.addColorStop(0.5, '#5a8a6a');   // Sky-green transition
    skyGrad.addColorStop(0.7, '#8ab89a');   // Hazy sky
    skyGrad.addColorStop(1.0, '#c8d8c0');   // Warm bright sky
    skyCtx.fillStyle = skyGrad;
    skyCtx.fillRect(0, 0, 2, 512);

    const skyTexture = new THREE.CanvasTexture(skyCanvas);
    skyTexture.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = skyTexture;

    // --- ATMOSPHERIC FOG ---
    // Exponential fog for depth and atmosphere
    // Jungle fog: greenish-grey, not pure white
    scene.fog = new THREE.FogExp2(0x3a5a4a, 0.012);

    // --- AMBIENT LIGHT ---
    // Very low ambient — jungle floor is dark
    const ambientLight = new THREE.AmbientLight(0x1a2a1a, 0.15);
    scene.add(ambientLight);

    // --- HEMISPHERE LIGHT ---
    // Sky color (filtered green) above, ground color (dark brown) below
    const hemiLight = new THREE.HemisphereLight(0x4a6a4a, 0x2a1a0a, 0.3);
    scene.add(hemiLight);

    // --- SUN LIGHT ---
    // Warm tropical sun filtering through canopy
    const sunLight = new THREE.DirectionalLight(0xffe8c0, 1.5);
    sunLight.position.set(25, 45, 15);
    sunLight.castShadow = true;

    // High-quality shadow settings
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 120;
    sunLight.shadow.camera.left = -50;
    sunLight.shadow.camera.right = 50;
    sunLight.shadow.camera.top = 50;
    sunLight.shadow.camera.bottom = -50;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.03;
    sunLight.shadow.radius = 3; // Soft shadow edges
    scene.add(sunLight);

    // --- FILL LIGHT ---
    // Cool, subtle fill from opposite side (sky bounce)
    const fillLight = new THREE.DirectionalLight(0x8899aa, 0.2);
    fillLight.position.set(-20, 25, -25);
    scene.add(fillLight);

    // --- GROUND BOUNCE LIGHT ---
    // Warm light bouncing up from ground
    const bounceLight = new THREE.DirectionalLight(0x3a2a1a, 0.1);
    bounceLight.position.set(0, -10, 0);
    scene.add(bounceLight);

    // --- GOD RAYS (Volumetric light shafts) ---
    const godRays = createGodRays(scene, pathCurve);

    // --- VOLUMETRIC MIST ---
    const mist = createVolumetricMist(scene, pathCurve);

    // --- DAPPLED LIGHT ---
    const dappledLight = createDappledLight(scene, pathCurve);

    // --- LIGHT SHAFTS AT RUINS ---
    // More open area = more direct light
    const ruinsLight = createRuinsLightShafts(scene, pathCurve);

    return { sunLight, fillLight, hemiLight, ambientLight, godRays, mist, dappledLight, ruinsLight };
}

// ============================================================================
// GOD RAYS - Volumetric light shafts through canopy gaps
// ============================================================================

function createGodRays(scene, pathCurve) {
    const noise = new PerlinNoise(54321);
    const rayGroup = new THREE.Group();

    // Create a soft, volumetric-looking light shaft texture
    const shaftCanvas = document.createElement('canvas');
    shaftCanvas.width = 64; shaftCanvas.height = 256;
    const shaftCtx = shaftCanvas.getContext('2d');

    // Radial gradient for shaft cross-section
    for (let y = 0; y < 256; y++) {
        for (let x = 0; x < 64; x++) {
            const u = x / 64;
            const v = y / 256;

            // Radial falloff from center
            const radialDist = Math.abs(u - 0.5) * 2;
            const radialFade = Math.exp(-radialDist * radialDist * 3);

            // Vertical fade: dim at top (canopy), brightest in middle, fades at ground
            const topFade = smoothstep(0, 0.15, v);
            const bottomFade = 1 - smoothstep(0.7, 1, v);
            const verticalFade = topFade * bottomFade;

            // Turbulence (dust/mist in the beam)
            const turb = noise.fbm(u*8, v*12, 0, 3, 2.0, 0.5) * 0.15;

            const alpha = (radialFade * verticalFade * (0.6 + turb)) * 255;
            shaftCtx.fillStyle = `rgba(255, 248, 230, ${alpha / 255})`;
            shaftCtx.fillRect(x, y, 1, 1);
        }
    }

    const shaftTexture = new THREE.CanvasTexture(shaftCanvas);

    // Place light shafts along the path
    for (let i = 0; i < 20; i++) {
        const t = Math.random() * 0.8; // Most in first 80%
        const pathPoint = pathCurve.getPointAt(t);

        const shaftHeight = 12 + Math.random() * 12;
        const shaftWidth = 1.5 + Math.random() * 2.5;

        // Use a plane with the shaft texture, rotated to point downward
        const shaftGeo = new THREE.PlaneGeometry(shaftWidth, shaftHeight);
        const shaftMat = new THREE.MeshBasicMaterial({
            map: shaftTexture,
            transparent: true,
            opacity: 0.12 + Math.random() * 0.08,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            color: 0xfff5e0
        });

        const shaft = new THREE.Mesh(shaftGeo, shaftMat);
        shaft.position.set(
            pathPoint.x + (Math.random() - 0.5) * 18,
            shaftHeight / 2 + 2,
            pathPoint.z + (Math.random() - 0.5) * 18
        );
        // Slight angle for natural look
        shaft.rotation.x = (Math.random() - 0.5) * 0.2;
        shaft.rotation.z = (Math.random() - 0.5) * 0.4;
        shaft.rotation.y = Math.random() * Math.PI;

        rayGroup.add(shaft);
    }

    scene.add(rayGroup);
    return rayGroup;
}

// ============================================================================
// VOLUMETRIC MIST - Ground-level fog and floating particles
// ============================================================================

function createVolumetricMist(scene, pathCurve) {
    const noise = new PerlinNoise(99999);
    const mistGroup = new THREE.Group();

    // --- MIST PARTICLES ---
    // Many small, soft particles simulating floating mist
    const particleCount = 800;
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
        const t = Math.random();
        const pathPoint = pathCurve.getPointAt(t);

        positions[i*3]   = pathPoint.x + (Math.random() - 0.5) * 45;
        positions[i*3+1] = 0.3 + Math.random() * 6; // Low to mid-height
        positions[i*3+2] = pathPoint.z + (Math.random() - 0.5) * 45;
        sizes[i] = 1.5 + Math.random() * 5;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Soft mist particle texture
    const mistCanvas = document.createElement('canvas');
    mistCanvas.width = 64; mistCanvas.height = 64;
    const mistCtx = mistCanvas.getContext('2d');
    const mistGrad = mistCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    mistGrad.addColorStop(0, 'rgba(200, 215, 200, 0.6)');
    mistGrad.addColorStop(0.3, 'rgba(180, 200, 180, 0.3)');
    mistGrad.addColorStop(0.7, 'rgba(160, 185, 160, 0.1)');
    mistGrad.addColorStop(1, 'rgba(140, 170, 140, 0)');
    mistCtx.fillStyle = mistGrad;
    mistCtx.fillRect(0, 0, 64, 64);

    const mistTexture = new THREE.CanvasTexture(mistCanvas);

    const mat = new THREE.PointsMaterial({
        map: mistTexture,
        size: 4,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
        blending: THREE.NormalBlending,
        color: 0xb0c8b0,
        sizeAttenuation: true
    });

    const mistParticles = new THREE.Points(geo, mat);
    mistGroup.add(mistParticles);

    // --- GROUND MIST LAYER ---
    // Horizontal fog plane close to ground
    const groundMistGeo = new THREE.PlaneGeometry(120, 250, 1, 1);

    // Animated ground mist shader
    const groundMistMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uMistTexture: { value: mistTexture }
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
            uniform sampler2D uMistTexture;
            varying vec2 vUv;

            // Simplex-like noise
            float hash(vec2 p) {
                return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
            }

            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);

                float a = hash(i);
                float b = hash(i + vec2(1.0, 0.0));
                float c = hash(i + vec2(0.0, 1.0));
                float d = hash(i + vec2(1.0, 1.0));

                return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
            }

            float fbm(vec2 p) {
                float v = 0.0;
                float a = 0.5;
                for (int i = 0; i < 5; i++) {
                    v += a * noise(p);
                    p = p * 2.0 + vec2(0.123, 0.456);
                    a *= 0.5;
                }
                return v;
            }

            void main() {
                vec2 uv = vUv;

                // Animated mist flow
                float n1 = fbm(uv * 6.0 + uTime * 0.05);
                float n2 = fbm(uv * 4.0 - uTime * 0.03 + 100.0);

                float mist = n1 * 0.6 + n2 * 0.4;
                mist = smoothstep(0.3, 0.7, mist);

                // Fade at edges
                float edgeFade = smoothstep(0.0, 0.05, uv.x) * smoothstep(1.0, 0.95, uv.x);
                edgeFade *= smoothstep(0.0, 0.08, uv.y) * smoothstep(1.0, 0.92, uv.y);

                float alpha = mist * edgeFade * 0.12;

                gl_FragColor = vec4(0.75, 0.82, 0.75, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
    });

    const groundMist = new THREE.Mesh(groundMistGeo, groundMistMat);
    groundMist.rotation.x = -Math.PI / 2;
    groundMist.position.y = 0.5;
    mistGroup.add(groundMist);

    // --- MID-HEIGHT MIST LAYER ---
    // Thinner fog layer at eye level for atmosphere
    const midMistGeo = new THREE.PlaneGeometry(120, 250, 1, 1);
    const midMistMat = groundMistMat.clone();
    midMistMat.uniforms = {
        uTime: { value: 0 },
        uMistTexture: { value: mistTexture }
    };

    const midMist = new THREE.Mesh(midMistGeo, midMistMat);
    midMist.rotation.x = -Math.PI / 2;
    midMist.position.y = 2.5;
    midMist.material.opacity = 0.06;
    mistGroup.add(midMist);

    scene.add(mistGroup);
    return { group: mistGroup, groundMist, midMist, groundMistMat, midMistMat };
}

// ============================================================================
// DAPPLED LIGHT - Sun spots filtering through canopy
// ============================================================================

function createDappledLight(scene, pathCurve) {
    const noise = new PerlinNoise(11111);
    const spotGroup = new THREE.Group();

    // Create organic light spot texture
    const spotCanvas = document.createElement('canvas');
    spotCanvas.width = 256; spotCanvas.height = 256;
    const spotCtx = spotCanvas.getContext('2d');

    // Multiple overlapping light patches
    for (let i = 0; i < 30; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const rx = 8 + Math.random() * 25;
        const ry = 8 + Math.random() * 20;

        const grad = spotCtx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
        const brightness = 0.15 + Math.random() * 0.2;
        grad.addColorStop(0, `rgba(255, 245, 210, ${brightness})`);
        grad.addColorStop(0.5, `rgba(255, 240, 200, ${brightness * 0.4})`);
        grad.addColorStop(1, 'rgba(255, 240, 200, 0)');

        spotCtx.fillStyle = grad;
        spotCtx.beginPath();
        spotCtx.ellipse(x, y, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
        spotCtx.fill();
    }

    const spotTexture = new THREE.CanvasTexture(spotCanvas);

    // Place dappled light spots along the path
    for (let i = 0; i < 50; i++) {
        const t = Math.random() * 0.75; // Mostly under canopy
        const pathPoint = pathCurve.getPointAt(t);

        const spotSize = 2 + Math.random() * 5;
        const spotGeo = new THREE.PlaneGeometry(spotSize, spotSize);
        const spotMat = new THREE.MeshBasicMaterial({
            map: spotTexture,
            transparent: true,
            opacity: 0.15 + Math.random() * 0.2,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            color: 0xfff5e0
        });

        const spot = new THREE.Mesh(spotGeo, spotMat);
        spot.rotation.x = -Math.PI / 2;
        spot.position.set(
            pathPoint.x + (Math.random() - 0.5) * 25,
            0.08,
            pathPoint.z + (Math.random() - 0.5) * 25
        );
        spot.rotation.z = Math.random() * Math.PI;

        spotGroup.add(spot);
    }

    // --- VOLUMETRIC DUST IN LIGHT BEAMS ---
    // Small bright particles floating in light shafts
    const dustCount = 300;
    const dustPositions = new Float32Array(dustCount * 3);
    const dustSizes = new Float32Array(dustCount);

    for (let i = 0; i < dustCount; i++) {
        const t = Math.random() * 0.75;
        const pathPoint = pathCurve.getPointAt(t);

        dustPositions[i*3]   = pathPoint.x + (Math.random() - 0.5) * 20;
        dustPositions[i*3+1] = 1 + Math.random() * 10;
        dustPositions[i*3+2] = pathPoint.z + (Math.random() - 0.5) * 20;
        dustSizes[i] = 0.2 + Math.random() * 0.5;
    }

    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    dustGeo.setAttribute('size', new THREE.BufferAttribute(dustSizes, 1));

    // Tiny bright dot texture
    const dustCanvas = document.createElement('canvas');
    dustCanvas.width = 16; dustCanvas.height = 16;
    const dustCtx = dustCanvas.getContext('2d');
    const dustGrad = dustCtx.createRadialGradient(8, 8, 0, 8, 8, 8);
    dustGrad.addColorStop(0, 'rgba(255, 250, 220, 1)');
    dustGrad.addColorStop(0.5, 'rgba(255, 250, 220, 0.3)');
    dustGrad.addColorStop(1, 'rgba(255, 250, 220, 0)');
    dustCtx.fillStyle = dustGrad;
    dustCtx.fillRect(0, 0, 16, 16);

    const dustMat = new THREE.PointsMaterial({
        map: new THREE.CanvasTexture(dustCanvas),
        size: 0.4,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        color: 0xfff5d0,
        sizeAttenuation: true
    });

    const dustParticles = new THREE.Points(dustGeo, dustMat);
    spotGroup.add(dustParticles);

    scene.add(spotGroup);
    return { group: spotGroup, dustParticles };
}

// ============================================================================
// RUINS LIGHT SHAFTS - Brighter light in the open clearing
// ============================================================================

function createRuinsLightShafts(scene, pathCurve) {
    const group = new THREE.Group();

    // Position at ruins clearing
    const ruinsPos = pathCurve.getPointAt(0.85);

    // Brighter, wider light shafts in the open area
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const dist = 3 + Math.random() * 8;

        const shaftHeight = 15 + Math.random() * 10;
        const shaftWidth = 2 + Math.random() * 3;

        const shaftGeo = new THREE.PlaneGeometry(shaftWidth, shaftHeight);

        // Brighter shaft texture for open area
        const shaftCanvas = document.createElement('canvas');
        shaftCanvas.width = 32; shaftCanvas.height = 128;
        const shaftCtx = shaftCanvas.getContext('2d');
        const shaftGrad = shaftCtx.createLinearGradient(0, 0, 0, 128);
        shaftGrad.addColorStop(0, 'rgba(255, 248, 230, 0)');
        shaftGrad.addColorStop(0.2, 'rgba(255, 248, 230, 0.3)');
        shaftGrad.addColorStop(0.6, 'rgba(255, 248, 230, 0.15)');
        shaftGrad.addColorStop(1, 'rgba(255, 248, 230, 0)');
        shaftCtx.fillStyle = shaftGrad;
        shaftCtx.fillRect(0, 0, 32, 128);

        // Add radial falloff
        const radGrad = shaftCtx.createRadialGradient(16, 64, 0, 16, 64, 16);
        radGrad.addColorStop(0, 'rgba(255, 248, 230, 0.3)');
        radGrad.addColorStop(1, 'rgba(255, 248, 230, 0)');
        shaftCtx.globalCompositeOperation = 'multiply';
        shaftCtx.fillStyle = radGrad;
        shaftCtx.fillRect(0, 0, 32, 128);

        const shaftTex = new THREE.CanvasTexture(shaftCanvas);

        const shaftMat = new THREE.MeshBasicMaterial({
            map: shaftTex,
            transparent: true,
            opacity: 0.15 + Math.random() * 0.1,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            color: 0xfff8e8
        });

        const shaft = new THREE.Mesh(shaftGeo, shaftMat);
        shaft.position.set(
            ruinsPos.x + Math.cos(angle) * dist,
            shaftHeight / 2 + 1,
            ruinsPos.z + Math.sin(angle) * dist
        );
        shaft.rotation.x = (Math.random() - 0.5) * 0.15;
        shaft.rotation.z = (Math.random() - 0.5) * 0.3;
        shaft.rotation.y = Math.random() * Math.PI;

        group.add(shaft);
    }

    // Spot light at ruins for dramatic illumination
    const ruinsSpot = new THREE.SpotLight(0xffe8c0, 0.8, 30, Math.PI / 6, 0.5, 1);
    ruinsSpot.position.set(ruinsPos.x, 15, ruinsPos.z - 5);
    ruinsSpot.target.position.set(ruinsPos.x, 0, ruinsPos.z);
    ruinsSpot.castShadow = false;
    group.add(ruinsSpot);
    group.add(ruinsSpot.target);

    scene.add(group);
    return group;
}

function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

export { createLighting };
