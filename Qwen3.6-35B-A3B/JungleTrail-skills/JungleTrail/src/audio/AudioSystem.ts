import * as THREE from 'three';

// ── Richer bird call synthesis ───────────────────────────────────────────────
function playBirdCall(ctx: AudioContext, destination: AudioNode, time: number): void {
  const baseFreq = 1200 + Math.random() * 4000;
  const duration = 0.08 + Math.random() * 0.35;
  const callType = Math.floor(Math.random() * 4);

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, time);
  masterGain.gain.linearRampToValueAtTime(0.025 + Math.random() * 0.02, time + 0.015);
  masterGain.gain.setValueAtTime(0.025 + Math.random() * 0.02, time + duration * 0.6);
  masterGain.gain.linearRampToValueAtTime(0, time + duration);
  masterGain.connect(destination);

  if (callType === 0) {
    // Trill: rapid frequency modulation
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, time);
    const tremolo = ctx.createOscillator();
    tremolo.frequency.value = 20 + Math.random() * 30;
    const tremoloGain = ctx.createGain();
    tremoloGain.gain.value = baseFreq * 0.15;
    tremolo.connect(tremoloGain);
    tremoloGain.connect(osc.frequency);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = baseFreq;
    filter.Q.value = 4 + Math.random() * 4;

    osc.connect(filter);
    filter.connect(masterGain);
    osc.start(time);
    tremolo.start(time);
    osc.stop(time + duration);
    tremolo.stop(time + duration);
  } else if (callType === 1) {
    // Descending whistle
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 1.3, time);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.6, time + duration);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = baseFreq;
    filter.Q.value = 6;

    osc.connect(filter);
    filter.connect(masterGain);
    osc.start(time);
    osc.stop(time + duration);
  } else if (callType === 2) {
    // Multiple notes: ascending arpeggio
    const notes = 2 + Math.floor(Math.random() * 3);
    for (let n = 0; n < notes; n++) {
      const noteTime = time + n * duration * 0.25;
      if (noteTime > time + duration) break;
      const noteOsc = ctx.createOscillator();
      noteOsc.type = 'sine';
      const noteFreq = baseFreq * (1 + n * 0.25);
      noteOsc.frequency.setValueAtTime(noteFreq, noteTime);
      noteOsc.frequency.exponentialRampToValueAtTime(noteFreq * 0.9, noteTime + duration * 0.2);

      const noteGain = ctx.createGain();
      noteGain.gain.setValueAtTime(0, noteTime);
      noteGain.gain.linearRampToValueAtTime(0.02, noteTime + 0.008);
      noteGain.gain.linearRampToValueAtTime(0, noteTime + duration * 0.2);

      const noteFilter = ctx.createBiquadFilter();
      noteFilter.type = 'bandpass';
      noteFilter.frequency.value = noteFreq;
      noteFilter.Q.value = 5;

      noteOsc.connect(noteFilter);
      noteFilter.connect(noteGain);
      noteGain.connect(destination);
      noteOsc.start(noteTime);
      noteOsc.stop(noteTime + duration * 0.25);
    }
  } else {
    // Warbled: complex FM
    const carrier = ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.value = baseFreq;

    const modulator = ctx.createOscillator();
    modulator.frequency.value = 5 + Math.random() * 15;
    const modGain = ctx.createGain();
    modGain.gain.value = baseFreq * (0.1 + Math.random() * 0.2);
    modulator.connect(modGain);
    modGain.connect(carrier.frequency);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = baseFreq;
    filter.Q.value = 3 + Math.random() * 5;

    carrier.connect(filter);
    filter.connect(masterGain);
    carrier.start(time);
    modulator.start(time);
    carrier.stop(time + duration);
    modulator.stop(time + duration);
  }
}

// ── Insect chirp synthesis ───────────────────────────────────────────────────
function playInsectChirp(ctx: AudioContext, destination: AudioNode, time: number): void {
  const baseFreq = 3500 + Math.random() * 5000;
  const duration = 0.03 + Math.random() * 0.08;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = baseFreq;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = baseFreq;
  filter.Q.value = 8 + Math.random() * 12;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, time);
  // Sharp attack, quick decay (cricket chirp envelope)
  gain.gain.linearRampToValueAtTime(0.015 + Math.random() * 0.01, time + 0.003);
  gain.gain.setValueAtTime(0.015 + Math.random() * 0.01, time + duration * 0.7);
  gain.gain.linearRampToValueAtTime(0, time + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(destination);

  osc.start(time);
  osc.stop(time + duration + 0.005);
}

// ── Waterfall sound synthesis ────────────────────────────────────────────────
function createWaterfallSound(ctx: AudioContext, destination: AudioNode): {
  source: AudioBufferSourceNode;
  gain: GainNode;
  panner: PannerNode;
} {
  // Multi-layered water sound:
  // 1. Broadband noise (white water)
  // 2. Low rumble (deep flow)
  // 3. Mid-frequency rush (turbulent flow)

  const bufferSize = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);

  // Generate correlated stereo noise
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    let lastR = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Pink-ish noise: gentle low-pass
      const pink = lastR * 0.95 + white * 0.05;
      lastR = pink;
      // Add some burstiness (water drops/impact)
      const burst = Math.random() > 0.995 ? (Math.random() - 0.5) * 2 : 0;
      data[i] = (pink * 0.7 + white * 0.3 + burst * 0.1) * 1.5;
    }
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  // Panner for 3D positioning (far away at waterfall)
  const panner = ctx.createPanner();
  panner.panningModel = 'HRTF';
  panner.distanceModel = 'inverse';
  panner.refDistance = 1;
  panner.maxDistance = 100;
  panner.rolloffFactor = 1.5;
  panner.coneInnerAngle = 360;
  panner.coneOuterAngle = 360;
  panner.connect(destination);

  // Layer 1: Broadband (white water)
  const broadband = ctx.createBiquadFilter();
  broadband.type = 'bandpass';
  broadband.frequency.value = 2000;
  broadband.Q.value = 0.5;

  // Layer 2: Low rumble
  const lowRumble = ctx.createBiquadFilter();
  lowRumble.type = 'lowpass';
  lowRumble.frequency.value = 400;
  lowRumble.Q.value = 0.8;

  // Layer 3: Mid rush
  const midRush = ctx.createBiquadFilter();
  midRush.type = 'bandpass';
  midRush.frequency.value = 800;
  midRush.Q.value = 1.2;

  const gain = ctx.createGain();
  gain.gain.value = 0.06;

  source.connect(broadband);
  source.connect(lowRumble);
  source.connect(midRush);
  broadband.connect(gain);
  lowRumble.connect(gain);
  midRush.connect(gain);
  gain.connect(panner);

  source.start();

  // LFO for natural variation
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.15;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.015;
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);
  lfo.start();

  // Higher frequency modulation for splash variation
  const lfo2 = ctx.createOscillator();
  lfo2.frequency.value = 0.4;
  const lfo2Gain = ctx.createGain();
  lfo2Gain.gain.value = 600;
  lfo2.connect(lfo2Gain);
  lfo2Gain.connect(broadband.frequency);
  lfo2.start();

  return { source, gain, panner };
}

// ── River sound synthesis ────────────────────────────────────────────────────
function createRiverSound(ctx: AudioContext, destination: AudioNode): {
  source: AudioBufferSourceNode;
  gain: GainNode;
} {
  const bufferSize = ctx.sampleRate * 3;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let lastR = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    lastR = lastR * 0.97 + white * 0.03;
    data[i] = lastR * 1.2;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 600;
  filter.Q.value = 1.0;

  const gain = ctx.createGain();
  gain.gain.value = 0.03;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  source.start();

  // LFO for flow variation
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.2;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 200;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  lfo.start();

  return { source, gain };
}

// ── Wind synthesis ───────────────────────────────────────────────────────────
function createWindSound(ctx: AudioContext, destination: AudioNode): {
  source: AudioBufferSourceNode;
  gain: GainNode;
} {
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  // Bandpass to shape wind character
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 350;
  filter.Q.value = 0.4;

  const gain = ctx.createGain();
  gain.gain.value = 0.04;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  source.start();

  // LFO for gusts
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.08;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 200;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  lfo.start();

  // Secondary LFO for volume variation
  const lfo2 = ctx.createOscillator();
  lfo2.frequency.value = 0.05;
  const lfo2Gain = ctx.createGain();
  lfo2Gain.gain.value = 0.015;
  lfo2.connect(lfo2Gain);
  lfo2Gain.connect(gain.gain);
  lfo2.start();

  return { source, gain };
}

// ── Ambient jungle drone ────────────────────────────────────────────────────
function createJungleDrone(ctx: AudioContext, destination: AudioNode): {
  oscillators: OscillatorNode[];
  gain: GainNode;
} {
  const oscillators: OscillatorNode[] = [];

  // Deep sub-bass rumble
  const freqs = [55, 58.5, 110, 165];
  const gains = [0.04, 0.035, 0.02, 0.01];

  for (let i = 0; i < freqs.length; i++) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freqs[i];

    const oscGain = ctx.createGain();
    oscGain.gain.value = gains[i];

    osc.connect(oscGain);
    oscGain.connect(destination);
    osc.start();
    oscillators.push(osc);
  }

  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.8;
  oscillators.forEach(() => {
    // Oscillators already connected through their individual gains
  });

  return { oscillators, gain: masterGain };
}

// ── Main AudioSystem ─────────────────────────────────────────────────────────

export class AudioSystem {
  private readonly ctx: AudioContext;
  private readonly masterGain: GainNode;
  private readonly audioListener: THREE.AudioListener;
  private readonly nodes: AudioNode[] = [];
  private readonly sources: AudioBufferSourceNode[] = [];

  // Spatial audio sources
  private waterfallSound!: { source: AudioBufferSourceNode; gain: GainNode; panner: PannerNode };
  private riverSound!: { source: AudioBufferSourceNode; gain: GainNode };
  private windSound!: { source: AudioBufferSourceNode; gain: GainNode };
  private jungleDrone!: { oscillators: OscillatorNode[]; gain: GainNode };

  // Scheduling
  private birdSchedulerId: ReturnType<typeof setInterval> | null = null;
  private insectSchedulerId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.35;
    this.masterGain.connect(this.ctx.destination);

    // Audio listener for 3D spatial audio
    this.audioListener = new THREE.AudioListener();
  }

  get listener(): THREE.AudioListener { return this.audioListener; }

  start(): void {
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.jungleDrone = createJungleDrone(this.ctx, this.masterGain);
    this.nodes.push(this.jungleDrone.gain);

    this.windSound = createWindSound(this.ctx, this.masterGain);
    this.nodes.push(this.windSound.gain);
    this.sources.push(this.windSound.source);

    this.riverSound = createRiverSound(this.ctx, this.masterGain);
    this.nodes.push(this.riverSound.gain);
    this.sources.push(this.riverSound.source);

    // Waterfall is spatially positioned at the end (near ruins)
    this.waterfallSound = createWaterfallSound(this.ctx, this.masterGain);
    // Set initial waterfall position (far away)
    this.waterfallSound.panner.positionX.value = 0;
    this.waterfallSound.panner.positionY.value = 5;
    this.waterfallSound.panner.positionZ.value = -115;
    this.waterfallSound.panner.refDistance = 5;
    this.waterfallSound.panner.maxDistance = 80;
    this.nodes.push(this.waterfallSound.gain);
    this.sources.push(this.waterfallSound.source);

    // Start scheduling
    this.scheduleBirds();
    this.scheduleInsects();
  }

  /** Schedule random bird calls */
  private scheduleBirds(): void {
    const scheduleNext = () => {
      const delay = 2000 + Math.random() * 6000;
      this.birdSchedulerId = setTimeout(() => {
        if (this.ctx.state === 'running') {
          const now = this.ctx.currentTime;
          // Sometimes play a chorus of 2-3 birds
          const count = 1 + Math.floor(Math.random() * 3);
          for (let i = 0; i < count; i++) {
            setTimeout(() => playBirdCall(this.ctx, this.masterGain, now + i * 0.15), i * 150);
          }
        }
        scheduleNext();
      }, delay);
    };
    scheduleNext();
  }

  /** Schedule random insect chirps */
  private scheduleInsects(): void {
    const scheduleNext = () => {
      const delay = 30 + Math.random() * 200;
      this.insectSchedulerId = setTimeout(() => {
        if (this.ctx.state === 'running') {
          const now = this.ctx.currentTime;
          // Sometimes play a burst of chirps
          const count = 1 + Math.floor(Math.random() * 4);
          for (let i = 0; i < count; i++) {
            setTimeout(() => playInsectChirp(this.ctx, this.masterGain, now + i * 0.04), i * 40);
          }
        }
        scheduleNext();
      }, delay);
    };
    scheduleNext();
  }

  /**
   * Update audio based on player progress along the path.
   * - Waterfall sound increases as player approaches ruins
   * - Wind decreases in the denser jungle near ruins
   * - Bird activity decreases near ruins (quieter area)
   */
  update(progress: number, elapsed: number, cameraPos: THREE.Vector3): void {
    if (this.ctx.state !== 'running') return;

    const time = this.ctx.currentTime;

    // Waterfall gain: increases as player approaches (progress > 0.7)
    if (progress > 0.6) {
      const waterfallProgress = (progress - 0.6) / 0.4;
      const targetGain = 0.02 + waterfallProgress * 0.12;
      this.waterfallSound.gain.gain.linearRampToValueAtTime(
        targetGain, time + 0.1
      );
    } else {
      this.waterfallSound.gain.gain.linearRampToValueAtTime(0.02, time + 0.1);
    }

    // Wind: decreases near ruins (denser canopy blocks wind)
    if (progress > 0.7) {
      const windProgress = (progress - 0.7) / 0.3;
      const targetGain = 0.04 * (1 - windProgress * 0.5);
      this.windSound.gain.gain.linearRampToValueAtTime(
        targetGain, time + 0.5
      );
    } else {
      this.windSound.gain.gain.linearRampToValueAtTime(0.04, time + 0.5);
    }

    // Update waterfall panner position relative to camera
    const waterfallPos = new THREE.Vector3(0, 5, -115);
    const relativePos = waterfallPos.clone().sub(cameraPos);
    this.waterfallSound.panner.positionX.value = relativePos.x;
    this.waterfallSound.panner.positionY.value = relativePos.y;
    this.waterfallSound.panner.positionZ.value = relativePos.z;

    // Subtle jungle drone variation
    if (this.jungleDrone.oscillators.length >= 2) {
      // Slowly shift the detuned oscillators for organic feel
      const shift = Math.sin(elapsed * 0.05) * 0.5;
      this.jungleDrone.oscillators[0].frequency.linearRampToValueAtTime(55 + shift, time + 0.5);
      this.jungleDrone.oscillators[1].frequency.linearRampToValueAtTime(58.5 - shift, time + 0.5);
    }
  }

  /**
   * Set the camera position for spatial audio.
   * This syncs Three.js audio listener with our camera.
   */
  setCameraPosition(pos: THREE.Vector3, front: THREE.Vector3, _up: THREE.Vector3): void {
    this.listener.position.copy(pos);
    // Set orientation from camera direction
    this.listener.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, -1),
      front.clone().normalize()
    );
  }

  dispose(): void {
    // Stop schedulers
    if (this.birdSchedulerId) clearTimeout(this.birdSchedulerId);
    if (this.insectSchedulerId) clearTimeout(this.insectSchedulerId);

    // Stop all sources
    for (const source of this.sources) {
      try { source.stop(); } catch { /* already stopped */ }
    }

    // Disconnect all nodes
    for (const node of this.nodes) {
      try { node.disconnect(); } catch { /* already disconnected */ }
    }

    this.masterGain.disconnect();
    this.ctx.close();
  }
}
