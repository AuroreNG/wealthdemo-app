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

  /* ------------------------------------------------------------
     The band tables, written down once.

     compute() scores against these and the scorecard draws them,
     so what is on screen and what is in the number can never
     drift apart. Move a lender's threshold here and the picture
     and the score both move with it.

     Each is [cut, fraction] in descending order of cut, read by
     steps() upwards or stepsDown() downwards.
     ------------------------------------------------------------ */
  const T = {
    credit:    [[740, 1], [680, .85], [620, .6], [580, .3]],
    dti:       [[36, 1], [40, .8], [43, .6], [50, .35]],
    downPct:   [[20, 1], [10, .75], [5, .5], [3, .3]],
    jobYears:  [[2, 1], [1, .6]],
    buyerDown: [[20, 1], [10, .8], [5, .5], [3, .3]]
  };

  /* what a lever is worth: the form's own compute(), run again on
     changed answers. Nothing is modelled twice. */
  function withPatch(v, patch) {
    const out = {};
    for (const k in v) out[k] = v[k];
    for (const k in patch) out[k] = patch[k];
    return out;
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

    /* A worked example, so the page opens as a scorecard rather than as ten
       empty boxes. Every calculator on this site arrives pre-filled; the
       forms did not, which meant none of the work below was visible until
       somebody had typed for two minutes. The engine marks it as an example
       until the first edit. */
    seed: { credit: 712, jobYears: 4, selfEmployed: false, firstTime: true,
            income: 9800, debts: 640, price: 520000, down: 70000,
            rate: 6.5, term: 30 },

    /* ------------------------------------------------------------
       The scorecard.

       A readiness score is four weighted judgements, not one
       number, and an adviser is owed the four. Each gate names
       the table it is scored against — the same constant
       compute() uses — so the lanes on screen are the lender's
       real thresholds and not a drawing of them.
       ------------------------------------------------------------ */
    gates: [
      { id: "credit", label: "Credit score", term: "creditband", weight: 34, dir: "up",
        table: T.credit, floor: 0, scale: [560, 820], ticks: [620, 680, 740],
        value: function (v, r) { return num(v.credit); },
        show:  function (v, r) { return String(Math.round(num(v.credit))); },
        note:  function (v, r) { return num(v.credit) >= 740 ? "Top band" : "One band under 740"; } },

      { id: "dti", label: "Debt-to-income", term: "backratio", weight: 34, dir: "down",
        table: T.dti, floor: 0, scale: [30, 55],
        ticks: [[36, "36%"], [40, "40%"], [43, "43% ceiling"]],
        value: function (v, r) { return r.back; },
        show:  function (v, r) { return pct(r.back); },
        note:  function (v, r) { return r.back > 43 ? "Past the ceiling"
                                      : (r.back > 36 ? "Inside the ceiling" : "Best band"); } },

      { id: "down", label: "Deposit", term: "downpayment", weight: 22, dir: "up",
        table: T.downPct, floor: 0, scale: [0, 25],
        ticks: [[5, "5%"], [10, "10%"], [20, "20% \u00b7 no insurance"]],
        value: function (v, r) { return r.downPct; },
        show:  function (v, r) { return pct(r.downPct, 1); },
        note:  function (v, r) { return r.pmi > 0
                  ? money(r.pmi) + " a month insurance" : "No mortgage insurance"; } },

      { id: "job", label: "Time in the job", term: "jobhistory", weight: 10, dir: "up",
        table: T.jobYears, floor: .3, scale: [0, 6], ticks: [[1, "1 yr"], [2, "2 yrs"]],
        value: function (v, r) { return num(v.jobYears); },
        show:  function (v, r) { const n = num(v.jobYears); return n + (n === 1 ? " yr" : " yrs"); },
        note:  function (v, r) { return num(v.jobYears) >= 2 ? "Full marks" : "Under two years"; } }
    ],

    /* Each lever is re-run through compute(). The engine ranks them by
       what they actually score, so the page can say which one matters
       rather than listing four in the order somebody typed them. */
    levers: [
      { id: "debts", when: function (v, r) { return num(v.debts) > 0; },
        label: function (v, r) { return "Clear the " + money(num(v.debts)) + " of other debt"; },
        head:  function (v, r) { return "It is the other debt, not the house."; },
        why:   function (v, r) {
          return money(num(v.debts)) + " a month of other debt is what is failing the file \u2014 "
               + "not the price, the credit or the deposit. Clear it and the ratio lands inside "
               + "every lender's ceiling at the same " + money(num(v.price)) + "."; },
        patch: function (v, r) { return { debts: 0 }; } },

      { id: "down20", when: function (v, r) { return r.downPct < 20 && num(v.price) > 0; },
        label: function (v, r) { return money(num(v.price) * 0.2 - num(v.down)) + " more down"; },
        head:  function (v, r) { return "The deposit is the short leg."; },
        why:   function (v, r) {
          return "Reaching 20% removes the " + money(r.pmi) + " a month of mortgage insurance "
               + "on day one and moves the ratio with it."; },
        patch: function (v, r) { return { down: num(v.price) * 0.2 }; } },

      { id: "price", when: function (v, r) { return r.maxLender !== null && r.maxLender < num(v.price); },
        label: function (v, r) { return "Offer " + money(r.maxLender) + " instead"; },
        head:  function (v, r) { return "The price is what has to move."; },
        why:   function (v, r) {
          return money(r.maxLender) + " is the most this income carries at the 43% ceiling. "
               + "Everything else on the file already passes."; },
        patch: function (v, r) { return { price: r.maxLender }; } },

      { id: "credit740", when: function (v, r) { return num(v.credit) < 740 && num(v.credit) > 0; },
        label: function (v, r) { return "Credit up to 740"; },
        head:  function (v, r) { return "One credit band is the whole gap."; },
        why:   function (v, r) {
          return "Worth asking about a rapid rescore before the application goes in. "
               + "It cannot be done afterwards."; },
        patch: function (v, r) { return { credit: 740 }; } }
    ],

    /* what the client says, answered by running this form again */
    guide: [
      { kind: "objection", said: "Can we just offer over asking? We really want this one.",
        text: function (c) {
          if (c.raw.maxLender === null) return "";
          return "Not on this income. The ceiling is <b>" + c.money(c.raw.maxLender) +
            "</b> and they are already asking <b>" + c.money(c.num(c.v.price)) +
            "</b>. Every dollar over comes out of the deposit, which pushes the loan-to-value " +
            "the wrong way \u2014 and it is the ratio failing, not the deposit."; },
        say: "I can get you approved at the ceiling today. Above that I am not the one saying no \u2014 the underwriter is.",
        ran: "Solved the price against this form's own ratio" },

      { kind: "objection", said: "Why would I pay off a car at 3% to borrow at 6.5%?",
        text: function (c) {
          if (!(c.num(c.v.debts) > 0)) return "";
          const after = c.ifChanged({ debts: 0 });
          return "Because the lender is not pricing the car, it is counting the payment. That <b>" +
            c.money(c.num(c.v.debts)) + "</b> a month is worth <b>" + (after.score - c.score) +
            " points</b> of readiness \u2014 the ratio goes from <b>" + c.pct(c.raw.back) +
            "</b> to <b>" + c.pct(after.raw.back) + "</b>. The interest rate on it is beside the point."; },
        say: "Clearing a payment does not save you that payment. It gives you back everything that payment could have borrowed.",
        ran: "Ran this form again with the other debt cleared" },

      { kind: "question", said: "My credit is fine. Why does it matter if I have the deposit?",
        text: function (c) {
          const cr = c.num(c.v.credit);
          if (!cr || cr >= 740) return "";
          const after = c.ifChanged({ credit: 740 });
          return "It is not the deposit, it is the band the deposit is borrowed at. <b>" + cr +
            "</b> is under 740, and lenders price in bands rather than by the point. Crossing it " +
            "is worth <b>" + (after.score - c.score) + " points</b> here."; },
        say: "It is the band that matters, not the number. You are one band under the good one.",
        ran: "Ran this form again at 740" },

      { kind: "check", said: "",
        text: function (c) {
          if (!(c.raw.pmi > 0)) return "";
          const yrs = function (mo) { return Math.round(mo / 12 * 10) / 10; };
          return "Mortgage insurance is <b>" + c.money(c.raw.pmi) + "</b> a month and it is not forever. " +
            (c.raw.pmiAskMonths
              ? "They may ask for it to come off at about <b>" + yrs(c.raw.pmiAskMonths) +
                " years</b> and it drops on its own at <b>" + yrs(c.raw.pmiAutoMonths) +
                "</b> \u2014 <b>" + c.money(c.raw.pmi * c.raw.pmiAutoMonths) + "</b> paid if nobody asks."
              : "Worth telling them when it comes off before they sign."); },
        say: "",
        ran: "Amortised this file's own loan" },

      { kind: "check", said: "",
        text: function (c) {
          if (c.v.selfEmployed !== true) return "";
          return "They are self-employed, so the income on this form is the one a lender will " +
            "re-derive from two years of returns \u2014 after expenses, not before. Worth agreeing " +
            "which figure you are both using before this goes any further."; },
        say: "",
        ran: "Read off the answers on this form" }
    ],

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
        0.34 * steps(credit, T.credit, 0) * 100 +
        0.34 * stepsDown(back, T.dti, 0) * 100 +
        0.22 * steps(h.downPct, T.downPct, 0) * 100 +
        0.10 * steps(jobYears, T.jobYears, .3) * 100
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
                      downPct: h.downPct, price: price, debts: debts, credit: credit,
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
    who: "Financial advisers",
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

    seed: { age: 42, retAge: 65, saved: 180000, monthly: 1400, growth: 6,
            spend: 6500, ss: 2400, pension: 0, inflation: 2.5, swr: 4 },

    /* ------------------------------------------------------------
       This one is not four gates.

       Mortgage and buyer readiness are weighted judgements a
       lender or an agent makes. Retirement readiness is one
       ratio: what they will have against what the plan needs.
       Drawing it as four lanes would be dressing it up as
       something it is not.

       So it gets a build-up instead — where the money comes
       from, against the line it has to reach. Same idea, honest
       to the maths underneath it.
       ------------------------------------------------------------ */
    build: {
      title: "Where the money comes from",
      term: "timevalue",
      note: "and the line it has to reach",
      parts: function (v, r) {
        return [
          { id: "saved", label: "Already saved", n: r.saved, tint: "deep" },
          { id: "paid", label: "Still to go in", n: r.contributed, tint: "mid" },
          { id: "growth", label: "What growth adds", n: r.growthAdded, tint: "light",
            term: "timevalue" }
        ];
      },
      mark: function (v, r) {
        return { label: "What the plan needs", n: r.required, term: "requiredpot" };
      }
    },

    levers: [
      { id: "save", when: function (v, r) { return r.needMonthly !== null; },
        label: function (v, r) { return money(r.needMonthly) + " a month instead of " + money(num(v.monthly)); },
        head:  function (v, r) { return "It is a monthly number, not a miracle."; },
        why:   function (v, r) {
          return "Saving " + money(r.needMonthly) + " a month from now closes it by " +
            num(v.retAge) + " on the same assumptions."; },
        patch: function (v, r) { return { monthly: r.needMonthly }; } },

      { id: "later", when: function (v, r) { return r.needAge !== null; },
        label: function (v, r) { return "Stop at " + r.needAge + " instead of " + num(v.retAge); },
        head:  function (v, r) { return "The date is the cheapest lever they have."; },
        why:   function (v, r) {
          return "Same saving, later date. " + (r.needAge - num(v.retAge)) +
            ((r.needAge - num(v.retAge)) === 1 ? " more year" : " more years") +
            " of paying in and one fewer of drawing out."; },
        patch: function (v, r) { return { retAge: r.needAge }; } },

      { id: "spend", when: function (v, r) { return num(v.spend) > 0 && r.ratio < 1; },
        label: function (v, r) { return money(Math.round(num(v.spend) * 0.9)) + " a month instead of " + money(num(v.spend)); },
        head:  function (v, r) { return "Ten per cent less to live on."; },
        why:   function (v, r) {
          return "Spending is the only lever that works immediately and the only one they control " +
            "completely. Ten per cent is usually invisible in practice."; },
        patch: function (v, r) { return { spend: Math.round(num(v.spend) * 0.9) }; } },

      { id: "growth", when: function (v, r) { return num(v.growth) < 7; },
        label: function (v, r) { return "Assume " + (num(v.growth) + 1) + "% growth"; },
        head:  function (v, r) { return "Most of the gap is the assumption."; },
        why:   function (v, r) {
          return "Worth knowing what one point of return is worth here \u2014 but it is the one " +
            "lever nobody controls. Never sell it as a plan."; },
        patch: function (v, r) { return { growth: num(v.growth) + 1 }; } }
    ],

    guide: [
      { kind: "question", said: "So am I going to be all right?",
        text: function (c) {
          return "On these figures they reach <b>" + c.money(c.raw.projected) + "</b> against a plan " +
            "that needs <b>" + c.money(c.raw.required) + "</b> \u2014 " +
            (c.raw.ratio >= 1
              ? "covered, with room."
              : "<b>" + c.money(c.raw.required - c.raw.projected) + "</b> short. " +
                "Every figure here rests on assumptions, and the assumptions are the fragile part."); },
        say: "The honest answer is a range, and the number moves the day any of these assumptions does.",
        ran: "Read straight off this form" },

      { kind: "objection", said: "Can I not just work a couple more years if it comes to it?",
        text: function (c) {
          if (c.raw.needAge === null) return "";
          const after = c.ifChanged({ retAge: c.raw.needAge });
          return "You can, and it works \u2014 stopping at <b>" + c.raw.needAge + "</b> instead of <b>" +
            c.num(c.v.retAge) + "</b> takes this from <b>" + c.score + "</b> to <b>" + after.score +
            "</b>. The part worth saying out loud is that it is a decision made now, not then: " +
            "the later you leave it the more years it takes."; },
        say: "Working longer is a real answer. It is just a more expensive one the longer you wait to choose it.",
        ran: "Ran this form again at the later date" },

      { kind: "check", said: "",
        text: function (c) {
          if (!(c.num(c.v.ss) > 0) || !(c.num(c.v.spend) > 0)) return "";
          const share = c.num(c.v.ss) / c.num(c.v.spend) * 100;
          if (share < 40) return "";
          return "Social security is carrying <b>" + c.pct(share, 0) + "</b> of what they want to " +
            "spend. That is a lot of the plan resting on one figure from one statement \u2014 worth " +
            "checking it is their own number and not a guess."; },
        say: "",
        ran: "Read off this form's own figures" },

      { kind: "check", said: "",
        text: function (c) {
          const g = c.num(c.v.growth);
          if (!g || g <= 6) return "";
          const lower = c.ifChanged({ growth: 6 });
          return "Growth is set to <b>" + g + "%</b>. At 6% the score is <b>" + lower.score +
            "</b>. Whichever you show them, say out loud that it is an assumption and not a rate " +
            "anybody is promising."; },
        say: "",
        ran: "Ran this form again at 6%" }
    ],

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
      const contributed = monthly * Math.round(years * 12);
      return { score: score, figures: figures, notes: notes,
               raw: { projected: projected, required: required, ratio: ratio,
                      needMonthly: needMonthly, needAge: needAge, years: years,
                      saved: saved, contributed: contributed,
                      growthAdded: Math.max(0, projected - saved - contributed),
                      gapMonthly: gapMonthly, spend: spend, ss: ss, pension: pension } };
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
    who: "Buyer's agents",
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

    gates: [
      { id: "lender", label: "With a lender", term: "preapproval", weight: 40, dir: "up",
        kind: "steps", scale: [0, 3], stops: ["Not spoken", "Prequalified", "Pre-approved", "Underwritten"],
        value: function (v, r) { return num(v.approved); },
        frac:  function (v, r) { return num(v.approved) / 3; },
        show:  function (v, r) { return ["Not yet", "Prequalified", "Pre-approved", "Underwritten"][num(v.approved)] || "\u2014"; },
        note:  function (v, r) { return num(v.approved) >= 2 ? "Real approval" : "No real approval"; } },

      { id: "timing", label: "When they move", term: null, weight: 25, dir: "up",
        kind: "steps", scale: [0, 3], stops: ["Just looking", "6\u201312 months", "3\u20136 months", "Inside 3"],
        value: function (v, r) { return num(v.when); },
        frac:  function (v, r) { return num(v.when) / 3; },
        show:  function (v, r) { return ["Just looking", "6\u201312 months", "3\u20136 months", "Inside 3 months"][num(v.when)] || "\u2014"; },
        note:  function (v, r) { return num(v.when) >= 2 ? "Inside six months" : "No date pressure"; } },

      { id: "cash", label: "Cash against budget", term: "downpayment", weight: 20, dir: "up",
        table: T.buyerDown, floor: .1, scale: [0, 25],
        ticks: [[5, "5%"], [10, "10%"], [20, "20% \u00b7 no insurance"]],
        value: function (v, r) { return r.pctDown; },
        show:  function (v, r) { return pct(r.pctDown, 1); },
        note:  function (v, r) { return money(num(v.down)) + " of " + money(num(v.budget)); } },

      { id: "agreed", label: "Agreed with each other", term: null, weight: 15, dir: "up",
        kind: "steps", scale: [0, 1], stops: ["Not yet", "Agreed"],
        value: function (v, r) { return v.agreed === false ? 0 : 1; },
        frac:  function (v, r) { return v.agreed === false ? 0 : 1; },
        show:  function (v, r) { return v.agreed === false ? "No" : "Yes"; },
        note:  function (v, r) { return v.agreed === false ? "The quiet deal-killer" : "One answer, not two"; } }
    ],

    /* the -15 for selling without listing is a penalty, not a gate: it is
       shown on its own so the four weights still add to 100 */
    penalty: function (v, r) {
      return r.penalty ? { label: "Selling first, and not on the market", points: 15,
                           note: "Their timeline is their own listing's timeline." } : null;
    },

    levers: [
      { id: "approve", when: function (v, r) { return num(v.approved) < 3; },
        label: function (v, r) { return num(v.approved) < 2 ? "Get them properly pre-approved" : "Get it underwritten"; },
        head:  function (v, r) { return "Everything waits on the lender."; },
        why:   function (v, r) {
          return "This is the heaviest thing on the scorecard and the one entirely inside your "
               + "control this week. Introduce a lender before the next viewing."; },
        patch: function (v, r) { return { approved: 3 }; } },

      { id: "list", when: function (v, r) { return v.sellFirst === true && v.listed !== true; },
        label: function (v, r) { return "Get their own place listed"; },
        head:  function (v, r) { return "They are buying on someone else's timeline."; },
        why:   function (v, r) {
          return "Until their own place is on the market their date is a wish. Listing it is what "
               + "turns this from a browser into a buyer."; },
        patch: function (v, r) { return { listed: true }; } },

      { id: "agree", when: function (v, r) { return v.agreed === false; },
        label: function (v, r) { return "An hour on what each of them wants"; },
        head:  function (v, r) { return "They are not looking for the same house."; },
        why:   function (v, r) {
          return "The cheapest hour in the whole transaction, and the one nobody books."; },
        patch: function (v, r) { return { agreed: true }; } },

      { id: "cash20", when: function (v, r) { return r.pctDown < 20 && num(v.budget) > 0; },
        label: function (v, r) { return money(num(v.budget) * 0.2 - num(v.down)) + " more cash"; },
        head:  function (v, r) { return "The cash is the short leg."; },
        why:   function (v, r) { return "20% makes the offer stronger than most in their bracket."; },
        patch: function (v, r) { return { down: num(v.budget) * 0.2 }; } }
    ],

    guide: [
      { kind: "objection", said: "We just want to look at a few first.",
        text: function (c) {
          if (c.num(c.v.approved) >= 2) return "";
          const after = c.ifChanged({ approved: 3 });
          return "Looking is free until they find one. Without an approval this file scores <b>" +
            c.score + "</b>; with one it is <b>" + after.score + "</b>. The difference is whether " +
            "an offer gets taken seriously on the day it matters."; },
        say: "Let us look at anything you like. I just do not want you falling for something you cannot offer on by Friday.",
        ran: "Ran this form again with an underwritten approval" },

      { kind: "question", said: "How much of a deposit do we actually need?",
        text: function (c) {
          return "They have <b>" + c.pct(c.raw.pctDown, 1) + "</b> of a " +
            c.money(c.num(c.v.budget)) + " budget. 20% is where mortgage insurance stops \u2014 " +
            (c.raw.pctDown >= 20 ? "which they are already past."
              : "<b>" + c.money(c.num(c.v.budget) * 0.2 - c.num(c.v.down)) + "</b> more gets them there."); },
        say: "There is no minimum that matters as much as the one where the insurance stops.",
        ran: "Read off this form's own cash and budget" },

      { kind: "check", said: "",
        text: function (c) {
          if (!(c.v.sellFirst === true && c.v.listed !== true)) return "";
          const after = c.ifChanged({ listed: true });
          return "They have to sell first and their place is not listed. That is <b>15 points</b> " +
            "off the score on its own, and it is the single thing most likely to lose you the six " +
            "Saturdays. Listing it takes them to <b>" + after.score + "</b>."; },
        say: "",
        ran: "Ran this form again with their own place listed" }
    ],

    seed: { approved: 2, budget: 450000, down: 67500, when: 2,
            sellFirst: false, agreed: true },

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
        0.20 * steps(pctDown, T.buyerDown, .1) * 100 +
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
               raw: { pctDown: pctDown, approved: approved, when: when,
                      budget: budget, down: down,
                      penalty: (v.sellFirst === true && v.listed !== true) } };
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
    who: "Estate planners",
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
