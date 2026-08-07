---
name: Biomes
description: Four biomes with parallax scrolling, ambient particles, and crossfade transitions
type: feature
updated_at: 2026-08-07
last_commit: 68f5446a55b8d17afc76fe48b10d6a6b27edc5e6
language: en
---

# Biomes

## Overview

Four distinct biomes, each with 4 parallax background layers and unique ambient particles:

| Biome | Theme | Ambient Particle | Music |
|-------|-------|-----------------|-------|
| **Volcanic** | Volcanic canyon with lava flows | ASH — falling orange/red embers | `volcanic.ogg` |
| **City** | Futuristic neon cityscape | NEON_SPARK — floating blue/purple sparks | `city.ogg` |
| **Asteroid** | Asteroid field in deep space | DEBRIS — drifting gray/brown fragments | `asteroid.ogg` |
| **Alien** | Biomechanical organic fortress | SPORE — bobbing green/pink spores | `alien.ogg` |

## Parallax Layers

Each biome has 4 layers loaded from `textures/biomes/{biome}/layer{0-3}.png`:

- **Layer 0**: Far background (slowest scroll, scrollSpeed ≈ 0.1)
- **Layer 1**: Mid-far background
- **Layer 2**: Mid-near background
- **Layer 3**: Near foreground (fastest scroll, scrollSpeed ≈ 1.0)

### ParallaxLayer

- Seamless horizontal tile wrapping via UV offset management
- Scroll offset wraps at texture width
- Alpha support for crossfade transitions
- Optional shader attachment for palette cycling

### ParallaxManager

- Manages 4–10 layers based on quality tier
- Biome transitions with `Interpolation.fade` crossfade
- Smooth speed changes between biomes
- Transition every 30 seconds in gameplay

## Ambient Effects

Each biome has a unique ambient particle type with controlled emission rates:

| Type | Rate | Spawn Position | Drift Direction |
|------|------|---------------|-----------------|
| ASH | 3/s | Top edge (y = -5) | Falls downward |
| NEON_SPARK | 2/s | Bottom edge (y = 229) | Floats upward |
| DEBRIS | 1.5/s | Side edges | Drifts inward |
| SPORE | 2.5/s | Bottom quarter | Bobbing drift |

Emission uses an accumulator pattern to avoid per-frame allocation:

```
emitAccumulator += delta * rate
while (emitAccumulator >= 1.0):
    emitAccumulator -= 1.0
    emitSingle()
```

## Biome Transition

1. ParallaxManager crossfades between biome layer sets
2. AudioManager crossfades between biome music tracks
3. AmbientEffect resets emission accumulator
4. Speed smoothly interpolates between biome scroll speeds

## Palette Cycling Shader

`PaletteCyclingShader` provides dynamic color animation:

- Vertex shader: standard position/color/UV pass-through
- Fragment shader: uses texture red channel as palette index, applies time-based offset for cycling, samples 1D palette LUT
- Uniforms: `u_texture`, `u_palette`, `u_time`
- Can be attached to any `ParallaxLayer` via `setShader()`
