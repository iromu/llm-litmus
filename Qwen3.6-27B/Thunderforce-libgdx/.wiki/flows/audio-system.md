---
name: Audio System
description: Music crossfade, boss layering, SFX playback, and volume ducking
type: flow
updated_at: 2026-08-07
last_commit: 68f5446a55b8d17afc76fe48b10d6a6b27edc5e6
language: en
---

# Audio System

## AudioManager

Manages music streaming (OGG) and sound effects (WAV) with dynamic crossfade, boss layering, and audio ducking.

## Volume Control

| Channel | Default | Control |
|---------|---------|---------|
| Master | 1.0 | `setMasterVolume()` |
| Music | 0.8 | `setMusicVolume()` |
| SFX | 1.0 | `setSfxVolume()` |
| Ducking | 0.0 | `setDucking()` (0 = none, 0.3 = -30%) |

Effective volume: `musicVolume * masterVolume * (1 - duckAmount)`

## Music

### Biome Music

- 4 biome tracks: volcanic, city, asteroid, alien
- Dynamic crossfade when switching biomes
- Crossfade duration: 1.0 second
- Previous track fades out while new track fades in

```java
audioManager.playBiomeMusic(music);  // Auto-crossfades from current
```

### Boss Music

- 3 boss tracks: boss1, boss2, boss3
- Layered over biome music
- Boss music at 70% of biome volume
- Biome music ducked by -30% during boss fight

```java
audioManager.playBossMusic(bossTrack);  // Layers over biome, ducks biome
audioManager.stopBossMusic();           // Stops boss, restores biome volume
```

### Crossfade Algorithm

```
crossfadeProgress += delta / duration
fadeOut = max(0, 1 - progress)
fadeIn = min(1, progress)
from.setVolume(fadeOut * musicVolume * masterVolume)
to.setVolume(fadeIn * musicVolume * masterVolume)

if (progress >= 1.0):
    from.stop()
    crossfading = false
```

## Sound Effects

SFX are registered by name and played on demand:

```java
audioManager.registerSfx("shoot_plasma", sound);
audioManager.playSfx("shoot_plasma");
```

### SFX Inventory

| Name | Trigger |
|------|---------|
| `shoot_plasma` | Plasma weapon fire |
| `shoot_homing` | Homing weapon fire |
| `shoot_laser` | Laser weapon fire |
| `shoot_lightning` | Lightning weapon fire |
| `explosion_small` | Small/medium enemy death |
| `explosion_large` | Large enemy/boss section death |
| `powerup` | Power-up collection |
| `hit` | Player hit |
| `engine` | Engine hum (continuous) |
| `laser_warn` | Laser warning indicator |

## Lifecycle

- `update(delta)` — Must be called each frame to advance crossfade progress
- `stopAll()` — Stops all music and SFX
- `dispose()` — Stops all audio and disposes Sound handles
