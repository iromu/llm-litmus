/** Procedural audio system using Web Audio API. */
export class AudioSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private initialized: boolean = false;

  init(): void {
    if (this.initialized) return;
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch {
      // Audio not available
    }
  }

  /** Play a short sound effect. */
  playSfx(type: 'shoot' | 'explosion' | 'pickup' | 'hit' | 'boss'): void {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain);

    switch (type) {
      case 'shoot':
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
        break;
      case 'explosion':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
        break;
      case 'pickup':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
        break;
      case 'hit':
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
        break;
      case 'boss':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
        break;
    }
  }

  /** Start background music loop. */
  startMusic(): void {
    if (!this.ctx || !this.masterGain || this._musicPlaying) return;
    this._musicPlaying = true;
    this._playMusicLoop();
  }

  private _musicPlaying = false;
  private _musicTimeout: ReturnType<typeof setTimeout> | null = null;
  private _playMusicLoop(): void {
    if (!this._musicPlaying || !this.ctx) return;
    // Simple procedural music loop
    const now = this.ctx.currentTime;
    const notes = [220, 261.63, 329.63, 392, 440, 392, 329.63, 261.63];
    const duration = 0.25;

    for (let i = 0; i < notes.length; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = notes[i];
      osc.connect(gain);
      gain.connect(this.masterGain!);
      gain.gain.setValueAtTime(0.08, now + i * duration);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (i + 1) * duration);
      osc.start(now + i * duration);
      osc.stop(now + (i + 1) * duration);
    }

    this._musicTimeout = setTimeout(() => this._playMusicLoop(), notes.length * duration * 1000);
  }

  stopMusic(): void {
    this._musicPlaying = false;
    if (this._musicTimeout !== null) {
      clearTimeout(this._musicTimeout);
      this._musicTimeout = null;
    }
  }

  /** Pause/resume audio context. */
  pause(): void {
    this.ctx?.suspend();
  }

  resume(): void {
    this.ctx?.resume();
  }

  dispose(): void {
    this.stopMusic();
    this.ctx?.close();
    this.ctx = null;
    this.initialized = false;
  }
}
