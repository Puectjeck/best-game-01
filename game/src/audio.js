// Every sound in EMBERDEEP is synthesised with WebAudio — no audio files.
// Short shaped oscillators and filtered noise give the shots, hits and
// chimes; a slow two-oscillator pad with a gentle pulse stands in for the
// music of the deep. The context is created lazily on the first user
// gesture, as browsers require, and M mutes the whole mix.

/** The sound board: one-shots for game events plus the ambient pad. */
export class SoundBoard {
  constructor() {
    this.context = null;
    this.master = null;
    this.muted = false;
    this.padNodes = null;
    this.lastPlayed = new Map();
  }

  /** Create the context on first use; safe to call on every gesture. */
  unlock() {
    if ( this.context ) {
      if ( this.context.state === 'suspended' ) void this.context.resume();
      return;
    }
    const AudioCtor = window.AudioContext ?? window.webkitAudioContext;
    if ( !AudioCtor ) return;
    this.context = new AudioCtor();
    this.master = this.context.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.context.destination);
  }

  /** Flip the mute and apply it to the master gain at once. */
  toggleMute() {
    this.muted = !this.muted;
    if ( this.master && this.context ) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.5, this.context.currentTime, 0.02);
    }
    return this.muted;
  }

  /** Rate-limit a named one-shot so a busy frame cannot stack it. */
  gate(name, milliseconds) {
    const now = performance.now();
    if ( now - (this.lastPlayed.get(name) ?? 0) < milliseconds ) return false;
    this.lastPlayed.set(name, now);
    return true;
  }

  /** One oscillator blip with an exponential decay envelope. */
  blip({ frequency = 440, endFrequency = null, seconds = 0.12, type = 'sine', volume = 0.2, when = 0 }) {
    if ( !this.context || !this.master ) return;
    const start = this.context.currentTime + when;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    if ( endFrequency !== null ) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + seconds);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(gain).connect(this.master);
    osc.start(start);
    osc.stop(start + seconds + 0.02);
  }

  /** A burst of filtered noise, for explosions and splashes. */
  noise({ seconds = 0.25, volume = 0.25, frequency = 900, when = 0 }) {
    if ( !this.context || !this.master ) return;
    const start = this.context.currentTime + when;
    const length = Math.max(1, Math.floor(this.context.sampleRate * seconds));
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for ( let i = 0; i < length; i += 1 ) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = frequency;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(start);
  }

  shoot() { if ( this.gate('shoot', 45) ) this.blip({ frequency: 740, endFrequency: 320, seconds: 0.07, type: 'square', volume: 0.05 }); }
  hit() { if ( this.gate('hit', 40) ) this.blip({ frequency: 240, endFrequency: 140, seconds: 0.05, type: 'triangle', volume: 0.07 }); }
  kill() { this.noise({ seconds: 0.18, volume: 0.12, frequency: 700 }); this.blip({ frequency: 180, endFrequency: 60, seconds: 0.16, type: 'sawtooth', volume: 0.06 }); }
  hurt() { if ( this.gate('hurt', 150) ) { this.blip({ frequency: 130, endFrequency: 70, seconds: 0.2, type: 'sawtooth', volume: 0.16 }); this.noise({ seconds: 0.15, volume: 0.1, frequency: 500 }); } }
  dash() { if ( this.gate('dash', 120) ) this.noise({ seconds: 0.12, volume: 0.06, frequency: 2400 }); }
  pickup() { if ( this.gate('pickup', 50) ) this.blip({ frequency: 880, endFrequency: 1320, seconds: 0.08, type: 'sine', volume: 0.06 }); }
  heart() { this.blip({ frequency: 520, seconds: 0.12, volume: 0.1 }); this.blip({ frequency: 780, seconds: 0.16, volume: 0.1, when: 0.09 }); }
  levelUp() { [523, 659, 784, 1046].forEach((f, i) => this.blip({ frequency: f, seconds: 0.16, type: 'triangle', volume: 0.1, when: i * 0.07 })); }
  draftPick() { this.blip({ frequency: 660, seconds: 0.1, volume: 0.1 }); this.blip({ frequency: 990, seconds: 0.18, volume: 0.1, when: 0.08 }); }
  bossRoar() { this.blip({ frequency: 82, endFrequency: 48, seconds: 0.9, type: 'sawtooth', volume: 0.22 }); this.noise({ seconds: 0.8, volume: 0.1, frequency: 300 }); }
  waveClear() { [392, 523, 659].forEach((f, i) => this.blip({ frequency: f, seconds: 0.2, type: 'triangle', volume: 0.09, when: i * 0.09 })); }
  gameOver() { [330, 262, 196, 131].forEach((f, i) => this.blip({ frequency: f, seconds: 0.3, type: 'triangle', volume: 0.11, when: i * 0.16 })); }
  victory() { [523, 659, 784, 1046, 1318].forEach((f, i) => this.blip({ frequency: f, seconds: 0.3, type: 'triangle', volume: 0.11, when: i * 0.11 })); }

  /** Start the ambient pad: two detuned sines through a slow swell. */
  startPad() {
    if ( !this.context || !this.master || this.padNodes ) return;
    const ctx = this.context;
    const gain = ctx.createGain();
    gain.gain.value = 0.0;
    gain.gain.setTargetAtTime(0.05, ctx.currentTime, 2.5);
    const swell = ctx.createOscillator();
    const swellGain = ctx.createGain();
    swell.frequency.value = 0.07;
    swellGain.gain.value = 0.02;
    swell.connect(swellGain).connect(gain.gain);
    const voices = [55, 82.4, 110.3].map((frequency, index) => {
      const osc = ctx.createOscillator();
      osc.type = index === 2 ? 'triangle' : 'sine';
      osc.frequency.value = frequency;
      osc.connect(gain);
      osc.start();
      return osc;
    });
    swell.start();
    gain.connect(this.master);
    this.padNodes = { gain, swell, voices };
  }

  /** Stop the ambient pad and release its nodes. */
  stopPad() {
    if ( !this.padNodes || !this.context ) return;
    const { gain, swell, voices } = this.padNodes;
    gain.gain.setTargetAtTime(0.0, this.context.currentTime, 0.4);
    const stopAt = this.context.currentTime + 1.6;
    voices.forEach((osc) => { try { osc.stop(stopAt); } catch { /* already stopped */ } });
    try { swell.stop(stopAt); } catch { /* already stopped */ }
    this.padNodes = null;
  }
}
