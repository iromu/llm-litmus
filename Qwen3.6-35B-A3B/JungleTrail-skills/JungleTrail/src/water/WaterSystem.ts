import * as THREE from 'three';

// ── Simplex noise ────────────────────────────────────────────────────────────
class SimpleNoise {
  hash(x: number, y: number): number {
    const n = Math.sin(x * 127.1 + y * 311.7 + 42) * 43758.5453;
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
}

// ── 2D noise functions for GLSL shaders ──────────────────────────────────────
const glslNoise2D = `
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise2D(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float fbm(vec2 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    float maxValue = 0.0;
    for (int i = 0; i < 6; i++) {
      if (i >= octaves) break;
      value += amplitude * noise2D(p * frequency);
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    return value / maxValue;
  }
`;

// ── Main WaterSystem ─────────────────────────────────────────────────────────

export class WaterSystem {
  private readonly noise = new SimpleNoise();
  private readonly _group = new THREE.Group();
  private waterfallMesh!: THREE.Mesh;
  private foamSheet!: THREE.Mesh;
  private splashParticles!: THREE.Points;
  private mistParticles!: THREE.Points;
  private causticsPlane!: THREE.Mesh;
  private poolMesh!: THREE.Mesh;

  get group(): THREE.Group { return this._group; }

  constructor() {
    // Reduce geometry complexity in headless mode
    const headless = (window as any).__DISABLE_POST_PROCESSING === true;
    this.createWaterfall(headless);
    this.createPool(headless);
    this.createSplashParticles(headless);
    this.createMist(headless);
    this.createCaustics();
    this.createWetSurfaces(headless);
    this.createRiver(headless);
  }

  // ── Waterfall curtain ────────────────────────────────────────────────────

  private createWaterfall(headless: boolean): void {
    const width = 12;
    const height = 22;
    const segments = headless ? 32 : 80;

    const geometry = new THREE.PlaneGeometry(width, height, segments, headless ? 24 : 60);
    const positions = geometry.attributes.position;

    // Initial displacement for organic look
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const n1 = this.noise.fbm(x * 0.6 + y * 0.2, y * 0.4, 3) * 0.5;
      const n2 = this.noise.fbm(x * 1.2 - y * 0.15, x * 0.7, 2) * 0.25;
      positions.setZ(i, n1 + n2);
    }
    geometry.computeVertexNormals();

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0.20, 0.40, 0.50) },
        uOpacity: { value: 0.72 },
      },
      vertexShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying float vFlow;
        varying float vTurbulence;
        varying float vSpread;

        ${glslNoise2D}

        void main() {
          vUv = uv;
          vec3 pos = position;

          // Turbulent flow — multiple noise-based octaves
          float flow1 = fbm(vec2(pos.x * 1.5 + uTime * 1.8, pos.y * 0.4), 4);
          float flow2 = fbm(vec2(pos.x * 3.0 - uTime * 2.2, pos.y * 0.8), 3);
          float flow3 = fbm(vec2(pos.x * 6.0 + uTime * 3.5, pos.y * 1.2), 2);

          pos.z += flow1 * 0.18 + flow2 * 0.08 + flow3 * 0.03;

          // Horizontal spread — water fans out as it falls
          float t = vUv.y;
          float spread = smoothstep(0.0, 0.25, t) * smoothstep(1.0, 0.55, t);
          pos.x += sin(pos.y * 2.5 + uTime * 2.0) * 0.1 * spread;
          pos.x += fbm(vec2(pos.y * 2.0 + uTime * 0.5, uTime * 0.3), 3) * 0.15 * spread;

          // Vertical flow indicator
          vFlow = fract(uv.y + uTime * 0.3);
          vTurbulence = fbm(vec2(pos.x * 4.0 + uTime * 2.0, pos.y * 2.0 + uTime * 1.0), 3);
          vSpread = spread;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        uniform float uTime;
        varying vec2 vUv;
        varying float vFlow;
        varying float vTurbulence;
        varying float vSpread;

        ${glslNoise2D}

        void main() {
          float t = vUv.y;

          // Crest foam (top) — white aerated water where it breaks over edge
          float crestFoam = smoothstep(0.35, 0.02, t);
          crestFoam *= 0.6 + 0.4 * sin(vUv.x * 25.0 + uTime * 4.0);
          crestFoam *= 0.7 + 0.3 * fbm(vec2(vUv.x * 10.0, uTime * 2.0), 2);

          // Base foam (splash zone) — turbulent white water at bottom
          float baseFoam = smoothstep(0.0, 0.30, t);
          baseFoam *= smoothstep(0.15, 0.0, t);
          baseFoam *= 0.7 + 0.3 * fbm(vec2(vUv.x * 12.0 - uTime * 1.5, uTime * 3.0), 3);

          // Mid-section turbulence — streaks of white water
          float midStreaks = smoothstep(0.55, 0.85, vTurbulence) * 0.2;

          // Vertical flow streaks — fast-moving water columns
          float flowStreak = smoothstep(0.0, 0.04, vFlow) * smoothstep(1.0, 0.96, vFlow);

          // Edge darkening — water is thicker/more opaque at edges
          float edgeX = smoothstep(0.0, 0.10, vUv.x) * smoothstep(1.0, 0.90, vUv.x);
          // Edge darkening at top/bottom
          float edgeY = smoothstep(0.0, 0.08, t) * smoothstep(1.0, 0.92, t);

          // Combine
          vec3 color = uColor;

          // White foam at crest
          color = mix(color, vec3(0.95, 0.97, 1.0), crestFoam * 0.85);

          // White foam at base
          color = mix(color, vec3(0.88, 0.92, 0.97), baseFoam * 0.65);

          // Turbulent mid-section streaks
          color += vec3(midStreaks, midStreaks * 0.85, midStreaks * 0.5);

          // Flow streak brightness
          color *= 0.70 + 0.30 * flowStreak;

          // Brightness variation
          color *= 0.80 + 0.20 * fbm(vec2(vUv.x * 5.0, uTime * 0.5), 2);

          float alpha = uOpacity * edgeX * edgeY;
          alpha *= 0.82 + 0.18 * (crestFoam * 0.5 + baseFoam * 0.5);

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.waterfallMesh = new THREE.Mesh(geometry, material);
    this.waterfallMesh.position.set(0, 11, -115);
    this._group.add(this.waterfallMesh);

    // Secondary foam sheet — white water in front of main curtain
    const foamGeo = new THREE.PlaneGeometry(12, 22, headless ? 32 : 80, headless ? 24 : 60);
    const foamMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying float vFoam;

        ${glslNoise2D}

        void main() {
          vUv = uv;
          vec3 pos = position;

          // Foam at crest and splash base
          float crest = smoothstep(0.35, 0.05, vUv.y);
          float base = smoothstep(0.0, 0.28, vUv.y) * smoothstep(0.18, 0.0, vUv.y);
          vFoam = crest + base;

          // Foam displacement
          pos.z += vFoam * 0.25;
          pos.x += sin(pos.y * 3.5 + uTime * 2.0) * 0.04 * vFoam;
          pos.x += fbm(vec2(pos.y * 2.0 + uTime * 0.5, uTime * 0.3), 3) * 0.08 * vFoam;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying float vFoam;

        void main() {
          if (vFoam < 0.01) discard;

          // Foam texture — animated noise
          float foamNoise = fract(sin(dot(vUv * 60.0, vec2(12.9898, 78.233))) * 43758.5453);
          foamNoise = smoothstep(0.25, 0.75, foamNoise);

          // Edge softening
          float edgeX = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);

          vec3 foamColor = vec3(0.90, 0.93, 0.97);
          float alpha = vFoam * edgeX * (0.4 + 0.6 * foamNoise) * 0.55;

          gl_FragColor = vec4(foamColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.foamSheet = new THREE.Mesh(foamGeo, foamMat);
    this.foamSheet.position.set(0, 11, -114.4);
    this._group.add(this.foamSheet);

    // Cliff face behind waterfall
    this.createCliffFace();
  }

  private createCliffFace(): void {
    const headless = (window as any).__DISABLE_POST_PROCESSING === true;
    const cliffGeo = new THREE.PlaneGeometry(24, 35, headless ? 24 : 50, headless ? 24 : 50);
    const cliffPos = cliffGeo.attributes.position;

    for (let i = 0; i < cliffPos.count; i++) {
      const x = cliffPos.getX(i);
      const y = cliffPos.getY(i);
      const n1 = this.noise.fbm(x * 0.25, y * 0.25, 3) * 2.5;
      const n2 = this.noise.fbm(x * 0.7, y * 0.45, 2) * 1.2;
      cliffPos.setZ(i, n1 + n2);
    }
    cliffGeo.computeVertexNormals();

    // Procedural cliff texture with stratification
    const cliffCanvas = document.createElement('canvas');
    cliffCanvas.width = 1024;
    cliffCanvas.height = 1024;
    const ctx = cliffCanvas.getContext('2d')!;

    // Base rock: warm dark grey-brown
    ctx.fillStyle = '#35302a';
    ctx.fillRect(0, 0, 1024, 1024);

    // Stratification layers — horizontal banding (sedimentary)
    for (let i = 0; i < 40; i++) {
      const y = Math.random() * 1024;
      const thickness = 2 + Math.random() * 20;
      const shade = 35 + Math.floor(Math.random() * 45);
      ctx.fillStyle = `rgba(${shade + 10}, ${shade + 5}, ${shade - 3}, ${0.08 + Math.random() * 0.12})`;
      ctx.fillRect(0, y, 1024, thickness);
    }

    // Rock grain
    for (let i = 0; i < 20000; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const b = 40 + Math.floor(Math.random() * 55);
      ctx.fillStyle = `rgba(${b + 12}, ${b + 7}, ${b}, ${0.06 + Math.random() * 0.08})`;
      ctx.fillRect(x, y, 1 + Math.random() * 5, 1 + Math.random() * 3);
    }

    // Water streaks — dark vertical lines
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * 1024;
      const darkness = 15 + Math.floor(Math.random() * 25);
      ctx.strokeStyle = `rgba(${darkness}, ${darkness + 8}, ${darkness + 12}, ${0.12 + Math.random() * 0.18})`;
      ctx.lineWidth = 1 + Math.random() * 5;
      ctx.beginPath();
      ctx.moveTo(x, Math.random() * 80);
      let cy = Math.random() * 80;
      while (cy < 1024) {
        cy += 15 + Math.random() * 50;
        ctx.lineTo(x + (Math.random() - 0.5) * 35, cy);
      }
      ctx.stroke();
    }

    // Moss/algae at base
    for (let i = 0; i < 600; i++) {
      const x = Math.random() * 1024;
      const y = 750 + Math.random() * 274;
      const r = 2 + Math.random() * 10;
      ctx.fillStyle = `rgba(${25 + Math.floor(Math.random() * 35)}, ${55 + Math.floor(Math.random() * 50)}, ${15 + Math.floor(Math.random() * 25)}, ${0.06 + Math.random() * 0.12})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const cliffTexture = new THREE.CanvasTexture(cliffCanvas);
    cliffTexture.colorSpace = THREE.SRGBColorSpace;

    const cliffMat = new THREE.MeshStandardMaterial({
      map: cliffTexture,
      color: 0x45403a,
      roughness: 0.90,
      metalness: 0.03,
    });

    const cliff = new THREE.Mesh(cliffGeo, cliffMat);
    cliff.position.set(0, 12, -116.5);
    cliff.receiveShadow = true;
    this._group.add(cliff);
  }

  // ── Pool at waterfall base ───────────────────────────────────────────────

  private createPool(headless: boolean): void {
    // Pool surface
    const poolGeo = new THREE.CircleGeometry(7, headless ? 24 : 48);
    poolGeo.rotateX(-Math.PI * 0.5);

    // Add slight bowl shape
    const poolPos = poolGeo.attributes.position;
    for (let i = 0; i < poolPos.count; i++) {
      const x = poolPos.getX(i);
      const z = poolPos.getZ(i);
      const dist = Math.sqrt(x * x + z * z);
      // Bowl shape: deeper in center
      const bowlDepth = -0.3 * (1 - dist / 7);
      poolPos.setY(i, Math.max(bowlDepth, -0.8));
    }
    poolGeo.computeVertexNormals();

    const poolMat = new THREE.MeshPhysicalMaterial({
      color: 0x0a2525,
      roughness: 0.08,
      metalness: 0.15,
      transmission: 0.6,
      thickness: 1.2,
      transparent: true,
      opacity: 0.82,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
    });

    this.poolMesh = new THREE.Mesh(poolGeo, poolMat);
    this.poolMesh.position.set(0, -0.3, -113);
    this._group.add(this.poolMesh);
  }

  // ── Splash particles ─────────────────────────────────────────────────────

  private createSplashParticles(headless: boolean): void {
    const count = headless ? 150 : 600;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Concentrate near waterfall impact zone
      positions[i * 3] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 1] = Math.random() * 5;
      positions[i * 3 + 2] = -113 + (Math.random() - 0.5) * 5;
      velocities[i] = 0.8 + Math.random() * 2.5;
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 1));
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute float velocity;
        attribute float phase;
        uniform float uTime;
        varying float vAlpha;

        ${glslNoise2D}

        void main() {
          vec3 pos = position;

          // Particle cycle: rise then fall with gravity
          float cycleTime = 3.5;
          float cycle = mod(uTime * velocity + phase, cycleTime);
          float t = cycle / cycleTime;

          // Parabolic trajectory
          pos.y = cycle * 1.2 - cycle * cycle * 0.35;
          if (pos.y < 0.0) pos.y = 0.0;

          // Horizontal spray increases with height
          float sprayFactor = smoothstep(0.0, 2.0, pos.y);
          pos.x += sin(uTime * 1.2 + phase) * 0.5 * sprayFactor;
          pos.x += fbm(vec2(phase + uTime * 0.3, pos.y * 2.0), 2) * 0.3 * sprayFactor;
          pos.z += cos(uTime * 0.8 + phase * 1.5) * 0.25 * sprayFactor;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = 3.5 * (80.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;

          // Alpha: visible during rise, fades during fall
          float risePhase = smoothstep(0.0, 0.4, t);
          float fallPhase = 1.0 - smoothstep(0.4, 1.0, t);
          vAlpha = risePhase * fallPhase;
        }
      `,
      fragmentShader: `
        varying float vAlpha;

        void main() {
          // Soft circular particle
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          float alpha = smoothstep(0.5, 0.0, dist);

          // White water splash
          vec3 color = vec3(0.92, 0.95, 0.98);
          alpha *= vAlpha * 0.35;

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.splashParticles = new THREE.Points(geometry, material);
    this._group.add(this.splashParticles);
  }

  // ── Mist at waterfall base ───────────────────────────────────────────────

  private createMist(headless: boolean): void {
    const count = headless ? 200 : 1000;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const densities = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = Math.random() * 8;
      positions[i * 3 + 2] = -113 + (Math.random() - 0.5) * 12;
      sizes[i] = 6 + Math.random() * 12;
      densities[i] = 0.2 + Math.random() * 0.8;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('vDensity', new THREE.BufferAttribute(densities, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0.50, 0.60, 0.65) },
      },
      vertexShader: `
        attribute float size;
        attribute float vDensity;
        uniform float uTime;
        varying float vAlpha;

        void main() {
          vec3 pos = position;

          // Mist drifts outward and upward from impact zone
          pos.x += sin(uTime * 0.25 + position.z * 0.2) * 2.0;
          pos.y += sin(uTime * 0.15 + position.x * 0.1) * 1.0 + uTime * 0.05;
          pos.z += cos(uTime * 0.12 + position.y * 0.08) * 0.8;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (150.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;

          // Density highest near base, fades with height
          vAlpha = 0.12 * vDensity * (1.0 - pos.y / 8.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;

        void main() {
          // Soft circular particle
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          float alpha = smoothstep(0.5, 0.0, dist);

          gl_FragColor = vec4(uColor, alpha * vAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.mistParticles = new THREE.Points(geometry, material);
    this._group.add(this.mistParticles);
  }

  // ── Caustics on pool bottom ──────────────────────────────────────────────

  private createCaustics(): void {
    const headless = (window as any).__DISABLE_POST_PROCESSING === true;
    const causticsGeo = new THREE.CircleGeometry(6, headless ? 24 : 48);
    causticsGeo.rotateX(-Math.PI * 0.5);

    const causticsMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
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

        ${glslNoise2D}

        void main() {
          vec2 uv = vUv * 3.0;

          // Multiple animated noise layers for caustic pattern
          float c1 = fbm(uv + vec2(uTime * 0.15, uTime * 0.1), 4);
          float c2 = fbm(uv + vec2(-uTime * 0.12, uTime * 0.08), 3);
          float c3 = fbm(uv * 1.5 + vec2(uTime * 0.2, -uTime * 0.05), 3);

          // Caustics: bright lines where noise converges
          float caustics = c1 * 0.4 + c2 * 0.35 + c3 * 0.25;
          caustics = smoothstep(0.35, 0.75, caustics);

          // Edge fade
          float dist = length(vUv - 0.5) * 2.0;
          float edgeFade = 1.0 - smoothstep(0.3, 0.9, dist);

          // Bright white-yellow caustic lines
          vec3 color = vec3(0.85, 0.95, 0.90);
          float alpha = caustics * edgeFade * 0.25;

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.causticsPlane = new THREE.Mesh(causticsGeo, causticsMat);
    this.causticsPlane.position.set(0, -0.55, -113);
    this._group.add(this.causticsPlane);
  }

  // ── Wet surfaces around waterfall ────────────────────────────────────────

  private createWetSurfaces(headless: boolean): void {
    // Wet stone at pool edge
    const wetGeo = new THREE.PlaneGeometry(20, 16, headless ? 16 : 40, headless ? 12 : 32);
    wetGeo.rotateX(-Math.PI * 0.5);

    const wetPos = wetGeo.attributes.position;
    for (let i = 0; i < wetPos.count; i++) {
      const x = wetPos.getX(i);
      const z = wetPos.getZ(i);
      const y = Math.sin(x * 1.5 + z * 1.2) * 0.06 + Math.sin(x * 3 - z * 2) * 0.03;
      wetPos.setY(i, y - 0.25);
    }
    wetGeo.computeVertexNormals();

    const wetMat = new THREE.MeshPhysicalMaterial({
      color: 0x1a2518,
      roughness: 0.08,
      metalness: 0.12,
      clearcoat: 0.95,
      clearcoatRoughness: 0.03,
    });

    const wetSurface = new THREE.Mesh(wetGeo, wetMat);
    wetSurface.position.set(0, -0.3, -112);
    wetSurface.receiveShadow = true;
    this._group.add(wetSurface);
  }

  // ── River downstream ─────────────────────────────────────────────────────

  private createRiver(headless: boolean): void {
    const width = 6;
    const length = 40;
    const segments = headless ? 20 : 50;

    const geometry = new THREE.PlaneGeometry(width, length, headless ? 16 : 40, segments);
    geometry.rotateX(-Math.PI * 2);

    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      // Multi-octave ripple for natural water surface
      const ripple1 = this.noise.fbm(x * 1.2 + z * 0.2, z * 0.4, 3) * 0.12;
      const ripple2 = Math.sin(x * 2.5 + z * 0.3) * 0.04;
      const ripple3 = Math.sin(x * 5 - z * 0.5 + 1.0) * 0.02;
      const y = ripple1 + ripple2 + ripple3 - 0.7;
      positions.setY(i, y);
    }
    geometry.computeVertexNormals();

    const material = new THREE.MeshPhysicalMaterial({
      color: 0x0a2828,
      roughness: 0.12,
      metalness: 0.12,
      transmission: 0.65,
      thickness: 0.6,
      transparent: true,
      opacity: 0.80,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
    });

    const river = new THREE.Mesh(geometry, material);
    river.position.set(0, 0, -95);
    this._group.add(river);
  }

  update(_delta: number, elapsed: number): void {
    const time = elapsed;

    // Update waterfall shader
    if (this.waterfallMesh.material instanceof THREE.ShaderMaterial) {
      this.waterfallMesh.material.uniforms.uTime.value = time;
    }

    // Update foam sheet shader
    if (this.foamSheet && this.foamSheet.material instanceof THREE.ShaderMaterial) {
      this.foamSheet.material.uniforms.uTime.value = time;
    }

    // Update splash particles
    if (this.splashParticles.material instanceof THREE.ShaderMaterial) {
      this.splashParticles.material.uniforms.uTime.value = time;
    }

    // Update mist particles
    if (this.mistParticles.material instanceof THREE.ShaderMaterial) {
      this.mistParticles.material.uniforms.uTime.value = time;
    }

    // Update caustics
    if (this.causticsPlane && this.causticsPlane.material instanceof THREE.ShaderMaterial) {
      this.causticsPlane.material.uniforms.uTime.value = time;
    }
  }
}
