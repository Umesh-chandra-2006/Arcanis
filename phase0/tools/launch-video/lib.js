// Shared library for the content videos (videos/*.js). Everything is a pure function of time,
// like scene.js (the launch video, which predates this file and keeps its own copy).
window.LIB = (function () {
  const D = window.VIDEO_DATA;
  const SITE_URL = new URLSearchParams(location.search).get("url") || "arcanis.world";
  const W = 1080, H = 1920;
  const stage = document.getElementById("stage");
  const bg = document.getElementById("bg").getContext("2d");
  const fx = document.getElementById("fx").getContext("2d");

  // ---------- maths ----------
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const lerp = (a, b, p) => a + (b - a) * p;
  const eOutCubic = (x) => 1 - Math.pow(1 - x, 3);
  const eOutQuint = (x) => 1 - Math.pow(1 - x, 5);
  const eInCubic = (x) => x * x * x;
  const eInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const eOutBack = (x, s = 1.6) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
  const win = (t, a, b, fin = 0.25, fout = 0.25) => Math.min(seg(t, a, a + fin), 1 - seg(t, b - fout, b));
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- DOM ----------
  function el(tag, cls, html, parent = stage) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    parent.appendChild(e);
    return e;
  }
  function place(e, style) { Object.assign(e.style, style); return e; }
  function show(e, o, transform) {
    if (o <= 0.001) { e.style.display = "none"; return; }
    e.style.display = "";
    e.style.opacity = String(Math.min(1, o));
    if (transform != null) e.style.transform = transform;
  }
  let uid = 0;
  function art(svg) {
    const k = "l" + uid++;
    return svg
      .replace(/id="(bg|halo)"/g, (_, n) => `id="${n}_${k}"`)
      .replace(/url\(#(bg|halo)\)/g, (_, n) => `url(#${n}_${k})`)
      .replace("<svg ", '<svg preserveAspectRatio="xMidYMid slice" ');
  }

  // Masked word-by-word captions: "I TRIED TO *BREAK*|THIS GAME." (*gold*, | line break).
  function wordsHtml(markup) {
    return markup.split("|").map((line) => line.split(" ").map((w) => {
      const m = /^\*(.+)\*$/.exec(w);
      return `<span class="w"><span class="wi${m ? " g" : ""}">${m ? m[1] : w}</span></span>`;
    }).join(" ")).join("<br>");
  }
  function caption(markup, top, size, cls = "cap") {
    return place(el("div", `${cls} abs center-x`, wordsHtml(markup)), { top: top + "px", fontSize: size + "px" });
  }
  function words(e, t, a, b = 1e9, stagger = 0.075, dur = 0.7) {
    const ws = e._w || (e._w = [...e.querySelectorAll(".wi")]);
    const visible = t >= a - 0.01 && t <= b + ws.length * 0.03 + 0.5;
    e.style.display = visible ? "" : "none";
    if (!visible) return;
    e.style.opacity = "1";
    ws.forEach((w, i) => {
      const p = eOutQuint(seg(t, a + i * stagger, a + i * stagger + dur));
      const q = eInCubic(seg(t, b + i * 0.03, b + i * 0.03 + 0.4));
      w.style.transform = `translateY(${((1 - p) * 110 - q * 110).toFixed(2)}%)`;
      w.style.opacity = String(Math.min(1, p * 1.4) * (1 - q));
    });
  }
  function eyebrow(text, top) {
    return place(el("div", "abs center-x eyebrow", `<i></i><span>${text}</span><i></i>`), { top: top + "px" });
  }
  function eyebrowAt(e, t, a, b) {
    const o = win(t, a, b, 0.5, 0.35);
    show(e, o);
    if (o <= 0) return;
    const p = eOutQuint(seg(t, a, a + 0.9));
    e.querySelectorAll("i").forEach((i) => (i.style.transform = `scaleX(${p})`));
    e.querySelector("span").style.letterSpacing = `${lerp(0.7, 0.38, p)}em`;
  }

  // ---------- cards ----------
  function card(c, parent = stage) {
    const d = el("div", "card abs", null, parent);
    d.style.setProperty("--accent", c.accent);
    d.innerHTML = `<div class="in"><div class="art">${art(c.art)}</div><div class="name">${c.name}</div>
      <div class="orn"><i></i>&#9670;<i></i></div><div class="lore">&ldquo;${c.lore}&rdquo;</div>
      <div class="corner c1"></div><div class="corner c2"></div><div class="shine"></div></div>`;
    place(d, { left: "240px", top: "390px" });
    d._shine = d.querySelector(".shine");
    d._shine.style.transform = "translateX(-100%)";
    return d;
  }
  // The back of a card, for flips: same frame, the forge seal instead of a face.
  function cardBack() {
    const d = el("div", "card abs");
    d.style.setProperty("--accent", "#d8b25a");
    d.innerHTML = `<div class="in" style="display:flex;align-items:center;justify-content:center;background:radial-gradient(80% 60% at 50% 50%, #2a2032, #0b0a10)">
      <div style="width:440px;height:440px;opacity:.85">${sealSvg("b" + uid++)}</div></div>`;
    return place(d, { left: "240px", top: "390px" });
  }
  function shineAt(d, t, a, b) {
    d._shine.style.transform = `translateX(${lerp(-75, 75, eInOut(seg(t, a, b)))}%)`;
  }
  const STRAIN_STEPS = { Light: 1, Moderate: 2, Heavy: 3 };
  // The stats as the live detail view names them: Power, MP cost, Strain (a word, never a number).
  function strip(c) {
    const d = el("div", "strip abs");
    const on = STRAIN_STEPS[c.strain] || 2;
    d.innerHTML = `<div class="tags smallcaps">${c.tier} &middot; ${c.element} &middot; ${c.category} &middot; ${c.castType}</div>
      <div class="stats">
        <div class="stat"><div class="k smallcaps">Power</div><div class="v">${c.damageMin}&ndash;${c.damageMax}</div></div>
        <div class="stat"><div class="k smallcaps">MP cost</div><div class="v">${c.mpCost}</div></div>
        <div class="stat"><div class="k smallcaps">Strain</div><div class="v word">${c.strain}</div>
          <div class="bar">${[1, 2, 3].map((i) => `<b class="${i <= on ? "on" : ""}"></b>`).join("")}</div></div>
      </div>`;
    return place(d, { left: "160px", top: "1250px" });
  }
  // A compact Lab panel that types a prompt. Returns { el, at(t, start, end) }.
  function lab(prompt, chips, top = 560, fontSize = 62) {
    const d = el("div", "abs");
    d.id = "";
    d.className = "abs labx";
    place(d, { left: "110px", width: "860px", top: top + "px" });
    d.innerHTML = `<div class="head smallcaps"><span>The Lab</span><span style="color:#a49a86">New spell</span></div>
      <div class="row">${chips.map((c) => `<span class="chip smallcaps">${c}</span>`).join("")}</div>
      <div class="label smallcaps">Describe your spell</div>
      <div class="box italic" style="font-size:${fontSize}px;min-height:${fontSize * 4.6}px"><span class="ty"></span><span class="caret"></span></div>
      <div class="btn">RESEARCH SPELL</div>`;
    const ty = d.querySelector(".ty"), caret = d.querySelector(".caret"), btn = d.querySelector(".btn");
    return {
      el: d,
      at(t, a, b, press) {
        const n = Math.floor(clamp((t - a) / (b - a)) * prompt.length);
        ty.textContent = prompt.slice(0, n);
        caret.style.opacity = t < b + 0.05 || Math.floor(t * 2.2) % 2 === 0 ? "1" : "0";
        const pr = press != null && t >= press ? Math.exp(-(t - press) * 12) : 0;
        btn.style.transform = `scale(${1 - 0.06 * pr})`;
        btn.style.filter = `brightness(${1 + 1.2 * pr + (press != null && t > press ? 0.3 : 0)})`;
      },
    };
  }

  function sealSvg(k = "s") {
    const r = rng(7);
    const cx = 400, cy = 400;
    let runes = "";
    for (let i = 0; i < 44; i++) {
      const a = (i / 44) * 360;
      let p = "";
      const strokes = 2 + Math.floor(r() * 2);
      for (let s = 0; s < strokes; s++) {
        p += `M${(-8 + r() * 16).toFixed(1)} ${(-10 + r() * 20).toFixed(1)}L${(-8 + r() * 16).toFixed(1)} ${(-10 + r() * 20).toFixed(1)}`;
      }
      runes += `<path transform="rotate(${a} ${cx} ${cy}) translate(${cx} ${cy - 338})" d="${p}"/>`;
    }
    const tri = (rad, rot) => `<polygon points="${[0, 1, 2].map((q) => {
      const a = ((rot + q * 120 - 90) * Math.PI) / 180;
      return `${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`;
    }).join(" ")}"/>`;
    let ticks = "";
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * Math.PI * 2, l = i % 10 === 0 ? 16 : 7;
      ticks += `M${(cx + 300 * Math.cos(a)).toFixed(1)} ${(cy + 300 * Math.sin(a)).toFixed(1)}L${(cx + (300 - l) * Math.cos(a)).toFixed(1)} ${(cy + (300 - l) * Math.sin(a)).toFixed(1)}`;
    }
    return `<svg viewBox="0 0 800 800" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" fill="none" stroke-linecap="round">
      <defs><radialGradient id="core_${k}"><stop offset="0" stop-color="#fff4cf"/><stop offset=".25" stop-color="#e9c46e" stop-opacity=".7"/><stop offset="1" stop-color="#e9c46e" stop-opacity="0"/></radialGradient></defs>
      <circle class="sealGlow" cx="400" cy="400" r="160" fill="url(#core_${k})" stroke="none"/>
      <g class="sealOuter" stroke="#d8b25a"><circle cx="400" cy="400" r="372" stroke-width="2" stroke-opacity=".75"/>
        <circle cx="400" cy="400" r="306" stroke-width="1.5" stroke-opacity=".55"/><g stroke-width="2.4" stroke-opacity=".9">${runes}</g>
        <path d="${ticks}" stroke-width="1.6" stroke-opacity=".7"/></g>
      <g class="sealInner" stroke="#e8c879"><circle cx="400" cy="400" r="262" stroke-width="1.4" stroke-dasharray="3 9" stroke-opacity=".7"/>
        <g stroke-width="2.2" stroke-opacity=".85">${tri(240, 0)}${tri(240, 60)}</g><circle cx="400" cy="400" r="120" stroke-width="1.6" stroke-opacity=".6"/></g>
    </svg>`;
  }
  // A forge seal element: seal.at(t, start, end) spins it up and fades it out at end.
  function seal(top = 500, size = 800) {
    const d = place(el("div", "abs", sealSvg("f" + uid++)), { left: (W - size) / 2 + "px", top: top + "px", width: size + "px", height: size + "px" });
    const outer = d.querySelector(".sealOuter"), inner = d.querySelector(".sealInner"), glow = d.querySelector(".sealGlow");
    return {
      el: d,
      at(t, a, b, opts = {}) {
        const o = win(t, a, b + 0.15, 0.35, 0.2) * (opts.alpha ?? 1);
        const ft = Math.max(0, t - a);
        const spin = opts.slow ? 1 : 1 + ft;
        show(d, o, `scale(${opts.slow ? 1 : lerp(0.85, 1.06, eInOut(seg(t, a, b)))})`);
        if (o <= 0) return;
        outer.setAttribute("transform", `rotate(${(ft * 40 * spin).toFixed(2)} 400 400)`);
        inner.setAttribute("transform", `rotate(${(-ft * 55 * spin).toFixed(2)} 400 400)`);
        glow.setAttribute("r", String(opts.slow ? 0 : 120 + 140 * eInCubic(seg(t, a, b))));
      },
    };
  }

  // ---------- end card (logo, tagline, call to action, address) ----------
  function endCard(cta = "Describe yours.") {
    const back = seal(530, 800);
    const word = place(el("div", "abs center-x", "ARCANIS".split("").map((ch) => `<span>${ch}</span>`).join("")), {});
    word.id = "logoWord";
    const letters = [...word.querySelectorAll("span")];
    const rule = el("div", "abs");
    rule.id = "logoRule";
    const tag = el("div", "abs center-x italic", "Magic, written by you.");
    tag.id = "tagline";
    const ctaEl = place(el("div", "abs center-x cap", cta), { top: "1035px", fontSize: "40px", color: "#f3d98f" });
    const url = place(el("div", "abs", `<div>${SITE_URL}</div>`), { top: "1110px", left: "0", right: "0", display: "flex", justifyContent: "center" });
    url.id = "url";
    const foot = el("div", "abs center-x smallcaps", "Free in your browser");
    foot.id = "footer";
    return function at(t, a) {
      const on = t >= a - 0.05;
      back.at(t, a, 1e9, { slow: true, alpha: 0.22 * seg(t, a, a + 1.2) });
      back.el.style.display = on ? "" : "none";
      letters.forEach((s, i) => {
        const p = seg(t, a + 0.1 + i * 0.07, a + 0.7 + i * 0.07);
        const sh = Math.exp(-Math.pow(i - lerp(-2, 9, seg(t, a + 1.0, a + 2.2)), 2) / 1.2);
        s.style.opacity = String(eOutCubic(p));
        s.style.transform = `translateY(${(1 - eOutCubic(p)) * 40}px)`;
        s.style.filter = `blur(${(1 - p) * 10}px) brightness(${1 + 0.9 * sh}) drop-shadow(0 0 30px rgba(216,178,90,.45))`;
      });
      show(word, on ? 1 : 0);
      word.style.letterSpacing = `${lerp(0.3, 0.12, eOutCubic(seg(t, a, a + 1.6)))}em`;
      show(rule, seg(t, a + 0.8, a + 1.0), `scaleX(${eOutCubic(seg(t, a + 0.8, a + 1.6))})`);
      show(tag, seg(t, a + 1.0, a + 1.5), `translateY(${(1 - eOutCubic(seg(t, a + 1.0, a + 1.7))) * 24}px)`);
      show(ctaEl, seg(t, a + 1.4, a + 1.9), `translateY(${(1 - eOutCubic(seg(t, a + 1.4, a + 2.1))) * 20}px)`);
      show(url, seg(t, a + 1.7, a + 1.9), `scale(${eOutBack(seg(t, a + 1.7, a + 2.2), 2)})`);
      show(foot, seg(t, a + 2.1, a + 2.6));
    };
  }

  // ---------- canvases ----------
  function sprite(size, color) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d");
    const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gr.addColorStop(0, color(1));
    gr.addColorStop(0.25, color(0.55));
    gr.addColorStop(1, color(0));
    g.fillStyle = gr;
    g.fillRect(0, 0, size, size);
    return c;
  }
  const spriteCache = {};
  // Glow sprite in any "r,g,b" colour.
  const glow = (rgb) => spriteCache[rgb] || (spriteCache[rgb] = sprite(64, (a) => `rgba(${rgb},${a})`));
  const GOLD = glow("245,214,140"), WHITE = glow("255,248,230");
  function hexRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  }
  function drawSprite(g, spr, x, y, s, a) {
    if (a <= 0.003) return;
    g.globalAlpha = Math.min(1, a);
    g.drawImage(spr, x - s, y - s, s * 2, s * 2);
  }
  const motes = (() => { const r = rng(42); return Array.from({ length: 150 }, () => ({ x: r() * W, y: r() * H, v: 8 + r() * 30, s: 3 + r() * 10, tw: r() * 6.28, sp: 0.6 + r() * 2, drift: r() * 6.28 })); })();
  const bokeh = (() => { const r = rng(77); return Array.from({ length: 14 }, () => ({ x: r() * W, y: r() * H, v: 20 + r() * 40, s: 40 + r() * 70, ph: r() * 6.28 })); })();

  // Bright motion-graphic background. glow: centre warmth (about 0.4 to 1.4); dim: 0 to 1 darkens
  // for a drop; tint: optional "r,g,b" wash over the centre (an element's colour).
  function background(t, { glow: gl = 0.75, dim = 0, tint = null, tintAmount = 0 } = {}) {
    bg.globalCompositeOperation = "source-over";
    bg.globalAlpha = 1;
    const base = bg.createLinearGradient(0, 0, 0, H);
    base.addColorStop(0, "#120e16");
    base.addColorStop(0.5, "#0d0a12");
    base.addColorStop(1, "#08060b");
    bg.fillStyle = base;
    bg.fillRect(0, 0, W, H);
    const g0 = gl * (1 - 0.65 * dim);
    const gr = bg.createRadialGradient(540, 900, 0, 540, 900, 1250);
    gr.addColorStop(0, `rgba(150,108,44,${0.55 * g0})`);
    gr.addColorStop(0.45, `rgba(70,48,26,${0.42 * g0})`);
    gr.addColorStop(1, "rgba(0,0,0,0)");
    bg.fillStyle = gr;
    bg.fillRect(0, 0, W, H);
    const leak = 1 - 0.7 * dim;
    [[0.25 + 0.08 * Math.sin(t * 0.21), 0.18 + 0.05 * Math.cos(t * 0.17), 900, "220,160,80", 0.22],
     [0.78 + 0.07 * Math.cos(t * 0.19), 0.78 + 0.05 * Math.sin(t * 0.23), 1000, "120,80,200", 0.16]].forEach(([x, y, rad, c, a]) => {
      const g = bg.createRadialGradient(x * W, y * H, 0, x * W, y * H, rad);
      g.addColorStop(0, `rgba(${c},${a * leak})`);
      g.addColorStop(1, `rgba(${c},0)`);
      bg.fillStyle = g;
      bg.fillRect(0, 0, W, H);
    });
    if (tint && tintAmount > 0) {
      const g2 = bg.createRadialGradient(540, 860, 0, 540, 860, 850);
      g2.addColorStop(0, `rgba(${tint},${0.3 * tintAmount})`);
      g2.addColorStop(1, `rgba(${tint},0)`);
      bg.fillStyle = g2;
      bg.fillRect(0, 0, W, H);
    }
    bg.globalCompositeOperation = "lighter";
    const md = 1 - 0.75 * dim;
    for (const m of motes) {
      const y = (((m.y - t * m.v) % H) + H) % H;
      drawSprite(bg, GOLD, m.x + Math.sin(t * 0.4 + m.drift) * 20, y, m.s, (0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * m.sp + m.tw))) * md);
    }
    for (const b of bokeh) {
      const y = (((b.y - t * b.v) % (H + 400)) + H + 400) % (H + 400) - 200;
      drawSprite(bg, GOLD, b.x + Math.sin(t * 0.3 + b.ph) * 40, y, b.s, 0.1 * md * (0.6 + 0.4 * Math.sin(t + b.ph)));
    }
    bg.globalCompositeOperation = "source-over";
    const v = bg.createRadialGradient(540, 960, 500, 540, 960, 1250);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.5)");
    bg.fillStyle = v;
    bg.fillRect(0, 0, W, H);
  }

  // Particle burst at (cx, cy) starting at t0. Deterministic per seed.
  const bursts = {};
  function burst(t, t0, cx, cy, { n = 160, power = 1, seed = 11, rgb = "245,214,140", life = 1.6 } = {}) {
    const rt = t - t0;
    if (rt < 0 || rt > life + 0.5) return;
    const key = seed + ":" + n;
    const ps = bursts[key] || (bursts[key] = (() => {
      const r = rng(seed);
      return Array.from({ length: n }, () => {
        const a = r() * Math.PI * 2;
        return { dx: Math.cos(a), dy: Math.sin(a), v: 500 + r() * 1800, s: 5 + r() * 16, k: 2.4 + r() * 2.5, life: 0.6 + r(), w: r() < 0.3 };
      });
    })());
    const spr = glow(rgb);
    fx.globalCompositeOperation = "lighter";
    for (const p of ps) {
      const l = p.life * life / 1.6;
      if (rt > l) continue;
      const dist = (p.v * power * (1 - Math.exp(-p.k * rt))) / p.k;
      drawSprite(fx, p.w ? WHITE : spr, cx + p.dx * dist, cy + p.dy * dist + 100 * rt * rt, p.s * (1 - (rt / l) * 0.5), 1 - rt / l);
    }
  }
  function flash(t, t0, cx, cy, strength = 0.6, rgb = "255,246,220") {
    const rt = t - t0;
    if (rt < 0 || rt > 1.5) return;
    const fl = Math.exp(-rt * 4.5) * seg(rt, 0, 0.05) * strength;
    const g = fx.createRadialGradient(cx, cy, 0, cx, cy, 1300);
    g.addColorStop(0, `rgba(${rgb},${fl})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    fx.globalCompositeOperation = "lighter";
    fx.globalAlpha = 1;
    fx.fillStyle = g;
    fx.fillRect(0, 0, W, H);
  }
  function ring(t, t0, cx, cy, radius = 1500, rgb = "245,214,140") {
    const sp = seg(t - t0, 0, 0.8);
    if (t < t0 || sp >= 1) return;
    fx.globalCompositeOperation = "lighter";
    fx.globalAlpha = 1 - sp;
    fx.strokeStyle = `rgb(${rgb})`;
    fx.lineWidth = 30 * (1 - sp) + 2;
    fx.beginPath();
    fx.arc(cx, cy, 60 + radius * eOutCubic(sp), 0, Math.PI * 2);
    fx.stroke();
  }
  function fxClear() {
    fx.globalCompositeOperation = "source-over";
    fx.globalAlpha = 1;
    fx.clearRect(0, 0, W, H);
  }
  function fxEnd() {
    fx.globalCompositeOperation = "source-over";
    fx.globalAlpha = 1;
  }
  function ready(renderAt) {
    window.renderAt = renderAt;
    window.videoReady = document.fonts.ready.then(() => Promise.all([
      document.fonts.load('700 80px "Cinzel"'),
      document.fonts.load('italic 600 60px "Cormorant Garamond"'),
      document.fonts.load('600 20px "Inter"'),
      document.fonts.load('700 40px "Inter"'),
    ])).then(() => { renderAt(0); return true; });
  }

  return {
    D, W, H, stage, fx, clamp, seg, lerp, eOutCubic, eOutQuint, eInCubic, eInOut, eOutBack, win, rng,
    el, place, show, art, wordsHtml, caption, words, eyebrow, eyebrowAt, card, cardBack, shineAt, strip, lab, seal,
    endCard, background, burst, flash, ring, glow, hexRgb, drawSprite, fxClear, fxEnd, ready, GOLD, WHITE,
  };
})();
