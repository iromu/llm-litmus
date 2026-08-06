## Purpose

Core game engine providing the fixed-timestep game loop, rendering pipeline, asset management, and object pooling infrastructure that all gameplay systems depend on.

## ADDED Requirements

### Requirement: Fixed timestep at 60 FPS
The game loop SHALL execute updates at a fixed 1/60 second timestep, decoupled from rendering frame rate, ensuring deterministic gameplay progression.

#### Scenario: Consistent update interval
- **WHEN** the system experiences variable frame times (e.g., 14ms, 22ms, 16ms)
- **THEN** each game update processes exactly 1/60 second of simulation time

### Requirement: Stable 60 FPS rendering target
The rendering pipeline SHALL target 60 frames per second with vertical sync enabled, maintaining smooth visual presentation.

#### Scenario: VSync maintains frame pacing
- **WHEN** VSync is enabled on the display
- **THEN** frames are presented at even 16.67ms intervals with no visible stutter

### Requirement: AssetManager-based loading
All game assets (textures, sounds, music, fonts) SHALL be loaded through libGDX's AssetManager with asynchronous loading support and progress tracking.

#### Scenario: Async texture loading during title screen
- **WHEN** the title screen displays a loading progress bar
- **THEN** background assets load asynchronously and the progress bar reflects completion percentage

### Requirement: Object pooling infrastructure
The engine SHALL provide a generic object pooling framework that allows game systems to recycle frequently allocated objects (bullets, particles, enemies) without garbage collection pressure.

#### Scenario: Bullet recycling avoids GC
- **WHEN** 500 bullets are fired and destroyed in a 10-second interval
- **THEN** no new bullet objects are allocated after the initial pool is filled

### Requirement: Screen management
The engine SHALL provide a ScreenManager that handles transitions between game screens (title, gameplay, game over, high scores) with configurable transition animations.

#### Scenario: Fade transition between screens
- **WHEN** the game transitions from title screen to gameplay
- **THEN** a fade-to-black transition animates over 500ms before the new screen appears
