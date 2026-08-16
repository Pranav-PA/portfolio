/* ─────────────────────────────────────────────────────────────
   skills.js — the embedding space.
   Every skill is a body: springs to its cluster, repels its
   neighbours, follows your finger and remembers where it lives.
   Selecting a cluster pulls it to the centre and pushes the rest
   out of frame — a crude but honest t-SNE zoom.
   ───────────────────────────────────────────────────────────── */
(function (PP) {
  'use strict';

  /* hand-picked semantic edges — the ones that are actually true */
  const LINKS = [
    ['Python', 'OpenTelemetry'], ['LangChain', 'LangGraph'], ['LangGraph', 'AgentScope'],
    ['OpenAI API', 'Tool Calling'], ['Tool Calling', 'ReAct Agents'], ['Prompt Eng.', 'OpenAI API'],
    ['OpenTelemetry', 'OTLP'], ['OTLP', 'Phoenix'], ['OTLP', 'Langfuse'], ['OTLP', 'MLflow'],
    ['Distributed Tracing', 'OpenTelemetry'], ['Distributed Tracing', 'TCP/IP'],
    ['React', 'Next.js'], ['Next.js', 'Supabase'], ['Supabase', 'PostgreSQL'],
    ['Next.js', 'Vercel'], ['Node.js', 'Express'], ['React', 'Tailwind CSS'],
    ['JavaScript', 'TypeScript'], ['JavaScript', 'React'], ['Python', 'LangChain'],
    ['Java', 'Data Structures'], ['DBMS', 'PostgreSQL'], ['DBMS', 'MongoDB'],
    ['Git / GitHub', 'GitLab CI/CD'], ['Docker', 'Kubernetes'], ['AWS', 'GitLab CI/CD'],
    ['AWS', 'Docker'], ['Cloud Computing', 'AWS'], ['OS Concepts', 'C'], ['Redis', 'Node.js']
  ];

  PP.initSkills = function () {
    const canvas = PP.$('#skills');
    const tip = PP.$('#skillTip');
    const readout = PP.$('#stackReadout');
    const chipWrap = PP.$('#chips');
    const shake = PP.$('#stackShake');
    if (!canvas) return;

    const clusters = PP.clusters.map((c, i) => ({ ...c, i, cx: 0, cy: 0, tx: 0, ty: 0, w: 0 }));
    const cMap = Object.fromEntries(clusters.map(c => [c.id, c]));

    const nodes = PP.skills.map(s => {
      const c = cMap[s.c] || clusters[0];
      return {
        name: s.n, note: s.note, cluster: c, color: c.color,
        r: 3.6 + s.w * 2.1, w: s.w,
        x: 0, y: 0, hx: 0, hy: 0, vx: 0, vy: 0,
        hot: 0, dim: 0, held: false, ai: 0, ao: 0, seed: Math.random() * 100
      };
    });
    const nMap = Object.fromEntries(nodes.map(n => [n.name, n]));

    // per-cluster ordering, used for the spiral layout
    clusters.forEach(c => { c.members = nodes.filter(n => n.cluster === c); });

    const links = LINKS
      .map(([a, b]) => ({ a: nMap[a], b: nMap[b] }))
      .filter(l => l.a && l.b);

    let W = 0, H = 0, focus = null;
    const { ctx } = PP.fitCanvas(canvas, (w, h) => { W = w; H = h; place(true); });

    /* ── layout ─────────────────────────────────────────────── */
    function place(snap) {
      const wide = W > 780;
      const rx = W * (wide ? 0.36 : 0.31);
      const ry = H * (wide ? 0.32 : 0.33);
      const spread = PP.clamp(Math.min(W / 1300, H / 470), 0.78, 1.45);

      clusters.forEach((c, i) => {
        const a = (i / clusters.length) * Math.PI * 2 - Math.PI / 2;
        if (focus === c.id) {
          c.tx = W / 2; c.ty = H / 2; c.w = 1;
        } else if (focus) {
          // shove unfocused clusters out past the edge
          c.tx = W / 2 + Math.cos(a) * rx * 2.15;
          c.ty = H / 2 + Math.sin(a) * ry * 2.15;
          c.w = 0;
        } else {
          c.tx = W / 2 + Math.cos(a) * rx;
          c.ty = H / 2 + Math.sin(a) * ry;
          c.w = 0.5;
        }
        if (snap) { c.cx = c.tx; c.cy = c.ty; }

        const zoom = focus === c.id ? 2.15 : 1;
        c.members.forEach((n, k) => {
          const ang = k * 2.39996 + c.i;
          const rad = (17 + 13.5 * Math.sqrt(k)) * spread * zoom;
          n.ox = Math.cos(ang) * rad;
          n.oy = Math.sin(ang) * rad * 0.86;
        });
      });

      nodes.forEach(n => {
        n.hx = n.cluster.cx + n.ox;
        n.hy = n.cluster.cy + n.oy;
        if (snap || !n.init) { n.x = n.hx; n.y = n.hy; n.init = true; }
      });
    }

    /* ── pointer ────────────────────────────────────────────── */
    let mx = -9999, my = -9999, hover = null, drag = null, moved = 0;
    const p2 = e => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    function pick(x, y) {
      let best = null, bd = Infinity;
      for (const n of nodes) {
        if (n.ao < 0.25) continue;
        const d = (n.x - x) ** 2 + (n.y - y) ** 2;
        const rr = (n.r + 14) ** 2;
        if (d < rr && d < bd) { bd = d; best = n; }
      }
      return best;
    }

    function showTip(n) {
      if (!tip) return;
      if (!n) { tip.classList.remove('is-on'); return; }
      tip.innerHTML =
        `<b></b><em></em><s></s>`;
      tip.querySelector('b').textContent = n.name;
      tip.querySelector('em').textContent = n.cluster.name;
      tip.querySelector('s').textContent = n.note;
      tip.style.left = n.x + 'px';
      tip.style.top = n.y - n.r - 6 + 'px';
      tip.style.borderColor = n.color;
      tip.classList.add('is-on');
    }

    canvas.addEventListener('pointermove', e => {
      const p = p2(e); mx = p.x; my = p.y;
      if (drag) {
        moved += 1;
        drag.x = p.x; drag.y = p.y; drag.vx = 0; drag.vy = 0;
        showTip(drag);
        return;
      }
      const h = pick(p.x, p.y);
      if (h !== hover) {
        hover = h;
        showTip(h);
        canvas.style.cursor = h ? 'grab' : 'default';
        if (readout) readout.textContent = h ? h.name.toLowerCase() + ' · ' + h.cluster.id : 'hover a node';
        if (PP.cursorHot) PP.cursorHot(!!h, h ? 'drag' : '');
      } else if (h) {
        showTip(h);
      }
    }, { passive: true });

    canvas.addEventListener('pointerleave', () => {
      mx = my = -9999; hover = null; showTip(null);
      if (readout) readout.textContent = 'hover a node';
      if (PP.cursorHot) PP.cursorHot(false);
    }, { passive: true });

    canvas.addEventListener('pointerdown', e => {
      const p = p2(e);
      const n = pick(p.x, p.y);
      if (n) {
        drag = n; n.held = true; moved = 0;
        canvas.setPointerCapture(e.pointerId);
        canvas.style.cursor = 'grabbing';
        e.preventDefault();
      }
    });
    window.addEventListener('pointerup', () => {
      if (drag) {
        drag.held = false;
        // fling it a little so the release feels physical
        drag.vx += PP.rand(-1.2, 1.2);
        drag.vy += PP.rand(-1.2, 1.2);
        drag = null;
        canvas.style.cursor = 'grab';
      }
    });

    /* ── chips ──────────────────────────────────────────────── */
    if (chipWrap) {
      clusters.forEach(c => {
        const b = document.createElement('button');
        b.className = 'chip';
        b.type = 'button';
        b.style.color = c.color;
        b.dataset.cluster = c.id;
        b.setAttribute('data-cursor', 'focus');
        b.innerHTML = `<i></i><span>${c.name}</span>`;
        b.addEventListener('click', () => setFocus(focus === c.id ? null : c.id));
        chipWrap.appendChild(b);
      });
    }
    function setFocus(id) {
      focus = id;
      PP.$$('.chip', chipWrap).forEach(el =>
        el.classList.toggle('is-on', el.dataset.cluster === id));
      if (readout) readout.textContent = id ? cMap[id].members.length + ' nodes in view' : 'hover a node';
      place(false);
    }
    PP.skillFocus = setFocus;

    if (shake) shake.addEventListener('click', () => {
      nodes.forEach(n => { n.vx += PP.rand(-9, 9); n.vy += PP.rand(-9, 9); });
    });

    /* ── frame ──────────────────────────────────────────────── */
    let t = 0;
    PP.rafWhenVisible(canvas, dt => {
      t += dt;
      ctx.clearRect(0, 0, W, H);

      // cluster centres ease toward target, then re-home the members
      let moving = false;
      clusters.forEach(c => {
        const nx = PP.lerp(c.cx, c.tx, 0.07 * dt);
        const ny = PP.lerp(c.cy, c.ty, 0.07 * dt);
        if (Math.abs(nx - c.cx) > 0.05 || Math.abs(ny - c.cy) > 0.05) moving = true;
        c.cx = nx; c.cy = ny;
      });
      nodes.forEach(n => { n.hx = n.cluster.cx + n.ox; n.hy = n.cluster.cy + n.oy; });

      /* --- forces --- */
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        const wanted = focus ? (a.cluster.id === focus ? 1 : 0.06) : 1;
        a.ao = PP.lerp(a.ao, wanted, 0.06 * dt);
        a.hot = PP.lerp(a.hot, hover === a || drag === a ? 1 : 0, 0.16 * dt);
        if (a.held) continue;

        // spring home
        a.vx += (a.hx - a.x) * 0.020 * dt;
        a.vy += (a.hy - a.y) * 0.020 * dt;

        // pairwise repulsion — keeps labels legible
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          let dx = a.x - b.x, dy = a.y - b.y;
          let d2 = dx * dx + dy * dy;
          if (d2 > 9500 || d2 < 0.01) continue;
          const d = Math.sqrt(d2);
          const f = (1 - d / 97) * 0.5 * dt;
          dx /= d; dy /= d;
          a.vx += dx * f; a.vy += dy * f;
          if (!b.held) { b.vx -= dx * f; b.vy -= dy * f; }
        }

        // pointer nudge
        const dx = a.x - mx, dy = a.y - my, d2 = dx * dx + dy * dy;
        if (d2 < 11000 && d2 > 1) {
          const d = Math.sqrt(d2);
          const f = (1 - d2 / 11000) * 0.9 * dt;
          a.vx += (dx / d) * f; a.vy += (dy / d) * f;
        }

        a.vx *= 0.885; a.vy *= 0.885;
        a.x += a.vx * dt; a.y += a.vy * dt;

        // soft walls
        const pad = 26;
        if (a.x < pad) a.vx += (pad - a.x) * 0.03;
        if (a.x > W - pad) a.vx -= (a.x - (W - pad)) * 0.03;
        if (a.y < pad) a.vy += (pad - a.y) * 0.03;
        if (a.y > H - pad) a.vy -= (a.y - (H - pad)) * 0.03;
      }

      /* --- cluster auras --- */
      clusters.forEach(c => {
        const vis = focus ? (c.id === focus ? 1 : 0.05) : 0.5;
        if (vis < 0.08) return;
        const rad = (focus === c.id ? 200 : 118) * Math.min(W / 1200 + 0.35, 1.2);
        const g = ctx.createRadialGradient(c.cx, c.cy, 0, c.cx, c.cy, rad);
        g.addColorStop(0, rgba(c.color, 0.13 * vis * 2));
        g.addColorStop(1, rgba(c.color, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(c.cx, c.cy, rad, 0, Math.PI * 2); ctx.fill();

        // cluster label
        ctx.font = '500 9.5px "JetBrains Mono", ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = 'rgba(6,7,11,.9)';
        ctx.strokeText(c.name.toUpperCase(), c.cx, c.cy - rad * 0.66);
        ctx.fillStyle = rgba(c.color, 0.62 * vis * 1.6);
        ctx.fillText(c.name.toUpperCase(), c.cx, c.cy - rad * 0.66);
      });

      /* --- links --- */
      ctx.lineWidth = 1;
      for (const l of links) {
        const vis = Math.min(l.a.ao, l.b.ao);
        if (vis < 0.04) continue;
        const lit = Math.max(l.a.hot, l.b.hot);
        const g = ctx.createLinearGradient(l.a.x, l.a.y, l.b.x, l.b.y);
        g.addColorStop(0, rgba(l.a.color, (0.22 + lit * 0.55) * vis));
        g.addColorStop(1, rgba(l.b.color, (0.22 + lit * 0.55) * vis));
        ctx.strokeStyle = g;
        ctx.lineWidth = 0.9 + lit * 1.2;
        ctx.beginPath();
        ctx.moveTo(l.a.x, l.a.y);
        ctx.lineTo(l.b.x, l.b.y);
        ctx.stroke();
      }

      /* --- nodes --- */
      for (const n of nodes) {
        if (n.ao < 0.02) continue;
        const breathe = PP.reduced ? 1 : 1 + Math.sin(t * 0.03 + n.seed) * 0.055;
        const r = n.r * breathe * (1 + n.hot * 0.45);
        const A = n.ao;

        // glow
        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 5.5);
        g.addColorStop(0, rgba(n.color, (0.36 + n.hot * 0.34) * A));
        g.addColorStop(1, rgba(n.color, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(n.x, n.y, r * 5.5, 0, Math.PI * 2); ctx.fill();

        // ring
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = rgba('#0a0c13', 0.92 * A);
        ctx.fill();
        ctx.strokeStyle = rgba(n.color, (0.92 + n.hot * 0.08) * A);
        ctx.lineWidth = 1.5 + n.hot * 0.9;
        ctx.stroke();

        // core
        ctx.beginPath(); ctx.arc(n.x, n.y, r * 0.42, 0, Math.PI * 2);
        ctx.fillStyle = rgba(n.color, A);
        ctx.shadowBlur = 9 + n.hot * 8; ctx.shadowColor = n.color;
        ctx.fill();
        ctx.shadowBlur = 0;

        if (n.hot > 0.35) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 7 + n.hot * 4, t * 0.03, t * 0.03 + Math.PI);
          ctx.strokeStyle = rgba(n.color, n.hot * 0.7 * A);
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // label — bigger nodes always labelled, small ones on demand
        const labelA = (n.w >= 2 || focus ? 0.88 : 0.5) + n.hot * 0.12;
        ctx.font = (n.hot > 0.5 ? '500 10.5px' : '400 9px') + ' "JetBrains Mono", ui-monospace, monospace';
        ctx.textAlign = 'center';
        // dark outline first, so labels stay readable where they crowd
        ctx.lineWidth = 3;
        ctx.strokeStyle = `rgba(6,7,11,${0.92 * A})`;
        ctx.strokeText(n.name, n.x, n.y + r + 13);
        ctx.fillStyle = rgba(n.hot > 0.5 ? n.color : '#dbe3f0', labelA * A);
        ctx.fillText(n.name, n.x, n.y + r + 13);
      }
      ctx.textAlign = 'start';

      if (moving && !PP.reduced) { /* keep easing */ }
    });

    function rgba(h, a) {
      const v = parseInt(h.slice(1), 16);
      return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${PP.clamp(a, 0, 1)})`;
    }
  };
})(window.PP);
