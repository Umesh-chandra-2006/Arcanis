// Video 5: "How the forge thinks." The Power Budget with the real config (shared/power-budget.ts):
// a Basic Attack has 50 of 100 points; a greedy prompt asks for all 100; enforcement rescales it.
(function () {
  const L = window.LIB, TL = window.TL, D = L.D;
  const { seg, lerp, eOutQuint, eInOut, win, show, words } = L;
  const F = D.forge;
  const B = TL.budget, S = TL.spend, C = TL.cap, R = TL.result;
  const BAR_X = 110, BAR_W = 860, BAR_Y = 860, BAR_H = 84;
  const px = (points) => (points / F.maxPoints) * (BAR_W - 12); // inside the 6px inset
  const FIELDS = [
    { key: "damage", name: "Power", color: "#e8bd5c" },
    { key: "mp", name: "MP cost", color: "#6fa8ea" },
    { key: "will", name: "Strain", color: "#b08ef0" },
    { key: "cast", name: "Cast speed", color: "#62d3bf" },
  ];
  const grown = (t, i) => {
    const per = (S.grow[1] - S.grow[0]) / FIELDS.length;
    return eOutQuint(seg(t, S.grow[0] + i * per, S.grow[0] + (i + 1) * per));
  };

  const hook = L.caption("EVERY SPELL GETS A|*POWER* *BUDGET.*", 300, 86);
  const ebHook = L.eyebrow("How the forge thinks", 560);
  const capB = L.caption("THE *CODE*|SETS THE BUDGET.", 230, 78);
  const ebB = L.eyebrow("I &middot; The budget", 160);
  const capS = L.caption("THE *AI*|SPENDS IT.", 230, 78);
  const ebS = L.eyebrow("II &middot; The spend", 160);
  const capC = L.caption("THE *CHECKS*|CAP IT.", 230, 78);
  const ebC = L.eyebrow("III &middot; The check", 160);

  const bar = L.place(L.el("div", "abs"), { left: BAR_X + "px", top: BAR_Y + "px", width: BAR_W + "px", height: BAR_H + "px",
    borderRadius: "18px", border: "2px solid rgba(216,178,90,.55)", background: "rgba(12,10,16,.85)", boxShadow: "0 20px 60px rgba(0,0,0,.6)" });
  const inner = L.place(L.el("div", "", null, bar), { position: "absolute", inset: "6px" });
  const fill = L.place(L.el("div", "", null, inner), { position: "absolute", left: "0", top: "0", bottom: "0", borderRadius: "10px",
    background: "linear-gradient(180deg, #f3d98f, #c99a3e)", boxShadow: "0 0 30px rgba(216,178,90,.5)" });
  const segs = FIELDS.map((f) => L.place(L.el("div", "", null, inner), { position: "absolute", top: "0", bottom: "0",
    background: `linear-gradient(180deg, ${f.color}, ${f.color}bb)`, boxShadow: `0 0 24px ${f.color}66`, borderRight: "2px solid rgba(10,8,14,.9)" }));
  const over = L.place(L.el("div", "", null, inner), { position: "absolute", top: "-6px", bottom: "-6px", borderRadius: "10px",
    background: "repeating-linear-gradient(135deg, rgba(255,60,50,.45) 0 14px, rgba(255,60,50,.2) 14px 28px)", border: "3px solid #ff6a5c", boxShadow: "0 0 50px rgba(255,70,60,.7)" });
  const overLabel = L.place(L.el("div", "abs smallcaps", "Over budget"), { top: BAR_Y - 50 + "px", width: "300px", textAlign: "center", fontSize: "22px", color: "#ff8a7d", fontWeight: "700" });
  const maxLabel = L.place(L.el("div", "abs smallcaps", `${F.maxPoints} points of possible power`), { left: BAR_X + "px", top: BAR_Y - 56 + "px", fontSize: "20px", color: "#b9ad95" });
  const marker = L.place(L.el("div", "abs"), { left: BAR_X + 6 + px(F.budget) - 2 + "px", top: BAR_Y - 40 + "px", width: "4px", height: BAR_H + 80 + "px", background: "#fff1c4", boxShadow: "0 0 18px #f3d98f", transformOrigin: "50% 0" });
  const markerLabel = L.place(L.el("div", "abs smallcaps", `Budget &middot; ${F.budget}`), { left: BAR_X + px(F.budget) - 150 + "px", width: "300px", textAlign: "center", top: BAR_Y + BAR_H + 52 + "px", fontSize: "26px", color: "#f3d98f" });
  const subB = L.place(L.el("div", "abs center-x italic", "A Basic attack spell: half the scale, set by code."), { top: "1180px", fontSize: "50px", color: "#efe6d2", padding: "0 120px" });
  const legend = L.place(L.el("div", "abs center-x smallcaps", FIELDS.map((f) => `<span style="display:inline-flex;align-items:center;gap:10px;margin:0 14px"><b style="width:16px;height:16px;border-radius:50%;background:${f.color};box-shadow:0 0 10px ${f.color}"></b>${f.name}</span>`).join("")), { top: BAR_Y + BAR_H + 110 + "px", fontSize: "20px", color: "#e6dcc6" });
  const prompt = L.place(L.el("div", "abs center-x italic mprompt", ""), { top: "450px" });
  const counter = L.place(L.el("div", "abs center-x"), { top: "690px", fontFamily: '"Cinzel", serif', fontWeight: "700", fontSize: "64px" });
  const subS = L.place(L.el("div", "abs center-x italic", "It tried to spend everything."), { top: "1180px", fontSize: "54px", color: "#efe6d2" });
  const subC = L.place(L.el("div", "abs center-x italic", "Rescaled to fit the budget. Every time."), { top: "1180px", fontSize: "50px", color: "#efe6d2", padding: "0 100px" });
  const subC2 = L.place(L.el("div", "abs center-x smallcaps", "Tier is set by code. Never by the AI."), { top: "1320px", fontSize: "24px", color: "#f3d98f" });
  const vise = L.place(L.el("div", "abs"), { top: BAR_Y - 24 + "px", width: "16px", height: BAR_H + 48 + "px", borderRadius: "6px",
    background: "linear-gradient(90deg, #fff1c4, #c99a3e)", boxShadow: "0 0 30px rgba(243,217,143,.8)" });

  const card = L.card(F.card);
  const strip = L.strip(F.card);
  const capR = L.caption("ASKED FOR *INFINITE.*|GOT *FAIR.*", 220, 80);
  const end = L.endCard("It still has to be fair.");
  const lt = L.hexRgb(F.card.accent);

  L.ready(function (t) {
    L.background(t, { glow: 0.8 + 0.3 * win(t, R.reveal, R.out, 0.3, 0.5) });
    words(hook, t, TL.hook[0], TL.hook[1], 0.08, 0.6);
    L.eyebrowAt(ebHook, t, 0.6, TL.hook[1] + 0.3);
    words(capB, t, B.start, B.out, 0.08, 0.6); L.eyebrowAt(ebB, t, B.start, B.out + 0.2);
    words(capS, t, S.start, S.out, 0.08, 0.6); L.eyebrowAt(ebS, t, S.start, S.out + 0.2);
    words(capC, t, C.start, C.out, 0.08, 0.6); L.eyebrowAt(ebC, t, C.start, C.out + 0.2);

    const barO = win(t, B.bar, R.start + 0.3, 0.6, 0.4);
    show(bar, barO, `translateY(${(1 - eOutQuint(seg(t, B.bar, B.bar + 0.8))) * 40}px)`);
    show(maxLabel, barO * (1 - seg(t, S.start, S.start + 0.3)));
    // I: the whole scale lights dimly, then the marker cuts it to the budget.
    const full = eOutQuint(seg(t, B.fill[0], B.fill[1]));
    const cut = eInOut(seg(t, B.marker, B.marker + 0.6));
    const fillGone = seg(t, S.grow[0] - 0.3, S.grow[0]);
    show(fill, barO * (1 - fillGone));
    fill.style.width = lerp(BAR_W - 12, px(F.budget), cut) * full + "px";
    fill.style.opacity = String(lerp(0.35, 1, cut) * (1 - fillGone));
    show(marker, barO * seg(t, B.marker, B.marker + 0.1), `scaleY(${eOutQuint(seg(t, B.marker, B.marker + 0.5))})`);
    show(markerLabel, barO * seg(t, B.marker + 0.3, B.marker + 0.7));
    show(subB, win(t, B.sub, B.out, 0.5, 0.35), `translateY(${(1 - eOutQuint(seg(t, B.sub, B.sub + 0.6))) * 20}px)`);

    // II: the prompt, then each stat grows to its greedy share and overflows the budget.
    const pn = Math.floor(seg(t, S.type[0], S.type[1]) * F.card.prompt.length);
    prompt.innerHTML = `<span class="q">&ldquo;</span>${F.card.prompt.slice(0, pn)}${pn >= F.card.prompt.length ? '<span class="q">&rdquo;</span>' : ""}`;
    show(prompt, win(t, S.type[0] - 0.1, S.out, 0.2, 0.35));
    const clampP = eInOut(seg(t, C.clamp[0], C.clamp[1]));
    let x = 0, spentNow = 0;
    FIELDS.forEach((f, i) => {
      const g = grown(t, i);
      const pts = lerp(F.greedy[f.key], F.enforced[f.key], clampP) * g;
      show(segs[i], barO * (g > 0 ? 1 : 0));
      segs[i].style.left = x + "px";
      segs[i].style.width = px(pts) + "px";
      x += px(pts);
      spentNow += pts;
    });
    const overW = Math.max(0, x - px(F.budget));
    show(over, barO * seg(t, S.over, S.over + 0.2) * (overW > 2 ? 1 : 0) * (0.75 + 0.25 * Math.sin(t * 9)));
    over.style.left = px(F.budget) + "px";
    over.style.width = overW + "px";
    show(overLabel, barO * seg(t, S.over, S.over + 0.3) * (overW > 40 ? 1 : 0));
    overLabel.style.left = BAR_X + 6 + px(F.budget) + overW / 2 - 150 + "px";
    show(legend, barO * seg(t, S.grow[0], S.grow[0] + 0.5));
    const clamped = t > C.clamp[1] - 0.05;
    show(counter, win(t, S.over, C.out, 0.3, 0.35), `scale(${1 + (t > C.clamp[1] ? 0.12 * Math.exp(-(t - C.clamp[1]) * 6) : 0)})`);
    counter.innerHTML = `<span style="color:${clamped ? "#f3d98f" : "#ff7d6e"}">${(clamped ? F.enforcedSpent : spentNow).toFixed(0)}</span><span style="color:#b9ad95;font-size:44px"> / ${F.budget} points</span>`;
    show(subS, win(t, S.sub, S.out, 0.5, 0.35), `translateY(${(1 - eOutQuint(seg(t, S.sub, S.sub + 0.6))) * 20}px)`);

    // III: the vise slides in from the right and squeezes the spend back inside the budget.
    const vIn = eOutQuint(seg(t, C.start + 0.3, C.clamp[0]));
    show(vise, win(t, C.start + 0.3, C.out, 0.2, 0.35));
    vise.style.left = lerp(lerp(BAR_X + BAR_W + 200, BAR_X + BAR_W - 4, vIn), BAR_X + 6 + px(F.budget), clampP) + "px";
    show(subC, win(t, C.sub, C.out, 0.5, 0.35), `translateY(${(1 - eOutQuint(seg(t, C.sub, C.sub + 0.6))) * 20}px)`);
    show(subC2, win(t, C.sub2, C.out, 0.5, 0.35));

    // Result.
    const enter = eOutQuint(seg(t, R.reveal, R.reveal + 1.0));
    const endOut = seg(t, R.out - 0.4, R.out);
    show(card, seg(t, R.reveal, R.reveal + 0.1) * (1 - endOut),
      `translate(0px, ${Math.sin((t - R.reveal) * 1.5) * 7}px) perspective(1600px) rotateY(${lerp(-28, 0, enter) + Math.sin((t - R.reveal) * 0.9) * 3}deg) scale(${lerp(0.62, 0.9, enter)})`);
    L.shineAt(card, t, R.reveal + 0.5, R.reveal + 1.4);
    const stIn = eOutQuint(seg(t, R.strip, R.strip + 0.8));
    show(strip, stIn * (1 - endOut), `translateY(${(1 - stIn) * 60}px)`);
    words(capR, t, R.cap, R.out - 0.3, 0.09, 0.65);
    end(t, TL.end);

    L.fxClear();
    L.burst(t, C.clamp[1], BAR_X + px(F.budget), BAR_Y + BAR_H / 2, { n: 120, seed: 61, power: 0.5 });
    L.flash(t, C.clamp[1], BAR_X + px(F.budget), BAR_Y + 40, 0.35);
    L.flash(t, R.reveal, 540, 820, 0.6);
    L.ring(t, R.reveal, 540, 820, 1500, lt);
    L.burst(t, R.reveal, 540, 820, { n: 220, seed: 62, rgb: lt });
    L.fxEnd();
    return 0;
  });
})();
