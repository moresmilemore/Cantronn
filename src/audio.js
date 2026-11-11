// ═══════════════════════════════════════════════════════════════════════════
//  CITRUS KITTEN (CANTRONN) — WEB AUDIO SYNTH & STUDIO VOICE SAMPLE ENGINE
// ═══════════════════════════════════════════════════════════════════════════

import { VOICE_BANK } from './voice-bank.js';

const PENTA_NOTES = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]; // C4 Pentatonic
const FEVER_NOTES = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50]; // C5 Pentatonic
const BASE_BEAT_DUR = 60 / 106;
const MAX_PURR_VOL = 0.22;

function base64ToArrayBuffer(b64) {
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const len = bin.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return bytes.buffer;
  }
  if (typeof Buffer !== 'undefined') {
    const buf = Buffer.from(b64, 'base64');
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
  return new ArrayBuffer(0);
}

export class SoundEngine {
  constructor(initialSettings = {}) {
    this.audioCtx = null;
    this.purrGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.voiceGain = null;
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
    this.secondPhraseTimer = null;
    this.activeVoiceSources = new Set();
    this.lastMeowTime = 0;
    this.meowCursor = 0;
    this.tyCursor = 0;
    this.ydCursor = 0;
    this.missCursor = 0;

    // Decoded Web Audio buffers from VOICE_BANK
    this.buffersDecoded = false;
    this.buffers = {
      meows: [],
      thankYou: [],
      yesDaddy: [],
      miss: [],
      gameOver: {},
    };
  }

  init() {
    clearTimeout(this.suspendTimer);
    if (this.audioInited && this.audioCtx) {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      if (!this.buffersDecoded) {
        this.decodeVoiceBank();
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

    // 4. Dedicated Studio Voice Bus (warm low-shelf chest body + smooth silk top)
    this.voiceGain = ctx.createGain();
    this.voiceGain.gain.setValueAtTime(1.0, ctx.currentTime);

    const chestShelf = ctx.createBiquadFilter();
    chestShelf.type = 'lowshelf';
    chestShelf.frequency.value = 160;
    chestShelf.gain.value = 2.8;

    const silkFilter = ctx.createBiquadFilter();
    silkFilter.type = 'lowpass';
    silkFilter.frequency.value = 7400;
    silkFilter.Q.value = 0.7;

    this.voiceGain.connect(chestShelf);
    chestShelf.connect(silkFilter);
    silkFilter.connect(this.sfxGain);

    this.audioInited = true;
    this.decodeVoiceBank();
  }

  async decodeClip(b64) {
    if (!this.audioCtx || typeof this.audioCtx.decodeAudioData !== 'function') return null;
    try {
      const ab = base64ToArrayBuffer(b64);
      if (!ab || ab.byteLength === 0) return null;
      return await this.audioCtx.decodeAudioData(ab.slice(0));
    } catch (e) {
      return null;
    }
  }

  async decodeVoiceBank() {
    if (this.buffersDecoded || !this.audioCtx || !VOICE_BANK) return;
    this.buffersDecoded = true;
    try {
      const decodeList = async (arr) => {
        const out = [];
        for (const item of arr || []) {
          const decoded = await this.decodeClip(item);
          if (decoded) out.push(decoded);
        }
        return out;
      };

      const [meows, thankYou, yesDaddy, miss, starved, noLives] = await Promise.all([
        decodeList(VOICE_BANK.meows),
        decodeList(VOICE_BANK.thankYou),
        decodeList(VOICE_BANK.yesDaddy),
        decodeList(VOICE_BANK.miss),
        VOICE_BANK.gameOver?.starved ? this.decodeClip(VOICE_BANK.gameOver.starved) : null,
        VOICE_BANK.gameOver?.no_lives ? this.decodeClip(VOICE_BANK.gameOver.no_lives) : null,
      ]);

      if (meows.length) this.buffers.meows = meows;
      if (thankYou.length) this.buffers.thankYou = thankYou;
      if (yesDaddy.length) this.buffers.yesDaddy = yesDaddy;
      if (miss.length) this.buffers.miss = miss;
      if (starved) this.buffers.gameOver.starved = starved;
      if (noLives) this.buffers.gameOver.no_lives = noLives;
    } catch (e) {
      // Safe fallback to procedural synth if AudioContext decoding is unavailable
    }
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
    clearTimeout(this.secondPhraseTimer);
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
      }, 650);
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

  // ── Real Recorded Kitten Meows & Crisp Arcade SFX ──

  playMeow(combo = 1) {
    if (!this.sfxOn || !this.audioCtx || !this.sfxGain) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    if (now - this.lastMeowTime < 0.14) return;
    this.lastMeowTime = now;

    // Play real recorded kitten meow buffer when decoded
    if (this.buffers.meows.length > 0) {
      const buf = this.buffers.meows[this.meowCursor % this.buffers.meows.length];
      this.meowCursor++;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const rate = 0.96 + Math.min(combo, 8) * 0.014 + (Math.random() - 0.5) * 0.05;
      src.playbackRate.setValueAtTime(rate, now);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.46, now);
      src.connect(g);
      g.connect(this.sfxGain);
      src.start(now);
      src.onended = () => {
        src.disconnect();
        g.disconnect();
      };
      return;
    }

    // Soft warm triangle fallback if audio buffers are still decoding on frame 1
    const root = 500 + Math.random() * 120;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(root * 0.78, now);
    osc.frequency.linearRampToValueAtTime(root * 1.28, now + 0.11);
    osc.frequency.linearRampToValueAtTime(root * 0.68, now + 0.34);

    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.setValueAtTime(920, now);
    filt.frequency.linearRampToValueAtTime(1320, now + 0.11);
    filt.frequency.linearRampToValueAtTime(760, now + 0.34);
    filt.Q.value = 2.8;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(0.26, now + 0.03);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

    osc.connect(filt);
    filt.connect(env);
    env.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.38);
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
    const pitchMult = 1 + Math.min(combo, 8) * 0.055;

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
    const dur = 0.34;
    const bufLen = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      const t = i / bufLen;
      const envShape = t < 0.08 ? t / 0.08 : Math.pow(1 - (t - 0.08) / 0.92, 1.4);
      data[i] = (Math.random() * 2 - 1) * envShape;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buf;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(3600, now);
    bp.frequency.exponentialRampToValueAtTime(2100, now + dur);
    bp.Q.value = 1.5;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.28, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(bp);
    bp.connect(env);
    env.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + dur + 0.02);
    noise.onended = () => {
      noise.disconnect();
      bp.disconnect();
      env.disconnect();
    };
  }

  // ── Studio Voice Buffer Playback Engine (No Robotic Browser speechSynthesis) ──

  cancelSpeech() {
    clearTimeout(this.secondPhraseTimer);
    clearTimeout(this.speechSafetyTimer);
    this.speechBusy = false;
    for (const src of this.activeVoiceSources) {
      try {
        src.onended = null;
        src.stop();
        src.disconnect();
      } catch (e) {}
    }
    this.activeVoiceSources.clear();
  }

  playVoiceBuffer(buf, rate = 1.0, volume = 0.95, onComplete = null) {
    if (!buf || !this.audioCtx || !this.voiceGain || !this.sfxOn || this.voiceMode === 'off') {
      onComplete?.();
      return null;
    }
    const ctx = this.audioCtx;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.setValueAtTime(Math.max(0.76, Math.min(1.25, rate)), now);

    const g = ctx.createGain();
    g.gain.setValueAtTime(volume, now);

    src.connect(g);
    g.connect(this.voiceGain);

    this.activeVoiceSources.add(src);
    src.onended = () => {
      this.activeVoiceSources.delete(src);
      src.disconnect();
      g.disconnect();
      onComplete?.();
    };
    src.start(now);
    return src;
  }

  playBiteVoice(biteCount = 8) {
    if (!this.sfxOn || this.voiceMode === 'off' || this.speechBusy) return;
    if (!this.audioCtx) return;

    // Wholesome mode: play an adorable real kitten double-meow chirp instead of TTS
    if (this.voiceMode === 'wholesome') {
      if (this.buffers.meows.length > 0) {
        this.speechBusy = true;
        const b1 = this.buffers.meows[this.meowCursor % this.buffers.meows.length];
        const b2 = this.buffers.meows[(this.meowCursor + 1) % this.buffers.meows.length];
        this.meowCursor += 2;
        this.playVoiceBuffer(b1, 1.08, 0.55, () => {
          this.secondPhraseTimer = setTimeout(() => {
            this.playVoiceBuffer(b2, 1.18, 0.58, () => {
              this.speechBusy = false;
            });
          }, 55);
        });
      }
      return;
    }

    // Unhinged mode: studio-recorded deep baritone two-part "Thank you... Yes, daddy"
    const tyPool = this.buffers.thankYou;
    const ydPool = this.buffers.yesDaddy;
    if (!tyPool.length || !ydPool.length) return;

    this.speechBusy = true;
    this.cancelSpeech();
    this.speechBusy = true;

    const milestone = Math.max(0, Math.floor(biteCount / 8) - 1);
    const rate1 = Math.max(0.85, 1.0 - milestone * 0.018);
    const rate2 = Math.max(0.82, rate1 * 0.95);

    const b1 = tyPool[this.tyCursor % tyPool.length];
    const b2 = ydPool[this.ydCursor % ydPool.length];
    this.tyCursor++;
    this.ydCursor++;

    clearTimeout(this.speechSafetyTimer);
    this.speechSafetyTimer = setTimeout(() => {
      this.speechBusy = false;
    }, 4500);

    this.playVoiceBuffer(b1, rate1, 0.96, () => {
      if (!this.isPlaying || !this.sfxOn || this.voiceMode === 'off') {
        this.speechBusy = false;
        clearTimeout(this.speechSafetyTimer);
        return;
      }
      this.secondPhraseTimer = setTimeout(() => {
        this.playVoiceBuffer(b2, rate2, 0.98, () => {
          this.speechBusy = false;
          clearTimeout(this.speechSafetyTimer);
        });
      }, 75);
    });
  }

  playMissVoice() {
    if (!this.sfxOn || this.voiceMode === 'off' || !this.audioCtx) return;

    // Wholesome mode: gentle plaintive kitten mew
    if (this.voiceMode === 'wholesome') {
      if (this.buffers.meows.length > 0) {
        const b = this.buffers.meows[this.meowCursor % this.buffers.meows.length];
        this.meowCursor++;
        this.playVoiceBuffer(b, 0.84, 0.52);
      }
      return;
    }

    const missPool = this.buffers.miss;
    if (!missPool.length) return;

    this.cancelSpeech();
    this.speechBusy = true;
    const buf = missPool[this.missCursor % missPool.length];
    this.missCursor++;

    clearTimeout(this.speechSafetyTimer);
    this.speechSafetyTimer = setTimeout(() => {
      this.speechBusy = false;
    }, 3500);

    this.playVoiceBuffer(buf, 0.94, 0.98, () => {
      this.speechBusy = false;
      clearTimeout(this.speechSafetyTimer);
    });
  }

  playGameOverVoice(reason) {
    if (!this.sfxOn || this.voiceMode === 'off' || !this.audioCtx) return;
    if (this.voiceMode === 'wholesome') return;

    const buf =
      reason === 'starved'
        ? this.buffers.gameOver.starved
        : this.buffers.gameOver.no_lives;
    if (!buf) return;

    setTimeout(() => {
      if (this.isPlaying || !this.sfxOn || this.voiceMode === 'off') return;
      this.playVoiceBuffer(buf, 0.94, 0.98);
    }, 180);
  }
}
