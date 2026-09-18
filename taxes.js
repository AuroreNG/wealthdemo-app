/* ============================================================
   WEALTHDEMO — When Do You Want to Pay Taxes?

   A faithful rebuild of the existing calculator: same fields,
   same wording, same figures. Verified against the original on
   the default case — $100,000, age 40 to 67, 22% today, 6%
   growth, 25% in retirement:

     Tax Now              $268,173
     Tax Later            $482,235 before tax, −$120,559, $361,676
     Potentially Tax-Free $376,143

   The three engines, as the original illustrates them:
     Tax Now    seed = P(1−t0), grows at g(1−t0)   — tax paid along the way
     Tax Later  P grows at g, then one tax bite at t1
     Tax-Free   seed = P(1−t0), grows at g, no bite
   ============================================================ */
(function () {
  const $ = function (id) { return document.getElementById(id); };
  if (!$("tMoney")) return;

  const usd = function (n) {
    const a = Math.abs(n);
    return (n < 0 ? "−$" : "$") + Math.round(a).toLocaleString("en-US");
  };
  const usd0 = function (n) {
    const a = Math.abs(n), s = n < 0 ? "−$" : "$";
    if (a >= 1000000) return s + (a / 1000000).toFixed(1) + "M";
    if (a >= 1000) return s + Math.round(a / 1000) + "k";
    return s + Math.round(a);
  };
  const pct = function (n) { return (Math.round(n * 10) / 10) + "%"; };

  const FIELDS = ["tMoney", "tAge", "tRet", "tNow", "tGrow", "tLater", "tPortPct", "tPort"];
  const STORE = "wealthdemo.tool.taxes";
  const DEFAULTS = { tMoney: 100000, tAge: 40, tRet: 67, tNow: 22, tGrow: 6, tLater: 25,
                     tPortPct: 0, tPort: 500000 };

  const WAYS = {
    now:   { key: "now",   label: "Tax Now",              tint: "a" },
    later: { key: "later", label: "Tax Later",            tint: "b" },
    free:  { key: "free",  label: "Potentially Tax-Free", tint: "c" }
  };
  let pick = null;

  function num(id, d) { const v = parseFloat($(id).value); return isFinite(v) ? v : d; }

  function read() {
    const age = Math.max(0, num("tAge", 40));
    const ret = Math.max(0, num("tRet", 67));
    return {
      money: Math.max(0, num("tMoney", 100000)),
      age: age, ret: ret,
      years: Math.max(0, ret - age),
      now: Math.min(100, Math.max(0, num("tNow", 22))) / 100,
      grow: Math.max(-50, num("tGrow", 6)) / 100,
      later: Math.min(100, Math.max(0, num("tLater", 25))) / 100,
      portPct: Math.min(100, Math.max(0, num("tPortPct", 0))),
      port: Math.max(0, num("tPort", 500000))
    };
  }

  /* ---------- the three strategies, year by year ---------- */
  function model(p) {
    const n = Math.round(p.years);
    const seed = p.money * (1 - p.now);
    const dragged = p.grow * (1 - p.now);      /* growth taxed along the way */

    const now = [], later = [], free = [];
    for (let y = 0; y <= n; y++) {
      now.push(seed * Math.pow(1 + dragged, y));
      later.push(p.money * Math.pow(1 + p.grow, y));
      free.push(seed * Math.pow(1 + p.grow, y));
    }

    const laterPre = later[n];
    const laterTax = laterPre * p.later;

    return {
      n: n, seed: seed, taxToday: p.money * p.now, dragged: dragged,
      nowLine: now, laterLine: later, freeLine: free,
      nowEnd: now[n],
      laterPre: laterPre, laterTax: laterTax, laterEnd: laterPre - laterTax,
      freeEnd: free[n]
    };
  }

  /* ============================================================
     the picture: the same money, three timings, to retirement
     ============================================================ */
  function geom() {
    const w = window.innerWidth;
    if (w < 700)  return { CW: 480,  CH: 250, PL: 48, PR: 58, PT: 22, PB: 34 };
    if (w < 1100) return { CW: 880,  CH: 290, PL: 58, PR: 96, PT: 24, PB: 36 };
    return         { CW: 1120, CH: 310, PL: 62, PR: 112, PT: 24, PB: 38 };
  }

  function path(line, X, Y) {
    let d = "";
    for (let i = 0; i < line.length; i++) {
      d += (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(line[i]).toFixed(1) + " ";
    }
    return d.trim();
  }

  function chart(p, m) {
    const g = geom(), CW = g.CW, CH = g.CH;
    const plotW = CW - g.PL - g.PR, plotH = CH - g.PT - g.PB;
    const base = g.PT + plotH;
    const n = m.n;
    if (n < 1) return "";

    const top = Math.max(m.laterPre, m.freeEnd, m.nowEnd, 1);
    const X = function (i) { return g.PL + (i / n) * plotW; };
    const Y = function (v) { return base - (v / top) * plotH; };

    let out = '<line class="rb-base" x1="' + g.PL + '" y1="' + base +
      '" x2="' + (CW - g.PR) + '" y2="' + base + '"/>';

    /* light gridlines at a quarter of the top, so the shapes read */
    for (let k = 1; k <= 4; k++) {
      const y = Y(top * k / 4);
      out += '<line class="tx-grid" x1="' + g.PL + '" y1="' + y.toFixed(1) +
        '" x2="' + (CW - g.PR) + '" y2="' + y.toFixed(1) + '"/>';
    }

    out += '<path class="tx-line tx-l-later" d="' + path(m.laterLine, X, Y) + '"/>' +
           '<path class="tx-line tx-l-free"  d="' + path(m.freeLine,  X, Y) + '"/>' +
           '<path class="tx-line tx-l-now"   d="' + path(m.nowLine,   X, Y) + '"/>';

    /* the tax bite at the end of Tax Later — the whole point of the picture */
    const xe = X(n);
    if (m.laterTax > 0) {
      const y1 = Y(m.laterPre), y2 = Y(m.laterEnd);
      out += '<line class="tx-bite" x1="' + xe.toFixed(1) + '" y1="' + y1.toFixed(1) +
        '" x2="' + xe.toFixed(1) + '" y2="' + y2.toFixed(1) + '"/>' +
        '<circle class="tx-dot tx-d-later" cx="' + xe.toFixed(1) + '" cy="' + y1.toFixed(1) + '" r="3.2"/>' +
        '<text class="tx-bite-lab" x="' + (xe - 9).toFixed(1) + '" y="' +
        ((y1 + y2) / 2 + 3.5).toFixed(1) + '" text-anchor="end">&minus;' + usd0(m.laterTax) + ' tax</text>';
    }

    /* end markers */
    const ends = [
      { v: m.laterEnd, c: "later", t: "Tax Later" },
      { v: m.freeEnd,  c: "free",  t: "Potentially Tax-Free" },
      { v: m.nowEnd,   c: "now",   t: "Tax Now" }
    ].sort(function (a, b) { return Y(a.v) - Y(b.v); });

    /* nudge labels apart so two close results stay readable */
    let prev = -99;
    ends.forEach(function (e) {
      let y = Y(e.v);
      if (y - prev < 13) y = prev + 13;
      prev = y;
      out += '<circle class="tx-dot tx-d-' + e.c + '" cx="' + xe.toFixed(1) + '" cy="' + Y(e.v).toFixed(1) + '" r="3.2"/>' +
        '<text class="tx-end tx-e-' + e.c + '" x="' + (xe + 9).toFixed(1) + '" y="' + (y + 3.5).toFixed(1) + '">' +
        usd0(e.v) + '</text>';
    });

    out += '<text class="rb-ax" x="' + (g.PL - 8) + '" y="' + (g.PT + 4) + '" text-anchor="end">' + usd0(top) + '</text>' +
      '<text class="rb-ax" x="' + (g.PL - 8) + '" y="' + (base + 4) + '" text-anchor="end">$0</text>' +
      '<text class="rb-tick" x="' + g.PL + '" y="' + (CH - 8) + '" text-anchor="start">age ' + Math.round(p.age) + '</text>' +
      '<text class="rb-tick" x="' + xe.toFixed(1) + '" y="' + (CH - 8) + '" text-anchor="middle">age ' + Math.round(p.ret) + '</text>';

    return '<svg viewBox="0 0 ' + CW + ' ' + CH + '" class="tx-svg" role="img" ' +
      'data-cs-scale="' + base + ',0,' + Y(top).toFixed(2) + ',' + top + '" ' +
      'aria-label="The same money under three tax timings, from today to retirement">' + out + '</svg>';
  }

  /* ============================================================
     render
     ============================================================ */
  function run() {
    const p = read();
    const m = model(p);
    const spread = Math.max(m.nowEnd, m.laterEnd, m.freeEnd) - Math.min(m.nowEnd, m.laterEnd, m.freeEnd);

    /* ---- banner ---- */
    if (p.money <= 0 || m.n < 1) {
      $("bnLabel").textContent = "START WITH";
      $("bnBig").textContent = "An amount and a date";
      $("bnSub").textContent = "money available today, and the years between now and retirement";
    } else {
      $("bnLabel").textContent = "SPREAD BETWEEN THE THREE";
      $("bnBig").textContent = usd(spread);
      $("bnSub").textContent = "on the same " + usd(p.money) + " over " + m.n +
        (m.n === 1 ? " year" : " years") + " — the timing of the tax is the only difference";
    }

    $("factYears").textContent = m.n + (m.n === 1 ? " year" : " years");
    $("factDrag").textContent = (m.dragged * 100).toFixed(2) + "%";

    /* ---- the strip, exactly as the original ---- */
    $("tStrip").innerHTML = "Each strategy starts with the same <b>" + usd(p.money) +
      "</b> and has <b>" + m.n + (m.n === 1 ? " year" : " years") + "</b> to grow.";

    /* ---- Tax Now ---- */
    $("nowStart").textContent = usd(p.money);
    $("nowTax").textContent = usd(-m.taxToday);
    $("nowSeed").textContent = usd(m.seed);
    $("nowEnd").textContent = usd(m.nowEnd);

    /* ---- Tax Later ---- */
    $("laterStart").textContent = usd(p.money);
    $("laterPre").textContent = usd(m.laterPre);
    $("laterTax").textContent = usd(-m.laterTax);
    $("laterEnd").textContent = usd(m.laterEnd);

    /* ---- Potentially Tax-Free ---- */
    $("freeStart").textContent = usd(p.money);
    $("freeTax").textContent = usd(-m.taxToday);
    $("freeEnd").textContent = usd(m.freeEnd);

    /* ---- the bars ---- */
    const vals = { now: m.nowEnd, later: m.laterEnd, free: m.freeEnd };
    const top = Math.max(vals.now, vals.later, vals.free, 1);
    ["now", "later", "free"].forEach(function (k) {
      $("bar_" + k).style.width = Math.max(0, vals[k] / top * 100).toFixed(2) + "%";
      $("barv_" + k).textContent = usd(vals[k]);
    });

    /* ---- the picture ---- */
    $("chartWrap").innerHTML = chart(p, m);
    $("chartLead").textContent = m.n < 1
      ? "There is nothing to draw until retirement is at least a year away."
      : "The same " + usd(p.money) + " under three timings. Tax Later climbs highest because nothing " +
        "is taken out on the way — then " + usd(m.laterTax) + " comes off at age " + Math.round(p.ret) + ".";

    /* ---- the assessment ---- */
    said(p, m, vals);

    if (window.WD && window.WD.explain) window.WD.explain.refresh();
    save();
  }

  function said(p, m, vals) {
    const box = $("pickOut");
    if (!pick) {
      box.textContent = "Choose a strategy above to complete your assessment.";
      box.classList.remove("is-set");
      return;
    }
    const inIt = p.port * p.portPct / 100;
    const rest = p.port - inIt;
    box.classList.add("is-set");
    box.innerHTML = "You picked <b>" + WAYS[pick].label + "</b>. Of a <b>" + usd(p.port) +
      "</b> retirement portfolio, <b>" + pct(p.portPct) + "</b> — <b>" + usd(inIt) +
      "</b> — is there today, leaving <b>" + usd(rest) + "</b> somewhere else." +
      (p.portPct >= 99.5
        ? " That is already where you want it."
        : " That difference is the conversation to have.");
  }

  /* ---------- plumbing ---------- */
  function save() {
    const o = { pick: pick };
    FIELDS.forEach(function (f) { o[f] = $(f).value; });
    try { localStorage.setItem(STORE, JSON.stringify(o)); } catch (e) {}
  }
  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(STORE) || "null"); } catch (e) {}
    if (!s) return;
    FIELDS.forEach(function (f) { if (typeof s[f] === "string" && s[f] !== "") $(f).value = s[f]; });
    if (s.pick && WAYS[s.pick]) setPick(s.pick, true);
  }

  function setPick(k, quiet) {
    pick = k;
    document.querySelectorAll(".tx-pick").forEach(function (b) {
      const on = b.getAttribute("data-way") === k;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    if (!quiet) run();
  }

  FIELDS.forEach(function (f) {
    $(f).addEventListener("input", run);
    $(f).addEventListener("change", run);
  });
  document.querySelectorAll(".tx-pick").forEach(function (b) {
    b.addEventListener("click", function () { setPick(b.getAttribute("data-way")); });
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
    pick = null;
    document.querySelectorAll(".tx-pick").forEach(function (b) {
      b.classList.remove("is-on"); b.setAttribute("aria-pressed", "false");
    });
    if (moreMenu) moreMenu.setAttribute("hidden", "");
    run();
  }
  if ($("resetBtn")) $("resetBtn").addEventListener("click", resetAll);
  if ($("resetBtn2")) $("resetBtn2").addEventListener("click", resetAll);

  let rt = null, lastW = geom().CW;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      const n = geom().CW;
      if (n !== lastW) { lastW = n; run(); }
    }, 140);
  });

  if ($("sendBtn")) $("sendBtn").addEventListener("click", function () {
    const p = read(), m = model(p);
    const btn = $("sendBtn"), old = btn.innerHTML;
    const lines = ["When Do You Want to Pay Taxes? — WEALTHDEMO", "",
      "ASSUMPTIONS",
      "  Money available today   " + usd(p.money),
      "  Age " + Math.round(p.age) + " to " + Math.round(p.ret) + "            " + m.n + " years to grow",
      "  Tax rate today          " + (p.now * 100).toFixed(1) + "%",
      "  Expected annual growth  " + (p.grow * 100).toFixed(1) + "%",
      "  Tax rate in retirement  " + (p.later * 100).toFixed(1) + "%", "",
      "TAX NOW",
      "  Tax paid today          " + usd(-m.taxToday),
      "  Starts growing          " + usd(m.seed),
      "  Estimated at retirement " + usd(m.nowEnd), "",
      "TAX LATER",
      "  Value before tax        " + usd(m.laterPre),
      "  Estimated tax           " + usd(-m.laterTax),
      "  Estimated amount kept   " + usd(m.laterEnd), "",
      "POTENTIALLY TAX-FREE",
      "  Tax paid today          " + usd(-m.taxToday),
      "  Estimated amount kept   " + usd(m.freeEnd), ""];
    if (pick) {
      lines.push("CLIENT PREFERENCE",
        "  Strategy preferred      " + WAYS[pick].label,
        "  In that strategy today  " + pct(p.portPct) + " of " + usd(p.port) +
          "  (" + usd(p.port * p.portPct / 100) + ")", "");
    }
    lines.push("Educational illustration only. The three labels describe simplified tax-timing concepts " +
      "and do not represent specific products or accounts. Actual taxation depends on the account, asset, " +
      "transaction, tax basis, type of earnings, distribution rules, applicable law, and individual " +
      "circumstances. \"Tax Now\" uses a simplified annual tax drag and is not a tax-return calculation. " +
      "\"Potentially Tax-Free\" treatment is not automatic or guaranteed and requires satisfying the rules " +
      "of the strategy ultimately used. Growth assumptions are hypothetical. Consult qualified tax, legal, " +
      "and financial professionals.");

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lines.filter(function (l) { return l !== null; }).join("\n")).then(function () {
        btn.classList.add("is-done"); btn.textContent = "Summary copied";
        setTimeout(function () { btn.innerHTML = old; btn.classList.remove("is-done"); }, 2600);
      }, function () { btn.textContent = "Copy blocked"; setTimeout(function () { btn.innerHTML = old; }, 2000); });
    }
  });

  load();
  run();
})();
