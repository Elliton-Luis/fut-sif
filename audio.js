(() => {
  'use strict';

  let context, master, ambience, noiseBuffer, enabled = true, inPlay = false;

  function syncMix() {
    if (!context || !master || !ambience) return;
    const t = context.currentTime;
    master.gain.setTargetAtTime(enabled ? .72 : 0, t, .017);
    ambience.gain.setTargetAtTime(inPlay ? .095 : 0, t, .15);
  }

  function unlock() {
    if (!enabled || !window.AudioContext) return;
    try {
      if (!context) {
        context = new window.AudioContext();
        noiseBuffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        let seed = 7285, smooth = 0;
        for (let i = 0; i < data.length; i++) {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          const white = seed / 2147483648 - 1;
          smooth = smooth * .97 + white * .03;
          data[i] = white * .57 + smooth * .55;
        }
        master = context.createGain();
        master.gain.value = 0;
        master.connect(context.destination);
        const bed = context.createBufferSource();
        bed.buffer = noiseBuffer;
        bed.loop = true;
        const filter = context.createBiquadFilter();
        filter.type = 'bandpass'; filter.frequency.value = 570; filter.Q.value = .48;
        ambience = context.createGain();
        ambience.gain.value = 0;
        bed.connect(filter).connect(ambience).connect(master);
        bed.start();
      }
      syncMix();
      if (context.state !== 'running') void context.resume().catch(() => {});
    } catch { /* Web Audio is optional. */ }
  }

  function voice(from, to, seconds, gain, shape = 'sine', delay = 0) {
    const t = context.currentTime + delay;
    const osc = context.createOscillator(), env = context.createGain();
    osc.type = shape;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + seconds);
    env.gain.setValueAtTime(.001, t);
    env.gain.linearRampToValueAtTime(gain, t + Math.min(.025, seconds / 4));
    env.gain.exponentialRampToValueAtTime(.001, t + seconds);
    osc.connect(env).connect(master);
    osc.start(t); osc.stop(t + seconds);
  }

  function wash(hz, endHz, seconds, gain, attack = .009, delay = 0, q = .6) {
    const t = context.currentTime + delay;
    const source = context.createBufferSource();
    source.buffer = noiseBuffer;
    const filter = context.createBiquadFilter(), env = context.createGain();
    filter.type = 'bandpass'; filter.Q.value = q;
    filter.frequency.setValueAtTime(hz, t);
    filter.frequency.exponentialRampToValueAtTime(endHz, t + seconds);
    env.gain.setValueAtTime(.001, t);
    env.gain.linearRampToValueAtTime(gain, t + attack);
    env.gain.exponentialRampToValueAtTime(.001, t + seconds);
    source.connect(filter).connect(env).connect(master);
    source.start(t); source.stop(t + seconds);
  }

  function whistle(delay = 0, duration = .23) {
    voice(1650, 2060, duration, .09, 'sine', delay);
    voice(2080, 1920, duration, .036, 'sine', delay);
    wash(2100, 1900, duration, .04, .018, delay, 5);
  }

  function cheer(gain, delay = 0) {
    wash(410, 815, .95, gain, .16, delay, .45);
    wash(1280, 640, .76, gain * .7, .09, delay + .08, .85);
  }

  function play(name, strength = 1) {
    if (!enabled || !master || context.state !== 'running') return;
    switch (name) {
      case 'start': whistle(); break;
      case 'finish': whistle(0, .15); whistle(.24, .37); cheer(.15, .18); break;
      case 'goal':
        cheer(.45);
        wash(1900, 420, .28, .29);
        [392, 523, 659, 784].forEach((note, i) => voice(note, note * .996, .25 + i * .028, .105, 'triangle', .05 + i * .105));
        break;
      case 'post':
        voice(760, 710, .22, .18, 'triangle'); voice(1940, 1590, .16, .085); cheer(.22);
        break;
      case 'jump': voice(170, 390, .13, .055, 'triangle'); break;
      case 'land': wash(360, 175, .085, .065); break;
      case 'bounce':
        voice(125 + strength * 140, 77, .09, .04 + strength * .062);
        wash(630, 310, .058, strength * .085);
        break;
      case 'header': voice(310, 138, .115, .092, 'triangle'); break;
      case 'slap': wash(2000, 620, .09, .105); voice(190, 100, .07, .045); break;
      case 'foul': whistle(0, .14); whistle(.17, .19); break;
      case 'wall': wash(980, 265, .14, strength * .13); break;
      case 'ground':
      case 'high':
      case 'reverse':
        voice(name === 'ground' ? 155 : 310, 92, .14, .14, 'triangle');
        wash(name === 'reverse' ? 2100 : 1250, 370, .15, .12);
        if (name === 'reverse') voice(690, 435, .17, .065, 'sine', .04);
        break;
      case 'charge': voice(245, 760, .26, .082, 'triangle'); break;
      case 'green': voice(880, 1010, .085, .048); break;
      case 'perfect':
      case 'special':
        wash(2350, 260, .38, .36);
        voice(145, 46, .35, .24, 'triangle');
        voice(name === 'perfect' ? 880 : 390, 215, .28, .093, 'sawtooth', .045);
        cheer(name === 'perfect' ? .23 : .12);
        break;
      case 'closing': voice(585, 585, .15, .09, 'triangle'); cheer(.14); break;
      case 'combo-fire':
        wash(2950, 185, .44, .39);
        voice(185, 49, .37, .26, 'triangle');
        voice(1010, 284, .29, .11, 'sawtooth', .045);
        cheer(.32, .09);
        break;
      case 'tick': voice(750, 745, .105, .076, 'triangle'); break;
      case 'ready': voice(655, 925, .16, .057, 'triangle'); break;
    }
  }

  window.arenaSound = {
    unlock, play,
    setEnabled(value) { enabled = value; if (value) unlock(); else syncMix(); },
    setInPlay(value) { inPlay = value; syncMix(); },
  };
})();
