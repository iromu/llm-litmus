## Purpose

Weapon system providing 4 distinct weapon types with 3 power levels each, plus power-up pickups (weapon, shield, speed) that enhance the player's capabilities during the demo.

## ADDED Requirements

### Requirement: Four weapon types
The system SHALL provide four distinct weapons: rapid plasma stream (straight, fast fire rate), homing energy drones (seek nearby enemies), wide laser spread (3–5 beam fan), and penetrating lightning beam (passes through multiple enemies).

#### Scenario: Plasma stream fires rapidly
- **WHEN** the plasma stream weapon is active
- **THEN** projectiles fire at 12 rounds per second in a straight line forward

#### Scenario: Homing drones seek enemies
- **WHEN** a homing drone is within 200 pixels of an enemy
- **THEN** the drone curves its trajectory toward the nearest enemy

#### Scenario: Lightning beam penetrates multiple enemies
- **WHEN** the lightning beam fires through 3 overlapping enemies
- **THEN** all 3 enemies take damage from a single beam

### Requirement: Three power levels per weapon
Each weapon SHALL have 3 power levels that increase damage, projectile count, or coverage area.

#### Scenario: Plasma stream level 3 fires double shots
- **WHEN** the plasma stream weapon is at power level 3
- **THEN** each fire produces 2 parallel projectiles instead of 1

### Requirement: Weapon pickup cycling
Weapon pickups SHALL cycle through the 4 weapon types in sequence, allowing the AI pilot to demonstrate each weapon during the demo.

#### Scenario: Weapon pickup cycles types
- **WHEN** the player collects 4 consecutive weapon pickups
- **THEN** each pickup grants a different weapon type in rotation

### Requirement: Shield pickup with visual indicator
Shield pickups SHALL grant a temporary damage-absorbing shield with a visible energy barrier sprite around the player ship.

#### Scenario: Shield absorbs one hit
- **WHEN** the player has an active shield and is hit by an enemy bullet
- **THEN** the shield absorbs the damage and the barrier sprite disappears

### Requirement: Speed pickup with temporary boost
Speed pickups SHALL temporarily increase the player ship's movement speed by 50% for 10 seconds.

#### Scenario: Speed boost duration
- **WHEN** the player collects a speed pickup
- **THEN** the ship's movement speed increases by 50% for exactly 10 seconds before returning to normal
