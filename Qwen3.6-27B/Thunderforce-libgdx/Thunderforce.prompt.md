Create a complete playable attract-mode demo for a 16-bit era horizontal scrolling shoot-'em-up inspired by the gameplay feel, pacing, and spectacle of Thunder Force IV, but using entirely original artwork, music, enemies, names, and level design.

Visual Style
Authentic 16-bit pixel art.
Resolution: 320×224.
60 FPS.
Rich color palette with dramatic gradients.
Massive multi-layer parallax scrolling (6–10 layers).
Dynamic lighting effects using palette cycling.
Large animated backgrounds.
Sprite scaling and rotation effects where appropriate.
CRT-era aesthetic.
Level
Demo lasts approximately 2½–3 minutes.
Starts with a cinematic fly-in.
Travels through several distinct biomes:
volcanic canyon
futuristic city
asteroid field
alien organic fortress
Smooth camera movement.
Constant forward scrolling with occasional speed changes.
Numerous scripted environmental events.
Gameplay
AI controls the player's ship.
Ship performs expert-level evasive maneuvers.
Never appears scripted; reacts dynamically.
Demonstrates advanced techniques:
weaving through bullet curtains
close dodges
strategic positioning
weapon switching
speed adjustments
Avoids collisions naturally.
Weapons

Design four original weapons:

rapid plasma stream
homing energy drones
wide laser spread
penetrating lightning beam

Include:

weapon pickups
power levels
shield pickups
speed upgrades
Enemies

Create 20+ original enemy types:

small fighters
walkers
heavy cruisers
mechanical insects
missile carriers
armored gunships
biomechanical organisms

Every enemy should have:

unique attack patterns
original sprite animations
distinctive explosions
Bosses

Include three original bosses:

Boss 1:

gigantic mining machine
multiple destructible sections

Boss 2:

transforming orbital battleship
rotating weapon arrays

Boss 3:

biomechanical alien guardian
multiple phases
dramatic destruction sequence
Bullet Patterns
Dense but readable.
Spirals.
Sweeps.
Directed spreads.
Homing projectiles.
Lasers.
Area denial attacks.
Effects

Showcase:

hundreds of simultaneous sprites
screen-filling explosions
particle systems
debris
smoke
heat distortion
shockwaves
animated clouds
sparks
glowing energy effects
Sound

Compose an original soundtrack inspired by energetic early-1990s FM synth and rock fusion, without imitating any existing melodies.

Include:

dynamic music transitions
weapon sounds
engine audio
explosions
environmental ambience
Demo Presentation

Include an attract-mode sequence:

animated title screen
"PRESS START"
AI gameplay
stage transitions
score counter
power-up demonstration
boss fights
"GAME OVER"
high-score table
seamless loop back to the title screen
Technical Goals
Stable 60 FPS.
Smooth scrolling.
Deterministic gameplay.
Modular architecture.
Data-driven enemy scripting.
Replay system support.
Clean object-oriented code.
Well-documented source.
Originality Requirements

The game should evoke the excitement, speed, technical ambition, and cinematic presentation of classic 16-bit horizontal shooters while remaining entirely original. Do not copy any copyrighted sprites, music, character designs, enemy designs, level layouts, names, logos, dialogue, or specific gameplay sequences from Thunder Force IV or any other commercial game. The result should feel like a spiritual successor rather than a remake.



Development Process

Build each major system sequentially in the following order:

Core engine and rendering
Camera, scrolling, and parallax backgrounds
Player ship physics and controls
Weapon systems and power-up mechanics
Enemy framework and AI behaviors
Enemy formations and scripted encounters
Bullet system and collision detection
Particle systems and visual effects
Environmental animations and stage events
Boss framework and multi-phase boss battles
Sound effects and dynamic music
HUD, scoring, and attract-mode presentation
Performance optimization and memory management
Final gameplay balancing and polish

For each system:

Fully implement the system before beginning the next one.
Create automated tests where applicable.
Validate that the implementation integrates cleanly with all previously completed systems.
Document design decisions and expose configurable parameters.
Independent Review Cycle

After completing each system, spawn one separate review agent whose sole responsibility is to critique the result.

The review agent must:

Never be the same agent that implemented the system.
Have no access to the implementation details or source code.
Evaluate only the observable behavior, visuals, audio, responsiveness, and player experience.
Compare the result against the highest-quality 16-bit arcade and console shooters of the early 1990s.
Judge whether the implementation captures the visual richness, responsiveness, spectacle, and polish expected from a flagship commercial release of that era.
Identify every weakness, inconsistency, missing animation, repetitive pattern, visual artifact, gameplay issue, or performance problem.
Assign a score from 1–10 for:
Visual quality
Animation
Gameplay feel
Technical polish
Authentic 16-bit presentation
Overall quality

If any category scores below 9.5/10, continue iterating on that system until every category reaches at least 9.5.

Only after the review agent approves may development proceed to the next system.

Continuous Integration

After every completed system:

Run the complete demo.
Verify there are no regressions.
Confirm frame pacing remains stable at 60 FPS.
Verify memory usage stays within target limits.
Ensure all previous systems continue functioning correctly.

If any regression is detected, resolve it before continuing.

Final Quality Pass

When every system has been completed, spawn three independent expert review agents:

Gameplay Critic — evaluates pacing, challenge, enemy encounters, weapon balance, boss fights, and overall fun.
Art Director — evaluates pixel art, animation quality, effects, readability, parallax, color palette, and visual cohesion.
Technical Director — evaluates performance, architecture, frame timing, memory usage, determinism, and maintainability.

These reviewers must work independently and must not share information.

Each reviewer should compare the final result against the best original 16-bit horizontal shooters of the era and provide a detailed critique.

Continue refining the demo until all three reviewers independently agree that:

The visuals are indistinguishable from a top-tier commercial 16-bit shooter.
The gameplay feels fast, responsive, and expertly tuned.
Every animation appears handcrafted.
Boss encounters are cinematic and memorable.
The scrolling, parallax, effects, and explosions create a constant sense of spectacle.
The entire attract-mode demo could convincingly be mistaken for a lost flagship arcade or Mega Drive release from the golden age of scrolling shooters.

Do not stop at "working." Continue iterating until every aspect demonstrates the craftsmanship, polish, and presentation quality expected from a legendary 16-bit shoot-'em-up, while remaining entirely original and avoiding any copyrighted assets, names, artwork, music, or level designs.
