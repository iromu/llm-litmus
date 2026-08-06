## Purpose

Adaptive rendering pipeline that maintains authentic 320×224 pixel art while dynamically adapting viewport, output scaling, and visual quality to the target display and GPU capabilities.

## ADDED Requirements

### Requirement: Fixed internal resolution
The engine SHALL render all game content at a fixed internal resolution of 320×224 pixels using nearest-neighbor filtering to preserve pixel-perfect 16-bit aesthetics.

#### Scenario: Pixel-perfect rendering on any display
- **WHEN** the game renders on a 1920×1080 display
- **THEN** all game sprites appear as crisp, unblurred pixels with no interpolation artifacts

### Requirement: Dynamic viewport from display aspect
The camera viewport SHALL adjust its virtual width based on the display's aspect ratio, allowing wider displays to see more horizontal world content without stretching pixels.

#### Scenario: Ultrawide display shows wider view
- **WHEN** the display aspect ratio is 21:9
- **THEN** the camera viewport width is approximately 420 virtual pixels, showing more level content horizontally

#### Scenario: Standard 16:9 display
- **WHEN** the display aspect ratio is 16:9
- **THEN** the camera viewport width is approximately 320 virtual pixels

### Requirement: Integer-scaled output with overscan crop
The output SHALL be scaled using integer multiplication factors (×1, ×2, ×3, ×4) of the base 320×224 resolution, with a small overscan crop to eliminate letterboxing.

#### Scenario: 4K display uses ×3 scaling
- **WHEN** the window size is 3840×2160
- **THEN** the render target is scaled by ×3 (960×672) and cropped minimally to fill the window

### Requirement: GPU-probed quality tiers
The engine SHALL probe GPU capabilities at startup and select a quality tier that adjusts particle count, parallax layer count, and effect density while preserving gameplay feel.

#### Scenario: Mobile GPU selects reduced quality
- **WHEN** the GPU is detected as a mobile integrated renderer
- **THEN** particle count is capped at 200, parallax layers at 4, and post-processing is disabled

#### Scenario: Desktop GPU selects full quality
- **WHEN** the GPU is detected as a dedicated desktop renderer
- **THEN** particle count is capped at 1000, parallax layers at 10, and full post-processing is enabled

### Requirement: Quality tier is configurable at runtime
The quality tier SHALL be overridable via a configuration flag, allowing developers to force a specific tier regardless of GPU detection.

#### Scenario: Developer forces low quality for profiling
- **WHEN** a configuration flag sets quality tier to "low"
- **THEN** the engine uses low-tier settings regardless of detected GPU capabilities
