---
name: Thunderforce-libgdx Wiki Index
description: Navigation hub for the Thunderforce shoot-'em-up game wiki
type: overview
updated_at: 2026-08-07
last_commit: 68f5446a55b8d17afc76fe48b10d6a6b27edc5e6
language: en
---

# Thunderforce-libgdx Wiki

## Overview

16-bit horizontal scrolling shoot-'em-up built with libGDX, featuring AI-controlled attract mode, 4 biomes, 21 enemy types, and 3 multi-phase bosses. Internal resolution 320×224 at 60 FPS with nearest-neighbor scaling.

## Navigation

### Architecture
- [Architecture](overview/architecture.md) — Module layout, package structure, and component relationships
- [Technical Specs](overview/technical-specs.md) — Target specs, dependencies, and configuration

### Features
- [Gameplay](features/gameplay.md) — Core gameplay loop, scoring, lives, and biome cycling
- [Weapons](features/weapons.md) — Four weapon types, power levels, and projectile behavior
- [Enemies](features/enemies.md) — 21 enemy types, behaviors, and encounter scripting
- [Bosses](features/bosses.md) — Three multi-phase bosses with destructible sections
- [Biomes](features/biomes.md) — Four biomes with parallax scrolling and ambient effects
- [Power-Ups](features/power-ups.md) — Collectible items: weapon cycle, shield, speed boost

### Core Concepts
- [Game Loop](concepts/game-loop.md) — Fixed timestep accumulator pattern at 60 FPS
- [Object Pooling](concepts/object-pooling.md) — FixedPool for zero-GC gameplay
- [Spatial Hashing](concepts/spatial-hashing.md) — Grid-based collision broad-phase
- [Steering Behaviors](concepts/steering-behaviors.md) — AI pilot with layered steering priorities
- [Deterministic Replay](concepts/deterministic-replay.md) — Seeded RNG and input recording/replay
- [Quality Tiers](concepts/quality-tiers.md) — GPU-based adaptive quality selection

### Entities
- [Player Ship](entities/player-ship.md) — Ship physics, shields, and animation
- [AI Pilot](entities/ai-pilot.md) — Steering behavior chain and adaptive firing
- [Projectiles](entities/projectiles.md) — Player projectile types and homing logic
- [Bullets](entities/bullets.md) — Enemy bullet types and pattern generation
- [Particles](entities/particles.md) — Particle system, explosion factory, and screen shake

### Flows
- [Screen Flow](flows/screen-flow.md) — Title → Game → Game Over → High Score loop
- [Rendering Pipeline](flows/rendering-pipeline.md) — FrameBuffer, integer scaling, and overscan crop
- [Audio System](flows/audio-system.md) — Music crossfade, boss layering, and ducking
- [Asset Loading](flows/asset-loading.md) — AssetManager-based centralized loading

### Risks and Known Issues
- [Risks](risks/risks.md) — Performance risks, GC pressure points, and platform considerations
