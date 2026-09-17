/* ============================================================
   WEALTHDEMO — Retirement Account Match-Up

   The client's real question is not "what does a $50,000
   withdrawal cost". It is "I need $50,000 — which account
   should it come out of". So the page is built around the
   cash they want in hand, and every account shows what it has
   to give up to deliver it.

   Three things beyond a comparison grid:
     · the SPREAD — the same cash, a different door, priced
     · a DIAGNOSIS — the penalty clock, or the RMD already set
     · a FORECAST — what the qualified balance becomes at RMD
       age, and what it forces out whether they want it or not
   ============================================================ */
(function () {
  const $ = function (id) { return document.getElementById(id); };
  if (!$("aAge")) return;

  const usd = function (n) { return "$" + Math.round(n).toLocaleString("en-US"); };
  const pct = function (n) { return (n * 100).toFixed(n * 100 % 1 === 0 ? 0 : 1) + "%"; };

  const FIELDS = ["aAge", "aRate", "aGain", "aCapRate", "aNeed",
                  "aQual", "aRoth", "aNonQual", "aIul",
                  "aPrior", "aFactor", "aTaken", "aRmdAge", "aGrowth"];
  const STORE = "wealthdemo.tool.accounts";
  const DEFAULTS = { aAge: 55, aRate: 22, aGain: 30, aCapRate: 15, aNeed: 50000,
                     aQual: 500000, aRoth: 150000, aNonQual: 200000, aIul: 150000,
                     aPrior: 500000, aFactor: 26.5, aTaken: 10000, aRmdAge: 73, aGrowth: 5 };

  function num(id, d) { const v = parseFloat($(id).value); return isFinite(v) ? v : d; }

  function read() {
    return {
      age: Math.max(0, num("aAge", 55)),
      rate: num("aRate", 22) / 100,
      gain: Math.min(100, Math.max(0, num("aGain", 30))) / 100,
      capRate: num("aCapRate", 15) / 100,
      need: Math.max(0, num("aNeed", 50000)),
      qual: Math.max(0, num("aQual", 500000)),
      roth: Math.max(0, num("aRoth", 150000)),
      nonqual: Math.max(0, num("aNonQual", 200000)),
      iul: Math.max(0, num("aIul", 150000)),
      prior: Math.max(0, num("aPrior", 500000)),
      factor: Math.max(1, num("aFactor", 26.5)),
      taken: Math.max(0, num("aTaken", 10000)),
      rmdAge: num("aRmdAge", 73),
      growth: num("aGrowth", 5) / 100
    };
  }

  /* ---------- the four doors ---------- */
  function doors(p) {
    const early = p.age < 59.5;
    const penalty = early ? 0.10 : 0;

    const list = [
      {
        id: "qualified", name: "Qualified / Tax-Deferred", sub: "401(k), 403(b), Traditional IRA",
        tint: "ice", balance: p.qual,
        costRate: Math.min(0.95, p.rate + penalty),
        parts: [["Income tax", p.rate], early ? ["Early-withdrawal tax", penalty] : null].filter(Boolean),
        traits: ["Often pre-tax", "Tax-deferred", "Generally taxable", early ? "Possible 10% tax" : "No 10% after 59½", "Generally yes"],
        rmd: true, bestFor: "A tax break today", term: "qualified"
      },
      {
        id: "roth", name: "Roth", sub: "Roth IRA, Roth 401(k)",
        tint: "mint", balance: p.roth, costRate: 0,
        parts: [],
        traits: ["After-tax", "Potentially tax-free", "Generally tax-free", early ? "Rules vary" : "Rules vary", "No (owner)"],
        rmd: false,
        caveat: early
          ? "Shown as a qualified distribution. Under 59½ the earnings portion can be taxable and penalised — basis comes out first, and the five-year rule applies."
          : "Assumes the five-year rule is met and the distribution is qualified.",
        bestFor: "Potentially tax-free income later", term: "roth"
      },
      {
        id: "nonqual", name: "Non-Qualified / After-Tax", sub: "Brokerage, savings, CDs",
        tint: "sage", balance: p.nonqual,
        costRate: p.gain * p.capRate,
        parts: [["Capital-gain tax on the " + pct(p.gain) + " gain", p.gain * p.capRate]],
        traits: ["After-tax", "May create gains", "Tax depends on gains", "No early-withdrawal tax", "No"],
        rmd: false, bestFor: "Easier access, no RMD rules", term: "nonqualified"
      },
      {
        id: "iul", name: "IUL / Life Insurance Cash Value", sub: "Indexed Universal Life",
        tint: "sun", balance: p.iul, costRate: 0,
        parts: [],
        traits: ["After-tax premiums", "Tax-deferred cash value", "Withdrawals / loans", "No 10% penalty tax", "No"],
        rmd: false,
        bestFor: "Protection plus tax-advantaged access", term: "iul",
        caveat: "Policy loans and withdrawals depend on contract terms and can create tax consequences if the policy lapses with an outstanding gain."
      }
    ];

    list.forEach(function (d) {
      d.gross = d.costRate >= 1 ? Infinity : p.need / (1 - d.costRate);
      d.cost = d.gross - p.need;
      d.keep = p.need * (1 - d.costRate);          /* from a flat withdrawal of p.need */
      d.covers = d.balance >= d.gross;
      d.years = d.gross > 0 ? d.balance / d.gross : 0;
      d.per1000 = d.costRate >= 1 ? Infinity : 1000 / (1 - d.costRate);
    });
    return list;
  }

  /* ---------- diagnosis ---------- */
  function diagnose(p, ds) {
    const early = p.age < 59.5;
    const q = ds.find(function (d) { return d.id === "qualified"; });
    const years = ds.reduce(function (a, d) { return a + d.balance; }, 0);

    if (early && p.qual > 0) {
      const away = 59.5 - p.age;
      const afterGross = p.need / (1 - p.rate);
      return {
        title: away <= 1
          ? "You are months away from the penalty disappearing."
          : "You are " + away.toFixed(1) + " years from the penalty disappearing.",
        body: "At " + p.age + ", a qualified withdrawal still carries the extra 10% tax. Taking " + usd(p.need) +
              " from the 401(k) today means releasing " + usd(q.gross) + ". After 59½ the same " + usd(p.need) +
              " needs only " + usd(afterGross) + " — the wait is worth " + usd(q.gross - afterGross) +
              " on this one withdrawal alone. Until then, every other door is cheaper.",
        s1: usd(p.need * 0.10), s1l: "Penalty on " + usd(p.need), s1t: "bad",
        s2: away.toFixed(1), s2l: "Years to 59½", s2t: "warn", s2u: "away"
      };
    }

    if (p.age < p.rmdAge && p.qual > 0) {
      const yrsTo = p.rmdAge - p.age;
      const future = p.qual * Math.pow(1 + p.growth, yrsTo);
      const rmd = future / p.factor;
      return {
        title: "The bill at " + p.rmdAge + " is already being written.",
        body: "Left alone at " + pct(p.growth) + ", " + usd(p.qual) + " becomes " + usd(future) + " by " + p.rmdAge +
              " — and then the IRS starts taking " + usd(rmd) + " a year out of it whether you need the money or not, taxed as income. " +
              "Every dollar moved out of the qualified bucket before then is a dollar that never joins that forced withdrawal.",
        s1: usd(future), s1l: "Qualified at " + p.rmdAge, s1t: "warn",
        s2: usd(rmd), s2l: "Forced out each year", s2t: "bad", s2u: "and taxable"
      };
    }

    if (p.qual > 0) {
      const rmd = p.prior / p.factor;
      return {
        title: "RMDs are live now.",
        body: "At " + p.age + " the qualified balance is already subject to required minimum distributions. On " + usd(p.prior) +
              " and a factor of " + p.factor + " that is " + usd(rmd) +
              " a year that must come out and be taxed, regardless of what else you draw.",
        s1: usd(rmd), s1l: "This year's RMD", s1t: "warn",
        s2: usd(rmd * p.rate), s2l: "Tax on it", s2t: "bad", s2u: "at " + pct(p.rate)
      };
    }

    return {
      title: "Nothing here is tax-deferred.",
      body: "With no qualified balance there is no early-withdrawal penalty and no required distribution to plan around. What is left is the gain question — how much of a non-qualified withdrawal is taxable, and at what rate.",
      s1: pct(p.gain), s1l: "Assumed taxable gain", s1t: "warn",
      s2: pct(p.capRate), s2l: "Capital-gain rate", s2t: "warn"
    };
  }

  /* ---------- render ---------- */
  function rule(dt, dd) {
    return '<div><dt>' + dt + '</dt><dd>' + dd + '</dd></div>';
  }

  function run() {
    const p = read();
    const ds = doors(p);

    const funded = ds.filter(function (d) { return d.balance > 0 && isFinite(d.gross); });
    const pool = funded.length ? funded : ds;
    const best = pool.slice().sort(function (a, b) { return b.keep - a.keep; })[0];
    const worst = pool.slice().sort(function (a, b) { return a.keep - b.keep; })[0];
    const spread = best.keep - worst.keep;

    /* ---- the answer, one line ---- */
    if (spread < 1) {
      $("ansHeadline").innerHTML = "\u2026every account hands you the same " + usd(p.need) + ".";
      $("ansSub").textContent = "Nothing in these settings makes one dearer than another. The choice comes down to which bucket you want to still have later.";
    } else {
      $("ansHeadline").innerHTML = "\u2026what reaches you ranges from <span class=\"hot\">" +
        usd(worst.keep) + "</span> to <span class=\"cool\">" + usd(best.keep) + "</span>.";
      $("ansSub").innerHTML = "A difference of <b>" + usd(spread) + "</b>, decided only by which account you take it from.";
    }

    /* ---- one card per account, everything about it inside ---- */
    const grid = $("acctGrid");
    grid.innerHTML = "";
    ds.slice().sort(function (a, b) { return b.keep - a.keep; }).forEach(function (d) {
      const lost = p.need - d.keep;
      const card = document.createElement("article");
      card.className = "acct" + (d === best && spread >= 1 ? " is-best" : "") + (d.balance <= 0 ? " is-empty" : "");
      card.setAttribute("data-tint", d.tint);

      card.innerHTML =
        '<header class="acct-head">' +
          '<span class="acct-dot"></span>' +
          '<div class="acct-id"><b></b><small></small></div>' +
        '</header>' +
        '<div class="acct-money">' +
          '<small>You keep</small>' +
          '<b class="acct-keep"></b>' +
          '<span class="acct-lost"></span>' +
        '</div>' +
        '<dl class="acct-rules"></dl>' +
        '<footer class="acct-foot">' +
          '<span class="acct-for"></span>' +
          '<span class="acct-bal"></span>' +
        '</footer>';

      const nameEl = card.querySelector(".acct-id b");
      nameEl.textContent = d.name.split(" /")[0];
      if (d.term) nameEl.setAttribute("data-term", d.term);
      card.querySelector(".acct-id small").textContent = d.sub;
      card.querySelector(".acct-keep").textContent = usd(d.keep);

      const lostEl = card.querySelector(".acct-lost");
      if (lost < 1) {
        lostEl.textContent = "nothing lost to tax";
        lostEl.classList.add("is-clean");
      } else {
        lostEl.innerHTML = "\u2212 " + usd(lost) + " to tax <em>(" + pct(d.costRate) + ")</em>";
      }

      const dl = card.querySelector(".acct-rules");
      dl.innerHTML =
        rule("Money in", d.traits[0]) +
        rule("Growth", d.traits[1]) +
        rule("Withdrawal", d.traits[2]) +
        rule('<span data-term="early">Before 59\u00bd</span>', d.traits[3]) +
        rule('<span data-term="rmd">RMDs</span>', d.traits[4]) +
        rule('<span data-term="grossup">To net ' + usd(p.need) + '</span>', usd(d.gross));

      card.querySelector(".acct-for").textContent = d.bestFor || "";
      card.querySelector(".acct-bal").textContent = d.balance > 0
        ? usd(d.balance) + " in this bucket"
        : "nothing in this bucket";

      if (d.term) {
        const line = document.createElement("p");
        line.className = "explain-line";
        line.setAttribute("data-explain-for", d.term);
        card.appendChild(line);
      }

      if (d.caveat) {
        const note = document.createElement("p");
        note.className = "acct-caveat";
        note.textContent = d.caveat;
        card.appendChild(note);
      }
      grid.appendChild(card);
    });
    if (window.WD.explain) window.WD.explain.refresh();

    /* ---- the one insight ---- */
    const dx = diagnose(p, ds);
    $("dxTitle").textContent = dx.title;
    $("dxBody").textContent = dx.body;
    $("dxS1").textContent = dx.s1; $("dxS1L").textContent = dx.s1l; $("dxS1").className = "dx-figure " + dx.s1t;
    $("dxS2").textContent = dx.s2; $("dxS2L").textContent = dx.s2l; $("dxS2").className = "dx-figure " + dx.s2t;
    $("dxS1U").textContent = dx.s1u || "";
    $("dxS2U").textContent = dx.s2u || "";

    /* ---- RMD, folded away until wanted ---- */
    const rmd = p.prior / p.factor;
    const missed = Math.max(0, rmd - p.taken);
    $("rmdEst").textContent = usd(rmd);
    $("rmdMissed").textContent = usd(missed);
    $("rmdExcise").textContent = usd(missed * 0.25);
    $("rmdExciseRow").classList.toggle("is-clear", missed <= 0);
    $("rmdFix").hidden = missed <= 0;
    $("rmdTeaser").textContent = missed > 0
      ? usd(rmd) + " due this year \u2014 " + usd(missed) + " short, " + usd(missed * 0.25) + " possible excise"
      : usd(rmd) + " due this year \u2014 covered";
    $("rmdNote").textContent = p.age < p.rmdAge
      ? "At " + p.age + ", this shows RMDs beginning later at " + p.rmdAge +
        ". Traditional IRAs and many employer plans are generally subject to RMD rules; owner Roth accounts are not."
      : "At " + p.age + " the qualified balance is generally already subject to RMDs. Owner Roth accounts are not.";

    /* ---- the sentence ---- */
    const early = p.age < 59.5;
    let say;
    if (spread < 1) {
      say = "\u201cAll four of these can write you the same cheque. So the question isn\u2019t cost \u2014 it\u2019s which of these buckets you want to still have in twenty years.\u201d";
    } else if (early && p.qual > 0) {
      say = "\u201cSame " + usd(p.need) + " withdrawal, four different accounts. Out of the " +
            worst.name.split(" /")[0] + " you keep " + usd(worst.keep) + " \u2014 " + usd(p.need - worst.keep) +
            " goes to tax and the early-withdrawal penalty. Out of the " + best.name.split(" /")[0] + " you keep " +
            usd(best.keep) + ". Which one do you want to touch?\u201d";
    } else {
      say = "\u201cSame " + usd(p.need) + " withdrawal, four different accounts \u2014 and " + usd(spread) +
            " between the best and the worst. The one growing fastest is also the one the IRS will eventually force you to empty.\u201d";
    }
    $("sayIt").textContent = say;

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

  /* keep the RMD balance in step with the qualified balance until it's edited */
  $("aQual").addEventListener("input", function () {
    if ($("aPrior").dataset.touched) return;
    $("aPrior").value = $("aQual").value;
    run();
  });
  $("aPrior").addEventListener("input", function () { $("aPrior").dataset.touched = "1"; });

  const moreBtn = $("moreBtn"), moreMenu = $("moreMenu");
  if (moreBtn && moreMenu) {
    moreBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      const open = moreMenu.hasAttribute("hidden");
      moreMenu.toggleAttribute("hidden", !open);
    });
    document.addEventListener("click", function () { moreMenu.setAttribute("hidden", ""); });
    moreMenu.addEventListener("click", function (e) { e.stopPropagation(); });
  }
  if ($("printBtn")) $("printBtn").addEventListener("click", function () { window.print(); });
  if ($("resetBtn")) $("resetBtn").addEventListener("click", function () {
    FIELDS.forEach(function (f) { $(f).value = DEFAULTS[f]; });
    delete $("aPrior").dataset.touched;
    moreMenu.setAttribute("hidden", "");
    run();
  });

  if ($("sendBtn")) $("sendBtn").addEventListener("click", function () {
    const p = read(), ds = doors(p);
    const btn = $("sendBtn"), old = btn.innerHTML;
    const lines = ["Retirement Account Match-Up — WEALTHDEMO", "",
      "Age " + p.age + "  ·  income tax " + pct(p.rate) + "  ·  capital gain " + pct(p.capRate),
      "Cash needed in hand: " + usd(p.need), "",
      $("ansHeadline").textContent, $("ansSub").textContent, "",
      "TO HAND YOU " + usd(p.need).toUpperCase()];
    ds.forEach(function (d) {
      lines.push("  " + d.name + ": withdraw " + usd(d.gross) +
                 (d.cost >= 1 ? " (" + usd(d.cost) + " to tax)" : " (no tax cost)") +
                 (d.balance > 0 ? " — balance covers " + d.years.toFixed(1) + " years" : " — no balance"));
    });
    lines.push("", "WHAT'S DRIVING THIS", "  " + $("dxTitle").textContent, "  " + $("dxBody").textContent,
      "", $("sayIt").textContent, "",
      "Educational illustration only. Early-distribution exceptions, Roth ordering and qualification rules, basis, capital-gain treatment, plan-specific restrictions, RMD timing, beneficiary rules and state taxes may materially change results. IUL values, costs, crediting, withdrawals, loans, lapse risk and tax treatment depend on the specific insurance contract. Consult a qualified tax or financial professional.");

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lines.join("\n")).then(function () {
        btn.classList.add("is-done"); btn.textContent = "Summary copied";
        setTimeout(function () { btn.innerHTML = old; btn.classList.remove("is-done"); }, 2600);
      }, function () { btn.textContent = "Copy blocked"; setTimeout(function () { btn.innerHTML = old; }, 2000); });
    }
  });

  const askMore = $("askMore"), askExtra = $("askExtra");
  if (askMore && askExtra) {
    askMore.addEventListener("click", function () {
      const open = askExtra.hasAttribute("hidden");
      askExtra.toggleAttribute("hidden", !open);
      askMore.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  load();
  run();
})();
