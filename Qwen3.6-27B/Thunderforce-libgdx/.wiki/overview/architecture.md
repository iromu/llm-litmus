---
name: Architecture
description: Maven module layout, package structure, component responsibilities, and design patterns
type: overview
updated_at: 2026-08-07
last_commit: 68f5446a55b8d17afc76fe48b10d6a6b27edc5e6
language: en
---

# Architecture

Thunderforce-libgdx is a Maven multi-module project with two modules: `core` (shared game logic) and `desktop` (LWJGL3 launcher).

## Module Structure

```
Thunderforce-libgdx/
├── core/                          # Shared game code
│   ├── src/main/java/com/thunderforce/
│   │   ├── audio/                 # AudioManager
│   │   ├── config/                # GameConfig, QualityTier
│   │   ├── engine/                # ThunderforceGame, AssetLoader, GPUProbe, FixedPool, ScreenManager
│   │   ├── gameplay/
│   │   │   ├── boss/              # Boss, BossSection, BossData, MathUtils
│   │   │   │   ├── MagmaMaw       # Boss 1: volcanic mining machine
│   │   │   │   ├── OrbitalJudge   # Boss 2: transforming battleship
│   │   │   │   └── XenoGuardian   # Boss 3: biomechanical guardian
│   │   │   ├── bullet/            # Bullet, CollisionDetector, GridSpatialHash, BulletPattern,
│   │   │   │                      # SpatialEntity, WhiteTexture, LaserWarning, AreaDenial
│   │   │   ├── encounter/         # EncounterScript, EncounterData
│   │   │   ├── enemy/             # Enemy, EnemyBehavior, EnemyData, EnemyDefinitions
│   │   │   ├── player/            # PlayerShip, AIPilot, InputDirection
│   │   │   └── weapon/            # Weapon, PlasmaStream, HomingDrone, LaserSpread,
│   │   │                          # LightningBeam, Projectile, PowerUp
│   │   ├── parallax/              # ParallaxManager, ParallaxLayer, PaletteCyclingShader
│   │   ├── particle/              # Particle, ParticleSystem, ExplosionEffect,
│   │   │                          # ScreenShake, AmbientEffect
│   │   ├── presentation/
│   │   │   ├── hud/               # HUD
│   │   │   └── screen/            # TitleScreen, GameScreen, GameOverScreen, HighScoreScreen
│   │   ├── rendering/             # RenderPipeline
│   │   └── replay/                # SeededRng, InputReplay, InputFrame
│   ├── src/main/resources/
│   │   ├── audio/                 # Music (OGG) and SFX (WAV)
│   │   ├── data/                  # JSON: enemies, encounters, bosses
│   │   ├── fonts/                 # Bitmap fonts (.fnt)
│   │   └── textures/              # Player, weapons, power-ups, explosions, particles, UI, biomes
│   └── src/test/java/             # Unit tests
└── desktop/                       # LWJGL3 desktop launcher
    └── src/main/java/com/thunderforce/desktop/
        └── DesktopLauncher.java
```

## Package Responsibilities

| Package | Responsibility |
|---------|---------------|
| `engine` | Entry point, fixed-timestep loop, asset loading, GPU probe, object pooling, screen transitions |
| `config` | Runtime configuration, quality tier enum |
| `gameplay.player` | Player ship physics, AI pilot steering, input direction mapping |
| `gameplay.weapon` | Weapon base class, 4 weapon implementations, projectiles, power-ups |
| `gameplay.enemy` | Enemy base class, behavior patterns, JSON-driven definitions |
| `gameplay.bullet` | Enemy bullets, collision detection, spatial hashing, bullet patterns |
| `gameplay.boss` | Boss base class, 3 boss implementations, destructible sections |
| `gameplay.encounter` | JSON-based encounter scripting, wave management |
| `presentation.screen` | Title, Game, Game Over, High Score screens |
| `presentation.hud` | HUD overlay with score, lives, weapons, shield, speed boost |
| `rendering` | FrameBuffer rendering, integer scaling, viewport management |
| `parallax` | Multi-layer parallax scrolling, biome transitions, palette cycling shader |
| `particle` | Particle system, explosion factory, screen shake, ambient effects |
| `audio` | Music streaming, SFX, crossfade, boss layering, ducking |
| `replay` | Seeded PRNG, input recording/replay, frame serialization |

## Key Design Patterns

- **Template Method**: `Weapon` base class with abstract `initStats()` and `createProjectile()`, concrete subclasses for each weapon type
- **Strategy**: `EnemyBehavior` static methods for each movement pattern (zigzag, patrol, ambush, chase, retreat, formationFly)
- **Factory**: `ExplosionEffect.create()` and `BulletPattern` static methods for generating effects
- **Object Pool**: `FixedPool` pre-allocates all instances at construction, zero runtime allocation
- **Spatial Hash**: `GridSpatialHash` for O(1) broad-phase collision detection
- **Command**: `BossSection.BossFireCommand` for boss sections to request bullet spawns
- **State Machine**: Boss phase transitions at HP thresholds

## Data Flow

```
ThunderforceGame (ApplicationListener)
  └── Fixed-timestep loop (1/60s)
        ├── GameScreen.update(delta)
        │     ├── AIPilot → InputDirection
        │     ├── PlayerShip.update()
        │     ├── Weapon.fire() → Projectile[]
        │     ├── Enemy.update() → Bullet[]
        │     ├── CollisionDetector → Collisions
        │     ├── ParticleSystem.update()
        │     ├── ParallaxManager.update()
        │     └── ScreenShake.update()
        └── GameScreen.render(batch)
              ├── RenderPipeline.begin() → FrameBuffer
              ├── ParallaxManager.render()
              ├── Enemy.render()
              ├── PlayerShip.render()
              ├── Projectile.render()
              ├── Bullet.render()
              ├── ParticleSystem.render()
              ├── HUD.render()
              └── RenderPipeline.end() → Integer-scaled to display
```
