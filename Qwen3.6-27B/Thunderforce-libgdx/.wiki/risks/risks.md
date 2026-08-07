---
name: Risks and Known Issues
description: Performance risks, GC pressure points, floating-point determinism, and platform considerations
type: risk
updated_at: 2026-08-07
last_commit: 68f5446a55b8d17afc76fe48b10d6a6b27edc5e6
language: en
---

# Risks and Known Issues

## Performance Risks

### GC Pressure Points

| Source | Risk Level | Mitigation |
|--------|-----------|------------|
| Particle allocation | Low | FixedPool pre-allocation, active count cap |
| Bullet allocation | Medium | Lifetime-based cleanup, quality-tier cap |
| String interpolation | Low | Minimal string operations in hot path |
| Array resizing | Low | Pre-sized arrays with known capacity |
| Vector2 allocation in homing | Medium | `Projectile.update()` creates new Vector2 each frame for homing steering |

### Frame Budget

At 60 FPS, each frame has ~16.67ms:

| System | Estimated Budget | Notes |
|--------|-----------------|-------|
| Physics (player + enemies) | 2ms | Simple acceleration, no rigid body |
| Collision detection | 3ms | Spatial hash O(1) broad-phase |
| Particle update | 2ms | Quality-tier capped |
| Rendering | 5ms | FrameBuffer + integer scale |
| AI steering | 1ms | Priority chain, no pathfinding |
| Remaining headroom | ~3.67ms | Buffer for spikes |

## Platform Considerations

### Desktop (Primary Target)

- LWJGL3 backend, full OpenGL support
- GPU probe detects desktop vs mobile GPU
- No known issues

### Mobile (Not Primary Target)

- QualityTier.LOW automatically selected for mobile GPUs
- Reduced particle count, fewer parallax layers, lower bullet cap
- Palette cycling shader disabled on LOW tier

## Architecture Risks

### Floating-Point Determinism

- Fixed timestep reduces but doesn't eliminate floating-point drift
- Different CPU architectures may produce slightly different results
- Impact: Attract mode replay may diverge on different hardware over long runs

### Memory Leaks

- `WhiteTexture` is a static singleton — disposed explicitly at shutdown
- `FadeOverlay.FADE_TEXTURE` is static — not disposed in `FadeOverlay.dispose()`
- AssetManager disposal is the single point of cleanup

### Single-Threaded

- All game logic runs on the GL thread
- AssetManager uses background threads for loading only
- No parallelism during gameplay

## Known Limitations

### Placeholder Rendering

- All entities currently render as colored rectangles on `WhiteTexture`
- Sprite textures defined in AssetLoader but not yet used in render methods
- Visual quality is functional but not final

### Enemy Spawning

- Current implementation uses simple timer-based spawning in GameScreen
- EncounterScript exists but may not be fully integrated
- Boss spawning is timer-based, not encounter-driven

### Input Replay

- `InputReplay` capacity is ~3 minutes (10,800 frames)
- Longer demos require larger buffer or streaming

### Audio

- Music crossfade works but boss layering may cause volume imbalance
- SFX playback is fire-and-forget (no limit on concurrent sounds)

## Testing Coverage

| Area | Coverage | Notes |
|------|----------|-------|
| AI Pilot | Unit tests | Steering behavior validation |
| Player Ship | Unit tests | Direction, shield, invincibility |
| Collision | Integration | Spatial hash + AABB |
| Rendering | Manual | Visual verification only |
| Audio | Manual | Crossfade, ducking |
| Replay | Manual | Determinism verification |
