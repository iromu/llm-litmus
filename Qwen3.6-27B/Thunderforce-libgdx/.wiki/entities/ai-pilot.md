---
name: AI Pilot
description: Expert-level movement via layered steering behaviors for attract mode demo
type: entity
updated_at: 2026-08-07
last_commit: 68f5446a55b8d17afc76fe48b10d6a6b27edc5e6
language: en
---

# AI Pilot

## Overview

`AIPilot` produces expert-level movement for the attract mode demo. It uses a priority chain of steering behaviors from gdx-ai, producing an `InputDirection` each frame.

## Steering Priority Chain

The pilot evaluates behaviors in order, with higher priorities overriding lower ones:

### 1. Flee (Highest Priority)

- Scans all enemy bullets for threats
- Threat criteria: bullet within 80px, course-weighted toward player
- Produces flee steering away from nearest threat
- Recovery steering after flee to return to strategic position

### 2. Seek Power-Ups

- Activates when a power-up is within 200px
- Direct seek toward the power-up
- Ensures the AI collects items for demo spectacle

### 3. Arrive at Strategic Position

- Targets optimal coverage position (center-left of screen)
- Smooth deceleration via gdx-ai Arrive behavior
- Base positioning when no immediate threats

### 4. Wander (Lowest Priority)

- Random drift with persistence for natural movement
- Prevents the ship from sitting still during calm periods
- Creates visual interest in the demo

## Context-Aware Behavior

### Adaptive Fire Rate

| Context | Detection | Modifier |
|---------|-----------|----------|
| Combat | Enemies in firing range | 85% of base rate |
| Dodge | Threatening bullets nearby | 20% of base rate |
| Calm | No threats | 10% of base rate |

### Weapon Switching

- Group patterns → Laser Spread (wide coverage)
- Single targets → Plasma Stream (focused fire)
- Evasive enemies → Homing Drone (tracking)
- Penetrating needs → Lightning Beam (multi-hit)

### Near-Miss Maneuvers

- Deliberately flies close to bullets for visual excitement
- Maintains safety margin to avoid actual hits
- Creates dramatic dodge moments in the demo

## Output

Each frame the pilot produces:

```java
InputDirection direction;  // Movement intent
boolean fire;              // Fire weapon
boolean switchWeapon;      // Cycle to next weapon
```

This output is identical in format to keyboard input, ensuring the player ship handles AI and human input the same way.

## Tuning

All parameters are exposed as static constants:

- `FLEE_DISTANCE` — Bullet threat radius (80px)
- `SEEK_DISTANCE` — Power-up detection radius (200px)
- `RECOVERY_STRENGTH` — Return-to-position force
- `WANDER_PERSISTENCE` — Directional memory in wander
- `NEAR_MISS_DISTANCE` — Close-dodge threshold
