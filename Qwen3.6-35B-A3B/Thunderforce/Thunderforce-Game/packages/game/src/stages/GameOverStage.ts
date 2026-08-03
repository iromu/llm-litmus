import * as THREE from 'three';
import { createStarFieldTexture } from '@thunderforce/engine';

/**
 * Game over stage — displays game over screen.
 */
export class GameOverStage {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  gameoverGroup: THREE.Group;
  starField!: THREE.Mesh;

  constructor(scene: THREE.Scene, camera: THREE.OrthographicCamera) {
    this.scene = scene;
    this.camera = camera;
    this.gameoverGroup = new THREE.Group();

    this._createBackground();
    this._createTitle();
    this._createRestartPrompt();
  }

  private _createBackground(): void {
    const starTexture = createStarFieldTexture(512, 512, 300);
    const starGeom = new THREE.PlaneGeometry(30, 20);
    const starMat = new THREE.MeshBasicMaterial({
      map: starTexture,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
    this.starField = new THREE.Mesh(starGeom, starMat);
    this.starField.position.z = -10;
    this.scene.add(this.starField);
  }

  private _createTitle(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 512, 128);

    ctx.font = 'bold 64px monospace';
    ctx.fillStyle = '#ff4444';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', 256, 80);

    ctx.shadowColor = '#ff4444';
    ctx.shadowBlur = 20;
    ctx.fillText('GAME OVER', 256, 80);

    const texture = new THREE.CanvasTexture(canvas);
    const geom = new THREE.PlaneGeometry(8, 2);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(0, 2, 0);
    this.gameoverGroup.add(mesh);
  }

  private _createRestartPrompt(): void {
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
    ctx.fillText('PRESS SPACE TO RETRY', 128, 40);

    const texture = new THREE.CanvasTexture(canvas);
    const geom = new THREE.PlaneGeometry(5, 1.25);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(0, -1, 0);
    this.gameoverGroup.add(mesh);
  }

  update(delta: number): void {
    if (this.starField) {
      this.starField.position.z += delta * 0.3;
      if (this.starField.position.z > 0) {
        this.starField.position.z = -10;
      }
    }
  }

  dispose(): void {
    this.scene.remove(this.gameoverGroup);
    this.gameoverGroup.traverse(child => {
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
