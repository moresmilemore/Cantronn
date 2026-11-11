// ═══════════════════════════════════════════════════════════════════════════
//  CITRUS KITTEN (CANTRONN) — WEB AUDIO SYNTH & SPEECH ENGINE
// ═══════════════════════════════════════════════════════════════════════════

const PENTA_NOTES = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]; // C4 Pentatonic
const FEVER_NOTES = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50]; // C5 Pentatonic
const BASE_BEAT_DUR = 60 / 105; // ~0.57s per beat
const MAX_PURR_VOL = 0.22;

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

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.addEventListener?.('voiceschanged', () => {});
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
    lpf.frequency.value = 320;
    lpf.Q.value = 1.2;
    lpf.connect(this.purrGain);

    const trem = ctx.createGain();
    trem.gain.setValueAtTime(1, ctx.currentTime);
    trem.connect(lpf);

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 26;
    const lfoD = ctx.createGain();
    lfoD.gain.value = 0.55;
    lfo.connect(lfoD);
    lfoD.connect(trem.gain);
    lfo.start();

    [
      [30, 0.6],
      [60, 0.28],
      [90, 0.12],
    ].forEach(([freq, w], i) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      o.detune.value = i * 7;
      const g = ctx.createGain();
      g.gain.value = w;
      o.connect(g);
      g.connect(trem);
      o.start();
    });

    // 2. Background Music Bus
    this.musicGain = ctx.createGain();
    this.musicGain.gain.setValueAtTime(this.musicOn ? 0.06 : 0, ctx.currentTime);
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
        this.musicGain.gain.setTargetAtTime(this.musicOn ? 0.06 : 0, now, 0.15);
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
      env.gain.linearRampToValueAtTime(this.feverActive ? 0.6 : 0.48, t + 0.04);
      env.gain.exponentialRampToValueAtTime(0.001, t + beatDur * 0.82);

      osc.connect(env);
      env.connect(this.musicGain);
      osc.start(t);
      osc.stop(t + beatDur * 0.85);
      osc.onended = () => {
        osc.disconnect();
        env.disconnect();
      };

      // Subtle bass note every 4 steps
      if (stepIndex % 4 === 0) {
        const bass = ctx.createOscillator();
        bass.type = 'sine';
        bass.frequency.setValueAtTime(freq * 0.5, t);
        const bEnv = ctx.createGain();
        bEnv.gain.setValueAtTime(0, t);
        bEnv.gain.linearRampToValueAtTime(0.32, t + 0.03);
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
        this.musicOn && this.isPlaying ? 0.06 : 0,
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
    const target = this.sfxOn && this.isPlaying ? Math.sqrt(Math.max(0, pct) / 100) * MAX_PURR_VOL : 0;
    this.purrGain.gain.setTargetAtTime(target, this.audioCtx.currentTime, 0.45);
  }

  // ── Procedural Sound Effects ──

  playMeow(combo = 1) {
    if (!this.sfxOn || !this.audioCtx || !this.sfxGain) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const root = 480 + Math.min(combo * 15, 140) + Math.random() * 120;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(root * 0.75, now);
    osc.frequency.linearRampToValueAtTime(root * 1.35, now + 0.12);
    osc.frequency.linearRampToValueAtTime(root * 0.6, now + 0.38);
    osc.frequency.linearRampToValueAtTime(root * 0.45, now + 0.55);

    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.setValueAtTime(900, now);
    filt.frequency.linearRampToValueAtTime(1400, now + 0.12);
    filt.frequency.linearRampToValueAtTime(700, now + 0.5);
    filt.Q.value = 3.5;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.35, now + 0.04);
    env.gain.setValueAtTime(0.35, now + 0.06);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(filt);
    filt.connect(env);
    env.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.65);
    osc.onended = () => {
      osc.disconnect();
      filt.disconnect();
      env.disconnect();
    };
  }

  playCatchPop(combo = 1) {
    if (!this.sfxOn || !this.audioCtx || !this.sfxGain) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const pitchMult = 1 + Math.min(combo, 8) * 0.05;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(860 * pitchMult, now);
    osc.frequency.linearRampToValueAtTime(440 * pitchMult, now + 0.08);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.2, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(env);
    env.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.12);
    osc.onended = () => {
      osc.disconnect();
      env.disconnect();
    };
  }

  playGoldenChime() {
    if (!this.sfxOn || !this.audioCtx || !this.sfxGain) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    [587.33, 880, 1174.66].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      const t = now + idx * 0.045;
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
      const t = now + idx * 0.05;
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
    const bufLen = Math.floor(ctx.sampleRate * 0.4);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(i / bufLen, 0.5);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.setValueAtTime(400, now);
    filt.frequency.linearRampToValueAtTime(2400, now + 0.4);
    filt.Q.value = 1.5;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.3, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    src.connect(filt);
    filt.connect(env);
    env.connect(this.sfxGain);
    src.start(now);
    src.stop(now + 0.45);
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
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.linearRampToValueAtTime(220, now + 0.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.28, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.6);
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
  }

  // ── Speech Synthesis ──

  cancelSpeech() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  speakIt(text, pitchV = 1.0, rateV = 1.0) {
    if (!this.sfxOn || this.voiceMode === 'off') return null;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    try {
      const voices = window.speechSynthesis.getVoices();
      const v =
        voices.find((voice) => /male|deep|uk|daniel|alex/i.test(voice.name)) || voices[0];
      const u = new SpeechSynthesisUtterance(text);
      u.pitch = pitchV;
      u.rate = rateV;
      u.volume = 0.9;
      if (v) u.voice = v;
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
        'thank you! so yummy!',
        'purrfect citrus!',
        'nom nom nom, more oranges please!',
        'vitamin C secured!',
      ];
      const u = this.speakIt(phrases[Math.floor(Math.random() * phrases.length)], 1.35, 1.05);
      this.armSpeechReset(u);
      return;
    }

    // Classic 'unhinged' mode
    const pitch = Math.max(0, 1.0 - (biteCount - 1) * 0.045);
    const rate = Math.max(0.35, 0.85 - (biteCount - 1) * 0.025);
    const tp = ['thank you', 'thank yoooou', 'thaaaaank you', 'thank you for the orange'];
    const dp = ['yes daddy', 'yes. daddy.', 'yeeees daddy', 'yes daddy. more orange.'];
    const u1 = this.speakIt(tp[Math.floor(Math.random() * tp.length)], pitch, rate);
    const u2 = this.speakIt(
      dp[Math.floor(Math.random() * dp.length)],
      Math.max(0, pitch * 0.7),
      Math.max(0.3, rate * 0.85)
    );
    this.armSpeechReset(u2 || u1);
  }

  playMissVoice() {
    if (!this.sfxOn || this.voiceMode === 'off') return;
    this.cancelSpeech();
    this.speechBusy = false;

    if (this.voiceMode === 'wholesome') {
      const lines = ['oh no, my orange!', 'oops, we missed one!', 'my citrus splatted!'];
      this.speakIt(lines[Math.floor(Math.random() * lines.length)], 1.2, 1.0);
      return;
    }

    const lines = [
      'you are an asshole',
      'slow down, you asshole',
      'asshole. i said savour it.',
      'you absolute asshole. slow. down.',
    ];
    this.speakIt(lines[Math.floor(Math.random() * lines.length)], 0.1, 0.7);
  }

  playGameOverVoice(reason) {
    if (!this.sfxOn || this.voiceMode === 'off') return;
    setTimeout(() => {
      if (this.isPlaying) return; // Don't speak if player already started a new game!
      if (this.voiceMode === 'wholesome') {
        const msg =
          reason === 'starved'
            ? 'my tummy is rumbling. feed me again soon!'
            : reason === 'time_up'
            ? 'time is up! great job catching oranges!'
            : 'all out of lives! let us try again!';
        this.speakIt(msg, 1.2, 0.95);
      } else {
        const msg =
          reason === 'starved'
            ? 'i am so hungry. why did you fail me.'
            : reason === 'time_up'
            ? 'time is up. feed me faster next time.'
            : 'you let them all fall. asshole.';
        this.speakIt(msg, 0, 0.5);
      }
    }, 350);
  }

  armSpeechReset(utterance) {
    clearTimeout(this.speechSafetyTimer);
    this.speechSafetyTimer = setTimeout(() => {
      this.speechBusy = false;
    }, 5000);
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
