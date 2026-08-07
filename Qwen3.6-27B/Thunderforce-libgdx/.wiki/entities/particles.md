---
name: Particles
description: Particle system with type-sorted rendering, explosion factory, and screen shake
type: entity
updated_at: 2026-08-07
last_commit: 68f5446a55b8d17afc76fe48b10d6a6b27edc5e6
language: en
---

# Particles

## Particle System

`ParticleSystem` manages all visual particle effects with FixedPool recycling and quality-tier caps.

### Particle Types

| Type | Behavior | Visual |
|------|----------|--------|
| **SPARK** | Outward emission with gravity (-120 px/s²), rapid fade | Small, fast, bright |
| **DEBRIS** | Larger fragments, slower fall (-60 px/s²), drag (0.98×), rotation | Medium, tumbling |
| **SMOKE** | Expanding, fading, upward drift (+30 px/s²), drag (0.96×) | Large, transparent, growing |
| **GLOW** | Pulsing alpha (6 Hz sine), stays near origin | Medium, pulsing |
| **SHOCKWAVE** | Expanding ring from center, fast fade | Large, fast expansion |
| **AMBIENT** | Slow drift with sine-wave meandering, long lifetime | Small, subtle |

### Update Per Type

- **SPARK**: `a = initialAlpha * lifeRatio`, `size = initialSize * max(0.2, lifeRatio)`
- **DEBRIS**: `a = initialAlpha * max(0, lifeRatio - 0.1)`, `size = initialSize * (0.6 + 0.4 * lifeRatio)`
- **SMOKE**: `a = initialAlpha * lifeRatio²`, `size = initialSize * (1 + (1 - lifeRatio) * 2)`
- **GLOW**: `pulse = 0.5 + 0.5 * sin(phase)`, `a = initialAlpha * lifeRatio * (0.4 + 0.6 * pulse)`
- **SHOCKWAVE**: `size = initialSize * (1 + (1 - lifeRatio) * 150 * maxLifetime)`, `a = initialAlpha * lifeRatio²`
- **AMBIENT**: Sine drift on X, `a = initialAlpha * bell-curve(lifeRatio)`

### Render Order

Shockwaves → Smoke → Everything else (ensures large transparent effects render first)

### GC Avoidance

- Pre-allocated random angle buckets (64 buckets) to avoid `Math.random()` allocation
- Reusable `TextureRegion` for rotated particle draws
- Direct texture draw for non-rotated types (no region allocation)

## ExplosionEffect Factory

Five predefined explosion sizes:

| Size | Sparks | Debris | Smoke | Shockwaves | Duration | Screen Shake |
|------|--------|--------|-------|------------|----------|-------------|
| TINY | 5 | 0 | 0 | 0 | ~0.2s | None |
| SMALL | 10 | 3 | 0 | 0 | ~0.4s | 1.5px / 0.15s |
| MEDIUM | 20 | 8 | 5 | 0 | ~0.6s | 3px / 0.3s |
| LARGE | 30 | 15 | 10 | 1 | ~0.8s | 5px / 0.5s |
| MASSIVE | 50 | 25 | 20 | 2 | ~1.2s | 8px / 0.8s |

### Usage

```java
ExplosionEffect.create(ExplosionSize.MEDIUM, x, y, particleSystem);
float intensity = ExplosionEffect.getScreenShakeIntensity(ExplosionSize.MEDIUM);
float duration = ExplosionEffect.getScreenShakeDuration(ExplosionSize.MEDIUM);
screenShake.trigger(intensity, duration, 20f);
```

## ScreenShake

Damped sine wave screen shake with random phase offsets:

### Algorithm

```
decay = (1 - elapsed/duration)²  // ease-out curve
currentIntensity = intensity * decay

// Primary wave
waveX = sin(elapsed * freq * 2π + phaseX)
waveY = sin(elapsed * freq * 2π + phaseY)

// Secondary wave (irregularity, 0.4× weight)
waveX2 = sin(elapsed * freqSecondary * 2π + phaseX2)
waveY2 = sin(elapsed * freqSecondary * 2π + phaseY2)

offsetX = (waveX + waveX2 * 0.4) * currentIntensity
offsetY = (waveY + waveY2 * 0.4) * currentIntensity
```

- `frequencySecondary`: Random 1.3× to 2.1× of base frequency
- Phases randomized on each `trigger()` call
- Two overlapping sine waves prevent repetitive patterns

## AmbientEffect

Biome-specific ambient particles with controlled emission rates:

| Biome | Type | Rate | Spawn | Drift |
|-------|------|------|-------|-------|
| Volcanic | ASH | 3/s | Top edge | Downward |
| City | NEON_SPARK | 2/s | Bottom edge | Upward |
| Asteroid | DEBRIS | 1.5/s | Side edges | Inward |
| Alien | SPORE | 2.5/s | Bottom quarter | Bobbing |

Uses accumulator pattern to avoid per-frame allocation.
