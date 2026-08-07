---
name: Player Ship
description: Ship physics, shields, invincibility, animation, and input handling
type: entity
updated_at: 2026-08-07
last_commit: 68f5446a55b8d17afc76fe48b10d6a6b27edc5e6
language: en
---

# Player Ship

## Physics

Acceleration-based movement with inertia:

| Parameter | Value |
|-----------|-------|
| `MAX_SPEED` | 120 px/s |
| `ACCEL_RATE` | 800 px/s² |
| `INERTIA` | 0.9 (velocity multiplier per frame) |
| Hitbox | 16×16 pixels |

### Movement Formula

```
velocity += direction * ACCEL_RATE * delta
velocity = clamp(velocity, -MAX_SPEED, MAX_SPEED)
velocity *= pow(INERTIA, delta)  // damping
position += velocity * delta
```

### Speed Boost

- Duration: 10 seconds
- Effect: 1.5× MAX_SPEED (180 px/s)
- Visual indicator in HUD bottom-right

## Shield

- Max shield HP: 5
- Absorbs incoming bullet damage before lives are consumed
- Hexagonal shield visual with pulse animation
- Shield meter displayed in HUD bottom-center

## Invincibility

- Duration: 1.5 seconds after taking a hit that depletes shield
- Ship blinks during invincibility
- No collision damage taken during this period

## Animation

- 4-directional facing: UP, DOWN, LEFT, RIGHT (based on movement direction)
- Animated engine flames: 4 frames at 8 FPS
- Shield hexagonal overlay with pulse effect

## Rendering

- Currently renders as colored rectangles on `WhiteTexture`
- Placeholder rendering until sprite textures are available
- Engine flame animation offset behind ship based on facing direction

## Input

Input comes from two sources:

1. **Keyboard**: Arrow keys/WASD → `InputDirection.fromInput()`
2. **AI Pilot**: Steering behavior chain → `InputDirection`
3. **Replay**: `InputFrame` → `InputDirection.fromCode()`

All three paths produce the same `InputDirection` enum, ensuring identical handling.
