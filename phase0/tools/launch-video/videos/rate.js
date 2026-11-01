// Video 4: "Rate this spell 1 to 10." Built for comments.
(function () {
  const L = window.LIB, TL = window.TL, D = L.D;
  const { seg, lerp, eOutQuint, eInOut, eOutBack, win, show, words } = L;
  const c = D.rateSpell;
  const tint = L.hexRgb(c.accent);

  const hook = L.caption("RATE THIS SPELL|*1* TO *10.*", 230, 96);
  const back = L.cardBack();
  const card = L.card(c);
  const prompt = L.place(L.el("div", "abs center-x italic mprompt", `<span class="q">&ldquo;</span>${c.prompt}<span class="q">&rdquo;</span>`), { top: "250px" });
  const ebPrompt = L.eyebrow("The prompt", 190);
  const strip = L.strip(c);
  const loreBig = L.place(L.el("div", "abs center-x italic", `&ldquo;${c.lore}&rdquo;`), { top: "820px", padding: "0 110px", fontSize: "120px", color: "#f3d98f", textShadow: "0 0 40px rgba(216,178,90,.35)" });
  const comment = L.caption("COMMENT|YOUR *SCORE.*", 330, 104);
  const dial = L.place(L.el("div", "abs", `<div class="n"></div>`), {
    left: "340px", top: "700px", width: "400px", height: "400px", borderRadius: "50%", border: "3px solid rgba(216,178,90,.75)",
    display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 80px rgba(216,178,90,.3), inset 0 0 60px rgba(216,178,90,.15)",
    background: "radial-gradient(circle, rgba(60,44,20,.6), rgba(10,8,14,.9))",
  });
  const num = dial.querySelector(".n");
  L.place(num, { position: "absolute", inset: "0", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: '"Cinzel", serif', fontWeight: "700", fontSize: "190px", color: "#f3d98f", textShadow: "0 0 40px rgba(216,178,90,.6)" });
  const dialSub = L.place(L.el("div", "abs center-x italic", "Be honest. The bees are reading."), { top: "1160px", fontSize: "54px", color: "#efe6d2" });
  const end = L.endCard("Make one they can't rate.");

  L.ready(function (t) {
    L.background(t, { glow: 0.75 + 0.3 * win(t, TL.reveal, TL.lore[1], 0.3, 0.6), tint, tintAmount: win(t, TL.reveal, TL.comment + 0.5, 0.3, 0.6) });
    words(hook, t, 0, TL.flip[0] - 0.1, 0.08, 0.6);
    // Face down, trembling more as the roll builds, then the flip (back to 90 degrees, face from -90).
    const fp = eInOut(seg(t, TL.flip[0], TL.flip[1]));
    const angle = fp * 180;
    const shake = seg(t, TL.roll[0], TL.roll[1]) ** 2 * 6 * (t < TL.flip[0] ? 1 : 0);
    const backIn = eOutQuint(seg(t, TL.back, TL.back + 0.9));
    const float = Math.sin(t * 1.6) * 8;
    const jx = shake * Math.sin(t * 61), jy = shake * Math.cos(t * 53);
    const sc = lerp(0.6, 0.84, backIn) + 0.06 * Math.sin(Math.PI * fp);
    const loreFade = seg(t, TL.lore[0], TL.lore[0] + 0.4);
    const toSide = eInOut(seg(t, TL.lore[1] - 0.2, TL.comment + 0.4));
    show(back, backIn * (angle < 90 ? 1 : 0), `translate(${jx}px, ${(1 - backIn) * 120 + float + jy}px) perspective(1600px) rotateY(${angle}deg) scale(${sc})`);
    const endOut = seg(t, TL.end - 0.4, TL.end);
    show(card, (angle >= 90 ? 1 : 0) * (1 - 0.85 * loreFade * (1 - toSide)) * (1 - toSide) * (1 - endOut),
      `translate(0px, ${float}px) perspective(1600px) rotateY(${angle - 180 + Math.sin((t - TL.reveal) * 0.9) * 2.5 * (angle >= 180 ? 1 : 0)}deg) scale(${sc * (1 - 0.05 * loreFade)})`);
    card.style.filter = loreFade > 0 ? `blur(${loreFade * 8}px)` : "none";
    L.shineAt(card, t, TL.flip[1], TL.flip[1] + 0.9);
    show(prompt, win(t, TL.prompt, TL.lore[0] + 0.2, 0.5, 0.4), `translateY(${(1 - eOutQuint(seg(t, TL.prompt, TL.prompt + 0.6))) * 30}px)`);
    L.eyebrowAt(ebPrompt, t, TL.prompt, TL.lore[0] + 0.2);
    const stIn = eOutQuint(seg(t, TL.strip, TL.strip + 0.8));
    show(strip, stIn * (1 - loreFade), `translateY(${(1 - stIn) * 60}px)`);
    show(loreBig, win(t, TL.lore[0] + 0.1, TL.lore[1] + 0.1, 0.4, 0.35), `scale(${lerp(0.94, 1.03, seg(t, TL.lore[0], TL.lore[1]))})`);
    words(comment, t, TL.comment, TL.end - 0.4, 0.09, 0.7);
    // The dial spins through 1 to 10 and lands on "?".
    const dIn = eOutBack(seg(t, TL.ticker[0] - 0.3, TL.ticker[0] + 0.3), 1.8);
    show(dial, win(t, TL.ticker[0] - 0.3, TL.end, 0.2, 0.4), `scale(${dIn})`);
    const tp = seg(t, TL.ticker[0], TL.ticker[1]);
    num.textContent = tp >= 1 ? "?" : String(1 + (Math.floor(Math.pow(tp, 0.6) * 27) % 10));
    num.style.transform = `scale(${tp >= 1 ? 1 + 0.25 * Math.exp(-(t - TL.ticker[1]) * 6) : 1})`;
    show(dialSub, win(t, TL.ticker[1] + 0.1, TL.end, 0.4, 0.4), `translateY(${(1 - eOutQuint(seg(t, TL.ticker[1] + 0.1, TL.ticker[1] + 0.7))) * 20}px)`);
    end(t, TL.end);

    L.fxClear();
    L.flash(t, TL.reveal, 540, 820, 0.6);
    L.ring(t, TL.reveal, 540, 820, 1500);
    L.burst(t, TL.reveal, 540, 820, { n: 220, seed: 51, rgb: tint });
    L.burst(t, TL.ticker[1], 540, 900, { n: 90, seed: 52, power: 0.5 });
    L.fxEnd();
    return 0;
  });
})();
