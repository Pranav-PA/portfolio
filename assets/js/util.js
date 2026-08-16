/* ─────────────────────────────────────────────────────────────
   util.js — shared helpers + global namespace
   ───────────────────────────────────────────────────────────── */
window.PP = window.PP || {};

(function (PP) {
  'use strict';

  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp  = (a, b, t) => a + (b - a) * t;
  const rand  = (a, b) => a + Math.random() * (b - a);
  const map   = (v, a, b, c, d) => c + ((v - a) / (b - a)) * (d - c);
  const ease  = t => 1 - Math.pow(1 - t, 3);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse  = window.matchMedia('(pointer: coarse)').matches;

  /* Sets up a hidpi canvas and keeps it sized to its CSS box.
     onResize(w, h) is called with CSS pixels. */
  function fitCanvas(canvas, onResize) {
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0;
    function resize() {
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (onResize) onResize(w, h);
    }
    resize();
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener('resize', resize);
    return { ctx, resize, get w() { return w; }, get h() { return h; } };
  }

  /* Runs `fn` only while the element is on screen — keeps the tab cool. */
  function rafWhenVisible(el, fn) {
    let live = false, id = 0, last = performance.now();
    /* Always cancel before requesting: a tab that loads while hidden has a
       frame queued that never fires, and visibilitychange would otherwise
       start a second loop on top of it. */
    function play() {
      cancelAnimationFrame(id);
      last = performance.now();
      id = requestAnimationFrame(tick);
    }

    const io = new IntersectionObserver(es => {
      const vis = es[0].isIntersecting;
      if (vis && !live) { live = true; play(); }
      else if (!vis && live) { live = false; cancelAnimationFrame(id); }
    }, { rootMargin: '120px' });
    io.observe(el);
    function tick(t) {
      if (!live) return;
      const dt = Math.min((t - last) / 16.666, 3);
      last = t;
      fn(dt, t);
      id = requestAnimationFrame(tick);
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(id);
      else if (live) play();
    });
  }

  /* Scrambled text reveal — cycles glyphs then settles on the real char. */
  const GLYPHS = '▚▞█▓▒░<>/\\{}[]()#$%&@*+=~^|01ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function scramble(el, text, dur) {
    if (reduced) { el.textContent = text; return Promise.resolve(); }
    dur = dur || 780;
    const start = performance.now();
    const seeds = Array.from(text, () => Math.random());
    return new Promise(res => {
      (function frame(now) {
        const p = clamp((now - start) / dur, 0, 1);
        let out = '';
        for (let i = 0; i < text.length; i++) {
          const ch = text[i];
          if (ch === ' ') { out += ' '; continue; }
          // each char locks in at a slightly different time
          const lock = 0.25 + seeds[i] * 0.6;
          out += p >= lock ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
        el.textContent = out;
        if (p < 1) requestAnimationFrame(frame);
        else { el.textContent = text; res(); }
      })(start);
    });
  }

  /* Typewriter that also deletes — used by the hero role line. */
  function typeLoop(el, lines, opts) {
    opts = opts || {};
    const speed = opts.speed || 46, back = opts.back || 22, hold = opts.hold || 1500;
    let li = 0, ci = 0, del = false;
    if (reduced) { el.textContent = lines[0]; return; }
    (function step() {
      const line = lines[li];
      el.textContent = line.slice(0, ci);
      if (!del) {
        if (ci < line.length) { ci++; setTimeout(step, speed + Math.random() * 40); }
        else setTimeout(() => { del = true; step(); }, hold);
      } else {
        if (ci > 0) { ci--; setTimeout(step, back); }
        else { del = false; li = (li + 1) % lines.length; setTimeout(step, 240); }
      }
    })();
  }

  /* Smooth scroll that accounts for the fixed topbar. */
  function scrollToId(id) {
    const el = document.getElementById(String(id).replace('#', ''));
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - (id === 'hero' ? 0 : 56);
    window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  }

  /* Reveal-on-scroll for anything tagged [data-rv]. */
  function observeReveals(root) {
    const io = new IntersectionObserver((es, o) => {
      es.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        o.unobserve(e.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -8%' });
    $$('[data-rv]', root || document).forEach(el => io.observe(el));
  }

  /* Tiny inline sparkline as a background-image (no extra canvas). */
  function sparkline(values, color) {
    const w = 44, h = 14, n = values.length;
    let min = Infinity, max = -Infinity;
    for (const v of values) { if (v < min) min = v; if (v > max) max = v; }
    if (max - min < 1e-6) max = min + 1;
    let d = '';
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * w;
      const y = h - 1 - ((values[i] - min) / (max - min)) * (h - 2);
      d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><path d="${d}" fill="none" stroke="${color}" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round" opacity=".85"/></svg>`;
    return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
  }

  const hex = {
    cyan: '#35e0e8', violet: '#8b5cf6', lime: '#b6f24a',
    amber: '#ffb443', rose: '#ff5c7a', dim: '#525b6e'
  };

  Object.assign(PP, {
    $, $$, clamp, lerp, rand, map, ease, reduced, coarse,
    fitCanvas, rafWhenVisible, scramble, typeLoop, scrollToId,
    observeReveals, sparkline, hex
  });
})(window.PP);
