/* ============================================================
   WEALTHDEMO — What a Loss Really Costs

   Lose 30% and you need 42.9% back. That is the whole idea, and
   a two-box calculator can print it. What it can't do is make
   anyone FEEL it, or answer the question that follows:

     · why isn't +30% enough to undo -30%?
     · how long until I'm actually back?
     · how many years of growth did this just erase?
     · and how fast does it get worse as the fall gets deeper?

   The maths is one line — gain = loss / (1 - loss). Everything
   else here exists to make that line land.
   ============================================================ */
(function () {
  const $ = function (id) { return document.getElementById(id); };
  if (!$("lAmt")) return;

  const usd = function (n) {
    const a = Math.abs(n);
    return (n < 0 ? "−$" : "$") + Math.round(a).toLocaleString("en-US");
  };
  const usd0 = function (n) {
    const a = Math.abs(n);
    if (a >= 1000000) return "$" + (n / 1000000).toFixed(a >= 10000000 ? 0 : 1) + "M";
    if (a >= 1000) return "$" + Math.round(n / 1000) + "k";
    return "$" + Math.round(n);
  };
  const pct = function (f) {
    const one = (f * 100).toFixed(1);
    return (one.slice(-2) === ".0" ? (f * 100).toFixed(0) : one) + "%";
  };
  const yrs = function (n) { return n.toFixed(1); };

  const FIELDS = ["lAmt", "lLoss", "lGrow"];
  const STORE = "wealthdemo.tool.loss";
  const DEFAULTS = { lAmt: 100000, lLoss: 30, lGrow: 7 };

  function num(id, d) { const v = parseFloat($(id).value); return isFinite(v) ? v : d; }

  function read() {
    const loss = Math.max(0, Math.min(95, num("lLoss", 30))) / 100;
    return {
      amt: Math.max(0, num("lAmt", 100000)),
      loss: loss,
      grow: Math.max(0, Math.min(20, num("lGrow", 7))) / 100
    };
  }

  /* ---------- the one line of maths, and what follows from it ---------- */
  function work(p) {
    const after = p.amt * (1 - p.loss);
    const lost = p.amt - after;
    const need = p.loss < 1 ? p.loss / (1 - p.loss) : Infinity;
    const years = (p.grow > 0 && p.loss > 0 && p.loss < 1)
      ? Math.log(1 / (1 - p.loss)) / Math.log(1 + p.grow) : (p.loss > 0 ? Infinity : 0);
    const sameBack = after * (1 + p.loss);      /* lose X%, then gain X% back */
    return {
      after: after, lost: lost, need: need, years: years,
      sameBack: sameBack, stillShort: p.amt - sameBack
    };
  }

  /* ---------- the fall and the climb ---------- */
  function geom() {
    return window.innerWidth < 720
      ? { CW: 420, CH: 400, PL: 16, PR: 16, PT: 54, PB: 62, fs: 11, big: 14 }
      : { CW: 1040, CH: 380, PL: 40, PR: 40, PT: 56, PB: 64, fs: 12.5, big: 17 };
  }

  function chart(p, w) {
    const g = geom(), CW = g.CW, CH = g.CH;
    const plotW = CW - g.PL - g.PR, plotH = CH - g.PT - g.PB;
    const top = Math.max(p.amt, 1);
    const H = function (v) { return Math.max(2, v / top * plotH); };
    const Y = function (v) { return g.PT + plotH - H(v); };

    const slot = plotW / 3;
    const barW = Math.min(slot * 0.52, 150);
    const cx = function (i) { return g.PL + slot * (i + 0.5); };
    const base = g.PT + plotH;

    function bar(i, v, cls) {
      return '<rect class="' + cls + '" x="' + (cx(i) - barW / 2).toFixed(1) + '" y="' + Y(v).toFixed(1) +
        '" width="' + barW.toFixed(1) + '" height="' + H(v).toFixed(1) + '" rx="6"/>';
    }
    function label(i, title, value, cls) {
      return '<text class="lc-name" x="' + cx(i).toFixed(1) + '" y="' + (base + 22) + '" text-anchor="middle">' + title + '</text>' +
        '<text class="lc-val ' + (cls || "") + '" x="' + cx(i).toFixed(1) + '" y="' + (base + 44) + '" text-anchor="middle">' + value + '</text>';
    }

    /* the arrow between two bars: same dollars, very different percentages */
    function arrow(i, fromV, toV, cls, big, small) {
      const x = (cx(i) + cx(i + 1)) / 2;
      const y1 = Y(fromV), y2 = Y(toV);
      const down = y2 > y1;
      const head = down
        ? 'M' + (x - 6) + ',' + (y2 - 9) + ' L' + x + ',' + y2 + ' L' + (x + 6) + ',' + (y2 - 9)
        : 'M' + (x - 6) + ',' + (y2 + 9) + ' L' + x + ',' + y2 + ' L' + (x + 6) + ',' + (y2 + 9);
      /* the line is drawn in two pieces so it never runs through its own label */
      const mid = (y1 + y2) / 2;
      const gapTop = mid - 26, gapBot = mid + 18;
      const seg = function (a, bq) {
        return (Math.abs(bq - a) < 2) ? "" :
          '<line class="' + cls + '-line" x1="' + x + '" y1="' + a.toFixed(1) + '" x2="' + x + '" y2="' + bq.toFixed(1) + '"/>';
      };
      const lines = down
        ? seg(y1, gapTop) + seg(gapBot, y2)
        : seg(y1, gapBot) + seg(gapTop, y2);
      return lines +
        '<path class="' + cls + '-head" d="' + head + '"/>' +
        '<line class="lc-tie" x1="' + (cx(i) + barW / 2).toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x + '" y2="' + y1.toFixed(1) + '"/>' +
        '<line class="lc-tie" x1="' + x + '" y1="' + y2.toFixed(1) + '" x2="' + (cx(i + 1) - barW / 2).toFixed(1) + '" y2="' + y2.toFixed(1) + '"/>' +
        '<text class="lc-big ' + cls + '" x="' + x + '" y="' + ((y1 + y2) / 2 - 6).toFixed(1) + '" text-anchor="middle">' + big + '</text>' +
        '<text class="lc-small" x="' + x + '" y="' + ((y1 + y2) / 2 + 12).toFixed(1) + '" text-anchor="middle">' + small + '</text>';
    }

    const backTo = w.need === Infinity ? p.amt : p.amt;
    const climbLabel = w.need === Infinity ? "never" : "+" + pct(w.need);

    return '<svg viewBox="0 0 ' + CW + ' ' + CH + '" class="loss-chart" role="img" aria-label="The fall and the climb back">' +
      '<defs>' +
        '<linearGradient id="lcGreen" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%" stop-color="#14956f"/><stop offset="100%" stop-color="#0b5e4a"/>' +
        '</linearGradient>' +
        '<linearGradient id="lcRed" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%" stop-color="#cf4257"/><stop offset="100%" stop-color="#8f2031"/>' +
        '</linearGradient>' +
      '</defs>' +
      '<line class="lc-base" x1="' + g.PL + '" y1="' + base + '" x2="' + (CW - g.PR) + '" y2="' + base + '"/>' +
      '<line class="lc-even" x1="' + g.PL + '" y1="' + Y(p.amt).toFixed(1) + '" x2="' + (CW - g.PR) + '" y2="' + Y(p.amt).toFixed(1) + '"/>' +
      '<text class="lc-even-lab" x="' + (CW - g.PR) + '" y="' + (Y(p.amt) - 8).toFixed(1) + '" text-anchor="end">back to even</text>' +
      bar(0, p.amt, "lc-start") +
      bar(1, w.after, "lc-after") +
      '<rect class="lc-ghost" x="' + (cx(2) - barW / 2).toFixed(1) + '" y="' + Y(backTo).toFixed(1) +
        '" width="' + barW.toFixed(1) + '" height="' + H(backTo).toFixed(1) + '" rx="6"/>' +
      bar(2, w.after, "lc-after") +
      arrow(0, p.amt, w.after, "lc-fall", "−" + pct(p.loss), usd(w.lost) + " gone") +
      arrow(1, w.after, backTo, "lc-climb", climbLabel, "the same " + usd(w.lost) + " back") +
      label(0, "Before", usd(p.amt)) +
      label(1, "After the fall", usd(w.after), "is-bad") +
      label(2, "Back to even", usd(p.amt)) +
      '</svg>';
  }

  /* ---------- the ladder ---------- */
  const STEPS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70];
  function ladder(p) {
    const el = $("ladder");
    const maxG = 70 / 30;   /* the 70% row needs 233%, the widest bar */
    el.innerHTML =
      '<div class="lad-head"><span>Fall</span><span></span><span>Gain needed</span><span>Years back</span></div>' +
      STEPS.map(function (s) {
        const l = s / 100, g = l / (1 - l);
        const t = p.grow > 0 ? Math.log(1 / (1 - l)) / Math.log(1 + p.grow) : Infinity;
        const live = Math.abs(s - p.loss * 100) < 0.51;
        return '<button type="button" class="lad-row' + (live ? " is-live" : "") + '" data-loss="' + s + '">' +
          '<span class="lad-rate">−' + s + '%</span>' +
          '<span class="lad-pair">' +
            '<i class="lad-b down" style="width:' + (l / (maxG) * 100).toFixed(1) + '%"></i>' +
            '<i class="lad-b up" style="width:' + Math.min(100, g / maxG * 100).toFixed(1) + '%"></i>' +
          '</span>' +
          '<span class="lad-n strong">+' + pct(g) + '</span>' +
          '<span class="lad-n">' + (isFinite(t) ? yrs(t) + " yrs" : "—") + '</span>' +
        '</button>';
      }).join("");
  }

  /* ---------- render ---------- */
  function run() {
    const p = read();
    const w = work(p);

    /* the answer */
    if (p.loss <= 0) {
      $("ansHeadline").innerHTML = "…nothing is lost, so nothing has to be made back.";
      $("ansSub").innerHTML = "Drag the fall across to see how quickly the climb back gets steeper.";
    } else if (p.loss >= 0.95) {
      $("ansHeadline").innerHTML = "…you'd need a <span class=\"hot\">" + pct(w.need) + "</span> gain to get back.";
      $("ansSub").innerHTML = "Almost everything is gone, so almost anything is needed to replace it.";
    } else {
      $("ansHeadline").innerHTML = "…you need <span class=\"hot\">" + pct(w.need) +
        "</span> back, not " + pct(p.loss) + ".";
      $("ansSub").innerHTML = "The same <b>" + usd(w.lost) + "</b> — but it has to be earned on " +
        usd(w.after) + " instead of " + usd(p.amt) + ".";
    }

    /* three cards */
    const cards = [
      { tint: "blush", bad: true, label: "What's left", big: usd(w.after),
        sub: usd(w.lost) + " gone", footL: "That's a fall of", foot: pct(p.loss) },
      { tint: "sun", bad: true, label: "Gain needed to get back", big: p.loss < 1 ? "+" + pct(w.need) : "—",
        sub: p.loss > 0 ? (w.need / p.loss).toFixed(2) + "× the size of the fall" : "nothing to make back",
        footL: "In dollars", foot: usd(w.lost) },
      { tint: "ice", label: "Years to climb back", big: isFinite(w.years) ? yrs(w.years) : "—",
        sub: p.grow > 0 ? "if it grows " + pct(p.grow) + " a year from here" : "nothing is growing",
        footL: "Years of growth wiped out", foot: isFinite(w.years) ? yrs(w.years) : "—" }
    ];
    const grid = $("cardGrid");
    grid.innerHTML = "";
    cards.forEach(function (c) {
      const el = document.createElement("article");
      el.className = "clock" + (c.bad ? " is-bad" : "");
      el.setAttribute("data-tint", c.tint);
      el.innerHTML =
        '<header><span class="clock-dot"></span><b></b></header>' +
        '<div class="clock-big"><b></b></div>' +
        '<small class="clock-sub"></small>' +
        '<footer><span></span><b></b></footer>';
      el.querySelector("header b").textContent = c.label;
      el.querySelector(".clock-big b").textContent = c.big;
      el.querySelector(".clock-sub").textContent = c.sub;
      el.querySelector("footer span").textContent = c.footL;
      el.querySelector("footer b").textContent = c.foot;
      grid.appendChild(el);
    });

    /* the picture */
    $("chartWrap").innerHTML = chart(p, w);
    $("chartSub").textContent = p.loss > 0
      ? "Same " + usd(w.lost) + " on the way down and on the way back — but not the same percentage."
      : "Nothing has fallen, so there is nothing to climb.";

    /* the trap */
    const trap = $("trap");
    if (p.loss > 0 && p.loss < 1) {
      trap.hidden = false;
      $("trapTitle").textContent = "Down " + pct(p.loss) + ", then up " + pct(p.loss) + " — and you're still short.";
      $("trapBody").textContent = "Most people assume the two cancel out. They don't. " + usd(p.amt) +
        " falls to " + usd(w.after) + ", and a " + pct(p.loss) + " gain on " + usd(w.after) +
        " only brings it to " + usd(w.sameBack) + ". You'd still be " + usd(w.stillShort) + " down.";
      $("trapA").textContent = usd(w.sameBack);
      $("trapB").textContent = usd(w.stillShort);
    } else {
      trap.hidden = true;
    }

    /* what this means */
    const dx = diagnose(p, w);
    $("dxTitle").textContent = dx.title;
    $("dxBody").textContent = dx.body;
    $("dxS1").textContent = dx.s1; $("dxS1L").textContent = dx.s1l; $("dxS1").className = "dx-figure " + dx.s1t;
    $("dxS2").textContent = dx.s2; $("dxS2L").textContent = dx.s2l; $("dxS2").className = "dx-figure " + dx.s2t;
    $("dxS1U").textContent = dx.s1u || ""; $("dxS2U").textContent = dx.s2u || "";

    ladder(p);

    /* say it */
    let say;
    if (p.loss <= 0) {
      say = "“Nothing's been lost here. But drag that down even a little and watch how much faster the climb back gets than the fall.”";
    } else if (!isFinite(w.years)) {
      say = "“You're down " + pct(p.loss) + ", which needs " + pct(w.need) +
            " back just to break even. With nothing growing, there's no route home at all.”";
    } else {
      say = "“You lost " + pct(p.loss) + ". Getting back to even isn't " + pct(p.loss) + " — it's " +
            pct(w.need) + ", because you're earning it on the smaller number. At " + pct(p.grow) +
            " a year that's " + yrs(w.years) + " years of growth just to stand still. Not getting there faster. Getting back to where you already were.”";
    }
    $("sayIt").textContent = say;

    paintSliders();
    paintChips();
    if (window.WD && window.WD.explain) window.WD.explain.refresh();
    save();
  }

  function diagnose(p, w) {
    if (p.loss <= 0) {
      return {
        title: "Nothing has fallen yet.",
        body: "Move the fall across and the gap between the two numbers opens up fast. A 10% fall needs 11% back. A 50% fall needs 100%.",
        s1: "+11%", s1l: "To recover a 10% fall", s1t: "warn",
        s2: "+100%", s2l: "To recover a 50% fall", s2t: "bad"
      };
    }
    if (p.loss >= 0.5) {
      const mult = 1 / (1 - p.loss);
      return {
        title: "You'd have to turn " + usd(w.after) + " back into " + usd(p.amt) + ".",
        body: "That is " + mult.toFixed(1) + " times what's left, from a " + pct(p.loss) +
              " fall. A deep fall is a different kind of problem from a shallow one \u2014 the climb back stops being a percentage and starts being a multiple.",
        s1: "+" + pct(w.need), s1l: "Needed to get back", s1t: "bad",
        s2: isFinite(w.years) ? yrs(w.years) + " yrs" : "—", s2l: "At " + pct(p.grow) + " a year", s2t: "bad", s2u: "of growth, just to break even"
      };
    }
    return {
      title: "The climb is always steeper than the fall.",
      body: "You lose " + pct(p.loss) + " of " + usd(p.amt) + ", but you have to make " + pct(w.need) +
            " on " + usd(w.after) + ". Same " + usd(w.lost) + " either way — it is the smaller starting point that makes the percentage bigger." +
            (isFinite(w.years) ? " At " + pct(p.grow) + " a year, that is " + yrs(w.years) + " years of growth spent getting back to where you already were." : ""),
      s1: "+" + pct(w.need - p.loss), s1l: "Extra, beyond the fall itself", s1t: "warn", s1u: "on top of " + pct(p.loss),
      s2: isFinite(w.years) ? yrs(w.years) + " yrs" : "—", s2l: "Years of growth it costs", s2t: "bad", s2u: "at " + pct(p.grow) + " a year"
    };
  }

  function paintSliders() {
    [["lAmtSlide", "lAmt"], ["lLossSlide", "lLoss"], ["lGrowSlide", "lGrow"]].forEach(function (pair) {
      const sl = $(pair[0]), input = $(pair[1]);
      if (!sl || !input) return;
      const v = parseFloat(input.value);
      if (isFinite(v)) sl.value = String(Math.min(parseFloat(sl.max), Math.max(parseFloat(sl.min), v)));
      const f = (parseFloat(sl.value) - sl.min) / (sl.max - sl.min) * 100;
      sl.style.setProperty("--fill", f.toFixed(2) + "%");
    });
  }
  function paintChips() {
    document.querySelectorAll(".chips button[data-set]").forEach(function (b) {
      const cur = parseFloat($(b.getAttribute("data-set")).value);
      b.classList.toggle("on", Math.abs(cur - parseFloat(b.getAttribute("data-val"))) < 0.001);
    });
  }

  /* ---------- plumbing ---------- */
  function save() {
    const o = {}; FIELDS.forEach(function (f) { o[f] = $(f).value; });
    try { localStorage.setItem(STORE, JSON.stringify(o)); } catch (e) {}
  }
  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(STORE) || "null"); } catch (e) {}
    if (!s) return;
    FIELDS.forEach(function (f) { if (typeof s[f] === "string" && s[f] !== "") $(f).value = s[f]; });
  }

  FIELDS.forEach(function (f) {
    $(f).addEventListener("input", run);
    $(f).addEventListener("change", run);
  });
  [["lAmtSlide", "lAmt"], ["lLossSlide", "lLoss"], ["lGrowSlide", "lGrow"]].forEach(function (pair) {
    const sl = $(pair[0]), input = $(pair[1]);
    if (!sl || !input) return;
    sl.addEventListener("input", function () { input.value = sl.value; run(); });
  });
  document.querySelectorAll(".chips button[data-set]").forEach(function (b) {
    b.addEventListener("click", function () {
      $(b.getAttribute("data-set")).value = b.getAttribute("data-val");
      run();
    });
  });
  $("ladder").addEventListener("click", function (e) {
    const b = e.target.closest("[data-loss]");
    if (!b) return;
    $("lLoss").value = b.getAttribute("data-loss");
    run();
  });

  const moreBtn = $("moreBtn"), moreMenu = $("moreMenu");
  if (moreBtn && moreMenu) {
    moreBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      moreMenu.toggleAttribute("hidden", !moreMenu.hasAttribute("hidden"));
    });
    document.addEventListener("click", function () { moreMenu.setAttribute("hidden", ""); });
    moreMenu.addEventListener("click", function (e) { e.stopPropagation(); });
  }
  if ($("printBtn")) $("printBtn").addEventListener("click", function () { window.print(); });
  function resetAll() {
    FIELDS.forEach(function (f) { $(f).value = DEFAULTS[f]; });
    if (moreMenu) moreMenu.setAttribute("hidden", "");
    run();
  }
  if ($("resetBtn")) $("resetBtn").addEventListener("click", resetAll);
  if ($("resetBtn2")) $("resetBtn2").addEventListener("click", resetAll);

  let rt = null, wasNarrow = window.innerWidth < 720;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      const n = window.innerWidth < 720;
      if (n !== wasNarrow) { wasNarrow = n; run(); }
    }, 140);
  });

  if ($("sendBtn")) $("sendBtn").addEventListener("click", function () {
    const p = read(), w = work(p);
    const btn = $("sendBtn"), old = btn.innerHTML;
    const lines = ["What a Loss Really Costs — WEALTHDEMO", "",
      usd(p.amt) + " falls " + pct(p.loss), "",
      $("ansHeadline").textContent, $("ansSub").textContent, "",
      "WHAT'S LEFT            " + usd(w.after) + "   (" + usd(w.lost) + " gone)",
      "GAIN NEEDED TO GET BACK  +" + pct(w.need) + "   (" + (w.need / Math.max(0.0001, p.loss)).toFixed(2) + "x the fall)",
      "YEARS TO CLIMB BACK     " + (isFinite(w.years) ? yrs(w.years) + " at " + pct(p.grow) + " a year" : "—"), "",
      "THE TRAP",
      "  Down " + pct(p.loss) + " then up " + pct(p.loss) + " gets you to " + usd(w.sameBack) +
        " — still " + usd(w.stillShort) + " short.", "",
      "WHAT THIS MEANS", "  " + $("dxTitle").textContent, "  " + $("dxBody").textContent, "",
      $("sayIt").textContent, "",
      "Educational illustration only. This shows the arithmetic of a fall and the gain needed to recover it. It does not predict market returns, and it does not recommend any particular investment or insurance product. Tax, fees and money paid in or taken out along the way are not included. Speak to a qualified financial professional."];
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lines.join("\n")).then(function () {
        btn.classList.add("is-done"); btn.textContent = "Summary copied";
        setTimeout(function () { btn.innerHTML = old; btn.classList.remove("is-done"); }, 2600);
      }, function () { btn.textContent = "Copy blocked"; setTimeout(function () { btn.innerHTML = old; }, 2000); });
    }
  });

  load();
  run();
})();
