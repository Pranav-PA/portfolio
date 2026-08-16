/* ─────────────────────────────────────────────────────────────
   hero.js — the agent graph.
   Navigation isn't a menu; it's a state machine you can grab.
   Nodes spring back to their home position, repel the pointer,
   and route packets along their edges. Clicking traverses.
   ───────────────────────────────────────────────────────────── */
(function (PP) {
  'use strict';

  const KIND_COLOR = {
    entry: '#35e0e8', prompt: '#8b5cf6', tool: '#ffb443',
    agent: '#b6f24a', exit: '#ff5c7a'
  };

  PP.initHero = function () {
    const canvas = PP.$('#graph');
    const hint = PP.$('#graphHint');
    if (!canvas) return;

    let W = 0, H = 0, narrow = false;

    /* ── node + edge model ─────────────────────────────────── */
    const nodes = PP.graphNodes.map(n => ({
      ...n,
      // fx/fy keep the authored layout fractions; x/y become live pixels
      fx: n.x, fy: n.y,
      color: KIND_COLOR[n.kind] || '#35e0e8',
      x: 0, y: 0, hx: 0, hy: 0, vx: 0, vy: 0,
      hot: 0, phase: Math.random() * Math.PI * 2, held: false
    }));
    const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
    const edges = PP.graphEdges
      .map(([a, b]) => ({ a: byId[a], b: byId[b], packets: [], flow: 0 }))
      .filter(e => e.a && e.b);

    // normalize the authored coordinates into a clean 0..1 box
    const xs = PP.graphNodes.map(n => n.x), ys = PP.graphNodes.map(n => n.y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const y0 = Math.min(...ys), y1 = Math.max(...ys);

    function layout(w, h) {
      W = w; H = h;
      narrow = w < 900;
      // Keep the graph clear of the copy column on the left and the
      // telemetry HUD in the bottom-right.
      const bx = narrow ? [0.12, 0.88] : [0.53, 0.92];
      const by = narrow ? [0.36, 0.90] : [0.17, 0.73];
      nodes.forEach(n => {
        const nx = (n.fx - x0) / (x1 - x0 || 1);
        const ny = (n.fy - y0) / (y1 - y0 || 1);
        n.hx = PP.lerp(bx[0], bx[1], nx) * w;
        n.hy = PP.lerp(by[0], by[1], ny) * h;
        if (!n.init) { n.x = n.hx; n.y = n.hy; n.init = true; }
      });
      // dust rescale
      dust.forEach(d => { d.x = Math.min(d.x, w); d.y = Math.min(d.y, h); });
    }

    /* ── ambient dust for depth ────────────────────────────── */
    const dust = Array.from({ length: PP.coarse ? 34 : 76 }, () => ({
      x: Math.random() * 1600, y: Math.random() * 900,
      z: PP.rand(0.25, 1), s: PP.rand(0.5, 1.7), a: PP.rand(0.06, 0.34),
      vx: PP.rand(-0.14, 0.14), vy: PP.rand(-0.1, 0.1)
    }));

    /* Sized last on purpose: fitCanvas invokes layout() synchronously,
       and layout() touches every binding declared above it. */
    const { ctx } = PP.fitCanvas(canvas, layout);

    /* ── pointer ───────────────────────────────────────────── */
    let mx = -9999, my = -9999, hover = null, drag = null;
    let downAt = null, moved = 0;

    function pos(e) {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    function pick(x, y) {
      let best = null, bd = 26 * 26;
      for (const n of nodes) {
        const d = (n.x - x) ** 2 + (n.y - y) ** 2;
        const rr = (n.r + 16) ** 2;
        if (d < rr && d < bd) { bd = d; best = n; }
      }
      return best;
    }

    canvas.addEventListener('pointermove', e => {
      const p = pos(e);
      mx = p.x; my = p.y;
      if (drag) {
        moved += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0);
        drag.x = p.x; drag.y = p.y; drag.vx = 0; drag.vy = 0;
        return;
      }
      const h = pick(p.x, p.y);
      if (h !== hover) {
        hover = h;
        canvas.style.cursor = h ? 'pointer' : 'grab';
        if (PP.cursorHot) PP.cursorHot(!!h, h ? 'goto ' + h.label : '');
      }
    }, { passive: true });

    canvas.addEventListener('pointerleave', () => {
      mx = my = -9999; hover = null;
      if (PP.cursorHot) PP.cursorHot(false);
    }, { passive: true });

    canvas.addEventListener('pointerdown', e => {
      const p = pos(e);
      const n = pick(p.x, p.y);
      moved = 0; downAt = p;
      if (n) {
        drag = n; n.held = true;
        canvas.setPointerCapture(e.pointerId);
        if (hint) hint.classList.add('is-off');
      }
    });

    window.addEventListener('pointerup', e => {
      if (drag) {
        const n = drag;
        n.held = false;
        drag = null;
        // a tap, not a drag → traverse
        if (moved < 6 && downAt) {
          burst(n);
          PP.scrollToId(n.id);
        }
      }
      downAt = null;
    });

    /* ── ripple on traverse ────────────────────────────────── */
    const rings = [];
    function burst(n) {
      rings.push({ x: n.x, y: n.y, r: n.r, a: 1, c: n.color });
      edges.forEach(e => { if (e.a === n || e.b === n) e.flow = 1; });
    }

    /* ── packets ───────────────────────────────────────────── */
    function spawn(e) {
      const from = Math.random() < 0.5;
      e.packets.push({
        t: 0, sp: PP.rand(0.0032, 0.0075), rev: from,
        c: (from ? e.b : e.a).color, s: PP.rand(1.4, 2.6)
      });
    }
    edges.forEach(e => { for (let i = 0; i < 2; i++) { spawn(e); e.packets[i].t = Math.random(); } });

    /* control point for an edge's quadratic curve (a gentle sag) */
    function ctrl(e) {
      const mxp = (e.a.x + e.b.x) / 2, myp = (e.a.y + e.b.y) / 2;
      const dx = e.b.x - e.a.x, dy = e.b.y - e.a.y;
      const len = Math.hypot(dx, dy) || 1;
      const bow = Math.min(len * 0.16, 54);
      return { x: mxp + (-dy / len) * bow, y: myp + (dx / len) * bow };
    }
    function qpoint(a, c, b, t) {
      const u = 1 - t;
      return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
               y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
    }

    /* ── node glyphs ───────────────────────────────────────── */
    function glyph(n, r) {
      ctx.beginPath();
      switch (n.kind) {
        case 'prompt': { // square
          ctx.rect(n.x - r, n.y - r, r * 2, r * 2); break;
        }
        case 'tool': { // diamond
          ctx.moveTo(n.x, n.y - r * 1.25); ctx.lineTo(n.x + r * 1.25, n.y);
          ctx.lineTo(n.x, n.y + r * 1.25); ctx.lineTo(n.x - r * 1.25, n.y);
          ctx.closePath(); break;
        }
        case 'agent': { // hexagon
          for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i - Math.PI / 6;
            const px = n.x + Math.cos(a) * r * 1.15, py = n.y + Math.sin(a) * r * 1.15;
            i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
          }
          ctx.closePath(); break;
        }
        case 'exit': { // triangle
          for (let i = 0; i < 3; i++) {
            const a = (Math.PI * 2 / 3) * i - Math.PI / 2;
            const px = n.x + Math.cos(a) * r * 1.35, py = n.y + Math.sin(a) * r * 1.35;
            i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
          }
          ctx.closePath(); break;
        }
        default: ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      }
    }

    /* ── frame ─────────────────────────────────────────────── */
    let t = 0;
    PP.rafWhenVisible(canvas, dt => {
      t += dt;
      ctx.clearRect(0, 0, W, H);

      /* dust */
      ctx.save();
      for (const d of dust) {
        d.x += d.vx * dt * d.z; d.y += d.vy * dt * d.z;
        if (d.x < -10) d.x = W + 10; if (d.x > W + 10) d.x = -10;
        if (d.y < -10) d.y = H + 10; if (d.y > H + 10) d.y = -10;
        ctx.globalAlpha = d.a * d.z;
        ctx.fillStyle = '#9fb4d8';
        ctx.fillRect(d.x, d.y, d.s, d.s);
      }
      ctx.restore();

      /* physics */
      for (const n of nodes) {
        n.hot = PP.lerp(n.hot, hover === n ? 1 : 0, 0.14);
        if (n.held) continue;

        // spring home + slow idle orbit so it never looks frozen
        n.phase += 0.006 * dt;
        const ox = Math.cos(n.phase) * 7, oy = Math.sin(n.phase * 1.3) * 6;
        n.vx += ((n.hx + ox) - n.x) * 0.014 * dt;
        n.vy += ((n.hy + oy) - n.y) * 0.014 * dt;

        // pointer repulsion
        const dx = n.x - mx, dy = n.y - my;
        const d2 = dx * dx + dy * dy;
        if (d2 < 24000 && d2 > 1) {
          const f = (1 - d2 / 24000) * 0.85;
          const d = Math.sqrt(d2);
          n.vx += (dx / d) * f * dt;
          n.vy += (dy / d) * f * dt;
        }

        n.vx *= 0.90; n.vy *= 0.90;
        n.x += n.vx * dt; n.y += n.vy * dt;
      }

      /* edges */
      for (const e of edges) {
        const c = ctrl(e);
        const lit = Math.max(e.a.hot, e.b.hot, e.flow);
        e.flow *= 0.94;

        ctx.beginPath();
        ctx.moveTo(e.a.x, e.a.y);
        ctx.quadraticCurveTo(c.x, c.y, e.b.x, e.b.y);
        const g = ctx.createLinearGradient(e.a.x, e.a.y, e.b.x, e.b.y);
        g.addColorStop(0, hexA(e.a.color, 0.18 + lit * 0.5));
        g.addColorStop(0.5, hexA('#8fa6c8', 0.12 + lit * 0.28));
        g.addColorStop(1, hexA(e.b.color, 0.18 + lit * 0.5));
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.1 + lit * 1.1;
        ctx.stroke();

        /* packets riding the curve */
        for (let i = e.packets.length - 1; i >= 0; i--) {
          const p = e.packets[i];
          p.t += p.sp * dt * (1 + lit * 2.4);
          if (p.t >= 1) { e.packets.splice(i, 1); continue; }
          const tt = p.rev ? 1 - p.t : p.t;
          const pt = qpoint(e.a, c, e.b, tt);
          const tr = qpoint(e.a, c, e.b, PP.clamp(tt + (p.rev ? 0.055 : -0.055), 0, 1));

          ctx.beginPath();
          ctx.moveTo(tr.x, tr.y); ctx.lineTo(pt.x, pt.y);
          ctx.strokeStyle = hexA(p.c, 0.34 + lit * 0.4);
          ctx.lineWidth = p.s * 0.85;
          ctx.lineCap = 'round';
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(pt.x, pt.y, p.s, 0, Math.PI * 2);
          ctx.fillStyle = p.c;
          ctx.shadowBlur = 10; ctx.shadowColor = p.c;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
        if (e.packets.length < 3 && Math.random() < 0.016 * dt) spawn(e);
      }

      /* rings */
      for (let i = rings.length - 1; i >= 0; i--) {
        const rg = rings[i];
        rg.r += 2.6 * dt; rg.a -= 0.018 * dt;
        if (rg.a <= 0) { rings.splice(i, 1); continue; }
        ctx.beginPath();
        ctx.arc(rg.x, rg.y, rg.r, 0, Math.PI * 2);
        ctx.strokeStyle = hexA(rg.c, rg.a * 0.6);
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }

      /* nodes */
      for (const n of nodes) {
        const r = n.r * (1 + n.hot * 0.34);
        const pulse = 0.5 + 0.5 * Math.sin(t * 0.05 + n.phase);

        // halo
        const hg = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * (7 + n.hot * 4));
        hg.addColorStop(0, hexA(n.color, 0.30 + n.hot * 0.3));
        hg.addColorStop(1, hexA(n.color, 0));
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * (7 + n.hot * 4), 0, Math.PI * 2);
        ctx.fill();

        // orbiting ring on hover
        if (n.hot > 0.02) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 9 + n.hot * 5, t * 0.02, t * 0.02 + Math.PI * 1.35);
          ctx.strokeStyle = hexA(n.color, n.hot * 0.8);
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        // body
        glyph(n, r);
        ctx.fillStyle = hexA(n.color, 0.22 + n.hot * 0.34);
        ctx.fill();
        ctx.strokeStyle = hexA(n.color, 0.72 + n.hot * 0.28 + pulse * 0.14);
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // core
        ctx.beginPath();
        ctx.arc(n.x, n.y, 2.4 + n.hot * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.shadowBlur = 12; ctx.shadowColor = n.color;
        ctx.fill();
        ctx.shadowBlur = 0;

        // label
        ctx.font = '500 9.5px "JetBrains Mono", ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = hexA('#e9edf5', 0.5 + n.hot * 0.5);
        ctx.letterSpacing && (ctx.letterSpacing = '1.5px');
        ctx.fillText(n.label.toUpperCase(), n.x, n.y + r + 17);
        ctx.letterSpacing && (ctx.letterSpacing = '0px');

        if (n.hot > 0.4) {
          ctx.font = '400 8px "JetBrains Mono", ui-monospace, monospace';
          ctx.fillStyle = hexA(n.color, (n.hot - 0.4) * 1.4);
          ctx.fillText('#' + n.id, n.x, n.y + r + 29);
        }
      }
      ctx.textAlign = 'start';
    });

    function hexA(h, a) {
      const v = parseInt(h.slice(1), 16);
      return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${PP.clamp(a, 0, 1)})`;
    }

    // hide the hint once the user has clearly seen it
    setTimeout(() => hint && hint.classList.add('is-off'), 9000);
    PP.graphBurst = id => { const n = byId[id]; if (n) burst(n); };
  };

  /* ── HUD: plausible live telemetry, because the theme demands it ── */
  PP.initHUD = function () {
    const els = {
      spans: PP.$('#mSpans'), lat: PP.$('#mLat'), tok: PP.$('#mTok')
    };
    if (!els.spans) return;
    const sparks = {
      spans: PP.$('[data-spark="spans"]'),
      lat: PP.$('[data-spark="lat"]'),
      tok: PP.$('[data-spark="tok"]')
    };
    const hist = { spans: [], lat: [], tok: [] };
    let s = 340, l = 128, k = 52;

    function step() {
      s = PP.clamp(s + PP.rand(-26, 26), 180, 620);
      l = PP.clamp(l + PP.rand(-11, 11), 74, 240);
      k = PP.clamp(k + PP.rand(-7, 7), 22, 96);
      const push = (key, v) => {
        hist[key].push(v);
        if (hist[key].length > 22) hist[key].shift();
        if (sparks[key]) sparks[key].style.backgroundImage =
          PP.sparkline(hist[key], key === 'lat' ? PP.hex.amber : PP.hex.cyan);
      };
      push('spans', s); push('lat', l); push('tok', k);
      els.spans.textContent = Math.round(s);
      els.lat.textContent = Math.round(l) + 'ms';
      els.tok.textContent = Math.round(k);
    }
    for (let i = 0; i < 22; i++) step();
    setInterval(step, 900);
  };

  /* ── the little attention grid in the About panel ─────────── */
  PP.initAttention = function () {
    const canvas = PP.$('#attnCanvas');
    if (!canvas) return;
    const { ctx } = PP.fitCanvas(canvas);
    const N = 16, M = 8;
    const grid = Array.from({ length: M }, () => Array.from({ length: N }, () => Math.random()));
    let t = 0;
    PP.rafWhenVisible(canvas, dt => {
      t += dt * 0.012;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      const cw = w / N, ch = h / M;
      for (let r = 0; r < M; r++) {
        for (let c = 0; c < N; c++) {
          // softly drifting attention weights
          const v = (Math.sin(t + r * 0.6 + c * 0.35) * 0.5 + 0.5) * 0.6 + grid[r][c] * 0.4;
          const a = Math.pow(v, 2.4);
          ctx.fillStyle = a > 0.55
            ? `rgba(53,224,232,${a * 0.85})`
            : `rgba(139,92,246,${a * 0.6})`;
          ctx.fillRect(c * cw + 0.6, r * ch + 0.6, cw - 1.2, ch - 1.2);
        }
      }
    });
  };
})(window.PP);
