## Purpose

Bullet pattern engine and collision detection system that generates dense but readable bullet patterns (spirals, sweeps, aimed spreads, homing, lasers, area denial) and detects collisions via grid-based spatial hashing.

## ADDED Requirements

### Requirement: Bullet pattern types
The system SHALL support spiral, sweep, aimed spread, homing, laser beam, and area denial bullet patterns, each configurable via parameters (count, speed, angle, interval).

#### Scenario: Spiral bullet pattern
- **WHEN** an enemy fires a spiral pattern with 8 bullets
- **THEN** bullets emanate from the enemy in a rotating circle, each separated by 45 degrees

#### Scenario: Laser beam with warning
- **WHEN** an enemy initiates a laser beam attack
- **THEN** a warning line appears 500ms before the laser fires, indicating the beam's position

### Requirement: Grid-based spatial hash collision
Collision detection SHALL use a grid-based spatial hash with 16×16 pixel cells, providing O(1) average-case lookup for bullet-to-entity collisions.

#### Scenario: Efficient collision with hundreds of bullets
- **WHEN** 500 bullets and 20 enemies are simultaneously on screen
- **THEN** collision detection completes in under 1ms per frame

### Requirement: Bullet readability
Bullet patterns SHALL maintain visual readability: enemy bullets SHALL use distinct colors from player bullets, and bullet speed SHALL not exceed 4 pixels per frame to allow reaction time.

#### Scenario: Enemy bullets are visually distinct
- **WHEN** enemy and player bullets occupy the same screen region
- **THEN** enemy bullets appear in red/orange tones and player bullets in blue/green tones

### Requirement: Homing bullet tracking
Homing bullets SHALL track the player's position with configurable turn rate and acceleration, creating curved trajectories rather than instant redirection.

#### Scenario: Homing missile curves toward player
- **WHEN** a homing missile is fired at a 90-degree angle from the player
- **THEN** the missile follows a curved path toward the player over 1.5 seconds

### Requirement: Area denial persistent zones
Area denial attacks SHALL create persistent danger zones on screen that last for a configurable duration and deal damage to entities that overlap the zone.

#### Scenario: Bomb zone damages player
- **WHEN** the player enters a persistent bomb zone
- **THEN** the player takes damage each frame while inside the zone
