/* ============================================================
   WEALTHDEMO — Retirement Withdrawal Calculator

   Year-by-year projection. Spending and Social Security both
   inflate; the gap between them comes out of savings.

   What makes it worth reading:
     · a RANGE, not a date — the same average return in a
       different order moves the answer by years
     · a DIAGNOSIS — it finds what is actually breaking the
       plan rather than only reporting that it broke
     · RANKED LEVERS — every option re-run on these figures and
       sorted by the years it really returns, including the
       ones that return nothing
   ============================================================ */
(function () {
  const $ = function (id) { return document.getElementById(id); };
  if (!$("wNest")) return;

  /* ---------- the projection ---------- */
  function project(p, returns) {
    let bal = p.nest, age = p.ret;
    const hist = [[p.ret, p.nest]];

    while (age < p.end) {
      const yr = age - p.ret;
      const need = p.want * 12 * Math.pow(1 + p.infl, yr) * (p.grossUp || 1);
      const ssInc = age >= p.ssAge ? p.ss * 12 * Math.pow(1 + p.infl, yr) : 0;
      const earn = (p.earn && yr < (p.earnYears || 0)) ? p.earn * 12 : 0;
      const draw = Math.max(0, need - ssInc - earn);

      const before = bal;
      bal -= draw;
      if (bal <= 0) {
        const frac = draw > 0 ? before / draw : 0;
        hist.push([age + frac, 0]);
        return { out: age + frac, hist: hist, survived: false };
      }
      const g = (returns && yr < returns.length) ? returns[yr] : p.growth;
      bal *= (1 + g);
      hist.push([age + 1, bal]);
      age++;
    }
    return { out: p.end, hist: hist, survived: true, left: bal };
  }

  const lastsTo = function (p, r) { return project(p, r).out; };

  /* how much a month this pot really supports to the end age */
  function safeMonthly(p) {
    let lo = 0, hi = 40000;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (lastsTo(Object.assign({}, p, { want: mid })) >= p.end - 0.01) lo = mid; else hi = mid;
    }
    return lo;
  }

  /* what the pot would have had to be */
  function needNest(p) {
    let lo = 0, hi = 20000000;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (lastsTo(Object.assign({}, p, { nest: mid })) >= p.end - 0.01) hi = mid; else lo = mid;
    }
    return hi;
  }

  /* ---------- sequence of returns ----------
     One bad decade and one good one, rescaled so both have
     exactly the same geometric mean as the entered growth
     rate. Any difference in the answer is the ORDER alone. */
  const SHAPE = [-0.12, -0.06, 0.03, 0.05, 0.05, 0.08, 0.09, 0.08, 0.07, 0.07];

  function sequence(growth, reverse) {
    const arr = reverse ? SHAPE.slice().reverse() : SHAPE.slice();
    let prod = 1;
    arr.forEach(function (r) { prod *= (1 + r); });
    const k = (1 + growth) / Math.pow(prod, 1 / arr.length);
    return arr.map(function (r) { return (1 + r) * k - 1; });
  }

  /* ---------- the Social Security tax test ----------
     The same provisional-income rule the tax tool uses, so the
     two pages agree. Used only to size the gross-up. */
  function taxableSS(ss, other, joint) {
    const base = joint ? 32000 : 25000, top = joint ? 44000 : 34000;
    const prov = other + ss / 2;
    if (prov <= base) return 0;
    if (prov <= top) return Math.min(0.5 * (prov - base), 0.5 * ss);
    const first = Math.min(0.5 * (top - base), 0.5 * ss);
    return Math.min(0.85 * (prov - top) + first, 0.85 * ss);
  }

  /* ---------- formatting ---------- */
  const usd = function (n) { return "$" + Math.round(n).toLocaleString("en-US"); };
  const usd0 = function (n) { return "$" + Math.round(n / 1000) + "k"; };
  const yrs = function (n) { return (n >= 0 ? "+" : "−") + Math.abs(n).toFixed(1); };

  /* ---------- read the form ---------- */
  const FIELDS = ["wNest", "wRet", "wEnd", "wWant", "wSS", "wSSAge", "wGrowth", "wInfl", "wBracket", "wFiling"];
  const STORE = "wealthdemo.tool.withdraw";

  function num(id, fallback) {
    const v = parseFloat($(id).value);
    return isFinite(v) ? v : fallback;
  }

  function read() {
    return {
      nest: Math.max(0, num("wNest", 520000)),
      ret: Math.min(90, Math.max(40, num("wRet", 65))),
      end: Math.max(60, num("wEnd", 95)),
      want: Math.max(0, num("wWant", 4500)),
      ss: Math.max(0, num("wSS", 2100)),
      ssAge: Math.max(50, num("wSSAge", 67)),
      growth: num("wGrowth", 5) / 100,
      infl: num("wInfl", 3) / 100,
      rate: num("wBracket", 22) / 100,
      joint: $("wFiling").value === "joint"
    };
  }

  /* ---------- levers ---------- */
  function levers(p, base) {
    const out = [];
    const add = function (title, note, res, tone) {
      out.push({ title: title, note: note, gain: res - base, reaches: res, tone: tone || "" });
    };

    /* work longer — the pot keeps growing and the draw starts later.
       Skip any year the Social Security lever already covers. */
    [2, 3].forEach(function (n) {
      if (p.ssAge === p.ret + n && p.ssAge > p.ret) return;
      const later = Object.assign({}, p, { ret: p.ret + n, nest: p.nest * Math.pow(1 + p.growth, n) });
      add("Retire at " + (p.ret + n) + ", not " + p.ret,
          n + " more years in, " + n + " fewer out",
          lastsTo(later));
    });

    /* retire when Social Security starts — only meaningful if there is a bridge */
    if (p.ssAge > p.ret) {
      const n = p.ssAge - p.ret;
      const match = Object.assign({}, p, { ret: p.ssAge, nest: p.nest * Math.pow(1 + p.growth, n) });
      add("Retire at " + p.ssAge + ", when Social Security starts",
          "Removes the bridge entirely", lastsTo(match));
    }

    /* spend less */
    [500].forEach(function (d) {
      if (p.want - d <= 0) return;
      add("Live on " + usd(p.want - d) + " instead of " + usd(p.want),
          usd(d) + " a month less, for good",
          lastsTo(Object.assign({}, p, { want: p.want - d })));
    });

    /* part-time across the bridge */
    if (p.ssAge > p.ret) {
      const n = p.ssAge - p.ret;
      add("Earn " + usd(2000) + "/mo at " + p.ret + (n > 1 ? "–" + (p.ssAge - 1) : "") + " only",
          "Part-time, just across the bridge",
          lastsTo(Object.assign({}, p, { earn: 2000, earnYears: n })));
    }

    /* markets — deliberately marked as not theirs to decide */
    add("Markets return " + ((p.growth + 0.01) * 100).toFixed(1) + "% instead of " + (p.growth * 100).toFixed(1) + "%",
        "Not yours to decide",
        lastsTo(Object.assign({}, p, { growth: p.growth + 0.01 })), "outside");

    /* delay Social Security — 8% a year in delayed credits */
    if (p.ssAge < 70) {
      const bump = 1 + 0.08 * (70 - p.ssAge);
      add("Delay Social Security to 70",
          "+" + Math.round((bump - 1) * 100) + "% a month, three years later",
          lastsTo(Object.assign({}, p, { ss: p.ss * bump, ssAge: 70 })), "check");
    }

    out.sort(function (a, b) { return b.gain - a.gain; });
    return out;
  }

  /* ---------- diagnosis ---------- */
  function diagnose(p, base) {
    const bridgeYears = Math.max(0, Math.min(p.ssAge, p.end) - p.ret);
    let bridgeDraw = 0;
    for (let i = 0; i < bridgeYears; i++) bridgeDraw += p.want * 12 * Math.pow(1 + p.infl, i);
    const bridgeShare = p.nest > 0 ? bridgeDraw / p.nest : 0;

    const rate0 = p.nest > 0 ? (p.want * 12) / p.nest : 0;
    const afterYr = Math.max(0, p.ssAge - p.ret);
    const rateAfter = p.nest > 0
      ? Math.max(0, (p.want - p.ss) * 12 * Math.pow(1 + p.infl, afterYr)) / p.nest
      : 0;

    if (base >= p.end - 0.01) {
      return {
        title: "This plan holds.",
        body: "At " + usd(p.want) + " a month the savings reach " + p.end + " and keep going. The question stops being whether it lasts and becomes what else it could be doing — taxes, market risk, and what reaches the people after you.",
        s1: (rate0 * 100).toFixed(1) + "%", s1l: "First-year draw", s1t: "good",
        s2: (rateAfter * 100).toFixed(1) + "%", s2l: "Draw from " + p.ssAge, s2t: "good"
      };
    }

    /* A draw that stays unsustainable after benefits start is a rate
       problem, not a bridge problem — no retirement date fixes it. */
    const dropsAfterSS = rateAfter < rate0 * 0.8;

    if (rateAfter > 0.08) {
      return {
        title: "The rate is the problem, not the timing.",
        body: "Even once Social Security is running, " + usd(Math.max(0, (p.want - p.ss) * 12)) +
              " a year still has to come out of " + usd(p.nest) + " — " + (rateAfter * 100).toFixed(1) +
              "% a year, rising with inflation. No retirement date fixes a draw that size; the spending or the balance has to move.",
        s1: (rate0 * 100).toFixed(1) + "%", s1l: "First-year draw", s1t: "bad",
        s2: (rateAfter * 100).toFixed(1) + "%", s2l: "Draw from " + p.ssAge, s2t: "bad"
      };
    }

    if (bridgeYears >= 1 && bridgeShare >= 0.12 && dropsAfterSS) {
      return {
        title: bridgeYears === 1 ? "One year does most of the damage." : bridgeYears + " years do most of the damage.",
        body: "Social Security doesn't start until " + p.ssAge + ", so " +
              (bridgeYears === 1 ? "age " + p.ret + " comes" : "ages " + p.ret + " to " + (p.ssAge - 1) + " come") +
              " entirely out of savings — " + usd(bridgeDraw) + ", or " + Math.round(bridgeShare * 100) +
              "% of the portfolio, in " + (bridgeYears * 12) + " months. From " + p.ssAge +
              " onward the draw falls to " + (rateAfter * 100).toFixed(1) +
              "% a year and the plan behaves itself. The retirement isn't too expensive; the bridge is.",
        s1: (rate0 * 100).toFixed(1) + "%", s1l: "Draw at " + p.ret + (bridgeYears > 1 ? "–" + (p.ssAge - 1) : ""), s1t: "bad",
        s2: (rateAfter * 100).toFixed(1) + "%", s2l: "Draw from " + p.ssAge, s2t: "good"
      };
    }

    if (rateAfter > 0.05) {
      return {
        title: "The rate is the problem, not the timing.",
        body: "Even with Social Security running, " + usd((p.want - p.ss) * 12) +
              " a year still has to come out of " + usd(p.nest) + " — " + (rateAfter * 100).toFixed(1) +
              "% a year, rising with inflation. No retirement date fixes a draw that size; the spending or the balance has to move.",
        s1: (rate0 * 100).toFixed(1) + "%", s1l: "First-year draw", s1t: "bad",
        s2: (rateAfter * 100).toFixed(1) + "%", s2l: "Draw from " + p.ssAge, s2t: "bad"
      };
    }

    return {
      title: "It's the length of the run.",
      body: "The draw is not extreme, but " + Math.round(p.end - p.ret) +
            " years is a long time to fund and inflation compounds against you the whole way. " +
            usd(p.want) + " today is " + usd(p.want * Math.pow(1 + p.infl, p.end - p.ret)) +
            " by " + p.end + ".",
      s1: (rate0 * 100).toFixed(1) + "%", s1l: "First-year draw", s1t: "warn",
      s2: (rateAfter * 100).toFixed(1) + "%", s2l: "Draw from " + p.ssAge, s2t: "warn"
    };
  }

  /* ---------- chart ---------- */
  const CW = 640, CH = 268, PL = 56, PR = 8, PB = 48, PT = 14;

  function chart(p, straight, bad, safe) {
    const x0 = p.ret, x1 = p.end;
    const plotW = CW - PL - PR, plotH = CH - PT - PB;
    let ymax = 0;
    [straight, bad, safe].forEach(function (h) {
      h.forEach(function (pt) { ymax = Math.max(ymax, pt[1]); });
    });
    ymax = Math.max(ymax, 1);
    const X = function (a) { return PL + (Math.min(a, x1) - x0) / (x1 - x0) * plotW; };
    const Y = function (v) { return PT + plotH - Math.min(v, ymax) / ymax * plotH; };
    const line = function (h) { return h.map(function (pt) { return X(pt[0]).toFixed(1) + "," + Y(pt[1]).toFixed(1); }).join(" "); };

    const gy = [0, 0.25, 0.5, 0.75, 1];
    let grid = "", labels = "";
    gy.forEach(function (f) {
      const y = PT + plotH - f * plotH;
      grid += '<line x1="' + PL + '" y1="' + y.toFixed(1) + '" x2="' + (CW - PR) + '" y2="' + y.toFixed(1) + '"/>';
      labels += '<text x="' + (PL - 8) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end">' + usd0(ymax * f) + '</text>';
    });

    /* age ticks */
    let ticks = "";
    const step = (x1 - x0) > 25 ? 5 : 2;
    for (let a = x0; a <= x1; a += step) {
      ticks += '<text x="' + X(a).toFixed(1) + '" y="' + (PT + plotH + 18) + '" text-anchor="middle">' + a + '</text>';
    }

    const outS = straight[straight.length - 1], outB = bad[bad.length - 1];
    const bridge = p.ssAge > p.ret
      ? '<rect x="' + PL + '" y="' + PT + '" width="' + (X(Math.min(p.ssAge, p.end)) - PL).toFixed(1) +
        '" height="' + plotH + '" fill="#fdf0f1"/>' +
        '<text x="' + ((PL + X(Math.min(p.ssAge, p.end))) / 2).toFixed(1) + '" y="' + (PT + plotH + 34) +
        '" text-anchor="middle" class="c-bridge">BRIDGE</text>'
      : "";

    /* the band between the two futures */
    const band = line(straight) + " " + bad.slice().reverse().map(function (pt) {
      return X(pt[0]).toFixed(1) + "," + Y(pt[1]).toFixed(1);
    }).join(" ");

    return '<svg viewBox="0 0 ' + CW + ' ' + CH + '" class="wd-chart" data-cs-ref="c-safe" data-cs-why="Both solid lines earn the same average return and draw the same income \u2014 only the order of the good and bad years differs." role="img" aria-label="Balance by age">' +
      '<g class="c-grid">' + grid + '</g>' +
      '<g class="c-axis">' + labels + '</g>' +
      bridge +
      '<polygon class="c-band" points="' + band + '"/>' +
      '<polyline class="c-safe" points="' + line(safe) + '"/>' +
      '<polyline class="c-bad" points="' + line(bad) + '"/>' +
      '<polyline class="c-line" points="' + line(straight) + '"/>' +
      (outB[1] <= 0 ? '<circle class="c-dot-bad" cx="' + X(outB[0]).toFixed(1) + '" cy="' + Y(0).toFixed(1) + '" r="5.5"/>' : '') +
      (outS[1] <= 0 ? '<circle class="c-dot" cx="' + X(outS[0]).toFixed(1) + '" cy="' + Y(0).toFixed(1) + '" r="5.5"/>' : '') +
      '<line class="c-base" x1="' + PL + '" y1="' + (PT + plotH) + '" x2="' + (CW - PR) + '" y2="' + (PT + plotH) + '"/>' +
      '<g class="c-axis">' + ticks + '</g>' +
      '<text x="' + (PL + plotW / 2) + '" y="' + (CH - 6) + '" text-anchor="middle" class="c-axis-title">Your age</text>' +
      '</svg>';
  }

  /* ---------- render ---------- */
  function run() {
    const p = read();
    if (p.end <= p.ret) { $("wEnd").value = p.ret + 1; return run(); }

    const straight = project(p);
    const bad = project(p, sequence(p.growth, false));
    const good = project(p, sequence(p.growth, true));

    const base = straight.out;
    const lo = Math.min(bad.out, good.out, base);
    const hi = Math.max(bad.out, good.out, base);
    const safeM = safeMonthly(p);
    const safeRun = project(Object.assign({}, p, { want: safeM }));
    const need = needNest(p);
    const short = Math.max(0, need - p.nest);
    const held = base >= p.end - 0.01;

    /* ---- headline ---- */
    const spread = hi - lo;
    if (held && lo >= p.end - 0.01) {
      $("ansHeadline").innerHTML = "The money lasts past <span class=\"hot good\">" + p.end + "</span>, whatever order the returns come in.";
      $("ansSub").innerHTML = "Even the poor-first-decade run reaches " + p.end + ". At " + usd(p.want) +
        " a month there is room here — the next question is tax and risk, not longevity.";
    } else if (spread >= 1) {
      /* one age to hold on to, then the honest spread underneath */
      $("ansHeadline").innerHTML = "The money lasts to about <span class=\"hot\">age " +
        Math.floor(base) + "</span>.";
      $("ansSub").innerHTML = "Somewhere between <b>" + Math.floor(lo) + "</b> and <b>" + Math.floor(hi) +
        "</b>, depending on the order the returns arrive in. Same average return either way — poor returns in the first decade " +
        "cost " + Math.round(spread) + " years.";
    } else {
      $("ansHeadline").innerHTML = "The money runs out at <span class=\"hot\">age " + Math.floor(base) + "</span>.";
      $("ansSub").innerHTML = "The order of returns barely moves it at this spending level — every run lands within a year.";
    }

    /* ---- shortfall ---- */
    $("shortBox").hidden = held;
    $("surplusBox").hidden = !held;
    if (!held) {
      $("shortAmt").textContent = usd(short);
      $("shortNote").textContent = usd(need) + " would have been needed at " + p.ret + ". You have " + usd(p.nest) + ".";
    } else {
      $("surplusAmt").textContent = usd(straight.left || 0);
      $("surplusNote").textContent = "Projected to be left at " + p.end + " at a level " + (p.growth * 100).toFixed(1) + "% return.";
    }

    /* ---- timeline ---- */
    const span = p.end - p.ret;
    const pctLo = Math.max(0, Math.min(100, (lo - p.ret) / span * 100));
    const pctHi = Math.max(0, Math.min(100, (hi - p.ret) / span * 100));
    $("tlSolid").style.width = pctLo + "%";
    $("tlBand").style.left = pctLo + "%";
    $("tlBand").style.width = Math.max(0, pctHi - pctLo) + "%";
    $("tlGone").style.left = pctHi + "%";
    $("dotLo").style.left = pctLo + "%";
    $("dotHi").style.left = pctHi + "%";
    $("dotLo").hidden = spread < 1 || held;
    $("dotHi").hidden = held;
    $("lblStart").textContent = "Age " + p.ret;
    $("lblLo").textContent = Math.floor(lo);
    $("lblHi").textContent = Math.floor(hi);
    $("lblEnd").textContent = "Age " + p.end;
    $("lblLoWrap").hidden = spread < 1 || held;
    $("lblHiWrap").hidden = held;
    $("lblLoWrap").style.left = pctLo + "%";
    $("lblHiWrap").style.left = pctHi + "%";

    /* ---- figures ---- */
    $("figNest").textContent = usd(p.nest);
    $("figWant").innerHTML = usd(p.want) + "<small>/mo</small>";
    $("figSupport").innerHTML = usd(safeM) + "<small>/mo</small>";
    $("figSupportLabel").textContent = "Sustainable income to " + p.end;

    /* ---- diagnosis ---- */
    const dx = diagnose(p, base);
    $("dxTitle").textContent = dx.title;
    $("dxBody").textContent = dx.body;
    $("dxS1").textContent = dx.s1; $("dxS1L").textContent = dx.s1l; $("dxS1").className = "dx-figure " + dx.s1t;
    $("dxS2").textContent = dx.s2; $("dxS2L").textContent = dx.s2l; $("dxS2").className = "dx-figure " + dx.s2t;

    /* ---- chart ---- */
    $("chartWrap").innerHTML = chart(p, straight.hist, bad.hist, safeRun.hist);
    $("chartSafeLabel").textContent = "Safe rate \u2014 " + usd(safeM) + "/mo";

    /* ---- levers ---- */
    const ls = levers(p, base);
    const maxGain = Math.max.apply(null, ls.map(function (l) { return Math.abs(l.gain); }).concat([1]));
    const list = $("leverList");
    list.innerHTML = "";
    ls.forEach(function (l, i) {
      const row = document.createElement("div");
      const dud = l.gain < 0.5;
      row.className = "lever" + (i === 0 && !dud ? " is-top" : "") +
                      (l.tone === "outside" ? " is-outside" : "") + (dud ? " is-dud" : "");
      const w = Math.max(1.5, Math.abs(l.gain) / maxGain * 100);
      row.innerHTML =
        '<div class="lv-head">' +
          '<span class="lv-rank"></span>' +
          '<div class="lv-text"><b></b><small></small></div>' +
        '</div>' +
        '<div class="lv-bar"><i style="width:' + w.toFixed(1) + '%"></i></div>' +
        '<div class="lv-num"><b></b><small></small></div>';
      const rank = row.querySelector(".lv-rank");
      if (dud) rank.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7.5v5.5"/><path d="M12 16.5h.01"/></svg>';
      else rank.textContent = i + 1;
      row.querySelector(".lv-text b").textContent = l.title;
      row.querySelector(".lv-text small").textContent = dud && l.tone === "check"
        ? "The usual advice — and it doesn't help here" : l.note;
      row.querySelector(".lv-num b").innerHTML = yrs(l.gain) + "<span> yrs</span>";
      row.querySelector(".lv-num small").textContent = l.reaches >= p.end - 0.01
        ? "reaches " + p.end : "reaches " + Math.floor(l.reaches);
      list.appendChild(row);
    });
    $("leverNeed").textContent = held
      ? "Already reaches " + p.end
      : "Needs " + (p.end - base).toFixed(1) + " more years to reach " + p.end;

    /* ---- the dud, explained ---- */
    const dud = ls.filter(function (l) { return l.tone === "check" && l.gain < 0.5; })[0];
    $("dudNote").hidden = !dud;
    if (dud) {
      $("dudBody").textContent = "A bigger cheque at 70 is worth less than not draining the account at " + p.ret +
        ". The extra bridge years cost more than the delayed credits return. The right advice for most people is the wrong advice here — and that only shows up once the numbers are theirs.";
    }

    /* ---- tax drag, using the same test as the tax tool ---- */
    const draw1 = Math.max(0, p.want * 12 - (p.ret >= p.ssAge ? p.ss * 12 : 0));
    const ssYr = p.ret >= p.ssAge ? p.ss * 12 : 0;
    const taxed = taxableSS(ssYr, draw1, p.joint);
    const tax1 = (draw1 + taxed) * p.rate;
    const grossUp = draw1 > 0 ? (p.want * 12 + tax1) / (p.want * 12) : 1;
    const taxed2 = taxableSS(p.ss * 12, Math.max(0, p.want * 12 - p.ss * 12), p.joint);

    if (grossUp > 1.01 && !held) {
      const withTax = lastsTo(Object.assign({}, p, { grossUp: grossUp }));
      $("taxNote").hidden = false;
      $("taxBody").innerHTML = "These withdrawals are taxable, and they make " + usd(taxed2) +
        " of the Social Security taxable too. To actually <em>net</em> " + usd(p.want) +
        " a month the draw has to be about " + usd(p.want * grossUp) + " — which pulls the date in a further <b>" +
        (base - withTax).toFixed(1) + " years, to " + Math.floor(withTax) + "</b>. " +
        '<a href="tool.html">See it in Will My Social Security Be Taxed? →</a>';
    } else {
      $("taxNote").hidden = true;
    }

    /* ---- the sentence ---- */
    const top = ls[0];
    let say;
    if (held) {
      say = "“Good news — at " + usd(p.want) + " a month this holds all the way to " + p.end +
            ". So let's spend our time on the two things that can still go wrong: what the tax bill does to it, and what happens to the survivor when one cheque stops.”";
    } else if (dx.title.indexOf("damage") > -1) {
      say = "“It isn't the " + Math.round(p.end - p.ret) + " years of retirement that breaks this — it's the " +
            ((p.ssAge - p.ret) * 12) + " months before Social Security starts. The single biggest move is simple — " +
            top.title.toLowerCase() + ". That one decision takes the money from " + Math.floor(base) + " to " +
            Math.floor(top.reaches) + ", more than everything else on this page put together.”";
    } else {
      say = "“At " + usd(p.want) + " a month the money runs out around " + Math.floor(base) + ", and you planned to " +
            p.end + ". The single biggest move is " + top.title.toLowerCase() +
            " — that alone buys " + top.gain.toFixed(1) + " years. Which of these feels more like your life?”";
    }
    $("sayIt").textContent = say;

    save();
  }

  /* ---------- persistence ---------- */
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

  /* pick up anything the Blueprint already knows */
  function seed() {
    let m = null;
    try { m = JSON.parse(localStorage.getItem("wealthdemo.progress.v2") || "null"); } catch (e) {}
    if (!m) return;
    const map = { wNest: ["savings", "retirementSavings", "nestEgg"], wSS: ["socialSecurity"], wRet: ["retireAge"] };
    Object.keys(map).forEach(function (id) {
      map[id].forEach(function (k) {
        const v = parseFloat(m[k]);
        if (isFinite(v) && v > 0 && !$(id).dataset.touched) $(id).value = v;
      });
    });
  }

  FIELDS.forEach(function (f) {
    $(f).addEventListener("input", function () { $(f).dataset.touched = "1"; run(); });
    $(f).addEventListener("change", run);
  });

  /* ---------- actions ---------- */
  const DEFAULTS = { wNest: 520000, wRet: 65, wEnd: 95, wWant: 4500, wSS: 2100, wSSAge: 67, wGrowth: 5, wInfl: 3, wBracket: 22, wFiling: "single" };

  const moreBtn = $("moreBtn"), moreMenu = $("moreMenu");
  if (moreBtn && moreMenu) {
    moreBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      const open = moreMenu.hasAttribute("hidden");
      moreMenu.toggleAttribute("hidden", !open);
      moreBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", function () { moreMenu.setAttribute("hidden", ""); });
    moreMenu.addEventListener("click", function (e) { e.stopPropagation(); });
  }
  if ($("printBtn")) $("printBtn").addEventListener("click", function () { window.print(); });
  if ($("resetBtn")) $("resetBtn").addEventListener("click", function () {
    FIELDS.forEach(function (f) { $(f).value = DEFAULTS[f]; delete $(f).dataset.touched; });
    moreMenu.setAttribute("hidden", "");
    run();
  });

  if ($("sendBtn")) $("sendBtn").addEventListener("click", function () {
    const p = read();
    const btn = $("sendBtn"), old = btn.innerHTML;
    const lines = [
      "Retirement Withdrawal — WEALTHDEMO",
      "",
      "Saved at " + p.ret + ": " + usd(p.nest),
      "Income wanted: " + usd(p.want) + "/mo  ·  Social Security " + usd(p.ss) + "/mo from " + p.ssAge,
      "Growth " + (p.growth * 100).toFixed(1) + "%  ·  inflation " + (p.infl * 100).toFixed(1) + "%  ·  plan to " + p.end,
      "",
      $("ansHeadline").textContent,
      $("ansSub").textContent,
      "",
      "WHAT'S BREAKING IT",
      "  " + $("dxTitle").textContent,
      "  " + $("dxBody").textContent,
      "",
      "WHAT BUYS THE MOST YEARS"
    ];
    Array.prototype.forEach.call($("leverList").children, function (row) {
      lines.push("  " + row.querySelector(".lv-text b").textContent + " — " +
                 row.querySelector(".lv-num b").textContent.replace(" yrs", " yrs") + ", " +
                 row.querySelector(".lv-num small").textContent);
    });
    lines.push("", $("sayIt").textContent, "",
      "A projection at the growth and inflation entered. It does not model market sequence beyond the range shown, tax beyond the note on screen, RMDs, Medicare/IRMAA, long-term care or the survivor's lost benefit.");

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lines.join("\n")).then(function () {
        btn.classList.add("is-done"); btn.textContent = "Summary copied";
        setTimeout(function () { btn.innerHTML = old; btn.classList.remove("is-done"); }, 2600);
      }, function () {
        btn.textContent = "Copy blocked"; setTimeout(function () { btn.innerHTML = old; }, 2000);
      });
    }
  });

  load();
  seed();
  run();
})();
