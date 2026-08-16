/* ─────────────────────────────────────────────────────────────
   main.js — boot sequence, chrome, and wiring.
   ───────────────────────────────────────────────────────────── */
(function (PP) {
  'use strict';

  const BOOT = [
    ['otel.sdk',   'bootstrapping tracer provider'],
    ['resource',   'service.name=<b>pranav.aradhya</b>'],
    ['resource',   'service.version=2027.0.0-beta'],
    ['exporter',   'otlp/http → phoenix', 1],
    ['exporter',   'otlp/http → langfuse', 1],
    ['exporter',   'otlp/http → mlflow', 1],
    ['exporter',   'otlp/http → datadog', 1],
    ['instrument', 'langchain · langgraph · agentscope', 1],
    ['shader',     'compiling atmosphere', 1],
    ['graph',      '6 nodes · 9 edges', 1],
    ['embed',      '39 skill vectors projected', 1],
    ['waterfall',  '7 spans reconstructed', 1],
    ['span.start', '<b>career.pranav_aradhya</b>'],
    ['ready',      'trace is live', 1]
  ];

  /* ══════════════════ boot ══════════════════ */
  function boot(done) {
    const el = PP.$('#boot');
    const log = PP.$('#bootLog');
    const fill = PP.$('#bootFill');
    const pctEl = PP.$('#bootPct');
    const skip = PP.$('#bootSkip');
    if (!el) return done();

    const seen = sessionStorage.getItem('pp:booted');
    if (seen || PP.reduced) { el.remove(); return done(); }

    document.documentElement.classList.add('is-locked');
    let i = 0, killed = false;

    function finish() {
      if (killed) return;
      killed = true;
      sessionStorage.setItem('pp:booted', '1');
      el.classList.add('is-done');
      document.documentElement.classList.remove('is-locked');
      setTimeout(() => el.remove(), 700);
      done();
    }

    function step() {
      if (killed) return;
      if (i >= BOOT.length) { setTimeout(finish, 340); return; }
      const [k, v, ok] = BOOT[i];
      const t = (0.004 + i * 0.021 + Math.random() * 0.01).toFixed(3);
      const p = document.createElement('div');
      p.innerHTML =
        `<span class="hl">[${t}]</span> ${k.padEnd(11)} ${v}` +
        (ok ? '   <span class="ok">ok</span>' : '');
      log.appendChild(p);
      log.scrollTop = log.scrollHeight;
      i++;
      const pc = Math.round((i / BOOT.length) * 100);
      fill.style.width = pc + '%';
      pctEl.textContent = pc + '%';
      setTimeout(step, 60 + Math.random() * 105);
    }
    step();

    skip.addEventListener('click', finish);
    el.addEventListener('click', finish);
    window.addEventListener('keydown', function esc(e) {
      if (e.key === 'Enter' || e.key === 'Escape') { finish(); window.removeEventListener('keydown', esc); }
    });
    setTimeout(finish, 6500); // hard ceiling — never trap anyone
  }

  /* ══════════════════ custom cursor ══════════════════ */
  function cursor() {
    const el = PP.$('#cursor');
    const label = PP.$('#cursorLabel');
    if (!el || PP.coarse) return;
    let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y, on = false;

    window.addEventListener('pointermove', e => {
      tx = e.clientX; ty = e.clientY;
      if (!on) { on = true; el.classList.add('is-on'); }
    }, { passive: true });
    window.addEventListener('pointerdown', () => el.classList.add('is-down'));
    window.addEventListener('pointerup', () => el.classList.remove('is-down'));
    document.addEventListener('mouseleave', () => el.classList.remove('is-on'));

    (function loop() {
      x = PP.lerp(x, tx, 0.22); y = PP.lerp(y, ty, 0.22);
      el.style.transform = `translate3d(${x}px,${y}px,0)`;
      requestAnimationFrame(loop);
    })();

    PP.cursorHot = (hot, text) => {
      el.classList.toggle('is-hot', !!hot);
      if (hot && text) label.textContent = text;
      else if (!hot) label.textContent = '';
    };

    const SEL = 'a,button,[data-cursor],input,.span,.chip,.sink,.case__stack i';
    document.addEventListener('mouseover', e => {
      const t = e.target.closest(SEL);
      if (!t) return;
      PP.cursorHot(true, t.dataset.cursor || (t.tagName === 'A' ? 'open' : ''));
    });
    document.addEventListener('mouseout', e => {
      if (e.target.closest(SEL) && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(SEL)))
        PP.cursorHot(false);
    });
  }

  /* ══════════════════ rail + section tracking ══════════════════ */
  function rail() {
    const wrap = PP.$('#railNodes');
    const fill = PP.$('#railFill');
    const secs = PP.$$('[data-section]');
    if (!wrap) return;

    const map = new Map();
    secs.forEach(s => {
      const a = document.createElement('a');
      a.className = 'rail__node';
      a.href = '#' + s.id;
      a.setAttribute('data-cursor', s.dataset.label);
      a.innerHTML = `<span>${s.dataset.label}</span>`;
      a.addEventListener('click', e => { e.preventDefault(); PP.scrollToId(s.id); });
      wrap.appendChild(a);
      map.set(s.id, a);
    });

    let ticking = false;
    function update() {
      ticking = false;
      const h = document.documentElement.scrollHeight - innerHeight;
      fill.style.height = PP.clamp(scrollY / (h || 1), 0, 1) * 100 + '%';

      // the section whose top is closest to a third down the viewport wins
      let best = null, bd = Infinity;
      secs.forEach(s => {
        const r = s.getBoundingClientRect();
        if (r.bottom < 80 || r.top > innerHeight - 80) return;
        const d = Math.abs(r.top - innerHeight * 0.32);
        if (d < bd) { bd = d; best = s; }
      });
      map.forEach((a, id) => a.classList.toggle('is-on', !!best && best.id === id));
    }
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ══════════════════ command palette ══════════════════ */
  function palette() {
    const box = PP.$('#palette');
    const input = PP.$('#paletteInput');
    const list = PP.$('#paletteList');
    const btn = PP.$('#paletteBtn');
    if (!box) return;
    let items = [], sel = 0, open = false;

    function render(q) {
      const qq = q.trim().toLowerCase();
      items = PP.commands.filter(c =>
        !qq || c.label.toLowerCase().includes(qq) || c.hint.toLowerCase().includes(qq));
      sel = 0;
      if (!items.length) { list.innerHTML = '<li class="palette__empty">no match — try “skills”, “observix”, “email”</li>'; return; }
      list.innerHTML = items.map((c, i) =>
        `<li class="palette__item" role="option" aria-selected="${i === 0}" data-i="${i}">
           <i>${c.icon}</i><b>${c.label}</b><em>${c.hint}</em>
         </li>`).join('');
      PP.$$('.palette__item', list).forEach(li => {
        li.addEventListener('mouseenter', () => { sel = +li.dataset.i; mark(); });
        li.addEventListener('click', () => go(items[+li.dataset.i]));
      });
    }
    function mark() {
      PP.$$('.palette__item', list).forEach((li, i) => li.setAttribute('aria-selected', i === sel));
      const cur = list.children[sel];
      if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
    }
    function go(c) {
      if (!c) return;
      close();
      if (c.url) { if (c.url.startsWith('mailto:')) location.href = c.url; else window.open(c.url, '_blank', 'noopener'); }
      else setTimeout(() => PP.scrollToId(c.go), 120);
    }
    function show() {
      open = true; box.hidden = false;
      document.documentElement.classList.add('is-locked');
      input.value = ''; render(''); input.focus();
    }
    function close() {
      open = false; box.hidden = true;
      document.documentElement.classList.remove('is-locked');
    }

    input.addEventListener('input', () => render(input.value));
    box.addEventListener('click', e => { if (e.target.hasAttribute('data-close')) close(); });
    if (btn) btn.addEventListener('click', show);

    window.addEventListener('keydown', e => {
      const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); open ? close() : show(); return; }
      if (!open) {
        if (e.key === '/' && !typing) { e.preventDefault(); show(); }
        return;
      }
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % items.length; mark(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + items.length) % items.length; mark(); }
      else if (e.key === 'Enter') { e.preventDefault(); go(items[sel]); }
    });
    PP.openPalette = show;
  }

  /* ══════════════════ small chrome ══════════════════ */
  function chrome() {
    // clock
    const clock = PP.$('#clock');
    if (clock) {
      const tick = () => {
        const d = new Date();
        clock.textContent = [d.getHours(), d.getMinutes(), d.getSeconds()]
          .map(n => String(n).padStart(2, '0')).join(':');
      };
      tick(); setInterval(tick, 1000);
    }

    // a stable-ish trace id for this session
    const tid = PP.$('#traceId');
    if (tid) {
      let id = sessionStorage.getItem('pp:tid');
      if (!id) {
        id = Array.from({ length: 16 }, () => '0123456789abcdef'[(Math.random() * 16) | 0]).join('');
        sessionStorage.setItem('pp:tid', id);
      }
      tid.textContent = id;
    }

    // hero role typewriter
    const role = PP.$('#roleText');
    if (role) PP.typeLoop(role, PP.me.roles);

    // smooth anchors
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href').slice(1);
      if (!id || !document.getElementById(id)) return;
      e.preventDefault();
      PP.scrollToId(id);
      if (PP.graphBurst) PP.graphBurst(id);
    });

    const top = PP.$('#toTop');
    if (top) top.addEventListener('click', () => PP.scrollToId('hero'));

    // section titles scramble the first time they arrive
    const io = new IntersectionObserver((es, o) => {
      es.forEach(e => {
        if (!e.isIntersecting) return;
        o.unobserve(e.target);
        PP.scramble(e.target, e.target.dataset.text, 700);
      });
    }, { threshold: 0.6 });
    PP.$$('.sec__title .scram').forEach(el => io.observe(el));

    // about card line-in
    const card = PP.$('#promptCard');
    if (card) new IntersectionObserver((es, o) => {
      es.forEach(e => { if (e.isIntersecting) { card.classList.add('is-in'); o.unobserve(e.target); } });
    }, { threshold: 0.25 }).observe(card);

    // token counter ticks up as the prompt "streams"
    const tok = PP.$('#tokCount');
    if (tok) new IntersectionObserver((es, o) => {
      es.forEach(e => {
        if (!e.isIntersecting) return;
        o.unobserve(e.target);
        let v = 0; const target = 1247;
        const iv = setInterval(() => {
          v += Math.ceil((target - v) * 0.12) + 3;
          if (v >= target) { v = target; clearInterval(iv); }
          tok.textContent = v;
        }, 34);
      });
    }, { threshold: 0.4 }).observe(tok);

    // clicking a derived attribute focuses the matching skill cluster
    const jump = { 'agent.frameworks': 'genai', 'oss.published': 'obs', 'stack.depth': 'web' };
    PP.$$('#derive .derive__list li').forEach(li => {
      const c = jump[li.dataset.k];
      if (!c) return;
      li.style.cursor = 'pointer';
      li.setAttribute('data-cursor', 'focus');
      li.addEventListener('click', () => {
        PP.scrollToId('stack');
        setTimeout(() => PP.skillFocus && PP.skillFocus(c), 620);
      });
    });
  }

  /* ══════════════════ easter egg ══════════════════ */
  function konami() {
    const seq = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    let i = 0;
    window.addEventListener('keydown', e => {
      i = (e.key === seq[i] || e.key.toLowerCase() === seq[i]) ? i + 1 : 0;
      if (i !== seq.length) return;
      i = 0;
      document.body.animate(
        [{ filter: 'hue-rotate(0deg)' }, { filter: 'hue-rotate(360deg)' }],
        { duration: 2600, iterations: 2 }
      );
      if (PP.termRun) { PP.scrollToId('contact'); setTimeout(() => PP.termRun('matrix'), 800); }
    });
  }

  /* ══════════════════ go ══════════════════ */
  /* Each layer is independent — isolate them so one bad frame of code
     can never take the whole page down with it. */
  function safe(name, fn) {
    try { fn && fn(); }
    catch (err) { console.error('[' + name + '] failed:', err); }
  }

  function start() {
    ['initBG', 'initHero', 'initHUD', 'initAttention', 'initSkills',
     'initTrace', 'initPipe', 'initFan', 'initTerminal']
      .forEach(k => safe(k, PP[k]));

    safe('cursor', cursor);
    safe('rail', rail);
    safe('palette', palette);
    safe('chrome', chrome);
    safe('konami', konami);
    safe('reveals', PP.observeReveals);

    // stagger the hero copy in
    const hero = PP.$('.hero__content');
    if (hero && !PP.reduced) {
      Array.from(hero.children).forEach((c, i) => {
        c.animate(
          [{ opacity: 0, transform: 'translateY(22px)' }, { opacity: 1, transform: 'none' }],
          { duration: 900, delay: 90 + i * 95, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }
        );
      });
      PP.$$('.hero__name .scram').forEach((el, i) =>
        setTimeout(() => PP.scramble(el, el.dataset.text, 820), 220 + i * 150));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => boot(start));
  else boot(start);
})(window.PP);
