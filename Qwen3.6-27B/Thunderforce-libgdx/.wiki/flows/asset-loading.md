---
name: Asset Loading
description: AssetManager-based centralized loading with progress tracking and async processing
type: flow
updated_at: 2026-08-07
last_commit: 68f5446a55b8d17afc76fe48b10d6a6b27edc5e6
language: en
---

# Asset Loading

## AssetLoader

Centralized asset loading via libGDX `AssetManager`. Defines all asset paths and provides typed accessors.

## Loading Process

```java
AssetLoader loader = new AssetLoader();
loader.registerAll();  // Queue all assets

// In loading screen:
loader.update();       // Process async loading
float progress = loader.getProgress();  // 0.0 to 1.0
boolean done = loader.isFinished();
```

## Asset Registry

### Textures (20+)

| Category | Paths |
|----------|-------|
| Player | `textures/player/ship.png`, `textures/player/explosion.png` |
| Weapons | `textures/weapons/{plasma,homing,laser,lightning}.png` |
| Power-ups | `textures/powerups/{weapon,shield,speed}.png` |
| Explosions | `textures/explosions/{tiny,small,medium,large,massive}.png` |
| Particles | `textures/particles/{spark,smoke,glow,shockwave}.png` |
| UI | `textures/ui/{hud,logo,weapons}.png` |
| Biomes | `textures/biomes/{volcanic,city,asteroid,alien}/layer{0-3}.png` (16 files) |

### Fonts (3)

- `fonts/main.fnt` — General UI text
- `fonts/score.fnt` — Score display
- `fonts/title.fnt` — Title screen

### Music (8 OGG)

- `audio/music/title.ogg` — Title screen
- `audio/music/{volcanic,city,asteroid,alien}.ogg` — Biome tracks
- `audio/music/boss{1,2,3}.ogg` — Boss tracks

### Sound Effects (10 WAV)

- `audio/sfx/shoot_{plasma,homing,laser,lightning}.wav`
- `audio/sfx/explosion_{small,large}.wav`
- `audio/sfx/{powerup,hit,engine,laser_warn}.wav`

### JSON Data (8)

| File | Type | Purpose |
|------|------|---------|
| `data/enemies/enemy_definitions.json` | `EnemyDefinitions` | 21 enemy type definitions |
| `data/encounters/volcanic.json` | `EncounterData` | Volcanic biome encounter waves |
| `data/encounters/city.json` | `EncounterData` | City biome encounter waves |
| `data/encounters/asteroid.json` | `EncounterData` | Asteroid biome encounter waves |
| `data/encounters/alien.json` | `EncounterData` | Alien biome encounter waves |
| `data/bosses/magma_maw.json` | `BossData` | Magma Maw configuration |
| `data/bosses/orbital_judge.json` | `BossData` | Orbital Judge configuration |
| `data/bosses/xeno_guardian.json` | `BossData` | Xeno Guardian configuration |

## Async Loading

`AssetManager` loads assets asynchronously on background threads. The `update(0)` call processes pending loads without blocking. Progress is available via `getProgress()`.

## Disposal

```java
loader.dispose();  // Disposes AssetManager and all loaded assets
```

All assets are owned by the AssetManager and disposed together. Individual asset accessors return references managed by the AssetManager.
