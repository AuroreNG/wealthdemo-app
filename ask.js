/* ============================================================
   WEALTHDEMO — ask it something

   A typed question, answered from this page. No server, no
   model, no guessing: every answer is either a definition the
   site already carries, or a number worked out by driving the
   calculator in front of you.

   What it can do, in the order it tries:

     1. define a term            "what does tax drag mean"
     2. answer a what-if         "what if the rate was 4%"
                                 "what if I put in $600 a month"
                                 "what if returns are worse"
     3. solve for a number       "how much a month to reach 500k"
     4. explain what is on screen  "where does the 10 years come from"
     5. hand back a finding      "what should I worry about"
     6. answer a known question  the ones already in the guide
     7. say plainly that it cannot, and offer three it can

   It never invents a figure. If it cannot work something out it
   says so, because a confident wrong answer about money is worse
   than no answer.
   ============================================================ */
(function () {
  "use strict";

  const M = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const usd = function (n) { return M.format(Math.round(n)); };
  const SLUG = (location.pathname.split("/").pop() || "index.html").replace(/\.html?$/, "");

  /* the one number each tool is really answering */
  const HEAD = {
    rule72: "ansHeadline", waiting: "ansHeadline", loss: "ansHeadline", dime: "ansHeadline",
    legacy: "ansHeadline", withdraw: "ansHeadline", accounts: "ansHeadline",
    tool: "outTax", paycheck: "bnBig", rentbuy: ["bnBig", { id: "posA", lab: "renting" }, { id: "posB", lab: "buying" }], mortgage: "bnBig", debt: "bnBig",
    taxes: "bnBig", taximpact: "bnBig", penalty: "bnBig", states: "bnBig", college: "bnBig",
    future: "bnBig", plan529: "bnBig", family: "bnBig"
  };
  const HEADWORD = {
    debt: "the payoff date", rentbuy: "the verdict", taxes: "the spread between the three",
    plan529: "the balance at the end", family: "the accumulated value", college: "the family shortfall",
    penalty: "what reaches you", states: "the yearly difference", paycheck: "how long the benefit lasts",
    future: "the range at 18", tool: "the tax on the benefit", mortgage: "the headline figure",
    taximpact: "the biggest bucket"
  };

  /* things people ask about that are not inputs — the phrase that confuses,
     and the sentence that unconfuses it */
  const ONSCREEN = {
    withdraw: [
      { k: ["level return", "steady", "straight line", "blue line", "what is the solid", "green line"],
        t: "What \u201clevel return\u201d means",
        b: "The solid line marked \u201clevel return\u201d earns exactly the same percentage every single year \u2014 no good years, no bad ones. No real account behaves that way. It is the control: the line the second one is measured against." },
      { k: ["poor returns early", "poor return", "first decade", "red line", "bad years", "order of returns", "sequence",
            "two lines", "both lines", "same average", "why are there two", "difference between the lines", "lines differ", "why do the lines", "two solid"],
        t: "Why two lines with the same average end differently",
        b: "This is sequence-of-returns risk, and it is the point of the chart. Both solid lines average the same return over the whole retirement and draw the same income. The second one just gets its bad years first \u2014 and because you are also withdrawing, those losses come out of a balance that never gets the chance to recover. Same average, years apart." },
      { k: ["safe withdrawal", "safe rate", "dashed", "4%", "four percent", "yardstick"],
        t: "What the dashed line is",
        b: "The safe withdrawal rate \u2014 the industry\u2019s long-standing yardstick of drawing about 4% of the balance in year one and raising it with inflation. It is not a rival plan, it is a ruler: if your line sits above it you are drawing less than the rule of thumb allows, and below it you are drawing more." },
      { k: ["sustainable income", "what it supports", "what does it support"],
        t: "\u201cSustainable income\u201d",
        b: "The monthly figure your balance could support all the way to the end age without running dry, on the growth rate you set. Compare it with your target income: the gap between the two is the whole conversation." }
    ],
    legacy: [
      { k: ["net to heirs", "reaches them", "what they get", "after tax"],
        t: "\u201cNet to heirs\u201d",
        b: "What actually arrives, after debts are cleared, income tax is paid on anything never taxed \u2014 mostly the 401(k) or IRA \u2014 and the cost of settling the estate comes out. The statements add up to the bigger number at the top; this is the one the family sees." }
    ],
    dime: [
      { k: ["coverage gap", "the gap", "why only the gap"],
        t: "\u201cCoverage gap\u201d",
        b: "The total need, less the cover already in force and the savings the family could reach. Only the gap has to be solved \u2014 the existing policies are already doing the rest of the job." }
    ],
    mortgage: [
      { k: ["extra principal", "paid straight on", "control", "fair test", "current schedule"],
        t: "The three lines",
        b: "\u201cCurrent schedule\u201d is the mortgage left exactly as it is. \u201cExtra principal payments\u201d is the same extra money put straight onto the loan instead \u2014 that is the fair comparison, because it costs you the same each month. The third is the policy-loan route." }
    ],
    rentbuy: [
      { k: ["10 year", "ten year", "hold for", "how many years", "why 10", "why ten", "30 year", "thirty"],
        t: "The two year counts on this page",
        b: "“Hold for” is how long you plan to stay — that is the window every figure below the chart is measured at, and the chart stops there. Separately, the break-even search looks across 30 years to find whether buying ever pulls ahead at all, which is why 30 can appear in the sentence above the chart even when your window is shorter. Move the slider and both follow." },
      { k: ["rent & invest", "rent and invest", "what is the blue", "blue line", "renter"],
        t: "What the renting line is",
        b: "It is not rent. It is what a renter would be holding: the deposit they never handed over, plus the difference between renting and owning each month, invested at the return you set. That is why it grows." },
      { k: ["buy & build", "build equity", "green line", "owner line", "what is the green"],
        t: "What the buying line is",
        b: "The owner's equity: the home's projected value, less what is still owed, less what it would cost to sell. Not the price of the house." },
      { k: ["break", "even", "cross", "overtake"],
        t: "What break-even means here",
        b: "The year the owner's equity finally catches the renter's invested pile. Before it, renting is ahead; after it, buying is. It moves most when you change the mortgage rate or how fast the home appreciates." }
    ],
    debt: [
      { k: ["first payment", "54", "interest share", "where does my payment go"],
        t: "Where this month's payment goes",
        b: "Interest is charged first, on the whole balance. Whatever is left of the payment is the only part that reduces what you owe — which is why the balance barely moves early on." }
    ],
    plan529: [
      { k: ["covers", "percent of the bill", "36%", "the degree"],
        t: "What “covers” means",
        b: "The projected balance divided by the projected four-year bill at the college costs and inflation you set. It is the whole bill, not your share of it — scholarships, work and the student's own contribution all sit between the two." }
    ],
    family: [
      { k: ["on track", "all three", "same account", "same pot", "spend each"],
        t: "Why all three say “on track” but the panel says short",
        b: "The three cards each measure their goal against the same untouched balance, which is how the original works. The panel below takes each goal out in the year it arrives, so the last goal is measured against what is actually left." }
    ]
  };

  /* ---------- reading the page ---------- */
  function fields() {
    const out = [];
    document.querySelectorAll(".tool-wrap label[for]").forEach(function (l) {
      const el = document.getElementById(l.getAttribute("for"));
      if (!el || (el.tagName !== "INPUT" && el.tagName !== "SELECT")) return;
      if (el.type === "hidden") return;
      const panel = el.closest(".side, .rate-side, .di-col, .fb-term, .calc, .panel");
      const head = panel ? panel.querySelector(".side-name b, header b, .di-head b, h2, h3") : null;
      out.push({
        el: el,
        id: el.id,
        label: (l.textContent || "").trim(),
        context: head ? (head.textContent || "").trim() : "",
        money: !!el.closest(".money-in") || /\(\$\)|\$\s*\)/.test(l.textContent || "") ||
               /^\$/.test(((el.previousElementSibling || {}).textContent || "").trim()),
        pct: !!el.closest(".pct-in") || /%/.test(l.textContent || "")
      });
    });
    return out;
  }

  const STOP = /^(what|whats|if|the|a|an|is|are|was|were|be|to|of|my|our|i|we|do|does|did|it|in|on|at|for|and|or|with|how|much|many|would|will|should|could|can|about|this|that|then|there|when|why|get|got|happens|happen|change|changes|instead|per|each|goes|go|up|down|more|less|from|by|me|you)$/i;

  function words(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9%$ ]+/g, " ").split(/\s+/)
      .filter(function (w) { return w && !STOP.test(w); });
  }

  /* a few words people use that are not the words on the label */
  const SYNONYM = {
    pay: "payment", paying: "payment", repay: "payment", put: "adding", putting: "adding",
    save: "saving", saving: "aside", contribute: "monthly", earn: "return", earns: "return",
    earning: "return", grow: "growth", grows: "growth", returns: "return", interest: "rate",
    apr: "rate", cost: "price", worth: "value", want: "wanted", house: "home", mortgage: "mortgage"
  };

  function bestField(q, list) {
    const qw = words(q);
    const boosted = qw.concat(qw.map(function (w) { return SYNONYM[w]; }).filter(Boolean));
    let best = null, bestScore = 0;
    list.forEach(function (f) {
      const lw = words(f.label);
      const cw = words(f.context);
      let score = 0;
      boosted.forEach(function (w) {
        lw.forEach(function (x, i) {
          /* a word at the front of a label is what the field is really called */
          const weight = i === 0 ? 3 : 2;
          if (x === w) score += weight;
          else if (w.length > 3 && (x.indexOf(w) === 0 || w.indexOf(x) === 0)) score += 1;
        });
        cw.forEach(function (x) { if (x === w) score += 1; });
      });
      f.score = score;
    });
    const ranked = list.slice().sort(function (a, b) { return b.score - a.score; });
    if (!ranked.length || ranked[0].score < 2) return null;
    /* a tie means the question fits two fields. Rather than refuse, take the
       one the page asks first — and say out loud which one that was. */
    if (ranked.length > 1 && ranked[1].score === ranked[0].score) {
      const tied = ranked.filter(function (f) { return f.score === ranked[0].score; });
      const first = list.filter(function (f) { return tied.indexOf(f) >= 0; })[0];
      if (first) first.assumed = true;
      return first || null;
    }
    ranked[0].assumed = false;
    return ranked[0];
  }

  /* what they can actually see is what they are asking about */
  function visible(list) {
    const on = list.filter(function (f) { return f.el.offsetParent !== null; });
    return on.length ? on : list;
  }

  function numbers(q) {
    const out = [];
    const re = /(\$\s?)?(\d[\d,]*(?:\.\d+)?)\s*(%|percent|k\b|m\b)?/gi;
    let m;
    while ((m = re.exec(q))) {
      let v = parseFloat(m[2].replace(/,/g, ""));
      const suf = (m[3] || "").toLowerCase();
      if (suf === "k") v *= 1e3;
      if (suf === "m") v *= 1e6;
      out.push({ v: v, pct: suf === "%" || suf === "percent", money: !!m[1] });
    }
    return out;
  }

  function headIds() {
    const h = HEAD[SLUG];
    return !h ? [] : (typeof h === "string" ? [h] : h);
  }
  function headText() {
    const bits = [];
    headIds().forEach(function (h) {
      const id = typeof h === "string" ? h : h.id;
      const t = ((document.getElementById(id) || {}).textContent || "").trim();
      if (!t) return;
      bits.push(typeof h === "string" ? t : h.lab + " " + t);
    });
    if (!bits.length) return "";
    return bits.length === 1 ? bits[0] : bits[0] + " \u2014 " + bits.slice(1).join(", ");
  }
  function headWord() { return HEADWORD[SLUG] || "the answer"; }

  /* ---------- driving the page (shared with the analyst) ---------- */
  function probe(el, value) {
    const was = el.value;
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    const after = headText();
    el.value = was;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return after;
  }

  function show(f) {
    const v = parseFloat(f.el.value);
    if (!isFinite(v)) return f.el.value;
    return f.money ? usd(v) : f.pct ? v + "%" : String(v);
  }
  function showAs(f, v) {
    return f.money ? usd(v) : f.pct ? (Math.round(v * 100) / 100) + "%" : String(Math.round(v * 100) / 100);
  }

  /* ============================================================
     the handlers
     ============================================================ */

  function defineIt(q) {
    if (!/\b(what (is|are|does)|mean|meaning|define|explain)\b/i.test(q)) return null;
    const gl = (window.WD && window.WD.glossary) || null;
    if (!gl) return null;
    const qw = words(q);
    let best = null, bestScore = 0;
    for (const k in gl) {
      const tw = words(gl[k].term + " " + k);
      let score = 0;
      qw.forEach(function (w) {
        tw.forEach(function (x) {
          if (x === w) score += 3;
          else if (w.length > 4 && x.indexOf(w) === 0) score += 2;
        });
      });
      if (score > bestScore) { bestScore = score; best = gl[k]; }
    }
    if (!best || bestScore < 5) return null;
    return { title: best.term, body: best.plain, tag: "definition" };
  }

  function onScreen(q) {
    const list = ONSCREEN[SLUG];
    if (!list) return null;
    const low = " " + q.toLowerCase() + " ";
    for (let i = 0; i < list.length; i++) {
      for (let k = 0; k < list[i].k.length; k++) {
        if (low.indexOf(list[i].k[k]) >= 0) return { title: list[i].t, body: list[i].b, tag: "on this page" };
      }
    }
    return null;
  }

  function whatIf(q) {
    if (!/\b(what if|if i|suppose|say|instead|change|set|make it|assume)\b/i.test(q) &&
        !/\b(higher|lower|worse|better|more|less|up|down)\b/i.test(q)) return null;
    const all = fields();
    const f = bestField(q, visible(all)) || bestField(q, all);
    if (!f) return null;

    const now = parseFloat(f.el.value);
    const nums = numbers(q).filter(function (n) {
      return !(f.pct && n.v > 100) && n.v !== now;
    });
    let target = null, how = "";

    if (nums.length) {
      target = nums[0].v;
      how = "at " + showAs(f, target);
    } else if (/\b(worse|better)\b/i.test(q)) {
      /* a bigger return is better; a bigger tax or inflation rate is worse.
         Which way "worse" points depends on the field, not the word. */
      const good = /return|growth|grow|apprec|credit|apy|yield|income|savings|benefit/i.test(f.label);
      const worse = /\bworse\b/i.test(q);
      const down = worse ? good : !good;
      target = f.pct ? Math.max(0, now + (down ? -2 : 2)) : Math.round(now * (down ? 0.8 : 1.2));
      how = "at " + showAs(f, target);
    } else if (/\b(higher|more|up|increase|raise)\b/i.test(q)) {
      target = f.pct ? now + 2 : Math.round(now * 1.2);
      how = "at " + showAs(f, target);
    } else if (/\b(lower|less|down|drop|fall|decrease|cut)\b/i.test(q)) {
      target = f.pct ? Math.max(0, now - 2) : Math.round(now * 0.8);
      how = "at " + showAs(f, target);
    }
    if (target === null || !isFinite(target)) return null;

    const before = headText();
    const after = probe(f.el, target);
    if (!after) return null;
    if (after === before) {
      return {
        title: f.label + " " + how,
        body: "Nothing moves. " + headWord().charAt(0).toUpperCase() + headWord().slice(1) +
              " stays at " + before + ", so on these figures that one is not what is deciding it.",
        tag: "worked out live"
      };
    }
    return {
      title: f.label + " " + how,
      body: (f.assumed ? "Reading that as " + f.label.toLowerCase().replace(/\s*\(.*\)/, "") + ". " : "") +
            headWord().charAt(0).toUpperCase() + headWord().slice(1) + " becomes " + after +
            ", instead of " + before + " at " + show(f) + ".",
      tag: "worked out live"
    };
  }

  function solveFor(q) {
    if (!/\b(how much|what would it take|what do i need|need to|to reach|to cover|to get to|to hit)\b/i.test(q)) return null;
    const list = fields().filter(function (f) { return f.money && /month|monthly|aside|contribut|pay|save|adding/i.test(f.label); });
    if (!list.length) return null;
    const f = list[0];
    const nums = numbers(q).filter(function (n) { return n.v >= 100; });
    if (!nums.length) return null;
    const goal = nums[nums.length - 1].v;

    const el = f.el, was = el.value;
    const read = function () {
      const t = headText().replace(/[^0-9.]/g, "");
      return parseFloat(t);
    };
    const test = function (x) {
      el.value = x;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return read() >= goal;
    };
    const now = parseFloat(was) || 0;
    let answer = null;
    const hi = Math.max(now * 20, goal / 12, 2000);
    if (test(hi)) {
      let a = 0, b = hi;
      for (let i = 0; i < 14; i++) {
        const mid = (a + b) / 2;
        if (test(mid)) b = mid; else a = mid;
      }
      answer = b;
    }
    el.value = was;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    if (answer === null) {
      return {
        title: "Getting to " + usd(goal),
        body: "Not reachable by changing " + f.label.toLowerCase() + " alone on these assumptions. Something else has to move — the time, the rate, or the target.",
        tag: "worked out live"
      };
    }
    return {
      title: "Getting to " + usd(goal),
      body: usd(answer) + " a month, against " + usd(now) + " now — " + usd(answer - now) +
            " more. Everything else left exactly as you have it.",
      tag: "solved on this page"
    };
  }

  function worry(q) {
    if (!/\b(worry|worried|wrong|bad|risk|problem|stands out|should i|advice|think|matter|important|faster|sooner|quicker|improve|better off|what can i do|fix)\b/i.test(q)) return null;
    let f = [];
    try { f = (window.WD_FINDINGS ? window.WD_FINDINGS(SLUG) : []) || []; } catch (e) { f = []; }
    if (!f.length) return null;
    const first = f[0];
    return { title: first.t, body: first.b + (f.length > 1 ? " There are " + (f.length - 1) + " more under What stands out." : ""), tag: "read off this page" };
  }

  function known(q) {
    const plan = (window.WD_SIMPLE || {})[SLUG];
    if (!plan || !plan.guide || !plan.guide.qs) return null;
    const qw = words(q);
    let best = null, bestScore = 0;
    plan.guide.qs.forEach(function (row) {
      const tw = words(row.q);
      let score = 0;
      qw.forEach(function (w) { if (tw.indexOf(w) >= 0) score += 2; });
      if (score > bestScore) { bestScore = score; best = row; }
    });
    if (!best || bestScore < 4) return null;
    const body = String(best.a).replace(/\{[#$]([A-Za-z0-9_]+)\}/g, function (m, id) {
      const e = document.getElementById(id);
      if (!e) return "";
      return ((e.value !== undefined ? e.value : e.textContent) || "").trim();
    });
    return { title: best.q, body: body, tag: "" };
  }

  function stuck() {
    const list = fields();
    const tries = [];
    const f = list.filter(function (x) { return x.pct; })[0] || list[0];
    if (f) tries.push("What if " + f.label.toLowerCase().replace(/\s*\(.*\)/, "") + " were lower?");
    tries.push("What should I worry about here?");
    const plan = (window.WD_SIMPLE || {})[SLUG];
    if (plan && plan.guide && plan.guide.qs && plan.guide.qs[0]) tries.push(plan.guide.qs[0].q);
    return {
      /* the flag matters: it is how ai.js knows this one is worth a model.
         Everything above it was answered off the page and never should be. */
      stuck: true,
      title: "I can't answer that one",
      body: "I only answer from the numbers on this page — I can change any of them and tell you what happens, define anything the page uses, or say what stands out. I can't look anything up beyond that.",
      tries: tries.slice(0, 3),
      tag: ""
    };
  }

  window.WD_ASK = function (q) {
    q = String(q || "").trim();
    if (!q) return null;
    const chain = [onScreen, defineIt, whatIf, solveFor, worry, known];
    for (let i = 0; i < chain.length; i++) {
      let r = null;
      try { r = chain[i](q); } catch (e) { r = null; }
      if (r) return r;
    }
    return stuck();
  };
})();
