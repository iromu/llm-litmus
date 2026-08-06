## Why

This project implements a complete, playable attract-mode demo of a 16-bit era horizontal scrolling shoot-'em-up using Java and libGDX. The goal is a 2.5–3 minute AI-piloted demo that evokes the spectacle, speed, and cinematic presentation of flagship 16-bit shooters while being entirely original in all assets, names, and design.

## What Changes

- New libGDX project with full game engine (rendering, physics, audio, input)
- Adaptive rendering pipeline: fixed 320×224 internal resolution with dynamic viewport scaling based on display aspect ratio, integer-scaled output, and GPU-probed quality tiers
- AI-piloted gameplay with expert-level evasive maneuvers (steering behaviors, bullet avoidance, path planning)
- Data-driven enemy framework (20+ enemy types defined in JSON)
- Multi-phase boss battles (3 original bosses with destructible sections)
- Full attract-mode presentation loop (title → demo → game over → high scores → repeat)
- Deterministic replay system for consistent demo behavior
- Original FM synth-inspired soundtrack and sound effects

## Capabilities

### New Capabilities

- `adaptive-rendering`: Dynamic viewport adaptation from display aspect ratio, integer-scaled output with overscan crop, GPU-probed quality tiers (particle count, parallax layers, effect density)
- `core-engine`: Fixed-timestep game loop at 60 FPS, libGDX ApplicationListener lifecycle, AssetManager-based loading, object pooling infrastructure
- `parallax-scrolling`: 6–10 layer parallax scrolling engine with per-layer scroll speeds, palette cycling shader for dynamic lighting, seamless tile wrapping
- `player-ship`: Player ship physics (acceleration, inertia, movement), 4-directional sprite animation, AI pilot with steering behaviors and threat assessment
- `weapon-system`: 4 weapon types (plasma stream, homing drones, laser spread, lightning beam) with 3 power levels each, weapon/shield/speed power-up pickups
- `enemy-ecosystem`: Data-driven enemy definitions (JSON), 20+ enemy types with unique behaviors and attack patterns, formation/encounter scripting system
- `bullet-system`: Bullet pattern engine (spirals, sweeps, aimed spreads, homing, lasers, area denial), grid-based spatial hash collision detection at 16×16 cell granularity
- `particle-effects`: Particle system with explosions (5 sizes), sparks, debris, smoke, shockwaves, screen shake, and environmental effects
- `boss-battles`: Multi-phase boss framework with destructible sections, phase transitions, cinematic death sequences, 3 boss implementations (mining machine, orbital battleship, alien guardian)
- `audio-system`: FM synth-inspired soundtrack (5+ tracks), sound effect library (30+ SFX), dynamic music transitions, audio mixing with music ducking during boss fights
- `attract-mode`: Animated title screen, stage transitions, HUD with score counter and weapon display, game over screen, high score table, seamless loop back to title
- `replay-system`: Seeded RNG for deterministic enemy behavior, input recording/replay for consistent AI pilot demo runs

### Modified Capabilities

(None — this is a greenfield project with no existing capabilities.)

## Impact

- New libGDX multi-module Maven project (core, desktop)
- Dependencies: libGDX 1.14.0+, gdx-ai for steering behaviors and pathfinding
- ~350+ pixel art sprite frames, 12–16 background tilesets
- 5+ music tracks, 30+ sound effects (WAV/OGG format)
- ~40–60 Java classes across engine, gameplay, and presentation layers
- JSON data files for enemy definitions, encounter scripts, boss scripts
