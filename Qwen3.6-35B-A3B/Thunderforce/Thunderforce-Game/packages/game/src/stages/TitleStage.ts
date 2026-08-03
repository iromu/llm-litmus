import * as THREE from 'three';
import { createStarFieldTexture } from '@thunderforce/engine';

/**
 * Title screen stage — displays the title and menu.
 */
export class TitleStage {
  scene: THREE.Scene;
  camera: THREE.Camera;
  titleGroup: THREE.Group;
  starField!: THREE.Mesh;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    this.titleGroup = new THREE.Group();

    this._createBackground();
    this._createTitle();
    this._createSubtitle();
  }

  private _createBackground(): void {
    const starTexture = createStarFieldTexture(512, 512, 500);
    const starGeom = new THREE.PlaneGeometry(30, 20);
    const starMat = new THREE.MeshBasicMaterial({
      map: starTexture,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
    this.starField = new THREE.Mesh(starGeom, starMat);
    this.starField.position.z = -10;
    this.scene.add(this.starField);
  }

  private _createTitle(): void {
    // Create title as a canvas texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 512, 128);

    ctx.font = 'bold 64px monospace';
    ctx.fillStyle = '#00aaff';
    ctx.textAlign = 'center';
    ctx.fillText('THUNDER FORCE', 256, 80);

    // Glow effect
    ctx.shadowColor = '#00aaff';
    ctx.shadowBlur = 20;
    ctx.fillText('THUNDER FORCE', 256, 80);

    const texture = new THREE.CanvasTexture(canvas);
    const geom = new THREE.PlaneGeometry(8, 2);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });
    const titleMesh = new THREE.Mesh(geom, mat);
    titleMesh.position.set(0, 2, 0);
    this.titleGroup.add(titleMesh);
  }

  private _createSubtitle(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 256, 64);

    ctx.font = '24px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('PRESS SPACE TO START', 128, 40);

    const texture = new THREE.CanvasTexture(canvas);
    const geom = new THREE.PlaneGeometry(5, 1.25);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(0, -1, 0);
    this.titleGroup.add(mesh);
  }

  update(delta: number): void {
    // Rotate star field slowly
    if (this.starField) {
      this.starField.position.z += delta * 0.5;
      if (this.starField.position.z > 0) {
        this.starField.position.z = -10;
      }
    }

    // Pulse title
    const pulse = Math.sin(Date.now() * 0.003) * 0.1 + 1;
    this.titleGroup.scale.setScalar(pulse);
  }

  dispose(): void {
    this.scene.remove(this.titleGroup);
    this.titleGroup.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          (child.material as THREE.Material).dispose();
        }
      }
    });
  }
}
