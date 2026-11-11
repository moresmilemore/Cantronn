// ═══════════════════════════════════════════════════════════════════════════
//  CITRUS KITTEN (CANTRONN) — PERSISTENCE & STORAGE LAYER
// ═══════════════════════════════════════════════════════════════════════════

const KEYS = {
  BEST: 'citrus_best',
  LEADERBOARD: 'citrus_lb',
  ACHIEVEMENTS: 'citrus_ach',
  SESSION: 'citrus_session',
  SETTINGS: 'citrus_settings',
  SKIN: 'citrus_skin',
};

function safeGet(storage, key, fallback) {
  try {
    const raw = storage.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    return raw;
  } catch (e) {
    return fallback;
  }
}

function safeSet(storage, key, val) {
  try {
    storage.setItem(key, val);
  } catch (e) {
    // Ignore quota or private-browsing storage errors
  }
}

export function getBestScore(storage = globalThis.localStorage) {
  const raw = safeGet(storage, KEYS.BEST, '0');
  return Math.max(0, parseInt(raw, 10) || 0);
}

export function setBestScore(score, storage = globalThis.localStorage) {
  const clean = Math.max(0, Math.floor(Number(score) || 0));
  safeSet(storage, KEYS.BEST, String(clean));
  return clean;
}

export function getLeaderboard(storage = globalThis.localStorage) {
  try {
    const raw = safeGet(storage, KEYS.LEADERBOARD, '[]');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveLeaderboard(lb, storage = globalThis.localStorage) {
  safeSet(storage, KEYS.LEADERBOARD, JSON.stringify(lb));
}

export function addLeaderboardEntry(entry, storage = globalThis.localStorage) {
  if (!entry || entry.score <= 0) return getLeaderboard(storage);
  const lb = getLeaderboard(storage);
  lb.push({
    score: Math.floor(entry.score),
    level: entry.level || 1,
    accuracy: typeof entry.accuracy === 'number' ? entry.accuracy : 0,
    mode: entry.mode || 'classic',
    date: entry.date || Date.now(),
  });
  lb.sort((a, b) => b.score - a.score);
  lb.splice(10);
  saveLeaderboard(lb, storage);
  return lb;
}

export function getUnlockedAchievements(storage = globalThis.localStorage) {
  try {
    const raw = safeGet(storage, KEYS.ACHIEVEMENTS, '[]');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveAchievements(arr, storage = globalThis.localStorage) {
  safeSet(storage, KEYS.ACHIEVEMENTS, JSON.stringify(arr));
}

export function getSessionStats(storage = globalThis.localStorage) {
  try {
    const raw = safeGet(storage, KEYS.SESSION, '{}');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
}

export function saveSessionStats(stats, storage = globalThis.localStorage) {
  safeSet(storage, KEYS.SESSION, JSON.stringify(stats));
}

export function updateSessionStats(gameResult, storage = globalThis.localStorage) {
  const s = getSessionStats(storage);
  s.gamesPlayed = (s.gamesPlayed || 0) + 1;
  s.totalCaught = (s.totalCaught || 0) + (gameResult.caught || 0);
  s.bestCombo = Math.max(s.bestCombo || 0, gameResult.bestCombo || 0);
  s.bestAccuracy = Math.max(s.bestAccuracy || 0, gameResult.accuracy || 0);
  s.totalScore = (s.totalScore || 0) + (gameResult.score || 0);
  saveSessionStats(s, storage);
  return s;
}

export function getSettings(storage = globalThis.localStorage) {
  const defaults = {
    musicOn: true,
    sfxOn: true,
    voiceMode: 'unhinged', // 'unhinged' | 'wholesome' | 'off'
  };
  try {
    const raw = safeGet(storage, KEYS.SETTINGS, null);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch (e) {
    return defaults;
  }
}

export function saveSettings(settings, storage = globalThis.localStorage) {
  safeSet(storage, KEYS.SETTINGS, JSON.stringify(settings));
}

export function getSelectedSkin(storage = globalThis.localStorage) {
  return safeGet(storage, KEYS.SKIN, 'clementine') || 'clementine';
}

export function saveSelectedSkin(skinId, storage = globalThis.localStorage) {
  safeSet(storage, KEYS.SKIN, skinId);
}
