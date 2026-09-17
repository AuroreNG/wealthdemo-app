/* ============================================================
   WEALTHDEMO — If Your Paycheck Stopped Today

   Two lanes on one timeline. The top lane is savings on their
   own. The bottom is savings with a policy behind them. Because
   both run on the same months, the extra length of the bottom
   lane IS what the policy is worth — you don't have to subtract
   anything to see it.

   The one honest complication: a policy that waits. If the
   savings can't reach the day the payout lands, the bottom lane
   stops where the top one does and the money that would have
   arrived is drawn as a ghost, sitting past the end.
   ============================================================ */
(function () {
  const $ = function (id) { return document.getElementById(id); };
  if (!$("pBills")) return;

  const usd = function (n) {
    const a = Math.abs(n);
    return (n < 0 ? "−$" : "$") + Math.round(a).toLocaleString("en-US");
  };
  const mo = function (n) {
    if (!isFinite(n)) return "as long as you like";
    const r = Math.round(n * 10) / 10;
    return r + (Math.abs(r - 1) < 0.05 ? " month" : " months");
  };
  /* long stretches read better in years than in a two-digit month count */
  const span = function (n) {
    if (!isFinite(n)) return "—";
    if (n < 0.05) return "None";
    if (n >= 120) return "10 yrs +";
    if (n >= 60) return "5 yrs +";
    if (n >= 36) return Math.floor(n / 12) + " yrs +";
    return mo(n);
  };
  const spanTxt = function (n) {
    if (!isFinite(n)) return "as long as you like";
    if (n < 0.05) return "no time at all";
    if (n >= 120) return "over ten years";
    if (n >= 60) return "over five years";
    if (n >= 36) return "over " + Math.floor(n / 12) + " years";
    return mo(n);
  };
  const days = function (n) {
    const d = Math.round(n);
    return d + (d === 1 ? " day" : " days");
  };

  const FIELDS = ["pBills", "pCont", "pSav", "pBen", "pWait", "pGoal", "pSpare", "pYears"];
  const STORE = "wealthdemo.tool.paycheck";
  const DEFAULTS = { pBills: 6000, pCont: 0, pSav: 18000, pBen: 80000,
                     pWait: 0, pGoal: 12, pSpare: 30000, pYears: 10 };

  function num(id, d) { const v = parseFloat($(id).value); return isFinite(v) ? v : d; }

  function read() {
    return {
      bills: Math.max(0, num("pBills", 6000)),
      cont: Math.max(0, num("pCont", 0)),
      sav: Math.max(0, num("pSav", 18000)),
      ben: Math.max(0, num("pBen", 80000)),
      wait: Math.max(0, num("pWait", 0)),
      goal: Math.max(1, num("pGoal", 12)),
      spare: Math.max(0, num("pSpare", 30000)),
      years: Math.max(0, num("pYears", 10))
    };
  }

  function work(p) {
    const gap = Math.max(0, p.bills - p.cont);
    const alone = gap > 0 ? p.sav / gap : Infinity;

    /* the bills that fall due before a payout could arrive */
    const bridge = gap * p.wait;
    /* if savings can't reach that day, the payout lands too late to help */
    const tooLate = p.ben > 0 && p.wait > 0 && p.sav < bridge;
    const both = gap > 0 ? (tooLate ? alone : (p.sav + p.ben) / gap) : Infinity;

    return {
      gap: gap, alone: alone, both: both,
      bridge: bridge, bridgeShort: Math.max(0, bridge - p.sav), tooLate: tooLate,
      pays: p.ben > 0,
      total: p.sav + p.ben,
      adds: (isFinite(both) && isFinite(alone)) ? Math.max(0, both - alone) : 0,
      needForGoal: gap * p.goal,
      shortForGoal: Math.max(0, gap * p.goal - p.sav),
      /* what a thousand dollars of savings actually buys, in days */
      perK: gap > 0 ? (1000 / gap) * 30.44 : 0,
      at6: p.spare * Math.pow(1.06, p.years),
      at8: p.spare * Math.pow(1.08, p.years)
    };
  }

  /* ============================================================
     the runway
     ============================================================ */
  function geom() {
    const w = window.innerWidth;
    if (w < 700)  return { CW: 460, PL: 12, PR: 14, lane: 34, gapY: 26, top: 40, rule: 30, small: true };
    if (w < 1100) return { CW: 820, PL: 16, PR: 20, lane: 40, gapY: 28, top: 44, rule: 34, small: false };
    return { CW: 1100, PL: 18, PR: 24, lane: 46, gapY: 30, top: 46, rule: 36, small: false };
  }

  function runway(p, w) {
    const g = geom(), CW = g.CW;
    const plotW = CW - g.PL - g.PR;
    const CH = g.top + g.lane * 2 + g.gapY + g.rule;

    /* how far out to draw — enough to hold the longer lane and the goal */
    const longest = Math.max(isFinite(w.both) ? w.both : 0, p.goal, w.tooLate ? p.wait + 1 : 0);
    const N = Math.min(36, Math.max(12, Math.ceil(longest * 1.12)));
    const X = function (m) { return g.PL + Math.min(m, N) / N * plotW; };

    const yA = g.top, yB = g.top + g.lane + g.gapY;
    const r = 7;

    function track(y) {
      return '<rect class="rw-track" x="' + g.PL + '" y="' + y + '" width="' + plotW +
        '" height="' + g.lane + '" rx="' + r + '"/>';
    }
    function seg(x1, x2, y, cls) {
      if (x2 - x1 < 0.6) return "";
      return '<rect class="' + cls + '" x="' + x1.toFixed(1) + '" y="' + y + '" width="' + (x2 - x1).toFixed(1) +
        '" height="' + g.lane + '" rx="' + r + '"/>';
    }
    /* the label rides inside the filled lane when there's room, outside when there isn't */
    function cap(x, y, text) {
      /* generous, because a clipped label is worse than one sitting outside */
      const need = text.length * 8.4 + 22;
      const inside = (x - g.PL) > need;
      return '<text class="rw-cap' + (inside ? " in" : "") + '" x="' + (inside ? x - 10 : x + 10).toFixed(1) +
        '" y="' + (y + g.lane / 2 + (g.small ? 4 : 5)) +
        '" text-anchor="' + (inside ? "end" : "start") + '">' + text + '</text>';
    }

    let out = "";

    const xAlone = X(isFinite(w.alone) ? w.alone : N);
    const xBoth = X(isFinite(w.both) ? w.both : N);

    /* ---- lane A: savings on their own ---- */
    out += track(yA);
    if (p.cont > 0 && p.bills > 0) out += seg(g.PL, g.PL + plotW, yA, "rw-cont");
    if (p.bills > 0) out += seg(g.PL, xAlone, yA, "rw-sav" + (w.alone < p.goal ? " is-short" : ""));
    if (p.bills > 0) out += cap(xAlone, yA, isFinite(w.alone) ? span(w.alone) : "no limit");

    /* ---- lane B: savings and a policy ---- */
    out += track(yB);
    if (p.cont > 0 && p.bills > 0) out += seg(g.PL, g.PL + plotW, yB, "rw-cont");
    if (p.bills > 0) {
      out += seg(g.PL, xAlone, yB, "rw-sav");
      if (!w.tooLate && w.pays) out += seg(xAlone, xBoth, yB, "rw-ben");
    }
    /* a payout that lands too late is drawn as a ghost, out past the end */
    if (w.tooLate) {
      const gx = X(p.wait), gx2 = X(Math.min(N, p.wait + p.ben / w.gap));
      out += '<rect class="rw-ghost" x="' + gx.toFixed(1) + '" y="' + yB + '" width="' +
        Math.max(8, gx2 - gx).toFixed(1) + '" height="' + g.lane + '" rx="' + r + '"/>' +
        '<text class="rw-ghost-lab" x="' + ((gx + Math.max(gx + 8, gx2)) / 2).toFixed(1) + '" y="' +
        (yB + g.lane / 2 + 4) + '" text-anchor="middle">PAYS AFTER FUND IS GONE</text>';
    }
    if (p.bills > 0) out += cap(xBoth, yB, isFinite(w.both) ? span(w.both) : "no limit");

    /* ---- the months where nothing is paid ---- */
    if (p.wait > 0 && w.pays && p.bills > 0) {
      const wx = X(p.wait);
      out += '<rect class="rw-wait" x="' + g.PL + '" y="' + yB + '" width="' + (wx - g.PL).toFixed(1) +
        '" height="' + g.lane + '" rx="' + r + '"/>' +
        '<line class="rw-waitline" x1="' + wx.toFixed(1) + '" y1="' + (yB - 4) +
        '" x2="' + wx.toFixed(1) + '" y2="' + (yB + g.lane + 4) + '"/>' +
        '<text class="rw-waitlab" x="' + wx.toFixed(1) + '" y="' + (yB + g.lane + 16) +
        '" text-anchor="middle">benefit begins</text>';
    }

    /* ---- the goal, crossing both lanes ---- */
    if (p.goal <= N && p.bills > 0) {
      const gx = X(p.goal);
      const txt = g.small ? "GOAL &middot; " + p.goal + " MO"
                          : "PROTECTION GOAL &middot; " + p.goal + " MONTHS";
      /* keep the label inside the frame whatever the goal is set to */
      const half = (txt.length * 6.3) / 2;
      let lx = gx, anchor = "middle";
      if (gx - half < g.PL) { lx = g.PL; anchor = "start"; }
      else if (gx + half > CW - g.PR) { lx = CW - g.PR; anchor = "end"; }
      out += '<line class="rw-goal" x1="' + gx.toFixed(1) + '" y1="' + (g.top - 20) +
        '" x2="' + gx.toFixed(1) + '" y2="' + (yB + g.lane + 3) + '"/>' +
        '<text class="rw-goal-lab" x="' + lx.toFixed(1) + '" y="' + (g.top - 25) +
        '" text-anchor="' + anchor + '">' + txt + '</text>';
    }

    /* ---- lane names ---- */
    out += '<text class="rw-name" x="' + (g.PL + 3) + '" y="' + (yA - 9) + '">EMERGENCY FUND ONLY</text>' +
           '<text class="rw-name" x="' + (g.PL + 3) + '" y="' + (yB - 9) + '">FUND + INCOME PROTECTION</text>';

    /* ---- the ruler ---- */
    const step = N > 24 ? 6 : (N > 12 ? 3 : 2);
    let ticks = "";
    for (let m = 0; m <= N; m += step) {
      ticks += '<text class="rw-tick" x="' + X(m).toFixed(1) + '" y="' + (CH - 11) +
        '" text-anchor="middle">' + (m === 0 ? "now" : m) + '</text>';
    }
    out += '<line class="rw-rule" x1="' + g.PL + '" y1="' + (CH - g.rule + 8) +
      '" x2="' + (g.PL + plotW) + '" y2="' + (CH - g.rule + 8) + '"/>' + ticks;

    return '<svg viewBox="0 0 ' + CW + ' ' + CH + '" class="rw-svg" role="img" ' +
      'aria-label="How long the bills stay paid: savings alone against savings with a policy">' + out + '</svg>';
  }

  /* ============================================================
     what the numbers say — only what's true for these inputs
     ============================================================ */
  function reads(p, w) {
    if (p.bills <= 0) {
      return { title: "Enter essential monthly bills to build the illustration.", list: [
        { k: "Start here", v: "The obligation", tone: "flat",
          d: "Housing, food, utilities, insurance, transportation — the non-discretionary items that continue regardless of income." }
      ]};
    }
    if (w.gap <= 0) {
      return { title: "No exposure on these figures.", list: [
        { k: "Continuing income", v: usd(p.cont), tone: "good",
          d: "Already meets the " + usd(p.bills) + " monthly obligation without drawing on reserves." },
        { k: "Worth confirming", v: "Is it durable?", tone: "warn",
          d: "If any part of that income is tied to the insured, the exposure reopens the moment it stops." }
      ]};
    }

    const out = [];
    const met = isFinite(w.both) && w.both >= p.goal;
    const longAlone = w.alone >= 36;

    /* the month the reserves are gone */
    out.push({
      k: "Emergency fund exhausted", v: longAlone ? "Not for years" : "Month " + (Math.floor(w.alone) + 1),
      d: usd(p.sav) + " of liquid reserves against a " + usd(w.gap) + " monthly gap is " + spanTxt(w.alone) + " of coverage.",
      tone: w.alone >= p.goal ? "good" : "bad"
    });

    /* what the benefit is worth, in months */
    if (w.pays) {
      out.push({
        k: "The benefit adds", v: w.tooLate ? "Nothing here" : span(w.adds),
        d: w.tooLate
          ? "A " + mo(p.wait) + " elimination period outlasts " + spanTxt(w.alone) + " of reserves, so the gap opens before benefits begin."
          : usd(p.ben) + " covers " + spanTxt(w.adds) + " of essential bills at the " + usd(w.gap) + " monthly gap.",
        tone: w.tooLate ? "bad" : "good"
      });
    } else {
      out.push({
        k: "No benefit illustrated", v: "—", tone: "flat",
        d: "Enter an available income-protection benefit and the lower lane extends."
      });
    }

    /* the reserve figure that bridges the elimination period */
    if (p.wait > 0 && w.pays) {
      out.push({
        k: "Reserves needed to bridge the elimination period", v: usd(w.bridge),
        d: w.bridgeShort > 0
          ? "You are " + usd(w.bridgeShort) + " under it, which is why benefits begin after the reserves are spent."
          : "Reserves of " + usd(p.sav) + " clear it, so the elimination period costs nothing.",
        tone: w.bridgeShort > 0 ? "bad" : "good"
      });
    }

    /* the protection goal */
    out.push({
      k: met ? "Your " + p.goal + "-month protection goal" : "To self-insure " + p.goal + " months",
      v: met ? "Covered" : usd(w.needForGoal),
      d: met
        ? "Met, with " + spanTxt(Math.max(0, w.both - p.goal)) + " of headroom."
        : "Reserves alone would have to hold that — " + usd(w.shortForGoal) + " above the current fund.",
      tone: met ? "good" : "warn"
    });

    /* the marginal figure — what another thousand of reserves buys */
    out.push({
      k: "Each $1,000 of reserves", v: days(w.perK), tone: "flat",
      d: "At a " + usd(w.gap) + " monthly gap, $1,000 buys " + days(w.perK) + " of essential bills. That is the exchange rate between reserves and time."
    });

    let title;
    if (w.tooLate) title = "The benefit becomes payable after the fund is gone.";
    else if (!w.pays) title = "Reserves are carrying the entire exposure.";
    else if (met && w.alone < p.goal) title = "The benefit is what carries you to the protection goal.";
    else if (met) title = "Protected either way — the benefit adds headroom.";
    else title = "Together they still fall short of the " + p.goal + "-month goal.";

    return { title: title, list: out };
  }

  /* ============================================================
     render
     ============================================================ */
  function run() {
    const p = read();
    const w = work(p);

    /* ---- the banner answer ---- */
    if (p.bills <= 0) {
      $("bnLabel").textContent = "START WITH";
      $("bnBig").textContent = "Your bills";
      $("bnSub").textContent = "the whole illustration follows from that one figure";
    } else if (w.gap <= 0) {
      $("bnLabel").textContent = "NO EXPOSURE";
      $("bnBig").textContent = "Covered";
      $("bnSub").textContent = "continuing income already meets the obligation";
    } else {
      $("bnLabel").textContent = "PROTECTED FOR";
      $("bnBig").textContent = span(w.both);
      $("bnSub").textContent = w.both >= p.goal
        ? "past the " + p.goal + "-month protection goal"
        : "against a " + p.goal + "-month protection goal";
    }
    $("bnBig").parentNode.classList.toggle("is-short",
      w.gap > 0 && isFinite(w.both) && w.both < p.goal);

    /* ---- the two side facts ---- */
    $("gapStrip").innerHTML = p.bills <= 0
      ? "<span>Monthly gap</span><b>&mdash;</b>"
      : (w.gap <= 0
          ? "<span>Monthly gap</span><b>None</b>"
          : "<span>Monthly gap to be covered</span><b>" + usd(w.gap) + "</b>");
    $("resFactL").textContent = w.tooLate ? "Short before benefits begin" : "Total resources available";
    $("resFact").textContent = w.tooLate ? usd(w.bridgeShort) : usd(w.total);

    /* ---- the runway ---- */
    $("rwWrap").innerHTML = runway(p, w);

    /* ---- the two answers ---- */
    $("aloneBig").textContent = p.bills <= 0 ? "—" : span(w.alone);
    $("aloneSay").textContent = p.bills <= 0
      ? "Enter essential monthly bills to see this."
      : (w.gap <= 0 ? "No gap to cover on these figures."
        : (w.alone >= p.goal
            ? "That already meets the " + p.goal + "-month protection goal."
            : "The fund may be exhausted during month " + (Math.floor(w.alone) + 1) + "."));
    $("aloneFootL").textContent = w.shortForGoal > 0 && w.gap > 0
      ? "To reach the goal on the fund alone" : "Emergency fund";
    $("aloneFoot").textContent = w.shortForGoal > 0 && w.gap > 0 ? usd(w.needForGoal) : usd(p.sav);

    $("bothBig").textContent = p.bills <= 0 ? "—" : span(w.both);
    $("bothSay").textContent = p.bills <= 0
      ? "Enter essential monthly bills to see this."
      : (w.gap <= 0 ? "No gap to cover on these figures."
        : (w.tooLate
            ? "The benefit becomes payable in month " + (p.wait + 1) + ", but the fund may be exhausted in month " +
              (Math.floor(w.alone) + 1) + " — after the gap has already opened."
            : (!w.pays
                ? "No benefit illustrated yet — enter an available amount."
                : (w.both >= p.goal
                    ? "Your " + p.goal + "-month protection goal is covered."
                    : "Together they still fall short of " + p.goal + " months."))));
    $("bothFootL").textContent = w.tooLate ? "Shortfall before benefits begin" : "Total resources available";
    $("bothFoot").textContent = w.tooLate ? usd(w.bridgeShort) : usd(w.total);

    $("bothBig").parentNode.classList.toggle("is-warn", w.tooLate);
    $("aloneBig").parentNode.classList.toggle("is-short", w.gap > 0 && w.alone < p.goal);

    /* ---- the difference between the two ---- */
    const dl = $("vsDelta");
    if (p.bills <= 0 || w.gap <= 0) { dl.innerHTML = "<b>&mdash;</b>"; dl.className = "vs-delta"; }
    else if (!w.pays) { dl.innerHTML = "benefit<b>none yet</b>"; dl.className = "vs-delta"; }
    else if (w.tooLate || w.adds < 0.05) { dl.innerHTML = "benefit adds<b>nothing</b>"; dl.className = "vs-delta is-bad"; }
    else { dl.innerHTML = "benefit adds<b>+" + span(w.adds) + "</b>"; dl.className = "vs-delta is-good"; }

    /* ---- what the numbers say ---- */
    const rd = reads(p, w);
    $("readTitle").textContent = rd.title;
    const rg = $("readGrid");
    rg.innerHTML = "";
    rd.list.forEach(function (r) {
      const el = document.createElement("article");
      el.className = "read";
      el.setAttribute("data-tone", r.tone || "flat");
      el.innerHTML = "<small></small><b></b><p></p>";
      el.querySelector("small").textContent = r.k;
      el.querySelector("b").textContent = r.v;
      el.querySelector("p").textContent = r.d;
      rg.appendChild(el);
    });

    /* ---- the leftover ---- */
    $("spA").textContent = usd(w.at6);
    $("spB").textContent = usd(w.at8);
    $("spAG").textContent = p.spare > 0 ? "+" + usd(w.at6 - p.spare) + " illustrated growth" : "—";
    $("spBG").textContent = p.spare > 0 ? "+" + usd(w.at8 - p.spare) + " illustrated growth" : "—";
    $("spNote").textContent = p.spare > 0 && p.years > 0
      ? usd(p.spare) + " invested for " + p.years + " years at two hypothetical rates. Not a projection, and before taxes and fees."
      : "Enter an amount and a number of years to see this.";

    /* ---- say it ---- */
    let say;
    if (p.bills <= 0) {
      say = "“Start with what has to be paid every month — the bills that don't care whether you're working. Everything else follows from that one number.”";
    } else if (w.gap <= 0) {
      say = "“On these figures nothing stops if the paycheck does — which is worth knowing, and worth double-checking that it really would keep coming.”";
    } else if (w.tooLate) {
      say = "“Your bills are " + usd(w.gap) + " a month. The policy pays nothing for the first " + mo(p.wait) +
            " — that's the elimination period — so your emergency fund has to find " + usd(w.bridge) +
            " before a dollar of it arrives. You’ve got " + usd(p.sav) + ". The benefit is real, it just gets there after the money’s gone.”";
    } else if (!w.pays) {
      say = "“Right now it’s your emergency fund doing all the work — " + spanTxt(w.alone) +
            " of it. The question is what happens in month " + (Math.floor(w.alone) + 1) + ".”";
    } else {
      say = "“The emergency fund on its own gets you " + spanTxt(w.alone) + ". With the benefit behind it, " +
            spanTxt(w.both) + " — and you told me you wanted " + p.goal + ".”";
    }
    $("sayIt").textContent = say;

    if (window.WD && window.WD.explain) window.WD.explain.refresh();
    save();
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
    const lines = ["If Your Paycheck Stopped Today — WEALTHDEMO", "",
      "Essential monthly bills       " + usd(p.bills),
      "Income that would continue    " + usd(p.cont),
      "Monthly gap to be covered     " + usd(w.gap),
      "Emergency savings             " + usd(p.sav),
      "Income-protection benefit     " + usd(p.ben),
      p.wait > 0 ? "Elimination period            " + mo(p.wait) : "Elimination period            none", "",
      "EMERGENCY FUND ONLY           " + span(w.alone),
      "FUND + INCOME PROTECTION      " + span(w.both),
      "Total resources available     " + usd(w.total),
      "Protection goal               " + p.goal + " months", ""];
    const rd = reads(p, w);
    lines.push("READING THE ILLUSTRATION", "  " + rd.title, "");
    rd.list.forEach(function (r) { lines.push("  " + r.k + ": " + r.v, "    " + r.d); });
    lines.push("", "IF THE WHOLE BENEFIT ISN'T NEEDED RIGHT AWAY",
      "  " + usd(p.spare) + " invested for " + p.years + " years",
      "  Illustrated at 6%   " + usd(w.at6),
      "  Illustrated at 8%   " + usd(w.at8), "",
      $("sayIt").textContent, "",
      "Educational illustration only. Income-protection and living-benefit availability, qualifying conditions, elimination periods and payout amounts vary by carrier and policy, and are subject to underwriting. Growth assumptions are hypothetical and not guaranteed. This does not include taxes, fees, or account-specific rules. Consult a licensed insurance or financial professional for actual terms.");

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
