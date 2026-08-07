---
name: Screen Flow
description: Title, Game, Game Over, and High Score screens with fade-to-black transitions
type: flow
updated_at: 2026-08-07
last_commit: 68f5446a55b8d17afc76fe48b10d6a6b27edc5e6
language: en
---

# Screen Flow

## Screen Sequence

The game loops through four screens in a fixed cycle:

```
TitleScreen → GameScreen → GameOverScreen → HighScoreScreen → TitleScreen (loop)
```

Transitions are managed by `ScreenManager` with fade-to-black overlays.

## TitleScreen

- Animated starfield background
- Pulsing logo
- "PRESS START" blink prompt
- Auto-starts after 8 seconds of inactivity
- Manual start on Space, Enter, or touch
- Transitions to GameScreen on trigger

## GameScreen

Main gameplay screen. Manages:

- All entity arrays (weapons, enemies, bullets, projectiles, power-ups)
- AI pilot steering
- Collision detection
- Particle system
- Parallax scrolling
- Screen shake
- Biome transitions (every 30 seconds)
- Timer-based enemy spawning
- Boss encounters
- Game over trigger (lives = 0)

## GameOverScreen

- Displays "GAME OVER" with final score
- Auto-transitions to HighScoreScreen after 3 seconds
- Manual transition on Space, Enter, or touch

## HighScoreScreen

- 10-entry high score table
- Placeholder entries with default names
- Demo score inserted in correct rank position
- Auto-loops back to TitleScreen after 5 seconds

## ScreenManager

Manages screen transitions with fade-to-black:

### Fade Overlay

- 1×1 white texture stretched to full screen with black color
- Fade in → Fade out cycle
- Configurable duration
- Alpha blended over current screen

### Stack Management

```java
screenManager.push(newScreen, fadeDuration);  // Push with fade
screenManager.pop(dispose);                    // Pop current
screenManager.replace(newScreen, fadeDuration); // Pop + push
```

### Lifecycle

- `show()` → New screen activated
- `pause()` → Current screen paused (on push)
- `resume()` → Previous screen resumed (on pop)
- `hide()` → Screen deactivated
- `dispose()` → Screen resources freed
