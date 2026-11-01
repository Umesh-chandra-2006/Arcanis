// Video 2: "I asked for Fire three ways." Scary, cute, poetic: one element, three different spells.
(function () {
  const L = window.LIB, TL = window.TL, D = L.D;
  const { seg, lerp, eOutQuint, eInOut, eInCubic, win, show, words } = L;
  const moods = D.moods;
  const fire = L.hexRgb(moods[0].accent);

  // Card centre for a given position and scale (cards are 600x860, centred at 540,820 untransformed).
  const at = (cx, cy, s, extra = "") => `translate(${cx - 540}px, ${cy - 820}px) ${extra} scale(${s})`;

  const ROW_X = [250, 540, 830];
  const hook = L.caption("I ASKED FOR *FIRE*|THREE WAYS.", 300, 92);
  const ebHook = L.eyebrow("One element &middot; Three moods", 560);
  const beats = moods.map((c, i) => ({
    c,
    label: L.caption(`*${c.mood.toUpperCase()}.*`, 215, 96),
    eb: L.eyebrow(`${["I", "II", "III"][i]} &middot; Mood`, 160),
    lab: L.lab(c.prompt, ["&#9679; Fire", c.category], 420, 54),
    card: L.card(c),
    strip: L.strip(c),
    slot: L.place(L.el("div", "abs smallcaps", `${c.mood}<div style="margin-top:10px;font-size:17px;letter-spacing:.2em;color:#b9ad95">${c.category} &middot; ${c.strain}</div>`), { left: `${ROW_X[i] - 150}px`, width: "300px", textAlign: "center", top: "1130px", fontSize: "24px", color: "#f3d98f" }),
  }));
  const rowCap = L.caption("SAME ELEMENT.|*THREE* DIFFERENT SPELLS.", 230, 70);
  const end = L.endCard("What would yours be?");

  L.ready(function (t) {
    const inBeat = TL.beats.some((b) => t >= b + TL.reveal && t < b + TL.beatLen);
    L.background(t, { glow: 0.8 + (inBeat ? 0.25 : 0), tint: fire, tintAmount: win(t, TL.beats[0], TL.row + 2, 0.6, 0.8) * 0.8, dim: 0 });

    words(hook, t, TL.hook, TL.hookOut, 0.07, 0.6);
    L.eyebrowAt(ebHook, t, 0.5, TL.hookOut + 0.3);

    beats.forEach((b, i) => {
      const s = TL.beats[i];
      const rv = s + TL.reveal;
      words(b.label, t, s, s + TL.beatLen - 0.35, 0.07, 0.55);
      L.eyebrowAt(b.eb, t, s, s + TL.beatLen - 0.2);
      // Lab types, presses, dissolves.
      const labIn = eOutQuint(seg(t, s, s + 0.5));
      const labOut = seg(t, s + TL.press + 0.15, s + TL.reveal);
      show(b.lab.el, labIn * (1 - labOut), `translateY(${(1 - labIn) * 50}px) scale(${1 - 0.04 * labOut})`);
      b.lab.el.style.filter = labOut > 0 ? `blur(${labOut * 12}px)` : "none";
      b.lab.at(t, s + TL.type[0], s + TL.type[1], s + TL.press);
      // Card reveal, hold, then fly down into its slot in the row.
      const enter = eOutQuint(seg(t, rv, rv + 0.9));
      const toSlot = eInOut(seg(t, s + TL.beatLen - 0.5, s + TL.beatLen));
      const toRow = eInOut(seg(t, TL.row, TL.row + 0.9));
      const slotY = 1300, rowY = 900;
      const big = { x: 540, y: 800, s: lerp(0.6, 0.82, enter) };
      const small = { x: ROW_X[i], y: slotY, s: 0.3 };
      const row = { x: ROW_X[i], y: rowY, s: 0.44 };
      let x = lerp(big.x, small.x, toSlot), y = lerp(big.y, small.y, toSlot), sc = lerp(big.s, small.s, toSlot);
      x = lerp(x, row.x, toRow); y = lerp(y, row.y, toRow); sc = lerp(sc, row.s, toRow);
      const rotY = lerp(-24, 0, enter) + Math.sin((t - rv) * 0.9) * 2.5 * (1 - toSlot);
      const float = Math.sin((t - rv) * 1.5 + i) * 6;
      const endOut = seg(t, TL.end - 0.4, TL.end);
      // Between its beat and the final row the card is parked out of sight.
      const parked = Math.min(1, 1 - toSlot + toRow);
      show(b.card, seg(t, rv, rv + 0.15) * parked * (1 - endOut), at(x, y + float, sc, `perspective(1600px) rotateY(${rotY}deg)`));
      L.shineAt(b.card, t, rv + 0.4, rv + 1.3);
      const stripIn = eOutQuint(seg(t, rv + 0.6, rv + 1.3));
      const stripOut = seg(t, s + TL.beatLen - 0.6, s + TL.beatLen - 0.3);
      show(b.strip, stripIn * (1 - stripOut), `translateY(${(1 - stripIn) * 60}px)`);
      b.strip.style.top = "1215px";
      const slotO = seg(t, TL.row + 0.6, TL.row + 1.1) * (1 - endOut);
      show(b.slot, slotO, `translateY(${(1 - slotO) * 20}px)`);
    });
    words(rowCap, t, TL.rowCap, TL.end - 0.45, 0.07, 0.6);
    end(t, TL.end);

    L.fxClear();
    beats.forEach((b, i) => {
      const rv = TL.beats[i] + TL.reveal;
      L.flash(t, rv, 540, 800, 0.55, "255,200,150");
      L.ring(t, rv, 540, 800, 1300, "245,180,120");
      L.burst(t, rv, 540, 800, { n: 150, seed: 30 + i, rgb: fire, power: 0.9 });
    });
    L.fxEnd();
    return 0;
  });
})();
