/**
 * Entry point: initialize and start the game
 */
import { Game } from './Game';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const game = new Game(canvas);

// Expose game instance for testing
(canvas as any)._game = game;

// Start the game loop
game.start();

// Initialize audio on first user interaction
document.addEventListener('click', () => {
  game.tryInitAudio();
}, { once: true });

document.addEventListener('keydown', () => {
  game.tryInitAudio();
}, { once: true });
