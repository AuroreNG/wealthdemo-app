/* ============================================================
   WEALTHDEMO — Build Their Future

   A faithful rebuild: same sections, same wording, same figures.
   Their model, confirmed against the original to the dollar on
   the default case (child 2, $10,000 today, $500 a month to 18):

     contributed            $106,000
     high-yield savings     $140,759   4% APY less 22% tax = 3.12%
     529 at 6%              $186,600

   Both are a monthly, end-of-period future value over 192 months.
   After 18 the balance compounds annually with nothing added,
   which reproduces their 529 row exactly:
     age 25 $280,578 · age 40 $672,421 · age 65 $2,885,944.

   NOTE: their savings row for ages 40 and 65 ($279,706 and
   $590,474) does not come from the same 3.12% — solving back
   gives 3.17% and 3.10%. Age 18 and age 25 do match. We keep
   one consistent rate, so those two cells read $276,707 and
   $596,476 here. Everything else is theirs.

   The life-insurance column is never projected. Those values are
   typed in from a carrier illustration, which is the honest way
   to do it and the way their original does it.
   ============================================================ */
(function () {
  const $ = function (id) { return document.getElementById(id); };
  if (!$("fAge")) return;

  const usd = function (n) {
    const a = Math.abs(n);
    return (n < 0 ? "−$" : "$") + Math.round(a).toLocaleString("en-US");
  };
  const usd0 = function (n) {
    const a = Math.abs(n), s = n < 0 ? "−$" : "$";
    if (a >= 1000000) return s + (a / 1000000).toFixed(a >= 10000000 ? 0 : 1) + "M";
    if (a >= 1000) return s + Math.round(a / 1000) + "k";
    return s + Math.round(a);
  };

  const AGES = [18, 25, 40, 65];
  const FIELDS = ["fAge", "fLump", "fMonthly", "fUntil", "fApy", "fTax", "fReturn",
                  "cv18", "db18", "cv25", "db25", "cv40", "db40", "cv65", "db65"];
  const STORE = "wealthdemo.tool.future";
  const DEFAULTS = { fAge: 2, fLump: 10000, fMonthly: 500, fUntil: 18,
                     fApy: 4, fTax: 22, fReturn: 6,
                     cv18: 100000, db18: 1000000, cv25: 175000, db25: 1000000,
                     cv40: 425000, db40: 1000000, cv65: 1000000, db65: 1000000,
                     use: "qualified", hasIllus: true, scenario: "college", priority: null };
  let use = DEFAULTS.use, hasIllus = true, scenario = DEFAULTS.scenario, priority = null;

  function num(id, d) { const v = parseFloat($(id).value); return isFinite(v) ? v : d; }

  function read() {
    const age = Math.max(0, num("fAge", 0));
    const until = Math.max(age, num("fUntil", 18));
    return {
      age: age, until: until, years: until - age,
      lump: Math.max(0, num("fLump", 0)),
      monthly: Math.max(0, num("fMonthly", 0)),
      apy: num("fApy", 4), tax: Math.min(100, Math.max(0, num("fTax", 22))),
      ret: num("fReturn", 6),
      cv: AGES.map(function (a) { return Math.max(0, num("cv" + a, 0)); }),
      db: AGES.map(function (a) { return Math.max(0, num("db" + a, 0)); })
    };
  }

  /* ---------- future value, monthly, end of period ---------- */
  function fv(lump, monthly, ratePct, months) {
    const r = ratePct / 100 / 12;
    if (r === 0) return lump + monthly * months;
    const g = Math.pow(1 + r, months);
    return lump * g + monthly * (g - 1) / r;
  }
  /* ---------- and onward with nothing added, compounded yearly ---------- */
  const on = function (v, ratePct, years) { return v * Math.pow(1 + ratePct / 100, years); };

  function work(p) {
    const months = Math.round(p.years * 12);
    const put = p.lump + p.monthly * months;
    const netApy = p.apy * (1 - p.tax / 100);

    const bank18 = fv(p.lump, p.monthly, netApy, months);
    const plan18 = fv(p.lump, p.monthly, p.ret, months);

    /* the 529's tax bite only exists when the money is not used for school */
    const earn = Math.max(0, plan18 - put);
    const hit = use === "qualified" ? 0 : earn * (p.tax / 100 + 0.10);

    return {
      put: put, netApy: netApy,
      bank18: bank18, bankGrowth: bank18 - put,
      plan18: plan18, earn: earn, hit: hit, planNet: plan18 - hit,
      /* age 18 / 25 / 40 / 65 for each column */
      bank: AGES.map(function (a) { return on(bank18, netApy, a - p.until); }),
      plan: AGES.map(function (a) { return on(plan18, p.ret, a - p.until); }),
      cash: p.cv.slice()
    };
  }

  /* ============================================================
     what changes when life does
     ============================================================ */
  const SCENARIOS = [
    { id: "college", label: "Goes to College", lines: [
      "Funds on deposit, but interest is generally taxable.",
      "Qualified 529 distributions for eligible education expenses are generally federal tax-free.",
      "Policy cash value may potentially be accessed subject to policy terms; withdrawals and loans can reduce benefits."] },
    { id: "nocollege", label: "No College", lines: [
      "Nothing changes. The money was never earmarked, so it stays available for anything.",
      "Nonqualified use: the earnings portion may face income tax plus a separate 10% additional federal tax. The beneficiary can also be changed to another family member.",
      "Nothing changes. Cash value was never tied to education in the first place."] },
    { id: "scholarship", label: "Gets a Scholarship", lines: [
      "Unaffected — the money is simply still there.",
      "Up to the scholarship amount can generally come out without the 10% additional tax, though the earnings are still taxable.",
      "Unaffected. The policy carries on regardless."] },
    { id: "home", label: "Buys a Home", lines: [
      "Straightforward. It is cash, and a deposit is what cash is for.",
      "A home is not a qualified education expense, so nonqualified rules apply to the earnings.",
      "Cash value may be accessible by loan or withdrawal, subject to policy terms; either reduces the death benefit."] },
    { id: "business", label: "Starts a Business", lines: [
      "Straightforward, and available on any timetable.",
      "Not a qualified expense. The earnings face tax plus the additional 10% unless an exception applies.",
      "Cash value may be accessible by loan, which does not require a lender's approval but does reduce benefits."] },
    { id: "longterm", label: "Keeps It Long-Term", lines: [
      "The interest stays taxable every year, and that annual drag is what the first column is really showing.",
      "Stays invested and can be moved to another beneficiary. Under current rules a limited amount may be eligible to move to a Roth IRA.",
      "Built for long holding. The death benefit stays in force for as long as the contract does."] }
  ];

  /* ============================================================
     what the money is actually for
     ============================================================ */
  const PRIORITIES = [
    { id: "safety", label: "Safety", fit: [3, 1, 2], lines: [
      "Deposits are insured to the applicable limits and the balance does not fall.",
      "Investment-based. It can and does lose value in a bad year.",
      "Guaranteed elements exist, but illustrated non-guaranteed values are not promises."] },
    { id: "education", label: "Education", fit: [2, 3, 2], lines: [
      "Works for school, but with no tax advantage for it.",
      "This is the account built for the job. Qualified use is generally federal tax-free.",
      "Can be used for school, but that is not what it is designed around."] },
    { id: "flexibility", label: "Flexibility", fit: [3, 1, 2], lines: [
      "Any purpose, any time, no penalty. Nothing is simpler.",
      "Tied to education. Anything else triggers tax and the additional 10%.",
      "Access is by loan or withdrawal under the contract, which takes planning."] },
    { id: "growth", label: "Growth Potential", fit: [1, 3, 2], lines: [
      "A yield taxed every year is the slowest of the three over long periods.",
      "The full market return with no annual tax drag while it stays invested.",
      "Cash value growth is set by the contract, not the market."] },
    { id: "protection", label: "Protection", fit: [0, 0, 3], lines: [
      "None. If the parent dies, only the balance exists.",
      "None. If the parent dies, only the balance exists.",
      "This is the only one of the three that pays a death benefit from day one."] },
    { id: "legacy", label: "Legacy", fit: [2, 2, 3], lines: [
      "Passes as cash, through the estate unless it is titled to avoid that.",
      "Passes to a named beneficiary and can be redirected to other family.",
      "Designed for it — a death benefit to a named beneficiary, generally income-tax-free."] }
  ];
  const FITWORD = ["Not what it does", "Limited", "Some", "Strong"];

  /* ---------- only write a list when it changed ---------- */
  const LAST = {};
  function redraw(el, html) {
    if (LAST[el.id] === html) return false;
    LAST[el.id] = html; el.innerHTML = html; return true;
  }

  /* ============================================================
     the picture: three paths, same money in
     ============================================================ */
  function geom() {
    const w = window.innerWidth;
    if (w < 700)  return { CW: 480,  CH: 244, PL: 46, PR: 52, PT: 26, PB: 34 };
    if (w < 1100) return { CW: 880,  CH: 288, PL: 56, PR: 78, PT: 28, PB: 36 };
    return         { CW: 1120, CH: 306, PL: 60, PR: 92, PT: 28, PB: 38 };
  }

  function chart(p, w) {
    const g = geom(), CW = g.CW, CH = g.CH;
    const plotW = CW - g.PL - g.PR, plotH = CH - g.PT - g.PB;
    const base = g.PT + plotH;
    const last = 65;
    if (p.until >= last) return "";

    const series = [
      { k: "bank", col: "#2d5b9a", label: "Savings" },
      { k: "plan", col: "#0d7a5f", label: "529" }
    ];
    /* every yearly point from today to 65 */
    const pts = {};
    series.forEach(function (s) { pts[s.k] = []; });
    const rateOf = { bank: w.netApy, plan: p.ret };
    const v18 = { bank: w.bank18, plan: w.plan18 };
    for (let a = p.age; a <= last; a++) {
      const m = Math.max(0, Math.min(a, p.until) - p.age) * 12;
      series.forEach(function (s) {
        const atRate = rateOf[s.k];
        const v = a <= p.until
          ? fv(p.lump, p.monthly, atRate, Math.round(m))
          : on(v18[s.k], atRate, a - p.until);
        pts[s.k].push({ a: a, v: v });
      });
    }
    let top = 1;
    series.forEach(function (s) { pts[s.k].forEach(function (q) { if (q.v > top) top = q.v; }); });
    if (hasIllus) p.cv.forEach(function (v) { if (v > top) top = v; });

    const X = function (a) { return g.PL + (a - p.age) / (last - p.age) * plotW; };
    const Y = function (v) { return base - (v / top) * plotH; };

    let out = "";
    for (let k = 1; k <= 3; k++) {
      const y = Y(top * k / 3);
      out += '<line class="ft-grid" x1="' + g.PL + '" y1="' + y.toFixed(1) +
        '" x2="' + (CW - g.PR) + '" y2="' + y.toFixed(1) + '"/>';
    }
    /* the contributing years, shaded */
    out += '<rect class="ft-fund" x="' + g.PL + '" y="' + g.PT + '" width="' +
      Math.max(0, X(p.until) - g.PL).toFixed(1) + '" height="' + plotH + '"/>' +
      '<text class="ft-fund-lab" x="' + (g.PL + 6) + '" y="' + (g.PT + 12) + '">PAYING IN</text>';

    series.forEach(function (s) {
      let d = "";
      pts[s.k].forEach(function (q, i) {
        d += (i ? "L" : "M") + X(q.a).toFixed(1) + " " + Y(q.v).toFixed(1);
      });
      out += '<path class="ft-line" style="stroke:' + s.col + '" d="' + d + '"/>';
    });

    /* the carrier's illustrated cash value: points, never a projection */
    if (hasIllus) {
      let d = "";
      AGES.forEach(function (a, i) {
        if (a < p.age) return;
        d += (d ? "L" : "M") + X(a).toFixed(1) + " " + Y(p.cv[i]).toFixed(1);
      });
      if (d) out += '<path class="ft-line ft-illus" d="' + d + '"/>';
      AGES.forEach(function (a, i) {
        if (a < p.age) return;
        out += '<circle class="ft-dot" cx="' + X(a).toFixed(1) + '" cy="' + Y(p.cv[i]).toFixed(1) + '" r="3.4"/>';
      });
    }

    /* end labels, nudged apart */
    const ends = [
      { v: w.plan[3], c: "#0b5e4a" },
      { v: w.bank[3], c: "#234a80" }
    ];
    if (hasIllus) ends.push({ v: p.cv[3], c: "#7a520c" });
    ends.sort(function (x, y) { return Y(x.v) - Y(y.v); });
    let prev = -99;
    ends.forEach(function (e) {
      let y = Y(e.v);
      if (y - prev < 13) y = prev + 13;
      prev = y;
      out += '<text class="ft-end" style="fill:' + e.c + '" x="' + (X(last) + 8).toFixed(1) +
        '" y="' + (y + 3.5).toFixed(1) + '">' + usd0(e.v) + '</text>';
    });

    out += '<line class="rb-base" x1="' + g.PL + '" y1="' + base + '" x2="' + (CW - g.PR) + '" y2="' + base + '"/>' +
      '<text class="rb-ax" x="' + (g.PL - 8) + '" y="' + (g.PT + 4) + '" text-anchor="end">' + usd0(top) + '</text>' +
      '<text class="rb-ax" x="' + (g.PL - 8) + '" y="' + (base + 4) + '" text-anchor="end">$0</text>';
    [p.age, 18, 25, 40, 65].forEach(function (a, i) {
      if (a < p.age || (i && a <= p.age)) return;
      out += '<text class="rb-tick" x="' + X(a).toFixed(1) + '" y="' + (CH - 8) +
        '" text-anchor="' + (a === p.age ? "start" : (a === 65 ? "end" : "middle")) +
        '">age ' + a + '</text>';
    });

    return '<svg viewBox="0 0 ' + CW + ' ' + CH + '" class="ft-svg" role="img" ' +
      'data-cs-scale="' + base + ',0,' + Y(top).toFixed(2) + ',' + top + '" ' +
      'aria-label="The three strategies from today to age 65">' + out + '</svg>';
  }

  /* ============================================================
     render
     ============================================================ */
  function run() {
    const p = read(), w = work(p);

    /* ---- banner: the range, not a winner ---- */
    const at18 = [w.bank18, use === "qualified" ? w.plan18 : w.planNet].concat(hasIllus ? [p.cv[0]] : []);
    const lo = Math.min.apply(null, at18), hi = Math.max.apply(null, at18);
    if (p.years <= 0 || w.put <= 0) {
      $("bnLabel").textContent = "START WITH";
      $("bnBig").textContent = "The family goal";
      $("bnSub").textContent = "an age, an amount, and how long you would keep it up";
    } else {
      $("bnLabel").textContent = "AT AGE " + Math.round(p.until) + ", ON THESE ASSUMPTIONS";
      $("bnBig").textContent = usd0(lo) + " – " + usd0(hi);
      $("bnSub").textContent = "the same " + usd(w.put) + " put in, doing three different jobs";
    }

    /* ---- the three result cards ---- */
    $("bankBig").textContent = usd(w.bank18);
    $("bankPut").textContent = usd(w.put);
    $("bankGrow").textContent = usd(w.bankGrowth);
    $("bankRate").textContent = p.apy + "% less " + p.tax + "% tax = " + w.netApy.toFixed(2) + "% net";

    $("planBig").textContent = usd(use === "qualified" ? w.plan18 : w.planNet);
    $("planPut").textContent = usd(w.put);
    $("planEarn").textContent = usd(w.earn);
    $("planHit").textContent = w.hit > 0.5 ? "−" + usd(w.hit) : "$0";
    $("planNet").textContent = usd(w.planNet);
    $("planLead").textContent = use === "qualified"
      ? "Qualified education-use distribution is generally federal tax-free."
      : "Nonqualified use — the earnings face " + p.tax + "% income tax plus the 10% additional federal tax.";

    $("mdbBig").textContent = hasIllus ? usd(p.cv[0]) : "—";
    $("mdbPut").textContent = usd(w.put);
    AGES.forEach(function (a, i) {
      $("mdbCv" + a).textContent = hasIllus ? usd(p.cv[i]) : "—";
      if ($("mdbDb" + a)) $("mdbDb" + a).textContent = hasIllus ? usd(p.db[i]) : "—";
    });
    $("mdbLead").textContent = hasIllus
      ? "Illustrated cash value at age " + Math.round(p.until) + ", entered from the carrier illustration."
      : "No illustration entered. Nothing is projected here — these values have to come from the carrier.";
    $("illusBox").hidden = !hasIllus;
    $("noIllus").hidden = hasIllus;
    document.querySelectorAll(".ft-illus-q button").forEach(function (b) {
      const on2 = (b.getAttribute("data-v") === "yes") === hasIllus;
      b.classList.toggle("is-on", on2);
      b.setAttribute("aria-pressed", on2 ? "true" : "false");
    });

    /* ---- the picture ---- */
    $("chartWrap").innerHTML = chart(p, w);
    $("chartLead").textContent = p.years <= 0
      ? "Set an age and a funding period to see the three paths."
      : "The shaded years are the ones you are paying in. After age " + Math.round(p.until) +
        " nothing more goes in and each carries on at its own rate — except the insurance, " +
        "which is four points from a carrier illustration, not a projection.";
    redraw($("chartKey"), '<span><i style="background:#2d5b9a"></i>High-yield savings</span>' +
      '<span><i style="background:#0d7a5f"></i>529 plan</span>' +
      (hasIllus ? '<span><i style="background:#9a6a12"></i>Illustrated cash value</span>' : ""));

    /* ---- what if life changes ---- */
    const sc = SCENARIOS.filter(function (s) { return s.id === scenario; })[0] || SCENARIOS[0];
    document.querySelectorAll(".ft-scen button").forEach(function (b) {
      const on2 = b.getAttribute("data-v") === scenario;
      b.classList.toggle("is-on", on2);
      b.setAttribute("aria-pressed", on2 ? "true" : "false");
    });
    redraw($("scenRows"), [
      { n: "High-Yield Savings", t: "a" }, { n: "529 Plan", t: "b" }, { n: "Million Dollar Baby", t: "c" }
    ].map(function (x, i) {
      return '<article class="ft-scen-card" data-tint="' + x.t + '">' +
        '<b>' + x.n + '</b><p>' + sc.lines[i] + '</p></article>';
    }).join(""));

    /* ---- what matters most ---- */
    document.querySelectorAll(".ft-pri button").forEach(function (b) {
      const on2 = b.getAttribute("data-v") === priority;
      b.classList.toggle("is-on", on2);
      b.setAttribute("aria-pressed", on2 ? "true" : "false");
    });
    const pr = PRIORITIES.filter(function (x) { return x.id === priority; })[0];
    if (!pr) {
      redraw($("priRows"), "");
      $("priNote").textContent = "Select a priority above to see which features deserve the most attention.";
      $("priNote").hidden = false;
    } else {
      $("priNote").hidden = true;
      redraw($("priRows"), ["High-Yield Savings", "529 Plan", "Million Dollar Baby"]
        .map(function (n, i) {
          return '<article class="ft-pri-card" data-fit="' + pr.fit[i] + '" data-tint="' +
            ["a", "b", "c"][i] + '">' +
            '<header><b>' + n + '</b><span>' + FITWORD[pr.fit[i]] + '</span></header>' +
            '<div class="ft-pips">' + [0, 1, 2].map(function (k) {
              return '<i' + (k < pr.fit[i] ? ' data-on="1"' : '') + '></i>';
            }).join("") + '</div>' +
            '<p>' + pr.lines[i] + '</p></article>';
        }).join(""));
    }

    /* ---- the long view ---- */
    redraw($("longRows"), AGES.map(function (a, i) {
      return '<div class="ft-long' + (a === Math.round(p.until) ? " is-now" : "") + '">' +
        '<span>Age ' + a + '</span>' +
        '<b data-c="a">' + (a < p.until ? "—" : usd(w.bank[i])) + '</b>' +
        '<b data-c="b">' + (a < p.until ? "—" : usd(w.plan[i])) + '</b>' +
        '<b data-c="c">' + (hasIllus ? usd(p.cv[i]) : "—") + '</b></div>';
    }).join(""));

    if (window.WD && window.WD.explain) window.WD.explain.refresh();
    save();
  }

  /* ---------- plumbing ---------- */
  function save() {
    const o = { use: use, hasIllus: hasIllus, scenario: scenario, priority: priority };
    FIELDS.forEach(function (f) { o[f] = $(f).value; });
    try { localStorage.setItem(STORE, JSON.stringify(o)); } catch (e) {}
  }
  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(STORE) || "null"); } catch (e) {}
    if (!s) return;
    FIELDS.forEach(function (f) { if (typeof s[f] === "string" && s[f] !== "") $(f).value = s[f]; });
    if (s.use) { use = s.use; $("fUse").value = use; }
    if (typeof s.hasIllus === "boolean") hasIllus = s.hasIllus;
    if (s.scenario) scenario = s.scenario;
    if (typeof s.priority === "string" || s.priority === null) priority = s.priority;
  }

  $("fUse").innerHTML = '<option value="qualified">Qualified education expenses</option>' +
    '<option value="other">Something other than education</option>';
  $("fUse").addEventListener("change", function () { use = $("fUse").value; run(); });

  FIELDS.forEach(function (f) {
    $(f).addEventListener("input", run);
    $(f).addEventListener("change", run);
  });
  document.querySelectorAll(".ft-illus-q button").forEach(function (b) {
    b.addEventListener("click", function () { hasIllus = b.getAttribute("data-v") === "yes"; run(); });
  });
  document.querySelectorAll(".ft-scen button").forEach(function (b) {
    b.addEventListener("click", function () { scenario = b.getAttribute("data-v"); run(); });
  });
  document.querySelectorAll(".ft-pri button").forEach(function (b) {
    b.addEventListener("click", function () {
      priority = priority === b.getAttribute("data-v") ? null : b.getAttribute("data-v");
      run();
    });
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
    use = DEFAULTS.use; $("fUse").value = use;
    hasIllus = true; scenario = DEFAULTS.scenario; priority = null;
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
    const sc = SCENARIOS.filter(function (s) { return s.id === scenario; })[0] || SCENARIOS[0];
    const pr = PRIORITIES.filter(function (x) { return x.id === priority; })[0];
    const lines = ["Build Their Future — WEALTHDEMO", "",
      "THE FAMILY GOAL",
      "  Child's age today       " + Math.round(p.age),
      "  Amount available today  " + usd(p.lump),
      "  Monthly contribution    " + usd(p.monthly),
      "  Contribute until age    " + Math.round(p.until),
      "  Total put in            " + usd(w.put), "",
      "AT AGE " + Math.round(p.until),
      "  High-yield savings      " + usd(w.bank18) +
        "   (" + p.apy + "% less " + p.tax + "% tax = " + w.netApy.toFixed(2) + "% net)",
      "    contributed " + usd(w.put) + ", growth " + usd(w.bankGrowth),
      "  529 plan                " + usd(use === "qualified" ? w.plan18 : w.planNet) +
        "   (" + p.ret + "%)",
      "    contributed " + usd(w.put) + ", earnings " + usd(w.earn) +
        (w.hit > 0.5 ? ", estimated tax impact −" + usd(w.hit) : ", qualified use, no federal tax"),
      hasIllus
        ? "  Illustrated cash value  " + usd(p.cv[0]) + "   (from the carrier illustration)"
        : "  Life insurance          no illustration entered", "",
      "THESE ARE NOT THREE VERSIONS OF THE SAME PRODUCT.",
      "  A bank account emphasises liquidity and deposit safety; a 529 is an education-focused",
      "  tax-advantaged account; permanent life insurance provides a death benefit and may build",
      "  cash value. Comparing only the largest number can be misleading.", "",
      "LONG-TERM PERSPECTIVE",
      "  Age    Savings        529            Illustrated cash value"];
    AGES.forEach(function (a, i) {
      lines.push("  " + String(a).padEnd(6) +
        (a < p.until ? "—" : usd(w.bank[i])).padEnd(15) +
        (a < p.until ? "—" : usd(w.plan[i])).padEnd(15) +
        (hasIllus ? usd(p.cv[i]) : "—"));
    });
    lines.push("", "IF " + sc.label.toUpperCase());
    ["High-Yield Savings", "529 Plan", "Million Dollar Baby"].forEach(function (n, i) {
      lines.push("  " + n + ": " + sc.lines[i]);
    });
    if (pr) {
      lines.push("", "WHAT MATTERS MOST: " + pr.label.toUpperCase());
      ["High-Yield Savings", "529 Plan", "Million Dollar Baby"].forEach(function (n, i) {
        lines.push("  " + n + " — " + FITWORD[pr.fit[i]] + ": " + pr.lines[i]);
      });
    }
    lines.push("",
      "Educational illustration only. This does not provide tax, legal, investment, or insurance " +
      "advice and does not determine suitability. High-yield savings interest is generally taxable; " +
      "eligible deposits may be FDIC insured only within applicable limits. 529 qualified " +
      "distributions are generally federal tax-free; nonqualified distributions can cause the " +
      "earnings portion to be included in income and may trigger a separate 10% additional federal " +
      "tax unless an exception applies. State tax treatment can differ. Certain eligible 529-to-Roth " +
      "IRA rollovers may be available subject to federal requirements. Permanent life insurance cash " +
      "value access through withdrawals or loans is subject to policy terms; loans and withdrawals " +
      "reduce cash value and death benefit and may cause tax consequences if a policy lapses with a " +
      "gain. Policy benefits and guarantees depend on the issuing insurer and contract.");

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
