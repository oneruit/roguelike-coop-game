/**
 * SoundManager handles lightweight procedural audio synthesis via Web Audio API.
 * No external audio files needed; sounds play instantly with zero latency.
 */
export class SoundManager {
  private static ctx: AudioContext | null = null;
  private static masterGain: GainNode | null = null;
  private static volume = 0; // 0.8
  public static isMuted = false;

  private static init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.getMasterGain();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private static getMasterGain(): GainNode {
    if (!this.masterGain && this.ctx) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    return this.masterGain!;
  }

  public static setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public static getVolume(): number {
    return this.volume;
  }

  public static setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public static getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Sound when projectile shoots
   */
  public static playShoot() {
    this.init();
    if (this.isMuted || !this.ctx) return;

    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(540, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(this.getMasterGain());

    osc.start();
    osc.stop(ctx.currentTime + 0.13);
  }

  /**
   * Sound when sword slashes
   */
  public static playSlash() {
    this.init();
    if (this.isMuted || !this.ctx) return;

    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.16, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(this.getMasterGain());

    osc.start();
    osc.stop(ctx.currentTime + 0.13);
  }

  /**
   * Sound when magical spell or staff projectile casts
   */
  public static playMagic() {
    this.init();
    if (this.isMuted || !this.ctx) return;

    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(740, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1180, ctx.currentTime + 0.08);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.22);

    gain.gain.setValueAtTime(0.14, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

    osc.connect(gain);
    gain.connect(this.getMasterGain());

    osc.start();
    osc.stop(ctx.currentTime + 0.23);
  }

  /**
   * Whistling spinning sound for returning chakram
   */
  public static playChakram() {
    this.init();
    if (this.isMuted || !this.ctx) return;

    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(720, ctx.currentTime + 0.08);
    osc.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + 0.20);

    gain.gain.setValueAtTime(0.13, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.20);

    osc.connect(gain);
    gain.connect(this.getMasterGain());

    osc.start();
    osc.stop(ctx.currentTime + 0.21);
  }

  /**
   * Sound when enemy gets hit
   */
  public static playHit() {
    this.init();
    if (this.isMuted || !this.ctx) return;

    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.getMasterGain());

    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  }

  /**
   * Crystal / XP Gem pickup chime
   */
  public static playGem() {
    this.init();
    if (this.isMuted || !this.ctx) return;

    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const notes = [659.25, 783.99, 880.0, 987.77, 1046.5];
    const pitch = notes[Math.floor(Math.random() * notes.length)];

    osc.frequency.setValueAtTime(pitch, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(pitch * 1.3, ctx.currentTime + 0.09);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.getMasterGain());

    osc.start();
    osc.stop(ctx.currentTime + 0.11);
  }

  /**
   * Player damaged sound
   */
  public static playPlayerHurt() {
    this.init();
    if (this.isMuted || !this.ctx) return;

    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(40, ctx.currentTime + 0.18);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(this.getMasterGain());

    osc.start();
    osc.stop(ctx.currentTime + 0.19);
  }

  /**
   * Level up fanfare
   */
  public static playLevelUp() {
    this.init();
    if (this.isMuted || !this.ctx) return;

    const ctx = this.ctx;
    const chords = [440, 554.37, 659.25, 880];
    chords.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

      gain.gain.setValueAtTime(0.18, ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.4);

      osc.connect(gain);
      gain.connect(this.getMasterGain());

      osc.start(ctx.currentTime + idx * 0.08);
      osc.stop(ctx.currentTime + idx * 0.08 + 0.42);
    });
  }

  /**
   * Sound while capturing an altar (harmonic rising pulse)
   */
  private static lastAltarPulse = 0;
  public static playAltarCapturing(progress: number) {
    this.init();
    if (this.isMuted || !this.ctx) return;

    const now = performance.now();
    if (now - this.lastAltarPulse < 180) return;
    this.lastAltarPulse = now;

    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const baseFreq = 320 + progress * 480;
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.15, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.getMasterGain());

    osc.start();
    osc.stop(ctx.currentTime + 0.11);
  }

  /**
   * Grand triumphant chord on altar capture completion
   */
  public static playAltarCaptured() {
    this.init();
    if (this.isMuted || !this.ctx) return;

    const ctx = this.ctx;
    // Harmonic Western mystic chime chord: D major add9 (293.66, 369.99, 440, 587.33, 659.25)
    const freqs = [293.66, 369.99, 440.0, 587.33, 659.25, 880.0];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.05);

      gain.gain.setValueAtTime(0.16, ctx.currentTime + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.05 + 0.7);

      osc.connect(gain);
      gain.connect(this.getMasterGain());

      osc.start(ctx.currentTime + idx * 0.05);
      osc.stop(ctx.currentTime + idx * 0.05 + 0.75);
    });
  }

  /**
   * Soft chime when buff expires
   */
  public static playBuffExpire() {
    this.init();
    if (this.isMuted || !this.ctx) return;

    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.09, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(this.getMasterGain());

    osc.start();
    osc.stop(ctx.currentTime + 0.26);
  }

  /**
   * Game Over sound
   */
  public static playGameOver() {
    this.init();
    if (this.isMuted || !this.ctx) return;

    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.8);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

    osc.connect(gain);
    gain.connect(this.getMasterGain());

    osc.start();
    osc.stop(ctx.currentTime + 0.85);
  }

  /**
   * Triumphant victory fanfare (30 minutes survived!)
   */
  public static playVictory() {
    this.init();
    if (this.isMuted || !this.ctx) return;

    const ctx = this.ctx;
    // Triumphant orchestral fanfare chords: C4, E4, G4, C5, E5, G5, C6
    const notes = [
      { f: 523.25, t: 0.00, d: 0.25 }, // C5
      { f: 523.25, t: 0.20, d: 0.20 }, // C5
      { f: 523.25, t: 0.38, d: 0.20 }, // C5
      { f: 659.25, t: 0.58, d: 0.45 }, // E5
      { f: 783.99, t: 0.95, d: 0.40 }, // G5
      { f: 1046.5, t: 1.30, d: 1.20 }  // C6 (grand finish)
    ];

    notes.forEach(n => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, ctx.currentTime + n.t);

      gain.gain.setValueAtTime(0.22, ctx.currentTime + n.t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + n.t + n.d);

      osc.connect(gain);
      gain.connect(this.getMasterGain());

      osc.start(ctx.currentTime + n.t);
      osc.stop(ctx.currentTime + n.t + n.d + 0.05);
    });

    // Shimmering chord accompaniment
    [261.63, 329.63, 392.00, 523.25].forEach(freq => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + 1.3);
      gain.gain.setValueAtTime(0.18, ctx.currentTime + 1.3);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.6);
      osc.connect(gain);
      gain.connect(this.getMasterGain());
      osc.start(ctx.currentTime + 1.3);
      osc.stop(ctx.currentTime + 2.7);
    });
  }

  /**
   * Ominous death drone when Immortal Reaper spawns at 30 minutes
   */
  public static playReaperSpawn() {
    this.init();
    if (this.isMuted || !this.ctx) return;

    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(32, ctx.currentTime + 2.0);

    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.2);

    osc.connect(gain);
    gain.connect(this.getMasterGain());

    osc.start();
    osc.stop(ctx.currentTime + 2.3);
  }
}
