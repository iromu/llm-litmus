---
name: Object Pooling
description: FixedPool pre-allocates all instances at construction for zero-GC gameplay
type: concept
updated_at: 2026-08-07
last_commit: 68f5446a55b8d17afc76fe48b10d6a6b27edc5e6
language: en
---

# Object Pooling

## FixedPool

`FixedPool<T>` is a fixed-size object pool that pre-allocates all instances at construction time. This guarantees zero allocation during gameplay.

### Design

- **Pre-allocation**: All `capacity` instances created at construction via a `Factory<T>`
- **Free list**: Array of available instances, popped from the end for O(1) obtain
- **Overflow**: If pool is exhausted, creates a new overflow object (with warning log)
- **No growth**: Pool never grows beyond initial capacity

### API

```java
// Construction
FixedPool<Particle> pool = new FixedPool<>(1000, () -> new Particle());

// Obtain an instance
Particle p = pool.obtain();

// Return to pool
pool.free(p);
```

### Behavior

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| `obtain()` | O(1) | Removes from end of freeList |
| `free()` | O(1) | Adds to end of freeList |
| Overflow creation | O(1) | Logs warning, creates new instance |

### Usage in the Codebase

| Pooled Type | Capacity (HIGH tier) | Purpose |
|-------------|---------------------|---------|
| `Particle` | 1000 | Explosion sparks, debris, smoke, shockwaves, glow, ambient |
| `Projectile` | Quality-tier dependent | Player bullets |
| `Bullet` | Quality-tier dependent | Enemy bullets |

### GC Safety

- All pooled objects allocated once at startup
- `obtain()`/`free()` only manipulate array indices, no allocation
- Overflow only triggers if capacity is underestimated (should not happen in normal gameplay)
- Particle system enforces active count cap before calling `obtain()`

## Particle System Pooling

`ParticleSystem` wraps a `FixedPool<Particle>` and enforces quality-tier caps:

```java
// Check capacity before emitting
if (activeCount >= maxActive) {
    return; // Silently drop particle
}
Particle p = pool.obtain();
// ... configure ...
activeArray.add(p);
```

On update, expired particles are returned to the pool:

```java
for (int i = activeArray.size - 1; i >= 0; i--) {
    Particle p = activeArray.get(i);
    p.update(delta);
    if (!p.isAlive()) {
        activeArray.removeIndex(i);
        pool.free(p);
    }
}
```
