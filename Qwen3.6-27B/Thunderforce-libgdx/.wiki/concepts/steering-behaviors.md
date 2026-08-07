---
name: Steering Behaviors
description: AI pilot with layered priority chain: flee, seek, arrive, wander
type: concept
updated_at: 2026-08-07
last_commit: 68f5446a55b8d17afc76fe48b10d6a6b27edc5e6
language: en
---

# Steering Behaviors

## AI Pilot

`AIPilot` uses a layered priority chain of steering behaviors from gdx-ai. Each behavior produces a steering output (desired velocity direction) that is blended based on priority.

### Priority Chain

| Priority | Behavior | Condition | Description |
|----------|----------|-----------|-------------|
| 1 (highest) | **Flee** | Threatening bullet within 80px | Course-weighted flee from nearest bullet |
| 2 | **Seek** | Power-up within 200px | Move toward collectible power-up |
| 3 | **Arrive** | Always | Move to strategic position |
| 4 (lowest) | **Wander** | Always | Random drift with persistence |

### Flee Behavior

- Scans all enemy bullets for threats within 80px radius
- Course-weighted: bullets moving toward the player have higher priority
- Recovery steering after fleeing to return to strategic position
- Near-miss maneuvers for visual excitement

### Seek Behavior

- Activated when a power-up is within 200px
- Direct seek toward the power-up position
- Overrides wander and arrive while active

### Arrive Behavior

- Targets a strategic position (typically center-left of screen for optimal coverage)
- Smooth deceleration as ship approaches target
- Base behavior when no higher-priority behavior is active

### Wander Behavior

- Random directional changes with persistence
- Creates natural-looking drift when no threats are present
- Drift parameter controls how much the ship meanders

## Adaptive Firing

Fire rate is modulated based on the current context:

| Context | Detection | Fire Rate |
|---------|-----------|-----------|
| **Combat** | Enemies within firing range | 85% of weapon base rate |
| **Dodge** | Threatening bullets nearby | 20% of weapon base rate |
| **Calm** | No threats detected | 10% of weapon base rate |

## Weapon Switching

Context-aware weapon selection:

- **Group patterns** (dense enemy formations) → Laser Spread (wide coverage)
- **Single targets** (bosses, tanks) → Plasma Stream (focused fire)
- **Evasive enemies** → Homing Drone (tracking)
- **Penetrating needs** → Lightning Beam (multi-hit)

## Tuning Constants

All steering parameters are exposed as static constants for easy tuning:

- Flee distance threshold
- Seek distance threshold
- Wander persistence and deviation
- Recovery steering strength
- Near-miss trigger distance
- Adaptive fire rate modifiers

## Input Output

`AIPilot` produces an `InputDirection` enum value each frame:

```java
InputDirection direction = aiPilot.getSteeringDirection();
// Result: NONE, UP, DOWN, LEFT, RIGHT, UP_LEFT, UP_RIGHT, DOWN_LEFT, DOWN_RIGHT
```

This maps directly to the same input path as keyboard controls, ensuring AI and human input are handled identically by the player ship.
