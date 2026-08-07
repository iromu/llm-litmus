---
name: Bullets
description: Enemy bullet types, laser warnings, area denial zones, and pattern factory
type: entity
updated_at: 2026-08-07
last_commit: 68f5446a55b8d17afc76fe48b10d6a6b27edc5e6
language: en
---

# Bullets

## Overview

Enemy bullets come in several types, each with distinct visual and behavioral characteristics. The `Bullet` base class handles common properties like position, velocity, lifetime, and homing steering.

## Bullet Types

| Type | Description | Visual |
|------|-------------|--------|
| **SPIRAL** | Rotating pattern bullets | Colored circle |
| **SWEEP** | Fan/sweep arc bullets | Colored circle |
| **AIMED** | Targeted at player position | Colored circle |
| **HOMING** | Tracks player with steering | Larger circle, turn rate |
| **LASER** | Line-based beam with warning | Dashed warning → solid beam |
| **AREA_DENIAL** | Persistent damage zone | Expanding/fading circle |

## Bullet Base Class

| Property | Default | Description |
|----------|---------|-------------|
| `collisionRadius` | 3px | Collision circle |
| `maxLifetime` | Type-dependent | Auto-death timer |
| `homing` | false | If true, steers toward target |
| `turnRate` | 3.0 | Maximum steering change/s |

### Homing Steering

Same algorithm as player homing projectiles:

```
desired = normalize(target - position)
t = min(1, turnRate * delta)
velocity = lerp(velocity, desired, t)
velocity = normalize(velocity)
```

## LaserWarning

`LaserWarning` implements a two-phase laser attack:

### Phase 1: WARNING (500ms)

- Dashed line from origin to target
- Red pulsing animation (12 Hz pulse)
- No damage during warning

### Phase 2: FIRING (configurable duration)

- Solid red beam with white core
- 8px beam width
- Damage via perpendicular distance check

### Collision Detection

```java
// Point-to-line-segment distance
t = clamp(dot(point - start, end - start) / lenSq, 0, 1)
closest = start + t * (end - start)
distance = length(point - closest)
hit = distance < tolerance
```

Rectangle collision checks all 4 corners plus center point.

## AreaDenial

Persistent zone that damages the player on overlap:

| Property | Value |
|----------|-------|
| Damage interval | 0.25s |
| Fade in | 0.3s |
| Fade out | 0.3s |
| Collision | Circle-player overlap |

### Lifecycle

1. Spawn at center position with target radius
2. Fade in over 0.3s (radius expands from 0 to target)
3. Active damage phase (ticks damage every 0.25s on overlap)
4. Fade out over final 0.3s (radius contracts)
5. Die when `lifetime >= maxLifetime`

## BulletPattern Factory

Static factory methods for generating common patterns:

| Method | Output | Parameters |
|--------|--------|------------|
| `createSpiral()` | Array of SPIRAL bullets | origin, count, speed, rotationSpeed, spreadAngle |
| `createSweep()` | Array of SWEEP bullets | origin, count, speed, startAngle, endAngle |
| `createAimedSpread()` | Array of AIMED bullets | origin, target, count, speed, spreadAngle |
| `createHoming()` | Single HOMING bullet | origin, target, speed, turnRate |
| `createLaserWarning()` | LaserWarning | start, end, duration |
| `createAreaDenial()` | AreaDenial | center, radius, damage, lifetime |

All angles in degrees, 0 = right, increasing clockwise (screen coordinates).
