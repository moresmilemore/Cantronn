// ═══════════════════════════════════════════════════════════════════════════
//  CITRUS KITTEN (CANTRONN) — BESPOKE ILLUSTRATED VECTOR ASSETS & SPRITES
//  All sprites & icons use a unified #3a1b06 ink outline, volumetric shading,
//  and crisp specular highlights — zero raw system emojis.
// ═══════════════════════════════════════════════════════════════════════════

export const UI_ICONS = {
  heartFull: `<svg class="heart-svg full" viewBox="0 0 36 34" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 31C18 31 3 22 3 11.5C3 6.2 7.2 2.5 12 2.5C15.1 2.5 17.2 4.3 18 6.2C18.8 4.3 20.9 2.5 24 2.5C28.8 2.5 33 6.2 33 11.5C33 22 18 31 18 31Z" fill="#ff3b5c" stroke="#3a1b06" stroke-width="3.2" stroke-linejoin="round"/>
    <path d="M18 28.5C18 28.5 5.5 20.5 5.5 11.5C5.5 7.5 8.5 4.8 12 4.8C14.8 4.8 16.8 6.5 18 8.5" fill="#ff6b84"/>
    <ellipse cx="10.5" cy="9.5" rx="3.2" ry="1.8" transform="rotate(-28 10.5 9.5)" fill="#ffffff" fill-opacity="0.88"/>
  </svg>`,

  heartEmpty: `<svg class="heart-svg empty" viewBox="0 0 36 34" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 31C18 31 3 22 3 11.5C3 6.2 7.2 2.5 12 2.5C15.1 2.5 17.2 4.3 18 6.2C18.8 4.3 20.9 2.5 24 2.5C28.8 2.5 33 6.2 33 11.5C33 22 18 31 18 31Z" fill="#7d6b5d" fill-opacity="0.45" stroke="#3a1b06" stroke-width="3.2" stroke-linejoin="round"/>
    <path d="M16 6L14 13L19 16L15 24" stroke="#3a1b06" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  musicOn: `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 21V7L23 4V18" stroke="#3a1b06" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="7.5" cy="21" r="3.5" fill="#ff9800" stroke="#3a1b06" stroke-width="2.6"/>
    <circle cx="20.5" cy="18" r="3.5" fill="#ff9800" stroke="#3a1b06" stroke-width="2.6"/>
    <path d="M10 11L23 8" stroke="#3a1b06" stroke-width="2.6"/>
  </svg>`,

  musicOff: `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 21V7L23 4V18" stroke="#8d6e63" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="7.5" cy="21" r="3.5" fill="#bdbdbd" stroke="#3a1b06" stroke-width="2.6"/>
    <circle cx="20.5" cy="18" r="3.5" fill="#bdbdbd" stroke="#3a1b06" stroke-width="2.6"/>
    <line x1="4" y1="4" x2="24" y2="24" stroke="#e53935" stroke-width="3.2" stroke-linecap="round"/>
  </svg>`,

  sfxOn: `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 11H8.5L15 5.5V22.5L8.5 17H4V11Z" fill="#ffb300" stroke="#3a1b06" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M19 9.5C20.8 11.2 20.8 16.8 19 18.5" stroke="#3a1b06" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M22.5 6.5C25.5 9.8 25.5 18.2 22.5 21.5" stroke="#ff6f00" stroke-width="2.6" stroke-linecap="round"/>
  </svg>`,

  sfxOff: `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 11H8.5L15 5.5V22.5L8.5 17H4V11Z" fill="#bdbdbd" stroke="#3a1b06" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M19 10L25 18M25 10L19 18" stroke="#e53935" stroke-width="3" stroke-linecap="round"/>
  </svg>`,

  voiceUnhinged: `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 6C22 9 21 16 15 21C10 25 5 24 4 22C3 20 6 19 9 16C12 13 13 8 16 6C17.5 5 19 5 20 6Z" fill="#ff2a2a" stroke="#3a1b06" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M18 6C19 3.5 21.5 2.5 23.5 3" stroke="#43a047" stroke-width="2.8" stroke-linecap="round"/>
    <path d="M14 10C13 13 10.5 16.5 7.5 19" stroke="#ff8a80" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`,

  voiceWholesome: `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="14" cy="16" r="8" fill="#ffe082" stroke="#3a1b06" stroke-width="2.6"/>
    <ellipse cx="14" cy="5.5" rx="8.5" ry="2.6" stroke="#ffd700" stroke-width="2.8"/>
    <path d="M10.5 15C11.2 13.8 12.3 13.8 13 15" stroke="#3a1b06" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M15 15C15.7 13.8 16.8 13.8 17.5 15" stroke="#3a1b06" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M11.5 18.5Q14 20.8 16.5 18.5" stroke="#3a1b06" stroke-width="2.2" stroke-linecap="round"/>
  </svg>`,

  voiceOff: `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 8C6 5.8 7.8 4 10 4H18C20.2 4 22 5.8 22 8V15C22 17.2 20.2 19 18 19H13L8 23V19C6.8 18.5 6 17 6 15V8Z" fill="#e0e0e0" stroke="#3a1b06" stroke-width="2.6" stroke-linejoin="round"/>
    <line x1="5" y1="5" x2="23" y2="23" stroke="#e53935" stroke-width="3" stroke-linecap="round"/>
  </svg>`,

  pause: `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6.5" y="5.5" width="5.5" height="17" rx="2.2" fill="#ff9800" stroke="#3a1b06" stroke-width="2.6"/>
    <rect x="16" y="5.5" width="5.5" height="17" rx="2.2" fill="#ff9800" stroke="#3a1b06" stroke-width="2.6"/>
  </svg>`,

  play: `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polygon points="8,5 23,14 8,23" fill="#66bb6a" stroke="#3a1b06" stroke-width="2.6" stroke-linejoin="round"/>
  </svg>`,

  modeClassic: `<svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="22" cy="24" r="15" fill="url(#gradClassic)" stroke="#3a1b06" stroke-width="3.2"/>
    <path d="M22 9C22 5 26 3 26 3" stroke="#5d4037" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M23 8C27 4 34 5 35 9C31 12 26 11 23 8Z" fill="#43a047" stroke="#3a1b06" stroke-width="2.6" stroke-linejoin="round"/>
    <ellipse cx="16" cy="18" rx="4.5" ry="2.4" transform="rotate(-30 16 18)" fill="white" fill-opacity="0.75"/>
    <defs>
      <radialGradient id="gradClassic" cx="0.35" cy="0.3" r="0.7">
        <stop offset="0%" stop-color="#ffb74d"/>
        <stop offset="65%" stop-color="#ff8f00"/>
        <stop offset="100%" stop-color="#e65100"/>
      </radialGradient>
    </defs>
  </svg>`,

  modeBlitz: `<svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="17" y="2" width="10" height="4" rx="2" fill="#ffd54f" stroke="#3a1b06" stroke-width="2.6"/>
    <circle cx="22" cy="24" r="15" fill="#fff8e1" stroke="#3a1b06" stroke-width="3.2"/>
    <circle cx="22" cy="24" r="11.5" stroke="#ff9800" stroke-width="2" stroke-dasharray="3 3"/>
    <path d="M22 15V24L28 27" stroke="#e65100" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="22" cy="24" r="2.5" fill="#3a1b06"/>
  </svg>`,

  modeZen: `<svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 8C26 14 30 20 28 28C26 33 18 33 16 28C14 20 18 14 22 8Z" fill="#f48fb1" stroke="#3a1b06" stroke-width="2.8" stroke-linejoin="round"/>
    <path d="M22 31C14 31 7 25 6 16C13 16 19 21 22 31Z" fill="#f8bbd0" stroke="#3a1b06" stroke-width="2.8" stroke-linejoin="round"/>
    <path d="M22 31C30 31 37 25 38 16C31 16 25 21 22 31Z" fill="#f8bbd0" stroke="#3a1b06" stroke-width="2.8" stroke-linejoin="round"/>
    <path d="M10 34C16 38 28 38 34 34" stroke="#43a047" stroke-width="3.5" stroke-linecap="round"/>
  </svg>`,

  wardrobe: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 12L11 7H21L26 12L22 16L19 13V25H13V13L10 16L6 12Z" fill="#ffab40" stroke="#3a1b06" stroke-width="2.6" stroke-linejoin="round"/>
    <polygon points="16,13 12,10 12,16" fill="#e53935"/>
    <polygon points="16,13 20,10 20,16" fill="#e53935"/>
  </svg>`,

  trophy: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 6H23V14C23 18.5 19.8 21.5 16 21.5C12.2 21.5 9 18.5 9 14V6Z" fill="#ffd700" stroke="#3a1b06" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M9 8H5V12C5 14.5 7 16 9 16" stroke="#3a1b06" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M23 8H27V12C27 14.5 25 16 23 16" stroke="#3a1b06" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M16 21.5V26M11 26H21" stroke="#3a1b06" stroke-width="2.8" stroke-linecap="round"/>
  </svg>`,

  medals: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polygon points="11,4 16,13 21,4" fill="#e53935" stroke="#3a1b06" stroke-width="2.4" stroke-linejoin="round"/>
    <circle cx="16" cy="19" r="8" fill="#ffd700" stroke="#3a1b06" stroke-width="2.6"/>
    <polygon points="16,14 17.6,17.2 21,17.7 18.5,20.1 19.1,23.5 16,21.8 12.9,23.5 13.5,20.1 11,17.7 14.4,17.2" fill="#fff8e1"/>
  </svg>`,

  guide: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="5" width="20" height="22" rx="3" fill="#fff8e1" stroke="#3a1b06" stroke-width="2.6"/>
    <path d="M11 5V27" stroke="#ff9800" stroke-width="2.6"/>
    <line x1="15" y1="11" x2="22" y2="11" stroke="#3a1b06" stroke-width="2.4" stroke-linecap="round"/>
    <line x1="15" y1="16" x2="22" y2="16" stroke="#3a1b06" stroke-width="2.4" stroke-linecap="round"/>
    <line x1="15" y1="21" x2="19" y2="21" stroke="#3a1b06" stroke-width="2.4" stroke-linecap="round"/>
  </svg>`,
};

/**
 * Generates bespoke, hand-illustrated SVG markup for falling fruits and power-up orbs.
 */
export function getFruitSpriteSVG(fruitType, powerupType = null) {
  if (fruitType === 'powerup') {
    const pIcon = getPowerupInnerSVG(powerupType || 'slowTime');
    return `<svg class="fruit-svg powerup-orb" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="33" fill="url(#orbGrad_${powerupType})" stroke="#3a1b06" stroke-width="4"/>
      <circle cx="40" cy="40" r="28" stroke="#ffffff" stroke-opacity="0.65" stroke-width="2" stroke-dasharray="6 4"/>
      <g transform="translate(18, 18)">${pIcon}</g>
      <path d="M20 24C24 16 33 13 42 14" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity="0.85"/>
      <circle cx="24" cy="54" r="3" fill="#ffffff" opacity="0.7"/>
      <defs>
        <radialGradient id="orbGrad_${powerupType}" cx="0.35" cy="0.3" r="0.75">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="45%" stop-color="#80d8ff"/>
          <stop offset="100%" stop-color="#0288d1"/>
        </radialGradient>
      </defs>
    </svg>`;
  }

  if (fruitType === 'lemon') {
    return `<svg class="fruit-svg lemon-svg" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Sour hazard aura -->
      <circle cx="40" cy="42" r="34" fill="#c6ff00" fill-opacity="0.22" stroke="#76ff03" stroke-width="2" stroke-dasharray="5 5"/>
      <!-- Pointed lemon body -->
      <path d="M14 42C14 27 25 17 40 17C55 17 66 27 66 42C69 44 71 47 68 50C65 53 63 52 61 54C56 62 49 66 40 66C31 66 24 62 19 54C17 52 15 53 12 50C9 47 11 44 14 42Z" fill="url(#lemonGrad)" stroke="#3a1b06" stroke-width="4.2" stroke-linejoin="round"/>
      <!-- Shading crescent -->
      <path d="M24 57C34 64 52 62 59 49" stroke="#afb42b" stroke-width="4" stroke-linecap="round" opacity="0.6"/>
      <!-- Specular highlight -->
      <path d="M23 31C27 24 36 22 44 23" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" opacity="0.85"/>
      <!-- Sour grumpy face / warning -->
      <path d="M29 39L36 43L29 46" stroke="#3a1b06" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M51 39L44 43L51 46" stroke="#3a1b06" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M32 53L36 50L40 53L44 50L48 53" stroke="#3a1b06" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <defs>
        <radialGradient id="lemonGrad" cx="0.35" cy="0.3" r="0.75">
          <stop offset="0%" stop-color="#ffff8d"/>
          <stop offset="65%" stop-color="#ffee58"/>
          <stop offset="100%" stop-color="#fbc02d"/>
        </radialGradient>
      </defs>
    </svg>`;
  }

  if (fruitType === 'golden') {
    return `<svg class="fruit-svg golden-svg" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Golden halo -->
      <circle cx="40" cy="44" r="33" fill="#ffd700" fill-opacity="0.28"/>
      <!-- Orange sphere -->
      <circle cx="40" cy="44" r="27" fill="url(#goldOrangeGrad)" stroke="#3a1b06" stroke-width="4.2"/>
      <!-- Metallic rim shading -->
      <path d="M22 58C32 67 52 65 60 50" stroke="#ff8f00" stroke-width="4.5" stroke-linecap="round" opacity="0.7"/>
      <!-- Stem & Golden Leaf -->
      <path d="M40 17V10" stroke="#3a1b06" stroke-width="4" stroke-linecap="round"/>
      <path d="M41 15C47 8 58 9 60 15C54 20 45 19 41 15Z" fill="#ffd54f" stroke="#3a1b06" stroke-width="3.2" stroke-linejoin="round"/>
      <!-- Gloss highlight -->
      <ellipse cx="29" cy="32" rx="7.5" ry="4" transform="rotate(-32 29 32)" fill="#ffffff" fill-opacity="0.92"/>
      <circle cx="23" cy="41" r="2.2" fill="#ffffff" fill-opacity="0.85"/>
      <!-- 4-point sparkles -->
      <path d="M13 22L15 27L20 29L15 31L13 36L11 31L6 29L11 27L13 22Z" fill="#ffffff" stroke="#3a1b06" stroke-width="1.5"/>
      <path d="M67 26L68.5 30L72.5 31.5L68.5 33L67 37L65.5 33L61.5 31.5L65.5 30L67 26Z" fill="#fff59d" stroke="#3a1b06" stroke-width="1.5"/>
      <defs>
        <radialGradient id="goldOrangeGrad" cx="0.35" cy="0.3" r="0.75">
          <stop offset="0%" stop-color="#fff9c4"/>
          <stop offset="40%" stop-color="#ffd700"/>
          <stop offset="85%" stop-color="#ff8f00"/>
          <stop offset="100%" stop-color="#e65100"/>
        </radialGradient>
      </defs>
    </svg>`;
  }

  if (fruitType === 'tangerine') {
    return `<svg class="fruit-svg tangerine-svg" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Wide squat tangerine body -->
      <ellipse cx="40" cy="46" rx="29" ry="23" fill="url(#tangGrad)" stroke="#3a1b06" stroke-width="4.2"/>
      <!-- Top crease lines -->
      <path d="M32 25C35 29 45 29 48 25" stroke="#bf360c" stroke-width="2.5" stroke-linecap="round"/>
      <!-- Twin leaves -->
      <path d="M40 24C34 15 23 15 21 21C27 26 35 26 40 24Z" fill="#66bb6a" stroke="#3a1b06" stroke-width="3" stroke-linejoin="round"/>
      <path d="M40 24C46 15 57 15 59 21C53 26 45 26 40 24Z" fill="#43a047" stroke="#3a1b06" stroke-width="3" stroke-linejoin="round"/>
      <!-- Gloss & combo bolt emblem -->
      <ellipse cx="27" cy="36" rx="6.5" ry="3.2" transform="rotate(-25 27 36)" fill="#ffffff" fill-opacity="0.88"/>
      <polygon points="44,35 35,47 42,47 38,59 51,44 43,44" fill="#ffee58" stroke="#3a1b06" stroke-width="2.4" stroke-linejoin="round"/>
      <defs>
        <radialGradient id="tangGrad" cx="0.35" cy="0.3" r="0.75">
          <stop offset="0%" stop-color="#ffcc80"/>
          <stop offset="55%" stop-color="#ff6d00"/>
          <stop offset="100%" stop-color="#dd2c00"/>
        </radialGradient>
      </defs>
    </svg>`;
  }

  if (fruitType === 'giant') {
    return `<svg class="fruit-svg giant-svg" viewBox="0 0 92 92" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="46" cy="50" r="34" fill="url(#giantGrad)" stroke="#3a1b06" stroke-width="4.6"/>
      <!-- Dimples & shading -->
      <path d="M24 68C36 78 60 76 70 58" stroke="#bf360c" stroke-width="5" stroke-linecap="round" opacity="0.5"/>
      <circle cx="58" cy="56" r="1.8" fill="#bf360c" opacity="0.55"/>
      <circle cx="63" cy="48" r="1.8" fill="#bf360c" opacity="0.55"/>
      <circle cx="54" cy="63" r="1.8" fill="#bf360c" opacity="0.55"/>
      <!-- Gloss -->
      <ellipse cx="32" cy="35" rx="9" ry="4.8" transform="rotate(-30 32 35)" fill="#ffffff" fill-opacity="0.88"/>
      <circle cx="24" cy="46" r="2.8" fill="#ffffff" fill-opacity="0.8"/>
      <!-- Mini Crown on top of Giant Pomelo -->
      <polygon points="31,20 35,8 46,15 57,8 61,20" fill="#ffd700" stroke="#3a1b06" stroke-width="3.2" stroke-linejoin="round"/>
      <defs>
        <radialGradient id="giantGrad" cx="0.35" cy="0.28" r="0.75">
          <stop offset="0%" stop-color="#ffe082"/>
          <stop offset="50%" stop-color="#ff8f00"/>
          <stop offset="100%" stop-color="#d84315"/>
        </radialGradient>
      </defs>
    </svg>`;
  }

  // Default: Valencia Orange ('normal')
  return `<svg class="fruit-svg normal-svg" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="40" cy="44" r="27" fill="url(#normOrangeGrad)" stroke="#3a1b06" stroke-width="4.2"/>
    <!-- Bottom-right warm ambient shadow -->
    <path d="M23 59C34 67 52 64 59 50" stroke="#d84315" stroke-width="4.5" stroke-linecap="round" opacity="0.55"/>
    <!-- Peel pores -->
    <circle cx="51" cy="50" r="1.5" fill="#bf360c" opacity="0.55"/>
    <circle cx="55" cy="43" r="1.5" fill="#bf360c" opacity="0.55"/>
    <circle cx="46" cy="55" r="1.5" fill="#bf360c" opacity="0.55"/>
    <!-- Stem & two-tone leaf -->
    <path d="M40 18V11" stroke="#3a1b06" stroke-width="4.2" stroke-linecap="round"/>
    <path d="M41 16C48 8 60 9 62 16C55 21 46 20 41 16Z" fill="#43a047" stroke="#3a1b06" stroke-width="3.2" stroke-linejoin="round"/>
    <path d="M43 15.5L56 14.5" stroke="#a5d6a7" stroke-width="1.8" stroke-linecap="round"/>
    <!-- Top-left gloss highlight -->
    <ellipse cx="29" cy="32" rx="7.2" ry="3.8" transform="rotate(-32 29 32)" fill="#ffffff" fill-opacity="0.88"/>
    <circle cx="23" cy="41" r="2.2" fill="#ffffff" fill-opacity="0.8"/>
    <defs>
      <radialGradient id="normOrangeGrad" cx="0.35" cy="0.3" r="0.75">
        <stop offset="0%" stop-color="#ffd54f"/>
        <stop offset="55%" stop-color="#ff9100"/>
        <stop offset="100%" stop-color="#e65100"/>
      </radialGradient>
    </defs>
  </svg>`;
}

function getPowerupInnerSVG(type) {
  if (type === 'magnet') {
    return `<path d="M10 10V22C10 29.7 16.3 36 24 36C31.7 36 38 29.7 38 22V10H30V22C30 25.3 27.3 28 24 28C20.7 28 18 25.3 18 22V10H10Z" fill="#e53935" stroke="#3a1b06" stroke-width="3" stroke-linejoin="round"/>
    <rect x="10" y="8" width="8" height="6" fill="#e0e0e0" stroke="#3a1b06" stroke-width="2.5"/>
    <rect x="30" y="8" width="8" height="6" fill="#e0e0e0" stroke="#3a1b06" stroke-width="2.5"/>`;
  }
  if (type === 'shield') {
    return `<path d="M22 6L36 11V21C36 30 29.5 36.5 22 39C14.5 36.5 8 30 8 21V11L22 6Z" fill="#00e5ff" stroke="#3a1b06" stroke-width="3" stroke-linejoin="round"/>
    <path d="M22 10L31 13.5V20.5C31 27 26.5 32 22 34" fill="#84ffff"/>`;
  }
  if (type === 'frenzy') {
    return `<polygon points="22,4 26.5,15.5 39,16.5 29.5,24.5 32.5,37 22,30 11.5,37 14.5,24.5 5,16.5 17.5,15.5" fill="#ffd700" stroke="#3a1b06" stroke-width="2.8" stroke-linejoin="round"/>`;
  }
  // slowTime hourglass
  return `<path d="M12 8H32L25 21L32 34H12L19 21L12 8Z" fill="#ffd54f" stroke="#3a1b06" stroke-width="2.8" stroke-linejoin="round"/>
  <rect x="10" y="6" width="24" height="4" rx="1.5" fill="#8d6e63" stroke="#3a1b06" stroke-width="2.4"/>
  <rect x="10" y="32" width="24" height="4" rx="1.5" fill="#8d6e63" stroke="#3a1b06" stroke-width="2.4"/>`;
}
