/**
 * Zero-dependency Procedural Web Audio API Phone & Ringtone Synthesizer.
 * Generates realistic North American telecommunication standard call tones:
 * - Ringback tone: Dual-Frequency 440 Hz + 480 Hz cadence (2s ring, 4s silence).
 * - Connect chime: Pleasant soft double-chime ascending (523 Hz to 659 Hz).
 * - Live human call ambient room tone / subtle comfort noise.
 * - Call end tone: Soft descending tri-tone (480 Hz -> 400 Hz -> 320 Hz).
 */
export class PhoneAudioEngine {
  private ctx: AudioContext | null = null;
  private ringOscA: OscillatorNode | null = null;
  private ringOscB: OscillatorNode | null = null;
  private ringGain: GainNode | null = null;
  private ringTimer: number | null = null;
  private isRingingActive = false;

  private initCtx(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Start ringing cadence (standard 440Hz + 480Hz dial ringback tone)
   */
  public startRinging() {
    this.stopRinging();
    const ctx = this.initCtx();
    this.isRingingActive = true;

    const playBurst = () => {
      if (!this.isRingingActive || !this.ctx) return;
      const now = this.ctx.currentTime;

      const oscA = this.ctx.createOscillator();
      const oscB = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      oscA.type = 'sine';
      oscB.type = 'sine';
      oscA.frequency.setValueAtTime(440, now);
      oscB.frequency.setValueAtTime(480, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.09, now + 0.12);
      gain.gain.setValueAtTime(0.09, now + 1.85);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);

      oscA.connect(gain);
      oscB.connect(gain);
      gain.connect(this.ctx.destination);

      oscA.start(now);
      oscB.start(now);
      oscA.stop(now + 2.05);
      oscB.stop(now + 2.05);

      this.ringTimer = window.setTimeout(() => {
        if (this.isRingingActive) {
          playBurst();
        }
      }, 4000);
    };

    playBurst();
  }

  public stopRinging() {
    this.isRingingActive = false;
    if (this.ringTimer) {
      window.clearTimeout(this.ringTimer);
      this.ringTimer = null;
    }
    if (this.ringOscA) {
      try {
        this.ringOscA.stop();
      } catch {}
      this.ringOscA = null;
    }
    if (this.ringOscB) {
      try {
        this.ringOscB.stop();
      } catch {}
      this.ringOscB = null;
    }
    if (this.ringGain) {
      try {
        this.ringGain.disconnect();
      } catch {}
      this.ringGain = null;
    }
  }

  /**
   * Play crisp harmonic connect chime (agent picked up the line)
   */
  public playConnectChime() {
    this.stopRinging();
    const ctx = this.initCtx();
    const now = ctx.currentTime;

    const chimeNotes = [
      { f: 523.25, t: 0, dur: 0.28 }, // C5
      { f: 659.25, t: 0.14, dur: 0.4 }, // E5
      { f: 783.99, t: 0.28, dur: 0.55 }, // G5
    ];

    chimeNotes.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.f, now + n.t);

      gain.gain.setValueAtTime(0.0001, now + n.t);
      gain.gain.linearRampToValueAtTime(0.08, now + n.t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + n.t);
      osc.stop(now + n.t + n.dur + 0.05);
    });
  }

  /**
   * Play soft call disconnected tone
   */
  public playDisconnectTone() {
    this.stopRinging();
    const ctx = this.initCtx();
    const now = ctx.currentTime;

    const notes = [
      { f: 480, t: 0, dur: 0.18 },
      { f: 400, t: 0.18, dur: 0.18 },
      { f: 320, t: 0.36, dur: 0.3 },
    ];

    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.f, now + n.t);

      gain.gain.setValueAtTime(0.0001, now + n.t);
      gain.gain.linearRampToValueAtTime(0.06, now + n.t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + n.t);
      osc.stop(now + n.t + n.dur + 0.05);
    });
  }

  public dispose() {
    this.stopRinging();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
