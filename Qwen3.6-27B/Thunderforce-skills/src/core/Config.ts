/**
 * Game states for the attract mode demo
 */
export enum GameState {
  TITLE,
  INTRO,
  PLAYING,
  BOSS,
  GAME_OVER,
  HIGH_SCORE,
}

/**
 * Game configuration constants
 */
export const CONFIG = {
  WIDTH: 320,
  HEIGHT: 224,
  FPS: 60,
  FRAME_TIME: 1000 / 60,
  SCROLL_SPEED: 2.5,
  SCROLL_SPEED_FAST: 4.0,
  SCROLL_SPEED_BOSS: 0.5,
  WORLD_WIDTH: 48000,
  PLAYER_X: 64,
  PLAYER_Y_CENTER: 112,
  BULLET_SPEED: 8,
  ENEMY_BULLET_SPEED: 2.5,
  PICKUP_SPEED: 1.5,
  DEMO_DURATION: 180, // ~3 minutes in seconds
} as const;
