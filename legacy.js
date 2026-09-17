/* ============================================================
   WEALTHDEMO — What Would You Leave Behind?

   Own plus insurance minus debts is the right shape and the wrong
   number, because an estate does not transfer whole. Three things
   come off between the statement and the family:

     · a retirement account is taxed as income when an heir empties
       it, so a $400,000 401(k) is not $400,000 to the children
     · settling an estate costs money, and most of it is charged
       against what goes through probate
     · debts and final expenses are due in months, not years

   That last one is the quiet one. A family can be well provided
   for on paper and still have to sell the house in March, because
   almost nothing they inherited was cash.
   ============================================================ */
(function () {
  const $ = function (id) { return document.getElementById(id); };
  if (!$("gHome")) return;

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

  const FIELDS = ["gHome", "gRetire", "gSave", "gOther", "gLife",
                  "gDebt", "gFinal", "gTax", "gCost", "gGoal"];
  const STORE = "wealthdemo.tool.legacy";
  const DEFAULTS = { gHome: 250000, gRetire: 400000, gSave: 150000, gOther: 0, gLife: 100000,
                     gDebt: 300000, gFinal: 15000, gTax: 24, gCost: 3, gGoal: 1000000 };

  function num(id, d) { const v = parseFloat($(id).value); return isFinite(v) ? v : d; }

  function read() {
    return {
      home: Math.max(0, num("gHome", 250000)),
      retire: Math.max(0, num("gRetire", 400000)),
      save: Math.max(0, num("gSave", 150000)),
      other: Math.max(0, num("gOther", 0)),
      life: Math.max(0, num("gLife", 100000)),
      debt: Math.max(0, num("gDebt", 300000)),
      final: Math.max(0, num("gFinal", 15000)),
      tax: Math.max(0, Math.min(50, num("gTax", 24))) / 100,
      cost: Math.max(0, Math.min(15, num("gCost", 3))) / 100,
      goal: Math.max(0, num("gGoal", 1000000))
    };
  }

  function work(p) {
    const gross = p.home + p.retire + p.save + p.other + p.life;
    /* life insurance with a named beneficiary usually goes straight to
       the person and skips the settlement process */
    const probated = Math.max(0, gross - p.life);
    const taxBill = p.retire * p.tax;
    const costs = probated * p.cost;
    const takenOff = p.debt + p.final + taxBill + costs;
    const net = Math.max(0, gross - takenOff);
    const naive = Math.max(0, gross - p.debt);     /* the simple sum */
    const gap = Math.max(0, p.goal - net);

    /* money the family can actually get to in the first few months,
       against the bills that arrive in the same window. An inherited
       retirement account counts, but only at what survives the tax. */
    const liquidNow = p.save + p.life + p.retire * (1 - p.tax);
    const tiedUp = p.home + p.other;
    const dueSoon = p.debt + p.final + costs;
    const shortfall = Math.max(0, dueSoon - liquidNow);

    const assets = [
      { key: "home", name: "Home equity", v: p.home, taxed: 0, liquid: false, cls: "lg-home" },
      { key: "retire", name: "Retirement account", v: p.retire, taxed: p.tax, liquid: true, tag: "cash, after tax", cls: "lg-retire" },
      { key: "save", name: "Savings & investments", v: p.save, taxed: 0, liquid: true, cls: "lg-save" },
      { key: "other", name: "Other property", v: p.other, taxed: 0, liquid: false, cls: "lg-other" },
      { key: "life", name: "Life insurance", v: p.life, taxed: 0, liquid: true, cls: "lg-life", noProbate: true }
    ];
    assets.forEach(function (a) {
      const afterTax = a.v * (1 - a.taxed);
      const c = a.noProbate ? 0 : a.v * p.cost;
      a.reaches = Math.max(0, afterTax - c);
      a.perDollar = a.v > 0 ? a.reaches / a.v : 1;
    });

    const cuts = [
      { name: "Debts settled", v: p.debt },
      { name: "Final expenses", v: p.final },
      { name: "Heirs' income tax", v: taxBill, note: pct(p.tax) + " on the retirement account" },
      { name: "Settling the estate", v: costs, note: pct(p.cost) + " of what goes through probate" }
    ].filter(function (c) { return c.v > 0; });

    return {
      gross: gross, taxBill: taxBill, costs: costs, takenOff: takenOff,
      net: net, naive: naive, gap: gap, overstate: naive - net,
      liquidNow: liquidNow, tiedUp: tiedUp, dueSoon: dueSoon, shortfall: shortfall,
      assets: assets, cuts: cuts
    };
  }

  /* ---------- the picture: on paper, taken off, what arrives ---------- */
  function geom() {
    return window.innerWidth < 820
      ? { CW: 440, CH: 420, PL: 14, PR: 14, PT: 34, PB: 76 }
      : { CW: 1040, CH: 400, PL: 40, PR: 40, PT: 34, PB: 82 };
  }

  function chart(p, w) {
    const g = geom(), CW = g.CW, CH = g.CH;
    const plotW = CW - g.PL - g.PR, plotH = CH - g.PT - g.PB;
    const top = Math.max(w.gross, p.goal, 1);
    const base = g.PT + plotH;
    const H = function (v) { return (v / top) * plotH; };
    const Y = function (v) { return base - H(v); };

    const slot = plotW / 3;
    const bw = Math.min(slot * 0.5, 150);
    const cx = function (i) { return g.PL + slot * (i + 0.5); };

    function stack(i, items, fallbackCls) {
      let out = "", run = 0;
      items.forEach(function (it) {
        if (it.v <= 0) return;
        const h = H(it.v);
        out += '<rect class="' + (it.cls || fallbackCls) + '" x="' + (cx(i) - bw / 2).toFixed(1) +
          '" y="' + Y(run + it.v).toFixed(1) + '" width="' + bw.toFixed(1) +
          '" height="' + Math.max(1.5, h).toFixed(1) + '" rx="3"/>';
        if (h > 17) {
          out += '<text class="lg-in" x="' + cx(i).toFixed(1) + '" y="' + (Y(run + it.v) + h / 2 + 4).toFixed(1) +
            '" text-anchor="middle">' + usd0(it.v) + '</text>';
        }
        run += it.v;
      });
      return out;
    }

    const goalLine = p.goal > 0
      ? '<line class="lg-goal" x1="' + g.PL + '" y1="' + Y(p.goal).toFixed(1) + '" x2="' + (CW - g.PR) +
        '" y2="' + Y(p.goal).toFixed(1) + '"/>' +
        '<text class="lg-goal-lab" x="' + (CW - g.PR) + '" y="' + (Y(p.goal) - 8).toFixed(1) +
        '" text-anchor="end">what you\'d like to leave &middot; ' + usd0(p.goal) + '</text>'
      : "";

    /* the shortfall sits on top of what arrives, dashed */
    const gapBlock = w.gap > 0
      ? '<rect class="lg-gapblock" x="' + (cx(2) - bw / 2).toFixed(1) + '" y="' + Y(p.goal).toFixed(1) +
        '" width="' + bw.toFixed(1) + '" height="' + Math.max(2, H(w.gap)).toFixed(1) + '" rx="3"/>' +
        (H(w.gap) > 20 ? '<text class="lg-gaptxt" x="' + cx(2).toFixed(1) + '" y="' +
          (Y(p.goal) + H(w.gap) / 2 + 4).toFixed(1) + '" text-anchor="middle">short ' + usd0(w.gap) + '</text>' : "")
      : "";

    function cap(i, title, value, cls) {
      return '<text class="lg-cap" x="' + cx(i).toFixed(1) + '" y="' + (base + 24) + '" text-anchor="middle">' + title + '</text>' +
        '<text class="lg-capv ' + (cls || "") + '" x="' + cx(i).toFixed(1) + '" y="' + (base + 47) + '" text-anchor="middle">' + value + '</text>';
    }

    const arrow = function (i) {
      const x = (cx(i) + cx(i + 1)) / 2, y = base - plotH * 0.5;
      return '<path class="lg-arrow" d="M' + (x - 13) + ',' + y + ' L' + (x + 8) + ',' + y +
        ' M' + (x + 2) + ',' + (y - 5) + ' L' + (x + 8) + ',' + y + ' L' + (x + 2) + ',' + (y + 5) + '"/>';
    };

    return '<svg viewBox="0 0 ' + CW + ' ' + CH + '" class="lg-chart" role="img" aria-label="What is left after everything comes off">' +
      goalLine +
      stack(0, w.assets) +
      stack(1, w.cuts, "lg-cut") +
      gapBlock +
      '<rect class="lg-net" x="' + (cx(2) - bw / 2).toFixed(1) + '" y="' + Y(w.net).toFixed(1) +
        '" width="' + bw.toFixed(1) + '" height="' + Math.max(2, H(w.net)).toFixed(1) + '" rx="3"/>' +
      (H(w.net) > 20 ? '<text class="lg-in" x="' + cx(2).toFixed(1) + '" y="' + (Y(w.net) + H(w.net) / 2 + 4).toFixed(1) +
        '" text-anchor="middle">' + usd0(w.net) + '</text>' : "") +
      arrow(0) + arrow(1) +
      cap(0, "On paper", usd(w.gross)) +
      cap(1, "Comes off", "−" + usd(w.takenOff), "is-bad") +
      cap(2, "Reaches them", usd(w.net), "is-good") +
      '<line class="lg-base" x1="' + g.PL + '" y1="' + base + '" x2="' + (CW - g.PR) + '" y2="' + base + '"/>' +
      '</svg>';
  }

  /* ---------- what this means ---------- */
  function diagnose(p, w) {
    if (w.gross <= 0) {
      return {
        title: "Nothing entered yet.",
        body: "Put in what you own on the left and what comes off on the right, and the picture builds as you go.",
        s1: "—", s1l: "Reaches them", s1t: "warn",
        s2: "—", s2l: "Short of your goal", s2t: "warn"
      };
    }
    if (w.shortfall > 0) {
      return {
        title: "They'd have to sell something in a hurry.",
        body: usd(w.dueSoon) + " falls due within months — debts, final expenses and the cost of settling. " +
              "Only " + usd(w.liquidNow) + " of what you leave is money they could get to in that time, so they'd be " +
              usd(w.shortfall) + " short, with " + usd(w.tiedUp) +
              " tied up in property. Forced sales rarely get full price.",
        s1: usd(w.shortfall), s1l: "Short in the first months", s1t: "bad", s1u: "before anything is settled",
        s2: usd(w.tiedUp), s2l: "Tied up in property", s2t: "warn", s2u: "and slow to turn into money"
      };
    }
    if (w.taxBill > 0 && w.taxBill >= w.costs) {
      return {
        title: "The retirement account is the leakiest piece.",
        body: usd(p.retire) + " on the statement, but an heir pays income tax as they empty it. At " + pct(p.tax) +
              " that is " + usd(w.taxBill) + " gone. Of the " + usd(p.retire) + " on the statement, " +
              usd(p.retire - w.taxBill) + " reaches them. Life insurance arrives whole.",
        s1: usd(w.taxBill), s1l: "Tax on the retirement account", s1t: "bad",
        s2: usd(p.retire - w.taxBill), s2l: "What's left of that account", s2t: "warn", s2u: "out of " + usd(p.retire)
      };
    }
    if (w.gap > 0) {
      return {
        title: "You're " + usd(w.gap) + " short of what you'd like to leave.",
        body: "After everything comes off, " + usd(w.net) + " reaches the family against the " + usd(p.goal) +
              " you had in mind. A simple own-minus-owe sum would have said " + usd(w.naive) + " — " +
              usd(w.overstate) + " more than really arrives.",
        s1: usd(w.gap), s1l: "Short of your goal", s1t: "bad",
        s2: usd(w.overstate), s2l: "The simple sum overstates by", s2t: "warn"
      };
    }
    return {
      title: "You're there, with room to spare.",
      body: usd(w.net) + " reaches the family against the " + usd(p.goal) +
            " you wanted — " + usd(w.net - p.goal) + " more. Worth checking the beneficiaries are current and the will says what you think it says.",
      s1: usd(w.net), s1l: "Reaches them", s1t: "good",
      s2: usd(w.net - p.goal), s2l: "Above your goal", s2t: "good"
    };
  }

  /* ---------- render ---------- */
  function run() {
    const p = read();
    const w = work(p);

    /* the answer */
    if (w.gross <= 0) {
      $("ansHeadline").innerHTML = "…fill in what you own to start.";
      $("ansSub").innerHTML = "Everything that comes off in between is on the right.";
    } else if (w.gap > 0) {
      $("ansHeadline").innerHTML = "…<span class=\"hot\">" + usd(w.net) + "</span> would actually reach them.";
      $("ansSub").innerHTML = "Not the <b>" + usd(w.naive) + "</b> a simple own-minus-owe sum gives you — <b>" +
        usd(w.overstate) + "</b> never makes it past tax and the cost of settling.";
    } else {
      $("ansHeadline").innerHTML = "…<span class=\"cool\">" + usd(w.net) + "</span> would reach them.";
      $("ansSub").innerHTML = "That clears the <b>" + usd(p.goal) + "</b> you had in mind.";
    }

    /* the picture */
    $("chartWrap").innerHTML = chart(p, w);

    /* the cuts legend */
    $("cutList").innerHTML = w.cuts.map(function (c) {
      return '<li><span class="cut-dot"></span><b>' + c.name + '</b>' +
        (c.note ? '<em>' + c.note + '</em>' : '') + '<span class="cut-v">−' + usd(c.v) + '</span></li>';
    }).join("") || '<li class="cut-none">Nothing comes off.</li>';

    /* three cards */
    const cards = [
      { tint: "mint", label: "Reaches the family", big: usd(w.net),
        sub: w.gross > 0 ? "out of " + usd(w.gross) + " on paper" : "nothing entered",
        footL: "On paper it looks like", foot: usd(w.gross) },
      { tint: "sun", bad: true, label: "Short of what you wanted", big: w.gap > 0 ? usd(w.gap) : "nothing short",
        sub: w.gap > 0 ? "against a goal of " + usd(p.goal) : "you're above your goal",
        footL: "The simple sum overstates by", foot: usd(w.overstate) },
      { tint: w.shortfall > 0 ? "blush" : "ice", bad: w.shortfall > 0, label: "They could get to, quickly", big: usd(w.liquidNow),
        sub: w.shortfall > 0 ? usd(w.shortfall) + " short of the bills that come first" : "enough to cover what comes first",
        footL: "Due within months", foot: usd(w.dueSoon) }
    ];
    const cg = $("cardGrid");
    cg.innerHTML = "";
    cards.forEach(function (cd) {
      const el = document.createElement("article");
      el.className = "clock" + (cd.bad ? " is-bad" : "");
      el.setAttribute("data-tint", cd.tint);
      el.innerHTML =
        '<header><span class="clock-dot"></span><b></b></header>' +
        '<div class="clock-big"><b></b></div>' +
        '<small class="clock-sub"></small>' +
        '<footer><span></span><b></b></footer>';
      el.querySelector("header b").textContent = cd.label;
      el.querySelector(".clock-big b").textContent = cd.big;
      el.querySelector(".clock-sub").textContent = cd.sub;
      el.querySelector("footer span").textContent = cd.footL;
      el.querySelector("footer b").textContent = cd.foot;
      cg.appendChild(el);
    });

    /* what a dollar of each is really worth */
    const rows = $("perDollar");
    const funded = w.assets.filter(function (a) { return a.v > 0; });
    rows.innerHTML = (funded.length ? funded : w.assets).map(function (a) {
      return '<div class="pd-row' + (a.v <= 0 ? " is-empty" : "") + '">' +
        '<span class="pd-name"><i class="' + a.cls + '"></i>' + a.name + '</span>' +
        '<span class="pd-bar"><i style="width:' + (a.perDollar * 100).toFixed(1) + '%"></i></span>' +
        '<span class="pd-v">' + usd(a.v) + ' <em>&rarr;</em> ' + usd(a.reaches) + '</span>' +
        '<span class="pd-c">' + (a.v - a.reaches > 0 ? "\u2212" + usd(a.v - a.reaches) : "nothing lost") + '</span>' +
        '<span class="pd-tag">' + (a.tag || (a.liquid ? "cash" : "must be sold")) + '</span>' +
        '</div>';
    }).join("");

    /* what closes the gap */
    const cg2 = $("closer");
    if (w.gap > 0) {
      cg2.hidden = false;
      const viaRetire = w.gap / Math.max(0.01, (1 - p.tax) * (1 - p.cost));
      $("clA").textContent = usd(w.gap);
      $("clB").textContent = usd(viaRetire);
      $("clBody").textContent =
        "Life insurance to a named person generally arrives whole and doesn't wait for the estate to settle, so " +
        usd(w.gap) + " of cover delivers " + usd(w.gap) + ". Getting the same " + usd(w.gap) +
        " there through the retirement account instead means saving " + usd(viaRetire) + " — because " +
        pct(p.tax) + " goes to tax and " + pct(p.cost) + " to settling on the way through.";
    } else {
      cg2.hidden = true;
    }

    /* what this means */
    const dx = diagnose(p, w);
    $("dxTitle").textContent = dx.title;
    $("dxBody").textContent = dx.body;
    $("dxS1").textContent = dx.s1; $("dxS1L").textContent = dx.s1l; $("dxS1").className = "dx-figure " + dx.s1t;
    $("dxS2").textContent = dx.s2; $("dxS2L").textContent = dx.s2l; $("dxS2").className = "dx-figure " + dx.s2t;
    $("dxS1U").textContent = dx.s1u || ""; $("dxS2U").textContent = dx.s2u || "";

    /* say it */
    let say;
    if (w.gross <= 0) {
      say = "“Let's put down what you own and see what would really reach them.”";
    } else if (w.shortfall > 0) {
      say = "“On paper you're leaving " + usd(w.net) + ". But " + usd(w.dueSoon) +
            " falls due in the first few months and only " + usd(w.liquidNow) +
            " of it is money they could get to that fast. That's the part families don't see coming — not how much, but how soon.”";
    } else if (w.gap > 0) {
      say = "“Own minus owe says " + usd(w.naive) + ". What actually reaches them is " + usd(w.net) +
            " — " + usd(w.overstate) + " goes to tax and the cost of settling. Against the " + usd(p.goal) +
            " you wanted, that's " + usd(w.gap) + " short.”";
    } else {
      say = "“After everything comes off, " + usd(w.net) + " reaches them — more than the " + usd(p.goal) +
            " you had in mind. The work now is making sure it goes where you intend.”";
    }
    $("sayIt").textContent = say;

    paintSliders();
    if (window.WD && window.WD.explain) window.WD.explain.refresh();
    save();
  }

  const SLIDERS = [["gTaxSlide", "gTax"], ["gCostSlide", "gCost"], ["gGoalSlide", "gGoal"]];
  function paintSliders() {
    SLIDERS.forEach(function (pair) {
      const sl = $(pair[0]), input = $(pair[1]);
      if (!sl || !input) return;
      const v = parseFloat(input.value);
      if (isFinite(v)) sl.value = String(Math.min(parseFloat(sl.max), Math.max(parseFloat(sl.min), v)));
      const f = (parseFloat(sl.value) - sl.min) / (sl.max - sl.min) * 100;
      sl.style.setProperty("--fill", f.toFixed(2) + "%");
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
  SLIDERS.forEach(function (pair) {
    const sl = $(pair[0]), input = $(pair[1]);
    if (!sl || !input) return;
    sl.addEventListener("input", function () { input.value = sl.value; run(); });
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

  let rt = null, wasNarrow = window.innerWidth < 820;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      const n = window.innerWidth < 820;
      if (n !== wasNarrow) { wasNarrow = n; run(); }
    }, 140);
  });

  if ($("sendBtn")) $("sendBtn").addEventListener("click", function () {
    const p = read(), w = work(p);
    const btn = $("sendBtn"), old = btn.innerHTML;
    const lines = ["What Would You Leave Behind? — WEALTHDEMO", "",
      "WHAT YOU OWN"];
    w.assets.forEach(function (a) {
      if (a.v > 0) lines.push("  " + a.name.padEnd(24) + usd(a.v) + "  ->  " + usd(a.reaches) + " reaches them" +
        (a.v - a.reaches > 0 ? "  (loses " + usd(a.v - a.reaches) + ")" : ""));
    });
    lines.push("  " + "ON PAPER".padEnd(24) + usd(w.gross), "", "WHAT COMES OFF");
    w.cuts.forEach(function (c) { lines.push("  " + c.name.padEnd(24) + "-" + usd(c.v) + (c.note ? "  (" + c.note + ")" : "")); });
    lines.push("  " + "TOTAL".padEnd(24) + "-" + usd(w.takenOff), "",
      "REACHES THE FAMILY        " + usd(w.net),
      "A simple own-minus-owe sum would say " + usd(w.naive) + " — " + usd(w.overstate) + " more than arrives.",
      "Your goal " + usd(p.goal) + (w.gap > 0 ? " — short by " + usd(w.gap) : " — met"), "",
      "MONEY THEY COULD GET TO QUICKLY",
      "  Within a few months    " + usd(w.liquidNow),
      "  Tied up in property    " + usd(w.tiedUp),
      "  Due within months      " + usd(w.dueSoon) +
        (w.shortfall > 0 ? "   SHORT BY " + usd(w.shortfall) : "   covered"), "",
      "WHAT THIS MEANS", "  " + $("dxTitle").textContent, "  " + $("dxBody").textContent, "",
      $("sayIt").textContent, "",
      "Educational illustration only. This is not legal, tax, insurance or estate-valuation advice and it is not a quote. Settlement costs, how an inherited retirement account is taxed, and how assets pass all depend on the account, the beneficiary and where you live. Federal and state estate tax, trusts, jointly held property and business valuation are not included. Speak to a qualified attorney and tax professional.");
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
