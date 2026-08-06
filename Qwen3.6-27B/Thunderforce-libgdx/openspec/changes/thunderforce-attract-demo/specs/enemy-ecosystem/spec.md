## Purpose

Data-driven enemy framework supporting 20+ enemy types with unique behaviors, attack patterns, sprite animations, and explosion effects, all defined through JSON configuration files.

## ADDED Requirements

### Requirement: JSON-based enemy definitions
Each enemy type SHALL be defined in a JSON file specifying sprite sheet path, hit points, movement speed, behavior type, attack pattern, fire interval, explosion type, score value, and drop table.

#### Scenario: New enemy type added via JSON
- **WHEN** a developer adds a new JSON entry for "scout_fighter"
- **THEN** the enemy spawns with the configured sprite, HP, behavior, and attack pattern without code changes

### Requirement: 20+ distinct enemy types
The system SHALL include at least 20 enemy types across categories: small fighters, walkers, heavy cruisers, mechanical insects, missile carriers, armored gunships, and biomechanical organisms.

#### Scenario: Enemy variety across biomes
- **WHEN** the demo progresses through all 4 biomes
- **THEN** at least 5 distinct enemy types appear in each biome, with biome-specific variants

### Requirement: Behavior system
Enemies SHALL support configurable behaviors including zigzag, patrol, ambush, chase, retreat, and formation fly, each parameterized by amplitude, frequency, speed, and trigger conditions.

#### Scenario: Zigzag enemy movement
- **WHEN** a "zigzag" behavior enemy is active
- **THEN** the enemy moves along a sine wave path with configurable amplitude and frequency

### Requirement: Unique attack patterns per enemy type
Each enemy type SHALL have a distinct attack pattern (single aimed shot, 3-bullet spread, spiral burst, homing missile, laser sweep) with configurable fire intervals.

#### Scenario: Missile carrier fires homing missiles
- **WHEN** a missile carrier enemy reaches its fire interval
- **THEN** it launches a homing missile that tracks the player's position

### Requirement: Distinctive explosions per enemy size
Enemies SHALL trigger explosion effects proportional to their size category (small, medium, large, boss), with unique sprite animations for each category.

#### Scenario: Heavy cruiser triggers large explosion
- **WHEN** a heavy cruiser enemy is destroyed
- **THEN** a large multi-frame explosion animation plays at the enemy's position

### Requirement: Encounter scripting
Enemy encounters SHALL be defined through JSON scripts that specify spawn timing, position, formation, and triggering conditions (distance-based, timer-based, or event-based).

#### Scenario: Distance-triggered encounter
- **WHEN** the scroll position reaches 5000 pixels
- **THEN** a formation of 3 scout fighters spawns in a V-formation
