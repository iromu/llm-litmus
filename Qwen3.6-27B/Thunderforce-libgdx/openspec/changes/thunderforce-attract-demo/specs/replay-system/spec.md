## Purpose

Deterministic replay system that records AI pilot decisions as a sequence of frame-level inputs and replays them for consistent demo behavior, with seeded RNG for reproducible enemy encounters.

## ADDED Requirements

### Requirement: Seeded random number generator
All random behavior (enemy spawn variations, bullet angle jitter, AI pilot randomness) SHALL use a seeded pseudo-random number generator, ensuring identical outputs for the same seed.

#### Scenario: Identical enemy behavior across runs
- **WHEN** the demo is replayed with the same seed
- **THEN** all enemy spawn positions, timings, and bullet patterns are identical

### Requirement: Input recording
The AI pilot's decisions SHALL be recorded as a sequence of frame-level inputs (movement direction, fire command, weapon switch) during the initial demo run.

#### Scenario: Recording captures all inputs
- **WHEN** the AI pilot completes a 3-minute demo run
- **THEN** approximately 10,800 frame-level input records are stored (60 FPS × 180 seconds)

### Requirement: Input replay
Subsequent demo runs SHALL replay the recorded input sequence instead of generating live AI decisions, ensuring frame-perfect consistency.

#### Scenario: Replay produces identical visuals
- **WHEN** the demo replays a recorded input sequence
- **THEN** the visual output is frame-identical to the original recording

### Requirement: Desync detection and recovery
The replay system SHALL detect when the replay diverges from the expected state (due to timing drift or state mismatch) and fall back to live AI pilot decisions.

#### Scenario: Desync triggers live AI fallback
- **WHEN** the replay detects a state mismatch at frame 5000
- **THEN** the system switches to live AI pilot decisions and continues the demo

### Requirement: Replay file persistence
Recorded replay files SHALL be stored as compact binary data (direction + fire + weapon switch per frame = 4 bits per frame) for efficient storage and fast loading.

#### Scenario: 3-minute replay is compact
- **WHEN** a 3-minute demo is recorded
- **THEN** the replay file is approximately 2.7KB (10,800 frames × 4 bits / 8)
