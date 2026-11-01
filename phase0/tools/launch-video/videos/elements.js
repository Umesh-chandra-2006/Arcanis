// Video 7: "12 elements. Which one are you?" Each element's art, name and a lore line from its
// base spells, then the twelve as a grid.
(function () {
  const L = window.LIB, TL = window.TL, D = L.D;
  const { seg, lerp, eOutQuint, eInCubic, eOutBack, win, show, words } = L;
  const E = D.elements;

  const hook = L.caption("*12* ELEMENTS.|WHICH ONE|ARE *YOU?*", 280, 84);
  const ebHook = L.eyebrow("The elements of Arcanis", 630);
  const spots = E.map((e, i) => {
    const orb = L.place(L.el("div", "abs", L.art(e.art)), { left: "280px", top: "520px", width: "520px", height: "520px", borderRadius: "50%", overflow: "hidden",
      border: "3px solid rgba(216,178,90,.75)", boxShadow: `0 0 90px ${e.accent}88, 0 0 0 12px rgba(216,178,90,.08)` });
    orb.querySelector("svg").style.cssText = "width:100%;height:100%;display:block;filter:brightness(1.45) saturate(1.3)";
    const name = L.place(L.el("div", "abs center-x cap", e.element.toUpperCase()), { top: "1100px", fontSize: "104px", color: e.accent, textShadow: `0 0 40px ${e.accent}88` });
    const lore = L.place(L.el("div", "abs center-x italic", `&ldquo;${e.lore}&rdquo;`), { top: "1245px", fontSize: "48px", color: "#efe6d2", padding: "0 110px", lineHeight: "1.15" });
    const num = L.place(L.el("div", "abs center-x smallcaps", `${String(i + 1).padStart(2, "0")} / 12`), { top: "455px", fontSize: "22px", color: "#f3d98f" });
    return { e, orb, name, lore, num };
  });
  const dots = L.place(L.el("div", "abs center-x", E.map((e) => `<b style="display:inline-block;width:18px;height:18px;border-radius:50%;margin:0 9px;background:${e.accent};box-shadow:0 0 12px ${e.accent}"></b>`).join("")), { top: "1460px" });
  const dotEls = [...dots.querySelectorAll("b")];
  // The outer box is shown and hidden; the inner one keeps display: grid.
  const gridBox = L.place(L.el("div", "abs"), { left: "120px", top: "470px", width: "840px" });
  const grid = L.place(L.el("div", "", null, gridBox), { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "22px 30px" });
  const tiles = E.map((e) => {
    const tile = L.el("div", "", `<div style="width:170px;height:170px;margin:0 auto;border-radius:50%;overflow:hidden;border:2px solid rgba(216,178,90,.7);box-shadow:0 0 40px ${e.accent}77">${L.art(e.art)}</div>
      <div class="smallcaps" style="margin-top:14px;text-align:center;font-size:20px;color:${e.accent}">${e.element}</div>`, grid);
    tile.querySelector("svg").style.cssText = "width:100%;height:100%;display:block;filter:brightness(1.45) saturate(1.3)";
    return tile;
  });
  const ask = L.caption("WHICH ONE|ARE *YOU?*", 210, 92);
  const askSub = L.place(L.el("div", "abs center-x italic", "Tell us in the comments. Then forge a spell in it."), { top: "1430px", fontSize: "44px", color: "#efe6d2", padding: "0 100px" });
  const end = L.endCard("Find your element.");

  L.ready(function (t) {
    const k = Math.floor((t - TL.start) / TL.each);
    const cur = k >= 0 && k < TL.count ? E[k] : null;
    L.background(t, { glow: 0.85, tint: cur ? L.hexRgb(cur.accent) : null, tintAmount: cur ? 1 : 0 });
    words(hook, t, TL.hook[0], TL.hook[1], 0.08, 0.6);
    L.eyebrowAt(ebHook, t, 0.6, TL.hook[1] + 0.3);

    spots.forEach((s, i) => {
      const a = TL.start + i * TL.each, b = a + TL.each;
      if (t < a - 0.05 || t > b + 0.05) { [s.orb, s.name, s.lore, s.num].forEach((x) => (x.style.display = "none")); return; }
      const inP = eOutQuint(seg(t, a, a + 0.4));
      const outP = eInCubic(seg(t, b - 0.22, b));
      const o = Math.min(1, inP * 1.5) * (1 - outP);
      show(s.orb, o, `scale(${lerp(0.8, 1, inP) + 0.1 * outP}) rotate(${lerp(-12, 0, inP) + (t - a) * 4}deg)`);
      s.orb.style.filter = `blur(${((1 - inP) * 10 + outP * 10).toFixed(2)}px)`;
      show(s.name, o, `translateY(${(1 - inP) * 50 - outP * 30}px)`);
      show(s.lore, Math.min(1, seg(t, a + 0.15, a + 0.5) * 1.3) * (1 - outP), `translateY(${(1 - eOutQuint(seg(t, a + 0.15, a + 0.55))) * 30}px)`);
      show(s.num, o);
    });
    dotEls.forEach((d, i) => {
      const a = TL.start + i * TL.each;
      d.style.opacity = String(t >= a ? (i === k ? 1 : 0.55) : 0.12);
      d.style.transform = `scale(${i === k ? 1.35 : 1})`;
    });
    show(dots, win(t, TL.start - 0.2, TL.grid + 0.2, 0.3, 0.3));

    tiles.forEach((tl, i) => {
      const a = TL.grid + i * 0.06;
      const p = eOutBack(seg(t, a, a + 0.5), 1.5);
      tl.style.opacity = String(seg(t, a, a + 0.15) * (1 - seg(t, TL.end - 0.4, TL.end)));
      tl.style.transform = `scale(${p}) translateY(${Math.sin(t * 1.4 + i) * 4}px)`;
    });
    show(gridBox, t >= TL.grid ? 1 : 0);
    words(ask, t, TL.ask, TL.end - 0.4, 0.09, 0.65);
    show(askSub, win(t, TL.ask + 1.0, TL.end, 0.4, 0.35), `translateY(${(1 - eOutQuint(seg(t, TL.ask + 1.0, TL.ask + 1.6))) * 20}px)`);
    end(t, TL.end);

    L.fxClear();
    for (let i = 0; i < TL.count; i++) L.burst(t, TL.start + i * TL.each + 0.05, 540, 780, { n: 70, seed: 70 + i, rgb: L.hexRgb(E[i].accent), power: 0.55, life: 1.0 });
    L.flash(t, TL.grid, 540, 900, 0.35);
    L.fxEnd();
    return 0;
  });
})();
