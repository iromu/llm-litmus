---
name: Projectiles
description: Player projectile types, homing steering, builder pattern, and color coding
type: entity
updated_at: 2026-08-07
last_commit: 68f5446a55b8d17afc76fe48b10d6a6b27edc5e6
language: en
---

# Projectiles

## Overview

`Projectile` is the base class for all player-fired projectiles. Implements `SpatialEntity` (type code 3) for collision detection with enemies.

## Properties

| Property | Default | Description |
|----------|---------|-------------|
| `x`, `y` | Constructor | Current position |
| `velocity` | Constructor | Movement vector |
| `lifetime` | 0 | Elapsed time since spawn |
| `maxLifetime` | 3.0s | Time before auto-death |
| `collisionRadius` | 3px | Collision circle radius |
| `damage` | 1 | Damage per hit |
| `alive` | true | Active flag |
| `penetrating` | false | If true, doesn't die on first hit |
| `projectileType` | Constructor | PLASMA, HOMING, LASER, LIGHTNING |

## Homing Steering

Homing projectiles steer toward their target each frame:

```java
if (type == HOMING && !isEnemy) {
    Vector2 desired = normalize(target - position);
    float t = min(1.0, turnRate * delta);
    velocity = lerp(velocity, desired, t);
    velocity = normalize(velocity);
}
```

- `turnRate`: Maximum steering change per second (default 3.0)
- `targetX`, `targetY`: Target position set by the weapon

## Death Conditions

1. **Lifetime expired**: `lifetime >= maxLifetime`
2. **Out of bounds**: `x < -32 || x > 352 || y < -32 || y > 256`
3. **Enemy collision**: `alive = false` on hit (unless `penetrating`)

## Builder Pattern

Projectiles use a fluent builder for configuration:

```java
Projectile p = new Projectile(x, y, vx, vy, ProjectileType.PLASMA)
    .setMaxLifetime(2.0f)
    .setCollisionRadius(4f)
    .setPenetrating(true)
    .setTarget(tx, ty)
    .setTurnRate(2.5f);
```

## Color Coding

| Type | Player Color | RGB |
|------|-------------|-----|
| PLASMA | Cyan | (0, 0.7, 1) |
| HOMING | Green | (0, 1, 0.5) |
| LASER | Light blue | (0.3, 0.8, 1) |
| LIGHTNING | Pale blue | (0.8, 0.9, 1) |

## Rendering

Rendered as colored squares centered on position, sized to `collisionRadius * 2`. Uses `WhiteTexture` with batch color tint.
