import { PerlinNoise } from './terrain.js';

// ============================================================================
// SOUND DESIGN — Rich procedural ambient: layered water, birds, insects, wind
// ============================================================================

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.sounds = {};
        this.initialized = false;
        this.birdTimer = 0;
        this.frogTimer = 0;
        this.dripTimer = 0;
    }

    async init() {
        if (this.initialized) return;

        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.35;
        this.masterGain.connect(this.ctx.destination);

        this.initialized = true;
    }

    // ---- NOISE GENERATORS ----

    // Brown noise: deep rumble, good for large waterfalls
    createBrownNoise() {
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = data[i];
            data[i] *= 3.5;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.start();

        return source;
    }

    // Pink noise: balanced across frequencies, good for rivers
    createPinkNoise() {
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.1689808;
            b4 = 0.55000 * b4 + white * 0.1188190;
            b5 = -0.7616 * b5 - white * 0.0538410;
            data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
            b6 = white * 0.115926;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.start();

        return source;
    }

    // White noise: flat spectrum, good for spray/hiss
    createWhiteNoise() {
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.start();

        return source;
    }

    // ---- WATERFALL SOUND (layered) ----
    createWaterfall() {
        if (!this.initialized) return null;

        const waterfallGroup = { gains: [] };

        // Layer 1: Deep rumble (brown noise, low bandpass)
        const brown1 = this.createBrownNoise();
        const filter1 = this.ctx.createBiquadFilter();
        filter1.type = 'lowpass';
        filter1.frequency.value = 300;
        filter1.Q.value = 0.5;
        const gain1 = this.ctx.createGain();
        gain1.gain.value = 0;
        brown1.connect(filter1);
        filter1.connect(gain1);
        gain1.connect(this.masterGain);
        waterfallGroup.gains.push(gain1);

        // Layer 2: Mid-range rush (brown noise, bandpass)
        const brown2 = this.createBrownNoise();
        const filter2 = this.ctx.createBiquadFilter();
        filter2.type = 'bandpass';
        filter2.frequency.value = 600;
        filter2.Q.value = 0.4;
        const gain2 = this.ctx.createGain();
        gain2.gain.value = 0;
        brown2.connect(filter2);
        filter2.connect(gain2);
        gain2.connect(this.masterGain);
        waterfallGroup.gains.push(gain2);

        // Layer 3: High-frequency spray (white noise, highpass + bandpass)
        const white = this.createWhiteNoise();
        const filter3 = this.ctx.createBiquadFilter();
        filter3.type = 'highpass';
        filter3.frequency.value = 2000;
        filter3.Q.value = 0.3;
        const filter3b = this.ctx.createBiquadFilter();
        filter3b.type = 'bandpass';
        filter3b.frequency.value = 4000;
        filter3b.Q.value = 0.6;
        const gain3 = this.ctx.createGain();
        gain3.gain.value = 0;
        white.connect(filter3);
        filter3.connect(filter3b);
        filter3b.connect(gain3);
        gain3.connect(this.masterGain);
        waterfallGroup.gains.push(gain3);

        // Layer 4: Impact thud (brown noise, very low)
        const brown3 = this.createBrownNoise();
        const filter4 = this.ctx.createBiquadFilter();
        filter4.type = 'lowpass';
        filter4.frequency.value = 120;
        filter4.Q.value = 1.0;
        const gain4 = this.ctx.createGain();
        gain4.gain.value = 0;
        brown3.connect(filter4);
        filter4.connect(gain4);
        gain4.connect(this.masterGain);
        waterfallGroup.gains.push(gain4);

        this.sounds.waterfall = waterfallGroup;
        return waterfallGroup;
    }

    // ---- RIVER SOUND (layered) ----
    createRiver() {
        if (!this.initialized) return null;

        const riverGroup = { gains: [] };

        // Layer 1: Flow (pink noise, bandpass)
        const pink1 = this.createPinkNoise();
        const filter1 = this.ctx.createBiquadFilter();
        filter1.type = 'bandpass';
        filter1.frequency.value = 350;
        filter1.Q.value = 0.5;
        const gain1 = this.ctx.createGain();
        gain1.gain.value = 0;
        pink1.connect(filter1);
        filter1.connect(gain1);
        gain1.connect(this.masterGain);
        riverGroup.gains.push(gain1);

        // Layer 2: Babbling (pink noise, higher bandpass)
        const pink2 = this.createPinkNoise();
        const filter2 = this.ctx.createBiquadFilter();
        filter2.type = 'bandpass';
        filter2.frequency.value = 800;
        filter2.Q.value = 0.8;
        const gain2 = this.ctx.createGain();
        gain2.gain.value = 0;
        pink2.connect(filter2);
        filter2.connect(gain2);
        gain2.connect(this.masterGain);
        riverGroup.gains.push(gain2);

        this.sounds.river = riverGroup;
        return riverGroup;
    }

    // ---- WIND SOUND ----
    createWind() {
        if (!this.initialized) return null;

        const windGroup = { gains: [] };

        // Layer 1: Low rumble (pink noise, lowpass)
        const pink1 = this.createPinkNoise();
        const filter1 = this.ctx.createBiquadFilter();
        filter1.type = 'lowpass';
        filter1.frequency.value = 200;
        filter1.Q.value = 0.8;
        const gain1 = this.ctx.createGain();
        gain1.gain.value = 0;
        pink1.connect(filter1);
        filter1.connect(gain1);
        gain1.connect(this.masterGain);
        windGroup.gains.push(gain1);

        // Layer 2: High canopy rustle (pink noise, bandpass)
        const pink2 = this.createPinkNoise();
        const filter2 = this.ctx.createBiquadFilter();
        filter2.type = 'bandpass';
        filter2.frequency.value = 1200;
        filter2.Q.value = 1.5;
        const gain2 = this.ctx.createGain();
        gain2.gain.value = 0;
        pink2.connect(filter2);
        filter2.connect(gain2);
        gain2.connect(this.masterGain);
        windGroup.gains.push(gain2);

        this.sounds.wind = windGroup;
        return windGroup;
    }

    // ---- INSECT BUZZ (cicadas/crickets) ----
    createInsectBuzz(baseFreq = 4500) {
        if (!this.initialized) return null;

        const insectGroup = { gains: [] };

        // Layer 1: Main buzz (amplitude-modulated oscillator)
        const osc1 = this.ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.value = baseFreq;

        const lfo1 = this.ctx.createOscillator();
        lfo1.type = 'sine';
        lfo1.frequency.value = 30; // Fast amplitude modulation
        const lfoGain1 = this.ctx.createGain();
        lfoGain1.gain.value = 0.5;
        lfo1.connect(lfoGain1);

        const filter1 = this.ctx.createBiquadFilter();
        filter1.type = 'bandpass';
        filter1.frequency.value = baseFreq;
        filter1.Q.value = 3;

        const gain1 = this.ctx.createGain();
        gain1.gain.value = 0;

        osc1.connect(filter1);
        filter1.connect(gain1);
        gain1.connect(this.masterGain);
        osc1.start();
        lfo1.start();
        insectGroup.gains.push(gain1);

        // Layer 2: Secondary cricket (different frequency)
        const osc2 = this.ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = baseFreq * 0.7;

        const lfo2 = this.ctx.createOscillator();
        lfo2.type = 'sine';
        lfo2.frequency.value = 20;
        const lfoGain2 = this.ctx.createGain();
        lfoGain2.gain.value = 0.6;
        lfo2.connect(lfoGain2);

        const filter2 = this.ctx.createBiquadFilter();
        filter2.type = 'bandpass';
        filter2.frequency.value = baseFreq * 0.7;
        filter2.Q.value = 4;

        const gain2 = this.ctx.createGain();
        gain2.gain.value = 0;

        osc2.connect(filter2);
        filter2.connect(gain2);
        gain2.connect(this.masterGain);
        osc2.start();
        lfo2.start();
        insectGroup.gains.push(gain2);

        this.sounds.insects = insectGroup;
        return insectGroup;
    }

    // ---- BIRD CALLS (multiple species) ----

    // Tropical bird: rising two-note call
    createBirdTropical() {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;

        // Note 1: rising chirp
        const osc1 = this.ctx.createOscillator();
        osc1.type = 'sine';
        const baseFreq = 1500 + Math.random() * 1500;
        osc1.frequency.setValueAtTime(baseFreq, now);
        osc1.frequency.exponentialRampToValueAtTime(baseFreq * 1.4, now + 0.12);

        const gain1 = this.ctx.createGain();
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.06, now + 0.02);
        gain1.gain.linearRampToValueAtTime(0.04, now + 0.08);
        gain1.gain.linearRampToValueAtTime(0, now + 0.15);

        osc1.connect(gain1);
        gain1.connect(this.masterGain);
        osc1.start(now);
        osc1.stop(now + 0.15);

        // Note 2: response chirp (slightly different pitch)
        setTimeout(() => {
            if (!this.initialized) return;
            const now2 = this.ctx.currentTime;
            const osc2 = this.ctx.createOscillator();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(baseFreq * 1.2, now2);
            osc2.frequency.exponentialRampToValueAtTime(baseFreq * 1.6, now2 + 0.1);

            const gain2 = this.ctx.createGain();
            gain2.gain.setValueAtTime(0, now2);
            gain2.gain.linearRampToValueAtTime(0.05, now2 + 0.02);
            gain2.gain.linearRampToValueAtTime(0, now2 + 0.12);

            osc2.connect(gain2);
            gain2.connect(this.masterGain);
            osc2.start(now2);
            osc2.stop(now2 + 0.12);
        }, 180 + Math.random() * 200);
    }

    // Jungle bird: descending warble
    createBirdWarble() {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        const baseFreq = 2000 + Math.random() * 1000;
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, now + 0.3);

        // Add tremolo
        const lfo = this.ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 15;
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 0.3;
        lfo.connect(lfoGain);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.04, now + 0.03);
        gain.gain.linearRampToValueAtTime(0.03, now + 0.15);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.3);
        lfo.start(now);
        lfo.stop(now + 0.3);
    }

    // Small bird: rapid triple note
    createBirdSmall() {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;
        const baseFreq = 3000 + Math.random() * 2000;

        for (let i = 0; i < 3; i++) {
            const t = now + i * 0.06;
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = baseFreq * (1 + i * 0.1);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.04, t + 0.01);
            gain.gain.linearRampToValueAtTime(0, t + 0.05);

            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.05);
        }
    }

    // ---- FROG / AMPHIBIAN (near water) ----
    createFrogCroak() {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        const freq = 80 + Math.random() * 60;
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.linearRampToValueAtTime(freq * 0.8, now + 0.2);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 300;
        filter.Q.value = 2;

        // Pulsing envelope (frogs croak in pulses)
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        // 3-4 quick pulses
        for (let i = 0; i < 4; i++) {
            const pt = now + i * 0.08;
            gain.gain.setValueAtTime(0, pt);
            gain.gain.linearRampToValueAtTime(0.08, pt + 0.02);
            gain.gain.linearRampToValueAtTime(0, pt + 0.07);
        }

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.35);
    }

    // ---- WATER DRIP (near waterfall) ----
    createWaterDrip() {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;

        // Drip: short noise burst with resonant filter
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.05);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            const t = i / bufferSize;
            data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 8);
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1500 + Math.random() * 2000;
        filter.Q.value = 5 + Math.random() * 5;

        const gain = this.ctx.createGain();
        gain.gain.value = 0.03 + Math.random() * 0.03;

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        source.start(now);
    }

    // ---- LEAF RUSTLE (when moving) ----
    createLeafRustle() {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;

        const bufferSize = Math.floor(this.ctx.sampleRate * 0.3);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        const noise = new PerlinNoise(Math.random() * 100000 | 0);
        for (let i = 0; i < bufferSize; i++) {
            const t = i / this.ctx.sampleRate;
            const env = Math.exp(-t * 5);
            const mod = Math.max(0, noise.noise2D(t * 30, 0));
            data[i] = (Math.random() * 2 - 1) * mod * env;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2000 + Math.random() * 1000;
        filter.Q.value = 1.5;

        const gain = this.ctx.createGain();
        gain.gain.value = 0.02;

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        source.start(now);
    }

    // ---- UPDATE SOUNDS BASED ON PLAYER POSITION ----
    updateSounds(playerProgress, deltaTime) {
        if (!this.initialized) return;

        const now = this.ctx.currentTime;

        // --- Waterfall: louder near end ---
        if (this.sounds.waterfall) {
            const v = Math.max(0, (playerProgress - 0.55) / 0.45);
            const target = Math.pow(v, 1.5) * 0.35;
            this.sounds.waterfall.gains.forEach((g, i) => {
                const layerTarget = target * (i === 0 ? 1.0 : i === 1 ? 0.7 : i === 2 ? 0.3 : 0.8);
                g.gain.setTargetAtTime(layerTarget, now, 0.4);
            });
        }

        // --- River: starts mid-path ---
        if (this.sounds.river) {
            const v = Math.max(0, (playerProgress - 0.35) / 0.65);
            const target = v * 0.15;
            this.sounds.river.gains.forEach((g, i) => {
                g.gain.setTargetAtTime(target * (i === 0 ? 1.0 : 0.5), now, 0.5);
            });
        }

        // --- Insects: louder in dense canopy (start), fade near ruins ---
        if (this.sounds.insects) {
            const v = Math.max(0, 1.0 - playerProgress * 1.8);
            const target = v * 0.04;
            this.sounds.insects.gains.forEach((g, i) => {
                g.gain.setTargetAtTime(target * (i === 0 ? 1.0 : 0.6), now, 0.5);
            });
        }

        // --- Wind: constant but subtle, varies with position ---
        if (this.sounds.wind) {
            const windSwell = 0.5 + Math.sin(now * 0.15) * 0.3 + Math.sin(now * 0.07) * 0.2;
            const target = windSwell * 0.03;
            this.sounds.wind.gains.forEach((g, i) => {
                g.gain.setTargetAtTime(target * (i === 0 ? 1.0 : 0.4), now, 1.0);
            });
        }

        // --- Bird calls: random, more in canopy ---
        this.birdTimer += deltaTime;
        const birdChance = playerProgress < 0.75 ? 0.008 : 0.002;
        if (this.birdTimer > 2 && Math.random() < birdChance) {
            this.birdTimer = 0;
            const species = Math.random();
            if (species < 0.4) this.createBirdTropical();
            else if (species < 0.7) this.createBirdWarble();
            else this.createBirdSmall();
        }

        // --- Frogs: near water (later path) ---
        this.frogTimer += deltaTime;
        if (this.frogTimer > 4 && playerProgress > 0.5 && Math.random() < 0.005) {
            this.frogTimer = 0;
            this.createFrogCroak();
        }

        // --- Water drips: near waterfall ---
        this.dripTimer += deltaTime;
        if (this.dripTimer > 1 && playerProgress > 0.7 && Math.random() < 0.008) {
            this.dripTimer = Math.random() * 2;
            this.createWaterDrip();
        }
    }

    setMasterVolume(v) {
        if (this.masterGain) {
            this.masterGain.gain.value = Math.max(0, Math.min(1, v));
        }
    }

    stop() {
        if (this.masterGain) {
            this.masterGain.disconnect();
        }
        this.sounds = {};
    }
}

export { SoundEngine };
