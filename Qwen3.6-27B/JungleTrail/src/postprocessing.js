import * as THREE from 'three';

// ============================================================================
// POST-PROCESSING — Documentary film look: color grade, bloom, grain, vignette
// ============================================================================

class PostProcessor {
    constructor(renderer, width, height) {
        this.renderer = renderer;
        this.width = width;
        this.height = height;

        // Scene render target
        this.sceneTarget = new THREE.WebGLRenderTarget(width, height, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.UnsignedByteType
        });

        // Bright pass render target (for bloom)
        this.brightTarget = new THREE.WebGLRenderTarget(width / 2, height / 2, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.UnsignedByteType
        });

        // Blurred bloom target
        this.bloomBlurTarget = new THREE.WebGLRenderTarget(width / 2, height / 2, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.UnsignedByteType
        });

        // ---- PASS 1: Bright extraction ----
        this.brightUniforms = {
            tDiffuse: { value: this.sceneTarget.texture },
            uThreshold: { value: 0.85 }
        };

        this.brightMaterial = new THREE.ShaderMaterial({
            uniforms: this.brightUniforms,
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float uThreshold;
                varying vec2 vUv;

                void main() {
                    vec3 color = texture2D(tDiffuse, vUv).rgb;
                    float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
                    float bright = max(0.0, luminance - uThreshold) / (1.0 - uThreshold);
                    gl_FragColor = vec4(color * bright, 1.0);
                }
            `
        });

        // ---- PASS 2: Bloom blur (simple box blur) ----
        this.bloomBlurUniforms = {
            tDiffuse: { value: this.brightTarget.texture },
            uDirection: { value: new THREE.Vector2(1, 0) },
            uResolution: { value: new THREE.Vector2(width / 2, height / 2) }
        };

        this.bloomBlurMaterial = new THREE.ShaderMaterial({
            uniforms: this.bloomBlurUniforms,
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform vec2 uDirection;
                uniform vec2 uResolution;
                varying vec2 vUv;

                void main() {
                    vec2 texelSize = 1.0 / uResolution;
                    vec3 result = vec3(0.0);
                    float weights[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);

                    result += texture2D(tDiffuse, vUv).rgb * weights[0];
                    for (int i = 1; i < 5; i++) {
                        vec2 offset = uDirection * texelSize * float(i) * 2.0;
                        result += texture2D(tDiffuse, vUv + offset).rgb * weights[i];
                        result += texture2D(tDiffuse, vUv - offset).rgb * weights[i];
                    }
                    gl_FragColor = vec4(result, 1.0);
                }
            `
        });

        // ---- PASS 3: Final composite ----
        this.finalUniforms = {
            tDiffuse: { value: this.sceneTarget.texture },
            tBloom: { value: this.bloomBlurTarget.texture },
            uTime: { value: 0 },
            uAspectRatio: { value: width / height },
            uResolution: { value: new THREE.Vector2(width, height) },
            uBloomStrength: { value: 0.15 },
            uVignetteStrength: { value: 0.55 },
            uVignetteColor: { value: new THREE.Color(0.05, 0.08, 0.05) },
            uColorGradeWarmth: { value: 0.08 },
            uColorGradeGreen: { value: 0.04 },
            uContrast: { value: 1.08 },
            uExposure: { value: 0.9 },
            uGrainAmount: { value: 0.035 },
            uChromaticAberration: { value: 0.0015 },
            uHalationStrength: { value: 0.06 },
            uLift: { value: new THREE.Vector3(-0.03, -0.02, -0.04) },
            uGamma: { value: new THREE.Vector3(0.95, 1.0, 0.98) },
            uGain: { value: new THREE.Vector3(1.05, 1.02, 0.97) }
        };

        this.finalMaterial = new THREE.ShaderMaterial({
            uniforms: this.finalUniforms,
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform sampler2D tBloom;
                uniform float uTime;
                uniform float uAspectRatio;
                uniform vec2 uResolution;
                uniform float uBloomStrength;
                uniform float uVignetteStrength;
                uniform vec3 uVignetteColor;
                uniform float uColorGradeWarmth;
                uniform float uColorGradeGreen;
                uniform float uContrast;
                uniform float uExposure;
                uniform float uGrainAmount;
                uniform float uChromaticAberration;
                uniform float uHalationStrength;
                uniform vec3 uLift;
                uniform vec3 uGamma;
                uniform vec3 uGain;
                varying vec2 vUv;

                // ---- Hash & noise ----
                float hash(vec2 p) {
                    vec3 p3 = fract(vec3(p.xyx) * 0.12345);
                    p3 += dot(p3, p3.yzx + 3.0);
                    return fract((p3.x + p3.y) * p3.z);
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

                // ---- LUT-style color grading ----
                vec3 applyColorGrading(vec3 color) {
                    // Lift/Gamma/Gain (film-style primary correction)
                    color = color * uGain;
                    color = pow(color, uGamma);
                    color += uLift;

                    // Warmth: push highlights warm, shadows cool
                    float luminance = dot(color, vec3(0.299, 0.587, 0.114));
                    vec3 warmShift = vec3(uColorGradeWarmth, uColorGradeWarmth * 0.7, -uColorGradeWarmth * 0.3);
                    color += warmShift * luminance;

                    // Jungle green: subtle green in midtones
                    float midtone = smoothstep(0.15, 0.4, luminance) * smoothstep(0.7, 0.4, luminance);
                    color.g += uColorGradeGreen * midtone;
                    color.r -= uColorGradeGreen * 0.3 * midtone;

                    // Contrast (preserve midtone)
                    color = (color - 0.5) * uContrast + 0.5;

                    // Exposure
                    color *= uExposure;

                    return color;
                }

                // ---- Film grain (temporal + colored) ----
                vec3 filmGrain(vec2 uv, float amount) {
                    // Temporal noise (changes each frame)
                    float frame = floor(uTime * 30.0);

                    // R, G, B grain with slight offset (real film grain is colored)
                    float r = noise(uv * uResolution * 0.5 + vec2(frame, 0.0)) * 2.0 - 1.0;
                    float g = noise(uv * uResolution * 0.5 + vec2(0.0, frame + 100.0)) * 2.0 - 1.0;
                    float b = noise(uv * uResolution * 0.5 + vec2(frame + 200.0, frame + 300.0)) * 2.0 - 1.0;

                    // Slightly more blue grain (film characteristic)
                    return vec3(r, g, b * 1.2) * amount;
                }

                // ---- Vignette (lens-style, not just radial) ----
                float vignette(vec2 uv, float strength) {
                    // Elliptical vignette (wider than tall, like a lens)
                    vec2 offset = uv - 0.5;
                    float dist = dot(offset, offset * vec2(uAspectRatio, 1.0));

                    // Smooth, lens-like falloff
                    float v = 1.0 - strength * pow(dist * 1.8, 1.8);

                    // Subtle edge darkening with color cast
                    return max(v, 0.0);
                }

                // ---- Halation (red glow around bright areas) ----
                float halation(vec2 uv) {
                    // Sample neighboring bright pixels
                    vec2 texel = 1.0 / uResolution;
                    float bright = 0.0;

                    for (int x = -3; x <= 3; x++) {
                        for (int y = -3; y <= 3; y++) {
                            vec2 neighbor = uv + vec2(float(x), float(y)) * texel * 3.0;
                            vec3 c = texture2D(tDiffuse, neighbor).rgb;
                            float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
                            float w = exp(-float(x*x + y*y) * 0.5);
                            bright += max(0.0, lum - 0.6) * w;
                        }
                    }
                    return bright * 0.02;
                }

                void main() {
                    vec2 uv = vUv;

                    // ---- Chromatic aberration ----
                    float dist = length(uv - 0.5);
                    vec2 direction = (uv - 0.5) * uChromaticAberration * dist;

                    float r = texture2D(tDiffuse, uv + direction).r;
                    float g = texture2D(tDiffuse, uv).g;
                    float b = texture2D(tDiffuse, uv - direction).b;
                    vec3 color = vec3(r, g, b);

                    // ---- Color grading ----
                    color = applyColorGrading(color);

                    // ---- Bloom ----
                    vec3 bloom = texture2D(tBloom, uv).rgb;
                    color += bloom * uBloomStrength;

                    // ---- Halation (red glow around highlights) ----
                    float hal = halation(uv);
                    color += vec3(hal * uHalationStrength, hal * uHalationStrength * 0.2, 0.0);

                    // ---- Vignette ----
                    float v = vignette(uv, uVignetteStrength);
                    color = mix(uVignetteColor, color, v);

                    // ---- Film grain ----
                    color += filmGrain(uv, uGrainAmount);

                    // ---- Subtle lens distortion (barrel) ----
                    // Already applied via chromatic aberration, skip for performance

                    // ---- ACES tone mapping ----
                    color = color * (2.51 * color + 0.03) / (color * (2.43 * color + 0.59) + 0.14);

                    // ---- Gamma correction ----
                    color = pow(color, vec3(1.0 / 2.2));

                    // ---- Clamp ----
                    color = clamp(color, 0.0, 1.0);

                    gl_FragColor = vec4(color, 1.0);
                }
            `
        });

        // Fullscreen quad
        this.quadGeometry = new THREE.PlaneGeometry(2, 2);
        this.quad = new THREE.Mesh(this.quadGeometry, this.finalMaterial);
        this.quadScene = new THREE.Scene();
        this.quadScene.add(this.quad);
        this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        // Bright pass quad
        this.brightQuad = new THREE.Mesh(this.quadGeometry, this.brightMaterial);
        this.brightScene = new THREE.Scene();
        this.brightScene.add(this.brightQuad);

        // Bloom blur quad
        this.bloomQuad = new THREE.Mesh(this.quadGeometry, this.bloomBlurMaterial);
        this.bloomScene = new THREE.Scene();
        this.bloomScene.add(this.bloomQuad);
    }

    render(scene, camera) {
        // 1. Render scene to target
        this.renderer.setRenderTarget(this.sceneTarget);
        this.renderer.render(scene, camera);

        // 2. Bright pass
        this.renderer.setRenderTarget(this.brightTarget);
        this.renderer.render(this.brightScene, this.quadCamera);

        // 3. Bloom blur (horizontal)
        this.bloomBlurUniforms.uDirection.value.set(1, 0);
        this.renderer.setRenderTarget(this.bloomBlurTarget);
        this.renderer.render(this.bloomScene, this.quadCamera);

        // 4. Bloom blur (vertical) - read from previous blur, write to bright target temp
        this.bloomBlurUniforms.tDiffuse.value = this.bloomBlurTarget.texture;
        this.bloomBlurUniforms.uDirection.value.set(0, 1);
        this.renderer.setRenderTarget(this.brightTarget);
        this.renderer.render(this.bloomScene, this.quadCamera);

        // 5. Final composite
        this.finalUniforms.tBloom.value = this.brightTarget.texture;
        this.finalUniforms.uTime.value = performance.now() / 1000;

        this.renderer.setRenderTarget(null);
        this.renderer.render(this.quadScene, this.quadCamera);
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
        this.sceneTarget.setSize(width, height);
        this.brightTarget.setSize(width / 2, height / 2);
        this.bloomBlurTarget.setSize(width / 2, height / 2);
        this.finalUniforms.uAspectRatio.value = width / height;
        this.finalUniforms.uResolution.value.set(width, height);
        this.bloomBlurUniforms.uResolution.value.set(width / 2, height / 2);
    }
}

export { PostProcessor };
