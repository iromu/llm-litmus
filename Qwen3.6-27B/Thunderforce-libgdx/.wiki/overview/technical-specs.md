---
name: Technical Specs
description: Target platform, display specs, dependencies, quality tiers, and GPU detection
type: overview
updated_at: 2026-08-07
last_commit: 68f5446a55b8d17afc76fe48b10d6a6b27edc5e6
language: en
---

# Technical Specs

## Target Platform

- **Engine**: libGDX 1.13.1
- **Backend**: LWJGL3 desktop
- **Language**: Java 25 compiler target
- **Build**: Maven multi-module (core + desktop)

## Display

| Parameter | Value |
|-----------|-------|
| Internal resolution | 320×224 |
| Target FPS | 60 (fixed timestep 1/60s ≈ 16.67ms) |
| Window size | 1280×960 (4× integer scaling) |
| VSync | Enabled |
| Scaling | Nearest-neighbor, integer-multiple |
| Overscan crop | Applied when letterbox > 20px |

## Dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| libGDX | 1.13.1 | Core game engine |
| gdx-ai | 1.8.2 | Steering behaviors (Seek, Flee, Arrive, Wander) |
| box2dlights | 1.5 | 2D lighting effects |
| JUnit Jupiter | 5.10.2 | Unit testing |

## Quality Tiers

GPU probe at startup selects one of three tiers:

| Tier | Particles | Parallax Layers | Bullet Cap | Condition |
|------|-----------|----------------|------------|-----------|
| HIGH | 1000 | 10 | 2000 | Desktop GPU + maxTexture ≥ 8192 |
| MEDIUM | 500 | 6 | 1000 | Default fallback |
| LOW | 200 | 4 | 500 | Mobile GPU or maxTexture < 4096 |

## GPU Detection

- **Desktop keywords**: nvidia, geforce, radeon, rx, rtx, gtx, amd, intel arc
- **Mobile keywords**: mali, adreno, powervr, intel, iris, swiftshader, llvmpipe, virtio, virtual, software
- Queries `GL_MAX_TEXTURE_SIZE` via OpenGL

## Asset Inventory

| Category | Count | Format |
|----------|-------|--------|
| Textures | 20+ | PNG |
| Fonts | 3 | Bitmap (.fnt) |
| Music | 8 | OGG (title, 4 biome, 3 boss) |
| SFX | 10 | WAV |
| JSON data | 8 | Enemy definitions, 4 encounters, 3 bosses |
| Biome backgrounds | 16 | 4 biomes × 4 layers each |

## Memory Targets

- Zero GC during gameplay via FixedPool pre-allocation
- Particle cap enforced per quality tier
- Projectile and bullet lifetime-based cleanup
