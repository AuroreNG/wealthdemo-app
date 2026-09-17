/* ============================================================
   WEALTHDEMO — Life Insurance Need (DIME)

   DIME is four numbers added together: Debt, Income, Mortgage,
   Education. It is a good first pass and a bad last word, because
   it quietly assumes two things that are never true:

     · the money sits in a drawer earning nothing
     · the cost of living never moves

   So this one prints the DIME number, then checks it against a
   lump sum that is actually invested and actually spent against
   rising prices — which can land either side of DIME — and says
   how long the income piece would really last.

   It also does the boring, useful things: rounds to a face amount
   a carrier will actually issue, and turns a quoted premium into
   a per-day number.
   ============================================================ */
(function () {
  const $ = function (id) { return document.getElementById(id); };
  if (!$("dDebt")) return;

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
  const yr = function (n) { return n === 1 ? "1 year" : n + " years"; };

  const FIELDS = ["dDebt", "dFinal", "dIncome", "dYears", "dMort", "dKids", "dPerKid",
                  "dHaveIns", "dHaveSav", "dRet", "dInfl", "dPrem"];
  const STORE = "wealthdemo.tool.dime";
  const DEFAULTS = { dDebt: 30000, dFinal: 15000, dIncome: 75000, dYears: 10, dMort: 250000,
                     dKids: 2, dPerKid: 75000, dHaveIns: 100000, dHaveSav: 25000,
                     dRet: 5, dInfl: 3, dPrem: 0 };

  function num(id, d) { const v = parseFloat($(id).value); return isFinite(v) ? v : d; }

  function read() {
    return {
      debt: Math.max(0, num("dDebt", 30000)),
      final: Math.max(0, num("dFinal", 15000)),
      income: Math.max(0, num("dIncome", 75000)),
      years: Math.max(0, Math.min(40, Math.round(num("dYears", 10)))),
      mort: Math.max(0, num("dMort", 250000)),
      kids: Math.max(0, Math.min(12, Math.round(num("dKids", 2)))),
      perKid: Math.max(0, num("dPerKid", 75000)),
      haveIns: Math.max(0, num("dHaveIns", 100000)),
      haveSav: Math.max(0, num("dHaveSav", 25000)),
      ret: Math.max(0, Math.min(15, num("dRet", 5))) / 100,
      infl: Math.max(0, Math.min(12, num("dInfl", 3))) / 100,
      prem: Math.max(0, num("dPrem", 0))
    };
  }

  /* ---------- the maths ---------- */

  /* what a rising income stream is worth today, if the lump is invested */
  function presentValue(P, n, r, g) {
    if (n <= 0 || P <= 0) return 0;
    if (Math.abs(r - g) < 1e-9) return P * n / (1 + r);
    return P * (1 - Math.pow((1 + g) / (1 + r), n)) / (r - g);
  }

  /* how many years a lump really covers, spending a rising amount each year */
  function lasts(lump, spend, r, g) {
    if (spend <= 0) return Infinity;
    let bal = lump, s = spend, t = 0;
    while (t < 100) {
      bal -= s;
      if (bal <= 0) return t + 1 + bal / s;
      bal *= 1 + r; s *= 1 + g; t++;
    }
    return 100;
  }

  function calc(p) {
    const D = p.debt + p.final;
    const I = p.income * p.years;
    const M = p.mort;
    const E = p.kids * p.perKid;
    const total = D + I + M + E;
    const have = p.haveIns + p.haveSav;
    const gap = Math.max(0, total - have);
    const rounded = gap > 0 ? Math.ceil(gap / 50000) * 50000 : 0;

    const pvI = presentValue(p.income, p.years, p.ret, p.infl);
    const realTotal = D + pvI + M + E;
    const realGap = Math.max(0, realTotal - have);

    return {
      D: D, I: I, M: M, E: E, total: total, have: have, gap: gap, rounded: rounded,
      pvI: pvI, realTotal: realTotal, realGap: realGap,
      lasts: lasts(I, p.income, p.ret, p.infl),
      parts: [
        { key: "D", name: "Debts", note: "cards, loans, final expenses", v: D, tint: "blush" },
        { key: "I", name: "Income", note: yr(p.years) + " of " + usd(p.income), v: I, tint: "mint" },
        { key: "M", name: "Mortgage", note: "what's left on the house", v: M, tint: "ice" },
        { key: "E", name: "Education", note: p.kids + (p.kids === 1 ? " child" : " children"), v: E, tint: "sun" }
      ]
    };
  }

  /* ---------- the waterfall ---------- */
  function geom() {
    return window.innerWidth < 820
      ? { CW: 460, CH: 430, PL: 12, PR: 12, PT: 30, PB: 78, stack: true }
      : { CW: 1040, CH: 400, PL: 24, PR: 24, PT: 30, PB: 86, stack: false };
  }

  function chart(p, c) {
    const g = geom(), CW = g.CW, CH = g.CH;
    const plotW = CW - g.PL - g.PR, plotH = CH - g.PT - g.PB;
    const top = Math.max(c.total, 1);
    const base = g.PT + plotH;
    const Y = function (v) { return base - (v / top) * plotH; };

    const cols = [
      { lab: "D", sub: "Debts", v: c.D, cls: "wf-d", from: 0 },
      { lab: "I", sub: "Income", v: c.I, cls: "wf-i", from: c.D },
      { lab: "M", sub: "Mortgage", v: c.M, cls: "wf-m", from: c.D + c.I },
      { lab: "E", sub: "Education", v: c.E, cls: "wf-e", from: c.D + c.I + c.M },
      { lab: "=", sub: "What's needed", v: c.total, cls: "wf-total", from: 0, solid: true },
      { lab: "−", sub: "What you have", v: c.have, cls: "wf-have", from: Math.max(0, c.total - c.have), minus: true },
      { lab: "=", sub: "Still to cover", v: c.gap, cls: "wf-gap", from: 0, solid: true }
    ];

    const slot = plotW / cols.length;
    const bw = Math.min(slot * 0.62, 92);
    const cx = function (i) { return g.PL + slot * (i + 0.5); };

    let bars = "", links = "", labs = "";
    cols.forEach(function (col, i) {
      const h = Math.max(col.v > 0 ? 3 : 0, (col.v / top) * plotH);
      const yTop = Y(col.from + col.v);
      bars += '<rect class="' + col.cls + '" x="' + (cx(i) - bw / 2).toFixed(1) + '" y="' + yTop.toFixed(1) +
        '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="5"/>';

      /* the dashed carry line to the next column */
      if (i < cols.length - 1) {
        const carry = cols[i + 1].solid ? Y(cols[i + 1].v) : Y(col.from + col.v);
        const yl = (i === 4) ? Y(c.total) : (i === 5 ? Y(c.gap) : Y(col.from + col.v));
        links += '<line class="wf-link" x1="' + (cx(i) + bw / 2).toFixed(1) + '" y1="' + yl.toFixed(1) +
          '" x2="' + (cx(i + 1) - bw / 2).toFixed(1) + '" y2="' + yl.toFixed(1) + '"/>';
      }

      /* value above the bar */
      labs += '<text class="wf-v ' + (col.minus ? "is-good" : "") + '" x="' + cx(i).toFixed(1) + '" y="' + (yTop - 9).toFixed(1) +
        '" text-anchor="middle">' + (col.minus ? "−" : "") + usd0(col.v) + '</text>';

      /* letter and name below */
      labs += '<text class="wf-k ' + col.cls + '-k" x="' + cx(i).toFixed(1) + '" y="' + (base + 24) + '" text-anchor="middle">' + col.lab + '</text>' +
        '<text class="wf-s" x="' + cx(i).toFixed(1) + '" y="' + (base + 42) + '" text-anchor="middle">' + col.sub + '</text>' +
        '<text class="wf-a" x="' + cx(i).toFixed(1) + '" y="' + (base + 60) + '" text-anchor="middle">' + usd(col.v) + '</text>';
    });

    return '<svg viewBox="0 0 ' + CW + ' ' + CH + '" class="wf-chart" role="img" aria-label="How the need adds up">' +
      '<defs>' +
        '<linearGradient id="wfMint" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#14956f"/><stop offset="100%" stop-color="#0b5e4a"/></linearGradient>' +
        '<linearGradient id="wfRose" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#cf4257"/><stop offset="100%" stop-color="#8f2031"/></linearGradient>' +
        '<linearGradient id="wfIce"  x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3b7cc4"/><stop offset="100%" stop-color="#1d4f86"/></linearGradient>' +
        '<linearGradient id="wfSun"  x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#e0a53a"/><stop offset="100%" stop-color="#a9741a"/></linearGradient>' +
        '<linearGradient id="wfDark" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1c3a32"/><stop offset="100%" stop-color="#0d2721"/></linearGradient>' +
        '<linearGradient id="wfGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#d8a43c"/><stop offset="100%" stop-color="#9a6a12"/></linearGradient>' +
      '</defs>' +
      links + bars + labs +
      '<line class="wf-base" x1="' + g.PL + '" y1="' + base + '" x2="' + (CW - g.PR) + '" y2="' + base + '"/>' +
      '</svg>';
  }

  /* ---------- what this means ---------- */
  function diagnose(p, c) {
    if (c.total <= 0) {
      return {
        title: "Nothing entered yet.",
        body: "Fill in the four boxes above and the need builds up as you go.",
        s1: "—", s1l: "What's needed", s1t: "warn",
        s2: "—", s2l: "Still to cover", s2t: "warn"
      };
    }
    if (c.gap <= 0) {
      return {
        title: "You're already covered.",
        body: "What you have comes to " + usd(c.have) + " against a need of " + usd(c.total) +
              " — " + usd(c.have - c.total) + " more than the four boxes call for. Worth checking the cover is the right kind and still in force.",
        s1: usd(c.total), s1l: "What's needed", s1t: "good",
        s2: usd(c.have - c.total), s2l: "More than you need", s2t: "good"
      };
    }

    const biggest = c.parts.slice().sort(function (a, b) { return b.v - a.v; })[0];
    const share = biggest.v / c.total;

    if (biggest.key === "I") {
      return {
        title: "Most of this is replacing your paycheck.",
        body: usd(c.I) + " of the " + usd(c.total) + " — " + pct(share) +
              " — is simply " + yr(p.years) + " of the income your household would stop receiving. " +
              "Change the years and watch it move; it is the one number here you actually get to choose.",
        s1: pct(share), s1l: "Of the need is income", s1t: "warn",
        s2: usd(p.income / 12), s2l: "A month of it", s2t: "warn", s2u: "every month for " + yr(p.years)
      };
    }
    if (biggest.key === "M") {
      return {
        title: "The house is the biggest piece.",
        body: usd(c.M) + " of the " + usd(c.total) + " is the mortgage — " + pct(share) +
              ". Clearing it outright is the usual aim, but covering the payments for a few years instead is a cheaper way to buy the same breathing room.",
        s1: pct(share), s1l: "Of the need is the house", s1t: "warn",
        s2: usd(c.gap), s2l: "Still to cover", s2t: "bad"
      };
    }
    if (biggest.key === "E") {
      return {
        title: "School is the biggest piece.",
        body: usd(c.E) + " of the " + usd(c.total) + " is education for " + p.kids +
              (p.kids === 1 ? " child" : " children") + " — " + pct(share) +
              ". That figure is in today's money; fees have historically risen faster than everything else.",
        s1: usd(p.perKid), s1l: "Per child", s1t: "warn",
        s2: usd(c.gap), s2l: "Still to cover", s2t: "bad"
      };
    }
    return {
      title: "Debt is the biggest piece.",
      body: usd(c.D) + " of the " + usd(c.total) + " is debt and final expenses — " + pct(share) +
            ". This is the part a family faces in the first few months, not spread over years.",
      s1: usd(c.D), s1l: "Debt and final expenses", s1t: "warn",
      s2: usd(c.gap), s2l: "Still to cover", s2t: "bad"
    };
  }

  /* ---------- render ---------- */
  function run() {
    const p = read();
    const c = calc(p);

    /* the four cards */
    const grid = $("dimeGrid");
    grid.innerHTML = "";
    c.parts.forEach(function (part) {
      const el = document.createElement("article");
      el.className = "dime-card";
      el.setAttribute("data-tint", part.tint);
      el.innerHTML =
        '<header><span class="dc-letter">' + part.key + '</span>' +
          '<div class="dc-id"><b></b><small></small></div></header>' +
        '<div class="dc-amt"><b></b><span></span></div>' +
        '<div class="dc-share"><i></i></div>';
      el.querySelector(".dc-id b").textContent = part.name;
      el.querySelector(".dc-id small").textContent = part.note;
      el.querySelector(".dc-amt b").textContent = usd(part.v);
      el.querySelector(".dc-amt span").textContent = c.total > 0 ? pct(part.v / c.total) + " of the need" : "";
      el.querySelector(".dc-share i").style.width = (c.total > 0 ? part.v / c.total * 100 : 0).toFixed(1) + "%";
      grid.appendChild(el);
    });

    /* the answer */
    if (c.total <= 0) {
      $("ansHeadline").innerHTML = "…fill in the four boxes above.";
      $("ansSub").innerHTML = "The need builds up as you go, and what you already have comes off the end.";
    } else if (c.gap <= 0) {
      $("ansHeadline").innerHTML = "…you already have <span class=\"cool\">enough</span>.";
      $("ansSub").innerHTML = "The four boxes come to <b>" + usd(c.total) + "</b>, and you have <b>" + usd(c.have) + "</b>.";
    } else {
      $("ansHeadline").innerHTML = "…you'd still need <span class=\"hot\">" + usd(c.gap) + "</span>.";
      $("ansSub").innerHTML = "A need of <b>" + usd(c.total) + "</b>, less the <b>" + usd(c.have) +
        "</b> you already have. Policies are written in round numbers, so ask for <b>" + usd(c.rounded) + "</b>.";
    }

    /* the waterfall */
    $("chartWrap").innerHTML = chart(p, c);

    /* the honest check */
    const rc = $("realcheck");
    if (p.income > 0 && p.years > 0) {
      rc.hidden = false;
      const diff = c.I - c.pvI;
      const over = diff > 0;
      $("rcTitle").textContent = over
        ? "DIME is asking for " + usd(diff) + " more than it needs to."
        : "DIME is " + usd(-diff) + " short on the income piece.";
      $("rcBody").textContent =
        "DIME multiplies " + usd(p.income) + " by " + p.years + " and stops there — as if the money sat in a drawer. " +
        "Invested at " + pct(p.ret) + " while prices rise " + pct(p.infl) + ", " + usd(c.pvI) +
        " would pay out the same rising income for " + yr(p.years) + ". " +
        (over ? "So the real need is a little lower." : "So the real need is a little higher.");
      $("rcA").textContent = usd(c.I);
      $("rcB").textContent = usd(c.pvI);
      $("rcC").textContent = usd(c.realGap);
      $("rcLasts").textContent = isFinite(c.lasts) ? c.lasts.toFixed(1) + " yrs" : "—";
      $("rcLastsNote").textContent = isFinite(c.lasts)
        ? (c.lasts >= p.years ? "longer than the " + p.years + " planned" : "short of the " + p.years + " planned")
        : "";
    } else {
      rc.hidden = true;
    }

    /* three cards */
    const perDay = p.prem > 0 ? p.prem * 12 / 365 : 0;
    const cards = [
      { tint: "sun", label: "Cover to ask for", big: c.gap > 0 ? usd(c.rounded) : "none needed",
        sub: c.gap > 0 ? "rounded up from " + usd(c.gap) : "you're already covered",
        footL: "Before rounding", foot: usd(c.gap) },
      { tint: "mint", label: "How long the income piece lasts", big: isFinite(c.lasts) ? c.lasts.toFixed(1) : "—",
        sub: p.income > 0 ? "years of " + usd(p.income) + ", rising with prices" : "no income entered",
        footL: "You planned for", foot: yr(p.years) },
      { tint: "ice", label: "What it costs a day", big: perDay > 0 ? "$" + perDay.toFixed(2) : "—",
        sub: perDay > 0 ? usd(p.prem) + " a month" : "add a quoted monthly premium below",
        footL: perDay > 0 ? "Of the income protected" : "", foot: perDay > 0 && p.income > 0 ? pct(p.prem * 12 / p.income) : "" }
    ];
    const cg = $("cardGrid");
    cg.innerHTML = "";
    cards.forEach(function (cd) {
      const el = document.createElement("article");
      el.className = "clock";
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

    /* what this means */
    const dx = diagnose(p, c);
    $("dxTitle").textContent = dx.title;
    $("dxBody").textContent = dx.body;
    $("dxS1").textContent = dx.s1; $("dxS1L").textContent = dx.s1l; $("dxS1").className = "dx-figure " + dx.s1t;
    $("dxS2").textContent = dx.s2; $("dxS2L").textContent = dx.s2l; $("dxS2").className = "dx-figure " + dx.s2t;
    $("dxS1U").textContent = dx.s1u || ""; $("dxS2U").textContent = dx.s2u || "";

    /* say it */
    let say;
    if (c.total <= 0) {
      say = "“Let's put your four numbers in and see what the family would actually need.”";
    } else if (c.gap <= 0) {
      say = "“On these four numbers you're already covered — " + usd(c.have) + " against a need of " +
            usd(c.total) + ". The question isn't how much more. It's whether what you have is the right kind and still in force.”";
    } else {
      say = "“Debts " + usd(c.D) + ". " + yr(p.years) + " of your income, " + usd(c.I) + ". The house, " +
            usd(c.M) + ". School, " + usd(c.E) + ". That's " + usd(c.total) + ". Take off the " + usd(c.have) +
            " you've already got and you're " + usd(c.gap) + " short — so we'd be looking at " + usd(c.rounded) +
            " of cover. None of that is my number. It's yours, added up.”";
    }
    $("sayIt").textContent = say;

    paintSliders();
    if (window.WD && window.WD.explain) window.WD.explain.refresh();
    save();
  }

  const SLIDERS = [["dYearsSlide", "dYears"], ["dKidsSlide", "dKids"], ["dRetSlide", "dRet"], ["dInflSlide", "dInfl"]];
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
    const p = read(), c = calc(p);
    const btn = $("sendBtn"), old = btn.innerHTML;
    const lines = ["Life Insurance Need — WEALTHDEMO", "",
      "D  Debts and final expenses   " + usd(c.D),
      "I  " + yr(p.years) + " of income (" + usd(p.income) + ")   " + usd(c.I),
      "M  Mortgage                   " + usd(c.M),
      "E  Education (" + p.kids + " x " + usd(p.perKid) + ")   " + usd(c.E),
      "   ------------------------------------",
      "   WHAT'S NEEDED              " + usd(c.total),
      "   You already have           " + usd(c.have),
      "   STILL TO COVER             " + usd(c.gap),
      "   Round figure to ask for    " + usd(c.rounded), ""];
    if (p.income > 0 && p.years > 0) {
      lines.push("THE HONEST CHECK",
        "  DIME values the income piece at " + usd(c.I) + " (money in a drawer).",
        "  Invested at " + pct(p.ret) + " with prices rising " + pct(p.infl) + ", the same income needs " + usd(c.pvI) + ".",
        "  On that basis the gap is " + usd(c.realGap) + ".",
        "  The DIME income lump would actually last " + (isFinite(c.lasts) ? c.lasts.toFixed(1) : "—") + " years.", "");
    }
    if (p.prem > 0) lines.push("QUOTED PREMIUM  " + usd(p.prem) + "/mo = $" + (p.prem * 12 / 365).toFixed(2) + "/day", "");
    lines.push("WHAT THIS MEANS", "  " + $("dxTitle").textContent, "  " + $("dxBody").textContent, "",
      $("sayIt").textContent, "",
      "Educational estimate only. DIME is a simple needs-analysis framework. It does not account for survivor benefits, a surviving partner's earnings, tax, existing group cover that may end with employment, or any household's particular circumstances, and it is not an offer of insurance or a quote. Cover, cost and eligibility depend on underwriting. Speak to a qualified professional.");

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
