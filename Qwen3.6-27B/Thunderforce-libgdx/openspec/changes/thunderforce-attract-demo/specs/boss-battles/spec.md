## Purpose

Multi-phase boss battle framework supporting destructible sections, phase transitions, cinematic death sequences, and 3 original boss implementations (mining machine, orbital battleship, alien guardian).

## ADDED Requirements

### Requirement: Destructible boss sections
Bosses SHALL be composed of multiple independently targetable sections, each with its own hit points, sprite, and attack behavior. Destroying a section changes the boss's overall behavior.

#### Scenario: Destroying boss drill arm changes behavior
- **WHEN** the player destroys the left drill arm of the mining machine boss
- **THEN** the boss stops using drill attacks and increases fire rate with the remaining arm

### Requirement: Multi-phase boss progression
Each boss SHALL have 2–3 phases triggered by hit point thresholds, with each phase introducing new attack patterns, visual changes, and increased aggression.

#### Scenario: Boss enters phase 2 at 50% HP
- **WHEN** the orbital battleship reaches 50% hit points
- **THEN** it transforms into its gun platform form with new bullet patterns

### Requirement: Cinematic death sequence
Boss destruction SHALL trigger a multi-stage death animation with cascading explosions, debris, and a dramatic final explosion, lasting at least 3 seconds.

#### Scenario: Alien guardian death sequence
- **WHEN** the alien guardian is destroyed
- **THEN** a 5-second death sequence plays: tentacles detach, core cracks, energy builds, massive explosion

### Requirement: Three boss implementations
The system SHALL include three boss implementations: "Magma Maw" (gigantic mining machine with destructible drill arms and turrets), "Orbital Judge" (transforming battleship with rotating weapon arrays), and "Xeno Guardian" (biomechanical alien with tentacle assault and beam attacks).

#### Scenario: All three bosses appear in demo
- **WHEN** the demo progresses through all biomes
- **THEN** each biome culminates in a unique boss fight

### Requirement: Boss encounter scripting
Boss encounters SHALL be defined through JSON scripts specifying entrance animation, phase transitions, attack patterns per phase, and death sequence.

#### Scenario: Boss entrance animation
- **WHEN** the scroll position reaches the boss encounter trigger
- **THEN** scrolling pauses and the boss enters the screen with a dramatic entrance animation
