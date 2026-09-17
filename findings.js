/* ============================================================
   WEALTHDEMO — the findings engine

   This is the part that is supposed to feel intelligent, so it
   is worth being plain about what it is: a table of rules run
   over the shared record. No model, no guessing. Every sentence
   it produces can be traced to arithmetic you can check.

   Three things make the difference between this and a list of
   warnings:

   1. It looks across tools. A single calculator cannot notice
      that the savings run out a month before the disability
      benefit starts, because neither number lives in the same
      page. Here they do.

   2. It scores and then it shuts up. Every rule returns a
      severity; the page shows three and reports the rest as
      "N other checks passed". A tool that lists fourteen
      concerns has told you nothing about which one matters.

   3. It separates fact from judgement. FACT findings are things
      that are true about the household — the client is entitled
      to see those. JUDGEMENT findings weigh products against
      each other and need someone to explain them, so they are
      held for the meeting. The split is a property of the rule,
      not a setting, so a client page cannot leak one by mistake.

   Conventions used below (all adjustable, all labelled where
   they surface): three months of essential bills as the minimum
   cash buffer, a DIME-shaped cover need, 25x spending as the
   retirement target, $25,000 a year for four years of public
   in-state education. These are planning conventions, not
   guarantees, and the copy never pretends otherwise.
   ============================================================ */
window.WD = window.WD || {};

(function () {
  "use strict";

  const CONV = {
    bufferMonths: 3,          /* minimum cash buffer, in months of essentials */
    thinBuffer: 1.5,          /* below this it is not a buffer at all */
    replaceToAge: 18,         /* replace income until the youngest is this old */
    minReplaceYears: 10,
    finalExpenses: 15000,
    collegePerYear: 25000,
    collegeYears: 4,
    retireMultiple: 25,       /* 25x spending, the 4% convention */
    diTarget: 0.6             /* disability benefit worth having, vs essentials */
  };

  function usd(n) {
    const a = Math.abs(Math.round(n));
    return (n < 0 ? "−$" : "$") + a.toLocaleString("en-US");
  }
  function mo(n) {
    if (!isFinite(n)) return "indefinitely";
    if (n < 1) return Math.round(n * 30) + " days";
    if (n < 24) {
      const r = Math.round(n * 10) / 10;
      return r + (r === 1 ? " month" : " months");
    }
    const y = Math.round(n / 12 * 10) / 10;
    return y + (y === 1 ? " year" : " years");
  }

  /* ============================================================
     the rules

     kind   — "fact" (the client may see it) | "judgement" (meeting only)
     needs  — facts that must be present, or the rule does not run
     test   — returns null to pass, or a finding to raise
     ============================================================ */
  const RULES = [

    /* ---------- cash ---------- */
    {
      id: "runway",
      topic: "Cash", kind: "fact",
      needs: ["savings", "essentials"],
      test: function (v) {
        const months = v.essentials > 0 ? v.savings / v.essentials : Infinity;
        if (months >= CONV.bufferMonths) return null;
        const target = v.essentials * CONV.bufferMonths;
        const short = target - v.savings;
        return {
          severity: months < CONV.thinBuffer ? 92 : 74,
          lead: "of essential bills is all your savings would cover",
          headline: mo(months),
          title: "Your savings would cover " + mo(months) + " of essential bills",
          detail: usd(v.savings) + " against " + usd(v.essentials) +
            " a month of essentials. Three months is the usual floor, which would be " +
            usd(target) + ".",
          fix: { label: "Top the cash buffer up to three months",
                 amount: short, kind: "oneOff" }
        };
      }
    },

    /* ---------- the contradiction the tools cannot see alone ---------- */
    {
      id: "elimGap",
      topic: "Income protection", kind: "fact",
      needs: ["savings", "essentials", "disability", "elimination"],
      test: function (v) {
        if (v.disability <= 0) return null;
        const months = v.essentials > 0 ? v.savings / v.essentials : Infinity;
        const waitMonths = v.elimination / 30;
        if (months >= waitMonths) return null;
        const gapMonths = waitMonths - months;
        return {
          severity: 96,
          lead: "with nothing coming in, before your cover starts",
          headline: mo(gapMonths) + " uncovered",
          title: "Your savings run out before your disability benefit starts",
          detail: "The policy waits " + v.elimination + " days before it pays. Your savings cover " +
            mo(months) + ". That leaves " + mo(gapMonths) +
            " with nothing coming in — the one stretch neither the savings nor the policy is covering.",
          why: "savings ÷ essential bills, against the elimination period",
          fix: { label: "Cover the waiting period in cash",
                 amount: Math.max(0, v.essentials * waitMonths - v.savings), kind: "oneOff" }
        };
      }
    },

    {
      id: "noDI",
      topic: "Income protection", kind: "fact",
      needs: ["income", "essentials"],
      test: function (v) {
        /* answering "yes, something would pay me" is not the same as having
           recorded an amount — saying "nothing" there would be a lie */
        if (v.disability > 0 || v.income <= 0 || v.hasDI === true) return null;
        const months = v.savings > 0 && v.essentials > 0 ? v.savings / v.essentials : 0;
        return {
          severity: months < CONV.bufferMonths ? 88 : 70,
          lead: "replaces your paycheck if you cannot work",
          headline: "Nothing",
          title: "Nothing replaces your paycheck if you cannot work",
          detail: "Your income of " + usd(v.income) + " a year is what pays for everything else on this page. " +
            "Without cover behind it, a long illness is met entirely by " +
            (v.savings > 0 ? usd(v.savings) + " of savings — " + mo(months) + " of essentials." : "savings you have not recorded."),
          fix: { label: "Put income protection in place", kind: "product" }
        };
      }
    },

    {
      id: "diUnknown",
      topic: "Income protection", kind: "fact", dive: "protection",
      needs: ["hasDI", "essentials"],
      test: function (v) {
        if (v.hasDI !== true || v.disability > 0) return null;
        return {
          severity: 58,
          lead: "to find out whether your cover is actually enough",
          headline: "Worth 60 seconds",
          title: "You have cover — we just don't know yet whether it is enough",
          detail: "Two questions about the policy, and this turns from a tick into a real answer: " +
            "what it pays a month, and how long it waits before it starts.",
          dive: "protection"
        };
      }
    },

    {
      id: "diThin",
      topic: "Income protection", kind: "fact",
      needs: ["disability", "essentials"],
      test: function (v) {
        if (v.disability <= 0 || v.disability >= v.essentials) return null;
        const short = v.essentials - v.disability;
        return {
          severity: 78,
          lead: "is what your cover leaves uncovered, every month it pays",
          headline: usd(short) + "/mo short",
          title: "Your disability benefit does not cover your essential bills",
          detail: usd(v.disability) + " a month against " + usd(v.essentials) +
            " of essentials — " + usd(short) + " short every month it pays, before anything discretionary.",
          fix: { label: "Close the monthly shortfall", amount: short, kind: "monthly" }
        };
      }
    },

    /* ---------- cover ---------- */
    {
      id: "coverGap",
      topic: "Life cover", kind: "fact",
      needs: ["income", "dependents"],
      test: function (v) {
        if (v.dependents <= 0) return null;
        const years = Math.max(CONV.minReplaceYears,
          v.youngest !== undefined ? CONV.replaceToAge - v.youngest : CONV.minReplaceYears);
        const education = (v.collegeKids || 0) * CONV.collegePerYear * CONV.collegeYears -
          (v.collegeSaved || 0);
        const need = (v.otherDebt || 0) + (v.mortgageBal || 0) +
          v.income * years + Math.max(0, education) + CONV.finalExpenses;
        const have = v.lifeCover || 0;
        const gap = need - have;
        if (gap <= 0) return null;
        return {
          severity: have <= 0 ? 90 : Math.min(86, 50 + Math.round(gap / need * 40)),
          lead: "short of what your own numbers ask for",
          headline: usd(gap),
          title: "You are " + usd(gap) + " short of what your own numbers ask for",
          detail: "Clearing what is owed, replacing " + usd(v.income) + " a year for " + years +
            " years while the children are still at home" +
            (education > 0 ? ", funding education" : "") + " and covering final costs comes to " +
            usd(need) + ". You have " + usd(have) + " in force.",
          why: "debts + income replacement + education + final expenses, less cover in force",
          fix: { label: "Close the cover gap", amount: gap, kind: "face" }
        };
      }
    },

    {
      id: "workCoverOnly",
      topic: "Life cover", kind: "fact",
      needs: ["employerCov", "dependents"],
      test: function (v) {
        if (!v.employerCov || v.dependents <= 0) return null;
        return {
          severity: 64,
          lead: "\u2014 your cover ends when the job does",
          headline: "Tied to the job",
          title: "Your cover is through work, so it ends when the job does",
          detail: "Group cover is not portable and is rarely enough on its own. It also disappears at " +
            "exactly the moment people tend to need it — a redundancy, a career change, a health event " +
            "that ends the role.",
          fix: { label: "Hold cover you own outright", kind: "product" }
        };
      }
    },

    /* ---------- the mortgage ---------- */
    {
      id: "pmtShort",
      topic: "The mortgage", kind: "fact",
      needs: ["mortgageBal", "mortgageRate", "mortgagePmt"],
      test: function (v) {
        const monthlyInterest = v.mortgageBal * (v.mortgageRate / 100) / 12;
        if (v.mortgagePmt >= monthlyInterest) return null;
        return {
          severity: 98,
          lead: "\u2014 the payment does not cover its own interest",
          headline: "Balance rising",
          title: "Your mortgage payment does not cover its own interest",
          detail: usd(v.mortgagePmt) + " a month against " + usd(monthlyInterest) +
            " of interest. The balance grows every month. This one comes before every other question here.",
          fix: { label: "Raise the payment above the interest",
                 amount: monthlyInterest - v.mortgagePmt, kind: "monthly" }
        };
      }
    },

    {
      id: "housingHeavy",
      topic: "The mortgage", kind: "fact",
      needs: ["income"],
      test: function (v) {
        const housing = (v.mortgagePmt || 0) + (v.rent || 0);
        if (housing <= 0) return null;
        const share = housing * 12 / v.income;
        if (share < 0.35) return null;
        return {
          severity: share > 0.45 ? 72 : 56,
          lead: "of your income goes on keeping a roof over it",
          headline: Math.round(share * 100) + "% of income",
          title: "Housing is taking " + Math.round(share * 100) + "% of your income",
          detail: usd(housing) + " a month against " + usd(v.income) +
            " a year. Above about a third, most other plans have to wait in line behind the roof.",
          why: "housing payment × 12 ÷ gross income"
        };
      }
    },

    /* ---------- the long view ---------- */
    {
      id: "retireShort",
      topic: "Retirement", kind: "fact",
      needs: ["age", "retireAge", "spending", "retirement"],
      test: function (v) {
        const years = v.retireAge - v.age;
        if (years <= 0 || v.spending <= 0) return null;
        const target = v.spending * 12 * CONV.retireMultiple;
        /* what today's pot becomes on its own, at a plain 5% real */
        const grown = v.retirement * Math.pow(1.05, years);
        if (grown >= target) return null;
        const gap = target - grown;
        /* a proper monthly sinking fund, not an annual factor divided by twelve */
        const im = 0.05 / 12, nm = years * 12;
        const perMonth = gap * im / (Math.pow(1 + im, nm) - 1);
        return {
          severity: Math.min(80, 40 + Math.round(gap / target * 40)),
          lead: "between today\u2019s pot and the retirement you described",
          headline: usd(gap) + " short",
          title: "Retiring at " + v.retireAge + " needs about " + usd(target) + " on these numbers",
          detail: "Spending " + usd(v.spending) + " a month for good would take roughly " + usd(target) +
            " on the usual 25× convention. " + usd(v.retirement) + " today, left alone for " + years +
            " years, gets to about " + usd(grown) + ".",
          why: "25 × annual spending, against today's pot grown at 5% a year",
          fix: { label: "Add to retirement each month", amount: perMonth, kind: "monthly" }
        };
      }
    },

    {
      id: "collegeShort",
      topic: "Education", kind: "fact",
      needs: ["collegeKids", "youngest"],
      test: function (v) {
        if (v.collegeKids <= 0) return null;
        const cost = v.collegeKids * CONV.collegePerYear * CONV.collegeYears;
        const saved = v.collegeSaved || 0;
        const gap = cost - saved;
        if (gap <= 0) return null;
        const years = Math.max(1, 18 - v.youngest);
        return {
          severity: 48,
          lead: "to find before the first tuition bill",
          headline: usd(gap),
          title: usd(gap) + " to find before the first tuition bill",
          detail: v.collegeKids + (v.collegeKids === 1 ? " child" : " children") + " at " +
            usd(CONV.collegePerYear) + " a year for " + CONV.collegeYears +
            " years is " + usd(cost) + ". You have " + usd(saved) + " set aside and about " +
            years + " years before the youngest starts.",
          why: "a public in-state figure — worth replacing with the real target school",
          fix: { label: "Set aside each month", amount: gap / (years * 12), kind: "monthly" }
        };
      }
    },

    /* ---------- cash flow ---------- */
    {
      id: "noRoom",
      topic: "Cash", kind: "fact",
      needs: ["income", "spending"],
      test: function (v) {
        if (v.income <= 0 || v.spending <= 0) return null;
        const net = v.income * 0.75 / 12;   /* a rough after-tax monthly */
        const out = v.spending + (v.otherDebtPmt || 0);
        if (out < net * 0.9) return null;
        return {
          severity: out >= net ? 84 : 58,
          lead: "between what comes in and what goes out",
          headline: out >= net ? "Nothing spare" : "Very little spare",
          title: out >= net
            ? "Your spending is at or above what is coming in"
            : "There is almost no room between income and spending",
          detail: "Roughly " + usd(net) + " a month after tax against " + usd(out) +
            " going out. Every plan on this page needs somewhere to come from, and right now there is " +
            (out >= net ? "nowhere" : "very little room") + ".",
          why: "gross income × 0.75 ÷ 12, against spending plus debt payments"
        };
      }
    },

    {
      id: "oneIncome",
      topic: "Income protection", kind: "fact",
      /* partnerInc has to be present, not assumed zero — otherwise a household
         we simply never asked about reads as 100% dependent on one earner */
      needs: ["income", "partner", "dependents", "partnerInc"],
      test: function (v) {
        if (!v.partner || v.dependents <= 0) return null;
        const total = v.income + v.partnerInc;
        if (total <= 0) return null;
        const share = v.income / total;
        if (share < 0.7) return null;
        return {
          severity: 60,
          lead: "of the household rests on one person staying well",
          headline: Math.round(share * 100) + "% from one job",
          title: Math.round(share * 100) + "% of the household income comes from one person",
          detail: "A household with two earners has a spare tyre. One that leans this hard on a single " +
            "income has the whole plan resting on one person staying well and staying employed.",
          why: "your income ÷ household income"
        };
      }
    },

    /* ---------- judgement: held for the meeting ---------- */
    {
      id: "loanLeaning",
      topic: "Policy loans", kind: "judgement",
      needs: ["cashValue", "mortgageBal"],
      test: function (v) {
        if (v.cashValue <= 0 || v.mortgageBal <= 0) return null;
        return {
          severity: 55,
          lead: "\u2014 the policy-loan story needs a fair test",
          headline: "Worth testing",
          title: "There is cash value and a mortgage — the loan strategy is worth running properly",
          detail: usd(v.cashValue) + " of cash value against " + usd(v.mortgageBal) +
            " owed. The usual illustration will show a very large saving. Run the fair test before " +
            "presenting it: most of that figure is the repayment, not the loan.",
          tool: "mortgage.html"
        };
      }
    },

    {
      id: "savingWhileOwing",
      topic: "Debt", kind: "judgement",
      needs: ["otherDebt", "savings"],
      test: function (v) {
        if (v.otherDebt <= 0 || v.savings <= 0) return null;
        const buffer = (v.essentials || 0) * CONV.bufferMonths;
        if (v.savings <= buffer * 1.2) return null;
        return {
          severity: 50,
          lead: "\u2014 cash sitting still while debt charges interest",
          headline: "Both at once",
          title: "Cash is sitting still while " + usd(v.otherDebt) + " of debt is charging interest",
          detail: "Past the emergency buffer, money held in cash is almost certainly earning less than " +
            "the debt is costing. Worth putting the two rates side by side before deciding.",
          tool: "withdraw.html"
        };
      }
    }
  ];

  /* ============================================================
     running them
     ============================================================ */
  function run(facts) {
    const v = facts || (window.WD.client ? window.WD.client.all() : {});
    const raised = [], passed = [], skipped = [];

    RULES.forEach(function (rule) {
      const missing = rule.needs.filter(function (k) {
        const x = v[k];
        return x === undefined || x === null || x === "";
      });
      if (missing.length) { skipped.push({ id: rule.id, missing: missing }); return; }

      let out = null;
      try { out = rule.test(v); } catch (e) { out = null; }

      if (!out) { passed.push({ id: rule.id, topic: rule.topic }); return; }
      out.id = rule.id;
      out.topic = rule.topic;
      out.kind = rule.kind;
      if (rule.tool && !out.tool) out.tool = rule.tool;
      if (rule.dive && !out.dive) out.dive = rule.dive;
      raised.push(out);
    });

    raised.sort(function (a, b) { return b.severity - a.severity; });
    return { raised: raised, passed: passed, skipped: skipped, facts: v };
  }

  /* what the client is allowed to see: facts about them, not
     judgements about products */
  function forClient(res) {
    const r = res.raised.filter(function (f) { return f.kind === "fact"; });
    const held = res.raised.length - r.length;
    return { raised: r, held: held, passed: res.passed, skipped: res.skipped };
  }

  /* three, and a count of the rest — the hard part is the silence */
  function top(list, n) {
    return list.slice(0, n === undefined ? 3 : n);
  }

  /* ============================================================
     the lever

     Of everything they could do, which single move removes the
     most risk? Only findings with a costed fix can compete, so
     "buy some cover" never outranks a number we can actually
     put a price on.
     ============================================================ */
  function lever(res) {
    const costed = res.raised.filter(function (f) {
      return f.fix && typeof f.fix.amount === "number" && isFinite(f.fix.amount) && f.fix.amount > 0 &&
             (f.fix.kind === "oneOff" || f.fix.kind === "monthly");
    });
    if (!costed.length) return null;

    /* severity per thousand dollars, with a monthly commitment weighted as
       a year of it — a standing cost is not the same as a one-off */
    costed.forEach(function (f) {
      const annual = f.fix.kind === "monthly" ? f.fix.amount * 12 : f.fix.amount;
      f._weight = f.severity / Math.max(1, annual / 1000);
    });
    costed.sort(function (a, b) { return b._weight - a._weight; });

    const best = costed[0];
    return {
      finding: best,
      label: best.fix.label,
      amount: best.fix.amount,
      kind: best.fix.kind,
      say: best.fix.kind === "monthly"
        ? usd(best.fix.amount) + " a month"
        : usd(best.fix.amount) + " once",
      because: best.title
    };
  }

  /* ============================================================
     what to ask for, derived from what raised
     ============================================================ */
  const DOCS = {
    runway:      "Recent statements for the accounts holding the emergency fund",
    elimGap:     "The disability policy schedule — benefit, elimination period, own-occupation wording",
    noDI:        "Any group disability cover through work, and its definition of disability",
    diUnknown:   "The disability policy schedule — benefit amount and elimination period",
    diThin:      "The disability policy schedule and any offset clauses",
    coverGap:    "Every life policy in force, with face amounts and beneficiaries",
    workCoverOnly: "The group cover certificate and whether it is convertible",
    pmtShort:    "The current mortgage statement",
    housingHeavy:"The mortgage statement, plus taxes and insurance if escrowed",
    retireShort: "Latest retirement account statements and the contribution rate",
    collegeShort:"Any 529 or education account statements",
    loanLeaning: "An in-force illustration showing the loan at the guaranteed rate",
    savingWhileOwing: "Balances and rates on every non-mortgage debt"
  };

  function documents(res) {
    const seen = {}, out = [];
    res.raised.forEach(function (f) {
      const d = DOCS[f.id];
      if (d && !seen[d]) { seen[d] = 1; out.push(d); }
    });
    return out;
  }

  window.WD.findings = {
    CONV: CONV, RULES: RULES,
    run: run, forClient: forClient, top: top, lever: lever, documents: documents,
    usd: usd, months: mo
  };
})();
