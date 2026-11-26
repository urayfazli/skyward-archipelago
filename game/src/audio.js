// Skyward Archipelago — procedural sound, no audio files.
// A two-oscillator engine hum that follows the throttle, a bright chime when
// a ring is cleared, a soft thud for touchdown and a crunch for a crash.
// Everything is synthesised with WebAudio at play time.

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.propOsc = null;
    this.enabled = false;
  }

  start() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    this.ctx = new AudioContextClass();

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0.0;
    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 420;
    this.engineGain.connect(lowpass);
    lowpass.connect(this.ctx.destination);

    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 62;
    this.engineOsc.connect(this.engineGain);
    this.engineOsc.start();

    this.propOsc = this.ctx.createOscillator();
    this.propOsc.type = 'square';
    this.propOsc.frequency.value = 124;
    const propGain = this.ctx.createGain();
    propGain.gain.value = 0.35;
    this.propOsc.connect(propGain);
    propGain.connect(this.engineGain);
    this.propOsc.start();

    this.enabled = true;
  }

  setEngine(throttle, speedRatio, running) {
    if (!this.enabled) return;
    const now = this.ctx.currentTime;
    const target = running ? 0.05 + throttle * 0.11 : 0.0;
    this.engineGain.gain.setTargetAtTime(target, now, 0.12);
    const rpm = 58 + throttle * 88 + speedRatio * 22;
    this.engineOsc.frequency.setTargetAtTime(rpm, now, 0.1);
    this.propOsc.frequency.setTargetAtTime(rpm * 2.02, now, 0.1);
  }

  blip(freqStart, freqEnd, duration, volume, type = 'sine') {
    if (!this.enabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqEnd), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  ringChime() {
    this.blip(880, 880, 0.14, 0.16);
    setTimeout(() => this.blip(1318, 1318, 0.22, 0.16), 70);
  }

  touchdown() {
    this.blip(140, 55, 0.28, 0.22, 'triangle');
  }

  crash() {
    this.blip(220, 32, 0.7, 0.3, 'sawtooth');
    setTimeout(() => this.blip(90, 28, 0.5, 0.2, 'square'), 60);
  }

  finishFanfare() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((freq, i) => setTimeout(() => this.blip(freq, freq, 0.3, 0.15), i * 130));
  }
}
