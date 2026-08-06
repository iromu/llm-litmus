## Purpose

Attract-mode presentation system providing the complete demo loop: animated title screen, AI-piloted gameplay demonstration, stage transitions, HUD, game over screen, and high score table with seamless looping.

## ADDED Requirements

### Requirement: Animated title screen
The title screen SHALL display an animated game logo with a scrolling background, "PRESS START" prompt, and copyright text, looping until the demo auto-starts or the player presses start.

#### Scenario: Auto-start after timer
- **WHEN** the title screen is displayed for 8 seconds
- **THEN** the demo automatically begins without player input

### Requirement: Complete demo loop
The attract mode SHALL cycle through: title screen → cinematic fly-in → 4 biome segments with encounters → 3 boss fights → game over screen → high score table → title screen, with seamless transitions.

#### Scenario: Seamless loop back to title
- **WHEN** the high score table display completes
- **THEN** the game transitions back to the title screen without a hard reset

### Requirement: HUD with score and weapon display
The gameplay HUD SHALL display the current score (right-aligned), active weapon icon and power level (bottom-left), shield meter (bottom-center), and speed boost indicator (bottom-right).

#### Scenario: Score updates on enemy kill
- **WHEN** the AI pilot destroys an enemy worth 100 points
- **THEN** the score display increments and briefly flashes

### Requirement: Stage transitions
Transitions between biomes and boss encounters SHALL use cinematic transitions: fade-to-black for biome changes, scrolling pause with boss entrance animation for boss fights.

#### Scenario: Biome transition with fade
- **WHEN** the game transitions from volcanic canyon to futuristic city
- **THEN** the screen fades to black over 500ms and fades in the city biome

### Requirement: Game over screen with score
The game over screen SHALL display "GAME OVER" text, final score, and a brief pause before transitioning to the high score table.

#### Scenario: Game over displays final score
- **WHEN** the demo concludes
- **THEN** "GAME OVER" appears with the final score of 125,400 points

### Requirement: High score table
The high score table SHALL display 10 placeholder scores with 3-letter initials, with the demo run's score inserted at the appropriate rank position.

#### Scenario: Demo score inserted into table
- **WHEN** the high score table appears after the demo
- **THEN** the demo score is inserted at the correct rank with initials "DEMO"
