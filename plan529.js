/* ============================================================
   WEALTHDEMO — 529 Plan Growth Estimator

   No original screenshot for this one, so this is built from
   scratch. It deliberately does not repeat the other two college
   tools:

     Family College Funding  — several children, the gap, the
                               monthly number that closes it
     Build Their Future      — savings vs 529 vs life insurance
     this one                — one 529, and what its tax break is
                               actually worth in dollars

   The engines, all verified in Python before any UI was written
   (child 5, $5,000 today, $300 a month, 6%, 13 years):

     contributed        $51,800
     529 balance        $81,520
     same money taxed   $75,893   at 6% x (1 - 15%) = 5.10%
     the break is worth  $5,628

   The taxable comparison uses the same annual-drag convention as
   the Tax Impact tool elsewhere on the site, so the two agree.
   ============================================================ */
(function () {
  const $ = function (id) { return document.getElementById(id); };
  if (!$("pAge")) return;

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

  const FIELDS = ["pAge", "pStart", "pLump", "pMonthly", "pRet", "pGains",
                  "pState", "pCap", "pCost", "pInfl", "pYears"];
  const STORE = "wealthdemo.tool.plan529";
  const DEFAULTS = { pAge: 5, pStart: 18, pLump: 5000, pMonthly: 300, pRet: 6,
                     pGains: 15, pState: 5, pCap: 10000,
                     pCost: 30000, pInfl: 5, pYears: 4 };
  const LADDER = [100, 200, 300, 500, 750, 1000];

  function num(id, d) { const v = parseFloat($(id).value); return isFinite(v) ? v : d; }

  function read() {
    const age = Math.max(0, num("pAge", 5));
    const start = Math.max(age, num("pStart", 18));
    return {
      age: age, start: start, years: start - age,
      lump: Math.max(0, num("pLump", 0)),
      monthly: Math.max(0, num("pMonthly", 0)),
      ret: num("pRet", 6),
      gains: Math.min(100, Math.max(0, num("pGains", 15))),
      state: Math.min(100, Math.max(0, num("pState", 0))),
      cap: Math.max(0, num("pCap", 0)),
      cost: Math.max(0, num("pCost", 0)),
      infl: num("pInfl", 5),
      collYears: Math.max(1, Math.min(10, num("pYears", 4)))
    };
  }

  /* ---------- future value, monthly, end of period ---------- */
  function fv(lump, monthly, ratePct, months) {
    const r = ratePct / 100 / 12;
    if (r === 0) return lump + monthly * months;
    const g = Math.pow(1 + r, months);
    return lump * g + monthly * (g - 1) / r;
  }

  function work(p) {
    const n = Math.round(p.years * 12);
    const put = p.lump + p.monthly * n;
    const plan = fv(p.lump, p.monthly, p.ret, n);
    /* the same money in an ordinary taxable account, growth taxed each year */
    const netRate = p.ret * (1 - p.gains / 100);
    const taxed = fv(p.lump, p.monthly, netRate, n);

    /* a state deduction, if the state offers one, capped per year */
    let ded = 0;
    for (let y = 0; y < Math.floor(p.years); y++) {
      const c = p.monthly * 12 + (y === 0 ? p.lump : 0);
      ded += Math.min(c, p.cap > 0 ? p.cap : c) * p.state / 100;
    }

    /* the bill it is aimed at */
    const bill = p.cost * Math.pow(1 + p.infl / 100, p.years) * p.collYears;

    return {
      n: n, put: put, plan: plan, growth: plan - put,
      netRate: netRate, taxed: taxed, edge: plan - taxed,
      ded: ded, bill: bill,
      covers: bill > 0 ? plan / bill * 100 : 0
    };
  }

  /* ---------- only write a list when it changed ---------- */
  const LAST = {};
  function redraw(el, html) {
    if (LAST[el.id] === html) return false;
    LAST[el.id] = html; el.innerHTML = html; return true;
  }

  /* ============================================================
     the picture: the plan, and the same money taxed
     ============================================================ */
  function geom() {
    const w = window.innerWidth;
    if (w < 700)  return { CW: 480,  CH: 238, PL: 48, PR: 58, PT: 30, PB: 34 };
    if (w < 1100) return { CW: 880,  CH: 282, PL: 58, PR: 88, PT: 32, PB: 36 };
    return         { CW: 1120, CH: 300, PL: 62, PR: 104, PT: 32, PB: 38 };
  }

  function chart(p, w) {
    const g = geom(), CW = g.CW, CH = g.CH;
    const plotW = CW - g.PL - g.PR, plotH = CH - g.PT - g.PB;
    const base = g.PT + plotH;
    const yrs = Math.max(1, Math.round(p.years));

    const a = [], b = [];
    for (let y = 0; y <= yrs; y++) {
      a.push(fv(p.lump, p.monthly, p.ret, y * 12));
      b.push(fv(p.lump, p.monthly, w.netRate, y * 12));
    }
    const top = Math.max.apply(null, a.concat([1]));
    const X = function (y) { return g.PL + (y / yrs) * plotW; };
    const Y = function (v) { return base - (v / top) * plotH; };

    let out = "";
    for (let k = 1; k <= 3; k++) {
      const y = Y(top * k / 3);
      out += '<line class="pl-grid" x1="' + g.PL + '" y1="' + y.toFixed(1) +
        '" x2="' + (CW - g.PR) + '" y2="' + y.toFixed(1) + '"/>';
    }

    /* the band between them is the whole point of a 529 */
    let band = "";
    for (let y = 0; y <= yrs; y++) band += (y ? "L" : "M") + X(y).toFixed(1) + " " + Y(a[y]).toFixed(1);
    for (let y = yrs; y >= 0; y--) band += "L" + X(y).toFixed(1) + " " + Y(b[y]).toFixed(1);
    out += '<path class="pl-band" d="' + band + 'Z"/>';

    [[b, "pl-l-tax"], [a, "pl-l-plan"]].forEach(function (s) {
      let d = "";
      s[0].forEach(function (v, y) { d += (y ? "L" : "M") + X(y).toFixed(1) + " " + Y(v).toFixed(1); });
      out += '<path class="pl-line ' + s[1] + '" d="' + d + '"/>';
    });

    /* the gap, called out */
    if (w.edge > 1 && yrs > 0) {
      const x = X(yrs), y1 = Y(a[yrs]), y2 = Y(b[yrs]);
      out += '<line class="pl-gap" x1="' + x.toFixed(1) + '" y1="' + y1.toFixed(1) +
        '" x2="' + x.toFixed(1) + '" y2="' + y2.toFixed(1) + '"/>' +
        '<text class="pl-gap-lab" x="' + (x - 9).toFixed(1) + '" y="' +
        ((y1 + y2) / 2 + 3.5).toFixed(1) + '" text-anchor="end">' + usd0(w.edge) + ' more</text>';
    }

    out += '<circle class="pl-dot pl-d-plan" cx="' + X(yrs).toFixed(1) + '" cy="' + Y(a[yrs]).toFixed(1) + '" r="3.4"/>' +
      '<circle class="pl-dot pl-d-tax" cx="' + X(yrs).toFixed(1) + '" cy="' + Y(b[yrs]).toFixed(1) + '" r="3.4"/>' +
      '<text class="pl-end pl-e-plan" x="' + (X(yrs) + 9).toFixed(1) + '" y="' + (Y(a[yrs]) + 3.5).toFixed(1) + '">' + usd0(a[yrs]) + '</text>' +
      '<text class="pl-end pl-e-tax" x="' + (X(yrs) + 9).toFixed(1) + '" y="' + (Y(b[yrs]) + 3.5).toFixed(1) + '">' + usd0(b[yrs]) + '</text>';

    out += '<line class="rb-base" x1="' + g.PL + '" y1="' + base + '" x2="' + (CW - g.PR) + '" y2="' + base + '"/>' +
      '<text class="rb-ax" x="' + (g.PL - 8) + '" y="' + (g.PT + 4) + '" text-anchor="end">' + usd0(top) + '</text>' +
      '<text class="rb-ax" x="' + (g.PL - 8) + '" y="' + (base + 4) + '" text-anchor="end">$0</text>' +
      '<text class="rb-tick" x="' + g.PL + '" y="' + (CH - 8) + '" text-anchor="start">age ' + Math.round(p.age) + '</text>' +
      '<text class="rb-tick" x="' + X(yrs).toFixed(1) + '" y="' + (CH - 8) + '" text-anchor="end">age ' + Math.round(p.start) + '</text>';

    return '<svg viewBox="0 0 ' + CW + ' ' + CH + '" class="pl-svg" role="img" ' +
      'data-cs-scale="' + base + ',0,' + Y(top).toFixed(2) + ',' + top + '" ' +
      'aria-label="The 529 against the same money in a taxable account">' + out + '</svg>';
  }

  /* ============================================================
     render
     ============================================================ */
  function run() {
    const p = read(), w = work(p);

    /* ---- banner ---- */
    if (p.years <= 0 || w.put <= 0) {
      $("bnLabel").textContent = "START WITH";
      $("bnBig").textContent = "An age and an amount";
      $("bnSub").textContent = "how old they are, and what you would put in";
    } else {
      $("bnLabel").textContent = "IN THE PLAN AT " + Math.round(p.start);
      $("bnBig").textContent = usd(w.plan);
      $("bnSub").textContent = usd(w.put) + " put in over " + p.years +
        (p.years === 1 ? " year" : " years") + ", and " + usd(w.growth) + " of growth on top";
    }

    /* ---- the four figures ---- */
    $("statPut").textContent = usd(w.put);
    $("statGrow").textContent = usd(w.growth);
    $("statPlan").textContent = usd(w.plan);
    $("statCovers").textContent = w.bill > 0 ? Math.round(w.covers) + "%" : "—";
    $("statCoversNote").textContent = w.bill > 0
      ? "of a " + usd(w.bill) + " degree" : "put a college cost in";

    /* ---- the tax break, in dollars ---- */
    $("edgeBig").textContent = usd(w.edge);
    $("edgeTaxed").textContent = usd(w.taxed);
    $("edgePlan").textContent = usd(w.plan);
    $("edgeRate").textContent = p.ret + "% less " + p.gains + "% tax on the growth = " +
      w.netRate.toFixed(2) + "% net";
    $("edgeLead").innerHTML = w.edge > 1
      ? "The same " + usd(w.put) + " in an ordinary taxable account reaches <b>" + usd(w.taxed) +
        "</b>, because the growth is taxed as it happens. Inside the 529 it reaches <b>" +
        usd(w.plan) + "</b>. The difference is what the tax treatment is worth — and it only " +
        "counts if the money is used for education."
      : "With no tax on the growth assumed, there is nothing to compare here.";

    $("dedBig").textContent = p.state > 0 ? usd(w.ded) : "—";
    $("dedLead").textContent = p.state > 0
      ? "Over " + Math.floor(p.years) + " years, at " + p.state + "% on contributions" +
        (p.cap > 0 ? " capped at " + usd(p.cap) + " a year" : "") +
        ". Not every state offers this, and some only for their own plan."
      : "Put your state's rate in if it gives a deduction or credit for 529 contributions. Several states give none at all.";

    /* ---- the picture ---- */
    $("chartWrap").innerHTML = p.years > 0 ? chart(p, w) : "";
    $("chartLead").textContent = p.years <= 0
      ? "Set an age and a start age to see the two paths."
      : "The upper line is the 529. The lower one is the identical contributions in a taxable " +
        "account, losing " + p.gains + "% of the growth to tax each year. The shaded band between " +
        "them widens every year — that is the whole argument for the account.";

    /* ---- the ladder ---- */
    redraw($("ladderRows"), LADDER.map(function (m) {
      const v = fv(p.lump, m, p.ret, w.n);
      const pc = w.bill > 0 ? v / w.bill * 100 : 0;
      const me = Math.abs(m - p.monthly) < 0.5;
      return '<div class="pl-rung' + (me ? " is-me" : "") + '" data-m="' + m + '">' +
        '<span>' + usd(m) + ' a month</span>' +
        '<i><u style="width:' + Math.min(100, pc).toFixed(1) + '%"></u></i>' +
        '<em>' + (w.bill > 0 ? Math.round(pc) + "% of the bill" : "—") + '</em>' +
        '<b>' + usd(v) + '</b></div>';
    }).join("")) && $("ladderRows").querySelectorAll(".pl-rung").forEach(function (row) {
      row.addEventListener("click", function () {
        $("pMonthly").value = row.getAttribute("data-m");
        run();
      });
    });

    $("ladderLead").textContent = w.bill > 0
      ? "Against a " + usd(w.bill) + " degree. Tap any rung to load it above."
      : "Put a college cost in to see what share each one covers.";

    if (window.WD && window.WD.explain) window.WD.explain.refresh();
    save();
  }

  /* ---------- plumbing ---------- */
  function save() {
    const o = {};
    FIELDS.forEach(function (f) { o[f] = $(f).value; });
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

  let rt = null, lastW = geom().CW;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      const n = geom().CW;
      if (n !== lastW) { lastW = n; run(); }
    }, 140);
  });

  if ($("sendBtn")) $("sendBtn").addEventListener("click", function () {
    const p = read(), w = work(p);
    const btn = $("sendBtn"), old = btn.innerHTML;
    const lines = ["529 Plan Growth Estimator — WEALTHDEMO", "",
      "THE PLAN",
      "  Child's age today       " + Math.round(p.age),
      "  Money needed at         " + Math.round(p.start) + "   (" + p.years + " years away)",
      "  Starting with           " + usd(p.lump),
      "  Adding each month       " + usd(p.monthly),
      "  Assumed annual return   " + p.ret + "%", "",
      "AT AGE " + Math.round(p.start),
      "  Total contributed       " + usd(w.put),
      "  Growth                  " + usd(w.growth),
      "  In the plan             " + usd(w.plan),
      w.bill > 0 ? "  Covers                  " + Math.round(w.covers) + "% of a " + usd(w.bill) + " degree" : "", "",
      "WHAT THE TAX TREATMENT IS WORTH",
      "  Same money, taxable     " + usd(w.taxed) + "   (" + p.ret + "% less " + p.gains +
        "% = " + w.netRate.toFixed(2) + "% net)",
      "  Inside the 529          " + usd(w.plan),
      "  The difference          " + usd(w.edge),
      p.state > 0 ? "  State deduction value   " + usd(w.ded) + " over " + Math.floor(p.years) + " years" : "", "",
      "WHAT DIFFERENT MONTHLY AMOUNTS REACH"];
    LADDER.forEach(function (m) {
      const v = fv(p.lump, m, p.ret, w.n);
      lines.push("  " + usd(m).padEnd(8) + " a month -> " + usd(v) +
        (w.bill > 0 ? "   (" + Math.round(v / w.bill * 100) + "% of the bill)" : ""));
    });
    lines.push("",
      "Educational estimate only. Returns are hypothetical and not guaranteed; a 529 is " +
      "investment-based and can lose value. Qualified distributions for eligible education " +
      "expenses are generally federal income-tax-free; nonqualified distributions can make the " +
      "earnings portion taxable and may trigger a separate 10% additional federal tax unless an " +
      "exception applies. State tax treatment, deductions and credits differ by state and often " +
      "apply only to that state's own plan. The taxable comparison applies the entered rate to " +
      "the growth each year as a simplified drag and is not a tax-return calculation. Contribution " +
      "limits, gift-tax rules and financial-aid treatment are not modelled.");

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lines.filter(function (l) { return l !== ""; }).join("\n")).then(function () {
        btn.classList.add("is-done"); btn.textContent = "Summary copied";
        setTimeout(function () { btn.innerHTML = old; btn.classList.remove("is-done"); }, 2600);
      }, function () { btn.textContent = "Copy blocked"; setTimeout(function () { btn.innerHTML = old; }, 2000); });
    }
  });

  load();
  run();
})();
