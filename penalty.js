/* ============================================================
   WEALTHDEMO — Tax Penalty Impact

   A faithful rebuild of the existing calculator: same fields,
   same wording, same figures. Verified against the original:

     Traditional 401(k), age 45, $20,000 withdrawn, $20,000
     taxable, 22% regular rate, nonqualified use

       Est. regular federal income tax (22%)   $4,400
       Est. additional federal tax / penalty   $2,000
       Estimated amount you keep              $13,600

   Exception lists and rates checked against IRS "Exceptions to
   tax on early distributions" and Publication 969 (HSA, 20%).
   ============================================================ */
(function () {
  const $ = function (id) { return document.getElementById(id); };
  if (!$("pAcct")) return;

  const usd = function (n) {
    const a = Math.abs(n);
    return (n < 0 ? "−$" : "$") + Math.round(a).toLocaleString("en-US");
  };

  /* ---------- shared exception sets ---------- */
  const BOTH = [
    { id: "disability", label: "Total and permanent disability", waive: true },
    { id: "death", label: "Death of the account owner", waive: true },
    { id: "sepp", label: "Substantially equal periodic payments", waive: true },
    { id: "medical", label: "Unreimbursed medical expenses above 7.5% of income", waive: true },
    { id: "levy", label: "IRS levy on the account", waive: true },
    { id: "birth", label: "Qualified birth or adoption", waive: true },
    { id: "reservist", label: "Qualified reservist called to active duty", waive: true },
    { id: "disaster", label: "Federally declared disaster recovery", waive: true },
    { id: "abuse", label: "Domestic abuse victim distribution", waive: true },
    { id: "emergency", label: "Emergency personal expense (once a year)", waive: true }
  ];
  const ROLLOVER = { id: "rollover", label: "Direct rollover to another plan or IRA", waive: true, taxFree: true };
  const GENERAL = { id: "general", label: "Nonqualified / general use", waive: false };

  function uses() { return Array.prototype.slice.call(arguments).reduce(function (a, b) { return a.concat(b); }, []); }

  /* ---------- the accounts, in their order ---------- */
  const ACCOUNTS = [
    {
      id: "401k", name: "401(k) / 403(b) / TSP", short: "Traditional 401(k)",
      rate: 10, badge: "Usually 10%", tone: "warn", age: 59.5,
      guide: "Before 59½, the taxable portion may face a 10% additional tax unless an exception applies.",
      lead: "Taxable distributions before age 59½ may be subject to a 10% additional federal tax unless an exception applies.",
      bullets: ["Regular income tax can also apply to the taxable distribution.",
                "Common exceptions vary by circumstance and plan type.",
                "A direct rollover is generally not treated as an early taxable distribution."],
      irs: "https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-exceptions-to-tax-on-early-distributions",
      uses: uses([GENERAL,
        { id: "55", label: "Left the job in or after the year you turned 55", waive: true },
        { id: "qdro", label: "Qualified domestic relations order (QDRO)", waive: true },
        { id: "terminal", label: "Terminal illness", waive: true }], BOTH, [ROLLOVER])
    },
    {
      id: "ira", name: "Traditional / SEP IRA", short: "Traditional / SEP IRA",
      rate: 10, badge: "Usually 10%", tone: "warn", age: 59.5,
      guide: "Taxable early distributions before 59½ may face a 10% additional tax unless an IRA exception applies.",
      lead: "Taxable distributions before age 59½ may be subject to a 10% additional federal tax unless an exception applies.",
      bullets: ["Regular income tax can also apply to the taxable distribution.",
                "IRAs have their own exceptions that workplace plans do not.",
                "A trustee-to-trustee transfer is generally not treated as a distribution."],
      irs: "https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-exceptions-to-tax-on-early-distributions",
      uses: uses([GENERAL,
        { id: "home", label: "First-time home purchase, up to $10,000", waive: true },
        { id: "education", label: "Qualified higher-education expenses", waive: true },
        { id: "unemployed", label: "Health insurance premiums while unemployed", waive: true }], BOTH, [ROLLOVER])
    },
    {
      id: "simple", name: "SIMPLE IRA", short: "SIMPLE IRA",
      rate: 10, badge: "10% or 25%", tone: "warn", age: 59.5,
      guide: "Generally 10% before 59½; 25% within the first 2 years of participation, unless an exception applies.",
      lead: "Taxable distributions before age 59½ may face a 10% additional federal tax — 25% within the first two years of participation — unless an exception applies.",
      bullets: ["The higher 25% rate applies only in the first two years of participation.",
                "Regular income tax can also apply to the taxable distribution.",
                "After two years, the ordinary IRA exceptions apply."],
      irs: "https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-exceptions-to-tax-on-early-distributions",
      uses: uses([GENERAL,
        { id: "first2", label: "Nonqualified — within the first 2 years of the plan", waive: false, rate: 25 },
        { id: "home", label: "First-time home purchase, up to $10,000", waive: true },
        { id: "education", label: "Qualified higher-education expenses", waive: true },
        { id: "unemployed", label: "Health insurance premiums while unemployed", waive: true }], BOTH, [ROLLOVER])
    },
    {
      id: "roth", name: "Roth IRA", short: "Roth IRA",
      rate: 10, badge: "Depends", tone: "note", age: 59.5,
      guide: "Regular contributions generally come out first. Taxable earnings can face the 10% additional tax without an exception.",
      lead: "Regular contributions generally come out first and are not taxable. Taxable earnings taken before age 59½ may face a 10% additional federal tax.",
      bullets: ["Put only the taxable earnings in the taxable box above.",
                "A qualified distribution needs both age 59½ and the five-year rule.",
                "The ordinary IRA exceptions apply to the taxable part."],
      irs: "https://www.irs.gov/publications/p590b",
      uses: uses([GENERAL,
        { id: "qualified", label: "Qualified distribution — 59½ and the 5-year rule met", waive: true, taxFree: true },
        { id: "home", label: "First-time home purchase, up to $10,000", waive: true },
        { id: "education", label: "Qualified higher-education expenses", waive: true },
        { id: "unemployed", label: "Health insurance premiums while unemployed", waive: true }], BOTH)
    },
    {
      id: "457", name: "Governmental 457(b)", short: "Governmental 457(b)",
      rate: 0, badge: "Usually 0%", tone: "ok", age: 0,
      guide: "Generally not subject to the 10% early-distribution tax, except amounts attributable to rollovers from other plan types.",
      lead: "Distributions from a governmental 457(b) are generally not subject to the 10% early-distribution tax.",
      bullets: ["Regular income tax still applies to the taxable distribution.",
                "Amounts rolled in from a 401(k), 403(b) or IRA can keep their own 10% rule.",
                "This is the main way a 457(b) differs from other workplace plans."],
      irs: "https://www.irs.gov/retirement-plans/irc-457b-deferred-compensation-plans",
      uses: [GENERAL,
        { id: "rolledin", label: "Amount rolled in from a 401(k), 403(b) or IRA", waive: false, rate: 10 },
        { id: "rollover", label: "Direct rollover to another plan or IRA", waive: true, taxFree: true }]
    },
    {
      id: "annuity", name: "Nonqualified Annuity", short: "Nonqualified Annuity",
      rate: 10, badge: "Usually 10%", tone: "warn", age: 59.5,
      guide: "Taxable amounts distributed before 59½ may face a 10% additional tax unless an exception applies.",
      lead: "Taxable amounts distributed before age 59½ may be subject to a 10% additional federal tax unless an exception applies.",
      bullets: ["Earnings generally come out first and are the taxable part.",
                "Annuitised payments for life are usually outside the additional tax.",
                "A surrender charge from the insurer is separate from anything shown here."],
      irs: "https://www.irs.gov/publications/p575",
      uses: [GENERAL,
        { id: "annuitised", label: "Annuitised as payments for life", waive: true },
        { id: "immediate", label: "Immediate annuity bought with the proceeds", waive: true },
        { id: "disability", label: "Total and permanent disability", waive: true },
        { id: "death", label: "Death of the owner", waive: true },
        { id: "1035", label: "1035 exchange to another annuity", waive: true, taxFree: true }]
    },
    {
      id: "529", name: "529 Education Plan", short: "529 Education Plan",
      rate: 10, badge: "Qualified use = tax-free", tone: "ok", age: 0,
      guide: "Nonqualified use: earnings may become taxable and face a 10% additional tax, subject to exceptions.",
      lead: "Used for qualified education, the earnings come out tax-free. Used for anything else, the earnings become taxable and may face a 10% additional federal tax.",
      bullets: ["Only the earnings are ever taxable — contributions come back untaxed.",
                "A scholarship lets you take out that much without the additional tax.",
                "The taxable part is still reported as income even when the penalty is waived."],
      irs: "https://www.irs.gov/publications/p970",
      uses: [
        { id: "qualified", label: "Qualified education expenses", waive: true, taxFree: true },
        GENERAL,
        { id: "scholarship", label: "Scholarship, up to the award amount", waive: true },
        { id: "academy", label: "Attendance at a U.S. military academy", waive: true },
        { id: "deathdis", label: "Beneficiary's death or disability", waive: true },
        { id: "rollover", label: "Rollover to another 529 or an ABLE account", waive: true, taxFree: true }]
    },
    {
      id: "esa", name: "Coverdell ESA", short: "Coverdell ESA",
      rate: 10, badge: "Usually 10% of taxable amt", tone: "warn", age: 0,
      guide: "Qualified education distributions are generally tax-free. Taxable distributions generally face 10% unless an exception applies.",
      lead: "Qualified education distributions are generally tax-free. Taxable distributions generally face a 10% additional federal tax unless an exception applies.",
      bullets: ["Only the earnings portion is ever taxable.",
                "The same scholarship and academy exceptions as a 529 apply.",
                "Amounts left at age 30 generally have to come out."],
      irs: "https://www.irs.gov/publications/p970",
      uses: [
        { id: "qualified", label: "Qualified education expenses", waive: true, taxFree: true },
        GENERAL,
        { id: "scholarship", label: "Scholarship, up to the award amount", waive: true },
        { id: "academy", label: "Attendance at a U.S. military academy", waive: true },
        { id: "deathdis", label: "Beneficiary's death or disability", waive: true },
        { id: "rollover", label: "Rollover to another ESA or a 529", waive: true, taxFree: true }]
    },
    {
      id: "hsa", name: "HSA", short: "HSA",
      rate: 20, badge: "20%", tone: "bad", age: 65,
      guide: "Nonqualified distributions generally face 20% before age 65. No longer applies after 65, disability, or death.",
      lead: "Used for qualified medical expenses, an HSA distribution is tax-free. Used for anything else before age 65, it is taxable and faces a 20% additional federal tax.",
      bullets: ["The 20% rate is double the usual retirement-account penalty.",
                "After age 65 the penalty stops — the distribution is still taxable income.",
                "Disability and death also remove the additional tax."],
      irs: "https://www.irs.gov/publications/p969",
      uses: [
        { id: "qualified", label: "Qualified medical expenses", waive: true, taxFree: true },
        GENERAL,
        { id: "65", label: "Age 65 or older", waive: true },
        { id: "disability", label: "Total and permanent disability", waive: true },
        { id: "death", label: "Death of the account owner", waive: true }]
    },
    {
      id: "taxable", name: "Taxable Brokerage / Bank", short: "Taxable Brokerage / Bank",
      rate: 0, badge: "No early-withdrawal penalty", tone: "ok", age: 0,
      guide: "No special federal retirement additional tax, though interest, dividends, or gains can still be taxable.",
      lead: "There is no federal early-withdrawal tax on this money. Interest, dividends and gains can still be taxable in the year they happen.",
      bullets: ["Taking money out of a brokerage account is not itself a taxable event.",
                "Selling at a gain is — put that gain in the taxable box above.",
                "A bank CD may still have its own contractual early-withdrawal charge."],
      irs: "https://www.irs.gov/publications/p550",
      uses: [{ id: "general", label: "Any use", waive: true }]
    }
  ];
  const BY = {}; ACCOUNTS.forEach(function (a) { BY[a.id] = a; });

  const FIELDS = ["pAge", "pAmt", "pTaxable", "pRate", "pNeed"];
  const STORE = "wealthdemo.tool.penalty";
  const DEFAULTS = { pAcct: "401k", pAge: 45, pAmt: 20000, pTaxable: 20000, pRate: 22,
                     pUse: "general", pNeed: 20000 };

  function num(id, d) { const v = parseFloat($(id).value); return isFinite(v) ? v : d; }

  function read() {
    const acct = BY[$("pAcct").value] || ACCOUNTS[0];
    const amt = Math.max(0, num("pAmt", 0));
    return {
      acct: acct,
      age: Math.max(0, num("pAge", 0)),
      amt: amt,
      taxable: Math.min(amt, Math.max(0, num("pTaxable", 0))),
      rate: Math.min(100, Math.max(0, num("pRate", 0))),
      use: $("pUse").value,
      need: Math.max(0, num("pNeed", 0))
    };
  }

  /* ---------- the one calculation ---------- */
  function work(p) {
    const a = p.acct;
    const use = (a.uses.filter(function (u) { return u.id === p.use; })[0]) || a.uses[0];

    /* a tax-free use takes the taxable amount out of play entirely */
    const taxable = use.taxFree ? 0 : p.taxable;

    let rate = use.rate !== undefined ? use.rate : a.rate;
    let waived = !!use.waive;
    let reason = "";
    if (use.taxFree) reason = use.label;
    else if (waived) reason = use.label;
    else if (a.age && p.age >= a.age) { waived = true; reason = "Age " + (a.age === 59.5 ? "59½" : a.age) + " or older"; }
    if (rate <= 0) { waived = true; if (!reason) reason = "This account has no federal early-withdrawal tax"; }

    const income = taxable * p.rate / 100;
    const extra = waived ? 0 : taxable * rate / 100;
    return {
      use: use, taxable: taxable, rate: rate, waived: waived, reason: reason,
      income: income, extra: extra,
      keep: p.amt - income - extra,
      lost: income + extra
    };
  }

  /* ---------- what you would have to take out to land what you need ----------
     keep(g) = g − f·g·t − f·g·p  where f is the taxable share, so it is linear:
     keep(g) = g·(1 − f(t+p)) and the gross-up is a division, not a search.      */
  function grossUp(p, w) {
    const f = p.amt > 0 ? w.taxable / p.amt : 1;
    const bite = f * (p.rate / 100 + (w.waived ? 0 : w.rate / 100));
    if (bite >= 1) return null;                 /* nothing would ever arrive */
    const gross = p.need / (1 - bite);
    return { gross: gross, bite: bite, extra: gross - p.need };
  }

  /* ---------- every exception this account offers, and what each saves ---------- */
  function ways(p, w) {
    if (w.extra <= 0) return [];
    return p.acct.uses.filter(function (u) {
      return u.id !== w.use.id && (u.waive || u.taxFree);
    }).map(function (u) {
      const alt = work({ acct: p.acct, age: p.age, amt: p.amt, taxable: p.taxable,
                         rate: p.rate, use: u.id, need: p.need });
      return { use: u, saves: (w.income + w.extra) - (alt.income + alt.extra),
               keep: alt.keep, nocash: !!u.taxFree };
    }).filter(function (x) { return x.saves > 0.5; })
      .sort(function (a, b) {
        /* the ones that still hand you the cash come first */
        if (a.nocash !== b.nocash) return a.nocash ? 1 : -1;
        return b.saves - a.saves;
      });
  }

  /* ---------- the same withdrawal out of every other account ----------
     every account is compared on the SAME transaction — an ordinary
     nonqualified withdrawal — so a qualified 529 or HSA distribution is
     not quietly ranked against an early 401(k) raid.                    */
  function baseUse(a) {
    const g = a.uses.filter(function (u) { return u.id === "general"; })[0];
    return (g || a.uses[0]).id;
  }
  function compare(p) {
    return ACCOUNTS.map(function (a) {
      const alt = work({ acct: a, age: p.age, amt: p.amt, taxable: p.taxable,
                         rate: p.rate, use: baseUse(a), need: p.need });
      return { acct: a, keep: alt.keep, rate: alt.rate, waived: alt.waived,
               extra: alt.extra, income: alt.income };
    }).sort(function (x, y) { return y.keep - x.keep; });
  }

  /* ============================================================
     render
     ============================================================ */
  function fillUses(acct, want) {
    const sel = $("pUse");
    sel.innerHTML = acct.uses.map(function (u) {
      return '<option value="' + u.id + '">' + u.label + '</option>';
    }).join("");
    sel.value = acct.uses.some(function (u) { return u.id === want; }) ? want : acct.uses[0].id;
  }

  function run() {
    const p = read(), w = work(p);
    const a = p.acct;
    const pctOf = function (n) { return p.amt > 0 ? (n / p.amt * 100) : 0; };

    /* ---- banner ---- */
    if (p.amt <= 0) {
      $("bnLabel").textContent = "START WITH";
      $("bnBig").textContent = "The amount";
      $("bnSub").textContent = "what you would take out, and how much of it is taxable";
    } else {
      $("bnLabel").textContent = "ESTIMATED AMOUNT YOU KEEP";
      $("bnBig").textContent = usd(w.keep);
      $("bnSub").textContent = w.lost > 0
        ? "of a " + usd(p.amt) + " withdrawal — " + usd(w.lost) + " goes to tax"
        : "of a " + usd(p.amt) + " withdrawal — nothing goes to federal tax on these figures";
    }

    /* ---- the headline figure, exactly as the original ---- */
    $("bigPen").textContent = usd(w.extra);
    $("penBadge").textContent = w.waived
      ? (w.rate > 0 ? "0% — exception applies" : "No additional tax")
      : w.rate + "% additional tax";
    $("penBadge").setAttribute("data-tone", w.waived ? "ok" : (w.rate >= 20 ? "bad" : "warn"));
    $("penBadge2").textContent = w.waived
      ? (w.rate > 0 ? "Waived" : "None") : w.rate + "%";
    $("keepFact").textContent = usd(w.keep);

    $("lnAmt").textContent = usd(p.amt);
    $("lnTaxable").textContent = usd(w.taxable);
    $("lnIncomeLab").textContent = "1. Est. regular federal income tax (" + p.rate + "%)";
    $("lnIncome").textContent = usd(w.income);
    $("lnExtraLab").textContent = "2. Est. additional federal tax / penalty (" +
      (w.waived ? "0" : w.rate) + "%)";
    $("lnExtra").textContent = usd(w.extra);
    $("lnKeep").textContent = usd(w.keep);

    $("penFoot").textContent = w.waived
      ? "This subtracts " + p.rate + "% estimated regular income tax from the taxable portion. " +
        "No additional federal tax is applied" + (w.reason ? " — " + w.reason.toLowerCase() + "." : ".")
      : "This subtracts " + p.rate + "% estimated regular income tax from the taxable portion, plus a " +
        "separate " + w.rate + "% additional federal tax from the amount subject to the penalty.";

    /* ---- what happens to the withdrawal ---- */
    const seg = [
      { k: "keep", v: Math.max(0, w.keep), lab: "You keep" },
      { k: "inc",  v: w.income,            lab: "Income tax" },
      { k: "pen",  v: w.extra,             lab: "Additional tax" }
    ];
    const bar = $("penBar");
    bar.innerHTML = "";
    if (p.amt <= 0) bar.innerHTML = '<u data-k="none" style="width:100%"></u>';
    else seg.forEach(function (s) {
      const pc = pctOf(s.v);
      if (pc <= 0) return;
      const u = document.createElement("u");
      u.setAttribute("data-k", s.k);
      u.style.width = pc.toFixed(3) + "%";
      u.title = s.lab + " — " + usd(s.v);
      if (pc >= 9) u.textContent = Math.round(pc) + "%";
      bar.appendChild(u);
    });
    $("barKeep").textContent = usd(Math.max(0, w.keep));
    $("barInc").textContent = usd(w.income);
    $("barPen").textContent = usd(w.extra);
    $("barLead").textContent = p.amt <= 0
      ? "Put an amount in above to see the split."
      : (w.lost > 0
        ? "Of every " + usd(p.amt) + " taken out, " + usd(Math.round(w.keep)) + " arrives and " +
          usd(w.lost) + " does not — " + Math.round(pctOf(w.lost)) + "% of the withdrawal."
        : "Nothing comes off this withdrawal on the figures entered.");

    /* ---- the account panel ---- */
    $("acctName").textContent = a.short;
    $("acctLead").textContent = a.lead;
    $("acctBullets").innerHTML = a.bullets.map(function (b) { return "<li>" + b + "</li>"; }).join("");
    $("acctLink").href = a.irs;

    $("taxableNote").textContent = p.taxable < num("pTaxable", 0)
      ? "Capped at the amount withdrawn."
      : "The additional tax generally applies only to the taxable portion.";

    /* ---- can this be avoided ---- */
    const w2 = ways(p, w);
    const box = $("avoidBox");
    box.setAttribute("data-state", w.extra > 0 ? (w2.length ? "open" : "none") : "clear");
    if (w.extra <= 0) {
      $("avoidLead").innerHTML = w.reason
        ? "No additional tax applies here. <b>" + w.reason + "</b> takes it off, so only regular income tax comes out."
        : "No additional federal tax applies to this account.";
      $("avoidChips").innerHTML = "";
    } else if (!w2.length) {
      $("avoidLead").textContent = "On these figures no recognised exception removes the " +
        w.rate + "% additional tax. Taking less, or taking it after age " +
        (a.age === 59.5 ? "59½" : a.age) + ", are the levers left.";
      $("avoidChips").innerHTML = "";
    } else {
      const cash = w2.filter(function (x) { return !x.nocash; })[0];
      $("avoidLead").innerHTML = cash
        ? "Any of these removes the " + w.rate + "% additional tax and still hands you the money — " +
          "<b>" + usd(cash.saves) + "</b> saved. Tap one to apply it."
        : "Nothing here removes the " + w.rate + "% and still gives you the cash, but not taking it as " +
          "cash at all does. Tap one to apply it.";
      $("avoidChips").innerHTML = w2.map(function (x) {
        return '<button type="button" class="pn-chip' + (x.nocash ? " is-nocash" : "") +
          '" data-use="' + x.use.id + '">' +
          '<b>' + x.use.label + '</b>' +
          '<em>' + (x.nocash
            ? "no tax at all &middot; but the money stays invested"
            : "keeps " + usd(x.keep) + " &middot; saves " + usd(x.saves)) + '</em></button>';
      }).join("");
      $("avoidChips").querySelectorAll(".pn-chip").forEach(function (btn) {
        btn.addEventListener("click", function () {
          $("pUse").value = btn.getAttribute("data-use");
          run();
        });
      });
    }

    /* ---- to land what they actually need ---- */
    const g = grossUp(p, w);
    if (p.need <= 0) {
      $("grossOut").textContent = "Put in what you need in hand and this works backwards to the withdrawal.";
    } else if (!g) {
      $("grossOut").textContent = "At these rates nothing would be left, however much came out.";
    } else {
      $("grossOut").innerHTML = "To end up with <b>" + usd(p.need) + "</b> in hand you would have to take out <b>" +
        usd(g.gross) + "</b> — <b>" + usd(g.extra) + "</b> more than you need, because " +
        Math.round(g.bite * 100) + "% of whatever comes out goes to tax." +
        (g.extra > 0 ? " That extra is money leaving the account and never arriving." : "");
    }

    /* ---- same withdrawal, different account ---- */
    const cmp = compare(p);
    const best = cmp[0], mine = cmp.filter(function (c) { return c.acct.id === a.id; })[0];
    $("vsLead").innerHTML = p.amt <= 0
      ? "Put an amount in above to compare."
      : (best.acct.id === a.id
        ? "Of the ten accounts, <b>" + a.short + "</b> already keeps the most on these figures."
        : "Taking the same <b>" + usd(p.amt) + "</b> from <b>" + best.acct.short + "</b> would keep <b>" +
          usd(best.keep - mine.keep) + "</b> more. Only the federal tax differs — the account rules are what change.");
    const topKeep = Math.max(1, cmp[0].keep);
    $("vsRows").innerHTML = cmp.map(function (c) {
      return '<div class="pn-vs-row' + (c.acct.id === a.id ? " is-me" : "") + '">' +
        '<span>' + c.acct.short + '</span>' +
        '<i><u style="width:' + Math.max(0, c.keep / topKeep * 100).toFixed(2) + '%"></u></i>' +
        '<em>' + (c.waived || c.rate <= 0 ? "no penalty" : c.rate + "% penalty") + '</em>' +
        '<b>' + usd(c.keep) + '</b></div>';
    }).join("");

    /* ---- the guide, highlighting the one in play ---- */
    document.querySelectorAll(".pn-card").forEach(function (c) {
      c.classList.toggle("is-on", c.getAttribute("data-acct") === a.id);
    });

    if (window.WD && window.WD.explain) window.WD.explain.refresh();
    save();
  }

  /* ---------- the guide grid, built once ---------- */
  function drawGuide() {
    $("pnGuide").innerHTML = ACCOUNTS.map(function (a) {
      return '<article class="pn-card" data-acct="' + a.id + '" data-tone="' + a.tone + '">' +
        '<b>' + a.name + '</b>' +
        '<span class="pn-badge">' + a.badge + '</span>' +
        '<p>' + a.guide + '</p>' +
      '</article>';
    }).join("");
    document.querySelectorAll(".pn-card").forEach(function (c) {
      c.addEventListener("click", function () {
        $("pAcct").value = c.getAttribute("data-acct");
        fillUses(BY[c.getAttribute("data-acct")], "general");
        run();
        document.querySelector(".pn-out").scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  }

  /* ---------- plumbing ---------- */
  function save() {
    const o = { pAcct: $("pAcct").value, pUse: $("pUse").value };
    FIELDS.forEach(function (f) { o[f] = $(f).value; });
    try { localStorage.setItem(STORE, JSON.stringify(o)); } catch (e) {}
  }
  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(STORE) || "null"); } catch (e) {}
    if (!s) return;
    if (BY[s.pAcct]) $("pAcct").value = s.pAcct;
    FIELDS.forEach(function (f) { if (typeof s[f] === "string" && s[f] !== "") $(f).value = s[f]; });
    fillUses(BY[$("pAcct").value], s.pUse);
  }

  $("pAcct").innerHTML = ACCOUNTS.map(function (a) {
    return '<option value="' + a.id + '">' + a.short + '</option>';
  }).join("");
  $("pAcct").value = DEFAULTS.pAcct;
  fillUses(BY[DEFAULTS.pAcct], DEFAULTS.pUse);
  drawGuide();

  $("pAcct").addEventListener("change", function () {
    fillUses(BY[$("pAcct").value], $("pUse").value);
    run();
  });
  $("pUse").addEventListener("change", run);
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
    $("pAcct").value = DEFAULTS.pAcct;
    FIELDS.forEach(function (f) { $(f).value = DEFAULTS[f]; });
    fillUses(BY[DEFAULTS.pAcct], DEFAULTS.pUse);
    if (moreMenu) moreMenu.setAttribute("hidden", "");
    run();
  }
  if ($("resetBtn")) $("resetBtn").addEventListener("click", resetAll);
  if ($("resetBtn2")) $("resetBtn2").addEventListener("click", resetAll);

  if ($("sendBtn")) $("sendBtn").addEventListener("click", function () {
    const p = read(), w = work(p);
    const btn = $("sendBtn"), old = btn.innerHTML;
    const lines = ["Tax Penalty Impact — WEALTHDEMO", "",
      "THE WITHDRAWAL",
      "  Account                 " + p.acct.short,
      "  Age                     " + p.age,
      "  Amount withdrawn        " + usd(p.amt),
      "  Amount that is taxable  " + usd(w.taxable),
      "  Regular income-tax rate " + p.rate + "%",
      "  How it will be used     " + w.use.label, "",
      "ESTIMATED FEDERAL IMPACT",
      "  1. Regular income tax (" + p.rate + "%)   " + usd(w.income),
      "  2. Additional tax / penalty (" + (w.waived ? "0" : w.rate) + "%)  " + usd(w.extra),
      "  Estimated amount you keep      " + usd(w.keep) +
        "   of " + usd(p.amt),
      w.waived && w.reason ? "  No additional tax — " + w.reason : "", ""];
    const g = grossUp(p, w), w2 = ways(p, w), cmp = compare(p);
    if (p.need > 0 && g) {
      lines.push("TO LAND " + usd(p.need) + " IN HAND",
        "  Withdraw                " + usd(g.gross) + "   (" + usd(g.extra) + " more than needed)", "");
    }
    if (w2.length) {
      lines.push("EXCEPTIONS THAT WOULD REMOVE THE PENALTY");
      w2.slice(0, 5).forEach(function (x) {
        lines.push("  · " + x.use.label + " — saves " + usd(x.saves));
      });
      lines.push("");
    }
    if (p.amt > 0 && cmp[0].acct.id !== p.acct.id) {
      lines.push("SAME WITHDRAWAL, DIFFERENT ACCOUNT",
        "  Best of the ten         " + cmp[0].acct.short + " keeps " + usd(cmp[0].keep),
        "  This account            " + p.acct.short + " keeps " + usd(w.keep), "");
    }
    lines.push("ABOUT THIS ACCOUNT", "  " + p.acct.lead);
    p.acct.bullets.forEach(function (b) { lines.push("  · " + b); });
    lines.push("  IRS guidance: " + p.acct.irs, "",
      "Educational estimate only. \"Estimated Amount You Keep\" equals the withdrawal minus the " +
      "estimated regular income tax and minus any estimated additional federal tax/penalty. This does " +
      "not represent an exact tax-return calculation and does not cover every exception, state tax, " +
      "capital-gains rate, withholding rule, basis rule, ordering rule, recapture rule, plan " +
      "restriction, surrender charge, or special circumstance. A plan or institution may also impose " +
      "contractual fees that are not federal tax penalties. Confirm actual treatment with plan " +
      "documents and a qualified tax professional.");

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
