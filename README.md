# 🍊 Citrus Kitten (`Cantronn`) — v2.0 Complete Overhaul

**Citrus Kitten** (`Cantronn`) is a fast-paced, juicy HTML5 / Web Audio arcade game where you keep an expressive tabby kitten well-fed by catching, slicing, and chomping falling citrus fruits while dodging sour lemons, chaining combos up to `x8`, triggering **Purr Fever**, and unlocking custom kitten skins.

---

## 🎮 Core Concept & Overhauled Features

### 1. Three Ways to Play Simultaneously
- **Tap / Click Catch**: Click or tap falling fruits directly before they splat on the ground.
- **Ninja Swipe-to-Slice (`<canvas>` Blade Trail)**: Drag or swipe across the screen to draw a glowing citrus blade trail and slice through multiple fruits at once (`3+` fruits in a single swipe awards a **`+25` Ninja Slice Bonus** and unlocks the **Ninja Paws** achievement).
- **Movable Kitten & Direct Mouth Catch**: Move the kitten left and right using `A` / `D`, `←` / `→` (hold `Shift` to dash), or drag the kitten directly. Fruits caught directly by the kitten's mouth/paws grant a **`+20%` Direct Delivery Bonus**!

### 2. Three Game Modes
- 🎮 **Classic Arcade**: Protect your 3 lives and prevent your Hunger Bar from draining to zero. Every 10 catches advances the level; every 10 levels grants a `+1` Bonus Life!
- ⏱️ **90s Citrus Blitz**: High-speed 90-second score attack! Golden Mandarins add `+2s` to the clock; Sour Lemons subtract `-5s`.
- 🌸 **Zen Purr Garden**: Endless, stress-free citrus catching with zero hunger drain, no life loss, and no sour lemons — just pure purr-synthesizer relaxation.

### 3. Expanded Citrus & Power-Up Roster
| Item | Icon | Effect |
| :--- | :---: | :--- |
| **Valencia Orange** | `🍊` | `+10 pts` × Combo, standard hunger refill |
| **Golden Mandarin** | `🍊✨` | `+30 pts` × Combo (`3x`), extra Fever charge (`+2s` in Blitz) |
| **Zesty Tangerine** | `🍑⚡` | `+15 pts` × Combo, instant **`+2` Combo boost** |
| **Giant Pomelo** | `🍊👑` | `+20 pts` × Combo, **1.65× massive hunger refill** |
| **Sour Lemon (Hazard)** | `🍋☠️` | Breaks combo and costs **1 Life** (or `-5s` in Blitz) unless Shielded |
| **Slow Time** | `⏳` | Halves falling fruit speed for `4.5s` |
| **Citrus Magnet** | `🧲` | Visibly pulls all nearby non-hazard citrus directly into the kitten's mouth for `3.8s` |
| **Bubble Shield** | `🛡️` | Surrounds the kitten in a glowing cyan dome that blocks the next miss or Sour Lemon |
| **2x Citrus Rush** | `🌈` | Doubles all points for `5.0s` and spawns an instant Golden Mandarin burst |

### 4. Purr Fever Overdrive & Procedural Web Audio Synth
- **Purr Fever Mode**: Every catch charges the **Fever Bar**. At `100%`, **Purr Fever** triggers for 6 seconds: `2x` score multiplier, zero hazard spawns, faster golden spawns, and an upbeat C5 pentatonic synth lead + bassline.
- **Procedural Audio Engine (`src/audio.js`)**:
  - **Cat Purr Synthesizer**: 3 detuned sawtooth oscillators (`30 Hz`, `60 Hz`, `90 Hz`) modulated by a `26 Hz` sine LFO through a `320 Hz` resonant low-pass filter, dynamically scaled by the kitten's fullness.
  - **Delta-Time Pentatonic Music Sequencer**: Scales tempo smoothly with level progression without timing drift.
  - **Independent Audio & Voice Toggles**: Separate HUD controls for **Music** (`🔊`/`🔇`), **SFX & Purr** (`🔔`/`🔕`), and **Voice Mode** (`🌶️` Classic Unhinged / `😇` Cute Wholesome / `🙊` Off).

### 5. Kitten Wardrobe (5 Unlockable Skins)
- 🐱 **Clementine Tabby** — Starter Kitten
- 🐈‍⬛ **Tuxedo Zest** (with red bowtie) — *Unlock: Catch 50 oranges total*
- 🌸 **Yuzu Blossom** (with cherry blossom) — *Unlock: Reach a x8 Combo*
- 🤖 **Cyber Citrus** (with neon visor) — *Unlock: Reach Level 5*
- 👑 **Emperor Mandarin** (with royal crown) — *Unlock: Reach Level 10 or Score 2,500+*

---

## 🛠️ Bugs Fixed in the v2.0 Overhaul

1. **Fixed Lives HUD Reset Bug (`prevLives` Desync)**: In the original code, `startGame()` set both `lives = 3` and `prevLives = 3` before calling `updateHUD()`, causing `if (lives !== prevLives)` to evaluate to `false` on Game 2+ and leaving `🖤🖤🖤` (0 hearts) displayed on the HUD after clicking "Play Again".
2. **Fixed Multi-Game Audio Mute & 400ms Suspend Race Condition**: In the original code, `endGame()` ramped `musicGain` to `0` and queued a `400ms` `audioCtx.suspend()` timeout, while `initAudio()` returned early on Game 2+ without restoring `musicGain` or restarting `scheduleMusicLoop()`.
3. **Fixed Music Tempo-Scaling Backward-Time Math Bug**: Replaced `musicStartTime + (musicStep + i) * beatDur` (which jumped backward in time whenever `levelIdx` increased and `beatDur` shrank) with a stateful delta-time lookahead scheduler (`nextNoteTime += beatDur`).
4. **Fixed Dead `hungerRefill` Scaling Code**: Normal oranges previously hardcoded `hungerBonus = 18`, bypassing `getLevelCfg(levelIdx).hungerRefill`. Fruits now use `cfg.hungerRefill * fruitDef.hungerMult`.
5. **Fixed True Magnetic Pull & `#gameArea` Coordinate Offset**: Magnet now physically attracts fruits along a vector toward the kitten's mouth (`kitCX, kitCY`), and score popups/particles properly offset by `#gameArea`'s top HUD height.
6. **Fixed Horizontal Sine Drift Off-Screen Clipping**: Clamped drifting fruit X coordinates within the viewport padding bounds.
7. **Fixed Cumulative Lifetime Catch Achievements**: `catches_50` and `catches_100` now properly check cumulative lifetime catches (`lifetimeCaughtBase + caught`).

---

## 📂 Project Structure & Build System

```text
Cantronn/
├── index.html          # Self-contained production bundle (zero-config Vercel ready)
├── manifest.json       # PWA Web App Manifest
├── vercel.json         # Vercel static deployment configuration
├── package.json        # Build, test, and dev server scripts
├── scripts/
│   └── build.js        # Compiles src/* into index.html and dist/index.html
├── src/
│   ├── config.js       # Level curves, game modes, fruits, power-ups, skins, achievements
│   ├── storage.js      # LocalStorage persistence & migration layer
│   ├── audio.js        # Web Audio API purr synth, music sequencer, SFX & speech engine
│   ├── fx.js           # HTML5 Canvas slice-trail & juice particle engine
│   ├── game.js         # Core game loop, collision detection, input & UI controller
│   ├── styles.css      # Responsive layout, animations, and theme styles
│   └── template.html   # Base HTML & dynamic SVG kitten rig
└── tests/
    └── game.test.js    # Automated unit & end-to-end lifecycle test suite
```

### Commands

```bash
# Build index.html and dist/index.html from src/
npm run build

# Run the automated test suite
npm test

# Start a local development server on http://localhost:3000
npm start
```
