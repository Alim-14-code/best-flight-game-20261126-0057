// Procedural sound, no audio files: a WebAudio engine hum that follows the throttle, a chime
// when a ring is flown, a thud on a crash and a little fanfare on landing. Nothing plays until
// the player's first gesture (browsers demand that), and M mutes everything.

export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineSub = null;
  let engineGain = null;
  let muted = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      ctx = new AudioContext();
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineSub = ctx.createOscillator();
      engineSub.type = 'sine';
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      engineOsc.connect(filter);
      engineSub.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();
      engineSub.start();
      return true;
    } catch {
      return false;
    }
  }

  function blip(freq, at, dur, type = 'sine', vol = 0.16) {
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ctx.currentTime + at);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + at + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + at);
    osc.stop(ctx.currentTime + at + dur + 0.05);
  }

  return {
    /** Call from the first user gesture; also (re)starts the engine hum. */
    unlock() {
      if (!ensure()) return;
      if (ctx.state === 'suspended') void ctx.resume();
    },
    /** Engine hum follows throttle 0..1 and speed; silent on the title screen. */
    engine(throttle, speed, running) {
      if (!ctx || muted) {
        if (engineGain) engineGain.gain.value = 0;
        return;
      }
      const target = running ? 0.035 + throttle * 0.05 + speed * 0.00012 : 0;
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.12);
      const base = 52 + throttle * 46 + speed * 0.12;
      engineOsc.frequency.setTargetAtTime(base, ctx.currentTime, 0.1);
      engineSub.frequency.setTargetAtTime(base / 2, ctx.currentTime, 0.1);
    },
    ring(centre) {
      blip(880, 0, 0.16);
      blip(1318, 0.09, 0.2);
      if (centre) blip(1760, 0.18, 0.24);
    },
    crash() {
      if (!ctx || muted) return;
      const len = Math.floor(ctx.sampleRate * 0.5);
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = 0.3;
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start();
      blip(70, 0, 0.4, 'sine', 0.25);
    },
    land() {
      blip(523, 0, 0.18);
      blip(659, 0.12, 0.18);
      blip(784, 0.24, 0.3);
    },
    toggleMute() {
      muted = !muted;
      if (engineGain) engineGain.gain.value = 0;
      return muted;
    },
  };
}
