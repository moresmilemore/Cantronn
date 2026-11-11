// ═══════════════════════════════════════════════════════════════════════════
//  CITRUS KITTEN (CANTRONN) — CONFIGURATION & GAME DATA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Computes the difficulty parameters for a given 0-based level index.
 * Uses a logarithmic velocity curve, capped hunger drain, and scaled hunger refill.
 */
export function getLevelCfg(idx, mode = 'classic') {
  const safeIdx = Math.max(0, Number(idx) || 0);
  const modeSpeedMult = mode === 'blitz' ? 1.15 : mode === 'zen' ? 0.85 : 1.0;
  const modeSpawnMult = mode === 'blitz' ? 0.82 : mode === 'zen' ? 1.15 : 1.0;

  return {
    speed: (130 + 320 * (1 - Math.exp(-safeIdx / 7))) * modeSpeedMult,
    spawnMs: Math.round(Math.max(320, (1400 - safeIdx * 120) * modeSpawnMult)),
    maxOranges: Math.min(9, (mode === 'blitz' ? 4 : 3) + Math.floor(safeIdx / 2)),
    hungerDrain: mode === 'zen' ? 0 : Math.min(4 + safeIdx * 1.5, 20),
    hungerRefill: Math.max(12, 18 - safeIdx * 0.5),
  };
}

/**
 * Game Modes
 */
export const GAME_MODES = {
  classic: {
    id: 'classic',
    name: 'Classic Arcade',
    iconKey: 'modeClassic',
    badge: 'CLASSIC',
    desc: 'Keep hunger full & protect 3 lives! +1 life every 10 levels.',
    hasLives: true,
    hasHungerDrain: true,
    timeLimitSec: null,
  },
  blitz: {
    id: 'blitz',
    name: '90s Citrus Blitz',
    iconKey: 'modeBlitz',
    badge: 'BLITZ',
    desc: '90s score rush! Golden adds +2s, sour lemons cost -5s.',
    hasLives: false,
    hasHungerDrain: false,
    timeLimitSec: 90,
  },
  zen: {
    id: 'zen',
    name: 'Zen Purr Garden',
    iconKey: 'modeZen',
    badge: 'ZEN',
    desc: 'Endless orchard mode! No lives lost, no starvation, no hazards.',
    hasLives: false,
    hasHungerDrain: false,
    timeLimitSec: null,
  },
};

/**
 * Power-up Definitions
 */
export const POWERUPS = {
  slowTime: {
    id: 'slowTime',
    label: 'Slow Time',
    dur: 4500,
    color: '#29b6f6',
    desc: 'Slows falling speed by 50%',
  },
  magnet: {
    id: 'magnet',
    label: 'Citrus Magnet',
    dur: 3800,
    color: '#ab47bc',
    desc: 'Pulls nearby citrus right into the kitten!',
  },
  shield: {
    id: 'shield',
    label: 'Bubble Shield',
    dur: null, // Consumed on next miss or hazard
    color: '#00bfa5',
    desc: 'Blocks 1 missed fruit or sour lemon!',
  },
  frenzy: {
    id: 'frenzy',
    label: '2x Citrus Rush',
    dur: 5000,
    color: '#ff6f00',
    desc: 'Double points & rapid fruit spawns!',
  },
};

/**
 * Fruit / Item Types & Probabilities
 */
export const FRUIT_TYPES = {
  normal: {
    id: 'normal',
    label: 'Valencia Orange',
    points: 10,
    hungerMult: 1.0,
    speedMult: 1.0,
    radius: 30,
    juiceColor: '#ff9800',
  },
  golden: {
    id: 'golden',
    label: 'Golden Mandarin',
    points: 30,
    hungerMult: 1.15,
    speedMult: 1.22,
    radius: 30,
    juiceColor: '#ffd700',
  },
  giant: {
    id: 'giant',
    label: 'Giant Pomelo',
    points: 20,
    hungerMult: 1.65,
    speedMult: 0.68,
    radius: 42,
    juiceColor: '#ff7043',
  },
  tangerine: {
    id: 'tangerine',
    label: 'Zesty Tangerine',
    points: 15,
    hungerMult: 0.9,
    speedMult: 1.12,
    comboBoost: 2,
    radius: 28,
    juiceColor: '#ffab40',
  },
  lemon: {
    id: 'lemon',
    label: 'Sour Lemon',
    points: 0,
    hungerMult: 0,
    speedMult: 0.88,
    isHazard: true,
    radius: 28,
    juiceColor: '#cddc39',
  },
  powerup: {
    id: 'powerup',
    label: 'Power-Up Orb',
    points: 5,
    hungerMult: 0.25,
    speedMult: 0.65,
    radius: 32,
    juiceColor: '#4fc3f7',
  },
};

/**
 * Selects a fruit type based on current level, game mode, and active Fever state.
 */
export function pickFruitType(levelIdx = 0, mode = 'classic', feverActive = false, rng = Math.random) {
  const r = rng();

  if (feverActive) {
    if (r < 0.06) return 'powerup';
    if (r < 0.32) return 'golden';
    if (r < 0.48) return 'tangerine';
    if (r < 0.60) return 'giant';
    return 'normal';
  }

  const lemonRate = mode === 'zen' ? 0 : 0.06 + Math.min(levelIdx * 0.01, 0.10);
  const powerupRate = mode === 'zen' ? 0.03 : 0.045;
  const goldenRate = 0.075;
  const giantRate = 0.055;
  const tangerineRate = levelIdx >= 1 ? 0.06 : 0.03;

  let cursor = powerupRate;
  if (r < cursor) return 'powerup';
  cursor += goldenRate;
  if (r < cursor) return 'golden';
  cursor += lemonRate;
  if (r < cursor) return 'lemon';
  cursor += giantRate;
  if (r < cursor) return 'giant';
  cursor += tangerineRate;
  if (r < cursor) return 'tangerine';
  return 'normal';
}

/**
 * Achievement Definitions (16 total)
 */
export const ACHIEVEMENT_DEFS = [
  { id: 'first_catch',   label: 'First Bite',      desc: 'Catch your first orange' },
  { id: 'combo_x5',      label: 'Combo King',      desc: 'Reach a x5 combo multiplier' },
  { id: 'combo_x8',      label: 'Combo Legend',    desc: 'Reach the max x8 combo multiplier' },
  { id: 'level_5',       label: 'Getting Good',    desc: 'Reach Level 5' },
  { id: 'level_10',      label: 'Citrus Master',   desc: 'Reach Level 10' },
  { id: 'catches_50',    label: 'Hungry Kitten',   desc: 'Catch 50 oranges total' },
  { id: 'catches_100',   label: 'Orange Obsessed', desc: 'Catch 100 oranges total' },
  { id: 'perfect_level', label: 'Perfect Round',   desc: 'Complete a level with 0 misses' },
  { id: 'golden_catch',  label: 'Golden Touch',    desc: 'Catch a Golden Mandarin' },
  { id: 'powerup_used',  label: 'Power Up!',       desc: 'Collect your first power-up' },
  { id: 'shield_used',   label: 'Untouchable',     desc: 'Block a miss or lemon with a Shield' },
  { id: 'score_500',     label: 'High Scorer',     desc: 'Score 500+ points in one game' },
  { id: 'score_2500',    label: 'Citrus Tycoon',   desc: 'Score 2,500+ points in one game' },
  { id: 'fever_trigger', label: 'Purr Overdrive',  desc: 'Activate Purr Fever mode' },
  { id: 'slice_multi',   label: 'Ninja Paws',      desc: 'Slice 3+ fruits in a single swipe' },
  { id: 'mouth_catch',   label: 'Direct Delivery', desc: 'Catch 10 fruits directly with the kitten' },
];

/**
 * Unlockable Kitten Skins
 */
export const KITTEN_SKINS = [
  {
    id: 'clementine',
    name: 'Clementine Tabby',
    unlockText: 'Starter Kitten',
    isUnlocked: () => true,
    colors: {
      fur: '#f4a94e',
      stripes: '#d97724',
      belly: '#fde8c5',
      earInner: '#f7b8c4',
      nose: '#ff5c8d',
      eyes: '#3a1b06',
    },
    accessory: 'none',
  },
  {
    id: 'tuxedo',
    name: 'Tuxedo Zest',
    unlockText: 'Catch 50 oranges total',
    isUnlocked: (ach, stats) => ach.includes('catches_50') || (stats.totalCaught || 0) >= 50,
    colors: {
      fur: '#2d3142',
      stripes: '#1b1e2b',
      belly: '#ffffff',
      earInner: '#f4a2b8',
      nose: '#ff7597',
      eyes: '#1b4332',
    },
    accessory: 'bowtie',
  },
  {
    id: 'calico',
    name: 'Yuzu Blossom',
    unlockText: 'Reach a x8 Combo',
    isUnlocked: (ach) => ach.includes('combo_x8'),
    colors: {
      fur: '#fff3e0',
      stripes: '#ef6c00',
      belly: '#ffffff',
      earInner: '#f8bbd0',
      nose: '#ec407a',
      eyes: '#4e342e',
    },
    accessory: 'flower',
  },
  {
    id: 'cyber',
    name: 'Cyber Citrus',
    unlockText: 'Reach Level 5',
    isUnlocked: (ach) => ach.includes('level_5'),
    colors: {
      fur: '#ff9100',
      stripes: '#00e5ff',
      belly: '#fff8e1',
      earInner: '#00e5ff',
      nose: '#ff007f',
      eyes: '#004d40',
    },
    accessory: 'visor',
  },
  {
    id: 'royal',
    name: 'Emperor Mandarin',
    unlockText: 'Reach Level 10 or Score 2,500+',
    isUnlocked: (ach) => ach.includes('level_10') || ach.includes('score_2500'),
    colors: {
      fur: '#ffb300',
      stripes: '#ff6f00',
      belly: '#fffde7',
      earInner: '#ffd54f',
      nose: '#d81b60',
      eyes: '#3e2723',
    },
    accessory: 'crown',
  },
];

/**
 * Bubble Messages
 */
export const CATCH_MESSAGES = [
  'Nom nom!', 'So juicy!', 'Purrfect!', 'Delicious!',
  'More citrus!!', 'Zesty!', 'Yummy!', '*Slurp!*',
  'Vitamin C: SECURED.', 'Perfect acidity!', 'Citrus life!',
  'Sweet & tangy!', 'Right in the mouth!', 'Pure happiness!',
  'Nutritionally optimal!', 'Purr engine: MAX!',
];

export const MISS_MESSAGES_UNHINGED = [
  'YOU DROPPED IT!', 'THAT WAS MINE!', 'ARE YOU SERIOUS?!',
  'PICK IT UP!!', 'INCOMPETENT!', 'My orange... gone.',
];

export const MISS_MESSAGES_WHOLESOME = [
  'Oh no, my orange!', 'It splatted!', 'Tummy rumbling...',
  'Too fast!', 'Come baaack!', 'Missed one!',
];
