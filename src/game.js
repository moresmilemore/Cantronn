// ═══════════════════════════════════════════════════════════════════════════
//  CITRUS KITTEN (CANTRONN) — CORE GAME ENGINE & UI CONTROLLER
// ═══════════════════════════════════════════════════════════════════════════

import {
  getLevelCfg,
  GAME_MODES,
  POWERUPS,
  FRUIT_TYPES,
  pickFruitType,
  ACHIEVEMENT_DEFS,
  KITTEN_SKINS,
  CATCH_MESSAGES,
  MISS_MESSAGES_UNHINGED,
  MISS_MESSAGES_WHOLESOME,
} from './config.js';

import {
  getBestScore,
  setBestScore,
  getLeaderboard,
  addLeaderboardEntry,
  getUnlockedAchievements,
  saveAchievements,
  getSessionStats,
  updateSessionStats,
  getSettings,
  saveSettings,
  getSelectedSkin,
  saveSelectedSkin,
} from './storage.js';

import { SoundEngine } from './audio.js';
import { CanvasFX, segmentIntersectsCircle } from './fx.js';

export function initCitrusKittenApp() {
  if (typeof document === 'undefined') return null;

  // ── DOM References ──
  const gameArea = document.getElementById('gameArea');
  const fxCanvas = document.getElementById('fxCanvas');
  const kittenWrap = document.getElementById('kittenWrap');
  const shieldDome = document.getElementById('shieldDome');
  const magnetAura = document.getElementById('magnetAura');
  const scoreDisp = document.getElementById('scoreDisplay');
  const levelDisp = document.getElementById('levelDisplay');
  const bestDisp = document.getElementById('bestDisplay');
  const livesDisp = document.getElementById('lives');
  const livesHudLabel = document.getElementById('livesHudLabel');
  const hungerBar = document.getElementById('hungerBar');
  const hungerHudLabel = document.getElementById('hungerHudLabel');
  const bubble = document.getElementById('bubble');
  const purrBar = document.getElementById('purrBar');
  const feverBar = document.getElementById('feverBar');
  const purrLabel = document.getElementById('purrLabel');
  const flashOv = document.getElementById('flashOverlay');
  const powerupHud = document.getElementById('powerupHud');
  const toastEl = document.getElementById('toastEl');
  const pupilL = document.getElementById('pupilL');
  const pupilR = document.getElementById('pupilR');
  const hungerVignette = document.getElementById('hungerVignette');
  const pauseOverlay = document.getElementById('pauseOverlay');
  const pauseBtn = document.getElementById('pauseBtn');
  const musicToggle = document.getElementById('musicToggle');
  const sfxToggle = document.getElementById('sfxToggle');
  const voiceToggle = document.getElementById('voiceToggle');

  // ── Persistent State & Subsystems ──
  const settings = getSettings();
  const sound = new SoundEngine(settings);
  const fx = new CanvasFX(fxCanvas);

  let best = getBestScore();
  let selectedMode = 'classic';
  let selectedSkin = getSelectedSkin();

  bestDisp.textContent = best;
  const startBestEl = document.getElementById('startBest');
  if (startBestEl) startBestEl.textContent = best;

  // ── Runtime Game State ──
  let gs = 'start'; // 'start' | 'playing' | 'over'
  let score = 0;
  let lives = 3;
  let levelIdx = 0;
  let hunger = 100;
  let blitzTimeLeft = 90;
  let combo = 0;
  let caught = 0;
  let missed = 0;
  let mouthCatchesThisGame = 0;
  let speechBiteCount = 0;
  let feverCharge = 0;
  let feverActive = false;
  let feverEndTime = 0;

  let oranges = [];
  let oid = 0;
  let spawnTimer = null;
  let animFrame = null;
  let lastTs = null;
  let bubbleTimer = null;
  let eyeTimer = null;
  let levelUpTimer = null;
  let scoreRollTimer = null;
  let toastTimer = null;

  let levelFrozen = false;
  let paused = false;
  let pausedAt = 0;
  let prevLives = -1; // Initialized to -1 so first updateHUD always renders!
  let displayedScore = 0;
  let maxComboThisGame = 0;
  let missesThisLevel = 0;
  let sessionUnlocks = [];
  let lifetimeCaughtBase = getSessionStats().totalCaught || 0;

  // Power-ups
  let activePowerups = {};
  let shieldActive = false;

  // Kitten Horizontal Movement & Hitbox Cache
  let kittenRatioX = 0.5; // 0.12 to 0.88 across screen width
  let kitCX = 0;
  let kitCY = 0;
  let hudOffsetTop = 60;
  const keysHeld = { left: false, right: false, shift: false };
  let draggingKitten = false;

  // Swipe / Slice State
  let isSwiping = false;
  let lastSwipePt = null;
  let swipeCatchCount = 0;

  // ── Audio & Voice Controls Setup ──
  function syncAudioButtons() {
    if (musicToggle) {
      musicToggle.textContent = sound.musicOn ? '🔊' : '🔇';
      musicToggle.title = sound.musicOn ? 'Music: ON' : 'Music: OFF';
    }
    if (sfxToggle) {
      sfxToggle.textContent = sound.sfxOn ? '🔔' : '🔕';
      sfxToggle.title = sound.sfxOn ? 'SFX & Purr: ON' : 'SFX & Purr: OFF';
    }
    if (voiceToggle) {
      const icon =
        sound.voiceMode === 'unhinged'
          ? '🌶️'
          : sound.voiceMode === 'wholesome'
          ? '😇'
          : '🙊';
      voiceToggle.textContent = icon;
      voiceToggle.title = `Voice Mode: ${sound.voiceMode.toUpperCase()} (Click to cycle)`;
    }
  }
  syncAudioButtons();

  musicToggle?.addEventListener('click', () => {
    sound.setMusicOn(!sound.musicOn);
    settings.musicOn = sound.musicOn;
    saveSettings(settings);
    syncAudioButtons();
  });

  sfxToggle?.addEventListener('click', () => {
    sound.setSfxOn(!sound.sfxOn);
    settings.sfxOn = sound.sfxOn;
    saveSettings(settings);
    syncAudioButtons();
    updatePurr();
  });

  voiceToggle?.addEventListener('click', () => {
    const order = ['unhinged', 'wholesome', 'off'];
    const next = order[(order.indexOf(sound.voiceMode) + 1) % order.length];
    sound.setVoiceMode(next);
    settings.voiceMode = next;
    saveSettings(settings);
    syncAudioButtons();
    const labelMap = {
      unhinged: '🌶️ Voice: Classic Unhinged',
      wholesome: '😇 Voice: Cute & Wholesome',
      off: '🙊 Voice: Off (SFX Only)',
    };
    showToast(labelMap[next], 1800);
  });

  // ── Kitten Skins & SVG Appearance ──
  function applyKittenSkin(skinId) {
    const unlocked = getUnlockedAchievements();
    const stats = getSessionStats();
    let skin = KITTEN_SKINS.find((s) => s.id === skinId);
    if (!skin || !skin.isUnlocked(unlocked, stats)) {
      skin = KITTEN_SKINS[0];
    }
    selectedSkin = skin.id;
    saveSelectedSkin(selectedSkin);

    const svg = kittenWrap?.querySelector('svg.kitten');
    if (svg) {
      svg.querySelectorAll('[data-skin]').forEach((el) => {
        const key = el.getAttribute('data-skin');
        if (skin.colors[key]) el.setAttribute('fill', skin.colors[key]);
      });
      svg.querySelectorAll('[data-skin-stroke]').forEach((el) => {
        const key = el.getAttribute('data-skin-stroke');
        if (skin.colors[key]) el.setAttribute('stroke', skin.colors[key]);
      });
    }

    const accMap = {
      bowtie: 'accBowtie',
      flower: 'accFlower',
      visor: 'accVisor',
      crown: 'accCrown',
    };
    Object.entries(accMap).forEach(([key, domId]) => {
      const el = document.getElementById(domId);
      if (el) el.style.display = skin.accessory === key ? '' : 'none';
    });

    const startEmoji = document.getElementById('startKittenEmoji');
    if (startEmoji) startEmoji.textContent = skin.icon;
  }

  function renderModeSelector() {
    const container = document.getElementById('modeSelector');
    if (!container) return;
    container.innerHTML = Object.values(GAME_MODES)
      .map(
        (m) => `
      <div class="mode-card ${m.id === selectedMode ? 'selected' : ''}" data-mode="${m.id}">
        <span class="mode-icon">${m.icon}</span>
        <div>
          <div class="mode-title">${m.name}</div>
          <div class="mode-desc">${m.desc}</div>
        </div>
      </div>
    `
      )
      .join('');

    container.querySelectorAll('.mode-card').forEach((card) => {
      card.addEventListener('click', () => {
        selectedMode = card.getAttribute('data-mode') || 'classic';
        renderModeSelector();
      });
    });
  }

  function renderWardrobe() {
    const container = document.getElementById('skinSelector');
    if (!container) return;
    const unlocked = getUnlockedAchievements();
    const stats = getSessionStats();

    container.innerHTML = KITTEN_SKINS.map((skin) => {
      const open = skin.isUnlocked(unlocked, stats);
      const isSel = skin.id === selectedSkin;
      return `
        <button type="button" class="skin-chip ${isSel ? 'selected' : ''} ${
        open ? '' : 'locked'
      }" data-skin-id="${skin.id}" title="${open ? skin.name : skin.unlockText}">
          ${skin.icon} ${skin.name} ${open ? '' : '🔒'}
        </button>
      `;
    }).join('');

    container.querySelectorAll('.skin-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-skin-id');
        const skin = KITTEN_SKINS.find((s) => s.id === id);
        if (!skin) return;
        if (!skin.isUnlocked(getUnlockedAchievements(), getSessionStats())) {
          showToast(`🔒 ${skin.unlockText}`, 2200);
          return;
        }
        applyKittenSkin(id);
        renderWardrobe();
        showToast(`${skin.icon} Equipped ${skin.name}!`, 1600);
      });
    });
  }

  // ── Leaderboard / Achievements UI ──
  function renderLeaderboardUI(lb, container) {
    if (!container) return;
    if (!lb.length) {
      container.innerHTML = '';
      return;
    }
    let html = '<div class="leaderboard"><h3>🏆 Top 10 High Scores</h3>';
    lb.forEach((e, i) => {
      const acc = typeof e.accuracy === 'number' ? e.accuracy + '%' : '?';
      const date = e.date ? new Date(e.date).toLocaleDateString() : '';
      const modeTag = e.mode && GAME_MODES[e.mode] ? GAME_MODES[e.mode].icon : '🎮';
      html += `<div class="lb-row">
        <span class="lb-rank">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1 + '.'}</span>
        <span class="lb-score">${e.score} <small>${modeTag}</small></span>
        <span class="lb-detail">Lv${e.level} · ${acc} · ${date}</span>
      </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  }

  function checkAchievement(id) {
    const unlocked = getUnlockedAchievements();
    if (unlocked.includes(id)) return;
    unlocked.push(id);
    saveAchievements(unlocked);
    sessionUnlocks.push(id);
    const def = ACHIEVEMENT_DEFS.find((d) => d.id === id);
    if (def) showToast(`${def.icon} Achievement: ${def.label}!`);
  }

  function renderAchievementsUI(container) {
    if (!container) return;
    const unlocked = getUnlockedAchievements();
    let html = `<div class="achievements-wrap"><h3>🎖️ Achievements (${unlocked.length}/${ACHIEVEMENT_DEFS.length})</h3><div class="ach-grid">`;
    ACHIEVEMENT_DEFS.forEach((d) => {
      const done = unlocked.includes(d.id);
      html += `<div class="ach-badge ${done ? 'unlocked' : 'locked'}" title="${d.desc}">${
        d.icon
      } ${d.label}</div>`;
    });
    html += '</div></div>';
    container.innerHTML = html;
  }

  function renderSessionStatsUI() {
    const s = getSessionStats();
    const el = document.getElementById('startSessionStats');
    if (!el) return;
    if (!s.gamesPlayed) {
      el.textContent = '';
      return;
    }
    el.textContent = `Games: ${s.gamesPlayed} · Total caught: ${
      s.totalCaught || 0
    } · Best combo: x${Math.min(8, s.bestCombo || 0)} (${
      s.bestCombo || 0
    } streak) · Best accuracy: ${s.bestAccuracy || 0}%`;
  }

  function showToast(msg, dur = 2600) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), dur);
  }

  // ── Kitten Face & Positioning ──
  function setFace(mood) {
    const en = document.getElementById('eyesNormal');
    const eh = document.getElementById('eyesHappy');
    const es = document.getElementById('eyesScared');
    const mn = document.getElementById('mouthNormal');
    const mh = document.getElementById('mouthHappy');
    const ms = document.getElementById('mouthSad');
    const tg = document.getElementById('tongue');
    if (en) en.style.display = mood === 'normal' || mood === 'sad' ? '' : 'none';
    if (eh) eh.style.display = mood === 'happy' ? '' : 'none';
    if (es) es.style.display = mood === 'scared' ? '' : 'none';
    if (mn) mn.style.display = mood === 'normal' || mood === 'scared' ? '' : 'none';
    if (mh) mh.style.display = mood === 'happy' ? '' : 'none';
    if (ms) ms.style.display = mood === 'sad' ? '' : 'none';
    if (tg) tg.style.display = mood === 'happy' ? '' : 'none';
  }

  function flashFace(mood, ms = 580) {
    setFace(mood);
    clearTimeout(eyeTimer);
    eyeTimer = setTimeout(() => {
      eyeTimer = null;
      setFace(hunger < 25 && selectedMode === 'classic' ? 'sad' : 'normal');
    }, ms);
  }

  function updateKittenDOMPos() {
    if (!kittenWrap) return;
    kittenRatioX = Math.max(0.1, Math.min(0.9, kittenRatioX));
    kittenWrap.style.left = `${kittenRatioX * 100}%`;
    cacheKittenPos();
  }

  function cacheKittenPos() {
    if (!kittenWrap || !gameArea) return;
    const areaRect = gameArea.getBoundingClientRect();
    hudOffsetTop = areaRect.top || 60;
    const kitRect = kittenWrap.getBoundingClientRect();
    // Coordinates in gameArea local space:
    kitCX = kitRect.left - areaRect.left + kitRect.width * 0.5;
    kitCY = kitRect.top - areaRect.top + kitRect.height * 0.42;
  }

  function updateEyeTracking() {
    if (!eyeTimer && oranges.length > 0 && pupilL && pupilR) {
      let nearest = null;
      let bestDist = Infinity;
      for (const o of oranges) {
        const dist = Math.hypot(o.x - kitCX, o.y - kitCY);
        if (o.y > -20 && dist < bestDist) {
          bestDist = dist;
          nearest = o;
        }
      }
      if (nearest) {
        const dx = Math.max(-4.5, Math.min(4.5, (nearest.x - kitCX) / 55));
        const dy = Math.max(-3.5, Math.min(3.5, (nearest.y - kitCY) / 75));
        pupilL.setAttribute('cx', String(213 + dx));
        pupilL.setAttribute('cy', String(158 + dy));
        pupilR.setAttribute('cx', String(273 + dx));
        pupilR.setAttribute('cy', String(158 + dy));
      }
    }
  }

  function showBubble(msg) {
    if (!bubble) return;
    bubble.textContent = msg;
    bubble.classList.add('show');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubble.classList.remove('show'), 1800);
  }

  // ── HUD & Visual Feedback ──
  function updateHUD() {
    // Score roll-up animation
    if (score !== displayedScore) {
      clearTimeout(scoreRollTimer);
      const diff = score - displayedScore;
      const step = Math.max(1, Math.ceil(Math.abs(diff) / 8));
      const rollStep = () => {
        if (displayedScore === score) return;
        const d = score - displayedScore;
        displayedScore += Math.sign(d) * Math.min(step, Math.abs(d));
        if (scoreDisp) scoreDisp.textContent = String(displayedScore);
        if (displayedScore !== score) scoreRollTimer = setTimeout(rollStep, 25);
      };
      rollStep();
    } else if (scoreDisp) {
      scoreDisp.textContent = String(score);
    }

    if (levelDisp) levelDisp.textContent = String(levelIdx + 1);

    // Mode-aware Lives / Blitz Timer display (Fixes Bug #1: prevLives reset bug!)
    if (selectedMode === 'blitz') {
      if (livesHudLabel) livesHudLabel.textContent = 'TIME';
      const secs = Math.max(0, Math.ceil(blitzTimeLeft));
      if (livesDisp) livesDisp.textContent = `⏱️ ${secs}s`;
    } else if (selectedMode === 'zen') {
      if (livesHudLabel) livesHudLabel.textContent = 'MODE';
      if (livesDisp) livesDisp.textContent = '🌸 ZEN';
    } else {
      if (livesHudLabel) livesHudLabel.textContent = 'LIVES';
      if (lives !== prevLives) {
        if (lives <= 5) {
          const hearts =
            '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(Math.max(0, 3 - lives));
          if (livesDisp) livesDisp.innerHTML = hearts;
        } else {
          if (livesDisp) livesDisp.innerHTML = `❤️❤️❤️ +${lives - 3}`;
        }
        prevLives = lives;
      }
    }

    // Hunger bar
    if (hungerHudLabel) {
      hungerHudLabel.textContent = selectedMode === 'zen' ? 'FULLNESS' : 'HUNGER';
    }
    if (hungerBar) {
      hungerBar.style.width = `${Math.max(0, Math.min(100, hunger))}%`;
      hungerBar.style.background =
        hunger > 60 ? '#8bc34a' : hunger > 30 ? '#ff9800' : '#f44336';
    }

    if (hungerVignette) {
      if (selectedMode === 'classic' && hunger < 22 && gs === 'playing') {
        hungerVignette.classList.add('active');
      } else {
        hungerVignette.classList.remove('active');
      }
    }

    // Fever bar
    if (feverBar) {
      if (feverActive) {
        const rem = Math.max(0, feverEndTime - Date.now());
        feverBar.style.width = `${(rem / 6000) * 100}%`;
      } else {
        feverBar.style.width = `${Math.min(100, feverCharge)}%`;
      }
    }
  }

  function updatePurr() {
    const pct = Math.min(100, Math.max(0, hunger));
    if (purrBar) purrBar.style.width = `${pct}%`;
    const states = [
      [80, feverActive ? '🌈 PURR FEVER (2x)!!!' : '😻 Loud purring!!!'],
      [60, '😸 Full purr!'],
      [40, '😊 Purring...'],
      [20, '😐 Faint rumble...'],
      [0, '😿 Not purring...'],
    ];
    for (const [t, l] of states) {
      if (pct >= t) {
        if (purrLabel) purrLabel.textContent = l;
        break;
      }
    }
    sound.setPurrVol(pct);
  }

  function flash(color = 'rgba(255,0,0,0.3)') {
    if (!flashOv) return;
    flashOv.style.background = color;
    flashOv.style.opacity = '1';
    setTimeout(() => {
      flashOv.style.opacity = '0';
    }, 120);
  }

  function screenShake() {
    if (!gameArea) return;
    gameArea.classList.remove('shaking');
    void gameArea.offsetWidth;
    gameArea.classList.add('shaking');
    gameArea.addEventListener('animationend', () => gameArea.classList.remove('shaking'), {
      once: true,
    });
  }

  function spawnScorePop(localX, localY, text) {
    const el = document.createElement('div');
    el.className = 'score-pop';
    el.textContent = text;
    el.style.left = `${localX}px`;
    el.style.top = `${localY + hudOffsetTop}px`;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
    setTimeout(() => el.remove(), 1800);
  }

  function spawnComboFlash() {
    if (combo < 2) return;
    const el = document.createElement('div');
    el.className = 'combo-flash';
    const mult = Math.min(combo, 8);
    el.textContent = `x${mult} COMBO! 🔥${combo > 8 ? ` (${combo} streak)` : ''}`;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
    setTimeout(() => el.remove(), 1800);
  }

  function spawnCatchParticles(localX, localY, fruitType = 'normal') {
    const screenX = localX;
    const screenY = localY + hudOffsetTop;
    const def = FRUIT_TYPES[fruitType] || FRUIT_TYPES.normal;
    fx.spawnJuiceBurst(screenX, screenY, def.juiceColor, fruitType === 'giant' ? 16 : 11);

    const emojis =
      fruitType === 'golden'
        ? ['✨', '💛', '🌟', '🍊']
        : ['🍊', '💦', '✨', '🌿', '💛'];
    const count = 5;
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'catch-particle';
      el.textContent = emojis[i % emojis.length];
      const angle = (i / count) * Math.PI * 2;
      const dist = 46 + Math.random() * 54;
      el.style.setProperty('--tx', `${Math.cos(angle) * dist}px`);
      el.style.setProperty('--ty', `${Math.sin(angle) * dist - 28}px`);
      el.style.left = `${screenX}px`;
      el.style.top = `${screenY}px`;
      document.body.appendChild(el);
      el.addEventListener('animationend', () => el.remove());
      setTimeout(() => el.remove(), 1600);
    }
  }

  // ── Power-ups & Fever Overdrive ──
  function activatePowerup(type) {
    const def = POWERUPS[type];
    if (!def) return;
    checkAchievement('powerup_used');
    showToast(`${def.icon} ${def.label} activated!`);

    if (type === 'shield') {
      shieldActive = true;
      activePowerups.shield = { active: true };
    } else if (type === 'frenzy') {
      activePowerups.frenzy = { endTime: Date.now() + def.dur };
      // Spawn an immediate burst of 3 oranges!
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          if (gs === 'playing' && !paused) spawnOrange('golden');
        }, i * 160);
      }
    } else {
      activePowerups[type] = { endTime: Date.now() + def.dur };
    }
    updatePowerupHud();
  }

  function triggerFeverMode() {
    if (feverActive) return;
    feverActive = true;
    feverCharge = 100;
    feverEndTime = Date.now() + 6000;
    sound.feverActive = true;
    document.body.classList.add('fever-mode');
    checkAchievement('fever_trigger');
    sound.playGoldenChime();
    showToast('🌈 PURR FEVER! 2x Points & Golden Citrus!', 2400);
  }

  function updatePowerupHud() {
    const now = Date.now();
    for (const k of Object.keys(activePowerups)) {
      if (k !== 'shield' && activePowerups[k].endTime < now) {
        delete activePowerups[k];
      }
    }

    if (shieldDome) {
      shieldDome.classList.toggle('active', Boolean(shieldActive));
    }
    if (magnetAura) {
      magnetAura.classList.toggle('active', isMagnet());
    }

    if (!powerupHud) return;
    let html = '';
    for (const [k, v] of Object.entries(activePowerups)) {
      const def = POWERUPS[k];
      if (!def) continue;
      if (k === 'shield') {
        html += `<div class="powerup-active">${def.icon} Shield Ready</div>`;
      } else {
        const remaining = Math.max(0, v.endTime - now);
        const pct = (remaining / def.dur) * 100;
        html += `<div class="powerup-active">${def.icon} ${def.label}
          <div class="powerup-bar-wrap"><div class="powerup-bar" style="width:${pct}%"></div></div>
        </div>`;
      }
    }
    powerupHud.innerHTML = html;
  }

  function isSlowTime() {
    return Boolean(activePowerups.slowTime && activePowerups.slowTime.endTime > Date.now());
  }
  function isMagnet() {
    return Boolean(activePowerups.magnet && activePowerups.magnet.endTime > Date.now());
  }
  function isFrenzy() {
    return Boolean(activePowerups.frenzy && activePowerups.frenzy.endTime > Date.now());
  }

  // ── Fruit Spawning ──
  function spawnOrange(forcedType = null) {
    if (gs !== 'playing' || paused || levelFrozen || !gameArea) return;
    const cfg = getLevelCfg(levelIdx, selectedMode);
    const maxCap = feverActive || isFrenzy() ? cfg.maxOranges + 3 : cfg.maxOranges;
    if (!forcedType && oranges.length >= maxCap) return;

    const fruitType = forcedType || pickFruitType(levelIdx, selectedMode, feverActive);
    const def = FRUIT_TYPES[fruitType] || FRUIT_TYPES.normal;

    const el = document.createElement('div');
    el.className = `orange-fruit ${fruitType}`;
    el.setAttribute('aria-hidden', 'true');

    const baseSpeed = cfg.speed + (Math.random() - 0.5) * 30;
    let emoji = def.emoji;
    let badge = def.badge || '';
    let powerupType = null;

    if (fruitType === 'powerup') {
      const ptypes = ['slowTime', 'magnet', 'shield', 'frenzy'];
      powerupType = ptypes[Math.floor(Math.random() * ptypes.length)];
      emoji = POWERUPS[powerupType].icon;
    }

    el.innerHTML = `<span>${emoji}</span>${
      badge ? `<span class="fruit-badge">${badge}</span>` : ''
    }`;

    const areaWidth = gameArea.clientWidth || window.innerWidth;
    const padding = 48;
    const x = padding + Math.random() * Math.max(40, areaWidth - padding * 2);
    const drift = (Math.random() - 0.5) * 1.2;
    const accel = fruitType === 'giant' ? 0 : Math.random() * 0.08;

    const obj = {
      id: oid++,
      el,
      x,
      y: -45,
      baseX: x,
      speed: baseSpeed * def.speedMult,
      fruitType,
      points: def.points,
      hungerMult: def.hungerMult,
      comboBoost: def.comboBoost || 1,
      radius: def.radius || 30,
      powerupType,
      drift,
      accel,
      driftPhase: Math.random() * Math.PI * 2,
    };

    el.style.left = `${x}px`;
    el.style.top = `${obj.y}px`;
    el.addEventListener(
      'pointerdown',
      (ev) => {
        ev.stopPropagation();
        catchOrange(obj, 'tap');
      },
      { once: true }
    );

    gameArea.appendChild(el);
    oranges.push(obj);
  }

  function scheduleSpawn() {
    clearTimeout(spawnTimer);
    if (gs !== 'playing' || paused || levelFrozen) return;
    const cfg = getLevelCfg(levelIdx, selectedMode);
    const interval = feverActive || isFrenzy() ? Math.max(240, cfg.spawnMs * 0.62) : cfg.spawnMs;
    spawnTimer = setTimeout(() => {
      spawnOrange();
      scheduleSpawn();
    }, interval);
  }

  // ── Catch & Miss Logic ──
  function catchOrange(obj, source = 'tap') {
    if (gs !== 'playing') return;
    if (!oranges.some((o) => o.id === obj.id)) return;
    oranges = oranges.filter((o) => o.id !== obj.id);

    obj.el.classList.add('caught');
    obj.el.addEventListener('animationend', () => obj.el.remove());
    setTimeout(() => obj.el.remove(), 500);

    // 1. Sour Lemon Hazard
    if (obj.fruitType === 'lemon') {
      combo = 0;
      feverCharge = Math.max(0, feverCharge - 25);
      if (shieldActive) {
        shieldActive = false;
        delete activePowerups.shield;
        updatePowerupHud();
        checkAchievement('shield_used');
        sound.playShieldBlock();
        showToast('🛡️ Shield blocked the sour lemon!');
        flash('rgba(0, 229, 255, 0.35)');
        return;
      }

      if (selectedMode === 'blitz') {
        blitzTimeLeft = Math.max(0, blitzTimeLeft - 5);
        spawnScorePop(obj.x, obj.y, '-5s 🍋');
      } else if (selectedMode === 'classic') {
        lives = Math.max(0, lives - 1);
      }

      flash('rgba(255, 235, 59, 0.45)');
      flashFace('scared', 620);
      showBubble('😖 THAT WAS A SOUR LEMON!!');
      kittenWrap?.classList.remove('alarmed');
      void kittenWrap?.offsetWidth;
      kittenWrap?.classList.add('alarmed');
      screenShake();
      navigator.vibrate?.(100);
      sound.playHiss();
      updateHUD();
      updatePurr();
      if (selectedMode === 'classic' && lives <= 0) endGame('no_lives');
      if (selectedMode === 'blitz' && blitzTimeLeft <= 0) endGame('time_up');
      return;
    }

    // 2. Power-up Bubble
    if (obj.fruitType === 'powerup') {
      activatePowerup(obj.powerupType);
      spawnScorePop(obj.x, obj.y, `${POWERUPS[obj.powerupType].icon} ${POWERUPS[obj.powerupType].label}!`);
      spawnCatchParticles(obj.x, obj.y, 'powerup');
      sound.playPowerupSound();
      return;
    }

    // 3. Edible Citrus Fruit!
    combo += obj.comboBoost || 1;
    caught++;
    if (source === 'mouth') {
      mouthCatchesThisGame++;
      if (mouthCatchesThisGame >= 10) checkAchievement('mouth_catch');
    }
    if (combo > maxComboThisGame) maxComboThisGame = combo;

    const comboMult = Math.max(1, Math.min(combo, 8));
    const feverMult = feverActive || isFrenzy() ? 2 : 1;
    const mouthBonus = source === 'mouth' ? 1.2 : 1.0;
    const pts = Math.round(obj.points * comboMult * feverMult * mouthBonus);
    score += pts;

    // Properly scaled hunger refill (Fixes Bug #3!)
    const cfg = getLevelCfg(levelIdx, selectedMode);
    const totalHunger = cfg.hungerRefill * (obj.hungerMult || 1);
    hunger = Math.min(100, hunger + totalHunger);

    if (selectedMode === 'blitz' && obj.fruitType === 'golden') {
      blitzTimeLeft += 2;
    }

    // Charge Fever Bar
    if (!feverActive) {
      feverCharge = Math.min(100, feverCharge + (obj.fruitType === 'golden' ? 22 : 9));
      if (feverCharge >= 100) {
        triggerFeverMode();
      }
    }

    // Kitten Chomp Animation
    if (kittenWrap) {
      kittenWrap.classList.remove('chomping');
      void kittenWrap.offsetWidth;
      kittenWrap.classList.add('chomping');
      kittenWrap.addEventListener(
        'animationend',
        () => kittenWrap.classList.remove('chomping'),
        { once: true }
      );
    }

    flashFace('happy', 520);
    showBubble(
      source === 'mouth'
        ? '😻 Direct Mouth Catch! +20%'
        : CATCH_MESSAGES[caught % CATCH_MESSAGES.length]
    );
    const popLabel =
      combo >= 2
        ? `+${pts} x${comboMult}${feverMult > 1 ? '🔥' : ''}!`
        : `+${pts}`;
    spawnScorePop(obj.x, obj.y, popLabel);
    spawnCatchParticles(obj.x, obj.y, obj.fruitType);
    if (combo >= 2) spawnComboFlash();

    navigator.vibrate?.(25);
    if (obj.fruitType === 'golden') {
      sound.playGoldenChime();
    } else {
      sound.playCatchPop(combo);
    }
    sound.playMeow(combo);

    speechBiteCount++;
    if (speechBiteCount % 8 === 0) {
      sound.playBiteVoice(speechBiteCount);
    }

    // Check Achievements (including cumulative lifetime catches — Fixes Bug #7!)
    const totalLifetime = lifetimeCaughtBase + caught;
    if (caught === 1) checkAchievement('first_catch');
    if (combo >= 5) checkAchievement('combo_x5');
    if (combo >= 8) checkAchievement('combo_x8');
    if (obj.fruitType === 'golden') checkAchievement('golden_catch');
    if (totalLifetime >= 50) checkAchievement('catches_50');
    if (totalLifetime >= 100) checkAchievement('catches_100');
    if (score >= 500) checkAchievement('score_500');
    if (score >= 2500) checkAchievement('score_2500');

    // Level-Up Check (every 10 catches)
    const newLvl = Math.floor(caught / 10);
    if (newLvl > levelIdx) {
      if (missesThisLevel === 0 && levelIdx > 0) checkAchievement('perfect_level');
      missesThisLevel = 0;
      levelIdx = newLvl;
      sound.levelIdx = levelIdx;
      if (levelIdx >= 4) checkAchievement('level_5');
      if (levelIdx >= 9) checkAchievement('level_10');
      if (selectedMode === 'classic' && levelIdx > 0 && levelIdx % 10 === 0) {
        lives++;
        showToast('❤️ Bonus life! Keep going!');
      }
      triggerLevelUp();
    }

    updateHUD();
    updatePurr();
  }

  function missOrange(obj) {
    if (gs !== 'playing') return;
    obj.el.classList.add('missed');
    obj.el.addEventListener('animationend', () => obj.el.remove());
    setTimeout(() => obj.el.remove(), 500);

    // Letting hazards or power-ups fall off-screen is never penalized
    if (obj.fruitType === 'lemon' || obj.fruitType === 'powerup') return;

    // Zen mode has no miss penalties
    if (selectedMode === 'zen') return;

    // Shield blocks the miss BEFORE incrementing penalty counters
    if (shieldActive) {
      shieldActive = false;
      delete activePowerups.shield;
      updatePowerupHud();
      checkAchievement('shield_used');
      sound.playShieldBlock();
      showToast('🛡️ Shield absorbed the miss!');
      flash('rgba(0, 229, 255, 0.35)');
      return;
    }

    combo = 0;
    missed++;
    missesThisLevel++;
    feverCharge = Math.max(0, feverCharge - 18);

    if (selectedMode === 'classic') {
      lives = Math.max(0, lives - 1);
      hunger = Math.max(0, hunger - 16);
    } else if (selectedMode === 'blitz') {
      hunger = Math.max(20, hunger - 10);
    }

    flash('rgba(200, 0, 0, 0.28)');
    screenShake();
    flashFace('scared', 680);
    const msgs =
      sound.voiceMode === 'wholesome' ? MISS_MESSAGES_WHOLESOME : MISS_MESSAGES_UNHINGED;
    showBubble(msgs[missed % msgs.length]);
    navigator.vibrate?.(90);
    sound.playHiss();
    sound.playMissVoice();

    updateHUD();
    updatePurr();
    if (selectedMode === 'classic' && lives <= 0) endGame('no_lives');
  }

  // ── Level-Up Fanfare (Fixes Bug #4: clears spawnTimer & levelUpTimer cleanly) ──
  function triggerLevelUp() {
    levelFrozen = true;
    clearTimeout(spawnTimer);
    clearTimeout(levelUpTimer);
    flash('rgba(255, 200, 0, 0.32)');
    sound.playLevelUpWhoosh();

    const ov = document.getElementById('levelUpOverlay');
    const badge = document.getElementById('levelUpBadge');
    if (badge) badge.textContent = `⬆️ LEVEL ${levelIdx + 1}!`;
    ov?.classList.add('show');

    const freezeStart = Date.now();
    levelUpTimer = setTimeout(() => {
      ov?.classList.remove('show');
      levelFrozen = false;
      lastTs = null;
      const freezeElapsed = Date.now() - freezeStart;
      for (const k of Object.keys(activePowerups)) {
        if (k !== 'shield' && activePowerups[k].endTime) {
          activePowerups[k].endTime += freezeElapsed;
        }
      }
      if (feverActive) feverEndTime += freezeElapsed;
      if (gs === 'playing' && !paused) {
        scheduleSpawn();
        const hints = ['Faster citrus!', 'More fruit!', 'Hungrier kitten!', 'Watch for lemons!'];
        showToast(`⬆️ Level ${levelIdx + 1} — ${hints[levelIdx % hints.length]}`, 1900);
      }
    }, 480);
  }

  // ── Main Game Loop ──
  function gameLoop(ts) {
    if (gs !== 'playing' || paused) return;
    if (levelFrozen) {
      animFrame = requestAnimationFrame(gameLoop);
      return;
    }

    const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.05) : 0;
    lastTs = ts;

    // 1. Update Kitten Keyboard Movement
    if (keysHeld.left || keysHeld.right) {
      const moveSpeed = keysHeld.shift ? 0.95 : 0.58;
      if (keysHeld.left) kittenRatioX -= moveSpeed * dt;
      if (keysHeld.right) kittenRatioX += moveSpeed * dt;
      updateKittenDOMPos();
    }

    // 2. Fever Mode Expiration Check
    if (feverActive && Date.now() >= feverEndTime) {
      feverActive = false;
      feverCharge = 0;
      sound.feverActive = false;
      document.body.classList.remove('fever-mode');
    }

    // 3. Mode Timers & Hunger Drain
    const cfg = getLevelCfg(levelIdx, selectedMode);
    if (selectedMode === 'classic') {
      const drainMult = feverActive ? 0.5 : 1.0;
      hunger = Math.max(0, hunger - cfg.hungerDrain * drainMult * dt);
      if (hunger <= 0) {
        endGame('starved');
        return;
      }
      if (!eyeTimer && hunger < 25) setFace('sad');
    } else if (selectedMode === 'blitz') {
      blitzTimeLeft = Math.max(0, blitzTimeLeft - dt);
      if (blitzTimeLeft <= 0) {
        endGame('time_up');
        return;
      }
    }

    if (Math.floor(ts / 150) !== Math.floor((ts - dt * 1000) / 150)) {
      updatePowerupHud();
    }

    // 4. Update Falling Fruits (Two-pass collection to avoid mutation during loop)
    const toCatch = []; // [{ obj, source }]
    const toMiss = [];
    const magnetActive = isMagnet();
    const areaWidth = gameArea?.clientWidth || window.innerWidth;
    const areaHeight = gameArea?.clientHeight || window.innerHeight - hudOffsetTop;
    const padding = 38;

    for (let i = oranges.length - 1; i >= 0; i--) {
      const o = oranges[i];
      const speedMult = isSlowTime() ? 0.5 : 1;
      o.speed += o.accel * dt * 30;
      o.y += o.speed * speedMult * dt;

      // True Magnetic Attraction toward Kitten Mouth (Fixes Bug #5!)
      if (magnetActive && o.fruitType !== 'lemon' && o.y > areaHeight * 0.18) {
        const dx = kitCX - o.x;
        const dy = kitCY - o.y;
        const dist = Math.hypot(dx, dy) || 1;
        const pullSpeed = 480 * dt;
        o.x += (dx / dist) * pullSpeed;
        o.y += (dy / dist) * pullSpeed * 0.65;
        o.baseX = o.x;
        if (dist < 62) {
          toCatch.push({ obj: o, source: 'magnet' });
          continue;
        }
      } else if (o.drift) {
        // Horizontal sine drift clamped inside screen bounds (Fixes Bug #6!)
        o.driftPhase = (o.driftPhase || 0) + dt * 1.8;
        const rawX = o.baseX + Math.sin(o.driftPhase) * 38 * o.drift;
        o.x = Math.max(padding, Math.min(areaWidth - padding, rawX));
      }

      o.el.style.left = `${o.x}px`;
      o.el.style.top = `${o.y}px`;

      // Direct Kitten Mouth / Paw Catch Detection
      if (o.fruitType !== 'lemon') {
        const mouthDist = Math.hypot(o.x - kitCX, o.y - kitCY);
        if (mouthDist < o.radius + 44) {
          toCatch.push({ obj: o, source: 'mouth' });
          continue;
        }
      }

      if (o.y > areaHeight + 28) {
        toMiss.push(o);
      }
    }

    for (const item of toCatch) {
      catchOrange(item.obj, item.source);
    }

    const caughtIds = new Set(toCatch.map((item) => item.obj.id));
    for (const o of toMiss) {
      if (caughtIds.has(o.id)) continue;
      oranges = oranges.filter((x) => x.id !== o.id);
      missOrange(o);
      if (gs !== 'playing') break;
    }

    // 5. Render Canvas FX (Slice Trail & Juice Droplets)
    fx.updateAndDraw(dt, performance.now(), feverActive);

    updateEyeTracking();
    updateHUD();
    updatePurr();
    animFrame = requestAnimationFrame(gameLoop);
  }

  // ── Swipe-to-Slice & Kitten Drag Input Handlers ──
  gameArea?.addEventListener('pointerdown', (e) => {
    if (gs !== 'playing' || paused) return;
    if (kittenWrap && kittenWrap.contains(e.target)) {
      draggingKitten = true;
      return;
    }
    isSwiping = true;
    swipeCatchCount = 0;
    lastSwipePt = { x: e.clientX, y: e.clientY };
    fx.addTrailPoint(e.clientX, e.clientY);
  });

  window.addEventListener('pointermove', (e) => {
    if (gs !== 'playing' || paused) return;
    if (draggingKitten) {
      const w = window.innerWidth || 1;
      kittenRatioX = e.clientX / w;
      updateKittenDOMPos();
      return;
    }
    if (!isSwiping) return;

    const curPt = { x: e.clientX, y: e.clientY };
    fx.addTrailPoint(curPt.x, curPt.y);

    if (lastSwipePt) {
      // Convert viewport coordinates to gameArea local coordinates
      const x1 = lastSwipePt.x;
      const y1 = lastSwipePt.y - hudOffsetTop;
      const x2 = curPt.x;
      const y2 = curPt.y - hudOffsetTop;

      const sliced = [];
      for (const o of oranges) {
        if (segmentIntersectsCircle(x1, y1, x2, y2, o.x, o.y, o.radius + 14)) {
          sliced.push(o);
        }
      }
      for (const o of sliced) {
        catchOrange(o, 'slice');
        if (o.fruitType !== 'lemon') {
          swipeCatchCount++;
          if (swipeCatchCount === 3) {
            score += 25;
            checkAchievement('slice_multi');
            spawnScorePop(o.x, o.y - 20, '⚔️ NINJA SLICE +25!');
          }
        }
      }
    }
    lastSwipePt = curPt;
  });

  window.addEventListener('pointerup', () => {
    draggingKitten = false;
    isSwiping = false;
    lastSwipePt = null;
    swipeCatchCount = 0;
  });

  // ── Pause & Resume ──
  function pauseGame() {
    if (gs !== 'playing' || paused) return;
    paused = true;
    pausedAt = Date.now();
    cancelAnimationFrame(animFrame);
    clearTimeout(spawnTimer);
    clearTimeout(levelUpTimer);
    sound.pauseSession();
    if (pauseOverlay) pauseOverlay.style.display = 'flex';
    if (pauseBtn) pauseBtn.textContent = '▶️';
  }

  function resumeGame() {
    if (!paused || gs !== 'playing') return;
    paused = false;
    const pausedElapsed = Date.now() - pausedAt;
    for (const k of Object.keys(activePowerups)) {
      if (k !== 'shield' && activePowerups[k].endTime) {
        activePowerups[k].endTime += pausedElapsed;
      }
    }
    if (feverActive) feverEndTime += pausedElapsed;
    if (pauseOverlay) pauseOverlay.style.display = 'none';
    if (pauseBtn) pauseBtn.textContent = '⏸️';
    sound.resumeSession();
    lastTs = null;
    scheduleSpawn();
    animFrame = requestAnimationFrame(gameLoop);
  }

  function togglePause() {
    if (paused) resumeGame();
    else pauseGame();
  }

  pauseBtn?.addEventListener('click', togglePause);
  pauseOverlay?.addEventListener('click', resumeGame);

  // ── Start & End Game Lifecycle ──
  let gameEndScore = 0;
  let gameEndLevel = 0;
  let gameEndAccuracy = 0;

  function startGame() {
    gs = 'playing';
    score = 0;
    lives = 3;
    levelIdx = 0;
    hunger = 100;
    blitzTimeLeft = GAME_MODES.blitz.timeLimitSec;
    combo = 0;
    caught = 0;
    missed = 0;
    mouthCatchesThisGame = 0;
    speechBiteCount = 0;
    feverCharge = 0;
    feverActive = false;
    document.body.classList.remove('fever-mode');

    oranges.forEach((o) => o.el.remove());
    oranges = [];
    lastTs = null;
    levelFrozen = false;
    paused = false;
    prevLives = -1; // Ensures HUD hearts always re-render on new game!
    displayedScore = 0;
    if (scoreDisp) scoreDisp.textContent = '0';
    activePowerups = {};
    shieldActive = false;
    maxComboThisGame = 0;
    missesThisLevel = 0;
    sessionUnlocks = [];
    lifetimeCaughtBase = getSessionStats().totalCaught || 0;
    kittenRatioX = 0.5;

    const startScr = document.getElementById('startScreen');
    const overScr = document.getElementById('gameOverScreen');
    const lvlOv = document.getElementById('levelUpOverlay');
    if (startScr) startScr.style.display = 'none';
    if (overScr) overScr.style.display = 'none';
    if (pauseOverlay) pauseOverlay.style.display = 'none';
    if (lvlOv) lvlOv.classList.remove('show');
    if (pauseBtn) {
      pauseBtn.style.display = '';
      pauseBtn.textContent = '⏸️';
    }
    gameArea?.querySelectorAll('.orange-fruit').forEach((el) => el.remove());
    if (powerupHud) powerupHud.innerHTML = '';
    hungerVignette?.classList.remove('active');
    fx.clearTrail();

    applyKittenSkin(selectedSkin);
    setFace('normal');
    updateKittenDOMPos();
    updatePowerupHud();
    updateHUD();

    sound.startSession(0);
    updatePurr();
    scheduleSpawn();
    spawnOrange();
    animFrame = requestAnimationFrame(gameLoop);
    window.scrollTo?.(0, 0);
  }

  function endGame(reason) {
    if (gs === 'over') return;
    gs = 'over';
    cancelAnimationFrame(animFrame);
    clearTimeout(spawnTimer);
    clearTimeout(levelUpTimer);
    clearTimeout(bubbleTimer);
    clearTimeout(eyeTimer);
    clearTimeout(scoreRollTimer);
    clearTimeout(toastTimer);
    eyeTimer = null;
    levelFrozen = false;
    paused = false;
    feverActive = false;
    document.body.classList.remove('fever-mode');

    oranges.forEach((o) => o.el.remove());
    oranges = [];
    sound.stopSession();

    if (pauseOverlay) pauseOverlay.style.display = 'none';
    if (pauseBtn) pauseBtn.style.display = 'none';
    hungerVignette?.classList.remove('active');
    shieldActive = false;
    activePowerups = {};
    updatePowerupHud();

    const accuracy = caught + missed > 0 ? Math.round((caught / (caught + missed)) * 100) : 0;
    gameEndScore = score;
    gameEndLevel = levelIdx + 1;
    gameEndAccuracy = accuracy;

    const prevBest = best;
    if (score > best) {
      best = setBestScore(score);
      if (bestDisp) bestDisp.textContent = String(best);
    }

    const lb = addLeaderboardEntry({
      score,
      level: levelIdx + 1,
      accuracy,
      mode: selectedMode,
      date: Date.now(),
    });

    updateSessionStats({
      score,
      caught,
      bestCombo: maxComboThisGame,
      accuracy,
    });

    let title =
      reason === 'starved'
        ? '😿 The kitten starved!'
        : reason === 'time_up'
        ? '⏱️ Time is up!'
        : '💔 No lives left!';
    if (score > 0 && score > prevBest) {
      title = '🏆 NEW HIGH SCORE!';
      showToast(`🎉 New record: ${score} points!`);
    }

    const goTitle = document.getElementById('gameOverTitle');
    if (goTitle) goTitle.textContent = title;

    const goStats = document.getElementById('gameOverStats');
    if (goStats) {
      goStats.innerHTML = `
        <span>Mode</span><b>${GAME_MODES[selectedMode].icon} ${GAME_MODES[selectedMode].name}</b>
        <span>Score</span><b>${score}</b>
        <span>Best</span><b>${best}</b>
        <span>Level reached</span><b>${levelIdx + 1}</b>
        <span>Citrus caught</span><b>${caught}</b>
        <span>Citrus missed</span><b>${missed}</b>
        <span>Accuracy</span><b>${accuracy}%</b>
        <span>Best combo</span><b>x${Math.min(8, maxComboThisGame)} (${maxComboThisGame})</b>
      `;
    }

    renderLeaderboardUI(lb, document.getElementById('gameOverLeaderboard'));

    const achEl = document.getElementById('gameOverAchievements');
    if (achEl) {
      if (sessionUnlocks.length > 0) {
        const defs = sessionUnlocks
          .map((id) => ACHIEVEMENT_DEFS.find((d) => d.id === id))
          .filter(Boolean);
        achEl.innerHTML =
          '<div style="font-size:0.9rem;color:#b85c00;margin-top:4px;">Unlocked this game: ' +
          defs.map((d) => `${d.icon} ${d.label}`).join(' · ') +
          '</div>';
      } else {
        achEl.innerHTML = '';
      }
    }

    setFace('sad');
    const goScreen = document.getElementById('gameOverScreen');
    if (goScreen) {
      goScreen.classList.remove('overlay-enter');
      void goScreen.offsetWidth;
      goScreen.classList.add('overlay-enter');
      goScreen.style.display = 'flex';
    }

    sound.playGameOverVoice(reason);
  }

  // ── Share Button ──
  document.getElementById('shareBtn')?.addEventListener('click', () => {
    const modeName = GAME_MODES[selectedMode]?.name || 'Classic';
    const text = `🍊 Citrus Kitten (${modeName}): I scored ${gameEndScore} points (Level ${gameEndLevel}, ${gameEndAccuracy}% accuracy)! Can you beat me?`;
    if (navigator.share) {
      navigator.share({ title: 'Citrus Kitten', text }).catch(() => {});
    } else if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => showToast('📋 Score copied to clipboard!'))
        .catch(() => showToast('📋 ' + text));
    } else {
      showToast('📋 ' + text);
    }
  });

  // ── Keyboard & Window Event Listeners ──
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysHeld.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysHeld.right = true;
    if (e.key === 'Shift') keysHeld.shift = true;

    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      if (gs === 'playing') togglePause();
    }
    if (e.key === ' ' || e.key === 'Enter') {
      if (gs === 'start') {
        e.preventDefault();
        startGame();
      } else if (gs === 'over') {
        e.preventDefault();
        initStartScreen();
        startGame();
      }
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysHeld.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysHeld.right = false;
    if (e.key === 'Shift') keysHeld.shift = false;
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && gs === 'playing' && !paused) pauseGame();
  });

  window.addEventListener('resize', () => {
    fx.resize();
    if (gs === 'playing') cacheKittenPos();
  });

  // ── Start / Menu Screen Initialization ──
  function initStartScreen() {
    const sb = document.getElementById('startBest');
    if (sb) sb.textContent = String(best);
    applyKittenSkin(selectedSkin);
    renderModeSelector();
    renderWardrobe();
    renderLeaderboardUI(getLeaderboard(), document.getElementById('startLeaderboard'));
    renderAchievementsUI(document.getElementById('startAchievements'));
    renderSessionStatsUI();
  }

  initStartScreen();

  document.getElementById('startBtn')?.addEventListener('click', startGame);
  document.getElementById('restartBtn')?.addEventListener('click', () => {
    initStartScreen();
    startGame();
  });
  document.getElementById('menuBtn')?.addEventListener('click', () => {
    gs = 'start';
    const goScreen = document.getElementById('gameOverScreen');
    const startScr = document.getElementById('startScreen');
    if (goScreen) goScreen.style.display = 'none';
    if (startScr) startScr.style.display = 'flex';
    initStartScreen();
  });

  return {
    startGame,
    endGame,
    pauseGame,
    resumeGame,
    catchOrange,
    missOrange,
    spawnOrange,
    getState: () => ({
      gs,
      score,
      lives,
      levelIdx,
      hunger,
      combo,
      caught,
      missed,
      selectedMode,
      selectedSkin,
      shieldActive,
      feverActive,
      oranges,
    }),
  };
}
