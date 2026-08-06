## Purpose

Player ship system including physics (movement, acceleration, inertia), sprite animation, and AI pilot that performs expert-level evasive maneuvers, weapon selection, and strategic positioning.

## ADDED Requirements

### Requirement: Ship physics with inertia
The player ship SHALL have acceleration-based movement with configurable speed, acceleration rate, and inertia, creating a sense of weight and momentum.

#### Scenario: Ship accelerates gradually
- **WHEN** the AI pilot commands upward movement
- **THEN** the ship accelerates smoothly over 200ms rather than teleporting to the new position

### Requirement: 4-directional sprite animation
The player ship SHALL display animated sprites for 4 facing directions (up, down, left, right) with engine flame animations and hit flash effects.

#### Scenario: Direction change updates sprite
- **WHEN** the ship changes movement direction from upward to rightward
- **THEN** the sprite transitions to the right-facing animation within one frame

### Requirement: AI pilot bullet avoidance
The AI pilot SHALL detect incoming enemy bullets within a configurable detection radius and execute evasive maneuvers to avoid collisions.

#### Scenario: Dodging a bullet spread
- **WHEN** an enemy fires a 5-bullet spread toward the player's position
- **THEN** the AI pilot steers toward the largest safe corridor between bullets

### Requirement: AI pilot power-up collection
The AI pilot SHALL detect and navigate toward weapon, shield, and speed power-ups when they are within range and collecting them does not conflict with survival.

#### Scenario: Collecting a weapon power-up
- **WHEN** a weapon power-up appears within 100 pixels of the ship's path
- **THEN** the AI pilot adjusts its trajectory to collect the power-up

### Requirement: AI pilot weapon selection
The AI pilot SHALL select weapons based on the current threat composition, preferring area weapons against dense enemy groups and penetrating weapons against armored targets.

#### Scenario: Switching to spread weapon against swarm
- **WHEN** 5+ small enemies appear simultaneously on screen
- **THEN** the AI pilot selects the wide laser spread weapon for area coverage

### Requirement: AI pilot natural behavior
The AI pilot SHALL incorporate slight randomness and recovery behaviors to avoid appearing scripted, including occasional near-misses and brief periods of suboptimal positioning.

#### Scenario: Near-miss dodging
- **WHEN** a bullet passes within 5 pixels of the ship
- **THEN** the ship continues its current trajectory rather than overreacting, creating tension
