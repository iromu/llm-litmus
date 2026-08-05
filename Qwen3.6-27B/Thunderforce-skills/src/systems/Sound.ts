/**
 * FM Synthesis sound system for 16-bit style audio.
 * Carrier + modulator oscillator chains with ADSR envelopes.
 * Biome-specific music tracks with dynamic intensity scaling.
 */
import { Biome } from '../systems/Parallax';

/**
 * Sound effect types
 */
export enum SFX {
  PLASMA_SHOT,
  HOMING_SHOT,
  SPREAD_SHOT,
  LIGHTNING_SHOT,
  ENEMY_EXPLOSION,
  BOSS_EXPLOSION,
  PICKUP,
  SHIELD_BREAK,
  PLAYER_HIT,
  LASER,
  MISSILE,
  ENGINE,
}

/**
 * ADSR envelope configuration
 */
interface ADSR {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

/**
 * FM operator configuration
 */
interface FMOperator {
  frequency: number;
  ratio: number;       // Modulator ratio relative to carrier
  index: number;       // Modulation index (depth)
  adsr: ADSR;
  waveform: OscillatorType;
}

/**
 * Biome music track definition
 */
interface BiomeTrack {
  bpm: number;
  key: number;         // Root frequency
  scale: number[];     // Scale intervals (semitones from root)
  bassPattern: number[];  // Bass note indices into scale
  leadPattern: number[];  // Lead note indices (0 = rest)
  drumPattern: number[];  // Drum pattern flags
  fmRatio: number;     // FM ratio for lead
  fmIndex: number;     // FM index for lead
  mood: 'aggressive' | 'electronic' | 'spacious' | 'sinister';
}

/**
 * FM Synthesis Sound System
 */
export class SoundSystem {
  private ctx: AudioContext | null = null;
  private enabled: boolean = false;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  // Music state
  private musicPlaying: boolean = false;
  private currentBeat: number = 0;
  private beatTimer: number = 0;
  private beatInterval: number = 60 / 160;

  // Biome music
  private currentBiome: Biome = Biome.VOLCANIC;
  private targetBiome: Biome = Biome.VOLCANIC;
  private crossfadeTimer: number = 0;
  private crossfadeDuration: number = 2.0; // seconds
  private oldMusicGain: GainNode | null = null;

  // Active music voices (for crossfade cleanup)
  private activeVoices: { stop: () => void }[] = [];

  // Biome track definitions
  private biomeTracks: Record<Biome, BiomeTrack> = {
    [Biome.VOLCANIC]: {
      bpm: 170,
      key: 55, // A1
      scale: [0, 3, 5, 7, 10, 12, 15, 17], // Harmonic minor
      bassPattern: [0, 0, 3, 3, 4, 4, 5, 5, 0, 0, 7, 7, 3, 3, 5, 5],
      leadPattern: [7, 0, 8, 0, 6, 0, 5, 0, 0, 7, 0, 6, 0, 5, 0, 4],
      drumPattern: [1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 3, 0],
      fmRatio: 3,
      fmIndex: 4,
      mood: 'aggressive',
    },
    [Biome.CITY]: {
      bpm: 140,
      key: 65.41, // C2
      scale: [0, 2, 4, 5, 7, 9, 11, 12], // Dorian
      bassPattern: [0, 0, 0, 0, 4, 4, 4, 4, 2, 2, 2, 2, 5, 5, 7, 7],
      leadPattern: [9, 0, 7, 0, 5, 0, 4, 0, 7, 0, 9, 0, 12, 0, 11, 0],
      drumPattern: [1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 0],
      fmRatio: 2,
      fmIndex: 2,
      mood: 'electronic',
    },
    [Biome.ASTEROID]: {
      bpm: 110,
      key: 73.42, // D2
      scale: [0, 2, 4, 7, 9, 11, 14, 16], // D major
      bassPattern: [0, 0, 0, 0, 3, 3, 3, 3, 4, 4, 4, 4, 0, 0, 0, 0],
      leadPattern: [9, 0, 0, 7, 0, 4, 0, 0, 7, 0, 0, 9, 0, 11, 0, 0],
      drumPattern: [1, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0],
      fmRatio: 1.5,
      fmIndex: 1.5,
      mood: 'spacious',
    },
    [Biome.ORGANIC]: {
      bpm: 125,
      key: 82.41, // E1
      scale: [0, 1, 3, 5, 7, 8, 10, 12], // Whole tone + chromatic
      bassPattern: [0, 0, 1, 1, 3, 3, 5, 5, 7, 7, 8, 8, 10, 10, 12, 12],
      leadPattern: [10, 0, 8, 0, 7, 0, 5, 0, 3, 0, 1, 0, 0, 0, 3, 0],
      drumPattern: [1, 0, 2, 0, 1, 2, 1, 0, 2, 1, 0, 2, 1, 0, 2, 1],
      fmRatio: 2.5,
      fmIndex: 3,
      mood: 'sinister',
    },
  };

  /**
   * Initialize audio context (must be called from user gesture)
   */
  init(): void {
    if (this.ctx) return;
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.25;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.5;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.15;
      this.musicGain.connect(this.masterGain);

      this.enabled = true;
    } catch (e) {
      console.warn('Web Audio API not available');
    }
  }

  /**
   * Play a sound effect using FM synthesis
   */
  play(sfx: SFX): void {
    if (!this.enabled || !this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    switch (sfx) {
      case SFX.PLASMA_SHOT:
        this.playFMShot(now, 880, 2, 3, 0.08);
        break;
      case SFX.HOMING_SHOT:
        this.playFMSwept(now, 600, 900, 1.5, 2, 0.12);
        break;
      case SFX.SPREAD_SHOT:
        this.playFMTriple(now, 500, 3, 1.5, 0.1);
        break;
      case SFX.LIGHTNING_SHOT:
        this.playNoiseBurst(now, 0.1, 2000, 0.3);
        break;
      case SFX.ENEMY_EXPLOSION:
        this.playFMExplosion(now, 0.2, 200);
        break;
      case SFX.BOSS_EXPLOSION:
        this.playFMExplosion(now, 0.5, 80);
        break;
      case SFX.PICKUP:
        this.playFMChord(now, [523.25, 659.25, 783.99], 0.15);
        break;
      case SFX.SHIELD_BREAK:
        this.playFMDive(now, 1200, 200, 0.2);
        break;
      case SFX.PLAYER_HIT:
        this.playFMHit(now, 400, 0.3);
        break;
      case SFX.LASER:
        this.playFMLaser(now, 150, 0.3);
        break;
      case SFX.MISSILE:
        this.playFMDive(now, 300, 150, 0.2);
        break;
    }
  }

  /**
   * Update music playback
   */
  update(dt: number, intensity: number = 0.5): void {
    if (!this.enabled || !this.ctx || !this.musicGain) return;

    // Handle biome crossfade
    if (this.currentBiome !== this.targetBiome) {
      this.crossfadeTimer += dt;
      const progress = this.crossfadeTimer / this.crossfadeDuration;

      if (this.oldMusicGain) {
        this.oldMusicGain.gain.value = Math.max(0, 0.15 - progress * 0.15);
      }
      this.musicGain.gain.value = Math.min(0.15, progress * 0.15);

      if (progress >= 1) {
        this.currentBiome = this.targetBiome;
        if (this.oldMusicGain) {
          this.oldMusicGain.disconnect();
          this.oldMusicGain = null;
        }
        this.crossfadeTimer = 0;
      }
    }

    // Update beat timing based on current biome BPM
    const track = this.biomeTracks[this.targetBiome];
    this.beatInterval = 60 / track.bpm;

    this.beatTimer += dt;
    if (this.beatTimer >= this.beatInterval) {
      this.beatTimer -= this.beatInterval;
      this.playBiomeBeat(this.currentBeat, intensity);
      this.currentBeat = (this.currentBeat + 1) % track.bassPattern.length;
    }
  }

  /**
   * Set the current biome for music
   */
  setBiome(biome: Biome): void {
    if (biome === this.targetBiome) return;

    // Start crossfade
    this.oldMusicGain = this.musicGain;
    this.musicGain = this.ctx?.createGain() ?? null;
    if (this.musicGain && this.masterGain) {
      this.musicGain.gain.value = 0;
      this.musicGain.connect(this.masterGain);
    }

    this.currentBiome = this.targetBiome;
    this.targetBiome = biome;
    this.crossfadeTimer = 0;
    this.currentBeat = 0;
    this.beatTimer = 0;
  }

  /**
   * Start/stop music
   */
  startMusic(): void {
    this.musicPlaying = true;
    this.currentBeat = 0;
    this.beatTimer = 0;
  }

  stopMusic(): void {
    this.musicPlaying = false;
  }

  /**
   * Set music intensity (0-1, affects volume and complexity)
   */
  setIntensity(intensity: number): void {
    if (this.musicGain) {
      this.musicGain.gain.value = 0.05 + intensity * 0.15;
    }
  }

  // ===== FM Synthesis Sound Effects =====

  /**
   * FM shot: carrier + modulator with quick envelope
   */
  private playFMShot(
    now: number, carrierFreq: number, ratio: number, index: number, duration: number
  ): void {
    if (!this.ctx || !this.sfxGain) return;

    const carrier = this.ctx.createOscillator();
    const modulator = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const envelope = this.ctx.createGain();

    carrier.type = 'square';
    carrier.frequency.value = carrierFreq;

    modulator.type = 'sine';
    modulator.frequency.value = carrierFreq * ratio;

    modGain.gain.value = carrierFreq * index;

    envelope.gain.setValueAtTime(0.3, now);
    envelope.gain.exponentialRampToValueAtTime(0.01, now + duration);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(envelope);
    envelope.connect(this.sfxGain);

    modulator.start(now);
    carrier.start(now);
    modulator.stop(now + duration);
    carrier.stop(now + duration);
  }

  /**
   * FM swept shot: frequency ramp with modulation
   */
  private playFMSwept(
    now: number, startFreq: number, endFreq: number, ratio: number, index: number, duration: number
  ): void {
    if (!this.ctx || !this.sfxGain) return;

    const carrier = this.ctx.createOscillator();
    const modulator = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const envelope = this.ctx.createGain();

    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(startFreq, now);
    carrier.frequency.linearRampToValueAtTime(endFreq, now + duration);

    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(startFreq * ratio, now);
    modulator.frequency.linearRampToValueAtTime(endFreq * ratio, now + duration);

    modGain.gain.value = startFreq * index;

    envelope.gain.setValueAtTime(0.2, now);
    envelope.gain.exponentialRampToValueAtTime(0.01, now + duration);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(envelope);
    envelope.connect(this.sfxGain);

    modulator.start(now);
    carrier.start(now);
    modulator.stop(now + duration);
    carrier.stop(now + duration);
  }

  /**
   * FM triple shot: three rapid FM shots
   */
  private playFMTriple(
    now: number, baseFreq: number, ratio: number, index: number, duration: number
  ): void {
    for (let i = 0; i < 3; i++) {
      const offset = i * 0.01;
      this.playFMShot(now + offset, baseFreq + i * 100, ratio, index, duration);
    }
  }

  /**
   * Noise burst (for lightning, explosions)
   */
  private playNoiseBurst(now: number, duration: number, filterFreq: number, volume: number): void {
    if (!this.ctx || !this.sfxGain) return;

    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = filterFreq;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    source.start(now);
  }

  /**
   * FM explosion: noise + low FM tone
   */
  private playFMExplosion(now: number, duration: number, startFreq: number): void {
    // Noise component
    this.playNoiseBurst(now, duration, startFreq, 0.4);

    // FM tone component
    if (!this.ctx || !this.sfxGain) return;

    const carrier = this.ctx.createOscillator();
    const modulator = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const envelope = this.ctx.createGain();

    carrier.type = 'sawtooth';
    carrier.frequency.setValueAtTime(startFreq, now);
    carrier.frequency.exponentialRampToValueAtTime(30, now + duration);

    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(startFreq * 0.5, now);
    modulator.frequency.exponentialRampToValueAtTime(15, now + duration);

    modGain.gain.value = startFreq * 0.3;

    envelope.gain.setValueAtTime(0.3, now);
    envelope.gain.exponentialRampToValueAtTime(0.01, now + duration);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(envelope);
    envelope.connect(this.sfxGain);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(startFreq, now);
    filter.frequency.exponentialRampToValueAtTime(50, now + duration);
    envelope.disconnect();
    envelope.connect(filter);
    filter.connect(this.sfxGain);

    modulator.start(now);
    carrier.start(now);
    modulator.stop(now + duration);
    carrier.stop(now + duration);
  }

  /**
   * FM chord: ascending notes for pickups
   */
  private playFMChord(now: number, frequencies: number[], noteDuration: number): void {
    if (!this.ctx || !this.sfxGain) return;
    const ctx = this.ctx;
    const sfxGain = this.sfxGain;

    frequencies.forEach((freq, i) => {
      const t = now + i * 0.05;

      const carrier = ctx.createOscillator();
      const modulator = ctx.createOscillator();
      const modGain = ctx.createGain();
      const envelope = ctx.createGain();

      carrier.type = 'square';
      carrier.frequency.value = freq;

      modulator.type = 'sine';
      modulator.frequency.value = freq * 2;
      modGain.gain.value = freq * 1;

      envelope.gain.setValueAtTime(0.15, t);
      envelope.gain.exponentialRampToValueAtTime(0.01, t + noteDuration);

      modulator.connect(modGain);
      modGain.connect(carrier.frequency);
      carrier.connect(envelope);
      envelope.connect(sfxGain);

      modulator.start(t);
      carrier.start(t);
      modulator.stop(t + noteDuration);
      carrier.stop(t + noteDuration);
    });
  }

  /**
   * FM dive bomb: descending frequency
   */
  private playFMDive(now: number, startFreq: number, endFreq: number, duration: number): void {
    if (!this.ctx || !this.sfxGain) return;

    const carrier = this.ctx.createOscillator();
    const modulator = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const envelope = this.ctx.createGain();

    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(startFreq, now);
    carrier.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(startFreq * 1.5, now);
    modulator.frequency.exponentialRampToValueAtTime(endFreq * 1.5, now + duration);

    modGain.gain.value = startFreq * 0.5;

    envelope.gain.setValueAtTime(0.25, now);
    envelope.gain.exponentialRampToValueAtTime(0.01, now + duration);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(envelope);
    envelope.connect(this.sfxGain);

    modulator.start(now);
    carrier.start(now);
    modulator.stop(now + duration);
    carrier.stop(now + duration);
  }

  /**
   * FM hit: harsh descending sawtooth + noise
   */
  private playFMHit(now: number, startFreq: number, duration: number): void {
    if (!this.ctx || !this.sfxGain) return;

    // FM tone
    const carrier = this.ctx.createOscillator();
    const modulator = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const envelope = this.ctx.createGain();

    carrier.type = 'sawtooth';
    carrier.frequency.setValueAtTime(startFreq, now);
    carrier.frequency.exponentialRampToValueAtTime(80, now + duration);

    modulator.type = 'square';
    modulator.frequency.setValueAtTime(startFreq * 2.7, now);
    modulator.frequency.exponentialRampToValueAtTime(50, now + duration);

    modGain.gain.value = startFreq * 0.8;

    envelope.gain.setValueAtTime(0.25, now);
    envelope.gain.exponentialRampToValueAtTime(0.01, now + duration);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(envelope);
    envelope.connect(this.sfxGain);

    modulator.start(now);
    carrier.start(now);
    modulator.stop(now + duration);
    carrier.stop(now + duration);

    // Noise burst
    this.playNoiseBurst(now, duration * 0.5, 400, 0.2);
  }

  /**
   * FM laser: sustained low FM tone
   */
  private playFMLaser(now: number, freq: number, duration: number): void {
    if (!this.ctx || !this.sfxGain) return;

    const carrier = this.ctx.createOscillator();
    const modulator = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const envelope = this.ctx.createGain();

    carrier.type = 'sawtooth';
    carrier.frequency.setValueAtTime(freq, now);
    carrier.frequency.linearRampToValueAtTime(freq * 0.7, now + duration);

    modulator.type = 'sine';
    modulator.frequency.value = freq * 4;
    modGain.gain.value = freq * 1.5;

    envelope.gain.setValueAtTime(0.15, now);
    envelope.gain.setValueAtTime(0.15, now + duration * 0.8);
    envelope.gain.exponentialRampToValueAtTime(0.01, now + duration);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(envelope);
    envelope.connect(this.sfxGain);

    modulator.start(now);
    carrier.start(now);
    modulator.stop(now + duration);
    carrier.stop(now + duration);
  }

  // ===== Biome Music Synthesis =====

  /**
   * Play a single beat for the current biome track
   */
  private playBiomeBeat(beat: number, intensity: number): void {
    if (!this.ctx || !this.musicGain || !this.musicPlaying) return;

    const track = this.biomeTracks[this.targetBiome];
    const now = this.ctx.currentTime;
    const beatLen = this.beatInterval;

    // Bass line (FM synthesized)
    const bassIdx = track.bassPattern[beat];
    const bassFreq = this.noteFromScale(track.key, track.scale, bassIdx);
    this.playFMBass(now, bassFreq, beatLen * 0.8, track.mood);

    // Lead melody (FM with biome-specific ratio/index)
    if (beat % 2 === 0 && intensity > 0.3) {
      const leadIdx = track.leadPattern[Math.floor(beat / 2) % track.leadPattern.length];
      if (leadIdx > 0) {
        const leadFreq = this.noteFromScale(track.key * 8, track.scale, leadIdx - 1);
        this.playFMLead(now, leadFreq, beatLen * 0.6, track.fmRatio, track.fmIndex, track.mood);
      }
    }

    // Harmony layer (only at higher intensity)
    if (intensity > 0.6 && beat % 4 === 0) {
      const harmIdx = track.bassPattern[beat] + 4; // Fifth above
      const harmFreq = this.noteFromScale(track.key * 2, track.scale, harmIdx % track.scale.length);
      this.playFMLead(now, harmFreq, beatLen * 1.8, track.fmRatio * 0.5, track.fmIndex * 0.3, track.mood);
    }

    // Drums
    const drumFlag = track.drumPattern[beat % track.drumPattern.length];
    if (drumFlag === 1) this.playKick(now);
    else if (drumFlag === 2) this.playSnare(now);
    else if (drumFlag === 3) { this.playKick(now); this.playSnare(now); }

    // Hi-hat (every beat, quieter on off-beats)
    this.playHiHat(now, beat % 2 === 0 ? 0.08 : 0.04);
  }

  /**
   * Calculate frequency from scale index
   */
  private noteFromScale(rootFreq: number, scale: number[], index: number): number {
    const semitones = scale[index % scale.length];
    return rootFreq * Math.pow(2, semitones / 12);
  }

  /**
   * FM bass: thick low-end with subtle modulation
   */
  private playFMBass(now: number, freq: number, duration: number, mood: string): void {
    if (!this.ctx || !this.musicGain) return;

    const carrier = this.ctx.createOscillator();
    const modulator = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const envelope = this.ctx.createGain();

    carrier.type = mood === 'aggressive' ? 'sawtooth' : 'square';
    carrier.frequency.value = freq;

    modulator.type = 'sine';
    modulator.frequency.value = freq * 1.25;
    modGain.gain.value = freq * 0.3;

    // ADSR: fast attack, medium decay, high sustain, fast release
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(0.12, now + 0.02); // Attack
    envelope.gain.linearRampToValueAtTime(0.08, now + 0.1);  // Decay
    envelope.gain.setValueAtTime(0.08, now + duration * 0.7); // Sustain
    envelope.gain.exponentialRampToValueAtTime(0.01, now + duration); // Release

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(envelope);
    envelope.connect(this.musicGain);

    modulator.start(now);
    carrier.start(now);
    modulator.stop(now + duration);
    carrier.stop(now + duration);
  }

  /**
   * FM lead: bright melody with FM character
   */
  private playFMLead(
    now: number, freq: number, duration: number, ratio: number, index: number, mood: string
  ): void {
    if (!this.ctx || !this.musicGain) return;

    const carrier = this.ctx.createOscillator();
    const modulator = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const envelope = this.ctx.createGain();

    carrier.type = mood === 'electronic' ? 'square' : 'sawtooth';
    carrier.frequency.value = freq;

    modulator.type = 'sine';
    modulator.frequency.value = freq * ratio;
    modGain.gain.value = freq * index;

    // ADSR: medium attack, fast decay, medium sustain, medium release
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(0.06, now + 0.05); // Attack
    envelope.gain.linearRampToValueAtTime(0.04, now + 0.1);  // Decay
    envelope.gain.setValueAtTime(0.04, now + duration * 0.6); // Sustain
    envelope.gain.exponentialRampToValueAtTime(0.01, now + duration); // Release

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(envelope);
    envelope.connect(this.musicGain);

    modulator.start(now);
    carrier.start(now);
    modulator.stop(now + duration);
    carrier.stop(now + duration);
  }

  // ===== Drum Synthesis =====

  private playHiHat(now: number, volume: number): void {
    if (!this.ctx || !this.musicGain) return;

    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 8000;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    source.start(now);
  }

  private playKick(now: number): void {
    if (!this.ctx || !this.musicGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.1);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  private playSnare(now: number): void {
    if (!this.ctx || !this.musicGain) return;

    // Noise component
    const bufferSize = this.ctx.sampleRate * 0.1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3000;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    source.start(now);

    // Tone component
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 200;
    oscGain.gain.setValueAtTime(0.08, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    osc.connect(oscGain);
    oscGain.connect(this.musicGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }
}
