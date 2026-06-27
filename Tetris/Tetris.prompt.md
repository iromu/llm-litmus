# Tetris

  A neon-themed Tetris clone built in a single HTML file with Canvas API.

## Architecture
- **Single-file app**: All HTML, CSS, and JavaScript in `index.html`
- **Canvas-based rendering**: Custom block rendering with glow effects, scanlines, and vignette
- **Game loop**: `requestAnimationFrame`-driven with delta-time drop logic
- **State machine**: Start → Playing → Paused → Game Over

## Core Systems

### Board
- 10 columns × 20 rows grid
- Each cell stores a piece type letter (I, O, T, S, Z, J, L) or null
- Locked pieces become permanent board state

  ### Pieces
- 7 standard Tetris tetrominoes with defined cell offsets
- Rotation via 90° clockwise matrix transform with wall kicks
- Ghost piece shows landing position (15% opacity)
- Hard drop on Space with particle burst

  ### Scoring
- Soft drop: 1 point per row
- Hard drop: 2 points per row
- Line clears: 100/300/500/800 × level for 1/2/3/4 lines
- Combo bonus: +50 × combo × level for consecutive clears
- Level increases every 10 lines, speed increases accordingly

### Rendering Pipeline
1. Background: animated starfield on separate canvas
2. Board: grid lines + locked blocks with gradient fills and neon edges
3. Ghost piece: 15% opacity preview
4. Current piece: full-color blocks
5. Particles: glow + white core, physics-based
6. Post-processing: flash, scanlines, vignette
7. Screen shake on line clears

### Particles
- Block particles: spawn on line clear from each cleared cell
- Hard drop burst: spawn on hard drop
- Physics: velocity, gravity, decay, size fade
- Glow effect via canvas shadowBlur

## Controls
- **←/→**: Move left/right
- **↑**: Rotate (with wall kicks)
- **↓**: Soft drop
- **Space**: Hard drop
- **P**: Pause/unpause

## Visual Style
- Neon glow aesthetic with colored blocks
- CRT-style scanlines overlay
- Vignette darkening at edges
- Starfield background with pulsing stars
- Screen shake on line clears
- White flash on line clears (intensity scales with lines cleared)
