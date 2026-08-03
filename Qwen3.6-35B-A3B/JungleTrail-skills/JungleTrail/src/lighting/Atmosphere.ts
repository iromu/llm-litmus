import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

// ── God ray volumetric shader: light shaft rendered as a billboarded quad ──
// Instead of visible cylinder geometry, we render a quad that faces the camera
// at each canopy gap, with a soft volumetric falloff shader.
const GodRayShader = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0.95, 0.90, 0.70) },
    uIntensity: { value: 0.08 },
    uOrigin: { value: new THREE.Vector3() },
    uDirection: { value: new THREE.Vector3(0, -1, 0) },
    uUp: { value: new THREE.Vector3(0, 1, 0) },
    uWidth: { value: 1.5 },
    uHeight: { value: 10.0 },
  },
  vertexShader: `
    uniform vec3 uOrigin;
    uniform vec3 uDirection;
    uniform vec3 uUp;
    uniform float uWidth;
    uniform float uHeight;

    varying vec2 vUv;
    varying vec3 vWorldPos;

    void main() {
      vUv = uv;

      // Build billboard aligned with light direction
      vec3 right = normalize(cross(uDirection, uUp));
      if (length(cross(uDirection, uUp)) < 0.001) {
        right = normalize(cross(uDirection, vec3(1.0, 0.0, 0.0)));
      }

      vec3 upDir = normalize(cross(right, uDirection));

      vec3 center = uOrigin + uDirection * uHeight * 0.5;
      vec3 pos = center
        + right * (vUv.x - 0.5) * uWidth * 2.0
        + upDir * (vUv.y - 0.5) * uHeight;

      vec4 worldPos = vec4(pos, 1.0);
      vWorldPos = pos;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uIntensity;
    uniform vec3 uOrigin;
    uniform vec3 uDirection;

    varying vec2 vUv;
    varying vec3 vWorldPos;

    void main() {
      // Radial falloff: brighter in center, softer at edges
      float radialDist = abs(vUv.x - 0.5) * 2.0; // 0 at center, 1 at edges
      float radialFade = smoothstep(0.0, 0.15, radialDist);
      radialFade = 1.0 - radialFade * radialFade;

      // Vertical falloff: brightest in middle, fades toward top and bottom
      float verticalDist = abs(vUv.y - 0.5) * 2.0;
      float verticalFade = smoothstep(0.0, 0.2, verticalDist);
      verticalFade = 1.0 - verticalFade * verticalFade;

      // Distance from light source origin (top)
      float distFromOrigin = vUv.y; // 0 at top (origin), 1 at bottom

      // Light shaft density: volumetric scattering approximation
      // More dense near top (light source), thinner at bottom
      float volumetricDensity = 1.0 - distFromOrigin * 0.6;

      // Animated shimmer: subtle time-varying intensity
      float shimmer = sin(vWorldPos.y * 2.0 + uTime * 0.3) * 0.08
                    + sin(vWorldPos.x * 3.0 + uTime * 0.5) * 0.04
                    + 0.88;

      // Dust motes inside the shaft: subtle bright specks
      float dustNoise = fract(
        sin(dot(vWorldPos.xz * 5.0, vec2(12.9898, 78.233)) + uTime * 0.1)
        * 43758.5453
      );
      float dustMotes = step(0.92, dustNoise) * 0.02;

      float alpha = radialFade * verticalFade * volumetricDensity * uIntensity * shimmer + dustMotes;

      // Warm sunlight color
      vec3 lightColor = uColor;

      gl_FragColor = vec4(lightColor, alpha);
    }
  `,
};

// ── Mist shader: low-lying volumetric fog with depth-based density ──
const MistShader = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0.30, 0.33, 0.28) },
    uCameraPos: { value: new THREE.Vector3() },
  },
  vertexShader: `
    attribute float size;
    attribute float vDensity;
    uniform float uTime;
    uniform vec3 uCameraPos;

    varying float vDensityVal;
    varying float vDist;

    void main() {
      vec3 pos = position;

      // Slow drift with depth-based speed
      float speed = 0.06 + vDensity * 0.04;
      pos.x += sin(uTime * speed + position.z * 0.03) * (1.0 + vDensity * 2.0);
      pos.y += sin(uTime * speed * 0.7 + position.x * 0.03) * (0.3 + vDensity * 0.5);
      pos.z += cos(uTime * speed * 0.5 + position.y * 0.05) * 0.2;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      vDist = -mvPosition.z;
      gl_PointSize = size * (200.0 / vDist);
      gl_Position = projectionMatrix * mvPosition;
      vDensityVal = vDensity;
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform vec3 uCameraPos;
    varying float vDensityVal;
    varying float vDist;

    void main() {
      // Soft circular particle
      vec2 center = gl_PointCoord - 0.5;
      float dist = length(center);
      float alpha = smoothstep(0.5, 0.0, dist);

      // Distance fog: particles further away blend with scene fog
      float fogFactor = smoothstep(100.0, 10.0, vDist);
      alpha *= fogFactor;

      // Density attribute controls opacity per particle
      alpha *= vDensityVal * 0.15;

      // Blend with scene fog color based on distance
      vec3 finalColor = uColor;

      gl_FragColor = vec4(finalColor, alpha);
    }
  `,
};

// ── Dust particle shader: subtle warm motes floating in light shafts ──
const DustShader = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0.85, 0.80, 0.65) },
  },
  vertexShader: `
    attribute float size;
    uniform float uTime;

    varying float vAlpha;

    void main() {
      vec3 pos = position;

      // Gentle floating motion — slow, organic drift
      pos.x += sin(uTime * 0.12 + position.z * 0.08) * 0.5;
      pos.y += sin(uTime * 0.10 + position.x * 0.2) * 0.3 + uTime * 0.02;
      pos.z += cos(uTime * 0.08 + position.y * 0.15) * 0.3;

      // Reset height periodically for continuous floating
      pos.y = mod(pos.y, 10.0);

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = size * (80.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
      vAlpha = 1.0;
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    varying float vAlpha;

    void main() {
      // Soft circular particle
      vec2 center = gl_PointCoord - 0.5;
      float dist = length(center);
      float alpha = smoothstep(0.5, 0.1, dist);

      // Subtle: dust is barely visible, catches light
      alpha *= vAlpha * 0.12;

      gl_FragColor = vec4(uColor, alpha);
    }
  `,
};

// ── Volumetric mist plane shader: thin sheets of fog near ground/water ──
const VolumetricMistPlaneShader = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0.35, 0.38, 0.32) },
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
    uniform vec3 uColor;

    varying vec2 vUv;
    varying vec3 vWorldPos;

    // Simple 2D noise
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
        f.y
      );
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 4; i++) {
        v += a * noise(p);
        p *= 2.0;
        a *= 0.5;
      }
      return v;
    }

    void main() {
      // Animated noise for wispy organic shape
      vec2 uv = vUv * 4.0;
      uv.x += uTime * 0.03;
      uv.y += uTime * 0.015;

      float n = fbm(uv);
      float n2 = fbm(uv + vec2(0.5, 0.3) + uTime * 0.02);

      // Combine for wispy appearance
      float mist = n * 0.6 + n2 * 0.4;

      // Fade at edges
      float edgeFadeX = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
      float edgeFadeY = smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.9, vUv.y);

      // Fade at top/bottom (mist is thinnest at edges)
      float verticalFade = smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.8, vUv.y);

      float alpha = mist * edgeFadeX * verticalFade * 0.12;

      // Subtle shimmer
      alpha *= 0.9 + sin(uTime * 0.3 + vWorldPos.x * 2.0) * 0.1;

      gl_FragColor = vec4(uColor, alpha);
    }
  `,
};

// ── Main Atmosphere class ────────────────────────────────────────────────────

export class Atmosphere {
  private readonly _group = new THREE.Group();
  private readonly godRayMaterials: THREE.ShaderMaterial[] = [];
  private readonly mistMaterials: THREE.ShaderMaterial[] = [];

  get group(): THREE.Group { return this._group; }

  constructor() {
    this.createMist();
    this.createGodRays();
    this.createDustParticles();
    this.createVolumetricMistPlanes();
  }

  // ── Low-lying mist particles ────────────────────────────────────────────

  private createMist(): void {
    const particleCount = 4000;
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const densities = new Float32Array(particleCount);
    let index = 0;

    for (let i = 0; i < particleCount; i++) {
      const z = -Math.random() * 130;
      const t = Math.abs(z) / 130;

      // Mist density: dense at start, thinning toward ruins, slight bump near waterfall
      let density = 1.0;
      if (t > 0.5) density = 1 - (t - 0.5) * 1.2;
      if (t > 0.85) density = Math.min(density, (1 - t) / 0.15 * 0.5 + 0.3);

      if (Math.random() > density) continue;

      const spread = 15 + Math.random() * 30;
      positions[index * 3] = (Math.random() - 0.5) * spread;
      positions[index * 3 + 1] = Math.random() * 1.8 - 0.4; // Low-lying, some below ground
      positions[index * 3 + 2] = z;

      sizes[index] = 4 + Math.random() * 8;
      densities[index] = 0.3 + Math.random() * 0.7; // Density attribute for per-particle opacity

      index++;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions.slice(0, index * 3), 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes.slice(0, index), 1));
    geometry.setAttribute('vDensity', new THREE.BufferAttribute(densities.slice(0, index), 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0.30, 0.33, 0.28) }, // Consistent with scene fog
        uCameraPos: { value: new THREE.Vector3() },
      },
      vertexShader: MistShader.vertexShader,
      fragmentShader: MistShader.fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending, // Mist scatters light, doesn't emit it
    });

    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    this._group.add(points);
    this.mistMaterials.push(material);
  }

  // ── Volumetric god rays: billboarded quads at canopy gaps ────────────────

  private createGodRays(): void {
    // Position god rays at canopy gap locations (matching the spot light positions)
    const rayConfigs = [
      { x: 3, z: -15, intensity: 0.07, width: 1.8, height: 11 },
      { x: -4, z: -30, intensity: 0.065, width: 1.6, height: 10 },
      { x: 2, z: -45, intensity: 0.07, width: 2.0, height: 12 },
      { x: -3, z: -55, intensity: 0.06, width: 1.4, height: 9 },
      { x: 5, z: -65, intensity: 0.065, width: 1.7, height: 10 },
      { x: -1, z: -80, intensity: 0.055, width: 1.5, height: 9 },
      { x: 2, z: -95, intensity: 0.05, width: 1.3, height: 8 },
      { x: -2, z: -105, intensity: 0.06, width: 1.6, height: 10 },
    ];

    for (const config of rayConfigs) {
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(0.95, 0.90, 0.70) },
          uIntensity: { value: config.intensity },
          uOrigin: { value: new THREE.Vector3(config.x, 14, config.z) },
          uDirection: { value: new THREE.Vector3(0, -1, 0) },
          uUp: { value: new THREE.Vector3(0, 1, 0) },
          uWidth: { value: config.width },
          uHeight: { value: config.height },
        },
        vertexShader: GodRayShader.vertexShader,
        fragmentShader: GodRayShader.fragmentShader,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending, // Light shafts emit light (correct for volumetric scattering)
      });

      const geometry = new THREE.PlaneGeometry(config.width * 2, config.height);
      const ray = new THREE.Mesh(geometry, material);
      ray.position.set(config.x, 14 - config.height * 0.5, config.z);
      // Tilt slightly toward the path
      ray.rotation.z = (Math.random() - 0.5) * 0.1;
      ray.rotation.y = Math.random() * Math.PI * 2;

      this._group.add(ray);
      this.godRayMaterials.push(material);
    }
  }

  // ── Dust/pollen particles: subtle warm motes ────────────────────────────

  private createDustParticles(): void {
    const count = 800;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Concentrate dust in god ray zones and near canopy gaps
      const z = -Math.random() * 120;

      // More dust near ground level and in light shafts
      const inLightShaft = Math.random() > 0.6;
      const x = inLightShaft
        ? (Math.random() - 0.5) * 4  // Concentrated in light shafts
        : (Math.random() - 0.5) * 25; // Scattered elsewhere

      const y = inLightShaft
        ? 1 + Math.random() * 8  // In light shafts
        : Math.random() * 6 + 0.5;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      sizes[i] = 0.6 + Math.random() * 1.5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0.85, 0.80, 0.65) }, // Warm dust, catches sunlight
      },
      vertexShader: DustShader.vertexShader,
      fragmentShader: DustShader.fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending, // Dust scatters/absorbs light, doesn't emit it
    });

    const dust = new THREE.Points(geometry, material);
    dust.frustumCulled = false;
    this._group.add(dust);
    this.mistMaterials.push(material);
  }

  // ── Volumetric mist planes: thin sheets near ground and water ────────────

  private createVolumetricMistPlanes(): void {
    const planeConfigs = [
      // Ground-level mist sheets along the path
      { x: 0, y: 0.3, z: -10, w: 20, h: 8 },
      { x: 3, y: 0.2, z: -25, w: 16, h: 6 },
      { x: -2, y: 0.3, z: -40, w: 18, h: 7 },
      { x: 1, y: 0.2, z: -55, w: 14, h: 6 },
      { x: -3, y: 0.3, z: -70, w: 20, h: 8 },
      { x: 2, y: 0.2, z: -85, w: 16, h: 7 },
      { x: 0, y: 0.3, z: -100, w: 18, h: 7 },
      // Water-level mist near waterfall
      { x: 0, y: 2, z: -115, w: 30, h: 12 },
      { x: 0, y: 1, z: -120, w: 25, h: 10 },
    ];

    for (const config of planeConfigs) {
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(0.35, 0.38, 0.32) },
        },
        vertexShader: VolumetricMistPlaneShader.vertexShader,
        fragmentShader: VolumetricMistPlaneShader.fragmentShader,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.NormalBlending,
      });

      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(config.w, config.h),
        material
      );
      plane.position.set(config.x, config.y, config.z);
      plane.rotation.x = -Math.PI * 0.05; // Slight tilt for natural look
      this._group.add(plane);
      this.mistMaterials.push(material);
    }
  }

  update(elapsed: number): void {
    // Update all shader materials with time and camera position
    for (const material of this.mistMaterials) {
      material.uniforms.uTime.value = elapsed;
      if ('uCameraPos' in material.uniforms) {
        // Will be set by the game loop
      }
    }
    for (const material of this.godRayMaterials) {
      material.uniforms.uTime.value = elapsed;
    }
  }

  setCameraPosition(pos: THREE.Vector3): void {
    for (const material of this.mistMaterials) {
      if ('uCameraPos' in material.uniforms) {
        material.uniforms.uCameraPos.value.copy(pos);
      }
    }
  }
}

// ── Lighting system ──────────────────────────────────────────────────────────

export class Lighting {
  private readonly scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    // Initialize RectAreaLightUniformsLib for RectAreaLights
    try {
      RectAreaLightUniformsLib.init();
    } catch {
      // Fallback if not available
    }
    this.setupLighting();
  }

  private setupLighting(): void {
    const headless = (window as any).__DISABLE_POST_PROCESSING === true;

    // 1. Hemisphere light: warm sky gradient (canopy green above, dark earth below)
    const hemiLight = new THREE.HemisphereLight(0x3a5a2a, 0x1a150e, 0.4);
    this.scene.add(hemiLight);

    // 2. Main sun: warm directional light through canopy
    // Soft shadows, broad coverage
    const sunLight = new THREE.DirectionalLight(0xffe8c8, 0.7);
    sunLight.position.set(12, 22, 8);
    sunLight.castShadow = !headless; // Disable shadows in headless mode — SwiftShader chokes on 2K shadow maps
    if (!headless) {
      sunLight.shadow.mapSize.set(2048, 2048);
      sunLight.shadow.camera.near = 1;
      sunLight.shadow.camera.far = 50;
      sunLight.shadow.camera.left = -25;
      sunLight.shadow.camera.right = 25;
      sunLight.shadow.camera.top = 25;
      sunLight.shadow.camera.bottom = -25;
      sunLight.shadow.bias = -0.0015;
      sunLight.shadow.normalBias = 0.05;
    } else {
      // Reduced shadow map for headless
      sunLight.shadow.mapSize.set(512, 512);
      sunLight.shadow.camera.near = 1;
      sunLight.shadow.camera.far = 50;
      sunLight.shadow.camera.left = -25;
      sunLight.shadow.camera.right = 25;
      sunLight.shadow.camera.top = 25;
      sunLight.shadow.camera.bottom = -25;
    }
    this.scene.add(sunLight);
    this.scene.add(sunLight.target);

    // 3. Secondary sun: softer fill from different angle
    const sunLight2 = new THREE.DirectionalLight(0xffeedd, 0.25);
    sunLight2.position.set(-12, 18, -8);
    sunLight2.castShadow = false;
    this.scene.add(sunLight2);

    // 4. Canopy spotlights: simulate light leaking through canopy gaps
    // These create focused beams on the path, matching god ray positions
    const allCanopyGaps = [
      { x: 3, y: 13, z: -15, intensity: 0.5, angle: Math.PI * 0.3 },
      { x: -4, y: 13, z: -30, intensity: 0.45, angle: Math.PI * 0.35 },
      { x: 2, y: 13, z: -45, intensity: 0.5, angle: Math.PI * 0.28 },
      { x: -3, y: 13, z: -55, intensity: 0.4, angle: Math.PI * 0.32 },
      { x: 5, y: 13, z: -65, intensity: 0.45, angle: Math.PI * 0.3 },
      { x: -1, y: 13, z: -80, intensity: 0.35, angle: Math.PI * 0.35 },
      { x: 2, y: 13, z: -95, intensity: 0.3, angle: Math.PI * 0.38 },
      { x: -2, y: 13, z: -105, intensity: 0.35, angle: Math.PI * 0.33 },
    ];
    // Fewer spotlights in headless mode
    const canopyGaps = headless ? allCanopyGaps.slice(0, 3) : allCanopyGaps;

    for (const gap of canopyGaps) {
      const spot = new THREE.SpotLight(0xffeecc, gap.intensity, 22, gap.angle, 0.55, 1.2);
      spot.position.set(gap.x, gap.y, gap.z);
      spot.target.position.set(gap.x * 0.3, 0, gap.z);
      spot.castShadow = false; // Too expensive for many spots
      this.scene.add(spot);
      this.scene.add(spot.target);
    }

    // 5. Warm ground bounce: subtle fill from below
    const fillLight = new THREE.DirectionalLight(0x4a4a3a, 0.12);
    fillLight.position.set(-8, 3, -10);
    this.scene.add(fillLight);

    // 6. Very subtle ambient: dark jungle, not pitch black
    const ambientLight = new THREE.AmbientLight(0x0a1a08, 0.12);
    this.scene.add(ambientLight);

    // 7. RectAreaLights for specific atmospheric areas
    try {
      // Ruins area: warm ambient light leaking through canopy
      const ruinAreaLight = new THREE.RectAreaLight(0xffd4a0, 0.7, 10, 5);
      ruinAreaLight.position.set(0, 6, -72);
      ruinAreaLight.lookAt(0, 0, -72);
      this.scene.add(ruinAreaLight);

      // Waterfall area: cool, bright light from water spray/mist
      const waterfallAreaLight = new THREE.RectAreaLight(0xb0d0e8, 1.0, 14, 7);
      waterfallAreaLight.position.set(0, 10, -112);
      waterfallAreaLight.lookAt(0, 5, -115);
      this.scene.add(waterfallAreaLight);

      // Mid-jungle ambient patch
      const midAreaLight = new THREE.RectAreaLight(0xffe0b0, 0.4, 8, 4);
      midAreaLight.position.set(1, 5, -50);
      midAreaLight.lookAt(0, 0, -50);
      this.scene.add(midAreaLight);
    } catch {
      // Fallback: use point lights if RectAreaLight not available
      const ruinLight = new THREE.PointLight(0xffd4a0, 0.3, 18);
      ruinLight.position.set(0, 4, -70);
      this.scene.add(ruinLight);

      const waterfallLight = new THREE.PointLight(0xb0d0e8, 0.5, 22);
      waterfallLight.position.set(0, 8, -110);
      this.scene.add(waterfallLight);
    }

    // 8. Fog: dark jungle-green, consistent with all particle colors
    // Matches the mist particle color (0.30, 0.33, 0.28) and ambient (0x0a1a08)
    this.scene.fog = new THREE.FogExp2(0x2a3520, 0.016);
  }
}
