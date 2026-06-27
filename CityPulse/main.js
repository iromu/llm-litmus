import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/addons/shaders/FXAAShader.js";

// ===================== GLOBALS =====================
let scene, camera, renderer, composer, controls, clock;
let player, playerBody;
let buildings = [];
let npcs = [];
let interactables = [];
let keys = {};
let isPaused = false;
let isTitleScreen = true;
let isDialogueOpen = false;
let activeNPC = null;
let currentDialogueLine = 0;
let playerVelocity = new THREE.Vector3();
let onGround = true;
const GRAVITY = -25;
const JUMP_FORCE = 10;
const MOVE_SPEED = 8;
const PLAYER_HEIGHT = 1.7;
const PLAYER_RADIUS = 0.4;

// UI elements
const titleScreen = document.getElementById("title-screen");
const pauseScreen = document.getElementById("pause-screen");
const hud = document.getElementById("hud");
const interactionPrompt = document.getElementById("interaction-prompt");
const controlsHint = document.getElementById("controls-hint");
const dialogueBox = document.getElementById("dialogue-box");
const dialogueName = document.getElementById("dialogue-name");
const dialogueText = document.getElementById("dialogue-text");
const dialogueHint = document.getElementById("dialogue-hint");

// ===================== INIT =====================
function init() {
  clock = new THREE.Clock();

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0f1e);
  scene.fog = new THREE.FogExp2(0x0a0f1e, 0.008);

  // Camera
  camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.5, 500);
  camera.position.set(0, 8, 15);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  document.body.appendChild(renderer.domElement);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 5;
  controls.maxDistance = 40;
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.minPolarAngle = 0.2;
  controls.target.set(0, 2, 0);
  controls.enabled = false; // disabled on title screen

  // Lighting
  setupLighting();

  // Ground
  createGround();

  // City
  createCity();

  // Player
  createPlayer();

  // NPCs
  createNPCs();

  // Post-processing
  setupPostProcessing();

  // Events
  window.addEventListener("resize", onResize);
  window.addEventListener("keydown", (e) => { keys[e.code] = true; onKeyDown(e); });
  window.addEventListener("keyup", (e) => { keys[e.code] = false; });

  // Start
  animate();
}

// ===================== LIGHTING =====================
function setupLighting() {
  // Hemisphere sky/ground
  const hemi = new THREE.HemisphereLight(0x4488cc, 0x002244, 0.6);
  scene.add(hemi);

  // Ambient
  const ambient = new THREE.AmbientLight(0x334466, 0.4);
  scene.add(ambient);

  // Moon/sun directional
  const dirLight = new THREE.DirectionalLight(0xaabbff, 1.2);
  dirLight.position.set(30, 50, 20);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 1;
  dirLight.shadow.camera.far = 120;
  dirLight.shadow.camera.left = -60;
  dirLight.shadow.camera.right = 60;
  dirLight.shadow.camera.top = 60;
  dirLight.shadow.camera.bottom = -60;
  dirLight.shadow.bias = -0.0005;
  scene.add(dirLight);
  scene.add(dirLight.target);

  // City glow point lights
  const colors = [0x00d4ff, 0x7b2ff7, 0xff2d95, 0x00ff88];
  for (let i = 0; i < 8; i++) {
    const pl = new THREE.PointLight(colors[i % colors.length], 2, 30, 2);
    pl.position.set(
      (Math.random() - 0.5) * 80,
      2 + Math.random() * 3,
      (Math.random() - 0.5) * 80
    );
    scene.add(pl);
  }
}

// ===================== GROUND =====================
function createGround() {
  // Main ground
  const groundGeo = new THREE.PlaneGeometry(200, 200);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a2e,
    roughness: 0.9,
    metalness: 0.1,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Roads (grid pattern)
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a3e,
    roughness: 0.8,
  });

  const roadWidth = 6;
  const gridSize = 20;
  const citySize = 80;

  for (let i = -citySize; i <= citySize; i += gridSize) {
    // X roads
    const roadX = new THREE.Mesh(
      new THREE.PlaneGeometry(citySize * 2, roadWidth),
      roadMat
    );
    roadX.rotation.x = -Math.PI / 2;
    roadX.position.set(0, 0.01, i);
    roadX.receiveShadow = true;
    scene.add(roadX);

    // Z roads
    const roadZ = new THREE.Mesh(
      new THREE.PlaneGeometry(roadWidth, citySize * 2),
      roadMat
    );
    roadZ.rotation.x = -Math.PI / 2;
    roadZ.position.set(i, 0.01, 0);
    roadZ.receiveShadow = true;
    scene.add(roadZ);
  }

  // Road markings (dashed center lines)
  const markMat = new THREE.MeshStandardMaterial({ color: 0x666688, roughness: 0.5 });
  for (let i = -citySize; i <= citySize; i += gridSize) {
    for (let j = -citySize; j < citySize; j += 3) {
      const mark = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, 0.15),
        markMat
      );
      mark.rotation.x = -Math.PI / 2;
      mark.position.set(j, 0.02, i);
      scene.add(mark);

      const markZ = new THREE.Mesh(
        new THREE.PlaneGeometry(0.15, 1.5),
        markMat
      );
      markZ.rotation.x = -Math.PI / 2;
      markZ.position.set(i, 0.02, j);
      scene.add(markZ);
    }
  }
}

// ===================== CITY =====================
function createCity() {
  const gridSize = 20;
  const citySize = 80;
  const roadWidth = 6;

  // Building materials pool
  const buildingMats = [
    new THREE.MeshStandardMaterial({ color: 0x2a3a5c, roughness: 0.3, metalness: 0.7 }),
    new THREE.MeshStandardMaterial({ color: 0x3a2a4c, roughness: 0.4, metalness: 0.6 }),
    new THREE.MeshStandardMaterial({ color: 0x1a2a3c, roughness: 0.5, metalness: 0.5 }),
    new THREE.MeshStandardMaterial({ color: 0x2a2a4c, roughness: 0.2, metalness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: 0x3c2a3a, roughness: 0.35, metalness: 0.65 }),
  ];

  // Window light material (emissive)
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0xffffcc,
    emissive: 0xffdd88,
    emissiveIntensity: 0.8,
  });
  const windowMatBlue = new THREE.MeshStandardMaterial({
    color: 0x88ccff,
    emissive: 0x4488cc,
    emissiveIntensity: 0.6,
  });

  // Generate buildings in grid blocks
  for (let gx = -citySize; gx < citySize; gx += gridSize) {
    for (let gz = -citySize; gz < citySize; gz += gridSize) {
      // Skip some blocks for variety
      if (Math.random() < 0.15) continue;

      // Building dimensions
      const bw = 3 + Math.random() * 6;
      const bd = 3 + Math.random() * 6;
      const bh = 3 + Math.random() * 25;

      // Position within block
      const bx = gx + gridSize / 2 + (Math.random() - 0.5) * 4;
      const bz = gz + gridSize / 2 + (Math.random() - 0.5) * 4;

      createBuilding(bx, bz, bw, bd, bh, buildingMats, windowMat, windowMatBlue);
    }
  }

  // Street lights along roads
  for (let i = -citySize; i <= citySize; i += gridSize) {
    for (let j = -citySize; j <= citySize; j += 8) {
      createStreetLight(j + 4, i);
      createStreetLight(j - 4, i);
      createStreetLight(i, j + 4);
      createStreetLight(i, j - 4);
    }
  }

  // Glowing signs on some buildings
  const signColors = [0x00d4ff, 0x7b2ff7, 0xff2d95, 0x00ff88, 0xffaa00];
  for (let i = 0; i < 30; i++) {
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(1.5 + Math.random(), 0.5 + Math.random() * 0.5, 0.1),
      new THREE.MeshStandardMaterial({
        color: signColors[Math.floor(Math.random() * signColors.length)],
        emissive: signColors[Math.floor(Math.random() * signColors.length)],
        emissiveIntensity: 2,
      })
    );
    // Place on a random building face
    const bldg = buildings[Math.floor(Math.random() * buildings.length)];
    if (bldg) {
      sign.position.set(
        bldg.position.x + (Math.random() - 0.5) * bldg.scale.x * 0.5,
        bldg.position.y + Math.random() * bldg.scale.y * 0.5,
        bldg.position.z + bldg.scale.z / 2 + 0.06
      );
      scene.add(sign);
    }
  }
}

function createBuilding(x, z, w, d, h, mats, winMat, winMatBlue) {
  // Main structure
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = mats[Math.floor(Math.random() * mats.length)].clone();
  const building = new THREE.Mesh(geo, mat);
  building.position.set(x, h / 2, z);
  building.castShadow = true;
  building.receiveShadow = true;
  scene.add(building);

  // Store for collision
  buildings.push({
    mesh: building,
    minX: x - w / 2 - PLAYER_RADIUS,
    maxX: x + w / 2 + PLAYER_RADIUS,
    minZ: z - d / 2 - PLAYER_RADIUS,
    maxZ: z + d / 2 + PLAYER_RADIUS,
    height: h,
  });

  // Windows (emissive planes on faces)
  const windowRows = Math.floor(h / 2);
  const windowColsX = Math.floor(w / 2);
  const windowColsZ = Math.floor(d / 2);

  for (let row = 0; row < windowRows; row++) {
    for (let col = 0; col < windowColsX; col++) {
      if (Math.random() < 0.4) continue; // Some windows dark

      const wm = Math.random() < 0.7 ? winMat : winMatBlue;
      const win = new THREE.Mesh(
        new THREE.PlaneGeometry(0.8, 1.2),
        wm.clone()
      );
      win.material.emissiveIntensity = 0.3 + Math.random() * 1;

      // Front face
      win.position.set(
        x - w / 2 + 1 + col * 2,
        1 + row * 2,
        z + d / 2 + 0.01
      );
      scene.add(win);

      // Back face
      const winBack = win.clone();
      winBack.position.z = z - d / 2 - 0.01;
      winBack.rotation.y = Math.PI;
      scene.add(winBack);
    }

    for (let col = 0; col < windowColsZ; col++) {
      if (Math.random() < 0.4) continue;

      const wm = Math.random() < 0.7 ? winMat : winMatBlue;
      const win = new THREE.Mesh(
        new THREE.PlaneGeometry(0.8, 1.2),
        wm.clone()
      );
      win.material.emissiveIntensity = 0.3 + Math.random() * 1;

      // Right face
      win.position.set(
        x + w / 2 + 0.01,
        1 + row * 2,
        z - d / 2 + 1 + col * 2
      );
      win.rotation.y = Math.PI / 2;
      scene.add(win);

      // Left face
      const winLeft = win.clone();
      winLeft.position.x = x - w / 2 - 0.01;
      winLeft.rotation.y = -Math.PI / 2;
      scene.add(winLeft);
    }
  }

  // Rooftop details
  if (Math.random() < 0.5) {
    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 3),
      new THREE.MeshStandardMaterial({ color: 0x666688, metalness: 0.8 })
    );
    antenna.position.set(x + (Math.random() - 0.5) * w * 0.3, h + 1.5, z + (Math.random() - 0.5) * d * 0.3);
    scene.add(antenna);

    // Blinking light on top
    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.1),
      new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 2,
      })
    );
    light.position.copy(antenna.position);
    light.position.y += 1.5;
    light.userData.blinkSpeed = 1 + Math.random() * 2;
    light.userData.blinkOffset = Math.random() * Math.PI * 2;
    scene.add(light);
  }
}

function createStreetLight(x, z) {
  const group = new THREE.Group();

  // Pole
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 5),
    new THREE.MeshStandardMaterial({ color: 0x444466, metalness: 0.7 })
  );
  pole.position.y = 2.5;
  pole.castShadow = true;
  group.add(pole);

  // Arm
  const arm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 1.5),
    new THREE.MeshStandardMaterial({ color: 0x444466, metalness: 0.7 })
  );
  arm.rotation.z = Math.PI / 2;
  arm.position.set(0.5, 5, 0);
  group.add(arm);

  // Light housing
  const housing = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.15, 0.3),
    new THREE.MeshStandardMaterial({
      color: 0xffffcc,
      emissive: 0xffdd88,
      emissiveIntensity: 3,
    })
  );
  housing.position.set(0.8, 4.85, 0);
  group.add(housing);

  // Actual light
  const light = new THREE.PointLight(0xffdd88, 1.5, 15, 2);
  light.position.set(0.8, 4.8, 0);
  light.castShadow = false;
  group.add(light);

  group.position.set(x, 0, z);
  scene.add(group);
}

// ===================== PLAYER =====================
function createPlayer() {
  player = new THREE.Group();

  // Body
  const bodyGeo = new THREE.BoxGeometry(0.6, 0.9, 0.35);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3366ff, roughness: 0.5 });
  playerBody = new THREE.Mesh(bodyGeo, bodyMat);
  playerBody.position.y = 0.45;
  playerBody.castShadow = true;
  player.add(playerBody);

  // Head
  const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc99, roughness: 0.7 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.1;
  head.castShadow = true;
  player.add(head);

  // Eyes
  const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.05);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.1, 1.15, 0.2);
  player.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.1, 1.15, 0.2);
  player.add(rightEye);

  // Legs
  const legGeo = new THREE.BoxGeometry(0.2, 0.5, 0.25);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x222244 });
  const leftLeg = new THREE.Mesh(legGeo, legMat);
  leftLeg.position.set(-0.15, -0.25, 0);
  leftLeg.castShadow = true;
  player.add(leftLeg);
  const rightLeg = new THREE.Mesh(legGeo, legMat);
  rightLeg.position.set(0.15, -0.25, 0);
  rightLeg.castShadow = true;
  player.add(rightLeg);

  // Store references for animation
  player.userData.leftLeg = leftLeg;
  player.userData.rightLeg = rightLeg;
  player.userData.leftArm = null; // Could add arms later

  // Player light
  const playerLight = new THREE.PointLight(0x3366ff, 1, 8);
  playerLight.position.y = 1;
  player.add(playerLight);

  player.position.set(0, 0, 0);
  scene.add(player);
}

// ===================== NPCS =====================
function createNPCs() {
  const npcData = [
    {
      name: "Dr. Aria Chen",
      color: 0xff4488,
      position: { x: 5, z: 5 },
      dialogues: [
        "Welcome to Litmus City! I'm Dr. Aria Chen, lead researcher here.",
        "We built this city to study human-AI interaction patterns.",
        "Every building, every light — it's all part of the simulation.",
        "Feel free to explore. The NPCs around here have stories to tell.",
        "I've been working on this project for three years now.",
      ],
    },
    {
      name: "Marcus Webb",
      color: 0x44ff88,
      position: { x: -8, z: 3 },
      dialogues: [
        "Hey there! Nice to see a new face around here.",
        "I'm Marcus. I handle security for the city grid.",
        "Everything runs on Three.js under the hood. Crazy, right?",
        "The buildings? Procedurally generated. Every time you restart, it's different.",
        "Want to know a secret? The street lights actually save energy. Mostly.",
      ],
    },
    {
      name: "Kai Nakamura",
      color: 0xffaa44,
      position: { x: 3, z: -10 },
      dialogues: [
        "Oh, you're the one they told me about. I'm Kai.",
        "I design the neon signs you see around town. Like that one over there.",
        "People say this city never sleeps. That's because the emissive materials never dim.",
        "I love watching the bloom pass render at night. Pure magic.",
        "Have you tried jumping? The physics engine is surprisingly satisfying.",
      ],
    },
    {
      name: "Luna Voss",
      color: 0xaa44ff,
      position: { x: -5, z: -7 },
      dialogues: [
        "Hello, traveler. I'm Luna, the archivist of this place.",
        "I keep records of everyone who visits. You're quite special, you know.",
        "This city has seen hundreds of players. Each one leaves a mark.",
        "The orbit camera? Try right-click drag. You can see the whole city from above.",
        "My favorite time here is when the bloom effect makes everything glow.",
      ],
    },
    {
      name: "Rex Bolt",
      color: 0xffff44,
      position: { x: 12, z: -3 },
      dialogues: [
        "BOOM! What's up? I'm Rex, the energy guy!",
        "All these point lights? I keep them running 24/7!",
        "Did you know? This city uses more watts than a small country!",
        "The post-processing pipeline is my baby. Bloom, FXAA, all of it!",
        "Keep exploring! Every corner has something new to discover!",
      ],
    },
  ];

  npcData.forEach((data) => {
    const npc = createNPC(data.color);
    npc.position.set(data.position.x, 0, data.position.z);
    npc.userData.name = data.name;
    npc.userData.dialogues = [...data.dialogues];
    npc.userData.currentDialogueIndex = 0;
    npc.userData.wanderTarget = new THREE.Vector3(
      data.position.x + (Math.random() - 0.5) * 8,
      0,
      data.position.z + (Math.random() - 0.5) * 8
    );
    npc.userData.wanderSpeed = 1 + Math.random();
    npc.userData.wanderTimer = 0;
    npc.userData.idleTimer = 0;
    npc.userData.isIdle = false;
    scene.add(npc);
    npcs.push(npc);
    interactables.push(npc);
  });
}

function createNPC(color) {
  const group = new THREE.Group();

  // Body
  const bodyGeo = new THREE.BoxGeometry(0.55, 0.85, 0.3);
  const bodyMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.5,
    emissive: color,
    emissiveIntensity: 0.15,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.425;
  body.castShadow = true;
  group.add(body);

  // Head
  const headGeo = new THREE.BoxGeometry(0.38, 0.38, 0.38);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc99, roughness: 0.7 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.05;
  head.castShadow = true;
  group.add(head);

  // Eyes
  const eyeGeo = new THREE.BoxGeometry(0.07, 0.07, 0.05);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.09, 1.1, 0.19);
  group.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.09, 1.1, 0.19);
  group.add(rightEye);

  // Legs
  const legGeo = new THREE.BoxGeometry(0.18, 0.45, 0.22);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x222244 });
  const leftLeg = new THREE.Mesh(legGeo, legMat);
  leftLeg.position.set(-0.13, -0.225, 0);
  leftLeg.castShadow = true;
  group.add(leftLeg);
  const rightLeg = new THREE.Mesh(legGeo, legMat);
  rightLeg.position.set(0.13, -0.225, 0);
  rightLeg.castShadow = true;
  group.add(rightLeg);

  group.userData.leftLeg = leftLeg;
  group.userData.rightLeg = rightLeg;

  // Name indicator (glowing ring above head)
  const ringGeo = new THREE.TorusGeometry(0.3, 0.04, 8, 16);
  const ringMat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 1.5,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = 1.6;
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  group.userData.ring = ring;

  return group;
}

// ===================== POST-PROCESSING =====================
function setupPostProcessing() {
  composer = new EffectComposer(renderer);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // Bloom
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.8,   // strength
    0.4,   // radius
    0.85   // threshold
  );
  composer.addPass(bloomPass);

  // FXAA
  const fxaaPass = new ShaderPass(FXAAShader);
  fxaaPass.material.uniforms["resolution"].value.set(
    1 / window.innerWidth,
    1 / window.innerHeight
  );
  composer.addPass(fxaaPass);
}

// ===================== RESIZE =====================
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

// ===================== INPUT =====================
function onKeyDown(e) {
  if (e.code === "Escape") {
    if (isDialogueOpen) {
      closeDialogue();
      return;
    }
    if (isTitleScreen) {
      startGame();
      return;
    }
    togglePause();
    return;
  }

  if (e.code === "KeyE" && !isTitleScreen) {
    if (isDialogueOpen) {
      advanceDialogue();
    } else {
      tryInteract();
    }
  }

  if (e.code === "Space" && !isTitleScreen && onGround && !isDialogueOpen) {
    playerVelocity.y = JUMP_FORCE;
    onGround = false;
  }
}

function startGame() {
  isTitleScreen = false;
  titleScreen.classList.add("hidden");
  hud.classList.remove("hidden");
  controls.enabled = true;
}

function togglePause() {
  isPaused = !isPaused;
  if (isPaused) {
    pauseScreen.classList.remove("hidden");
    controls.enabled = false;
  } else {
    pauseScreen.classList.add("hidden");
    controls.enabled = true;
  }
}

// ===================== INTERACTION =====================
function tryInteract() {
  // Find nearest NPC within range
  let closestNPC = null;
  let closestDist = 4; // interaction range

  for (const npc of npcs) {
    const dist = player.position.distanceTo(npc.position);
    if (dist < closestDist) {
      closestDist = dist;
      closestNPC = npc;
    }
  }

  if (closestNPC) {
    openDialogue(closestNPC);
  }
}

function openDialogue(npc) {
  activeNPC = npc;
  currentDialogueLine = 0;
  isDialogueOpen = true;
  showDialogueLine();
  interactionPrompt.classList.add("hidden");
}

function closeDialogue() {
  isDialogueOpen = false;
  activeNPC = null;
  dialogueBox.classList.add("hidden");
}

function advanceDialogue() {
  if (!activeNPC) return;
  currentDialogueLine++;
  if (currentDialogueLine >= activeNPC.userData.dialogues.length) {
    closeDialogue();
    return;
  }
  showDialogueLine();
}

function showDialogueLine() {
  if (!activeNPC) return;
  dialogueName.textContent = activeNPC.userData.name;
  dialogueText.textContent = activeNPC.userData.dialogues[currentDialogueLine];
  dialogueHint.textContent = currentDialogueLine < activeNPC.userData.dialogues.length - 1
    ? "Press E for next line  •  ESC to close"
    : "Press E to close";
  dialogueBox.classList.remove("hidden");
}

// ===================== COLLISION =====================
function checkCollision(newPos) {
  for (const building of buildings) {
    if (
      newPos.x > building.minX &&
      newPos.x < building.maxX &&
      newPos.z > building.minZ &&
      newPos.z < building.maxZ
    ) {
      return true;
    }
  }
  return false;
}

// ===================== CAMERA =====================
function updateCamera() {
  if (isTitleScreen) return;

  // Camera follows player via OrbitControls
  controls.target.lerp(player.position.clone().add(new THREE.Vector3(0, 2, 0)), 0.1);
  controls.update();
}

// ===================== ANIMATION =====================
function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.getElapsedTime();

  if (!isPaused && !isTitleScreen) {
    updatePlayer(delta);
    updateNPCs(delta, elapsed);
    updateCamera();
    updateInteractionPrompt();
    updateBlinkingLights(elapsed);
  }

  composer.render();
}

function updatePlayer(delta) {
  // Movement direction relative to camera
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();

  const right = new THREE.Vector3();
  right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

  const moveDir = new THREE.Vector3();

  if (keys["KeyW"]) moveDir.add(forward);
  if (keys["KeyS"]) moveDir.sub(forward);
  if (keys["KeyA"]) moveDir.sub(right);
  if (keys["KeyD"]) moveDir.add(right);

  if (moveDir.length() > 0) {
    moveDir.normalize();

    // Apply movement with collision
    const speed = MOVE_SPEED * delta;
    const newPos = player.position.clone();
    newPos.x += moveDir.x * speed;
    newPos.z += moveDir.z * speed;

    // Check collision separately for each axis
    const testX = player.position.clone();
    testX.x += moveDir.x * speed;
    if (!checkCollision(testX)) {
      player.position.x = testX.x;
    }

    const testZ = player.position.clone();
    testZ.z += moveDir.z * speed;
    if (!checkCollision(testZ)) {
      player.position.z = testZ.z;
    }

    // Rotate player to face movement direction
    const targetAngle = Math.atan2(moveDir.x, moveDir.z);
    player.rotation.y = targetAngle;

    // Animate legs
    const legSwing = Math.sin(elapsed * 10) * 0.4;
    player.userData.leftLeg.rotation.x = legSwing;
    player.userData.rightLeg.rotation.x = -legSwing;
  } else {
    // Reset leg animation
    player.userData.leftLeg.rotation.x *= 0.9;
    player.userData.rightLeg.rotation.x *= 0.9;
  }

  // Gravity
  playerVelocity.y += GRAVITY * delta;
  player.position.y += playerVelocity.y * delta;

  // Ground collision
  if (player.position.y <= 0) {
    player.position.y = 0;
    playerVelocity.y = 0;
    onGround = true;
  }

  // Building top collision (landing on buildings)
  for (const building of buildings) {
    if (
      player.position.x > building.minX &&
      player.position.x < building.maxX &&
      player.position.z > building.minZ &&
      player.position.z < building.maxZ
    ) {
      if (playerVelocity.y < 0 && player.position.y < building.height) {
        player.position.y = building.height;
        playerVelocity.y = 0;
        onGround = true;
      }
    }
  }
}

function updateNPCs(delta, elapsed) {
  npcs.forEach((npc) => {
    // Wander AI
    npc.userData.wanderTimer -= delta;

    if (npc.userData.wanderTimer <= 0) {
      if (npc.userData.isIdle) {
        // Start walking again
        npc.userData.isIdle = false;
        npc.userData.wanderTarget.set(
          npc.position.x + (Math.random() - 0.5) * 10,
          0,
          npc.position.z + (Math.random() - 0.5) * 10
        );
        // Clamp to city bounds
        npc.userData.wanderTarget.x = THREE.MathUtils.clamp(npc.userData.wanderTarget.x, -75, 75);
        npc.userData.wanderTarget.z = THREE.MathUtils.clamp(npc.userData.wanderTarget.z, -75, 75);
        npc.userData.wanderTimer = 2 + Math.random() * 2;
      } else {
        // Start idle
        npc.userData.isIdle = true;
        npc.userData.wanderTimer = 1 + Math.random() * 3;
      }
    }

    if (!npc.userData.isIdle) {
      const dir = new THREE.Vector3().subVectors(npc.userData.wanderTarget, npc.position);
      dir.y = 0;
      const dist = dir.length();

      if (dist > 0.5) {
        dir.normalize();
        const speed = npc.userData.wanderSpeed * delta;
        const newPos = npc.position.clone();
        newPos.x += dir.x * speed;
        newPos.z += dir.z * speed;

        // Simple collision avoidance
        if (!checkCollision(newPos)) {
          npc.position.x = newPos.x;
          npc.position.z = newPos.z;
        }

        // Face movement direction
        npc.rotation.y = Math.atan2(dir.x, dir.z);

        // Animate legs
        const legSwing = Math.sin(elapsed * 6) * 0.3;
        npc.userData.leftLeg.rotation.x = legSwing;
        npc.userData.rightLeg.rotation.x = -legSwing;
      }
    } else {
      // Idle bob
      npc.position.y = Math.sin(elapsed * 2) * 0.05;
    }

    // Ring animation
    if (npc.userData.ring) {
      npc.userData.ring.position.y = 1.6 + Math.sin(elapsed * 3 + npc.position.x) * 0.1;
      npc.userData.ring.rotation.z = elapsed * 2;
    }
  });
}

function updateInteractionPrompt() {
  let nearestNPC = null;
  let nearestDist = 4;

  for (const npc of npcs) {
    const dist = player.position.distanceTo(npc.position);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestNPC = npc;
    }
  }

  if (nearestNPC && !isDialogueOpen) {
    interactionPrompt.classList.remove("hidden");
    interactionPrompt.textContent = `Press [E] to talk to ${nearestNPC.userData.name}`;
  } else {
    interactionPrompt.classList.add("hidden");
  }
}

function updateBlinkingLights(elapsed) {
  scene.traverse((obj) => {
    if (obj.userData.blinkSpeed) {
      const intensity = Math.sin(elapsed * obj.userData.blinkSpeed + obj.userData.blinkOffset) > 0.3 ? 2 : 0.1;
      obj.material.emissiveIntensity = intensity;
    }
  });
}

// ===================== START =====================
init();