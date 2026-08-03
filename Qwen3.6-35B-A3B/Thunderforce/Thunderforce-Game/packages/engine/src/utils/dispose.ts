import * as THREE from 'three';

/** Dispose of a Three.js object and nullify references. */
export function disposeObject(obj: THREE.Object3D | THREE.Material | THREE.Texture | null | undefined): void {
  if (!obj) return;
  if (obj instanceof THREE.Object3D) {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else if (child.material) {
          child.material.dispose();
        }
      }
    });
    obj.clear();
  } else if (obj instanceof THREE.Material) {
    obj.dispose();
  } else if (obj instanceof THREE.Texture) {
    obj.dispose();
  }
}

/** Dispose of an array of objects. */
export function disposeArray<T extends THREE.Object3D | THREE.Material | THREE.Texture>(arr: T[]): void {
  for (const obj of arr) disposeObject(obj);
}
