import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// ── Film grain: procedural noise with temporal accumulation ──────────────────
const FilmGrainShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uIntensity: { value: 0.025 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uIntensity;
    varying vec2 vUv;

    // Smooth hash-based noise
    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    // 2D simplex-like noise for temporal coherence
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

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      // Temporal noise: slowly shifting noise field
      float grain = noise(vUv * 500.0 + uTime * 0.5);
      grain = (grain - 0.5) * uIntensity;

      // Apply grain to RGB channels independently for color variation
      color.r += grain * 1.1;
      color.g += grain * 0.95;
      color.b += grain * 0.9;

      // Subtle scan-line effect (documentary camera feel)
      float scanline = sin(vUv.y * 800.0) * 0.003;
      color.rgb += scanline;

      gl_FragColor = color;
    }
  `,
};

// ── Motion blur: directional blur based on velocity ──────────────────────────
const MotionBlurShader = {
  uniforms: {
    tDiffuse: { value: null },
    uIntensity: { value: 0.3 },
    uCameraVelocity: { value: 0.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uIntensity;
    uniform float uCameraVelocity;
    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      // Directional blur based on camera velocity
      float blurAmount = uCameraVelocity * uIntensity * 0.002;
      if (blurAmount > 0.0001) {
        vec4 blurred = vec4(0.0);
        float samples = 0.0;
        for (float x = -4.0; x <= 4.0; x += 1.0) {
          float weight = 1.0 - abs(x) / 5.0;
          vec2 offset = vec2(x * blurAmount, 0.0);
          blurred += texture2D(tDiffuse, vUv + offset) * weight;
          samples += weight;
        }
        blurred /= samples;

        // Blend between sharp and blurred based on velocity
        color = mix(color, blurred, uCameraVelocity * uIntensity * 0.3);
      }

      gl_FragColor = color;
    }
  `,
};

// ── Cinematic vignette + color grading ──────────────────────────────────────
const CinematicGradingShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uProgress: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uProgress;
    varying vec2 vUv;

    // ACES Filmic tone mapping (documentary-grade parameters)
    vec3 acesFilmic(vec3 x) {
      float a = 2.51;
      float b = 0.03;
      float c = 2.43;
      float d = 0.59;
      float e = 0.14;
      return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
    }

    // Rec. 709 to linear (undo display gamma for grading)
    vec3 toLinear(vec3 c) {
      return pow(c, vec3(2.2));
    }

    // Linear to Rec. 709 (apply display gamma at end)
    vec3 toSRGB(vec3 c) {
      return pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.4));
    }

    // Soft contrast curve
    float contrastCurve(float v, float contrastAmt) {
      return 0.5 + (v - 0.5) * contrastAmt;
    }

    // Color wheel: lift/gamma/gain
    vec3 colorWheels(vec3 color, float lift, float gamma, float gain, float saturation) {
      // Desaturate
      float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
      color = mix(vec3(lum), color, saturation);

      // Lift (shadows)
      color.r += lift * 0.3;
      color.g += lift * 0.2;
      color.b += lift * 0.4;

      // Gamma (mids)
      color = pow(color, vec3(1.0 / (1.0 + gamma * 0.2)));

      // Gain (highlights)
      color.r += gain * 0.1;
      color.g += gain * 0.15;
      color.b += gain * 0.2;

      return color;
    }

    // Smooth vignette (documentary style)
    float vignette(vec2 uv, float intensity) {
      vec2 center = vec2(0.5);
      float dist = distance(uv, center);

      // Soft circular vignette with feathering
      float vig = smoothstep(0.35, 0.75, dist);

      // Subtle anamorphic oval shape (wider horizontally)
      vec2 ovalCenter = uv - center;
      ovalCenter.x *= 1.3;
      float ovalDist = length(ovalCenter);
      float ovalVig = smoothstep(0.4, 0.8, ovalDist);

      return mix(vig, ovalVig, 0.5) * intensity;
    }

    void main() {
      vec3 color = texture2D(tDiffuse, vUv).rgb;

      // Step 1: Undo display gamma
      color = toLinear(color);

      // Step 2: ACES Filmic tone mapping
      color = acesFilmic(color);

      // Step 3: Color wheels — lift shadows UP for dark scenes
      float shadowLift = 0.08 + sin(uTime * 0.02) * 0.01;
      float midGamma = 0.03 * uProgress;
      float highlightGain = 0.02;
      color = colorWheels(color, shadowLift, midGamma, highlightGain, 1.05);

      // Step 4: Contrast curve
      float contrastAmt = 1.08 + uProgress * 0.04;
      color = vec3(
        contrastCurve(color.r, contrastAmt),
        contrastCurve(color.g, contrastAmt),
        contrastCurve(color.b, contrastAmt)
      );

      // Step 5: Subtle color cast based on progress
      if (uProgress > 0.5) {
        float warmFactor = (uProgress - 0.5) * 2.0;
        color.r += warmFactor * 0.015;
        color.g += warmFactor * 0.008;
        color.b -= warmFactor * 0.005;
      } else {
        float greenFactor = 1.0 - uProgress * 2.0;
        color.g += greenFactor * 0.01;
        color.b -= greenFactor * 0.005;
      }

      // Step 6: Vignette (cinematic, documentary style) — reduced intensity
      float vig = vignette(vUv, 0.2);
      color *= (1.0 - vig);

      // Step 7: Subtle film edge darkening (anamorphic feel) — reduced
      float edgeDarken = 1.0 - smoothstep(0.0, 0.05, abs(vUv.x - 0.5) * 2.0 - 0.9);
      color.rgb *= mix(1.0, 0.96, edgeDarken * 0.3);

      // Step 8: Apply display gamma
      color = toSRGB(color);

      // Step 9: Subtle green channel boost for jungle atmosphere
      color.g *= 1.02;

      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

// ── Bloom: natural, documentary-grade ───────────────────────────────────────
const NaturalBloomShader = {
  uniforms: {
    tDiffuse: { value: null },
    uBloomIntensity: { value: 0.25 },
    uBloomRadius: { value: 0.6 },
    uBloomThreshold: { value: 0.65 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uBloomIntensity;
    uniform float uBloomRadius;
    uniform float uBloomThreshold;
    varying vec2 vUv;

    vec3 gaussianBlur(sampler2D tex, vec2 uv, float radius) {
      vec3 result = vec3(0.0);
      float totalWeight = 0.0;
      int samples = 8;

      for (int i = -samples; i <= samples; i++) {
        for (int j = -samples; j <= samples; j++) {
          vec2 offset = vec2(float(i), float(j)) / 512.0 * radius;
          float weight = exp(-float(i * i + j * j) / (2.0 * float(samples * samples)));
          result += texture2D(tex, uv + offset).rgb * weight;
          totalWeight += weight;
        }
      }
      return result / totalWeight;
    }

    void main() {
      vec3 color = texture2D(tDiffuse, vUv).rgb;

      // Extract bright areas
      float brightness = dot(color, vec3(0.2126, 0.7152, 0.0722));
      vec3 brightAreas = color * smoothstep(uBloomThreshold - 0.1, uBloomThreshold + 0.1, brightness);

      // Blur bright areas for bloom
      vec3 bloom = gaussianBlur(tDiffuse, vUv, uBloomRadius);
      bloom = bloom * smoothstep(uBloomThreshold - 0.1, uBloomThreshold + 0.1,
                                  dot(bloom, vec3(0.2126, 0.7152, 0.0722)));

      // Blend bloom with original
      vec3 finalColor = color + bloom * uBloomIntensity;

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
};

// ── Main PostProcessing class ───────────────────────────────────────────────

export class PostProcessing {
  private readonly composer: EffectComposer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;

  // Passes
  private readonly renderPass: RenderPass;
  private readonly bloomPass: ShaderPass;
  private readonly motionBlurPass: ShaderPass;
  private readonly colorGradingPass: ShaderPass;
  private readonly filmGrainPass: ShaderPass;

  constructor(renderer: THREE.WebGLRenderer, width: number, height: number) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera();

    // Main composer (renders to offscreen target)
    const rt = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
    });
    this.composer = new EffectComposer(renderer);
    this.composer.renderTarget1 = rt;

    // 1. Render pass (renders the scene)
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    // 2. Bloom pass (natural bloom)
    this.bloomPass = new ShaderPass(NaturalBloomShader);
    this.bloomPass.uniforms.uBloomIntensity.value = 0.25;
    this.bloomPass.uniforms.uBloomRadius.value = 0.6;
    this.bloomPass.uniforms.uBloomThreshold.value = 0.65;
    this.composer.addPass(this.bloomPass);

    // 3. Motion blur pass (subtle)
    this.motionBlurPass = new ShaderPass(MotionBlurShader);
    this.motionBlurPass.uniforms.uIntensity.value = 0.3;
    this.motionBlurPass.uniforms.uCameraVelocity.value = 0.0;
    this.composer.addPass(this.motionBlurPass);

    // 4. Color grading pass (ACES filmic + vignette)
    this.colorGradingPass = new ShaderPass(CinematicGradingShader);
    this.composer.addPass(this.colorGradingPass);

    // 5. Film grain pass
    this.filmGrainPass = new ShaderPass(FilmGrainShader);
    this.filmGrainPass.uniforms.uIntensity.value = 0.025;
    this.composer.addPass(this.filmGrainPass);
  }

  setSceneAndCamera(scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    this.scene.copy(scene);
    this.camera.copy(camera);
    this.renderPass.scene = scene;
    this.renderPass.camera = camera;
  }

  update(progress: number, elapsed: number, delta: number, _camera: THREE.PerspectiveCamera): void {
    const time = elapsed;

    // Update color grading uniforms
    this.colorGradingPass.uniforms.uTime.value = time;
    this.colorGradingPass.uniforms.uProgress.value = progress;

    // Update film grain time
    this.filmGrainPass.uniforms.uTime.value = time;

    // Bloom: slightly stronger near waterfall (water sparkle)
    if (progress > 0.6) {
      const waterfallIntensity = (progress - 0.6) / 0.4;
      this.bloomPass.uniforms.uBloomIntensity.value = 0.25 + waterfallIntensity * 0.2;
      this.bloomPass.uniforms.uBloomThreshold.value = 0.65 - waterfallIntensity * 0.1;
    } else {
      this.bloomPass.uniforms.uBloomIntensity.value = 0.25;
      this.bloomPass.uniforms.uBloomThreshold.value = 0.65;
    }

    // Motion blur: based on camera velocity
    const velocityEstimate = delta * 2.0;
    this.motionBlurPass.uniforms.uCameraVelocity.value = Math.min(velocityEstimate * 10, 1.0);
  }

  render(): void {
    // Render the full pipeline to screen
    this.composer.render();
  }

  resize(width: number, height: number): void {
    this.composer.setSize(width, height);
  }

  dispose(): void {
    this.composer.dispose();
  }
}
