---
name: Quality Tiers
description: GPU-based adaptive quality selection with LOW/MEDIUM/HIGH tiers
type: concept
updated_at: 2026-08-07
last_commit: 68f5446a55b8d17afc76fe48b10d6a6b27edc5e6
language: en
---

# Quality Tiers

## Overview

`GPUProbe` detects the host GPU at startup and selects an appropriate quality tier. This ensures the game runs smoothly on both high-end desktops and mobile/low-end hardware.

## Detection Logic

```
if (not Desktop):
    return MEDIUM

if (desktop GPU keyword detected AND maxTextureSize >= 8192):
    return HIGH

if (mobile GPU keyword detected OR maxTextureSize < 4096):
    return LOW

return MEDIUM  // default fallback
```

## GPU Keyword Matching

| Category | Keywords |
|----------|---------|
| **Desktop** | nvidia, geforce, radeon, rx, rtx, gtx, amd, intel arc |
| **Mobile** | mali, adreno, powervr, intel, iris, swiftshader, llvmpipe, virtio, virtual, software |

Renderer string obtained from `Gdx.graphics.getGLVersion().toString()`.
Max texture size from `GL_MAX_TEXTURE_SIZE` OpenGL query.

## Tier Comparison

| Feature | LOW | MEDIUM | HIGH |
|---------|-----|--------|------|
| **Particle cap** | 200 | 500 | 1000 |
| **Parallax layers** | 4 | 6 | 10 |
| **Bullet cap** | 500 | 1000 | 2000 |
| **Post-processing** | Disabled | Basic | Full |
| **Palette cycling** | Disabled | Disabled | Enabled |

## Runtime Effects

Quality tier affects:

- `ParticleSystem` — Active particle cap enforced before each emit
- `ParallaxManager` — Number of visible background layers
- `GameScreen` — Maximum simultaneous bullets on screen
- `RenderPipeline` — Post-processing effects enabled/disabled

## Configuration Override

`GameConfig` supports parameter overrides via `ObjectMap`. The quality tier can be manually set, bypassing GPU detection:

```java
GameConfig config = new GameConfig();
config.setQuality(QualityTier.LOW);  // Force low quality
```
