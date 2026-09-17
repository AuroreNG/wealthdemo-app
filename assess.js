/* ============================================================
   WEALTHDEMO — the client assessment

   One question per screen, and as few of them as the answers
   allow. No dependents means the cover branch never opens. A
   renter is never asked about a mortgage rate. The whole
   experience of "this is smart" comes from what it declines to
   ask, so `when` is the most important field in the table below.

   Everything is kept in the browser. The invite arrives in the
   URL fragment, which never reaches a server, and the answers
   go back the same way. Nothing here is stored anywhere but the
   client's own machine until they choose to send it.

   The hesitation log — time on each question, how many times an
   answer was changed, what was skipped — rides back with the
   answers. It is not a dark pattern; it is the difference
   between "they said $8,200" and "they said $8,200 and changed
   it four times", which is exactly what an adviser wants to
   know before the meeting.
   ============================================================ */
window.WD = window.WD || {};

(function () {
  "use strict";

  /* ============================================================
     the questions

     when(v) — the adaptive rule. Missing means always ask.
     deep    — belongs to an optional deep dive, not the core run.
     ============================================================ */
  const QUESTIONS = [
    /* ---------- core: about ten, under three minutes ---------- */
    { id: "age", fact: "age", kind: "number", min: 16, max: 100,
      ask: "How old are you?",
      react: function (v, n) {
        const y = 65 - n;
        return y > 0 ? { big: y + (y === 1 ? " year" : " years"), line: "until you're 65" }
                     : { big: "Already there", line: "so let's make it last" };
      } }, 

    { id: "household", fact: "partner", kind: "choice",
      ask: "Who depends on your income?",
      options: [
        { v: "solo",    label: "Just me",        icon: "one",    set: { partner: false, dependents: 0 } },
        { v: "couple",  label: "Me and a partner", icon: "two",  set: { partner: true } },
        { v: "family",  label: "A partner and kids", icon: "family", set: { partner: true } },
        { v: "single1", label: "Kids, on my own",  icon: "solo", set: { partner: false } }
      ] },

    { id: "dependents", fact: "dependents", kind: "number", min: 1, max: 10,
      when: function (v, a) { return a.household === "family" || a.household === "single1"; },
      ask: "How many children?" },

    { id: "youngest", fact: "youngest", kind: "number", min: 0, max: 30,
      when: function (v, a) { return a.household === "family" || a.household === "single1"; },
      ask: "How old is the youngest?",
      react: function (v, n) {
        const y = Math.max(0, 18 - n);
        return { big: y + (y === 1 ? " year" : " years"), line: "until they're grown" };
      } },

    { id: "income", fact: "income", kind: "money", per: "a year",
      ask: "What do you earn before tax?",
      hint: "Roughly is fine.",
      react: function (v, n) {
        return { big: "$" + Math.round(n / 12).toLocaleString("en-US"), line: "a month before tax" };
      } },

    { id: "partnerInc", fact: "partnerInc", kind: "money", per: "a year", deep: "household",
      when: function (v, a) { return a.household === "couple" || a.household === "family"; },
      ask: "And your partner earns?", allowZero: true,
      react: function (v, n) {
        const tot = (v.income || 0) + n;
        if (!tot) return null;
        return { big: Math.round((v.income || 0) / tot * 100) + "%", line: "of the household income is yours" };
      } },

    { id: "spending", fact: "spending", kind: "money", per: "a month",
      ask: "What goes out in a month?",
      hint: "Bills, food, cars — everything. A rough number is fine.",
      react: function (v, n) {
        const net = (v.income || 0) * 0.75 / 12;
        if (!net) return null;
        const left = net - n;
        return left >= 0
          ? { big: "$" + Math.round(left).toLocaleString("en-US"), line: "spare each month",
              meter: Math.min(1, left / net), tone: left > net * 0.15 ? "good" : "warn" }
          : { big: "$" + Math.round(-left).toLocaleString("en-US"), line: "more than comes in",
              meter: 1, tone: "bad" };
      } },

    { id: "savings", fact: "savings", kind: "money",
      ask: "How much could you get your hands on this week?",
      hint: "Cash you could reach without selling anything.", allowZero: true,
      react: function (v, n) {
        const e = v.essentials || (v.spending ? v.spending * 0.65 : 0);
        if (!e) return null;
        const m = n / e;
        return { big: (Math.round(m * 10) / 10) + (Math.round(m * 10) / 10 === 1 ? " month" : " months"),
                 line: "of essential bills covered", meter: Math.min(1, m / 6),
                 tone: m >= 3 ? "good" : (m >= 1.5 ? "warn" : "bad") };
      } },

    { id: "housing", fact: "housing", kind: "choice",
      ask: "Your home?",
      options: [
        { v: "own",  label: "Own, with a mortgage", icon: "house" },
        { v: "owno", label: "Own it outright",      icon: "key" },
        { v: "rent", label: "Renting",              icon: "keys" }
      ] },

    { id: "mortgageBal", fact: "mortgageBal", kind: "money",
      when: function (v, a) { return a.housing === "own"; },
      ask: "What's still owed on it?",
      hint: "The balance, not the value." },

    { id: "rent", fact: "rent", kind: "money", per: "a month",
      when: function (v, a) { return a.housing === "rent"; },
      ask: "What's the rent?",
      react: function (v, n) {
        if (!v.income) return null;
        const pct = n * 12 / v.income;
        return { big: Math.round(pct * 100) + "%", line: "of what you earn", meter: Math.min(1, pct / .5),
                 tone: pct < .3 ? "good" : (pct < .4 ? "warn" : "bad") };
      } },

    { id: "lifeCover", fact: "lifeCover", kind: "money",
      when: function (v) { return (v.dependents || 0) > 0 || v.partner; },
      ask: "How much life cover is in force?",
      hint: "Everything added together, including through work.",
      allowZero: true, zeroLabel: "None at all",
      react: function (v, n) {
        if (!v.income || !n) return null;
        const y = n / v.income;
        return { big: (Math.round(y * 10) / 10) + (Math.round(y * 10) / 10 === 1 ? " year" : " years"),
                 line: "of your income, for them", meter: Math.min(1, y / 12),
                 tone: y >= 10 ? "good" : (y >= 5 ? "warn" : "bad") };
      } },

    { id: "employerCov", fact: "employerCov", kind: "bool", deep: "cover",
      when: function (v) { return (v.lifeCover || 0) > 0; },
      ask: "Is any of it through work?",
      hint: "Group cover ends when the job does." },

    { id: "hasDI", fact: "hasDI", kind: "bool",
      ask: "If you couldn't work for six months, would anything pay you?",
      hint: "Income protection, disability cover, long-term sick pay." },

    { id: "disability", fact: "disability", kind: "money", per: "a month", deep: "protection",
      when: function (v, a) { return a.hasDI === true; },
      ask: "How much would it pay a month?",
      react: function (v, n) {
        if (!v.essentials || !n) return null;
        const pct = Math.min(1, n / v.essentials);
        return { big: Math.round(pct * 100) + "%", line: "of your essential bills", meter: pct,
                 tone: pct >= 1 ? "good" : (pct >= .7 ? "warn" : "bad") };
      } },

    { id: "goal", fact: "goal", kind: "text",
      ask: "Last one. What do you most want out of the meeting?",
      hint: "Your adviser reads this first.",
      placeholder: "e.g. can we still retire at 60?" },

    /* ---------- deep dives: only if they choose to go further ---------- */
    { id: "mortgageRate", fact: "mortgageRate", kind: "rate", deep: "mortgage",
      when: function (v, a) { return a.housing === "own"; },
      ask: "What rate is it on?" },
    { id: "mortgageTerm", fact: "mortgageTerm", kind: "number", min: 1, max: 40, deep: "mortgage",
      when: function (v, a) { return a.housing === "own"; },
      ask: "Years left on it?" },
    { id: "mortgagePmt", fact: "mortgagePmt", kind: "money", per: "a month", deep: "mortgage",
      when: function (v, a) { return a.housing === "own"; },
      ask: "And the monthly payment?",
      hint: "Principal and interest only." },

    { id: "elimination", fact: "elimination", kind: "choice", deep: "protection",
      when: function (v, a) { return a.hasDI === true; },
      ask: "How long before it starts paying?",
      hint: "Most policies wait 90 days.",
      options: [
        { v: 30,  label: "30 days" },
        { v: 60,  label: "60 days" },
        { v: 90,  label: "90 days" },
        { v: 180, label: "180 days" },
        { v: 90,  label: "I'm not sure", unsure: true }
      ] },

    { id: "retirement", fact: "retirement", kind: "money", deep: "retirement",
      ask: "How much is in retirement accounts?",
      hint: "401(k), IRA, anything for later.", allowZero: true },
    { id: "retireAge", fact: "retireAge", kind: "number", min: 45, max: 85, deep: "retirement",
      ask: "What age would you like to stop?",
      react: function (v, n) {
        const y = n - (v.age || 0);
        return y > 0 ? { big: y + (y === 1 ? " year" : " years"), line: "to build it" } : null;
      } },

    { id: "collegeSaved", fact: "collegeSaved", kind: "money", deep: "education",
      when: function (v) { return (v.dependents || 0) > 0; },
      ask: "Anything set aside for school?",
      hint: "529 plans, or savings earmarked for it.", allowZero: true, zeroLabel: "Nothing yet" },

    { id: "otherDebt", fact: "otherDebt", kind: "money", deep: "debt",
      ask: "What do you owe outside the mortgage?",
      hint: "Cards, car loans, student loans.", allowZero: true, zeroLabel: "Nothing" },
    { id: "otherDebtPmt", fact: "otherDebtPmt", kind: "money", per: "a month", deep: "debt",
      when: function (v) { return (v.otherDebt || 0) > 0; },
      ask: "And what goes out on those a month?" }
  ];

  /* the deep dives, offered by name once the core run is done */
  const DIVES = [
    { id: "protection", label: "If you couldn't work", note: "60 seconds", icon: "shield",
      why: function (v, a) { return a.hasDI === true; } },
    { id: "mortgage",   label: "The mortgage",   note: "60 seconds", icon: "house",
      why: function (v) { return (v.mortgageBal || 0) > 0; } },
    { id: "retirement", label: "Retirement",     note: "30 seconds", icon: "sun",
      why: function () { return true; } },
    { id: "cover",      label: "Your life cover", note: "15 seconds", icon: "umbrella",
      why: function (v) { return (v.lifeCover || 0) > 0; } },
    { id: "household",  label: "Household income", note: "15 seconds", icon: "two",
      why: function (v, a) { return a.household === "couple" || a.household === "family"; } },
    { id: "education",  label: "School and college", note: "15 seconds", icon: "cap",
      why: function (v) { return (v.dependents || 0) > 0; } },
    { id: "debt",       label: "Other debt",     note: "30 seconds", icon: "card",
      why: function () { return true; } }
  ];

  /* ============================================================
     which questions apply right now
     ============================================================ */
  function applies(q, v, a) {
    if (!q.when) return true;
    try { return !!q.when(v, a); } catch (e) { return false; }
  }

  function core(v, a) {
    return QUESTIONS.filter(function (q) { return !q.deep && applies(q, v, a); });
  }

  function dive(id, v, a) {
    return QUESTIONS.filter(function (q) { return q.deep === id && applies(q, v, a); });
  }

  function divesFor(v, a) {
    return DIVES.filter(function (d) {
      try { return !!d.why(v, a); } catch (e) { return false; }
    });
  }

  /* how far through, given the branching can change the total */
  function progress(v, a, id) {
    const list = core(v, a);
    const i = list.findIndex(function (q) { return q.id === id; });
    return { at: i + 1, of: list.length };
  }

  window.WD.assess = {
    QUESTIONS: QUESTIONS, DIVES: DIVES,
    applies: applies, core: core, dive: dive, divesFor: divesFor, progress: progress,
    byId: function (id) {
      for (let i = 0; i < QUESTIONS.length; i++) if (QUESTIONS[i].id === id) return QUESTIONS[i];
      return null;
    }
  };
})();
