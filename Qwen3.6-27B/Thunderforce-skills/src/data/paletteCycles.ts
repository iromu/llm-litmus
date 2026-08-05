/**
 * Palette cycling definitions per biome.
 * Each biome defines which palette indices to cycle and how.
 *
 * Indices 17-20 are reserved for biome-specific cycling colors.
 * Indices 1-16 are used by sprite palettes (not cycled).
 */
import { PaletteCycleRule } from '../core/Renderer';

/**
 * Volcanic palette cycles: lava orange→red→yellow, ember glow
 */
export function volcanicCycleRules(): PaletteCycleRule[] {
  return [
    // Lava color: cycle between orange and red
    { index: 17, base: [255, 68, 0], speed: 60, hueRange: 20, satBoost: 0.1, brightOffset: 30 },
    // Lava glow: cycle between orange and yellow
    { index: 18, base: [255, 136, 0], speed: 45, hueRange: 15, satBoost: 0.15, brightOffset: 40 },
    // Ember: pulsating brightness
    { index: 19, base: [255, 0, 0], speed: 30, hueRange: 10, satBoost: 0.05, brightOffset: 50 },
    // Rock: subtle warm shift
    { index: 20, base: [102, 68, 51], speed: 90, hueRange: 8, satBoost: 0.05, brightOffset: 15 },
  ];
}

/**
 * City palette cycles: neon cyan→magenta→blue flicker
 */
export function cityCycleRules(): PaletteCycleRule[] {
  return [
    // Neon cyan: shift toward magenta
    { index: 17, base: [0, 255, 204], speed: 40, hueRange: 40, satBoost: 0.2, brightOffset: 20 },
    // Neon magenta: shift toward blue
    { index: 18, base: [255, 0, 255], speed: 35, hueRange: 30, satBoost: 0.15, brightOffset: 25 },
    // Cyan: subtle flicker
    { index: 19, base: [0, 255, 255], speed: 20, hueRange: 15, satBoost: 0.1, brightOffset: 35 },
    // Steel: cool blue shift
    { index: 20, base: [136, 153, 170], speed: 80, hueRange: 10, satBoost: 0.05, brightOffset: 10 },
  ];
}

/**
 * Asteroid palette cycles: star white→blue→white twinkle
 */
export function asteroidCycleRules(): PaletteCycleRule[] {
  return [
    // Star white: shift to blue-white
    { index: 17, base: [255, 255, 255], speed: 25, hueRange: 20, satBoost: 0.1, brightOffset: 0 },
    // Off-white: subtle blue tint
    { index: 18, base: [204, 204, 204], speed: 50, hueRange: 15, satBoost: 0.08, brightOffset: 10 },
    // Asteroid: warm/cool shift
    { index: 19, base: [119, 102, 85], speed: 70, hueRange: 12, satBoost: 0.05, brightOffset: 15 },
    // Gray: subtle twinkle
    { index: 20, base: [136, 136, 136], speed: 30, hueRange: 10, satBoost: 0.05, brightOffset: 20 },
  ];
}

/**
 * Organic palette cycles: green→lime→teal pulse, flesh tone shifts
 */
export function organicCycleRules(): PaletteCycleRule[] {
  return [
    // Neon green: pulse between green and lime
    { index: 17, base: [136, 255, 0], speed: 35, hueRange: 25, satBoost: 0.2, brightOffset: 30 },
    // Green: shift toward teal
    { index: 18, base: [0, 255, 0], speed: 50, hueRange: 30, satBoost: 0.15, brightOffset: 20 },
    // Flesh: subtle red shift
    { index: 19, base: [170, 68, 68], speed: 60, hueRange: 15, satBoost: 0.1, brightOffset: 25 },
    // Organic: pulse
    { index: 20, base: [68, 170, 68], speed: 45, hueRange: 20, satBoost: 0.1, brightOffset: 20 },
  ];
}
