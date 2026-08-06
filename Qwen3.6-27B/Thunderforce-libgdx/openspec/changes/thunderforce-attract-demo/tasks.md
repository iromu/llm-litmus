## 1. Project Setup

- [x] 1.1 Set up Maven multi-module project structure (core, desktop) with `mvnw`
- [x] 1.2 Add gdx-ai dependency for steering behaviors and pathfinding
- [x] 1.3 Configure pom.xml with libGDX 1.14.0+ and Java 25 target
- [x] 1.4 Create package structure: `com.thunderforce.engine`, `com.thunderforce.gameplay`, `com.thunderforce.presentation`, `com.thunderforce.data`
- [x] 1.5 Implement main ApplicationListener entry point with basic render loop

## 2. Core Engine

- [x] 2.1 Implement fixed-timestep game loop with accumulator pattern (1/60s updates)
- [x] 2.2 Create ScreenManager with fade-to-black transition support
- [x] 2.3 Implement AssetManager configuration with async loading and progress tracking
- [x] 2.4 Create FixedPool<T> object pooling infrastructure (pre-allocated, zero-GC)
- [x] 2.5 Implement GPU capability probe (renderer detection, quality tier selection)
- [x] 2.6 Create configuration system (quality tier override, debug flags)

## 3. Adaptive Rendering Pipeline

- [x] 3.1 Implement 320×224 FrameBuffer render target with nearest-neighbor filtering
- [x] 3.2 Implement dynamic camera viewport calculation from display aspect ratio
- [x] 3.3 Implement integer-scaled output quad rendering with nearest-neighbor
- [x] 3.4 Implement overscan crop to eliminate letterboxing on non-matching aspect ratios
- [x] 3.5 Implement quality tier configuration (particle caps, layer counts, post-processing flags)
- [ ] 3.6 Verify pixel-perfect rendering on 4:3, 16:9, 16:10, and 21:9 displays

## 4. Parallax Scrolling Engine

- [x] 4.1 Implement ParallaxLayer class with scroll speed multiplier, texture, and vertical position
- [x] 4.2 Implement seamless horizontal tile wrapping via UV coordinate management
- [x] 4.3 Create palette cycling shader with animatable 256-entry color LUT
- [x] 4.4 Implement ParallaxManager supporting 4–10 layers with per-biome configuration
- [x] 4.5 Implement dynamic scroll speed changes (acceleration/deceleration over time)
- [x] 4.6 Create biome transition system (swap all layer textures with crossfade)

## 5. Player Ship System

- [x] 5.1 Implement PlayerShip class with acceleration-based physics (speed, accel rate, inertia)
- [x] 5.2 Create 4-directional sprite animation system (up, down, left, right + engine flames)
- [x] 5.3 Implement hit flash effect and invincibility frames
- [x] 5.4 Create AI pilot perception system (bullet detection within 150px radius, power-up detection)
- [x] 5.5 Implement AI pilot steering behaviors using gdx-ai (Flee, Seek, Arrive, PrioritySteering)
- [x] 5.6 Implement AI pilot weapon selection logic (threat-based weapon switching)
- [x] 5.7 Tune AI pilot parameters for natural, expert-level behavior (near-misses, recovery)

## 6. Weapon System

- [x] 6.1 Implement Weapon base class with fire rate, damage, and projectile factory
- [x] 6.2 Implement PlasmaStream weapon (straight, fast fire rate, 3 power levels)
- [x] 6.3 Implement HomingDrone weapon (seek behavior, curved trajectory, 3 power levels)
- [x] 6.4 Implement LaserSpread weapon (3–5 beam fan, area coverage, 3 power levels)
- [x] 6.5 Implement LightningBeam weapon (penetrating, passes through enemies, 3 power levels)
- [x] 6.6 Implement power-up spawning and collection (weapon cycle, shield, speed boost)
- [x] 6.7 Implement shield visual (energy barrier sprite) and damage absorption
- [x] 6.8 Implement speed boost timer (50% increase for 10 seconds)

## 7. Enemy Ecosystem

- [x] 7.1 Create JSON schema for enemy definitions (sprite, HP, speed, behavior, attack, explosion, score, drops)
- [x] 7.2 Implement Enemy base class with JSON-driven initialization
- [x] 7.3 Implement behavior system (zigzag, patrol, ambush, chase, retreat, formation fly)
- [x] 7.4 Create 20+ enemy type JSON definitions across all categories
- [x] 7.5 Implement encounter scripting system (JSON-based spawn timing, position, formation)
- [x] 7.6 Create biome-specific encounter scripts (4 biome files)
- [x] 7.7 Implement enemy death handling (explosion trigger, score award, power-up drop)

## 8. Bullet System and Collision Detection

- [x] 8.1 Implement GridSpatialHash with 16×16 pixel cells (20×14 grid)
- [x] 8.2 Implement Bullet base class with position, velocity, lifetime, and collision radius
- [x] 8.3 Implement spiral bullet pattern generator
- [x] 8.4 Implement sweep bullet pattern generator
- [x] 8.5 Implement aimed spread bullet pattern generator
- [x] 8.6 Implement homing bullet with configurable turn rate and acceleration
- [x] 8.7 Implement laser beam with warning line (500ms pre-fire indicator)
- [x] 8.8 Implement area denial persistent zone with overlap damage
- [x] 8.9 Implement collision detection: player bullets → enemies, enemy bullets → player
- [x] 8.10 Enforce bullet color coding (enemy: red/orange, player: blue/green)

## 9. Particle Effects

- [x] 9.1 Implement ParticleSystem with FixedPool-backed particle recycling
- [x] 9.2 Create explosion effect sprites (5 sizes: tiny, small, medium, large, massive)
- [x] 9.3 Implement spark particle type (outward emission, gravity, fade)
- [x] 9.4 Implement debris particle type (larger fragments, slower fall)
- [x] 9.5 Implement smoke particle type (expanding, fading, slow drift)
- [x] 9.6 Implement energy glow particle type (pulsing, radial)
- [x] 9.7 Implement shockwave particle type (expanding ring)
- [x] 9.8 Implement screen shake effect (configurable intensity, duration, frequency)
- [x] 9.9 Create biome-specific ambient effects (ash, neon sparks, debris, spores)
- [x] 9.10 Implement quality-tier particle count caps (200/500/1000)

## 10. Boss Battles

- [x] 10.1 Implement Boss base class with section management and phase transitions
- [x] 10.2 Implement destructible section system (independent HP, sprite, attacks per section)
- [x] 10.3 Implement phase transition triggers (HP thresholds, behavior changes)
- [x] 10.4 Implement cinematic death sequence (multi-stage, cascading explosions, 3+ seconds)
- [x] 10.5 Create "Magma Maw" boss (mining machine, drill arms, turret array, 3 phases)
- [x] 10.6 Create "Orbital Judge" boss (transforming battleship, rotating weapons, 3 forms)
- [x] 10.7 Create "Xeno Guardian" boss (biomechanical alien, tentacles, beam, death sequence)
- [x] 10.8 Create boss encounter JSON scripts (entrance, phases, attacks, death)

## 11. Audio System

- [x] 11.1 Implement AudioManager with music streaming (OGG) and SFX playback (WAV)
- [x] 11.2 Implement dynamic music crossfade (1-second fade-out/fade-in on biome transitions)
- [x] 11.3 Implement boss music layering (boss theme over biome music with tempo increase)
- [x] 11.4 Implement audio ducking (music -30% during boss fights)
- [ ] 11.5 Compose and import title screen theme
- [ ] 11.6 Compose and import 4 biome themes (volcanic canyon, futuristic city, asteroid field, alien fortress)
- [ ] 11.7 Compose and import 3 boss themes
- [ ] 11.8 Create and import 30+ sound effects (weapons, explosions, power-ups, engine, environmental)

## 12. Attract Mode Presentation

- [x] 12.1 Implement TitleScreen with animated logo, scrolling background, "PRESS START" prompt
- [x] 12.2 Implement auto-start timer (8-second delay before demo begins)
- [x] 12.3 Implement cinematic fly-in sequence (camera sweep, engine sound, gradual speed increase)
- [x] 12.4 Implement HUD (score display, weapon icon + power level, shield meter, speed indicator)
- [x] 12.5 Implement stage transition system (fade-to-black for biome changes, boss entrance)
- [x] 12.6 Implement GameOverScreen with "GAME OVER" text and final score display
- [x] 12.7 Implement HighScoreTable with 10 placeholder entries and demo score insertion
- [x] 12.8 Implement seamless loop back to title screen
- [x] 12.9 Wire complete demo flow: title → fly-in → biome 1 → biome 2 → biome 3 → biome 4 → bosses → game over → high scores → title

## 13. Replay System

- [x] 13.1 Implement seeded PRNG (deterministic, same seed = same output)
- [x] 13.2 Implement input recorder (frame-level: direction + fire + weapon switch = 4 bits/frame)
- [x] 13.3 Implement input replay player (replay recorded sequence frame-by-frame)
- [x] 13.4 Implement desync detection (state hash comparison, fallback to live AI)
- [x] 13.5 Implement replay file serialization/deserialization (compact binary format)
- [ ] 13.6 Record initial "golden run" replay and embed as default demo

## 14. Performance Optimization

- [ ] 14.1 Profile rendering pipeline and optimize draw call batching
- [ ] 14.2 Verify zero GC pressure during gameplay (profile allocation hotspots)
- [ ] 14.3 Optimize spatial hash grid for cache-friendly access patterns
- [ ] 14.4 Implement particle system batch rendering
- [ ] 14.5 Verify 60 FPS stability on target desktop hardware
- [ ] 14.6 Memory usage audit (texture atlases, asset disposal, pool sizing)

## 15. Art and Asset Production

- [ ] 15.1 Create player ship sprite sheet (4 directions × 8 frames + engine flames + hit flash)
- [ ] 15.2 Create 20+ enemy sprite sheets (6 frames average per type)
- [ ] 15.3 Create 3 boss sprite sheets (20 frames average, including death sequences)
- [ ] 15.4 Create weapon projectile sprites (4 types × 3 power levels)
- [ ] 15.5 Create explosion sprite sheets (5 sizes × 6 frames)
- [ ] 15.6 Create power-up sprites (weapon, shield, speed)
- [ ] 15.7 Create 4 biome background tilesets (3–4 layers each)
- [ ] 15.8 Create particle effect sprites (sparks, debris, smoke, glow, shockwave)
- [ ] 15.9 Create UI sprites (HUD elements, title logo, high score table)

## 16. Integration and Polish

- [ ] 16.1 Run complete demo end-to-end and verify all transitions
- [ ] 16.2 Balance encounter pacing (difficulty curve, respites between intense sections)
- [ ] 16.3 Tune AI pilot behavior for demo presentation (showcase all weapons, close dodges)
- [ ] 16.4 Verify deterministic replay produces identical output across runs
- [ ] 16.5 Test on multiple display aspect ratios (4:3, 16:9, 16:10, 21:9)
- [ ] 16.6 Final audio mix balance (music, SFX, engine ambience levels)
- [x] 16.7 Document all configurable parameters in enemy/encounter JSON files
