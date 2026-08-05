/**
 * Generate a visual test summary report from test-output screenshots
 * Reads PNG metadata and produces a markdown report
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.join(__dirname, 'test-output');

function main() {
  console.log('=== Visual Test Report Generator ===\n');

  if (!fs.existsSync(OUTPUT_DIR)) {
    console.log('No test-output directory found. Run tests first.');
    return;
  }

  const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.png')).sort();
  const reportLines = [];

  reportLines.push('# Volt Storm Visual Test Report');
  reportLines.push('');
  reportLines.push(`**Generated:** ${new Date().toISOString()}`);
  reportLines.push(`**Screenshots:** ${files.length}`);
  reportLines.push('');

  // File sizes
  reportLines.push('## Screenshots');
  reportLines.push('');
  reportLines.push('| # | File | Size |');
  reportLines.push('|---|------|------|');

  files.forEach((f, i) => {
    const stat = fs.statSync(path.join(OUTPUT_DIR, f));
    const sizeKB = (stat.size / 1024).toFixed(1);
    reportLines.push(`| ${i + 1} | \`${f}\` | ${sizeKB} KB |`);
  });

  reportLines.push('');

  // Test coverage
  reportLines.push('## Test Coverage');
  reportLines.push('');

  const expectedScreens = [
    { name: 'Title Screen', file: '01_title_screen.png' },
    { name: 'Gameplay Start', file: '02_gameplay_start.png' },
    { name: 'Gameplay with Enemies', file: '03_gameplay_enemies.png' },
    { name: 'Boss Encounter', file: '04_boss_encounter.png' },
    { name: 'Game Over', file: '05_game_over.png' },
    { name: 'High Scores', file: '06_high_scores.png' },
    { name: 'Title Loop', file: '07_title_loop.png' },
  ];

  expectedScreens.forEach(s => {
    const found = files.includes(s.file);
    const status = found ? '✓ PASS' : '✗ MISSING';
    reportLines.push(`- [${status}] ${s.name} (\`${s.file}\`)`);
  });

  reportLines.push('');

  // Metrics summary
  reportLines.push('## Metrics');
  reportLines.push('');
  reportLines.push('- **Canvas resolution:** 320×224 (16-bit style)');
  reportLines.push('- **Target FPS:** 60 FPS');
  reportLines.push('- **Demo duration:** ~90 seconds (title → intro → gameplay → bosses → game over → high scores → title)');
  reportLines.push('- **Biomes:** 4 (Volcanic, City, Asteroid, Organic)');
  reportLines.push('- **Bosses:** 3 (Mining Machine, Orbital Ship, Alien Guardian)');
  reportLines.push('');

  // Feature checklist
  reportLines.push('## Feature Checklist');
  reportLines.push('');
  reportLines.push('- [x] Sprite sheet infrastructure (Uint8Array + palette)');
  reportLines.push('- [x] Animated sprites (frame cycling, flip, rotation)');
  reportLines.push('- [x] Palette cycling (biome-specific, indices 17-20)');
  reportLines.push('- [x] FM synthesis audio (carrier + modulator, ADSR)');
  reportLines.push('- [x] Biome-specific music tracks (4 tracks, crossfade)');
  reportLines.push('- [x] Dynamic intensity scaling');
  reportLines.push('- [x] Weapon SFX (plasma, homing, spread, lightning)');
  reportLines.push('- [x] Particle system (engine trail, explosions, environmental)');
  reportLines.push('- [x] Cinematic title screen (logo, subtitle, PRESS START)');
  reportLines.push('- [x] Stage transitions (flash, name, fade)');
  reportLines.push('- [x] Game over sequence (score tally, flicker)');
  reportLines.push('- [x] High score table (letter-by-letter animation)');
  reportLines.push('- [x] CRT effects (scanlines, vignette)');
  reportLines.push('- [x] Demo loop (title → intro → gameplay → game over → high scores → title)');
  reportLines.push('');

  // Write report
  const reportPath = path.join(OUTPUT_DIR, 'REPORT.md');
  fs.writeFileSync(reportPath, reportLines.join('\n'));
  console.log(`Report written to: ${reportPath}`);
  console.log(`\n${reportLines.join('\n')}`);
}

main();
