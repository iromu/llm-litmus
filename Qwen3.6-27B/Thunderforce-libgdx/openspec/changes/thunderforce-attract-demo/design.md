## Context

Greenfield libGDX project. No existing codebase. The target is a 16-bit aesthetic horizontal scrolling shoot-'em-up attract-mode demo. See proposal.md for motivation and scope.

The core technical challenge is balancing authentic 16-bit presentation (pixel-perfect, constrained aesthetic) with modern hardware diversity (phones to 4K ultrawide monitors) while maintaining 60 FPS with hundreds of concurrent sprites.

## Goals / Non-Goals

**Goals:**
- Stable 60 FPS on desktop (LWJGL3) target
- Authentic 16-bit pixel art presentation at 320×224 internal resolution
- Zero garbage collection pauses during gameplay via aggressive object pooling
- Deterministic replay for consistent attract-mode demo behavior
- Data-driven enemy and encounter design (no code changes to add new enemies)
- Modular architecture: each system independently testable and swappable

**Non-Goals:**
- Multiplayer or network play
- Save/load persistent player data (attract mode only)
- Procedural level generation (all content is hand-designed)
- Real-time strategy or player input during demo (AI-piloted only)
- Mobile or HTML5 deployment (desktop-only target)

## Decisions

### D1: Layered Adaptive Rendering Pipeline

**Decision**: Fixed 320×224 internal resolution, dynamic camera viewport from display aspect ratio, integer-scaled output with overscan crop, GPU-probed quality tiers.

**Why over alternatives:**
- *Fixed resolution + letterboxing*: Wastes screen real estate, breaks immersion on modern displays
- *Stretch to fill*: Distorts pixel art, destroys 16-bit aesthetic
- *Dynamic internal resolution*: Pixel art is designed at 320×224; rendering at higher res doesn't improve quality (nearest-neighbor = same look, bilinear = blur)
- *Layered approach*: Keeps the authentic pixel grid, adapts viewport for wider displays, fills screen via integer scaling + minimal crop, and scales quality based on GPU power

**Implementation**:
```
RenderPipeline:
  1. Render game to FrameBuffer at 320×224 (nearest-neighbor)
  2. Calculate scale factor: floor(min(windowWidth/320, windowHeight/224))
  3. Render FrameBuffer to screen as scaled quad (nearest-neighbor)
  4. If letterboxing > 20 pixels, enable overscan crop (scale up 2-3%)
```

### D2: Grid-Based Spatial Hash for Collision Detection

**Decision**: 16×16 pixel grid cells for O(1) average-case collision lookup.

**Why over alternatives:**
- *Quadtree*: Overkill for fixed 320×224 resolution; more complex, no adaptive benefit
- *Naive O(n²)*: Unacceptable with 500+ bullets and 20+ enemies
- *Grid hash*: Perfect fit for fixed, small resolution; simple to implement, predictable performance

**Implementation**: 20×14 grid (320/16 × 224/16). Each cell maintains a list of entities. Collision check only compares entities sharing a cell or adjacent cells.

### D3: Object Pooling for High-Churn Objects

**Decision**: Pre-allocate pools for bullets (1000), particles (1000), and enemies (50). Recycle on destroy.

**Why over alternatives:**
- *GC-reliant allocation*: Causes frame hiccups where GC is unpredictable
- *Manual arena allocator*: More complex, no benefit over libGDX's existing `Pool<T>`
- *Selective pooling*: Pool only high-churn objects; use normal allocation for low-churn (bosses, power-ups)

**Implementation**: Extend libGDX's `Pool<T>` with `FixedPool<T>` that pre-allocates all instances at construction time, guaranteeing zero allocation during gameplay.

### D4: gdx-ai for AI Pilot Steering Behaviors

**Decision**: Use gdx-ai's `Steerable`, `Flee`, `Seek`, `PrioritySteering` for AI pilot movement.

**Why over alternatives:**
- *Hand-rolled steering*: Reinventing well-tested behavior patterns
- *Behavior trees*: Overkill for a single AI pilot; steering behaviors are simpler and more reactive
- *Scripted paths*: Looks robotic and repetitive; steering behaviors create natural, reactive movement

**Implementation**:
```
AI Pilot layers (PrioritySteering):
  Priority 1 (highest): Flee from incoming bullets (detection radius 150px)
  Priority 2: Seek power-ups within collection range
  Priority 3: Arrive at strategic position (center-screen, clear of hazards)
  Priority 4 (lowest): Wander with slight randomness (prevents robotic stillness)
```

### D5: JSON-Driven Enemy and Encounter Definitions

**Decision**: All enemy types, behaviors, attack patterns, and encounter scripts defined in JSON files.

**Why over alternatives:**
- *Java enums/classes*: Requires recompilation for every balance change; couples data to code
- *XML*: Verbose, harder to read/write for designers
- *Binary format*: Not human-editable, defeats the purpose of data-driven design
- *JSON*: Human-readable, easy to version control, parseable with libGDX's `Json` class

**Implementation**: `enemy_definitions.json` (type registry), `encounter_scripts/` (per-biome encounter timelines), `boss_scripts/` (per-boss phase definitions).

### D6: Palette Cycling via Shader LUT

**Decision**: Custom fragment shader with animatable 256-entry color LUT for palette cycling effects.

**Why over alternatives:**
- *Pre-baked palette variants*: Requires N× texture memory, no smooth transitions
- *Pixmap manipulation per frame*: Too slow for 60 FPS at 320×224
- *Shader LUT*: Single texture upload, GPU-side remapping, smooth animation via time uniform

**Implementation**: Shader takes texture color as LUT index, samples animated LUT texture. LUT is updated each frame by shifting entries (e.g., red→orange→yellow for fire effects).

### D7: Fixed Timestep Game Loop

**Decision**: Fixed 1/60s update timestep, decoupled from render frame rate. Accumulate delta time, process fixed updates, render with interpolation factor.

**Why over alternatives:**
- *Variable timestep*: Non-deterministic, breaks replay system, inconsistent physics
- *Lock step (update = render)*: Drops frames → drops updates, visible stutter
- *Fixed timestep with accumulator*: Deterministic, smooth, replay-compatible

### D8: Audio Composition in Tracker, Export as WAV/OGG

**Decision**: Compose FM synth music in a tracker (Defleppard/MilkyTracker targeting Genesis YM2612), export as WAV (SFX) and OGG (music).

**Why over alternatives:**
- *Real-time FM synthesis in Java*: Complex, platform-dependent, no guarantee of authentic sound
- *MIDI playback*: Platform-dependent sound fonts, inconsistent across devices
- *Pre-rendered audio*: Guaranteed consistent sound, authentic FM character baked in, simple playback via libGDX

## Risks / Trade-offs

### R1: Pixel Art Quality and Volume
**Risk**: 350+ sprite frames and 12–16 tilesets is a massive art commitment. AI-generated pixel art may not achieve the "handcrafted" feel required for authentic 16-bit presentation.

**Mitigation**: Prioritize hand-crafted art for player ship, bosses, and key enemies. Use AI-assisted generation for background elements, particles, and secondary enemies. Establish a style guide early.

### R2: AI Pilot Feeling Scripted
**Risk**: The AI pilot may appear robotic (perfect dodges, no personality) or too random (dies frequently, looks incompetent).

**Mitigation**: Tune steering behavior weights iteratively. Add "personality" parameters (aggressiveness, caution level). Include occasional near-misses and recovery animations. Record a "golden run" as the default replay.

### R3: 60 FPS on Lower-End Desktop GPUs
**Risk**: Integrated or older desktop GPUs may struggle with 500+ concurrent sprites, particle effects, and palette cycling shaders.

**Mitigation**: Quality tier system caps particle count and layer count based on GPU probe. Profile early on integrated graphics. Use batched rendering (SpriteBatch) to minimize draw calls.

### R4: Bullet Pattern Readability
**Risk**: Dense bullet patterns become visually overwhelming, making the demo look chaotic rather than spectacular.

**Mitigation**: Enforce color coding (enemy vs player bullets). Limit max bullets per pattern. Ensure clear negative space between bullet groups. Test readability at target display sizes.

### R5: Audio Licensing and Originality
**Risk**: FM synth compositions may unintentionally resemble existing 16-era tracks.

**Mitigation**: Compose original melodies. Use the tracker's sound design for authenticity but write original music. No melody borrowing from any existing game.

## Migration Plan

Not applicable — this is a greenfield project with no migration requirements.

## Open Questions

1. **Art pipeline tooling**: Should we build a sprite sheet editor/validator, or rely on external tools (Aseprite, GraphicsGale)? External tools are mature but add a dependency for contributors.

2. **Music composition approach**: Do we have access to a composer familiar with FM synth tracking, or do we need to generate music procedurally/AI-assisted? This significantly impacts timeline.

3. **Replay recording process**: Should the "golden run" replay be recorded manually (watch and tweak AI parameters until satisfied) or generated automatically (run AI 100 times, pick best score)?
