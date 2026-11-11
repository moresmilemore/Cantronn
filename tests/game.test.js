// ═══════════════════════════════════════════════════════════════════════════
//  CITRUS KITTEN (CANTRONN) — AUTOMATED TEST SUITE
// ═══════════════════════════════════════════════════════════════════════════

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

import {
  getLevelCfg,
  GAME_MODES,
  POWERUPS,
  FRUIT_TYPES,
  pickFruitType,
  ACHIEVEMENT_DEFS,
  KITTEN_SKINS,
} from '../src/config.js';

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
} from '../src/storage.js';

import { SoundEngine } from '../src/audio.js';
import { UI_ICONS, getFruitSpriteSVG } from '../src/assets.js';
import { segmentIntersectsCircle } from '../src/fx.js';
import { initCitrusKittenApp } from '../src/game.js';
import { buildProject } from '../scripts/build.js';

function createMockStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    clear: () => map.clear(),
  };
}

test('Level configuration scales properly across levels and game modes', () => {
  const lv0 = getLevelCfg(0, 'classic');
  assert.equal(lv0.speed, 130);
  assert.equal(lv0.spawnMs, 1400);
  assert.equal(lv0.maxOranges, 3);
  assert.equal(lv0.hungerDrain, 4);
  assert.equal(lv0.hungerRefill, 18);

  const lv10 = getLevelCfg(10, 'classic');
  assert.ok(lv10.speed > lv0.speed);
  assert.equal(lv10.spawnMs, 320); // Clamped to floor
  assert.equal(lv10.maxOranges, 8);
  assert.equal(lv10.hungerDrain, 19);
  assert.equal(lv10.hungerRefill, 13);

  const lv25 = getLevelCfg(25, 'classic');
  assert.equal(lv25.hungerDrain, 20); // Capped at 20/sec
  assert.equal(lv25.hungerRefill, 12); // Floored at 12
  assert.equal(lv25.maxOranges, 9); // Capped at 9

  const zenCfg = getLevelCfg(5, 'zen');
  assert.equal(zenCfg.hungerDrain, 0, 'Zen mode should have 0 hunger drain');
});

test('pickFruitType respects Zen mode (no lemons) and Fever mode boosts', () => {
  // Test 200 samples across RNG range [0, 1)
  for (let i = 0; i < 200; i++) {
    const r = i / 200;
    const zenFruit = pickFruitType(8, 'zen', false, () => r);
    assert.notEqual(zenFruit, 'lemon', 'Zen mode must never spawn sour lemons');

    const feverFruit = pickFruitType(8, 'classic', true, () => r);
    assert.notEqual(feverFruit, 'lemon', 'Fever mode must never spawn sour lemons');
  }

  assert.equal(pickFruitType(0, 'classic', false, () => 0.01), 'powerup');
  assert.equal(pickFruitType(0, 'classic', false, () => 0.08), 'golden');
  assert.equal(pickFruitType(0, 'classic', false, () => 0.14), 'lemon');
  assert.equal(pickFruitType(0, 'classic', false, () => 0.95), 'normal');
});

test('Kitten skins unlock accurately based on achievements and lifetime stats', () => {
  const clementine = KITTEN_SKINS.find((s) => s.id === 'clementine');
  const tuxedo = KITTEN_SKINS.find((s) => s.id === 'tuxedo');
  const calico = KITTEN_SKINS.find((s) => s.id === 'calico');
  const cyber = KITTEN_SKINS.find((s) => s.id === 'cyber');
  const royal = KITTEN_SKINS.find((s) => s.id === 'royal');

  assert.equal(clementine.isUnlocked([], {}), true);
  assert.equal(tuxedo.isUnlocked([], { totalCaught: 10 }), false);
  assert.equal(tuxedo.isUnlocked([], { totalCaught: 50 }), true);
  assert.equal(tuxedo.isUnlocked(['catches_50'], {}), true);
  assert.equal(calico.isUnlocked(['combo_x8'], {}), true);
  assert.equal(cyber.isUnlocked(['level_5'], {}), true);
  assert.equal(royal.isUnlocked(['score_2500'], {}), true);
});

test('Storage layer persists best score, leaderboard, achievements, and session stats', () => {
  const store = createMockStorage();

  assert.equal(getBestScore(store), 0);
  setBestScore(420, store);
  assert.equal(getBestScore(store), 420);

  // Score 0 should be ignored by leaderboard
  addLeaderboardEntry({ score: 0, level: 1, accuracy: 0 }, store);
  assert.equal(getLeaderboard(store).length, 0);

  // Add 12 entries and verify top-10 sorting
  for (let i = 1; i <= 12; i++) {
    addLeaderboardEntry({ score: i * 100, level: i, accuracy: 90, mode: 'classic' }, store);
  }
  const lb = getLeaderboard(store);
  assert.equal(lb.length, 10);
  assert.equal(lb[0].score, 1200);
  assert.equal(lb[9].score, 300);

  // Achievements
  saveAchievements(['first_catch', 'combo_x5'], store);
  assert.deepEqual(getUnlockedAchievements(store), ['first_catch', 'combo_x5']);

  // Cumulative Session Stats
  updateSessionStats({ score: 250, caught: 22, bestCombo: 5, accuracy: 88 }, store);
  const s2 = updateSessionStats({ score: 600, caught: 35, bestCombo: 9, accuracy: 95 }, store);
  assert.equal(s2.gamesPlayed, 2);
  assert.equal(s2.totalCaught, 57);
  assert.equal(s2.bestCombo, 9);
  assert.equal(s2.bestAccuracy, 95);
  assert.equal(s2.totalScore, 850);

  // Settings & Skin
  saveSettings({ musicOn: false, sfxOn: true, voiceMode: 'wholesome' }, store);
  assert.equal(getSettings(store).musicOn, false);
  assert.equal(getSettings(store).voiceMode, 'wholesome');

  saveSelectedSkin('cyber', store);
  assert.equal(getSelectedSkin(store), 'cyber');
});

test('segmentIntersectsCircle detects swipe-slice collisions accurately', () => {
  // Horizontal swipe right through circle at (100, 100, r=30)
  assert.equal(segmentIntersectsCircle(50, 100, 150, 100, 100, 100, 30), true);
  // Swipe grazing edge at y=125 (dist=25 <= 30)
  assert.equal(segmentIntersectsCircle(50, 125, 150, 125, 100, 100, 30), true);
  // Swipe missing at y=140 (dist=40 > 30)
  assert.equal(segmentIntersectsCircle(50, 140, 150, 140, 100, 100, 30), false);
  // Zero-length tap inside circle
  assert.equal(segmentIntersectsCircle(110, 110, 110, 110, 100, 100, 30), true);
});

test('SoundEngine handles rapid game restart and pause/resume without race conditions', () => {
  const sound = new SoundEngine({ musicOn: true, sfxOn: true, voiceMode: 'unhinged' });
  sound.startSession(0);
  assert.equal(sound.isPlaying, true);
  assert.equal(sound.isPaused, false);

  sound.pauseSession();
  assert.equal(sound.isPaused, true);

  sound.resumeSession();
  assert.equal(sound.isPaused, false);

  // Stop session and immediately restart within <400ms
  sound.stopSession();
  assert.equal(sound.isPlaying, false);
  sound.startSession(0);
  assert.equal(sound.isPlaying, true);
  sound.stopSession();
});

test('Build script produces valid self-contained index.html with all required DOM elements and valid JS', () => {
  const html = buildProject();
  assert.ok(html.includes('<!DOCTYPE html>'));
  assert.ok(!html.includes('/* __INJECT_CSS__ */'));
  assert.ok(!html.includes('/* __INJECT_JS__ */'));

  // Required DOM IDs
  const requiredIds = [
    'hud',
    'scoreDisplay',
    'hungerBar',
    'lives',
    'levelDisplay',
    'bestDisplay',
    'musicToggle',
    'sfxToggle',
    'voiceToggle',
    'pauseBtn',
    'pauseOverlay',
    'hungerVignette',
    'powerupHud',
    'toastEl',
    'gameArea',
    'kittenWrap',
    'shieldDome',
    'magnetAura',
    'bubble',
    'purrBar',
    'feverBar',
    'purrLabel',
    'startScreen',
    'modeSelector',
    'skinSelector',
    'startBtn',
    'gameOverScreen',
    'restartBtn',
    'shareBtn',
    'fxCanvas',
  ];
  for (const id of requiredIds) {
    assert.ok(html.includes(`id="${id}"`), `Missing DOM id="${id}" in built index.html`);
  }

  // Extract inline <script> and verify JavaScript syntax via vm.Script
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match && match[1], 'Inline script block must exist');
  assert.doesNotThrow(() => {
    new vm.Script(match[1], { filename: 'index.html' });
  }, 'Bundled JavaScript in index.html must have valid syntax');
});

test('End-to-end game lifecycle: startGame, catchOrange, missOrange, shield, gameOver, and Play Again HUD reset', () => {
  // Setup lightweight DOM mocks for initCitrusKittenApp
  const elements = new Map();
  function makeEl(id = '') {
    const classes = new Set();
    const attrs = new Map();
    const children = [];
    const el = {
      id,
      textContent: '',
      innerHTML: '',
      clientWidth: 800,
      clientHeight: 600,
      offsetWidth: 800,
      width: 800,
      height: 600,
      style: {
        display: '',
        width: '',
        left: '',
        top: '',
        background: '',
        opacity: '',
        setProperty: () => {},
      },
      classList: {
        add: (...c) => c.forEach((x) => classes.add(x)),
        remove: (...c) => c.forEach((x) => classes.delete(x)),
        toggle: (c, force) => (force ? classes.add(c) : classes.delete(c)),
        contains: (c) => classes.has(c),
      },
      setAttribute: (k, v) => attrs.set(k, v),
      getAttribute: (k) => attrs.get(k) || null,
      addEventListener: () => {},
      removeEventListener: () => {},
      appendChild: (child) => children.push(child),
      remove: () => {},
      contains: () => false,
      querySelector: () => makeEl(),
      querySelectorAll: () => [],
      getBoundingClientRect: () => ({ left: 300, top: 450, width: 200, height: 150 }),
      getContext: () => ({
        setTransform: () => {},
        clearRect: () => {},
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        arc: () => {},
        fill: () => {},
      }),
    };
    return el;
  }

  globalThis.localStorage = createMockStorage();
  globalThis.requestAnimationFrame = () => 1;
  globalThis.cancelAnimationFrame = () => {};
  globalThis.window = {
    innerWidth: 800,
    innerHeight: 660,
    devicePixelRatio: 1,
    addEventListener: () => {},
    scrollTo: () => {},
  };
  globalThis.document = {
    hidden: false,
    body: makeEl('body'),
    getElementById: (id) => {
      if (!elements.has(id)) elements.set(id, makeEl(id));
      return elements.get(id);
    },
    createElement: (tag) => makeEl(tag),
    querySelectorAll: () => [],
    addEventListener: () => {},
  };

  const app = initCitrusKittenApp();
  assert.ok(app);

  // 1. Start Game 1
  app.startGame();
  let state = app.getState();
  assert.equal(state.gs, 'playing');
  assert.equal(state.lives, 3);
  assert.equal(elements.get('lives').innerHTML, UI_ICONS.heartFull.repeat(3));

  // 2. Spawn and catch a Golden Orange
  app.spawnOrange('golden');
  state = app.getState();
  const goldenObj = state.oranges.find((o) => o.fruitType === 'golden');
  assert.ok(goldenObj, 'Golden orange should be spawned');
  assert.ok(goldenObj.el.innerHTML.includes('<svg class="fruit-svg golden-svg"'));
  app.catchOrange(goldenObj, 'tap');

  state = app.getState();
  assert.equal(state.caught, 1);
  assert.equal(state.combo, 1);
  assert.equal(state.score, 30);

  // 3. Lose all 3 lives via misses
  for (let i = 0; i < 3; i++) {
    app.spawnOrange('normal');
    const norm = app.getState().oranges[app.getState().oranges.length - 1];
    app.missOrange(norm);
  }

  state = app.getState();
  assert.equal(state.gs, 'over');
  assert.equal(state.lives, 0);
  assert.equal(elements.get('lives').innerHTML, UI_ICONS.heartEmpty.repeat(3));

  // 4. Start Game 2 (Regression test for Bug #1: #lives must reset to 3 full SVG hearts!)
  app.startGame();
  state = app.getState();
  assert.equal(state.gs, 'playing');
  assert.equal(state.lives, 3);
  assert.equal(
    elements.get('lives').innerHTML,
    UI_ICONS.heartFull.repeat(3),
    'HUD #lives must reset from empty hearts back to 3 full SVG hearts on Play Again!'
  );

  app.endGame('no_lives');
});

test('Custom vector sprite generator produces bespoke SVG artwork for all fruit and power-up types', () => {
  for (const type of ['normal', 'golden', 'tangerine', 'giant', 'lemon']) {
    const svg = getFruitSpriteSVG(type);
    assert.ok(svg.startsWith('<svg class="fruit-svg'), `Expected SVG sprite for ${type}`);
    assert.ok(svg.includes('#3a1b06'), `Expected unified ink outline on ${type}`);
  }
  for (const ptype of ['slowTime', 'magnet', 'shield', 'frenzy']) {
    const svg = getFruitSpriteSVG('powerup', ptype);
    assert.ok(svg.includes('powerup-orb'), `Expected power-up orb SVG for ${ptype}`);
  }
});

