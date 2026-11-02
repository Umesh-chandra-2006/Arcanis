// Launch video scene. Everything on screen is a pure function of time: window.renderAt(t)
// draws the frame at t seconds, so the renderer can step frame by frame with no drift.
(function () {
  const TL = window.TL;
  const D = window.VIDEO_DATA;
  const SITE_URL = new URLSearchParams(location.search).get("url") || "arcanis.world";
  const W = 1080, H = 1920;

  // ---------- helpers ----------
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const lerp = (a, b, p) => a + (b - a) * p;
  const eOutCubic = (x) => 1 - Math.pow(1 - x, 3);
  const eInCubic = (x) => x * x * x;
  const eInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const eOutExpo = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
  const eOutQuint = (x) => 1 - Math.pow(1 - x, 5);
  const eOutBack = (x, s = 1.6) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
  // Opacity window: fades in over fin from a, fades out over fout ending at b.
  const win = (t, a, b, fin = 0.25, fout = 0.25) => Math.min(seg(t, a, a + fin), 1 - seg(t, b - fout, b));
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }
  const stage = document.getElementById("stage");
  function el(tag, cls, html, parent = stage) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    parent.appendChild(e);
    return e;
  }
  function show(e, o, transform) {
    if (o <= 0.001) { e.style.display = "none"; return; }
    e.style.display = "";
    e.style.opacity = String(Math.min(1, o));
    if (transform != null) e.style.transform = transform;
  }
  let uid = 0;
  function art(svg) {
    const k = "a" + uid++;
    return svg
      .replace(/id="(bg|halo)"/g, (_, n) => `id="${n}_${k}"`)
      .replace(/url\(#(bg|halo)\)/g, (_, n) => `url(#${n}_${k})`)
      .replace("<svg ", '<svg preserveAspectRatio="xMidYMid slice" ');
  }

  // Motion-graphic captions: "I TRIED TO *BREAK*|THIS GAME." gives one masked span per word,
  // *word* in gold, | a line break. words() slides them up in sequence and out again.
  function wordsHtml(markup) {
    return markup.split("|").map((line) => line.split(" ").map((w) => {
      const m = /^\*(.+)\*$/.exec(w);
      return `<span class="w"><span class="wi${m ? " g" : ""}">${m ? m[1] : w}</span></span>`;
    }).join(" ")).join("<br>");
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
  // Small section label with lines that draw in from the centre.
  function eyebrow(text, top) {
    const e = el("div", "abs center-x eyebrow", `<i></i><span>${text}</span><i></i>`);
    e.style.top = top + "px";
    return e;
  }
  function eyebrowAt(e, t, a, b) {
    const o = win(t, a, b, 0.5, 0.35);
    show(e, o);
    if (o <= 0) return;
    const p = eOutQuint(seg(t, a, a + 0.9));
    e.querySelectorAll("i").forEach((i) => (i.style.transform = `scaleX(${p})`));
    e.querySelector("span").style.letterSpacing = `${lerp(0.7, 0.38, p)}em`;
  }

  // ---------- builders ----------
  function cardEl(c, parent = stage) {
    const d = el("div", "card abs", null, parent);
    d.style.setProperty("--accent", c.accent);
    d.innerHTML = `<div class="in"><div class="art">${art(c.art)}</div><div class="name">${c.name}</div>
      <div class="orn"><i></i>&#9670;<i></i></div><div class="lore">&ldquo;${c.lore}&rdquo;</div>
      <div class="corner c1"></div><div class="corner c2"></div><div class="shine"></div></div>`;
    return d;
  }
  const STRAIN_STEPS = { Light: 1, Moderate: 2, Heavy: 3 };
  function stripEl(c) {
    const d = el("div", "strip abs");
    const on = STRAIN_STEPS[c.strain] || 2;
    d.innerHTML = `<div class="tags smallcaps">${c.tier} &middot; ${c.element} &middot; ${c.category} &middot; ${c.castType}</div>
      <div class="stats">
        <div class="stat"><div class="k smallcaps">Power</div><div class="v">${c.damageMin}&ndash;${c.damageMax}</div></div>
        <div class="stat"><div class="k smallcaps">MP cost</div><div class="v">${c.mpCost}</div></div>
        <div class="stat"><div class="k smallcaps">Strain</div><div class="v word">${c.strain}</div>
          <div class="bar">${[1, 2, 3].map((i) => `<b class="${i <= on ? "on" : ""}"></b>`).join("")}</div></div>
      </div>`;
    return d;
  }
  function sealSvg() {
    const r = rng(7);
    const cx = 400, cy = 400;
    let runes = "";
    const N = 44;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * 360;
      let p = "";
      const strokes = 2 + Math.floor(r() * 2);
      for (let s = 0; s < strokes; s++) {
        const x1 = -8 + r() * 16, y1 = -10 + r() * 20, x2 = -8 + r() * 16, y2 = -10 + r() * 20;
        p += `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`;
      }
      runes += `<path transform="rotate(${a} ${cx} ${cy}) translate(${cx} ${cy - 338})" d="${p}"/>`;
    }
    const tri = (rad, rot) => {
      const pts = [0, 1, 2].map((k) => {
        const a = ((rot + k * 120 - 90) * Math.PI) / 180;
        return `${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`;
      });
      return `<polygon points="${pts.join(" ")}"/>`;
    };
    let ticks = "";
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * Math.PI * 2, l = i % 10 === 0 ? 16 : 7;
      ticks += `M${(cx + 300 * Math.cos(a)).toFixed(1)} ${(cy + 300 * Math.sin(a)).toFixed(1)}L${(cx + (300 - l) * Math.cos(a)).toFixed(1)} ${(cy + (300 - l) * Math.sin(a)).toFixed(1)}`;
    }
    return `<svg viewBox="0 0 800 800" width="800" height="800" xmlns="http://www.w3.org/2000/svg" fill="none" stroke-linecap="round">
      <defs><radialGradient id="sealCore"><stop offset="0" stop-color="#fff4cf" stop-opacity="1"/><stop offset=".25" stop-color="#e9c46e" stop-opacity=".7"/><stop offset="1" stop-color="#e9c46e" stop-opacity="0"/></radialGradient></defs>
      <circle id="sealGlow" cx="400" cy="400" r="200" fill="url(#sealCore)" stroke="none"/>
      <g id="sealOuter" stroke="#d8b25a">
        <circle cx="400" cy="400" r="372" stroke-width="2" stroke-opacity=".75"/>
        <circle cx="400" cy="400" r="306" stroke-width="1.5" stroke-opacity=".55"/>
        <g stroke-width="2.4" stroke-opacity=".9">${runes}</g>
        <path d="${ticks}" stroke-width="1.6" stroke-opacity=".7"/>
      </g>
      <g id="sealInner" stroke="#e8c879">
        <circle cx="400" cy="400" r="262" stroke-width="1.4" stroke-dasharray="3 9" stroke-opacity=".7"/>
        <g stroke-width="2.2" stroke-opacity=".85">${tri(240, 0)}${tri(240, 60)}</g>
        <circle cx="400" cy="400" r="120" stroke-width="1.6" stroke-opacity=".6"/>
      </g>
    </svg>`;
  }

  // ---------- build DOM ----------
  const [P1, P2, P3, P4] = D.cards;

  const capHook = el("div", "cap abs center-x", wordsHtml("I TRIED TO *BREAK*|THIS GAME."));
  const ebDescribe = eyebrow("I &middot; Describe", 500);
  const ebForge = eyebrow("II &middot; Forge", 330);
  Object.assign(capHook.style, { top: "250px", fontSize: "82px" });

  const lab = el("div", "abs", null);
  lab.id = "lab";
  lab.innerHTML = `<div class="head smallcaps"><span>The Lab</span><span style="color:#a49a86">New spell</span></div>
    <div class="row"><span class="chip smallcaps">&#9679; Void</span><span class="chip smallcaps">Attack</span></div>
    <div class="label smallcaps">Describe your spell</div>
    <div class="box italic"><span id="typed"></span><span class="caret" id="caret"></span></div>
    <div class="btn" id="btn">FORGE SPELL</div>`;
  const typed = lab.querySelector("#typed"), caret = lab.querySelector("#caret"), btn = lab.querySelector("#btn");

  const seal = el("div", "abs", sealSvg());
  seal.id = "seal";
  const sealOuter = seal.querySelector("#sealOuter"), sealInner = seal.querySelector("#sealInner"), sealGlow = seal.querySelector("#sealGlow");
  const status = ["Reading your words", "Checking balance", "&#10003; Verified"].map((s) => {
    const e = el("div", "abs center-x smallcaps", s);
    e.id = ""; e.style.top = "1360px"; e.style.fontSize = "28px"; e.style.color = "#f3d98f";
    return e;
  });

  const card1 = cardEl(P1);
  Object.assign(card1.style, { left: "240px", top: "390px" });
  const strip1 = stripEl(P1);
  Object.assign(strip1.style, { left: "160px", top: "1250px" });
  const capA = el("div", "cap abs center-x", wordsHtml("IT MADE MY SPELL."));
  Object.assign(capA.style, { top: "205px", fontSize: "58px" });
  const capB = el("div", "cap abs center-x", wordsHtml("THEN IT MADE IT *FAIR.*"));
  Object.assign(capB.style, { top: "285px", fontSize: "70px" });
  const loreBig = el("div", "abs center-x italic", `&ldquo;${P1.lore}&rdquo;`);
  loreBig.id = "loreBig";

  const capMid = el("div", "cap abs center-x", wordsHtml("ANYTHING YOU|CAN *DESCRIBE.*"));
  Object.assign(capMid.style, { top: "820px", fontSize: "92px", transformOrigin: "540px 0px" });

  const mCards = [P2, P3, P4].map((c) => {
    const card = cardEl(c);
    Object.assign(card.style, { left: "240px", top: "540px" });
    const prompt = el("div", "abs center-x italic mprompt", "");
    const info = el("div", "abs center-x smallcaps", `${c.tier} &middot; ${c.element} &middot; Power ${c.damageMin}&ndash;${c.damageMax} &middot; Strain ${c.strain}`);
    Object.assign(info.style, { top: "1385px", fontSize: "22px", color: "#d8b25a" });
    return { c, card, prompt, info };
  });

  const fan = [P1, P2, P3, P4].map((c) => cardEl(c));
  const FAN = [
    { x: -255, y: 70, r: -16 },
    { x: -88, y: 10, r: -5.5 },
    { x: 88, y: 10, r: 5.5 },
    { x: 255, y: 70, r: 16 },
  ];
  fan.forEach((f) => { Object.assign(f.style, { left: "240px", top: "560px" }); f.querySelector(".shine").style.transform = "translateX(-100%)"; });
  const fanLines = [
    "EVERY SPELL *CLASSIFIED.*",
    "EVERY SPELL *BALANCED.*",
    "NO TWO ALIKE.",
  ].map((h, i) => {
    const e = el("div", "cap abs center-x", wordsHtml(h));
    Object.assign(e.style, { top: `${215 + i * 82}px`, fontSize: "60px" });
    return e;
  });
  const chips = [P1, P2, P3, P4].map((c, i) => {
    const e = el("div", "abs smallcaps", c.element);
    Object.assign(e.style, {
      left: `${150 + i * 200}px`, top: "1430px", width: "180px", textAlign: "center", fontSize: "22px", padding: "12px 0",
      borderRadius: "999px", border: `1.5px solid ${c.accent}`, color: c.accent, background: "rgba(0,0,0,.5)",
    });
    return e;
  });

  const codexCapA = el("div", "cap abs center-x", wordsHtml("PUT YOURS IN|THE *CODEX.*"));
  const ebShare = eyebrow("III &middot; Share", 150);
  Object.assign(codexCapA.style, { top: "215px", fontSize: "66px" });
  const codexCapB = el("div", "abs center-x italic", "Vote for the best.");
  Object.assign(codexCapB.style, { top: "380px", fontSize: "56px", color: "#efe6d2" });
  const codex = el("div", "abs");
  codex.id = "codex";
  const grid = el("div", "", null, codex);
  grid.id = "codexGrid";
  const wall = [...D.extra, P2, P3, P4, P1].slice(0, 12);
  const VOTES = [12, 7, 21, 9, 33, 15, 4, 18, 26, 11, 8, 14];
  const HOT = 4;
  const minis = wall.map((c, i) => {
    const m = el("div", "mini" + (i === HOT ? " hot" : ""), `<div class="in"><div class="art">${art(c.art)}</div><div class="nm">${c.name}</div>
      <div class="vote"><span class="arr">&#9650;</span><span class="n">${VOTES[i]}</span></div></div>`, grid);
    return m;
  });
  const hotN = minis[HOT].querySelector(".n"), hotArr = minis[HOT].querySelector(".arr");

  const sil = el("div", "abs", `<div class="q">?</div>`);
  sil.id = "silhouette";
  const dropA = el("div", "cap abs center-x", wordsHtml("BATTLES ARE *COMING.*"));
  Object.assign(dropA.style, { top: "1250px", fontSize: "66px" });
  const dropB = el("div", "abs center-x italic", "Your spellbook starts now.");
  Object.assign(dropB.style, { top: "1345px", fontSize: "66px", color: "#efe6d2" });

  const logoWord = el("div", "abs center-x", "ARCANIS".split("").map((ch) => `<span>${ch}</span>`).join(""));
  logoWord.id = "logoWord";
  const letters = [...logoWord.querySelectorAll("span")];
  const logoRule = el("div", "abs");
  logoRule.id = "logoRule";
  const tagline = el("div", "abs center-x italic", "Magic, written by you.");
  tagline.id = "tagline";
  const urlEl = el("div", "abs", `<div>${SITE_URL}</div>`);
  urlEl.id = "url";
  const footer = el("div", "abs center-x smallcaps", "Free in your browser &middot; Your first spells are on us");
  footer.id = "footer";

  // ---------- canvases ----------
  const bg = document.getElementById("bg").getContext("2d");
  const fx = document.getElementById("fx").getContext("2d");
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
  const GOLD = sprite(64, (a) => `rgba(245,214,140,${a})`);
  const WHITE = sprite(64, (a) => `rgba(255,248,230,${a})`);
  const VOIDC = sprite(64, (a) => `rgba(190,150,255,${a})`);
  const noise = [0, 1, 2, 3].map((k) => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d");
    const img = g.createImageData(256, 256);
    const r = rng(100 + k);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(r() * 255);
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  });

  const motes = (() => {
    const r = rng(42);
    return Array.from({ length: 150 }, () => ({ x: r() * W, y: r() * H, v: 8 + r() * 30, s: 3 + r() * 10, tw: r() * 6.28, sp: 0.6 + r() * 2, drift: r() * 6.28 }));
  })();

  // Dissolve particles: from the prompt box to the seal centre.
  const SEAL_C = { x: 540, y: 900 };
  const dis = (() => {
    const r = rng(9);
    return Array.from({ length: 520 }, () => ({
      x: 170 + r() * 740, y: 790 + r() * 400, d: r() * 0.25, sw: (r() - 0.5) * 520, s: 6 + r() * 16, w: r() < 0.3,
    }));
  })();
  const burst = (() => {
    const r = rng(11);
    return Array.from({ length: 260 }, () => {
      const a = r() * Math.PI * 2, v = 600 + r() * 2200;
      return { dx: Math.cos(a), dy: Math.sin(a), v, s: 5 + r() * 18, k: 2.4 + r() * 2.5, life: 0.9 + r() * 1.2, w: r() < 0.35 };
    });
  })();
  const orbit = (() => {
    const r = rng(13);
    return Array.from({ length: 140 }, () => ({ a: r() * 6.28, r0: 260 + r() * 260, sp: 1.5 + r() * 3, s: 4 + r() * 12, ph: r() }));
  })();
  const embers = (() => {
    const r = rng(21);
    return Array.from({ length: 90 }, () => ({ x: 140 + r() * 800, v: 60 + r() * 160, s: 4 + r() * 12, ph: r() * 6.28, t0: r() * 4 }));
  })();

  const bokeh = (() => {
    const r = rng(77);
    return Array.from({ length: 14 }, () => ({ x: r() * W, y: r() * H, v: 20 + r() * 40, s: 40 + r() * 70, ph: r() * 6.28 }));
  })();

  function drawSprite(g, spr, x, y, s, a) {
    if (a <= 0.003) return;
    g.globalAlpha = Math.min(1, a);
    g.drawImage(spr, x - s, y - s, s * 2, s * 2);
  }

  function drawBackground(t) {
    bg.globalCompositeOperation = "source-over";
    bg.globalAlpha = 1;
    const base = bg.createLinearGradient(0, 0, 0, H);
    base.addColorStop(0, "#120e16");
    base.addColorStop(0.5, "#0d0a12");
    base.addColorStop(1, "#08060b");
    bg.fillStyle = base;
    bg.fillRect(0, 0, W, H);
    // warm centre glow; brighter on the reveal and the logo, dimmed for the drop
    let glow = 0.75;
    glow += 0.35 * win(t, TL.forge[0], TL.lore[1], 0.6, 0.6);
    glow -= 0.5 * win(t, TL.drop, TL.logo, 0.3, 0.5);
    glow += 0.3 * seg(t, TL.logo, TL.logo + 1.5);
    const gr = bg.createRadialGradient(540, 900, 0, 540, 900, 1250);
    gr.addColorStop(0, `rgba(150,108,44,${0.55 * glow})`);
    gr.addColorStop(0.45, `rgba(70,48,26,${0.42 * glow})`);
    gr.addColorStop(1, "rgba(0,0,0,0)");
    bg.fillStyle = gr;
    bg.fillRect(0, 0, W, H);
    // slow drifting light leaks, warm top left and violet bottom right
    const leak = 1 - 0.7 * win(t, TL.drop, TL.logo, 0.3, 0.5);
    [[0.25 + 0.08 * Math.sin(t * 0.21), 0.18 + 0.05 * Math.cos(t * 0.17), 900, "220,160,80", 0.22],
     [0.78 + 0.07 * Math.cos(t * 0.19), 0.78 + 0.05 * Math.sin(t * 0.23), 1000, "120,80,200", 0.16]].forEach(([x, y, rad, c, a]) => {
      const g = bg.createRadialGradient(x * W, y * H, 0, x * W, y * H, rad);
      g.addColorStop(0, `rgba(${c},${a * leak})`);
      g.addColorStop(1, `rgba(${c},0)`);
      bg.fillStyle = g;
      bg.fillRect(0, 0, W, H);
    });
    // a cool counter-glow behind the Void card
    const cool = win(t, TL.reveal - 0.1, TL.whip + 0.3, 0.2, 0.4);
    if (cool > 0) {
      const g2 = bg.createRadialGradient(540, 820, 0, 540, 820, 800);
      g2.addColorStop(0, `rgba(110,70,190,${0.28 * cool})`);
      g2.addColorStop(1, "rgba(0,0,0,0)");
      bg.fillStyle = g2;
      bg.fillRect(0, 0, W, H);
    }
    // motes
    bg.globalCompositeOperation = "lighter";
    const dim = 1 - 0.75 * win(t, TL.drop, TL.logo, 0.2, 0.3);
    for (const m of motes) {
      const y = (((m.y - t * m.v) % H) + H) % H;
      const x = m.x + Math.sin(t * 0.4 + m.drift) * 20;
      const a = (0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * m.sp + m.tw))) * dim;
      drawSprite(bg, GOLD, x, y, m.s, a);
    }
    for (const b of bokeh) {
      const y = (((b.y - t * b.v) % (H + 400)) + H + 400) % (H + 400) - 200;
      drawSprite(bg, GOLD, b.x + Math.sin(t * 0.3 + b.ph) * 40, y, b.s, 0.1 * dim * (0.6 + 0.4 * Math.sin(t + b.ph)));
    }
    bg.globalCompositeOperation = "source-over";
    // vignette
    const v = bg.createRadialGradient(540, 960, 500, 540, 960, 1250);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.5)");
    bg.globalAlpha = 1;
    bg.fillStyle = v;
    bg.fillRect(0, 0, W, H);
  }

  function drawFx(t, frame) {
    fx.clearRect(0, 0, W, H);
    fx.globalCompositeOperation = "lighter";
    // hook slam flash
    const f0 = 1 - seg(t, 0, 0.3);
    if (false) { fx.fillStyle = "#fff0c8"; fx.fillRect(0, 0, W, H); }
    // dissolve
    const [d0, d1] = TL.dissolve;
    if (t > d0 && t < d1 + 0.4) {
      for (const p of dis) {
        const q = seg(t, d0 + p.d, d1 + p.d * 0.6);
        if (q <= 0 || q >= 1) continue;
        const e = eInOut(q);
        const x = lerp(p.x, SEAL_C.x, e) + Math.sin(e * Math.PI) * p.sw * 0.6;
        const y = lerp(p.y, SEAL_C.y, e) - Math.sin(e * Math.PI) * 120;
        drawSprite(fx, p.w ? WHITE : GOLD, x, y, p.s * (1 - 0.6 * e), 0.9 * (1 - Math.pow(q, 4)));
      }
    }
    // orbiting forge sparks
    const fo = win(t, TL.forge[0], TL.reveal, 0.4, 0.05);
    if (fo > 0) {
      const tt = t - TL.forge[0];
      const shrink = eInCubic(seg(t, TL.forge[0], TL.reveal));
      for (const o of orbit) {
        const a = o.a + tt * o.sp * (1 + 2.5 * shrink);
        const r = o.r0 * (1 - 0.7 * shrink);
        drawSprite(fx, GOLD, SEAL_C.x + Math.cos(a) * r, SEAL_C.y + Math.sin(a) * r * 0.98, o.s, fo * (0.4 + 0.6 * Math.abs(Math.sin(tt * 3 + o.ph * 6))));
      }
    }
    // reveal: flash, shockwave, burst
    const rt = t - TL.reveal;
    if (rt >= 0 && rt < 2.4) {
      const fl = Math.exp(-rt * 4.5) * seg(rt, 0, 0.05);
      const g = fx.createRadialGradient(540, 820, 0, 540, 820, 1300);
      g.addColorStop(0, `rgba(255,246,220,${0.7 * fl})`);
      g.addColorStop(0.4, `rgba(220,180,255,${0.35 * fl})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      fx.globalAlpha = 1;
      fx.fillStyle = g;
      fx.fillRect(0, 0, W, H);
      const sp = seg(rt, 0, 0.75);
      if (sp < 1) {
        fx.globalAlpha = 1 - sp;
        fx.strokeStyle = "rgba(245,214,140,1)";
        fx.lineWidth = 36 * (1 - sp) + 2;
        fx.beginPath();
        fx.arc(540, 820, 60 + 1500 * eOutCubic(sp), 0, Math.PI * 2);
        fx.stroke();
        fx.globalAlpha = 0.6 * (1 - sp);
        fx.lineWidth = 10 * (1 - sp) + 1;
        fx.beginPath();
        fx.arc(540, 820, 40 + 1000 * eOutCubic(seg(rt, 0.06, 0.9)), 0, Math.PI * 2);
        fx.stroke();
      }
      for (const b of burst) {
        if (rt > b.life) continue;
        const dist = (b.v * (1 - Math.exp(-b.k * rt))) / b.k;
        const x = 540 + b.dx * dist, y = 820 + b.dy * dist + 120 * rt * rt;
        drawSprite(fx, b.w ? VOIDC : GOLD, x, y, b.s * (1 - rt / b.life * 0.5), 1 - rt / b.life);
      }
    }
    // whip streaks
    const wq = seg(t, TL.whip, TL.whip + 0.45);
    if (wq > 0 && wq < 1) {
      for (let i = 0; i < 14; i++) {
        const y = 200 + ((i * 137) % 1500);
        const len = 500 + ((i * 211) % 700);
        const x = lerp(W + 200, -len - 400, eInOut(seg(wq, (i % 5) * 0.05, 0.75 + (i % 5) * 0.05)));
        const gr = fx.createLinearGradient(x, 0, x + len, 0);
        gr.addColorStop(0, "rgba(245,214,140,0)");
        gr.addColorStop(0.5, "rgba(245,214,140,0.9)");
        gr.addColorStop(1, "rgba(245,214,140,0)");
        fx.globalAlpha = 0.35 * Math.sin(wq * Math.PI);
        fx.fillStyle = gr;
        fx.fillRect(x, y, len, 2 + (i % 3) * 2);
      }
    }
    // a small spark burst as each montage card lands
    for (const s of TL.montage) {
      const lt = t - (s + 0.32);
      if (lt < 0 || lt > 0.9) continue;
      for (let i = 0; i < 70; i++) {
        const b = burst[i];
        const dist = (b.v * 0.45 * (1 - Math.exp(-b.k * lt))) / b.k;
        drawSprite(fx, GOLD, 540 + b.dx * dist, 1000 + b.dy * dist * 1.2, b.s * 0.8, (1 - lt / 0.9) * 0.9);
      }
    }
    // logo: rising embers and a soft bloom
    if (t > TL.logo) {
      const lt = t - TL.logo;
      const bloom = Math.exp(-Math.max(0, t - (TL.logo + 0.9)) * 2.2) * seg(t, TL.logo + 0.4, TL.logo + 0.9);
      if (bloom > 0.01) {
        const g = fx.createRadialGradient(540, 790, 0, 540, 790, 700);
        g.addColorStop(0, `rgba(255,230,170,${0.45 * bloom})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        fx.globalAlpha = 1;
        fx.fillStyle = g;
        fx.fillRect(0, 0, W, H);
      }
      for (const e of embers) {
        const et = lt - e.t0 * 0.4;
        if (et < 0) continue;
        const y = 1500 - ((et * e.v) % 1400);
        const x = e.x + Math.sin(et * 1.3 + e.ph) * 30;
        drawSprite(fx, GOLD, x, y, e.s, 0.55 * seg(lt, 0, 1) * (0.5 + 0.5 * Math.sin(et * 3 + e.ph)));
      }
    }
    // film grain
    fx.globalCompositeOperation = "source-over";
    fx.globalAlpha = 1;
  }

  // ---------- frame ----------
  window.renderAt = function (t) {
    const frame = Math.round(t * TL.fps);

    // camera shake: the reveal, and a small punch on each typed clause
    let A = 0;
    if (t >= TL.reveal) A += 7 * Math.exp(-(t - TL.reveal) * 5);
    
    stage.style.transform = `translate(${(A * Math.sin(t * 41)).toFixed(2)}px, ${(A * Math.cos(t * 37)).toFixed(2)}px)`;

    drawBackground(t);

    // --- hook ---
    words(capHook, t, 0, TL.dissolve[0], 0.06, 0.55);
    eyebrowAt(ebDescribe, t, 0.25, TL.dissolve[0] + 0.2);
    eyebrowAt(ebForge, t, TL.forge[0] + 0.1, TL.reveal);

    let punch = 0;
    TL.clauseEnds.forEach((ce, i) => { if (t >= ce) punch += (i === 3 ? 0.012 : 0.006) * Math.sin(Math.min(1, (t - ce) * 3) * Math.PI); });
    const press = t >= TL.press ? Math.exp(-(t - TL.press) * 12) : 0;
    const labO = 1 - seg(t, TL.dissolve[0], TL.dissolve[0] + 0.35);
    show(lab, labO * seg(t, 0, 0.35), `translateY(${(1 - eOutQuint(seg(t, 0, 0.7))) * 60}px) scale(${(1 + 0.025 * eInOut(seg(t, 0, 2.8)) + punch).toFixed(4)})`);
    lab.style.filter = labO < 1 ? `blur(${(1 - labO) * 14}px)` : "none";
    let txt = "";
    TL.prompt.forEach((clause, i) => {
      const n = clamp(Math.floor((t - TL.clauseStart[i]) * TL.cps), 0, clause.length);
      txt += clause.slice(0, n);
    });
    typed.textContent = txt;
    const typing = TL.clauseStart.some((s, i) => t >= s && t <= TL.clauseEnds[i] + 0.05);
    caret.style.opacity = typing || Math.floor(t * 2.2) % 2 === 0 ? "1" : "0";
    btn.style.transform = `scale(${1 - 0.06 * press})`;
    btn.style.filter = `brightness(${1 + 1.2 * press + (t > TL.press ? 0.3 : 0)})`;
    btn.style.boxShadow = t > TL.press ? `0 0 ${60 + 80 * press}px rgba(245,214,140,${0.5 + 0.4 * press})` : "";

    // --- forge seal ---
    const fs = TL.forge[0];
    const sealO = win(t, fs, TL.reveal + 0.15, 0.35, 0.2);
    const ft = Math.max(0, t - fs);
    const sealScale = lerp(0.82, 1.06, eInOut(seg(t, fs, TL.reveal))) + (t > TL.reveal ? 0.3 * seg(t, TL.reveal, TL.reveal + 0.15) : 0);
    show(seal, sealO, `scale(${sealScale})`);
    sealOuter.setAttribute("transform", `rotate(${(ft * 40 + ft * ft * 70).toFixed(2)} 400 400)`);
    sealInner.setAttribute("transform", `rotate(${(-ft * 55 - ft * ft * 90).toFixed(2)} 400 400)`);
    const verified = seg(t, TL.status[2], TL.status[2] + 0.2);
    sealGlow.setAttribute("r", String(120 + 120 * eInCubic(seg(t, fs, TL.reveal)) + 60 * verified));
    seal.style.filter = `drop-shadow(0 0 ${12 + 30 * verified}px rgba(216,178,90,${0.5 + 0.4 * verified}))`;
    status.forEach((s, i) => {
      const a = TL.status[i], b = i < 2 ? TL.status[i + 1] : TL.reveal;
      show(s, win(t, a, b + 0.02, 0.12, 0.1), `translateY(${(1 - eOutCubic(seg(t, a, a + 0.25))) * 14}px)`);
    });

    // --- reveal ---
    const r0 = TL.reveal;
    const enter = seg(t, r0, r0 + 1.0);
    const loreFade = seg(t, TL.lore[0], TL.lore[0] + 0.4);
    const whipOut = eInOut(seg(t, TL.whip - 0.1, TL.whip + 0.45));
    const cardO = seg(t, r0, r0 + 0.08) * (1 - 0.85 * loreFade) * (1 - whipOut);
    const float = Math.sin((t - r0) * 1.6) * 8;
    const rotY = lerp(-28, 0, eOutQuint(enter)) + Math.sin((t - r0) * 0.9) * 3;
    const sc = lerp(0.62, 0.9, eOutQuint(enter)) * (1 - 0.05 * loreFade);
    show(card1, cardO, `translate(${-1300 * whipOut}px, ${float}px) perspective(1600px) rotateY(${rotY}deg) scale(${sc})`);
    card1.style.filter = loreFade > 0 || whipOut > 0 ? `blur(${loreFade * 8 + whipOut * 10}px)` : "none";
    const sh = card1.querySelector(".shine");
    sh.style.transform = `translateX(${lerp(-70, 70, eInOut(seg(t, r0 + 0.5, r0 + 1.3)))}%)`;

    const stIn = eOutQuint(seg(t, TL.strip, TL.strip + 0.8));
    show(strip1, stIn * (1 - 0.85 * loreFade) * (1 - whipOut), `translate(${-1300 * whipOut}px, ${(1 - stIn) * 80}px)`);
    words(capA, t, TL.capA, TL.lore[0]);
    words(capB, t, TL.capB, TL.lore[0]);

    const lo = win(t, TL.lore[0] + 0.1, TL.whip + 0.2, 0.35, 0.2);
    show(loreBig, lo, `translateX(${-900 * whipOut}px) scale(${lerp(0.94, 1.02, seg(t, TL.lore[0], TL.whip))})`);
    loreBig.style.letterSpacing = `${lerp(0.06, 0.0, eOutCubic(seg(t, TL.lore[0], TL.lore[0] + 0.8)))}em`;

    // --- "Anything you can describe." then montage header ---
    const toTop = eInOut(seg(t, TL.montage[0] - 0.2, TL.montage[0] + 0.45));
    words(capMid, t, TL.whip + 0.05, TL.fan - 0.45, 0.07, 0.6);
    capMid.style.transform = `translateY(${lerp(0, -650, toTop)}px) scale(${lerp(1, 0.62, toTop)})`;

    // --- montage ---
    mCards.forEach((m, i) => {
      const s = TL.montage[i], e = s + TL.montageLen;
      const lead = i === 0 ? 0.3 : -0.1; // the first card waits for the header to move up
      const inP = eOutQuint(seg(t, s + lead, s + lead + 0.7));
      const outP = eInCubic(seg(t, e - 0.4, e));
      const o = seg(t, s + lead, s + lead + 0.2) * (1 - seg(t, e - 0.1, e));
      const x = 900 * (1 - inP) - 900 * outP;
      const rot = 7 * (1 - inP) - 7 * outP;
      const fl = Math.sin((t - s) * 2) * 6;
      show(m.card, o, `translate(${x}px, ${fl}px) rotate(${rot}deg) scale(${0.88 - 0.06 * (1 - inP)})`);
      m.card.style.filter = `blur(${((1 - inP) * 10 + outP * 10).toFixed(2)}px)`;
      m.card.querySelector(".shine").style.transform = `translateX(${lerp(-80, 80, eInOut(seg(t, s + 0.35, s + 1.2)))}%)`;
      const pn = Math.floor(seg(t, s + 0.05, s + 0.65) * m.c.prompt.length);
      m.prompt.innerHTML = `<span class="q">&ldquo;</span>${m.c.prompt.slice(0, pn)}${pn >= m.c.prompt.length ? '<span class="q">&rdquo;</span>' : ""}`;
      Object.assign(m.prompt.style, { top: "330px" });
      show(m.prompt, o, `translateX(${-300 * outP}px)`);
      show(m.info, o * seg(t, s + 0.5, s + 0.8), `translateX(${x}px)`);
    });

    // --- fan ---
    const fanOut = seg(t, TL.codex - 0.3, TL.codex);
    fan.forEach((f, i) => {
      const s = TL.fan + i * 0.09;
      const p = eOutQuint(seg(t, s, s + 0.9));
      const o = seg(t, s, s + 0.1) * (1 - fanOut);
      const k = FAN[i];
      const breathe = Math.sin((t - TL.fan) * 1.4 + i) * 4;
      show(f, o, `translate(${k.x * p}px, ${lerp(700, k.y, p) + breathe}px) rotate(${k.r * p}deg) scale(0.46)`);
    });
    fanLines.forEach((l, i) => {
      const a = TL.fanLines[i];
      words(l, t, a, TL.codex - 0.45, 0.07, 0.6);
    });
    chips.forEach((c, i) => {
      const a = TL.fanLines[0] + 0.3 + i * 0.12;
      show(c, seg(t, a, a + 0.15) * (1 - fanOut), `translateY(${(1 - eOutBack(seg(t, a, a + 0.35))) * 40}px)`);
    });

    // --- codex ---
    const cxO = win(t, TL.codex, TL.drop, 0.3, 0.25);
    words(codexCapA, t, TL.codex, TL.drop - 0.35);
    eyebrowAt(ebShare, t, TL.codex, TL.drop);
    show(codexCapB, cxO * seg(t, TL.codex + 0.45, TL.codex + 0.7));
    show(codex, cxO, `translateY(${(1 - eOutCubic(seg(t, TL.codex, TL.codex + 0.5))) * 120}px)`);
    grid.style.transform = `translateY(${-420 * eInOut(seg(t, TL.codex, TL.drop))}px)`;
    const voted = t >= TL.vote;
    hotN.textContent = String(VOTES[HOT] + (voted ? 1 : 0));
    const vp = voted ? Math.exp(-(t - TL.vote) * 5) : 0;
    hotArr.style.transform = `scale(${1 + 0.8 * vp})`;
    hotN.style.transform = `scale(${1 + 0.6 * vp})`;
    minis[HOT].style.boxShadow = voted ? `0 0 ${30 + 40 * vp}px rgba(245,214,140,.6)` : "";

    // --- drop ---
    const dO = win(t, TL.drop + 0.25, TL.logo, 0.6, 0.3);
    const dropT = t - TL.drop;
    show(sil, dO, `perspective(1400px) rotateY(${lerp(-35, 35, seg(t, TL.drop, TL.logo))}deg) scale(${lerp(0.92, 1.0, seg(t, TL.drop, TL.logo))})`);
    sil.style.boxShadow = `0 0 ${50 + 25 * Math.sin(dropT * 3)}px rgba(216,178,90,.3), 0 0 220px rgba(216,178,90,${0.1 + 0.05 * Math.sin(dropT * 2)})`;
    words(dropA, t, TL.dropLines[0], TL.logo - 0.45, 0.12, 0.8);
    show(dropB, win(t, TL.dropLines[1], TL.logo, 0.4, 0.3), `translateY(${(1 - eOutCubic(seg(t, TL.dropLines[1], TL.dropLines[1] + 0.6))) * 20}px)`);

    // --- logo ---
    if (t >= TL.logo - 0.1) {
      seal.style.display = "";
      const lo2 = 0.22 * seg(t, TL.logo, TL.logo + 1.2);
      seal.style.opacity = String(lo2);
      seal.style.transform = `translateY(-110px) scale(0.95)`;
      seal.style.filter = "none";
      sealOuter.setAttribute("transform", `rotate(${(t * 6).toFixed(2)} 400 400)`);
      sealInner.setAttribute("transform", `rotate(${(-t * 9).toFixed(2)} 400 400)`);
      sealGlow.setAttribute("r", "0");
    }
    const shimmer = lerp(-2, 9, seg(t, TL.logo + 1.0, TL.logo + 2.2));
    const shimmer2 = lerp(-2, 9, seg(t, 28.2, 29.3));
    letters.forEach((s, i) => {
      const a = TL.logo + 0.1 + i * 0.07;
      const p = seg(t, a, a + 0.6);
      s.style.opacity = String(eOutCubic(p));
      s.style.transform = `translateY(${(1 - eOutCubic(p)) * 40}px)`;
      const glow = Math.exp(-Math.pow(i - shimmer, 2) / 1.2) + Math.exp(-Math.pow(i - shimmer2, 2) / 1.2);
      s.style.filter = `blur(${(1 - p) * 10}px) brightness(${1 + 0.9 * glow}) drop-shadow(0 0 30px rgba(216,178,90,.45))`;
    });
    show(logoWord, t >= TL.logo ? 1 : 0);
    logoWord.style.letterSpacing = `${lerp(0.3, 0.12, eOutCubic(seg(t, TL.logo, TL.logo + 1.6)))}em`;
    show(logoRule, seg(t, TL.logo + 0.8, TL.logo + 1.0), `scaleX(${eOutCubic(seg(t, TL.logo + 0.8, TL.logo + 1.6))})`);
    show(tagline, seg(t, TL.tagline, TL.tagline + 0.5), `translateY(${(1 - eOutCubic(seg(t, TL.tagline, TL.tagline + 0.7))) * 24}px)`);
    show(urlEl, seg(t, TL.url, TL.url + 0.2), `scale(${eOutBack(seg(t, TL.url, TL.url + 0.5), 2)})`);
    show(footer, seg(t, TL.footer, TL.footer + 0.5));

    drawFx(t, frame);
    return frame;
  };

  window.videoReady = document.fonts.ready.then(() => Promise.all([
    document.fonts.load('700 80px "Cinzel"'),
    document.fonts.load('italic 600 60px "Cormorant Garamond"'),
    document.fonts.load('600 20px "Inter"'),
    document.fonts.load('700 40px "Inter"'),
  ])).then(() => { window.renderAt(0); return true; });
})();
