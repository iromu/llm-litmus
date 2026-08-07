---
name: Gameplay
description: Core gameplay loop, scoring, lives, power-ups, biome transitions, and game over flow
type: feature
updated_at: 2026-08-07
last_commit: 68f5446a55b8d17afc76fe48b10d6a6b27edc5e6
language: en
---

# Gameplay

## Core Loop

The game runs a fixed-timestep loop at 60 FPS. Each frame:

1. **Input**: AIPilot computes steering, produces `InputDirection`
2. **Player**: Ship moves with acceleration-based physics
3. **Weapons**: Active weapon fires based on adaptive fire rate
4. **Enemies**: Spawned encounters update movement and fire patterns
5. **Collision**: Spatial hash broad-phase + AABB narrow-phase
6. **Particles**: Active particles update and expired ones recycle
7. **Parallax**: Background layers scroll at speed-multiplied rates
8. **Screen Shake**: Damped sine wave offset decays toward zero

## Scoring

- Enemy kill: 50–1000 points (per `enemy_definitions.json`)
- Boss kill: 5000–8000 points (Magma Maw 5000, Xeno Guardian 6000, Orbital Judge 8000)
- Score displayed in HUD top-left

## Lives

- Player starts with a set number of lives
- Lives displayed as icons in HUD top-right
- Hit with shield → shield absorbs (max 5 HP)
- Hit without shield → lose life, 1.5s invincibility
- Zero lives → Game Over screen

## Power-Ups

Three types drop from defeated enemies (controlled by `dropsPowerUp` flag in enemy definition):

| Type | Color | Effect |
|------|-------|--------|
| WEAPON_CYCLE | Yellow | Cycle to next weapon |
| SHIELD | Cyan | Restore shield (5 HP absorption) |
| SPEED_BOOST | Orange | 1.5× speed for 10 seconds |

Power-ups fall at 30 px/s, blink every 0.15s, and are collected via AABB overlap with player hitbox.

## Biome Transitions

- 4 biomes: Volcanic → City → Asteroid → Alien
- Transition every 30 seconds
- Crossfade between biome backgrounds via `Interpolation.fade`
- Parallax layers smoothly change speed
- Ambient particle type changes per biome

## Game Over

- Triggered when lives reach zero
- "GAME OVER" screen with final score
- Auto-transitions to High Score screen after 3 seconds or on input

## High Score

- 10-entry table with placeholder entries
- Demo score inserted in correct rank position
- Auto-loops back to Title Screen after 5 seconds
