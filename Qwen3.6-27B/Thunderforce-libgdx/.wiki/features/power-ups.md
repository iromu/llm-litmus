---
name: Power-Ups
description: Collectible items that drop from defeated enemies: weapon cycle, shield restore, speed boost
type: feature
updated_at: 2026-08-07
last_commit: 68f5446a55b8d17afc76fe48b10d6a6b27edc5e6
language: en
---

# Power-Ups

## Overview

Power-up items that drop from defeated enemies and can be collected by the player. Implemented in `PowerUp` class within `gameplay.weapon` package.

## Types

| Type | Color | Effect |
|------|-------|--------|
| **WEAPON_CYCLE** | Yellow (1, 1, 0) | Cycle player to next weapon type |
| **SHIELD** | Cyan (0, 0.6, 1) | Restore shield HP (adds up to max 5) |
| **SPEED_BOOST** | Orange (1, 0.5, 0) | 1.5× movement speed for 10 seconds |

## Properties

| Property | Value | Description |
|----------|-------|-------------|
| `WIDTH` | 12 px | Hitbox width |
| `HEIGHT` | 12 px | Hitbox height |
| `fallSpeed` | 30 px/s | Downward drift speed |
| `blinkTimer` | 0.15s interval | Blink animation period |
| `collected` | boolean | True after collection or off-screen |

## Lifecycle

1. **Spawn**: Created at enemy death position when `dropsPowerUp` flag is true (15% chance per enemy)
2. **Fall**: Drifts downward at 30 px/s
3. **Blink**: Toggles visibility every 0.15s for collectibility cue
4. **Collection**: AABB overlap check against player hitbox via `checkCollision()`
5. **Death**: Marked `collected = true` when y < -20 (fallen off screen)

## Rendering

- Rendered as colored 12×12 squares using `WhiteTexture` with color tint
- Blink effect: visible for 0.15s, hidden for 0.15s
- Skipped when `collected` is true

```java
boolean visible = (int) (blinkTimer / 0.15f) % 2 == 0;
batch.setColor(color);
batch.draw(WHITE, x - HALF_W, y - HALF_H, WIDTH, HEIGHT);
```

## Collision Detection

```java
Rectangle pb = getBounds();  // 12x12 centered on (x, y)
return Intersector.overlaps(pb, playerBounds);
```

Power-ups use libGDX `Intersector.overlaps()` for AABB collision against the player's hitbox rectangle.

## HUD Integration

- **Shield**: Displayed as `SHIELD: ███░░` (block characters) in HUD bottom-center when shield HP > 0
- **Speed Boost**: Displayed as `SPEED!` with countdown timer in HUD bottom-right while active
- **Weapon Cycle**: Active weapon shown as `WPN:TYPE` with `PWR:level` in HUD bottom-left
