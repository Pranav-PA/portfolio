/* ─────────────────────────────────────────────────────────────
   bg.js — WebGL atmosphere behind the hero.
   A slow fbm plume field in cyan/violet, warped gently by the
   pointer. Renders at 0.55× resolution because it is deliberately
   soft; falls back to a CSS-ish gradient painted on 2D canvas.
   ───────────────────────────────────────────────────────────── */
(function (PP) {
  'use strict';

  const VERT = `
    attribute vec2 p;
    void main(){ gl_Position = vec4(p, 0.0, 1.0); }
  `;

  const FRAG = `
    precision highp float;
    uniform vec2  uRes;
    uniform float uTime;
    uniform vec2  uMouse;

    float hash(vec2 p){
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }

    float fbm(vec2 p){
      float v = 0.0, a = 0.5;
      mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
      for (int i = 0; i < 5; i++){
        v += a * noise(p);
        p = rot * p * 2.02;
        a *= 0.5;
      }
      return v;
    }

    void main(){
      vec2 uv = gl_FragCoord.xy / uRes.xy;
      vec2 st = uv;
      st.x *= uRes.x / uRes.y;

      float t = uTime * 0.035;

      // domain-warped fbm: plumes that fold into themselves
      vec2 q = vec2(fbm(st * 1.6 + t), fbm(st * 1.6 + vec2(3.1, 1.7) - t));
      vec2 r = vec2(fbm(st * 1.8 + 3.0 * q + vec2(1.7, 9.2) + t * 1.4),
                    fbm(st * 1.8 + 3.0 * q + vec2(8.3, 2.8) - t * 1.1));
      float f = fbm(st * 1.9 + 3.4 * r);

      // pointer adds a soft local bloom
      vec2 m = uMouse; m.x *= uRes.x / uRes.y;
      float md = 1.0 - smoothstep(0.0, 0.62, distance(st, m));

      vec3 base   = vec3(0.023, 0.027, 0.043);
      vec3 cyan   = vec3(0.208, 0.878, 0.910);
      vec3 violet = vec3(0.545, 0.361, 0.965);

      vec3 col = base;
      col = mix(col, violet * 0.42, smoothstep(0.38, 0.95, f) * 0.55);
      col = mix(col, cyan   * 0.40, smoothstep(0.52, 1.05, f + r.x * 0.35) * 0.5);
      col += cyan * md * 0.055;

      // horizon glow low-left, where the name sits
      col += violet * 0.05 * smoothstep(0.85, 0.0, distance(uv, vec2(0.12, 0.28)));

      // faint moving scan bands — instrument-panel texture
      col += vec3(0.014, 0.02, 0.026) * sin(uv.y * uRes.y * 0.72 + uTime * 0.8) * 0.5;

      // vignette
      col *= 1.0 - 0.72 * pow(distance(uv, vec2(0.5)) * 1.3, 2.2);

      // dither to kill banding on dark gradients
      col += (hash(gl_FragCoord.xy + uTime) - 0.5) * 0.012;

      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }
  `;

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('[bg] shader:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  function fallback(canvas) {
    // No WebGL — paint a slow two-blob gradient in 2D instead.
    const { ctx } = PP.fitCanvas(canvas);
    let t = 0;
    PP.rafWhenVisible(canvas, () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      t += 0.004;
      ctx.fillStyle = '#06070b';
      ctx.fillRect(0, 0, w, h);
      const blobs = [
        [0.28 + Math.sin(t) * 0.08, 0.34 + Math.cos(t * 0.8) * 0.08, 'rgba(139,92,246,.20)'],
        [0.74 + Math.cos(t * 1.1) * 0.09, 0.62 + Math.sin(t * 0.7) * 0.09, 'rgba(53,224,232,.16)']
      ];
      for (const [bx, by, c] of blobs) {
        const g = ctx.createRadialGradient(bx * w, by * h, 0, bx * w, by * h, Math.max(w, h) * 0.55);
        g.addColorStop(0, c);
        g.addColorStop(1, 'rgba(6,7,11,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
    });
  }

  PP.initBG = function () {
    const canvas = PP.$('#bgGL');
    if (!canvas) return;

    let gl = null;
    try {
      gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, powerPreference: 'low-power' })
        || canvas.getContext('experimental-webgl');
    } catch (e) { gl = null; }

    if (!gl) { fallback(canvas); return; }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { fallback(canvas); return; }

    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { fallback(canvas); return; }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'uRes');
    const uTime = gl.getUniformLocation(prog, 'uTime');
    const uMouse = gl.getUniformLocation(prog, 'uMouse');

    const SCALE = PP.coarse ? 0.4 : 0.55;
    function resize() {
      const w = Math.max(1, Math.round(canvas.clientWidth * SCALE));
      const h = Math.max(1, Math.round(canvas.clientHeight * SCALE));
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
    }
    resize();
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener('resize', resize);

    let mx = 0.5, my = 0.5, tx = 0.5, ty = 0.5;
    window.addEventListener('pointermove', e => {
      tx = e.clientX / window.innerWidth;
      ty = 1 - e.clientY / window.innerHeight;
    }, { passive: true });

    // Reduced motion still gets the field — just frozen.
    let time = 0;
    PP.rafWhenVisible(canvas, dt => {
      if (!PP.reduced) time += dt * 0.016;
      mx = PP.lerp(mx, tx, 0.045);
      my = PP.lerp(my, ty, 0.045);
      gl.uniform1f(uTime, time);
      gl.uniform2f(uMouse, mx, my);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    });
  };
})(window.PP);
