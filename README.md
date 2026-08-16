# pranav-p-aradhya.github.io

An interactive portfolio built as a **distributed trace**.

The concept comes straight out of the work: I build LLM agent systems and I published
[Observix](https://pypi.org/project/observix/), a provider-agnostic observability library.
So the site borrows its own vocabulary — navigation is a LangGraph-style state machine,
the résumé renders as a Jaeger-style span waterfall, and the contact form is a shell.

## What's in it

| Section | What it actually is |
|---|---|
| **Root** | A live agent graph on canvas. Drag the nodes, click one to traverse. A WebGL fbm shader sits behind it. |
| **System prompt** | The bio, written as a system message, with derived attributes and an attention grid. |
| **Embedding space** | 39 skills as a force-directed constellation — spring physics, pairwise repulsion, draggable. Selecting a cluster zooms it to centre. |
| **The waterfall** | Education, projects and work laid out on a real month axis. Click any span for its attributes and events. |
| **Two things I built** | QPGen's two-pass generate→verify pipeline, animated. Observix's telemetry fan-out, with togglable sinks. |
| **End of trace** | A working terminal: `help`, `whoami`, `projects`, `observix`, `trace`, `neofetch`, `sudo hire pranav`. |

Plus a `⌘K` command palette, a boot sequence, a custom cursor, and a Konami code.

## Stack

Deliberately none. Hand-written HTML, CSS and vanilla JS — no framework, no build step,
no dependencies. The only network request beyond the site itself is Google Fonts.
Every visual is drawn with Canvas 2D, WebGL or SVG.

```
index.html
assets/
  css/main.css
  js/
    util.js       shared helpers, hidpi canvas, visibility-gated rAF
    data.js       ← all content lives here
    bg.js         WebGL atmosphere (2D fallback)
    hero.js       agent graph, telemetry HUD, attention grid
    skills.js     force-directed skill constellation
    trace.js      span waterfall
    work.js       QPGen pipeline + Observix fan-out
    terminal.js   the shell
    main.js       boot, cursor, rail, palette, wiring
```

To change any content — skills, spans, projects, commands — edit `assets/js/data.js`
and the copy in `index.html`. Nothing else needs to move.

## Running it locally

Needs a static server (the page is plain files, but `file://` blocks some behaviour):

```bash
npx serve -l 4321 .
```

Then open <http://localhost:4321>.

## Deploying to GitHub Pages

1. Create a repo named `<your-username>.github.io` (or any repo, for a project page).
2. Push these files to the default branch:

```bash
git init && git add -A && git commit -m "portfolio" && git branch -M main
```

3. Add the remote and push:

```bash
git remote add origin https://github.com/Pranav-PA/Pranav-PA.github.io.git && git push -u origin main
```

4. In the repo, go to **Settings → Pages** and set **Source: Deploy from a branch**,
   branch `main`, folder `/ (root)`.

`.nojekyll` is committed so GitHub serves the `assets/` directory untouched.

## Accessibility & performance notes

- `prefers-reduced-motion` disables the boot sequence, grain, scrambles and canvas easing.
- Every animation loop is gated on `IntersectionObserver` + `visibilitychange`, so
  off-screen and background-tab canvases cost nothing.
- The WebGL layer renders at 0.55× resolution and falls back to Canvas 2D.
- All section copy is real HTML — readable and indexable without JavaScript.
- Each interactive layer is initialised inside a try/catch, so one failure can't blank the page.

---

**Pranav P Aradhya** · Mysuru, India
[pranavparadhya1@gmail.com](mailto:pranavparadhya1@gmail.com) ·
[GitHub](https://github.com/Pranav-PA) ·
[LinkedIn](https://www.linkedin.com/in/pranav-p-aradhya/)
