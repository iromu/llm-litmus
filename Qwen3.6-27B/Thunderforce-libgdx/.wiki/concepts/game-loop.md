---
name: Game Loop
description: Fixed timestep accumulator at 60 FPS with separate update and render phases
type: concept
updated_at: 2026-08-07
last_commit: 68f5446a55b8d17afc76fe48b10d6a6b27edc5e6
language: en
---

# Game Loop

## Fixed Timestep Accumulator

`ThunderforceGame` extends `Game` and implements a fixed-timestep loop with accumulator pattern:

```java
private static final float FIXED_DELTA = 1f / 60f;  // ~16.67ms
private float accumulator = 0f;

@Override
public void render() {
    float delta = Gdx.graphics.getDeltaTime();
    accumulator += delta;

    while (accumulator >= FIXED_DELTA) {
        update(FIXED_DELTA);
        accumulator -= FIXED_DELTA;
    }

    renderFrame();
}
```

### Key Properties

- **Fixed delta**: Always 1/60s regardless of actual frame time
- **Accumulator**: Carries over excess time from fast frames
- **Multiple updates**: If a frame is slow, multiple updates may run in one render pass
- **Deterministic**: Same sequence of inputs always produces same game state

## GameScreen Interface

`ThunderforceGame` defines a custom `GameScreen` interface with separate update and render phases:

```java
interface GameScreen {
    void update(float delta);  // Logic: physics, AI, collision, spawning
    void render(SpriteBatch batch);  // Drawing only, no logic
}
```

This separation ensures:
- Logic runs at fixed 60 FPS regardless of render framerate
- Rendering can be frame-rate independent
- Update and render are cleanly decoupled

## Per-Frame Operations

Each fixed timestep frame executes:

1. **Input processing** — Keyboard → `InputDirection`, or replay frame
2. **AIPilot** — Steering behavior chain produces movement intent
3. **PlayerShip** — Acceleration-based physics, invincibility timer, speed boost
4. **Weapon** — Fire timer countdown, projectile spawning
5. **Projectile update** — Position, lifetime, homing steering, out-of-bounds death
6. **Enemy update** — Behavior-driven movement, attack timers, soft boundary clamping
7. **Bullet update** — Position, lifetime, homing steering, out-of-bounds death
8. **Collision detection** — Spatial hash broad-phase + AABB narrow-phase
9. **Power-up update** — Fall position, blink, collection check
10. **Particle system** — Update all active particles, remove expired
11. **Parallax** — Scroll offset update per layer
12. **Screen shake** — Damped sine wave decay
13. **Biome timer** — 30-second transition countdown
14. **Encounter script** — Wave activation and enemy spawning
