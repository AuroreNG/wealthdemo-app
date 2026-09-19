/* ============================================================
   WEALTHDEMO — the form engine's registry

   About half of the tools in the plan are not calculators. They
   are intakes, checklists, trackers and readiness scores. Built
   one page at a time that is most of a year. Built once as an
   engine, each one is a paragraph of data in this file.

   Three shapes, and nothing else:

     ask    questions in groups, answered on one page, with a
            live result panel. Add bands and it scores.
     check  a checklist. Three states per item — needed, have
            it, not needed — and a `when` rule so a list only
            ever shows what this case actually requires.
     track  a pipeline. Rows move between named stages.

   The grammar is deliberately the same one assess.js already
   uses, so anyone who has read that file can read this one:
   `when` hides a question, `hint` explains it, `options` lists
   the choices.

   Where a form works something out, it does it in its own
   compute(v) and nowhere else. Every figure the UI shows comes
   back from there, which is what lets the assistant quote a
   form the same way it quotes a calculator: by asking it, not
   by doing arithmetic of its own.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- small shared maths, all verified against Python ---------- */

  /* level payment on a fully amortising loan */
  function pmt(P, annualRate, years) {
    const r = annualRate / 100 / 12, n = Math.round(years * 12);
    if (!isFinite(P) || P <= 0 || !n) return 0;
    if (r === 0) return P / n;
    return P * r / (1 - Math.pow(1 + r, -n));
  }

  /* everything a lender counts as housing cost, not just the loan */
  function housing(price, down, rate, o) {
    o = o || {};
    const taxPct = o.taxPct === undefined ? 1.25 : o.taxPct;
    const insPct = o.insPct === undefined ? 0.40 : o.insPct;
    const pmiPct = o.pmiPct === undefined ? 0.60 : o.pmiPct;
    const years  = o.years  === undefined ? 30 : o.years;

    const loan = Math.max(0, price - down);
    const pi   = pmt(loan, rate, years);
    const tax  = price * taxPct / 100 / 12;
    const ins  = price * insPct / 100 / 12;
    const ltv  = price > 0 ? loan / price * 100 : 0;
    const pmi  = ltv > 80 ? loan * pmiPct / 100 / 12 : 0;
    return { loan: loan, pi: pi, tax: tax, ins: ins, pmi: pmi,
             total: pi + tax + ins + pmi, ltv: ltv,
             downPct: price > 0 ? down / price * 100 : 0 };
  }

  /* bisect for the largest x where ok(x) holds — the same shape as the
     solve() the calculators use, so a form and a calculator agree */
  function solve(lo, hi, ok, rounds) {
    let a = lo, b = hi;
    if (!ok(a)) return null;
    for (let i = 0; i < (rounds || 48); i++) {
      const m = (a + b) / 2;
      if (ok(m)) a = m; else b = m;
    }
    return a;
  }

  function futureValue(start, monthly, years, ratePct) {
    const r = ratePct / 100 / 12, n = Math.round(years * 12);
    if (n <= 0) return start;
    if (r === 0) return start + monthly * n;
    return start * Math.pow(1 + r, n) + monthly * ((Math.pow(1 + r, n) - 1) / r);
  }

  const M0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  function money(n) { return M0.format(Math.round(n || 0)); }
  function pct(n, dp) { return (Math.round(n * Math.pow(10, dp === undefined ? 1 : dp)) / Math.pow(10, dp === undefined ? 1 : dp)) + "%"; }
  function num(v) { const n = parseFloat(String(v).replace(/[^0-9.\-]/g, "")); return isFinite(n) ? n : 0; }

  /* a band is picked by score, highest floor that still fits */
  function band(list, score) {
    let out = list[list.length - 1];
    for (let i = 0; i < list.length; i++) if (score >= list[i].min) { out = list[i]; break; }
    return out;
  }

  /* score a value against ordered thresholds: [[cut, points], ...] descending */
  function steps(v, table, floor) {
    for (let i = 0; i < table.length; i++) if (v >= table[i][0]) return table[i][1];
    return floor === undefined ? 0 : floor;
  }
  function stepsDown(v, table, floor) {
    for (let i = 0; i < table.length; i++) if (v <= table[i][0]) return table[i][1];
    return floor === undefined ? 0 : floor;
  }

  /* ============================================================
     1 · Mortgage Readiness Assessment        Real Estate · ask
     ============================================================ */
  const MORTGAGE_READY = {
    id: "mortgage-ready",
    kind: "ask",
    name: "Mortgage Readiness Assessment",
    cat: "Real Estate",
    tint: "sand",
    icon: "home",
    who: "Loan officers",
    lede: "Whether a lender would take this file today, and what is standing in the way.",
    minutes: 3,
    sendable: true,
    pro: ["realestate", "financial"],

    groups: [
      { id: "who",  name: "The borrower" },
      { id: "flow", name: "What comes in, what goes out" },
      { id: "buy",  name: "The purchase" }
    ],

    items: [
      { id: "credit", group: "who", kind: "number", min: 300, max: 850,
        ask: "Credit score", hint: "The middle of the three, if you have all three." },
      { id: "jobYears", group: "who", kind: "number", min: 0, max: 50, allowZero: true,
        ask: "Years in the job", hint: "Two years in the same line of work is what a lender looks for." },
      { id: "selfEmployed", group: "who", kind: "bool",
        ask: "Self-employed?", hint: "It changes which documents are needed, not whether they qualify." },
      { id: "firstTime", group: "who", kind: "bool",
        ask: "First home?" },

      { id: "income", group: "flow", kind: "money", per: "a month",
        ask: "Gross income, a month", hint: "Before tax, both applicants together." },
      { id: "debts", group: "flow", kind: "money", per: "a month", allowZero: true, zeroLabel: "Nothing",
        ask: "Other debt payments, a month",
        hint: "Car, cards, student loans. Not rent, and not the new mortgage." },

      { id: "price", group: "buy", kind: "money",
        ask: "Price they are looking at" },
      { id: "down", group: "buy", kind: "money", allowZero: true,
        ask: "Deposit saved", hint: "Everything they can actually put in on the day." },
      { id: "rate", group: "buy", kind: "rate",
        ask: "Rate on offer", hint: "Today's quote for a borrower at their credit score." },
      { id: "term", group: "buy", kind: "choice",
        ask: "Over how long?",
        options: [{ v: 30, label: "30 years" }, { v: 20, label: "20 years" }, { v: 15, label: "15 years" }] }
    ],

    seed: { term: 30, rate: 6.5, firstTime: true },

    bands: [
      { min: 85, label: "Ready to apply", tone: "good",
        say: "Nothing here would stop a lender. Start the application." },
      { min: 65, label: "Close — a couple of things to fix", tone: "warn",
        say: "A lender would take this file, but not at this price." },
      { min: 45, label: "Not yet, and it is fixable", tone: "warn",
        say: "The gap is real but it is months, not years." },
      { min: 0,  label: "Groundwork first", tone: "bad",
        say: "Work on the foundations before anyone pulls credit." }
    ],

    compute: function (v) {
      const price  = num(v.price), down = num(v.down), rate = num(v.rate) || 6.5;
      const income = num(v.income), debts = num(v.debts);
      const term   = num(v.term) || 30;
      const credit = num(v.credit), jobYears = num(v.jobYears);

      const h = housing(price, down, rate, { years: term });
      const front = income > 0 ? h.total / income * 100 : 0;
      const back  = income > 0 ? (h.total + debts) / income * 100 : 0;

      /* the two prices that matter: what a lender would allow, and what
         keeps them in the band where the rates are worth having */
      const priceAt = function (limit) {
        if (!income) return null;
        return solve(1000, Math.max(price * 4, 2000000), function (p) {
          const hh = housing(p, down, rate, { years: term });
          return (hh.total + debts) / income * 100 <= limit;
        });
      };
      const maxLender = priceAt(43);
      const maxSafe   = priceAt(36);

      /* How long the mortgage insurance runs, by amortising their own loan.
         Two dates, because they are not the same thing and advisers are
         asked about both: at 80% the borrower may ASK for it to come off,
         and at 78% it comes off on its own whether they ask or not. */
      let pmiAskMonths = 0, pmiAutoMonths = 0;
      if (h.pmi > 0 && price > 0) {
        let bal = h.loan;
        const r = rate / 100 / 12, m = h.pi;
        for (let k = 1; k <= term * 12; k++) {
          bal = bal * (1 + r) - m;
          if (!pmiAskMonths && bal / price <= 0.80) pmiAskMonths = k;
          if (bal / price <= 0.78) { pmiAutoMonths = k; break; }
        }
      }

      const score = Math.round(
        0.34 * steps(credit, [[740, 1], [680, .85], [620, .6], [580, .3]], 0) * 100 +
        0.34 * stepsDown(back, [[36, 1], [40, .8], [43, .6], [50, .35]], 0) * 100 +
        0.22 * steps(h.downPct, [[20, 1], [10, .75], [5, .5], [3, .3]], 0) * 100 +
        0.10 * steps(jobYears, [[2, 1], [1, .6]], .3) * 100
      );

      const figures = [
        { id: "payment", label: "The payment, all in", value: money(h.total), big: true,
          note: money(h.pi) + " principal and interest · " + money(h.tax) + " tax · " +
                money(h.ins) + " insurance" + (h.pmi > 0 ? " · " + money(h.pmi) + " mortgage insurance" : "") },
        { id: "dti", label: "Debt-to-income", value: pct(back),
          tone: back <= 36 ? "good" : (back <= 43 ? "warn" : "bad"),
          meter: Math.min(1, back / 50), mark: 36 / 50,
          note: "The mark is 36%, where the better rates stop." },
        { id: "front", label: "Housing alone", value: pct(front) },
        { id: "ltv", label: "Loan to value", value: pct(h.ltv, 0) },
        { id: "downpct", label: "Deposit", value: pct(h.downPct, 1) }
      ];

      const notes = [];
      if (maxLender !== null) {
        notes.push({ tone: "good", head: money(maxLender),
          body: "The most a lender would allow at 43%." });
      }
      if (maxSafe !== null && maxSafe < price) {
        notes.push({ tone: "warn", head: money(maxSafe),
          body: "What keeps them under 36%, where the rates are worth having. Quote this one." });
      }
      if (h.downPct < 20 && price > 0) {
        const need = price * 0.2 - down;
        const yrs = function (mo) { return Math.round(mo / 12 * 10) / 10; };
        notes.push({ tone: "bad", head: money(need) + " more",
          body: "Would reach 20% down and remove the " + money(h.pmi) + " a month on day one." +
                (pmiAskMonths ? " Left alone they can ask for it to come off after about " +
                 yrs(pmiAskMonths) + " years, and it drops on its own at " + yrs(pmiAutoMonths) +
                 " — " + money(h.pmi * pmiAutoMonths) + " paid if nobody asks." : "") });
      }
      if (debts > 0 && income > 0) {
        const without = (h.total) / income * 100;
        if (back > 36 && without <= 36) {
          notes.push({ tone: "good", head: "Clear the " + money(debts),
            body: "Without it they are at " + pct(without) + " — inside the better band." });
        }
      }
      if (credit && credit < 740 && credit >= 700) {
        notes.push({ tone: "warn", head: "One band below 740",
          body: "Worth asking about a rapid rescore before the application goes in. It cannot be done afterwards." });
      }

      return { score: score, figures: figures, notes: notes,
               raw: { total: h.total, back: back, front: front, ltv: h.ltv,
                      maxLender: maxLender, maxSafe: maxSafe, pmi: h.pmi,
                      pmiAskMonths: pmiAskMonths, pmiAutoMonths: pmiAutoMonths } };
    }
  };

  /* ============================================================
     2 · Borrower Document Checklist          Real Estate · check
     ============================================================ */
  const BORROWER_DOCS = {
    id: "borrower-docs",
    kind: "check",
    name: "Borrower Document Checklist",
    cat: "Real Estate",
    tint: "sand",
    icon: "doc",
    who: "Loan officers",
    lede: "Only the documents this borrower actually has to produce — and what is still outstanding.",
    minutes: 2,
    sendable: true,
    pro: ["realestate"],

    /* the answers here decide which items exist at all */
    setup: [
      { id: "employed", kind: "choice", ask: "How are they paid?",
        options: [
          { v: "w2",    label: "A salary or wages" },
          { v: "self",  label: "Self-employed" },
          { v: "both",  label: "Both" },
          { v: "other", label: "Pension or benefits" }
        ] },
      { id: "gift", kind: "bool", ask: "Any of the deposit a gift?" },
      { id: "owns", kind: "bool", ask: "Do they own another property?" },
      { id: "va", kind: "bool", ask: "VA loan?" },
      { id: "divorced", kind: "bool", ask: "Paying or receiving support?" }
    ],
    seed: { employed: "w2", gift: false, owns: false, va: false, divorced: false },

    groups: [
      { id: "id",    name: "Who they are" },
      { id: "in",    name: "What they earn" },
      { id: "have",  name: "What they have" },
      { id: "extra", name: "Because of this case" }
    ],

    items: [
      { id: "photo", group: "id", name: "Photo ID", note: "Driver's licence or passport, both applicants." },
      { id: "ssn",   group: "id", name: "Social security numbers" },

      { id: "stubs", group: "in", name: "Two recent pay stubs",
        note: "Whatever their last two pay days were.",
        when: function (s) { return s.employed === "w2" || s.employed === "both"; } },
      { id: "w2",    group: "in", name: "W-2s for the last two years",
        when: function (s) { return s.employed === "w2" || s.employed === "both"; } },
      { id: "returns", group: "in", name: "Personal tax returns, two years",
        note: "Every page and every schedule.",
        when: function (s) { return s.employed !== "w2"; } },
      { id: "bizReturns", group: "in", name: "Business tax returns, two years",
        when: function (s) { return s.employed === "self" || s.employed === "both"; } },
      { id: "pl", group: "in", name: "Year-to-date profit and loss",
        note: "Signed. It does not have to be from an accountant.",
        when: function (s) { return s.employed === "self" || s.employed === "both"; } },
      { id: "award", group: "in", name: "Award letter",
        note: "Whoever pays the pension or the benefit.",
        when: function (s) { return s.employed === "other"; } },

      { id: "bank", group: "have", name: "Two months of bank statements",
        note: "Every page, including the blank ones." },
      { id: "retire", group: "have", name: "Latest retirement account statement" },
      { id: "giftLetter", group: "have", name: "Gift letter",
        note: "Signed by whoever is giving it, saying it is not a loan.",
        when: function (s) { return !!s.gift; } },
      { id: "giftTrail", group: "have", name: "Proof the gift actually moved",
        note: "Their statement showing it leaving, yours showing it arriving.",
        when: function (s) { return !!s.gift; } },

      { id: "mortStat", group: "extra", name: "Statement on the other mortgage",
        when: function (s) { return !!s.owns; } },
      { id: "lease", group: "extra", name: "Lease on the other property",
        note: "Only if it is let. Rent counts towards what they can borrow.",
        when: function (s) { return !!s.owns; } },
      { id: "coe", group: "extra", name: "Certificate of eligibility",
        when: function (s) { return !!s.va; } },
      { id: "dd214", group: "extra", name: "DD-214",
        when: function (s) { return !!s.va; } },
      { id: "decree", group: "extra", name: "Divorce decree or support order",
        note: "The pages that state the amount and how long it runs.",
        when: function (s) { return !!s.divorced; } }
    ]
  };

  /* ============================================================
     3 · Prequalification Tracker             Real Estate · track
     ============================================================ */
  const PREQUAL = {
    id: "prequal",
    kind: "track",
    name: "Prequalification Tracker",
    cat: "Real Estate",
    tint: "sand",
    icon: "chart",
    who: "Loan officers",
    lede: "Everyone in the pipeline, and which stage each of them is stuck at.",
    minutes: 1,
    sendable: false,
    pro: ["realestate"],

    stages: [
      { id: "new",      name: "New enquiry",    tint: "mist" },
      { id: "asked",    name: "Documents asked for", tint: "sun" },
      { id: "in",       name: "Documents in",   tint: "sun" },
      { id: "prequal",  name: "Prequalified",   tint: "mint" },
      { id: "contract", name: "Under contract", tint: "mint" },
      { id: "closed",   name: "Closed",         tint: "sage" },
      { id: "lost",     name: "Gone quiet",     tint: "rose" }
    ],
    fields: [
      { id: "name",  label: "Who",        kind: "text",  wide: true },
      { id: "amount", label: "Loan",      kind: "money" },
      { id: "note",  label: "What is holding it up", kind: "text", wide: true }
    ],
    /* a row that has not moved in this many days is called out */
    staleAfter: 7
  };

  /* ============================================================
     4 · Retirement Readiness Scorecard              Money · ask
     ============================================================ */
  const RETIRE_READY = {
    id: "retire-ready",
    kind: "ask",
    name: "Retirement Readiness Scorecard",
    cat: "Money",
    tint: "mint",
    icon: "target",
    who: "Retirement",
    lede: "Whether what they are putting away actually reaches what they want to spend.",
    minutes: 3,
    sendable: true,
    pro: ["financial"],

    groups: [
      { id: "when",  name: "When" },
      { id: "now",   name: "Where they are" },
      { id: "later", name: "What it has to pay for" }
    ],

    items: [
      { id: "age", group: "when", kind: "number", min: 18, max: 85, ask: "Age now" },
      { id: "retAge", group: "when", kind: "number", min: 45, max: 90, ask: "Age they want to stop" },

      { id: "saved", group: "now", kind: "money", allowZero: true,
        ask: "Saved for retirement", hint: "401(k), IRA, anything earmarked for later." },
      { id: "monthly", group: "now", kind: "money", per: "a month", allowZero: true,
        ask: "Going in each month", hint: "Theirs and the employer's together." },
      { id: "growth", group: "now", kind: "rate",
        ask: "Growth assumed", hint: "Before inflation. 6% is a common, unexciting figure." },

      { id: "spend", group: "later", kind: "money", per: "a month",
        ask: "What they want to spend, in today's money" },
      { id: "ss", group: "later", kind: "money", per: "a month", allowZero: true, zeroLabel: "None",
        ask: "Social security expected", hint: "Their statement gives an estimate." },
      { id: "pension", group: "later", kind: "money", per: "a month", allowZero: true, zeroLabel: "None",
        ask: "Any pension" },
      { id: "inflation", group: "later", kind: "rate",
        ask: "Inflation assumed" },
      { id: "swr", group: "later", kind: "rate",
        ask: "Drawn down each year", hint: "4% is the usual rule of thumb." }
    ],

    seed: { growth: 6, inflation: 2.5, swr: 4, retAge: 65 },

    bands: [
      { min: 100, label: "There, with room", tone: "good",
        say: "On these assumptions the money outlives the plan." },
      { min: 85, label: "On track", tone: "good",
        say: "Close enough that ordinary good years close it." },
      { min: 60, label: "Short, and reachable", tone: "warn",
        say: "The gap is real. It is a monthly number, not a miracle." },
      { min: 0, label: "A long way short", tone: "bad",
        say: "Something structural has to change — the date, the spend, or the saving." }
    ],

    compute: function (v) {
      const age = num(v.age), retAge = num(v.retAge);
      const years = Math.max(0, retAge - age);
      const saved = num(v.saved), monthly = num(v.monthly);
      const growth = num(v.growth) || 6, infl = num(v.inflation) || 2.5;
      const swr = num(v.swr) || 4;
      const spend = num(v.spend), ss = num(v.ss), pension = num(v.pension);

      const projected = futureValue(saved, monthly, years, growth);
      const grow = Math.pow(1 + infl / 100, years);
      const gapMonthly = Math.max(0, spend - ss - pension);
      const gapAnnual = gapMonthly * grow * 12;
      const required = swr > 0 ? gapAnnual / (swr / 100) : 0;

      const ratio = required > 0 ? projected / required : 1;
      const score = Math.max(0, Math.min(130, Math.round(ratio * 100)));

      /* what monthly saving would close it, solved rather than guessed */
      let needMonthly = null;
      if (required > projected && years > 0) {
        const found = solve(0, 100000, function (m) {
          return futureValue(saved, m, years, growth) < required;
        });
        needMonthly = found === null ? null : Math.ceil(found);
      }

      /* or the date that closes it at today's saving */
      let needAge = null;
      if (required > projected && monthly > 0) {
        for (let extra = 1; extra <= 25; extra++) {
          const y = years + extra;
          const req = (gapMonthly * Math.pow(1 + infl / 100, y) * 12) / (swr / 100);
          if (futureValue(saved, monthly, y, growth) >= req) { needAge = retAge + extra; break; }
        }
      }

      const figures = [
        { id: "projected", label: "What they are on course for", value: money(projected), big: true,
          note: years + (years === 1 ? " year" : " years") + " of growth at " + growth + "%" },
        { id: "required", label: "What the plan needs", value: money(required),
          note: money(gapAnnual) + " a year, drawn at " + swr + "%" },
        { id: "gap", label: required > projected ? "Short by" : "Spare",
          value: money(Math.abs(required - projected)),
          tone: required > projected ? "bad" : "good" },
        { id: "cover", label: "Covered", value: pct(Math.min(999, ratio * 100), 0),
          meter: Math.min(1, ratio), mark: 1,
          tone: ratio >= 1 ? "good" : (ratio >= .75 ? "warn" : "bad") }
      ];

      const notes = [];
      if (needMonthly !== null) {
        notes.push({ tone: "warn", head: money(needMonthly) + " a month",
          body: "What it takes to close the gap by " + retAge + ", instead of " + money(monthly) + "." });
      }
      if (needAge !== null) {
        notes.push({ tone: "warn", head: "Or age " + needAge,
          body: "Same saving, later date. " + (needAge - retAge) +
                (needAge - retAge === 1 ? " year" : " years") + " more work closes it." });
      }
      if (ss > 0) {
        notes.push({ tone: "good", head: money(ss) + " a month from social security",
          body: "Covers " + pct(Math.min(100, spend > 0 ? ss / spend * 100 : 0), 0) + " of what they want to spend." });
      }
      if (ratio >= 1) {
        notes.push({ tone: "good", head: "Nothing has to change",
          body: "On these assumptions. Assumptions are the fragile part — say so out loud." });
      }
      return { score: score, figures: figures, notes: notes,
               raw: { projected: projected, required: required, ratio: ratio,
                      needMonthly: needMonthly, needAge: needAge, years: years } };
    }
  };

  /* ============================================================
     5 · Buyer Readiness Assessment           Real Estate · ask
     ============================================================ */
  const BUYER_READY = {
    id: "buyer-ready",
    kind: "ask",
    name: "Buyer Readiness Assessment",
    cat: "Real Estate",
    tint: "sand",
    icon: "target",
    who: "Real estate agents",
    lede: "Whether this buyer can actually transact, before you spend six Saturdays on them.",
    minutes: 2,
    sendable: true,
    pro: ["realestate"],

    groups: [
      { id: "money", name: "The money" },
      { id: "when",  name: "The timing" },
      { id: "what",  name: "What they want" }
    ],

    items: [
      { id: "approved", group: "money", kind: "choice", ask: "Where are they with a lender?",
        options: [
          { v: 3, label: "Fully underwritten approval" },
          { v: 2, label: "Pre-approved" },
          { v: 1, label: "Prequalified on the phone" },
          { v: 0, label: "Have not spoken to anyone" }
        ] },
      { id: "budget", group: "money", kind: "money", ask: "Budget they have in mind" },
      { id: "down", group: "money", kind: "money", allowZero: true, ask: "Cash available" },

      { id: "when", group: "when", kind: "choice", ask: "When do they need to be in?",
        options: [
          { v: 3, label: "Inside 3 months" },
          { v: 2, label: "3 to 6 months" },
          { v: 1, label: "6 to 12 months" },
          { v: 0, label: "Just looking" }
        ] },
      { id: "sellFirst", group: "when", kind: "bool", ask: "Do they have to sell first?" },
      { id: "listed", group: "when", kind: "bool",
        when: function (v) { return v.sellFirst === true; },
        ask: "Is it on the market yet?" },

      { id: "agreed", group: "what", kind: "bool",
        ask: "Are both of them agreed on what they want?",
        hint: "If there are two of them. This is the quiet one that kills deals." },
      { id: "musts", group: "what", kind: "text",
        ask: "What they will not compromise on",
        placeholder: "e.g. three bedrooms, that school, a garage" }
    ],

    bands: [
      { min: 80, label: "Transaction-ready", tone: "good", say: "Show them houses. This one will close." },
      { min: 55, label: "Nearly", tone: "warn", say: "One thing is missing, and it is usually the lender." },
      { min: 30, label: "Early", tone: "warn", say: "Worth keeping warm, not worth six Saturdays yet." },
      { min: 0,  label: "Browsing", tone: "bad", say: "Send them the market updates and wait." }
    ],

    compute: function (v) {
      const approved = num(v.approved), when = num(v.when);
      const budget = num(v.budget), down = num(v.down);
      const pctDown = budget > 0 ? down / budget * 100 : 0;

      let score = Math.round(
        0.40 * (approved / 3) * 100 +
        0.25 * (when / 3) * 100 +
        0.20 * steps(pctDown, [[20, 1], [10, .8], [5, .5], [3, .3]], .1) * 100 +
        0.15 * (v.agreed === false ? 0 : 100)
      );
      if (v.sellFirst === true && v.listed !== true) score = Math.max(0, score - 15);

      const figures = [
        { id: "cash", label: "Cash against budget", value: pct(pctDown, 1), big: true,
          meter: Math.min(1, pctDown / 20), mark: 1,
          tone: pctDown >= 20 ? "good" : (pctDown >= 5 ? "warn" : "bad"),
          note: money(down) + " against " + money(budget) },
        { id: "lender", label: "With a lender",
          value: ["Not yet", "Prequalified", "Pre-approved", "Underwritten"][approved] || "—",
          tone: approved >= 2 ? "good" : (approved === 1 ? "warn" : "bad") },
        { id: "timing", label: "Moving",
          value: ["Just looking", "6–12 months", "3–6 months", "Inside 3 months"][when] || "—" }
      ];

      const notes = [];
      if (approved < 2) {
        notes.push({ tone: "bad", head: "No real approval",
          body: "This is the one thing to fix before anything else. Introduce a lender this week." });
      }
      if (v.sellFirst === true && v.listed !== true) {
        notes.push({ tone: "bad", head: "Selling first, and not listed",
          body: "Their timeline is their own listing's timeline. Start there." });
      }
      if (v.agreed === false) {
        notes.push({ tone: "warn", head: "They do not agree yet",
          body: "Worth an hour on what each of them actually wants before any viewings." });
      }
      if (pctDown >= 20) {
        notes.push({ tone: "good", head: "20% down or better",
          body: "No mortgage insurance, and a stronger offer than most in their bracket." });
      }
      return { score: score, figures: figures, notes: notes,
               raw: { pctDown: pctDown, approved: approved } };
    }
  };

  /* ============================================================
     6 · Tax Document Checklist                    Taxes · check
     ============================================================ */
  const TAX_DOCS = {
    id: "tax-docs",
    kind: "check",
    name: "Tax Document Checklist",
    cat: "Taxes",
    tint: "sun",
    icon: "doc",
    who: "Tax professionals",
    lede: "What this household has to send you, and nothing that does not apply to them.",
    minutes: 2,
    sendable: true,
    pro: ["tax"],

    setup: [
      { id: "status", kind: "choice", ask: "Filing as?",
        options: [
          { v: "single", label: "Single" },
          { v: "joint",  label: "Married, jointly" },
          { v: "sep",    label: "Married, separately" },
          { v: "hoh",    label: "Head of household" }
        ] },
      { id: "work", kind: "choice", ask: "Income from?",
        options: [
          { v: "w2",   label: "A job" },
          { v: "self", label: "Their own business" },
          { v: "both", label: "Both" },
          { v: "ret",  label: "Retired" }
        ] },
      { id: "kids",     kind: "bool", ask: "Dependents?" },
      { id: "owns",     kind: "bool", ask: "Own their home?" },
      { id: "invest",   kind: "bool", ask: "Investments outside retirement accounts?" },
      { id: "rental",   kind: "bool", ask: "Any rental property?" },
      { id: "school",   kind: "bool", ask: "Anyone in college?" }
    ],
    seed: { status: "joint", work: "w2", kids: true, owns: true, invest: false, rental: false, school: false },

    groups: [
      { id: "id",    name: "The basics" },
      { id: "in",    name: "What came in" },
      { id: "out",   name: "What might come off" },
      { id: "extra", name: "Because of their situation" }
    ],

    items: [
      { id: "lastYear", group: "id", name: "Last year's return", note: "If we did not file it." },
      { id: "ids", group: "id", name: "Social security numbers for everyone on the return" },
      { id: "bank", group: "id", name: "Bank details for the refund" },

      { id: "w2", group: "in", name: "W-2 from every job",
        when: function (s) { return s.work === "w2" || s.work === "both"; } },
      { id: "n1099", group: "in", name: "1099-NEC or 1099-K",
        when: function (s) { return s.work === "self" || s.work === "both"; } },
      { id: "books", group: "in", name: "Income and expenses for the business",
        note: "A spreadsheet is fine. A shoebox is not.",
        when: function (s) { return s.work === "self" || s.work === "both"; } },
      { id: "ssa", group: "in", name: "SSA-1099",
        when: function (s) { return s.work === "ret"; } },
      { id: "r1099", group: "in", name: "1099-R for any pension or withdrawal",
        when: function (s) { return s.work === "ret"; } },
      { id: "int", group: "in", name: "1099-INT and 1099-DIV" },
      { id: "b1099", group: "in", name: "1099-B for anything sold",
        note: "With the cost basis. Without it the gain is guessed at.",
        when: function (s) { return !!s.invest; } },

      { id: "mortInt", group: "out", name: "1098 — mortgage interest",
        when: function (s) { return !!s.owns; } },
      { id: "propTax", group: "out", name: "Property tax paid",
        when: function (s) { return !!s.owns; } },
      { id: "charity", group: "out", name: "Charitable receipts", note: "Anything over $250 needs its letter." },
      { id: "medical", group: "out", name: "Medical, if it was a heavy year" },
      { id: "retireCont", group: "out", name: "IRA or HSA contributions" },

      { id: "childcare", group: "extra", name: "Childcare — amounts and the provider's tax id",
        when: function (s) { return !!s.kids; } },
      { id: "t1098", group: "extra", name: "1098-T from the college",
        when: function (s) { return !!s.school; } },
      { id: "books2", group: "extra", name: "Books and supplies for the course",
        when: function (s) { return !!s.school; } },
      { id: "rentIn", group: "extra", name: "Rent received, by property",
        when: function (s) { return !!s.rental; } },
      { id: "rentOut", group: "extra", name: "Repairs, insurance and management fees",
        when: function (s) { return !!s.rental; } },
      { id: "sepAgree", group: "extra", name: "Who is claiming what",
        note: "Filing separately only works if you both treat deductions the same way.",
        when: function (s) { return s.status === "sep"; } }
    ]
  };

  /* ============================================================
     7 · Policy Review Tracker                Protection · track
     ============================================================ */
  const POLICY_REVIEW = {
    id: "policy-review",
    kind: "track",
    name: "Policy Review Tracker",
    cat: "Protection",
    tint: "rose",
    icon: "shield",
    who: "Insurance professionals",
    lede: "Which policies are due a look, and where each conversation got to.",
    minutes: 1,
    sendable: false,
    pro: ["financial"],

    stages: [
      { id: "due",      name: "Due a review",   tint: "sun" },
      { id: "reached",  name: "Contacted",      tint: "mist" },
      { id: "reviewed", name: "Reviewed",       tint: "mint" },
      { id: "change",   name: "Change proposed", tint: "sand" },
      { id: "done",     name: "Settled",        tint: "sage" },
      { id: "nochange", name: "No change needed", tint: "sage" }
    ],
    fields: [
      { id: "name",    label: "Who",     kind: "text", wide: true },
      { id: "carrier", label: "With",    kind: "text" },
      { id: "amount",  label: "Cover",   kind: "money" },
      { id: "note",    label: "What changed in their life", kind: "text", wide: true }
    ],
    staleAfter: 14
  };

  /* ============================================================
     8 · Estate Document Checklist            Protection · check
     ============================================================ */
  const ESTATE_DOCS = {
    id: "estate-docs",
    kind: "check",
    name: "Estate Document Checklist",
    cat: "Protection",
    tint: "rose",
    icon: "heart",
    who: "Estate and legacy",
    lede: "What this family should have signed, and what is missing.",
    minutes: 2,
    sendable: true,
    pro: ["financial", "tax"],

    setup: [
      { id: "married",   kind: "bool", ask: "Married or with a partner?" },
      { id: "kids",      kind: "bool", ask: "Children?" },
      { id: "minors",    kind: "bool", ask: "Any of them under 18?",
        when: function (s) { return !!s.kids; } },
      { id: "business",  kind: "bool", ask: "Own a business?" },
      { id: "multi",     kind: "bool", ask: "Property in more than one state?" },
      { id: "specialNeeds", kind: "bool", ask: "Anyone who depends on them long-term?" }
    ],
    seed: { married: true, kids: true, minors: true, business: false, multi: false, specialNeeds: false },

    groups: [
      { id: "core",  name: "Everyone" },
      { id: "if",    name: "If they cannot speak for themselves" },
      { id: "extra", name: "Because of this family" }
    ],

    items: [
      { id: "will", group: "core", name: "A will", note: "Signed, witnessed, and findable." },
      { id: "benes", group: "core", name: "Beneficiaries checked on every account",
        note: "These beat the will. It is the most common mistake there is." },
      { id: "list", group: "core", name: "A list of what they own and where it is" },
      { id: "digital", group: "core", name: "How to get into the accounts",
        note: "Passwords, or a password manager someone else can reach." },

      { id: "poa", group: "if", name: "Financial power of attorney" },
      { id: "health", group: "if", name: "Healthcare proxy" },
      { id: "living", group: "if", name: "Living will" },
      { id: "hipaa", group: "if", name: "HIPAA release", note: "Without it a hospital may tell them nothing." },

      { id: "guardian", group: "extra", name: "Named guardians for the children",
        note: "And a second choice. Courts decide if nobody else has.",
        when: function (s) { return !!s.minors; } },
      { id: "trust", group: "extra", name: "A trust to hold it until they are older",
        when: function (s) { return !!s.minors; } },
      { id: "buysell", group: "extra", name: "Buy-sell agreement",
        when: function (s) { return !!s.business; } },
      { id: "keyman", group: "extra", name: "Key person cover",
        when: function (s) { return !!s.business; } },
      { id: "ancillary", group: "extra", name: "Something to avoid probate in the second state",
        note: "Otherwise the family goes through it twice.",
        when: function (s) { return !!s.multi; } },
      { id: "snt", group: "extra", name: "A special needs trust",
        note: "Leaving money outright can end the benefits it was meant to supplement.",
        when: function (s) { return !!s.specialNeeds; } },
      { id: "spouseWill", group: "extra", name: "A matching will for the partner",
        when: function (s) { return !!s.married; } }
    ]
  };

  /* ============================================================
     the registry
     ============================================================ */
  const ALL = [
    MORTGAGE_READY, BORROWER_DOCS, PREQUAL,
    RETIRE_READY, BUYER_READY,
    TAX_DOCS, POLICY_REVIEW, ESTATE_DOCS
  ];

  const BY_ID = {};
  ALL.forEach(function (f) { BY_ID[f.id] = f; });

  /* which items apply, given what has been answered so far */
  function applies(item, v) {
    if (!item.when) return true;
    try { return !!item.when(v); } catch (e) { return false; }
  }
  function live(form, v) {
    const src = form.kind === "check" ? form.items : form.items;
    return (src || []).filter(function (i) { return applies(i, v); });
  }

  window.WD_FORMS = {
    all: ALL,
    byId: function (id) { return BY_ID[id] || null; },
    applies: applies,
    live: live,
    band: band,
    /* exported so a test, and the assistant, can use the same arithmetic */
    math: { pmt: pmt, housing: housing, solve: solve, futureValue: futureValue,
            money: money, pct: pct, num: num, steps: steps, stepsDown: stepsDown }
  };
})();
