---
name: Rendering Pipeline
description: FrameBuffer rendering, integer scaling, viewport calculation, and overscan crop
type: flow
updated_at: 2026-08-07
last_commit: 68f5446a55b8d17afc76fe48b10d6a6b27edc5e6
language: en
---

# Rendering Pipeline

## Overview

`RenderPipeline` handles adaptive rendering with FrameBuffer, integer scaling, and overscan cropping.

## Render Target

- **Internal resolution**: 320×224
- **FrameBuffer**: Render to texture at internal resolution
- **Display scaling**: Integer-multiple scaling to fit window
- **Overscan crop**: When letterbox exceeds 20px, crop center portion for authentic CRT look

## Viewport Calculation

Dynamic viewport derived from display aspect ratio:

```
displayAspect = displayWidth / displayHeight
internalAspect = 320 / 224 = 1.429

if (displayAspect > internalAspect):
    // Letterbox: fit to height, black bars on sides
    viewportHeight = 224
    viewportWidth = 224 * displayAspect
    cropSides = (viewportWidth - 320) / 2

if (displayAspect < internalAspect):
    // Pillarbox: fit to width, black bars on top/bottom
    viewportWidth = 320
    viewportHeight = 320 / displayAspect
    cropTop = (viewportHeight - 224) / 2
```

## Render Order

```
1. RenderPipeline.begin() — Bind FrameBuffer
2. ParallaxManager.render() — Background layers
3. Enemy.render() — Enemy sprites
4. PlayerShip.render() — Ship with shield overlay
5. Projectile.render() — Player bullets
6. Bullet.render() — Enemy bullets
7. LaserWarning.render() — Laser warnings and beams
8. AreaDenial.render() — Damage zones
9. ParticleSystem.render() — Particles (shockwaves first, then rest)
10. HUD.render() — Score, lives, weapons, shield, speed boost
11. RenderPipeline.end() — Unbind FrameBuffer, draw to screen with integer scaling
```

## Screen Shake Integration

Screen shake offset is applied to the render transform:

```
renderTransform.translate(shakeOffsetX, shakeOffsetY)
```

## Coordinate Unprojection

`unproject(screenX, screenY)` converts screen coordinates to world coordinates:

```
worldX = (screenX - cropX) / scale
worldY = (screenY - cropY) / scale
```

Used for input handling (mouse/touch → world position).

## WhiteTexture

Singleton 1×1 white pixel texture shared across all rendering. Lazy-initialized with double-checked locking. All tinted draws use this texture with `batch.setColor()`.
