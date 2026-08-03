import * as THREE from 'three';

/** Factory class for creating configured Three.js renderers. */
export class Renderer {
  static create(canvas: HTMLCanvasElement, width: number, height: number): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = false; // Disabled for 60 FPS performance
    return renderer;
  }
}

export function createRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  return Renderer.create(canvas, 320, 224);
}

export function resizeRenderer(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  maxDpr = 1,
): boolean {
  const canvas = renderer.domElement;
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  const bufferWidth = Math.floor(320 * dpr);
  const bufferHeight = Math.floor(224 * dpr);
  const needsResize = canvas.width !== bufferWidth || canvas.height !== bufferHeight;

  if (needsResize) {
    renderer.setPixelRatio(dpr);
    renderer.setSize(320, 224, false);
    camera.aspect = 320 / 224;
    camera.updateProjectionMatrix();
  }

  return needsResize;
}
