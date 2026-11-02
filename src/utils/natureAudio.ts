import type { ThemeMode } from '../types';

/**
 * Zero-dependency Web Audio API Procedural Botanical Soundscape Engine.
 * Synthesizes realistic 1/f rustling wind, sunlit songbirds & morning doves (Light theme),
 * and nocturnal stridulating crickets & distant night calls (Dark theme),
 * smoothly crossfading between Light and Dark themes.
 */
export class NatureSoundscapeEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private windFilterA: BiquadFilterNode | null = null;
  private windFilterB: BiquadFilterNode | null = null;
  private dayBusGain: GainNode | null = null;
  private nightBusGain: GainNode | null = null;

  private isPlaying = false;
  private volume = 0.55;
  private theme: ThemeMode = 'light';
  private breezeIntensity = 1.0;

  private birdTimer: number | null = null;
  private cricketTimer: number | null = null;

  private initContext() {
    if (this.ctx) return;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    this.ctx = ctx;

    // Master output gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    masterGain.connect(ctx.destination);
    this.masterGain = masterGain;

    // Theme buses for smooth crossfading
    const dayBus = ctx.createGain();
    dayBus.gain.setValueAtTime(this.theme === 'light' ? 1 : 0.0001, ctx.currentTime);
    dayBus.connect(masterGain);
    this.dayBusGain = dayBus;

    const nightBus = ctx.createGain();
    nightBus.gain.setValueAtTime(this.theme === 'dark' ? 1 : 0.0001, ctx.currentTime);
    nightBus.connect(masterGain);
    this.nightBusGain = nightBus;

    // Generate 5-second stereo Pink Noise buffer (1/f natural spectral slope)
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * 5;
    const noiseBuffer = ctx.createBuffer(2, length, sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = noiseBuffer.getChannelData(ch);
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      let b3 = 0;
      let b4 = 0;
      let b5 = 0;
      let b6 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        b6 = white * 0.115926;

        // Crossfade loop seam smoothly over first/last 0.15s
        const fadeSamples = Math.floor(sampleRate * 0.15);
        let env = 1;
        if (i < fadeSamples) env = i / fadeSamples;
        else if (i > length - fadeSamples) env = (length - i) / fadeSamples;

        data[i] = pink * 0.042 * env;
      }
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    // Dual-layer breeze filtering: canopy leaf rustle + low meadow air
    const filterA = ctx.createBiquadFilter();
    filterA.type = 'bandpass';
    filterA.frequency.setValueAtTime(this.theme === 'light' ? 460 : 280, ctx.currentTime);
    filterA.Q.setValueAtTime(1.35, ctx.currentTime);

    const filterB = ctx.createBiquadFilter();
    filterB.type = 'lowpass';
    filterB.frequency.setValueAtTime(this.theme === 'light' ? 680 : 410, ctx.currentTime);
    filterB.Q.setValueAtTime(0.7, ctx.currentTime);

    // Slow organic wind gust LFOs
    const lfoA = ctx.createOscillator();
    lfoA.type = 'sine';
    lfoA.frequency.setValueAtTime(0.11, ctx.currentTime);
    const lfoAGain = ctx.createGain();
    lfoAGain.gain.setValueAtTime(140, ctx.currentTime);
    lfoA.connect(lfoAGain);
    lfoAGain.connect(filterA.frequency);

    const lfoB = ctx.createOscillator();
    lfoB.type = 'sine';
    lfoB.frequency.setValueAtTime(0.07, ctx.currentTime);
    const lfoBGain = ctx.createGain();
    lfoBGain.gain.setValueAtTime(95, ctx.currentTime);
    lfoB.connect(lfoBGain);
    lfoBGain.connect(filterB.frequency);

    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(this.computeWindGain(), ctx.currentTime);

    noiseSource.connect(filterA);
    noiseSource.connect(filterB);
    filterA.connect(windGain);
    filterB.connect(windGain);
    windGain.connect(masterGain);

    noiseSource.start();
    lfoA.start();
    lfoB.start();

    this.windFilterA = filterA;
    this.windFilterB = filterB;
    this.windGain = windGain;
  }

  private computeWindGain(): number {
    const base = this.theme === 'light' ? 0.24 : 0.19;
    return Math.min(0.65, base * (0.45 + this.breezeIntensity * 0.55));
  }

  public async setPlaying(nextPlaying: boolean): Promise<boolean> {
    if (nextPlaying) {
      this.initContext();
      if (!this.ctx || !this.masterGain) return false;
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      this.isPlaying = true;
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(this.volume, now, 0.25);

      this.startSchedulers();
      return true;
    } else {
      this.isPlaying = false;
      this.stopSchedulers();
      if (this.ctx && this.masterGain) {
        const now = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setTargetAtTime(0.0001, now, 0.18);
      }
      return false;
    }
  }

  public setVolume(nextVol: number) {
    this.volume = Math.max(0, Math.min(1, nextVol));
    if (this.isPlaying && this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(this.volume, now, 0.08);
    }
  }

  public setTheme(nextTheme: ThemeMode) {
    if (this.theme === nextTheme && this.ctx) return;
    this.theme = nextTheme;

    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Smoothly crossfade Day (birds) and Night (crickets) buses
    if (this.dayBusGain && this.nightBusGain) {
      this.dayBusGain.gain.cancelScheduledValues(now);
      this.nightBusGain.gain.cancelScheduledValues(now);
      this.dayBusGain.gain.setTargetAtTime(nextTheme === 'light' ? 1.0 : 0.0001, now, 0.45);
      this.nightBusGain.gain.setTargetAtTime(nextTheme === 'dark' ? 1.0 : 0.0001, now, 0.45);
    }

    // Shift wind timbre between bright sunlit foliage and calm night air
    if (this.windFilterA && this.windFilterB && this.windGain) {
      this.windFilterA.frequency.setTargetAtTime(
        nextTheme === 'light' ? 460 : 280,
        now,
        0.6,
      );
      this.windFilterB.frequency.setTargetAtTime(
        nextTheme === 'light' ? 680 : 410,
        now,
        0.6,
      );
      this.windGain.gain.setTargetAtTime(this.computeWindGain(), now, 0.5);
    }

    // Trigger an immediate welcoming bird chirp or cricket stridulation on theme change
    if (this.isPlaying) {
      if (nextTheme === 'light') {
        this.triggerBirdPhrase();
      } else {
        this.triggerCricketBurst();
      }
    }
  }

  public setBreezeIntensity(intensity: number) {
    this.breezeIntensity = intensity;
    if (this.ctx && this.windGain && this.windFilterA) {
      const now = this.ctx.currentTime;
      this.windGain.gain.setTargetAtTime(this.computeWindGain(), now, 0.25);
      const baseFreq = this.theme === 'light' ? 430 : 260;
      this.windFilterA.frequency.setTargetAtTime(
        baseFreq + intensity * 75,
        now,
        0.3,
      );
    }
  }

  public playCelestialAccent() {
    if (!this.isPlaying || !this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const notes =
      this.theme === 'light'
        ? [587.33, 739.99, 880.0, 1174.66] // Warm sunlit D major shimmer
        : [523.25, 659.25, 987.77, 1318.51]; // Starry C major9 crystalline chime

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      const start = now + idx * 0.075;
      osc.frequency.setValueAtTime(freq, start);

      env.gain.setValueAtTime(0.0001, start);
      env.gain.linearRampToValueAtTime(0.032, start + 0.03);
      env.gain.exponentialRampToValueAtTime(0.0001, start + 0.95);

      osc.connect(env);
      env.connect(this.masterGain!);
      osc.start(start);
      osc.stop(start + 1.0);
    });
  }

  private startSchedulers() {
    this.stopSchedulers();

    const loopBirds = () => {
      if (!this.isPlaying) return;
      if (this.theme === 'light') {
        this.triggerBirdPhrase();
      }
      const nextDelay = 1350 + Math.random() * 2400;
      this.birdTimer = window.setTimeout(loopBirds, nextDelay);
    };

    const loopCrickets = () => {
      if (!this.isPlaying) return;
      if (this.theme === 'dark') {
        this.triggerCricketBurst();
      }
      const nextDelay = 780 + Math.random() * 1250;
      this.cricketTimer = window.setTimeout(loopCrickets, nextDelay);
    };

    // Immediate gentle opening sound
    if (this.theme === 'light') {
      this.triggerBirdPhrase();
    } else {
      this.triggerCricketBurst();
    }

    this.birdTimer = window.setTimeout(loopBirds, 1600);
    this.cricketTimer = window.setTimeout(loopCrickets, 950);
  }

  private stopSchedulers() {
    if (this.birdTimer !== null) {
      window.clearTimeout(this.birdTimer);
      this.birdTimer = null;
    }
    if (this.cricketTimer !== null) {
      window.clearTimeout(this.cricketTimer);
      this.cricketTimer = null;
    }
  }

  /**
   * Synthesize realistic songbird warbles, finch double-chirps, or soft morning dove coos.
   */
  private triggerBirdPhrase() {
    if (!this.ctx || !this.dayBusGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime((Math.random() - 0.5) * 1.4, now);
    panner.connect(this.dayBusGain);

    const roll = Math.random();

    if (roll < 0.22) {
      // Soft Morning Dove Coo (low warm hollow sine phrase)
      const notes = [
        { offset: 0, dur: 0.34, fStart: 540, fPeak: 615, fEnd: 525 },
        { offset: 0.44, dur: 0.22, fStart: 520, fPeak: 555, fEnd: 500 },
        { offset: 0.74, dur: 0.38, fStart: 525, fPeak: 565, fEnd: 495 },
      ];
      notes.forEach((n) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const t0 = now + n.offset;
        osc.frequency.setValueAtTime(n.fStart, t0);
        osc.frequency.linearRampToValueAtTime(n.fPeak, t0 + n.dur * 0.35);
        osc.frequency.linearRampToValueAtTime(n.fEnd, t0 + n.dur);

        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.linearRampToValueAtTime(0.048, t0 + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.dur);

        osc.connect(gain);
        gain.connect(panner);
        osc.start(t0);
        osc.stop(t0 + n.dur + 0.02);
      });
    } else {
      // Melodic Songbird Syrinx Syllables (2 to 5 notes)
      const syllableCount = 2 + Math.floor(Math.random() * 4);
      const baseFreq = 2300 + Math.random() * 1100;
      let cursor = now + 0.02;

      for (let i = 0; i < syllableCount; i++) {
        const dur = 0.065 + Math.random() * 0.075;
        const f0 = baseFreq * (0.9 + Math.random() * 0.35);
        const upward = Math.random() > 0.35;
        const f1 = upward ? f0 * (1.18 + Math.random() * 0.22) : f0 * 0.78;

        const osc = ctx.createOscillator();
        const mod = ctx.createOscillator();
        const modGain = ctx.createGain();
        const env = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(f0, cursor);
        osc.frequency.exponentialRampToValueAtTime(f1, cursor + dur);

        // Subtle avian trill vibrato
        mod.type = 'sine';
        mod.frequency.setValueAtTime(38 + Math.random() * 25, cursor);
        modGain.gain.setValueAtTime(i % 2 === 0 ? 85 : 25, cursor);
        mod.connect(modGain);
        modGain.connect(osc.frequency);

        env.gain.setValueAtTime(0.0001, cursor);
        env.gain.linearRampToValueAtTime(0.052, cursor + dur * 0.25);
        env.gain.exponentialRampToValueAtTime(0.0001, cursor + dur);

        osc.connect(env);
        env.connect(panner);

        osc.start(cursor);
        mod.start(cursor);
        osc.stop(cursor + dur + 0.015);
        mod.stop(cursor + dur + 0.015);

        cursor += dur + 0.035 + Math.random() * 0.055;
      }
    }
  }

  /**
   * Synthesize nocturnal tree-cricket pulsed stridulation & occasional distant night owl.
   */
  private triggerCricketBurst() {
    if (!this.ctx || !this.nightBusGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime((Math.random() - 0.5) * 1.5, now);
    panner.connect(this.nightBusGain);

    // Occasional serene distant night owl call (10% chance)
    if (Math.random() < 0.1) {
      const owlNotes = [
        { dt: 0, dur: 0.32, f0: 395, f1: 375 },
        { dt: 0.44, dur: 0.18, f0: 390, f1: 380 },
        { dt: 0.72, dur: 0.48, f0: 385, f1: 335 },
      ];
      owlNotes.forEach((n) => {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'sine';
        const t0 = now + n.dt;
        osc.frequency.setValueAtTime(n.f0, t0);
        osc.frequency.exponentialRampToValueAtTime(n.f1, t0 + n.dur);
        env.gain.setValueAtTime(0.0001, t0);
        env.gain.linearRampToValueAtTime(0.036, t0 + 0.05);
        env.gain.exponentialRampToValueAtTime(0.0001, t0 + n.dur);
        osc.connect(env);
        env.connect(panner);
        osc.start(t0);
        osc.stop(t0 + n.dur + 0.02);
      });
      return;
    }

    // Authentic pulsed cricket stridulation (4 to 6 rapid micro-pulses at ~4.2 kHz)
    const carrierBase = Math.random() > 0.5 ? 4160 : 4480;
    const pulseCount = 4 + Math.floor(Math.random() * 3);
    const pulseDur = 0.019;
    const pulseGap = 0.012;
    const totalDur = pulseCount * (pulseDur + pulseGap) + 0.03;

    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const pulseGain = ctx.createGain();

    oscA.type = 'sine';
    oscB.type = 'triangle';
    oscA.frequency.setValueAtTime(carrierBase, now);
    oscB.frequency.setValueAtTime(carrierBase + 34, now);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(carrierBase + 15, now);
    filter.Q.setValueAtTime(6.5, now);

    pulseGain.gain.setValueAtTime(0.0001, now);
    for (let p = 0; p < pulseCount; p++) {
      const pStart = now + p * (pulseDur + pulseGap);
      const peak = 0.032 * Math.sin(((p + 0.6) / pulseCount) * Math.PI);
      pulseGain.gain.setValueAtTime(0.0001, pStart);
      pulseGain.gain.linearRampToValueAtTime(Math.max(0.006, peak), pStart + 0.005);
      pulseGain.gain.exponentialRampToValueAtTime(0.0001, pStart + pulseDur);
    }

    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(pulseGain);
    pulseGain.connect(panner);

    oscA.start(now);
    oscB.start(now);
    oscA.stop(now + totalDur);
    oscB.stop(now + totalDur);
  }

  public dispose() {
    this.stopSchedulers();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
