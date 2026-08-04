/**
 * Sound system: Web Audio API synthesis for 16-bit FM-style sound effects and music
 */

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
 * Sound system using Web Audio API
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
  private bpm: number = 160;
  private beatInterval: number = 60 / 160; // seconds per beat

  // Bass line pattern (root notes for different sections)
  private bassPattern: number[] = [
    55, 55, 65.41, 65.41, 73.42, 73.42, 82.41, 82.41, // A1, C2, D2, E2
    55, 55, 65.41, 65.41, 82.41, 82.41, 73.42, 73.42,
  ];

  // Lead melody pattern
  private leadPattern: number[] = [
    440, 0, 523.25, 0, 587.33, 0, 659.25, 0, // A4, C5, D5, E5
    0, 783.99, 0, 698.46, 0, 622.25, 0, 587.33,
  ];

  /**
   * Initialize audio context (must be called from user gesture)
   */
  init(): void {
    if (this.ctx) return;
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.5;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.2;
      this.musicGain.connect(this.masterGain);

      this.enabled = true;
    } catch (e) {
      console.warn('Web Audio API not available');
    }
  }

  /**
   * Play a sound effect
   */
  play(sfx: SFX): void {
    if (!this.enabled || !this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    switch (sfx) {
      case SFX.PLASMA_SHOT:
        this.playPlasmaShot(now);
        break;
      case SFX.HOMING_SHOT:
        this.playHomingShot(now);
        break;
      case SFX.SPREAD_SHOT:
        this.playSpreadShot(now);
        break;
      case SFX.LIGHTNING_SHOT:
        this.playLightningShot(now);
        break;
      case SFX.ENEMY_EXPLOSION:
        this.playExplosion(now, 0.2, 200);
        break;
      case SFX.BOSS_EXPLOSION:
        this.playExplosion(now, 0.5, 80);
        break;
      case SFX.PICKUP:
        this.playPickup(now);
        break;
      case SFX.SHIELD_BREAK:
        this.playShieldBreak(now);
        break;
      case SFX.PLAYER_HIT:
        this.playPlayerHit(now);
        break;
      case SFX.LASER:
        this.playLaser(now);
        break;
      case SFX.MISSILE:
        this.playMissile(now);
        break;
    }
  }

  /**
   * Update music playback
   */
  update(dt: number, intensity: number = 0.5): void {
    if (!this.enabled || !this.ctx || !this.musicGain) return;

    this.beatTimer += dt;
    if (this.beatTimer >= this.beatInterval) {
      this.beatTimer -= this.beatInterval;
      this.playBeat(this.currentBeat, intensity);
      this.currentBeat = (this.currentBeat + 1) % this.bassPattern.length;
    }
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
      this.musicGain.gain.value = 0.1 + intensity * 0.2;
    }
  }

  // ===== Sound Effect Synthesis =====

  private playPlasmaShot(now: number): void {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.05);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  private playHomingShot(now: number): void {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.linearRampToValueAtTime(900, now + 0.1);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  private playSpreadShot(now: number): void {
    if (!this.ctx || !this.sfxGain) return;
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(500 + i * 100, now + i * 0.01);
      osc.frequency.exponentialRampToValueAtTime(200, now + i * 0.01 + 0.06);
      gain.gain.setValueAtTime(0.15, now + i * 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.01 + 0.08);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + i * 0.01);
      osc.stop(now + i * 0.01 + 0.08);
    }
  }

  private playLightningShot(now: number): void {
    if (!this.ctx || !this.sfxGain) return;
    const bufferSize = this.ctx.sampleRate * 0.1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2000;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    source.start(now);
  }

  private playExplosion(now: number, duration: number, startFreq: number): void {
    if (!this.ctx || !this.sfxGain) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / this.ctx.sampleRate;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t / (duration * 0.3));
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(startFreq, now);
    filter.frequency.exponentialRampToValueAtTime(50, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    source.start(now);
  }

  private playPickup(now: number): void {
    if (!this.ctx || !this.sfxGain) return;
    const ctx = this.ctx;
    const sfxGain = this.sfxGain;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.2, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.1);
      osc.connect(gain);
      gain.connect(sfxGain);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.1);
    });
  }

  private playShieldBreak(now: number): void {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.2);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  private playPlayerHit(now: number): void {
    if (!this.ctx || !this.sfxGain) return;
    // Descending sawtooth
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.3);

    // Noise burst
    this.playExplosion(now, 0.15, 400);
  }

  private playLaser(now: number): void {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.3);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.setValueAtTime(0.2, now + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  private playMissile(now: number): void {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.2);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  // ===== Music Synthesis =====

  private playBeat(beat: number, intensity: number): void {
    if (!this.ctx || !this.musicGain || !this.musicPlaying) return;
    const now = this.ctx.currentTime;

    // Bass line (every beat)
    const bassFreq = this.bassPattern[beat];
    if (bassFreq > 0) {
      this.playNote(now, bassFreq, this.beatInterval * 0.8, 'square', 0.15, this.musicGain);
    }

    // Lead melody (every other beat)
    if (beat % 2 === 0) {
      const leadIdx = Math.floor(beat / 2) % this.leadPattern.length;
      const leadFreq = this.leadPattern[leadIdx];
      if (leadFreq > 0 && intensity > 0.3) {
        this.playNote(now, leadFreq, this.beatInterval * 0.6, 'square', 0.08, this.musicGain);
      }
    }

    // Hi-hat (every beat)
    this.playHiHat(now, beat % 2 === 0 ? 0.1 : 0.05);

    // Kick drum (on 1 and 3)
    if (beat % 4 === 0 || beat % 4 === 2) {
      this.playKick(now);
    }

    // Snare (on 2 and 4)
    if (beat % 4 === 1 || beat % 4 === 3) {
      this.playSnare(now);
    }
  }

  private playNote(
    now: number, freq: number, duration: number,
    type: OscillatorType, volume: number, destination: GainNode
  ): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.setValueAtTime(volume, now + duration * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    osc.connect(gain);
    gain.connect(destination);
    osc.start(now);
    osc.stop(now + duration);
  }

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
    gain.gain.setValueAtTime(0.15, now);
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
    oscGain.gain.setValueAtTime(0.1, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    osc.connect(oscGain);
    oscGain.connect(this.musicGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }
}
