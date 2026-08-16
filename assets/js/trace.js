/* ─────────────────────────────────────────────────────────────
   trace.js — the waterfall.
   A Jaeger/Phoenix-style span view of four years. Bars are laid
   out on a real month axis; selecting one opens its attributes
   and events in the side panel.
   ───────────────────────────────────────────────────────────── */
(function (PP) {
  'use strict';

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  /* t = months since Aug 2023 */
  function stamp(t) {
    const total = 7 + Math.round(t);            // Aug = index 7
    return MONTHS[((total % 12) + 12) % 12] + ' ' + (2023 + Math.floor(total / 12));
  }
  function dur(m) {
    if (m < 12) return Math.round(m) + 'mo';
    const y = Math.floor(m / 12), r = Math.round(m % 12);
    return y + 'y' + (r ? ' ' + r + 'mo' : '');
  }

  PP.initTrace = function () {
    const wrap = PP.$('#spans');
    const axis = PP.$('#traceAxis');
    const main = PP.$('.traceMain');
    const nowEl = PP.$('#traceNow');
    const empty = PP.$('#spanEmpty');
    const body = PP.$('#spanBody');
    if (!wrap || !main) return;

    const T0 = PP.T0, T1 = PP.T1, SPAN = T1 - T0;
    const pct = t => ((t - T0) / SPAN) * 100;

    /* ── year axis ─────────────────────────────────────────── */
    PP.years.forEach(y => {
      const s = document.createElement('span');
      s.className = 'yr';
      s.style.left = pct(y.t) + '%';
      s.textContent = y.y;
      axis.appendChild(s);
    });
    main.style.setProperty('--gw', (12 / SPAN) * 100 + '%');

    /* ── rows ──────────────────────────────────────────────── */
    let selected = null;
    PP.spans.forEach((s, i) => {
      const row = document.createElement('div');
      row.className = 'span';
      row.setAttribute('role', 'listitem');
      row.tabIndex = 0;
      row.dataset.id = s.id;

      const indent = '│  '.repeat(Math.max(0, s.depth - 1)) + (s.depth ? '├─ ' : '');
      row.innerHTML =
        `<div class="span__label">
           <span class="depth">${indent}</span>
           <span class="nm">${s.name}</span>
         </div>
         <div class="span__track">
           <div class="span__bar${s.live ? ' is-live' : ''}" data-dur="${dur(s.d)}"></div>
         </div>`;

      const bar = row.querySelector('.span__bar');
      bar.style.left = pct(s.t) + '%';
      bar.style.width = Math.max((s.d / SPAN) * 100, 3) + '%';
      bar.style.background = s.color;
      bar.style.color = s.color;
      bar.style.transitionDelay = (i * 0.075) + 's';
      // pick readable text on the bar
      bar.style.setProperty('--barfg', '#04141a');

      row.addEventListener('click', () => select(s, row));
      row.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(s, row); }
      });
      row.addEventListener('mouseenter', () => PP.cursorHot && PP.cursorHot(true, 'expand'));
      row.addEventListener('mouseleave', () => PP.cursorHot && PP.cursorHot(false));
      wrap.appendChild(row);
    });

    function select(s, row) {
      PP.$$('.span', wrap).forEach(r => r.classList.remove('is-on'));
      row.classList.add('is-on');
      selected = s.id;
      renderDetail(s);
    }

    function renderDetail(s) {
      empty.hidden = true;
      body.hidden = false;
      const attrs = s.attrs.map(([k, v]) =>
        `<li><span>${k}</span><b>${v}</b></li>`).join('');
      const events = s.events.map(e => `<p class="sd__ev">${e}</p>`).join('');
      const link = s.link
        ? `<a class="sd__link" href="${s.link.href}" data-jump>${s.link.label} <span>→</span></a>` : '';

      body.innerHTML = `
        <span class="sd__kind" style="color:${s.kindColor};background:${s.kindColor}1a;border:1px solid ${s.kindColor}33">
          <i style="width:5px;height:5px;border-radius:50%;background:currentColor;display:block"></i>${s.kind}
        </span>
        <h3 class="sd__name">${s.title}</h3>
        <p class="sd__org">${s.org}</p>
        <ul class="sd__attrs">
          <li><span>start</span><b>${stamp(s.t)}</b></li>
          <li><span>duration</span><b>${dur(s.d)}${s.live ? ' · ongoing' : ''}</b></li>
          ${attrs}
        </ul>
        <p class="sd__evTitle">events</p>
        ${events}
        ${link}`;
      body.querySelectorAll('[data-jump]').forEach(a =>
        a.addEventListener('click', e => { e.preventDefault(); PP.scrollToId(a.getAttribute('href')); }));
    }

    /* ── align the axis, gridlines and "now" line to the bar column ── */
    function align() {
      const track = wrap.querySelector('.span__track');
      if (!track) return;
      axis.style.marginLeft = '0px';
      const a = axis.getBoundingClientRect();
      const t = track.getBoundingClientRect();
      const m = main.getBoundingClientRect();
      const off = t.left - a.left;
      // NOTE: never write --lbl here — the grid template reads it, so
      // feeding a measured value back would oscillate. --trackOff is
      // a separate, read-only-by-CSS alignment offset.
      if (off > 1) axis.style.marginLeft = off + 'px';
      main.style.setProperty('--trackOff', (t.left - m.left) + 'px');
      nowEl.style.left = (t.left - m.left) + (pct(PP.TNOW) / 100) * t.width + 'px';
    }
    align();
    if ('ResizeObserver' in window) new ResizeObserver(align).observe(main);
    window.addEventListener('resize', align);
    // fonts landing late can shift the label column
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(align);

    /* ── animate bars in, then auto-open the current role ───── */
    const io = new IntersectionObserver((es, o) => {
      es.forEach(e => {
        if (!e.isIntersecting) return;
        wrap.classList.add('is-in');
        o.unobserve(e.target);
        setTimeout(() => {
          if (selected) return;
          const s = PP.spans.find(x => x.id === 'mphasis');
          const row = wrap.querySelector('[data-id="mphasis"]');
          if (s && row) select(s, row);
        }, 900);
      });
    }, { threshold: 0.16 });
    io.observe(wrap);

    PP.selectSpan = id => {
      const s = PP.spans.find(x => x.id === id);
      const row = wrap.querySelector(`[data-id="${id}"]`);
      if (s && row) { select(s, row); row.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    };
  };
})(window.PP);
