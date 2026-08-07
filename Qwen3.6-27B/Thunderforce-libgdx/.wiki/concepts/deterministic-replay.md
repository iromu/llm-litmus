---
name: Deterministic Replay
description: Seeded RandomXS128 PRNG and frame-level input recording for reproducible attract mode
type: concept
updated_at: 2026-08-07
last_commit: 68f5446a55b8d17afc76fe48b10d6a6b27edc5e6
language: en
---

# Deterministic Replay

## SeededRng

`SeededRng` wraps libGDX's `RandomXS128` PRNG. Same seed always produces the same sequence of random numbers.

### API

```java
SeededRng rng = new SeededRng(seed);
float f = rng.nextFloat();    // [0.0, 1.0)
int i = rng.nextInt(min, max); // [min, max)
long l = rng.nextLong();
boolean b = rng.nextBoolean();
double g = rng.nextGaussian();
```

### Use Cases

- Enemy spawn randomization
- Bullet pattern variation
- Particle emission angles and speeds
- Power-up drop randomness
- AI decision variance

## InputReplay

Records and replays frame-level input sequences for attract mode determinism.

### Recording

Each frame, the AI pilot's output is recorded as an `InputFrame`:

```java
class InputFrame {
    int direction;    // 0-8 (NONE..DOWN_RIGHT)
    boolean fire;
    boolean switchWeapon;
}
```

Frames are packed into single bytes for compact storage:
- Direction: 4 bits (values 0-8 fit in 4 bits)
- Fire: 1 bit
- Switch weapon: 1 bit
- Total: 6 bits per frame, packed into bytes

### Replay

```java
InputReplay replay = new InputReplay(maxFrames);

// Recording mode
replay.startRecording();
replay.record(frame);
byte[] data = replay.serialize();

// Replay mode
InputReplay replay2 = InputReplay.deserialize(data);
InputFrame f = replay2.getNextFrame();
```

### Capacity

- Default capacity: ~10,800 frames (3 minutes at 60 FPS)
- Compact binary serialization for minimal memory footprint

## Deterministic Gameplay

The combination of seeded RNG and input replay ensures:

1. **Same seed → Same random sequences** (enemy behavior, bullet patterns, particles)
2. **Same input → Same player movement** (AI pilot produces identical steering)
3. **Same state → Same outcome** (fixed timestep, no floating-point drift)

This makes the attract mode fully reproducible — every playthrough looks identical, which is essential for a polished demo presentation.

## Attract Mode Flow

```
Title Screen → (Space/Enter/touch or 8s auto) → GameScreen
  → AI-controlled gameplay with seeded RNG
  → ~3 minutes of gameplay (4 biomes, 3 bosses)
  → Game Over → High Score → Title Screen (loop)
```

During replay mode, `InputReplay` feeds pre-recorded frames to the player ship, and `SeededRng` ensures all random elements follow the same path.
