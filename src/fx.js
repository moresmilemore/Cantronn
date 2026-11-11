// ═══════════════════════════════════════════════════════════════════════════
//  CITRUS KITTEN (CANTRONN) — CANVAS SLICE TRAIL & JUICE PARTICLE ENGINE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Checks if a line segment (x1,y1)-(x2,y2) intersects a circle (cx,cy,r).
 */
export function segmentIntersectsCircle(x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return Math.hypot(cx - x1, cy - y1) <= r;
  }
  let t = ((cx - x1) * dx + (cy - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const nearX = x1 + t * dx;
  const nearY = y1 + t * dy;
  return Math.hypot(cx - nearX, cy - nearY) <= r;
}

export class CanvasFX {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.trail = []; // [{ x, y, time }]
    this.droplets = []; // [{ x, y, vx, vy, r, color, alpha, decay }]
    this.rings = []; // [{ x, y, r, maxR, color, alpha }]
    this.resize();
  }

  resize() {
    if (!this.canvas || typeof window === 'undefined') return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    if (this.ctx) {
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  addTrailPoint(x, y, now = performance.now()) {
    this.trail.push({ x, y, time: now });
    if (this.trail.length > 24) {
      this.trail.shift();
    }
  }

  clearTrail() {
    this.trail.length = 0;
  }

  spawnJuiceBurst(x, y, color = '#ff9800', count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = 90 + Math.random() * 190;
      this.droplets.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        r: 3 + Math.random() * 4.5,
        color,
        alpha: 1,
        decay: 1.4 + Math.random() * 0.8,
      });
    }
    this.rings.push({
      x,
      y,
      r: 8,
      maxR: 52,
      color,
      alpha: 0.85,
    });
  }

  updateAndDraw(dt, now = performance.now(), feverActive = false) {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    // 1. Prune and draw slice trail
    while (this.trail.length > 0 && now - this.trail[0].time > 160) {
      this.trail.shift();
    }

    if (this.trail.length >= 2) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 1; i < this.trail.length; i++) {
        const p0 = this.trail[i - 1];
        const p1 = this.trail[i];
        const age = (now - p1.time) / 160;
        const alpha = Math.max(0, 1 - age);
        const width = Math.max(2, (1 - age) * 12);

        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.strokeStyle = feverActive
          ? `rgba(255, 215, 0, ${alpha * 0.9})`
          : `rgba(255, 138, 0, ${alpha * 0.85})`;
        ctx.lineWidth = width;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.95})`;
        ctx.lineWidth = width * 0.42;
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. Update & draw expanding rings
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i];
      ring.r += (ring.maxR - ring.r) * Math.min(1, dt * 10);
      ring.alpha -= dt * 2.4;
      if (ring.alpha <= 0.02) {
        this.rings.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
      ctx.strokeStyle = ring.color;
      ctx.globalAlpha = Math.max(0, ring.alpha);
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }

    // 3. Update & draw juice droplets
    for (let i = this.droplets.length - 1; i >= 0; i--) {
      const d = this.droplets[i];
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vy += 380 * dt; // gravity
      d.alpha -= d.decay * dt;
      if (d.alpha <= 0.02) {
        this.droplets.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = d.color;
      ctx.globalAlpha = Math.max(0, d.alpha);
      ctx.fill();
      ctx.restore();
    }
  }
}
