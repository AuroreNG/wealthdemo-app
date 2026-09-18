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
        /* "exposed" says this and more, so do not say it twice */
        if (v.income > 0 && v.hasDI !== true && !(v.disability > 0)) return null;
        const months = v.essentials > 0 ? v.savings / v.essentials : Infinity;
        if (months >= CONV.bufferMonths) return null;
        const target = v.essentials * CONV.bufferMonths;
        const short = target - v.savings;
        return {
          severity: months < CONV.thinBuffer ? 92 : 74,
          means: "One boiler, one car repair, or one late paycheck and you are borrowing to eat.",
          lead: "of essential bills is all your savings would cover",
          headline: mo(months),
          title: "Your savings would cover " + mo(months) + " of essential bills",
          detail: usd(v.savings) + " against " + usd(v.essentials) +
            " a month of essentials. Three months is the usual floor, which would be " +
            usd(target) + ".",
          scale: { at: months, max: 6, unit: "months of bills",
                   marks: [{ at: 1, label: "1 month" },
                           { at: 3, label: "the usual floor" },
                           { at: 6, label: "comfortable" }] },
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
          means: "Rent, food and the car still have to be paid during that stretch, out of nothing.",
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
          means: "Everything else on this page is paid for by you turning up to work. There is no spare.",
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
      /* the starkest case in the whole table, and it had no rule of its own:
         no cover at all, and not enough cash to bridge the gap on your own */
      id: "exposed",
      topic: "Income protection", topics: ["Income protection", "Cash"], kind: "fact",
      needs: ["income", "essentials", "savings"],
      test: function (v) {
        if (v.hasDI === true || v.disability > 0) return null;
        if (v.income <= 0 || v.essentials <= 0) return null;
        const months = v.savings / v.essentials;
        if (months >= CONV.bufferMonths) return null;
        return {
          severity: 99,
          means: "After that, the bills keep arriving and nothing is arriving to meet them.",
          lead: "is how long you could go without a paycheck",
          headline: mo(months),
          title: mo(months) + " is how long you could go without a paycheck",
          detail: usd(v.savings) + " of savings against " + usd(v.essentials) +
            " a month of essentials, and nothing that would pay you if you could not work. " +
            "Most income protection waits 90 days before it pays anything — you would need " +
            mo(3) + " of cash just to reach the point where a policy would start.",
          why: "savings ÷ essential bills, with no cover recorded behind it",
          scale: { at: months, max: 6, unit: "months of bills",
                   marks: [{ at: 1, label: "1 month" },
                           { at: 3, label: "a 90-day wait" },
                           { at: 6, label: "comfortable" }] },
          fix: { label: "Build the buffer to three months",
                 amount: v.essentials * CONV.bufferMonths - v.savings, kind: "oneOff" }
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
          means: "A policy you have not read is a policy you are guessing about.",
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
          means: "Cover that pays less than the bills still leaves you drawing down savings every month.",
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
          means: "If the worst happened, the people who depend on you would have to change how they live.",
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
          means: "Change jobs, lose the job, or get ill enough to leave it, and the cover leaves with it.",
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
          means: "You are paying every month and owing more than you did last month.",
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
          means: "Saving, investing and cover all have to come out of what the roof leaves behind.",
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
        /* what today's savings become on their own, at a plain 5% real */
        const grown = v.retirement * Math.pow(1.05, years);
        if (grown >= target) return null;
        const gap = target - grown;
        /* a proper monthly sinking fund, not an annual factor divided by twelve */
        const im = 0.05 / 12, nm = years * 12;
        const perMonth = gap * im / (Math.pow(1 + im, nm) - 1);
        return {
          severity: Math.min(80, 40 + Math.round(gap / target * 40)),
          means: "On today\u2019s pace the choice is working longer, spending less, or saving more.",
          lead: "between today\u2019s savings and the retirement you described",
          headline: usd(gap) + " short",
          title: "Retiring at " + v.retireAge + " needs about " + usd(target) + " on these numbers",
          detail: "Spending " + usd(v.spending) + " a month for good would take roughly " + usd(target) +
            " on the usual 25× convention. " + usd(v.retirement) + " today, left alone for " + years +
            " years, gets to about " + usd(grown) + ".",
          why: "25 × annual spending, against today's savings grown at 5% a year",
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
          means: "The bill arrives on a fixed date whether the money is there or not.",
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
          means: "There is nothing to redirect. Every fix on this page has to come from somewhere.",
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
          means: "One illness, one redundancy, and the household income roughly halves overnight.",
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
          means: "Worth an hour with the real figures before anyone signs anything.",
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
          means: "Every month both sit still, the debt wins by the difference between the two rates.",
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
      if (rule.topics) out.topics = rule.topics;
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
    const v = res.facts || {};
    /* "$6,670 once" to someone holding $740 is a wall, not a next step.
       Where the lump is far beyond reach, offer the monthly path as well. */
    let over = null;
    if (best.fix.kind === "oneOff") {
      const net = (v.income || 0) * 0.75 / 12;
      const spare = net - (v.spending || 0) - (v.otherDebtPmt || 0);
      if (spare > 25 && best.fix.amount > spare * 3) {
        const per = Math.max(25, Math.round(spare * 0.5 / 5) * 5);
        over = { per: per, months: Math.ceil(best.fix.amount / per) };
      }
    }
    return {
      finding: best,
      label: best.fix.label,
      amount: best.fix.amount,
      kind: best.fix.kind,
      say: best.fix.kind === "monthly"
        ? usd(best.fix.amount) + " a month"
        : usd(best.fix.amount) + " once",
      over: over,
      overSay: over ? usd(over.per) + " a month for " + mo(over.months) : null,
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
    exposed:     "Any sick-pay entitlement from the employer, in writing",
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
