import * as THREE from 'three';

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

  /** Ridged FBM for bark-like vertical ridges */
  ridgedFbm(x: number, y: number, octaves = 4): number {
    let value = 0, amplitude = 0.5, frequency = 1, maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      let n = this.noise2D(x * frequency, y * frequency);
      n = 1 - Math.abs(n) * 2;
      n = n * n;
      value += amplitude * n;
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    return value / maxValue;
  }
}

export class Vegetation {
  private readonly noise = new SimpleNoise();
  private readonly _group = new THREE.Group();

  get group(): THREE.Group { return this._group; }

  constructor(private readonly terrainZMin: number, private readonly terrainZMax: number) {
    // Reduce geometry in headless mode — SwiftShader chokes on heavy scenes
    const headless = (window as any).__DISABLE_POST_PROCESSING === true;
    if (headless) {
      console.log('Vegetation: reduced mode for headless');
      this.createTrees(8, true);
      this.createVines(true);
      this.createFerns(true);
      this.createGroundCover(true);
      this.createUnderbrush(true);
      // Skip epiphytes entirely in headless
    } else {
      this.createTrees();
      this.createVines(false);
      this.createFerns(false);
      this.createGroundCover(false);
      this.createUnderbrush(false);
      this.createEpiphytes();
    }
  }

  // ── Trees with proper bark, roots, and multi-cluster canopies ────────────

  private createTrees(count = 180, reduced = false): void {
    const spread = reduced ? 20 : 60;

    for (let i = 0; i < count; i++) {
      const z = this.terrainZMin + Math.random() * (this.terrainZMax - this.terrainZMin);
      const side = Math.random() > 0.5 ? 1 : -1;
      const distFromPath = 3 + Math.random() * spread;
      const x = side * distFromPath + Math.sin(z * 0.1) * 3;

      if (Math.abs(x) < 4) continue;

      const treeHeight = 8 + Math.random() * 12;
      const canopyRadius = 2 + Math.random() * 4;

      // Density gradient: denser at start, sparser near ruins
      const t = Math.abs(z) / Math.abs(this.terrainZMax);
      let density = 1.0;
      if (t > 0.5) density = 1 - (t - 0.5) * 0.8;
      if (Math.random() > density) continue;

      const tree = this.createTree(treeHeight, canopyRadius, reduced);
      tree.position.set(x, 0, z);
      tree.rotation.y = Math.random() * Math.PI * 2;
      const scale = 0.7 + Math.random() * 0.6;
      tree.scale.setScalar(scale);
      this._group.add(tree);
    }
  }

  private createTree(height: number, canopyRadius: number, reduced = false): THREE.Group {
    const tree = new THREE.Group();

    if (reduced) {
      // Minimal tree for headless testing: simple cylinder + sphere
      const trunkGeo = new THREE.CylinderGeometry(0.15, 0.25, height, 6);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3728 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = height / 2;
      tree.add(trunk);

      const canopyGeo = new THREE.IcosahedronGeometry(canopyRadius, 1);
      const canopyMat = new THREE.MeshStandardMaterial({ color: 0x2d5a1e });
      const canopy = new THREE.Mesh(canopyGeo, canopyMat);
      canopy.position.y = height + canopyRadius * 0.5;
      tree.add(canopy);
      return tree;
    }

    // ── Trunk: LatheGeometry with bark ridges and tapering ──────────────
    const trunkProfile: THREE.Vector2[] = [];
    const profileSteps = 24;
    for (let i = 0; i <= profileSteps; i++) {
      const t = i / profileSteps;
      const y = t * height;
      // Taper: wider at base, narrower at top
      const baseRadius = 0.35 - t * 0.2;
      // Bark ridge bumps (vertical asymmetry)
      const barkBump = Math.sin(t * 30 + this.noise.hash(i, 0) * 2) * 0.025
        + Math.sin(t * 17.3 + this.noise.hash(i, 1) * 3) * 0.015;
      // Root flare at base
      const rootFlare = t < 0.1 ? (1 - t / 0.1) * 0.15 : 0;
      const radius = Math.max(0.04, baseRadius + barkBump + rootFlare);
      trunkProfile.push(new THREE.Vector2(radius, y));
    }
    const trunkGeo = new THREE.LatheGeometry(trunkProfile, 16);

    // Add slight natural curve to trunk
    const trunkPos = trunkGeo.attributes.position;
    for (let i = 0; i < trunkPos.count; i++) {
      const y = trunkPos.getY(i);
      const t = y / height;
      const curve = Math.sin(t * Math.PI * 0.5) * 0.35
        + this.noise.fbm(t * 3, 0, 2) * 0.2;
      trunkPos.setX(i, trunkPos.getX(i) + curve * (1 - t * 0.3));
      // Slight twist
      const twist = Math.sin(t * Math.PI * 0.3) * 0.1 * t;
      const x = trunkPos.getX(i);
      const z = trunkPos.getZ(i);
      trunkPos.setX(i, x * Math.cos(twist) - z * Math.sin(twist));
      trunkPos.setZ(i, x * Math.sin(twist) + z * Math.cos(twist));
    }
    trunkGeo.computeVertexNormals();

    // ── Bark material: procedural texture with vertical ridges + lichen ──
    const barkCanvas = document.createElement('canvas');
    barkCanvas.width = 256;
    barkCanvas.height = 512;
    const bCtx = barkCanvas.getContext('2d')!;

    // Base bark: warm dark brown
    bCtx.fillStyle = '#3a2a1a';
    bCtx.fillRect(0, 0, 256, 512);

    // Vertical bark ridges: irregular lines with varying depth
    for (let x = 0; x < 256; x += 2 + Math.floor(Math.random() * 6)) {
      const shade = 30 + Math.random() * 35;
      const ridgeWidth = 1 + Math.random() * 3;
      bCtx.strokeStyle = `rgba(${shade + 12}, ${shade + 6}, ${shade - 4}, ${0.2 + Math.random() * 0.3})`;
      bCtx.lineWidth = ridgeWidth;
      bCtx.beginPath();
      let cx = x;
      let cy = 0;
      bCtx.moveTo(cx, cy);
      while (cy < 512) {
        cy += 8 + Math.random() * 20;
        cx += (Math.random() - 0.5) * 6;
        cx = Math.max(0, Math.min(256, cx));
        bCtx.lineTo(cx, cy);
      }
      bCtx.stroke();
    }

    // Horizontal cracks (natural bark splitting)
    for (let i = 0; i < 40; i++) {
      const y = Math.random() * 512;
      const x = Math.random() * 256;
      const len = 10 + Math.random() * 30;
      bCtx.strokeStyle = `rgba(20, 15, 10, ${0.15 + Math.random() * 0.2})`;
      bCtx.lineWidth = 0.5 + Math.random();
      bCtx.beginPath();
      bCtx.moveTo(x, y);
      bCtx.lineTo(x + len * (Math.random() - 0.5) * 2, y + (Math.random() - 0.5) * 4);
      bCtx.stroke();
    }

    // Lichen/algae patches (green-grey spots)
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 512;
      const r = 3 + Math.random() * 10;
      const green = 40 + Math.floor(Math.random() * 40);
      bCtx.fillStyle = `rgba(${35 + Math.random() * 25}, ${green}, ${25 + Math.random() * 15}, ${0.15 + Math.random() * 0.2})`;
      bCtx.beginPath();
      bCtx.arc(x, y, r, 0, Math.PI * 2);
      bCtx.fill();
    }

    // Moss at base (darker green patches)
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * 256;
      const y = 380 + Math.random() * 132;
      const r = 4 + Math.random() * 12;
      bCtx.fillStyle = `rgba(${20 + Math.random() * 20}, ${50 + Math.random() * 40}, ${15 + Math.random() * 15}, ${0.1 + Math.random() * 0.15})`;
      bCtx.beginPath();
      bCtx.arc(x, y, r, 0, Math.PI * 2);
      bCtx.fill();
    }

    const barkTexture = new THREE.CanvasTexture(barkCanvas);
    barkTexture.wrapS = THREE.RepeatWrapping;
    barkTexture.wrapT = THREE.RepeatWrapping;

    // Bark normal map: vertical ridges create directional bumps
    const barkNormalCanvas = document.createElement('canvas');
    barkNormalCanvas.width = 256;
    barkNormalCanvas.height = 512;
    const bnCtx = barkNormalCanvas.getContext('2d')!;
    bnCtx.fillStyle = 'rgb(128, 128, 255)';
    bnCtx.fillRect(0, 0, 256, 512);

    // Vertical ridges in normal map (raised ridges)
    for (let x = 0; x < 256; x += 3 + Math.floor(Math.random() * 7)) {
      const rVal = 128 + Math.floor(Math.random() * 50);
      const width = 2 + Math.floor(Math.random() * 4);
      bnCtx.fillStyle = `rgba(${rVal}, 128, 255, ${0.3 + Math.random() * 0.3})`;
      bnCtx.fillRect(x, 0, width, 512);
    }

    // Horizontal cracks (recessed, so blue channel lower)
    for (let i = 0; i < 40; i++) {
      const y = Math.random() * 512;
      const x = Math.random() * 256;
      const len = 10 + Math.random() * 30;
      bnCtx.fillStyle = `rgba(128, 128, ${100 + Math.floor(Math.random() * 30)}, 0.3)`;
      bnCtx.fillRect(x, y, len, 1 + Math.random() * 2);
    }

    const barkNormalTexture = new THREE.CanvasTexture(barkNormalCanvas);
    barkNormalTexture.wrapS = THREE.RepeatWrapping;
    barkNormalTexture.wrapT = THREE.RepeatWrapping;

    const trunkMat = new THREE.MeshStandardMaterial({
      map: barkTexture,
      normalMap: barkNormalTexture,
      normalScale: new THREE.Vector2(0.8, 0.8),
      color: 0x4a3a2a,
      roughness: 0.95,
      metalness: 0.0,
    });

    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.castShadow = true;
    tree.add(trunk);

    // ── Roots: flared at base, spreading outward ───────────────────────
    const rootCount = 5 + Math.floor(Math.random() * 4);
    for (let r = 0; r < rootCount; r++) {
      const rootGeo = new THREE.CylinderGeometry(0.015, 0.1 + Math.random() * 0.08, 1.5 + Math.random() * 1.5, 6);
      const root = new THREE.Mesh(rootGeo, trunkMat);
      const angle = (r / rootCount) * Math.PI * 2 + Math.random() * 0.5;
      root.position.set(
        Math.cos(angle) * 0.35,
        0.05,
        Math.sin(angle) * 0.35
      );
      root.rotation.z = Math.cos(angle) * 1.2;
      root.rotation.x = Math.sin(angle) * 1.2;
      root.castShadow = true;
      tree.add(root);
    }

    // ── Canopy: multiple overlapping leaf clusters ─────────────────────
    const canopyClusters = 5 + Math.floor(Math.random() * 5);
    for (let c = 0; c < canopyClusters; c++) {
      const clusterT = c / canopyClusters;
      const clusterRadius = canopyRadius * (0.4 + Math.random() * 0.6) * (1 - clusterT * 0.2);
      const clusterY = height - canopyRadius * 0.4 + clusterT * canopyRadius * 0.7;

      // Each cluster: deformed icosahedron with organic shape
      const clusterGeo = new THREE.IcosahedronGeometry(clusterRadius, 1);
      const cPos = clusterGeo.attributes.position;
      for (let j = 0; j < cPos.count; j++) {
        const px = cPos.getX(j);
        const py = cPos.getY(j);
        const pz = cPos.getZ(j);
        // Multi-octave noise for organic shape
        const n1 = this.noise.fbm(px * 2, pz * 2, 3) * 0.25;
        const n2 = this.noise.fbm(px * 4, pz * 4, 2) * 0.1;
        const factor = 1 + n1 + n2;
        // Flatten vertically (canopy is wider than tall)
        cPos.setXYZ(j, px * factor, py * factor * 0.55, pz * factor);
      }
      clusterGeo.computeVertexNormals();

      // Canopy color variation: new growth (bright lime) vs mature (dark forest)
      const isNewGrowth = Math.random() > 0.55;
      const sunExposure = Math.random();
      const greenVar = Math.random() * 0.12;

      let r: number, g: number, b: number;
      if (isNewGrowth) {
        // New growth: bright lime-green
        r = 0.06 + greenVar * 0.5;
        g = 0.35 + greenVar * 1.5;
        b = 0.04 + greenVar * 0.3;
      } else if (sunExposure > 0.6) {
        // Sun leaves: thicker, darker, blue-green
        r = 0.03 + greenVar * 0.3;
        g = 0.22 + greenVar;
        b = 0.04 + greenVar * 0.3;
      } else {
        // Shade leaves: thinner, lighter, yellow-green
        r = 0.06 + greenVar * 0.4;
        g = 0.28 + greenVar;
        b = 0.05 + greenVar * 0.3;
      }

      const clusterColor = new THREE.Color(r, g, b);

      const clusterMat = new THREE.MeshStandardMaterial({
        color: clusterColor,
        roughness: 0.7 + Math.random() * 0.15,
        metalness: 0.0,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.88 + Math.random() * 0.08,
      });

      const cluster = new THREE.Mesh(clusterGeo, clusterMat);
      cluster.position.y = clusterY;
      cluster.position.x = (Math.random() - 0.5) * canopyRadius * 0.35;
      cluster.position.z = (Math.random() - 0.5) * canopyRadius * 0.35;
      cluster.rotation.y = Math.random() * Math.PI;
      cluster.castShadow = true;
      cluster.receiveShadow = true;
      tree.add(cluster);
    }

    // Branches: thin extensions from trunk to canopy clusters
    const branchCount = 3 + Math.floor(Math.random() * 3);
    for (let b = 0; b < branchCount; b++) {
      const branchHeight = height * (0.4 + Math.random() * 0.5);
      const branchLength = 1 + Math.random() * 2;
      const angle = Math.random() * Math.PI * 2;

      const branchPoints: THREE.Vector3[] = [];
      const segs = 8;
      for (let s = 0; s <= segs; s++) {
        const t = s / segs;
        const x = Math.cos(angle) * branchLength * t;
        const y = branchHeight + Math.sin(t * Math.PI * 0.5) * 0.5;
        const z = Math.sin(angle) * branchLength * t;
        branchPoints.push(new THREE.Vector3(x, y, z));
      }

      const branchGeo = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(branchPoints),
        8,
        0.02 - branchHeight / height * 0.01,
        5,
        false
      );

      const branch = new THREE.Mesh(branchGeo, trunkMat);
      branch.castShadow = true;
      tree.add(branch);
    }

    return tree;
  }

  // ── Vines: thin, draped, with leaf clusters ──────────────────────────────

  private createVines(headless: boolean): void {
    const vineCount = headless ? 10 : 80;

    for (let i = 0; i < vineCount; i++) {
      const z = this.terrainZMin + Math.random() * (this.terrainZMax - this.terrainZMin);
      const t = Math.abs(z) / Math.abs(this.terrainZMax);

      // Fewer vines near ruins (more in dense jungle)
      if (t > 0.6 && Math.random() > 0.3) continue;

      const side = Math.random() > 0.5 ? 1 : -1;
      const x = side * (2 + Math.random() * 6) + Math.sin(z * 0.1) * 3;
      const vineLength = 2 + Math.random() * 7;

      const vine = this.createVine(vineLength);
      vine.position.set(x, 7 + Math.random() * 5, z);
      this._group.add(vine);
    }
  }

  private createVine(length: number): THREE.Group {
    const vineGroup = new THREE.Group();

    // Main vine: thin tube with natural curve
    const points: THREE.Vector3[] = [];
    const segments = 20;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      // Natural hanging curve with gravity sag and drift
      const x = Math.sin(t * Math.PI * 1.5 + Math.random() * 0.5) * 0.12;
      const y = -t * length + Math.sin(t * Math.PI) * 0.8; // Gravity sag
      const z = Math.cos(t * Math.PI * 1.2) * 0.08;
      points.push(new THREE.Vector3(x, y, z));
    }

    const vineMat = new THREE.MeshStandardMaterial({
      color: 0x2a4a1a,
      roughness: 0.85,
      metalness: 0.0,
    });

    const tubeGeo = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points),
      20,
      0.012, // 1.2cm — realistic vine thickness
      6,
      false
    );

    const vineMesh = new THREE.Mesh(tubeGeo, vineMat);
    vineMesh.castShadow = false;
    vineGroup.add(vineMesh);

    // Leaf clusters along the vine (aerial roots / small leaves)
    const leafCount = 3 + Math.floor(Math.random() * 5);
    for (let l = 0; l < leafCount; l++) {
      const leafT = 0.2 + Math.random() * 0.7;
      const idx = Math.floor(leafT * segments);
      if (idx < points.length) {
        const leafPoint = points[idx];
        const leafGeo = new THREE.CircleGeometry(0.04 + Math.random() * 0.04, 5);
        const leafMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(0.08 + Math.random() * 0.1, 0.3 + Math.random() * 0.12, 0.04 + Math.random() * 0.04),
          roughness: 0.65,
          metalness: 0.0,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8,
        });
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.position.copy(leafPoint);
        leaf.position.x += (Math.random() - 0.5) * 0.15;
        leaf.position.z += (Math.random() - 0.5) * 0.15;
        leaf.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI
        );
        vineGroup.add(leaf);
      }
    }

    return vineGroup;
  }

  // ── Ferns: individual pinnae along fronds with subsurface scattering ─────

  private createFerns(headless: boolean): void {
    const fernCount = headless ? 15 : 250;

    for (let i = 0; i < fernCount; i++) {
      const z = this.terrainZMin + Math.random() * (this.terrainZMax - this.terrainZMin);
      const side = Math.random() > 0.5 ? 1 : -1;
      const dist = 2.5 + Math.random() * 10;
      const x = side * dist + Math.sin(z * 0.1) * 2;

      const fern = this.createFern();
      fern.position.set(x, 0, z);
      fern.rotation.y = Math.random() * Math.PI * 2;
      const scale = 0.4 + Math.random() * 1.2;
      fern.scale.setScalar(scale);
      this._group.add(fern);
    }
  }

  private createFern(): THREE.Group {
    const fern = new THREE.Group();
    const frondCount = 8 + Math.floor(Math.random() * 6);

    for (let i = 0; i < frondCount; i++) {
      const angle = (i / frondCount) * Math.PI * 2 + Math.random() * 0.3;
      const frondLength = 0.5 + Math.random() * 1.2;

      const frondGroup = new THREE.Group();

      // Central stem: curved tube
      const stemPoints: THREE.Vector3[] = [];
      const stemSegs = 12;
      for (let j = 0; j <= stemSegs; j++) {
        const t = j / stemSegs;
        const x = t * frondLength;
        // Natural upward curve
        const y = Math.sin(t * Math.PI * 0.7) * 0.25 * frondLength;
        const z = Math.sin(t * Math.PI * 0.4) * 0.06;
        stemPoints.push(new THREE.Vector3(x, y, z));
      }
      const stemGeo = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(stemPoints),
        12,
        0.004,
        4,
        false
      );
      const stemMat = new THREE.MeshStandardMaterial({
        color: 0x1a3a10,
        roughness: 0.8,
        metalness: 0.0,
      });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      frondGroup.add(stem);

      // Individual leaflets (pinnae) along each frond
      const pinnaeCount = 10 + Math.floor(Math.random() * 8);
      for (let p = 0; p < pinnaeCount; p++) {
        const t = (p + 1) / (pinnaeCount + 1);
        const pinnaeLength = frondLength * t * 0.75;
        const pinnaeWidth = 0.015 + (1 - t) * 0.025;

        // Pinna: small curved plane with individual leaflet shape
        const pinnaGeo = new THREE.PlaneGeometry(pinnaeLength, pinnaeWidth, 6, 1);
        const pinnaPos = pinnaGeo.attributes.position;
        for (let k = 0; k < pinnaPos.count; k++) {
          const px = pinnaPos.getX(k);
          const pt = (px / pinnaeLength) + 0.5;
          // Curve the pinna upward
          pinnaPos.setY(k, pinnaPos.getY(k) + Math.sin(pt * Math.PI) * 0.04);
          // Taper to point
          const taper = 1 - Math.abs(pt - 0.5) * 0.6;
          pinnaPos.setZ(k, taper * 0.003);
        }
        pinnaGeo.computeVertexNormals();

        // Subsurface scattering approximation: bright green when backlit
        const pinnaGreen = new THREE.Color(
          0.06 + Math.random() * 0.1,
          0.28 + Math.random() * 0.18,
          0.03 + Math.random() * 0.04
        );
        const pinnaMat = new THREE.MeshPhysicalMaterial({
          color: pinnaGreen,
          roughness: 0.55,
          metalness: 0.0,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.82,
          // Simulate subsurface scattering via transmission
          transmission: 0.05,
          thickness: 0.02,
        });

        const pinna = new THREE.Mesh(pinnaGeo, pinnaMat);
        const stemPos = stemPoints[Math.floor(t * stemSegs)];
        pinna.position.set(
          stemPos!.x,
          stemPos!.y + pinnaeWidth,
          stemPos!.z
        );
        pinna.rotation.y = angle + (Math.random() - 0.5) * 0.25;
        // Leaflet angles upward from stem
        pinna.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.15;
        frondGroup.add(pinna);

        // Mirror pinna on opposite side
        const pinna2 = pinna.clone();
        pinna2.position.y = stemPos!.y - pinnaeWidth * 0.5;
        pinna2.rotation.z = -(Math.PI / 2) + (Math.random() - 0.5) * 0.15;
        frondGroup.add(pinna2);
      }

      frondGroup.rotation.y = angle;
      // Slight droop at frond tip
      frondGroup.rotation.x = -0.1 - Math.random() * 0.15;
      fern.add(frondGroup);
    }

    return fern;
  }

  // ── Ground cover: varied leaf litter with multiple geometries ────────────

  private createGroundCover(headless: boolean): void {
    const leafCount = headless ? 50 : 800;

    // Multiple leaf geometries for variety
    const leafGeometries: THREE.BufferGeometry[] = [];

    // Type 1: Small oval leaf
    const leaf1Geo = new THREE.PlaneGeometry(0.14, 0.07);
    const leaf1Pos = leaf1Geo.attributes.position;
    for (let i = 0; i < leaf1Pos.count; i++) {
      const x = leaf1Pos.getX(i);
      const y = leaf1Pos.getY(i);
      const factor = 1 - (x * x / 0.0049 + y * y / 0.0012) * 0.3;
      leaf1Pos.setZ(i, Math.max(0, factor) * 0.006);
    }
    leafGeometries.push(leaf1Geo);

    // Type 2: Long narrow leaf
    const leaf2Geo = new THREE.PlaneGeometry(0.22, 0.045);
    const leaf2Pos = leaf2Geo.attributes.position;
    for (let i = 0; i < leaf2Pos.count; i++) {
      const x = leaf2Pos.getX(i);
      const y = leaf2Pos.getY(i);
      const factor = 1 - (x * x / 0.012 + y * y / 0.0005) * 0.25;
      leaf2Pos.setZ(i, Math.max(0, factor) * 0.004);
    }
    leafGeometries.push(leaf2Geo);

    // Type 3: Irregular broad leaf
    const leaf3Geo = new THREE.CircleGeometry(0.07, 7);
    const leaf3Pos = leaf3Geo.attributes.position;
    for (let i = 0; i < leaf3Pos.count; i++) {
      const x = leaf3Pos.getX(i);
      const y = leaf3Pos.getY(i);
      const n = this.noise.fbm(x * 15, y * 15, 2) * 0.01;
      leaf3Pos.setZ(i, n);
    }
    leafGeometries.push(leaf3Geo);

    // Type 4: Withered curled leaf
    const leaf4Geo = new THREE.PlaneGeometry(0.12, 0.06);
    const leaf4Pos = leaf4Geo.attributes.position;
    for (let i = 0; i < leaf4Pos.count; i++) {
      const x = leaf4Pos.getX(i);
      const y = leaf4Pos.getY(i);
      const curl = Math.sin(x * 20) * 0.008;
      leaf4Pos.setZ(i, curl + Math.abs(y) * 0.05);
    }
    leafGeometries.push(leaf4Geo);

    // Use instanced mesh for each type
    const leavesPerType = Math.floor(leafCount / leafGeometries.length);
    const dummy = new THREE.Object3D();

    for (let g = 0; g < leafGeometries.length; g++) {
      // Varied leaf colors: fresh green, yellowing, brown
      const colorChoice = Math.random();
      let leafColor: THREE.Color;
      if (colorChoice < 0.4) {
        // Fresh green
        leafColor = new THREE.Color(
          0.06 + Math.random() * 0.08,
          0.18 + Math.random() * 0.12,
          0.03 + Math.random() * 0.03
        );
      } else if (colorChoice < 0.7) {
        // Yellowing
        leafColor = new THREE.Color(
          0.12 + Math.random() * 0.08,
          0.14 + Math.random() * 0.06,
          0.04 + Math.random() * 0.03
        );
      } else {
        // Brown/withered
        leafColor = new THREE.Color(
          0.1 + Math.random() * 0.06,
          0.07 + Math.random() * 0.04,
          0.03 + Math.random() * 0.02
        );
      }

      const leafMat = new THREE.MeshStandardMaterial({
        color: leafColor,
        roughness: 0.85,
        metalness: 0.0,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75 + Math.random() * 0.15,
      });

      const instancedLeaves = new THREE.InstancedMesh(leafGeometries[g], leafMat, leavesPerType);

      for (let i = 0; i < leavesPerType; i++) {
        const z = this.terrainZMin + Math.random() * (this.terrainZMax - this.terrainZMin);
        const side = Math.random() > 0.5 ? 1 : -1;
        const dist = 2 + Math.random() * 12;
        const x = side * dist;

        dummy.position.set(x, 0.005 + Math.random() * 0.02, z);
        dummy.rotation.set(
          Math.random() * 0.4 - 0.1, // Slight tilt
          Math.random() * Math.PI * 2,
          (Math.random() - 0.5) * 0.4
        );
        const s = 0.4 + Math.random() * 2.0;
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        instancedLeaves.setMatrixAt(i, dummy.matrix);
      }

      instancedLeaves.instanceMatrix.needsUpdate = true;
      this._group.add(instancedLeaves);
    }
  }

  // ── Underbrush: bushes with woody stems and varied leaf clusters ─────────

  private createUnderbrush(headless: boolean): void {
    const bushCount = headless ? 10 : 150;

    for (let i = 0; i < bushCount; i++) {
      const z = this.terrainZMin + Math.random() * (this.terrainZMax - this.terrainZMin);
      const side = Math.random() > 0.5 ? 1 : -1;
      const dist = 2 + Math.random() * 7;
      const x = side * dist;

      const bush = this.createBush();
      bush.position.set(x, 0, z);
      const s = 0.4 + Math.random() * 1.2;
      bush.scale.set(s, s * (0.5 + Math.random() * 0.5), s);
      this._group.add(bush);
    }
  }

  private createBush(): THREE.Group {
    const bush = new THREE.Group();
    const blobCount = 4 + Math.floor(Math.random() * 4);

    // Woody stem material
    const stemMat = new THREE.MeshStandardMaterial({
      color: 0x3a2a1a,
      roughness: 0.9,
      metalness: 0.0,
    });

    // Exposed woody stems
    const stemCount = 3 + Math.floor(Math.random() * 3);
    for (let s = 0; s < stemCount; s++) {
      const stemGeo = new THREE.CylinderGeometry(0.008, 0.015, 0.5 + Math.random() * 0.3, 4);
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.set(
        (Math.random() - 0.5) * 0.25,
        0.25,
        (Math.random() - 0.5) * 0.25
      );
      stem.rotation.z = (Math.random() - 0.5) * 0.4;
      stem.rotation.x = (Math.random() - 0.5) * 0.4;
      bush.add(stem);
    }

    // Leaf clusters: deformed icosahedrons with varied greens
    for (let i = 0; i < blobCount; i++) {
      const radius = 0.12 + Math.random() * 0.2;
      const geo = new THREE.IcosahedronGeometry(radius, 1);

      const pos = geo.attributes.position;
      for (let j = 0; j < pos.count; j++) {
        const px = pos.getX(j);
        const py = pos.getY(j);
        const pz = pos.getZ(j);
        const n = this.noise.fbm(px * 5, pz * 5, 2) * 0.15;
        pos.setXYZ(j, px + n, py * 0.45 + n * 0.3, pz + n);
      }
      geo.computeVertexNormals();

      // Varied green with fresh growth variation
      const isFresh = Math.random() > 0.65;
      const bushGreen = new THREE.Color(
        isFresh ? 0.08 + Math.random() * 0.08 : 0.02 + Math.random() * 0.06,
        0.18 + Math.random() * 0.18,
        isFresh ? 0.03 + Math.random() * 0.02 : 0.02 + Math.random() * 0.03
      );

      const mat = new THREE.MeshStandardMaterial({
        color: bushGreen,
        roughness: 0.75 + Math.random() * 0.15,
        metalness: 0.0,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85 + Math.random() * 0.1,
      });

      const blob = new THREE.Mesh(geo, mat);
      blob.position.set(
        (Math.random() - 0.5) * 0.35,
        radius * 0.5,
        (Math.random() - 0.5) * 0.35
      );
      blob.castShadow = true;
      blob.receiveShadow = true;
      bush.add(blob);
    }

    return bush;
  }

  // ── Epiphytes: plants growing on tree trunks and branches ────────────────

  private createEpiphytes(): void {
    // Small moss/fern clusters attached to trees (simulated as ground-level instances near path)
    const epiphyteCount = 100;

    for (let i = 0; i < epiphyteCount; i++) {
      const z = this.terrainZMin + Math.random() * (this.terrainZMax - this.terrainZMin);
      const side = Math.random() > 0.5 ? 1 : -1;
      const dist = 3 + Math.random() * 4;
      const x = side * dist;

      // Small epiphyte blob
      const geo = new THREE.IcosahedronGeometry(0.08 + Math.random() * 0.1, 0);
      const pos = geo.attributes.position;
      for (let j = 0; j < pos.count; j++) {
        const n = this.noise.fbm(pos.getX(j) * 8, pos.getZ(j) * 8, 2) * 0.03;
        pos.setXYZ(j, pos.getX(j) + n, pos.getY(j) * 0.5 + n * 0.3, pos.getZ(j) + n);
      }

      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(
          0.05 + Math.random() * 0.08,
          0.2 + Math.random() * 0.15,
          0.03 + Math.random() * 0.03
        ),
        roughness: 0.9,
        metalness: 0.0,
        transparent: true,
        opacity: 0.8,
      });

      const epiphyte = new THREE.Mesh(geo, mat);
      epiphyte.position.set(x, 0.5 + Math.random() * 3, z);
      epiphyte.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI
      );
      this._group.add(epiphyte);
    }
  }

  update(_delta: number, _elapsed: number): void {
    // Vegetation is static (no wind animation for now)
  }
}
