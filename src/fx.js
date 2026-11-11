// ═══════════════════════════════════════════════════════════════════════════
//  CITRUS KITTEN (CANTRONN) — CANVAS SLICE TRAIL, SLICED HALVES & JUICE FX
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
    this.halves = []; // [{ x, y, vx, vy, rot, vrot, r, rindColor, pulpColor, alpha }]
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
    if (this.trail.length > 26) {
      this.trail.shift();
    }
  }

  clearTrail() {
    this.trail.length = 0;
  }

  spawnJuiceBurst(x, y, color = '#ff9800', count = 14, spawnHalves = true) {
    // 1. Spawn two spinning sliced citrus cross-section halves!
    if (spawnHalves && this.halves.length < 24) {
      const rindColor = color === '#ffd700' ? '#ffab00' : color === '#cddc39' ? '#afb42b' : '#ef6c00';
      for (const dir of [-1, 1]) {
        this.halves.push({
          x: x + dir * 8,
          y,
          vx: dir * (75 + Math.random() * 65),
          vy: -130 - Math.random() * 60,
          rot: dir > 0 ? 0.3 : Math.PI - 0.3,
          vrot: dir * (4.5 + Math.random() * 3),
          r: 22,
          rindColor,
          pulpColor: color,
          alpha: 1,
        });
      }
    }

    // 2. Spawn pressurized juice droplets & pulp seeds
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.45;
      const speed = 100 + Math.random() * 220;
      this.droplets.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 55,
        r: 3.5 + Math.random() * 5.5,
        color: i % 4 === 0 ? '#fff9c4' : color,
        alpha: 1,
        decay: 1.35 + Math.random() * 0.75,
      });
    }

    // 3. Expanding impact shockwave ring
    this.rings.push({
      x,
      y,
      r: 10,
      maxR: 60,
      color,
      alpha: 0.9,
    });
  }

  updateAndDraw(dt, now = performance.now(), feverActive = false) {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    // 1. Prune and draw tapered katana slice trail
    while (this.trail.length > 0 && now - this.trail[0].time > 155) {
      this.trail.shift();
    }

    if (this.trail.length >= 2) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 1; i < this.trail.length; i++) {
        const p0 = this.trail[i - 1];
        const p1 = this.trail[i];
        const age = (now - p1.time) / 155;
        const alpha = Math.max(0, 1 - age);
        const width = Math.max(2, (1 - age) * 15);

        // Outer dark ink outline on blade trail
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.strokeStyle = `rgba(58, 27, 6, ${alpha * 0.55})`;
        ctx.lineWidth = width + 4;
        ctx.stroke();

        // Vibrant citrus core glow
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.strokeStyle = feverActive
          ? `rgba(255, 215, 0, ${alpha * 0.95})`
          : `rgba(255, 145, 0, ${alpha * 0.92})`;
        ctx.lineWidth = width;
        ctx.stroke();

        // Crisp white specular blade edge
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.98})`;
        ctx.lineWidth = width * 0.4;
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. Update & draw spinning sliced citrus halves
    for (let i = this.halves.length - 1; i >= 0; i--) {
      const h = this.halves[i];
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.vy += 580 * dt;
      h.rot += h.vrot * dt;
      h.alpha -= dt * 1.65;
      if (h.alpha <= 0.02) {
        this.halves.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.translate(h.x, h.y);
      ctx.rotate(h.rot);
      ctx.globalAlpha = Math.max(0, h.alpha);

      // Outer rind semicircle
      ctx.beginPath();
      ctx.arc(0, 0, h.r, 0, Math.PI);
      ctx.closePath();
      ctx.fillStyle = h.rindColor;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#3a1b06';
      ctx.stroke();

      // White pith inner semicircle
      ctx.beginPath();
      ctx.arc(0, 0, h.r * 0.84, 0, Math.PI);
      ctx.closePath();
      ctx.fillStyle = '#fff8e1';
      ctx.fill();

      // Juicy pulp wedges
      ctx.beginPath();
      ctx.arc(0, 0, h.r * 0.72, 0.08, Math.PI - 0.08);
      ctx.closePath();
      ctx.fillStyle = h.pulpColor;
      ctx.fill();

      // Radial pith spokes
      ctx.strokeStyle = '#fff8e1';
      ctx.lineWidth = 1.8;
      for (let s = 1; s <= 3; s++) {
        const a = (Math.PI * s) / 4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * h.r * 0.74, Math.sin(a) * h.r * 0.74);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 3. Update & draw expanding shockwave rings
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i];
      ring.r += (ring.maxR - ring.r) * Math.min(1, dt * 11);
      ring.alpha -= dt * 2.5;
      if (ring.alpha <= 0.02) {
        this.rings.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
      ctx.strokeStyle = ring.color;
      ctx.globalAlpha = Math.max(0, ring.alpha);
      ctx.lineWidth = 3.5;
      ctx.stroke();
      ctx.restore();
    }

    // 4. Update & draw juice droplets with dark ink rims
    for (let i = this.droplets.length - 1; i >= 0; i--) {
      const d = this.droplets[i];
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vy += 420 * dt;
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
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#3a1b06';
      ctx.stroke();
      ctx.restore();
    }
  }
}
