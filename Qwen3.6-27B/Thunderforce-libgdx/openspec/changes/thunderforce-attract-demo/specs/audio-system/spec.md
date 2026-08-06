## Purpose

Audio system providing FM synth-inspired soundtrack, sound effects library, dynamic music transitions, and audio mixing that creates the energetic early-1990s arcade atmosphere.

## ADDED Requirements

### Requirement: FM synth-inspired soundtrack
The system SHALL include 5+ original music tracks composed in an FM synth and rock fusion style: title screen, volcanic canyon, futuristic city, asteroid field, and alien fortress themes.

#### Scenario: Title screen music plays on startup
- **WHEN** the game launches to the title screen
- **THEN** the title screen theme begins playing immediately

### Requirement: Sound effect library
The system SHALL include 30+ sound effects covering player weapons (4 types × 3 power levels), enemy explosions (5 sizes), power-up collection, engine hum, shield hit, laser charge, and environmental ambience.

#### Scenario: Weapon sound matches weapon type
- **WHEN** the player fires the lightning beam weapon
- **THEN** a distinct electrical crackle sound plays

### Requirement: Dynamic music transitions
Music SHALL crossfade between tracks during biome transitions with a 1-second fade-out/fade-in, and intensify during boss encounters by layering a boss theme over the biome music.

#### Scenario: Smooth biome music transition
- **WHEN** the game transitions from volcanic canyon to futuristic city
- **THEN** the canyon theme fades out over 1 second as the city theme fades in

#### Scenario: Boss music intensification
- **WHEN** a boss encounter begins
- **THEN** the boss theme layers over the current biome music with increased tempo

### Requirement: Audio mixing with ducking
Background music volume SHALL automatically duck (reduce by 30%) during intense combat sequences and boss fights to prioritize sound effects clarity.

#### Scenario: Music ducks during boss fight
- **WHEN** a boss encounter is active
- **THEN** background music volume reduces to 70% and SFX volume remains at 100%

### Requirement: Audio format compatibility
All audio assets SHALL be provided in WAV format for sound effects (short, <2 seconds) and OGG format for music tracks (streamed), ensuring compatibility with the LWJGL3 desktop backend.

#### Scenario: Audio loads on desktop
- **WHEN** the game runs on the desktop (LWJGL3) backend
- **THEN** all audio assets load and play correctly without format conversion errors
