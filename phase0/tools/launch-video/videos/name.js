// Video 3: "I turned my name into a spell." The name: Asteroid Destroyer.
(function () {
  const L = window.LIB, TL = window.TL, D = L.D;
  const { seg, lerp, eOutQuint, eInOut, win, show, words } = L;
  const c = D.nameSpell;
  const tint = L.hexRgb(c.accent);

  const hook = L.caption("I TURNED MY *NAME*|INTO A SPELL.", 250, 88);
  const ebLab = L.eyebrow("I &middot; Describe", 520);
  const lab = L.lab(c.prompt, [`&#9679; ${c.element}`, c.category], 600, 62);
  const seal = L.seal(500, 800);
  const ebForge = L.eyebrow("II &middot; Forge", 330);
  const status = ["Reading your words", "Checking balance", "&#10003; Verified"].map((s) =>
    L.place(L.el("div", "abs center-x smallcaps", s), { top: "1360px", fontSize: "28px", color: "#f3d98f" }));
  const card = L.card(c);
  const strip = L.strip(c);
  const meet = L.caption(`MEET *${c.name.toUpperCase().replace(" ", "* *")}.*`, 230, 70);
  const loreBig = L.place(L.el("div", "abs center-x italic", `&ldquo;${c.lore}&rdquo;`), { top: "800px", padding: "0 110px", fontSize: "104px", lineHeight: "1.1", color: "#f3d98f", textShadow: "0 0 40px rgba(216,178,90,.35)" });
  const ask = L.caption("WHAT WOULD|*YOURS* BE?", 760, 110);
  const askSub = L.place(L.el("div", "abs center-x italic", "Type your name. Find out."), { top: "1050px", fontSize: "56px", color: "#efe6d2" });
  const end = L.endCard("Forge your name.");

  L.ready(function (t) {
    L.background(t, { glow: 0.8 + 0.3 * win(t, TL.forge[0], TL.lore[1], 0.5, 0.6), tint, tintAmount: win(t, TL.reveal - 0.1, TL.ask, 0.3, 0.6) });
    words(hook, t, 0, TL.press - 0.2, 0.07, 0.6);
    L.eyebrowAt(ebLab, t, TL.labIn, TL.press + 0.2);
    const labIn = eOutQuint(seg(t, TL.labIn, TL.labIn + 0.6));
    const labOut = seg(t, TL.press + 0.15, TL.forge[0] + 0.3);
    show(lab.el, labIn * (1 - labOut), `translateY(${(1 - labIn) * 60}px) scale(${1 - 0.04 * labOut})`);
    lab.el.style.filter = labOut > 0 ? `blur(${labOut * 12}px)` : "none";
    lab.at(t, TL.type[0], TL.type[1], TL.press);

    seal.at(t, TL.forge[0], TL.reveal);
    L.eyebrowAt(ebForge, t, TL.forge[0], TL.reveal);
    status.forEach((s, i) => {
      const a = TL.status[i], b = i < 2 ? TL.status[i + 1] : TL.reveal;
      show(s, win(t, a, b + 0.02, 0.15, 0.1), `translateY(${(1 - eOutQuint(seg(t, a, a + 0.4))) * 14}px)`);
    });

    const enter = eOutQuint(seg(t, TL.reveal, TL.reveal + 1.0));
    const loreFade = seg(t, TL.lore[0], TL.lore[0] + 0.4);
    const toAsk = eInOut(seg(t, TL.lore[1] - 0.3, TL.ask + 0.3));
    const rotY = lerp(-28, 0, enter) + Math.sin((t - TL.reveal) * 0.9) * 3;
    const float = Math.sin((t - TL.reveal) * 1.5) * 7;
    const sc = lerp(0.62, 0.9, enter) * (1 - 0.05 * loreFade);
    const endOut = seg(t, TL.end - 0.4, TL.end);
    show(card, seg(t, TL.reveal, TL.reveal + 0.1) * (1 - 0.85 * loreFade * (1 - toAsk)) * (1 - endOut),
      `translate(0px, ${float + lerp(0, -330, toAsk)}px) perspective(1600px) rotateY(${rotY}deg) scale(${lerp(sc, 0.42, toAsk)})`);
    card.style.filter = loreFade > 0 && toAsk < 1 ? `blur(${loreFade * 8 * (1 - toAsk)}px)` : "none";
    L.shineAt(card, t, TL.reveal + 0.5, TL.reveal + 1.4);
    const stIn = eOutQuint(seg(t, TL.strip, TL.strip + 0.8));
    show(strip, stIn * (1 - loreFade), `translateY(${(1 - stIn) * 60}px)`);
    words(meet, t, TL.meet, TL.lore[0], 0.08, 0.6);
    show(loreBig, win(t, TL.lore[0] + 0.1, TL.lore[1], 0.4, 0.35), `scale(${lerp(0.95, 1.02, seg(t, TL.lore[0], TL.lore[1]))})`);
    words(ask, t, TL.ask, TL.end - 0.4, 0.09, 0.7);
    show(askSub, win(t, TL.ask + 0.8, TL.end, 0.4, 0.35), `translateY(${(1 - eOutQuint(seg(t, TL.ask + 0.8, TL.ask + 1.4))) * 20}px)`);
    end(t, TL.end);

    L.fxClear();
    L.flash(t, TL.reveal, 540, 820, 0.6);
    L.ring(t, TL.reveal, 540, 820, 1500);
    L.burst(t, TL.reveal, 540, 820, { n: 220, seed: 41, rgb: tint });
    L.burst(t, TL.reveal + 0.05, 540, 820, { n: 120, seed: 42 });
    L.fxEnd();
    return 0;
  });
})();
