---
name: Weapons
description: Four weapon types with power levels, projectile behavior, and adaptive fire rates
type: feature
updated_at: 2026-08-07
last_commit: 68f5446a55b8d17afc76fe48b10d6a6b27edc5e6
language: en
---

# Weapons

## Weapon Types

Four weapons, each with 3 power levels:

| Weapon | Fire Rate | Damage | Speed | Special |
|--------|-----------|--------|-------|---------|
| **Plasma Stream** | L1: 0.1s → L3: 0.06s | 1→3 | 400 px/s | L1: single, L2: double spread, L3: triple spread |
| **Homing Drone** | L1: 0.3s → L3: 0.2s | 2→4 | 200 px/s | Steering toward nearest enemy, turn rate 3.0 |
| **Laser Spread** | L1: 0.2s → L3: 0.12s | 1→3 | 350 px/s | L1: 3 beams ±15°, L2: 4 beams ±20/7°, L3: 5 beams ±25/12/0° |
| **Lightning Beam** | All: 0.15s | 1→3 | 500 px/s | Penetrating (ignores first hit), L3: dual spread |

## Architecture

```
Weapon (abstract)
├── initStats()     — abstract, set fireRate/damage per level
├── createProjectile() — abstract, return configured Projectile
├── fire()          — overridable, template method
└── nearestEnemy()  — helper for homing targeting

PlasmaStream    — Straight fast-firing
HomingDrone     — Slow seeking
LaserSpread     — Fan of angled beams
LightningBeam   — Fast penetrating
```

## Projectile

Base class for all player projectiles. Implements `SpatialEntity` (type=3) for collision detection.

| Property | Default |
|----------|---------|
| `collisionRadius` | 3 px |
| `maxLifetime` | 3 s |
| `penetrating` | false (Lightning only) |
| Out-of-bounds death | x < -32, x > 352, y < -32, y > 256 |

### Homing Steering

Homing drones steer toward their target each frame:

```
desired = normalize(target - position)
t = min(1, turnRate * delta)
velocity = lerp(velocity, desired, t)
velocity = normalize(velocity)
```

### Color Coding

| Type | Player Color |
|------|-------------|
| PLASMA | Cyan (0, 0.7, 1) |
| HOMING | Green (0, 1, 0.5) |
| LASER | Light blue (0.3, 0.8, 1) |
| LIGHTNING | Pale blue (0.8, 0.9, 1) |

## Power Level Progression

- Start at power level 1
- WEAPON_CYCLE power-up cycles to next weapon type
- Power levels increase through gameplay (weapon power-ups)

## Adaptive Fire Rate

AIPilot modulates fire rate based on context:

| Context | Fire Rate Modifier |
|---------|-------------------|
| Combat (enemies nearby) | 85% |
| Dodge (bullets nearby) | 20% |
| Calm (no threats) | 10% |
