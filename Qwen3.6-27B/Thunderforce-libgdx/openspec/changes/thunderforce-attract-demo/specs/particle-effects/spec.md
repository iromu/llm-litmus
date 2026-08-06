## Purpose

Particle effects system providing explosions, sparks, debris, smoke, shockwaves, screen shake, and environmental visual effects that create the sense of spectacle and impact.

## ADDED Requirements

### Requirement: Explosion effect sizes
The system SHALL provide 5 explosion sizes (tiny, small, medium, large, massive) with multi-frame sprite animations, each with configurable duration and particle count.

#### Scenario: Medium explosion on enemy death
- **WHEN** a standard enemy is destroyed
- **THEN** a medium explosion (6-frame animation, 400ms duration) plays at the enemy's position

### Requirement: Particle types
The system SHALL support spark, debris, smoke, energy glow, and shockwave particle types, each with unique visual characteristics and lifecycle behavior.

#### Scenario: Sparks fly from explosion
- **WHEN** an explosion effect triggers
- **THEN** spark particles emit outward with gravity and fade over 600ms

### Requirement: Quality-tiered particle count
The maximum concurrent particle count SHALL scale with the GPU quality tier: 200 (low), 500 (medium), 1000 (high).

#### Scenario: Mobile tier limits particles
- **WHEN** the quality tier is set to low
- **THEN** the particle system caps at 200 concurrent particles, recycling oldest first

### Requirement: Screen shake effect
The system SHALL provide a screen shake effect with configurable intensity, duration, and frequency, triggered by explosions and boss attacks.

#### Scenario: Boss explosion causes screen shake
- **WHEN** a boss section is destroyed
- **THEN** the camera shakes with high intensity for 500ms

### Requirement: Environmental effects
The system SHALL support biome-specific environmental effects: volcanic ash particles in the canyon, neon energy sparks in the city, floating debris in the asteroid field, and organic spores in the alien fortress.

#### Scenario: Volcanic ash in canyon biome
- **WHEN** the volcanic canyon biome is active
- **THEN** ambient ash particles drift downward across the screen
