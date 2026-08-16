/* ─────────────────────────────────────────────────────────────
   work.js — the two case studies, running rather than described.
   • QPGen  : the two-pass generate→verify pipeline, animated.
   • Observix: one instrumented app fanning telemetry out to four
     backends; toggle a sink and the packets stop reaching it.
   ───────────────────────────────────────────────────────────── */
(function (PP) {
  'use strict';

  /* ══════════════════════ QPGen pipeline ══════════════════════ */
  PP.initPipe = function () {
    const root = PP.$('#pipe');
    if (!root) return;
    const btn = PP.$('#runPipe');
    const stages = PP.$$('.stage', root);
    const rows = PP.$$('.qrow', root);
    const foot = PP.$('#pipeFoot');
    let running = false, timers = [];

    const say = html => { foot.innerHTML = `<span class="pipe__status">${html}</span>`; };
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));

    function reset() {
      timers.forEach(clearTimeout); timers = [];
      stages.forEach(s => { s.className = 'stage'; s.querySelector('.stage__bar').style.width = '0%'; });
      rows.forEach(r => { r.className = 'qrow'; });
      say('idle — press run');
    }

    function runStage(i, ms) {
      return new Promise(res => {
        const s = stages[i];
        s.classList.add('is-run');
        const bar = s.querySelector('.stage__bar');
        const t0 = performance.now();
        (function step(now) {
          const p = PP.clamp((now - t0) / ms, 0, 1);
          bar.style.width = (p * 100) + '%';
          if (p < 1 && running) requestAnimationFrame(step);
          else { s.classList.remove('is-run'); s.classList.add('is-done'); res(); }
        })(t0);
      });
    }

    async function run() {
      if (running) return;
      running = true;
      btn.disabled = true;
      reset();
      running = true;

      say('ingesting reference paper · extracting diagrams…');
      await runStage(0, 700);
      if (!running) return done();

      say('<b>pass 1</b> — vision model drafting questions…');
      await new Promise(res => {
        let i = 0;
        const iv = setInterval(() => {
          if (!running) { clearInterval(iv); return res(); }
          if (rows[i]) rows[i].classList.add('is-draft');
          if (++i >= rows.length) { clearInterval(iv); res(); }
        }, 190);
        runStage(1, rows.length * 190 + 120);
      });
      if (!running) return done();

      say('<b>pass 2</b> — re-solving independently, no answer key in context…');
      await new Promise(res => {
        let i = 0;
        const iv = setInterval(() => {
          if (!running) { clearInterval(iv); return res(); }
          const r = rows[i];
          if (r) {
            r.classList.add('is-check');
            const flagged = r.dataset.q === '3';   // the one the two passes disagree on
            setTimeout(() => {
              r.classList.remove('is-check');
              r.classList.add(flagged ? 'is-flag' : 'is-ok');
            }, 340);
          }
          if (++i >= rows.length) { clearInterval(iv); setTimeout(res, 420); }
        }, 260);
        runStage(2, rows.length * 260 + 420);
      });
      if (!running) return done();

      say('reconciling — 4 confirmed, <i>1 unconfirmed → flagged for teacher review</i>');
      await runStage(3, 620);
      if (!running) return done();

      say('exporting PDF · paper + separate answer key on letterhead…');
      await runStage(4, 760);
      say('<b>done</b> — 5 questions, 4 auto-verified, <i>1 awaiting review</i>. no unchecked answer ever reaches a teacher.');
      done();
    }

    function done() { running = false; btn.disabled = false; }

    btn.addEventListener('click', () => { running ? (running = false, done()) : run(); });

    // play it once, unprompted, the first time it scrolls into view
    const io = new IntersectionObserver((es, o) => {
      es.forEach(e => {
        if (!e.isIntersecting) return;
        o.unobserve(e.target);
        if (!PP.reduced) setTimeout(run, 420);
        else rows.forEach(r => r.classList.add('is-draft', 'is-ok'));
      });
    }, { threshold: 0.4 });
    io.observe(root);
  };

  /* ══════════════════════ Observix fan-out ══════════════════════ */
  PP.initFan = function () {
    const svg = PP.$('#fanSvg');
    if (!svg) return;
    const gE = PP.$('#fanEdges'), gN = PP.$('#fanNodes'), gP = PP.$('#fanPackets');
    const legend = PP.$('#fanLegend');
    const NS = 'http://www.w3.org/2000/svg';
    const el = (t, a) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); return n; };

    const SRC = { x: 152, y: 150 };
    const sinks = PP.sinks.map((s, i) => ({ ...s, x: 300, y: 34 + i * 62, on: true }));

    /* source block */
    const srcG = el('g', { class: 'fanNode' });
    srcG.appendChild(el('rect', { x: 18, y: 124, width: 134, height: 52, rx: 9, fill: 'rgba(53,224,232,.07)', stroke: '#35e0e8', 'stroke-width': 1.1 }));
    const t1 = el('text', { x: 85, y: 146, 'text-anchor': 'middle', fill: '#e9edf5' }); t1.textContent = 'your AI app';
    const t2 = el('text', { x: 85, y: 163, 'text-anchor': 'middle', fill: '#35e0e8', 'font-size': '9' }); t2.textContent = 'instrument(…) × 1';
    srcG.appendChild(t1); srcG.appendChild(t2);
    gN.appendChild(srcG);

    const pulse = el('circle', { cx: SRC.x, cy: SRC.y, r: 4, fill: '#35e0e8', filter: 'url(#fanGlow)' });
    gN.appendChild(pulse);

    /* edges + sink blocks */
    sinks.forEach(s => {
      const cy = s.y + 20;
      const d = `M${SRC.x},${SRC.y} C${SRC.x + 62},${SRC.y} ${s.x - 62},${cy} ${s.x},${cy}`;
      const p = el('path', { d, class: 'fanEdge', fill: 'none', stroke: s.color, 'stroke-width': 1.3, opacity: '.42' });
      gE.appendChild(p);
      s.path = p;
      s.len = p.getTotalLength();
      s.packets = [];

      const g = el('g', { class: 'fanNode' });
      g.appendChild(el('rect', { x: s.x, y: s.y, width: 140, height: 40, rx: 8, fill: s.color + '14', stroke: s.color, 'stroke-width': 1 }));
      const n1 = el('text', { x: s.x + 14, y: s.y + 18, fill: '#e9edf5' }); n1.textContent = s.name;
      const n2 = el('text', { x: s.x + 14, y: s.y + 31, fill: s.color, 'font-size': '8' }); n2.textContent = s.vocab;
      g.appendChild(n1); g.appendChild(n2);
      g.style.cursor = 'pointer';
      g.addEventListener('click', () => toggle(s));
      gN.appendChild(g);
      s.g = g;

      /* legend chip */
      const chip = document.createElement('button');
      chip.className = 'sink';
      chip.type = 'button';
      chip.style.color = s.color;
      chip.setAttribute('data-cursor', 'toggle');
      chip.innerHTML = `<i></i><span>${s.name}</span>`;
      chip.addEventListener('click', () => toggle(s));
      legend.appendChild(chip);
      s.chip = chip;
    });

    function toggle(s) {
      s.on = !s.on;
      s.g.classList.toggle('is-off', !s.on);
      s.path.classList.toggle('is-off', !s.on);
      s.chip.classList.toggle('is-off', !s.on);
      if (!s.on) { s.packets.forEach(p => p.el.remove()); s.packets = []; }
    }

    /* packets */
    let t = 0;
    PP.rafWhenVisible(svg, dt => {
      // Under reduced motion the diagram stays fully readable — it just
      // stops emitting packets and pulsing.
      if (PP.reduced) return;
      t += dt;
      pulse.setAttribute('r', (3.4 + Math.sin(t * 0.09) * 1.5).toFixed(2));

      sinks.forEach((s, i) => {
        if (s.on && s.packets.length < 4 && Math.random() < 0.030 * dt) {
          const c = el('circle', { r: 2.6, fill: s.color, filter: 'url(#fanGlow)' });
          gP.appendChild(c);
          s.packets.push({ el: c, t: 0, sp: PP.rand(0.006, 0.011) });
        }
        for (let k = s.packets.length - 1; k >= 0; k--) {
          const p = s.packets[k];
          p.t += p.sp * dt;
          if (p.t >= 1) { p.el.remove(); s.packets.splice(k, 1); continue; }
          const pt = s.path.getPointAtLength(p.t * s.len);
          p.el.setAttribute('cx', pt.x);
          p.el.setAttribute('cy', pt.y);
          p.el.setAttribute('opacity', (Math.sin(p.t * Math.PI) * 0.9 + 0.1).toFixed(2));
        }
      });
    });
  };
})(window.PP);
