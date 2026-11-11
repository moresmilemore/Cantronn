// ═══════════════════════════════════════════════════════════════════════════
//  CITRUS KITTEN (CANTRONN) — WEB AUDIO SYNTH & EXPRESSIVE VOICE ENGINE
// ═══════════════════════════════════════════════════════════════════════════

const PENTA_NOTES = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]; // C4 Pentatonic
const FEVER_NOTES = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50]; // C5 Pentatonic
const BASE_BEAT_DUR = 60 / 106;
const MAX_PURR_VOL = 0.22;

// Novelty/broken system voices on macOS/browsers to exclude
const NOVELTY_VOICE_RE =
  /albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|organ|trinoids|whisper|zarvox|jester|wobble|superstar/i;

export class SoundEngine {
  constructor(initialSettings = {}) {
    this.audioCtx = null;
    this.purrGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.audioInited = false;

    this.musicOn = initialSettings.musicOn !== false;
    this.sfxOn = initialSettings.sfxOn !== false;
    this.voiceMode = initialSettings.voiceMode || 'unhinged'; // 'unhinged' | 'wholesome' | 'off'

    this.musicTimeout = null;
    this.suspendTimer = null;
    this.nextNoteTime = 0;
    this.musicStep = 0;
    this.isPlaying = false;
    this.isPaused = false;
    this.levelIdx = 0;
    this.feverActive = false;

    this.speechBusy = false;
    this.speechSafetyTimer = null;
    this.lastMeowTime = 0;
    this.cachedVoices = [];

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        try {
          this.cachedVoices = window.speechSynthesis.getVoices() || [];
        } catch (e) {}
      };
      loadVoices();
      window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
    }
  }

  init() {
    clearTimeout(this.suspendTimer);
    if (this.audioInited && this.audioCtx) {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return;
    }

    const AudioContextClass =
      typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!AudioContextClass) return;

    this.audioCtx = new AudioContextClass();
    const ctx = this.audioCtx;

    // 1. Purr Synthesizer Bus
    this.purrGain = ctx.createGain();
    this.purrGain.gain.setValueAtTime(0, ctx.currentTime);
    this.purrGain.connect(ctx.destination);

    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 300;
    lpf.Q.value = 1.4;
    lpf.connect(this.purrGain);

    const trem = ctx.createGain();
    trem.gain.setValueAtTime(1, ctx.currentTime);
    trem.connect(lpf);

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 25;
    const lfoD = ctx.createGain();
    lfoD.gain.value = 0.55;
    lfo.connect(lfoD);
    lfoD.connect(trem.gain);
    lfo.start();

    [
      [29, 0.58],
      [58, 0.28],
      [87, 0.12],
    ].forEach(([freq, w], i) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      o.detune.value = i * 6;
      const g = ctx.createGain();
      g.gain.value = w;
      o.connect(g);
      g.connect(trem);
      o.start();
    });

    // 2. Background Music Bus
    this.musicGain = ctx.createGain();
    this.musicGain.gain.setValueAtTime(this.musicOn ? 0.055 : 0, ctx.currentTime);
    this.musicGain.connect(ctx.destination);

    // 3. SFX Bus
    this.sfxGain = ctx.createGain();
    this.sfxGain.gain.setValueAtTime(this.sfxOn ? 1.0 : 0, ctx.currentTime);
    this.sfxGain.connect(ctx.destination);

    this.audioInited = true;
  }

  startSession(levelIdx = 0) {
    clearTimeout(this.suspendTimer);
    clearTimeout(this.musicTimeout);
    this.init();
    this.isPlaying = true;
    this.isPaused = false;
    this.levelIdx = levelIdx;
    this.feverActive = false;

    if (this.audioCtx) {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      const now = this.audioCtx.currentTime;
      if (this.musicGain) {
        this.musicGain.gain.cancelScheduledValues(now);
        this.musicGain.gain.setTargetAtTime(this.musicOn ? 0.055 : 0, now, 0.15);
      }
      if (this.sfxGain) {
        this.sfxGain.gain.setValueAtTime(this.sfxOn ? 1.0 : 0, now);
      }
      this.nextNoteTime = now + 0.05;
      this.musicStep = 0;
      this.scheduleMusicLoop();
    }
  }

  pauseSession() {
    this.isPaused = true;
    clearTimeout(this.musicTimeout);
    if (this.audioCtx && this.audioCtx.state === 'running') {
      this.audioCtx.suspend().catch(() => {});
    }
  }

  resumeSession() {
    if (!this.isPlaying) return;
    this.isPaused = false;
    clearTimeout(this.suspendTimer);
    if (this.audioCtx) {
      this.audioCtx.resume().catch(() => {});
      this.nextNoteTime = Math.max(this.nextNoteTime, this.audioCtx.currentTime + 0.05);
      this.scheduleMusicLoop();
    }
  }

  stopSession() {
    this.isPlaying = false;
    this.isPaused = false;
    this.feverActive = false;
    clearTimeout(this.musicTimeout);
    clearTimeout(this.speechSafetyTimer);
    this.speechBusy = false;
    this.cancelSpeech();

    if (this.audioCtx) {
      const now = this.audioCtx.currentTime;
      this.purrGain?.gain.setTargetAtTime(0, now, 0.08);
      this.musicGain?.gain.setTargetAtTime(0, now, 0.08);
      clearTimeout(this.suspendTimer);
      this.suspendTimer = setTimeout(() => {
        if (!this.isPlaying && this.audioCtx && this.audioCtx.state === 'running') {
          this.audioCtx.suspend().catch(() => {});
        }
      }, 380);
    }
  }

  scheduleMusicLoop() {
    clearTimeout(this.musicTimeout);
    if (!this.isPlaying || this.isPaused || !this.audioCtx || !this.musicGain) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const speedFactor = this.feverActive
      ? 0.55
      : Math.max(0.58, 1 - this.levelIdx * 0.03);
    const beatDur = BASE_BEAT_DUR * speedFactor;

    if (this.nextNoteTime < now - 0.05) {
      this.nextNoteTime = now + 0.02;
    }

    const lookaheadSec = 0.8;
    const notesPool = this.feverActive ? FEVER_NOTES : PENTA_NOTES;

    while (this.nextNoteTime < now + lookaheadSec) {
      const t = this.nextNoteTime;
      const stepIndex = this.musicStep;
      const freq = notesPool[stepIndex % notesPool.length];

      const osc = ctx.createOscillator();
      osc.type = this.feverActive ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, t);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(this.feverActive ? 0.55 : 0.45, t + 0.04);
      env.gain.exponentialRampToValueAtTime(0.001, t + beatDur * 0.82);

      osc.connect(env);
      env.connect(this.musicGain);
      osc.start(t);
      osc.stop(t + beatDur * 0.85);
      osc.onended = () => {
        osc.disconnect();
        env.disconnect();
      };

      if (stepIndex % 4 === 0) {
        const bass = ctx.createOscillator();
        bass.type = 'sine';
        bass.frequency.setValueAtTime(freq * 0.5, t);
        const bEnv = ctx.createGain();
        bEnv.gain.setValueAtTime(0, t);
        bEnv.gain.linearRampToValueAtTime(0.3, t + 0.03);
        bEnv.gain.exponentialRampToValueAtTime(0.001, t + beatDur * 1.5);
        bass.connect(bEnv);
        bEnv.connect(this.musicGain);
        bass.start(t);
        bass.stop(t + beatDur * 1.55);
        bass.onended = () => {
          bass.disconnect();
          bEnv.disconnect();
        };
      }

      this.nextNoteTime += beatDur;
      this.musicStep++;
    }

    this.musicTimeout = setTimeout(() => this.scheduleMusicLoop(), 250);
  }

  setMusicOn(on) {
    this.musicOn = Boolean(on);
    if (this.audioCtx && this.musicGain) {
      this.musicGain.gain.setTargetAtTime(
        this.musicOn && this.isPlaying ? 0.055 : 0,
        this.audioCtx.currentTime,
        0.2
      );
    }
  }

  setSfxOn(on) {
    this.sfxOn = Boolean(on);
    if (this.audioCtx && this.sfxGain) {
      this.sfxGain.gain.setValueAtTime(this.sfxOn ? 1.0 : 0, this.audioCtx.currentTime);
    }
    if (!this.sfxOn && this.audioCtx && this.purrGain) {
      this.purrGain.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.15);
    }
    if (!this.sfxOn) {
      this.cancelSpeech();
    }
  }

  setVoiceMode(mode) {
    this.voiceMode = mode;
    if (mode === 'off') {
      this.cancelSpeech();
    }
  }

  setPurrVol(pct) {
    if (!this.purrGain || !this.audioCtx) return;
    const target =
      this.sfxOn && this.isPlaying ? Math.sqrt(Math.max(0, pct) / 100) * MAX_PURR_VOL : 0;
    this.purrGain.gain.setTargetAtTime(target, this.audioCtx.currentTime, 0.45);
  }

  // ── Expressive Procedural Cat Vocalizations & SFX ──

  playMeow(combo = 1) {
    if (!this.sfxOn || !this.audioCtx || !this.sfxGain) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    // Throttle rapid meows during multi-slice so oscillators don't clash
    if (now - this.lastMeowTime < 0.16) return;
    this.lastMeowTime = now;

    // Dual-formant expressive cat chirp/mew
    const pattern = Math.floor(Math.random() * 3);
    const root = 520 + Math.min(combo * 18, 160) + (Math.random() - 0.5) * 70;
    const dur = pattern === 0 ? 0.34 : pattern === 1 ? 0.46 : 0.4;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';

    if (pattern === 0) {
      // Quick happy "mrrp!" upward chirp
      osc.frequency.setValueAtTime(root * 0.72, now);
      osc.frequency.exponentialRampToValueAtTime(root * 1.38, now + 0.14);
      osc.frequency.exponentialRampToValueAtTime(root * 1.05, now + dur);
    } else if (pattern === 1) {
      // Classic melodic "me-ow~" arc
      osc.frequency.setValueAtTime(root * 0.85, now);
      osc.frequency.exponentialRampToValueAtTime(root * 1.42, now + 0.13);
      osc.frequency.exponentialRampToValueAtTime(root * 0.76, now + 0.36);
      osc.frequency.linearRampToValueAtTime(root * 0.65, now + dur);
    } else {
      // Cute double "mew-mew!" bounce
      osc.frequency.setValueAtTime(root * 0.9, now);
      osc.frequency.exponentialRampToValueAtTime(root * 1.3, now + 0.1);
      osc.frequency.setValueAtTime(root * 0.95, now + 0.18);
      osc.frequency.exponentialRampToValueAtTime(root * 1.45, now + 0.3);
      osc.frequency.exponentialRampToValueAtTime(root * 0.88, now + dur);
    }

    // Vowel formant filter (transitions from "ee" to "ah/oh")
    const formant1 = ctx.createBiquadFilter();
    formant1.type = 'bandpass';
    formant1.frequency.setValueAtTime(1100, now);
    formant1.frequency.exponentialRampToValueAtTime(1650, now + dur * 0.35);
    formant1.frequency.exponentialRampToValueAtTime(850, now + dur);
    formant1.Q.value = 4.2;

    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 2600;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(0.28, now + 0.035);
    env.gain.setValueAtTime(0.26, now + dur * 0.45);
    env.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(formant1);
    formant1.connect(lpf);
    lpf.connect(env);
    env.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + dur + 0.02);
    osc.onended = () => {
      osc.disconnect();
      formant1.disconnect();
      lpf.disconnect();
      env.disconnect();
    };
  }

  playCatchPop(combo = 1) {
    if (!this.sfxOn || !this.audioCtx || !this.sfxGain) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const pitchMult = 1 + Math.min(combo, 8) * 0.055;

    // Crisp juicy pop transient
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520 * pitchMult, now);
    osc.frequency.exponentialRampToValueAtTime(1120 * pitchMult, now + 0.065);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.22, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(env);
    env.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
    osc.onended = () => {
      osc.disconnect();
      env.disconnect();
    };
  }

  playGoldenChime() {
    if (!this.sfxOn || !this.audioCtx || !this.sfxGain) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    [587.33, 880, 1174.66, 1567.98].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      const t = now + idx * 0.04;
      osc.frequency.setValueAtTime(freq, t);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.18, t);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(env);
      env.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.3);
      osc.onended = () => {
        osc.disconnect();
        env.disconnect();
      };
    });
  }

  playPowerupSound() {
    if (!this.sfxOn || !this.audioCtx || !this.sfxGain) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    [440, 554.37, 659.25, 880].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const t = now + idx * 0.048;
      osc.frequency.setValueAtTime(freq, t);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.18, t);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(env);
      env.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.24);
      osc.onended = () => {
        osc.disconnect();
        env.disconnect();
      };
    });
  }

  playShieldBlock() {
    if (!this.sfxOn || !this.audioCtx || !this.sfxGain) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(960, now + 0.18);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.25, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(env);
    env.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.24);
    osc.onended = () => {
      osc.disconnect();
      env.disconnect();
    };
  }

  playLevelUpWhoosh() {
    if (!this.sfxOn || !this.audioCtx || !this.sfxGain) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const bufLen = Math.floor(ctx.sampleRate * 0.38);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(i / bufLen, 0.5);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.setValueAtTime(450, now);
    filt.frequency.linearRampToValueAtTime(2200, now + 0.38);
    filt.Q.value = 1.6;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.26, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    src.connect(filt);
    filt.connect(env);
    env.connect(this.sfxGain);
    src.start(now);
    src.stop(now + 0.42);
    src.onended = () => {
      src.disconnect();
      filt.disconnect();
      env.disconnect();
    };
  }

  playHiss() {
    if (!this.sfxOn || !this.audioCtx || !this.sfxGain) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.42);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.24, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.46);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.5);
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
  }

  // ── Smart Voice Selection & Natural Speech Synthesis ──

  cancelSpeech() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  pickBestVoice(style = 'unhinged') {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const allVoices =
      this.cachedVoices.length > 0
        ? this.cachedVoices
        : window.speechSynthesis.getVoices() || [];
    if (!allVoices.length) return null;

    // Filter to English voices and exclude broken/novelty voices
    const englishVoices = allVoices.filter(
      (v) => /^en(-|_|$)/i.test(v.lang || '') && !NOVELTY_VOICE_RE.test(v.name || '')
    );
    const pool = englishVoices.length > 0 ? englishVoices : allVoices;

    if (style === 'wholesome') {
      // Prefer natural, bright, expressive voices
      const preferredWholesome = [
        /natural|neural|premium|enhanced/i,
        /samantha|ava|allison|victoria|karen|moira|tessa|google us english/i,
      ];
      for (const regex of preferredWholesome) {
        const match = pool.find((v) => regex.test(v.name));
        if (match) return match;
      }
      return pool.find((v) => v.default) || pool[0];
    }

    // For 'unhinged': prefer clear, deadpan, resonant voices
    const preferredDeadpan = [
      /daniel|alex|arthur|oliver|aaron|rishi|google uk english male|reed|evan|nathan/i,
      /natural|neural|premium|enhanced/i,
      /samantha|google us english/i,
    ];
    for (const regex of preferredDeadpan) {
      const match = pool.find((v) => regex.test(v.name));
      if (match) return match;
    }
    return pool.find((v) => v.default) || pool[0];
  }

  speakIt(text, pitchV = 1.0, rateV = 1.0, style = this.voiceMode) {
    if (!this.sfxOn || this.voiceMode === 'off') return null;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    try {
      const u = new SpeechSynthesisUtterance(text);
      const chosenVoice = this.pickBestVoice(style);
      if (chosenVoice) u.voice = chosenVoice;
      // Keep pitch & rate in the clean, natural, non-garbled sweet spot
      u.pitch = Math.max(0.55, Math.min(1.45, pitchV));
      u.rate = Math.max(0.78, Math.min(1.25, rateV));
      u.volume = 0.92;
      window.speechSynthesis.speak(u);
      return u;
    } catch (e) {
      return null;
    }
  }

  playBiteVoice(biteCount) {
    if (!this.sfxOn || this.voiceMode === 'off' || this.speechBusy) return;
    this.speechBusy = true;
    this.cancelSpeech();

    if (this.voiceMode === 'wholesome') {
      const phrases = [
        'Mmm, thank you! That orange was so sweet!',
        'Purrfect catch! More citrus please!',
        'Yummy! Vitamin C secured!',
        'Nom nom nom! Best orchard ever!',
        'So juicy! My tummy is super happy!',
        'Ooh, right in the paws! Delicious!',
      ];
      const line = phrases[Math.floor(Math.random() * phrases.length)];
      const u = this.speakIt(line, 1.24 + (Math.random() - 0.5) * 0.08, 1.04, 'wholesome');
      this.armSpeechReset(u);
      return;
    }

    // Classic 'unhinged' deadpan comedy mode — crisp, clear, and progressively deeper without robotic distortion
    const depthStep = Math.min(12, Math.floor(biteCount / 6));
    const pitch = Math.max(0.58, 0.92 - depthStep * 0.028);
    const rate = Math.max(0.82, 0.95 - depthStep * 0.01);

    const unhingedLines = [
      'Thank you... yes daddy. More orange.',
      'Mmm. Thank you for the citrus, daddy.',
      'Yes. Feed the kitty. Do not stop.',
      'Exquisite acidity. Give me another one.',
      'Thank yoooou... yes daddy, keep them coming.',
      'My hunger is eternal. Feed me faster.',
      'Oh yes. That is the good vitamin C.',
    ];
    const line = unhingedLines[Math.floor(Math.random() * unhingedLines.length)];
    const u = this.speakIt(line, pitch, rate, 'unhinged');
    this.armSpeechReset(u);
  }

  playMissVoice() {
    if (!this.sfxOn || this.voiceMode === 'off') return;
    this.cancelSpeech();
    this.speechBusy = false;

    if (this.voiceMode === 'wholesome') {
      const lines = [
        'Oh no, my orange splatted!',
        'Oops, we missed one! Watch out!',
        'Come back, little orange!',
        'Aw, right on the floor!',
      ];
      const u = this.speakIt(
        lines[Math.floor(Math.random() * lines.length)],
        1.18,
        1.02,
        'wholesome'
      );
      this.armSpeechReset(u);
      return;
    }

    const lines = [
      'You dropped my orange, you absolute donkey.',
      'Are you serious right now? Pick it up.',
      'Slow down, you asshole. That was mine.',
      'Unbelievable. My vitamin C is on the floor.',
      'Focus! You are starving the cat!',
    ];
    const u = this.speakIt(lines[Math.floor(Math.random() * lines.length)], 0.65, 0.88, 'unhinged');
    this.armSpeechReset(u);
  }

  playGameOverVoice(reason) {
    if (!this.sfxOn || this.voiceMode === 'off') return;
    setTimeout(() => {
      if (this.isPlaying) return;
      if (this.voiceMode === 'wholesome') {
        const msg =
          reason === 'starved'
            ? 'My tummy is rumbling! Let us play again and catch more oranges!'
            : reason === 'time_up'
            ? 'Time is up! Great job catching all that citrus!'
            : 'All out of lives! Ready for another round?';
        this.speakIt(msg, 1.2, 1.0, 'wholesome');
      } else {
        const msg =
          reason === 'starved'
            ? 'I am literally starving. Why did you fail me like this.'
            : reason === 'time_up'
            ? 'Time is up. Honestly, not terrible. Feed me again.'
            : 'You let them all fall. Absolute disaster. Hit play again.';
        this.speakIt(msg, 0.62, 0.85, 'unhinged');
      }
    }, 320);
  }

  armSpeechReset(utterance) {
    clearTimeout(this.speechSafetyTimer);
    this.speechSafetyTimer = setTimeout(() => {
      this.speechBusy = false;
    }, 4500);
    const reset = () => {
      this.speechBusy = false;
      clearTimeout(this.speechSafetyTimer);
    };
    if (utterance) {
      utterance.onend = reset;
      utterance.onerror = reset;
    } else {
      reset();
    }
  }
}
