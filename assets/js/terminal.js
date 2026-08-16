/* ─────────────────────────────────────────────────────────────
   terminal.js — a real shell, not a decoration.
   History, tab-completion with a ghost hint, and a handful of
   commands that actually tell you things.
   ───────────────────────────────────────────────────────────── */
(function (PP) {
  'use strict';

  const BANNER = [
' ██████╗ ██████╗  █████╗ ███╗   ██╗ █████╗ ██╗   ██╗',
' ██╔══██╗██╔══██╗██╔══██╗████╗  ██║██╔══██╗██║   ██║',
' ██████╔╝██████╔╝███████║██╔██╗ ██║███████║██║   ██║',
' ██╔═══╝ ██╔══██╗██╔══██║██║╚██╗██║██╔══██║╚██╗ ██╔╝',
' ██║     ██║  ██║██║  ██║██║ ╚████║██║  ██║ ╚████╔╝ ',
' ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝  ╚═══╝  '
  ];

  PP.initTerminal = function () {
    const term = PP.$('#term');
    const screen = PP.$('#termScreen');
    const input = PP.$('#termInput');
    const ghost = PP.$('#termGhost');
    const prompt = PP.$('.term__prompt');
    if (!screen || !input) return;

    const hist = [];
    let hi = -1;

    /* ── output helpers ─────────────────────────────────────── */
    function line(html, cls) {
      const p = document.createElement('p');
      if (cls) p.className = cls;
      p.innerHTML = html;
      screen.appendChild(p);
      screen.scrollTop = screen.scrollHeight;
      return p;
    }
    function lines(arr, cls, stagger) {
      if (!stagger || PP.reduced) { arr.forEach(l => line(l, cls)); return; }
      arr.forEach((l, i) => setTimeout(() => line(l, cls), i * 34));
    }
    const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

    /* ── commands ───────────────────────────────────────────── */
    const CMD = {
      help: {
        d: 'list every command',
        run: () => {
          line('');
          Object.keys(CMD).sort().forEach(k =>
            line(`  <span class="hl">${k.padEnd(12)}</span><span class="mu">${CMD[k].d}</span>`));
          line('');
          line('<span class="mu">tip: press <span class="am">tab</span> to complete, <span class="am">↑/↓</span> for history</span>');
        }
      },
      whoami: {
        d: 'identity + current status',
        run: () => lines([
          '<span class="hl">Pranav P Aradhya</span>',
          '<span class="mu">Information Science undergraduate · NIE Mysuru · 2023–2027</span>',
          '<span class="mu">AI Engineer Intern · Mphasis, Applied AI team · Apr 2026 → present</span>',
          '',
          'I build GenAI systems that <span class="vi">act</span> — LLM orchestration, tool calling,',
          'multi-agent workflows — and then make them <span class="vi">observable</span>.',
          '',
          '<span class="ok">status: open to full-time GenAI / Agentic AI Engineer roles</span>'
        ], null, true)
      },
      skills: {
        d: 'dump the stack, grouped',
        run: () => {
          line('');
          PP.clusters.forEach(c => {
            const list = PP.skills.filter(s => s.c === c.id).map(s => s.n).join(', ');
            line(`<span style="color:${c.color}">${c.name.padEnd(18)}</span><span class="mu">${list}</span>`);
          });
          line('');
          line('<span class="mu">run <span class="hl">open stack</span> to see them as a graph</span>');
        }
      },
      experience: {
        d: 'work history',
        run: () => lines([
          '<span class="hl">Mphasis</span> <span class="mu">— AI Engineer Intern, Applied AI</span>  <span class="am">Apr 2026 → present</span>',
          '  · development + testing lifecycle of GenAI applications',
          '  · LLM agent workflows with tool calling — LangChain, LangGraph',
          '  · contributed to migrating agent components to AgentScope',
          '  · GitLab CI/CD driving automated build/test/deploy on AWS'
        ], null, true)
      },
      projects: {
        d: 'what I have shipped',
        run: () => lines([
          '<span class="hl">observix</span> <span class="mu">· python · pypi · 2026</span>',
          '  provider-agnostic LLM observability. instrument once → phoenix,',
          '  langfuse, mlflow and datadog all get <span class="vi">native</span> telemetry.',
          '  live integration tests caught 2 real bugs before release.',
          '',
          '<span class="hl">qpgen</span> <span class="mu">· next.js · supabase · openai vision · 2026</span>',
          '  AI question-paper generator for teachers. two-pass pipeline:',
          '  draft, then independently re-solve and flag anything unconfirmed.',
          '',
          '<span class="mu">run <span class="hl">observix</span> or <span class="hl">qpgen</span> for detail</span>'
        ], null, true)
      },
      observix: {
        d: 'deep dive: the observability library',
        run: () => lines([
          '<span class="vi">┌ observix ────────────────────────────────┐</span>',
          '<span class="vi">│</span> pip install observix                     <span class="vi">│</span>',
          '<span class="vi">└──────────────────────────────────────────┘</span>',
          '',
          'the problem: every tracing backend has its own attribute',
          'vocabulary. instrumenting for one means re-instrumenting',
          'for the next.',
          '',
          'observix emits <span class="hl">native</span> telemetry to all of them at once —',
          'no lowest-common-denominator translation layer.',
          '',
          '  <span class="ok">✓</span> live integration suite vs running phoenix + mlflow',
          '  <span class="ok">✓</span> caught span→project misrouting in phoenix',
          '  <span class="ok">✓</span> caught a missing native cost field in mlflow',
          '  <span class="ok">✓</span> conformance test diffs attrs vs upstream otel/openinference',
          '  <span class="ok">✓</span> benchmarked at sub-microsecond overhead when unconfigured'
        ], null, true)
      },
      qpgen: {
        d: 'deep dive: the question paper generator',
        run: () => lines([
          '<span class="hl">qpgen</span> — chapter-scoped JEE / NEET / Board papers, with keys.',
          '',
          'drafting questions with an LLM is easy. <span class="am">trusting</span> them is not.',
          'so nothing reaches a teacher on a single pass:',
          '',
          '  01 ingest    <span class="mu">reference paper + diagram extraction</span>',
          '  02 draft     <span class="mu">vision model writes the paper</span>',
          '  03 re-solve  <span class="mu">second pass solves it cold, no key in context</span>',
          '  04 reconcile <span class="mu">disagreement → flagged for review</span>',
          '  05 export    <span class="mu">PDF paper + separate key on letterhead</span>',
          '',
          '<span class="mu">run <span class="hl">open work</span> to watch the pipeline execute</span>'
        ], null, true)
      },
      education: {
        d: 'degree + coursework',
        run: () => lines([
          '<span class="hl">B.E. Information Science and Engineering</span>',
          'The National Institute of Engineering, Mysuru · 2023 – 2027 (expected)',
          '',
          '<span class="mu">coursework: data structures · DBMS · object-oriented programming</span>',
          '<span class="mu">            computer networks · cloud computing · OS fundamentals</span>'
        ], null, true)
      },
      contact: {
        d: 'every way to reach me',
        run: () => lines([
          '  <span class="mu">email    </span><a href="mailto:pranavparadhya1@gmail.com">pranavparadhya1@gmail.com</a>',
          '  <span class="mu">github   </span><a href="https://github.com/Pranav-PA" target="_blank" rel="noopener">github.com/Pranav-PA</a>',
          '  <span class="mu">linkedin </span><a href="https://www.linkedin.com/in/pranav-p-aradhya/" target="_blank" rel="noopener">in/pranav-p-aradhya</a>',
          '  <span class="mu">phone    </span>+91 81472 38214',
          '  <span class="mu">location </span>Mysuru, Karnataka, India'
        ], null, true)
      },
      email:    { d: 'open a draft to me', run: () => { line('<span class="ok">opening mail client…</span>'); location.href = 'mailto:' + PP.me.email; } },
      github:   { d: 'open github profile', run: () => { line('<span class="ok">→ github.com/Pranav-PA</span>'); window.open(PP.me.github, '_blank', 'noopener'); } },
      linkedin: { d: 'open linkedin profile', run: () => { line('<span class="ok">→ in/pranav-p-aradhya</span>'); window.open(PP.me.linkedin, '_blank', 'noopener'); } },
      open: {
        d: 'jump to a section: open <id>',
        run: a => {
          const ids = ['hero', 'about', 'stack', 'trace', 'work', 'contact'];
          const id = (a[0] || '').toLowerCase();
          if (!ids.includes(id)) return line(`<span class="er">open: unknown section '${esc(a[0] || '')}'</span> <span class="mu">— try: ${ids.join(' | ')}</span>`);
          line(`<span class="ok">traversing → #${id}</span>`);
          setTimeout(() => PP.scrollToId(id), 260);
        }
      },
      trace: {
        d: 'print the span waterfall as text',
        run: () => {
          line('');
          PP.spans.forEach(s => {
            const w = 34;
            const a = Math.round((s.t / PP.T1) * w);
            const b = Math.max(1, Math.round((s.d / PP.T1) * w));
            const bar = ' '.repeat(a) + '█'.repeat(b);
            line(`<span class="mu">${s.name.padEnd(28)}</span><span style="color:${s.color}">${bar}</span>`);
          });
          line('');
          line('<span class="mu">2023 ────────────────────────────────── 2027</span>');
        }
      },
      neofetch: {
        d: 'system readout',
        run: () => {
          const art = ['   ◢██◣  ', '  ◢████◣ ', ' ◢██◤◥██◣', '◢██◤  ◥██', '◥██◣  ◢██', ' ◥██◣◢██◤'];
          const info = [
            '<span class="hl">pranav</span>@<span class="vi">aradhya</span>',
            '<span class="mu">─────────────────────────</span>',
            '<span class="hl">role</span>    AI Engineer Intern',
            '<span class="hl">org</span>     Mphasis · Applied AI',
            '<span class="hl">edu</span>     NIE Mysuru · ISE \'27',
            '<span class="hl">stack</span>   python · ts · otel',
            '<span class="hl">focus</span>   agents you can trace',
            '<span class="hl">uptime</span>  ' + Math.floor((Date.now() - new Date(2023, 7, 1)) / 864e5) + ' days'
          ];
          line('');
          for (let i = 0; i < Math.max(art.length, info.length); i++) {
            line(`<span class="hl">${art[i] || '         '}</span>  ${info[i] || ''}`);
          }
          line('');
        }
      },
      date:  { d: 'current time', run: () => line('<span class="mu">' + new Date().toString() + '</span>') },
      ls:    { d: 'list sections', run: () => line('<span class="hl">hero/  about/  stack/  trace/  work/  contact/</span>  <span class="mu">resume.pdf  README.md</span>') },
      echo:  { d: 'echo <text>', run: a => line(esc(a.join(' '))) },
      clear: { d: 'wipe the screen', run: () => { screen.innerHTML = ''; } },
      sudo:  { d: 'try it', run: a => {
        if (a.join(' ').includes('hire')) {
          line('<span class="ok">[sudo] password accepted.</span>');
          line('<span class="ok">✓ candidate acquired. check your inbox.</span>');
          setTimeout(() => { location.href = 'mailto:' + PP.me.email + '?subject=' + encodeURIComponent('Role for Pranav'); }, 700);
        } else {
          line('<span class="er">pranav is not in the sudoers file. this incident will be reported.</span>');
          line('<span class="mu">…try <span class="hl">sudo hire pranav</span></span>');
        }
      } },
      matrix: {
        d: 'you know what this does',
        run: () => {
          const chars = 'アイウエオカキクケコサシスセソ01アイ█▓▒░';
          let n = 0;
          const iv = setInterval(() => {
            let s = '';
            for (let i = 0; i < 54; i++) s += Math.random() < 0.6 ? chars[(Math.random() * chars.length) | 0] : ' ';
            line('<span class="ok">' + esc(s) + '</span>');
            if (++n > 16) { clearInterval(iv); line('<span class="mu">…there is no spoon. try <span class="hl">help</span>.</span>'); }
          }, 62);
        }
      },
      resume: {
        d: 'the résumé, condensed',
        run: () => {
          CMD.whoami.run();
          setTimeout(() => { line(''); CMD.experience.run(); }, 340);
          setTimeout(() => { line(''); CMD.projects.run(); }, 700);
          setTimeout(() => { line(''); CMD.education.run(); }, 1100);
        }
      }
    };
    CMD.exp = { d: 'alias for experience', run: () => CMD.experience.run() };
    CMD.about = { d: 'alias for whoami', run: () => CMD.whoami.run() };

    const NAMES = Object.keys(CMD);

    /* ── execution ──────────────────────────────────────────── */
    function exec(raw) {
      const str = raw.trim();
      line(esc(str), 'cmd');
      if (!str) return;
      hist.unshift(str); hi = -1;
      const [name, ...args] = str.split(/\s+/);
      const c = CMD[name.toLowerCase()];
      if (!c) {
        line(`<span class="er">zsh: command not found: ${esc(name)}</span>`);
        const near = NAMES.find(n => n.startsWith(name[0]));
        line(`<span class="mu">did you mean <span class="hl">${near || 'help'}</span>? type <span class="hl">help</span> for the list.</span>`);
        return;
      }
      c.run(args);
    }

    /* ── input handling ─────────────────────────────────────── */
    function updateGhost() {
      const v = input.value;
      if (!v || v.includes(' ')) { ghost.textContent = ''; return; }
      const m = NAMES.find(n => n.startsWith(v.toLowerCase()) && n !== v.toLowerCase());
      if (!m) { ghost.textContent = ''; return; }
      // pad so the ghost lines up under the real caret
      ghost.textContent = ' '.repeat(v.length) + m.slice(v.length);
      const r = input.getBoundingClientRect(), pr = ghost.parentElement.getBoundingClientRect();
      ghost.style.left = (r.left - pr.left) + 'px';
    }

    input.addEventListener('input', updateGhost);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        exec(input.value);
        input.value = ''; ghost.textContent = '';
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const v = input.value.toLowerCase();
        const m = NAMES.find(n => n.startsWith(v));
        if (m) { input.value = m; updateGhost(); }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (hi < hist.length - 1) { hi++; input.value = hist[hi]; updateGhost(); }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (hi > 0) { hi--; input.value = hist[hi]; }
        else { hi = -1; input.value = ''; }
        updateGhost();
      } else if (e.key === 'l' && e.ctrlKey) {
        e.preventDefault(); screen.innerHTML = '';
      }
    });

    term.addEventListener('click', e => {
      if (e.target.tagName !== 'A') input.focus();
    });
    input.addEventListener('focus', () => term.classList.add('is-focus'));
    input.addEventListener('blur', () => term.classList.remove('is-focus'));

    /* ── first paint ────────────────────────────────────────── */
    let booted = false;
    function boot() {
      if (booted) return; booted = true;
      lines(BANNER, 'art', true);
      setTimeout(() => {
        line('');
        line('<span class="mu">pranav-portfolio · zsh 5.9 · connected from ' + (Intl.DateTimeFormat().resolvedOptions().timeZone || 'earth') + '</span>');
        line('<span class="mu">last login: ' + new Date().toDateString() + '</span>');
        line('');
        line('type <span class="hl">help</span> to see what this thing does, or <span class="hl">sudo hire pranav</span> if you are in a hurry.');
        line('');
      }, BANNER.length * 34 + 120);
    }
    new IntersectionObserver((es, o) => {
      es.forEach(e => { if (e.isIntersecting) { boot(); o.unobserve(e.target); } });
    }, { threshold: 0.25 }).observe(term);

    PP.termRun = cmd => { boot(); exec(cmd); input.focus(); };
  };
})(window.PP);
