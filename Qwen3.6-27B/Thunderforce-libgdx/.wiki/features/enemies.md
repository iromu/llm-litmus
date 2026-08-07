---
name: Enemies
description: 21 enemy types, behavior patterns, JSON definitions, and encounter scripting
type: feature
updated_at: 2026-08-07
last_commit: 68f5446a55b8d17afc76fe48b10d6a6b27edc5e6
language: en
---

# Enemies

## Enemy Types

21 enemy types defined in `data/enemies/enemy_definitions.json`:

| ID | HP | Speed | Behavior | Score | Description |
|----|----|:-----:|----------|------:|-------------|
| grunt | 1 | 40 | ZIGZAG | 50 | Basic fighter |
| interceptor | 2 | 60 | CHASE | 75 | Fast pursuer |
| bomber | 3 | 30 | PATROL | 100 | Heavy attacker |
| sniper | 2 | 20 | AMBUSH | 100 | Long-range shooter |
| swarm | 1 | 50 | FORMATION_FLY | 60 | Group fighter |
| tank | 5 | 15 | PATROL | 150 | Armored unit |
| loopers | 2 | 45 | ZIGZAG | 75 | Circular pattern |
| splitter | 2 | 35 | RETREAT | 80 | Splits on death |
| shield_guard | 4 | 25 | CHASE | 120 | Shielded bodyguard |
| missile_pod | 3 | 20 | AMBUSH | 100 | Missile launcher |
| dasher | 2 | 80 | CHASE | 75 | Fast dashing unit |
| spinner | 2 | 40 | PATROL | 75 | Rotating attack |
| ghost | 2 | 30 | RETREAT | 100 | Phasing enemy |
| turret | 4 | 0 | AMBUSH | 125 | Stationary gun |
| escort | 2 | 50 | FORMATION_FLY | 60 | Boss escort |
| mine | 1 | 10 | AMBUSH | 50 | Trapped mine |
| weaver | 2 | 55 | ZIGZAG | 80 | Complex zigzag |
| heavy_gunner | 5 | 20 | PATROL | 150 | Heavy weapons |
| kamikaze | 1 | 90 | CHASE | 50 | Suicide rusher |
| phase_shift | 3 | 40 | RETREAT | 100 | Phase shifting |
| mega_tank | 15 | 10 | PATROL | 1000 | Ultimate heavy |

## Behavior Patterns

Six behavior types implemented as static methods in `EnemyBehavior`:

| Behavior | Description | Key Parameters |
|----------|-------------|----------------|
| **ZIGZAG** | Sine wave leftward with vertical oscillation | Amplitude 40px, frequency 3.0 Hz |
| **PATROL** | Oscillate around center point within range | Patrol speed 1.5 |
| **AMBUSH** | Hold position, charge when player enters trigger distance | Trigger distance, charge speed = base + enemy.speed |
| **CHASE** | Accelerate toward player each frame, clamped to 3× speed | Acceleration 200 px/s² |
| **RETREAT** | Move away from player when within retreat distance | Retreat speed 80 + enemy.speed |
| **FORMATION_FLY** | Follow offset position relative to leader | Lerp speed 4.0 |

## Enemy Base Class

- 6×6 hitbox with soft boundary clamping
- 4-frame animation at ~8 FPS
- JSON-driven initialization via `EnemyData`
- Movement delegated to `EnemyBehavior` static methods
- Attack patterns defined per type

## JSON Structure

```json
{
  "id": "grunt",
  "sprite": "grunt.png",
  "hp": 1,
  "speed": 40,
  "behavior": "ZIGZAG",
  "attackPattern": "aimed",
  "score": 50,
  "dropsPowerUp": false,
  "spawnX": 320,
  "spawnY": 112
}
```

## EnemyDefinitions

`EnemyDefinitions` wraps the JSON array and builds an `ObjectMap<String, EnemyData>` for O(1) lookup by id. Call `index()` after loading.

## Encounter Scripting

Encounters are defined per biome in JSON files (`data/encounters/*.json`):

- `EncounterScript` manages timed waves
- Each `EncounterWave` has a `startTime` and multiple `EnemySpawn` entries
- Each spawn has a delay, position, and enemy type id
- `reset()` clears all wave flags for replay support
